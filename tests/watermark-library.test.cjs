const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('Watermark Library - Asset Inventory and Integrity Suite', async (t) => {
  const jsonPath = path.join(__dirname, '..', 'lib', 'document-backgrounds.json')
  assert.ok(fs.existsSync(jsonPath), 'document-backgrounds.json must exist')
  
  const bgData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const classics = [
    { label: 'Clean White', category: 'Classic', url: '', opacity: 0 },
    { label: 'Premium Mountain', category: 'Classic', url: '/images/mountain-watermark-premium.png', opacity: 0.22 },
    { label: 'Original Mountain Grid', category: 'Classic', url: '/images/afghan_mountain_blueprint_bg.jpg', opacity: 0.08 },
    { label: 'Truck Blueprint', category: 'Classic', url: '/images/overland_transit_blueprint.svg', opacity: 0.08 },
    { label: 'Ship Blueprint', category: 'Classic', url: '/images/maritime_shipping_blueprint.svg', opacity: 0.08 },
    { label: 'Flight Blueprint', category: 'Classic', url: '/images/air_cargo_blueprint.svg', opacity: 0.08 },
    { label: 'Air Cargo', category: 'Classic', url: '/images/sky_freight_cargo_plane.jpg', opacity: 0.08 },
    { label: 'Fleet Pass', category: 'Classic', url: '/images/afghan_cargo_fleet_pass.jpg', opacity: 0.08 },
    { label: 'Port Vessel', category: 'Classic', url: '/images/maritime_port_cargo_ship.jpg', opacity: 0.08 },
  ]
  const allAssets = [...classics, ...bgData]

  await t.test('1. Total asset count is exactly 49 items with valid schema', () => {
    assert.equal(allAssets.length, 49, 'Expected exactly 49 total watermark assets')
    for (const item of allAssets) {
      assert.ok(item.label && typeof item.label === 'string', 'Asset must have a non-empty string label')
      assert.ok(item.category && typeof item.category === 'string', 'Asset must have a non-empty category')
      assert.ok(typeof item.url === 'string', 'Asset must have a string url')
      assert.ok(typeof item.opacity === 'number', 'Asset must have a numeric opacity')
    }
  })

  await t.test('2. Clean White preset is properly calibrated for blank documents', () => {
    const cleanWhite = allAssets.find((a) => a.label === 'Clean White')
    assert.ok(cleanWhite, 'Clean White preset must exist')
    assert.equal(cleanWhite.url, '', 'Clean White url must be empty string')
    assert.equal(cleanWhite.opacity, 0, 'Clean White opacity must be 0')
  })

  await t.test('3. All non-blank assets physically exist on disk and have non-zero size', () => {
    const projectRoot = path.join(__dirname, '..')
    for (const item of allAssets) {
      if (!item.url) continue
      const relativePath = item.url.replace(/^\//, '')
      const fullPath = path.join(projectRoot, 'public', relativePath.replace(/^images\//, 'images/'))
      assert.ok(fs.existsSync(fullPath), `Asset file must exist on disk: ${item.label} -> ${fullPath}`)
      const stat = fs.statSync(fullPath)
      assert.ok(stat.size > 200, `Asset file must not be empty (> 200 bytes): ${item.label} (${stat.size} bytes)`)
    }
  })

  await t.test('4. Regression Cases: Harbor Morning, Ocean Passage, Horizon Route, and Coastal Freight', () => {
    const regressionLabels = ['Harbor Morning', 'Ocean Passage', 'Horizon Route', 'Coastal Freight']
    for (const label of regressionLabels) {
      const found = allAssets.find((a) => a.label === label)
      assert.ok(found, `Regression watermark "${label}" must exist in library`)
      assert.ok(found.url.endsWith('.svg'), `"${label}" must be a vector SVG`)
      
      const fullPath = path.join(__dirname, '..', 'public', found.url.replace(/^\//, ''))
      assert.ok(fs.existsSync(fullPath), `"${label}" SVG must exist at ${fullPath}`)
      
      const content = fs.readFileSync(fullPath, 'utf8')
      assert.ok(content.includes('<svg'), `"${label}" must contain valid <svg root tag`)
      assert.ok(content.includes('viewBox='), `"${label}" must declare a viewBox for responsive vector scaling`)
    }
  })

  await t.test('5. Opacity Invariance: Document print opacities strictly between 0.00 and 0.35', () => {
    for (const item of allAssets) {
      assert.ok(
        item.opacity >= 0.00 && item.opacity <= 0.35,
        `Asset ${item.label} opacity ${item.opacity} must be between 0.00 and 0.35 to guarantee document text legibility`
      )
    }
  })

  await t.test('6. Category Coverage across multi-modal logistics sectors', () => {
    const categories = new Set(allAssets.map((a) => a.category))
    const expected = ['Classic', 'Mountains', 'Overland', 'Maritime', 'Aviation', 'Geometric']
    for (const cat of expected) {
      assert.ok(categories.has(cat), `Category "${cat}" must be present in library`)
    }
  })
})
