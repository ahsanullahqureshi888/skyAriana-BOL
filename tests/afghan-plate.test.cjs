const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const {
  convertToPersianDigits,
  convertToLatinDigits,
  getProvinceInfo,
  getProvinceCode,
  normalizeProvinceName,
  parseAfghanPlate,
} = loadTypescript('lib/utils/afghan-plate.ts')

test('Afghan Plate: convertToPersianDigits converts digits accurately', () => {
  assert.equal(convertToPersianDigits('0123456789'), '۰۱۲۳۴۵۶۷۸۹')
  assert.equal(convertToPersianDigits('2877'), '۲۸۷۷')
  assert.equal(convertToPersianDigits('35974'), '۳۵۹۷۴')
  assert.equal(convertToPersianDigits('24345'), '۲۴۳۴۵')
})

test('Afghan Plate: convertToLatinDigits converts Persian & Arabic-Indic digits to Latin', () => {
  assert.equal(convertToLatinDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789')
  assert.equal(convertToLatinDigits('۲۸۷۷'), '2877')
  assert.equal(convertToLatinDigits('۳۵۹۷۴'), '35974')
  assert.equal(convertToLatinDigits('۲۴۳۴۵'), '24345')
})

test('Afghan Plate: strict number sequencing prevents digit reversal', () => {
  const num = '35974'
  const converted = convertToPersianDigits(num)
  assert.equal(converted, '۳۵۹۷۴')
  assert.notEqual(converted, '۴۷۹۵۳', 'Digits must never be reversed!')
})

test('Afghan Plate: getProvinceInfo accurately maps Dari/Pashto and English codes', () => {
  const kabul = getProvinceInfo('کابل')
  assert.equal(kabul.code, 'KBL')
  assert.equal(kabul.nameFa, 'کابل')

  const herat = getProvinceInfo('هرات')
  assert.equal(herat.code, 'HRT')

  const kandahar = getProvinceInfo('کندهار')
  assert.equal(kandahar.code, 'KDR')

  const balkh = getProvinceInfo('بلخ')
  assert.equal(balkh.code, 'BLK')

  const nangarhar = getProvinceInfo('ننگرهار')
  assert.equal(nangarhar.code, 'NGR')

  const nimroz = getProvinceInfo('نیمروز')
  assert.equal(nimroz.code, 'NRZ')

  assert.equal(getProvinceCode('هرات'), 'HRT')
  assert.equal(getProvinceCode('KBL'), 'KBL')

  assert.equal(normalizeProvinceName('kabul'), 'کابل')
  assert.equal(normalizeProvinceName('KBL'), 'کابل')
  assert.equal(normalizeProvinceName('herat'), 'هرات')
  assert.equal(normalizeProvinceName('qandahar'), 'کندهار')
})

test('Afghan Plate: parse target test values correctly', () => {
  // Test case 1: 2877 کابل
  const case1 = parseAfghanPlate('2877 کابل')
  assert.equal(case1.plateNumber, '2877')
  assert.equal(case1.plateNumberFa, '۲۸۷۷')
  assert.equal(case1.provinceFa, 'کابل')
  assert.equal(case1.provinceCode, 'KBL')
  assert.equal(case1.hasLetter, false)

  // Test case 2: 35974 کابل
  const case2 = parseAfghanPlate('35974 کابل')
  assert.equal(case2.plateNumber, '35974')
  assert.equal(case2.plateNumberFa, '۳۵۹۷۴')
  assert.equal(case2.provinceFa, 'کابل')
  assert.equal(case2.provinceCode, 'KBL')
  assert.equal(case2.hasLetter, false)

  // Test case 3: 24345 کابل
  const case3 = parseAfghanPlate('24345 کابل')
  assert.equal(case3.plateNumber, '24345')
  assert.equal(case3.plateNumberFa, '۲۴۳۴۵')
  assert.equal(case3.provinceFa, 'کابل')
  assert.equal(case3.provinceCode, 'KBL')

  // Test case 4: 24345 کابل ل (with letter)
  const case4 = parseAfghanPlate('24345 کابل ل')
  assert.equal(case4.plateNumber, '24345')
  assert.equal(case4.plateNumberFa, '۲۴۳۴۵')
  assert.equal(case4.provinceFa, 'کابل')
  assert.equal(case4.provinceCode, 'KBL')
  assert.equal(case4.hasLetter, true)
  assert.equal(case4.plateLetterFa, 'ل')
  assert.equal(case4.plateLetterEn, 'L')

  // Test case 5: 38663-HRT
  const case5 = parseAfghanPlate('38663-HRT')
  assert.equal(case5.plateNumber, '38663')
  assert.equal(case5.provinceCode, 'HRT')
  assert.equal(case5.provinceFa, 'هرات')

  // Test case 6: AF-1234-KBL
  const case6 = parseAfghanPlate('AF-1234-KBL')
  assert.equal(case6.plateNumber, '1234')
  assert.equal(case6.provinceCode, 'KBL')
  assert.equal(case6.provinceFa, 'کابل')

  // Test case 7: 71731کابل (no spaces)
  const case7 = parseAfghanPlate('71731کابل')
  assert.equal(case7.plateNumber, '71731')
  assert.equal(case7.provinceCode, 'KBL')

  // Test case 8: هرات 21723 (province first)
  const case8 = parseAfghanPlate('هرات 21723')
  assert.equal(case8.plateNumber, '21723')
  assert.equal(case8.provinceCode, 'HRT')
})
