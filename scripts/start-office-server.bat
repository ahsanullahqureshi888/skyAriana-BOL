@echo off
title AQ COMPANIES - Central Office Server
color 0A
cls
echo =====================================================================
echo           AQ COMPANIES - CENTRAL OFFICE NETWORK SERVER
echo =====================================================================
echo.
echo Starting the Central Server for Office Multi-PC Networking...
echo.

:: Detect local IPv4 address
echo [Network Interfaces Detected]:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo   -> IP: %%a
)
echo.
echo [Default Central Port]: 8000
echo.
echo ---------------------------------------------------------------------
echo Client Workstations on this office network can connect using:
echo   Mode:     Central Server (Multi-PC)
echo   Host IP:  (Use your local Wi-Fi or Ethernet IP listed above)
echo   Port:     8000
echo   Protocol: HTTP
echo ---------------------------------------------------------------------
echo.
echo Launching High-Performance FastAPI Backend on 0.0.0.0:8000...
echo (Keep this window open while other office computers are working)
echo.

if exist "resources\backend\aq-backend.exe" (
    "resources\backend\aq-backend.exe" --host 0.0.0.0 --port 8000
) else if exist "..\resources\backend\aq-backend.exe" (
    "..\resources\backend\aq-backend.exe" --host 0.0.0.0 --port 8000
) else if exist "D:\SOFTWARES-APPS\BOL-SOFTWARE-V5\resources\backend\aq-backend.exe" (
    "D:\SOFTWARES-APPS\BOL-SOFTWARE-V5\resources\backend\aq-backend.exe" --host 0.0.0.0 --port 8000
) else (
    echo Error: aq-backend.exe could not be found.
    pause
)
