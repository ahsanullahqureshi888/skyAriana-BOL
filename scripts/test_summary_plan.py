import sqlite3
import time

conn = sqlite3.connect("data/app.db")
cur = conn.cursor()

sql = "SELECT count(id), sum(debit), sum(credit) FROM ledger_records WHERE currency = 'USD' AND account_id = 'ACC-138e08e812';"
cur.execute(f"EXPLAIN QUERY PLAN {sql}")
print("Plan:", cur.fetchall())

t0 = time.perf_counter()
for _ in range(10):
    cur.execute(sql)
    _ = cur.fetchall()
ms = (time.perf_counter() - t0) * 100
print(f"Direct SQLite time (10 runs avg): {ms:.3f} ms")

conn.close()
