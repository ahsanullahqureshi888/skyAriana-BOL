@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\npm.cmd" run dev -- --hostname 0.0.0.0 --port 3001
pause
