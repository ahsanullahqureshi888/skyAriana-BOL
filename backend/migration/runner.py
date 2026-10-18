from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from backend.logging_config import setup_logging
from backend.migration.config import MigrationConfig
from backend.migration.pipeline import MigrationPipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sky Ariana BOL Legacy Data ETL Migration Runner")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration without committing changes to database.",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Target database connection URL.",
    )
    parser.add_argument(
        "--report-dir",
        type=str,
        default=None,
        help="Directory to save JSON and Markdown migration audit reports.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=250,
        help="Batch insert chunk size (default: 250).",
    )
    return parser.parse_args()


async def main_async() -> int:
    args = parse_args()
    setup_logging()
    logger = logging.getLogger("sky_ariana.migration.runner")

    config = MigrationConfig(
        dry_run=args.dry_run,
        database_url=args.db_url,
        batch_size=args.batch_size,
    )
    if args.report_dir:
        config.report_dir = Path(args.report_dir)

    pipeline = MigrationPipeline(config)
    report = await pipeline.run()

    # Print summary to stdout
    print("\n" + "=" * 60)
    print(report.to_markdown())
    print("=" * 60 + "\n")

    if not report.success:
        logger.error("Migration finished with errors.")
        return 1

    logger.info("Migration finished successfully.")
    return 0


def main() -> None:
    sys.exit(asyncio.run(main_async()))


if __name__ == "__main__":
    main()
