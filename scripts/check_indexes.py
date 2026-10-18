import sqlite3

conn = sqlite3.connect("data/app.db")
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
tables = [r[0] for r in cur.fetchall()]

for table in tables:
    cur.execute(f"PRAGMA table_info('{table}');")
    cols = [c[1] for c in cur.fetchall()]
    cur.execute(f"PRAGMA index_list('{table}');")
    indexes = cur.fetchall()
    print(f"\nTable: {table}")
    print(f"  Columns: {', '.join(cols)}")
    print(f"  Indexes ({len(indexes)}):")
    for idx in indexes:
        cur.execute(f"PRAGMA index_info('{idx[1]}');")
        idx_cols = [c[2] for c in cur.fetchall()]
        print(f"    - {idx[1]} ({', '.join(idx_cols)})")

conn.close()
