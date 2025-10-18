import React, { useState, useEffect, useCallback } from 'react';
import './ReportsManager.css';

const ReportsManager = ({ showToast, fetchWithAuth, userRole }) => {
  // ========== STATES ==========
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('clients');
  const [dateRange, setDateRange] = useState({
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear(),
    startMonth: 1,
    endMonth: 12
  });
  
  // Dane raportów
  const [clientsReport, setClientsReport] = useState([]);
  const [productsReport, setProductsReport] = useState([]);
  const [summaryReport, setSummaryReport] = useState([]);
  const [salesmenReport, setSalesmenReport] = useState([]);
  
  // Filtry dodatkowe
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState('');
  
  // Listy pomocnicze
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesmen, setSalesmen] = useState([]);

  // ========== DOSTĘPNE RAPORTY WEDŁUG ROLI ==========
  const getAvailableReports = () => {
    const allReports = [
      { id: 'clients', label: '📊 Raport Klientów', roles: ['admin', 'handlowiec', 'zakupy'] },
      { id: 'products', label: '📦 Raport Produktów', roles: ['admin', 'handlowiec', 'zakupy'] },
      { id: 'summary', label: '📈 Raport Zbiorczy', roles: ['admin', 'handlowiec', 'zakupy'] },
      { id: 'salesmen', label: '👥 Raport Handlowców', roles: ['admin'] }
    ];
    
    return allReports.filter(report => report.roles.includes(userRole));
  };

  // ========== ŁADOWANIE DANYCH POMOCNICZYCH ==========
  const fetchHelperData = useCallback(async () => {
    try {
      console.log('🔄 Ładowanie danych pomocniczych...');
      
      // Pobierz klientów
      const clientsResponse = await fetchWithAuth('/clients');
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData);
      }

      // Pobierz produkty
      const productsResponse = await fetchWithAuth('/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }

      // Pobierz handlowców (tylko dla admina)
      if (userRole === 'admin') {
        const salesmenResponse = await fetchWithAuth('/users/salespeople');
        if (salesmenResponse.ok) {
          const salesmenData = await salesmenResponse.json();
          setSalesmen(salesmenData);
        }
      }
    } catch (error) {
      console.error('❌ Błąd ładowania danych pomocniczych:', error);
    }
  }, [fetchWithAuth, userRole]);

  // ========== FUNKCJE RAPORTÓW ==========
  
  // Raport Klientów
  const fetchClientsReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startYear: dateRange.startYear,
        endYear: dateRange.endYear,
        startMonth: dateRange.startMonth,
        endMonth: dateRange.endMonth,
        ...(selectedClient && { clientId: selectedClient }),
        ...(selectedSalesman && { salesmanId: selectedSalesman })
      });

      console.log('📊 Pobieranie raportu klientów...', params.toString());
      
      const response = await fetchWithAuth(`/reports/clients?${params}`);
      if (response.ok) {
        const data = await response.json();
        setClientsReport(data);
        console.log('✅ Raport klientów załadowany:', data.length, 'pozycji');
      } else {
        showToast('Błąd pobierania raportu klientów', 'error');
      }
    } catch (error) {
      console.error('❌ Błąd raportu klientów:', error);
      showToast('Błąd połączenia podczas pobierania raportu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Raport Produktów
  const fetchProductsReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startYear: dateRange.startYear,
        endYear: dateRange.endYear,
        startMonth: dateRange.startMonth,
        endMonth: dateRange.endMonth,
        ...(selectedProduct && { productId: selectedProduct }),
        ...(selectedSalesman && { salesmanId: selectedSalesman })
      });

      console.log('📦 Pobieranie raportu produktów...', params.toString());
      
      const response = await fetchWithAuth(`/reports/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProductsReport(data);
        console.log('✅ Raport produktów załadowany:', data.length, 'pozycji');
      } else {
        showToast('Błąd pobierania raportu produktów', 'error');
      }
    } catch (error) {
      console.error('❌ Błąd raportu produktów:', error);
      showToast('Błąd połączenia podczas pobierania raportu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Raport Zbiorczy
  const fetchSummaryReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startYear: dateRange.startYear,
        endYear: dateRange.endYear,
        startMonth: dateRange.startMonth,
        endMonth: dateRange.endMonth
      });

      console.log('📈 Pobieranie raportu zbiorczego...', params.toString());
      
      const response = await fetchWithAuth(`/reports/summary?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSummaryReport(data);
        console.log('✅ Raport zbiorczy załadowany:', data);
      } else {
        showToast('Błąd pobierania raportu zbiorczego', 'error');
      }
    } catch (error) {
      console.error('❌ Błąd raportu zbiorczego:', error);
      showToast('Błąd połączenia podczas pobierania raportu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Raport Handlowców (tylko admin)
  const fetchSalesmenReport = async () => {
    if (userRole !== 'admin') return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startYear: dateRange.startYear,
        endYear: dateRange.endYear,
        startMonth: dateRange.startMonth,
        endMonth: dateRange.endMonth
      });

      console.log('👥 Pobieranie raportu handlowców...', params.toString());
      
      const response = await fetchWithAuth(`/reports/salesmen?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSalesmenReport(data);
        console.log('✅ Raport handlowców załadowany:', data.length, 'pozycji');
      } else {
        showToast('Błąd pobierania raportu handlowców', 'error');
      }
    } catch (error) {
      console.error('❌ Błąd raportu handlowców:', error);
      showToast('Błąd połączenia podczas pobierania raportu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== FUNKCJA GŁÓWNA ŁADOWANIA RAPORTU ==========
  const loadReport = () => {
    console.log('🔄 Ładowanie raportu:', activeReport);
    
    switch (activeReport) {
      case 'clients':
        fetchClientsReport();
        break;
      case 'products':
        fetchProductsReport();
        break;
      case 'summary':
        fetchSummaryReport();
        break;
      case 'salesmen':
        fetchSalesmenReport();
        break;
      default:
        console.warn('⚠️ Nieznany typ raportu:', activeReport);
    }
  };

  // ========== EKSPORT DO EXCEL ==========
  const exportToExcel = async () => {
    try {
      console.log('📄 Eksportowanie raportu do Excel:', activeReport);
      
      const params = new URLSearchParams({
        type: activeReport,
        startYear: dateRange.startYear,
        endYear: dateRange.endYear,
        startMonth: dateRange.startMonth,
        endMonth: dateRange.endMonth,
        ...(selectedClient && { clientId: selectedClient }),
        ...(selectedProduct && { productId: selectedProduct }),
        ...(selectedSalesman && { salesmanId: selectedSalesman })
      });

      const response = await fetchWithAuth(`/reports/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Raport_${activeReport}_${dateRange.startYear}-${dateRange.endYear}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Raport został wyeksportowany', 'success');
      } else {
        showToast('Błąd eksportu raportu', 'error');
      }
    } catch (error) {
      console.error('❌ Błąd eksportu:', error);
      showToast('Błąd podczas eksportu raportu', 'error');
    }
  };

  // ========== EFFECTS ==========
  useEffect(() => {
    fetchHelperData();
  }, [fetchHelperData]);

  useEffect(() => {
    if (clients.length > 0 || products.length > 0) {
      // Bezpośrednie wywołanie funkcji zamiast przez loadReport callback
      console.log('🔄 Ładowanie raportu:', activeReport);
      
      switch (activeReport) {
        case 'clients':
          fetchClientsReport();
          break;
        case 'products':
          fetchProductsReport();
          break;
        case 'summary':
          fetchSummaryReport();
          break;
        case 'salesmen':
          fetchSalesmenReport();
          break;
        default:
          console.warn('⚠️ Nieznany typ raportu:', activeReport);
      }
    }
  }, [activeReport, dateRange, clients.length, products.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== HELPER FUNCTIONS ==========
  const resetFilters = () => {
    setSelectedClient('');
    setSelectedProduct('');
    setSelectedSalesman('');
    setDateRange({
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear(),
      startMonth: 1,
      endMonth: 12
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  // ========== RENDER ==========
  return (
    <div className="reports-manager">
      
      {/* HEADER */}
      <div className="reports-header">
        <div className="header-left">
          <h2>📊 Panel Raportowania</h2>
          <p>Analizy i statystyki zapotrzebowania</p>
        </div>
        <div className="header-right">
          <button 
            className="btn-export" 
            onClick={exportToExcel}
            disabled={loading}
          >
            📥 Eksport Excel
          </button>
          <button 
            className="btn-secondary" 
            onClick={resetFilters}
          >
            🔄 Resetuj filtry
          </button>
        </div>
      </div>

      {/* NAWIGACJA RAPORTÓW */}
      <div className="reports-nav">
        {getAvailableReports().map(report => (
          <button
            key={report.id}
            className={`report-tab ${activeReport === report.id ? 'active' : ''}`}
            onClick={() => setActiveReport(report.id)}
          >
            {report.label}
          </button>
        ))}
      </div>

      {/* FILTRY */}
      <div className="filters-section">
        <div className="filters-grid">
          
          {/* FILTRY DATY */}
          <div className="filter-group">
            <label>📅 Okres od:</label>
            <div className="date-inputs">
              <select 
                value={dateRange.startMonth}
                onChange={(e) => setDateRange(prev => ({...prev, startMonth: parseInt(e.target.value)}))}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>
                    {new Date(2024, i).toLocaleDateString('pl-PL', { month: 'long' })}
                  </option>
                ))}
              </select>
              <input 
                type="number"
                value={dateRange.startYear}
                onChange={(e) => setDateRange(prev => ({...prev, startYear: parseInt(e.target.value)}))}
                min="2020"
                max="2030"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>📅 Okres do:</label>
            <div className="date-inputs">
              <select 
                value={dateRange.endMonth}
                onChange={(e) => setDateRange(prev => ({...prev, endMonth: parseInt(e.target.value)}))}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>
                    {new Date(2024, i).toLocaleDateString('pl-PL', { month: 'long' })}
                  </option>
                ))}
              </select>
              <input 
                type="number"
                value={dateRange.endYear}
                onChange={(e) => setDateRange(prev => ({...prev, endYear: parseInt(e.target.value)}))}
                min="2020"
                max="2030"
              />
            </div>
          </div>

          {/* FILTRY DODATKOWE */}
          {(activeReport === 'clients' || activeReport === 'products') && (
            <div className="filter-group">
              <label>🏢 Klient:</label>
              <select 
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">-- Wszyscy klienci --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(activeReport === 'products' || activeReport === 'clients') && (
            <div className="filter-group">
              <label>📦 Produkt:</label>
              <select 
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">-- Wszystkie produkty --</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {userRole === 'admin' && salesmen.length > 0 && (
            <div className="filter-group">
              <label>👤 Handlowiec:</label>
              <select 
                value={selectedSalesman}
                onChange={(e) => setSelectedSalesman(e.target.value)}
              >
                <option value="">-- Wszyscy handlowcy --</option>
                {salesmen.map(salesman => (
                  <option key={salesman.id} value={salesman.id}>
                    {salesman.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PRZYCISK FILTROWANIA */}
          <div className="filter-group">
            <button 
              className="btn-primary filter-btn"
              onClick={loadReport}
              disabled={loading}
            >
              {loading ? '⏳ Ładowanie...' : '🔍 Filtruj'}
            </button>
          </div>
        </div>
      </div>

      {/* ZAWARTOŚĆ RAPORTU */}
      <div className="report-content">
        
        {loading && (
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <p>Ładowanie raportu...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* RAPORT KLIENTÓW */}
            {activeReport === 'clients' && (
              <div className="report-section">
                <h3>📊 Raport Klientów</h3>
                <p>Zestawienie zamówień według klientów</p>
                
                {clientsReport.length === 0 ? (
                  <div className="empty-report">
                    <p>Brak danych dla wybranego okresu</p>
                  </div>
                ) : (
                  <div className="report-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Klient</th>
                          <th>Handlowiec</th>
                          <th>Liczba pozycji</th>
                          <th>Łączna ilość</th>
                          <th>Liczba planów</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientsReport.map((row, index) => (
                          <tr key={index}>
                            <td><strong>{row.client_name}</strong></td>
                            <td>{row.salesman_name || 'Brak przypisania'}</td>
                            <td>{formatNumber(row.total_items)}</td>
                            <td>{formatNumber(row.total_quantity)}</td>
                            <td>{formatNumber(row.plans_count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* RAPORT PRODUKTÓW */}
            {activeReport === 'products' && (
              <div className="report-section">
                <h3>📦 Raport Produktów</h3>
                <p>Zestawienie najpopularniejszych produktów</p>
                
                {productsReport.length === 0 ? (
                  <div className="empty-report">
                    <p>Brak danych dla wybranego okresu</p>
                  </div>
                ) : (
                  <div className="report-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Produkt</th>
                          <th>Jednostka</th>
                          <th>Łączna ilość</th>
                          <th>Liczba zamówień</th>
                          <th>Liczba klientów</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsReport.map((row, index) => (
                          <tr key={index}>
                            <td><strong>{row.product_name}</strong></td>
                            <td>{row.product_unit}</td>
                            <td>{formatNumber(row.total_quantity)} {row.product_unit}</td>
                            <td>{formatNumber(row.orders_count)}</td>
                            <td>{formatNumber(row.clients_count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* RAPORT ZBIORCZY */}
            {activeReport === 'summary' && (
              <div className="report-section">
                <h3>📈 Raport Zbiorczy</h3>
                <p>Podsumowanie ogólnych statystyk</p>
                
                {!summaryReport || Object.keys(summaryReport).length === 0 ? (
                  <div className="empty-report">
                    <p>Brak danych dla wybranego okresu</p>
                  </div>
                ) : (
                  <div className="summary-stats">
                    <div className="stat-card">
                      <div className="stat-value">{formatNumber(summaryReport.total_plans)}</div>
                      <div className="stat-label">📋 Planów</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{formatNumber(summaryReport.total_items)}</div>
                      <div className="stat-label">📦 Pozycji</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{formatNumber(summaryReport.total_clients)}</div>
                      <div className="stat-label">🏢 Klientów</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{formatNumber(summaryReport.total_products)}</div>
                      <div className="stat-label">📦 Produktów</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{formatNumber(summaryReport.total_quantity)}</div>
                      <div className="stat-label">📊 Łącznie</div>
                    </div>
                    {summaryReport.avg_per_plan && (
                      <div className="stat-card">
                        <div className="stat-value">{formatNumber(summaryReport.avg_per_plan)}</div>
                        <div className="stat-label">📋 Średnio/plan</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RAPORT HANDLOWCÓW */}
            {activeReport === 'salesmen' && userRole === 'admin' && (
              <div className="report-section">
                <h3>👥 Raport Handlowców</h3>
                <p>Efektywność zespołu sprzedażowego</p>
                
                {salesmenReport.length === 0 ? (
                  <div className="empty-report">
                    <p>Brak danych dla wybranego okresu</p>
                  </div>
                ) : (
                  <div className="report-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Handlowiec</th>
                          <th>Liczba klientów</th>
                          <th>Liczba pozycji</th>
                          <th>Łączna ilość</th>
                          <th>Liczba planów</th>
                          <th>Średnio na plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesmenReport.map((row, index) => (
                          <tr key={index}>
                            <td><strong>{row.salesman_name}</strong></td>
                            <td>{formatNumber(row.clients_count)}</td>
                            <td>{formatNumber(row.total_items)}</td>
                            <td>{formatNumber(row.total_quantity)}</td>
                            <td>{formatNumber(row.plans_count)}</td>
                            <td>{formatNumber(row.avg_per_plan)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsManager;