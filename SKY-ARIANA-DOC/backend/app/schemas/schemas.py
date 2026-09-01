from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import List, Optional, Any, Literal
from datetime import datetime, date
from decimal import Decimal
from app.services.invoice_party import normalize_party_snapshot

InvoiceTemplateId = Literal["premium_afghan_heritage", "premium_afghan_glass", "classic_afghan_blue_gold"]

# User schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "Viewer"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    employee_id: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    role_name: Optional[str] = None
    role_id: Optional[int] = None
    status: str = "active"
    language: str = "en"
    timezone: str = "Asia/Kabul"
    must_change_password: bool = False
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    password_changed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    permissions: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True

# Token schemas
class UserLogin(BaseModel):
    username: str  # EmailStr as username for OAuth2 Compatibility
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None


class UserManagementCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    display_name: Optional[str] = Field(default=None, max_length=160)
    username: Optional[str] = Field(default=None, min_length=3, max_length=80)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=40)
    employee_id: Optional[str] = Field(default=None, max_length=80)
    job_title: Optional[str] = Field(default=None, max_length=120)
    department: Optional[str] = Field(default=None, max_length=120)
    role: str = "Viewer"
    status: Literal["active", "suspended", "pending"] = "active"
    language: str = "en"
    timezone: str = "Asia/Kabul"
    password: Optional[str] = None
    generate_temporary_password: bool = True
    send_invitation: bool = False
    require_password_change: bool = True
    custom_permissions: List[str] = Field(default_factory=list)


class UserManagementUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    display_name: Optional[str] = Field(default=None, max_length=160)
    username: Optional[str] = Field(default=None, min_length=3, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=40)
    employee_id: Optional[str] = Field(default=None, max_length=80)
    job_title: Optional[str] = Field(default=None, max_length=120)
    department: Optional[str] = Field(default=None, max_length=120)
    role: Optional[str] = None
    status: Optional[Literal["active", "suspended", "pending", "inactive"]] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    require_password_change: Optional[bool] = None
    custom_permissions: Optional[List[str]] = None


class ChangeRoleRequest(BaseModel):
    role: str = Field(min_length=2, max_length=80)


class PermissionUpdateRequest(BaseModel):
    permissions: List[str] = Field(default_factory=list)
    allowed: bool = True


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_system_role: bool
    user_count: int = 0
    permission_count: int = 0
    permissions: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)
    permissions: List[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)
    permissions: Optional[List[str]] = None


class PermissionOut(BaseModel):
    id: int
    key: str
    module: str
    action: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    username: Optional[str] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    operating_system: Optional[str] = None
    ip_address: Optional[str] = None
    approximate_location: Optional[str] = None
    created_at: datetime
    last_active_at: datetime
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    is_current: bool = False


class LoginActivityOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    email_attempted: Optional[str] = None
    result: str
    failure_reason: Optional[str] = None
    ip_address: Optional[str] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    operating_system: Optional[str] = None
    approximate_location: Optional[str] = None
    created_at: datetime


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=1)
    confirm_password: str = Field(min_length=1)
    revoke_other_sessions: bool = True


class AdminPasswordResetRequest(BaseModel):
    new_password: Optional[str] = None
    generate_temporary_password: bool = True
    require_password_change: bool = True
    revoke_sessions: bool = True


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20)
    new_password: str = Field(min_length=1)
    confirm_password: str = Field(min_length=1)


class SecuritySettingsBase(BaseModel):
    minimum_password_length: int = Field(default=10, ge=8, le=128)
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_number: bool = True
    require_special: bool = True
    password_expiration_days: int = Field(default=0, ge=0, le=3650)
    password_history_count: int = Field(default=5, ge=0, le=20)
    failed_login_limit: int = Field(default=5, ge=3, le=20)
    lock_duration_minutes: int = Field(default=15, ge=1, le=1440)
    session_timeout_minutes: int = Field(default=480, ge=15, le=43200)
    require_password_change_on_first_login: bool = True
    require_two_factor: bool = False
    two_factor_roles: List[str] = Field(default_factory=list)
    allow_multiple_sessions: bool = True
    invitation_expiration_hours: int = Field(default=72, ge=1, le=720)
    password_reset_expiration_minutes: int = Field(default=30, ge=5, le=1440)
    login_notification: bool = True
    new_device_notification: bool = True


class SecuritySettingsOut(SecuritySettingsBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

# CompanySettings schemas
class CompanySettingsBase(BaseModel):
    company_name: str = "SKY ARIANA GROUP OF COMPANIES"
    subtitle: str = "IMPORT • EXPORT • LOGISTICS • CARGO • FREIGHT"
    watermark_enabled: bool = True
    default_invoice_template: InvoiceTemplateId = "premium_afghan_glass"
    invoice_watermark_enabled: bool = True
    invoice_watermark_opacity: float = Field(default=0.06, ge=0, le=0.2)
    invoice_qr_enabled: bool = True
    invoice_seal_enabled: bool = True
    invoice_signature_enabled: bool = True
    invoice_stamp_enabled: bool = True
    invoice_color_printing_enabled: bool = True
    invoice_compact_layout_enabled: bool = False
    addresses: Optional[Any] = None
    licence_number: Optional[str] = None
    phones: Optional[Any] = None
    emails: Optional[Any] = None
    website: Optional[str] = None
    bank_details: Optional[Any] = None
    default_currency: str = "USD"
    default_language: str = "en"

class CompanySettingsOut(CompanySettingsBase):
    id: int
    logo_path: Optional[str] = None
    signature_path: Optional[str] = None
    stamp_path: Optional[str] = None

    class Config:
        from_attributes = True

class CompanyBrandingOut(BaseModel):
    company_name: str
    subtitle: str
    logo_path: Optional[str] = None

    class Config:
        from_attributes = True

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    subtitle: Optional[str] = None
    watermark_enabled: Optional[bool] = None
    default_invoice_template: Optional[InvoiceTemplateId] = None
    invoice_watermark_enabled: Optional[bool] = None
    invoice_watermark_opacity: Optional[float] = Field(default=None, ge=0, le=0.2)
    invoice_qr_enabled: Optional[bool] = None
    invoice_seal_enabled: Optional[bool] = None
    invoice_signature_enabled: Optional[bool] = None
    invoice_stamp_enabled: Optional[bool] = None
    invoice_color_printing_enabled: Optional[bool] = None
    invoice_compact_layout_enabled: Optional[bool] = None
    addresses: Optional[Any] = None
    licence_number: Optional[str] = None
    phones: Optional[Any] = None
    emails: Optional[Any] = None
    website: Optional[str] = None
    bank_details: Optional[Any] = None
    default_currency: Optional[str] = None
    default_language: Optional[str] = None

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("Company name is required")
        if len(normalized) > 160:
            raise ValueError("Company name must be 160 characters or fewer")
        return normalized

# Notify Party Schema
class NotifyPartySchema(BaseModel):
    companyName: str = ""
    contactPerson: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    taxNumber: Optional[str] = None
    licenseNumber: Optional[str] = None
    contactId: Optional[int] = None
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    altPhone: Optional[str] = None
    website: Optional[str] = None
    gstVatTrn: Optional[str] = None
    importLicence: Optional[str] = None
    accountNumber: Optional[str] = None
    bankName: Optional[str] = None
    iban: Optional[str] = None
    swiftCode: Optional[str] = None
    routingCode: Optional[str] = None
    bankAddress: Optional[str] = None
    notes: Optional[str] = None
    instructions: Optional[str] = None

    class Config:
        populate_by_name = True

# Customer schemas
class CustomerBase(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    tax_number: Optional[str] = None
    contact_type: str = "consignee"
    additional_details: Optional[Any] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BusinessPartyBase(BaseModel):
    party_type: str = "customer"
    roles: List[str] = Field(default_factory=list)
    canonical_name: Optional[str] = None
    display_name: Optional[str] = None
    normalized_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state_region: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    phone: Optional[str] = None
    alternate_phones: List[str] = Field(default_factory=list)
    email: Optional[EmailStr] = None
    alternate_emails: List[str] = Field(default_factory=list)
    trade_license_number: Optional[str] = None
    tax_identification_number: Optional[str] = None
    trn: Optional[str] = None
    registration_number: Optional[str] = None
    contact_person: Optional[str] = None
    business_type: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    iec: Optional[str] = None
    pan: Optional[str] = None
    fssai: Optional[str] = None
    tin: Optional[str] = None
    state_code: Optional[str] = None
    identifiers: Optional[dict[str, str]] = None
    identifier_provenance: Optional[list[dict[str, Any]]] = None
    field_provenance: Optional[dict[str, Any]] = None
    bank_details: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    aliases: List[str] = Field(default_factory=list)
    alternate_addresses: List[str] = Field(default_factory=list)
    source_name: Optional[str] = None
    source_pages: List[int] = Field(default_factory=list)
    source_references: List[str] = Field(default_factory=list)
    source_raw_text: Optional[str] = None
    source_entries: List[dict[str, Any]] = Field(default_factory=list)
    review_status: Optional[str] = None
    import_batch_id: Optional[str] = None
    review_flags: List[str] = Field(default_factory=list)
    is_active: bool = True
    is_archived: bool = False

    @model_validator(mode="after")
    def require_name(self):
        if not (self.display_name or self.canonical_name):
            raise ValueError("Company name is required")
        return self

    class Config:
        populate_by_name = True


class BusinessPartyCreate(BusinessPartyBase):
    pass


class BusinessPartyUpdate(BaseModel):
    party_type: Optional[str] = None
    roles: Optional[List[str]] = None
    canonical_name: Optional[str] = None
    display_name: Optional[str] = None
    normalized_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state_region: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    phone: Optional[str] = None
    alternate_phones: Optional[List[str]] = None
    email: Optional[EmailStr] = None
    alternate_emails: Optional[List[str]] = None
    trade_license_number: Optional[str] = None
    tax_identification_number: Optional[str] = None
    trn: Optional[str] = None
    registration_number: Optional[str] = None
    contact_person: Optional[str] = None
    business_type: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    iec: Optional[str] = None
    pan: Optional[str] = None
    fssai: Optional[str] = None
    tin: Optional[str] = None
    state_code: Optional[str] = None
    identifiers: Optional[dict[str, str]] = None
    identifier_provenance: Optional[list[dict[str, Any]]] = None
    field_provenance: Optional[dict[str, Any]] = None
    bank_details: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    aliases: Optional[List[str]] = None
    alternate_addresses: Optional[List[str]] = None
    source_name: Optional[str] = None
    source_pages: Optional[List[int]] = None
    source_references: Optional[List[str]] = None
    source_raw_text: Optional[str] = None
    source_entries: Optional[List[dict[str, Any]]] = None
    review_status: Optional[str] = None
    import_batch_id: Optional[str] = None
    review_flags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class BusinessPartyOut(BusinessPartyBase):
    id: int
    normalized_name: str
    created_at: datetime
    created_by: Optional[int] = None
    updated_at: datetime
    updated_by: Optional[int] = None
    archived_at: Optional[datetime] = None
    archived_by: Optional[int] = None
    usage_count: int = 0

    class Config:
        from_attributes = True
        populate_by_name = True


class BusinessPartySummary(BaseModel):
    party_type: str
    total: int
    active: int
    archived: int
    used_in_invoices: int
    needs_review: int = 0

# Product schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    hs_code: Optional[str] = None
    default_unit: str = "PCS"
    default_price: Decimal = Decimal("0.00")

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int

    class Config:
        from_attributes = True

# InvoiceItem schemas
class InvoiceItemBase(BaseModel):
    description: str
    product_catalog_id: Optional[str] = None
    product_name: Optional[str] = None
    product_variety: Optional[str] = None
    product_grade: Optional[str] = None
    custom_grade: Optional[str] = None
    hs_code: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit: str = "PCS"
    quantity_unit: Optional[str] = None
    package_count: Decimal = Decimal("0")
    package_type: Optional[str] = None
    net_weight: Decimal = Decimal("0")
    gross_weight: Decimal = Decimal("0")
    weight_unit: str = "KG"
    unit_price: Decimal = Decimal("0.00")
    currency: Optional[str] = None
    price_basis: str = "Per KG"
    country_of_origin: Optional[str] = None
    lot_batch_number: Optional[str] = None
    remarks: Optional[str] = None
    sort_order: int = 0

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemOut(InvoiceItemBase):
    id: int
    invoice_id: int
    amount: Decimal

    class Config:
        from_attributes = True

# ShipmentDetails schemas
class ShipmentDetailsBase(BaseModel):
    booking_number: Optional[str] = None
    bill_of_lading_number: Optional[str] = None
    container_number: Optional[str] = None
    container_type: Optional[str] = None
    seal_number: Optional[str] = None
    commodity: Optional[str] = None
    gross_weight: Optional[Decimal] = None
    net_weight: Optional[Decimal] = None
    package_count: Optional[int] = None
    package_type: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_number: Optional[str] = None
    shipping_line: Optional[str] = None
    incoterms: Optional[str] = None
    etd: Optional[date] = None
    eta: Optional[date] = None

class ShipmentDetailsCreate(ShipmentDetailsBase):
    pass

class ShipmentDetailsOut(ShipmentDetailsBase):
    invoice_id: int

    class Config:
        from_attributes = True

# Invoice schemas
class InvoiceBase(BaseModel):
    invoice_number: str
    invoice_date: date
    due_date: date
    customer_id: int
    currency: str = "USD"
    status: str = "unpaid"
    invoice_template: InvoiceTemplateId = "premium_afghan_glass"
    notes: Optional[str] = None
    notify_party: Optional[NotifyPartySchema] = Field(default=None, alias="notifyParty")
    shipper_exporter: Optional[NotifyPartySchema] = Field(default=None, alias="shipperExporter")
    consignee_buyer: Optional[NotifyPartySchema] = Field(default=None, alias="consigneeBuyer")
    notify_party_enabled: bool = Field(default=False, alias="notifyPartyEnabled")
    notify_party_same_as_consignee: bool = Field(default=False, alias="notifyPartySameAsConsignee")
    notify_party_customer_id: Optional[int] = Field(default=None, alias="notifyPartyCustomerId")
    shipper_party_id: Optional[int] = Field(default=None, alias="shipperPartyId")
    notify_party_id: Optional[int] = Field(default=None, alias="notifyPartyId")
    consignee_party_id: Optional[int] = Field(default=None, alias="consigneePartyId")

    @field_validator("customer_id", mode="before")
    @classmethod
    def normalize_customer_id(cls, value):
        if value is None or value == "" or value == "NaN" or value == "null":
            return 1
        try:
            val = int(value)
            return val if val > 0 else 1
        except (ValueError, TypeError):
            return 1

    @field_validator("invoice_date", "due_date", mode="before")
    @classmethod
    def normalize_invoice_dates(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return date.today()
        if isinstance(value, str):
            val_str = value.strip()
            if len(val_str) >= 10 and val_str[:10].count("-") == 2:
                try:
                    return date.fromisoformat(val_str[:10])
                except ValueError:
                    pass
        return value

    @field_validator("notify_party", mode="before")
    @classmethod
    def normalize_notify_party(cls, value):
        return normalize_party_snapshot(value)

    @field_validator("shipper_exporter", "consignee_buyer", mode="before")
    @classmethod
    def normalize_invoice_party_snapshots(cls, value):
        return normalize_party_snapshot(value, strip_stale_notify_fragment=True)

    @model_validator(mode="after")
    def keep_notify_flags_consistent(self):
        if self.notify_party is None:
            self.notify_party_enabled = False
            self.notify_party_same_as_consignee = False
            self.notify_party_customer_id = None
        else:
            self.notify_party_enabled = True
        return self

    class Config:
        populate_by_name = True

class InvoiceCreate(InvoiceBase):
    # The UI intentionally leaves this blank for automatic numbering. The
    # create endpoint fills it before the model is persisted.
    invoice_number: Optional[str] = None
    items: List[InvoiceItemCreate]
    shipment_details: Optional[ShipmentDetailsCreate] = None

    @field_validator("invoice_number", mode="before")
    @classmethod
    def normalize_invoice_number(cls, value):
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None
    
    # Financial fields are optional on create since we recalculate them server-side
    freight: Optional[Decimal] = Decimal("0.00")
    freight_rate: Optional[Decimal] = Decimal("0.00")
    insurance: Optional[Decimal] = Decimal("0.00")
    other_charges: Optional[Decimal] = Decimal("0.00")
    discount: Optional[Decimal] = Decimal("0.00")
    tax: Optional[Decimal] = Decimal("0.00")
    documentation_fees: Optional[Decimal] = Field(default=Decimal("0.00"), alias="documentationFees")
    customs_clearance_fees: Optional[Decimal] = Field(default=Decimal("0.00"), alias="customsClearanceFees")

class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    customer_id: Optional[int] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    invoice_template: Optional[InvoiceTemplateId] = None
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None
    shipment_details: Optional[ShipmentDetailsCreate] = None

    @field_validator("invoice_date", "due_date", mode="before")
    @classmethod
    def normalize_update_dates(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        if isinstance(value, str):
            val_str = value.strip()
            if len(val_str) >= 10 and val_str[:10].count("-") == 2:
                try:
                    return date.fromisoformat(val_str[:10])
                except ValueError:
                    pass
        return value
    
    freight: Optional[Decimal] = None
    freight_rate: Optional[Decimal] = None
    insurance: Optional[Decimal] = None
    other_charges: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    documentation_fees: Optional[Decimal] = Field(default=None, alias="documentationFees")
    customs_clearance_fees: Optional[Decimal] = Field(default=None, alias="customsClearanceFees")
    notify_party: Optional[NotifyPartySchema] = Field(default=None, alias="notifyParty")
    shipper_exporter: Optional[NotifyPartySchema] = Field(default=None, alias="shipperExporter")
    consignee_buyer: Optional[NotifyPartySchema] = Field(default=None, alias="consigneeBuyer")
    notify_party_enabled: Optional[bool] = Field(default=None, alias="notifyPartyEnabled")
    notify_party_same_as_consignee: Optional[bool] = Field(default=None, alias="notifyPartySameAsConsignee")
    notify_party_customer_id: Optional[int] = Field(default=None, alias="notifyPartyCustomerId")
    shipper_party_id: Optional[int] = Field(default=None, alias="shipperPartyId")
    notify_party_id: Optional[int] = Field(default=None, alias="notifyPartyId")
    consignee_party_id: Optional[int] = Field(default=None, alias="consigneePartyId")

    @field_validator("invoice_number", mode="before")
    @classmethod
    def normalize_invoice_number(cls, value):
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("notify_party", mode="before")
    @classmethod
    def normalize_notify_party(cls, value):
        return normalize_party_snapshot(value)

    @field_validator("shipper_exporter", "consignee_buyer", mode="before")
    @classmethod
    def normalize_invoice_party_snapshots(cls, value):
        return normalize_party_snapshot(value, strip_stale_notify_fragment=True)

    @model_validator(mode="after")
    def keep_notify_flags_consistent(self):
        if "notify_party" in self.model_fields_set:
            if self.notify_party is None:
                self.notify_party_enabled = False
                self.notify_party_same_as_consignee = False
                self.notify_party_customer_id = None
            else:
                self.notify_party_enabled = True
        elif "notify_party_enabled" in self.model_fields_set and self.notify_party_enabled is False:
            self.notify_party = None
            self.notify_party_same_as_consignee = False
            self.notify_party_customer_id = None
        return self

    class Config:
        populate_by_name = True

class InvoiceOut(InvoiceBase):
    id: int
    subtotal: Decimal
    freight: Decimal
    freight_rate: Decimal
    insurance: Decimal
    other_charges: Decimal
    discount: Decimal
    tax: Decimal
    documentation_fees: Decimal = Field(default=Decimal("0.00"), alias="documentationFees")
    customs_clearance_fees: Decimal = Field(default=Decimal("0.00"), alias="customsClearanceFees")
    notify_party: Optional[NotifyPartySchema] = Field(default=None, alias="notifyParty")
    shipper_exporter: Optional[NotifyPartySchema] = Field(default=None, alias="shipperExporter")
    consignee_buyer: Optional[NotifyPartySchema] = Field(default=None, alias="consigneeBuyer")
    notify_party_enabled: bool = Field(default=False, alias="notifyPartyEnabled")
    notify_party_same_as_consignee: bool = Field(default=False, alias="notifyPartySameAsConsignee")
    notify_party_customer_id: Optional[int] = Field(default=None, alias="notifyPartyCustomerId")
    shipper_party_id: Optional[int] = Field(default=None, alias="shipperPartyId")
    notify_party_id: Optional[int] = Field(default=None, alias="notifyPartyId")
    grand_total: Decimal
    paid_amount: Decimal
    remaining_balance: Decimal
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    customer: CustomerOut
    items: List[InvoiceItemOut]
    shipment_details: Optional[ShipmentDetailsOut] = None

    class Config:
        from_attributes = True
        populate_by_name = True

class InvoiceListItem(BaseModel):
    id: int
    invoice_number: str
    invoice_date: date
    due_date: date
    currency: str
    status: str
    invoice_template: InvoiceTemplateId = "premium_afghan_glass"
    grand_total: Decimal
    paid_amount: Decimal
    remaining_balance: Decimal
    customer_name: str
    created_by_name: str

    class Config:
        from_attributes = True

# Payment schemas
class PaymentBase(BaseModel):
    amount: Decimal
    currency: str = "USD"
    payment_date: date
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentOut(PaymentBase):
    id: int
    invoice_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

# ActivityLog schemas
class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard summary schemas
class DashboardSummary(BaseModel):
    total_invoices: int
    paid_invoices: int
    unpaid_invoices: int
    partial_invoices: int
    overdue_invoices: int
    total_amount: Decimal
    amount_received: Decimal
    outstanding_balance: Decimal

class MonthlyTotal(BaseModel):
    month: str
    total: Decimal
    received: Decimal

class DashboardRecentActivity(BaseModel):
    latest_invoices: List[InvoiceListItem]
    latest_customers: List[CustomerOut]
    recent_payments: List[PaymentOut]
    recent_logs: List[ActivityLogOut]
