const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const os = require("node:os")
const loadTypescript = require("./load-typescript.cjs")

// Setup temporary test data directory so tests never touch production directories
const testDir = path.join(os.tmpdir(), `sky-test-server-${Date.now()}`)
process.env.SKY_DATA_DIR = testDir

// Load modules via loadTypescript
const { getServerPaths, ensureServerDirectoriesSync } = loadTypescript("lib/server/paths.ts")
const { assertSafeLocalPath, SecurityError, saveRecordWithVersion, ConflictError, getNextServerBolNumber, getNextServerInvoiceNumber, getNextServerLedgerId, saveLedgerWithInvarianceCheck } = loadTypescript("lib/database/engine.ts")
const { hashPassword, verifyPassword, setupServerAdmin, generatePairingCode, claimPairingCode } = loadTypescript("lib/server/auth.ts")
const { registerDevice, getDevices, renameDevice, revokeDevice, unrevokeDevice } = loadTypescript("lib/server/devices.ts")
const { createServerBackup, listServerBackups, restoreServerBackup } = loadTypescript("lib/database/backup.ts")

test("LAN Server Architecture & Database Engine Tests", async (t) => {
  t.after(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true })
      }
    } catch {}
  })

  await t.test("1. Directory layout and path initialization", () => {
    const paths = ensureServerDirectoriesSync()

    assert.equal(paths.root, testDir)
    assert.ok(fs.existsSync(paths.database), "Database directory must exist")
    assert.ok(fs.existsSync(paths.backups), "Backups directory must exist")
    assert.ok(fs.existsSync(paths.config), "Config directory must exist")
    assert.ok(fs.existsSync(paths.logs), "Logs directory must exist")
  })

  await t.test("2. Network share path rejection (assertSafeLocalPath)", () => {
    assert.throws(
      () => assertSafeLocalPath("\\\\OFFICE-PC\\SkyData"),
      (err) => err instanceof SecurityError && err.message.includes("UNC/SMB")
    )
    assert.throws(
      () => assertSafeLocalPath("//OFFICE-PC/SkyData"),
      (err) => err instanceof SecurityError
    )
    assert.throws(
      () => assertSafeLocalPath("smb://192.168.1.50/share"),
      (err) => err instanceof SecurityError
    )

    // Local paths should pass
    assert.doesNotThrow(() => assertSafeLocalPath("C:\\ProgramData\\SkyArianaBOL"))
    assert.doesNotThrow(() => assertSafeLocalPath("D:\\Data"))
  })

  await t.test("3. Password hashing, salt, and weak password rejection", async () => {
    const hashed = hashPassword("SuperSecret@2026!")
    assert.ok(hashed.salt.length > 20)
    assert.ok(hashed.hash.length > 50)

    assert.equal(verifyPassword("SuperSecret@2026!", hashed.hash, hashed.salt), true)
    assert.equal(verifyPassword("WrongPassword", hashed.hash, hashed.salt), false)

    // Rejection of weak passwords
    await assert.rejects(
      () => setupServerAdmin({ username: "admin", password: "123" }),
      (err) => err.message.includes("at least 6 characters")
    )
    await assert.rejects(
      () => setupServerAdmin({ username: "admin", password: "password" }),
      (err) => err.message.includes("secure password") || err.message.includes("not permitted")
    )
  })

  await t.test("4. Pairing code generation, expiration, and claim", async () => {
    const pair = await generatePairingCode("accounting")
    assert.match(pair.code, /^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    assert.equal(pair.role, "accounting")

    // Claim pairing code
    const claimResult = await claimPairingCode({
      code: pair.code,
      deviceName: "Accounting PC 1",
      platform: "win32",
    })

    assert.ok(claimResult.token.length > 30)
    assert.ok(claimResult.deviceId.startsWith("dev_"))
    assert.equal(claimResult.role, "accounting")

    // Claiming again must fail (one-time use)
    await assert.rejects(
      () => claimPairingCode({ code: pair.code, deviceName: "Duplicate Claim" }),
      (err) => err.message.includes("already been used")
    )
  })

  await t.test("5. Device registry and revocation", async () => {
    const dev = await registerDevice({
      id: "dev_test_123",
      name: "Front Desk PC",
      role: "operations",
      ip: "192.168.1.105",
      platform: "win32",
    })

    assert.equal(dev.name, "Front Desk PC")
    assert.equal(dev.revoked, false)

    await renameDevice("dev_test_123", "Main Reception Desk")
    let devices = await getDevices()
    const found = devices.find((d) => d.id === "dev_test_123")
    assert.equal(found.name, "Main Reception Desk")

    // Revoke
    await revokeDevice("dev_test_123")
    devices = await getDevices()
    assert.equal(devices.find((d) => d.id === "dev_test_123").revoked, true)

    // Unrevoke
    await unrevokeDevice("dev_test_123")
    devices = await getDevices()
    assert.equal(devices.find((d) => d.id === "dev_test_123").revoked, false)
  })

  await t.test("6. Atomic sequence generator (BOL, Invoice, Ledger)", async () => {
    const currentYear = new Date().getFullYear()

    const bol1 = await getNextServerBolNumber(currentYear)
    const bol2 = await getNextServerBolNumber(currentYear)
    assert.equal(bol1, `BOL-${currentYear}-NSA471`)
    assert.equal(bol2, `BOL-${currentYear}-NSA472`)

    const inv1 = await getNextServerInvoiceNumber(currentYear)
    const inv2 = await getNextServerInvoiceNumber(currentYear)
    assert.equal(inv1, `INV-${currentYear}-0001`)
    assert.equal(inv2, `INV-${currentYear}-0002`)

    const tx1 = await getNextServerLedgerId()
    const tx2 = await getNextServerLedgerId()
    assert.ok(tx1.startsWith("TX-"))
    assert.notEqual(tx1, tx2)
  })

  await t.test("7. Optimistic Concurrency Control (OCC) and 409 Conflict", async () => {
    // Create record: initial version = 1
    const initial = await saveRecordWithVersion("bols", {
      id: "BOL-2026-TEST-OCC",
      shipper_name: "Kabul Trading LLC",
    })
    assert.equal(initial.version, 1)

    // Client A updates with expectedVersion = 1 -> version becomes 2
    const updatedA = await saveRecordWithVersion(
      "bols",
      { id: "BOL-2026-TEST-OCC", shipper_name: "Kabul Trading LLC (Updated A)" },
      1
    )
    assert.equal(updatedA.version, 2)

    // Client B attempts to update with stale expectedVersion = 1 -> Must throw 409 Conflict
    await assert.rejects(
      () =>
        saveRecordWithVersion(
          "bols",
          { id: "BOL-2026-TEST-OCC", shipper_name: "Stale Conflict Update B" },
          1
        ),
      (err) => err instanceof ConflictError && err.statusCode === 409
    )
  })

  await t.test("8. Accounting Invariance Enforcement on Ledger Saves", async () => {
    // Valid ledger entries: Total Debit (1000) - Total Credit (300) = 700 Net Balance
    const validEntries = [
      {
        id: "tx-1",
        date: "2026-03-01",
        description: "Invoice 101 Freight",
        debit: 1000,
        credit: 0,
        balance: 1000,
      },
      {
        id: "tx-2",
        date: "2026-03-05",
        description: "Partial Payment",
        debit: 0,
        credit: 300,
        balance: 700,
      },
    ]

    const result = await saveLedgerWithInvarianceCheck("Client Alpha", validEntries)
    assert.equal(result.success, true)
    assert.equal(result.audit.isValid, true)
    assert.equal(result.audit.netBalance, 700)

    // Invalid ledger entries: Net balance violates Debit - Credit
    const corruptedEntries = [
      {
        id: "tx-corrupt",
        date: "2026-03-01",
        description: "Corrupted entry",
        debit: 500,
        credit: 0,
        balance: 9999, // Invariance broken!
      },
    ]

    await assert.rejects(
      () => saveLedgerWithInvarianceCheck("Client Beta", corruptedEntries),
      (err) => err.message.includes("Accounting Invariance Check Failed")
    )
  })

  await t.test("9. Server backup archive creation and rollback restore", async () => {
    const backup = await createServerBackup({ actor: "admin_test" })
    assert.ok(backup.sizeBytes > 0)
    assert.ok(fs.existsSync(backup.filePath))

    const backups = await listServerBackups()
    assert.ok(backups.length >= 1)
    assert.equal(backups[0].filename, backup.filename)

    // Restore the backup
    const restoreResult = await restoreServerBackup(backup.filename, { actor: "admin_test" })
    assert.equal(restoreResult.success, true)
    assert.ok(restoreResult.restoredFiles.length > 0)
    assert.ok(fs.existsSync(restoreResult.preRestoreBackupPath))
  })
})
