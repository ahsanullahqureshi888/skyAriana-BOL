export interface InvoiceParty {
  companyName: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  licenseNumber?: string;
  contactId?: number;
  partyId?: number;
  addressLine1?: string;
  addressLine2?: string;
  altPhone?: string;
  website?: string;
  gstVatTrn?: string;
  importLicence?: string;
  gstin?: string;
  iec?: string;
  pan?: string;
  fssai?: string;
  tin?: string;
  trn?: string;
  stateCode?: string;
  identifiers?: Record<string, string>;
  accountNumber?: string;
  bankName?: string;
  iban?: string;
  swiftCode?: string;
  routingCode?: string;
  bankAddress?: string;
  notes?: string;
  instructions?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
  avatar_url?: string;
  employee_id?: string;
  job_title?: string;
  department?: string;
  role_name?: string;
  role_id?: number;
  status?: 'active' | 'suspended' | 'pending' | 'inactive' | 'locked' | string;
  language?: string;
  timezone?: string;
  must_change_password?: boolean;
  failed_login_attempts?: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  password_changed_at?: string | null;
  updated_at?: string | null;
  permissions?: string[];
}

export interface ManagedUser extends User {
  active_sessions?: number;
}

export interface UserListResponse {
  items: ManagedUser[];
  total: number;
  page: number;
  page_size: number;
  summary: {
    total_users: number;
    active_users: number;
    suspended_users: number;
    pending_invitations: number;
    active_sessions: number;
  };
  current_user_permissions: string[];
}

export interface RoleDefinition {
  id: number;
  name: string;
  description?: string | null;
  is_system_role: boolean;
  user_count: number;
  permission_count: number;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface PermissionDefinition {
  id: number;
  key: string;
  module: string;
  action: string;
  description?: string | null;
}

export interface UserSession {
  id: number;
  user_id: number;
  user_name?: string | null;
  username?: string | null;
  device?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  ip_address?: string | null;
  approximate_location?: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  revoked_at?: string | null;
  is_current: boolean;
}

export interface LoginActivityEntry {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  email_attempted?: string | null;
  result: string;
  failure_reason?: string | null;
  ip_address?: string | null;
  device?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  approximate_location?: string | null;
  created_at: string;
}

export interface SecuritySettings {
  id: number;
  minimum_password_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
  password_expiration_days: number;
  password_history_count: number;
  failed_login_limit: number;
  lock_duration_minutes: number;
  session_timeout_minutes: number;
  require_password_change_on_first_login: boolean;
  require_two_factor: boolean;
  two_factor_roles: string[];
  allow_multiple_sessions: boolean;
  invitation_expiration_hours: number;
  password_reset_expiration_minutes: number;
  login_notification: boolean;
  new_device_notification: boolean;
  updated_at: string;
}

export interface CompanySettings {
  id: number;
  company_name: string;
  subtitle: string;
  logo_path?: string;
  signature_path?: string;
  stamp_path?: string;
  watermark_enabled: boolean;
  default_invoice_template: InvoiceTemplateId;
  invoice_watermark_enabled: boolean;
  invoice_watermark_opacity: number;
  invoice_qr_enabled: boolean;
  invoice_seal_enabled: boolean;
  invoice_signature_enabled: boolean;
  invoice_stamp_enabled: boolean;
  invoice_color_printing_enabled: boolean;
  invoice_compact_layout_enabled: boolean;
  addresses?: any;
  licence_number?: string;
  phones?: any;
  emails?: any;
  website?: string;
  bank_details?: any;
  default_currency: string;
  default_language: string;
}

export type CompanyBranding = Pick<CompanySettings, 'company_name' | 'subtitle' | 'logo_path'>;

export type InvoiceTemplateId = 'premium_afghan_heritage' | 'premium_afghan_glass' | 'classic_afghan_blue_gold';

export interface Customer {
  id: number;
  company_name: string;
  contact_person?: string;
  address?: string;
  country?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  contact_type: 'shipper' | 'consignee' | 'notify' | 'general';
  additional_details?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BusinessParty {
  id: number;
  party_type: 'shipper' | 'notify_party' | 'consignee' | 'importer' | 'customer' | 'multi_role' | string;
  canonical_name: string;
  display_name: string;
  normalized_name: string;
  roles?: string[];
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  phone?: string | null;
  alternate_phones?: string[];
  email?: string | null;
  alternate_emails?: string[];
  trade_license_number?: string | null;
  tax_identification_number?: string | null;
  trn?: string | null;
  registration_number?: string | null;
  contact_person?: string | null;
  business_type?: string | null;
  website?: string | null;
  gstin?: string | null;
  iec?: string | null;
  pan?: string | null;
  fssai?: string | null;
  tin?: string | null;
  state_code?: string | null;
  identifiers?: Record<string, string>;
  identifier_provenance?: Array<Record<string, unknown>>;
  field_provenance?: Record<string, Record<string, unknown>>;
  bank_details?: Record<string, string | null>;
  notes?: string | null;
  aliases?: string[];
  alternate_addresses?: string[];
  source_name?: string | null;
  source_pages?: number[];
  source_references?: string[];
  source_raw_text?: string | null;
  source_entries?: Array<Record<string, unknown>>;
  review_status?: 'verified_source' | 'needs_review' | 'reviewed' | string;
  import_batch_id?: string | null;
  review_flags?: string[];
  is_active: boolean;
  is_archived: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  hs_code?: string;
  default_unit: string;
  default_price: number;
}

export interface InvoiceItem {
  id?: number;
  local_id?: string;
  product_catalog_id?: string;
  product_name?: string;
  product_variety?: string;
  product_grade?: string;
  custom_grade?: string;
  description: string;
  hs_code?: string;
  quantity: number | string;
  unit: string;
  quantity_unit?: string;
  package_count?: number | string;
  package_type?: string;
  net_weight?: number | string;
  gross_weight?: number | string;
  weight_unit?: string;
  unit_price: number | string;
  currency?: string;
  price_basis?: string;
  country_of_origin?: string;
  lot_batch_number?: string;
  remarks?: string;
  amount?: number;
  sort_order: number;
}

export interface ShipmentDetails {
  booking_number?: string;
  bill_of_lading_number?: string;
  container_number?: string;
  container_type?: string;
  seal_number?: string;
  commodity?: string;
  gross_weight?: number;
  net_weight?: number;
  package_count?: number;
  package_type?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  vessel_name?: string;
  voyage_number?: string;
  shipping_line?: string;
  incoterms?: string;
  etd?: string;
  eta?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_id: number;
  currency: string;
  status: string;
  invoice_template: InvoiceTemplateId;
  subtotal: number;
  freight: number;
  insurance: number;
  other_charges: number;
  discount: number;
  tax: number;
  documentationFees: number;
  customsClearanceFees: number;
  grand_total: number;
  paid_amount: number;
  remaining_balance: number;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  
  customer: Customer;
  items: InvoiceItem[];
  shipment_details?: ShipmentDetails;
  notifyParty?: InvoiceParty;
  shipperExporter?: InvoiceParty;
  consigneeBuyer?: InvoiceParty;
  notifyPartyEnabled?: boolean;
  notifyPartySameAsConsignee?: boolean;
  notifyPartyCustomerId?: number | null;
  shipperPartyId?: number | null;
  notifyPartyId?: number | null;
  consigneePartyId?: number | null;
}

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  status: string;
  invoice_template: InvoiceTemplateId;
  grand_total: number;
  paid_amount: number;
  remaining_balance: number;
  customer_name: string;
  created_by_name: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}

export interface DashboardSummary {
  total_invoices: number;
  paid_invoices: number;
  unpaid_invoices: number;
  partial_invoices: number;
  overdue_invoices: number;
  total_amount: number;
  amount_received: number;
  outstanding_balance: number;
}

export interface MonthlyTotal {
  month: string;
  total: number;
  received: number;
}

export interface DashboardRecentActivity {
  latest_invoices: InvoiceListItem[];
  latest_customers: Customer[];
  recent_payments: Payment[];
  recent_logs: ActivityLog[];
}
