@echo off
echo ╔════════════════════════════════════════════════════════╗
echo ║  🔄 Aktualizacja Bazy Danych - Demand Planner         ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo ⚠️  UWAGA: Ten skrypt zaktualizuje strukturę bazy danych
echo    Jeśli masz ważne dane, zrób kopię zapasową pliku:
echo    demand_planner.db
echo.

set /p continue="Czy kontynuować? (T/N): "
if /i "%continue%" neq "T" (
    echo ❌ Operacja anulowana
    pause
    exit /b 1
)

echo.
echo 🔄 Uruchamianie migracji...
echo.

node database-update.js

if %ERRORLEVEL% equ 0 (
    echo.
    echo ╔════════════════════════════════════════════════════════╗
    echo ║  ✅ Baza danych zaktualizowana pomyślnie!             ║
    echo ╚════════════════════════════════════════════════════════╝
    echo.
    echo 🎉 Możesz teraz uruchomić serwer: npm start
    echo.
    echo 🔑 Dane do logowania:
    echo    Username: admin
    echo    Password: admin123
    echo.
) else (
    echo.
    echo ❌ Wystąpił błąd podczas aktualizacji bazy danych
    echo.
)

pause
