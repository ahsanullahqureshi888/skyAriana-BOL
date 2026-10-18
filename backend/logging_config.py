from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from backend.config import settings


def setup_logging() -> logging.Logger:
    """Configure structured console and rotating file logging."""
    logger = logging.getLogger("sky_ariana")
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    logger.setLevel(log_level)

    # Avoid duplicate handlers on re-entry
    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s:%(funcName)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Rotating File Handler
    try:
        log_file = settings.logs_dir / "backend.log"
        file_handler = RotatingFileHandler(
            filename=str(log_file),
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as exc:
        print(f"Warning: Could not initialize file logger: {exc}", file=sys.stderr)

    return logger


logger = setup_logging()
