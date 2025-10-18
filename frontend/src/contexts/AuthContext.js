import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

// Kontekst autoryzacji
const AuthContext = createContext();

// Hook do używania kontekstu
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth musi być używany wewnątrz AuthProvider');
  }
  return context;
};

// Provider autoryzacji
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sprawdź czy użytkownik jest zalogowany przy starcie aplikacji
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(savedToken);
          } else {
            // Token nieważny - usuń z localStorage
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('Błąd weryfikacji tokenu:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Funkcja logowania
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Błąd logowania:', error);
      return { success: false, error: 'Błąd połączenia z serwerem' };
    }
  };

  // Funkcja wylogowania
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Błąd wylogowania:', error);
    }

    // Zawsze wyczyść dane lokalne
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  // Helper functions dla ról
  const isAdmin = user?.role === 'admin';
  const isHandlowiec = user?.role === 'handlowiec';
  const isZakupy = user?.role === 'zakupy';

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAdmin,
    isHandlowiec,
    isZakupy
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
