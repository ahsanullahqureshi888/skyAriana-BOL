const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const {
  buildWhatsAppBOLMessage,
  buildWhatsAppShipmentUpdate,
  buildWhatsAppBilingualMessage,
  buildWhatsAppQuickMessage,
  formatPartyForWhatsApp,
} = load('lib/utils/bol-whatsapp-formatter.ts');

test('full BOL uses live fields, route order, currency, Unicode and line breaks', () => {
  const bol = {
    bol_number: 'BOL-TEST-9', issue_date: '2026-09-18', truck_number: '41389',
    driver_name: 'احمد', driver_contact: '+93 700 123 456', driver_rent: '48,000', driver_rent_currency: 'AFN',
    shipper_name: 'RAHMAT NAZAR LTD', shipper_address: 'Kandahar, Afghanistan',
    consignee_name: 'شرکت گیرنده', consignee_address: 'A long address\nSecond line', consignee_contact: '+91 44 1234',
    notify_party: 'اطلاع گیرنده', cargo_description: 'Black Raisins', number_of_packages: '1,400', package_type: 'CTNS',
    kgs_per_carton: '16.5', net_weight: '22,400.5', gross_weight: '23,000', rate_per_kgs: '2.20 USD',
    container_size: '40', container_type: 'RF', container_numbers: 'MSCU1234567', seal_numbers: 'S-7',
    vessel_name: 'MERYAN 7', routes: [
      { stopOrder: 2, location: 'Islam Qala' }, { stopOrder: 1, location: 'Kandahar' }, { stopOrder: 3, location: 'Bandar Abbas' },
    ],
  };
  const message = buildWhatsAppBOLMessage(bol);
  assert.match(message, /\*BOL No:\* BOL-TEST-9\n\*Issue Date:\* 2026-09-18/);
  assert.match(message, /\*Driver:\* احمد/);
  assert.match(message, /\*Driver Phone:\* \+93 700 123 456/);
  assert.match(message, /\*Driver Rent:\* 48,000 AFN/);
  assert.match(message, /\*Net Weight:\* 22,400\.5 KG/);
  assert.match(message, /\*Container Type:\* 40 RF/);
  assert.match(message, /Kandahar ➜ Islam Qala ➜ Bandar Abbas/);
  assert.match(message, /\*Vessel:\* MERYAN 7/);
  assert.match(message, /شرکت گیرنده\nA long address\nSecond line/);
});

test('partial and dry-container BOL omits empty fields and sections', () => {
  const message = buildWhatsAppBOLMessage({ bol_number: 'BOL-PARTIAL', container_type: 'Dry', vessel_name: '',
    voyage_number: 'N/A', notify_party: null, net_weight: 'NaN', routes: [],
  });
  assert.match(message, /\*Container Type:\* Dry/);
  assert.doesNotMatch(message, /NOTIFY PARTY|SHIPPING DETAILS|undefined|null|N\/A|NaN|\[object Object\]/i);
});

test('object parties retain identifiers and do not stringify objects', () => {
  const lines = formatPartyForWhatsApp({ name: 'Test Ltd', address: 'Herat', gst: 'GST-1', phone: '+93 123', email: 'test@example.com' });
  assert.deepEqual(lines, ['Test Ltd', 'Herat', '*GST:* GST-1', '*Phone:* +93 123', '*Email:* test@example.com']);
});

test('empty BOL does not produce a brand-only message', () => {
  assert.equal(buildWhatsAppBOLMessage({ routes: [] }), '');
  assert.equal(buildWhatsAppShipmentUpdate({ routes: [] }), '');
});

test('cargo template metadata is removed while real cargo and route dates remain', () => {
  const bol = {
    bol_number: 'BOL-QA', cargo_description: '📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\n🥬 Cargo: Black Raisins | 📅 Transit Date: 2026-09-19 | 📄 HS CODE: 0806',
    net_weight: '22400.5', container_size: '40', container_type: 'RF',
    routes: [
      { stopOrder: 2, location: 'Bandar Abbas', arrivalDate: '2026-09-21' },
      { stopOrder: 1, location: 'Kandahar', departureDate: '2026-09-18' },
    ],
  };
  const full = buildWhatsAppBOLMessage(bol);
  const short = buildWhatsAppShipmentUpdate(bol);
  assert.match(full, /\*Commodity:\* Black Raisins/);
  assert.match(full, /\*ETD:\* 2026-09-18/);
  assert.match(full, /\*ETA:\* 2026-09-21/);
  assert.doesNotMatch(full, /HS CODE|CONTAINER & CARGO DETAILS|Transit Date/);
  assert.match(short, /SHIPMENT UPDATE/);
  assert.match(short, /Black Raisins/i);
  assert.match(short, /22,400\.5 KG/);
});

test('BOL-2026-NSA588 user scenario: formats glued truck plate, extracts commodity from packages and normalizes typo', () => {
  const bol = {
    bol_number: 'BOL-2026-NSA588',
    truck_number: '26253کابل',
    number_of_packages: '1476 -CTNS GOLDEN RAISNIS (MED)',
    net_weight: '23,616',
    routes: [
      { stopOrder: 1, location: 'Kandahar' },
      { stopOrder: 2, location: 'Dougharoun, IR' },
      { stopOrder: 3, location: 'Bandar Abbas, IR' },
      { stopOrder: 4, location: 'Dubai, AE' },
      { stopOrder: 5, location: 'Nhava Sheva, IN' },
    ],
  };
  const short = buildWhatsAppShipmentUpdate(bol);
  assert.match(short, /BOL-2026-NSA588/);
  assert.match(short, /26253 کابل/);
  assert.match(short, /GOLDEN RAISINS/);
  assert.match(short, /1,476 CTNS/);
  assert.match(short, /23,616 KG/);
  assert.match(short, /Dougharoun.*Bandar Abbas.*Dubai.*Nhava Sheva/);
  assert.match(short, /Standard container from Dougharoun to Bandar Abbas/);
  assert.match(short, /حمل با کانتینر معمولی از دوغارون تا بندرعباس/);
  assert.doesNotMatch(short, /Nimroz/);
  assert.doesNotMatch(short, /نیمروز/);
});

test('Bilingual and Quick message builders format correctly for BOL-2026-NSA588', () => {
  const bol = {
    bol_number: 'BOL-2026-NSA588',
    truck_number: '26253کابل',
    number_of_packages: '1476 -CTNS GOLDEN RAISNIS (MED)',
    net_weight: '23,616',
    routes: [
      { stopOrder: 1, location: 'Kandahar' },
      { stopOrder: 2, location: 'Dougharoun, IR' },
      { stopOrder: 3, location: 'Bandar Abbas, IR' },
      { stopOrder: 4, location: 'Dubai, AE' },
      { stopOrder: 5, location: 'Nhava Sheva, IN' },
    ],
  };
  const bilingual = buildWhatsAppBilingualMessage(bol);
  assert.match(bilingual, /اطلاعیه باربری \/ SHIPMENT UPDATE/);
  assert.match(bilingual, /BOL \/ نمبر بارنامه:\* BOL-2026-NSA588/);
  assert.match(bilingual, /Truck \/ موټر نمبر:\* 26253 کابل/);
  assert.match(bilingual, /Commodity \/ جنس:\* GOLDEN RAISINS \(MED\)/);
  assert.match(bilingual, /Packages \/ تعداد کارتن:\* 1,476 CTNS/);
  assert.match(bilingual, /Net Weight \/ خالص وزن:\* 23,616 KG/);

  const quick = buildWhatsAppQuickMessage(bol);
  assert.match(quick, /SKY ARIANA DISPATCH/);
  assert.match(quick, /• \*BOL:\* BOL-2026-NSA588/);
  assert.match(quick, /• \*Truck:\* 26253 کابل/);
  assert.match(quick, /• \*Cargo:\* GOLDEN RAISINS \(MED\) — 1,476 CTNS/);
  assert.match(quick, /• \*Weight:\* 23,616 KG/);
});

test('BOL-2026-NSA597: shipment update includes transit details and route note correctly', () => {
  const bolWithRouteNote = {
    bol_number: 'BOL-2026-NSA597',
    truck_number: '49872 کابل',
    cargo_description: 'DRY FIGS 2506 CTNS 10KGS @ 3.00 $',
    number_of_packages: '2,506 CTNS',
    net_weight: '25,060',
    cargo_route_note: 'ازدوغارون کانتینر یخچالی ازبندرعباس کانتینر یخچالی',
    routes: [
      { stopOrder: 1, location: 'Kandahar' },
      { stopOrder: 2, location: 'Dougharoun, IR' },
      { stopOrder: 3, location: 'Bandar Lenguh, IR' },
      { stopOrder: 4, location: 'Al Hamriya Port , Dubai, AE' },
    ],
  };

  const update = buildWhatsAppShipmentUpdate(bolWithRouteNote);
  assert.match(update, /SHIPMENT UPDATE/);
  assert.match(update, /BOL-2026-NSA597/);
  assert.match(update, /49872 کابل/);
  assert.match(update, /2,506 CTNS/);
  assert.match(update, /Dougharoun[\s\S]*Bandar Lenguh[\s\S]*Al Hamriya Port/);
  assert.match(update, /Dougharoun/);
  assert.match(update, /دوغارون/);
  assert.doesNotMatch(update, /Nimroz/);
  assert.doesNotMatch(update, /نیمروز/);
});

