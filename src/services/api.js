// apiService.js
// Configura la URL base de tu backend.
// ¡Asegúrate de que esta sea la URL de tu backend de Python!
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
    // Intentar cargar el token al inicializar el servicio
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
      
      // Si la respuesta no es OK (ej. 401 Unauthorized, 404 Not Found)
      if (!response.ok) {
        // Intentar parsear el cuerpo del error si es JSON
        const errorData = await response.json().catch(() => ({}));
        // Lanzar un error con el detalle del backend o un mensaje genérico
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Verificar el tipo de contenido para evitar errores al parsear JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      // Si no es JSON, devolver la respuesta directamente (ej. para 204 No Content)
      return response;
    } catch (error) {
      console.error('API Error:', error);
      // Relanzar el error para que el componente que llama pueda manejarlo
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
    // Para FastAPI con OAuth2PasswordRequestForm, el body debe ser FormData
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.request('/api/auth/login', {
      method: 'POST',
      headers: {
        // No Content-Type para FormData, el navegador lo establecerá automáticamente
        // con el boundary correcto
      }, 
      body: formData,
    });
    
    if (response.access_token) {
      this.token = response.access_token;
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  // Nuevo método para registrar un usuario
  async register(name, email, password) {
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    // El endpoint de registro de FastAPI ya devuelve el token y el user
    if (response.access_token) {
      this.token = response.access_token;
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  }

  async getCurrentUser() {
    // Si no hay token, no intentar obtener el usuario
    if (!this.token) {
        return null;
    }
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
  async getDailyHoroscope(birthDate) {
    return await this.request('/api/horoscope/daily', {
      method: 'POST',
      body: JSON.stringify({ birth_date: birthDate }),
    });
  }

  // Métodos de videos
  async getVideos() {
    return await this.request('/api/videos');
  }

  // Métodos de cursos
  async getCourses() {
    return await this.request('/api/courses');
  }

  // Obtener detalles de un curso específico
  async getCourseDetails(courseId) {
    return await this.request(`/api/courses/${courseId}/details`);
  }

  // Comprar un curso
  async purchaseCourse(courseId) {
    return await this.request('/api/courses/purchase', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    });
  }

  // Obtener cursos comprados
  async getPurchasedCourses() {
    return await this.request('/api/courses/purchased');
  }

  // Métodos de calendario
  async getCalendarRoutine() {
    return await this.request('/api/calendar/routine');
  }

  async updateCalendarRoutine(routineData) {
    return await this.request('/api/calendar/routine', {
      method: 'PUT',
      body: JSON.stringify({ weekly_routine: routineData }),
    });
  }

  async syncGoogleCalendar(accessToken) {
    return await this.request('/api/calendar/sync-google', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken, sync_enabled: true }),
    });
  }

  // Métodos de blog
  async getBlogPosts() {
    return await this.request('/api/blog/posts');
  }

  async getBlogPost(postId) {
    return await this.request(`/api/blog/posts/${postId}`);
  }

  async createBlogPost(postData) {
    return await this.request('/api/blog/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  // Métodos de suscripción
  async createPaymentIntent() {
    return await this.request('/api/subscription/create-payment-intent', {
      method: 'POST',
    });
  }

  async createSubscription(paymentMethodId) {
    return await this.request('/api/subscription/create-subscription', {
      method: 'POST',
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
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
