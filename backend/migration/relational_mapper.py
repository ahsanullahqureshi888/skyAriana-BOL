from __future__ import annotations

from typing import Dict, Optional

from backend.migration.cleaners import clean_code, clean_text


class RelationalMapper:
    """Maintains mapping tables to preserve referential integrity across entities."""

    def __init__(self):
        # Entity maps: lookup_key -> db_uuid
        self.companies: Dict[str, str] = {}
        self.shippers: Dict[str, str] = {}
        self.consignees: Dict[str, str] = {}
        self.drivers: Dict[str, str] = {}
        self.trucks: Dict[str, str] = {}
        self.bols: Dict[str, str] = {}
        self.invoices: Dict[str, str] = {}
        self.ledger_accounts: Dict[str, str] = {}
        self.customers: Dict[str, str] = {}

    def register_company(self, name: str, code: str, db_id: str) -> None:
        if name:
            self.companies[clean_code(name)] = db_id
        if code:
            self.companies[clean_code(code)] = db_id

    def register_shipper(self, name: str, db_id: str) -> None:
        if name:
            self.shippers[clean_code(name)] = db_id

    def register_consignee(self, name: str, db_id: str) -> None:
        if name:
            self.consignees[clean_code(name)] = db_id

    def register_driver(self, name: str, db_id: str) -> None:
        if name:
            self.drivers[clean_code(name)] = db_id

    def register_truck(self, truck_number: str, db_id: str) -> None:
        if truck_number:
            self.trucks[clean_code(truck_number)] = db_id

    def register_bol(self, bol_number: str, db_id: str) -> None:
        if bol_number:
            self.bols[clean_code(bol_number)] = db_id

    def register_invoice(self, invoice_number: str, db_id: str) -> None:
        if invoice_number:
            self.invoices[clean_code(invoice_number)] = db_id

    def register_customer(self, customer_name: str, db_id: str) -> None:
        if customer_name:
            self.customers[clean_code(customer_name)] = db_id

    def register_ledger_account(self, account_code: str, account_name: str, db_id: str, aliases: Optional[list] = None) -> None:
        if account_code:
            self.ledger_accounts[clean_code(account_code)] = db_id
        if account_name:
            self.ledger_accounts[clean_code(account_name)] = db_id
        if aliases:
            for a in aliases:
                if a:
                    self.ledger_accounts[clean_code(str(a))] = db_id

    def resolve_bol_id(self, bol_number: Optional[str]) -> Optional[str]:
        if not bol_number:
            return None
        return self.bols.get(clean_code(bol_number))

    def resolve_invoice_id(self, invoice_number: Optional[str]) -> Optional[str]:
        if not invoice_number:
            return None
        return self.invoices.get(clean_code(invoice_number))

    def resolve_ledger_account_id(self, identifier: Optional[str]) -> Optional[str]:
        if not identifier:
            return None
        return self.ledger_accounts.get(clean_code(identifier))

    def resolve_customer_id(self, customer_name: Optional[str]) -> Optional[str]:
        if not customer_name:
            return None
        return self.customers.get(clean_code(customer_name))

    def resolve_shipper_id(self, shipper_name: Optional[str]) -> Optional[str]:
        if not shipper_name:
            return None
        return self.shippers.get(clean_code(shipper_name))

    def resolve_consignee_id(self, consignee_name: Optional[str]) -> Optional[str]:
        if not consignee_name:
            return None
        return self.consignees.get(clean_code(consignee_name))

    def resolve_driver_id(self, driver_name: Optional[str]) -> Optional[str]:
        if not driver_name:
            return None
        return self.drivers.get(clean_code(driver_name))

    def resolve_truck_id(self, truck_number: Optional[str]) -> Optional[str]:
        if not truck_number:
            return None
        return self.trucks.get(clean_code(truck_number))
