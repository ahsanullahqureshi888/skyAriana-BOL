import os
import sys
from pathlib import Path
from backend.config import resolve_app_data_dir


def test_resolve_app_data_dir_dev():
    """Development mode should point to local data directory."""
    dir_path = resolve_app_data_dir("development")
    assert dir_path.is_dir()
    assert dir_path.name == "data"


def test_resolve_app_data_dir_override(monkeypatch):
    """Explicit SKY_DATA_DIR override should be honored."""
    temp_dir = Path(__file__).resolve().parent / "temp_override"
    monkeypatch.setenv("SKY_DATA_DIR", str(temp_dir))
    try:
        resolved = resolve_app_data_dir("production")
        assert resolved == temp_dir.resolve()
        assert resolved.exists()
    finally:
        if temp_dir.exists():
            temp_dir.rmdir()


def test_resolve_app_data_dir_production(monkeypatch):
    """Production mode on Windows should resolve to %LOCALAPPDATA%\\AQ COMPANIES\\data."""
    if sys.platform == "win32":
        local_app_data = os.getenv("LOCALAPPDATA")
        if local_app_data:
            monkeypatch.delenv("SKY_DATA_DIR", raising=False)
            resolved = resolve_app_data_dir("production")
            expected_prefix = (Path(local_app_data) / "AQ COMPANIES" / "data").resolve()
            assert resolved == expected_prefix
