import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('leben_token');
    const savedUser = localStorage.getItem('leben_user');
    return (savedToken && savedUser) ? JSON.parse(savedUser) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('leben_token');
  });

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (json.status === 'success') {
        localStorage.setItem('leben_token', json.token);
        localStorage.setItem('leben_user', JSON.stringify(json.user));
        setUser(json.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: json.message || 'Falha na autenticação.' };
    } catch (err) {
      console.error('❌ Login error:', err);
      return { success: false, message: 'Não foi possível conectar ao servidor LEBEN. Verifique sua conexão.' };
    }
  };

  const register = async (name, email, password, diabetesType) => {
    // Reset estrito de dados antigos para inicializar perfil 100% LIMPO
    localStorage.removeItem('leben_bolus_history');
    localStorage.removeItem('leben_glucose_readings');

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, diabetesType })
      });
      const json = await res.json();
      if (json.status === 'success') {
        localStorage.setItem('leben_token', json.token);
        localStorage.setItem('leben_user', JSON.stringify(json.user));
        setUser(json.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: json.message || 'Falha no cadastro.' };
    } catch (err) {
      console.error('❌ Register error:', err);
      return { success: false, message: 'Não foi possível conectar ao servidor LEBEN para realizar o cadastro.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('leben_token');
    localStorage.removeItem('leben_user');
    localStorage.removeItem('leben_bolus_history');
    localStorage.removeItem('leben_glucose_readings');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
