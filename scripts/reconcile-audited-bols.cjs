const fs = require('fs');
const path = require('path');

const RECONCILIATIONS = {
  "BOL-2026-NSA584": {
    number_of_packages: "2,088 CTNS",
    numberOfPackages: "2,088 CTNS",
    net_weight: "22,320.0 KG",
    netWeight: "22,320.0 KG",
    gross_weight: "24,921.6 KG",
    grossWeight: "24,921.6 KG",
  },
  "BOL-2026-NSA505": {
    number_of_packages: "2,150 CTNS",
    numberOfPackages: "2,150 CTNS",
    net_weight: "21,500.0 KG",
    netWeight: "21,500.0 KG",
    gross_weight: "23,650.0 KG",
    grossWeight: "23,650.0 KG",
  },
  "BOL-2026-NSA503": {
    number_of_packages: "2,360 CTNS",
    numberOfPackages: "2,360 CTNS",
    net_weight: "23,600.0 KG",
    netWeight: "23,600.0 KG",
    gross_weight: "25,960.0 KG",
    grossWeight: "25,960.0 KG",
  },
  "BOL-2026-NSA501": {
    number_of_packages: "1,274 CTNS",
    numberOfPackages: "1,274 CTNS",
    net_weight: "22,282.0 KG",
    netWeight: "22,282.0 KG",
    gross_weight: "24,005.6 KG",
    grossWeight: "24,005.6 KG",
  },
  "BOL-2026-NSA492": {
    number_of_packages: "521 CTNS",
    numberOfPackages: "521 CTNS",
    net_weight: "8,336.0 KG",
    netWeight: "8,336.0 KG",
  },
  "BOL-2026-NSA490": {
    number_of_packages: "631 CTNS",
    numberOfPackages: "631 CTNS",
    net_weight: "10,096.0 KG",
    netWeight: "10,096.0 KG",
  },
  "BOL-2026-NSA487": {
    number_of_packages: "1,389 CTNS",
    numberOfPackages: "1,389 CTNS",
    net_weight: "22,224.0 KG",
    netWeight: "22,224.0 KG",
    gross_weight: "24,029.7 KG",
    grossWeight: "24,029.7 KG",
    goods_value: "77,828.16 USD",
    goodsValue: "77,828.16 USD",
  },
  "BOL-2026-NSA486": {
    number_of_packages: "1,325 CTNS",
    numberOfPackages: "1,325 CTNS",
    net_weight: "21,200.0 KG",
    netWeight: "21,200.0 KG",
    gross_weight: "23,000.0 KG",
    grossWeight: "23,000.0 KG",
  },
  "BOL-2026-NSA484": {
    number_of_packages: "1,370 CTNS",
    numberOfPackages: "1,370 CTNS",
    net_weight: "21,920.0 KG",
    netWeight: "21,920.0 KG",
    gross_weight: "23,701.0 KG",
    grossWeight: "23,701.0 KG",
  },
  "BOL-2026-NSA475": {
    number_of_packages: "1,364 CTNS",
    numberOfPackages: "1,364 CTNS",
    net_weight: "21,824.0 KG",
    netWeight: "21,824.0 KG",
    gross_weight: "23,597.2 KG",
    grossWeight: "23,597.2 KG",
    goods_value: "69,200.00 USD",
    goodsValue: "69,200.00 USD",
  },
  "BOL-2026-NSA518": {
    number_of_packages: "1,814 CTNS",
    numberOfPackages: "1,814 CTNS",
    net_weight: "22,081.0 KG",
    netWeight: "22,081.0 KG",
    gross_weight: "23,895.0 KG",
    grossWeight: "23,895.0 KG",
    goods_value: "49,845.50 USD",
    goodsValue: "49,845.50 USD",
  },
};

function atomicWrite(filepath, data) {
  const tmpPath = `${filepath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filepath);
}

// 1. Reconcile .local-bols.json
const bolsPath = '.local-bols.json';
if (fs.existsSync(bolsPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(bolsPath, `.local-bols.backup-reconcile-${timestamp}.json`);
  const bols = JSON.parse(fs.readFileSync(bolsPath, 'utf8'));

  let updatedCount = 0;
  for (const b of bols) {
    const num = b.bol_number || b.id;
    if (RECONCILIATIONS[num]) {
      Object.assign(b, RECONCILIATIONS[num]);
      updatedCount++;
    }
  }

  atomicWrite(bolsPath, bols);
  console.log(`Reconciled ${updatedCount} records in ${bolsPath}`);
}

// 2. Reconcile .local-full-snapshot.json if exists
const snapPath = '.local-full-snapshot.json';
if (fs.existsSync(snapPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(snapPath, `.local-full-snapshot.backup-reconcile-${timestamp}.json`);
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));

  let updatedCount = 0;
  if (snap.documents && typeof snap.documents === 'object') {
    for (const [key, doc] of Object.entries(snap.documents)) {
      const num = doc.bol_number || doc.id || key;
      if (RECONCILIATIONS[num]) {
        Object.assign(doc, RECONCILIATIONS[num]);
        updatedCount++;
      }
    }
  }

  atomicWrite(snapPath, snap);
  console.log(`Reconciled ${updatedCount} records in ${snapPath}`);
}

console.log('Reconciliation complete.');
