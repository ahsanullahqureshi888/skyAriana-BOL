const test = require('node:test')
const assert = require('node:assert/strict')
const { NextRequest } = require('next/server')
const { proxy } = require('./load-typescript.cjs')('proxy.ts')
const request = (path, options) => new NextRequest(`https://office.example${path}`, options)

test('private files and dotted API identifiers require a LAN session', async () => {
  for (const path of ['/api/pdf/customer/invoice.pdf', '/api/documents/customer.name', '/api/server/admin/client-access']) {
    assert.equal((await proxy(request(path))).status, 401, path)
  }
  assert.equal((await proxy(request('/uploads/customer.pdf'))).status, 307)
})

test('only the administrator setup status is public, not account creation', async () => {
  assert.equal((await proxy(request('/api/server/admin/setup'))).headers.get('x-middleware-next'), '1')
  assert.equal((await proxy(request('/api/server/admin/setup', { method: 'POST' }))).status, 401)
})

test('customer login, customer session APIs, health and static assets reach their own handlers', async () => {
  for (const path of ['/client/login', '/api/client/auth/login', '/api/client/profile', '/api/portal/auth/login', '/api/health', '/logo.png', '/manifest.json']) {
    assert.equal((await proxy(request(path))).headers.get('x-middleware-next'), '1', path)
  }
  assert.equal((await proxy(request('/api/portal/admin/customers'))).status, 401)
})

test('verification uses the request origin, never a supplied host header', async (t) => {
  let calledUrl
  t.mock.method(globalThis, 'fetch', async url => {
    calledUrl = String(url)
    return new Response('{}', { status: 200 })
  })
  const response = await proxy(request('/api/accounts', { headers: { cookie: 'sky_auth_token=test', host: 'untrusted.example', 'x-forwarded-proto': 'http' } }))
  assert.equal(response.headers.get('x-middleware-next'), '1')
  assert.equal(calledUrl, 'https://office.example/api/server/auth/verify')
})

test('verification outages fail closed for both pages and APIs', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  const options = { headers: { cookie: 'sky_auth_token=test' } }
  assert.equal((await proxy(request('/api/accounts', options))).status, 503)
  assert.equal((await proxy(request('/', options))).headers.get('location'), 'https://office.example/lan-auth')
})
