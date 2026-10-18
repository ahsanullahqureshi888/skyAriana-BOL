import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base
from app.models.models import Invoice
from app.schemas.schemas import InvoiceCreate
from app.services.invoice_number import generate_invoice_number


class InvoiceNumberTests(unittest.TestCase):
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

    def test_create_schema_allows_blank_number_for_server_generation(self):
        payload = InvoiceCreate.model_validate({
            "invoice_date": "2026-07-16",
            "due_date": "2026-08-15",
            "customer_id": 1,
            "items": [{"description": "Dry figs"}],
        })
        self.assertIsNone(payload.invoice_number)

    def test_generated_number_increments_existing_year_sequence(self):
        self.db.add(Invoice(
            invoice_number="INV-SABBB-2026-001",
            invoice_date=date(2026, 7, 16),
            due_date=date(2026, 8, 15),
            customer_id=1,
            created_by=1,
        ))
        self.db.commit()
        self.assertEqual(generate_invoice_number(self.db, date(2026, 7, 16)), "INV-SABBB-2026-002")


if __name__ == "__main__":
    unittest.main()
