/**
 * AQ COMPANIES — Staging SQLite Database Initializer & Relational Verification
 * Uses Node.js 25 built-in node:sqlite
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const stagingDir = path.resolve('data/staging');
const stagingDbPath = path.join(stagingDir, 'bol_staging.db');

if (fs.existsSync(stagingDbPath)) {
  fs.unlinkSync(stagingDbPath);
}

console.log('🗄️ Initializing Isolated Staging SQLite DB:', stagingDbPath);
const db = new DatabaseSync(stagingDbPath);

// 1. Create canonical schema
db.exec(`
  CREATE TABLE IF NOT EXISTS bols (
    id TEXT PRIMARY KEY,
    bol_number TEXT UNIQUE NOT NULL,
    legacy_id TEXT,
    issue_date TEXT,
    shipper_name TEXT,
    consignee_name TEXT,
    notify_party TEXT,
    truck_number TEXT,
    driver_name TEXT,
    driver_rent_amount REAL DEFAULT 0,
    driver_rent_currency TEXT DEFAULT 'AFN',
    driver_rent_usd REAL DEFAULT 0,
    packages_count INTEGER DEFAULT 0,
    net_weight_kg REAL,
    gross_weight_kg REAL,
    goods_value_usd REAL,
    status TEXT DEFAULT 'ACTIVE',
    quarantined INTEGER DEFAULT 0,
    quarantine_reason TEXT,
    updated_at TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    canonical_name TEXT UNIQUE NOT NULL,
    legacy_alias_keys TEXT
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    bol_number TEXT,
    invoice_number TEXT,
    truck_number TEXT,
    date TEXT,
    description TEXT,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bols_number ON bols(bol_number);
  CREATE INDEX IF NOT EXISTS idx_ledger_bol ON ledger_entries(bol_number);
  CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id);
`);

// 2. Load staging data
const stagingBols = JSON.parse(fs.readFileSync(path.join(stagingDir, '.staging-bol-database.json'), 'utf8'));
const stagingLedgers = JSON.parse(fs.readFileSync(path.join(stagingDir, '.staging-account-ledgers.json'), 'utf8'));

// Insert BOLs
const insertBol = db.prepare(`
  INSERT INTO bols (
    id, bol_number, legacy_id, issue_date, shipper_name, consignee_name, notify_party,
    truck_number, driver_name, driver_rent_amount, driver_rent_currency, driver_rent_usd,
    packages_count, net_weight_kg, gross_weight_kg, goods_value_usd, status, quarantined, quarantine_reason,
    updated_at, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAccount = db.prepare(`
  INSERT INTO accounts (id, canonical_name, legacy_alias_keys)
  VALUES (?, ?, ?)
`);

const insertLedger = db.prepare(`
  INSERT INTO ledger_entries (
    id, account_id, bol_number, invoice_number, truck_number, date, description, debit, credit, currency
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const b of stagingBols) {
  insertBol.run(
    b.id,
    b.bolNumber,
    b.legacyId || null,
    b.issueDate || null,
    b.shipperName || null,
    b.consigneeName || null,
    b.notifyParty || null,
    b.truckNumber || null,
    b.driverName || null,
    b.driverRent.amount || 0,
    b.driverRent.currency || 'AFN',
    b.driverRent.usdEquivalent || 0,
    b.cargo.packagesCount || 0,
    b.cargo.netWeightKg || null,
    b.cargo.grossWeightKg || null,
    b.cargo.goodsValueUsd || null,
    b.status || 'ACTIVE',
    b.quarantined ? 1 : 0,
    b.quarantineReason || null,
    b.updatedAt,
    b.createdAt
  );
}

const accountIdMap = new Map();
for (let i = 0; i < stagingLedgers.accounts.length; i++) {
  const a = stagingLedgers.accounts[i];
  const accId = `acc-${(i + 1).toString().padStart(3, '0')}`;
  accountIdMap.set(a.canonicalName, accId);
  insertAccount.run(
    accId,
    a.canonicalName,
    JSON.stringify(a.aliasKeys)
  );
}

for (const e of stagingLedgers.entries) {
  const accId = accountIdMap.get(e.canonicalAccount) || 'acc-unmapped';
  insertLedger.run(
    e.id,
    accId,
    e.bolNumber || null,
    e.invoiceNumber || null,
    e.truckNumber || null,
    e.date || null,
    e.description || null,
    e.debit || 0,
    e.credit || 0,
    e.currency || 'USD'
  );
}

console.log('✅ Staging SQLite database populated successfully.');
const bolCount = db.prepare('SELECT COUNT(*) as c FROM bols').get().c;
const accCount = db.prepare('SELECT COUNT(*) as c FROM accounts').get().c;
const ledgerCount = db.prepare('SELECT COUNT(*) as c FROM ledger_entries').get().c;
const mathCheck = db.prepare('SELECT SUM(debit) as deb, SUM(credit) as cred FROM ledger_entries').get();

console.log(`   BOLs:          ${bolCount}`);
console.log(`   Accounts:      ${accCount}`);
console.log(`   Ledgers:       ${ledgerCount}`);
console.log(`   Total Debit:   $${mathCheck.deb.toLocaleString()}`);
console.log(`   Total Credit:  $${mathCheck.cred.toLocaleString()}`);
console.log(`   Net Balance:   $${(mathCheck.deb - mathCheck.cred).toLocaleString()}`);
db.close();
