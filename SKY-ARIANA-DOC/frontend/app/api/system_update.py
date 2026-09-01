from fastapi import APIRouter, Depends, Body
from typing import Dict, Any, List

router = APIRouter(prefix="/system", tags=["system-updates"])

SYSTEM_SETTINGS: Dict[str, Any] = {
    "auto_generate_software_updates": True,
    "channel": "Stable",
}

DRAFT_UPDATE: Dict[str, Any] = {
    "version": "v2.4.1-draft",
    "title": "v2.4.1 (Auto-Drafted Patch)",
    "has_draft": True,
    "changes_count": 3,
    "drafted_changes": [
        "Updated company settings & default document configurations",
        "Toggled 'Auto-Generate Software Updates from Changes' feature ON",
        "Configured custom seller/buyer document styling rules"
    ]
}

CHANGELOG: List[Dict[str, Any]] = [
    {
        "version": "v2.4.0",
        "date": "2026-07-30",
        "status": "Current Installed Version",
        "highlights": [
            "Added ACCI Packing List module with custom seller/buyer header styling and DomPDF A4 export",
            "Added Shipping Sticker module with high-resolution FSSAI and Afghanistan Export logos",
            "Redesigned Login screen with glassmorphic UI, glowing ambient backgrounds, and input icons",
            "Upgraded Sidebar with hidden mini-scrollbar, glowing active pills, and hover tooltips",
            "Updated Air Waybill document template removing carrier logos as requested",
        ]
    },
    {
        "version": "v2.3.5",
        "date": "2026-07-15",
        "status": "Stable Release",
        "highlights": [
            "Optimized DomPDF single-sheet page-break layout for commercial invoices",
            "Added English verbal amount formatter with data set assertions",
            "Enhanced document suite health check endpoints and search filters"
        ]
    },
    {
        "version": "v2.3.0",
        "date": "2026-06-01",
        "status": "Major Release",
        "highlights": [
            "Initial release of SKY Logistics Documents suite with FastAPI and Laravel integration",
            "Added Trade Directory with Shippers, Exporters, and Notify Parties management"
        ]
    }
]

@router.get("/update-status")
def get_update_status() -> Dict[str, Any]:
    return {
        "current_version": "v2.4.0",
        "latest_version": "v2.4.1-draft" if DRAFT_UPDATE["has_draft"] else "v2.4.0",
        "is_latest": not DRAFT_UPDATE["has_draft"],
        "update_available": DRAFT_UPDATE["has_draft"],
        "auto_generate_enabled": SYSTEM_SETTINGS["auto_generate_software_updates"],
        "draft_update": DRAFT_UPDATE if DRAFT_UPDATE["has_draft"] else None,
        "last_checked": "Just now",
        "channel": SYSTEM_SETTINGS["channel"],
        "changelog": CHANGELOG
    }

@router.post("/toggle-auto-generate")
def toggle_auto_generate(enabled: bool = Body(..., embed=True)) -> Dict[str, Any]:
    SYSTEM_SETTINGS["auto_generate_software_updates"] = enabled
    if enabled and not DRAFT_UPDATE["has_draft"]:
        DRAFT_UPDATE["has_draft"] = True
        DRAFT_UPDATE["changes_count"] += 1
        DRAFT_UPDATE["drafted_changes"].append("Toggled 'Auto-Generate Software Updates from Changes' switch ON")
    return {
        "status": "success",
        "auto_generate_enabled": SYSTEM_SETTINGS["auto_generate_software_updates"],
        "message": f"Auto-generate software updates option set to {'ON' if enabled else 'OFF'}."
    }

@router.post("/log-change")
def log_system_change(change_description: str = Body(..., embed=True)) -> Dict[str, Any]:
    if SYSTEM_SETTINGS["auto_generate_software_updates"]:
        DRAFT_UPDATE["has_draft"] = True
        DRAFT_UPDATE["changes_count"] += 1
        DRAFT_UPDATE["drafted_changes"].append(change_description)
    return {
        "status": "success",
        "auto_drafted": SYSTEM_SETTINGS["auto_generate_software_updates"],
        "draft_update": DRAFT_UPDATE
    }

@router.post("/publish-draft")
def publish_draft_update() -> Dict[str, Any]:
    if DRAFT_UPDATE["has_draft"]:
        new_release = {
            "version": "v2.4.1",
            "date": "2026-07-30",
            "status": "Newly Published Release",
            "highlights": list(DRAFT_UPDATE["drafted_changes"])
        }
        CHANGELOG.insert(0, new_release)
        DRAFT_UPDATE["has_draft"] = False
        DRAFT_UPDATE["changes_count"] = 0
        DRAFT_UPDATE["drafted_changes"] = []
        return {
            "status": "success",
            "message": "Auto-drafted software update published successfully as v2.4.1!",
            "published_version": "v2.4.1"
        }
    return {
        "status": "notice",
        "message": "No pending draft update to publish."
    }

@router.post("/check-updates")
def check_updates() -> Dict[str, Any]:
    return {
        "status": "success",
        "message": "Draft software update v2.4.1 is ready from recent modifications!" if DRAFT_UPDATE["has_draft"] else "Your software is up to date! System is running version v2.4.0.",
        "current_version": "v2.4.0",
        "latest_version": "v2.4.1-draft" if DRAFT_UPDATE["has_draft"] else "v2.4.0",
        "has_draft": DRAFT_UPDATE["has_draft"],
        "checked_at": "Just now"
    }

@router.post("/install-update")
def install_update() -> Dict[str, Any]:
    return publish_draft_update()
