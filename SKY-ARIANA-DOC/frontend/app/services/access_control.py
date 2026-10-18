from __future__ import annotations

from datetime import datetime
import secrets
import string
from typing import Any

from sqlalchemy.orm import Session

from app.models import models


PERMISSION_DEFINITIONS: list[dict[str, str]] = [
    {"key": "dashboard.view", "module": "Dashboard", "action": "view", "description": "View the operations dashboard."},
    {"key": "invoices.view", "module": "Invoices", "action": "view", "description": "View invoices and invoice details."},
    {"key": "invoices.create", "module": "Invoices", "action": "create", "description": "Create new invoices."},
    {"key": "invoices.edit", "module": "Invoices", "action": "edit", "description": "Edit invoice details."},
    {"key": "invoices.delete", "module": "Invoices", "action": "delete", "description": "Delete invoices."},
    {"key": "invoices.duplicate", "module": "Invoices", "action": "duplicate", "description": "Duplicate invoices."},
    {"key": "invoices.print", "module": "Invoices", "action": "print", "description": "Print invoices."},
    {"key": "invoices.download", "module": "Invoices", "action": "download", "description": "Download invoice documents."},
    {"key": "invoices.export", "module": "Invoices", "action": "export", "description": "Export invoice data."},
    {"key": "invoices.change_status", "module": "Invoices", "action": "change_status", "description": "Change invoice payment status."},
    {"key": "payments.view", "module": "Payments", "action": "view", "description": "View invoice payments."},
    {"key": "payments.create", "module": "Payments", "action": "create", "description": "Record payments."},
    {"key": "payments.edit", "module": "Payments", "action": "edit", "description": "Edit payment records."},
    {"key": "payments.delete", "module": "Payments", "action": "delete", "description": "Delete payment records."},
    {"key": "customers.view", "module": "Customers", "action": "view", "description": "View customers."},
    {"key": "customers.create", "module": "Customers", "action": "create", "description": "Create customers."},
    {"key": "customers.edit", "module": "Customers", "action": "edit", "description": "Edit customers."},
    {"key": "customers.delete", "module": "Customers", "action": "delete", "description": "Delete customers."},
    {"key": "customers.export", "module": "Customers", "action": "export", "description": "Export customers."},
    {"key": "parties.view", "module": "Business Parties", "action": "view", "description": "View shippers and notify parties."},
    {"key": "parties.create", "module": "Business Parties", "action": "create", "description": "Create shippers and notify parties."},
    {"key": "parties.edit", "module": "Business Parties", "action": "edit", "description": "Edit saved shippers and notify parties."},
    {"key": "parties.archive", "module": "Business Parties", "action": "archive", "description": "Archive business parties."},
    {"key": "parties.restore", "module": "Business Parties", "action": "restore", "description": "Restore archived business parties."},
    {"key": "parties.import", "module": "Business Parties", "action": "import", "description": "Import the reviewed shipper and notify-party registry."},
    {"key": "parties.export", "module": "Business Parties", "action": "export", "description": "Export the business-party registry."},
    {"key": "shippers.view", "module": "Shippers & Exporters", "action": "view", "description": "View saved shippers and exporters."},
    {"key": "notify_parties.view", "module": "Notify Parties", "action": "view", "description": "View saved notify parties."},
    {"key": "consignees.view", "module": "Consignees", "action": "view", "description": "View and select saved consignee/importer records."},
    {"key": "consignees.create", "module": "Consignees", "action": "create", "description": "Create saved consignee/importer records."},
    {"key": "consignees.edit", "module": "Consignees", "action": "edit", "description": "Edit saved consignee/importer records."},
    {"key": "consignees.archive", "module": "Consignees", "action": "archive", "description": "Archive consignee/importer records."},
    {"key": "consignees.restore", "module": "Consignees", "action": "restore", "description": "Restore consignee/importer records."},
    {"key": "consignees.import", "module": "Consignees", "action": "import", "description": "Import the reviewed consignee PDF registry."},
    {"key": "consignees.export", "module": "Consignees", "action": "export", "description": "Export saved consignee/importer records."},
    {"key": "consignees.merge", "module": "Consignees", "action": "merge", "description": "Merge duplicate consignee/importer records."},
    {"key": "consignees.review_import", "module": "Consignees", "action": "review_import", "description": "Review uncertain consignee source data."},
    {"key": "products.view", "module": "Products & Services", "action": "view", "description": "View products and services."},
    {"key": "products.create", "module": "Products & Services", "action": "create", "description": "Create products and services."},
    {"key": "products.edit", "module": "Products & Services", "action": "edit", "description": "Edit products and services."},
    {"key": "products.delete", "module": "Products & Services", "action": "delete", "description": "Delete products and services."},
    {"key": "products.export", "module": "Products & Services", "action": "export", "description": "Export products and services."},
    {"key": "reports.view", "module": "Reports", "action": "view", "description": "View operational and financial reports."},
    {"key": "reports.export", "module": "Reports", "action": "export", "description": "Export reports."},
    {"key": "users.view", "module": "Users", "action": "view", "description": "View users and account security summaries."},
    {"key": "users.create", "module": "Users", "action": "create", "description": "Create team member accounts."},
    {"key": "users.edit", "module": "Users", "action": "edit", "description": "Edit team member profiles."},
    {"key": "users.delete", "module": "Users", "action": "delete", "description": "Soft-delete team member accounts."},
    {"key": "users.suspend", "module": "Users", "action": "suspend", "description": "Suspend team member accounts."},
    {"key": "users.activate", "module": "Users", "action": "activate", "description": "Activate team member accounts."},
    {"key": "users.reset_password", "module": "Users", "action": "reset_password", "description": "Reset a team member password."},
    {"key": "users.change_role", "module": "Users", "action": "change_role", "description": "Change a team member role."},
    {"key": "users.revoke_sessions", "module": "Users", "action": "revoke_sessions", "description": "Revoke team member sessions."},
    {"key": "roles.view", "module": "Roles", "action": "view", "description": "View roles and permissions."},
    {"key": "roles.create", "module": "Roles", "action": "create", "description": "Create custom roles."},
    {"key": "roles.edit", "module": "Roles", "action": "edit", "description": "Edit custom role permissions."},
    {"key": "roles.delete", "module": "Roles", "action": "delete", "description": "Delete custom roles."},
    {"key": "roles.assign", "module": "Roles", "action": "assign", "description": "Assign roles to users."},
    {"key": "permissions.manage", "module": "Roles", "action": "manage", "description": "Manage system-level permissions."},
    {"key": "company.view", "module": "Company Settings", "action": "view", "description": "View company settings."},
    {"key": "company.edit", "module": "Company Settings", "action": "edit", "description": "Edit company settings."},
    {"key": "company.change_logo", "module": "Company Settings", "action": "change_logo", "description": "Change company branding assets."},
    {"key": "company.change_identity", "module": "Company Settings", "action": "change_identity", "description": "Change company identity."},
    {"key": "backup.create", "module": "Backup & Restore", "action": "create", "description": "Create backups."},
    {"key": "backup.download", "module": "Backup & Restore", "action": "download", "description": "Download backups."},
    {"key": "backup.restore", "module": "Backup & Restore", "action": "restore", "description": "Restore a backup."},
    {"key": "backup.delete", "module": "Backup & Restore", "action": "delete", "description": "Delete a backup."},
    {"key": "activity.view", "module": "Activity History", "action": "view", "description": "View activity history."},
    {"key": "activity.export", "module": "Activity History", "action": "export", "description": "Export activity history."},
    {"key": "security.view", "module": "Security", "action": "view", "description": "View security settings."},
    {"key": "security.manage", "module": "Security", "action": "manage", "description": "Manage security settings."},
    {"key": "security.view_login_activity", "module": "Security", "action": "view_login_activity", "description": "View login activity."},
    {"key": "security.manage_sessions", "module": "Security", "action": "manage_sessions", "description": "Manage active sessions."},
]

ALL_PERMISSION_KEYS = {item["key"] for item in PERMISSION_DEFINITIONS}

ROLE_DEFAULT_PERMISSIONS: dict[str, set[str]] = {
    "Super Admin": set(ALL_PERMISSION_KEYS),
    "Admin": {
        key for key in ALL_PERMISSION_KEYS
        if key not in {"permissions.manage", "roles.create", "roles.edit", "roles.delete", "backup.restore", "company.change_identity", "security.manage", "consignees.merge"}
    },
    "Manager": {
        "dashboard.view", "invoices.view", "invoices.create", "invoices.edit", "invoices.duplicate", "invoices.print", "invoices.download", "invoices.export", "invoices.change_status",
        "payments.view", "customers.view", "customers.create", "customers.edit", "customers.delete", "products.view", "products.create", "products.edit", "products.delete",
        "reports.view", "reports.export", "activity.view", "parties.view", "parties.create", "parties.edit", "parties.archive", "parties.restore", "parties.export", "shippers.view", "notify_parties.view",
        "consignees.view", "consignees.create", "consignees.edit", "consignees.archive", "consignees.restore",
    },
    "Accountant": {
        "dashboard.view", "invoices.view", "invoices.create", "invoices.edit", "invoices.print", "invoices.download", "invoices.export", "invoices.change_status",
        "payments.view", "payments.create", "payments.edit", "customers.view", "products.view", "reports.view", "reports.export", "parties.view", "shippers.view", "notify_parties.view", "consignees.view",
    },
    "Viewer": {"dashboard.view", "invoices.view", "invoices.print", "invoices.download", "customers.view", "products.view", "reports.view", "parties.view", "shippers.view", "notify_parties.view", "consignees.view"},
}

ROLE_RANK = {"Viewer": 10, "Accountant": 20, "Manager": 30, "Admin": 40, "Super Admin": 50}
LEGACY_ROLE_ALIASES = {"Staff": "Manager", "Administrator": "Admin"}
BUILT_IN_ROLE_DESCRIPTIONS = {
    "Super Admin": "Full system ownership and security control.",
    "Admin": "Operations administration without ownership-level security controls.",
    "Manager": "Team operations, commercial records, and reporting.",
    "Accountant": "Financial operations, invoices, payments, and balances.",
    "Viewer": "Read-only access to permitted operational records.",
}


def normalize_role_name(value: str | None) -> str:
    name = (value or "Viewer").strip()
    return LEGACY_ROLE_ALIASES.get(name, name)


def get_role_name(db: Session, user: models.User) -> str:
    if getattr(user, "role_record", None):
        return user.role_record.name
    if user.role_id:
        role = db.query(models.Role).filter(models.Role.id == user.role_id).first()
        if role:
            return role.name
    return normalize_role_name(user.role)


def is_super_admin(db: Session, user: models.User) -> bool:
    return get_role_name(db, user) == "Super Admin"


def role_has_permission(role_name: str | None, permission_key: str) -> bool:
    return permission_key in ROLE_DEFAULT_PERMISSIONS.get(normalize_role_name(role_name), set())


def effective_permission_keys(db: Session, user: models.User) -> set[str]:
    role_name = get_role_name(db, user)
    permissions = set(ROLE_DEFAULT_PERMISSIONS.get(role_name, set()))
    links = db.query(models.UserPermission).filter(models.UserPermission.user_id == user.id).all()
    for link in links:
        if link.permission:
            if link.allowed:
                permissions.add(link.permission.key)
            else:
                permissions.discard(link.permission.key)
    return permissions


def has_permission(db: Session, user: models.User, permission_key: str) -> bool:
    return permission_key in effective_permission_keys(db, user)


def can_assign_role(db: Session, actor: models.User, target_role: str) -> bool:
    target = normalize_role_name(target_role)
    actor_role = get_role_name(db, actor)
    if target == "Super Admin":
        return actor_role == "Super Admin"
    return ROLE_RANK.get(actor_role, 0) >= ROLE_RANK.get(target, 0) and actor_role != "Viewer"


def get_security_settings(db: Session) -> models.SecuritySettings:
    settings = db.query(models.SecuritySettings).filter(models.SecuritySettings.id == 1).first()
    if not settings:
        settings = models.SecuritySettings(id=1, two_factor_roles=[])
        db.add(settings)
        db.flush()
    return settings


def generate_temporary_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(char.isupper() for char in password) and any(char.islower() for char in password) and any(char.isdigit() for char in password) and any(char in "!@#$%^&*" for char in password):
            return password


def validate_password(password: str, settings: models.SecuritySettings, previous_password: str | None = None) -> list[str]:
    errors: list[str] = []
    if len(password or "") < settings.minimum_password_length:
        errors.append(f"Password must be at least {settings.minimum_password_length} characters.")
    if settings.require_uppercase and not any(char.isupper() for char in password):
        errors.append("Password must include an uppercase letter.")
    if settings.require_lowercase and not any(char.islower() for char in password):
        errors.append("Password must include a lowercase letter.")
    if settings.require_number and not any(char.isdigit() for char in password):
        errors.append("Password must include a number.")
    if settings.require_special and not any(not char.isalnum() for char in password):
        errors.append("Password must include a special character.")
    if previous_password and password == previous_password:
        errors.append("New password must be different from the current password.")
    return errors


def ensure_access_control(db: Session) -> None:
    for definition in PERMISSION_DEFINITIONS:
        permission = db.query(models.Permission).filter(models.Permission.key == definition["key"]).first()
        if not permission:
            db.add(models.Permission(**definition))
    db.flush()

    for role_name, description in BUILT_IN_ROLE_DESCRIPTIONS.items():
        role = db.query(models.Role).filter(models.Role.name == role_name).first()
        if not role:
            role = models.Role(name=role_name, description=description, is_system_role=True)
            db.add(role)
            db.flush()
        existing_permission_ids = {link.permission_id for link in role.permission_links}
        for key in ROLE_DEFAULT_PERMISSIONS[role_name]:
            permission = db.query(models.Permission).filter(models.Permission.key == key).first()
            if permission and permission.id not in existing_permission_ids:
                db.add(models.RolePermission(role_id=role.id, permission_id=permission.id))

    settings = get_security_settings(db)
    if settings.two_factor_roles is None:
        settings.two_factor_roles = []

    role_map = {role.name: role for role in db.query(models.Role).all()}
    for user in db.query(models.User).all():
        legacy_name = normalize_role_name(user.role)
        if user.email.lower() == "admin@skyariana.com":
            legacy_name = "Super Admin"
        role = role_map.get(legacy_name) or role_map["Viewer"]
        user.role_id = role.id
        user.role = role.name
        user.status = "active" if user.is_active and not user.deleted_at else (user.status or "suspended")
        if not user.display_name:
            user.display_name = user.name
        if not user.username:
            base_username = (user.email.split("@")[0] or "user").lower()
            username = base_username
            suffix = 1
            while db.query(models.User).filter(models.User.username == username, models.User.id != user.id).first():
                suffix += 1
                username = f"{base_username}{suffix}"
            user.username = username
        if not user.password_changed_at:
            user.password_changed_at = user.created_at or datetime.utcnow()

    db.commit()


def serialize_user(db: Session, user: models.User, include_permissions: bool = True) -> dict[str, Any]:
    role_name = get_role_name(db, user)
    permissions = sorted(effective_permission_keys(db, user)) if include_permissions else []
    name = user.display_name or user.name
    return {
        "id": user.id,
        "name": user.name,
        "display_name": name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "employee_id": user.employee_id,
        "job_title": user.job_title,
        "department": user.department,
        "role": user.role or role_name,
        "role_name": role_name,
        "role_id": user.role_id,
        "status": user.status or ("active" if user.is_active else "suspended"),
        "is_active": bool(user.is_active),
        "language": user.language,
        "timezone": user.timezone,
        "must_change_password": bool(user.must_change_password),
        "failed_login_attempts": user.failed_login_attempts or 0,
        "locked_until": user.locked_until,
        "last_login_at": user.last_login_at,
        "last_login_ip": user.last_login_ip,
        "password_changed_at": user.password_changed_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "created_by": user.created_by,
        "updated_by": user.updated_by,
        "deleted_at": user.deleted_at,
        "deletion_reason": user.deletion_reason,
        "permissions": permissions,
    }
