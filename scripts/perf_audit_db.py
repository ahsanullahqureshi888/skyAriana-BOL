import sqlite3
from pathlib import Path

db_path = Path("data/app.db")
conn = sqlite3.connect(str(db_path))
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [r[0] for r in cur.fetchall()]

print("=== TABLES & COUNTS ===")
for t in tables:
    if t.startswith("sqlite_"):
        continue
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{t}";')
        cnt = cur.fetchone()[0]
        print(f"{t:<35} : {cnt}")
    except Exception as e:
        print(f"{t:<35} : Error {e}")

conn.close()
