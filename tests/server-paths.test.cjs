const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { getUploadPath } = require('./load-typescript.cjs')('lib/server-paths.ts')

test('upload paths cannot escape their root through dot segments or alternate streams', () => {
  for (const segment of ['..', '.', '', 'invoice.pdf:secret', 'invoice\0.pdf']) {
    assert.throws(() => getUploadPath(segment, 'private.json'), /Invalid upload path/)
  }
})

test('valid nested upload paths remain supported', () => {
  assert.equal(getUploadPath('bol-pdfs', 'Invoice 123.pdf'), path.join(getUploadPath(), 'bol-pdfs', 'Invoice 123.pdf'))
})
