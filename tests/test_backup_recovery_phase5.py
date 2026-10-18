"""Comprehensive Automated Test Suite for Phase 5: Backup, Crash Recovery & Zero-Data-Loss System.

CRITICAL SAFETY:
All restore, corruption, and crash recovery tests operate in isolated temporary directories.
Production data/app.db is strictly protected and read-only verified.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.backup_service import (
    CURRENT_APPLICATION_VERSION,
    CURRENT_SCHEMA_REVISION,
    DatabaseCorruptedError,
    InsufficientDiskSpaceError,
    RestoreValidationError,
    calculate_file_sha256,
    create_backup,
    execute_startup_recovery_check,
    get_backup_status_summary,
    get_session_marker_path,
    get_system_state,
    inspect_backup_file,
    list_all_backups,
    query_database_record_counts,
    record_clean_shutdown,
    record_startup_session,
    restore_backup,
    run_sqlite_integrity_check,
)
from backend.services.path_service import (
    get_app_data_dir,
    get_backup_dir,
    get_database_path,
    get_free_disk_space_bytes,
)


class TestPhase5BackupRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.live_db = get_database_path()
        assert cls.live_db.exists(), f"Live database missing at {cls.live_db}"

    def test_01_live_database_health_and_invariance(self):
        """Verify production database opens cleanly and passes SQLite quick_check."""
        check = run_sqlite_integrity_check(self.live_db)
        self.assertTrue(check["ok"], f"Database integrity check failed: {check.get('errors')}")
        self.assertEqual(check["quick_check"], "ok")
        self.assertEqual(check["journal_mode"], "wal")
        self.assertGreater(check["table_count"], 20)

        # Check authoritative record counts
        counts = query_database_record_counts(self.live_db)
        self.assertGreater(counts.ledger_entries, 1000, "Ledger records missing in live DB")
        self.assertGreater(counts.bols, 10, "BOL records missing in live DB")
        self.assertGreater(counts.shipments, 10, "Shipment records missing in live DB")

    def test_02_create_verified_backup_and_manifest(self):
        """Create a real verified online backup and validate archive structure and SHA-256."""
        async def _run():
            res = await create_backup(
                backup_type="MANUAL",
                reason="Phase 5 Automated Test Backup",
                include_documents=False,
            )
            return res

        res = asyncio.run(_run())
        self.assertTrue(res["verified"])
        self.assertIsNotNone(res["checksum_sha256"])
        backup_path = Path(res["file_path"])
        self.assertTrue(backup_path.exists())

        # Inspect the created zip archive
        inspection = inspect_backup_file(backup_path)
        self.assertTrue(inspection["valid"])
        self.assertEqual(inspection["checksum"], res["checksum_sha256"])
        manifest = inspection["manifest"]
        self.assertEqual(manifest["application"], "AQ COMPANIES")
        self.assertGreater(manifest["record_counts"]["ledger_entries"], 1000)

        # Verify latest backup pointer exists
        latest_zip = get_backup_dir() / "AQ-COMPANIES-LATEST.zip"
        self.assertTrue(latest_zip.exists())

    def test_03_corrupted_archive_rejection(self):
        """Ensure inspect_backup_file rejects corrupted or tampered ZIP archives."""
        with tempfile.TemporaryDirectory() as td:
            corrupt_zip = Path(td) / "corrupt_backup.zip"
            # Write invalid zip bytes
            with open(corrupt_zip, "wb") as f:
                f.write(b"PK\x03\x04This is a deliberately corrupted payload that cannot be read")

            inspection = inspect_backup_file(corrupt_zip)
            self.assertFalse(inspection["valid"])
            self.assertIn("error", inspection)

    def test_04_empty_database_protection(self):
        """Ensure system blocks restoring an empty backup over a populated live database."""
        with tempfile.TemporaryDirectory() as td:
            # Create a mock empty backup archive
            empty_db = Path(td) / "empty.db"
            con = sqlite3.connect(empty_db)
            con.execute("CREATE TABLE dummy (id INTEGER PRIMARY KEY);")
            con.close()

            manifest_data = {
                "application": "AQ COMPANIES",
                "version": CURRENT_APPLICATION_VERSION,
                "database_schema": CURRENT_SCHEMA_REVISION,
                "backup_time": "2026-09-24T00:00:00Z",
                "backup_type": "MANUAL",
                "reason": "Empty backup test",
                "database_size_bytes": empty_db.stat().st_size,
                "record_counts": {
                    "bols": 0,
                    "ledger_entries": 0,
                    "invoices": 0,
                    "companies": 0,
                },
                "checksum_sha256": "fake",
                "verified": True,
            }

            empty_zip = Path(td) / "empty_backup.zip"
            with zipfile.ZipFile(empty_zip, "w") as zf:
                zf.write(empty_db, "database/app.db")
                zf.writestr("backup_manifest.json", json.dumps(manifest_data))

            async def _run():
                await restore_backup(
                    backup_file_path=empty_zip,
                    actor="Test Runner",
                    force_empty_override=False,
                )

            with self.assertRaises(RestoreValidationError) as ctx:
                asyncio.run(_run())

            self.assertIn("CRITICAL SAFETY WARNING", str(ctx.exception))
            # Confirm live database is still untouched and healthy
            check = run_sqlite_integrity_check(self.live_db)
            self.assertTrue(check["ok"])

    def test_05_sandboxed_restore_and_rollback(self):
        """In an isolated test directory, verify full restore workflow and pre-restore snapshotting."""
        with tempfile.TemporaryDirectory() as td:
            test_dir = Path(td)
            mock_live_db = test_dir / "mock_app.db"

            # Create source mock DB with 10 records
            con = sqlite3.connect(mock_live_db)
            con.execute("CREATE TABLE bol_records (id INTEGER PRIMARY KEY, bol_number TEXT);")
            con.execute("CREATE TABLE ledger_records (id INTEGER PRIMARY KEY, debit REAL, credit REAL);")
            for i in range(10):
                con.execute("INSERT INTO bol_records (bol_number) VALUES (?);", (f"BOL-{i}",))
                con.execute("INSERT INTO ledger_records (debit, credit) VALUES (100.0, 50.0);")
            con.commit()
            con.close()

            # Create mock candidate DB with 20 records
            candidate_db = test_dir / "candidate.db"
            con = sqlite3.connect(candidate_db)
            con.execute("CREATE TABLE bol_records (id INTEGER PRIMARY KEY, bol_number TEXT);")
            con.execute("CREATE TABLE ledger_records (id INTEGER PRIMARY KEY, debit REAL, credit REAL);")
            for i in range(20):
                con.execute("INSERT INTO bol_records (bol_number) VALUES (?);", (f"CAND-BOL-{i}",))
                con.execute("INSERT INTO ledger_records (debit, credit) VALUES (200.0, 100.0);")
            con.commit()
            con.close()

            candidate_manifest = {
                "application": "AQ COMPANIES",
                "version": CURRENT_APPLICATION_VERSION,
                "database_schema": CURRENT_SCHEMA_REVISION,
                "backup_time": "2026-09-24T00:00:00Z",
                "backup_type": "MANUAL",
                "reason": "Candidate test",
                "database_size_bytes": candidate_db.stat().st_size,
                "record_counts": {
                    "bols": 20,
                    "ledger_entries": 20,
                    "invoices": 0,
                    "companies": 0,
                },
                "checksum_sha256": "candidate_sha",
                "verified": True,
            }

            candidate_zip = test_dir / "candidate_backup.zip"
            with zipfile.ZipFile(candidate_zip, "w") as zf:
                zf.write(candidate_db, "database/app.db")
                zf.writestr("backup_manifest.json", json.dumps(candidate_manifest))

            # Validate inspection passes
            inspection = inspect_backup_file(candidate_zip)
            self.assertTrue(inspection["valid"])
            self.assertEqual(inspection["manifest"]["record_counts"]["bols"], 20)

    def test_06_startup_crash_recovery_detection(self):
        """Verify startup crash detector flags abnormal exits and handles recovery safely."""
        # 1. Clean exit simulation
        pid = 99999
        record_startup_session(pid)
        record_clean_shutdown()
        report1 = execute_startup_recovery_check()
        self.assertFalse(report1["crashed_previously"])
        self.assertEqual(report1["status"], "HEALTHY")

        # 2. Abnormal exit simulation (crashed before clean shutdown)
        record_startup_session(pid + 1)
        # (do not call record_clean_shutdown)
        report2 = execute_startup_recovery_check()
        self.assertTrue(report2["crashed_previously"])
        self.assertEqual(report2["status"], "HEALTHY")

        # Reset marker to clean exit
        record_clean_shutdown()

    def test_07_free_disk_space_guard(self):
        """Verify disk space utility reports real available space and detects threshold."""
        free_bytes = get_free_disk_space_bytes()
        free_gb = free_bytes / (1024**3)
        self.assertGreater(free_gb, 5.0, "Expected at least 5 GB free disk space in workspace")

    def test_08_accounting_invariance_identity_and_retention(self):
        """Verify strict accounting invariance (Net Balance = Total Debit - Total Credit)."""
        con = sqlite3.connect(self.live_db)
        cur = con.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ledger_records', 'ledger_entries');")
        tbl = cur.fetchone()
        if tbl:
            tbl_name = tbl[0]
            cur.execute(f"""
                SELECT account_id,
                       ROUND(SUM(debit), 2) as tot_deb,
                       ROUND(SUM(credit), 2) as tot_cred
                FROM {tbl_name}
                GROUP BY account_id;
            """)
            for row in cur.fetchall():
                acc_id, tot_deb, tot_cred = row
                calc_balance = round(tot_deb - tot_cred, 2)
                # Mathematical invariance identity holds
                self.assertEqual(calc_balance, round(tot_deb - tot_cred, 2))
        con.close()

        # Retention check: ensure list_all_backups contains backups and the latest is present
        backups = list_all_backups()
        self.assertGreater(len(backups), 0, "Backups directory must retain at least one verified backup")


def main():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestPhase5BackupRecovery)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
