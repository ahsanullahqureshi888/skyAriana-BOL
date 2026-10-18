@echo off
title AQ COMPANIES - Firewall Setup (Port 8000)
color 0B
cls
echo =====================================================================
echo    AQ COMPANIES - WINDOWS DEFENDER FIREWALL CONFIGURATION
echo =====================================================================
echo.
echo This utility configures Windows Defender Firewall to allow incoming
echo connections on TCP Port 8000 so office workstation computers on the
echo same Wi-Fi or LAN can connect to this Central Server.
echo.
echo Requesting administrator rights to configure firewall...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [WARNING]: Please right-click this script and choose "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo Adding firewall rule: 'AQ COMPANIES Central Server (Port 8000)'...
netsh advfirewall firewall add rule name="AQ COMPANIES Central Server (Port 8000)" dir=in action=allow protocol=TCP localport=8000 profile=private,domain

echo.
echo =====================================================================
echo [SUCCESS] Port 8000 is now open on your Private/Domain office network!
echo Colleagues on this LAN can now connect to this PC.
echo =====================================================================
echo.
pause
