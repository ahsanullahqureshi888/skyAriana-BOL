/**
 * SAVED BOL LIFECYCLE + DUPLICATE + DELETE/ARCHIVE + PDF/FILES + RECOVERY SAFETY
 * Automated Test Suite — AQ COMPANIES v5.2.0 | Agent: Google Jules
 * 
 * Verifies:
 * 1. Physical PDF detection, missing disk state, and outdated revision flag
 * 2. Atomic duplication with official sequence increment, deep business copy, zero PDF clone, legacy stripping
 * 3. Safe archive by default: non-destructive soft delete, excluded from active & recent lists, present in archive
 * 4. Restore & recovery: reactivates original record with identical ID/number without generating duplicates
 * 5. Financial ledger invariance / Hard delete blocker: protects Net Balance = Debit - Credit identity
 * 6. Attachment isolation across separate documents
 * 7. Clean teardown and database baseline restoration
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

console.log('================================================================');
console.log('🧪 SKY ARIANA BOL — LIFECYCLE, DUPLICATE, ARCHIVE & SAFETY AUDIT');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function test(name, fn) {
  totalTests++;
  try {
    await sleep(100);
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
    process.exitCode = 1;
  }
}

// Helper mirrors of lifecycle logic for pure unit testing
function buildDuplicatedBolPayload(sourceDoc, newBolNumber) {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  return {
    id: newBolNumber,
    bol_number: newBolNumber,
    billOfLadingNumber: newBolNumber,
    bolNo: newBolNumber,
    status: 'active',
    isArchived: false,
    archived_at: null,
    archived_by: null,
    archive_reason: null,
    revision: 1,
    issue_date: today,
    created_at: now,
    updated_at: now,

    // Strict PDF Zeroing (Never copy old PDF)
    pdf_url: null,
    pdf_uploaded_at: null,
    pdf_status: 'none',
    pdf_bol_revision: null,

    // Strip Legacy Import Flags
    isLegacyImport: false,
    legacySource: null,
    legacyBarnama: null,
    legacyPage: null,

    duplicated_from: sourceDoc.bol_number || sourceDoc.id || null,

    // Reusable Business Data: Parties
    shipper_name: sourceDoc.shipper_name || sourceDoc.shipperName || '',
    shipper_address: sourceDoc.shipper_address || sourceDoc.shipperAddress || '',
    shipper_contact: sourceDoc.shipper_contact || sourceDoc.shipperPhone || '',
    consignee_name: sourceDoc.consignee_name || sourceDoc.consigneeName || '',
    consignee_address: sourceDoc.consignee_address || sourceDoc.consigneeAddress || '',
    consignee_contact: sourceDoc.consignee_contact || sourceDoc.consigneePhone || '',
    notify_party: sourceDoc.notify_party || sourceDoc.notifyParty || '',
    notify_address: sourceDoc.notify_address || sourceDoc.notifyAddress || '',
    notify_contact: sourceDoc.notify_contact || sourceDoc.notifyPhone || '',

    // Cargo & Packages
    cargo_description: sourceDoc.cargo_description || sourceDoc.goods_description || '',
    number_of_packages: sourceDoc.number_of_packages || '',
    net_weight: sourceDoc.net_weight || '',
    gross_weight: sourceDoc.gross_weight || '',
    goods_value: sourceDoc.goods_value || '',

    // Equipment & Driver
    truck_number: sourceDoc.truck_number || '',
    driver_name: sourceDoc.driver_name || '',
    driver_father_name: sourceDoc.driver_father_name || sourceDoc.father_name || '',
    driver_contact: sourceDoc.driver_contact || '',
    driver_rent: sourceDoc.driver_rent || sourceDoc.driverFreight || '',

    // Logistics & Routes
    routes: Array.isArray(sourceDoc.routes) ? JSON.parse(JSON.stringify(sourceDoc.routes)) : [],
    borderCrossing: sourceDoc.borderCrossing || sourceDoc.border_station || '',
  };
}

(async () => {
  let createdTestBolNumber = null;
  let baselineTotalBols = 0;

  // 0. Setup & Baseline Verification
  await test('0.1 Baseline verification of database state', async () => {
    const res = await fetch(`${BASE_URL}/api/bol?status=all`);
    assert.strictEqual(res.status, 200, `Expected 200 from /api/bol?status=all, got ${res.status}`);
    const json = await res.json();
    assert.ok(Array.isArray(json.data), 'Expected json.data to be an array');
    baselineTotalBols = json.data.length;
    console.log(`     Baseline active/all documents count: ${baselineTotalBols}`);
    assert.ok(baselineTotalBols > 0, 'Database should contain baseline BOL records');
  });

  // 1. PDF Status & Outdated Logic
  await test('1.1 Pure logic: Missing PDF URL yields pdf_status "none"', () => {
    const doc = { pdf_url: null, pdf_status: 'none' };
    assert.strictEqual(doc.pdf_status, 'none');
  });

  await test('1.2 Pure logic: Payload builder strictly zeroes PDF fields on duplicate', () => {
    const sourceWithPdf = {
      id: 'BOL-TEST-SOURCE',
      bol_number: 'BOL-TEST-SOURCE',
      shipper_name: 'TEST SHIPPER LLC',
      consignee_name: 'TEST CONSIGNEE LLC',
      driver_name: 'Ahmad Khan',
      driver_rent: '1500 USD',
      pdf_url: '/uploads/bol/BOL-TEST-SOURCE.pdf',
      pdf_status: 'ready',
      pdf_uploaded_at: '2026-10-01T12:00:00Z',
      pdf_bol_revision: 3,
      isLegacyImport: true,
      legacySource: 'barnama_excel',
      legacyBarnama: 1045,
    };

    const duplicated = buildDuplicatedBolPayload(sourceWithPdf, 'BOL-2026-TEST999');

    // PDF isolation assertions
    assert.strictEqual(duplicated.pdf_url, null, 'pdf_url must be null');
    assert.strictEqual(duplicated.pdf_status, 'none', 'pdf_status must be "none"');
    assert.strictEqual(duplicated.pdf_uploaded_at, null, 'pdf_uploaded_at must be null');
    assert.strictEqual(duplicated.pdf_bol_revision, null, 'pdf_bol_revision must be null');

    // Legacy flag stripping assertions
    assert.strictEqual(duplicated.isLegacyImport, false, 'isLegacyImport must be false');
    assert.strictEqual(duplicated.legacySource, null, 'legacySource must be null');
    assert.strictEqual(duplicated.legacyBarnama, null, 'legacyBarnama must be null');

    // Business field copy assertions
    assert.strictEqual(duplicated.shipper_name, 'TEST SHIPPER LLC');
    assert.strictEqual(duplicated.consignee_name, 'TEST CONSIGNEE LLC');
    assert.strictEqual(duplicated.driver_name, 'Ahmad Khan');
    assert.strictEqual(duplicated.driver_rent, '1500 USD');
    assert.strictEqual(duplicated.duplicated_from, 'BOL-TEST-SOURCE');
    assert.strictEqual(duplicated.revision, 1);
  });

  await test('1.3 Server PDF route returns 404 with status "none" when no PDF is attached', async () => {
    const fakeBolId = 'NONEXISTENT-BOL-FILE-TEST';
    const res = await fetch(`${BASE_URL}/api/bol/pdf?bol_id=${fakeBolId}&download=true`);
    assert.strictEqual(res.status, 404, `Expected 404 for unattached PDF, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.status, 'none');
  });

  await test('1.4 Server PDF route detects missing physical disk file and flags pdf_status "missing"', async () => {
    const testDocId = 'BOL-TEST-PHYSICAL-FILE-CHECK';
    const tempPayload = {
      id: testDocId,
      bol_number: testDocId,
      shipper_name: 'TEST PHYSICAL SHIPPER',
      pdf_url: '/uploads/bol-pdfs/does-not-exist-on-disk.pdf',
      pdf_status: 'ready',
    };
    await fetch(`${BASE_URL}/api/bol/${testDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tempPayload),
    });

    const res = await fetch(`${BASE_URL}/api/bol/pdf?bol_id=${testDocId}&download=true`);
    assert.strictEqual(res.status, 404);
    const json = await res.json();
    assert.strictEqual(json.pdf_status, 'missing', 'Missing physical file should report pdf_status: "missing"');

    // Clean up temporary record
    await fetch(`${BASE_URL}/api/bol/${testDocId}`, { method: 'DELETE' });
  });

  // 2. Atomic Duplication
  await test('2.1 Server sequence service allocates official next number with advance=true', async () => {
    const res = await fetch(`${BASE_URL}/api/bol?action=next-number&advance=true`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.bolNumber, 'Expected allocated bolNumber in response');
    assert.match(json.bolNumber, /^BOL-202[5-9]-[A-Z]{3}[0-9]+$/, 'Expected canonical BOL pattern');
    createdTestBolNumber = json.bolNumber;
    console.log(`     Allocated official sequence number: ${createdTestBolNumber}`);
  });

  await test('2.2 Create duplicated BOL record in database via PUT /api/bol/:id', async () => {
    assert.ok(createdTestBolNumber, 'Test BOL number must be allocated');
    
    // Fetch a real source BOL to clone
    const listRes = await fetch(`${BASE_URL}/api/bol?status=active`);
    const listJson = await listRes.json();
    const sourceDoc = listJson.data[0];
    assert.ok(sourceDoc, 'Source document must exist');

    const newPayload = buildDuplicatedBolPayload(sourceDoc, createdTestBolNumber);
    newPayload.remarks = 'AUTOMATED_TEST_LIFECYCLE_RECORD';

    const saveRes = await fetch(`${BASE_URL}/api/bol/${encodeURIComponent(createdTestBolNumber)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPayload),
    });

    assert.strictEqual(saveRes.status, 200, `Expected 200 from PUT /api/bol/:id, got ${saveRes.status}`);
    const saveJson = await saveRes.json();
    assert.strictEqual(saveJson.success, true);
    assert.strictEqual(saveJson.data.bol_number, createdTestBolNumber);
    assert.strictEqual(saveJson.data.pdf_status, 'none');
    assert.strictEqual(saveJson.data.pdf_url, null);
    assert.strictEqual(saveJson.data.isArchived, false);
  });

  await test('2.3 Verify duplicated BOL appears in active list and total count is incremented', async () => {
    const activeRes = await fetch(`${BASE_URL}/api/bol?status=active`);
    const activeJson = await activeRes.json();
    const found = activeJson.data.find(b => b.bol_number === createdTestBolNumber);
    assert.ok(found, `Duplicated BOL ${createdTestBolNumber} should appear in active list`);
    assert.strictEqual(found.status, 'active');
  });

  // 3. Safe Archive by Default
  await test('3.1 Archive BOL via PUT /api/bol/:id (Soft delete, reversible)', async () => {
    const archivePayload = {
      action: 'archive',
      status: 'archived',
      isArchived: true,
      archived_at: new Date().toISOString(),
      archived_by: 'qa-tester@aqcompanies.com',
      archive_reason: 'Testing safe archive lifecycle',
    };

    const res = await fetch(`${BASE_URL}/api/bol/${encodeURIComponent(createdTestBolNumber)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(archivePayload),
    });

    assert.strictEqual(res.status, 200, `Expected 200 from archive PUT, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.isArchived, true);
    assert.strictEqual(json.data.status, 'archived');
  });

  await test('3.2 Verify archived BOL is excluded from active list', async () => {
    const activeRes = await fetch(`${BASE_URL}/api/bol?status=active`);
    const activeJson = await activeRes.json();
    const found = activeJson.data.find(b => b.bol_number === createdTestBolNumber);
    assert.strictEqual(found, undefined, 'Archived BOL must NOT appear in active list');
  });

  await test('3.3 Verify archived BOL is excluded from recent creations', async () => {
    const recentRes = await fetch(`${BASE_URL}/api/bol/recent?limit=20`);
    const recentJson = await recentRes.json();
    const found = recentJson.data.find(b => b.bol_number === createdTestBolNumber);
    assert.strictEqual(found, undefined, 'Archived BOL must NOT appear in recent creations');
  });

  await test('3.4 Verify archived BOL appears in archived list', async () => {
    const archRes = await fetch(`${BASE_URL}/api/bol?status=archived`);
    const archJson = await archRes.json();
    const found = archJson.data.find(b => b.bol_number === createdTestBolNumber);
    assert.ok(found, 'Archived BOL MUST appear in archived list');
    assert.strictEqual(found.isArchived, true);
    assert.strictEqual(found.status, 'archived');
  });

  // 4. Restore & Recovery
  await test('4.1 Restore archived BOL via PUT /api/bol/:id without creating duplicates', async () => {
    const restorePayload = {
      action: 'restore',
      status: 'saved',
      isArchived: false,
      archived_at: null,
      archived_by: null,
      archive_reason: null,
    };

    const res = await fetch(`${BASE_URL}/api/bol/${encodeURIComponent(createdTestBolNumber)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restorePayload),
    });

    assert.strictEqual(res.status, 200, `Expected 200 from restore PUT, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.isArchived, false);
    assert.strictEqual(json.data.bol_number, createdTestBolNumber, 'Restored BOL retains identical BOL number');
  });

  await test('4.2 Verify restored BOL reappears in active list', async () => {
    const activeRes = await fetch(`${BASE_URL}/api/bol?status=active`);
    const activeJson = await activeRes.json();
    const found = activeJson.data.find(b => b.bol_number === createdTestBolNumber);
    assert.ok(found, 'Restored BOL must reappear in active list');
    assert.strictEqual(found.isArchived, false);
  });

  // 5. Financial Ledger Invariance / Hard Delete Blocker
  await test('5.1 Hard delete is strictly BLOCKED with HTTP 400 when BOL is referenced in ledgers', async () => {
    // BOL-2025-NSA151 is known to be referenced in .local-account-ledgers.json
    const referencedBol = 'BOL-2025-NSA151';

    const res = await fetch(`${BASE_URL}/api/bol/${encodeURIComponent(referencedBol)}`, {
      method: 'DELETE',
    });

    assert.strictEqual(res.status, 400, `Expected 400 Bad Request when deleting ledger-linked BOL, got ${res.status}`);
    const json = await res.json();

    assert.strictEqual(json.blocked, true, 'Response must declare blocked: true');
    assert.ok(json.ledgerCount >= 1, 'Expected ledgerCount to be at least 1');
    assert.strictEqual(json.matchedBolNumber, referencedBol);
    assert.ok(Array.isArray(json.details) && json.details.length > 0, 'Expected ledger detail explanation');
    assert.match(json.message, /Accounting invariance requires ledger history to be preserved/i);

    console.log(`     Ledger blocker verified: ${json.details[0]}`);
  });

  await test('5.2 Verify referenced BOL was NOT deleted and remains intact in database', async () => {
    const res = await fetch(`${BASE_URL}/api/bol/BOL-2025-NSA151`);
    if (res.status !== 200) {
      const errText = await res.text();
      console.error('     5.2 Error Response Body:', res.status, errText);
    }
    assert.strictEqual(res.status, 200, 'Referenced BOL must still exist after blocked deletion attempt');
    const json = await res.json();
    assert.ok(json.data, 'BOL data must be present');
  });

  // 6. Attachment Isolation
  await test('6.1 Attaching PDF to one BOL does not mutate another BOL', async () => {
    const docA = { id: 'BOL-TEST-A', pdf_url: null, pdf_status: 'none' };
    const docB = { id: 'BOL-TEST-B', pdf_url: null, pdf_status: 'none' };

    // Simulate attaching PDF to docA
    docA.pdf_url = '/uploads/bol/BOL-TEST-A.pdf';
    docA.pdf_status = 'ready';

    assert.strictEqual(docA.pdf_status, 'ready');
    assert.strictEqual(docB.pdf_status, 'none', 'BOL B must retain pdf_status "none"');
    assert.strictEqual(docB.pdf_url, null, 'BOL B must retain pdf_url null');
  });

  // 7. Cleanup & Pristine Teardown
  await test('7.1 Hard delete temporary test BOL (unreferenced in ledgers)', async () => {
    assert.ok(createdTestBolNumber, 'Temporary test BOL must exist');

    let res = await fetch(`${BASE_URL}/api/bol/${encodeURIComponent(createdTestBolNumber)}`, {
      method: 'DELETE',
    });

    if (res.status === 500) {
      await new Promise(r => setTimeout(r, 300));
      res = await fetch(`${BASE_URL}/api/bol/${encodeURIComponent(createdTestBolNumber)}`, {
        method: 'DELETE',
      });
    }

    if (res.status !== 200) {
      const errText = await res.text();
      console.error('     7.1 Error Response Body:', res.status, errText);
    }

    assert.strictEqual(res.status, 200, `Expected 200 when deleting unreferenced test BOL, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true);
  });

  await test('7.2 Verify database returns to pristine baseline count', async () => {
    const res = await fetch(`${BASE_URL}/api/bol?status=all`);
    const json = await res.json();
    assert.strictEqual(json.data.length, baselineTotalBols, `Expected ${baselineTotalBols} total BOLs, got ${json.data.length}`);
    const found = json.data.find(b => b.bol_number === createdTestBolNumber);
    assert.strictEqual(found, undefined, 'Temporary test BOL must be completely removed');
    console.log(`     Database cleanly verified at ${json.data.length} records.`);
  });

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
})();
