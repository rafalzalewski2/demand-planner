import React, { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

function ClientManager({ clients, onClientsUpdate, showToast, fetchWithAuth, userRole }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [salespeople, setSalespeople] = useState([]);
  
  // Import states
  const [selectedFile, setSelectedFile] = useState(null);
  const [importData, setImportData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  
  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSalespeople();
    }
  }, [userRole, fetchWithAuth]);

  // ✅ POPRAWIONE - używa fetchWithAuth z autoryzacją
  const fetchSalespeople = async () => {
    try {
      const response = await fetchWithAuth('/users/salespeople');
      if (response.ok) {
        const data = await response.json();
        setSalespeople(data || []);
      } else {
        console.error('Error fetching salespeople:', response.status);
        setSalespeople([]);
      }
    } catch (error) {
      console.error('Error fetching salespeople:', error);
      setSalespeople([]);
    }
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleAdd = async () => {
    if (!name.trim()) {
      showToast('Nazwa klienta jest wymagana', 'error');
      return;
    }

    try {
      const response = await fetchWithAuth('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          contact_info: contactInfo.trim() || null,
          assigned_to_user_id: assignedToUserId || null
        })
      });

      if (response.ok) {
        await onClientsUpdate();
        setName('');
        setContactInfo('');
        setAssignedToUserId('');
        setShowAddForm(false);
        showToast('Klient został dodany pomyślnie', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można dodać klienta'}`, 'error');
      }
    } catch (error) {
      console.error('Error adding client:', error);
      showToast('Błąd: Nie można dodać klienta', 'error');
    }
  };

  const startEdit = (client) => {
    setEditingClient(client);
    setName(client.name);
    setContactInfo(client.contact_info || '');
    setAssignedToUserId(client.assigned_to_user_id || '');
    setShowEditForm(true);
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleEdit = async () => {
    if (!name.trim()) {
      showToast('Nazwa klienta jest wymagana', 'error');
      return;
    }

    try {
      const response = await fetchWithAuth(`/clients/${editingClient.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          contact_info: contactInfo.trim() || null,
          assigned_to_user_id: assignedToUserId || null
        })
      });

      if (response.ok) {
        await onClientsUpdate();
        setName('');
        setContactInfo('');
        setAssignedToUserId('');
        setEditingClient(null);
        setShowEditForm(false);
        showToast('Klient został zaktualizowany pomyślnie', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można zaktualizować klienta'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      showToast('Błąd: Nie można zaktualizować klienta', 'error');
    }
  };

  const cancelEdit = () => {
    setEditingClient(null);
    setShowEditForm(false);
    setName('');
    setContactInfo('');
    setAssignedToUserId('');
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleDelete = (clientId, clientName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Usuń klienta',
      message: `Czy na pewno chcesz usunąć klienta "${clientName}"? Ta operacja nie może być cofnięta.`,
      onConfirm: () => confirmDeleteClient(clientId)
    });
  };

  const confirmDeleteClient = async (clientId) => {
    try {
      const response = await fetchWithAuth(`/clients/${clientId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await onClientsUpdate();
        showToast('Klient został usunięty', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można usunąć klienta'}`, 'error');
      }
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('Błąd: Nie można usunąć klienta', 'error');
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
    }
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleExport = async () => {
    try {
      const response = await fetchWithAuth('/clients/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Klienci_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Export zakończony pomyślnie', 'success');
      } else {
        showToast('Błąd podczas eksportu', 'error');
      }
    } catch (error) {
      console.error('Error exporting clients:', error);
      showToast('Błąd podczas eksportu', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      previewImport(file);
    }
  };

  const previewImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const XLSX = require('xlsx'); // Note: This needs to be installed in frontend
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const parsedData = jsonData.slice(1).filter(row => row[0]).map(row => ({
          name: row[0]?.toString().trim(),
          contact_info: row[1]?.toString().trim() || null
        }));
        
        setImportData(parsedData);
        setImportErrors([]);
        
        if (parsedData.length === 0) {
          setImportErrors(['Nie znaleziono poprawnych danych w pliku']);
        }
      } catch (error) {
        setImportErrors(['Błąd odczytu pliku Excel']);
        setImportData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleImportData = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetchWithAuth('/clients/import', {
        method: 'POST',
        body: formData,
        headers: {} // Remove Content-Type, let browser set it for FormData
      });

      if (response.ok) {
        const result = await response.json();
        await onClientsUpdate();
        showToast(result.message, 'success');
        
        if (result.errors && result.errors.length > 0) {
          setImportErrors(result.errors);
        }
        
        if (result.errors.length === 0) {
          cancelImport();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd importu: ${errorData.error || 'Nieznany błąd'}`, 'error');
      }
    } catch (error) {
      console.error('Error importing clients:', error);
      showToast('Błąd podczas importu', 'error');
    }
  };

  const cancelImport = () => {
    setShowImport(false);
    setSelectedFile(null);
    setImportData([]);
    setImportErrors([]);
    document.getElementById('clientFile').value = '';
  };

  // Sprawdzenie uprawnień dla dodawania/edytowania
  const canAddEdit = userRole === 'admin' || userRole === 'handlowiec';

  return (
    <div className="section">
      <div className="section-header">
        <h2>👥 Klienci ({clients.length})</h2>
        <div className="header-actions">
          {canAddEdit && (
            <>
              <button 
                className="btn-success"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? 'Anuluj' : '+ Dodaj klienta'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setShowImport(!showImport)}
              >
                📤 Import Excel
              </button>
            </>
          )}
          <button 
            className="btn-secondary"
            onClick={handleExport}
          >
            📥 Export Excel
          </button>
        </div>
      </div>

      {/* FORMULARZ DODAWANIA */}
      {showAddForm && (
        <div className="add-form">
          <h3>Nowy klient</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Nazwa klienta:</label>
              <input 
                type="text"
                placeholder="np. Firma ABC Sp. z o.o."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>
            
            <div className="form-field">
              <label>Informacje kontaktowe:</label>
              <input 
                type="text"
                placeholder="np. kontakt@firma.pl, 123-456-789"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>

            {userRole === 'admin' && salespeople.length > 0 && (
              <div className="form-field">
                <label>Przypisany handlowiec:</label>
                <select 
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  style={{ width: '250px' }}
                >
                  <option value="">-- Brak przypisania --</option>
                  {salespeople.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button className="btn-success" onClick={handleAdd}>Dodaj klienta</button>
            <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Anuluj</button>
          </div>
        </div>
      )}

      {/* FORMULARZ EDYCJI */}
      {showEditForm && editingClient && (
        <div className="add-form">
          <h3>Edytuj klienta: {editingClient.name}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Nazwa klienta:</label>
              <input 
                type="text"
                placeholder="np. Firma ABC Sp. z o.o."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>
            
            <div className="form-field">
              <label>Informacje kontaktowe:</label>
              <input 
                type="text"
                placeholder="np. kontakt@firma.pl, 123-456-789"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>

            {userRole === 'admin' && salespeople.length > 0 && (
              <div className="form-field">
                <label>Przypisany handlowiec:</label>
                <select 
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  style={{ width: '250px' }}
                >
                  <option value="">-- Brak przypisania --</option>
                  {salespeople.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button className="btn-success" onClick={handleEdit}>Zapisz zmiany</button>
            <button className="btn-secondary" onClick={cancelEdit}>Anuluj</button>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL */}
      {showImport && (
        <div className="add-form">
          <h3>📤 Import klientów z Excel</h3>
          
          <div className="import-instructions">
            <h4>Format pliku:</h4>
            <p>Plik Excel (.xlsx/.xls) powinien mieć kolumny:</p>
            <table className="format-table">
              <thead>
                <tr>
                  <th>A</th>
                  <th>B</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nazwa_klienta</td>
                  <td>Kontakt (opcjonalne)</td>
                </tr>
                <tr>
                  <td>Firma ABC Sp. z o.o.</td>
                  <td>kontakt@firma.pl</td>
                </tr>
                <tr>
                  <td>ABC Company</td>
                  <td>123-456-789</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="file-upload">
            <input 
              type="file" 
              id="clientFile"
              className="file-input"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
            />
            <label htmlFor="clientFile" className="file-label">
              📁 Wybierz plik Excel
            </label>
            {selectedFile && (
              <span style={{ marginLeft: '1rem', color: '#10b981' }}>
                ✅ {selectedFile.name}
              </span>
            )}
          </div>

          {importErrors.length > 0 && (
            <div className="import-errors">
              <h4>Błędy importu:</h4>
              {importErrors.map((error, index) => (
                <div key={index} className="error-item">{error}</div>
              ))}
            </div>
          )}

          {importData.length > 0 && (
            <div className="import-preview">
              <h4>Podgląd danych ({importData.length} rekordów):</h4>
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Nazwa</th>
                    <th>Kontakt</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.slice(0, 5).map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.contact_info || '-'}</td>
                    </tr>
                  ))}
                  {importData.length > 5 && (
                    <tr>
                      <td colSpan="2" className="more-rows">
                        ... i {importData.length - 5} więcej rekordów
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="import-actions">
            <button 
              className="btn-success" 
              onClick={handleImportData}
              disabled={!selectedFile || importData.length === 0}
            >
              ✅ Importuj dane
            </button>
            <button className="btn-secondary" onClick={cancelImport}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* LISTA KLIENTÓW */}
      <div className="items-list">
        {clients.length === 0 ? (
          <p className="empty-state">Brak klientów. {canAddEdit ? 'Dodaj pierwszego klienta lub zaimportuj z Excel.' : 'Skontaktuj się z administratorem.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Klient</th>
                <th>Kontakt</th>
                {userRole === 'admin' && <th>Handlowiec</th>}
                <th>Utworzono</th>
                {canAddEdit && <th>Akcje</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id}>
                  <td>
                    <strong>{client.name}</strong>
                  </td>
                  <td>
                    {client.contact_info ? (
                      <span style={{ color: '#666' }}>{client.contact_info}</span>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Brak danych</span>
                    )}
                  </td>
                  {userRole === 'admin' && (
                    <td>
                      {client.assigned_to_name ? (
                        <span className="assigned-person">
                          👤 {client.assigned_to_name}
                        </span>
                      ) : (
                        <span className="unassigned">Nieprzypisany</span>
                      )}
                    </td>
                  )}
                  <td style={{ fontSize: '0.9rem', color: '#666' }}>
                    {new Date(client.created_at).toLocaleDateString('pl-PL')}
                  </td>
                  {canAddEdit && (
                    <td className="actions-cell">
                      <button
                        className="btn-edit"
                        onClick={() => startEdit(client)}
                        title="Edytuj klienta"
                      >
                        ✏️
                      </button>
                      {userRole === 'admin' && (
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(client.id, client.name)}
                          title="Usuń klienta"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  )}
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

export default ClientManager;