import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base
from app.models import models
from app.services.access_control import can_assign_role, has_permission, validate_password
from app.services.audit import write_audit


class AccessControlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.Session()

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    def test_super_admin_has_every_permission_and_viewer_cannot_manage_users(self):
        super_admin = models.User(id=1, name="Owner", email="owner@example.com", password_hash="x", role="Super Admin")
        viewer = models.User(id=2, name="Reader", email="reader@example.com", password_hash="x", role="Viewer")
        self.db.add_all([super_admin, viewer])
        self.db.commit()

        self.assertTrue(has_permission(self.db, super_admin, "security.manage"))
        self.assertFalse(has_permission(self.db, viewer, "users.view"))
        self.assertTrue(has_permission(self.db, viewer, "invoices.view"))

    def test_role_authority_does_not_allow_viewer_to_assign_roles(self):
        viewer = models.User(id=3, name="Reader", email="reader2@example.com", password_hash="x", role="Viewer")
        manager = models.User(id=4, name="Manager", email="manager@example.com", password_hash="x", role="Manager")
        owner = models.User(id=5, name="Owner", email="owner2@example.com", password_hash="x", role="Super Admin")
        self.db.add_all([viewer, manager, owner])
        self.db.commit()

        self.assertFalse(can_assign_role(self.db, viewer, "Viewer"))
        self.assertTrue(can_assign_role(self.db, manager, "Viewer"))
        self.assertFalse(can_assign_role(self.db, manager, "Super Admin"))
        self.assertTrue(can_assign_role(self.db, owner, "Super Admin"))

    def test_password_policy_rejects_weak_credentials(self):
        policy = models.SecuritySettings(
            minimum_password_length=10,
            require_uppercase=True,
            require_lowercase=True,
            require_number=True,
            require_special=True,
        )
        errors = validate_password("short", policy)
        self.assertGreaterEqual(len(errors), 4)
        self.assertEqual(validate_password("StrongPass9!", policy), [])

    def test_audit_sanitizes_credentials_and_tokens(self):
        record = write_audit(
            self.db,
            actor_user_id=None,
            action="security.test",
            module="security",
            description="Test event",
            new_values={"temporary_password": "Never store this", "access_token": "secret-token", "status": "active"},
        )
        self.db.flush()

        self.assertNotIn("temporary_password", record.new_values)
        self.assertNotIn("access_token", record.new_values)
        self.assertEqual(record.new_values["status"], "active")


if __name__ == "__main__":
    unittest.main()
