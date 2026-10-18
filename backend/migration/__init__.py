from __future__ import annotations

import asyncio
from backend.migration.config import MigrationConfig
from backend.migration.deduplicator import Deduplicator
from backend.migration.extractors import DataExtractor, ExtractedDataset
from backend.migration.invariance import (
    AccountInvarianceResult,
    AccountingInvarianceChecker,
    InvarianceAuditSummary,
)
from backend.migration.loaders import DatabaseLoader
from backend.migration.pipeline import MigrationPipeline
from backend.migration.relational_mapper import RelationalMapper
from backend.migration.report import MigrationReport


async def run_migration(config: MigrationConfig | None = None) -> MigrationReport:
    """Convenience async helper to run the migration pipeline."""
    pipeline = MigrationPipeline(config)
    return await pipeline.run()


__all__ = [
    "MigrationConfig",
    "MigrationPipeline",
    "MigrationReport",
    "DataExtractor",
    "ExtractedDataset",
    "Deduplicator",
    "RelationalMapper",
    "DatabaseLoader",
    "AccountingInvarianceChecker",
    "AccountInvarianceResult",
    "InvarianceAuditSummary",
    "run_migration",
]
