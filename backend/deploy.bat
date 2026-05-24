@echo off
echo ============================================================
echo ICAN Voting System - Deployment Script (Windows)
echo ============================================================

cd /d %~dp0

echo.
echo [1/4] Setting up virtual environment...
if not exist "venv\" (
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing requirements...
pip install -r requirements-prod.txt

echo.
echo [4/4] Starting Gunicorn server...
gunicorn -c gunicorn.conf.py wsgi:app

pause