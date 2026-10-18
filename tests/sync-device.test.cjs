const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const { getDeviceProfile, updateDeviceName, detectPlatform } = loadTypescript('lib/sync/device.ts')

test('device profile generates stable persistent device ID and retains friendly name', () => {
  const profile1 = getDeviceProfile()
  assert.ok(profile1.deviceId, 'deviceId must be defined')
  assert.ok(profile1.deviceId.startsWith('SKY-'), 'deviceId should be prefixed with SKY-')
  assert.ok(profile1.deviceName, 'deviceName must be defined')

  // Calling again returns the exact same deviceId (does not regenerate on reopen)
  const profile2 = getDeviceProfile()
  assert.equal(profile1.deviceId, profile2.deviceId)

  // Updating device name retains deviceId
  const updated = updateDeviceName('Kandahar Main Office')
  assert.equal(updated.deviceId, profile1.deviceId)
  assert.equal(updated.deviceName, 'Kandahar Main Office')

  const verified = getDeviceProfile()
  assert.equal(verified.deviceName, 'Kandahar Main Office')
})

test('detectPlatform returns a recognized operating system string', () => {
  const plat = detectPlatform()
  assert.ok(['Windows', 'macOS', 'Linux', 'Web', 'Unknown'].includes(plat))
})
