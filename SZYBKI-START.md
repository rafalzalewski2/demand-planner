# 🚀 SZYBKI START

## OPCJA A - Automatyczna instalacja (najłatwiejsza!)

### Windows:
1. Rozpakuj archiwum
2. Kliknij dwukrotnie na `install.bat`
3. Po instalacji kliknij dwukrotnie na `start.bat`
4. Gotowe! 🎉

### Mac/Linux:
```bash
tar -xzf demand-planner.tar.gz
cd demand-planner
./install.sh
```
Potem uruchom backend i frontend w dwóch terminalach (patrz niżej).

---

## OPCJA B - Ręczna instalacja

### 1. Rozpakuj archiwum
```bash
tar -xzf demand-planner.tar.gz
cd demand-planner
```

### 2. Zainstaluj zależności

**Backend:**
```bash
cd backend
npm install
```

**Frontend (w nowym oknie terminala):**
```bash
cd frontend
npm install
```

### 3. Uruchom aplikację

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Czekaj aż zobaczysz: "Server running on http://localhost:3001"

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Aplikacja otworzy się automatycznie w przeglądarce! 🎉

---

## Szybki test:

1. Kliknij zakładkę "Klienci" → Dodaj klienta (np. "Firma ABC")
2. Kliknij zakładkę "Produkty" → Dodaj produkt (np. "Produkt X")
3. Kliknij zakładkę "Plan zapotrzebowania" → "+ Nowy plan"
4. Kliknij "+ Dodaj pozycję" → wybierz klienta, produkt, wpisz ilość
5. Gotowe! Widzisz listę: klient → produkty

---

## Problemy?

- Jeśli nie masz Node.js: https://nodejs.org
- Jeśli port zajęty: backend automatycznie wybierze inny
- Więcej info: przeczytaj README.md w głównym folderze

**To wszystko!** Miłego planowania! 📋
