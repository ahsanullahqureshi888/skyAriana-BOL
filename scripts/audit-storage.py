import os
import sys
import json
import sqlite3
from pathlib import Path

def main():
    print("=" * 60)
    print("CURRENT DATA SOURCES AUDIT — PHASE 5")
    print("=" * 60)
    
    # 1. Database Check
    db_candidates = [
        Path("data/app.db"),
        Path("data/aq_companies.db"),
        Path(os.environ.get("LOCALAPPDATA", "")) / "AQ COMPANIES" / "Data" / "aq_companies.db",
        Path(os.environ.get("LOCALAPPDATA", "")) / "AQ COMPANIES" / "data" / "app.db",
    ]
    
    found_dbs = []
    for p in db_candidates:
        if p and p.exists():
            found_dbs.append(p)
            print(f"\n[DATABASE] Found: {p} ({p.stat().st_size:,} bytes)")
            con = sqlite3.connect(str(p))
            cur = con.cursor()
            
            cur.execute("PRAGMA journal_mode;")
            jm = cur.fetchone()[0]
            cur.execute("PRAGMA foreign_keys;")
            fk = cur.fetchone()[0]
            cur.execute("PRAGMA synchronous;")
            sync = cur.fetchone()[0]
            cur.execute("PRAGMA user_version;")
            ver = cur.fetchone()[0]
            print(f"  PRAGMAs: journal_mode={jm}, foreign_keys={fk}, synchronous={sync}, user_version={ver}")
            
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
            tables = [r[0] for r in cur.fetchall() if not r[0].startswith("sqlite_")]
            print(f"  Total Tables: {len(tables)}")
            for t in tables:
                try:
                    cur.execute(f'SELECT count(*) FROM "{t}";')
                    cnt = cur.fetchone()[0]
                    print(f"    - {t}: {cnt}")
                except Exception as e:
                    print(f"    - {t}: ERROR ({e})")
            con.close()
            
    # 2. Local JSON Files Audit
    print("\n[JSON FILES]")
    root = Path(".")
    json_files = list(root.glob(".local-*.json")) + list(root.glob("*.json"))
    for jf in json_files:
        if "node_modules" in str(jf) or ".next" in str(jf):
            continue
        try:
            sz = jf.stat().st_size
            print(f"  - {jf}: {sz:,} bytes")
        except Exception:
            pass
            
    # 3. Documents & Uploads
    print("\n[DOCUMENTS & UPLOADS]")
    for doc_dir in [Path("data/Documents"), Path("public/uploads"), Path("uploads")]:
        if doc_dir.exists():
            files = list(doc_dir.rglob("*.*"))
            print(f"  - {doc_dir}: {len(files)} files")
        else:
            print(f"  - {doc_dir}: (does not exist)")
            
    # 4. Backups Folder
    print("\n[BACKUP FOLDERS]")
    for b_dir in [Path("data/backups"), Path("data/Backups"), Path("backups"), Path(os.environ.get("LOCALAPPDATA", "")) / "AQ COMPANIES" / "Backups"]:
        if b_dir and b_dir.exists():
            b_files = list(b_dir.rglob("*.*"))
            print(f"  - {b_dir}: {len(b_files)} backup files")
        else:
            print(f"  - {b_dir}: (does not exist)")

if __name__ == "__main__":
    main()
