from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Viewer", nullable=False)  # Legacy compatibility mirror of the normalized role.
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=True)
    job_title = Column(String, nullable=True)
    department = Column(String, nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True, index=True)
    status = Column(String, default="active", nullable=False)
    language = Column(String, default="en", nullable=False)
    timezone = Column(String, default="Asia/Kabul", nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    password_changed_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    deletion_reason = Column(Text, nullable=True)

    invoices = relationship("Invoice", back_populates="creator")
    payments = relationship("Payment", back_populates="creator")
    activity_logs = relationship("ActivityLog", back_populates="user")
    role_record = relationship("Role", foreign_keys=[role_id], back_populates="users")
    permission_overrides = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", foreign_keys="UserSession.user_id", back_populates="user", cascade="all, delete-orphan")
    login_activities = relationship("LoginActivity", back_populates="user")
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    users = relationship("User", foreign_keys="User.role_id", back_populates="role_record")
    permission_links = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    module = Column(String, nullable=False)
    action = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    role_links = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    user_links = relationship("UserPermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(Integer, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)

    role = relationship("Role", back_populates="permission_links")
    permission = relationship("Permission", back_populates="role_links")


class UserPermission(Base):
    __tablename__ = "user_permissions"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)
    allowed = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="permission_overrides")
    permission = relationship("Permission", back_populates="user_links")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_identifier = Column(String, unique=True, index=True, nullable=False)
    device = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    approximate_location = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    last_active_at = Column(DateTime, server_default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    revoked_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="sessions")


class LoginActivity(Base):
    __tablename__ = "login_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    email_attempted = Column(String, nullable=True)
    result = Column(String, nullable=False)
    failure_reason = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    device = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    approximate_location = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="login_activities")


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="password_resets")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    module = Column(String, nullable=False, default="system")
    description = Column(Text, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class SecuritySettings(Base):
    __tablename__ = "security_settings"

    id = Column(Integer, primary_key=True, index=True)
    minimum_password_length = Column(Integer, default=10, nullable=False)
    require_uppercase = Column(Boolean, default=True, nullable=False)
    require_lowercase = Column(Boolean, default=True, nullable=False)
    require_number = Column(Boolean, default=True, nullable=False)
    require_special = Column(Boolean, default=True, nullable=False)
    password_expiration_days = Column(Integer, default=0, nullable=False)
    password_history_count = Column(Integer, default=5, nullable=False)
    failed_login_limit = Column(Integer, default=5, nullable=False)
    lock_duration_minutes = Column(Integer, default=15, nullable=False)
    session_timeout_minutes = Column(Integer, default=480, nullable=False)
    require_password_change_on_first_login = Column(Boolean, default=True, nullable=False)
    require_two_factor = Column(Boolean, default=False, nullable=False)
    two_factor_roles = Column(JSON, nullable=True)
    allow_multiple_sessions = Column(Boolean, default=True, nullable=False)
    invitation_expiration_hours = Column(Integer, default=72, nullable=False)
    password_reset_expiration_minutes = Column(Integer, default=30, nullable=False)
    login_notification = Column(Boolean, default=True, nullable=False)
    new_device_notification = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, default="SKY ARIANA & BALAM BAR BARAN", nullable=False)
    subtitle = Column(String, default="IMPORT • EXPORT • LOGISTICS • TRANSPORT", nullable=False)
    logo_path = Column(String, nullable=True)
    signature_path = Column(String, nullable=True)
    stamp_path = Column(String, nullable=True)
    watermark_enabled = Column(Boolean, default=True, nullable=False)
    default_invoice_template = Column(String, default="premium_afghan_glass", nullable=False)
    invoice_watermark_enabled = Column(Boolean, default=True, nullable=False)
    invoice_watermark_opacity = Column(Numeric(4, 3), default=0.06, nullable=False)
    invoice_qr_enabled = Column(Boolean, default=True, nullable=False)
    invoice_seal_enabled = Column(Boolean, default=True, nullable=False)
    invoice_signature_enabled = Column(Boolean, default=True, nullable=False)
    invoice_stamp_enabled = Column(Boolean, default=True, nullable=False)
    invoice_color_printing_enabled = Column(Boolean, default=True, nullable=False)
    invoice_compact_layout_enabled = Column(Boolean, default=False, nullable=False)
    
    # Store addresses, phones, emails, and bank_details as JSON
    addresses = Column(JSON, nullable=True)
    licence_number = Column(String, nullable=True)
    phones = Column(JSON, nullable=True)
    emails = Column(JSON, nullable=True)
    website = Column(String, nullable=True)
    bank_details = Column(JSON, nullable=True)
    default_currency = Column(String, default="USD", nullable=False)
    default_language = Column(String, default="en", nullable=False)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    contact_person = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    country = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    tax_number = Column(String, nullable=True)
    contact_type = Column(String, default="consignee", nullable=False)
    additional_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    invoices = relationship("Invoice", back_populates="customer")


class BusinessParty(Base):
    __tablename__ = "business_parties"

    id = Column(Integer, primary_key=True, index=True)
    party_type = Column(String, nullable=False, index=True)
    # A single legal entity may be a shipper, notify party, consignee, buyer,
    # or importer at different times.  Keep the existing party_type column for
    # backwards compatibility and use roles for the normalized role set.
    roles = Column(JSON, nullable=True)
    canonical_name = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    normalized_name = Column(String, nullable=False, index=True)
    address_line1 = Column(Text, nullable=True)
    address_line2 = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state_region = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    country_code = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    alternate_phones = Column(JSON, nullable=True)
    email = Column(String, nullable=True)
    alternate_emails = Column(JSON, nullable=True)
    trade_license_number = Column(String, nullable=True)
    tax_identification_number = Column(String, nullable=True)
    trn = Column(String, nullable=True)
    registration_number = Column(String, nullable=True)
    contact_person = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    website = Column(String, nullable=True)
    gstin = Column(String, nullable=True, index=True)
    iec = Column(String, nullable=True, index=True)
    pan = Column(String, nullable=True, index=True)
    fssai = Column(String, nullable=True, index=True)
    tin = Column(String, nullable=True)
    state_code = Column(String, nullable=True)
    identifiers = Column(JSON, nullable=True)
    identifier_provenance = Column(JSON, nullable=True)
    field_provenance = Column(JSON, nullable=True)
    source_entries = Column(JSON, nullable=True)
    review_status = Column(String, nullable=True, default="verified_source", index=True)
    import_batch_id = Column(String, nullable=True, index=True)
    bank_details = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    aliases = Column(JSON, nullable=True)
    alternate_addresses = Column(JSON, nullable=True)
    source_name = Column(String, nullable=True)
    source_pages = Column(JSON, nullable=True)
    source_references = Column(JSON, nullable=True)
    source_raw_text = Column(Text, nullable=True)
    review_flags = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    archived_at = Column(DateTime, nullable=True)
    archived_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    shipper_invoices = relationship(
        "Invoice",
        foreign_keys="Invoice.shipper_party_id",
        back_populates="shipper_party",
    )
    notify_invoices = relationship(
        "Invoice",
        foreign_keys="Invoice.notify_party_id",
        back_populates="notify_party_record",
    )
    consignee_invoices = relationship(
        "Invoice",
        foreign_keys="Invoice.consignee_party_id",
        back_populates="consignee_party",
    )


class BusinessPartyRelationship(Base):
    __tablename__ = "business_party_relationships"

    id = Column(Integer, primary_key=True, index=True)
    source_party_id = Column(Integer, ForeignKey("business_parties.id"), nullable=False, index=True)
    target_party_id = Column(Integer, ForeignKey("business_parties.id"), nullable=False, index=True)
    relationship_type = Column(String, nullable=False, default="previously_used_notify_party")
    usage_count = Column(Integer, nullable=False, default=0)
    is_preferred = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    source_party = relationship("BusinessParty", foreign_keys=[source_party_id])
    target_party = relationship("BusinessParty", foreign_keys=[target_party_id])

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    hs_code = Column(String, nullable=True)
    default_unit = Column(String, default="PCS", nullable=False)
    default_price = Column(Numeric(12, 2), default=0.00, nullable=False)

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    currency = Column(String, default="USD", nullable=False)
    status = Column(String, default="unpaid", nullable=False) # paid, unpaid, partial
    invoice_template = Column(String, default="premium_afghan_glass", nullable=False)
    
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    freight = Column(Numeric(12, 2), default=0.00, nullable=False)
    freight_rate = Column(Numeric(12, 2), default=0.00, nullable=False)
    insurance = Column(Numeric(12, 2), default=0.00, nullable=False)
    other_charges = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax = Column(Numeric(12, 2), default=0.00, nullable=False)
    documentation_fees = Column(Numeric(12, 2), default=0.00, nullable=False)
    customs_clearance_fees = Column(Numeric(12, 2), default=0.00, nullable=False)
    grand_total = Column(Numeric(12, 2), default=0.00, nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    remaining_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    
    notify_party = Column(JSON, nullable=True)
    shipper_exporter = Column(JSON, nullable=True)
    consignee_buyer = Column(JSON, nullable=True)
    notify_party_enabled = Column(Boolean, default=False, nullable=False)
    notify_party_same_as_consignee = Column(Boolean, default=False, nullable=False)
    notify_party_customer_id = Column(Integer, nullable=True)
    shipper_party_id = Column(Integer, ForeignKey("business_parties.id"), nullable=True, index=True)
    notify_party_id = Column(Integer, ForeignKey("business_parties.id"), nullable=True, index=True)
    consignee_party_id = Column(Integer, ForeignKey("business_parties.id"), nullable=True, index=True)
    
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="invoices")
    creator = relationship("User", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    shipment_details = relationship("ShipmentDetails", uselist=False, back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")
    shipper_party = relationship(
        "BusinessParty",
        foreign_keys=[shipper_party_id],
        back_populates="shipper_invoices",
    )
    notify_party_record = relationship(
        "BusinessParty",
        foreign_keys=[notify_party_id],
        back_populates="notify_invoices",
    )
    consignee_party = relationship(
        "BusinessParty",
        foreign_keys=[consignee_party_id],
        back_populates="consignee_invoices",
    )

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(Text, nullable=False)
    product_catalog_id = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    product_variety = Column(String, nullable=True)
    product_grade = Column(String, nullable=True)
    custom_grade = Column(String, nullable=True)
    hs_code = Column(String, nullable=True)
    quantity = Column(Numeric(12, 3), default=1, nullable=False)
    unit = Column(String, default="PCS", nullable=False)
    quantity_unit = Column(String, default="PCS", nullable=False)
    package_count = Column(Numeric(12, 3), default=0, nullable=False)
    package_type = Column(String, nullable=True)
    net_weight = Column(Numeric(12, 3), default=0, nullable=False)
    gross_weight = Column(Numeric(12, 3), default=0, nullable=False)
    weight_unit = Column(String, default="KG", nullable=False)
    unit_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    price_basis = Column(String, default="Per KG", nullable=False)
    country_of_origin = Column(String, nullable=True)
    lot_batch_number = Column(String, nullable=True)
    remarks = Column(Text, nullable=True)
    amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    invoice = relationship("Invoice", back_populates="items")

class ShipmentDetails(Base):
    __tablename__ = "shipment_details"

    invoice_id = Column(Integer, ForeignKey("invoices.id"), primary_key=True, nullable=False)
    booking_number = Column(String, nullable=True)
    bill_of_lading_number = Column(String, nullable=True)
    container_number = Column(String, nullable=True)
    container_type = Column(String, nullable=True)
    seal_number = Column(String, nullable=True)
    commodity = Column(String, nullable=True)
    gross_weight = Column(Numeric(12, 2), nullable=True)
    net_weight = Column(Numeric(12, 2), nullable=True)
    package_count = Column(Integer, nullable=True)
    package_type = Column(String, nullable=True)
    port_of_loading = Column(String, nullable=True)
    port_of_discharge = Column(String, nullable=True)
    vessel_name = Column(String, nullable=True)
    voyage_number = Column(String, nullable=True)
    shipping_line = Column(String, nullable=True)
    incoterms = Column(String, nullable=True)
    etd = Column(Date, nullable=True)
    eta = Column(Date, nullable=True)

    invoice = relationship("Invoice", back_populates="shipment_details")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, default="USD", nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String, nullable=False)  # Bank Transfer, Cash, Card, etc.
    reference_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="payments")
    creator = relationship("User", back_populates="payments")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g., login, create_invoice, delete_invoice
    entity_type = Column(String, nullable=True)  # e.g., invoice, customer, product
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="activity_logs")


class AcciInvoice(Base):
    __tablename__ = "acci_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(40), unique=True, index=True, nullable=False)
    invoice_date = Column(Date, index=True, nullable=False)

    seller_name = Column(String, nullable=False)
    seller_address = Column(Text, nullable=False)
    seller_phone = Column(String(80), nullable=True)
    seller_email = Column(String, nullable=True)

    buyer_name = Column(String, index=True, nullable=False)
    buyer_address = Column(Text, nullable=False)

    airway_bill_no = Column(String(80), nullable=True)
    airway_bill_date = Column(Date, nullable=True)

    payment_terms = Column(Text, nullable=True)
    advance_payment = Column(String(120), nullable=True)
    lc_number = Column(String(100), nullable=True)
    collection_basis = Column(String(160), nullable=True)
    transport_route = Column(Text, nullable=True)

    commodity = Column(String, index=True, nullable=False)
    quantity_cartons = Column(Integer, nullable=False)
    quantity_weight = Column(Numeric(15, 3), nullable=False)
    unit_price = Column(Numeric(15, 4), nullable=False)
    total_price = Column(Numeric(15, 2), nullable=False)
    amount_in_words = Column(Text, nullable=False)
    country_of_origin = Column(String(120), default="Afghanistan", nullable=False)

    reg_no = Column(String(100), nullable=True)
    fee_no = Column(String(100), nullable=True)
    received_amount = Column(Numeric(15, 2), nullable=True)
    received_date = Column(Date, nullable=True)
    authorized_person = Column(String, nullable=True)

    stamp_image = Column(String, nullable=True)
    signature_image = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class AcciPackingList(Base):
    __tablename__ = "acci_packing_lists"

    id = Column(Integer, primary_key=True, index=True)
    packing_list_no = Column(String(50), unique=True, index=True, nullable=False)
    packing_list_date = Column(Date, index=True, nullable=False)

    seller_name = Column(String, nullable=False)
    seller_address = Column(Text, nullable=False)
    seller_phone = Column(String(100), nullable=True)
    seller_email = Column(String, nullable=True)

    buyer_name = Column(String, index=True, nullable=False)
    buyer_address = Column(Text, nullable=False)
    buyer_phone = Column(String(100), nullable=True)
    buyer_gst = Column(String(100), nullable=True)
    buyer_fssai = Column(String(100), nullable=True)
    buyer_iec = Column(String(100), nullable=True)

    airway_bill_no = Column(String(100), nullable=True)
    airway_bill_date = Column(Date, nullable=True)

    payment_terms = Column(Text, nullable=True)
    lc_number = Column(String(100), nullable=True)
    collection_basis = Column(String(100), nullable=True)
    transport_route = Column(Text, nullable=True)

    commodity = Column(String, index=True, nullable=False)
    quantity_cartons = Column(Integer, nullable=False)
    carton_dimensions = Column(String(100), nullable=True)
    volume_per_carton = Column(String(100), nullable=True)
    net_weight = Column(Numeric(15, 3), nullable=True)
    gross_weight = Column(Numeric(15, 3), nullable=True)
    total_volume = Column(String(100), nullable=True)
    country_of_origin = Column(String(100), default="Afghanistan", nullable=False)

    authorized_person = Column(String, nullable=True)
    stamp_image = Column(String, nullable=True)
    signature_image = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class ShippingSticker(Base):
    __tablename__ = "shipping_stickers"

    id = Column(Integer, primary_key=True, index=True)
    sticker_no = Column(String(50), unique=True, index=True, nullable=False)
    sticker_date = Column(Date, index=True, nullable=False)

    exporter_name = Column(String, nullable=False)
    exporter_address = Column(Text, nullable=False)
    exporter_phone = Column(String(100), nullable=True)
    exporter_licence_no = Column(String(100), nullable=True)

    importer_name = Column(String, index=True, nullable=False)
    importer_address = Column(Text, nullable=False)
    importer_gst = Column(String(100), nullable=True)
    importer_fssai = Column(String(100), nullable=True)
    importer_phone = Column(String(100), nullable=True)
    importer_email = Column(String(255), nullable=True)
    importer_pan = Column(String(100), nullable=True)

    commodity_name = Column(String, index=True, nullable=False)
    net_wt = Column(String(100), nullable=False)
    date_of_packing = Column(String(100), nullable=False)
    date_of_expiry = Column(String(100), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class AirWaybill(Base):
    __tablename__ = "air_waybills"

    id = Column(Integer, primary_key=True, index=True)
    awb_number = Column(String(20), unique=True, index=True, nullable=False)
    airline_prefix = Column(String(3), index=True, nullable=False)
    serial_number = Column(String(8), index=True, nullable=False)

    shipper_name = Column(String, index=True, nullable=False)
    shipper_address = Column(Text, nullable=False)
    shipper_phone = Column(String(80), nullable=True)
    shipper_account_no = Column(String(100), nullable=True)

    consignee_name = Column(String, index=True, nullable=False)
    consignee_address = Column(Text, nullable=False)
    consignee_phone = Column(String(80), nullable=True)
    consignee_account_no = Column(String(100), nullable=True)
    notify_party = Column(Text, nullable=True)

    issuing_agent = Column(Text, nullable=True)
    iata_code = Column(String(40), nullable=True)
    agent_account_no = Column(String(100), nullable=True)

    departure_airport = Column(String, index=True, nullable=False)
    destination_airport = Column(String, index=True, nullable=False)
    requested_routing = Column(String, nullable=True)
    first_carrier = Column(String(80), nullable=True)
    flight_no = Column(String(120), nullable=True)
    flight_date = Column(Date, nullable=True)

    currency = Column(String(3), default="USD", nullable=False)
    declared_value_carriage = Column(String(60), nullable=True)
    declared_value_customs = Column(String(60), nullable=True)
    insurance_amount = Column(String(60), nullable=True)
    handling_information = Column(Text, nullable=True)
    reference_number = Column(String(120), nullable=True, index=True)
    accounting_information = Column(Text, nullable=True)
    airport_destination = Column(String, nullable=True)
    airport_departure = Column(String, nullable=True)

    pieces = Column(Integer, nullable=False)
    gross_weight = Column(Numeric(15, 3), nullable=False)
    chargeable_weight = Column(Numeric(15, 3), nullable=False)
    weight_unit = Column(String(8), default="KG", nullable=False)
    rate_class = Column(String(30), nullable=True)
    commodity_item_no = Column(String(80), nullable=True)
    commodity_description = Column(Text, nullable=False)
    dimensions = Column(Text, nullable=True)
    rate = Column(String(40), nullable=True)

    freight_charge = Column(Numeric(15, 2), default=0, nullable=False)
    valuation_charge = Column(Numeric(15, 2), default=0, nullable=False)
    tax = Column(Numeric(15, 2), default=0, nullable=False)
    other_agent_charge = Column(Numeric(15, 2), default=0, nullable=False)
    other_carrier_charge = Column(Numeric(15, 2), default=0, nullable=False)
    total_prepaid = Column(Numeric(15, 2), default=0, nullable=False)
    total_collect = Column(Numeric(15, 2), default=0, nullable=False)
    charges_at_destination = Column(Numeric(15, 2), default=0, nullable=False)
    currency_conversion = Column(Numeric(15, 6), default=0, nullable=False)

    carrier_name = Column(String, nullable=True)
    shipper_signature = Column(String, nullable=True)
    carrier_signature = Column(String, nullable=True)
    issued_place = Column(String, nullable=True)
    issued_date = Column(Date, nullable=True)
    carrier_logo = Column(String, nullable=True)
    carrier_stamp = Column(String, nullable=True)
    status = Column(String(30), default="draft", index=True, nullable=False)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

