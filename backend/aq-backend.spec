# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

project_dir = Path(os.path.abspath('.')).resolve()
backend_dir = project_dir / 'backend'

# Hidden imports required by dynamic routers, drivers, and frameworks
hidden_imports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'aiosqlite',
    'sqlite3',
    'asyncpg',
    'psycopg',
    'psycopg_binary',
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.dialects.sqlite.aiosqlite',
    'sqlalchemy.dialects.postgresql',
    'sqlalchemy.dialects.postgresql.asyncpg',
    'sqlalchemy.dialects.postgresql.psycopg',
    'pydantic',
    'pydantic_settings',
    'reportlab',
    'openpyxl',
    'alembic',
]

# Collect all backend submodules automatically
hidden_imports += collect_submodules('backend')

# Data files (Alembic configuration, templates, migrations)
datas = [
    (str(backend_dir / 'alembic.ini'), 'backend'),
    (str(backend_dir / 'alembic'), 'backend/alembic'),
]

a = Analysis(
    [str(backend_dir / 'entrypoint.py')],
    pathex=[str(project_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['pytest', 'pytest_asyncio', 'tkinter', 'unittest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='aq-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,  # Hidden by Electron via windowsHide: true
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(project_dir / 'public' / 'app-icon.ico'),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='backend',
)
