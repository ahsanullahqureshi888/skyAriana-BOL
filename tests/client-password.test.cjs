const test = require('node:test')
const assert = require('node:assert/strict')
const { hashClientPassword, verifyClientPassword } = require('./load-typescript.cjs')('lib/data/client-users.ts')

test('customer authentication verifies the password and rejects the stored hash as a credential', () => {
  const { hash, salt } = hashClientPassword('audit-password-strong')
  assert.equal(verifyClientPassword('audit-password-strong', hash, salt), true)
  assert.equal(verifyClientPassword('wrong', hash, salt), false)
  assert.equal(verifyClientPassword(hash, hash, salt), false)
  assert.equal(verifyClientPassword('audit-password-strong', 'invalid-hash', salt), false)
})

test('legacy passwords are supported only for records without a salt', () => {
  assert.equal(verifyClientPassword('legacy-password', 'legacy-password'), true)
  assert.equal(verifyClientPassword('wrong', 'legacy-password'), false)
  assert.equal(verifyClientPassword('legacy-password', 'legacy-password', 'salt'), false)
})
