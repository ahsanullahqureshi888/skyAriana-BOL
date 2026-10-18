@echo off
title Sky Ariana CMR App
echo ========================================================
echo        SKY ARIANA CMR - STANDALONE DESKTOP APP
echo ========================================================
echo Starting local application engine...

:: Check if server is already running on port 3000
netstat -ano | findstr 127.0.0.1:3000 >nul
if %errorlevel% neq 0 (
    start /min "" python backend_server.py
    timeout /t 1 /nobreak >nul
)

echo Launching Native App Window...
where chrome.exe >nul 2>&1
if %errorlevel% equ 0 (
    start "" chrome.exe --app=http://127.0.0.1:3000 --window-size=1300,920 --window-position=50,50
    exit
)

where msedge.exe >nul 2>&1
if %errorlevel% equ 0 (
    start "" msedge.exe --app=http://127.0.0.1:3000 --window-size=1300,920 --window-position=50,50
    exit
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:3000 --window-size=1300,920 --window-position=50,50
    exit
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:3000 --window-size=1300,920 --window-position=50,50
    exit
)

start http://127.0.0.1:3000
exit
