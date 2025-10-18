import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginComponent from './components/LoginComponent';
import PlanView from './components/PlanView';
import PlanSelector from './components/PlanSelector';
import ClientManager from './components/ClientManager';
import ProductManager from './components/ProductManager';
import UserManager from './components/UserManager';
import ReportsManager from './components/ReportsManager'; // NOWY IMPORT
import ToastNotification from './components/ToastNotification';

const API_URL = 'http://localhost:3001/api';

function AuthenticatedApp() {
  const { user, logout, isAdmin, token } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('plan');
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // WSZYSTKIE API calls muszą mieć Authorization header
  const fetchWithAuth = async (url, options = {}) => {
    console.log(`🔗 API Call: ${url}`, { token: token ? 'present' : 'missing' });
    
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    
    const authOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(fullUrl, authOptions);
      
      if (response.status === 401) {
        console.warn('🚫 Token expired or invalid - logging out');
        logout();
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Fetch error:', error);
      throw error;
    }
  };

  // ========== ŁADOWANIE DANYCH ==========
  
  const fetchPlans = async () => {
    try {
      console.log('📅 Fetching plans...');
      const response = await fetchWithAuth('/plans');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Plans loaded:', data.length);
        setPlans(data);
      } else {
        console.error('❌ Failed to fetch plans:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching plans:', error);
    }
  };

  const fetchClients = async () => {
    try {
      console.log('🏢 Fetching clients...');
      const response = await fetchWithAuth('/clients');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Clients loaded:', data.length);
        setClients(data);
      } else {
        console.error('❌ Failed to fetch clients:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('📦 Fetching products...');
      const response = await fetchWithAuth('/products');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Products loaded:', data.length);
        setProducts(data);
      } else {
        console.error('❌ Failed to fetch products:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    }
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    console.log('🔄 Loading all application data...');
    
    await Promise.all([
      fetchPlans(),
      fetchClients(), 
      fetchProducts()
    ]);
    
    console.log('✅ All data loaded successfully');
    setLoading(false);
  }, []);

  // ========== EFFECTS ==========
  
  useEffect(() => {
    if (user && token) {
      loadAllData();
    }
  }, [user, token, loadAllData]);

  // ========== TOAST SYSTEM ==========
  
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    const newToast = { id, message, type };
    console.log(`🍞 Toast: ${type.toUpperCase()} - ${message}`);
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // ========== PLAN MANAGEMENT ==========
  
  const createNewPlan = async (month, year) => {
    try {
      console.log(`📅 Creating plan: ${month}/${year}`);
      const response = await fetchWithAuth('/plans', {
        method: 'POST',
        body: JSON.stringify({ month: parseInt(month), year: parseInt(year) })
      });

      if (response.ok) {
        const newPlan = await response.json();
        console.log('✅ Plan created:', newPlan);
        
        const createdPlan = { id: newPlan.id, month: parseInt(month), year: parseInt(year) };
        setPlans(prev => [createdPlan, ...prev]);
        setCurrentPlan(createdPlan);
        
        showToast(`Plan na ${month}/${year} został utworzony`, 'success');
        return createdPlan;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Plan creation failed:', errorData);
        showToast(`Błąd: ${errorData.error || 'Nie można utworzyć planu'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error creating plan:', error);
      showToast('Błąd połączenia podczas tworzenia planu', 'error');
    }
  };

  // ========== LOGOUT ==========
  
  const handleLogout = async () => {
    console.log('🚪 Wylogowywanie...');
    await logout();
    setPlans([]);
    setClients([]);
    setProducts([]);
    setCurrentPlan(null);
  };

  // Definiuj dostępne zakładki na podstawie roli
  const tabs = [
  { id: 'plan', label: '📋 Plan zapotrzebowania', roles: ['admin', 'handlowiec', 'zakupy'] },
  { id: 'clients', label: '🏢 Klienci', roles: ['admin', 'handlowiec'] },
  { id: 'products', label: '📦 Produkty', roles: ['admin', 'handlowiec'] },
  { id: 'reports', label: '📊 Raporty', roles: ['admin', 'handlowiec', 'zakupy'] },
  { id: 'users', label: '👥 Użytkownicy', roles: ['admin'] }
  ].filter(tab => tab.roles.includes(user.role));

  // Pokaż loading jeśli dane się jeszcze ładują
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">Ładowanie danych aplikacji...</div>
          <div className="loading-details">
            Pobieranie planów ({plans.length}), klientów ({clients.length}) i produktów ({products.length})...
          </div>
          <div className="loading-debug">
            🔍 Sprawdź konsolę przeglądarki (F12) dla szczegółów
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* POPRAWIONY HEADER Z LEPSZYM STYLINGIEM */}
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="header-title">
              📋 Demand Planner
            </h1>
            <p className="header-subtitle">
              System planowania zapotrzebowania
            </p>
          </div>
          <div className="header-user-info">
            <div className="user-details">
              <div className="user-name">
                👤 {user.full_name}
              </div>
              <div className="user-role">
                🔑 {user.role}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="btn-logout"
              title="Wyloguj się"
            >
              🚪 Wyloguj
            </button>
          </div>
        </div>
      </header>

      {/* NAWIGACJA ZAKŁADEK */}
      <nav className="app-navigation">
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onMouseOver={(e) => {
                if (activeTab !== tab.id) {
                  e.target.classList.add('nav-tab-hover');
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab.id) {
                  e.target.classList.remove('nav-tab-hover');
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* GŁÓWNA ZAWARTOŚĆ - ZASTĄPIŁEM INLINE STYLE KLASĄ CSS! */}
      <main className="app-main">
        
        {/* PLAN ZAPOTRZEBOWANIA */}
        {activeTab === 'plan' && (
          <>
            {/* DEBUG INFO - pokaż tylko w development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="debug-info">
                🔍 DEBUG: Zalogowany jako {user.full_name} ({user.role}) | 
                Plan: {currentPlan ? `${currentPlan.month}/${currentPlan.year}` : 'BRAK'}
                {plans.length > 0 && (
                  <div>📋 Lista planów: {plans.map(p => `${p.month}/${p.year}`).join(', ')}</div>
                )}
              </div>
            )}
            
            <PlanSelector
              plans={plans}
              currentPlan={currentPlan}
              onSelectPlan={setCurrentPlan}
              onCreatePlan={createNewPlan}
            />
            {currentPlan && (
              <PlanView
                currentPlan={currentPlan}
                clients={clients}
                products={products}
                showToast={showToast}
                fetchWithAuth={fetchWithAuth}
              />
            )}
            {!currentPlan && plans.length === 0 && (
              <div className="empty-state-plans">
                <div className="empty-state-icon">📋</div>
                <h3>Brak planów zapotrzebowania</h3>
                <p>Utwórz pierwszy plan aby rozpocząć planowanie.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'clients' && (
          <ClientManager
            clients={clients}
            onClientsUpdate={fetchClients}
            showToast={showToast}
            fetchWithAuth={fetchWithAuth}
            userRole={user.role}
          />
        )}

        {activeTab === 'products' && (
          <ProductManager
            products={products}
            onProductsUpdate={fetchProducts}
            showToast={showToast}
            fetchWithAuth={fetchWithAuth}
            userRole={user.role}
          />
        )}

        {/* NOWA ZAKŁADKA RAPORTY */}
        {activeTab === 'reports' && (
          <ReportsManager
            showToast={showToast}
            fetchWithAuth={fetchWithAuth}
            userRole={user.role}
          />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManager
            showToast={showToast}
            fetchWithAuth={fetchWithAuth}
          />
        )}
      </main>

      {/* TOAST NOTIFICATIONS */}
      <div className="toast-container">
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">Sprawdzanie autoryzacji...</div>
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <LoginComponent />;
}

export default App;