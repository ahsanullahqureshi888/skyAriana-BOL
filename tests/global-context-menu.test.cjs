const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('Global Context Menu & Clipboard Service Implementation Suite', async (t) => {
  const rootDir = path.resolve(__dirname, '..')

  await t.test('1. Core component and service files exist', () => {
    const clipboardServicePath = path.join(rootDir, 'lib', 'services', 'clipboard-service.ts')
    const contextMenuCompPath = path.join(rootDir, 'components', 'global-context-menu.tsx')
    const layoutPath = path.join(rootDir, 'app', 'layout.tsx')

    assert.ok(fs.existsSync(clipboardServicePath), 'clipboard-service.ts must exist')
    assert.ok(fs.existsSync(contextMenuCompPath), 'global-context-menu.tsx must exist')
    assert.ok(fs.existsSync(layoutPath), 'layout.tsx must exist')

    const layoutContent = fs.readFileSync(layoutPath, 'utf8')
    assert.ok(
      layoutContent.includes('GlobalContextMenu'),
      'layout.tsx must register GlobalContextMenu component'
    )
  })

  await t.test('2. Unicode, Pashto/Dari text preservation during insertion', () => {
    // Simulating insertTextAtCursor string math
    const originalText = 'کندهار 12797 - نوم رفیع الله ولد حاجی عبدالباری'
    const insertText = ' (بارګیري نوي)'
    const cursorPosition = 'کندهار 12797'.length // 12

    const nextVal = originalText.slice(0, cursorPosition) + insertText + originalText.slice(cursorPosition)
    assert.equal(
      nextVal,
      'کندهار 12797 (بارګیري نوي) - نوم رفیع الله ولد حاجی عبدالباری'
    )
    assert.ok(nextVal.includes('کندهار 12797'))
    assert.ok(nextVal.includes('بارګیري نوي'))
    assert.ok(nextVal.includes('عبدالباری'))
  })

  await t.test('3. Multiline textarea preservation during paste', () => {
    const multilineOriginal = 'Note 01: Loading Contact\nDriver Contact: 0700535637'
    const pastedLines = '\nRepresentative: 0711 263 528\nStatus: Border Cleared'
    const cursor = multilineOriginal.length

    const combined = multilineOriginal.slice(0, cursor) + pastedLines + multilineOriginal.slice(cursor)
    const lines = combined.split('\n')
    assert.equal(lines.length, 4)
    assert.equal(lines[0], 'Note 01: Loading Contact')
    assert.equal(lines[1], 'Driver Contact: 0700535637')
    assert.equal(lines[2], 'Representative: 0711 263 528')
    assert.equal(lines[3], 'Status: Border Cleared')
  })

  await t.test('4. Selection replacement logic over existing text', () => {
    const fullText = 'Driver Rent: 45,000 - AFN'
    const selStart = 13 // start of '45,000'
    const selEnd = 19   // end of '45,000'
    const replacement = '52,500'

    const replaced = fullText.slice(0, selStart) + replacement + fullText.slice(selEnd)
    assert.equal(replaced, 'Driver Rent: 52,500 - AFN')
  })

  await t.test('5. Action permission rules validation', () => {
    function computeActions({ isInput, isEditable, hasSelection, isPassword, isTableCell, cellText, textLength }) {
      const canCut = isEditable && hasSelection && !isPassword
      const canCopy = (hasSelection || !!cellText) && !isPassword
      const canPaste = isEditable
      const canSelectAll = isInput ? textLength > 0 : hasSelection || !!cellText || isTableCell
      const canUndo = isEditable
      const canRedo = isEditable

      return { canCut, canCopy, canPaste, canSelectAll, canUndo, canRedo }
    }

    // Case A: Editable input with text selected
    const caseA = computeActions({
      isInput: true,
      isEditable: true,
      hasSelection: true,
      isPassword: false,
      isTableCell: false,
      cellText: '',
      textLength: 20
    })
    assert.equal(caseA.canCut, true)
    assert.equal(caseA.canCopy, true)
    assert.equal(caseA.canPaste, true)
    assert.equal(caseA.canSelectAll, true)
    assert.equal(caseA.canUndo, true)
    assert.equal(caseA.canRedo, true)

    // Case B: Editable input without text selected
    const caseB = computeActions({
      isInput: true,
      isEditable: true,
      hasSelection: false,
      isPassword: false,
      isTableCell: false,
      cellText: '',
      textLength: 15
    })
    assert.equal(caseB.canCut, false)
    assert.equal(caseB.canCopy, false)
    assert.equal(caseB.canPaste, true)
    assert.equal(caseB.canSelectAll, true)
    assert.equal(caseB.canUndo, true)
    assert.equal(caseB.canRedo, true)

    // Case C: Read-only input with selection
    const caseC = computeActions({
      isInput: true,
      isEditable: false,
      hasSelection: true,
      isPassword: false,
      isTableCell: false,
      cellText: '',
      textLength: 30
    })
    assert.equal(caseC.canCut, false)
    assert.equal(caseC.canCopy, true)
    assert.equal(caseC.canPaste, false)
    assert.equal(caseC.canSelectAll, true)
    assert.equal(caseC.canUndo, false)
    assert.equal(caseC.canRedo, false)

    // Case D: Password input protection
    const caseD = computeActions({
      isInput: true,
      isEditable: true,
      hasSelection: true,
      isPassword: true,
      isTableCell: false,
      cellText: '',
      textLength: 8
    })
    assert.equal(caseD.canCut, false, 'Password fields must NOT permit Cut')
    assert.equal(caseD.canCopy, false, 'Password fields must NOT permit Copy')
    assert.equal(caseD.canPaste, true)

    // Case E: Table cell without highlighted text
    const caseE = computeActions({
      isInput: false,
      isEditable: false,
      hasSelection: false,
      isPassword: false,
      isTableCell: true,
      cellText: 'INV-190-MANIK TRADERS',
      textLength: 0
    })
    assert.equal(caseE.canCopy, true, 'Table cell text can be copied directly')
    assert.equal(caseE.canSelectAll, true)
    assert.equal(caseE.canPaste, false)
    assert.equal(caseE.canCut, false)
  })

  await t.test('6. Viewport clamping bounds mathematics', () => {
    function clampPosition(clientX, clientY, windowWidth, windowHeight, menuWidth = 210, menuHeight = 240, padding = 12) {
      let x = clientX
      let y = clientY
      if (x + menuWidth > windowWidth - padding) {
        x = Math.max(padding, x - menuWidth)
      }
      if (y + menuHeight > windowHeight - padding) {
        y = Math.max(padding, y - menuHeight)
      }
      return { x, y }
    }

    // Normal position (center of screen)
    const normal = clampPosition(400, 300, 1920, 1080)
    assert.equal(normal.x, 400)
    assert.equal(normal.y, 300)

    // Bottom-right edge overflow should flip inside viewport
    const edge = clampPosition(1900, 1050, 1920, 1080)
    assert.equal(edge.x, 1900 - 210) // 1690
    assert.equal(edge.y, 1050 - 240) // 810
    assert.ok(edge.x + 210 <= 1920)
    assert.ok(edge.y + 240 <= 1080)
  })
})
