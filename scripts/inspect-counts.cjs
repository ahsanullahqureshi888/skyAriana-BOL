const fs = require('fs');

const bols = JSON.parse(fs.readFileSync('.local-bols.json', 'utf8'));
console.log(`Total entries in .local-bols.json: ${bols.length}`);

// Count unique BOL numbers
const uniqueBolNumbers = new Set();
const uniqueIds = new Set();
let meaningfulCount = 0;

function isMeaningfulBOL(d) {
  if (!d) return false;
  const s = (d.shipper_name || "").trim().toLowerCase();
  const hasShipper = s !== "" && s !== "no shipper" && s !== "no-shipper" && s !== "none";
  const num = (d.bol_number || "").trim();
  const hasBol = Boolean(num && num.length > 3 && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(num));
  const q = (d.number_of_packages || "").trim().toLowerCase();
  const hasPkg = q !== "" && q !== "0" && q !== "0-ctns" && q !== "0 ctns";
  const nw = (d.net_weight || "").trim();
  const gw = (d.gross_weight || "").trim();
  const val = (d.goods_value || "").trim();
  const cName = (d.consignee_name || "").trim().toLowerCase();
  const hasConsignee = cName !== "" && cName !== "no consignee";
  const hasDesc = (d.cargo_description || "").replace(/[^\w\s\u0600-\u06FF]/g, "").trim().length > 3;
  const hasDriver = Boolean(
    (d.driver_name || "").trim() ||
    (d.driver_rent || "").trim() ||
    (d.driverFreight || "").trim() ||
    (d.truck_number || "").trim()
  );
  return hasShipper || hasBol || hasPkg || nw !== "" || gw !== "" || val !== "" || hasConsignee || hasDesc || hasDriver;
}

bols.forEach(b => {
  if (b.bol_number) uniqueBolNumbers.add(b.bol_number.trim().toUpperCase());
  if (b.id) uniqueIds.add(b.id.trim().toUpperCase());
  if (isMeaningfulBOL(b)) meaningfulCount++;
});

console.log(`Unique BOL numbers in .local-bols.json: ${uniqueBolNumbers.size}`);
console.log(`Meaningful BOLs in .local-bols.json: ${meaningfulCount}`);

// Check .local-shipment-documents.json
try {
  const docs = JSON.parse(fs.readFileSync('.local-shipment-documents.json', 'utf8'));
  console.log(`Entries in .local-shipment-documents.json: ${docs.length}`);
} catch (e) {}

// Check .local-shipment-files.json
try {
  const files = JSON.parse(fs.readFileSync('.local-shipment-files.json', 'utf8'));
  console.log(`Entries in .local-shipment-files.json: ${Array.isArray(files) ? files.length : Object.keys(files).length}`);
} catch (e) {}

// Check SQLite bol_records count
console.log('\nAudit complete.');
