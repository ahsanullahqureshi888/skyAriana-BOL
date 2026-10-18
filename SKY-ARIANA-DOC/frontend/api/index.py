import os
import sys
import shutil

# Add frontend directory to sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.dirname(api_dir)

if frontend_dir not in sys.path:
    sys.path.insert(0, frontend_dir)

# Handle Vercel serverless SQLite database path
if os.environ.get("VERCEL") or os.environ.get("NOW_REGION"):
    tmp_db_path = "/tmp/invoices.db"
    orig_db_path = os.path.join(frontend_dir, "invoices.db")
    if not os.path.exists(tmp_db_path) and os.path.exists(orig_db_path):
        shutil.copy2(orig_db_path, tmp_db_path)
    
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db_path}"
    os.environ["UPLOAD_DIR"] = "/tmp/uploads"
    os.makedirs("/tmp/uploads", exist_ok=True)

from app.main import app
