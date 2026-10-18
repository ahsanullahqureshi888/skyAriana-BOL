# AQ COMPANIES v5.2.0 — DISASTER RECOVERY & RESILIENCE MANUAL

## 1. Principles of Disaster Recovery
1. **Never Silently Overwrite**: If the primary database fails to load, AQ Companies **NEVER** silently initializes an empty database. It triggers **RECOVERY MODE**.
2. **Forensic Quarantine First**: Before any recovery action, damaged or corrupted database files are preserved in `data/recovery/CORRUPT_DATABASE_<timestamp>/`.
3. **Atomic Database Switch**: Recovery is never performed in-place on live files. Data is staged in `data/recovery/restored.tmp/`, verified, and then atomically swapped.
4. **Accounting Invariance Verification**: Recovery is not considered successful until post-validation confirms:
   $$\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$$

---

## 2. Disaster Recovery Scenarios

### Scenario A: Primary Database Cannot Be Opened / Corrupted JSON
**Symptom**: System reports database corruption or syntax failure on startup.
**Action**:
1. AQ Companies automatically quarantines the corrupted files with a forensic manifest.
2. The UI enters **System Recovery Mode**.
3. Direct disk discovery scans `data/backups/` and highlights the **Recommended Recovery Point** (Golden Backup).
4. Click **[ Recover System Now ]**.
5. The system restores data into staging, verifies debit/credit balance invariance, backs up previous files to `data/recovery/previous.db/`, and atomically switches to active production.

### Scenario B: Missing Database / Accidental Deletion
**Symptom**: All `.local-*.json` files are missing from `data/`.
**Action**:
1. Open **Recovery Center**.
2. The system scans the backup folder directly from disk—even without an active database catalog.
3. Select the latest verified full backup.
4. Click **[ Recover System ]**.
5. Full operational data (BOLs, Shipments, Accounts, Invoices, Ledgers) is restored.

### Scenario C: Interrupted Restore / Power Failure Mid-Restore
**Symptom**: Computer rebooted or lost power halfway through a restore.
**Action**:
1. Every restore begins with an automatic pre-restore safety snapshot (`AQ_COMPANIES_PRE_RESTORE_...json`) and stages changes in `.tmp` files.
2. If restore aborts mid-flight, the transactional rollback engine reverts to the pre-restore snapshot.
3. If necessary, navigate to **Restore History** and click **Rollback** to re-apply the pre-restore state.

### Scenario D: Broken Incremental Backup Chain
**Symptom**: An incremental backup is selected, but one intermediate parent is missing.
**Action**:
1. The incremental chain validator inspects the full lineage: `Base A -> Inc B -> Inc C`.
2. If `Inc B` is missing or corrupted, the system halts and notifies:
   `Broken incremental backup chain: Parent backup [id] is missing or corrupted.`
3. Select the nearest valid full backup or restore the missing parent file to disk.

---

## 3. Testing Disaster Recovery
To verify disaster recovery in a test environment without touching live data:
```bash
npm run test:disaster-recovery
```
This executes an isolated test sandbox verifying zero-record protection, corrupted file quarantine, disk discovery, and atomic database switching.

---

## 4. Phase 4 Continuous Readiness & Recovery Drills
- **Hard Safety Gate**: Automated recovery drills execute exclusively inside isolated temporary sandboxes (`data/recovery/drill-<id>`). If a drill detects that its restore target matches the production database path, it throws `FATAL_SAFETY_VIOLATION` and halts immediately.
- **Continuous Readiness Accreditation**: A recovery drill restores the backup, computes post-restore accounting invariance ($\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$), verifies BOL relations, and certifies the backup with **Known Good** accreditation.
- **Fail-Safe Alerting**: If any test restore fails, the protection dashboard immediately downgrades status to **AT RISK** or **WARNING**, ensuring operators are never lulled into false confidence.
- **Clean Teardown**: Post-drill execution unconditionally removes temporary files and resets memory state.
