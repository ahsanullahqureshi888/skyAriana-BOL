import os
import sys
import shutil

# Add backend directory to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Handle Vercel serverless SQLite database path
if os.environ.get("VERCEL") or os.environ.get("NOW_REGION"):
    tmp_db_path = "/tmp/invoices.db"
    orig_db_path = os.path.join(backend_dir, "invoices.db")
    if not os.path.exists(tmp_db_path):
        if os.path.exists(orig_db_path):
            shutil.copy2(orig_db_path, tmp_db_path)
        else:
            root_db = os.path.join(root_dir, "invoices.db")
            if os.path.exists(root_db):
                shutil.copy2(root_db, tmp_db_path)
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db_path}"
    os.environ["UPLOAD_DIR"] = "/tmp/uploads"
    os.makedirs("/tmp/uploads", exist_ok=True)

from app.main import app
