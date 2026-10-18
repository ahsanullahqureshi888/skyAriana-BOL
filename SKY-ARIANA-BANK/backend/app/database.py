import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parents[1]


# Choose database URL based on environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Check Vercel Postgres / external database environment variables
    DATABASE_URL = os.getenv("POSTGRES_URL") or os.getenv("POSTGRES_PRISMA_URL")

# If still not found, set default SQLite DB
if not DATABASE_URL:
    if os.getenv("VERCEL") == "1":
        DATABASE_URL = "sqlite:////tmp/sky_banking.db"
    else:
        DATABASE_URL = f"sqlite:///{BASE_DIR / 'sky_banking.db'}"

# SQLAlchemy requires postgresql:// instead of postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False, "timeout": 15} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA busy_timeout=10000;")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)



class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
