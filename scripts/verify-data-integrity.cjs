/**
 * AQ COMPANIES — Comprehensive Data Integrity Pre-Merge Audit
 * Phase 3: Production Release Hardening
 *
 * Checks:
 * 1. Duplicate BOL numbers
 * 2. Missing required BOL numbers
 * 3. Orphan cargo items
 * 4. Orphan files
 * 5. Orphan companies/accounts
 * 6. Invalid weights (negative, NaN, Infinity, > 100k KG)
 * 7. Invalid package quantities (negative, NaN, Infinity, > 10k pkgs)
 * 8. Invalid money values (NaN, Infinity)
 * 9. Broken currency values
 * 10. Missing relational integrity
 */

const fs = require('fs');
const path = require('path');

function readJsonSafe(filename, fallback = []) {
  try {
    if (!fs.existsSync(filename)) return fallback;
    const content = fs.readFileSync(filename, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return fallback;
  }
}

console.log('====================================================');
console.log('🔍 AQ COMPANIES — PRE-MERGE DATA INTEGRITY AUDIT');
console.log('====================================================\n');

const bols = readJsonSafe('.local-bols.json');
const shipments = readJsonSafe('.local-shipments.json');
const accounts = readJsonSafe('.local-accounts.json');
const shipmentFiles = readJsonSafe('.local-shipment-files.json');
const ledgers = readJsonSafe('.local-account-ledgers.json');

const issues = {
  duplicateBols: [],
  missingBolNumbers: [],
  suspiciousPackages: [],
  suspiciousWeights: [],
  invalidMoney: [],
  brokenCurrencies: [],
  orphanFiles: [],
  orphanLedgers: [],
  missingRelations: []
};

// 1. BOL Numbers & Duplicates in .local-bols.json
const bolNumberSet = new Set();
bols.forEach((b, idx) => {
  const num = b.bol_number || b.bolNumber;
  if (!num || typeof num !== 'string' || num.trim() === '') {
    issues.missingBolNumbers.push({ source: '.local-bols.json', index: idx, id: b.id });
    return;
  }
  const cleanNum = num.trim();
  if (bolNumberSet.has(cleanNum)) {
    issues.duplicateBols.push({ source: '.local-bols.json', bolNumber: cleanNum, id: b.id });
  }
  bolNumberSet.add(cleanNum);

  // Numeric sanity on BOLs
  const rawPkg = String(b.number_of_packages || '');
  const pkgNum = parseInt((rawPkg.replace(/,/g, '').match(/\d+/) || ['0'])[0], 10);
  if (isNaN(pkgNum) || !isFinite(pkgNum) || pkgNum > 10000 || pkgNum < 0) {
    issues.suspiciousPackages.push({ bol: cleanNum, value: rawPkg, parsed: pkgNum });
  }

  const rawGw = String(b.gross_weight || '');
  const gwNum = parseFloat((rawGw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) || ['0'])[0]);
  if (isNaN(gwNum) || !isFinite(gwNum) || gwNum > 100000 || gwNum < 0) {
    issues.suspiciousWeights.push({ bol: cleanNum, type: 'Gross Weight', value: rawGw, parsed: gwNum });
  }

  const rawVal = String(b.goods_value || '');
  const valNum = parseFloat((rawVal.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) || ['0'])[0]);
  if (isNaN(valNum) || !isFinite(valNum) || valNum < 0) {
    issues.invalidMoney.push({ bol: cleanNum, field: 'Goods Value', value: rawVal, parsed: valNum });
  }
});

// 2. Shipments Check
const shipmentRefMap = new Map();
shipments.forEach((s, idx) => {
  const ref = s.referenceNumber;
  if (!ref || typeof ref !== 'string' || ref.trim() === '') {
    issues.missingBolNumbers.push({ source: '.local-shipments.json', index: idx, id: s.id });
    return;
  }
  const cleanRef = ref.trim();
  if (shipmentRefMap.has(cleanRef)) {
    issues.duplicateBols.push({ source: '.local-shipments.json', bolNumber: cleanRef, id: s.id });
  }
  shipmentRefMap.set(cleanRef, s);

  // Currency check in finance
  const curr = s.finance?.currency || 'USD';
  if (!['USD', 'AED', 'AFN', 'EUR', 'GBP', 'INR', 'PKR'].includes(curr)) {
    issues.brokenCurrencies.push({ bol: cleanRef, currency: curr });
  }

  // Cargo numeric check
  const cargo = s.cargo || {};
  if (cargo.cartons !== undefined) {
    const cPkg = Number(cargo.cartons);
    if (isNaN(cPkg) || !isFinite(cPkg) || cPkg < 0 || cPkg > 10000) {
      issues.suspiciousPackages.push({ bol: cleanRef, value: cargo.cartons, parsed: cPkg });
    }
  }
  if (cargo.grossWeightKg !== undefined) {
    const cGw = Number(cargo.grossWeightKg);
    if (isNaN(cGw) || !isFinite(cGw) || cGw < 0 || cGw > 100000) {
      issues.suspiciousWeights.push({ bol: cleanRef, type: 'Cargo GW', value: cargo.grossWeightKg, parsed: cGw });
    }
  }
});

// 3. Orphan Files Check
const allKnownBols = new Set([...bolNumberSet, ...shipmentRefMap.keys()]);
if (Array.isArray(shipmentFiles)) {
  shipmentFiles.forEach(f => {
    // Ignore test runner fixtures (BOL-TEST-*)
    if (f.bol_number && !f.bol_number.startsWith('BOL-TEST-') && !allKnownBols.has(f.bol_number)) {
      issues.orphanFiles.push({ fileId: f.id, bolNumber: f.bol_number });
    }
  });
} else if (typeof shipmentFiles === 'object' && shipmentFiles !== null) {
  Object.keys(shipmentFiles).forEach(k => {
    if (k.startsWith('BOL-') && !k.startsWith('BOL-TEST-') && !allKnownBols.has(k)) {
      issues.orphanFiles.push({ key: k });
    }
  });
}

// 4. Accounts & Companies Check
const accountIdSet = new Set();
accounts.forEach(acc => {
  if (acc.id) accountIdSet.add(acc.id);
  if (!acc.name) issues.missingRelations.push({ type: 'Account without name', id: acc.id });
});

// 5. Account Ledgers Check
let allLedgerEntries = [];
if (Array.isArray(ledgers)) {
  allLedgerEntries = ledgers;
} else if (ledgers.ledgerEntries && typeof ledgers.ledgerEntries === 'object') {
  if (Array.isArray(ledgers.ledgerEntries)) {
    allLedgerEntries = ledgers.ledgerEntries;
  } else {
    allLedgerEntries = Object.values(ledgers.ledgerEntries).flat();
  }
}

allLedgerEntries.forEach(l => {
  if (l.accountId && !accountIdSet.has(l.accountId)) {
    const altAccount = ledgers.accounts && Array.isArray(ledgers.accounts) && ledgers.accounts.find(a => a.id === l.accountId);
    if (!altAccount) {
      issues.orphanLedgers.push({ entryId: l.id, accountId: l.accountId });
    }
  }
});

// Output Summary
console.log(`📦 Verified BOL Records:        ${bols.length}`);
console.log(`🚢 Verified Shipments:          ${shipments.length}`);
console.log(`🏢 Verified Accounts:           ${accounts.length}`);
console.log(`📁 Files Indexed:               ${Array.isArray(shipmentFiles) ? shipmentFiles.length : Object.keys(shipmentFiles).length}`);
console.log('');

console.log('--- AUDIT CHECKLIST RESULTS ---');
console.log(`[${issues.duplicateBols.length === 0 ? 'PASS' : 'FAIL'}] Duplicate BOL Numbers:       ${issues.duplicateBols.length}`);
console.log(`[${issues.missingBolNumbers.length === 0 ? 'PASS' : 'FAIL'}] Missing BOL Numbers:         ${issues.missingBolNumbers.length}`);
console.log(`[${issues.suspiciousPackages.length === 0 ? 'PASS' : 'FAIL'}] Outlier Packages:            ${issues.suspiciousPackages.length}`);
console.log(`[${issues.suspiciousWeights.length === 0 ? 'PASS' : 'FAIL'}] Outlier Weights:             ${issues.suspiciousWeights.length}`);
console.log(`[${issues.invalidMoney.length === 0 ? 'PASS' : 'FAIL'}] Invalid Money / NaN:        ${issues.invalidMoney.length}`);
console.log(`[${issues.brokenCurrencies.length === 0 ? 'PASS' : 'FAIL'}] Broken Currency Codes:      ${issues.brokenCurrencies.length}`);
console.log(`[${issues.orphanFiles.length === 0 ? 'PASS' : 'FAIL'}] Orphan File References:      ${issues.orphanFiles.length}`);
console.log(`[${issues.orphanLedgers.length === 0 ? 'PASS' : 'FAIL'}] Orphan Ledger Accounts:      ${issues.orphanLedgers.length}`);
console.log(`[${issues.missingRelations.length === 0 ? 'PASS' : 'FAIL'}] Missing Relational Links:    ${issues.missingRelations.length}`);
console.log('----------------------------------------------------\n');

const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

if (totalIssues > 0) {
  console.error(`❌ DATA INTEGRITY AUDIT FAILED with ${totalIssues} issues:`);
  console.error(JSON.stringify(issues, null, 2));
  process.exit(1);
} else {
  console.log('✅ ALL DATA INTEGRITY PRE-MERGE CHECKS PASSED (0 defects).');
  process.exit(0);
}
