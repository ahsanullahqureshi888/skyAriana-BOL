const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-typescript.cjs');

require('./isolated-data.cjs')();

const storage = load('lib/services/shipment-document-storage.ts');
const service = load('lib/services/shipment-document-service.ts', {
  './shipment-document-storage': storage,
  '@/lib/services/shipment-document-storage': storage,
});

const {
  cleanStr,
  parseNumber,
  computeBolSourceHash,
  deriveShipmentItemsFromBol,
  calculateGoodsValue,
  mapBolToCommercialInvoice,
  mapBolToPackingList,
  mapBolToSticker,
  mapBolToTransitPaper,
  mapBolToPhytoDraft,
  computeMissingFields,
  getOrCreateShipmentDocumentPackage,
  finalizeDocument,
  createDocumentRevision,
  bulkCreateShipmentDocuments,
  checkDocumentIntegrity,
} = service;

const SAMPLE_BOL = {
  bol_number: 'BOL-2026-TEST-001',
  issue_date: '2026-09-21',
  shipper_name: 'AFGHAN ARYA LOGISTICS LTD',
  shipper_address: 'Kabul Industrial Park, District 9, Kabul, Afghanistan',
  consignee_name: 'HINDUSTAN TRADING CORP',
  consignee_address: 'APMC Market Phase II, Vashi, Navi Mumbai, India',
  notify_party: 'SAME AS CONSIGNEE',
  truck_number: 'AFG-44521 / کابل',
  driver_name: 'Ahmad Wali',
  driver_father_name: 'Mohammad Din / محمد دین',
  driver_contact: '+93 700 123 456',
  driver_rent: '1200.00',
  number_of_packages: '1420 CTNS',
  gross_weight: '22720 KG',
  net_weight: '21300 KG',
  cargo_description: 'GREEN RAISINS GRADE A (کشمش سبز اعلا)',
  kgs_per_carton: '15.0',
  gross_weight_per_carton: '16.0',
  rate_per_kgs: '2.50',
  goods_value: '53250.00',
  container_numbers: 'TGHU9482103',
  seal_numbers: 'SL-883921',
  port_of_loading: 'Islam Qala Border, AF',
  port_of_discharge: 'Nhava Sheva / JNPT, IN',
  place_of_delivery: 'Navi Mumbai Cold Storage, IN',
};

test('1. New BOL auto-creation generates all 5 related documents', async () => {
  const pkg = await getOrCreateShipmentDocumentPackage(SAMPLE_BOL);
  assert.equal(pkg.bolNumber, SAMPLE_BOL.bol_number);
  assert.equal(pkg.documentsTotalCount, 5);

  const docs = Object.values(pkg.documents);
  const types = docs.map((d) => d.documentType);
  assert.ok(types.includes('commercial_invoice'), 'CI must exist');
  assert.ok(types.includes('packing_list'), 'PL must exist');
  assert.ok(types.includes('stickers'), 'Stickers must exist');
  assert.ok(types.includes('transit_paper'), 'Transit Paper must exist');
  assert.ok(types.includes('phytosanitary'), 'Phyto draft must exist');

  // Verify Commercial Invoice fields
  const ci = pkg.documents.commercial_invoice.documentData;
  assert.equal(ci.exporterName, SAMPLE_BOL.shipper_name);
  assert.equal(ci.buyerName, SAMPLE_BOL.consignee_name);
  assert.equal(ci.totalPackages, 1420);
  assert.equal(ci.totalNetWeight, 21300);
  assert.equal(ci.totalGrossWeight, 22720);
  assert.equal(ci.totalGoodsValue, 53250);

  // Goods value must never include driver rent or freight charges
  assert.ok(ci.totalGoodsValue > 1200, 'Goods value is distinct from freight');
});

test('2. Auto-sync on draft edit updates draft documents while preserving numbers', async () => {
  const originalPkg = await getOrCreateShipmentDocumentPackage(SAMPLE_BOL);
  const originalCiNumber = originalPkg.documents.commercial_invoice.documentNumber;
  const originalPlNumber = originalPkg.documents.packing_list.documentNumber;

  // Edit BOL packages and weight
  const updatedBol = {
    ...SAMPLE_BOL,
    number_of_packages: '1500 CTNS',
    net_weight: '22500 KG',
    gross_weight: '24000 KG',
    goods_value: '56250.00',
  };

  const updatedPkg = await getOrCreateShipmentDocumentPackage(updatedBol);
  assert.equal(updatedPkg.documents.commercial_invoice.documentNumber, originalCiNumber);
  assert.equal(updatedPkg.documents.packing_list.documentNumber, originalPlNumber);

  const updatedCi = updatedPkg.documents.commercial_invoice.documentData;
  assert.equal(updatedCi.totalPackages, 1500);
  assert.equal(updatedCi.totalNetWeight, 22500);
  assert.equal(updatedCi.totalGrossWeight, 24000);
  assert.equal(updatedCi.totalGoodsValue, 56250);
});

test('3. Finalized document protection and revision flow', async () => {
  const uniqueBolNumber = `BOL-2026-FINAL-${Date.now()}`;
  const bolForFinalize = {
    ...SAMPLE_BOL,
    bol_number: uniqueBolNumber,
  };
  const pkg = await getOrCreateShipmentDocumentPackage(bolForFinalize);
  const ciId = pkg.documents.commercial_invoice.id;

  // Finalize / issue document
  const issuedCi = await finalizeDocument(ciId, 'Customs Agent');
  assert.equal(issuedCi.status, 'issued');
  assert.equal(issuedCi.currentVersion, 1);

  // Now change BOL data
  const modifiedBol = {
    ...bolForFinalize,
    consignee_name: 'CHANGED BUYER CO LTD',
  };

  // Re-reading or getting package should NOT overwrite issued document data silently
  const rePkg = await getOrCreateShipmentDocumentPackage(modifiedBol);
  assert.equal(rePkg.documents.commercial_invoice.status, 'issued');
  assert.equal(rePkg.documents.commercial_invoice.sourceDataChanged, true);
  assert.equal(rePkg.documents.commercial_invoice.documentData.buyerName, SAMPLE_BOL.consignee_name);

  // Create explicit revision 2 with audit reason
  const revisedDoc = await createDocumentRevision(
    ciId,
    'Buyer company legally changed name',
    'Auditor',
    modifiedBol
  );
  assert.equal(revisedDoc.currentVersion, 2);
  assert.equal(revisedDoc.versions.length, 2);
  assert.equal(revisedDoc.versions[1].versionNumber, 1);
  assert.equal(revisedDoc.versions[1].status, 'issued');
  assert.equal(revisedDoc.documentData.buyerName, 'CHANGED BUYER CO LTD');
});

test('4. Historical BOL import without fake official numbers', async () => {
  const historicalBol = {
    bol_number: 'BOL-2025-HISTORICAL-99',
    shipper_name: 'HERAT RAISIN EXPORTERS',
    consignee_name: 'DELHI DRY FRUITS IMPORTER',
    number_of_packages: '800 CTNS',
    cargo_description: 'DRIED FIGS (انجیر خشک)',
  };

  const phyto = mapBolToPhytoDraft(historicalBol, 'PHY-DRAFT-099', 'CI-099');
  assert.equal(phyto.isOfficialCertificateConfirmed, false);
  assert.equal(Boolean(phyto.officialCertificateNumber), false, 'Must NOT generate fake official govt cert number');
  assert.match(phyto.statusNotes, /PENDING OFFICIAL/i);
  assert.match(phyto.commercialDescription, /FIGS/i);
});

test('5. Quantity & weight calculation with rate basis (PER_KG, PER_CARTON, LUMP_SUM)', () => {
  // Test PER_KG: netWeight * rate
  const valPerKg = calculateGoodsValue(15000, 2.5, 'PER_KG', 1000, 15000);
  assert.equal(valPerKg, 37500);

  // Test PER_CARTON: packages * rate
  const valPerCtn = calculateGoodsValue(1000, 35.0, 'PER_CARTON', 1000, 15000);
  assert.equal(valPerCtn, 35000);

  // Test PER_BAG: packages * rate
  const valPerBag = calculateGoodsValue(500, 45.0, 'PER_BAG', 500, 25000);
  assert.equal(valPerBag, 22500);

  // Test LUMP_SUM: rate
  const valLump = calculateGoodsValue(100, 18500, 'LUMP_SUM', 100, 2000);
  assert.equal(valLump, 18500);
});

test('6. Multi-commodity line items parsing from stacked cargo descriptions', () => {
  const multiBol = {
    bol_number: 'BOL-MULTI-01',
    cargo_description: '500 CTNS GREEN RAISINS | 400 CTNS BLACK RAISINS | 300 BAGS DRIED FIGS',
    number_of_packages: '1200 CTNS',
    net_weight: '18000 KG',
    gross_weight: '19200 KG',
    goods_value: '45000.00',
  };

  const items = deriveShipmentItemsFromBol(multiBol);
  assert.equal(items.length, 3, 'Should parse 3 distinct commodities');
  assert.match(items[0].commodityName, /GREEN RAISINS/i);
  assert.equal(items[0].packageCount, 500);
  assert.match(items[1].commodityName, /BLACK RAISINS/i);
  assert.equal(items[1].packageCount, 400);
  assert.match(items[2].commodityName, /DRIED FIGS/i);
  assert.equal(items[2].packageCount, 300);

  const totalPkgs = items.reduce((s, it) => s + it.packageCount, 0);
  assert.equal(totalPkgs, 1200);
});

test('7. Zero duplicate documents on repeated runs', async () => {
  const testBol = {
    bol_number: 'BOL-IDEMPOTENT-007',
    shipper_name: 'TEST EXPORTER',
    consignee_name: 'TEST IMPORTER',
  };

  // Run 1
  await getOrCreateShipmentDocumentPackage(testBol);
  const docsRun1 = await storage.getShipmentDocumentsByBol('BOL-IDEMPOTENT-007');
  assert.equal(docsRun1.length, 5);

  // Run 2 (repeated call)
  await getOrCreateShipmentDocumentPackage(testBol);
  const docsRun2 = await storage.getShipmentDocumentsByBol('BOL-IDEMPOTENT-007');
  assert.equal(docsRun2.length, 5, 'Must maintain exactly 5 documents, zero duplicates');

  // Run 3 via bulk create
  const bulkReport = await bulkCreateShipmentDocuments([testBol]);
  assert.equal(bulkReport.alreadyExistingCount, 1);
  const docsRun3 = await storage.getShipmentDocumentsByBol('BOL-IDEMPOTENT-007');
  assert.equal(docsRun3.length, 5, 'Bulk run must detect existing docs and prevent duplicates');
});

test('8. Combined PDF generation sequence compiles valid multi-page document', async () => {
  const pdfUtils = load('lib/utils/shipment-package-pdf.ts', {
    '@/lib/services/shipment-document-service': service,
  });

  const pkg = await getOrCreateShipmentDocumentPackage(SAMPLE_BOL);
  const pdfDoc = await pdfUtils.generateCompleteShipmentPdfPackage(pkg);
  assert.ok(pdfDoc, 'jsPDF instance must be generated');

  const pageCount = pdfDoc.getNumberOfPages();
  assert.ok(pageCount >= 4, `Should have at least 4 pages, got ${pageCount}`);

  const pdfOutput = pdfDoc.output();
  assert.equal(pdfOutput.slice(0, 5), '%PDF-', 'Header must be valid PDF format');
});

test('9. Unicode & Pashto/Dari text preservation across all documents', () => {
  const pashtoBol = {
    bol_number: 'BOL-PASHTO-09',
    shipper_name: 'شرکت تجارتی افغان آریا',
    consignee_name: 'د کابل تجارتی مرکز',
    driver_name: 'محمد ناصر',
    driver_father_name: 'عبدالرحیم خان / Abdul Rahim Khan',
    truck_number: 'کابل ۳۲۴۴۵',
    cargo_description: 'کشمش سبز و بادام قندهار',
    number_of_packages: '1000 کارتن',
    net_weight: '15000 کیلوگرام',
  };

  const tp = mapBolToTransitPaper(pashtoBol, 'TP-09', 'CI-09');
  assert.equal(tp.driverName, 'محمد ناصر');
  assert.equal(tp.driverFatherName, 'عبدالرحیم خان / Abdul Rahim Khan');
  assert.equal(tp.truckNumber, 'کابل ۳۲۴۴۵');
  assert.match(tp.commodityDescription, /کشمش سبز/);

  const ci = mapBolToCommercialInvoice(pashtoBol, 'CI-09');
  assert.equal(ci.exporterName, 'شرکت تجارتی افغان آریا');
  assert.equal(ci.buyerName, 'د کابل تجارتی مرکز');
});

test('10. Incomplete phyto does not block other ready documents', async () => {
  const minimalBol = {
    bol_number: 'BOL-MIN-10',
    shipper_name: 'ABC TRADERS',
    consignee_name: 'XYZ IMPORTS',
    number_of_packages: '500 CTNS',
    net_weight: '7500 KG',
    container_numbers: 'TGHU9928172',
    goods_value: '25000.00',
    cargo_description: 'GENERAL AGRICULTURAL MERCHANDISE',
    // Missing botanical names, treatment, packaging type
  };

  const ci = mapBolToCommercialInvoice(minimalBol, 'CI-10');
  const ciAudit = computeMissingFields('commercial_invoice', ci);
  assert.equal(ciAudit.status, 'ready');

  const pl = mapBolToPackingList(minimalBol, 'PL-10', 'CI-10');
  const plAudit = computeMissingFields('packing_list', pl);
  assert.equal(plAudit.status, 'ready');

  const phyto = mapBolToPhytoDraft(minimalBol, 'PHY-10', 'CI-10');
  const phytoAudit = computeMissingFields('phytosanitary', phyto);
  assert.ok(phytoAudit.missing.length > 0, 'Phyto should flag missing botanical details');
  assert.equal(phytoAudit.status, 'incomplete');

  // Cross document mismatch audit
  const issues = await checkDocumentIntegrity(minimalBol);
  assert.ok(Array.isArray(issues));
});

console.log('🏁 Shipment Document Package test definitions completed.');
