const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'demand_planner.db');

console.log('🔄 Aktualizowanie struktury bazy danych...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Błąd połączenia z bazą danych:', err.message);
    process.exit(1);
  }
  console.log('✅ Połączono z bazą danych SQLite');
});

// Funkcja pomocnicza do sprawdzania istnienia kolumny
const columnExists = (tableName, columnName) => {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        resolve(false);
        return;
      }
      const exists = columns.some(col => col.name === columnName);
      resolve(exists);
    });
  });
};

// Funkcja pomocnicza do sprawdzania istnienia tabeli
const tableExists = (tableName) => {
  return new Promise((resolve) => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
      resolve(!!row);
    });
  });
};

async function runMigrations() {
  try {
    console.log('\n📊 Sprawdzanie struktury tabel...');

    // 1. AKTUALIZACJA TABELI USERS
    console.log('\n🔧 Aktualizacja tabeli users...');
    
    // Dodaj kolumnę is_active jeśli nie istnieje
    if (!(await columnExists('users', 'is_active'))) {
      console.log('➕ Dodawanie kolumny is_active...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Kolumna is_active dodana');
    } else {
      console.log('✅ Kolumna is_active już istnieje');
    }

    // Dodaj kolumnę last_login jeśli nie istnieje
    if (!(await columnExists('users', 'last_login'))) {
      console.log('➕ Dodawanie kolumny last_login...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE users ADD COLUMN last_login DATETIME', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Kolumna last_login dodana');
    } else {
      console.log('✅ Kolumna last_login już istnieje');
    }

    // 2. UTWORZENIE TABELI USER_SESSIONS
    if (!(await tableExists('user_sessions'))) {
      console.log('➕ Tworzenie tabeli user_sessions...');
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Tabela user_sessions utworzona');
    } else {
      console.log('✅ Tabela user_sessions już istnieje');
    }

    // 3. AKTUALIZACJA TABELI CLIENTS
    if (!(await columnExists('clients', 'assigned_to_user_id'))) {
      console.log('➕ Dodawanie kolumny assigned_to_user_id do tabeli clients...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE clients ADD COLUMN assigned_to_user_id INTEGER REFERENCES users(id)', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Kolumna assigned_to_user_id dodana do tabeli clients');
    } else {
      console.log('✅ Kolumna assigned_to_user_id już istnieje w tabeli clients');
    }

    // 4. AKTUALIZACJA TABELI PLAN_ITEMS
    if (!(await columnExists('plan_items', 'notes'))) {
      console.log('➕ Dodawanie kolumny notes do tabeli plan_items...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE plan_items ADD COLUMN notes TEXT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Kolumna notes dodana do tabeli plan_items');
    } else {
      console.log('✅ Kolumna notes już istnieje w tabeli plan_items');
    }

    // 5. SPRAWDŹ CZY ISTNIEJĄ UŻYTKOWNICY
    const userCount = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        resolve(row ? row.count : 0);
      });
    });

    console.log(`\n👥 Znaleziono ${userCount} użytkowników w bazie`);

    // 6. DODAJ PRZYKŁADOWYCH UŻYTKOWNIKÓW JEŚLI BAZA JEST PUSTA
    if (userCount === 0) {
      console.log('➕ Dodawanie przykładowych użytkowników...');
      
      const sampleUsers = [
        { username: 'admin', password: 'admin123', role: 'admin', full_name: 'Administrator' },
        { username: 'jan.kowalski', password: 'jan123', role: 'handlowiec', full_name: 'Jan Kowalski' },
        { username: 'anna.nowak', password: 'anna123', role: 'handlowiec', full_name: 'Anna Nowak' },
        { username: 'piotr.wisniewski', password: 'piotr123', role: 'handlowiec', full_name: 'Piotr Wiśniewski' },
        { username: 'zespol.zakupy', password: 'zakupy123', role: 'zakupy', full_name: 'Zespół Zakupów' }
      ];

      for (const user of sampleUsers) {
        try {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO users (username, password_hash, role, full_name, is_active) VALUES (?, ?, ?, ?, 1)',
              [user.username, hashedPassword, user.role, user.full_name],
              function(err) {
                if (err) {
                  console.error(`❌ Błąd dodawania użytkownika ${user.username}:`, err.message);
                  reject(err);
                } else {
                  console.log(`✅ Dodano użytkownika: ${user.username} (${user.role})`);
                  resolve();
                }
              }
            );
          });
        } catch (error) {
          console.error(`❌ Błąd hashowania hasła dla ${user.username}:`, error);
        }
      }
    } else {
      console.log('✅ Użytkownicy już istnieją - pomijanie dodawania przykładowych');
    }

    console.log('\n🎉 Migracja bazy danych zakończona pomyślnie!');
    console.log('\n📋 Dane testowe:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: Administrator (pełny dostęp)');
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Błąd zamykania bazy danych:', err.message);
      } else {
        console.log('✅ Połączenie z bazą danych zamknięte');
      }
      process.exit(0);
    });
  }
}

// Uruchom migracje
runMigrations();
