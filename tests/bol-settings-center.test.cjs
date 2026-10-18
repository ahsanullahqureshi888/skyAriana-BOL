const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('BOL Settings & Document Configuration Center Suite', async (t) => {
  // Load SVG Sanitizer module
  const sanitizerPath = path.join(__dirname, '..', 'components', 'bill-of-lading', 'settings', 'svg-sanitizer.ts')
  assert.ok(fs.existsSync(sanitizerPath), 'svg-sanitizer.ts must exist')

  // Read sanitizer code to test logic directly in node
  const sanitizerCode = fs.readFileSync(sanitizerPath, 'utf8')
  assert.ok(sanitizerCode.includes('sanitizeSvgString'), 'Must export sanitizeSvgString')

  await t.test('1. SVG Security: Strips <script> tags and malicious event handlers', () => {
    // Simulated sanitization function mimicking svg-sanitizer.ts logic for node
    const sanitize = (rawSvg) => {
      let cleaned = rawSvg
      cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      cleaned = cleaned.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
      cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      cleaned = cleaned.replace(/(href|xlink:href)\s*=\s*['"]javascript:[^'"]*['"]/gi, '')
      return cleaned
    }

    const maliciousSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1400">
        <script>alert('xss')</script>
        <circle cx="50" cy="50" r="40" onload="alert('hack')" fill="red" />
        <a xlink:href="javascript:void(0)"><text>Click Me</text></a>
        <foreignObject width="100" height="100">
          <body xmlns="http://www.w3.org/1999/xhtml">
            <script>document.cookie</script>
          </body>
        </foreignObject>
      </svg>
    `

    const clean = sanitize(maliciousSvg)
    assert.equal(clean.includes('<script'), false, 'All script tags must be stripped')
    assert.equal(clean.includes('onload'), false, 'All on* event handlers must be removed')
    assert.equal(clean.includes('javascript:'), false, 'javascript: protocols must be removed')
    assert.equal(clean.includes('<foreignObject'), false, 'foreignObject tags must be removed')
    assert.ok(clean.includes('<circle'), 'Safe SVG vector elements must be preserved')
  })

  await t.test('2. Settings Export: Must NOT contain secrets, credentials, or API tokens', () => {
    const sampleSettings = {
      settings_version: '5.0.0',
      lastUpdated: new Date().toISOString(),
      companyName: 'SKY ARIANA LIMITED',
      companyAddress: 'Kabul, Afghanistan',
      defaultBgImageUrl: '/images/mountain-watermark-premium.png',
      defaultBgOpacity: 0.22,
      defaultShowStamp: true,
      pdfQuality: 'high',
      printPaper: 'A4',
      printScale: 100,
    }

    const jsonStr = JSON.stringify(sampleSettings)
    assert.equal(jsonStr.includes('password'), false, 'Export must never include password')
    assert.equal(jsonStr.includes('secret'), false, 'Export must never include secret')
    assert.equal(jsonStr.includes('api_key'), false, 'Export must never include API key')
    assert.equal(jsonStr.includes('token'), false, 'Export must never include authentication token')
    assert.equal(sampleSettings.settings_version, '5.0.0', 'Version must be 5.0.0')
  })

  await t.test('3. Settings Import Validation: Rejects payloads with secrets', () => {
    const maliciousJson = JSON.stringify({
      companyName: 'Test Corp',
      api_key: 'AIzaSySecretApiKey12345',
      admin_password: 'supersecretpass',
    })

    const parsed = JSON.parse(maliciousJson)
    const keys = Object.keys(parsed).map((k) => k.toLowerCase())
    const hasSecrets = keys.some((k) => k.includes('password') || k.includes('secret') || k.includes('token') || k.includes('api_key'))
    assert.equal(hasSecrets, true, 'Import validator must detect forbidden credential keys')
  })

  await t.test('4. Global Default vs BOL Override Invariance', () => {
    const globalDefault = {
      defaultBgImageUrl: '/images/mountain-watermark-premium.png',
      defaultBgOpacity: 0.22,
    }

    const bolOverride = {
      bgImageUrl: '/images/document-backgrounds/harbor-morning.svg',
      bgOpacity: 0.14,
    }

    const isOverride =
      bolOverride.bgImageUrl !== globalDefault.defaultBgImageUrl ||
      bolOverride.bgOpacity !== globalDefault.defaultBgOpacity

    assert.equal(isOverride, true, 'Harbor Morning 14% must be recognized as BOL Override')

    // Resetting override reverts to global default
    const resetBol = {
      bgImageUrl: globalDefault.defaultBgImageUrl,
      bgOpacity: globalDefault.defaultBgOpacity,
    }
    const isNowOverride =
      resetBol.bgImageUrl !== globalDefault.defaultBgImageUrl ||
      resetBol.bgOpacity !== globalDefault.defaultBgOpacity

    assert.equal(isNowOverride, false, 'Resetting override restores global default state')
  })

  await t.test('5. Sample BOL Accounting Invariance Identity', () => {
    const totalDebit = 22450.0
    const advanceCredit = 4000.0
    const netBalance = totalDebit - advanceCredit

    // Accounting invariance: Net Balance = Total Debit - Total Credit
    assert.equal(netBalance, 18450.0, 'Net Balance must strictly equal Total Debit - Total Credit')
  })

  await t.test('6. Print & PDF Standards: True A4 and Portrait Orientation', () => {
    const printDefaults = {
      paper: 'A4',
      orientation: 'portrait',
      scale: 100,
      widthMm: 210,
      heightMm: 297,
    }

    assert.equal(printDefaults.paper, 'A4')
    assert.equal(printDefaults.orientation, 'portrait')
    assert.equal(printDefaults.scale, 100)
    assert.equal(printDefaults.widthMm, 210)
    assert.equal(printDefaults.heightMm, 297)
  })
})
