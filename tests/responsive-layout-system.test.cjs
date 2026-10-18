const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('Responsive UI System & Layout Architecture', async (t) => {
  const rootDir = path.resolve(__dirname, '..')

  await t.test('1. globals.css defines standardized design tokens and control heights', () => {
    const cssPath = path.join(rootDir, 'app', 'globals.css')
    assert.ok(fs.existsSync(cssPath), 'globals.css exists')
    const css = fs.readFileSync(cssPath, 'utf8')

    // Spacing tokens
    assert.match(css, /--space-1:\s*4px;/, 'Defines --space-1: 4px')
    assert.match(css, /--space-2:\s*8px;/, 'Defines --space-2: 8px')
    assert.match(css, /--space-3:\s*12px;/, 'Defines --space-3: 12px')
    assert.match(css, /--space-4:\s*16px;/, 'Defines --space-4: 16px')
    assert.match(css, /--space-5:\s*20px;/, 'Defines --space-5: 20px')
    assert.match(css, /--space-6:\s*24px;/, 'Defines --space-6: 24px')

    // Control sizes: 32px, 36px, 40px
    assert.match(css, /\.control-sm\s*\{[^}]*height:\s*32px/s, '.control-sm defines 32px height')
    assert.match(css, /\.control-md\s*\{[^}]*height:\s*36px/s, '.control-md defines 36px height')
    assert.match(css, /\.control-lg\s*\{[^}]*height:\s*40px/s, '.control-lg defines 40px height')

    // Table scroll ownership
    assert.match(css, /\.table-scroll-container[^}]*overflow-x:\s*auto/s, '.table-scroll-container enforces overflow-x: auto')
    assert.match(css, /\[data-table-scroll="true"\]/s, '[data-table-scroll="true"] utility present')

    // Debug overflow styling
    assert.match(css, /\[data-debug-overflow="true"\]/s, 'Debug overflow selector defined')
  })

  await t.test('2. AppShell and MainWorkspace enforce 100dvh viewport and zero body scroll', () => {
    const shellPath = path.join(rootDir, 'components', 'layout', 'app-shell.tsx')
    assert.ok(fs.existsSync(shellPath), 'app-shell.tsx exists')
    const shell = fs.readFileSync(shellPath, 'utf8')

    assert.match(shell, /h-\[100dvh\]/, 'AppShell specifies 100dvh viewport height')
    assert.match(shell, /overflow-hidden/, 'AppShell specifies overflow-hidden to eliminate outer scrollbars')
    assert.match(shell, /flex-1 min-h-0 min-w-0/, 'MainWorkspace has flex-1 min-h-0 min-w-0')
    assert.match(shell, /overflow-y-auto overflow-x-hidden/, 'MainWorkspace manages vertical scroll and locks horizontal scroll')
    assert.match(shell, /pb-20 md:pb-6/, 'MainWorkspace includes safe bottom clearance for mobile bottom nav')
  })

  await t.test('3. Reusable PageHeader, AppToolbar, and Card primitives are exported', () => {
    const indexPath = path.join(rootDir, 'components', 'layout', 'index.ts')
    assert.ok(fs.existsSync(indexPath), 'layout index.ts exists')
    const indexContent = fs.readFileSync(indexPath, 'utf8')

    assert.match(indexContent, /export \* from "\.\/app-shell"/, 'Exports app-shell')
    assert.match(indexContent, /export \* from "\.\/page-header"/, 'Exports page-header')
    assert.match(indexContent, /export \* from "\.\/app-toolbar"/, 'Exports app-toolbar')
    assert.match(indexContent, /export \* from "\.\/responsive-cards"/, 'Exports responsive-cards')
  })

  await t.test('4. app/page.tsx utilizes AppShell and MainWorkspace', () => {
    const pagePath = path.join(rootDir, 'app', 'page.tsx')
    const page = fs.readFileSync(pagePath, 'utf8')

    assert.match(page, /import\s*\{[^}]*AppShell,\s*MainWorkspace[^}]*\}\s*from\s*['"]@\/components\/layout['"]/, 'Imports AppShell and MainWorkspace')
    assert.match(page, /<AppShell[^>]*header=\{<Header \/>\}[^>]*footer=\{<MobileBottomNav \/>\}/s, 'Wraps application in AppShell with Header and MobileBottomNav')
    assert.match(page, /<MainWorkspace/, 'Wraps views in MainWorkspace')
  })

  await t.test('5. Zero unconstrained w-screen elements in components', () => {
    const componentsDir = path.join(rootDir, 'components')
    const violatingFiles = []

    function checkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          checkDir(fullPath)
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8')
          // Match className containing standalone w-screen (not max-w-screen, min-w-screen, etc.)
          if (/class(?:Name)?=["'][^"']*(?<![\w-])w-screen(?![\w-])[^"']*["']/.test(content)) {
            violatingFiles.push(path.relative(rootDir, fullPath))
          }
        }
      }
    }

    checkDir(componentsDir)
    assert.deepEqual(violatingFiles, [], 'No components use unconstrained w-screen that causes layout blowout')
  })

  await t.test('6. UiOverflowDetector supports ?debugOverflow=1 parameter', () => {
    const detectorPath = path.join(rootDir, 'components', 'system', 'ui-overflow-detector.tsx')
    assert.ok(fs.existsSync(detectorPath), 'ui-overflow-detector.tsx exists')
    const content = fs.readFileSync(detectorPath, 'utf8')

    assert.match(content, /debugOverflow/, 'Supports debugOverflow query parameter')
    assert.match(content, /data-debug-overflow/, 'Sets data-debug-overflow attribute on document element')
  })

  await t.test('7. Header includes adaptive collapse into More and Suites dropdowns', () => {
    const headerPath = path.join(rootDir, 'components', 'header.tsx')
    const header = fs.readFileSync(headerPath, 'utf8')

    assert.match(header, /lg:hidden flex items-center/, 'Header includes adaptive Suites dropdown for screens < 1024px')
    assert.match(header, /hidden xl:flex items-center/, 'Header collapses Sales & CRM into More dropdown for screens < 1280px')
    assert.match(header, /hidden 2xl:block shrink-0/, 'Server status pill collapses on laptop viewports')
  })
})
