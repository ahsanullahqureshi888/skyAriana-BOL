const fs = require('fs');

const bols = JSON.parse(fs.readFileSync('.local-bols.json', 'utf8'));

console.log(`Checking ${bols.length} records in .local-bols.json for concatenated values...`);

const suspicious = [];

bols.forEach((b, idx) => {
  const num = b.bol_number || b.id;
  const rawPkg = String(b.number_of_packages || '');
  const rawGw = String(b.gross_weight || '');
  const rawNw = String(b.net_weight || '');
  const rawVal = String(b.goods_value || '');

  const pkgNum = parseInt((rawPkg.replace(/,/g, '').match(/\d+/) || ['0'])[0], 10);
  const gwNum = parseFloat((rawGw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) || ['0'])[0]);
  const nwNum = parseFloat((rawNw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) || ['0'])[0]);
  const valNum = parseFloat((rawVal.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) || ['0'])[0]);

  // Normal logistics limits:
  // A truck/container rarely has > 10,000 packages (typically 200 - 3,000 cartons)
  // A truck/container gross weight rarely exceeds 60,000 KG (typically 15,000 - 35,000 KG)
  // Goods value of a single agricultural container rarely exceeds $1,000,000 (typically $10,000 - $150,000)
  const isSuspicious = pkgNum > 10000 || gwNum > 100000 || nwNum > 100000 || valNum > 1000000;

  if (isSuspicious) {
    suspicious.push({
      idx,
      bol_number: num,
      pkgNum,
      gwNum,
      nwNum,
      valNum,
      rawPkg,
      rawGw,
      rawNw,
      rawVal,
      cargo_description: b.cargo_description
    });
  }
});

console.log(`Found ${suspicious.length} suspicious records:`);
suspicious.forEach(s => {
  console.log(`\nBOL: ${s.bol_number}`);
  console.log(`  Packages: ${s.rawPkg} (${s.pkgNum})`);
  console.log(`  Gross Wt: ${s.rawGw} (${s.gwNum})`);
  console.log(`  Net Wt:   ${s.rawNw} (${s.nwNum})`);
  console.log(`  Value:    ${s.rawVal} (${s.valNum})`);
  console.log(`  Cargo:    ${s.cargo_description}`);
});
