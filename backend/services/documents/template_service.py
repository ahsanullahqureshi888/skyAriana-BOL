"""Document Template and Asset Management Service.

Provides cached company branding, color palettes, fonts, and A4 canvas layout styles.
Follows zero-crash fallback guarantees: missing assets fallback cleanly without breaking generation.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# In-memory asset cache: asset_name -> resolved Path or None
_ASSET_CACHE: dict[str, Path | None] = {}


def get_cached_asset_path(filename: str) -> Path | None:
    """Retrieve asset from cache or resolve against public asset folders."""
    if filename in _ASSET_CACHE:
        return _ASSET_CACHE[filename]

    candidate_locations = [
        PROJECT_ROOT / "public" / filename,
        PROJECT_ROOT / "public" / "images" / filename,
        PROJECT_ROOT / "public" / "assets" / filename,
        PROJECT_ROOT / filename,
    ]

    for loc in candidate_locations:
        if loc.is_file() and loc.stat().st_size > 0:
            _ASSET_CACHE[filename] = loc
            return loc

    _ASSET_CACHE[filename] = None
    return None


class DocumentColors:
    """Standardized Sky Ariana brand colors for vector PDF rendering."""

    PRIMARY_NAVY = "#0B2545"      # Dark navy primary
    ACCENT_GOLD = "#C59B27"       # Official gold highlight
    DARK_SLATE = "#0F172A"        # Slate text
    MUTED_GRAY = "#64748B"        # Subtitle and secondary text
    BORDER_LIGHT = "#E2E8F0"      # Subtle table line
    BORDER_DARK = "#94A3B8"       # Strong divider line
    BG_LIGHT = "#F8FAFC"          # Table alternating background
    BG_ACCENT = "#EFF6FF"         # Highlight box background
    SUCCESS_GREEN = "#16A34A"     # Cleared / approved status
    WARNING_AMBER = "#D97706"     # In transit / review status


class DocumentBranding:
    """Company details and branding configuration for headers and footers."""

    COMPANY_NAME = "SKY ARIANA LIMITED"
    COMPANY_SUBTITLE = "International Freight Forwarding & Multi-Modal Logistics Management"
    HEADQUARTERS = "Kabul • Herat • Bandar Abbas • Dubai • Delhi"
    CONTACT_LINE = "Email: info@skyariana.com | Web: www.skyariana.com | Tel: +93 700 939 365"
    DISCLAIMER = "Generated electronically by AQ Companies Logistics Platform. Official multi-modal carrier copy."

    @classmethod
    def get_logo_path(cls) -> Path | None:
        """Find company logo or return None for clean typographic fallback."""
        for candidate in ["logo.png", "sky-ariana-logo.png", "aq-logo.png"]:
            path = get_cached_asset_path(candidate)
            if path:
                return path
        return None

    @classmethod
    def get_stamp_path(cls) -> Path | None:
        """Find official stamp or return None."""
        return get_cached_asset_path("stamp.png")
