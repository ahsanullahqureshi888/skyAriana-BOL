const fs = require('fs');

console.log('--- AUDITING .local-bols.json ---');
let bols = [];
try {
  bols = JSON.parse(fs.readFileSync('.local-bols.json', 'utf8'));
  console.log(`Loaded ${bols.length} records from .local-bols.json`);
} catch (e) {
  console.log('Error reading .local-bols.json:', e.message);
}

console.log('--- AUDITING .local-shipments.json ---');
let shipments = [];
try {
  shipments = JSON.parse(fs.readFileSync('.local-shipments.json', 'utf8'));
  console.log(`Loaded ${shipments.length} records from .local-shipments.json`);
} catch (e) {
  console.log('Error reading .local-shipments.json:', e.message);
}

// Check saved documents in other files
const files = ['.local-shipment-documents.json', '.local-shipment-files.json'];
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    console.log(`File ${f}: ${Array.isArray(data) ? data.length : Object.keys(data).length} entries`);
  } catch (e) {
    console.log(`File ${f}: error ${e.message}`);
  }
}

// Let's audit every record in bols and shipments for huge values or concatenation
function inspectRecords(list, label) {
  console.log(`\nInspecting ${label} (${list.length} records):`);
  let maxPkg = 0, maxPkgDoc = null;
  let maxWt = 0, maxWtDoc = null;
  let maxVal = 0, maxValDoc = null;

  let totalPkg = 0;
  let totalWt = 0;
  let totalVal = 0;

  list.forEach((doc, idx) => {
    // Packages
    const rawPkg = doc.number_of_packages || doc.numberOfPackages || doc.carton_count;
    const pkgMatch = String(rawPkg || '').replace(/,/g, '').match(/\d+/);
    const pVal = pkgMatch ? parseInt(pkgMatch[0], 10) : 0;
    totalPkg += pVal;
    if (pVal > maxPkg) { maxPkg = pVal; maxPkgDoc = { idx, num: doc.bol_number || doc.id, raw: rawPkg, pVal }; }

    // Weight
    const rawWt = doc.gross_weight || doc.grossWeight || doc.net_weight || doc.netWeight || doc.gross_weight_kg;
    const wtMatch = String(rawWt || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    const wVal = wtMatch ? parseFloat(wtMatch[0]) : 0;
    totalWt += wVal;
    if (wVal > maxWt) { maxWt = wVal; maxWtDoc = { idx, num: doc.bol_number || doc.id, raw: rawWt, wVal }; }

    // Goods value
    const rawVal = doc.goods_value || doc.goodsValue || doc.freight_fee;
    const valMatch = String(rawVal || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    const vVal = valMatch ? parseFloat(valMatch[0]) : 0;
    totalVal += vVal;
    if (vVal > maxVal) { maxVal = vVal; maxValDoc = { idx, num: doc.bol_number || doc.id, raw: rawVal, vVal }; }
  });

  console.log(`Totals for ${label}:`);
  console.log(`  Total Packages: ${totalPkg.toLocaleString()}`);
  console.log(`  Total Weight: ${totalWt.toLocaleString()} KG`);
  console.log(`  Total Value: $${totalVal.toLocaleString()}`);
  console.log(`  Max Package:`, maxPkgDoc);
  console.log(`  Max Weight:`, maxWtDoc);
  console.log(`  Max Value:`, maxValDoc);
}

inspectRecords(bols, '.local-bols.json');
inspectRecords(shipments, '.local-shipments.json');
