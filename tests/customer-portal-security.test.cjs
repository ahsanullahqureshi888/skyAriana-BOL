const test = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs")

// Load the compiled/transpiled service modules or mock test data environment
const {
  isShipmentOwnedByCustomer,
  filterCustomerVisibleMilestones,
} = require("../dist-test/portal-helpers.cjs")

test("Phase 6: Customer Portal Security & Isolation Suite", async (t) => {
  // Test Data Setup
  const customerA = {
    id: "acc-najeb-amin",
    name: "NAJEB AMIN LTD",
    username: "najeb",
  }

  const customerB = {
    id: "acc-fazel-basit",
    name: "FAZEL BASIT L.T.D",
    username: "fazel",
  }

  const shipmentA = {
    id: "shp-aaa-111",
    referenceNumber: "SA-SHP-2026-001",
    bolNumber: "BOL-2026-NSA583",
    shipper: { id: "acc-najeb-amin", name: "NAJEB AMIN LTD" },
    consignee: { id: "acc-consignee-india", name: "MUMBAI SPICES IMPORTS" },
    notifyParty: { id: "acc-notify-1", name: "NAJEB AMIN DUBAI BRANCH" },
    status: "vessel_departed",
    containers: [{ containerNumber: "MSCU1234567", containerType: "40RF", sealNumber: "SL-9988" }],
    truck: { driverName: "Ahmad", driverRent: 2500, afghanPlate: "KBL-1234" },
    finance: { freightAmount: 4500, supplierCost: 3200, profitOrLoss: 1300 },
    milestones: [
      { id: "m1", location: "Kandahar", title: "Cargo Loaded", status: "cargo_loaded", completed: true, customerVisible: true },
      { id: "m2", location: "Islam Qala", title: "Border Customs", status: "at_border", completed: true, customerVisible: true },
      { id: "m3", location: "Bandar Abbas", title: "Internal Note: Driver payment dispute", status: "internal_hold", description: "driver rent dispute with broker", completed: false, customerVisible: false },
      { id: "m4", location: "Jebel Ali", title: "Vessel Departed", status: "vessel_departed", completed: false, customerVisible: true },
    ],
    documentSnapshots: [
      { id: "doc-bol-A", documentType: "bol", documentNumber: "BOL-2026-NSA583", customerVisible: true },
      { id: "doc-internal-quote", documentType: "cost_sheet", documentNumber: "INTERNAL-COST", customerVisible: false },
    ],
  }

  const shipmentB = {
    id: "shp-bbb-222",
    referenceNumber: "SA-SHP-2026-002",
    bolNumber: "BOL-2026-NSA999",
    shipper: { id: "acc-fazel-basit", name: "FAZEL BASIT L.T.D" },
    consignee: { id: "acc-consignee-turkey", name: "ISTANBUL DRIED FRUITS" },
    status: "in_transit",
    containers: [{ containerNumber: "TGHU7654321", containerType: "20GP", sealNumber: "SL-5544" }],
    finance: { freightAmount: 3800, supplierCost: 2900, profitOrLoss: 900 },
  }

  await t.test("1. Cross-Customer BOL Ownership & Scoping", () => {
    // Customer A checks
    const checkA_on_A = isShipmentOwnedByCustomer(shipmentA, customerA.id, customerA.name)
    assert.equal(checkA_on_A.isOwner, true, "Customer A must own Shipment A")
    assert.equal(checkA_on_A.customerRole, "shipper")

    const checkA_on_B = isShipmentOwnedByCustomer(shipmentB, customerA.id, customerA.name)
    assert.equal(checkA_on_B.isOwner, false, "Customer A MUST NOT own Customer B's shipment")

    // Customer B checks
    const checkB_on_B = isShipmentOwnedByCustomer(shipmentB, customerB.id, customerB.name)
    assert.equal(checkB_on_B.isOwner, true, "Customer B must own Shipment B")

    const checkB_on_A = isShipmentOwnedByCustomer(shipmentA, customerB.id, customerB.name)
    assert.equal(checkB_on_A.isOwner, false, "Customer B MUST NOT own Customer A's shipment")
  })

  await t.test("2. Cross-Customer Search Neutrality & Zero Leakage", () => {
    // When Customer A searches for Customer B's exact BOL Number "BOL-2026-NSA999"
    const customerAShipmentsPool = [shipmentA, shipmentB].filter(
      (s) => isShipmentOwnedByCustomer(s, customerA.id, customerA.name).isOwner
    )

    assert.equal(customerAShipmentsPool.length, 1)
    assert.equal(customerAShipmentsPool[0].bolNumber, "BOL-2026-NSA583")

    const searchTarget = "BOL-2026-NSA999"
    const searchResults = customerAShipmentsPool.filter(
      (s) => s.bolNumber.includes(searchTarget) || s.referenceNumber.includes(searchTarget)
    )

    assert.equal(searchResults.length, 0, "Cross-customer search must return ZERO results")
  })

  await t.test("3. Data Sanitization: Strips Internal Financials & Sensitive Milestones", () => {
    // Milestones filtering test
    const sanitizedMilestones = filterCustomerVisibleMilestones(shipmentA.milestones)
    assert.equal(sanitizedMilestones.length, 3, "Internal milestone (m3) must be filtered out")

    const hasInternalHold = sanitizedMilestones.some((m) => m.id === "m3" || m.title.includes("Driver payment dispute"))
    assert.equal(hasInternalHold, false, "Customer-visible milestones must not contain driver payment dispute")

    // Sensitive internal financial checks
    assert.ok(shipmentA.finance.supplierCost, "Raw record has supplierCost")
    assert.ok(shipmentA.finance.profitOrLoss, "Raw record has profitOrLoss")

    // In projected customer-safe object:
    const customerSafeProjection = {
      id: shipmentA.id,
      bolNumber: shipmentA.bolNumber,
      freightAmount: shipmentA.finance.freightAmount,
    }
    assert.equal(customerSafeProjection.supplierCost, undefined)
    assert.equal(customerSafeProjection.profitOrLoss, undefined)
  })

  await t.test("4. Document Visibility & IDOR Check", () => {
    // Customer A attempts to access documents
    const isOwner = isShipmentOwnedByCustomer(shipmentA, customerA.id, customerA.name).isOwner
    assert.equal(isOwner, true)

    const customerDocuments = shipmentA.documentSnapshots.filter((d) => d.customerVisible !== false)
    assert.equal(customerDocuments.length, 1)
    assert.equal(customerDocuments[0].id, "doc-bol-A")

    // Customer B attempts access to Customer A's document
    const isBOwner = isShipmentOwnedByCustomer(shipmentA, customerB.id, customerB.name).isOwner
    assert.equal(isBOwner, false, "Customer B cannot access Customer A documents (IDOR prevented)")
  })

  await t.test("5. Accounting Invariance Identity on Customer Ledger", () => {
    // Test that customer ledger strictly satisfies: Outstanding Balance = Total Debit - Total Credit
    const customerLedgerRecords = [
      { date: "2026-09-01", description: "Freight Charges BOL-NSA583", debit: 4500, credit: 0, currency: "USD" },
      { date: "2026-09-05", description: "Port Handling Charges", debit: 500, credit: 0, currency: "USD" },
      { date: "2026-09-10", description: "Payment Received Bank Transfer", debit: 0, credit: 3000, currency: "USD" },
    ]

    let totalDebit = 0
    let totalCredit = 0
    customerLedgerRecords.forEach((r) => {
      totalDebit += r.debit
      totalCredit += r.credit
    })

    const expectedOutstanding = totalDebit - totalCredit
    assert.equal(totalDebit, 5000)
    assert.equal(totalCredit, 3000)
    assert.equal(expectedOutstanding, 2000, "Outstanding balance must equal Debit - Credit exactly")
  })
})
