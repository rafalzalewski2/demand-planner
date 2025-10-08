@echo off
echo ╔════════════════════════════════════════════════════════╗
echo ║  🚀 Uruchamiam aplikację...                           ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Uruchom backend w nowym oknie
echo ✅ Uruchamiam backend...
start "Backend - Planowanie Zapotrzebowania" cmd /k "cd backend && npm start"

REM Poczekaj 3 sekundy
timeout /t 3 /nobreak >nul

REM Uruchom frontend w nowym oknie
echo ✅ Uruchamiam frontend...
start "Frontend - Planowanie Zapotrzebowania" cmd /k "cd frontend && npm start"

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  ✅ Aplikacja uruchomiona!                            ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Aplikacja otworzy się za chwilę w przeglądarce.
echo Jeśli nie, wejdź na: http://localhost:3000
echo.
echo Otworzyły się 2 okna terminala - NIE ZAMYKAJ ICH!
echo Aby zatrzymać aplikację, zamknij oba okna terminala.
echo.
pause
