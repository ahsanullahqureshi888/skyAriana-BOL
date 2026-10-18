import os
import tempfile
import unittest
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.app import models
from backend.app.auth.security import create_access_token, hash_password
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.services.ledger import recalculate_after_transaction
from backend.app.services.seed import seed_database


class TransactionDeleteTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tempdir.name) / "test.db"
        self.engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
        self.TestingSessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        Base.metadata.create_all(bind=self.engine)

        def override_get_db():
            db = self.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self._create_fixture_transaction()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()
        self.tempdir.cleanup()

    @property
    def auth_headers(self):
        token = create_access_token(str(self.admin_id), "Admin")
        return {"Authorization": f"Bearer {token}"}

    def _create_fixture_transaction(self, receipt_no="BB-2026-DELETE"):
        with self.TestingSessionLocal() as db:
            admin = models.User(
                name="Admin User",
                email=f"{receipt_no.lower()}@example.com",
                password_hash=hash_password("admin123"),
                role="Admin",
            )
            customer = models.Customer(name=f"Customer {receipt_no}", phone="+93 700 000 000")
            bank = models.BankAccount(
                bank_name="AIB Bank",
                account_name=f"Booking {receipt_no}",
                account_number=f"{receipt_no}-USD",
                currency="USD",
                opening_balance=1000,
                current_balance=1000,
            )
            db.add_all([admin, customer, bank])
            db.flush()

            transaction = models.Transaction(
                receipt_no=receipt_no,
                date=date.today(),
                type="Received",
                customer_id=customer.id,
                company_name="Sky Ariana & Balam Bar Baran",
                subject="Delete route test",
                amount=250,
                currency="USD",
                equivalent_amount=250,
                equivalent_currency="USD",
                payment_method="Bank Transfer",
                bank_account_id=bank.id,
                receiver_name="Finance Office",
                description="Test transaction",
                status="Completed",
                created_by=admin.id,
            )
            db.add(transaction)
            db.flush()

            attachment = models.Attachment(
                transaction_id=transaction.id,
                file_name="receipt.pdf",
                file_path="/tmp/receipt.pdf",
                file_type="application/pdf",
            )
            db.add(attachment)
            recalculate_after_transaction(db, transaction)
            db.commit()

            self.admin_id = admin.id
            self.transaction_id = transaction.id
            self.receipt_no = transaction.receipt_no
            self.customer_id = customer.id
            self.bank_id = bank.id

    def test_successful_deletion_removes_transaction_and_related_records(self):
        response = self.client.delete(f"/api/transactions/{self.transaction_id}", headers=self.auth_headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Transaction deleted permanently.")

        with self.TestingSessionLocal() as db:
            self.assertIsNone(db.get(models.Transaction, self.transaction_id))
            self.assertEqual(db.scalars(select(models.Attachment).where(models.Attachment.transaction_id == self.transaction_id)).all(), [])
            self.assertEqual(db.scalars(select(models.CustomerLedger).where(models.CustomerLedger.transaction_id == self.transaction_id)).all(), [])
            self.assertEqual(db.scalars(select(models.BankLedger).where(models.BankLedger.transaction_id == self.transaction_id)).all(), [])
            bank = db.get(models.BankAccount, self.bank_id)
            self.assertEqual(bank.current_balance, bank.opening_balance)

    def test_unknown_transaction_id_returns_404(self):
        response = self.client.delete("/api/transactions/999999", headers=self.auth_headers)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Transaction not found")

    def test_database_deletion_failure_rolls_back(self):
        def failing_get_db():
            db = self.TestingSessionLocal()
            original_commit = db.commit

            def fail_commit():
                raise RuntimeError("forced commit failure")

            db.commit = fail_commit
            try:
                yield db
            finally:
                db.commit = original_commit
                db.close()

        app.dependency_overrides[get_db] = failing_get_db
        response = self.client.delete(f"/api/transactions/{self.transaction_id}", headers=self.auth_headers)

        self.assertEqual(response.status_code, 500)
        self.assertIn("Transaction deletion failed", response.json()["detail"])
        with self.TestingSessionLocal() as db:
            self.assertIsNotNone(db.get(models.Transaction, self.transaction_id))

    def test_transaction_list_stays_deleted_after_refetch(self):
        delete_response = self.client.delete(f"/api/transactions/{self.transaction_id}", headers=self.auth_headers)
        self.assertEqual(delete_response.status_code, 200)

        list_response = self.client.get("/api/transactions", headers=self.auth_headers)
        self.assertEqual(list_response.status_code, 200)
        returned_ids = {item["id"] for item in list_response.json()}
        self.assertNotIn(self.transaction_id, returned_ids)

    def test_seed_database_does_not_recreate_deleted_demo_transaction_by_default(self):
        previous_seed_flag = os.environ.pop("SEED_DEMO_DATA", None)
        try:
            with self.TestingSessionLocal() as db:
                seed_database(db)
                self.assertIsNone(db.scalar(select(models.Transaction).where(models.Transaction.receipt_no == "BB-2026-0001")))
        finally:
            if previous_seed_flag is not None:
                os.environ["SEED_DEMO_DATA"] = previous_seed_flag

    def test_deleted_demo_transaction_is_not_restored_on_restart_seed(self):
        previous_seed_flag = os.environ.get("SEED_DEMO_DATA")
        try:
            os.environ["SEED_DEMO_DATA"] = "1"
            with self.TestingSessionLocal() as db:
                seed_database(db)
                demo_transaction = db.scalar(select(models.Transaction).where(models.Transaction.receipt_no == "BB-2026-0001"))
                self.assertIsNotNone(demo_transaction)
                demo_id = demo_transaction.id

            delete_response = self.client.delete(f"/api/transactions/{demo_id}", headers=self.auth_headers)
            self.assertEqual(delete_response.status_code, 200)

            os.environ.pop("SEED_DEMO_DATA", None)
            with self.TestingSessionLocal() as db:
                seed_database(db)
                restored = db.scalar(select(models.Transaction).where(models.Transaction.receipt_no == "BB-2026-0001"))
                self.assertIsNone(restored)
        finally:
            if previous_seed_flag is None:
                os.environ.pop("SEED_DEMO_DATA", None)
            else:
                os.environ["SEED_DEMO_DATA"] = previous_seed_flag


if __name__ == "__main__":
    unittest.main()
