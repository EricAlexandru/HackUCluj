@echo off
REM Script pentru pornirea serverului local Coach Copilot

echo 🚀 Pornind Coach Copilot - FC Universitatea Cluj...
echo.

REM Verifică dacă Python este instalat
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python nu este instalat. Te rog instalează Python.
    pause
    exit /b 1
)

REM Verifică dacă portul 8000 este liber
netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  Portul 8000 este deja în uz. Închid procesul existent...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 >nul
)

echo 🌐 Serverul rulează la: http://localhost:8000
echo 📱 Pentru acces de pe mobil, folosește IP-ul local al computerului
echo.
echo Apasă Ctrl+C pentru a opri serverul.
echo.

REM Pornește serverul
python -m http.server 8000