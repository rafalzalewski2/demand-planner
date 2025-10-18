import React, { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

function PlanView({ currentPlan, clients, products, showToast, fetchWithAuth }) {
  const [planItems, setPlanItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    if (currentPlan) {
      console.log('📋 PlanView - ładowanie pozycji dla planu:', currentPlan);
      fetchPlanItems();
    }
  }, [currentPlan]);

  // ✅ POPRAWIONE - używa fetchWithAuth z autoryzacją
  const fetchPlanItems = async () => {
    if (!currentPlan) return;
    
    setLoading(true);
    try {
      console.log('📦 Pobieranie pozycji planu ID:', currentPlan.id);
      const response = await fetchWithAuth(`/plans/${currentPlan.id}/items`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Pozycje planu pobrane:', data.length);
        setPlanItems(data);
      } else {
        console.error('❌ Błąd pobierania pozycji planu:', response.status);
        const errorData = await response.json().catch(() => ({}));
        showToast(`Błąd pobierania pozycji: ${errorData.error || 'Status: ' + response.status}`, 'error');
        setPlanItems([]);
      }
    } catch (error) {
      console.error('❌ Network error fetchPlanItems:', error);
      showToast('Błąd połączenia podczas pobierania pozycji planu', 'error');
      setPlanItems([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const addPlanItem = async () => {
    if (!selectedClient || !selectedProduct || !quantity) {
      showToast('Wypełnij klienta, produkt i ilość', 'error');
      return;
    }

    try {
      console.log('➕ Dodawanie pozycji do planu:', { 
        plan: currentPlan.id, 
        client: selectedClient, 
        product: selectedProduct 
      });
      
      const response = await fetchWithAuth(`/plans/${currentPlan.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: parseInt(selectedClient),
          product_id: parseInt(selectedProduct),
          quantity: parseFloat(quantity),
          notes: notes || null
        })
      });
      
      if (response.ok) {
        console.log('✅ Pozycja dodana');
        fetchPlanItems(); // Odśwież listę
        // Czyścimy produkt i ilość, zostawiamy klienta
        setSelectedProduct('');
        setQuantity('');
        setNotes('');
        showToast('Pozycja została dodana', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Błąd dodawania pozycji:', errorData);
        showToast(`Błąd: ${errorData.error || 'Nie można dodać pozycji'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error adding plan item:', error);
      showToast('Błąd połączenia podczas dodawania pozycji', 'error');
    }
  };

  const openAddFormForClient = (clientId, clientName) => {
    console.log('📝 Otwieranie formularza dla klienta:', clientName);
    setSelectedClient(clientId.toString());
    setSelectedProduct('');
    setQuantity('');
    setNotes('');
    setShowAddForm(true);
    // Scroll do formularza
    setTimeout(() => {
      const form = document.querySelector('.add-form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const deletePlanItem = (id) => {
    const item = planItems.find(item => item.id === id);
    if (!item) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Usuń pozycję',
      message: `Czy na pewno chcesz usunąć "${item.product_name}" z planu?`,
      onConfirm: () => confirmDeletePlanItem(id)
    });
  };

  // ✅ POPRAWIONE - używa fetchWithAuth  
  const confirmDeletePlanItem = async (id) => {
    try {
      console.log('🗑️ Usuwanie pozycji planu ID:', id);
      const response = await fetchWithAuth(`/plan-items/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('✅ Pozycja usunięta');
        fetchPlanItems(); // Odśwież listę
        showToast('Pozycja została usunięta', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Błąd usuwania pozycji:', errorData);
        showToast(`Błąd usuwania: ${errorData.error || 'Nieznany błąd'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error deleting plan item:', error);
      showToast('Błąd połączenia przy usuwaniu', 'error');
    } finally {
      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
    }
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const updateQuantity = async (id, newQuantity) => {
    try {
      const item = planItems.find(item => item.id === id);
      if (!item) return;
      
      console.log('📝 Aktualizacja ilości:', id, newQuantity);
      const response = await fetchWithAuth(`/plan-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          quantity: parseFloat(newQuantity),
          notes: item.notes || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Błąd aktualizacji ilości:', errorData);
        showToast(`Błąd aktualizacji: ${errorData.error || 'Nieznany błąd'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error updating quantity:', error);
      showToast('Błąd przy aktualizacji ilości', 'error');
    }
  };

  // ✅ POPRAWIONE - używa fetchWithAuth
  const updateNotes = async (id, newNotes) => {
    try {
      const item = planItems.find(item => item.id === id);
      if (!item) return;
      
      console.log('📝 Aktualizacja notatek:', id);
      const response = await fetchWithAuth(`/plan-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          quantity: item.quantity,
          notes: newNotes || null 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Błąd aktualizacji notatek:', errorData);
        showToast(`Błąd aktualizacji: ${errorData.error || 'Nieznany błąd'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error updating notes:', error);
      showToast('Błąd przy aktualizacji notatek', 'error');
    }
  };

  // ✅ POPRAWIONE - EKSPORT PLANU z fetchWithAuth
  const exportPlan = async () => {
    try {
      console.log('📤 Eksport planu ID:', currentPlan.id);
      const response = await fetchWithAuth(`/plans/${currentPlan.id}/export`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Błąd podczas eksportowania');
      }

      // Pobierz plik jako blob
      const blob = await response.blob();
      
      // Utwórz URL do pobrania
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Ustaw nazwę pliku
      const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
      link.download = `Plan_zapotrzebowania_${MONTHS[currentPlan.month - 1]}_${currentPlan.year}.xlsx`;
      
      // Kliknij i usuń
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Plan wyeksportowany');
      showToast('Plan został wyeksportowany!', 'success');
    } catch (error) {
      console.error('❌ Error exporting plan:', error);
      showToast('Błąd podczas eksportowania: ' + error.message, 'error');
    }
  };

  // Grupowanie pozycji według klientów z informacją o handlowcu
  const groupedItems = Array.isArray(planItems) ?
    planItems.reduce((acc, item) => {
      if (!acc[item.client_id]) {
        acc[item.client_id] = {
          client_name: item.client_name,
          assigned_to_name: item.assigned_to_name,
          items: []
        };
      }
      acc[item.client_id].items.push(item);
      return acc;
    }, {}) : {};

  if (!currentPlan) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
        <p>Wybierz plan aby zobaczyć pozycje</p>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>📋 Pozycje planu</h2>
        <div className="header-actions">
          {/* DEBUG INFO */}
          <div style={{
            background: '#f1f5f9',
            padding: '0.3rem 0.8rem',
            borderRadius: '15px',
            fontSize: '0.75rem',
            color: '#64748b',
            marginRight: '1rem'
          }}>
            📊 Pozycji: {planItems.length} | Plan ID: {currentPlan.id}
          </div>
          
          <button 
            className="btn-secondary"
            onClick={exportPlan}
            disabled={planItems.length === 0}
          >
            📤 Eksportuj plan
          </button>
          <button 
            className="btn-success"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Anuluj' : '+ Dodaj pozycję'}
          </button>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#64748b',
          background: '#f8fafc',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          ⏳ Ładowanie pozycji planu...
        </div>
      )}

      {/* FORMULARZ DODAWANIA */}
      {showAddForm && (
        <div className="add-form">
          <h3>Nowa pozycja</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Klient:</label>
              <select 
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                style={{ width: '250px' }}
              >
                <option value="">-- Wybierz klienta --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Produkt:</label>
              <select 
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                style={{ width: '250px' }}
              >
                <option value="">-- Wybierz produkt --</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Ilość:</label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: '120px' }}
                placeholder="0.00"
              />
            </div>

            <div className="form-field">
              <label>Notatki:</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '250px' }}
                placeholder="Opcjonalne notatki..."
              />
            </div>

            <div className="form-field">
              <button className="btn-success" onClick={addPlanItem}>
                ➕ Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTA POZYCJI */}
      {!loading && Object.keys(groupedItems).length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#64748b',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '2px dashed #cbd5e1'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h3 style={{ marginBottom: '0.5rem', color: '#475569' }}>Brak pozycji w planie</h3>
          <p style={{ marginBottom: '1.5rem' }}>Dodaj pierwszą pozycję poprzez kliknięcie przycisku powyżej</p>
          <button 
            className="btn-primary"
            onClick={() => setShowAddForm(true)}
            style={{ padding: '0.8rem 1.5rem' }}
          >
            + Dodaj pierwszą pozycję
          </button>
        </div>
      )}

      {/* POZYCJE GRUPOWANE WEDŁUG KLIENTÓW */}
      {!loading && Object.entries(groupedItems).map(([clientId, clientGroup]) => (
        <div key={clientId} className="client-group">
          <div className="client-header">
            <div className="client-info">
              <h3>🏢 {clientGroup.client_name}</h3>
              {clientGroup.assigned_to_name && (
                <span className="assigned-to">
                  👤 {clientGroup.assigned_to_name}
                </span>
              )}
            </div>
            <button 
              className="btn-outline"
              onClick={() => openAddFormForClient(clientId, clientGroup.client_name)}
            >
              + Dodaj dla tego klienta
            </button>
          </div>

          <div className="items-table">
            <table>
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th>Ilość</th>
                  <th>Jednostka</th>
                  <th>Notatki</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {clientGroup.items.map(item => (
                  <tr key={item.id}>
                    <td className="product-name">{item.product_name}</td>
                    <td>
                      <input
  type="number"
  step="0.01"
  value={item.quantity}
  onChange={(e) => updateQuantity(item.id, e.target.value)}
  className="inline-input quantity-input"
  // usuń style={{ width: '80px' }} - CSS się tym zajmie
/>
                    </td>
                    <td className="unit-cell">{item.product_unit}</td>
                    <td>
                      <input
  type="text"
  value={item.notes || ''}
  onChange={(e) => updateNotes(item.id, e.target.value)}
  className="inline-input notes-input"
  placeholder="Notatki..."
/>
                    </td>
                    <td>
                      <button
                        className="btn-danger-small"
                        onClick={() => deletePlanItem(item.id)}
                        title="Usuń pozycję"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

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

export default PlanView;