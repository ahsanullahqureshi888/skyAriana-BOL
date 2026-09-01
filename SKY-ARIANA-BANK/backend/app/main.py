from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routes.api import router
from .services.seed import seed_database


app = FastAPI(title="Sky Banking API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


from sqlalchemy import text

@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        for column_query in [
            "ALTER TABLE settings ADD COLUMN receipt_prefix VARCHAR(40) DEFAULT 'TX';",
            "ALTER TABLE settings ADD COLUMN auto_backup BOOLEAN DEFAULT 0;",
            "ALTER TABLE settings ADD COLUMN last_backup_at VARCHAR(100);",
            "ALTER TABLE settings ADD COLUMN next_receipt_number INTEGER DEFAULT 1;",
            "ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(100);",
            "ALTER TABLE audit_logs ADD COLUMN device_info VARCHAR(255);"
        ]:
            try:
                db.execute(text(column_query))
                db.commit()
            except Exception:
                db.rollback()
        seed_database(db)




@app.get("/")
def root():
    return {"name": "Sky Banking API", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/health")
def api_health():
    return {"status": "healthy"}
