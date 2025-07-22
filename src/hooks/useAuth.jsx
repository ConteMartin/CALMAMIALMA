// src/hooks/useAuth.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api'; // Asegúrate de que la ruta sea correcta

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar usuario al inicio de la aplicación si hay un token
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const storedToken = localStorage.getItem('access_token'); // Usa localStorage directamente
        if (storedToken) {
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (err) {
        console.error("Failed to load user from token:", err);
        localStorage.removeItem('access_token'); // Limpiar token inválido
        localStorage.removeItem('user'); // Limpiar info de usuario
        setUser(null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.login(email, password);
      // apiService.login ya guarda el token y el user en localStorage
      // Ahora, recupera el user de localStorage para asegurarte de que el estado esté sincronizado
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // Fallback si por alguna razón no se guardó en localStorage (aunque apiService.login debería hacerlo)
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (err) {
      setError(err.message);
      throw err; // Re-lanza el error para que el componente que llama lo maneje
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (googleToken) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.loginWithGoogle(googleToken);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.logout(); // Esto ya limpia localStorage
    setUser(null);
    setError(null);
  };

  const isLoggedIn = () => !!user;
  const isPremium = () => user?.is_premium || false;
  const isAdmin = () => user?.is_admin || false; // Asegúrate de que user.is_admin se esté leyendo

  // Función para actualizar el objeto de usuario si es necesario (ej. después de una actualización premium)
  const updateUser = (newUserData) => {
    setUser(prevUser => {
      const updatedUser = { ...prevUser, ...newUserData };
      localStorage.setItem('user', JSON.stringify(updatedUser)); // Actualiza también en localStorage
      return updatedUser;
    });
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    logout,
    isLoggedIn,
    isPremium,
    isAdmin,
    loading,
    error,
    updateUser, // Permite actualizar el estado del usuario desde otros componentes
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
