# Sky Ariana BOL — Production Release & Rollback Guide

**Release Checkpoint:** `AQ-COMPANIES-RC-UI-MOBILE-1`  
**Application Version:** `5.1.0`  
**Target Environment:** Windows Desktop (Electron) & LAN / Cloud Web Server  

---

## 1. PRE-RELEASE GATES & VALIDATION

Before promoting `jules/ui-mobile-performance-fixes` to production, execute the automated release gate suite:

```bash
# 1. Fast QA verification (Data integrity, 479 tests, typecheck, lint)
npm run qa

# 2. Specialized mobile & A4 preview checks
npm run qa:mobile
npm run qa:a4

# 3. Full production build verification
npm run qa:full
```

All commands must exit with code `0`.

---

## 2. DATABASE BACKUP BEFORE MIGRATION

Always generate a cryptographically verified snapshot before running database or schema updates:

```bash
# Run automated pre-release backup and isolated sandbox restore test
npm run backup:release
```

- **Backup Target Directory:** `data/backups/release-RC1-backup-[timestamp].zip`
- **Included Stores:** All 60 `.local-*.json` data stores and `data/app.db` SQLite database.
- **Verification:** Automatically validates SHA256 integrity and verifies record counts (93 BOLs, 20 accounts) in an isolated sandbox.

---

## 3. DEPLOYMENT & MIGRATION WORKFLOW

### Zero-Downtime Deployment Sequence
1. **Pre-Deploy Verification:** Ensure git status is clean and all tests pass.
2. **Database Migrations (Idempotent):**
   ```bash
   python scripts/apply_indexes.py
   ```
   *Note:* All SQL statements use `CREATE INDEX IF NOT EXISTS` and `Base.metadata.create_all`, ensuring zero data alteration or table drop.
3. **Optimized Build:**
   ```bash
   npm run build
   ```
4. **Service Restart / Process Swap:** Switch traffic to the compiled Next.js build.
5. **Health & Readiness Check:**
   - `GET http://localhost:3001/api/health` -> HTTP 200 `{"status": "healthy"}`
   - `GET http://localhost:3001/api/ready` -> HTTP 200 `{"ready": true, "checks": {"database": "ready"}}`

---

## 4. POST-DEPLOYMENT VERIFICATION CHECKLIST

Immediately verify the running production instance:
1. **Login & Session:** Successfully authenticate as administrator.
2. **Saved BOL Totals:** Verify 93 records; total packages ~138k; total weight ~2.06M KG; total value ~$6.49M.
3. **Canonical BOL Numbers:** Confirm official numbers appear as `BOL-2026-NSA...` (zero raw UUID display).
4. **Files Consignee Linking:** Check `BOL-2026-NSA643` displays `SAFFRON HOME LLP` (never `Unassigned Customer`).
5. **A4 Preview:** Open a BOL, verify A4 scaling fits screen, stamp & authorized signature chamber render cleanly.
6. **Mobile Check (`390×844`):** Confirm zero horizontal body overflow (`scrollWidth <= clientWidth + 1`), mobile quick actions, and Container Analytics tabs reflow properly.

---

## 5. NON-DESTRUCTIVE ROLLBACK PROCEDURE

If a critical blocker is identified post-deployment:

### Scenario A: Rollback Immediately (No new user transactions created)
1. Stop the application server:
   ```bash
   # Terminate production node process
   taskkill /F /IM node.exe
   ```
2. Checkout the release candidate tag or prior stable commit:
   ```bash
   git checkout AQ-COMPANIES-RC-UI-MOBILE-1
   ```
3. Re-launch previous build:
   ```bash
   npm run start
   ```
4. Verify health endpoints: `/api/health`.

### Scenario B: Rollback After Live Transactions (Preserve New User Data)
> **CAUTION:** Never blindly restore a database backup if users created new BOLs, ledger entries, or receipts while the new version was active.
1. Create a live state snapshot of current data before touching anything:
   ```bash
   node -e "const fs=require('fs'); fs.copyFileSync('.local-shipments.json', '.local-shipments.emergency-rollback-snapshot.json');"
   ```
2. Roll back only application code (`git checkout <prior-commit>`).
3. Re-run `npm run verify:data` to confirm data integrity between existing records and newly added records.
