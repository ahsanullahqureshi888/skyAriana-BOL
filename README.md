# SKY ARIANA LIMITED Logistics Platform

React frontend with Apple/macOS glass UI, plus a Python FastAPI backend for local database, uploads, media, PDF/Excel workflows, reports, and future OCR/AI automation.

## Architecture

- Frontend: Next.js, React, Tailwind CSS, shadcn/Radix UI, Framer Motion, Lucide icons.
- Backend: FastAPI, Uvicorn, SQLAlchemy, Pydantic, Alembic.
- Local database: SQLite at `backend/data/sky_logistics.db`.
- Future database: PostgreSQL by setting `DATABASE_URL`.
- Local storage: `backend/uploads/`, `backend/media/`, and `backend/exports/`.

The React UI remains the main user interface. The Python backend runs separately on `127.0.0.1:8000`, and the frontend can call it directly through `lib/python-api.ts` or through existing Next API routes that now try Python first and fall back to current local storage.

## Run Frontend

From the project root:

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Run Backend

Install backend packages into the local virtual environment:

```bash
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Start FastAPI:

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If `uvicorn` is not on PATH, use:

```bash
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Or run:

```bash
backend\start-backend.cmd
```

Backend health check:

[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

API docs:

[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Backend API Routes

- `GET/POST /api/invoices`
- `GET/POST /api/bill-of-lading`
- `GET/POST /api/import-accounts`
- `GET/POST /api/export-accounts`
- `GET/POST /api/account-ledgers`
- `GET/POST /api/ledger-entries`
- `GET/POST /api/trucks`
- `GET/POST /api/containers`
- `GET /api/media`
- `POST /api/upload`
- `GET/POST /api/settings`
- `GET /api/reports/summary`
- `GET /api/search?q=...`

## Database Tables

The backend creates these tables automatically on startup:

- `users`
- `company_settings`
- `user_settings`
- `invoices`
- `bill_of_lading`
- `import_accounts`
- `export_accounts`
- `ledger_entries`
- `trucks`
- `containers`
- `media_files`
- `uploaded_documents`

## PostgreSQL Later

Set `DATABASE_URL` before starting FastAPI:

```bash
set DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/sky_logistics
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Alembic Migrations

From the `backend` folder:

```bash
alembic revision --autogenerate -m "schema update"
alembic upgrade head
```
