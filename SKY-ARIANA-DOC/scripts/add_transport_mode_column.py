import sqlite3

db_path = r'e:\New folder\sky-ariana-bbb\acci-laravel\database\database.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(shipping_stickers)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Existing columns: {columns}")

if 'transport_mode' not in columns:
    cursor.execute("ALTER TABLE shipping_stickers ADD COLUMN transport_mode VARCHAR(255) NULL")
    conn.commit()
    print("Added transport_mode column to shipping_stickers table successfully!")
else:
    print("transport_mode column already exists.")

conn.close()
