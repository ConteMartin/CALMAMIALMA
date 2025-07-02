import { useState, useEffect, useContext, createContext } from 'react';
import apiService from '../services/api';

// Crear contexto de autenticación
const AuthContext = createContext();

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

// Proveedor de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si hay un usuario logueado al cargar la app
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          // Verificar que el token sigue siendo válido
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.log('No hay sesión activa:', error);
        // Limpiar datos inválidos
        apiService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Función de login con Google
  const loginWithGoogle = async (googleToken) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.loginWithGoogle(googleToken);
      setUser(response.user);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función de login con email/password
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.login(email, password);
      setUser(response.user);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función de logout
  const logout = () => {
    apiService.logout();
    setUser(null);
    setError(null);
  };

  // Función para actualizar usuario (por ejemplo, después de upgrade)
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Función para verificar si el usuario es premium
  const isPremium = () => {
    return user?.is_premium || false;
  };

  // Función para verificar si el usuario está logueado
  const isLoggedIn = () => {
    return !!user;
  };

  const value = {
    user,
    loading,
    error,
    loginWithGoogle,
    login,
    logout,
    updateUser,
    isPremium,
    isLoggedIn,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default useAuth;