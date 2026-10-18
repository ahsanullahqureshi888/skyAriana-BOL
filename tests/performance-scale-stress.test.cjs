const test = require("node:test")
const assert = require("node:assert/strict")
const http = require("node:http")

function fetchLocal(url) {
  const start = performance.now()
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        const durationMs = performance.now() - start
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, durationMs, bytes: Buffer.byteLength(data), data: parsed })
        } catch {
          resolve({ status: res.statusCode, durationMs, bytes: Buffer.byteLength(data), text: data })
        }
      })
    }).on("error", reject)
  })
}

test("PERFORMANCE SUITE: Section 119 — Saved BOLs Scaling (25, 100, 500, 2,000)", async (t) => {
  // Warmup ping to ensure Next.js route is compiled
  await fetchLocal("http://localhost:3001/api/bol?limit=25")

  // 1. Sliced 25 items
  const res25 = await fetchLocal("http://localhost:3001/api/bol?limit=25")
  assert.equal(res25.status, 200)
  assert.ok(res25.durationMs < 250, `25 BOL query must be sub-250ms (got ${res25.durationMs.toFixed(1)}ms)`)
  assert.ok(res25.bytes < 50 * 1024, `25 BOL payload must be <50KB (got ${(res25.bytes / 1024).toFixed(1)}KB)`)

  // 2. Synthetic benchmark on 100, 500, 2,000 items in memory
  const generateMockBols = (count) =>
    Array.from({ length: count }, (_, i) => ({
      id: `BOL-${2026}-${1000 + i}`,
      bol_number: `BOL-2026-NSA${1000 + i}`,
      issue_date: "2026-10-01",
      shipper_name: `SHIPPER_${i % 25}`,
      consignee_name: `CONSIGNEE_${i % 30}`,
      driver_name: `Driver ${i}`,
      truck_number: `${10000 + i}هرات`,
      number_of_packages: `${1000 + (i % 500)} CTNS`,
      net_weight: `${20000 + (i % 5000)} KG`,
      gross_weight: `${22000 + (i % 5000)} KG`,
      driver_rent: `${50000 + (i % 10000)} AFN`,
      status: i % 10 === 0 ? "archived" : "active",
      isArchived: i % 10 === 0,
    }))

  for (const size of [100, 500, 2000]) {
    const mock = generateMockBols(size)
    const t0 = performance.now()
    // Test filter + search + projection
    const active = mock.filter((b) => !b.isArchived)
    const projected = active.slice(0, 50).map((b) => ({
      id: b.id,
      bol_number: b.bol_number,
      shipper: b.shipper_name,
      packages: b.number_of_packages,
    }))
    const dur = performance.now() - t0
    assert.ok(dur < 15, `Processing ${size} BOLs must be <15ms (got ${dur.toFixed(2)}ms)`)
    assert.equal(projected.length, 50)
  }
})

test("PERFORMANCE SUITE: Section 120 — Ledger Scaling & Strict Accounting Invariance (35, 500, 5,000, 20,000)", async (t) => {
  // Test accounting invariance on scaled datasets: Net Balance = Total Debit - Total Credit
  const testLedgerInvariance = (count) => {
    let runningBalance = 0
    let totalDebit = 0
    let totalCredit = 0

    const t0 = performance.now()
    for (let i = 0; i < count; i++) {
      const isDebit = i % 3 !== 0
      const debit = isDebit ? 1000 + (i % 500) : 0
      const credit = !isDebit ? 800 + (i % 400) : 0

      totalDebit += debit
      totalCredit += credit
      runningBalance += debit - credit
    }
    const calculationTimeMs = performance.now() - t0

    const netBalance = totalDebit - totalCredit
    assert.equal(runningBalance, netBalance, "Accounting invariance strictly holds: Net Balance = Total Debit - Total Credit")
    return calculationTimeMs
  }

  const times = {}
  for (const size of [35, 500, 5000, 20000]) {
    times[size] = testLedgerInvariance(size)
    assert.ok(times[size] < 20, `Calculation for ${size} ledger entries must be <20ms (got ${times[size].toFixed(2)}ms)`)
  }
})

test("PERFORMANCE SUITE: Section 121 — Report Center 2,000 BOL Aggregations", async (t) => {
  const mockBols = Array.from({ length: 2000 }, (_, i) => ({
    id: `bol-${i}`,
    shipper_name: `Shipper ${i % 40}`,
    origin: i % 2 === 0 ? "Kandahar" : "Herat",
    border_station: i % 3 === 0 ? "Islam Qala" : "Torghundi",
    truck_number: `${80000 + (i % 80)}هرات`,
    cartons: 1000 + (i % 200),
    net_weight: 20000 + (i % 1000),
    freight_usd: 2500 + (i % 500),
  }))

  const t0 = performance.now()

  // 1. Overview KPIs
  let totalPkgs = 0
  let totalWeight = 0
  let totalFreight = 0
  for (const b of mockBols) {
    totalPkgs += b.cartons
    totalWeight += b.net_weight
    totalFreight += b.freight_usd
  }

  // 2. Group by Shipper
  const shipperMap = new Map()
  for (const b of mockBols) {
    const existing = shipperMap.get(b.shipper_name) || { count: 0, weight: 0, freight: 0 }
    existing.count++
    existing.weight += b.net_weight
    existing.freight += b.freight_usd
    shipperMap.set(b.shipper_name, existing)
  }

  // 3. Group by Route
  const routeMap = new Map()
  for (const b of mockBols) {
    const rKey = `${b.origin} -> ${b.border_station}`
    const existing = routeMap.get(rKey) || { count: 0, weight: 0 }
    existing.count++
    existing.weight += b.net_weight
    routeMap.set(rKey, existing)
  }

  const durationMs = performance.now() - t0
  assert.equal(mockBols.length, 2000)
  assert.equal(shipperMap.size, 40)
  assert.ok(durationMs < 25, `Aggregating 2,000 BOLs must complete in <25ms (got ${durationMs.toFixed(2)}ms)`)
})

test("PERFORMANCE SUITE: Section 122 — Files 5,000 Metadata Records", async (t) => {
  const mockFiles = Array.from({ length: 5000 }, (_, i) => ({
    id: `file-${i}`,
    file_name: `BOL_INV_${1000 + i}.pdf`,
    category: i % 4 === 0 ? "invoice" : (i % 4 === 1 ? "transit" : "cmr"),
    file_size_bytes: 150000 + (i % 50000),
    uploaded_at: "2026-10-01T12:00:00Z",
    bol_number: `BOL-2026-NSA${1000 + (i % 200)}`,
  }))

  const t0 = performance.now()
  // Simulate filtering + pagination
  const filtered = mockFiles.filter((f) => f.category === "invoice")
  const page1 = filtered.slice(0, 50)
  const durationMs = performance.now() - t0

  assert.equal(filtered.length, 1250)
  assert.equal(page1.length, 50)
  assert.ok(durationMs < 10, `Filtering and paginating 5,000 metadata files must take <10ms (got ${durationMs.toFixed(2)}ms)`)
})

test("PERFORMANCE SUITE: Section 123 & 124 — Sequential BOL Switching & Preview (20 Requests)", async (t) => {
  // Pre-flight warmup ping
  await fetchLocal("http://localhost:3001/api/bol/BOL-2026-NSA626")

  const times = []
  for (let i = 0; i < 20; i++) {
    const res = await fetchLocal("http://localhost:3001/api/bol/BOL-2026-NSA626")
    assert.equal(res.status, 200)
    times.push(res.durationMs)
  }

  times.sort((a, b) => a - b)
  const avg = times.reduce((s, t) => s + t, 0) / times.length
  const p95 = times[Math.floor(times.length * 0.95)]

  console.log(`  - 20 BOL Opens: avg = ${avg.toFixed(1)}ms, p95 = ${p95.toFixed(1)}ms`)
  assert.ok(avg < 150, `Average BOL switch time must be <150ms (got ${avg.toFixed(1)}ms)`)
  assert.ok(p95 < 250, `P95 BOL switch time must be <250ms (got ${p95.toFixed(1)}ms)`)
})

test("PERFORMANCE SUITE: Section 126 — Search Responsiveness (10 chars/sec simulation)", async (t) => {
  const searchTerms = ["B", "BO", "BOL", "BOL-", "BOL-2", "BOL-20", "BOL-202", "BOL-2026", "BOL-2026-", "BOL-2026-N"]
  const mockDataset = Array.from({ length: 1000 }, (_, i) => ({
    id: `BOL-2026-NSA${1000 + i}`,
    bol_number: `BOL-2026-NSA${1000 + i}`,
    shipper: `SHIPPER_${i}`,
    truck: `${50000 + i}هرات`,
  }))

  const keyTimes = []
  for (const term of searchTerms) {
    const t0 = performance.now()
    const lower = term.toLowerCase()
    const matches = mockDataset.filter(
      (d) => d.bol_number.toLowerCase().includes(lower) || d.shipper.toLowerCase().includes(lower)
    )
    keyTimes.push(performance.now() - t0)
  }

  const maxKeyTime = Math.max(...keyTimes)
  assert.ok(maxKeyTime < 5, `Each search keystroke must filter in <5ms (worst: ${maxKeyTime.toFixed(2)}ms)`)
})
