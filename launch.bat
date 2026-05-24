@echo off

echo ==========================================
echo     STARTING ICAN VOTING SYSTEM
echo ==========================================

REM Start Backend
cd /d "C:\Users\USER\Documents\apps\ican-voting-system\backend"

echo Starting Backend Server...
start "" cmd /k "waitress-serve --host=127.0.0.1 --port=8080 wsgi:app"

REM Wait 5 seconds
timeout /t 5 /nobreak > nul

REM Start Frontend
cd /d "C:\Users\USER\Documents\apps\ican-voting-system\frontend"

echo Starting Frontend Server...
start "" cmd /k "npm run dev"

echo ==========================================
echo   Backend and Frontend Started
echo ==========================================

pause