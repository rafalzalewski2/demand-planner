#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║  📦 Instalator - Planowanie Zapotrzebowania           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Sprawdź czy Node.js jest zainstalowane
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nie jest zainstalowane!"
    echo "   Pobierz ze strony: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js znalezione: $(node --version)"
echo "✅ npm znalezione: $(npm --version)"
echo ""

# Instalacja backend
echo "📦 Instaluję backend..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Błąd instalacji backendu"
    exit 1
fi
cd ..
echo "✅ Backend zainstalowany"
echo ""

# Instalacja frontend
echo "📦 Instaluję frontend..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Błąd instalacji frontendu"
    exit 1
fi
cd ..
echo "✅ Frontend zainstalowany"
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Instalacja zakończona!                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Aby uruchomić aplikację, potrzebujesz 2 terminali:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  npm start"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "Aplikacja otworzy się automatycznie w przeglądarce!"
echo "Jeśli nie, wejdź na: http://localhost:3000"
echo ""
