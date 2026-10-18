/**
 * AQ COMPANIES — Staging Data Integrity & Invariance Verification
 * Validates the restored staging environment against all v5.2.0 quality gates.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const stagingDir = path.resolve('data/staging');
console.log('====================================================');
console.log('🔍 AQ COMPANIES — STAGING INTEGRITY & INVARIANCE AUDIT');
console.log('====================================================\n');

const bols = JSON.parse(fs.readFileSync(path.join(stagingDir, '.staging-bol-database.json'), 'utf8'));
const ledgers = JSON.parse(fs.readFileSync(path.join(stagingDir, '.staging-account-ledgers.json'), 'utf8'));
const companies = JSON.parse(fs.readFileSync(path.join(stagingDir, '.staging-companies.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(stagingDir, 'aq_v5_2_import_report.json'), 'utf8'));

let defects = 0;
function check(name, condition, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    defects++;
    console.error(`  ❌ [FAIL] ${name}: ${details}`);
  }
}

// 1. Document Counts
check('Total Documents Count is 198', bols.length === 198, `Found ${bols.length}`);
const activeDocs = bols.filter(b => !b.quarantined);
const quarantinedDocs = bols.filter(b => b.quarantined);
check('Active Documents is 197', activeDocs.length === 197, `Found ${activeDocs.length}`);
check('Quarantined Test Records is 1', quarantinedDocs.length === 1, `Found ${quarantinedDocs.length}`);
check('Test Record is BOL-RESTORE-TEST-1', quarantinedDocs[0].bolNumber === 'BOL-RESTORE-TEST-1');

// 2. BOL Identity Invariance
const bolNumbers = bols.map(b => b.bolNumber).filter(Boolean);
const uniqueBolNumbers = new Set(bolNumbers);
check('Zero Duplicate BOL Numbers', bolNumbers.length === uniqueBolNumbers.size, `${bolNumbers.length - uniqueBolNumbers.size} duplicate BOLs`);

const bol530 = bols.find(b => b.bolNumber === 'BOL-2026-NSA530');
check('BOL-2026-NSA530 Official Identity Preserved', Boolean(bol530 && bol530.bolNumber === 'BOL-2026-NSA530'));
check('BOL-2026-NSA530 Internal UUID is valid UUID format', Boolean(bol530 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bol530.id)));

// 3. Driver Rent Repairs
const afnRentCount = bols.filter(b => b.driverRent.currency === 'AFN' && b.driverRent.amount > 0).length;
check('Preserved 49+ AFN Repaired Driver Rents', afnRentCount >= 49, `Found ${afnRentCount}`);

const rent519 = bols.find(b => b.bolNumber === 'BOL-2026-NSA519');
const rent516 = bols.find(b => b.bolNumber === 'BOL-2026-NSA516');
check('BOL-2026-NSA519 Unresolved Rent Currency Preserved (REVIEW_REQUIRED)', Boolean(rent519 && rent519.driverRent.reviewRequired && (rent519.driverRent.currency === null || rent519.driverRent.currency === 'USD')));
check('BOL-2026-NSA516 Unresolved Rent Currency Preserved (REVIEW_REQUIRED)', Boolean(rent516 && rent516.driverRent.reviewRequired && (rent516.driverRent.currency === null || rent516.driverRent.currency === 'USD')));

// 4. Truck Plates & Shipper Recovery
const restoredTrucks = bols.filter(b => b.truckNumber && /[\u0600-\u06FF]/.test(b.truckNumber)).length;
check('Authentic Afghan Truck Plates Preserved with Unicode', restoredTrucks >= 35, `Found ${restoredTrucks}`);

const nsa470 = bols.find(b => b.bolNumber === 'BOL-2026-NSA470');
check('BOL-2026-NSA470 Shipper Restored to NAJEB AMIN LTD', Boolean(nsa470 && nsa470.shipperName === 'NAJEB AMIN LTD'));

// 5. Weight Invariance & Null Handling
const nsa584 = bols.find(b => b.bolNumber === 'BOL-2026-NSA584');
check('BOL-2026-NSA584 Corrupt Weights Cleared to Null (Not Guessed)', Boolean(nsa584 && nsa584.cargo.netWeightKg === null && nsa584.cargo.grossWeightKg === null));

// 6. Companies Count
check('Custom Companies Count is 64', companies.length === 64, `Found ${companies.length}`);

// 7. Ledger Deduplication & Invariance
check('Canonical Ledger Entries Count is 1,942', ledgers.entries.length === 1942, `Found ${ledgers.entries.length}`);
check('Canonical Accounts Mapped from Legacy Keys (92 keys)', ledgers.accounts.length === 92, `Found ${ledgers.accounts.length}`);
check('Legacy Alias Keys Preserved (92 keys)', ledgers.legacyAliasKeys.length === 92, `Found ${ledgers.legacyAliasKeys.length}`);

let totalDeb = 0, totalCred = 0;
for (const e of ledgers.entries) {
  totalDeb += e.debit || 0;
  totalCred += e.credit || 0;
}
totalDeb = Math.round(totalDeb * 100) / 100;
totalCred = Math.round(totalCred * 100) / 100;
const netBal = Math.round((totalDeb - totalCred) * 100) / 100;
check('Total Debit matches expected ($15,028,647.86)', totalDeb === 15028647.86, `Got ${totalDeb}`);
check('Total Credit matches expected ($10,053,956.00)', totalCred === 10053956, `Got ${totalCred}`);
check('Net Balance satisfies Debit - Credit ($4,974,691.86)', netBal === 4974691.86, `Got ${netBal}`);

// 8. Variant 7 Resolution Check (BOL-2026-NSA644)
const variant7 = ledgers.entries.find(e => e.id === '939bed90-fc9b-476d-a087-bda4aadf4310');
check('Variant 7 Resolved: Debit is 12070 and Truck is 49338 هرات', Boolean(variant7 && variant7.debit === 12070 && variant7.truckNumber === '49338 هرات'));

console.log('\n====================================================');
if (defects === 0) {
  console.log('🏁 STAGING AUDIT RESULT: 100% PASSED (0 Defects)');
} else {
  console.error(`🏁 STAGING AUDIT RESULT: FAILED (${defects} Defects)`);
  process.exit(1);
}
console.log('====================================================\n');
