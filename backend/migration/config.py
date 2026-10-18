from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional


@dataclass
class MigrationConfig:
    """Configuration for ETL data migration pipeline."""

    # Root project path
    base_dir: Path = field(default_factory=lambda: Path(__file__).resolve().parent.parent.parent)

    # Database URL override (defaults to None, meaning use backend.config.settings)
    database_url: Optional[str] = None

    # Batch insert size
    batch_size: int = 250

    # Dry-run flag (simulate without committing DB transactions)
    dry_run: bool = False

    # Force re-migration of already migrated records
    skip_existing: bool = True

    # Report output directory
    report_dir: Optional[Path] = None

    # Source search directories
    source_dirs: List[Path] = field(default_factory=list)

    def __post_init__(self):
        if not self.source_dirs:
            self.source_dirs = [
                self.base_dir,
                self.base_dir / "data",
                self.base_dir / "seed-data",
            ]
        if self.report_dir is None:
            self.report_dir = self.base_dir / "data" / "reports"
        self.report_dir.mkdir(parents=True, exist_ok=True)
