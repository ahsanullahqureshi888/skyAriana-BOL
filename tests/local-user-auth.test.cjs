const test = require('node:test')
const assert = require('node:assert/strict')
const { authenticateLocalUser } = require('./load-typescript.cjs')('lib/services/local-user-auth.ts')
const admin = { id: 'admin', username: 'admin', email: 'admin@example.com', role: 'superadmin', password: 'Correct-password', status: 'active' }

test('accepts only a known username or full email with its exact configured password', () => {
  assert.equal(authenticateLocalUser([admin], ' ADMIN ', 'Correct-password'), admin)
  assert.equal(authenticateLocalUser([admin], 'ADMIN@EXAMPLE.COM', 'Correct-password'), admin)
  for (const password of ['', 'x', 'admin', 'password', 'correct-password']) {
    assert.equal(authenticateLocalUser([admin], 'admin', password), null)
  }
  for (const username of ['unknown', 'admin@different.example', 'superadmin']) {
    assert.equal(authenticateLocalUser([admin], username, 'Correct-password'), null)
  }
})

test('disabled and passwordless accounts cannot log in', () => {
  assert.equal(authenticateLocalUser([{ ...admin, status: 'disabled' }], 'admin', admin.password), null)
  assert.equal(authenticateLocalUser([{ ...admin, password: undefined }], 'admin', 'admin'), null)
})
