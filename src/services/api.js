// API service para conectar con el backend
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
    this.token = localStorage.getItem('access_token');
  }

  // Método auxiliar para hacer peticiones
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Agregar token de autorización si existe
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Métodos de autenticación
  async loginWithGoogle(token) {
    const response = await this.request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    if (response.access_token) {
      this.token = response.access_token;
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  async login(email, password) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.request('/api/auth/login', {
      method: 'POST',
      headers: {}, // No content-type para FormData
      body: formData,
    });
    
    if (response.access_token) {
      this.token = response.access_token;
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  async getCurrentUser() {
    return await this.request('/api/auth/me');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  // Métodos de tarot
  async getDailyTarot() {
    return await this.request('/api/tarot/daily');
  }

  // Métodos de carta astral
  async createNatalChart(birthData) {
    return await this.request('/api/natal-chart', {
      method: 'POST',
      body: JSON.stringify(birthData),
    });
  }

  // Métodos de horóscopo
  async getDailyHoroscope(zodiacSign) {
    return await this.request('/api/horoscope/daily', {
      method: 'POST',
      body: JSON.stringify({ zodiac_sign: zodiacSign }),
    });
  }

  // Métodos de suscripción
  async createPaymentIntent() {
    return await this.request('/api/subscription/create-payment-intent', {
      method: 'POST',
    });
  }

  async upgradeToPremium() {
    return await this.request('/api/subscription/upgrade', {
      method: 'POST',
    });
  }

  // Método de salud del sistema
  async healthCheck() {
    return await this.request('/api/health');
  }
}

// Crear instancia global
const apiService = new ApiService();

export default apiService;