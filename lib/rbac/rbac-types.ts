export type StaffRole =
  | "superadmin"
  | "admin"
  | "management"
  | "operations"
  | "accounting"
  | "accountant" // Legacy alias
  | "documents"
  | "tracking"
  | "data_entry"
  | "viewer"
  | "client"
  | "shipper" // Legacy alias

export type UserStatus = "active" | "inactive" | "suspended" | "locked" | "pending" | "disabled"

export type Department =
  | "Management"
  | "Operations"
  | "Accounting"
  | "Documents"
  | "Tracking"
  | "Administration"
  | "Logistics"
  | "General"

export type BranchOffice =
  | "Main Headquarters (Kabul)"
  | "Kandahar Office"
  | "Bandar Abbas Office"
  | "Dubai Hub Office"
  | "Herat / Islam Qala Border"
  | "Mazar / Hairatan Border"
  | "All Branches"

export type PermissionCategory =
  | "BOL"
  | "SHIPMENTS"
  | "TRACKING"
  | "DOCUMENTS"
  | "ACCOUNTING"
  | "LEDGERS"
  | "CUSTOMERS"
  | "SUPPLIERS"
  | "PAYMENTS"
  | "SUPPLIER_COSTS"
  | "SUPPLIER_PAYMENTS"
  | "PROFITABILITY"
  | "IMPORT_EXPORT"
  | "BACKUP"
  | "CLIENT_PORTAL"
  | "USERS"
  | "SETTINGS"
  | "MANAGEMENT_REPORTS"
  | "COMMUNICATIONS"
  | "ANALYTICS"

export interface PermissionItem {
  id: string
  permission_key: string
  name: string
  nameFa?: string
  description: string
  category: PermissionCategory
  created_at?: string
}

export interface RoleDefinition {
  id: string
  name: string
  nameFa?: string
  description: string
  system_role: boolean
  active: boolean
  created_at: string
  updated_at: string
  permissions: string[]
}

export interface UserPermissionOverride {
  permission_key: string
  allowed: boolean
  granted_by: string
  granted_at: string
  reason?: string
}

export interface ExtendedUser {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  role: StaffRole
  role_id?: string
  department?: string
  branch?: string
  status: UserStatus
  password?: string
  avatar?: string
  clientId?: string
  clientName?: string
  permissions_override?: UserPermissionOverride[]
  last_login?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}
export type User = ExtendedUser

export type ApprovalActionType =
  | "supplier_payment_post"
  | "customer_payment_confirm"
  | "customer_payment_reversal"
  | "customer_invoice_post"
  | "ledger_adjustment_post"
  | "supplier_bill_post"
  | "cost_adjustment"
  | "credit_note_post"
  | "debit_note_post"
  | "account_merge"
  | "bol_financial_reversal"
  | "backup_restore"
  | "document_issue"

export interface ApprovalRule {
  id: string
  action_type: ApprovalActionType
  name: string
  description: string
  min_amount: number
  currency: "USD" | "AED" | "AFN" | "ANY"
  requester_roles: string[]
  approver_roles: string[]
  approvals_required: number
  allow_self_approval: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export type ApprovalStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"

export interface ApprovalRequest {
  id: string
  request_type: ApprovalActionType
  entity_type: string
  entity_id: string
  entity_ref?: string
  requested_by: string
  requested_by_name: string
  requested_at: string
  amount: number
  currency: string
  reason: string
  status: ApprovalStatus
  current_step: number
  required_steps: number
  completed_at?: string
  payload_snapshot?: string
  invalidation_reason?: string
}

export interface ApprovalAction {
  id: string
  approval_request_id: string
  step: number
  action: "APPROVE" | "REJECT" | "RETURN_FOR_CORRECTION" | "CANCEL"
  user_id: string
  user_name: string
  comment: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  user_name: string
  action: string
  entity_type: string
  entity_id: string
  description: string
  old_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  metadata?: {
    ip?: string
    userAgent?: string
    branch?: string
    department?: string
  }
  created_at: string
}
