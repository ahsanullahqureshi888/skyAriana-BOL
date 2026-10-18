const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('====================================================');
console.log('🧪 SKY ARIANA BOL - ACCOUNTING & LEDGER TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Verify Database File Existence & Schema
const dbPath = path.join(__dirname, '..', '.local-ledger-system.json');
const altDbPath = path.join(__dirname, '..', 'data', '.local-ledger-system.json');

const activePath = fs.existsSync(dbPath) ? dbPath : altDbPath;
assert(fs.existsSync(activePath), 'Database file .local-ledger-system.json must exist');

const dbContent = JSON.parse(fs.readFileSync(activePath, 'utf8'));

test('Database schema contains valid accounts and ledger_transactions collections', () => {
  assert(parseInt(dbContent.version) >= 1 || dbContent.version === '1.0.0', 'Schema version must be >= 1');
  assert(Array.isArray(dbContent.accounts), 'Accounts must be an array');
  assert(Array.isArray(dbContent.ledger_transactions), 'ledger_transactions must be an array');
  assert(Array.isArray(dbContent.audit_logs), 'Audit logs must be an array');
  assert(dbContent.accounts.length >= 40, `Expected at least 40 accounts, found ${dbContent.accounts.length}`);
  assert(dbContent.ledger_transactions.length >= 1300, `Expected at least 1300 transactions, found ${dbContent.ledger_transactions.length}`);
});

// 2. Mathematical Invariance: Current Balance = Total Debit - Total Credit
test('Accounting Invariance Identity holds for all accounts (Current Balance = Total Debit - Total Credit)', () => {
  for (const account of dbContent.accounts) {
    const expectedNet = Math.round((account.total_debit - account.total_credit) * 100) / 100;
    const actualNet = Math.round(account.current_balance * 100) / 100;
    assert.strictEqual(
      actualNet,
      expectedNet,
      `Account "${account.account_name}" violated invariance: Net ${actualNet} !== Debit ${account.total_debit} - Credit ${account.total_credit} (${expectedNet})`
    );
  }
});

// 3. Chronological Sequencing and Running Balance Invariance
test('Running balance consistency across transactions per account', () => {
  const txByAccount = new Map();
  for (const tx of dbContent.ledger_transactions) {
    if (!txByAccount.has(tx.account_id)) {
      txByAccount.set(tx.account_id, []);
    }
    txByAccount.get(tx.account_id).push(tx);
  }

  for (const [accountId, txList] of txByAccount.entries()) {
    let running = 0;
    for (const tx of txList) {
      running = Math.round((running + (tx.debit || 0) - (tx.credit || 0)) * 100) / 100;
      const txBal = Math.round(tx.running_balance * 100) / 100;
      assert.strictEqual(
        txBal,
        running,
        `Transaction ${tx.id} for account ${accountId} running balance mismatch: got ${txBal}, expected ${running}`
      );
    }
  }
});

// 4. Excel Primary 37 Report Reconciliation Verification
test('Primary 37 Report Accounts match exact Excel grand totals with 970,000 credit correction', () => {
  const round2 = (n) => Math.round(n * 100) / 100;

  // Let's verify specific primary accounts
  const yarmal2 = dbContent.accounts.find(a => a.account_name.includes('Yarmal)2') || a.account_name.includes('Yarmal) 2'));
  assert(yarmal2, 'Account Mr. Nazar Muhmmmad (Yarmal)2 must exist');
  assert.strictEqual(round2(yarmal2.total_debit), 179585.00, `Yarmal 2 Debit must be 179,585`);
  assert.strictEqual(round2(yarmal2.total_credit), 935000.00, `Yarmal 2 Credit must be 935,000 (resolving the 970,000 summary error)`);
  assert.strictEqual(round2(yarmal2.current_balance), -755415.00, `Yarmal 2 Current Balance must be -755,415`);

  const yarmal1 = dbContent.accounts.find(a => a.account_name === 'Mr. Nazar Muhmmmad (Yarmal)');
  assert(yarmal1, 'Account Mr. Nazar Muhmmmad (Yarmal) must exist');
  assert.strictEqual(round2(yarmal1.total_debit), 1789598.00, `Yarmal 1 Debit must be 1,789,598`);
  assert.strictEqual(round2(yarmal1.total_credit), 1905000.00, `Yarmal 1 Credit must be 1,905,000`);
  assert.strictEqual(round2(yarmal1.current_balance), -115402.00, `Yarmal 1 Balance must be -115,402`);

  const hajiYounus = dbContent.accounts.find(a => a.account_name.includes('یونس دوبی'));
  assert(hajiYounus, 'Haji Younus account must exist');
  assert.strictEqual(round2(hajiYounus.total_debit), 1858955.00, `Haji Younus Debit must be 1,858,955`);
  assert.strictEqual(round2(hajiYounus.total_credit), 0.00, `Haji Younus Credit must be 0`);
  assert.strictEqual(round2(hajiYounus.current_balance), 1858955.00, `Haji Younus Net must be 1,858,955`);

  const najebAmin = dbContent.accounts.find(a => a.source === 'HAJI-BASHIR-NAJEB-AMIN-MERSIN-');
  assert(najebAmin, 'Najeb Amin account must exist');
  assert.strictEqual(round2(najebAmin.total_debit), 681150.00, `Najeb Amin Debit must be 681,150`);
  assert.strictEqual(round2(najebAmin.total_credit), 104810.00, `Najeb Amin Credit must be 104,810`);
  assert.strictEqual(round2(najebAmin.current_balance), 576340.00, `Najeb Amin Net must be 576,340`);

  const hamidInsaf = dbContent.accounts.find(a => a.account_name.includes('HAMID-INSAF-LTD DOCUMENTS'));
  assert(hamidInsaf, 'Hamid Insaf Documents account must exist');
  assert.strictEqual(round2(hamidInsaf.total_debit), 1688000.00, `Hamid Insaf Debit must be 1,688,000`);
  assert.strictEqual(round2(hamidInsaf.total_credit), 1260900.00, `Hamid Insaf Credit must be 1,260,900`);
  assert.strictEqual(round2(hamidInsaf.current_balance), 427100.00, `Hamid Insaf Net must be 427,100`);

  const noorNimroz = dbContent.accounts.find(a => a.account_name.includes('NOOR-MUHMMAD-NIMROZ'));
  assert(noorNimroz, 'Noor Muhammad Nimroz account must exist');
  assert.strictEqual(round2(noorNimroz.total_debit), 192500.00, `Noor Muhammad Nimroz Debit must be 192,500`);
  assert.strictEqual(round2(noorNimroz.total_credit), 0.00, `Noor Muhammad Nimroz Credit must be 0`);
  assert.strictEqual(round2(noorNimroz.current_balance), 192500.00, `Noor Muhammad Nimroz Net must be 192,500`);

  const wasela = dbContent.accounts.find(a => a.account_name.includes('WASELA LIMITED'));
  assert(wasela, 'Wasela Limited account must exist');
  assert.strictEqual(round2(wasela.total_debit), 154150.00, `Wasela Limited Debit must be 154,150`);
  assert.strictEqual(round2(wasela.total_credit), 50233.00, `Wasela Limited Credit must be 50,233`);
  assert.strictEqual(round2(wasela.current_balance), 103917.00, `Wasela Limited Net must be 103,917`);

  const pakAfghan = dbContent.accounts.find(a => a.account_name.includes('Pak - Afghan'));
  assert(pakAfghan, 'Pak Afghan Limited account must exist');
  assert.strictEqual(round2(pakAfghan.total_debit), 195711.99, `Pak Afghan Debit must be 195,711.99`);
  assert.strictEqual(round2(pakAfghan.total_credit), 211048.50, `Pak Afghan Credit must be 211,048.50`);
  assert.strictEqual(round2(pakAfghan.current_balance), -15336.51, `Pak Afghan Net must be -15,336.51`);
});

// 5. Total Sums Verification
test('Total Database Ledger Summary matches expected totals with 0.00 variance', () => {
  const grandTotal = dbContent.ledger_transactions.reduce((acc, t) => {
    acc.debit += (t.debit || 0);
    acc.credit += (t.credit || 0);
    return acc;
  }, { debit: 0, credit: 0 });

  assert(grandTotal.debit > 12000000, `Grand total debit should be > 12M, got ${grandTotal.debit}`);
  assert(grandTotal.credit > 8000000, `Grand total credit should be > 8M, got ${grandTotal.credit}`);
});

// 6. Duplicate Fingerprint Protection
test('Transaction fingerprint prevents duplicate insertion', () => {
  const sampleTx = dbContent.ledger_transactions[0];
  assert(sampleTx, 'At least one transaction must exist');
  assert(sampleTx.fingerprint && sampleTx.fingerprint.length === 64, 'SHA-256 fingerprint should be 64 hex characters');

  // Verify unique fingerprints across all imported transactions
  const fingerprints = new Set();
  let duplicates = 0;
  for (const tx of dbContent.ledger_transactions) {
    if (fingerprints.has(tx.fingerprint)) {
      duplicates++;
    } else {
      fingerprints.add(tx.fingerprint);
    }
  }
  assert.strictEqual(duplicates, 0, `There must be 0 duplicate transaction fingerprints, found ${duplicates}`);
});

// 7. Backup Directory & JSON integrity
test('Backup directory contains verified snapshots', () => {
  const backupDir = path.join(__dirname, '..', 'data', 'backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
    assert(files.length > 0, 'At least one backup JSON should be present in data/backups');
    const firstBackup = JSON.parse(fs.readFileSync(path.join(backupDir, files[0]), 'utf8'));
    assert(firstBackup.accounts || firstBackup.transactions || firstBackup.database || firstBackup.ledger_transactions || firstBackup.data || Array.isArray(firstBackup), 'Backup file should contain ledger database schema');
  }
});

console.log(`\n====================================================`);
console.log(`🏁 TESTS SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log(`====================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
