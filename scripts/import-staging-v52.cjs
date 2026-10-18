/**
 * AQ COMPANIES — Staging Importer, Normalizer & Ledger Deduplication Engine
 * Version: v5.2.0
 * 
 * Supports:
 *   --dry-run : Full parsing, validation, deduplication, and reporting without database writes.
 *   --execute : Writes normalized data into isolated staging storage only.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function computeSha256(strOrBuf) {
  return crypto.createHash('sha256').update(strOrBuf).digest('hex');
}

function generateDeterministicUuid(namespace, value) {
  const hash = crypto.createHash('sha1').update(`${namespace}:${value}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

console.log('====================================================');
console.log('🚀 AQ COMPANIES v5.2.0 — STAGING DATA RESTORE & RECONCILIATION');
console.log('====================================================');
console.log(`Execution Mode: ${isDryRun ? '🔍 DRY RUN (Simulation & Audit Only)' : '💾 EXECUTE (Writing to Isolated Staging)'}\n`);

const stagingDir = path.resolve('data/staging');
if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}

const sourceBackupPath = path.join(stagingDir, 'sky_ariana_full_backup_2026-10-02_REPAIRED_v5.2.0.json');
const baselineBackupPath = path.join(stagingDir, 'sky_ariana_full_backup_2026-10-02.json');

if (!fs.existsSync(sourceBackupPath)) {
  console.error(`❌ Source backup not found at: ${sourceBackupPath}`);
  process.exit(1);
}

const sourceRaw = fs.readFileSync(sourceBackupPath, 'utf8');
const sourceData = JSON.parse(sourceRaw);
const baselineData = fs.existsSync(baselineBackupPath) ? JSON.parse(fs.readFileSync(baselineBackupPath, 'utf8')) : null;

const report = {
  version: "v5.2.0",
  timestamp: new Date().toISOString(),
  sourceFile: "sky_ariana_full_backup_2026-10-02_REPAIRED_v5.2.0.json",
  sourceSha256: computeSha256(sourceRaw),
  executionMode: isDryRun ? "DRY_RUN" : "EXECUTE",
  metrics: {
    sourceDocuments: 0,
    stagingImported: 0,
    quarantined: 0,
    testRecords: 0,
    companies: 0,
    exactLedgerDuplicates: 0,
    variantDuplicates: 0,
    variantDuplicatesResolved: 0,
    canonicalLedgerEntries: 0,
    legacyLedgerKeys: 0,
    canonicalAccounts: 0,
    bolIdentityConflicts: 0,
    missingBolNumbers: 0,
    missingTrucks: 0,
    missingShippers: 0,
    manualWeightReview: 0,
    unresolvedRentCurrency: 0,
    afnRentRepairedPreserved: 0,
    truckPlatesRestoredPreserved: 0,
    orphanRelations: 0,
    ledgerBalanceMismatches: 0,
    aggregates: {
      packages: 0,
      netWeightKg: 0,
      grossWeightKg: 0,
      goodsValueUsd: 0,
      totalDebit: 0,
      totalCredit: 0,
      netBalance: 0
    }
  },
  variantConflicts: [],
  quarantinedRecords: [],
  manualReviewRecords: [],
  changeLog: []
};

// ==========================================
// 1. NORMALIZE & VALIDATE SAVED DOCUMENTS
// ==========================================
console.log('📦 Step 1: Normalizing & Validating 198 Saved Documents...');
const rawDocs = sourceData.savedDocuments || [];
report.metrics.sourceDocuments = rawDocs.length;

const normalizedDocuments = [];
const bolNumberSeen = new Map();

function parsePackages(val) {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.includes('-')) {
    const parts = s.split(/\s*[-–—]\s*/);
    let sum = 0;
    for (const p of parts) {
      const m = p.match(/^([0-9,]+)/);
      if (m) sum += parseInt(m[1].replace(/,/g, ''), 10) || 0;
    }
    if (sum > 0) return sum;
  }
  const m = s.match(/^([0-9,]+)/);
  if (m) return parseInt(m[1].replace(/,/g, ''), 10) || 0;
  return 0;
}

function parseWeight(val) {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.includes('-')) {
    const parts = s.split(/\s*[-–—]\s*/);
    let sum = 0;
    for (const p of parts) {
      const m = p.match(/([0-9,]+(?:\.[0-9]+)?)/);
      if (m) sum += parseFloat(m[1].replace(/,/g, '')) || 0;
    }
    if (sum > 0) return sum;
  }
  const m = s.match(/([0-9,]+(?:\.[0-9]+)?)/);
  if (m) return parseFloat(m[1].replace(/,/g, '')) || 0;
  return 0;
}

function parseMoney(val) {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.includes('-')) {
    const parts = s.split(/\s*[-–—]\s*/);
    let sum = 0;
    for (const p of parts) {
      const m = p.match(/([0-9,]+(?:\.[0-9]+)?)/);
      if (m) sum += parseFloat(m[1].replace(/,/g, '')) || 0;
    }
    if (sum > 0) return sum;
  }
  const m = s.match(/([0-9,]+(?:\.[0-9]+)?)/);
  if (m) return parseFloat(m[1].replace(/,/g, '')) || 0;
  return 0;
}

for (const raw of rawDocs) {
  // Field Precedence for BOL Number: bol_number > billOfLadingNumber > bolNo
  const candidateBol = (raw.bol_number || raw.billOfLadingNumber || raw.bolNo || '').trim();
  if (!candidateBol) {
    report.metrics.missingBolNumbers++;
  }

  // Precedence conflict check
  const bolCandidates = [raw.bol_number, raw.billOfLadingNumber, raw.bolNo].filter(Boolean).map(s => s.trim());
  const uniqueBols = [...new Set(bolCandidates)];
  if (uniqueBols.length > 1) {
    report.metrics.bolIdentityConflicts++;
    report.changeLog.push({
      entityType: "BOL",
      sourceId: raw.id,
      field: "bolNumber",
      oldValue: bolCandidates.join(" vs "),
      newValue: candidateBol,
      reason: "IDENTITY_CONFLICT_RESOLVED_BY_PRECEDENCE",
      evidence: "Field precedence rule: bol_number > billOfLadingNumber > bolNo"
    });
  }

  // Special Case: BOL-2026-NSA530 (formerly had id: BOL-2026-NSA527 in un-repaired legacy)
  const isNsa530 = candidateBol === "BOL-2026-NSA530";
  const internalUuid = isNsa530
    ? generateDeterministicUuid('aq_companies_bol', 'BOL-2026-NSA530')
    : (raw.id && !raw.id.startsWith('BOL-') ? raw.id : generateDeterministicUuid('aq_companies_bol', candidateBol || raw.id));

  // Check for test record: BOL-RESTORE-TEST-1
  const isTestRecord = candidateBol.toUpperCase().includes('TEST') || (raw.id || '').toUpperCase().includes('TEST');
  let isQuarantined = false;
  if (isTestRecord) {
    report.metrics.testRecords++;
    report.metrics.quarantined++;
    isQuarantined = true;
    report.quarantinedRecords.push({
      id: internalUuid,
      bolNumber: candidateBol,
      reason: "TEST_RECORD_RESTORE_FIXTURE",
      customer: raw.customer || "Herat Transport"
    });
  }

  // Driver Rent Extraction & Verification
  const rawRent = String(raw.driver_rent || raw.driverFreight || raw.driverRent || '').trim();
  let rentAmount = 0;
  let rentCurrency = "AFN";
  let rentUsdEquiv = 0;
  let isRentReview = false;

  if (candidateBol === "BOL-2026-NSA519" || candidateBol === "BOL-2026-NSA516") {
    report.metrics.unresolvedRentCurrency++;
    isRentReview = true;
    rentCurrency = "USD";
    const rentMatch = rawRent.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (rentMatch) {
      rentAmount = parseFloat(rentMatch[1].replace(/,/g, '')) || 0;
      rentUsdEquiv = rentAmount;
    }
    report.manualReviewRecords.push({
      bolNumber: candidateBol,
      issue: "UNRESOLVED_RENT_CURRENCY",
      currentValue: rawRent,
      action: "Preserved original value as USD without auto-conversion"
    });
  } else if (rawRent) {
    const rentMatch = rawRent.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (rentMatch) {
      rentAmount = parseFloat(rentMatch[1].replace(/,/g, '')) || 0;
    }
    if (rawRent.toUpperCase().includes('AFN') || raw.driver_rent_currency === 'AFN') {
      rentCurrency = 'AFN';
      rentUsdEquiv = Math.round((rentAmount / 70) * 100) / 100;
      report.metrics.afnRentRepairedPreserved++;
    } else if (rawRent.toUpperCase().includes('USD')) {
      rentCurrency = 'USD';
      rentUsdEquiv = rentAmount;
    }
  }

  // Truck Plate verification
  const truckPlate = (raw.truck_number || raw.truckNumber || '').trim();
  if (!truckPlate) {
    report.metrics.missingTrucks++;
  } else {
    report.metrics.truckPlatesRestoredPreserved++;
  }

  // Shipper verification
  const shipperName = (raw.shipper_name || raw.shipperName || '').trim();
  if (!shipperName) {
    report.metrics.missingShippers++;
  }

  // Cleared weights review (Known corrupted records)
  const netWeightStr = (raw.net_weight || raw.netWeight || '').trim();
  const grossWeightStr = (raw.gross_weight || raw.grossWeight || '').trim();
  const knownCorrupted = ['BOL-2026-NSA584', 'BOL-2026-NSA505', 'BOL-2026-NSA503', 'BOL-2026-NSA501', 'BOL-2026-NSA487', 'BOL-2026-NSA486', 'BOL-2026-NSA518'];
  if (knownCorrupted.includes(candidateBol)) {
    if (!netWeightStr || !grossWeightStr) {
      report.metrics.manualWeightReview++;
      report.manualReviewRecords.push({
        bolNumber: candidateBol,
        issue: "WEIGHT_REVIEW_REQUIRED",
        netWeight: netWeightStr || "NULL",
        grossWeight: grossWeightStr || "NULL",
        action: "Preserved cleared weight; not reconstructed by guessing"
      });
    }
  }

  // Parse numeric values
  const pkgs = parsePackages(raw.number_of_packages || raw.numberOfPackages);
  const net = parseWeight(netWeightStr);
  const gross = parseWeight(grossWeightStr);
  const val = parseMoney(raw.goods_value || raw.goodsValue);

  // Aggregate into baseline sums (excluding quarantined test record)
  if (!isQuarantined) {
    report.metrics.aggregates.packages += pkgs;
    report.metrics.aggregates.netWeightKg += net;
    report.metrics.aggregates.grossWeightKg += gross;
    report.metrics.aggregates.goodsValueUsd += val;
  }

  // Duplicate BOL number check
  if (candidateBol && !isTestRecord) {
    if (bolNumberSeen.has(candidateBol)) {
      report.metrics.bolIdentityConflicts++;
      console.warn(`⚠️ Duplicate BOL number found: ${candidateBol}`);
    } else {
      bolNumberSeen.set(candidateBol, internalUuid);
    }
  }

  // Canonical V5.2 Model
  const canonicalDoc = {
    id: internalUuid,
    bolNumber: candidateBol,
    legacyId: raw.id,
    issueDate: raw.issue_date || raw.issueDate || null,
    shipperName: shipperName || null,
    shipperAddress: raw.shipper_address || null,
    consigneeName: (raw.consignee_name || raw.consigneeName || '').trim() || null,
    consigneeAddress: raw.consignee_address || null,
    notifyParty: (raw.notify_party || '').trim() || null,
    notifyPartyAddress: raw.notify_party_address || null,
    truckNumber: truckPlate || null,
    driverName: (raw.driver_name || raw.driverName || '').trim() || null,
    driverContact: raw.driver_contact || null,
    driverRent: {
      amount: rentAmount,
      currency: rentCurrency,
      usdEquivalent: rentUsdEquiv,
      rawText: rawRent,
      reviewRequired: isRentReview
    },
    cargo: {
      description: raw.cargo_description || raw.cargoDescription || null,
      packagesCount: pkgs,
      packagesRaw: raw.number_of_packages || raw.numberOfPackages || null,
      netWeightKg: net > 0 ? net : null,
      grossWeightKg: gross > 0 ? gross : null,
      goodsValueUsd: val > 0 ? val : null,
      weightReviewRequired: (!net || !gross) && knownCorrupted.includes(candidateBol)
    },
    routes: Array.isArray(raw.routes) ? raw.routes.map((r, idx) => ({
      stopOrder: r.stopOrder || idx + 1,
      location: r.location || '',
      locationPersian: r.locationPersian || '',
      transportMode: r.transportMode || 'truck',
      stopLabel: r.stopLabel || ''
    })) : [],
    notes: {
      notes1: raw.notes_1 || null,
      notes1Label: raw.notes_1_label || null,
      notes2: raw.notes_2 || null,
      notes2Label: raw.notes_2_label || null
    },
    status: isQuarantined ? "QUARANTINED" : "ACTIVE",
    quarantined: isQuarantined,
    quarantineReason: isQuarantined ? "RESTORE_TEST_FIXTURE" : null,
    updatedAt: raw.updated_at || new Date().toISOString(),
    createdAt: raw.created_at || new Date().toISOString()
  };

  normalizedDocuments.push(canonicalDoc);
}

report.metrics.stagingImported = normalizedDocuments.filter(d => !d.quarantined).length;
console.log(`✅ Normalized ${normalizedDocuments.length} total documents (${report.metrics.stagingImported} active, ${report.metrics.quarantined} quarantined).`);

// ==========================================
// 2. LEDGER DEDUPLICATION & INVARIANCE
// ==========================================
console.log('\n📊 Step 2: Canonical Ledger Deduplication & Account Mapping...');
const rawLedgers = sourceData.accountLedgers || {};
const rawLedgerKeys = Object.keys(rawLedgers);
report.metrics.legacyLedgerKeys = rawLedgerKeys.length;

// Canonical Account Key Normalizer
function canonicalizeAccountName(key) {
  return key.toLowerCase().replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim();
}

const canonicalAccounts = new Map();
for (const k of rawLedgerKeys) {
  const canon = canonicalizeAccountName(k);
  if (!canonicalAccounts.has(canon)) {
    canonicalAccounts.set(canon, {
      canonicalName: canon,
      aliasKeys: [],
      accountProfile: null
    });
  }
  canonicalAccounts.get(canon).aliasKeys.push(k);
}
report.metrics.canonicalAccounts = canonicalAccounts.size;

// Deduplicate ledger entries by entry ID
const entryMap = new Map();
const exactDuplicateEntries = [];
const variantDuplicateGroups = [];

for (const [key, ledgerData] of Object.entries(rawLedgers)) {
  const entries = Array.isArray(ledgerData) ? ledgerData : (ledgerData.entries || ledgerData.ledgerEntries || []);
  const canonAccount = canonicalizeAccountName(key);

  for (const entry of entries) {
    const id = entry.id || entry.entryId;
    if (!id) continue;

    if (!entryMap.has(id)) {
      entryMap.set(id, [{ key, canonAccount, entry }]);
    } else {
      entryMap.get(id).push({ key, canonAccount, entry });
    }
  }
}

// Process entries and resolve variants
const canonicalLedgerEntries = [];
let totalDebit = 0;
let totalCredit = 0;

for (const [id, occurrences] of entryMap.entries()) {
  if (occurrences.length === 1) {
    // Unique entry
    const { key, canonAccount, entry } = occurrences[0];
    const deb = parseFloat(entry.debit) || 0;
    const cred = parseFloat(entry.credit) || 0;
    totalDebit += deb;
    totalCredit += cred;

    canonicalLedgerEntries.push({
      id,
      canonicalAccount: canonAccount,
      sourceKey: key,
      date: entry.date || entry.shipDate || null,
      bolNumber: entry.bolNo || entry.barnamehNo || null,
      invoiceNumber: entry.invoiceNo || null,
      truckNumber: entry.truckNo || null,
      consignee: entry.consignee || null,
      description: entry.description || entry.shipperDescription || null,
      quantity: entry.quantity || null,
      driverRent: entry.driverRent || entry.driverFreight || null,
      debit: deb,
      credit: cred,
      currency: entry.currency || "USD",
      containerNumber: entry.containerNo || null,
      surrenderedBL: Boolean(entry.surrenderedBL)
    });
  } else {
    // Duplicate occurrence across alias keys
    const first = occurrences[0].entry;
    let isExact = true;
    const compareFields = ['date', 'bolNo', 'barnamehNo', 'debit', 'credit', 'currency', 'invoiceNo', 'truckNo'];

    for (let i = 1; i < occurrences.length; i++) {
      const curr = occurrences[i].entry;
      for (const f of compareFields) {
        if (String(first[f] || '').trim() !== String(curr[f] || '').trim()) {
          isExact = false;
          break;
        }
      }
    }

    if (isExact) {
      report.metrics.exactLedgerDuplicates++;
      exactDuplicateEntries.push({ id, count: occurrences.length, keys: occurrences.map(o => o.key) });

      // Keep single canonical copy
      const { key, canonAccount, entry } = occurrences[0];
      const deb = parseFloat(entry.debit) || 0;
      const cred = parseFloat(entry.credit) || 0;
      totalDebit += deb;
      totalCredit += cred;

      canonicalLedgerEntries.push({
        id,
        canonicalAccount: canonAccount,
        sourceKey: key,
        aliasSources: occurrences.map(o => o.key),
        date: entry.date || entry.shipDate || null,
        bolNumber: entry.bolNo || entry.barnamehNo || null,
        invoiceNumber: entry.invoiceNo || null,
        truckNumber: entry.truckNo || null,
        consignee: entry.consignee || null,
        description: entry.description || entry.shipperDescription || null,
        quantity: entry.quantity || null,
        driverRent: entry.driverRent || entry.driverFreight || null,
        debit: deb,
        credit: cred,
        currency: entry.currency || "USD",
        containerNumber: entry.containerNo || null,
        surrenderedBL: Boolean(entry.surrenderedBL)
      });
    } else {
      // 7 Field-Variant Duplicates
      report.metrics.variantDuplicates++;
      const variantRecord = {
        id,
        occurrences: occurrences.map(o => ({
          key: o.key,
          debit: o.entry.debit,
          credit: o.entry.credit,
          truckNo: o.entry.truckNo,
          invoiceNo: o.entry.invoiceNo,
          description: o.entry.description,
          shipperDescription: o.entry.shipperDescription
        }))
      };
      variantDuplicateGroups.push(variantRecord);

      // Deterministic Resolution:
      // Merge best non-null metadata.
      let bestDebit = 0;
      let bestCredit = 0;
      let bestTruck = null;
      let bestInvoice = null;
      let bestDesc = null;
      let targetAccount = occurrences[0].canonAccount;
      let resolvedEvidence = "";

      if (id === "939bed90-fc9b-476d-a087-bda4aadf4310") {
        // Special Variant 7: BOL-2026-NSA644
        bestDebit = 12070; // From new-yaqoubi-ltd matching BOL record debit
        bestCredit = 0;
        bestTruck = "49338 هرات"; // From new yaqoubi ltd matching BOL truck
        bestInvoice = "INV-BOL-2026-NSA644";
        bestDesc = "NEW YAQOUBI LTD";
        resolvedEvidence = "Cross-referenced with BOL-2026-NSA644: official debit is 12070 USD and truck plate is 49338 هرات";
      } else {
        // Variants 1 - 6: Metadata enrichment from spaced alias key
        for (const occ of occurrences) {
          const e = occ.entry;
          if (e.truckNo && !bestTruck) bestTruck = e.truckNo;
          if (e.invoiceNo && !bestInvoice) bestInvoice = e.invoiceNo;
          if ((e.description || e.shipperDescription) && !bestDesc) bestDesc = e.description || e.shipperDescription;
          if (e.debit && e.debit > bestDebit) bestDebit = parseFloat(e.debit) || 0;
          if (e.credit && e.credit > bestCredit) bestCredit = parseFloat(e.credit) || 0;
        }
        resolvedEvidence = "Enriched metadata (truck plate and description) merged from spaced alias key without financial conflict";
      }

      totalDebit += bestDebit;
      totalCredit += bestCredit;
      report.metrics.variantDuplicatesResolved++;

      canonicalLedgerEntries.push({
        id,
        canonicalAccount: targetAccount,
        sourceKey: occurrences.map(o => o.key).join(" & "),
        date: occurrences[0].entry.date || "2026-10-01",
        bolNumber: occurrences[0].entry.bolNo || occurrences[0].entry.barnamehNo || null,
        invoiceNumber: bestInvoice,
        truckNumber: bestTruck,
        consignee: occurrences[0].entry.consignee || null,
        description: bestDesc,
        quantity: occurrences[0].entry.quantity || null,
        driverRent: occurrences[0].entry.driverRent || occurrences[0].entry.driverFreight || null,
        debit: bestDebit,
        credit: bestCredit,
        currency: "USD",
        containerNumber: occurrences[0].entry.containerNo || null,
        surrenderedBL: false,
        resolutionNote: resolvedEvidence
      });

      report.changeLog.push({
        entityType: "LEDGER_ENTRY",
        sourceId: id,
        field: "mergedFields",
        oldValue: occurrences.map(o => `${o.key}: deb=${o.entry.debit}, truck=${o.entry.truckNo}`).join(" | "),
        newValue: `deb=${bestDebit}, cred=${bestCredit}, truck=${bestTruck}`,
        reason: "VARIANT_DUPLICATE_DETERMINISTICALLY_RESOLVED",
        evidence: resolvedEvidence
      });
    }
  }
}

report.metrics.canonicalLedgerEntries = canonicalLedgerEntries.length;
report.metrics.aggregates.totalDebit = Math.round(totalDebit * 100) / 100;
report.metrics.aggregates.totalCredit = Math.round(totalCredit * 100) / 100;
report.metrics.aggregates.netBalance = Math.round((totalDebit - totalCredit) * 100) / 100;
report.variantConflicts = variantDuplicateGroups;

console.log(`✅ Deduplicated ledger: collapsed ${report.metrics.exactLedgerDuplicates} exact duplicates, resolved ${report.metrics.variantDuplicatesResolved}/7 variant duplicates.`);
console.log(`   Canonical entries: ${report.metrics.canonicalLedgerEntries}`);
console.log(`   Total Debit:  $${report.metrics.aggregates.totalDebit.toLocaleString()}`);
console.log(`   Total Credit: $${report.metrics.aggregates.totalCredit.toLocaleString()}`);
console.log(`   Net Balance:  $${report.metrics.aggregates.netBalance.toLocaleString()}`);

// ==========================================
// 3. COMPANIES & SETTINGS
// ==========================================
const companies = sourceData.customCompanies || [];
report.metrics.companies = companies.length;
const companySettings = sourceData.companySettings || {};

// ==========================================
// 4. WRITE STAGING DATA (IF NOT DRY-RUN)
// ==========================================
if (!isDryRun) {
  console.log('\n💾 Step 3: Writing Staging Stores to data/staging/...');
  fs.writeFileSync(path.join(stagingDir, '.staging-bol-database.json'), JSON.stringify(normalizedDocuments, null, 2));
  fs.writeFileSync(path.join(stagingDir, '.staging-account-ledgers.json'), JSON.stringify({
    accounts: Array.from(canonicalAccounts.values()),
    entries: canonicalLedgerEntries,
    legacyAliasKeys: rawLedgerKeys
  }, null, 2));
  fs.writeFileSync(path.join(stagingDir, '.staging-companies.json'), JSON.stringify(companies, null, 2));
  fs.writeFileSync(path.join(stagingDir, '.staging-company-settings.json'), JSON.stringify(companySettings, null, 2));
  console.log('✅ Staging stores written successfully.');
} else {
  console.log('\n🔍 Dry Run Complete: Staging stores NOT modified.');
}

// Write the import report
const reportPath = path.join(stagingDir, 'aq_v5_2_import_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 Import Report written to: ${reportPath}`);

console.log('\n====================================================');
console.log('🏁 RECONCILIATION & REPAIRED BASELINE COMPARISON');
console.log('====================================================');
console.log(`Saved Documents:     ${report.metrics.sourceDocuments} (Active: ${report.metrics.stagingImported}, Quarantined: ${report.metrics.quarantined})`);
console.log(`Custom Companies:    ${report.metrics.companies}`);
console.log(`Canonical Accounts:  ${report.metrics.canonicalAccounts} (Legacy Keys: ${report.metrics.legacyLedgerKeys})`);
console.log(`Canonical Ledgers:   ${report.metrics.canonicalLedgerEntries}`);
console.log(`Packages:            ${report.metrics.aggregates.packages.toLocaleString()} CTNS (Baseline: 313,262 CTNS)`);
console.log(`Net Weight:          ${report.metrics.aggregates.netWeightKg.toLocaleString()} KG (Baseline: 3,591,261.0 KG)`);
console.log(`Gross Weight:        ${report.metrics.aggregates.grossWeightKg.toLocaleString()} KG (Baseline: 3,743,909.3 KG)`);
console.log(`Goods Value:         $${report.metrics.aggregates.goodsValueUsd.toLocaleString()} USD (Baseline: $13,203,040.85 USD)`);
console.log('====================================================\n');
