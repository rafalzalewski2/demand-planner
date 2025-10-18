import React, { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

function UserManager({ showToast, fetchWithAuth }) {
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [username, setUsername] = useState('');
  const [passwordHash, setPasswordHash] = useState('');
  const [role, setRole] = useState('handlowiec');
  const [fullName, setFullName] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  
  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'handlowiec', label: 'Handlowiec' },
    { value: 'zakupy', label: 'Zakupy' }
  ];

  useEffect(() => {
    fetchUsers();
  }, [fetchWithAuth]);

  // ✅ POPRAWIONE - używa fetchWithAuth z autoryzacją
  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth('/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []); // Zabezpieczenie przed undefined
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd pobierania użytkowników: ${errorData.error || 'Nieznany błąd'}`, 'error');
        setUsers([]); // Ustawienie pustej tablicy przy błędzie
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Błąd połączenia z serwerem', 'error');
      setUsers([]); // Ustawienie pustej tablicy przy błędzie
    }
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleAdd = async () => {
    if (!username.trim() || !passwordHash.trim() || !fullName.trim()) {
      showToast('Wszystkie pola są wymagane', 'error');
      return;
    }

    try {
      const response = await fetchWithAuth('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password_hash: passwordHash.trim(),
          role: role,
          full_name: fullName.trim()
        })
      });

      if (response.ok) {
        await fetchUsers();
        setUsername('');
        setPasswordHash('');
        setRole('handlowiec');
        setFullName('');
        setShowAddForm(false);
        showToast('Użytkownik został dodany pomyślnie', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można dodać użytkownika'}`, 'error');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      showToast('Błąd: Nie można dodać użytkownika', 'error');
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setUsername(user.username);
    setRole(user.role);
    setFullName(user.full_name);
    setPasswordHash(''); // Nie pokazujemy hasła
    setShowEditForm(true);
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleEdit = async () => {
    if (!username.trim() || !fullName.trim()) {
      showToast('Nazwa użytkownika i imię są wymagane', 'error');
      return;
    }

    try {
      const response = await fetchWithAuth(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: username.trim(),
          role: role,
          full_name: fullName.trim()
        })
      });

      if (response.ok) {
        await fetchUsers();
        setUsername('');
        setPasswordHash('');
        setRole('handlowiec');
        setFullName('');
        setEditingUser(null);
        setShowEditForm(false);
        showToast('Użytkownik został zaktualizowany pomyślnie', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można zaktualizować użytkownika'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Błąd: Nie można zaktualizować użytkownika', 'error');
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowEditForm(false);
    setUsername('');
    setPasswordHash('');
    setRole('handlowiec');
    setFullName('');
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleDelete = (userId, userName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Usuń użytkownika',
      message: `Czy na pewno chcesz usunąć użytkownika "${userName}"? Ta operacja nie może być cofnięta.`,
      onConfirm: () => confirmDeleteUser(userId)
    });
  };

  const confirmDeleteUser = async (userId) => {
    try {
      const response = await fetchWithAuth(`/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchUsers();
        showToast('Użytkownik został usunięty', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można usunąć użytkownika'}`, 'error');
      }
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Błąd: Nie można usunąć użytkownika', 'error');
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
    }
  };

  const getRoleBadgeClass = (userRole) => {
    switch (userRole) {
      case 'admin': return 'role-admin';
      case 'handlowiec': return 'role-handlowiec';
      case 'zakupy': return 'role-zakupy';
      default: return 'role-default';
    }
  };

  const getRoleLabel = (userRole) => {
    const roleObj = roles.find(r => r.value === userRole);
    return roleObj ? roleObj.label : userRole;
  };

  const getStatusDisplay = (isActive) => {
    return isActive ? (
      <span style={{ color: '#059669', fontWeight: '500' }}>✅ Aktywny</span>
    ) : (
      <span style={{ color: '#dc2626', fontWeight: '500' }}>❌ Nieaktywny</span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pl-PL');
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>🔧 Użytkownicy</h2>
        <div className="header-actions">
          <button 
            className="btn-success"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Anuluj' : '+ Dodaj użytkownika'}
          </button>
        </div>
      </div>

      {/* FORMULARZ DODAWANIA */}
      {showAddForm && (
        <div className="add-form">
          <h3>Nowy użytkownik</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Nazwa użytkownika:</label>
              <input 
                type="text"
                placeholder="np. jan.kowalski"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '250px' }}
              />
            </div>
            
            <div className="form-field">
              <label>Hasło:</label>
              <input 
                type="password"
                placeholder="Hasło"
                value={passwordHash}
                onChange={(e) => setPasswordHash(e.target.value)}
                style={{ width: '250px' }}
              />
            </div>

            <div className="form-field">
              <label>Rola:</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '200px' }}
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Imię i nazwisko:</label>
              <input 
                type="text"
                placeholder="np. Jan Kowalski"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button className="btn-success" onClick={handleAdd}>Dodaj</button>
            <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Anuluj</button>
          </div>
        </div>
      )}

      {/* FORMULARZ EDYCJI */}
      {showEditForm && editingUser && (
        <div className="add-form">
          <h3>Edytuj użytkownika: {editingUser.full_name}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Nazwa użytkownika:</label>
              <input 
                type="text"
                placeholder="np. jan.kowalski"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '250px' }}
              />
            </div>

            <div className="form-field">
              <label>Rola:</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '200px' }}
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Imię i nazwisko:</label>
              <input 
                type="text"
                placeholder="np. Jan Kowalski"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button className="btn-success" onClick={handleEdit}>Zapisz</button>
            <button className="btn-secondary" onClick={cancelEdit}>Anuluj</button>
          </div>
        </div>
      )}

      {/* LISTA UŻYTKOWNIKÓW */}
      <div className="items-list">
        {users.length === 0 ? (
          <p className="empty-state">Brak użytkowników. Spróbuj odświeżyć stronę lub sprawdź połączenie.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Użytkownik</th>
                <th>Rola</th>
                <th>Status</th>
                <th>Ostatnie logowanie</th>
                <th>Utworzono</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div>
                      <strong>{user.full_name}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        @{user.username}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>{getStatusDisplay(user.is_active)}</td>
                  <td style={{ fontSize: '0.9rem' }}>
                    {formatDate(user.last_login)}
                  </td>
                  <td style={{ fontSize: '0.9rem' }}>
                    {formatDate(user.created_at)}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-edit"
                      onClick={() => startEdit(user)}
                      title="Edytuj użytkownika"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(user.id, user.full_name)}
                      title="Usuń użytkownika"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
    </div>
  );
}

export default UserManager;