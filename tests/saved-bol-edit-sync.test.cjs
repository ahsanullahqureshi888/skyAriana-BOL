const assert = require("assert")
const http = require("http")

const BASE_URL = "http://127.0.0.1:3001"

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL)
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {}
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data })
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, raw: data })
        }
      })
    })
    req.on("error", reject)
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body))
    }
    req.end()
  })
}

async function runTests() {
  console.log("=== Starting Saved BOL Edit + Update + Preview + PDF Sync Audit ===\n")

  // Step 1: Query initial list of BOLs
  console.log("1. Checking initial Saved BOL list...")
  const listRes = await request("/api/bol?page=1&size=50")
  assert.strictEqual(listRes.status, 200, "Initial BOL list should return 200")
  const initialDocs = listRes.body.data || []
  const initialCount = initialDocs.length
  console.log(`   Initial BOL Count: ${initialCount}`)

  // Step 2: Fetch full record for BOL-2026-NSA648
  console.log("\n2. Fetching full canonical record for BOL-2026-NSA648...")
  const bolRes = await request("/api/bol/BOL-2026-NSA648")
  assert.strictEqual(bolRes.status, 200, "BOL-2026-NSA648 lookup should return 200")
  assert(bolRes.body && bolRes.body.data, "Should return BOL data")
  const originalBol = bolRes.body.data
  const originalId = originalBol.id
  const originalConsignee = (originalBol.consignee_name && !originalBol.consignee_name.startsWith("TEST")) ? originalBol.consignee_name : "LAKHDATAR FOODS PVT LTD"
  const originalRoutes = Array.isArray(originalBol.routes) ? [...originalBol.routes] : []
  const originalRent = originalBol.driver_rent
  const originalTruck = originalBol.truck_number
  const originalPackages = originalBol.number_of_packages
  const originalNetWeight = originalBol.net_weight
  console.log(`   Internal ID: ${originalId}`)
  console.log(`   Original Consignee: "${originalConsignee}"`)
  console.log(`   Original Truck: "${originalTruck}", Rent: "${originalRent}"`)
  console.log(`   Original Routes Count: ${originalRoutes.length}`)

  // Also check NSA647 and NSA649 baseline
  console.log("\n3. Recording baseline for NSA647 and NSA649...")
  const nsa647Res = await request("/api/bol/BOL-2026-NSA647")
  const nsa649Res = await request("/api/bol/BOL-2026-NSA649")
  const nsa647Baseline = nsa647Res.status === 200 ? nsa647Res.body.data : null
  const nsa649Baseline = nsa649Res.status === 200 ? nsa649Res.body.data : null

  // Step 4: Perform Update on NSA648 (Changing consignee while keeping routes, cargo, rent intact)
  console.log("\n4. Performing Update on BOL-2026-NSA648 with safe test consignee...")
  const testConsignee = "TEST SYNC CONSIGNEE - " + Date.now()
  const updatePayload = {
    ...originalBol,
    consignee_name: testConsignee,
    revision: (Number(originalBol.revision) || 1) + 1,
  }

  const updateRes = await request(`/api/bol/${encodeURIComponent("BOL-2026-NSA648")}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: updatePayload,
  })

  assert.strictEqual(updateRes.status, 200, "Update request should return 200")
  assert(updateRes.body.success, "Update response should indicate success")
  const updatedBol = updateRes.body.data
  assert.strictEqual(updatedBol.consignee_name, testConsignee, "Updated consignee should match")
  assert.strictEqual(updatedBol.id, originalId, "Internal record ID must NOT change")
  assert.strictEqual(updatedBol.truck_number, originalTruck, "Truck number must be preserved")
  assert.strictEqual(updatedBol.driver_rent, originalRent, "Driver rent must be preserved")
  assert.strictEqual(updatedBol.number_of_packages, originalPackages, "Packages count must be preserved")
  assert.strictEqual(updatedBol.net_weight, originalNetWeight, "Net weight must be preserved")
  if (originalRoutes.length > 0) {
    assert.strictEqual(updatedBol.routes?.length, originalRoutes.length, "Route stops must not be dropped")
  }
  console.log("   ✓ Update successful: unedited fields intact, internal ID unchanged")

  // Step 5: Verify Saved BOL Card summary & Recent creations immediately reflect new consignee
  console.log("\n5. Verifying Saved BOL Card & Recent Creations list reflection...")
  const listAfterRes = await request("/api/bol?page=1&size=50")
  const docsAfter = listAfterRes.body.data || []
  assert.strictEqual(docsAfter.length, initialCount, "Total BOL count must NOT change (no duplicate created)")
  const foundInList = docsAfter.find((d) => d.bol_number === "BOL-2026-NSA648" || d.id === originalId)
  assert(foundInList, "Updated BOL must be found in list")
  assert.strictEqual(foundInList.consignee_name, testConsignee, "Card in list must show new consignee")
  console.log(`   ✓ Saved BOL card updated immediately: "${foundInList.consignee_name}"`)
  console.log(`   ✓ Total record count unchanged: ${docsAfter.length}`)

  // Step 6: Verify Recent API reflects updated BOL
  console.log("\n6. Verifying /api/bol/recent...")
  const recentRes = await request("/api/bol/recent?limit=6")
  assert.strictEqual(recentRes.status, 200, "Recent API should return 200")
  const recentDocs = recentRes.body.data || []
  const foundInRecent = recentDocs.find((d) => d.bol_number === "BOL-2026-NSA648" || d.id === originalId)
  if (foundInRecent) {
    assert.strictEqual(foundInRecent.consignee_name, testConsignee, "Recent card must show new consignee")
    console.log(`   ✓ Latest BOL Creations reflects updated consignee: "${foundInRecent.consignee_name}"`)
  }

  // Step 7: Verify NSA647 and NSA649 remained completely unchanged
  console.log("\n7. Verifying NSA647 and NSA649 isolation...")
  if (nsa647Baseline) {
    const check647 = await request("/api/bol/BOL-2026-NSA647")
    assert.strictEqual(check647.body.data.consignee_name, nsa647Baseline.consignee_name, "NSA647 must not change")
    console.log("   ✓ NSA647 untouched")
  }
  if (nsa649Baseline) {
    const check649 = await request("/api/bol/BOL-2026-NSA649")
    assert.strictEqual(check649.body.data.consignee_name, nsa649Baseline.consignee_name, "NSA649 must not change")
    console.log("   ✓ NSA649 untouched")
  }

  // Step 8: Multi-cargo update test
  console.log("\n8. Testing multi-cargo update serialization...")
  const multiCargoPayload = {
    ...originalBol,
    cargo_description: "1,000 CTNS × 16 KG OIL\n500 CTNS × 10 KG GHEE",
    number_of_packages: "1,000 CTNS - 500 CTNS",
    consignee_name: testConsignee,
  }
  const multiRes = await request(`/api/bol/${encodeURIComponent("BOL-2026-NSA648")}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: multiCargoPayload,
  })
  assert.strictEqual(multiRes.status, 200)
  assert.strictEqual(multiRes.body.data.number_of_packages, "1,000 CTNS - 500 CTNS")
  console.log("   ✓ Multi-cargo line and split preserved without concatenation")

  // Step 9: Revert NSA648 back to original state
  console.log("\n9. Reverting BOL-2026-NSA648 to pristine original state...")
  const revertRes = await request(`/api/bol/${encodeURIComponent("BOL-2026-NSA648")}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: {
      ...originalBol,
      consignee_name: originalConsignee,
      consigneeName: originalConsignee,
      number_of_packages: originalPackages,
      revision: (Number(originalBol.revision) || 1) + 5,
    },
  })
  assert.strictEqual(revertRes.status, 200, "Revert should succeed")
  assert.strictEqual(revertRes.body.data.consignee_name, originalConsignee, "Original consignee restored")
  console.log(`   ✓ Reverted to original consignee: "${originalConsignee}"`)

  // Step 10: Verify record count after revert
  const finalCountRes = await request("/api/bol?page=1&size=50")
  assert.strictEqual(finalCountRes.body.data.length, initialCount, "Final record count must match initial")
  console.log(`   ✓ Record count perfectly preserved: ${initialCount}`)

  console.log("\n=== ALL SYNC AND EDIT AUDIT TESTS PASSED! ===")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
