import json
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base
from app.api.invoices import record_party_relationship
from app.models.models import BusinessParty, BusinessPartyRelationship
from app.services.business_parties import import_seed_records, normalize_name, normalize_phone, party_to_snapshot


def make_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def load_seed():
    path = Path(__file__).parents[1] / "data" / "business_parties_seed.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_seed_contains_all_reviewed_registry_records():
    records = load_seed()
    assert len(records) == 61
    assert sum(record["party_type"] == "shipper" for record in records) == 39
    assert sum(record["party_type"] == "notify_party" for record in records) == 22
    assert any(any("YMQOUB" in alias for alias in record.get("aliases", [])) for record in records)
    assert any(record["canonical_name"] == "LAKHDATAR FOODS" for record in records)


def test_name_and_phone_normalization_preserve_matching_rules():
    assert normalize_name("ELECO GENERAL TRADING L.L.C") == normalize_name("ELECO GENERAL TRADING LLC")
    assert normalize_phone("0093-785226400") == "+93785226400"
    assert normalize_phone("+971 50 795 9049") == "+971507959049"


def test_import_is_idempotent_and_snapshot_maps_source_fields():
    db = make_db()
    first = import_seed_records(db, load_seed())
    db.commit()
    assert first["shippersInserted"] == 39
    assert first["notifyPartiesInserted"] == 22
    assert db.query(BusinessParty).count() == 61

    second = import_seed_records(db, load_seed())
    assert second["shippersInserted"] == 0
    assert second["notifyPartiesInserted"] == 0
    assert second["recordsSkipped"] == 61
    assert db.query(BusinessParty).count() == 61

    party = db.query(BusinessParty).filter(BusinessParty.display_name == "YAAQOUB HAMDAN FOODSTUFF TRADING CO LLC").one()
    snapshot = party_to_snapshot(party)
    assert snapshot["taxNumber"] == "100340961000003"
    assert snapshot["addressLine1"].startswith("Shop No: 28")
    db.close()


def test_shipper_notify_relationship_usage_is_incremental():
    db = make_db()
    shipper = BusinessParty(
        party_type="shipper",
        canonical_name="SHIPPER ONE",
        display_name="SHIPPER ONE",
        normalized_name="shipper one",
    )
    notify = BusinessParty(
        party_type="notify_party",
        canonical_name="NOTIFY ONE",
        display_name="NOTIFY ONE",
        normalized_name="notify one",
    )
    db.add_all([shipper, notify])
    db.flush()

    record_party_relationship(db, shipper.id, notify.id)
    record_party_relationship(db, shipper.id, notify.id)
    db.flush()

    relationship = db.query(BusinessPartyRelationship).one()
    assert relationship.relationship_type == "previously_used_notify_party"
    assert relationship.usage_count == 2
    db.close()
