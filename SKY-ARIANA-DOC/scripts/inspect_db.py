import sqlite3

conn = sqlite3.connect('acci-laravel/database/database.sqlite')
cursor = conn.cursor()

tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for (tname,) in tables:
    cols = [col[1] for col in cursor.execute(f"PRAGMA table_info({tname})").fetchall()]
    print(f"Table: {tname} -> Columns: {cols}")

conn.close()
