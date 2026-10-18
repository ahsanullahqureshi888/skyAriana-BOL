const assert = require('assert');
const { readFileSync } = require('fs');

const localBols = JSON.parse(readFileSync('.local-bols.json', 'utf8'));

// Test NSA648 (Authentic NEW YAQOUBI LTD / M / S ARSH INTERNATIONAL)
const nsa648 = localBols.find(b => b.bol_number === 'BOL-2026-NSA648' || b.billOfLadingNumber === 'BOL-2026-NSA648');
assert(nsa648, 'NSA648 must exist');
assert.strictEqual(nsa648.bol_number, 'BOL-2026-NSA648');
assert.strictEqual(nsa648.shipper_name, 'NEW YAQOUBI LTD');
assert.strictEqual(nsa648.consignee_name, 'M / S ARSH INTERNATIONAL');
assert(nsa648.cargo_description.includes('BLACK RAISNIS 1460 CTNS 16.0 - KGS'));
assert.strictEqual(nsa648.net_weight, '23,360 KG');
assert.strictEqual(nsa648.gross_weight, '24,820 KG');
assert.strictEqual(nsa648.driver_name, 'اسدالله ولد سلطان محمد');
assert(nsa648.truck_number.includes('۷۷۵۵۵'));
assert(nsa648.driver_rent.includes('38,500 AFN'));
assert.strictEqual(nsa648.routes.length, 5);

// Test NSA651 (Preserved NIDA MOHAMMAD NOORI / LAKHDATAR FOODS PVT LTD)
const nsa651 = localBols.find(b => b.bol_number === 'BOL-2026-NSA651' || b.billOfLadingNumber === 'BOL-2026-NSA651');
assert(nsa651, 'NSA651 must exist');
assert.strictEqual(nsa651.bol_number, 'BOL-2026-NSA651');
assert(nsa651.shipper_name.includes('NIDA MOHAMMAD'));
assert.strictEqual(nsa651.consignee_name, 'LAKHDATAR FOODS PVT LTD');
assert(nsa651.cargo_description.includes('DRY FIGS 2395 CTNS 10.0 KGS'));
assert.strictEqual(nsa651.net_weight, '23,950 KG');
assert.strictEqual(nsa651.gross_weight, '26,345 KG');
assert.strictEqual(nsa651.driver_name, 'شیر احمد');
assert.strictEqual(nsa651.truck_number, '۵۳۸۲۸ هرات');

// Test NSA640
const nsa640 = localBols.find(b => b.bol_number === 'BOL-2026-NSA640' || b.billOfLadingNumber === 'BOL-2026-NSA640');
assert(nsa640, 'NSA640 must exist');
assert(nsa640.numberOfPackages.includes('333 CTNS DRY FIGS - 1235 CTNS GOLDEN RAISNIS'));
assert.strictEqual(nsa640.shipperName, 'NASRAT SHARIF LTD');

// Test NSA644
const nsa644 = localBols.find(b => b.bol_number === 'BOL-2026-NSA644' || b.billOfLadingNumber === 'BOL-2026-NSA644');
assert(nsa644, 'NSA644 must exist');
assert(nsa644.numberOfPackages.includes('850 CTNS BLACK RAISNIS - 672 CTNS BLACK RAISNIS'));
assert.strictEqual(nsa644.shipperName, 'NEW YAQOUBI LTD');
// Test NSA683 (Restored RAHMAT NAZAR LTD / RICH VALLEY DRY FRUITS PVT LTD)
const nsa683 = localBols.find(b => b.bol_number === 'BOL-2026-NSA683' || b.billOfLadingNumber === 'BOL-2026-NSA683');
assert(nsa683, 'NSA683 must exist');
assert.strictEqual(nsa683.bol_number, 'BOL-2026-NSA683');
assert.strictEqual(nsa683.shipper_name, 'RAHMAT NAZAR LTD');
assert.strictEqual(nsa683.consignee_name, 'RICH VALLEY DRY FRUITS PVT LTD');
assert(nsa683.truck_number.includes('35599'));
assert.strictEqual(nsa683.net_weight, '23,328 KG');
assert.strictEqual(nsa683.gross_weight, '25,660.8 KG');
assert.strictEqual(nsa683.number_of_packages, '1,458 CTNS');
assert(nsa683.cargo_description.includes('BLACK RAISINS 1458 CTNS'));
assert(nsa683.cargo_route_note.includes('از دوغارون کانتینر معمولی'));
assert.strictEqual(nsa683.routes.length, 5);

console.log('ALL VERIFICATION ASSERTIONS PASSED SUCCESSFULLY!');
