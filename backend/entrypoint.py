"""
AQ COMPANIES — Logistics & BOL Management
Standalone Python Backend Entrypoint for PyInstaller Packaging
"""

from __future__ import annotations

import argparse
import multiprocessing
import os
import sys
from pathlib import Path

# Ensure application root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Critical for PyInstaller on Windows
multiprocessing.freeze_support()

# Ensure stdout and stderr are writable even if spawned in windowed mode
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

import uvicorn
from backend.config import settings
from backend.main import app

def main():
    parser = argparse.ArgumentParser(description="AQ COMPANIES Production Backend")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument("--log-level", default="warning", help="Uvicorn log level")
    parser.add_argument("--data-dir", default=None, help="Explicit data directory override")

    args = parser.parse_args()

    if args.data_dir:
        os.environ["SKY_DATA_DIR"] = args.data_dir

    port = args.port or settings.PORT or 8000
    host = args.host or settings.HOST or "127.0.0.1"

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level=args.log_level.lower(),
        access_log=False,
    )

if __name__ == "__main__":
    main()
