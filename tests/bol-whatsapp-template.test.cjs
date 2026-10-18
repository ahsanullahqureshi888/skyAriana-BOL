const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const load = require('./load-typescript.cjs')

test('BOL WhatsApp Shipment Update Formatter Test - Static & Runtime Verification', async (t) => {
  const rootDir = path.resolve(__dirname, '..')
  const formatterFile = path.join(rootDir, 'lib', 'utils', 'bol-whatsapp-formatter.ts')
  assert.ok(fs.existsSync(formatterFile))

  const content = fs.readFileSync(formatterFile, 'utf8')
  assert.ok(content.includes('SHIPMENT UPDATE / اطلاعیه حمل بار'))
  assert.ok(content.includes('📄 *B/L No. / شماره بارنامه:*'))
  assert.ok(content.includes('🧾 *Invoice No. / شماره فاکتور:*'))
  assert.ok(content.includes('🚚 *Truck No. / شماره موتر:*'))
  assert.ok(content.includes('🏢 *Shipper / فرستنده:*'))
  assert.ok(content.includes('🏢 *Consignee / گیرنده:*'))
  assert.ok(content.includes('🍇 *Commodity / نوع کالا:*'))
  assert.ok(content.includes('📦 *Packages / تعداد کارتن:*'))
  assert.ok(content.includes('⚖️ *Net Weight / وزن خالص:*'))
  assert.ok(content.includes('💵 *Unit Price / قیمت واحد:*'))
  assert.ok(content.includes('🛣️ *TRANSIT ROUTE / مسیر ترانزیت:*'))
  assert.ok(content.includes('🚛 *TRANSIT DETAILS / جزئیات ترانزیت:*'))
  assert.ok(content.includes('*حملونقل بینالمللی و خدمات لجستیکی*'))

  const { buildWhatsAppShipmentUpdate, formatTransitDetailsText } = load('lib/utils/bol-whatsapp-formatter.ts')

  // 1. Dougharoun border test (User's live scenario)
  const dougharounBol = {
    bol_number: 'BOL-DGH-01',
    cargo_route_note: '🗺️ از دوغارون با کانتینر معمولی تا بندرعباس، سپس با کانتینر یخچالی از بندرعباس، با سوییچ B/L در دبی / جبل علی، و مقصد نهایی: نهاوا شیوا (Nhava Sheva)',
    routes: [
      { stopOrder: 1, location: 'Kandahar' },
      { stopOrder: 2, location: 'Dougharoun' },
      { stopOrder: 3, location: 'Bandar Abbas' },
      { stopOrder: 4, location: 'Dubai' },
      { stopOrder: 5, location: 'Nhava Sheva' },
    ],
  }
  const dghDetails = formatTransitDetailsText(dougharounBol)
  assert.match(dghDetails.en, /Standard container from Dougharoun to Bandar Abbas/i)
  assert.match(dghDetails.fa, /حمل با کانتینر معمولی از دوغارون تا بندرعباس/i)
  assert.doesNotMatch(dghDetails.en, /Nimroz/i)
  assert.doesNotMatch(dghDetails.fa, /نیمروز/i)

  // 2. Nimroz border test
  const nimrozBol = {
    bol_number: 'BOL-NMZ-01',
    cargo_route_note: 'از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی',
    routes: [
      { stopOrder: 1, location: 'Kandahar' },
      { stopOrder: 2, location: 'Nimroz' },
      { stopOrder: 3, location: 'Bandar Abbas' },
    ],
  }
  const nmzDetails = formatTransitDetailsText(nimrozBol)
  assert.match(nmzDetails.en, /Standard container from Nimroz to Bandar Abbas/i)
  assert.match(nmzDetails.fa, /حمل با کانتینر معمولی از نیمروز تا بندرعباس/i)

  // 3. Islam Qala border test
  const islamQalaBol = {
    bol_number: 'BOL-ISQ-01',
    cargo_route_note: 'از اسلام قلعه با کانتینر معمولی تا بندرعباس',
    routes: [
      { stopOrder: 1, location: 'Herat' },
      { stopOrder: 2, location: 'Islam Qala' },
      { stopOrder: 3, location: 'Bandar Abbas' },
    ],
  }
  const isqDetails = formatTransitDetailsText(islamQalaBol)
  assert.match(isqDetails.en, /Standard container from Islam Qala to Bandar Abbas/i)
  assert.match(isqDetails.fa, /حمل با کانتینر معمولی از اسلام قلعه تا بندرعباس/i)
})
