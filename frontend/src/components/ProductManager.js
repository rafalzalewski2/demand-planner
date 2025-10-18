import React, { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

function ProductManager({ products, onProductsUpdate, showToast, fetchWithAuth, userRole }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('szt');
  const [editingProduct, setEditingProduct] = useState(null);
  
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

  const units = ['szt', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'm²', 'cm²', 'opak', 'paczka'];

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleAdd = async () => {
    if (!name.trim()) {
      showToast('Nazwa produktu jest wymagana', 'error');
      return;
    }

    try {
      const response = await fetchWithAuth('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          unit: unit
        })
      });

      if (response.ok) {
        await onProductsUpdate();
        setName('');
        setUnit('szt');
        setShowAddForm(false);
        showToast('Produkt został dodany pomyślnie', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można dodać produktu'}`, 'error');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      showToast('Błąd: Nie można dodać produktu', 'error');
    }
  };

  const startEdit = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setUnit(product.unit);
    setShowEditForm(true);
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleEdit = async () => {
    if (!name.trim()) {
      showToast('Nazwa produktu jest wymagana', 'error');
      return;
    }

    try {
      const response = await fetchWithAuth(`/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          unit: unit
        })
      });

      if (response.ok) {
        await onProductsUpdate();
        setName('');
        setUnit('szt');
        setEditingProduct(null);
        setShowEditForm(false);
        showToast('Produkt został zaktualizowany pomyślnie', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można zaktualizować produktu'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      showToast('Błąd: Nie można zaktualizować produktu', 'error');
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setShowEditForm(false);
    setName('');
    setUnit('szt');
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleDelete = (productId, productName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Usuń produkt',
      message: `Czy na pewno chcesz usunąć produkt "${productName}"? Ta operacja nie może być cofnięta.`,
      onConfirm: () => confirmDeleteProduct(productId)
    });
  };

  const confirmDeleteProduct = async (productId) => {
    try {
      const response = await fetchWithAuth(`/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await onProductsUpdate();
        showToast('Produkt został usunięty', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd: ${errorData.error || 'Nie można usunąć produktu'}`, 'error');
      }
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Błąd: Nie można usunąć produktu', 'error');
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
    }
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const handleExport = async () => {
    try {
      const response = await fetchWithAuth('/products/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Produkty_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Lista produktów została wyeksportowana', 'success');
      } else {
        showToast('Błąd podczas eksportu', 'error');
      }
    } catch (error) {
      console.error('Error exporting products:', error);
      showToast('Błąd podczas eksportu', 'error');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
      previewImport(file);
    } else {
      showToast('Proszę wybrać plik Excel (.xlsx)', 'error');
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
          unit: row[1]?.toString().trim() || 'szt'
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
      const response = await fetchWithAuth('/products/import', {
        method: 'POST',
        body: formData,
        headers: {} // Remove Content-Type, let browser set it for FormData
      });

      if (response.ok) {
        const result = await response.json();
        await onProductsUpdate();
        showToast(result.message, 'success');
        
        if (result.errors && result.errors.length > 0) {
          setImportErrors(result.errors);
          showToast(`Uwaga: ${result.errors.length} błędów`, 'warning');
        }
        
        if (result.errors.length === 0) {
          cancelImport();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd importu: ${errorData.error || 'Nieznany błąd'}`, 'error');
      }
    } catch (error) {
      console.error('Error importing products:', error);
      showToast('Błąd podczas importu', 'error');
    }
  };

  const cancelImport = () => {
    setShowImport(false);
    setSelectedFile(null);
    setImportData([]);
    setImportErrors([]);
    document.getElementById('productFile').value = '';
  };

  // Sprawdzenie uprawnień dla dodawania/edytowania
  const canAddEdit = userRole === 'admin' || userRole === 'handlowiec';
  const canDelete = userRole === 'admin';

  return (
    <div className="section">
      <div className="section-header">
        <h2>📦 Produkty ({products.length})</h2>
        <div className="header-actions">
          {canAddEdit && (
            <>
              <button 
                className="btn-success"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? 'Anuluj' : '+ Dodaj produkt'}
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
          <h3>Nowy produkt</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Nazwa produktu:</label>
              <input 
                type="text"
                placeholder="np. Śruba M6x20"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>
            
            <div className="form-field">
              <label>Jednostka:</label>
              <select 
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{ width: '150px' }}
              >
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-actions">
            <button className="btn-success" onClick={handleAdd}>Dodaj produkt</button>
            <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Anuluj</button>
          </div>
        </div>
      )}

      {/* FORMULARZ EDYCJI */}
      {showEditForm && editingProduct && (
        <div className="add-form">
          <h3>Edytuj produkt: {editingProduct.name}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Nazwa produktu:</label>
              <input 
                type="text"
                placeholder="np. Śruba M6x20"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>
            
            <div className="form-field">
              <label>Jednostka:</label>
              <select 
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{ width: '150px' }}
              >
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
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
          <h3>📤 Import produktów z Excel</h3>
          
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
                  <td>Nazwa_produktu</td>
                  <td>Jednostka</td>
                </tr>
                <tr>
                  <td>Śruba M6x20</td>
                  <td>szt</td>
                </tr>
                <tr>
                  <td>Stal konstrukcyjna</td>
                  <td>kg</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="file-upload">
            <input 
              type="file" 
              id="productFile"
              className="file-input"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
            />
            <label htmlFor="productFile" className="file-label">
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
                    <th>Jednostka</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.slice(0, 5).map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.unit}</td>
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

      {/* LISTA PRODUKTÓW */}
      <div className="items-list">
        {products.length === 0 ? (
          <p className="empty-state">Brak produktów. {canAddEdit ? 'Dodaj pierwszy produkt lub zaimportuj z Excel.' : 'Skontaktuj się z administratorem.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Jednostka</th>
                <th>Data dodania</th>
                {(canAddEdit || canDelete) && <th>Akcje</th>}
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong></td>
                  <td>
                    <span style={{ 
                      backgroundColor: '#e0f2fe', 
                      color: '#0277bd', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      {product.unit}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.9rem', color: '#666' }}>
                    {new Date(product.created_at).toLocaleDateString('pl-PL')}
                  </td>
                  {(canAddEdit || canDelete) && (
                    <td className="actions-cell">
                      {canAddEdit && (
                        <button 
                          className="btn-edit"
                          onClick={() => startEdit(product)}
                          title="Edytuj produkt"
                        >
                          ✏️
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(product.id, product.name)}
                          title="Usuń produkt"
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

export default ProductManager;