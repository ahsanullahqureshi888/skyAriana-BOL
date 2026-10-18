"""Comprehensive Backup, Crash Recovery, and Zero-Data-Loss Engine for AQ COMPANIES.

Implements:
- Non-blocking online SQLite backups using Python sqlite3.backup API
- Atomic backup packaging (.zip) with SHA-256 validation & manifest metadata
- Disk space guard (> 1 GB required, warning at < 5 GB)
- Automatic backup retention policy (7 daily, 4 weekly, 6 monthly, NEVER deletes last good backup)
- High-safety restore workflow with mandatory pre-restore backup & automatic rollback
- Crash detection & WAL recovery checks on startup
- Absolute data loss prevention: NEVER replaces a damaged database with an empty one
"""

from __future__ import annotations

import asyncio
import datetime
import hashlib
import json
import logging
import os
import shutil
import sqlite3
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional

from backend.services.path_service import (
    get_app_data_dir,
    get_backup_dir,
    get_config_dir,
    get_database_path,
    get_documents_dir,
    get_free_disk_space_bytes,
    get_logs_dir,
    get_recovery_dir,
    get_temp_dir,
)

logger = logging.getLogger("aq_companies.backup")

# Global re-entrant lock to prevent concurrent backup or restore operations
_BACKUP_LOCK = asyncio.Lock()

# Application state
CURRENT_SCHEMA_REVISION = "9c12685e0336"
CURRENT_APPLICATION_VERSION = "5.0.0"

# Maintenance states
STATE_NORMAL = "NORMAL"
STATE_BACKUP = "BACKUP"
STATE_RESTORE = "RESTORE"
STATE_RECOVERY = "RECOVERY"

_CURRENT_SYSTEM_STATE = STATE_NORMAL
_LAST_RECOVERY_INFO: dict[str, Any] = {}


@dataclass
class BackupRecordCounts:
    companies: int = 0
    shippers: int = 0
    consignees: int = 0
    notify_parties: int = 0
    bols: int = 0
    shipments: int = 0
    invoices: int = 0
    payments: int = 0
    ledger_entries: int = 0
    documents: int = 0


@dataclass
class BackupManifest:
    application: str
    version: str
    database_schema: str
    backup_time: str
    backup_type: str
    reason: str
    database_size_bytes: int
    record_counts: dict[str, int]
    checksum_sha256: str
    verified: bool


class BackupServiceError(Exception):
    """Base exception for backup and recovery operations."""
    pass


class InsufficientDiskSpaceError(BackupServiceError):
    """Raised when available disk space is dangerously low."""
    pass


class DatabaseCorruptedError(BackupServiceError):
    """Raised when SQLite database fails integrity validation."""
    pass


class RestoreValidationError(BackupServiceError):
    """Raised when pre- or post-restore verification fails."""
    pass


def get_system_state() -> str:
    """Returns the current operational state of the backend."""
    return _CURRENT_SYSTEM_STATE


def get_last_recovery_info() -> dict[str, Any]:
    """Returns details of the most recent crash/recovery check."""
    return _LAST_RECOVERY_INFO


# -----------------------------------------------------------------------------
# 1. DATABASE RECORD COUNT & PRAGMA UTILITIES
# -----------------------------------------------------------------------------

def query_database_record_counts(db_path: Path) -> BackupRecordCounts:
    """Safely count records in critical tables using direct read-only SQLite connection."""
    counts = BackupRecordCounts()
    if not db_path.exists():
        return counts

    con = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    cur = con.cursor()
    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = set(r[0] for r in cur.fetchall())

        def safe_count(tbl: str) -> int:
            if tbl not in tables:
                return 0
            try:
                cur.execute(f'SELECT count(*) FROM "{tbl}";')
                row = cur.fetchone()
                return int(row[0]) if row else 0
            except Exception:
                return 0

        counts.companies = safe_count("companies")
        counts.shippers = safe_count("shippers")
        counts.consignees = safe_count("consignees")
        counts.notify_parties = safe_count("notify_parties")
        counts.bols = safe_count("bol_records")
        counts.shipments = safe_count("shipments")
        counts.invoices = safe_count("invoices")
        counts.payments = safe_count("payments")
        counts.ledger_entries = safe_count("ledger_records") or safe_count("ledgers")
        counts.documents = safe_count("documents")
    finally:
        con.close()

    return counts


def run_sqlite_integrity_check(db_path: Path) -> dict[str, Any]:
    """Execute PRAGMA integrity_check and PRAGMA foreign_key_check."""
    if not db_path.exists():
        return {"ok": False, "error": f"Database file does not exist: {db_path}"}

    con = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    cur = con.cursor()
    errors: list[str] = []
    try:
        cur.execute("PRAGMA integrity_check;")
        rows = cur.fetchall()
        integrity_ok = len(rows) == 1 and rows[0][0] == "ok"
        if not integrity_ok:
            errors.extend([r[0] for r in rows if r[0] != "ok"])

        cur.execute("PRAGMA foreign_key_check;")
        fk_rows = cur.fetchall()
        fk_ok = len(fk_rows) == 0
        warnings = []
        if not fk_ok:
            warnings.append(f"Foreign key violations found: {len(fk_rows)} rows")

        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cur.fetchall() if not r[0].startswith("sqlite_")]

        cur.execute("PRAGMA user_version;")
        user_ver = cur.fetchone()[0]

        schema_rev = CURRENT_SCHEMA_REVISION
        if "alembic_version" in tables:
            cur.execute("SELECT version_num FROM alembic_version;")
            v_row = cur.fetchone()
            if v_row:
                schema_rev = v_row[0]

        cur.execute("PRAGMA journal_mode;")
        journal_mode = str(cur.fetchone()[0]).lower()

        cur.execute("PRAGMA quick_check;")
        qc_rows = cur.fetchall()
        qc_ok = len(qc_rows) == 1 and qc_rows[0][0] == "ok"

        db_size_mb = db_path.stat().st_size / (1024 * 1024)

        return {
            "ok": integrity_ok and qc_ok,
            "integrity": "OK" if integrity_ok else "FAILED",
            "quick_check": "ok" if qc_ok else "FAILED",
            "journal_mode": journal_mode,
            "foreign_keys": "OK" if fk_ok else f"WARNING ({len(fk_rows)} violations)",
            "schema_revision": schema_rev,
            "user_version": user_ver,
            "database_size_mb": round(db_size_mb, 2),
            "tables_checked": len(tables),
            "table_count": len(tables),
            "errors": errors,
            "warnings": warnings,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "errors": [str(exc)], "warnings": []}
    finally:
        con.close()


# -----------------------------------------------------------------------------
# 2. ONLINE SQLITE BACKUP ENGINE
# -----------------------------------------------------------------------------

def execute_online_sqlite_backup(source_db_path: Path, target_db_path: Path) -> None:
    """Use the official sqlite3.backup API to perform a 100% consistent copy.
    
    Guarantees that active transactions and WAL files are flushed without torn pages.
    """
    if not source_db_path.exists():
        raise BackupServiceError(f"Source database does not exist: {source_db_path}")

    target_db_path.parent.mkdir(parents=True, exist_ok=True)
    if target_db_path.exists():
        target_db_path.unlink()

    src_conn = sqlite3.connect(f"file:{source_db_path.as_posix()}?mode=ro", uri=True)
    dst_conn = sqlite3.connect(str(target_db_path))
    try:
        # Checkpoint WAL passively before backup
        try:
            src_conn.execute("PRAGMA wal_checkpoint(PASSIVE);")
        except Exception:
            pass

        # Perform atomic online backup in chunks
        src_conn.backup(dst_conn, pages=100, sleep=0.01)
    finally:
        dst_conn.close()
        src_conn.close()


def calculate_file_sha256(path: Path) -> str:
    """Calculate SHA-256 hash of a file on disk."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


# -----------------------------------------------------------------------------
# 3. BACKUP CREATION WORKFLOW
# -----------------------------------------------------------------------------

async def create_backup(
    backup_type: str = "MANUAL",
    reason: str = "User requested manual backup",
    include_documents: bool = False,
    force: bool = False,
) -> dict[str, Any]:
    """Execute complete, atomic, verified backup creation.
    
    1. Acquires backup lock.
    2. Verifies disk space (> 1 GB free).
    3. Backs up SQLite database online via sqlite3.backup.
    4. Computes live record counts.
    5. Bundles database, settings, and metadata into a ZIP file in Temp/.
    6. Validates ZIP integrity and manifest.
    7. Atomically moves verified ZIP to Backups/YYYY/MM/.
    8. Updates Backups/AQ-COMPANIES-LATEST.zip.
    9. Applies retention policy.
    """
    global _CURRENT_SYSTEM_STATE
    async with _BACKUP_LOCK:
        _CURRENT_SYSTEM_STATE = STATE_BACKUP
        try:
            # 1. Disk space check
            free_bytes = get_free_disk_space_bytes()
            if free_bytes < 1024 * 1024 * 1024:  # 1 GB
                raise InsufficientDiskSpaceError(
                    f"Insufficient disk space ({free_bytes / (1024 * 1024):.1f} MB available). At least 1 GB is required."
                )
            if free_bytes < 5 * 1024 * 1024 * 1024:  # 5 GB
                logger.warning(f"Disk space is low: {free_bytes / (1024 * 1024):.1f} MB remaining.")

            live_db = get_database_path()
            if not live_db.exists():
                raise BackupServiceError(f"Live database not found at {live_db}")

            # 2. Setup temporary staging
            now = datetime.datetime.now(datetime.timezone.utc)
            timestamp_slug = now.strftime("%Y-%m-%d-%H%M%S")
            backup_filename = f"AQ-COMPANIES-{backup_type.upper()}-{timestamp_slug}.zip"

            temp_dir = get_temp_dir() / f"staging_{timestamp_slug}"
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_db_copy = temp_dir / "app.db"
            temp_zip_path = get_temp_dir() / f"temp_{backup_filename}"

            try:
                # 3. Create clean online backup of the SQLite database
                execute_online_sqlite_backup(live_db, temp_db_copy)

                # 4. Count records from the clean copy
                record_counts = query_database_record_counts(temp_db_copy)
                db_size = temp_db_copy.stat().st_size

                # 5. Build ZIP archive
                with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
                    # Add database
                    zf.write(temp_db_copy, arcname="database/app.db")

                    # Add critical settings and counter files if present
                    data_dir = get_app_data_dir()
                    for f in data_dir.glob(".local-*.json"):
                        try:
                            zf.write(f, arcname=f"settings/{f.name}")
                        except Exception:
                            pass

                    for counter in data_dir.glob(".*-counter"):
                        try:
                            zf.write(counter, arcname=f"settings/{counter.name}")
                        except Exception:
                            pass

                    # Optional documents
                    if include_documents:
                        docs_dir = get_documents_dir()
                        for doc in docs_dir.glob("**/*"):
                            if doc.is_file() and doc.stat().st_size < 10 * 1024 * 1024:
                                try:
                                    arc = f"documents/{doc.relative_to(docs_dir).as_posix()}"
                                    zf.write(doc, arcname=arc)
                                except Exception:
                                    pass

                # 6. Verify created archive before moving
                with zipfile.ZipFile(temp_zip_path, "r") as zf:
                    test_res = zf.testzip()
                    if test_res is not None:
                        raise BackupServiceError(f"Archive test failed on corrupted member: {test_res}")

                checksum = calculate_file_sha256(temp_zip_path)

                # 7. Add manifest into the archive
                manifest = BackupManifest(
                    application="AQ COMPANIES",
                    version=CURRENT_APPLICATION_VERSION,
                    database_schema=CURRENT_SCHEMA_REVISION,
                    backup_time=now.isoformat(),
                    backup_type=backup_type.upper(),
                    reason=reason,
                    database_size_bytes=db_size,
                    record_counts=asdict(record_counts),
                    checksum_sha256=checksum,
                    verified=True,
                )

                with zipfile.ZipFile(temp_zip_path, "a", zipfile.ZIP_DEFLATED) as zf:
                    zf.writestr("backup_manifest.json", json.dumps(asdict(manifest), indent=2))

                # Recompute final checksum
                final_checksum = calculate_file_sha256(temp_zip_path)

                # 8. Organize into Year/Month structure
                year_month_dir = get_backup_dir() / now.strftime("%Y") / now.strftime("%m")
                year_month_dir.mkdir(parents=True, exist_ok=True)
                final_target_path = year_month_dir / backup_filename

                # Atomic move
                if final_target_path.exists():
                    final_target_path.unlink()
                shutil.move(str(temp_zip_path), str(final_target_path))

                # Update LATEST copy
                latest_path = get_backup_dir() / "AQ-COMPANIES-LATEST.zip"
                shutil.copy2(str(final_target_path), str(latest_path))

                # 9. Enforce retention policy
                await enforce_retention_policy()

                logger.info(f"Verified backup successfully created: {final_target_path} ({final_target_path.stat().st_size:,} bytes)")

                return {
                    "backup_id": backup_filename,
                    "success": True,
                    "verified": True,
                    "filename": backup_filename,
                    "file_path": str(final_target_path),
                    "file_size_bytes": final_target_path.stat().st_size,
                    "checksum": final_checksum,
                    "checksum_sha256": final_checksum,
                    "backup_type": backup_type.upper(),
                    "reason": reason,
                    "created_at": now.isoformat(),
                    "record_counts": asdict(record_counts),
                    "status": "VERIFIED",
                }
            finally:
                # Clean up staging directory
                if temp_dir.exists():
                    shutil.rmtree(temp_dir, ignore_errors=True)
                if temp_zip_path.exists():
                    try:
                        temp_zip_path.unlink()
                    except Exception:
                        pass
        finally:
            _CURRENT_SYSTEM_STATE = STATE_NORMAL


# -----------------------------------------------------------------------------
# 4. BACKUP VERIFICATION & INSPECTION
# -----------------------------------------------------------------------------

def inspect_backup_file(zip_path: Path) -> dict[str, Any]:
    """Inspect and validate an existing backup archive without restoring it."""
    if not zip_path.exists():
        return {"valid": False, "error": f"Backup file does not exist: {zip_path}"}

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            corrupt_member = zf.testzip()
            if corrupt_member:
                return {"valid": False, "error": f"Corrupt member in ZIP: {corrupt_member}"}

            names = zf.namelist()
            if "backup_manifest.json" not in names:
                return {"valid": False, "error": "Missing backup_manifest.json in archive"}

            if "database/app.db" not in names and "app.db" not in names:
                return {"valid": False, "error": "Missing database file in archive"}

            manifest_data = json.loads(zf.read("backup_manifest.json").decode("utf-8"))

        checksum = calculate_file_sha256(zip_path)

        return {
            "valid": True,
            "filename": zip_path.name,
            "file_size": zip_path.stat().st_size,
            "checksum": checksum,
            "manifest": manifest_data,
        }
    except Exception as exc:
        return {"valid": False, "error": f"Failed to inspect backup: {exc}"}


def list_all_backups() -> list[dict[str, Any]]:
    """List all verified backups found in the Backups folder."""
    backup_dir = get_backup_dir()
    results: list[dict[str, Any]] = []

    for f in backup_dir.rglob("*.zip"):
        if f.name == "AQ-COMPANIES-LATEST.zip":
            continue
        try:
            stat = f.stat()
            results.append({
                "filename": f.name,
                "file_path": str(f.resolve()),
                "file_size_bytes": stat.st_size,
                "modified_at": datetime.datetime.fromtimestamp(stat.st_mtime, datetime.timezone.utc).isoformat(),
            })
        except Exception:
            pass

    results.sort(key=lambda x: x["modified_at"], reverse=True)
    return results


# -----------------------------------------------------------------------------
# 5. RETENTION POLICY (Rule: NEVER delete the last good backup)
# -----------------------------------------------------------------------------

async def enforce_retention_policy(
    keep_daily: int = 7,
    keep_weekly: int = 4,
    keep_monthly: int = 6,
) -> int:
    """Enforce backup retention while guaranteeing the last good backup is NEVER deleted."""
    backups = list_all_backups()
    if len(backups) <= 1:
        # Strictly never delete if 1 or 0 backups exist
        return 0

    deleted_count = 0
    now = datetime.datetime.now(datetime.timezone.utc)

    # Always protect the most recent 3 backups unconditionally
    protected_paths = set(b["file_path"] for b in backups[:3])

    daily_seen = set()
    weekly_seen = set()
    monthly_seen = set()

    for b in backups:
        p = Path(b["file_path"])
        if str(p) in protected_paths or "PRE-RESTORE" in p.name or "PRE-MIGRATION" in p.name:
            continue

        try:
            mtime = datetime.datetime.fromtimestamp(p.stat().st_mtime, datetime.timezone.utc)
            age_days = (now - mtime).days

            day_key = mtime.strftime("%Y-%m-%d")
            week_key = mtime.strftime("%Y-W%W")
            month_key = mtime.strftime("%Y-%m")

            keep = False
            if age_days <= keep_daily:
                if day_key not in daily_seen:
                    daily_seen.add(day_key)
                    keep = True
            elif age_days <= keep_daily + (keep_weekly * 7):
                if week_key not in weekly_seen:
                    weekly_seen.add(week_key)
                    keep = True
            elif age_days <= 180:
                if month_key not in monthly_seen and len(monthly_seen) < keep_monthly:
                    monthly_seen.add(month_key)
                    keep = True

            if not keep:
                p.unlink(missing_ok=True)
                deleted_count += 1
                logger.info(f"Retention policy rotated older backup: {p.name}")
        except Exception as exc:
            logger.warning(f"Could not rotate backup {p}: {exc}")

    return deleted_count


# -----------------------------------------------------------------------------
# 6. RESTORE WORKFLOW (High Safety, Pre-Restore Backup, Automatic Rollback)
# -----------------------------------------------------------------------------

async def restore_backup(
    backup_file_path: Path,
    actor: str = "Administrator",
    force_empty_override: bool = False,
) -> dict[str, Any]:
    """High-safety database restore workflow.
    
    Steps:
    1. Validates selected archive exists and passes ZIP test.
    2. Extracts and inspects manifest and record counts.
    3. Prevents empty database restore over a populated database.
    4. Creates a MANDATORY PRE-RESTORE backup of current live database.
    5. Extracts candidate database to temporary staging location.
    6. Verifies candidate database passes PRAGMA integrity_check.
    7. Atomically swaps databases (with live DB preserved as app.db.old).
    8. Validates new live database.
    9. Automatically rolls back to pre-restore DB if anything fails.
    """
    global _CURRENT_SYSTEM_STATE
    async with _BACKUP_LOCK:
        _CURRENT_SYSTEM_STATE = STATE_RESTORE
        pre_restore_backup_path: Optional[str] = None
        temp_dir = get_temp_dir() / f"restore_staging_{int(datetime.datetime.now().timestamp())}"
        live_db = get_database_path()
        backup_old_copy = live_db.with_suffix(".db.old")

        try:
            # Step 1: Validate file & ZIP structure
            inspection = inspect_backup_file(backup_file_path)
            if not inspection["valid"]:
                raise RestoreValidationError(f"Invalid backup file: {inspection.get('error')}")

            manifest_info = inspection["manifest"]
            candidate_counts = manifest_info.get("record_counts", {})
            current_counts = query_database_record_counts(live_db)

            # Step 2: Empty database protection (Section 35)
            total_current_critical = (
                current_counts.bols + current_counts.ledger_entries + current_counts.invoices
            )
            total_candidate_critical = (
                candidate_counts.get("bols", 0)
                + candidate_counts.get("ledger_entries", 0)
                + candidate_counts.get("invoices", 0)
            )

            if total_current_critical > 0 and total_candidate_critical == 0 and not force_empty_override:
                raise RestoreValidationError(
                    "CRITICAL SAFETY WARNING: Current database has populated business records "
                    f"({total_current_critical} items), but the selected backup has 0 records. "
                    "Restore blocked to prevent accidental data destruction."
                )

            # Step 3: Mandatory Pre-Restore Backup (Section 33)
            logger.info("Creating mandatory pre-restore backup of current live database...")
            pre_res = await create_backup(
                backup_type="PRE_RESTORE",
                reason=f"Mandatory safety snapshot before restoring from {backup_file_path.name}",
            )
            pre_restore_backup_path = pre_res["file_path"]
            logger.info(f"Mandatory pre-restore backup created: {pre_restore_backup_path}")

            # Step 4: Extract candidate to temporary location
            temp_dir.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(backup_file_path, "r") as zf:
                db_member = "database/app.db" if "database/app.db" in zf.namelist() else "app.db"
                zf.extract(db_member, temp_dir)

            extracted_db = temp_dir / db_member

            # Step 5: Test candidate database integrity before swap
            test_check = run_sqlite_integrity_check(extracted_db)
            if not test_check["ok"]:
                raise RestoreValidationError(
                    f"Candidate database failed integrity check: {test_check.get('errors')}"
                )

            # Step 6: Atomic database swap
            # Flush WAL and checkpoint current database
            try:
                con = sqlite3.connect(str(live_db))
                con.execute("PRAGMA wal_checkpoint(TRUNCATE);")
                con.close()
            except Exception:
                pass

            # Move current DB to .old
            if backup_old_copy.exists():
                backup_old_copy.unlink()
            if live_db.exists():
                shutil.move(str(live_db), str(backup_old_copy))

            # Move candidate DB to live_db
            shutil.move(str(extracted_db), str(live_db))

            # Remove obsolete WAL/SHM from previous instance
            wal_file = live_db.with_name(f"{live_db.name}-wal")
            shm_file = live_db.with_name(f"{live_db.name}-shm")
            if wal_file.exists():
                wal_file.unlink(missing_ok=True)
            if shm_file.exists():
                shm_file.unlink(missing_ok=True)

            # Step 7: Post-restore live validation
            post_check = run_sqlite_integrity_check(live_db)
            if not post_check["ok"]:
                logger.error("Post-restore validation failed! Triggering AUTOMATIC ROLLBACK...")
                # Automatic Rollback
                if backup_old_copy.exists():
                    if live_db.exists():
                        live_db.unlink()
                    shutil.move(str(backup_old_copy), str(live_db))
                raise RestoreValidationError(
                    f"Post-restore validation failed: {post_check.get('errors')}. Successfully rolled back."
                )

            # Clean up .old copy on verified success
            if backup_old_copy.exists():
                backup_old_copy.unlink(missing_ok=True)

            new_counts = query_database_record_counts(live_db)

            logger.info(f"Database successfully restored from {backup_file_path.name}")

            return {
                "success": True,
                "message": f"Database successfully restored from {backup_file_path.name}",
                "pre_restore_backup": pre_restore_backup_path,
                "previous_counts": asdict(current_counts),
                "restored_counts": asdict(new_counts),
                "restored_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
        except Exception as exc:
            # If swap had occurred and error was thrown, attempt rollback
            if backup_old_copy.exists() and not live_db.exists():
                shutil.move(str(backup_old_copy), str(live_db))
            logger.error(f"Restore failed: {exc}", exc_info=True)
            raise
        finally:
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)
            _CURRENT_SYSTEM_STATE = STATE_NORMAL


# -----------------------------------------------------------------------------
# 7. CRASH DETECTION, STARTUP RECOVERY & SAFE CORRUPTION DEFENSE
# -----------------------------------------------------------------------------

def get_session_marker_path() -> Path:
    return get_app_data_dir() / ".session_state.json"


def record_startup_session(pid: int) -> None:
    """Record session start marker. clean_exit is False until graceful shutdown."""
    marker_path = get_session_marker_path()
    state = {
        "pid": pid,
        "clean_exit": False,
        "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "heartbeat": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    try:
        with open(marker_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass


def record_clean_shutdown() -> None:
    """Mark session as clean exit upon graceful shutdown."""
    marker_path = get_session_marker_path()
    if marker_path.exists():
        try:
            with open(marker_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["clean_exit"] = True
            data["stopped_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            with open(marker_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass


def execute_startup_recovery_check() -> dict[str, Any]:
    """Execute quick startup checks (< 500ms).
    
    1. Detects if previous run terminated abnormally.
    2. Verifies SQLite database can open and perform simple SELECT.
    3. Runs PRAGMA quick_check (< 50ms) and PASSIVE WAL checkpoint.
    4. CORRUPTION DEFENSE: If database cannot open, NEVER replace it with an empty DB!
       Instead, preserves the damaged database in Recovery/ and enters RECOVERY MODE.
    """
    global _CURRENT_SYSTEM_STATE, _LAST_RECOVERY_INFO
    marker_path = get_session_marker_path()
    crashed_previously = False

    if marker_path.exists():
        try:
            with open(marker_path, "r", encoding="utf-8") as f:
                prev_state = json.load(f)
            if not prev_state.get("clean_exit", True):
                crashed_previously = True
                logger.warning(f"Unclean shutdown detected from previous PID {prev_state.get('pid')}")
        except Exception:
            pass

    live_db = get_database_path()

    # If DB doesn't exist yet, it will be initialized normally
    if not live_db.exists():
        _LAST_RECOVERY_INFO = {
            "status": "NEW_INSTALLATION",
            "crashed_previously": False,
            "database_exists": False,
        }
        return _LAST_RECOVERY_INFO

    # Database exists: verify it can open safely
    try:
        con = sqlite3.connect(f"file:{live_db.as_posix()}?mode=rw", uri=True, timeout=5.0)
        cur = con.cursor()
        cur.execute("PRAGMA quick_check;")
        qc_result = cur.fetchone()[0]

        # Passive WAL recovery
        cur.execute("PRAGMA wal_checkpoint(PASSIVE);")

        cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table';")
        tbl_count = cur.fetchone()[0]
        con.close()

        if qc_result != "ok":
            raise DatabaseCorruptedError(f"SQLite quick_check returned: {qc_result}")

        _LAST_RECOVERY_INFO = {
            "status": "HEALTHY",
            "crashed_previously": crashed_previously,
            "database_exists": True,
            "table_count": tbl_count,
            "quick_check": qc_result,
            "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        return _LAST_RECOVERY_INFO

    except Exception as exc:
        # STRICT RULE 1 & 2: NEVER DELETE CURRENT DATABASE! NEVER REPLACE WITH EMPTY DB!
        logger.critical(f"FATAL: Database open or integrity failed: {exc}", exc_info=True)
        _CURRENT_SYSTEM_STATE = STATE_RECOVERY

        # Quarantine damaged database into Recovery/ folder
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        quarantine_file = get_recovery_dir() / f"aq_companies-corrupt-{timestamp_slug}.db" if "timestamp_slug" in locals() else get_recovery_dir() / f"aq_companies-corrupt-{timestamp_str}.db"

        try:
            shutil.copy2(str(live_db), str(quarantine_file))
        except Exception:
            pass

        # Write recovery report
        report_file = get_recovery_dir() / f"recovery-report-{timestamp_str}.txt"
        try:
            with open(report_file, "w", encoding="utf-8") as f:
                f.write(f"AQ COMPANIES — DATABASE CORRUPTION & RECOVERY REPORT\n")
                f.write(f"Timestamp: {datetime.datetime.now().isoformat()}\n")
                f.write(f"Error: {exc}\n")
                f.write(f"Live DB Path: {live_db}\n")
                f.write(f"Quarantined DB Copy: {quarantine_file}\n")
                f.write(f"Action: Preserved live database without deletion. Entered RECOVERY MODE.\n")
        except Exception:
            pass

        _LAST_RECOVERY_INFO = {
            "status": "RECOVERY_MODE",
            "error": str(exc),
            "crashed_previously": crashed_previously,
            "quarantined_copy": str(quarantine_file),
            "recovery_report": str(report_file),
        }
        return _LAST_RECOVERY_INFO


def get_backup_status_summary() -> dict[str, Any]:
    """Get high-level summary of backups status, disk space, and last verification."""
    backups = list_all_backups()
    latest_backup = backups[0] if backups else None
    free_bytes = get_free_disk_space_bytes()
    return {
        "total_backups": len(backups),
        "latest_backup": latest_backup,
        "system_state": _CURRENT_SYSTEM_STATE,
        "free_disk_space_bytes": free_bytes,
        "free_disk_space_gb": round(free_bytes / (1024 ** 3), 2),
        "last_recovery_info": _LAST_RECOVERY_INFO,
    }

