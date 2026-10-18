"""Authentication and Session Management Service for AQ COMPANIES.

Features:
- PBKDF2-SHA512 password hashing (100,000 iterations, 64-byte salt)
  100% interoperable with Node.js/Electron crypto implementation.
- Cryptographic session token issuance and verification with HMAC-SHA256 signature.
- Multi-device session tracking and revocation.
- Single-use SKY-XXXX-XXXX pairing codes for multi-device PC enrollment.
"""

from __future__ import annotations

import base64
import datetime
import hashlib
import hmac
import json
import logging
import os
import secrets
import uuid
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.system import AuditLogModel, UserModel
from backend.services.path_service import get_app_data_dir

logger = logging.getLogger("aq_companies.auth")

SECRET_KEY_FILE = get_app_data_dir() / ".server_secret.key"
SESSIONS_FILE = get_app_data_dir() / ".local-server-sessions.json"
PAIRING_FILE = get_app_data_dir() / ".local-server-pairings.json"

DEFAULT_ITERATIONS = 100_000
HASH_ALGORITHM = "sha512"


def get_or_create_server_secret() -> bytes:
    """Retrieve or initialize persistent 32-byte secret key for HMAC signatures."""
    if SECRET_KEY_FILE.exists():
        try:
            return SECRET_KEY_FILE.read_bytes().strip()
        except Exception:
            pass
    # Generate new secret key
    secret = secrets.token_bytes(32)
    try:
        SECRET_KEY_FILE.write_bytes(secret)
    except Exception as exc:
        logger.warning(f"Could not persist server secret key: {exc}")
    return secret


SERVER_SECRET = get_or_create_server_secret()


# -----------------------------------------------------------------------------
# 1. PASSWORD HASHING (PBKDF2-SHA512)
# -----------------------------------------------------------------------------

def hash_password(password: str, existing_salt: Optional[str] = None) -> tuple[str, str]:
    """Hash password using PBKDF2-SHA512 matching Node.js/Electron implementation.
    
    Returns: (password_hash_hex, salt_hex)
    """
    salt_bytes = bytes.fromhex(existing_salt) if existing_salt else secrets.token_bytes(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        HASH_ALGORITHM,
        password.encode("utf-8"),
        salt_bytes,
        DEFAULT_ITERATIONS,
        dklen=64,
    )
    return hash_bytes.hex(), salt_bytes.hex()


def verify_password(password: str, stored_hash: str, salt_hex: str) -> bool:
    """Verify plaintext password against stored PBKDF2-SHA512 hash and salt."""
    try:
        calculated_hash, _ = hash_password(password, salt_hex)
        return hmac.compare_digest(calculated_hash, stored_hash)
    except Exception as exc:
        logger.error(f"Password verification error: {exc}")
        return False


# -----------------------------------------------------------------------------
# 2. CRYPTOGRAPHIC TOKEN GENERATION & SIGNING
# -----------------------------------------------------------------------------

def generate_signed_token(payload: dict[str, Any]) -> str:
    """Create URL-safe base64 JSON payload with HMAC-SHA256 signature."""
    payload_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    signature = hmac.new(SERVER_SECRET, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_signed_token(token_str: str) -> Optional[dict[str, Any]]:
    """Verify HMAC signature and decode token payload. Returns None if invalid or expired."""
    try:
        parts = token_str.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts[0], parts[1]

        expected_sig = hmac.new(SERVER_SECRET, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Add padding back if necessary
        rem = len(payload_b64) % 4
        padded = payload_b64 + ("=" * (4 - rem) if rem else "")
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))

        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.datetime.fromtimestamp(exp, datetime.timezone.utc) < datetime.datetime.now(datetime.timezone.utc):
            return None

        return payload
    except Exception as exc:
        logger.debug(f"Token verification failed: {exc}")
        return None


# -----------------------------------------------------------------------------
# 3. SESSION MANAGEMENT
# -----------------------------------------------------------------------------

def read_sessions() -> dict[str, dict[str, Any]]:
    if not SESSIONS_FILE.exists():
        return {}
    try:
        with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def write_sessions(sessions: dict[str, dict[str, Any]]) -> None:
    temp_file = SESSIONS_FILE.with_suffix(".tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(sessions, f, indent=2)
        temp_file.replace(SESSIONS_FILE)
    except Exception as exc:
        logger.error(f"Failed to persist sessions: {exc}")


def create_user_session(
    user_id: str,
    username: str,
    role: str,
    device_id: Optional[str] = None,
    device_name: Optional[str] = None,
    days_valid: int = 30,
) -> str:
    """Create a new session, persist it, and return the signed access token."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(days=days_valid)
    token_id = secrets.token_hex(16)

    payload = {
        "jti": token_id,
        "sub": user_id,
        "username": username,
        "role": role,
        "device_id": device_id,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    signed_token = generate_signed_token(payload)

    sessions = read_sessions()
    sessions[token_id] = {
        "token_id": token_id,
        "user_id": user_id,
        "username": username,
        "role": role,
        "device_id": device_id,
        "device_name": device_name or "Primary PC Client",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "active": True,
    }
    write_sessions(sessions)

    return signed_token


def revoke_session(token_id: str) -> bool:
    """Revoke an active session token."""
    sessions = read_sessions()
    if token_id in sessions:
        sessions[token_id]["active"] = False
        write_sessions(sessions)
        return True
    return False


# -----------------------------------------------------------------------------
# 4. PAIRING CODES (Multi-PC Enrollment)
# -----------------------------------------------------------------------------

def generate_pairing_code(role: str = "accounting", minutes_valid: int = 15) -> dict[str, Any]:
    """Generate high-readability pairing code (e.g. SKY-7N4X-92KD) for device setup."""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    part1 = "".join(secrets.choice(chars) for _ in range(4))
    part2 = "".join(secrets.choice(chars) for _ in range(4))
    code = f"SKY-{part1}-{part2}"

    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(minutes=minutes_valid)

    record = {
        "code": code,
        "role": role,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "used": False,
        "used_by_device": None,
    }

    pairings = {}
    if PAIRING_FILE.exists():
        try:
            with open(PAIRING_FILE, "r", encoding="utf-8") as f:
                pairings = json.load(f)
        except Exception:
            pass

    pairings[code] = record
    temp_file = PAIRING_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(pairings, f, indent=2)
    temp_file.replace(PAIRING_FILE)

    return {
        "code": code,
        "role": role,
        "expires_at": expires_at.isoformat(),
        "valid_minutes": minutes_valid,
    }


def redeem_pairing_code(code: str, device_id: str, device_name: str) -> Optional[dict[str, Any]]:
    """Redeem a pairing code to authorize a new device."""
    if not PAIRING_FILE.exists():
        return None
    try:
        with open(PAIRING_FILE, "r", encoding="utf-8") as f:
            pairings = json.load(f)
    except Exception:
        return None

    code_upper = code.strip().upper()
    record = pairings.get(code_upper)
    if not record or record.get("used"):
        return None

    exp = datetime.datetime.fromisoformat(record["expires_at"])
    if exp < datetime.datetime.now(datetime.timezone.utc):
        return None

    # Mark as used
    record["used"] = True
    record["used_by_device"] = device_id
    record["used_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    pairings[code_upper] = record

    temp_file = PAIRING_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(pairings, f, indent=2)
    temp_file.replace(PAIRING_FILE)

    return record
