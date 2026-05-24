@echo off
echo ============================================================
echo ICAN Voting System - Installation Script
echo ============================================================

cd /d %~dp0

echo.
echo [1/5] Creating virtual environment...
if not exist "venv\" (
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

echo.
echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/5] Upgrading pip...
python -m pip install --upgrade pip

echo.
echo [4/5] Installing dependencies...
pip install -r requirements.txt

echo.
echo [5/5] Installing development dependencies...
pip install -r requirements-dev.txt

echo.
echo ============================================================
echo Installation Complete!
echo ============================================================
echo.
echo To activate the environment:
echo   venv\Scripts\activate
echo.
echo To run the server:
echo   python run.py
echo.
pause