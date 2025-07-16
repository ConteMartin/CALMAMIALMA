// hooks/useAuth.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api'; // ¡Asegúrate de que esta ruta sea correcta y apunte al apiService real!

// 1. Crear el contexto de autenticación
const AuthContext = createContext(null);

// 2. Hook personalizado para usar la autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 3. Proveedor de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para cargar el usuario actual al inicio
  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // apiService ya carga el token desde localStorage en su constructor
      // y lo usa para la petición getCurrentUser
      const currentUser = await apiService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Error al obtener el usuario actual:', err);
      setError('No se pudo cargar la sesión. Por favor, inicia sesión de nuevo.');
      setUser(null);
      // Limpiar el token si la sesión no es válida
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // No lanzar el error aquí para no romper el renderizado inicial
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Funciones de autenticación
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.login(email, password);
      setUser(response.user);
      // apiService ya guarda el token y el usuario en localStorage
      return response.user; // Devuelve el usuario para que el componente pueda reaccionar
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      throw err; // Propagar el error para que el componente de login lo maneje
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (token) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.loginWithGoogle(token);
      setUser(response.user);
      // apiService ya guarda el token y el usuario en localStorage
      return response.user;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con Google.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.logout(); // Esto limpia el token y el usuario de localStorage y del servicio
    setUser(null);
  };

  const isLoggedIn = useCallback(() => {
    return !!user;
  }, [user]);

  const isPremium = useCallback(() => {
    // Asegúrate de que user exista y tenga la propiedad is_premium
    return user?.is_premium; 
  }, [user]);

  const isAdmin = useCallback(() => {
    // Asegúrate de que user exista y tenga la propiedad is_admin
    return user?.is_admin; 
  }, [user]);

  const value = {
    user,
    loading,
    error,
    login,
    loginWithGoogle,
    logout,
    isLoggedIn,
    isPremium,
    isAdmin,
    fetchCurrentUser // Para recargar el estado del usuario si es necesario (ej. después de una actualización premium)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
