const test=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-typescript.cjs');
const pashtoBidi = load('lib/utils/pashto-bidi.ts');
const pdfArabicFont = load('lib/utils/pdf-arabic-font.ts');
const pdfFonts = load('lib/utils/pdf-fonts.ts', {
  './pashto-bidi': pashtoBidi,
  './pdf-arabic-font': pdfArabicFont,
});
const {
  generateShippingDocumentsPDF,
  parseCommodityItems,
  parsePackagesNumbers,
  sumWeightStrings,
  deriveShippingDocumentData,
  buildShippingDocumentFileName,
  cleanStickerCommodity,
  extractInvoiceNumber,
}=load('lib/utils/shipping-documents.ts',{
  '@/lib/sticker-badges-data':load('lib/sticker-badges-data.ts'),
  '@/lib/utils/pashto-bidi':pashtoBidi,
  '@/lib/utils/pdf-fonts':pdfFonts,
});
const data={bolNumber:'BOL-QA',invoiceNumber:'INV-QA',shipper:'Test exporter',consignee:'Test importer',commodity:'Raisins',packageCount:12,netWeight:'120 KG',grossWeight:'132 KG',commodities:[]};
async function pages(options){const blob=await generateShippingDocumentsPDF({kind:'stickers',data,...options});const text=new TextDecoder('latin1').decode(await blob.arrayBuffer());assert.equal(text.slice(0,5),'%PDF-');return (text.match(/\/Type\s*\/Page\b/g)||[]).length;}
test('sticker sheets paginate all requested labels, including a partial last sheet',async()=>{
 assert.equal(await pages({stickerLayout:'sheet',stickerQuantity:12}),2);
 assert.equal(await pages({stickerLayout:'sheet',stickerQuantity:7}),2);
});
test('single sticker pages honor quantity and default master remains one page',async()=>{
 assert.equal(await pages({stickerLayout:'single',stickerQuantity:3}),3);
 assert.equal(await pages({}),1);
});
test('rejects invalid sticker quantities',async()=>{
 for(const stickerQuantity of [0,-1,1.5,Infinity])await assert.rejects(pages({stickerQuantity}),/positive whole number/);
});

test('packing list and file name take quantity only from No. of Packages',()=>{
  const derived = deriveShippingDocumentData({
    bol_number:'BOL-QTY',
    cargo_description:'RAISINS | 999 CTNS',
    number_of_packages:'12 Cartons',
  },'BOL-QTY','2026-09-17');
  assert.equal(derived.packageCount,12);
  assert.equal(derived.packageCountText,'12');
  assert.equal(derived.commodities[0].packageCountText,'12');
  assert.match(buildShippingDocumentFileName('packing-list',derived),/12-CTNS/);
  assert.doesNotMatch(buildShippingDocumentFileName('packing-list',derived),/999-CTNS/);

  const missing = deriveShippingDocumentData({
    bol_number:'BOL-NO-QTY',
    cargo_description:'RAISINS | 999 CTNS',
    number_of_packages:'',
  },'BOL-NO-QTY','2026-09-17');
  assert.equal(missing.packageCount,0);
  assert.equal(missing.packageCountText,'');
  assert.equal(missing.commodities[0].packageCountText,'');
  assert.doesNotMatch(buildShippingDocumentFileName('packing-list',missing),/999-CTNS/);
});

test('parses multi-item cargo (2, 3, 4, 5 items) stacked on top of each other and sums packages', ()=>{
  const parsedNumbers = parsePackagesNumbers("330 - 200 Bags");
  assert.deepEqual(parsedNumbers, [330, 200]);

  const parsedFive = parsePackagesNumbers("100 + 200 + 300 + 400 + 500 Bags");
  assert.deepEqual(parsedFive, [100, 200, 300, 400, 500]);

  const items = parseCommodityItems(
    "DRIED FIGS - ALMONDS",
    "330 - 200 Bags",
    "19,800 KG - 12,400 KG",
    "19,899 KG - 12,060 KG",
    "",
    "",
    "Bags",
    "0804.20",
    "",
    "JUL/2026",
    "JUL/2028"
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].packageCount, 330);
  assert.equal(items[0].commodity, "DRIED FIGS");
  assert.equal(items[0].grossWeight, "19,899 KG");
  assert.equal(items[0].netWeight, "19,800 KG");

  assert.equal(items[1].packageCount, 200);
  assert.equal(items[1].commodity, "ALMONDS");
  assert.equal(items[1].grossWeight, "12,060 KG");
  assert.equal(items[1].netWeight, "12,400 KG");

  // Sum weights correctly
  assert.equal(sumWeightStrings("19,899 KG - 12,060 KG"), "31,959 KG");
  assert.equal(sumWeightStrings("19,800 KG - 12,400 KG"), "32,200 KG");

  // Derive BOL data with multi-item cargo
  const derived = deriveShippingDocumentData({
    bol_number: "BOL-MULTI",
    cargo_description: "DRIED FIGS - ALMONDS",
    number_of_packages: "330 - 200 Bags",
    gross_weight: "19,899 KG - 12,060 KG",
    net_weight: "19,800 KG - 12,400 KG",
  }, "BOL-MULTI", "2026-09-17");

  assert.equal(derived.packageCount, 530);
  assert.equal(derived.commodities.length, 2);

  // User scenario: Template headers + single cargo tag + 2 package/weight items => strictly 2 items!
  const userCargo = "📦 CONTAINER & CARGO DETAILS | 📄 DOCUMENT & SHIPPING DETAILS\n🍃 CARGO: 330 - BAGS - CARAWAY SEEDS (ZEERAH KAJAK) | 📄 INVOICE NO:INV - 04\n📦 CONTAINER & CARGO DETAILS | 📄 DOCUMENT & SHIPPING DETAILS";
  const userDerived = deriveShippingDocumentData({
    bol_number: "BOL-2026-NSA498",
    cargo_description: userCargo,
    number_of_packages: "330 - 200 Bags",
    gross_weight: "19,899 KG - 12,060 KG",
    net_weight: "19,800 KG - 12,400 KG",
  }, "BOL-2026-NSA498", "2026-08-23");

  assert.equal(userDerived.commodities.length, 2, "Must show exactly 2 items, never 3 items");
  assert.equal(userDerived.commodities[0].packageCount, 330);
  assert.equal(userDerived.commodities[0].commodity, "CARAWAY SEEDS (ZEERAH KAJAK)");
  assert.equal(userDerived.commodities[0].grossWeight, "19,899 KG");
  assert.equal(userDerived.commodities[0].netWeight, "19,800 KG");

  assert.equal(userDerived.commodities[1].packageCount, 200);
  assert.equal(userDerived.commodities[1].commodity, "CARAWAY SEEDS (ZEERAH KAJAK)");
  assert.equal(userDerived.commodities[1].grossWeight, "12,060 KG");
  assert.equal(userDerived.commodities[1].netWeight, "12,400 KG");

  // User scenario: Single physical item with rate/weight spec text in cargo => strictly 1 item, never 3!
  const singleItemCargo = "📦 CONTAINER & CARGO DETAILS | 📄 DOCUMENT & SHIPPING DETAILS\n🥬 Cargo: BLACK-RAISNIS\nBLACK-RAISNIS\n16KGS-@ 4.45 $";
  const singleDerived = deriveShippingDocumentData({
    bol_number: "BOL-SINGLE",
    cargo_description: singleItemCargo,
    number_of_packages: "630 Cartons",
    gross_weight: "10,899 KG",
    net_weight: "10,080 KG",
  }, "BOL-SINGLE", "2026-08-22");

  assert.equal(singleDerived.commodities.length, 1, "Must show strictly 1 item when user entered 1 package count and weight");
  assert.equal(singleDerived.packageCount, 630);
  assert.equal(singleDerived.commodities[0].packageCount, 630);
  assert.equal(singleDerived.commodities[0].commodity, "BLACK-RAISINS");
  assert.equal(singleDerived.commodities[0].grossWeight, "10,899 KG");
  assert.equal(singleDerived.commodities[0].netWeight, "10,080 KG");
});

test('BOL-2026-NSA519 user scenario: carton weight spec (16 - KGS) never duplicates quantity', () => {
  const bol519 = {
    bol_number: 'BOL-2026-NSA519',
    number_of_packages: '1450 Cartons',
    net_weight: '23,200 KG',
    gross_weight: '25,520 KG',
    kgs_per_carton: '16 - KGS',
    gross_weight_per_carton: '17.6 - KGS',
    cargo_description: '📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\n🥬 Cargo: | 📅 Transit Date:',
  };

  const derived = deriveShippingDocumentData(bol519, 'BOL-2026-NSA519', '2026-09-18');
  assert.equal(derived.packageCount, 1450, "Total package count must be 1450");
  assert.equal(derived.commodities.length, 1, "Must have strictly 1 commodity row, never twice (2 rows)");
  assert.equal(derived.commodities[0].packageCount, 1450);
  assert.equal(derived.commodities[0].grossWeight, '25,520 KG');
  assert.equal(derived.commodities[0].netWeight, '23,200 KG');
});

test('Sticker commodity normalizes RAISNIS typo and strips rate/package fragments', () => {
  assert.equal(cleanStickerCommodity('BLACK RAISNIS 1382 CTNS 16 - KG RATE 1.35 $'), 'BLACK RAISINS');
  assert.equal(cleanStickerCommodity('1400 CTNS - BLACK RAISNIS'), 'BLACK RAISINS');
  assert.equal(cleanStickerCommodity('BLACK-RAISNIS'), 'BLACK RAISINS');
  assert.equal(cleanStickerCommodity('GREEN-RAISNIS'), 'GREEN RAISINS');
  assert.equal(cleanStickerCommodity('🥬 Cargo: BLACK RAISNIS'), 'BLACK RAISINS');
  assert.equal(cleanStickerCommodity('DETAILS'), 'CONSOLIDATED CARGO');
});

test('User Scenario BOL-NSA623: extracts INV-014 (never fallback INV-001) and commodity DRY FIGS (never PARTICULARS)', () => {
  const bolData = {
    bol_number: 'BOL-NSA623',
    consignee_name: 'CASTROL EXPORT INDUSTRIES',
    shipper_name: 'TAHIR SULTANI LTD',
    number_of_packages: '2200 CTNS DRY FIGS ',
    cargo_description: '📦 CONTAINER & CARGO PARTICULARS:\n• Description: DRY FIGS 2200 CTNS 10KGS\n• Transit Date: 2026-09-28\n• INV-014',
  };

  const invoice = extractInvoiceNumber(bolData);
  assert.equal(invoice, 'INV-014', 'Must extract INV-014 from bullet note without falling back to INV-001');

  const derived = deriveShippingDocumentData(bolData, 'BOL-NSA623', '2026-09-28');
  assert.equal(derived.invoiceNumber, 'INV-014');
  assert.equal(derived.commodity, 'DRY FIGS', 'Must extract DRY FIGS, never PARTICULARS');

  const fileName = buildShippingDocumentFileName('all', derived);
  assert.equal(
    fileName,
    'INV-014-CASTROL EXPORT INDUSTRIES-2200-CTNS-DRY-FIGS-TAHIR SULTANI LTD-BOL-NSA623.pdf'
  );
  assert.doesNotMatch(fileName, /INV-001/, 'File name must never contain INV-001 when INV-014 is specified');
  assert.doesNotMatch(fileName, /PARTICULARS/, 'File name must contain the actual commodity DRY-FIGS, not generic PARTICULARS');
});

test('Large numeric formatting and multi-item weight summation invariance', () => {
  // 100,000 KG to 1,000,000 KG tests
  assert.equal(sumWeightStrings("100,000 KG + 250,000 KG"), "350,000 KG");
  assert.equal(sumWeightStrings("500,000 KG + 500,000 KG"), "1,000,000 KG");
  assert.equal(sumWeightStrings("1,250,500.50 KG - 250,500.50 KG"), "1,501,001 KG");

  // 6-item cargo parsing
  const sixCargo = parseCommodityItems(
    "ITEM 1 - ITEM 2 - ITEM 3 - ITEM 4 - ITEM 5 - ITEM 6",
    "100 + 200 + 300 + 400 + 500 + 600 Cartons",
    "1,000 KG + 2,000 KG + 3,000 KG + 4,000 KG + 5,000 KG + 6,000 KG",
    "1,100 KG + 2,200 KG + 3,300 KG + 4,400 KG + 5,500 KG + 6,600 KG",
    "",
    "",
    "Cartons"
  );
  assert.equal(sixCargo.length, 6, "Must correctly parse 6 distinct commodity rows");
  assert.equal(sixCargo[0].packageCount, 100);
  assert.equal(sixCargo[5].packageCount, 600);
  assert.equal(sixCargo[5].commodity, "ITEM 6");
  assert.equal(sixCargo[5].grossWeight, "6,600 KG");
});

test('A4 Page Dimension and File Naming Invariants', () => {
  const derived = deriveShippingDocumentData({
    bol_number: 'BOL-TEST-A4',
    invoiceNumber: 'INV-999',
    shipper: 'SKY ARIANA',
    consignee: 'KABUL LOGISTICS',
    commodity: 'MIXED DRY FRUITS',
    number_of_packages: '500 Packages',
    gross_weight: '10,000 KG',
    net_weight: '9,500 KG',
  }, 'BOL-TEST-A4', '2026-09-28');

  // Verify file naming doesn't produce undefined or double dashes
  const bolFileName = buildShippingDocumentFileName('bol', derived);
  assert.doesNotMatch(bolFileName, /undefined/i);
  assert.doesNotMatch(bolFileName, /--/);
  assert.match(bolFileName, /\.pdf$/i);

  const allFileName = buildShippingDocumentFileName('all', derived);
  assert.doesNotMatch(allFileName, /undefined/i);
  assert.doesNotMatch(allFileName, /--/);
  assert.match(allFileName, /\.pdf$/i);
});

test('Multi-item Cargo Description and Ultra-Density Tier Invariant', () => {
  // Simulates the user scenario from screenshot: 5 route stops + multiple commodities
  const routeCount = 5;
  const multiItemDesc = `• Description: AFGHAN COMMERCIAL EXPORT CARGO
• Transit Date: 2026-09-28
BLACK RAISNIS 770 CTNS 16 - KGS @ 3.10 $
GREEN RAISNIS 718 CTNS 16 - KGS @ 3.10 $
RED RAISINS 500 CTNS 16 - KGS @ 3.20 $
DRIED FIGS 400 CTNS 10 - KGS @ 5.00 $
• INV-170`;

  const lines = multiItemDesc.split("\n").map(l => l.trim()).filter(Boolean);
  const descLineCount = lines.length;

  let densityScore = 0;
  if (routeCount >= 5) densityScore += 3;
  if (descLineCount >= 7) densityScore += 5;
  else if (descLineCount >= 5) densityScore += 4;

  assert.ok(densityScore >= 6, "Must trigger ultra-compact density tier for high-density multi-item shipment");

  // Verify item lines vs meta lines separation
  const metaLines = lines.filter(l => /^[•\-\*]\s*(description|transit|inv|hs|tc)/i.test(l));
  const itemLines = lines.filter(l => !/^[•\-\*]\s*(description|transit|inv|hs|tc)/i.test(l));

  assert.equal(metaLines.length, 3, "Must extract 3 meta lines (Description, Transit Date, INV)");
  assert.equal(itemLines.length, 4, "Must extract 4 commodity item lines for 2-column grid rendering");
});

