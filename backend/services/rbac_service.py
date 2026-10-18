"""Role-Based Access Control (RBAC) and Permission Enforcement Engine.

Implements standard enterprise roles, fine-grained permission catalogs,
and financial security guards for AQ COMPANIES.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Set

logger = logging.getLogger("aq_companies.rbac")

# Standard System Roles
ROLE_SUPERADMIN = "superadmin"
ROLE_ADMIN = "admin"
ROLE_MANAGEMENT = "management"
ROLE_ACCOUNTING = "accounting"
ROLE_OPERATIONS = "operations"
ROLE_VIEWER = "viewer"
ROLE_CLIENT_PORTAL = "client_portal"

SYSTEM_ROLES = [
    ROLE_SUPERADMIN,
    ROLE_ADMIN,
    ROLE_MANAGEMENT,
    ROLE_ACCOUNTING,
    ROLE_OPERATIONS,
    ROLE_VIEWER,
    ROLE_CLIENT_PORTAL,
]

# Standard Permission Catalog
PERMISSIONS: Dict[str, str] = {
    # BOL
    "bol_view": "View Bills of Lading and cargo items",
    "bol_create": "Create new Bills of Lading",
    "bol_edit": "Edit operational BOL details",
    "bol_archive": "Archive or soft-delete inactive BOLs",
    "bol_delete_draft": "Permanently discard uncommitted draft BOLs",
    "bol_print": "Print standard physical A4 shipping sheets",
    "bol_pdf": "Generate and download official vector PDF manifests",
    "bol_release_client": "Release BOL to customer portal",

    # Shipments & Containers
    "shipment_view": "View shipments and cargo allocations",
    "shipment_create": "Create shipments and assign containers",
    "shipment_edit": "Update shipment progress and container lists",
    "shipment_archive": "Archive completed shipments",
    "container_view": "View container inventory and locations",
    "container_manage": "Manage container allocations and bookings",

    # Tracking & Milestones
    "tracking_view": "View transit checkpoints and border stations",
    "tracking_update": "Post transit checkpoint status and milestone events",

    # Documents
    "documents_view": "View document vault and shipping attachments",
    "documents_create": "Create and upload commercial documents",
    "documents_delete": "Delete unapproved documents",
    "documents_download": "Download documents and archives",

    # Accounting & Ledgers
    "accounting_view": "View accounting entries and summary balances",
    "accounting_dashboard": "Access comprehensive financial control center",
    "accounting_create_transaction": "Create draft debit/credit transactions",
    "accounting_post_transaction": "Commit transactions permanently to ledger",
    "accounting_reverse_transaction": "Post compensating reversal with audit reason",
    "accounting_period_close": "Execute monthly financial close and snapshot",
    "accounting_period_reopen": "Authorize reopening closed accounting period",
    "accounting_closed_period_override": "Emergency administrative posting into closed period",
    "year_end_close": "Execute annual fiscal year close and carry-forward",
    "ledger_view": "View customer and carrier account ledgers",
    "ledger_create": "Create new customer or carrier ledger accounts",
    "ledger_edit": "Edit ledger details and account mapping",
    "ledger_export": "Export statement of accounts to Excel/PDF",

    # Invoices & Payments
    "invoice_view": "View customer invoices and fee demarcations",
    "invoice_create": "Draft customer invoices",
    "invoice_finalize": "Finalize and issue official invoice",
    "payment_view": "View customer payment receipts",
    "payment_create": "Record incoming customer payment",
    "payment_confirm": "Confirm payment receipt into cash/bank",
    "payment_reverse": "Reverse bounced or void payment",

    # Financial Privacy & Margins
    "profit_view": "View profit, margins, and markup",
    "carrier_rate_view": "View internal driver rent and carrier expenses",

    # Backups & Data Safety
    "backup_view": "View available system backups",
    "backup_create": "Generate online database backup",
    "backup_download": "Download backup archive (.zip)",
    "backup_restore": "Restore database from backup (SUPERADMIN ONLY)",

    # System & Users
    "user_view": "View user accounts and roles",
    "user_create": "Create new employee user accounts",
    "user_edit": "Modify user accounts and reset passwords",
    "audit_view": "Inspect immutable security audit logs",
    "settings_view": "View application settings",
    "settings_edit": "Modify system settings and configurations",
}

ALL_PERMISSION_KEYS = set(PERMISSIONS.keys())

# Role Permission Assignments
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    ROLE_SUPERADMIN: ALL_PERMISSION_KEYS,

    ROLE_ADMIN: {k for k in ALL_PERMISSION_KEYS if k != "backup_restore"},

    ROLE_MANAGEMENT: {
        "bol_view", "bol_print", "bol_pdf",
        "shipment_view", "container_view", "tracking_view",
        "documents_view", "documents_download",
        "accounting_view", "accounting_dashboard",
        "accounting_period_close", "accounting_period_reopen",
        "ledger_view", "ledger_export",
        "invoice_view", "payment_view",
        "profit_view", "carrier_rate_view",
        "backup_view", "backup_create", "backup_download",
        "user_view", "audit_view", "settings_view",
    },

    ROLE_ACCOUNTING: {
        "bol_view", "bol_print", "bol_pdf",
        "shipment_view", "container_view",
        "documents_view", "documents_download",
        "accounting_view", "accounting_dashboard",
        "accounting_create_transaction", "accounting_post_transaction", "accounting_reverse_transaction",
        "accounting_period_close", "accounting_period_reopen",
        "year_end_close",
        "ledger_view", "ledger_create", "ledger_edit", "ledger_export",
        "invoice_view", "invoice_create", "invoice_finalize",
        "payment_view", "payment_create", "payment_confirm", "payment_reverse",
        "profit_view", "carrier_rate_view",
        "backup_view", "backup_create",
        "audit_view",
    },

    ROLE_OPERATIONS: {
        "bol_view", "bol_create", "bol_edit", "bol_archive", "bol_delete_draft", "bol_print", "bol_pdf", "bol_release_client",
        "shipment_view", "shipment_create", "shipment_edit", "shipment_archive",
        "container_view", "container_manage",
        "tracking_view", "tracking_update",
        "documents_view", "documents_create", "documents_download",
        "backup_view", "backup_create",
    },

    ROLE_VIEWER: {
        "bol_view", "bol_print", "bol_pdf",
        "shipment_view", "container_view", "tracking_view",
        "documents_view", "documents_download",
        "ledger_view", "invoice_view",
    },

    ROLE_CLIENT_PORTAL: {
        "bol_view", "bol_pdf",
        "shipment_view", "tracking_view",
        "documents_view", "documents_download",
        "invoice_view",
    },
}


def check_permission(role: str, permission_key: str) -> bool:
    """Check if the given role possesses the specified permission."""
    role_lower = role.strip().lower()
    if role_lower == ROLE_SUPERADMIN:
        return True

    assigned = ROLE_PERMISSIONS.get(role_lower, set())
    return permission_key in assigned


def get_role_permissions(role: str) -> List[str]:
    """Retrieve full list of granted permission keys for a given role."""
    role_lower = role.strip().lower()
    if role_lower == ROLE_SUPERADMIN:
        return sorted(list(ALL_PERMISSION_KEYS))
    return sorted(list(ROLE_PERMISSIONS.get(role_lower, set())))
