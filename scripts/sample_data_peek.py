import sqlite3

conn = sqlite3.connect("data/app.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM bol_records LIMIT 1;")
row = dict(cur.fetchone())
for k, v in row.items():
    print(f"  {k}: {v}")
conn.close()


