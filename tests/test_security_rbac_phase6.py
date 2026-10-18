"""Comprehensive Automated Test Suite for Phase 6: Security, Multi-User RBAC & Audit Trails."""

from __future__ import annotations

import asyncio
import datetime
import json
import os
import sys
import unittest
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.auth_middleware import check_permission
from backend.services.auth_service import (
    create_user_session,
    generate_pairing_code,
    generate_signed_token,
    hash_password,
    redeem_pairing_code,
    revoke_session,
    verify_password,
    verify_signed_token,
)
from backend.services.rbac_service import (
    ROLE_ACCOUNTING,
    ROLE_ADMIN,
    ROLE_CLIENT_PORTAL,
    ROLE_MANAGEMENT,
    ROLE_OPERATIONS,
    ROLE_SUPERADMIN,
    ROLE_VIEWER,
    get_role_permissions,
)


class TestPhase6SecurityRBAC(unittest.TestCase):
    def test_01_pbkdf2_password_hashing_and_verification(self):
        """Verify PBKDF2-SHA512 password hashing, salt uniqueness, and constant-time verification."""
        password = "SecurePassword@2026"
        hashed, salt = hash_password(password)

        self.assertEqual(len(salt), 32)  # 16 bytes = 32 hex chars
        self.assertEqual(len(hashed), 128)  # 64 bytes = 128 hex chars

        # Positive verification
        self.assertTrue(verify_password(password, hashed, salt))

        # Negative verification (wrong password)
        self.assertFalse(verify_password("WrongPassword123", hashed, salt))

        # Salt uniqueness (same password with new salt generates different hash)
        hashed2, salt2 = hash_password(password)
        self.assertNotEqual(salt, salt2)
        self.assertNotEqual(hashed, hashed2)
        self.assertTrue(verify_password(password, hashed2, salt2))

    def test_02_signed_cryptographic_token(self):
        """Verify token generation, signature validation, tampering rejection, and expiration."""
        payload = {
            "sub": "user_12345",
            "username": "ahsan",
            "role": "admin",
            "exp": int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)).timestamp()),
        }
        token = generate_signed_token(payload)
        self.assertIn(".", token)

        # Successful verification
        verified = verify_signed_token(token)
        self.assertIsNotNone(verified)
        self.assertEqual(verified["sub"], "user_12345")
        self.assertEqual(verified["username"], "ahsan")
        self.assertEqual(verified["role"], "admin")

        # Tampered payload rejection
        tampered_token = "eyJyZXF1ZXN0IjoiaGFja2VkIn0." + token.split(".")[1]
        self.assertIsNone(verify_signed_token(tampered_token))

        # Tampered signature rejection
        bad_sig_token = token.split(".")[0] + ".00000000000000000000000000000000"
        self.assertIsNone(verify_signed_token(bad_sig_token))

        # Expired token rejection
        expired_payload = {
            "sub": "user_expired",
            "username": "expired_user",
            "exp": int((datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=10)).timestamp()),
        }
        expired_token = generate_signed_token(expired_payload)
        self.assertIsNone(verify_signed_token(expired_token))

    def test_03_session_creation_and_revocation(self):
        """Verify user session creation, state tracking, and explicit revocation."""
        user_id = "test_user_777"
        username = "compliance_officer"
        role = "accounting"

        signed_token = create_user_session(user_id, username, role, device_name="Test-Laptop")
        payload = verify_signed_token(signed_token)
        self.assertIsNotNone(payload)
        token_id = payload["jti"]

        # Revoke session
        revoked = revoke_session(token_id)
        self.assertTrue(revoked)

    def test_04_rbac_permission_matrix_and_role_segregation(self):
        """Verify fine-grained permission assignments across enterprise roles."""
        # 1. Superadmin has ALL permissions unconditionally
        self.assertTrue(check_permission(ROLE_SUPERADMIN, "backup_restore"))
        self.assertTrue(check_permission(ROLE_SUPERADMIN, "bol_create"))
        self.assertTrue(check_permission(ROLE_SUPERADMIN, "accounting_period_close"))
        self.assertTrue(check_permission(ROLE_SUPERADMIN, "profit_view"))

        # 2. Administrator has operational & financial admin, but NOT backup_restore
        self.assertFalse(check_permission(ROLE_ADMIN, "backup_restore"))
        self.assertTrue(check_permission(ROLE_ADMIN, "bol_create"))
        self.assertTrue(check_permission(ROLE_ADMIN, "user_create"))

        # 3. Accounting has ledger, payment, and financial permissions, but cannot mutate operational shipments
        self.assertTrue(check_permission(ROLE_ACCOUNTING, "accounting_view"))
        self.assertTrue(check_permission(ROLE_ACCOUNTING, "ledger_create"))
        self.assertTrue(check_permission(ROLE_ACCOUNTING, "payment_create"))
        self.assertTrue(check_permission(ROLE_ACCOUNTING, "accounting_period_close"))
        self.assertFalse(check_permission(ROLE_ACCOUNTING, "shipment_edit"))
        self.assertFalse(check_permission(ROLE_ACCOUNTING, "backup_restore"))

        # 4. Operations has BOL/shipment permissions, but 0 profit and 0 period closing access
        self.assertTrue(check_permission(ROLE_OPERATIONS, "bol_create"))
        self.assertTrue(check_permission(ROLE_OPERATIONS, "shipment_create"))
        self.assertTrue(check_permission(ROLE_OPERATIONS, "tracking_update"))
        self.assertFalse(check_permission(ROLE_OPERATIONS, "profit_view"))
        self.assertFalse(check_permission(ROLE_OPERATIONS, "carrier_rate_view"))
        self.assertFalse(check_permission(ROLE_OPERATIONS, "accounting_period_close"))

        # 5. Client portal has strictly gated read-only access (no margins, no internal costs)
        self.assertTrue(check_permission(ROLE_CLIENT_PORTAL, "bol_view"))
        self.assertTrue(check_permission(ROLE_CLIENT_PORTAL, "bol_pdf"))
        self.assertFalse(check_permission(ROLE_CLIENT_PORTAL, "profit_view"))
        self.assertFalse(check_permission(ROLE_CLIENT_PORTAL, "carrier_rate_view"))
        self.assertFalse(check_permission(ROLE_CLIENT_PORTAL, "accounting_view"))

    def test_05_multi_pc_pairing_code_enrollment(self):
        """Verify generation, format, and single-use redemption of companion device pairing codes."""
        pairing = generate_pairing_code(role="accounting", minutes_valid=15)
        code = pairing["code"]

        self.assertTrue(code.startswith("SKY-"))
        self.assertEqual(len(code), 13)  # SKY-XXXX-XXXX

        # Redeem code for device 1
        redeemed = redeem_pairing_code(code, device_id="laptop_warehouse_01", device_name="Warehouse Laptop")
        self.assertIsNotNone(redeemed)
        self.assertTrue(redeemed["used"])
        self.assertEqual(redeemed["used_by_device"], "laptop_warehouse_01")

        # Second redemption attempt MUST be rejected (single-use constraint)
        second_attempt = redeem_pairing_code(code, device_id="rogue_pc_99", device_name="Rogue PC")
        self.assertIsNone(second_attempt)

    def test_06_fastapi_auth_and_me_endpoints(self):
        """Verify REST API authentication and /api/v1/auth/me workflow."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)

        # 1. Login with primary admin account
        login_res = client.post(
            "/api/v1/auth/login",
            json={
                "username": "test_admin",
                "password": "AdminSecurePassword123!",
                "device_name": "Test Runner",
            },
        )
        self.assertEqual(login_res.status_code, 200)
        data = login_res.json()
        self.assertTrue(data["success"])
        token = data["token"]
        self.assertIsNotNone(token)
        self.assertGreater(len(data["permissions"]), 20)

        # 2. Access /api/v1/auth/me with Bearer token
        me_res = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertTrue(me_data["success"])
        self.assertEqual(me_data["user"]["username"], "test_admin")

        # 3. Access without token -> 401 Unauthorized
        unauth_res = client.get("/api/v1/auth/me")
        self.assertEqual(unauth_res.status_code, 401)


def main():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestPhase6SecurityRBAC)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
