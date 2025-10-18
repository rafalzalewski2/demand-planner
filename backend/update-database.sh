#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🔄 Aktualizacja Bazy Danych - Demand Planner         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "⚠️  UWAGA: Ten skrypt zaktualizuje strukturę bazy danych"
echo "   Jeśli masz ważne dane, zrób kopię zapasową pliku:"
echo "   demand_planner.db"
echo ""

read -p "Czy kontynuować? (t/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Tt]$ ]]; then
    echo "❌ Operacja anulowana"
    exit 1
fi

echo ""
echo "🔄 Uruchamianie migracji..."
echo ""

node database-update.js

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ✅ Baza danych zaktualizowana pomyślnie!             ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "🎉 Możesz teraz uruchomić serwer: npm start"
    echo ""
    echo "🔑 Dane do logowania:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo ""
else
    echo ""
    echo "❌ Wystąpił błąd podczas aktualizacji bazy danych"
    echo ""
fi

echo "Naciśnij Enter aby zakończyć..."
read
