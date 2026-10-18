const assert = require("assert")

const loadTypescript = require("./load-typescript.cjs")

// Import RBAC modules
const {
  getUserPermissions,
  hasPermission,
  requirePermission,
  canViewProfit,
  canViewCosts,
  filterFinancials,
  validateSuperAdminProtection,
  saveRole,
  cloneRole,
  getStoredRoles,
} = loadTypescript("lib/rbac/rbac-service.ts")

const {
  checkApprovalRequirement,
  createApprovalRequest,
  processApprovalAction,
  invalidateApprovalIfModified,
  getApprovalRules,
  saveApprovalRule,
} = loadTypescript("lib/rbac/approval-service.ts")

const {
  logAuditEvent,
  getAuditLogs,
  exportAuditLogsToCsv,
} = loadTypescript("lib/rbac/audit-service.ts")

console.log("==========================================================")
console.log("🔒 RUNNING RBAC, STAFF PERMISSIONS & APPROVAL WORKFLOW TESTS")
console.log("==========================================================")

// -------------------------------------------------------------
// Test 1: Operations User Permissions
// -------------------------------------------------------------
const opsUser = {
  id: "u-ops-1",
  name: "Farhad Operations",
  username: "farhad.ops",
  role: "operations",
  status: "active",
}

assert.strictEqual(hasPermission(opsUser, "bol_create"), true, "Ops should be able to create BOL")
assert.strictEqual(hasPermission(opsUser, "bol_edit"), true, "Ops should be able to edit BOL")
assert.strictEqual(hasPermission(opsUser, "tracking_update"), true, "Ops should be able to update tracking")
assert.strictEqual(hasPermission(opsUser, "payment_confirm"), false, "Ops must NOT be able to confirm customer payments")
assert.strictEqual(hasPermission(opsUser, "supplier_payment_post"), false, "Ops must NOT be able to post supplier payments")
assert.strictEqual(canViewProfit(opsUser), false, "Ops must NOT be able to see company profit")
console.log("✅ Test 1 Passed: Operations role permissions are strictly partitioned.")

// -------------------------------------------------------------
// Test 2: Accounting User Permissions
// -------------------------------------------------------------
const accUser = {
  id: "u-acc-1",
  name: "Mustafa Accountant",
  username: "mustafa.acc",
  role: "accounting",
  status: "active",
}

assert.strictEqual(hasPermission(accUser, "ledger_view"), true, "Accounting can view ledgers")
assert.strictEqual(hasPermission(accUser, "accounting_post_transaction"), true, "Accounting can post transactions")
assert.strictEqual(hasPermission(accUser, "payment_confirm"), true, "Accounting can confirm customer payments")
assert.strictEqual(hasPermission(accUser, "cost_post"), true, "Accounting can post supplier costs")
assert.strictEqual(hasPermission(accUser, "tracking_update"), false, "Accounting cannot edit operational tracking")
console.log("✅ Test 2 Passed: Accounting role has full ledger control without operational contamination.")

// -------------------------------------------------------------
// Test 3: Documents User Permissions
// -------------------------------------------------------------
const docUser = {
  id: "u-doc-1",
  name: "Zahra Docs",
  username: "zahra.docs",
  role: "documents",
  status: "active",
}

assert.strictEqual(hasPermission(docUser, "documents_create"), true, "Docs specialist can create trade paperwork")
assert.strictEqual(hasPermission(docUser, "documents_issue"), true, "Docs specialist can issue official paperwork")
assert.strictEqual(hasPermission(docUser, "accounting_post_transaction"), false, "Docs staff cannot post ledger transactions")
assert.strictEqual(canViewProfit(docUser), false, "Docs staff cannot view company profit")
console.log("✅ Test 3 Passed: Documents role controls paperwork but is gated from finance & profit.")

// -------------------------------------------------------------
// Test 4: Management User Permissions
// -------------------------------------------------------------
const mgmtUser = {
  id: "u-mgmt-1",
  name: "Executive Director",
  username: "director",
  role: "management",
  status: "active",
}

assert.strictEqual(hasPermission(mgmtUser, "management_profit_report"), true, "Management can view executive P&L")
assert.strictEqual(canViewProfit(mgmtUser), true, "Management can view gross & net profit")
assert.strictEqual(hasPermission(mgmtUser, "cost_approve"), true, "Management can approve supplier costs")
assert.strictEqual(hasPermission(mgmtUser, "supplier_payment_approve"), true, "Management can approve supplier payouts")
console.log("✅ Test 4 Passed: Management has executive oversight and approval authority.")

// -------------------------------------------------------------
// Test 5: Viewer User Read-Only Enforcement
// -------------------------------------------------------------
const viewerUser = {
  id: "u-view-1",
  name: "Auditor Viewer",
  username: "auditor",
  role: "viewer",
  status: "active",
}

assert.strictEqual(hasPermission(viewerUser, "bol_view"), true, "Viewer can view BOLs")
assert.strictEqual(hasPermission(viewerUser, "bol_create"), false, "Viewer cannot create BOL")
assert.strictEqual(hasPermission(viewerUser, "bol_edit"), false, "Viewer cannot edit BOL")
assert.strictEqual(hasPermission(viewerUser, "accounting_post_transaction"), false, "Viewer cannot post accounting")
console.log("✅ Test 5 Passed: Viewer role is strictly read-only.")

// -------------------------------------------------------------
// Test 6: Direct API Permission Check (requirePermission)
// -------------------------------------------------------------
assert.throws(
  () => {
    requirePermission(opsUser, "supplier_payment_post")
  },
  /Access Denied/i,
  "Direct API call without permission must throw Access Denied exception"
)
console.log("✅ Test 6 Passed: Unauthorized direct API operations are blocked with 403 Access Denied.")

// -------------------------------------------------------------
// Test 7: Server-Side Data Sanitization (Prevent Profit Leaks)
// -------------------------------------------------------------
const fullShipmentPayload = {
  id: "shp-101",
  bolNumber: "SKY-2026-0891",
  customerRevenue: 15000,
  grossProfit: 3500,
  netProfit: 3100,
  marginPercent: 23.3,
  markup: 30.4,
  supplierCosts: [
    { supplierName: "Maersk Line", amount: 9500, costType: "Ocean Freight" },
    { supplierName: "Afghan Transit Driver", amount: 2000, costType: "Border Transit" },
  ],
  status: "IN_TRANSIT",
}

// User without profit permission:
const sanitizedForOps = filterFinancials(opsUser, fullShipmentPayload)
assert.strictEqual(sanitizedForOps.grossProfit, undefined, "grossProfit must be stripped from response")
assert.strictEqual(sanitizedForOps.netProfit, undefined, "netProfit must be stripped from response")
assert.strictEqual(sanitizedForOps.marginPercent, undefined, "marginPercent must be stripped from response")
assert.strictEqual(sanitizedForOps.supplierCosts, undefined, "supplierCosts must be stripped for non-cost role")
assert.strictEqual(sanitizedForOps.bolNumber, "SKY-2026-0891", "Operational fields remain intact")

// Management user:
const sanitizedForMgmt = filterFinancials(mgmtUser, fullShipmentPayload)
assert.strictEqual(sanitizedForMgmt.grossProfit, 3500, "Management receives complete profit figures")
assert.strictEqual(sanitizedForMgmt.supplierCosts.length, 2, "Management receives supplier cost breakdowns")
console.log("✅ Test 7 Passed: Financial data leaks are eliminated via server-side payload sanitization.")

// -------------------------------------------------------------
// Test 8: Approval Requirement on High-Value Transactions
// -------------------------------------------------------------
// $15,000 USD Supplier payment -> Exceeds $10,000 threshold
const reqHigh = checkApprovalRequirement("supplier_payment_post", 15000, "USD", "accounting")
assert.strictEqual(reqHigh.requiresApproval, true, "15,000 USD supplier payment must require approval")

// $4,000 USD Supplier payment -> Below $10,000 threshold
const reqLow = checkApprovalRequirement("supplier_payment_post", 4000, "USD", "accounting")
assert.strictEqual(reqLow.requiresApproval, false, "4,000 USD supplier payment does not require approval")

// Multi-Currency AED threshold: 36,700 AED
const reqAedHigh = checkApprovalRequirement("supplier_payment_post", 50000, "AED", "accounting")
assert.strictEqual(reqAedHigh.requiresApproval, true, "50,000 AED payment must require approval")
const reqAedLow = checkApprovalRequirement("supplier_payment_post", 20000, "AED", "accounting")
assert.strictEqual(reqAedLow.requiresApproval, false, "20,000 AED payment does not require approval")

// Multi-Currency AFN threshold: 500,000 AFN
const reqAfnHigh = checkApprovalRequirement("supplier_payment_post", 750000, "AFN", "accounting")
assert.strictEqual(reqAfnHigh.requiresApproval, true, "750,000 AFN payment must require approval")
console.log("✅ Test 8 Passed: Multi-currency approval thresholds (USD, AED, AFN) evaluate accurately.")

// -------------------------------------------------------------
// Test 9: Create Approval Request (Zero Posting Before Approval)
// -------------------------------------------------------------
const creationResult = createApprovalRequest({
  requestType: "supplier_payment_post",
  entityType: "supplier_payment",
  entityId: "spay-991",
  entityRef: "BILL-2026-44",
  requestedBy: "u-acc-1",
  requestedByName: "Mustafa Accountant",
  amount: 15000,
  currency: "USD",
  reason: "Container ocean freight payment to Maersk",
  payload: { amount: 15000, currency: "USD", supplier: "Maersk Line" },
  requesterRole: "accounting",
})

assert.strictEqual(creationResult.requiresApproval, true)
assert.strictEqual(creationResult.request.status, "PENDING", "Status must remain PENDING without posting")
const createdRequestId = creationResult.request.id
console.log("✅ Test 9 Passed: Approval request created with PENDING status (zero financial posting).")

// -------------------------------------------------------------
// Test 10: Four-Eyes Principle / Self-Approval Prevention
// -------------------------------------------------------------
// Requester (Mustafa) attempts to approve his own payment request:
assert.throws(
  () => {
    processApprovalAction({
      requestId: createdRequestId,
      userId: "u-acc-1", // Mustafa (the requester)
      userName: "Mustafa Accountant",
      userRole: "management", // even if pretending to be management
      action: "APPROVE",
      comment: "Self approving",
    })
  },
  /Self-approval is prohibited/i,
  "Self-approval of sensitive financial records must be blocked"
)
console.log("✅ Test 10 Passed: Four-Eyes Principle strictly prevents self-approval of financial disbursements.")

// -------------------------------------------------------------
// Test 11: Authorized Manager Approval
// -------------------------------------------------------------
const approvalResult = processApprovalAction({
  requestId: createdRequestId,
  userId: "u-mgmt-1", // Executive Director
  userName: "Executive Director",
  userRole: "management",
  action: "APPROVE",
  comment: "Approved - shipping invoice verified against manifest",
})

assert.strictEqual(approvalResult.success, true)
assert.strictEqual(approvalResult.request.status, "APPROVED")
console.log("✅ Test 11 Passed: Authorized manager successfully approves transaction.")

// -------------------------------------------------------------
// Test 12: Material Modification Invalidates Previous Approval
// -------------------------------------------------------------
// Payment was approved for 15,000 USD. If someone alters the payload to 18,000 USD:
const modifiedPayload = { amount: 18000, currency: "USD", supplier: "Maersk Line" }
const wasInvalidated = invalidateApprovalIfModified("spay-991", modifiedPayload, "u-ops-1", "Farhad Ops")
assert.strictEqual(wasInvalidated, true, "Material edit must invalidate prior approval")
console.log("✅ Test 12 Passed: Modifying approved records automatically voids approval and requires resubmission.")

// -------------------------------------------------------------
// Test 13: Last Super Admin Protection
// -------------------------------------------------------------
const userList = [
  { id: "u-super-1", name: "Root Superadmin", username: "superadmin", role: "superadmin", status: "active" },
  { id: "u-ops-1", name: "Farhad Operations", username: "farhad.ops", role: "operations", status: "active" },
]

// Attempting to demote the only superadmin:
assert.throws(
  () => {
    validateSuperAdminProtection(userList, "u-super-1", "operations")
  },
  /Cannot demote, deactivate, or delete the last remaining active Super Admin/i
)

// Attempting to deactivate the only superadmin:
assert.throws(
  () => {
    validateSuperAdminProtection(userList, "u-super-1", undefined, "disabled")
  },
  /Cannot demote, deactivate, or delete the last remaining active Super Admin/i
)
console.log("✅ Test 13 Passed: Super Admin lockout protection strictly prevents deleting or demoting final admin.")

// -------------------------------------------------------------
// Test 14: User-Specific Permission Overrides
// -------------------------------------------------------------
// Operations user Farhad normally cannot record supplier payment.
// Let's add a specific override to grant him 'supplier_payment_create':
const farhadWithOverride = {
  ...opsUser,
  permissions_override: [
    {
      permission_key: "supplier_payment_create",
      allowed: true,
      granted_by: "u-super-1",
      granted_at: new Date().toISOString(),
      reason: "Temporary weekend disbursement coverage",
    },
  ],
}

assert.strictEqual(hasPermission(farhadWithOverride, "supplier_payment_create"), true, "Override must grant permission")
assert.strictEqual(hasPermission(farhadWithOverride, "supplier_payment_post"), false, "Other permissions remain intact")
console.log("✅ Test 14 Passed: User-specific permission overrides grant audited exceptions seamlessly.")

// -------------------------------------------------------------
// Test 15: Immutable Audit Logging & Secret Sanitization
// -------------------------------------------------------------
const audit = logAuditEvent({
  userId: "u-acc-1",
  userName: "Mustafa Accountant",
  action: "PAYMENT_RECORDED",
  entityType: "payment",
  entityId: "pay-501",
  description: "Recorded client wire payment of $5,000",
  oldValues: null,
  newValues: {
    amount: 5000,
    currency: "USD",
    password: "super_secret_password_do_not_log",
    apiToken: "sk-live-9999999999",
  },
})

assert.strictEqual(audit.new_values.password, "[REDACTED]", "Passwords must be redacted from audit log")
assert.strictEqual(audit.new_values.apiToken, "[REDACTED]", "API tokens must be redacted from audit log")
assert.strictEqual(audit.new_values.amount, 5000, "Non-sensitive data is preserved")

const csv = exportAuditLogsToCsv([audit])
assert(csv.includes("PAYMENT_RECORDED"), "CSV must include logged action")
assert(csv.includes("Mustafa Accountant"), "CSV must include user name")
console.log("✅ Test 15 Passed: Audit log immutably records actions with strict credential redaction & CSV export.")

console.log("==========================================================")
console.log("🏁 ALL 15/15 RBAC & APPROVAL TEST SUITES PASSED SUCCESSFULLY")
console.log("==========================================================")
