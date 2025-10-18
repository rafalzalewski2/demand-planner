const express = require('express');
const cors = require('cors');
const path = require('path'); // DODANE dla hostingu
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();

// PORT dla hostingu - używa PORT z environment variables lub domyślnie 3001
const PORT = process.env.PORT || 3001;

// JWT Secret - w produkcji powinien być w zmiennych środowiskowych
const JWT_SECRET = process.env.JWT_SECRET || 'demand-planner-secret-key-2024';
const JWT_EXPIRES_IN = '8h'; // Token wygasa po 8 godzinach

// Konfiguracja multer dla uploadu plików
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// === OBSŁUGA PLIKÓW STATYCZNYCH DLA HOSTINGU ===
// W produkcji (na Render.com) serwuj pliki React z folderu build
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 Production mode: serving React static files');
  
  // Serwuj statyczne pliki React
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Wszystkie nieznane ścieżki przekieruj na index.html (React Router)
  app.get('*', (req, res, next) => {
    // Pomijaj API endpoints
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// ========== MIDDLEWARE AUTORYZACYJNE ==========

// Middleware do sprawdzania JWT tokenu
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Brak tokenu dostępu' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Nieprawidłowy token' });
    }
    req.user = user;
    next();
  });
};

// Middleware do sprawdzania ról
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Brak uwierzytelnienia' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }
    
    next();
  };
};

// Middleware do filtrowania danych według roli
const filterByRole = (req, res, next) => {
  req.roleFilter = {
    isAdmin: req.user.role === 'admin',
    isHandlowiec: req.user.role === 'handlowiec', 
    isZakupy: req.user.role === 'zakupy',
    userId: req.user.id
  };
  next();
};

// ========== ENDPOINTY AUTORYZACYJNE ==========

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Nazwa użytkownika i hasło są wymagane' });
  }

  try {
    // Znajdź użytkownika w bazie
    db.get(
      'SELECT id, username, password_hash, role, full_name, is_active FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Błąd serwera' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
        }

        if (user.is_active === false || user.is_active === 0) {
          return res.status(401).json({ error: 'Konto jest nieaktywne' });
        }

        // Sprawdź hasło - sprawdź czy to hash czy plaintext (dla backward compatibility)
        let isPasswordValid = false;
        
        if (user.password_hash.startsWith('$2')) {
          // To jest hash bcrypt
          isPasswordValid = await bcrypt.compare(password, user.password_hash);
        } else {
          // To jest plaintext (stary system) - porównaj bezpośrednio
          isPasswordValid = password === user.password_hash;
        }

        if (!isPasswordValid) {
          return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
        }

        // Utwórz JWT token
        const tokenPayload = {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Zapisz hash tokenu w bazie (dla możliwości unieważnienia)
        const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 godzin

        db.run(
          'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
          [user.id, tokenHash, expiresAt],
          (err) => {
            if (err) {
              console.error('Error saving session:', err);
            }
          }
        );

        // Zaktualizuj last_login
        db.run(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );

        // Zwróć token i dane użytkownika
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: user.full_name
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    // Usuń sesję z bazy
    db.run('DELETE FROM user_sessions WHERE token_hash = ?', [tokenHash], (err) => {
      if (err) {
        console.error('Error deleting session:', err);
      }
    });
  }
  
  res.json({ success: true, message: 'Wylogowano pomyślnie' });
});

// Sprawdzenie czy token jest ważny
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      full_name: req.user.full_name
    }
  });
});

// ========== UŻYTKOWNICY (z autoryzacją) ==========

// Pobierz wszystkich użytkowników (tylko admin)
app.get('/api/users', authenticateToken, requireRole('admin'), (req, res) => {
  db.all('SELECT id, username, role, full_name, is_active, last_login, created_at FROM users ORDER BY full_name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Pobierz tylko handlowców (dla dropdown - admin tylko)
app.get('/api/users/salespeople', authenticateToken, requireRole('admin'), (req, res) => {
  db.all('SELECT id, full_name FROM users WHERE role = ? AND is_active = 1 ORDER BY full_name', ['handlowiec'], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Dodaj użytkownika (tylko admin)
app.post('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  const { username, password_hash, role, full_name } = req.body;
  
  if (!username || !password_hash || !role || !full_name) {
    return res.status(400).json({ error: 'Wszystkie pola są wymagane' });
  }

  try {
    // Hash password jeśli nie jest jeszcze zahashowane
    let finalPasswordHash = password_hash;
    if (!password_hash.startsWith('$2')) {
      finalPasswordHash = await bcrypt.hash(password_hash, 10);
    }
    
    db.run(
      'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
      [username, finalPasswordHash, role, full_name],
      function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID, username, role, full_name });
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Edytuj użytkownika (tylko admin)
app.put('/api/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const { username, role, full_name } = req.body;
  db.run(
    'UPDATE users SET username = ?, role = ?, full_name = ? WHERE id = ?',
    [username, role, full_name, req.params.id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        message: 'Użytkownik zaktualizowany',
        changes: this.changes 
      });
    }
  );
});

// Reset hasła użytkownika (tylko admin) - NOWY ENDPOINT!
app.put('/api/users/:id/password', authenticateToken, requireRole('admin'), async (req, res) => {
  const { new_password } = req.body;
  
  if (!new_password) {
    return res.status(400).json({ error: 'Nowe hasło jest wymagane' });
  }

  try {
    const password_hash = await bcrypt.hash(new_password, 10);
    
    db.run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, req.params.id],
      function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        
        // Usuń wszystkie sesje tego użytkownika (wyloguj ze wszystkich urządzeń)
        db.run('DELETE FROM user_sessions WHERE user_id = ?', [req.params.id]);
        
        res.json({ 
          message: 'Hasło zostało zresetowane',
          changes: this.changes 
        });
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Usuń użytkownika (tylko admin)
app.delete('/api/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ 
      message: 'Użytkownik usunięty',
      changes: this.changes 
    });
  });
});

// ========== PLANY z filtrowaniem według roli ==========

// Pobierz wszystkie plany 
app.get('/api/plans', authenticateToken, (req, res) => {
  db.all('SELECT * FROM plans ORDER BY year DESC, month DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Pobierz konkretny plan
app.get('/api/plans/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM plans WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row);
  });
});

// Utwórz nowy plan (admin i handlowiec)
app.post('/api/plans', authenticateToken, requireRole('admin', 'handlowiec'), (req, res) => {
  const { month, year } = req.body;
  db.run(
    'INSERT INTO plans (month, year, created_by) VALUES (?, ?, ?)',
    [month, year, req.user.full_name],
    function(err) {
      if (err) {
        res.status(400).json({ error: 'Plan na ten miesiąc już istnieje lub wystąpił inny problem' });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

// EKSPORT PLANU - z filtrowaniem według roli
app.get('/api/plans/:planId/export', authenticateToken, filterByRole, (req, res) => {
  const planId = req.params.planId;
  
  // Pobierz dane planu
  db.get('SELECT * FROM plans WHERE id = ?', [planId], (err, plan) => {
    if (err || !plan) {
      res.status(404).json({ error: 'Plan nie znaleziony' });
      return;
    }

    // Przygotuj query z filtrowaniem według roli
    let query = `
      SELECT 
        c.name as client_name,
        p.name as product_name,
        pi.quantity,
        p.unit as product_unit,
        pi.notes,
        u.full_name as assigned_to
      FROM plan_items pi
      JOIN clients c ON pi.client_id = c.id
      JOIN products p ON pi.product_id = p.id
      LEFT JOIN users u ON c.assigned_to_user_id = u.id
      WHERE pi.plan_id = ?
    `;

    let queryParams = [planId];

    // Jeśli handlowiec - filtruj tylko jego klientów
    if (req.roleFilter.isHandlowiec) {
      query += ` AND c.assigned_to_user_id = ?`;
      queryParams.push(req.user.id);
    }

    query += ` ORDER BY c.name, p.name`;
    
    db.all(query, queryParams, (err, items) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Przygotuj dane w strukturze: klient | produkty | handlowiec
      const exportData = [];
      exportData.push(['Klient', 'Produkt', 'Ilosc', 'Jednostka', 'Notatki', 'Handlowiec']);

      items.forEach(item => {
        exportData.push([
          item.client_name,
          item.product_name,
          item.quantity,
          item.product_unit,
          item.notes || '',
          item.assigned_to || ''
        ]);
      });

      // Utwórz workbook i worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      
      const MONTHS_PL = ['Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
                         'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien'];
      const sheetName = `Plan_${MONTHS_PL[plan.month - 1]}_${plan.year}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const fileName = `Plan_zapotrzebowania_${MONTHS_PL[plan.month - 1]}_${plan.year}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.send(buffer);
    });
  });
});

// ========== KLIENCI z filtrowaniem według roli ==========

// Pobierz klientów z filtrowaniem według roli
app.get('/api/clients', authenticateToken, filterByRole, (req, res) => {
  let query = `
    SELECT 
      c.id, 
      c.name, 
      c.contact_info, 
      c.assigned_to_user_id,
      c.created_at,
      u.full_name as assigned_to_name
    FROM clients c
    LEFT JOIN users u ON c.assigned_to_user_id = u.id
  `;

  let queryParams = [];

  // Handlowiec widzi tylko swoich klientów
  if (req.roleFilter.isHandlowiec) {
    query += ` WHERE c.assigned_to_user_id = ?`;
    queryParams.push(req.user.id);
  }

  query += ` ORDER BY c.name`;
  
  db.all(query, queryParams, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Dodaj klienta (admin i handlowiec)
app.post('/api/clients', authenticateToken, requireRole('admin', 'handlowiec'), (req, res) => {
  const { name, contact_info, assigned_to_user_id } = req.body;
  
  // Jeśli handlowiec, automatycznie przypisz do siebie
  let finalAssignedUserId = assigned_to_user_id;
  if (req.user.role === 'handlowiec') {
    finalAssignedUserId = req.user.id;
  }
  
  db.run(
    'INSERT INTO clients (name, contact_info, assigned_to_user_id) VALUES (?, ?, ?)',
    [name, contact_info, finalAssignedUserId || null],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, contact_info, assigned_to_user_id: finalAssignedUserId });
    }
  );
});

// Edytuj klienta (admin i właściciel handlowiec)
app.put('/api/clients/:id', authenticateToken, requireRole('admin', 'handlowiec'), async (req, res) => {
  const { name, contact_info, assigned_to_user_id } = req.body;
  
  // Jeśli handlowiec, sprawdź czy to jego klient
  if (req.user.role === 'handlowiec') {
    try {
      const clientCheck = await new Promise((resolve, reject) => {
        db.get('SELECT assigned_to_user_id FROM clients WHERE id = ?', [req.params.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!clientCheck || clientCheck.assigned_to_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Brak uprawnień do edycji tego klienta' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Błąd serwera' });
    }
  }
  
  db.run(
    'UPDATE clients SET name = ?, contact_info = ?, assigned_to_user_id = ? WHERE id = ?',
    [name, contact_info, assigned_to_user_id || null, req.params.id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        message: 'Klient zaktualizowany',
        changes: this.changes 
      });
    }
  );
});

// Usuń klienta (tylko admin)
app.delete('/api/clients/:id', authenticateToken, requireRole('admin'), (req, res) => {
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ 
      message: 'Klient usunięty',
      changes: this.changes 
    });
  });
});

// Aktualizuj przypisanie klienta (tylko admin)
app.put('/api/clients/:id/assignment', authenticateToken, requireRole('admin'), (req, res) => {
  const { assigned_to_user_id } = req.body;
  db.run(
    'UPDATE clients SET assigned_to_user_id = ? WHERE id = ?',
    [assigned_to_user_id || null, req.params.id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

// EKSPORT KLIENTÓW z filtrowaniem
app.get('/api/clients/export', authenticateToken, requireRole('admin', 'handlowiec'), filterByRole, (req, res) => {
  let query = `
    SELECT 
      c.name, 
      c.contact_info, 
      c.created_at,
      u.full_name as assigned_to_name
    FROM clients c
    LEFT JOIN users u ON c.assigned_to_user_id = u.id
  `;

  let queryParams = [];

  // Handlowiec widzi tylko swoich klientów
  if (req.roleFilter.isHandlowiec) {
    query += ` WHERE c.assigned_to_user_id = ?`;
    queryParams.push(req.user.id);
  }

  query += ` ORDER BY c.name`;
  
  db.all(query, queryParams, (err, clients) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const exportData = [];
    exportData.push(['Nazwa_klienta', 'Kontakt', 'Handlowiec', 'Data_dodania']);

    clients.forEach(client => {
      exportData.push([
        client.name,
        client.contact_info || '',
        client.assigned_to_name || '',
        new Date(client.created_at).toLocaleDateString('pl-PL')
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Klienci');

    const fileName = `Klienci_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  });
});

// IMPORT KLIENTÓW (admin i handlowiec)
app.post('/api/clients/import', authenticateToken, requireRole('admin', 'handlowiec'), upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Brak pliku' });
    return;
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const clientsData = data.slice(1).filter(row => row[0] && row[0].trim());

    let imported = 0;
    let errors = [];

    clientsData.forEach((row, index) => {
      const name = row[0]?.toString().trim();
      const contact_info = row[1]?.toString().trim() || null;
      
      // Jeśli handlowiec, przypisz do siebie
      let assigned_to_user_id = null;
      if (req.user.role === 'handlowiec') {
        assigned_to_user_id = req.user.id;
      }

      if (name) {
        db.run(
          'INSERT INTO clients (name, contact_info, assigned_to_user_id) VALUES (?, ?, ?)',
          [name, contact_info, assigned_to_user_id],
          function(err) {
            if (err) {
              errors.push(`Wiersz ${index + 2}: ${err.message}`);
            } else {
              imported++;
            }
          }
        );
      }
    });

    setTimeout(() => {
      res.json({
        message: `Zaimportowano ${imported} klientów`,
        errors: errors
      });
    }, 100);

  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas czytania pliku Excel' });
  }
});

// ========== PRODUKTY z uprawnieniami ==========

// Pobierz wszystkie produkty (wszyscy zalogowani)
app.get('/api/products', authenticateToken, (req, res) => {
  db.all('SELECT * FROM products ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Dodaj produkt (admin i handlowiec)
app.post('/api/products', authenticateToken, requireRole('admin', 'handlowiec'), (req, res) => {
  const { name, unit } = req.body;
  db.run(
    'INSERT INTO products (name, unit) VALUES (?, ?)',
    [name, unit],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, unit });
    }
  );
});

// Edytuj produkt (admin i handlowiec)
app.put('/api/products/:id', authenticateToken, requireRole('admin', 'handlowiec'), (req, res) => {
  const { name, unit } = req.body;
  db.run(
    'UPDATE products SET name = ?, unit = ? WHERE id = ?',
    [name, unit, req.params.id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        message: 'Produkt zaktualizowany',
        changes: this.changes 
      });
    }
  );
});

// Usuń produkt (tylko admin)
app.delete('/api/products/:id', authenticateToken, requireRole('admin'), (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ 
      message: 'Produkt usunięty',
      changes: this.changes 
    });
  });
});

// EKSPORT PRODUKTÓW (admin i handlowiec)
app.get('/api/products/export', authenticateToken, requireRole('admin', 'handlowiec'), (req, res) => {
  db.all('SELECT name, unit, created_at FROM products ORDER BY name', [], (err, products) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const exportData = [];
    exportData.push(['Nazwa_produktu', 'Jednostka', 'Data_dodania']);

    products.forEach(product => {
      exportData.push([
        product.name,
        product.unit,
        new Date(product.created_at).toLocaleDateString('pl-PL')
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Produkty');

    const fileName = `Produkty_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  });
});

// IMPORT PRODUKTÓW (admin i handlowiec)
app.post('/api/products/import', authenticateToken, requireRole('admin', 'handlowiec'), upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Brak pliku' });
    return;
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const productsData = data.slice(1).filter(row => row[0] && row[0].trim());

    let imported = 0;
    let errors = [];

    productsData.forEach((row, index) => {
      const name = row[0]?.toString().trim();
      const unit = row[1]?.toString().trim() || 'szt';

      if (name) {
        db.run(
          'INSERT INTO products (name, unit) VALUES (?, ?)',
          [name, unit],
          function(err) {
            if (err) {
              errors.push(`Wiersz ${index + 2}: ${err.message}`);
            } else {
              imported++;
            }
          }
        );
      }
    });

    setTimeout(() => {
      res.json({
        message: `Zaimportowano ${imported} produktów`,
        errors: errors
      });
    }, 100);

  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas czytania pliku Excel' });
  }
});

// ========== POZYCJE PLANU z filtrowaniem ==========

// Pobierz pozycje planu z filtrowaniem według roli
app.get('/api/plans/:planId/items', authenticateToken, filterByRole, (req, res) => {
  let query = `
    SELECT 
      pi.id,
      pi.plan_id,
      pi.client_id,
      pi.product_id,
      pi.quantity,
      pi.notes,
      c.name as client_name,
      p.name as product_name,
      p.unit as product_unit,
      u.full_name as assigned_to_name
    FROM plan_items pi
    JOIN clients c ON pi.client_id = c.id
    JOIN products p ON pi.product_id = p.id
    LEFT JOIN users u ON c.assigned_to_user_id = u.id
    WHERE pi.plan_id = ?
  `;

  let queryParams = [req.params.planId];

  // Handlowiec widzi tylko pozycje swoich klientów
  if (req.roleFilter.isHandlowiec) {
    query += ` AND c.assigned_to_user_id = ?`;
    queryParams.push(req.user.id);
  }

  query += ` ORDER BY c.name, p.name`;
  
  db.all(query, queryParams, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Dodaj pozycję do planu (admin i handlowiec)
app.post('/api/plans/:planId/items', authenticateToken, requireRole('admin', 'handlowiec'), async (req, res) => {
  const { client_id, product_id, quantity, notes } = req.body;
  const plan_id = req.params.planId;
  
  // Jeśli handlowiec, sprawdź czy to jego klient
  if (req.user.role === 'handlowiec') {
    try {
      const clientCheck = await new Promise((resolve, reject) => {
        db.get('SELECT assigned_to_user_id FROM clients WHERE id = ?', [client_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!clientCheck || clientCheck.assigned_to_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Można dodawać pozycje tylko dla swoich klientów' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Błąd serwera' });
    }
  }
  
  db.run(
    'INSERT INTO plan_items (plan_id, client_id, product_id, quantity, notes) VALUES (?, ?, ?, ?, ?)',
    [plan_id, client_id, product_id, quantity, notes || null],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

// Aktualizuj pozycję planu (admin i właściciel handlowiec)
app.put('/api/plan-items/:id', authenticateToken, requireRole('admin', 'handlowiec'), async (req, res) => {
  const { quantity, notes } = req.body;
  
  // Jeśli handlowiec, sprawdź czy to pozycja jego klienta
  if (req.user.role === 'handlowiec') {
    try {
      const itemCheck = await new Promise((resolve, reject) => {
        db.get(`
          SELECT c.assigned_to_user_id 
          FROM plan_items pi 
          JOIN clients c ON pi.client_id = c.id 
          WHERE pi.id = ?
        `, [req.params.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!itemCheck || itemCheck.assigned_to_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Brak uprawnień do edycji tej pozycji' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Błąd serwera' });
    }
  }
  
  db.run(
    'UPDATE plan_items SET quantity = ?, notes = ? WHERE id = ?',
    [quantity, notes || null, req.params.id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

// Usuń pozycję planu (admin i właściciel handlowiec)
app.delete('/api/plan-items/:id', authenticateToken, requireRole('admin', 'handlowiec'), async (req, res) => {
  // Jeśli handlowiec, sprawdź czy to pozycja jego klienta
  if (req.user.role === 'handlowiec') {
    try {
      const itemCheck = await new Promise((resolve, reject) => {
        db.get(`
          SELECT c.assigned_to_user_id 
          FROM plan_items pi 
          JOIN clients c ON pi.client_id = c.id 
          WHERE pi.id = ?
        `, [req.params.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!itemCheck || itemCheck.assigned_to_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Brak uprawnień do usunięcia tej pozycji' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Błąd serwera' });
    }
  }
  
  db.run('DELETE FROM plan_items WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// RAPORT KLIENTÓW - z filtrowaniem według roli
app.get('/api/reports/clients', authenticateToken, filterByRole, (req, res) => {
  const { startYear, endYear, startMonth, endMonth, clientId, salesmanId } = req.query;
  
  let query = `
    SELECT 
      c.id,
      c.name as client_name,
      u.full_name as salesman_name,
      COUNT(pi.id) as total_items,
      SUM(pi.quantity) as total_quantity,
      COUNT(DISTINCT pi.plan_id) as plans_count
    FROM clients c
    LEFT JOIN users u ON c.assigned_to_user_id = u.id
    LEFT JOIN plan_items pi ON c.id = pi.client_id
    LEFT JOIN plans p ON pi.plan_id = p.id
    WHERE 1=1
  `;
  
  let queryParams = [];
  
  // Filtry dat
  if (startYear && startMonth) {
    query += ` AND (p.year > ? OR (p.year = ? AND p.month >= ?))`;
    queryParams.push(parseInt(startYear), parseInt(startYear), parseInt(startMonth));
  }
  
  if (endYear && endMonth) {
    query += ` AND (p.year < ? OR (p.year = ? AND p.month <= ?))`;
    queryParams.push(parseInt(endYear), parseInt(endYear), parseInt(endMonth));
  }
  
  // Filtr klienta
  if (clientId) {
    query += ` AND c.id = ?`;
    queryParams.push(parseInt(clientId));
  }
  
  // Filtr handlowca  
  if (salesmanId) {
    query += ` AND c.assigned_to_user_id = ?`;
    queryParams.push(parseInt(salesmanId));
  }
  
  // Handlowiec widzi tylko swoich klientów
  if (req.roleFilter.isHandlowiec) {
    query += ` AND c.assigned_to_user_id = ?`;
    queryParams.push(req.user.id);
  }
  
  query += `
    GROUP BY c.id, c.name, u.full_name
    HAVING COUNT(pi.id) > 0
    ORDER BY total_quantity DESC, c.name
  `;
  
  console.log('📊 Query raport klientów:', query.replace(/\s+/g, ' '));
  console.log('📊 Parametry:', queryParams);
  
  db.all(query, queryParams, (err, rows) => {
    if (err) {
      console.error('❌ Błąd raportu klientów:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`✅ Raport klientów: ${rows.length} pozycji`);
    res.json(rows);
  });
});

// RAPORT PRODUKTÓW - z filtrowaniem według roli
app.get('/api/reports/products', authenticateToken, filterByRole, (req, res) => {
  const { startYear, endYear, startMonth, endMonth, productId, salesmanId } = req.query;
  
  let query = `
    SELECT 
      p.id,
      p.name as product_name,
      p.unit as product_unit,
      SUM(pi.quantity) as total_quantity,
      COUNT(pi.id) as orders_count,
      COUNT(DISTINCT pi.client_id) as clients_count
    FROM products p
    LEFT JOIN plan_items pi ON p.id = pi.product_id
    LEFT JOIN plans pl ON pi.plan_id = pl.id
    LEFT JOIN clients c ON pi.client_id = c.id
    WHERE 1=1
  `;
  
  let queryParams = [];
  
  // Filtry dat
  if (startYear && startMonth) {
    query += ` AND (pl.year > ? OR (pl.year = ? AND pl.month >= ?))`;
    queryParams.push(parseInt(startYear), parseInt(startYear), parseInt(startMonth));
  }
  
  if (endYear && endMonth) {
    query += ` AND (pl.year < ? OR (pl.year = ? AND pl.month <= ?))`;
    queryParams.push(parseInt(endYear), parseInt(endYear), parseInt(endMonth));
  }
  
  // Filtr produktu
  if (productId) {
    query += ` AND p.id = ?`;
    queryParams.push(parseInt(productId));
  }
  
  // Filtr handlowca
  if (salesmanId) {
    query += ` AND c.assigned_to_user_id = ?`;
    queryParams.push(parseInt(salesmanId));
  }
  
  // Handlowiec widzi tylko produkty swoich klientów
  if (req.roleFilter.isHandlowiec) {
    query += ` AND (c.assigned_to_user_id = ? OR pi.id IS NULL)`;
    queryParams.push(req.user.id);
  }
  
  query += `
    GROUP BY p.id, p.name, p.unit
    HAVING COUNT(pi.id) > 0
    ORDER BY total_quantity DESC, p.name
  `;
  
  console.log('📦 Query raport produktów:', query.replace(/\s+/g, ' '));
  console.log('📦 Parametry:', queryParams);
  
  db.all(query, queryParams, (err, rows) => {
    if (err) {
      console.error('❌ Błąd raportu produktów:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`✅ Raport produktów: ${rows.length} pozycji`);
    res.json(rows);
  });
});

// RAPORT ZBIORCZY - statystyki ogólne
app.get('/api/reports/summary', authenticateToken, filterByRole, (req, res) => {
  const { startYear, endYear, startMonth, endMonth } = req.query;
  
  // Query podstawowe z filtrami dat i roli
  let baseFilter = 'WHERE 1=1';
  let queryParams = [];
  
  // Filtry dat
  if (startYear && startMonth) {
    baseFilter += ` AND (p.year > ? OR (p.year = ? AND p.month >= ?))`;
    queryParams.push(parseInt(startYear), parseInt(startYear), parseInt(startMonth));
  }
  
  if (endYear && endMonth) {
    baseFilter += ` AND (p.year < ? OR (p.year = ? AND p.month <= ?))`;
    queryParams.push(parseInt(endYear), parseInt(endYear), parseInt(endMonth));
  }
  
  // Filtr roli handlowca
  if (req.roleFilter.isHandlowiec) {
    baseFilter += ` AND c.assigned_to_user_id = ?`;
    queryParams.push(req.user.id);
  }
  
  const summaryQuery = `
    SELECT 
      COUNT(DISTINCT p.id) as total_plans,
      COUNT(pi.id) as total_items,
      COUNT(DISTINCT pi.client_id) as total_clients,
      COUNT(DISTINCT pi.product_id) as total_products,
      COALESCE(SUM(pi.quantity), 0) as total_quantity,
      COALESCE(AVG(pi.quantity), 0) as avg_per_plan
    FROM plans p
    LEFT JOIN plan_items pi ON p.id = pi.plan_id
    LEFT JOIN clients c ON pi.client_id = c.id
    ${baseFilter}
  `;
  
  console.log('📈 Query raport zbiorczy:', summaryQuery.replace(/\s+/g, ' '));
  console.log('📈 Parametry:', queryParams);
  
  db.get(summaryQuery, queryParams, (err, row) => {
    if (err) {
      console.error('❌ Błąd raportu zbiorczego:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('✅ Raport zbiorczy:', row);
    res.json(row || {});
  });
});

// RAPORT HANDLOWCÓW - tylko dla admina
app.get('/api/reports/salesmen', authenticateToken, requireRole('admin'), (req, res) => {
  const { startYear, endYear, startMonth, endMonth } = req.query;
  
  let query = `
    SELECT 
      u.id,
      u.full_name as salesman_name,
      COUNT(DISTINCT c.id) as clients_count,
      COUNT(pi.id) as total_items,
      COALESCE(SUM(pi.quantity), 0) as total_quantity,
      COUNT(DISTINCT pi.plan_id) as plans_count,
      COALESCE(AVG(pi.quantity), 0) as avg_per_plan
    FROM users u
    LEFT JOIN clients c ON u.id = c.assigned_to_user_id
    LEFT JOIN plan_items pi ON c.id = pi.client_id
    LEFT JOIN plans p ON pi.plan_id = p.id
    WHERE u.role = 'handlowiec' AND u.is_active = 1
  `;
  
  let queryParams = [];
  
  // Filtry dat
  if (startYear && startMonth) {
    query += ` AND (p.year > ? OR (p.year = ? AND p.month >= ?))`;
    queryParams.push(parseInt(startYear), parseInt(startYear), parseInt(startMonth));
  }
  
  if (endYear && endMonth) {
    query += ` AND (p.year < ? OR (p.year = ? AND p.month <= ?))`;
    queryParams.push(parseInt(endYear), parseInt(endYear), parseInt(endMonth));
  }
  
  query += `
    GROUP BY u.id, u.full_name
    ORDER BY total_quantity DESC, u.full_name
  `;
  
  console.log('👥 Query raport handlowców:', query.replace(/\s+/g, ' '));
  console.log('👥 Parametry:', queryParams);
  
  db.all(query, queryParams, (err, rows) => {
    if (err) {
      console.error('❌ Błąd raportu handlowców:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`✅ Raport handlowców: ${rows.length} pozycji`);
    res.json(rows);
  });
});

// EKSPORT RAPORTÓW DO EXCEL
app.get('/api/reports/export', authenticateToken, filterByRole, async (req, res) => {
  const { type, startYear, endYear, startMonth, endMonth, clientId, productId, salesmanId } = req.query;
  
  console.log('📄 Eksport raportu:', { type, startYear, endYear, startMonth, endMonth });
  
  try {
    let reportData = [];
    let sheetName = 'Raport';
    let fileName = 'Raport';
    
    if (type === 'clients') {
      // Eksport raportu klientów
      const response = await new Promise((resolve, reject) => {
        let query = `
          SELECT 
            c.name as client_name,
            u.full_name as salesman_name,
            COUNT(pi.id) as total_items,
            SUM(pi.quantity) as total_quantity,
            COUNT(DISTINCT pi.plan_id) as plans_count
          FROM clients c
          LEFT JOIN users u ON c.assigned_to_user_id = u.id
          LEFT JOIN plan_items pi ON c.id = pi.client_id
          LEFT JOIN plans p ON pi.plan_id = p.id
          WHERE 1=1
        `;
        
        let params = [];
        
        // Filtry dat
        if (startYear && startMonth) {
          query += ` AND (p.year > ? OR (p.year = ? AND p.month >= ?))`;
          params.push(parseInt(startYear), parseInt(startYear), parseInt(startMonth));
        }
        
        if (endYear && endMonth) {
          query += ` AND (p.year < ? OR (p.year = ? AND p.month <= ?))`;
          params.push(parseInt(endYear), parseInt(endYear), parseInt(endMonth));
        }
        
        // Filtr klienta
        if (clientId) {
          query += ` AND c.id = ?`;
          params.push(parseInt(clientId));
        }
        
        // Filtr handlowca  
        if (salesmanId) {
          query += ` AND c.assigned_to_user_id = ?`;
          params.push(parseInt(salesmanId));
        }
        
        // Handlowiec widzi tylko swoich klientów
        if (req.roleFilter.isHandlowiec) {
          query += ` AND c.assigned_to_user_id = ?`;
          params.push(req.user.id);
        }
        
        query += `
          GROUP BY c.id, c.name, u.full_name
          HAVING COUNT(pi.id) > 0
          ORDER BY total_quantity DESC, c.name
        `;
        
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      reportData = [
        ['Klient', 'Handlowiec', 'Liczba pozycji', 'Łączna ilość', 'Liczba planów'],
        ...response.map(row => [
          row.client_name,
          row.salesman_name || 'Brak przypisania',
          row.total_items,
          row.total_quantity,
          row.plans_count
        ])
      ];
      sheetName = 'Raport_Klientów';
      fileName = `Raport_Klientow_${startYear || 'wszystkie'}-${endYear || 'lata'}`;
      
    } else if (type === 'products') {
      // Eksport raportu produktów
      const response = await new Promise((resolve, reject) => {
        let query = `
          SELECT 
            p.name as product_name,
            p.unit as product_unit,
            SUM(pi.quantity) as total_quantity,
            COUNT(pi.id) as orders_count,
            COUNT(DISTINCT pi.client_id) as clients_count
          FROM products p
          LEFT JOIN plan_items pi ON p.id = pi.product_id
          LEFT JOIN plans pl ON pi.plan_id = pl.id
          LEFT JOIN clients c ON pi.client_id = c.id
          WHERE 1=1
        `;
        
        let params = [];
        
        // Filtry dat
        if (startYear && startMonth) {
          query += ` AND (pl.year > ? OR (pl.year = ? AND pl.month >= ?))`;
          params.push(parseInt(startYear), parseInt(startYear), parseInt(startMonth));
        }
        
        if (endYear && endMonth) {
          query += ` AND (pl.year < ? OR (pl.year = ? AND pl.month <= ?))`;
          params.push(parseInt(endYear), parseInt(endYear), parseInt(endMonth));
        }
        
        // Filtr produktu
        if (productId) {
          query += ` AND p.id = ?`;
          params.push(parseInt(productId));
        }
        
        // Filtr handlowca
        if (salesmanId) {
          query += ` AND c.assigned_to_user_id = ?`;
          params.push(parseInt(salesmanId));
        }
        
        // Handlowiec widzi tylko produkty swoich klientów
        if (req.roleFilter.isHandlowiec) {
          query += ` AND (c.assigned_to_user_id = ? OR pi.id IS NULL)`;
          params.push(req.user.id);
        }
        
        query += `
          GROUP BY p.id, p.name, p.unit
          HAVING COUNT(pi.id) > 0
          ORDER BY total_quantity DESC, p.name
        `;
        
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      reportData = [
        ['Produkt', 'Jednostka', 'Łączna ilość', 'Liczba zamówień', 'Liczba klientów'],
        ...response.map(row => [
          row.product_name,
          row.product_unit,
          row.total_quantity,
          row.orders_count,
          row.clients_count
        ])
      ];
      sheetName = 'Raport_Produktów';
      fileName = `Raport_Produktow_${startYear || 'wszystkie'}-${endYear || 'lata'}`;
      
    } else if (type === 'salesmen' && req.user.role === 'admin') {
      // Eksport raportu handlowców (tylko admin)
      const response = await new Promise((resolve, reject) => {
        let query = `
          SELECT 
            u.full_name as salesman_name,
            COUNT(DISTINCT c.id) as clients_count,
            COUNT(pi.id) as total_items,
            COALESCE(SUM(pi.quantity), 0) as total_quantity,
            COUNT(DISTINCT pi.plan_id) as plans_count,
            COALESCE(AVG(pi.quantity), 0) as avg_per_plan
          FROM users u
          LEFT JOIN clients c ON u.id = c.assigned_to_user_id
          LEFT JOIN plan_items pi ON c.id = pi.client_id
          LEFT JOIN plans p ON pi.plan_id = p.id
          WHERE u.role = 'handlowiec' AND u.is_active = 1
        `;
        
        let params = [];
        
        // Filtry dat
        if (startYear && startMonth) {
          query += ` AND (p.year > ? OR (p.year = ? AND p.month >= ?))`;
          params.push(parseInt(startYear), parseInt(startYear), parseInt(startMonth));
        }
        
        if (endYear && endMonth) {
          query += ` AND (p.year < ? OR (p.year = ? AND p.month <= ?))`;
          params.push(parseInt(endYear), parseInt(endYear), parseInt(endMonth));
        }
        
        query += `
          GROUP BY u.id, u.full_name
          ORDER BY total_quantity DESC, u.full_name
        `;
        
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      reportData = [
        ['Handlowiec', 'Liczba klientów', 'Liczba pozycji', 'Łączna ilość', 'Liczba planów', 'Średnio na plan'],
        ...response.map(row => [
          row.salesman_name,
          row.clients_count,
          row.total_items,
          row.total_quantity,
          row.plans_count,
          Math.round(row.avg_per_plan * 100) / 100
        ])
      ];
      sheetName = 'Raport_Handlowców';
      fileName = `Raport_Handlowcow_${startYear || 'wszystkie'}-${endYear || 'lata'}`;
    }
    
    // Utwórz workbook i worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const finalFileName = `${fileName}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
    
    console.log('✅ Raport wyeksportowany:', finalFileName);
    
  } catch (error) {
    console.error('❌ Błąd eksportu raportu:', error);
    res.status(500).json({ error: 'Błąd podczas eksportu raportu' });
  }
});

// KONIEC ENDPOINTÓW RAPORTOWANIA

// === KOŃCOWE URUCHOMIENIE SERWERA ===
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Demand Planner Server running on port ${PORT}`);
  console.log(`🔐 Authentication enabled with JWT tokens`);
  console.log(`📋 Role-based access control active`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`👤 Test users: admin/admin123, jan.kowalski/jan123, zespol.zakupy/zakupy123`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Static files served from: ${path.join(__dirname, '../frontend/build')}`);
  }
});
