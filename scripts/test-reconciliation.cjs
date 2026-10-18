const fs = require('fs');

const bols = JSON.parse(fs.readFileSync('.local-bols.json', 'utf8'));

// Audit map of reconciled values based on cargo descriptions
const RECONCILIATIONS = {
  "BOL-2026-NSA584": {
    number_of_packages: "2,088 CTNS",
    net_weight: "22,320.0 KG",
    gross_weight: "24,921.6 KG",
  },
  "BOL-2026-NSA505": {
    number_of_packages: "2,150 CTNS",
    net_weight: "21,500.0 KG",
    gross_weight: "23,650.0 KG",
  },
  "BOL-2026-NSA503": {
    number_of_packages: "2,360 CTNS",
    net_weight: "23,600.0 KG",
    gross_weight: "25,960.0 KG",
  },
  "BOL-2026-NSA501": {
    number_of_packages: "1,274 CTNS",
    net_weight: "22,282.0 KG",
    gross_weight: "24,005.6 KG",
  },
  "BOL-2026-NSA492": {
    number_of_packages: "521 CTNS",
    net_weight: "8,336.0 KG",
  },
  "BOL-2026-NSA490": {
    number_of_packages: "631 CTNS",
    net_weight: "10,096.0 KG",
  },
  "BOL-2026-NSA487": {
    number_of_packages: "1,389 CTNS",
    net_weight: "22,224.0 KG",
    gross_weight: "24,029.7 KG",
    goods_value: "77,828.16 USD",
  },
  "BOL-2026-NSA486": {
    number_of_packages: "1,325 CTNS",
    net_weight: "21,200.0 KG",
    gross_weight: "23,000.0 KG",
  },
  "BOL-2026-NSA484": {
    number_of_packages: "1,370 CTNS",
    net_weight: "21,920.0 KG",
    gross_weight: "23,701.0 KG",
  },
  "BOL-2026-NSA475": {
    number_of_packages: "1,364 CTNS",
    net_weight: "21,824.0 KG",
    gross_weight: "23,597.2 KG",
    goods_value: "69,200.00 USD",
  },
  "BOL-2026-NSA518": {
    number_of_packages: "1,814 CTNS",
    net_weight: "22,081.0 KG",
    gross_weight: "23,895.0 KG",
    goods_value: "49,845.50 USD",
  },
};

// Simulate after reconciliation
let simTotalPkgs = 0;
let simTotalWt = 0;
let simTotalVal = 0;

bols.forEach(b => {
  const num = b.bol_number || b.id;
  const rec = RECONCILIATIONS[num];
  const pkgStr = rec?.number_of_packages || b.number_of_packages || "";
  const wtStr = rec?.gross_weight || b.gross_weight || rec?.net_weight || b.net_weight || "";
  const valStr = rec?.goods_value || b.goods_value || "";

  const pkgNum = parseInt((String(pkgStr).replace(/,/g, '').match(/\d+/) || ['0'])[0], 10);
  const wtNum = parseFloat((String(wtStr).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) || ['0'])[0]);
  const valNum = parseFloat((String(valStr).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) || ['0'])[0]);

  simTotalPkgs += pkgNum;
  simTotalWt += wtNum;
  simTotalVal += valNum;
});

console.log('RECONCILED AGGREGATES ACROSS ALL 93 BOLS:');
console.log(`Total Packages: ${simTotalPkgs.toLocaleString()} CTNS`);
console.log(`Total Gross Weight: ${simTotalWt.toLocaleString()} KG`);
console.log(`Total Goods Value: $${simTotalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
