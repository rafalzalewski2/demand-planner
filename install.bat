@echo off
echo ╔════════════════════════════════════════════════════════╗
echo ║  📦 Instalator - Planowanie Zapotrzebowania           ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Sprawdź czy Node.js jest zainstalowane
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js nie jest zainstalowane!
    echo    Pobierz ze strony: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js znalezione
node --version
echo ✅ npm znalezione
npm --version
echo.

REM Instalacja backend
echo 📦 Instaluję backend...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Błąd instalacji backendu
    pause
    exit /b 1
)
cd ..
echo ✅ Backend zainstalowany
echo.

REM Instalacja frontend
echo 📦 Instaluję frontend...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Błąd instalacji frontendu
    pause
    exit /b 1
)
cd ..
echo ✅ Frontend zainstalowany
echo.

echo ╔════════════════════════════════════════════════════════╗
echo ║  ✅ Instalacja zakończona!                            ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Aby uruchomić aplikację, użyj pliku start.bat
echo lub otwórz 2 okna terminala:
echo.
echo Terminal 1 (Backend):
echo   cd backend
echo   npm start
echo.
echo Terminal 2 (Frontend):
echo   cd frontend
echo   npm start
echo.
echo Aplikacja otworzy się automatycznie w przeglądarce!
echo Jeśli nie, wejdź na: http://localhost:3000
echo.
pause
