# 📋 Aplikacja do Planowania Zapotrzebowania

Prosta, lokalna aplikacja webowa do zarządzania planami zapotrzebowania na produkty dla klientów.

## ✨ Funkcjonalności

- **Plany miesięczne** - tworzenie planów zapotrzebowania na dany miesiąc/rok
- **Zarządzanie klientami** - dodawanie i przeglądanie listy klientów
- **Zarządzanie produktami** - dodawanie produktów z jednostkami miary
- **Tworzenie zapotrzebowania** - przypisywanie produktów z ilościami do klientów w danym planie
- **Widok listy** - przejrzysty widok: klient → produkty → klient (dokładnie jak opisałeś)
- **Edycja ilości** - możliwość zmiany ilości bezpośrednio w widoku
- **Lokalna baza danych** - wszystkie dane przechowywane lokalnie (SQLite)

## 🚀 Instalacja i Uruchomienie

### Krok 1: Pobierz projekt
Jeśli masz ten folder na swoim komputerze, przejdź do katalogu:
```bash
cd demand-planner
```

### Krok 2: Instalacja zależności

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### Krok 3: Uruchomienie aplikacji

Potrzebujesz **dwóch terminali** (dwóch okien konsoli).

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Zobaczysz: `Server running on http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
Aplikacja otworzy się automatycznie w przeglądarce pod adresem: `http://localhost:3000`

## 📖 Jak używać

### 1. Dodaj klientów
- Przejdź do zakładki "Klienci"
- Kliknij "+ Dodaj klienta"
- Wprowadź nazwę i dane kontaktowe
- Kliknij "Dodaj"

### 2. Dodaj produkty
- Przejdź do zakładki "Produkty"
- Kliknij "+ Dodaj produkt"
- Wprowadź nazwę i wybierz jednostkę (szt, kg, l, itp.)
- Kliknij "Dodaj"

### 3. Utwórz plan zapotrzebowania
- Przejdź do zakładki "Plan zapotrzebowania"
- Kliknij "+ Nowy plan"
- Wybierz miesiąc i rok
- Kliknij "Utwórz"

### 4. Dodaj pozycje do planu
- W aktywnym planie kliknij "+ Dodaj pozycję"
- Wybierz klienta
- Wybierz produkt
- Wpisz ilość
- Kliknij "Dodaj"

### 5. Zarządzaj planem
- Widok pokazuje klientów z ich produktami (jak lista)
- Możesz edytować ilość bezpośrednio w polu
- Możesz usunąć pozycję przyciskiem ✕
- Przełączaj się między różnymi planami w rozwijanej liście

## 📁 Struktura projektu

```
demand-planner/
├── backend/               # Serwer Node.js
│   ├── server.js         # API endpoints
│   ├── database.js       # Konfiguracja SQLite
│   ├── package.json      # Zależności backend
│   └── demand_planner.db # Baza danych (tworzy się automatycznie)
│
├── frontend/             # Aplikacja React
│   ├── src/
│   │   ├── App.js       # Główny komponent
│   │   ├── App.css      # Style
│   │   └── components/  # Komponenty UI
│   └── package.json     # Zależności frontend
│
└── README.md            # Ten plik
```

## 💾 Baza danych

Wszystkie dane są zapisywane w pliku `backend/demand_planner.db`. 

**Backup:** Po prostu skopiuj ten plik aby zachować wszystkie dane.

**Reset:** Usuń plik `demand_planner.db` a utworzy się nowy, pusty.

## 🌐 Przeniesienie na web (w przyszłości)

Gdy będziesz gotowy do umieszczenia aplikacji w internecie:

1. **Darmowa opcja - Supabase:**
   - Zmień `database.js` na użycie Supabase PostgreSQL
   - Frontend → Vercel/Netlify (darmowy hosting)
   - Backend → Render/Railway (darmowy tier)

2. **Płatna opcja - VPS:**
   - Kod działa bez zmian
   - Potrzebujesz tylko serwera (np. home.pl, OVH)
   - Instalacja Node.js i uruchomienie

## 🛠️ Technologie

- **Frontend:** React 18
- **Backend:** Node.js + Express
- **Baza danych:** SQLite3
- **Style:** Pure CSS

## 📝 Notatki

- Aplikacja działa całkowicie lokalnie
- Nie wymaga połączenia z internetem
- Dane są zapisywane w lokalnym pliku
- Możliwość jednoczesnej pracy kilku osób (jeśli udostępnisz przez sieć lokalną)

## 🐛 Rozwiązywanie problemów

**Port już zajęty:**
```bash
# Jeśli port 3001 lub 3000 jest zajęty, możesz zmienić:
# Backend: w server.js zmień PORT = 3001 na inny
# Frontend: ustawi się automatycznie na następny wolny port
```

**Błąd instalacji:**
```bash
# Usuń node_modules i spróbuj ponownie:
rm -rf node_modules
npm install
```

**Baza danych nie działa:**
```bash
# Usuń plik bazy i uruchom ponownie backend:
rm backend/demand_planner.db
cd backend && npm start
```

## 📧 Pytania?

Jeśli coś nie działa lub chcesz dodać nowe funkcje, daj znać!

---

Utworzone z ❤️ dla prostego i efektywnego planowania zapotrzebowania. 
