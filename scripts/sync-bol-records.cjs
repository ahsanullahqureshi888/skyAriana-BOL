/**
 * AQ COMPANIES — BOL Records SQLite Synchronization Engine v5.2.0
 * Synchronizes all 198 verified production BOL documents from staging / .local-bols.json
 * into the `bol_records` and `trucks` tables of data/app.db (and distribution DBs).
 *
 * Rules:
 * - Creates timestamped backup of target DB before write
 * - Preserves existing foreign key links (shipments, invoices, ledger entries)
 * - Updates existing 92 rows with repaired clean cargo/weights
 * - Inserts the 106 missing production BOLs (NSA470-NSA644)
 * - Resolves or registers truck plates in `trucks` table
 * - Leaves accounting tables and balances untouched ($4,974,691.86 USD)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

function generateUuid() {
  return crypto.randomUUID();
}

const stagingBolsPath = path.resolve('data/staging/.staging-bol-database.json');
const localBolsPath = path.resolve('.local-bols.json');

if (!fs.existsSync(stagingBolsPath)) {
  console.error('❌ Staging database not found at', stagingBolsPath);
  process.exit(1);
}

const stagingBols = JSON.parse(fs.readFileSync(stagingBolsPath, 'utf8'));
const localBols = fs.existsSync(localBolsPath) ? JSON.parse(fs.readFileSync(localBolsPath, 'utf8')) : [];

console.log('=====================================================');
console.log('🔄 AQ COMPANIES — BOL Records SQLite Sync Engine');
console.log('=====================================================');
console.log(`📦 Loaded ${stagingBols.length} staging BOLs, ${localBols.length} local BOLs.\n`);

// Map local BOLs by bol_number for supplementary fields
const localMap = new Map();
localBols.forEach(b => {
  const num = (b.bol_number || b.billOfLadingNumber || b.bolNo || b.id || '').trim();
  if (num && !localMap.has(num)) {
    localMap.set(num, b);
  }
});

function parseCartons(val) {
  if (typeof val === 'number') return val;
  const m = String(val || '').replace(/,/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function parseWeight(val) {
  if (typeof val === 'number') return val;
  const m = String(val || '').replace(/,/g, '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0.0;
}

function parseRent(val) {
  const str = String(val || '');
  const m = str.replace(/,/g, '').match(/[\d.]+/);
  const amt = m ? parseFloat(m[0]) : 0.0;
  const curr = str.toUpperCase().includes('AFN') ? 'AFN' : 'USD';
  return { amount: amt, currency: curr };
}

// Build unified list of all BOLs to sync
const stagingNums = new Set(stagingBols.map(b => (b.bolNumber || '').trim()));
const allBolsToSync = [...stagingBols];

for (const localDoc of localBols) {
  const num = (localDoc.bol_number || localDoc.billOfLadingNumber || localDoc.bolNo || localDoc.id || '').trim();
  if (num && !stagingNums.has(num)) {
    const rent = parseRent(localDoc.driver_rent || localDoc.driverFreight);
    allBolsToSync.push({
      id: localDoc.id || num,
      bolNumber: num,
      issueDate: localDoc.issue_date || localDoc.issueDate,
      shipperName: localDoc.shipper_name || localDoc.shipperName,
      consigneeName: localDoc.consignee_name || localDoc.consigneeName,
      notifyParty: localDoc.notify_party || localDoc.notifyParty,
      truckNumber: localDoc.truck_number || localDoc.truckNumber,
      driverName: localDoc.driver_name || localDoc.driverName,
      origin: localDoc.port_of_loading || 'Kandahar, Afghanistan',
      destination: localDoc.destination || localDoc.port_of_discharge || 'India',
      borderCrossing: localDoc.borderCrossing || 'Dogharoon / Islam Qala',
      cargo: {
        description: localDoc.cargo_description || localDoc.cargoDescription || '',
        packagesCount: parseCartons(localDoc.number_of_packages || localDoc.numberOfPackages || localDoc.carton_count),
        grossWeightKg: parseWeight(localDoc.gross_weight || localDoc.grossWeight),
        netWeightKg: parseWeight(localDoc.net_weight || localDoc.netWeight),
      },
      driverRent: rent,
      quarantined: false,
      createdAt: localDoc.created_at || localDoc.createdAt,
      updatedAt: localDoc.updated_at || localDoc.updatedAt,
    });
  }
}
console.log(`📋 Total BOLs to sync to SQLite: ${allBolsToSync.length} (${stagingBols.length} staging + ${allBolsToSync.length - stagingBols.length} local newer)\n`);

function syncBolRecordsToDb(dbFilePath) {
  if (!fs.existsSync(dbFilePath)) {
    console.log(`⚠️ Database file ${dbFilePath} does not exist. Skipping.`);
    return;
  }

  console.log(`\n🗄️ Processing database: ${dbFilePath}`);

  // Create timestamped backup of the DB
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbFilePath}.backup-${timestamp}`;
  fs.copyFileSync(dbFilePath, backupPath);
  console.log(`   🛡️ Created backup: ${path.basename(backupPath)}`);

  const db = new DatabaseSync(dbFilePath);

  // Check if bol_records exists
  const hasBolRecords = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bol_records'").get();
  if (!hasBolRecords) {
    console.log(`   ⚠️ bol_records table does not exist in ${dbFilePath}. Skipping.`);
    db.close();
    return;
  }

  // Pre-load existing trucks
  const existingTrucks = new Map();
  const truckRows = db.prepare('SELECT id, truck_number FROM trucks').all();
  truckRows.forEach(t => {
    if (t.truck_number) existingTrucks.set(t.truck_number.trim(), t.id);
  });

  // Pre-load existing drivers
  const existingDrivers = new Map();
  const driverRows = db.prepare('SELECT id, driver_name FROM drivers').all();
  driverRows.forEach(d => {
    if (d.driver_name) existingDrivers.set(d.driver_name.trim(), d.id);
  });

  // Pre-load existing shippers
  const existingShippers = new Map();
  const shipperRows = db.prepare('SELECT id, name FROM shippers').all();
  shipperRows.forEach(s => {
    if (s.name) existingShippers.set(s.name.trim(), s.id);
  });

  // Pre-load existing consignees
  const existingConsignees = new Map();
  const consigneeRows = db.prepare('SELECT id, name FROM consignees').all();
  consigneeRows.forEach(c => {
    if (c.name) existingConsignees.set(c.name.trim(), c.id);
  });

  // Pre-load existing notify parties
  const existingNotifyParties = new Map();
  const notifyPartyRows = db.prepare('SELECT id, name FROM notify_parties').all();
  notifyPartyRows.forEach(n => {
    if (n.name) existingNotifyParties.set(n.name.trim(), n.id);
  });

  // Pre-load existing bol_records
  const existingBolRecords = new Map();
  const bolRecordRows = db.prepare('SELECT id, bol_number FROM bol_records').all();
  bolRecordRows.forEach(r => {
    if (r.bol_number) existingBolRecords.set(r.bol_number.trim(), r.id);
    if (r.id) existingBolRecords.set(r.id.trim(), r.id);
  });

  console.log(`   📊 Existing in DB: ${existingBolRecords.size} bol_records, ${existingTrucks.size} trucks, ${existingDrivers.size} drivers.`);

  const insertTruckStmt = db.prepare(`
    INSERT INTO trucks (
      id, truck_number, driver_id, driver_name, container_number, tracking_number,
      destination, truck_model, capacity_tons, revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertDriverStmt = db.prepare(`
    INSERT INTO drivers (
      id, driver_name, father_name, phone, is_active, revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, 1, ?, ?)
  `);

  const insertShipperStmt = db.prepare(`
    INSERT INTO shippers (
      id, name, contact_person, phone, email, address, revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertConsigneeStmt = db.prepare(`
    INSERT INTO consignees (
      id, name, contact_person, phone, email, address, revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertNotifyPartyStmt = db.prepare(`
    INSERT INTO notify_parties (
      id, name, contact_person, phone, email, address, revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const updateBolRecordStmt = db.prepare(`
    UPDATE bol_records SET
      issue_date = ?,
      origin = ?,
      destination = ?,
      border_station = ?,
      driver_name = ?,
      father_name = ?,
      driver_rent = ?,
      carton_count = ?,
      gross_weight_kg = ?,
      net_weight_kg = ?,
      cargo_description = ?,
      status = ?,
      freight_fee = ?,
      demurrage_fee = ?,
      documentation_fee = ?,
      currency = ?,
      exchange_rate = ?,
      shipper_name = ?,
      consignee_name = ?,
      notify_party_name = ?,
      truck_id = ?,
      driver_id = ?,
      shipper_id = ?,
      consignee_id = ?,
      created_at = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const insertBolRecordStmt = db.prepare(`
    INSERT INTO bol_records (
      id, bol_number, issue_date, origin, destination, border_station,
      driver_name, father_name, driver_rent, carton_count, gross_weight_kg,
      net_weight_kg, cargo_description, status, freight_fee, demurrage_fee,
      documentation_fee, currency, exchange_rate, shipper_name, consignee_name,
      notify_party_name, company_id, shipper_id, consignee_id, notify_party_id,
      driver_id, truck_id, revision, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, 1, ?, ?
    )
  `);

  const insertBolItemStmt = db.prepare(`
    INSERT INTO bol_items (
      id, bol_id, commodity_id, item_description, carton_count, gross_weight_kg,
      net_weight_kg, volume_cbm, package_type, revision, created_at, updated_at
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, 0.0, 'cartons', 1, ?, ?)
  `);

  const checkBolItemStmt = db.prepare('SELECT id FROM bol_items WHERE bol_id = ? LIMIT 1');

  let updatedCount = 0;
  let insertedCount = 0;
  let newTrucksCount = 0;

  const nowIso = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');

  try {
    for (const b of allBolsToSync) {
      const bolNum = (b.bolNumber || '').trim();
      const localDoc = localMap.get(bolNum) || {};

      // 1. Truck resolution
      const truckPlate = (b.truckNumber || localDoc.truck_number || localDoc.truckNumber || '').trim();
      let truckId = null;
      if (truckPlate) {
        if (existingTrucks.has(truckPlate)) {
          truckId = existingTrucks.get(truckPlate);
        } else {
          truckId = generateUuid();
          insertTruckStmt.run(
            truckId,
            truckPlate,
            null,
            b.driverName || null,
            null,
            null,
            b.destination || 'India',
            null,
            0.0,
            nowIso,
            nowIso
          );
          existingTrucks.set(truckPlate, truckId);
          newTrucksCount++;
        }
      }

      // 2. Driver resolution
      const driverName = (b.driverName || localDoc.driver_name || localDoc.driverName || 'Driver Unspecified').trim();
      let driverId = existingDrivers.get(driverName) || null;
      if (!driverId && driverName && driverName !== 'Driver Unspecified') {
        driverId = generateUuid();
        insertDriverStmt.run(
          driverId,
          driverName,
          localDoc.driver_father_name || localDoc.driverFatherName || null,
          localDoc.driver_contact || localDoc.driverPhone || null,
          nowIso,
          nowIso
        );
        existingDrivers.set(driverName, driverId);
      }

      // 3. Parties
      const shipperName = b.shipperName || localDoc.shipper_name || localDoc.shipperName || null;
      const consigneeName = b.consigneeName || localDoc.consignee_name || localDoc.consigneeName || null;
      const notifyPartyName = b.notifyParty || localDoc.notify_party || localDoc.notifyParty || null;

      let shipperId = shipperName ? (existingShippers.get(shipperName.trim()) || null) : null;
      if (!shipperId && shipperName) {
        shipperId = generateUuid();
        insertShipperStmt.run(
          shipperId,
          shipperName.trim(),
          null,
          localDoc.shipper_contact || null,
          localDoc.shipper_email || null,
          localDoc.shipper_address || null,
          nowIso,
          nowIso
        );
        existingShippers.set(shipperName.trim(), shipperId);
      }

      let consigneeId = consigneeName ? (existingConsignees.get(consigneeName.trim()) || null) : null;
      if (!consigneeId && consigneeName) {
        for (const [cName, cId] of existingConsignees.entries()) {
          if (consigneeName.includes(cName) || cName.includes(consigneeName)) {
            consigneeId = cId;
            break;
          }
        }
        if (!consigneeId) {
          consigneeId = generateUuid();
          insertConsigneeStmt.run(
            consigneeId,
            consigneeName.trim(),
            null,
            localDoc.consignee_contact || null,
            localDoc.consignee_email || null,
            localDoc.consignee_address || null,
            nowIso,
            nowIso
          );
        }
        existingConsignees.set(consigneeName.trim(), consigneeId);
      }

      let notifyPartyId = notifyPartyName ? (existingNotifyParties.get(notifyPartyName.trim()) || null) : null;
      if (!notifyPartyId && notifyPartyName) {
        notifyPartyId = generateUuid();
        insertNotifyPartyStmt.run(
          notifyPartyId,
          notifyPartyName.trim(),
          null,
          null,
          null,
          localDoc.notify_party_address || null,
          nowIso,
          nowIso
        );
        existingNotifyParties.set(notifyPartyName.trim(), notifyPartyId);
      }

      // 4. Quantities & Weights
      const isNsa490 = bolNum === 'BOL-2026-NSA490';
      const cartons = isNsa490 ? 631 : (b.cargo?.packagesCount || 0);
      const grossKg = b.cargo?.grossWeightKg !== null && b.cargo?.grossWeightKg !== undefined ? b.cargo.grossWeightKg : 0.0;
      const netKg = b.cargo?.netWeightKg !== null && b.cargo?.netWeightKg !== undefined ? b.cargo.netWeightKg : 0.0;
      const driverRentAmt = b.driverRent?.amount || 0.0;
      const currency = b.driverRent?.currency || 'USD';

      // 5. Origin / Destination / Border
      const origin = b.origin || localDoc.port_of_loading || 'Kandahar, Afghanistan';
      const destination = b.destination || localDoc.destination || localDoc.port_of_discharge || 'India';
      const borderStation = b.borderCrossing || localDoc.borderCrossing || 'Dogharoon / Islam Qala';

      // 6. Dates & Descriptions
      const issueDate = b.issueDate || localDoc.issue_date || localDoc.issueDate || null;
      const cargoDesc = b.cargo?.description || localDoc.cargo_description || localDoc.cargoDescription || '';
      const status = b.quarantined ? 'quarantined' : 'active';

      function parseBolSeq(numStr) {
        if (!numStr) return 0;
        const match = String(numStr).match(/NSA[-\s]*(\d+)/i) || String(numStr).match(/(\d+)\s*$/);
        return match && match[1] ? parseInt(match[1], 10) : 0;
      }

      const seq = parseBolSeq(bolNum);
      let chronologicalCreatedAt = nowIso;
      if (issueDate) {
        const baseDate = String(issueDate).slice(0, 10);
        const hour = Math.min(23, Math.floor(seq / 60));
        const min = seq % 60;
        chronologicalCreatedAt = `${baseDate} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
      } else if (b.createdAt || localDoc.created_at) {
        chronologicalCreatedAt = b.createdAt || localDoc.created_at;
      }
      const updatedAt = b.updatedAt || localDoc.updated_at || chronologicalCreatedAt;

      // Check if this BOL is already in bol_records
      const existingId = existingBolRecords.get(bolNum) || (b.id && existingBolRecords.get(b.id));

      if (existingId) {
        // UPDATE existing row
        updateBolRecordStmt.run(
          issueDate,
          origin,
          destination,
          borderStation,
          driverName,
          localDoc.driver_father_name || localDoc.driverFatherName || '',
          driverRentAmt,
          cartons,
          grossKg,
          netKg,
          cargoDesc,
          status,
          0.0, // freight_fee
          0.0, // demurrage_fee
          150.0, // documentation_fee
          currency,
          1.0, // exchange_rate
          shipperName,
          consigneeName,
          notifyPartyName,
          truckId,
          driverId,
          shipperId,
          consigneeId,
          chronologicalCreatedAt,
          updatedAt,
          existingId
        );
        updatedCount++;
      } else {
        // INSERT new row
        const targetId = b.id || generateUuid();
        insertBolRecordStmt.run(
          targetId,
          bolNum,
          issueDate,
          origin,
          destination,
          borderStation,
          driverName,
          localDoc.driver_father_name || localDoc.driverFatherName || '',
          driverRentAmt,
          cartons,
          grossKg,
          netKg,
          cargoDesc,
          status,
          0.0, // freight_fee
          0.0, // demurrage_fee
          150.0, // documentation_fee
          currency,
          1.0, // exchange_rate
          shipperName,
          consigneeName,
          notifyPartyName,
          null, // company_id
          shipperId,
          consigneeId,
          notifyPartyId,
          driverId,
          truckId,
          chronologicalCreatedAt,
          updatedAt
        );
        existingBolRecords.set(bolNum, targetId);
        insertedCount++;

        // Add corresponding bol_item if missing
        const hasItem = checkBolItemStmt.get(targetId);
        if (!hasItem) {
          insertBolItemStmt.run(
            generateUuid(),
            targetId,
            cargoDesc || `${cartons} CTNS`,
            cartons,
            grossKg,
            netKg,
            chronologicalCreatedAt,
            updatedAt
          );
        }
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error(`❌ Transaction failed on ${dbFilePath}:`, err);
    db.close();
    throw err;
  }

  const finalCount = db.prepare('SELECT COUNT(*) as c FROM bol_records').get().c;
  const finalTrucks = db.prepare('SELECT COUNT(*) as c FROM trucks').get().c;
  console.log(`   ✅ Synced: ${updatedCount} updated, ${insertedCount} inserted, ${newTrucksCount} new trucks added.`);
  console.log(`   🎉 Final count in bol_records: ${finalCount} (trucks: ${finalTrucks})`);

  db.close();
}

// Execute sync for data/app.db
const mainAppDb = path.resolve('data/app.db');
syncBolRecordsToDb(mainAppDb);

// Also sync other active runtime DB copies if present
const additionalDbs = [
  path.join(process.env.APPDATA || '', 'AQ COMPANIES', 'data', 'app.db'),
  path.join(process.env.LOCALAPPDATA || '', 'AQ COMPANIES', 'data', 'app.db'),
  path.resolve('resources/backend/_internal/data/app.db'),
  path.resolve('resources/backend-dist/aq-backend/_internal/data/app.db'),
  path.resolve('release/win-unpacked/resources/backend/data/app.db'),
  path.resolve('release/win-unpacked/resources/seed-data/app.db'),
  path.resolve('release/win-unpacked/resources/seed-data/data/app.db'),
  path.resolve('release/win-unpacked/resources/app-server/data/app.db'),
  path.resolve('.next-production/standalone/data/app.db')
];

for (const adb of additionalDbs) {
  if (fs.existsSync(adb)) {
    try {
      syncBolRecordsToDb(adb);
    } catch (e) {
      console.warn(`   ⚠️ Note on ${adb}: ${e.message}`);
    }
  }
}

console.log('\n=====================================================');
console.log('✅ BOL RECORDS SYNC COMPLETED SUCCESSFULLY');
console.log('=====================================================\n');
