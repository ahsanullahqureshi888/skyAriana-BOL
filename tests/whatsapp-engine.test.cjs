const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

// Load WhatsApp modules
const { normalizeToWhatsAppShipment } = load('lib/whatsapp/normalized-shipment.ts');
const { LABELS, ltrIsolate, getStatusNarrative } = load('lib/whatsapp/translations.ts');
const { normalizePhoneNumber, buildWhatsAppDeepLink, getAvailableRecipients } = load('lib/whatsapp/phone-normalizer.ts');
const { sanitizeShipmentForCustomer, isMessageCustomerSafe } = load('lib/whatsapp/message-safety.ts');
const { renderTemplate, getTemplateForStatus } = load('lib/whatsapp/template-engine.ts');
const { buildWhatsAppMessage } = load('lib/whatsapp/message-builder.ts');
const { generateDailyStatusMessage, buildManagementSummary, buildDailyInternalOperationsGroup } = load('lib/whatsapp/bulk-message.ts');

test('1. Normalized shipment: extracts from BOL and Tracking cleanly', () => {
  const sampleBol = {
    bol_number: 'BOL-KBL-2026-001',
    issue_date: '2026-09-20',
    shipper_name: 'AFGHAN DRY FRUITS TRADING',
    shipper_contact: '+93 700 112 233',
    consignee_name: 'MUMBAI SPICES PVT LTD',
    consignee_contact: '+91 98200 12345',
    truck_number: '42231 Herat',
    driver_name: 'Gholam Sakhi',
    driver_contact: '0799 445566',
    driver_rent: '45,000',
    driver_rent_currency: 'AFN',
    cargo_description: '📦 CONTAINER & CARGO DETAILS\n🥬 Cargo: GREEN RAISINS GRADE A\n📄 HS: 0806.20',
    number_of_packages: '1,400 CTNS',
    net_weight: '22,400.00',
    gross_weight: '23,100.00',
    container_numbers: 'MSCU-9876543',
    seal_numbers: 'SL-88412',
    port_of_loading: 'Bandar Abbas',
    place_of_delivery: 'Nhava Sheva',
    origin_country: 'Afghanistan',
    destination_country: 'India',
  };

  const norm = normalizeToWhatsAppShipment(sampleBol);
  assert.equal(norm.bolNumber, 'BOL-KBL-2026-001');
  assert.equal(norm.shipper.name, 'AFGHAN DRY FRUITS TRADING');
  assert.equal(norm.consignee.name, 'MUMBAI SPICES PVT LTD');
  assert.equal(norm.containerNumber, 'MSCU-9876543');
  assert.equal(norm.sealNumber, 'SL-88412');
  assert.equal(norm.truckNumber, '42231 Herat');
  assert.equal(norm.driver?.name, 'Gholam Sakhi');
  assert.equal(norm.packagesCount, 1400);
  assert.equal(norm.packagesType, 'CTNS');
  assert.equal(norm.commodity, 'GREEN RAISINS GRADE A');
  assert.equal(norm.origin, 'Afghanistan');
  assert.equal(norm.destination, 'Nhava Sheva');
});

test('2. Normalized shipment: handles empty/partial data without null/undefined leaks', () => {
  const partial = {
    bol_number: 'BOL-EMPTY',
    driver_name: 'null',
    cargo_description: undefined,
    net_weight: 'NaN',
  };
  const norm = normalizeToWhatsAppShipment(partial);
  assert.equal(norm.bolNumber, 'BOL-EMPTY');
  assert.equal(norm.driver?.name, undefined);
  assert.equal(norm.commodity, 'General Cargo');
});

test('3. Phone normalizer: formats regional numbers correctly for wa.me links', () => {
  // Afghan numbers -> 93700123456
  assert.equal(normalizePhoneNumber('0700123456'), '93700123456');
  assert.equal(normalizePhoneNumber('+93 70 012 3456'), '93700123456');
  // Iranian numbers -> 989121234567
  assert.equal(normalizePhoneNumber('09121234567'), '989121234567');
  // UAE numbers -> 971501234567
  assert.equal(normalizePhoneNumber('0501234567'), '971501234567');
  // Pakistan numbers -> 923001234567
  assert.equal(normalizePhoneNumber('03001234567'), '923001234567');
  // India numbers -> 919820012345
  assert.equal(normalizePhoneNumber('09820012345'), '919820012345');
});

test('4. WhatsApp deep link builder: generates valid URL with encoded text', () => {
  const link = buildWhatsAppDeepLink('93700123456', 'Hello Sky Ariana');
  assert.equal(link, 'https://wa.me/93700123456?text=Hello%20Sky%20Ariana');

  const emptyPhoneLink = buildWhatsAppDeepLink('', 'Hello');
  assert.equal(emptyPhoneLink, 'https://api.whatsapp.com/send?text=Hello');
});

test('5. Recipient selector: extracts valid recipients without duplicates', () => {
  const shipment = {
    id: 's1',
    bolNumber: 'BOL-1',
    shipper: { name: 'Shipper Co', phone: '0700111222' },
    consignee: { name: 'Consignee Co', phone: '09820099999' },
    driver: { name: 'Ahmad', phone: '0799333444' },
    commodity: 'Goods',
    currentLocation: 'Islam Qala',
    origin: 'Kabul',
    destination: 'Mumbai',
    statusCode: 'in_transit',
    statusDisplay: 'In Transit',
    lastUpdated: new Date().toISOString(),
  };

  const recipients = getAvailableRecipients(shipment);
  assert.equal(recipients.length, 3);
  assert.equal(recipients[0].type, 'consignee');
  assert.equal(recipients[0].normalizedPhone, '919820099999');
  assert.equal(recipients[1].type, 'shipper');
  assert.equal(recipients[1].normalizedPhone, '93700111222');
  assert.equal(recipients[2].type, 'driver');
  assert.equal(recipients[2].normalizedPhone, '93799333444');
});

test('6. Multilingual translations & RTL isolation: isolates identifiers', () => {
  assert.equal(LABELS.en.bol, 'BOL');
  assert.equal(LABELS.fa.bol, 'بارنامه');
  assert.equal(LABELS.ps.bol, 'بارنامه');

  const isolated = ltrIsolate('BOL-2026-001');
  assert.equal(isolated, '\u200EBOL-2026-001\u200E');

  const narrativeFa = getStatusNarrative('at_border', 'fa', 'اسلام قلعه');
  assert.match(narrativeFa, /اسلام قلعه/);
  assert.match(narrativeFa, /تشریفات گمرکی/);
});

test('7. Customer Safe Mode: strips sensitive financials and audits restricted terms', () => {
  const safeShipment = sanitizeShipmentForCustomer({
    id: 's1',
    bolNumber: 'BOL-100',
    shipper: { name: 'Safe Shipper' },
    consignee: { name: 'Safe Consignee' },
    driverRent: 50000,
    driverRentCurrency: 'AFN',
    internalNotes: 'Customer disputed demurrage rates',
    driver: {
      name: 'Ali Driver',
      phone: '0700999888',
      rent: 50000,
      rentCurrency: 'AFN',
    },
    commodity: 'Raisins',
    currentLocation: 'Herat',
    origin: 'Herat',
    destination: 'Dubai',
    statusCode: 'in_transit',
    statusDisplay: 'In Transit',
    lastUpdated: new Date().toISOString(),
  });

  assert.equal(safeShipment.driverRent, undefined);
  assert.equal(safeShipment.driverRentCurrency, undefined);
  assert.equal(safeShipment.internalNotes, undefined);
  assert.equal(safeShipment.driver?.phone, undefined);
  assert.equal(safeShipment.driver?.rent, undefined);

  // Safety audit
  const unsafeText = 'Our freight margin is $500 and driver rent is 45000 AFN. Net balance is $2000.';
  const unsafeAudit = isMessageCustomerSafe(unsafeText);
  assert.equal(unsafeAudit.safe, false);
  assert.ok(unsafeAudit.matchedReason);

  const safeText = '*SKY ARIANA LIMITED*\nBOL: BOL-100\nStatus: In Transit\nLocation: Herat';
  const cleanAudit = isMessageCustomerSafe(safeText);
  assert.equal(cleanAudit.safe, true);
});

test('8. Safe template engine: variables and no nextLocation hallucination', () => {
  const shipment = {
    id: 's1',
    bolNumber: 'BOL-KBL-88',
    containerNumber: 'CRXU-1234567',
    truckNumber: '51201 Herat',
    commodity: 'Fresh Apples',
    currentLocation: 'Torghundi Border',
    origin: 'Kabul',
    destination: 'Turkmenistan',
    statusCode: 'at_border',
    statusDisplay: 'At Border',
    lastUpdated: '2026-09-20T10:00:00Z',
    shipper: { name: 'Fresh Fruits Ltd' },
    consignee: { name: 'Ashgabat Trade' },
  };

  const template = 'BOL: {{bolNumber}} | Cargo: {{commodity}} | Location: {{currentLocation}} | Truck: {{truckNumber}}';
  const rendered = renderTemplate(template, shipment, 'en');
  assert.equal(rendered, 'BOL: BOL-KBL-88 | Cargo: Fresh Apples | Location: Torghundi Border | Truck: 51201 Herat');

  // Verify missing next location does not hallucinate
  const tplObj = getTemplateForStatus('border_crossed');
  assert.ok(tplObj);
  const crossedRendered = renderTemplate(tplObj.templateText, shipment, 'en');
  assert.doesNotMatch(crossedRendered, /moving towards undefined|moving towards null/i);
});

test('9. Message Builder: Professional, Short, and Bilingual modes', () => {
  const shipment = {
    id: 's1',
    bolNumber: 'BOL-2026-999',
    containerNumber: 'MSCU-1122334',
    sealNumber: 'SL-999',
    truckNumber: '3312 Kabul',
    commodity: 'Almonds',
    packagesCount: 800,
    packagesType: 'BAGS',
    packagesFormatted: '800 BAGS',
    grossWeightKg: 16000,
    netWeightKg: 15800,
    currentLocation: 'Islam Qala Border',
    origin: 'Kabul, Afghanistan',
    destination: 'Chabahar, Iran',
    statusCode: 'at_border',
    statusDisplay: 'At Border',
    lastUpdated: '2026-09-20T12:00:00Z',
    shipper: { name: 'Kabul Nuts Co' },
    consignee: { name: 'Tehran Import' },
  };

  // Professional Customer Update (EN)
  const fullEn = buildWhatsAppMessage(shipment, {
    messageType: 'customer_update',
    language: 'en',
    settings: {
      includeHeaderBrand: true,
      includeFooterBrand: true,
      includeSafetyDisclaimers: true,
    },
    isCustomerSafe: true,
  });
  assert.match(fullEn, /\*SKY ARIANA LIMITED\*/);
  assert.match(fullEn, /\*BOL:\* \u200EBOL-2026-999\u200E/);
  assert.match(fullEn, /\*Container:\* \u200EMSCU-1122334\u200E/);
  assert.match(fullEn, /Islam Qala Border/);
  assert.doesNotMatch(fullEn, /driver rent|margin|cost|profit/i);

  // Short Mode
  const shortMsg = buildWhatsAppMessage(shipment, {
    messageType: 'short',
    language: 'en',
    settings: { includeHeaderBrand: true, includeFooterBrand: false },
  });
  assert.match(shortMsg, /Islam Qala Border/);
  assert.match(shortMsg, /Almonds/);

  // Operations 1-line Short
  const opsShort = buildWhatsAppMessage(shipment, {
    messageType: 'ops_short',
    language: 'en',
  });
  assert.match(opsShort, /^BOL-2026-999 \| MSCU-1122334 \| Islam Qala Border/);

  // Bilingual (EN + FA)
  const bilingual = buildWhatsAppMessage(shipment, {
    messageType: 'bilingual',
    language: 'en_fa',
    settings: { includeHeaderBrand: true, includeFooterBrand: true },
  });
  assert.match(bilingual, /----------------------------------------/);
  assert.match(bilingual, /بارنامه/);
  assert.match(bilingual, /BOL/);
});

test('10. Bulk and Daily Status Generator: group, filter, and message splitting', () => {
  const shipments = [
    {
      id: '1',
      bolNumber: 'BOL-001',
      containerNumber: 'C-1',
      commodity: 'Raisins',
      currentLocation: 'Islam Qala Border',
      origin: 'Kabul',
      destination: 'Mumbai',
      statusCode: 'at_border',
      statusDisplay: 'At Border',
      lastUpdated: '2026-09-20',
      shipper: { name: 'Shipper A' },
      consignee: { name: 'Consignee X' },
    },
    {
      id: '2',
      bolNumber: 'BOL-002',
      containerNumber: 'C-2',
      commodity: 'Figs',
      currentLocation: 'Bandar Abbas Port',
      origin: 'Kandahar',
      destination: 'Nhava Sheva',
      statusCode: 'at_port',
      statusDisplay: 'At Port',
      lastUpdated: '2026-09-20',
      shipper: { name: 'Shipper B' },
      consignee: { name: 'Consignee Y' },
    },
    {
      id: '3',
      bolNumber: 'BOL-003',
      containerNumber: 'C-3',
      commodity: 'Saffron',
      currentLocation: 'In Transit Sea',
      origin: 'Herat',
      destination: 'Dubai',
      statusCode: 'vessel_departed',
      statusDisplay: 'Vessel Departed',
      lastUpdated: '2026-09-20',
      shipper: { name: 'Shipper A' },
      consignee: { name: 'Consignee Z' },
    },
  ];

  // Daily Operations Status (Group by Location)
  const dailyStatusResult = generateDailyStatusMessage(shipments, {
    grouping: 'location',
    format: 'compact',
    language: 'en',
  });
  assert.match(dailyStatusResult.fullMessage, /\*ISLAM QALA BORDER — 1 Shipments\*/);
  assert.match(dailyStatusResult.fullMessage, /\*BANDAR ABBAS PORT — 1 Shipments\*/);
  assert.match(dailyStatusResult.fullMessage, /Total Active Shipments:\* 3/);

  // Daily Internal Operations Group preset (Requirement 40)
  const internalOps = buildDailyInternalOperationsGroup(shipments);
  assert.match(internalOps, /\*SKY ARIANA OPERATIONS/);
  assert.match(internalOps, /\*AT BORDER\*/);

  // Management Summary (Requirement 41 & 68)
  const mgmtSummary = buildManagementSummary(shipments);
  assert.match(mgmtSummary, /\*SKY ARIANA OPERATIONS\*/);
  assert.match(mgmtSummary, /\*Active Shipments:\* 3/);
  assert.match(mgmtSummary, /\*At Border:\* 1/);
  assert.match(mgmtSummary, /\*At Port:\* 1/);
  assert.match(mgmtSummary, /\*Vessel Departed:\* 1/);

  // Splitting Engine
  // Generate 40 shipments with maxCharactersPerMessage set to 1500
  const manyShipments = Array.from({ length: 40 }).map((_, i) => ({
    id: `id-${i}`,
    bolNumber: `BOL-LONG-TEST-${i}`,
    containerNumber: `MSCU-123456-${i}`,
    commodity: `Bulk Cargo Consignment ${i}`,
    currentLocation: `Transit Terminal ${i}`,
    origin: 'Kabul, Afghanistan',
    destination: 'Nhava Sheva Port, India',
    statusCode: 'in_transit',
    statusDisplay: 'In Transit',
    lastUpdated: '2026-09-20',
    shipper: { name: `Shipper Entity ${i}` },
    consignee: { name: `Consignee Partner ${i}` },
  }));

  const splitResult = generateDailyStatusMessage(manyShipments, {
    grouping: 'location',
    format: 'detailed',
    language: 'en',
    maxCharactersPerMessage: 1500,
  });

  assert.equal(splitResult.isSplitNeeded, true);
  assert.ok(splitResult.totalParts > 1, 'Should split into multiple parts when exceeding limit');
  assert.equal(splitResult.parts.length, splitResult.totalParts);
  assert.match(splitResult.parts[0].text, /Part 1 of/);
  assert.match(splitResult.parts[1].text, /Part 2 of/);
});
