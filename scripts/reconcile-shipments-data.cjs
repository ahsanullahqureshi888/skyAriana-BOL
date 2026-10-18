const fs = require('fs');
const path = require('path');

const SHIPMENT_RECONCILIATIONS = {
  'BOL-2026-NSA505': { cartons: 2150, grossWeightKg: 23650.0, netWeightKg: 21500.0, goodsValueUSD: 123625.01 },
  'BOL-2026-NSA503': { cartons: 2360, grossWeightKg: 25960.0, netWeightKg: 23600.0, goodsValueUSD: 64520.00 },
  'BOL-2026-NSA501': { cartons: 1274, grossWeightKg: 24005.6, netWeightKg: 22282.0, goodsValueUSD: 47829.60 },
  'BOL-2026-NSA490': { cartons: 631, grossWeightKg: 10916.3, netWeightKg: 10096.0, goodsValueUSD: 43917.60 },
  'BOL-2026-NSA492': { cartons: 521, grossWeightKg: 9013.3, netWeightKg: 8336.0, goodsValueUSD: 33344.00 },
  'BOL-2026-NSA486': { cartons: 1325, grossWeightKg: 23000.0, netWeightKg: 21200.0, goodsValueUSD: 30948.80 },
  'BOL-2026-NSA487': { cartons: 1389, grossWeightKg: 24029.7, netWeightKg: 22224.0, goodsValueUSD: 77828.16 },
  'BOL-2026-NSA484': { cartons: 1370, grossWeightKg: 23701.0, netWeightKg: 21920.0, goodsValueUSD: 29568.01 },
  'BOL-2026-NSA475': { cartons: 1364, grossWeightKg: 23597.2, netWeightKg: 21824.0, goodsValueUSD: 69200.00 },
  'BOL-2026-NSA518': { cartons: 1814, grossWeightKg: 23895.0, netWeightKg: 22081.0, goodsValueUSD: 49845.50 },
  'BOL-2026-NSA584': { cartons: 2088, grossWeightKg: 24921.6, netWeightKg: 22320.0, goodsValueUSD: 12480.00 },
  'BOL-NSA621': { cartons: 1454, grossWeightKg: 26172.0, netWeightKg: 23264.0, goodsValueUSD: 103909.60 },
  'BOL-NSA619': { cartons: 1488, grossWeightKg: 26040.0, netWeightKg: 23808.0, goodsValueUSD: 73804.80 },
};

function atomicWrite(filepath, data) {
  const tmpPath = `${filepath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filepath);
}

const shipmentsPath = '.local-shipments.json';
if (fs.existsSync(shipmentsPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(shipmentsPath, `.local-shipments.backup-reconcile-${timestamp}.json`);
  const shipments = JSON.parse(fs.readFileSync(shipmentsPath, 'utf8'));

  let updatedCount = 0;
  for (const s of shipments) {
    const ref = s.referenceNumber || s.id;
    for (const [key, val] of Object.entries(SHIPMENT_RECONCILIATIONS)) {
      if (ref && (ref === key || ref.endsWith(key) || ref.includes(key.replace('BOL-2026-', '')))) {
        if (!s.cargo) s.cargo = {};
        Object.assign(s.cargo, val);
        updatedCount++;
        break;
      }
    }
  }

  atomicWrite(shipmentsPath, shipments);
  console.log(`Reconciled ${updatedCount} records in ${shipmentsPath}`);
} else {
  console.log(`File ${shipmentsPath} not found`);
}
