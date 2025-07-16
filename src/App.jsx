import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import apiService from './services/api';
import CourseModal from './components/CourseModal.jsx';
import CalendarSection from './components/CalendarSection.jsx';
import MyCourses from './components/MyCourses.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
// Importa el componente FloatingIconsBackground desde su nuevo archivo
import FloatingIconsBackground from './components/FloatingIcons.jsx'; 
// Importa el NUEVO componente ProfileCard (aunque ya no se usa para el tarot)
import ProfileCard from './components/ProfileCard.jsx'; 
// Importa el nuevo CSS para el display de las cartas de tarot
import './components/TarotCardDisplay.css';


// Componente principal de la aplicación que ahora usa autenticación real
const AppContent = () => {
  const { user, loginWithGoogle, login, logout, isLoggedIn, isPremium, isAdmin, loading, error } = useAuth();

  // Estados para la visibilidad de los modales
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isLoadingHoroscope, setIsLoadingHoroscope] = useState(false);
  const [clickedTarotCardId, setClickedTarotCardId] = useState(null); // Ahora controla el volteo en la misma pantalla
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [selectedVideoCategory, setSelectedVideoCategory] = useState('COMUNIDAD');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Nuevo estado para el menú móvil
  // Renombrado a 'animationStarted' para controlar la animación inicial de las cartas
  const [animationStarted, setAnimationStarted] = useState(false); 

  // Estados para datos del backend
  const [tarotReading, setTarotReading] = useState(null); // Mantener para futura lógica si se necesita la API de tarot
  const [horoscope, setHoroscope] = useState(null);
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [apiError, setApiError] = useState(null);

  // Referencias para las secciones donde los iconos deben ser visibles
  const tarotSectionRef = useRef(null);
  const contactSectionRef = useRef(null);

  // Constantes para la limitación de tiradas de tarot para usuarios gratuitos
  // COMENTADO TEMPORALMENTE PARA PRUEBAS:
  // const TAROT_COOLDOWN_DAYS = 3;
  // const LAST_TAROT_READ_KEY = 'lastTarotReadDate';

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Función para alternar el menú móvil
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Cargar datos al montar el componente, independientemente del estado de login
  // Esto asegura que los videos de COMUNIDAD y los cursos se carguen para todos.
  useEffect(() => {
    console.log('App mounted: Loading videos and courses...');
    loadVideos();
    loadCourses();
    loadBlogPosts();
  }, []); // Se ejecuta una vez al montar el componente

  // Efecto para activar la animación de las cartas del tarot al cargar/refrescar la página
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationStarted(true);
    }, 100); // Pequeño retraso para asegurar que el DOM esté listo antes de la transición
    return () => clearTimeout(timer);
  }, []); // Se ejecuta solo una vez al montar el componente

  // Función para cargar videos
  const loadVideos = async () => {
    try {
      const videosData = await apiService.getVideos();
      setVideos(videosData);
      console.log('Videos loaded:', videosData);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  // Función para cargar cursos
  const loadCourses = async () => {
    try {
      const coursesData = await apiService.getCourses();
      setCourses(coursesData);
      console.log('Courses loaded:', coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  // Función para cargar posts del blog
  const loadBlogPosts = async () => {
    try {
      const postsData = await apiService.getBlogPosts();
      setBlogPosts(postsData);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    }
  };

  // Función para abrir un modal
  const openModal = (setter) => {
    setter(true);
    document.body.style.overflow = 'hidden';
  };

  // Función para cerrar un modal
  const closeModal = (setter) => {
    setter(false);
    document.body.style.overflow = 'auto';
    setApiError(null);
  };

  // Manejador de login con Google
  const handleGoogleLogin = async () => {
    try {
      // En un entorno real, aquí inicializarías Google OAuth
      // Por ahora simularemos el login
      alert('Funcionalidad de Google OAuth en desarrollo. Configurar GOOGLE_CLIENT_ID en el backend.');
    } catch (error) {
      setApiError('Error al iniciar sesión con Google: ' + error.message);
    }
  };

  // Manejador de login con email/password
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');
      
      await login(email, password);
      closeModal(setIsLoginModalOpen);
    } catch (error) {
      setApiError('Error al iniciar sesión: ' + error.message);
    }
  };

  // Manejador de registro de usuario
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const name = formData.get('name');
      const email = formData.get('email');
      const password = formData.get('password');

      await apiService.register(name, email, password); // Llamada al nuevo método register en apiService
      await login(email, password); // Iniciar sesión automáticamente después del registro
      closeModal(setIsRegisterModalOpen);
      alert('¡Registro exitoso! Has iniciado sesión.');
    } catch (error) {
      setApiError('Error al registrar usuario: ' + error.message);
    }
  };

  // Manejador de actualización a premium
  const handleUpgrade = async () => {
    try {
      await apiService.upgradeToPremium();
      // Actualizar el usuario en el contexto
      const updatedUser = await apiService.getCurrentUser();
      // Asegúrate de que useAuth.updateUser exista o maneja la actualización del estado del usuario
      // Si no existe, puedes recargar la página o volver a llamar a getCurrentUser en el contexto.
      // Por ahora, asumimos que el contexto de autenticación se actualiza automáticamente o que `useAuth` tiene `updateUser`.
      // Si no, puedes pasar `setUser` desde `useAuth` y llamarlo directamente: `setUser(updatedUser);`
      closeModal(setIsUpgradeModalOpen);
      alert('¡Felicitaciones! Ahora eres usuario Premium');
    } catch (error) {
      setApiError('Error al actualizar suscripción: ' + error.message);
    }
  };

  // Manejador del clic en las cartas del tarot (AHORA VOLTEA EN LUGAR)
  const handleTarotCardClick = async (cardData) => {
    if (!isLoggedIn()) {
      openModal(setIsLoginModalOpen);
      return;
    }

    // COMENTADO TEMPORALMENTE PARA PRUEBAS:
    // if (!isPremium()) {
    //     const lastReadDateStr = localStorage.getItem(LAST_TAROT_READ_KEY);
    //     let canRead = true;
    //     let nextReadDate = null;

    //     if (lastReadDateStr) {
    //         const lastReadDate = new Date(lastReadDateStr);
    //         const now = new Date();
    //         const diffTime = Math.abs(now.getTime() - lastReadDate.getTime()); // Usar getTime() para comparar milisegundos
    //         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Usar floor para días completos

    //         if (diffDays < TAROT_COOLDOWN_DAYS) {
    //             canRead = false;
    //             nextReadDate = new Date(lastReadDate);
    //             nextReadDate.setDate(lastReadDate.getDate() + TAROT_COOLDOWN_DAYS);
    //         }
    //     }

    //     if (!canRead) {
    //         alert(`Como usuario gratuito, puedes obtener una lectura de tarot cada ${TAROT_COOLDOWN_DAYS} días. Tu próxima lectura estará disponible el ${nextReadDate.toLocaleDateString('es-ES')}.`);
    //         return; // Previene el volteo de la carta
    //     }
    // }

    // Si la misma carta ya está volteada, la voltea de nuevo (oculta el contenido)
    if (clickedTarotCardId === cardData.id) {
      setClickedTarotCardId(null);
    } else {
      // Voltea la nueva carta
      setClickedTarotCardId(cardData.id);
      // Solo actualiza la fecha de la última lectura si es una nueva tirada para un usuario no premium
      // COMENTADO TEMPORALMENTE PARA PRUEBAS:
      // if (!isPremium()) {
      //     localStorage.setItem(LAST_TAROT_READ_KEY, new Date().toISOString());
      // }
    }
    console.log('Tarot card clicked. Flipped ID:', cardData.id);
  };

  // Manejador del formulario de horóscopo
  const handleHoroscopeSubmit = async (e) => {
    e.preventDefault();
    if (!isPremium()) {
      openModal(setIsUpgradeModalOpen);
      return;
    }

    try {
      setIsLoadingHoroscope(true);
      
      const formData = new FormData(e.target);
      const birthDate = formData.get('birth_date');
      
      const horoscopeData = await apiService.getDailyHoroscope(birthDate);
      setHoroscope(horoscopeData);
    } catch (error) {
      setApiError('Error al obtener horóscopo: ' + error.message);
    } finally {
      setIsLoadingHoroscope(false);
    }
  };

  // Manejador de clic en videos
  const handleVideoClick = (video) => {
    // Permite ver videos de la categoría 'COMUNIDAD' sin necesidad de iniciar sesión
    if (video.category === 'COMUNIDAD') {
      if (video.youtube_url) {
        window.open(video.youtube_url, '_blank');
      } else {
        // En caso de que no haya URL de YouTube, pero sea de comunidad, se puede mostrar un mensaje o un fallback
        alert('Este video de comunidad no tiene una URL de YouTube disponible.');
      }
      return; // Sale de la función después de manejar el video de comunidad
    }

    // Para videos que no son de comunidad, se aplican las reglas de premium/login
    if (!isLoggedIn()) {
      openModal(setIsLoginModalOpen);
      return;
    }
    
    if (video.is_premium && !isPremium()) {
      openModal(setIsUpgradeModalOpen);
      return;
    }
    
    if (video.youtube_url) {
      window.open(video.youtube_url, '_blank');
    } else {
      openModal(setIsUpgradeModalOpen); // O un mensaje diferente si no es premium pero no tiene URL
    }
  };

  // Manejador de clic en "Ver Más" de los cursos
  const handleCourseDetails = (course) => {
    setSelectedCourse(course);
    openModal(setIsCourseModalOpen);
  };

  // Manejador de compra de curso exitosa
  const handleCoursePurchased = () => {
    // Recargar cursos para actualizar el estado
    loadCourses();
    closeModal(setIsCourseModalOpen);
  };

  // Manejador de cambio de vista
  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  // Manejador del formulario de contacto
  const handleContactSubmit = (e) => {
    e.preventDefault();
    alert('¡Gracias por tu mensaje! En la versión completa tu mensaje sería enviado a nuestro equipo.');
    e.target.reset();
  };

  // Manejador para el clic en los posts del blog
  const handleBlogPostClick = (post) => {
    if (!isLoggedIn()) {
      openModal(setIsLoginModalOpen); // Pide iniciar sesión para leer más
      return;
    }
    // Asumiendo que todos los posts son premium si no se especifica
    if (!isPremium()) { 
      openModal(setIsUpgradeModalOpen); // Pide actualizar a premium para leer más
      return;
    }
    // Si está logueado y es premium, o si el post no es premium (y está logueado)
    alert(`Ver detalles del artículo con ID: ${post.id} (funcionalidad pendiente. Contenido: ${post.content})`);
    // En una aplicación real, esto navegaría a una página de detalles del blog o mostraría el contenido completo en un modal
  };


  // Placeholder for blog post creation (for premium users)
  const handleBlogPostCreate = async (e) => {
    e.preventDefault();
    alert('Funcionalidad de creación de artículos de blog en desarrollo.');
    e.target.reset();
  };

  // Calcula las propiedades de estilo para el efecto de abanico de las cartas del tarot
  const calculateTarotCardStyle = (index, totalCards, isHovered) => {
    const cardWidth = 120; // Increased from 90
    const cardHeight = 200; // Increased from 150
    const isMobile = windowWidth < 768; // Define el punto de corte para móvil

    let currentScale = 1;
    let currentTranslateY = 0;

    // Estado inicial: cartas apiladas y ocultas (antes de que la animación comience)
    if (!animationStarted) {
      return {
        left: '-200px', // Start completely off-screen left
        top: '50%',
        zIndex: index,
        transform: `translateY(-50%) rotate(0deg)`,
        opacity: 0,
        transition: 'none',
        transformOrigin: 'center center'
      };
    }

    // Determine the effective container width for centering calculations.
    // This should be the width of the parent div that contains the cards.
    // The parent div is now explicitly 80vw.
    const containerEffectiveWidth = 0.80 * windowWidth; // Changed to 80% of window width
    
    // Calculate fanned layout properties based on mobile or desktop
    let visibleCards = totalCards;
    let overlapFactor = 0.6; // Desktop overlap
    let angleFactor = 40 / totalCards; // Desktop angle factor
    let verticalCurveFactor = 0.00005; // Desktop curve

    if (isMobile) {
      visibleCards = Math.min(totalCards, 7);
      overlapFactor = 0.8; // Mobile overlap
      angleFactor = 2; // Mobile angle factor (from previous code)
      verticalCurveFactor = 0; // No vertical curve for mobile for simplicity
      if (index >= visibleCards) {
        return { display: 'none', opacity: 0 };
      }
    }

    const effectiveCardWidth = cardWidth * (1 - overlapFactor);
    const totalFannedWidth = (visibleCards - 1) * effectiveCardWidth + cardWidth;

    // Calculate the starting X position to center the fanned group within the containerEffectiveWidth
    const startX = (containerEffectiveWidth / 2) - (totalFannedWidth / 2);
    
    // Calculate the current X position for the card relative to the container's left edge
    const currentX = startX + index * effectiveCardWidth;

    const currentRotation = (index - (visibleCards - 1) / 2) * angleFactor;
    const currentYOffset = Math.abs(index - (visibleCards - 1) / 2) * (isMobile ? 5 : verticalCurveFactor * cardHeight);

    if (isHovered) {
      currentTranslateY = -5;
      currentScale = 1.10;
    }

    return {
      left: `${currentX}px`,
      top: `calc(50% - ${cardHeight / 2}px + ${currentYOffset}px + ${isMobile ? 30 : 0}px)`, // Added 30px for mobile to push down slightly
      zIndex: index,
      transform: `rotate(${currentRotation}deg) translateY(${currentTranslateY}px) scale(${currentScale})`,
      transformOrigin: isMobile ? 'center bottom' : 'center center',
      opacity: 1,
      transition: 'transform 2s ease-out, left 2s ease-out, top 2s ease-out, opacity 0.5s ease-out, box-shadow 0.3s ease-out'
    };
  };

  // Datos de ejemplo para las cartas del tarot (40 cartas genéricas)
  const tarotCardsData = Array.from({ length: 40 }, (_, i) => {
    const isSpecialCard = i === 0; // Card with ID 1 will be the special one (index 0)
    return {
      id: i + 1,
      // Contenido específico para la primera carta
      title: isSpecialCard ? "ERES SUFICIENTE, TAL COMO ERES" : `Carta ${i + 1}`,
      mainText: isSpecialCard
        ? "carta te invita a recordarte una verdad esencial: no necesitas demostrar nada. Tu valor no depende de tus logros, tu apariencia o de la aprobación externa. Eres suficiente desde el primer latido de tu corazón. Mírate con ternura, con esa mirada compasiva que tanto ofreces a los demás. Abre espacio para aceptar tus imperfecciones, porque incluso ellas forman parte de tu magia."
        : `El significado de la Carta ${i + 1} es un mensaje de introspección y nuevos comienzos. Reflexiona sobre tus pasos y prepárate para un cambio positivo.`,
      practiceText: isSpecialCard
        ? "✨ Práctica sugerida: Párate frente al espejo, mírate a los ojos y repite tres veces: “Soy suficiente. Me amo tal como soy. Hoy me honro.” Respira hondo y permite que ese mensaje llegue a tu corazón."
        : null, // Solo la carta especial tiene texto de práctica
      imageUrlFront: '/carta-tarot-dorso-3.png', // Ruta para la imagen del dorso actualizada
      imageUrlBack: isSpecialCard ? '/tarot1.png' : `https://placehold.co/120x200/c2bae5/171717?text=ILUSTRACION+CARTA+${i + 1}` // Imagen específica para la primera carta
    };
  });

  // Definición de una ruta de onda pronunciada para el final de cada sección
  // Esta onda crea un efecto de "valle" en la parte superior de su contenedor SVG.
  // M0,0: Empieza en la esquina superior izquierda
  // C 25,24 75,24 100,0: Curva que baja y vuelve a subir, creando la forma de la onda
  // V96 H0 Z: Cierra la forma rellenando hacia abajo hasta la esquina inferior izquierda
  const wavePath = "M0,0 C 25,24 75,24 100,0 V96 H0 Z";

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center"> {/* Fondo principal blanco */}
        <div className="loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white"> {/* Fondo principal blanco */}
      {/* Header / Navigation */}
      <header 
        className={`fixed top-6 inset-x-0 mx-auto bg-opacity-10 z-50 py-4 px-6 flex items-center justify-between rounded-full shadow-lg md:px-8
          ${isPremium() ? 'w-full max-w-full' : 'w-11/12 max-w-7xl'}
        `}
        style={{ backdropFilter: 'blur(20px)' }} // Estilo para el efecto de vidrio translúcido
      >
        {/* Left Group: Hamburger (mobile) / Left Nav (desktop) */}
        <div className="flex items-center flex-grow-0 md:flex-grow md:justify-center"> {/* flex-grow para permitir expansión, justify-center para centrar contenido */}
          <div className="md:hidden"> {/* Menú de hamburguesa para móvil */}
            <button onClick={toggleMobileMenu} className="text-texto-principal-dark text-2xl focus:outline-none"> {/* Color del icono de hamburguesa */}
              <i className={isMobileMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
            </button>
          </div>
          {/* Menú Izquierdo de Escritorio */}
          <nav className="hidden md:flex">
            <ul className="flex space-x-4 font-montserrat text-texto-principal-dark"> {/* Espacio reducido entre elementos */}
              <li><a href="#tarot" onClick={() => handleViewChange('home')} className="hover:text-white transition">Oráculo</a></li>
              <li><a href="#services" onClick={() => handleViewChange('home')} className="hover:text-white transition">Servicios</a></li>
              {!isPremium() && <li><a href="#membership" onClick={() => handleViewChange('home')} className="hover:text-white transition">Membresía</a></li>}
              {isPremium() && (
                <>
                  <li><a href="#horoscope" onClick={() => handleViewChange('home')} className="hover:text-white transition">Horóscopo</a></li>
                  <li><a href="#videos" onClick={() => handleViewChange('home')} className="hover:text-white transition">Videos</a></li> {/* Movido aquí */}
                </>
              )}
            </ul>
          </nav>
        </div>

        {/* Título Centrado */}
        <a href="#hero" onClick={() => { handleViewChange('home'); setIsMobileMenuOpen(false); }} className="text-2xl font-bodoni-moda font-semibold text-texto-principal-dark mx-4 flex-shrink-0">Calma Mi Alma</a> {/* Color del título */}

        {/* Grupo Derecho: Menú Derecho (escritorio) + Botón Login/Logout */}
        <div className="flex items-center flex-grow-0 md:flex-grow md:justify-center"> {/* flex-grow para permitir expansión, justify-center para centrar contenido */}
          {/* Menú Derecho de Escritorio */}
          <nav className="hidden md:flex">
            <ul className="flex space-x-4 font-montserrat text-texto-principal-dark"> {/* Espacio reducido entre elementos */}
              {isPremium() && (
                <>
                  <li><a href="#courses" onClick={() => handleViewChange('home')} className="hover:text-white transition">Cursos</a></li>
                  <li><a href="#" onClick={() => handleViewChange('calendar')} className="hover:text-white transition">Mi Calendario</a></li>
                  <li><a href="#" onClick={() => handleViewChange('my-courses')} className="hover:text-white transition">Mis Cursos</a></li>
                  {isAdmin() && (
                    <li><a href="#" onClick={() => handleViewChange('admin')} className="hover:text-white transition">Admin</a></li>
                  )}
                </>
              )}
              <li><a href="#contact" onClick={() => handleViewChange('home')} className="hover:text-white transition">Contacto</a></li>
            </ul>
          </nav>
          {/* Botón Login/Logout siempre visible */}
          {isLoggedIn() ? (
            <div className="flex items-center space-x-4 ml-6 flex-shrink-0">
              <span className="text-acento-claro hidden md:inline">Hola, {user?.name}</span> {/* Ocultar nombre en pantallas muy pequeñas */}
              {isPremium() && <span className="bg-acento-claro text-texto-principal-dark px-2 py-1 rounded text-xs hidden md:inline">Premium</span>} {/* Ocultar insignia premium en pantallas muy pequeñas */}
              <button
                onClick={logout}
                className="btn-general px-4 py-2 font-montserrat"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button
              onClick={() => openModal(setIsLoginModalOpen)}
              className="btn-general px-4 py-2 font-montserrat ml-6"
            >
              Iniciar Sesión
            </button>
          )}
        </div>

        {/* Superposición del Menú Móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed top-20 left-0 w-full h-auto bg-fondo-oscuro bg-opacity-90 z-40 flex flex-col items-start px-6 py-4 space-y-4 transition-all duration-300 ease-in-out"> {/* Ajustado para desplegar hacia abajo y alinear a la izquierda */}
            <a href="#hero" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Inicio</a>
            <a href="#tarot" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Oráculo</a>
            <a href="#services" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Servicios</a>
            {!isPremium() && <a href="#membership" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Membresía</a>}
            {isPremium() && (
              <>
                <a href="#horoscope" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Horóscopo</a>
                <a href="#videos" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Videos</a>
                <a href="#courses" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Cursos</a>
                <a href="#" onClick={() => { handleViewChange('calendar'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Mi Calendario</a>
                <a href="#" onClick={() => { handleViewChange('my-courses'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Mis Cursos</a>
                {isAdmin() && (
                  <a href="#" onClick={() => { handleViewChange('admin'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Admin</a>
                )}
              </>
            )}
            <a href="#contact" onClick={() => { handleViewChange('home'); toggleMobileMenu(); }} className="text-texto-claro-white hover:text-white transition">Contacto</a>
            {isLoggedIn() ? (
              <button
                onClick={() => { logout(); toggleMobileMenu(); }}
                className="btn-general px-4 py-2 font-montserrat"
              >
                Cerrar Sesión
              </button>
            ) : (
              <button
                onClick={() => { openModal(setIsLoginModalOpen); toggleMobileMenu(); }}
                className="btn-general px-4 py-2 font-montserrat"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        )}
      </header>

      {/* Mostrar errores de API si existen */}
      {apiError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg z-50">
          {apiError}
          <button onClick={() => setApiError(null)} className="ml-4">×</button>
        </div>
      )}

      {/* Renderizado condicional del contenido principal */}
      {currentView === 'home' && (
        <> {/* Fragment para agrupar las secciones de la vista 'home' */}
          {/* Hero Section */}
          <section id="hero" className="min-h-screen bg-white flex flex-col justify-center items-center relative overflow-hidden">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-75"
              src="/sahumo.mp4"
            ></video>
            {/* White bar at the bottom of the video */}
            <div className="absolute bottom-0 left-0 w-full h-24 bg-white z-10"></div> {/* Changed bg-lino to bg-white */}
            <div className="relative z-20 max-w-3xl mx-auto py-12 px-4 text-center"> {/* Increased z-index to ensure content is above the white bar */}
              <h1 className="text-5xl md:text-6xl font-bodoni-moda font-light text-texto-claro-white mb-6 animate-fade-in-up"> {/* Changed text color to white */}
                Encuentra Tu Paz Interior
              </h1>
              <p className="text-xl text-texto-claro-white mb-10 font-montserrat animate-fade-in-up delay-150"> {/* Changed text color to white */}
                Emprende un viaje de autodescubrimiento y bienestar a través de la sabiduría ancestral y prácticas modernas.
              </p>
              <a
                href="#tarot"
                className="btn-general px-8 py-3 text-lg font-montserrat animate-fade-in-up delay-300"
              >
                Comienza Tu Viaje
              </a>
            </div>
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce z-20"> {/* Increased z-index */}
              <i className="fas fa-chevron-down text-texto-principal-dark text-2xl"></i>
            </div>
          </section>

          {/* Tarot Section */}
          <section 
            id="tarot" 
            ref={tarotSectionRef} 
            className="relative bg-white overflow-x-hidden" /* Changed bg-[#f8f7f4] to bg-white, added overflow-x-hidden */
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <FloatingIconsBackground numberOfIcons={30} iconFilterStyle="brightness(0.9)" />
            <div className="w-full mx-auto relative z-20 py-32 px-4">
              <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Oráculo Diario</h2>
              <div className="relative h-[400px] flex justify-center items-center w-[80vw] mx-auto"> {/* Changed h-[275px] to h-[400px] */}
                {tarotCardsData.map((card, index) => {
                  const cardStyle = calculateTarotCardStyle(index, tarotCardsData.length, hoveredCardId === card.id);
                  
                  return (
                    <div
                      key={card.id}
                      className={`tarot-card absolute group bg-heavy-metal rounded-xl shadow-lg 
                                  ${clickedTarotCardId === card.id ? 'flipped' : ''}`} // Added 'flipped' class
                      style={{
                        width: '120px', // Ancho fijo
                        height: '200px', // Alto fijo
                        transformStyle: 'preserve-3d', // Importante para el volteo 3D
                        // La transición se aplica aquí para que la animación de "estiramiento" sea suave
                        transition: animationStarted ? 'transform 2s ease-out, left 2s ease-out, top 2s ease-out, opacity 0.5s ease-out, box-shadow 0.3s ease-out' : 'none',
                        perspective: "1000px", // Asegura la perspectiva para el volteo
                        left: cardStyle.left, // Aplica las propiedades individuales de posición
                        top: cardStyle.top,
                        zIndex: clickedTarotCardId === card.id ? 101 : index, // La carta volteada siempre arriba
                        transform: `rotateY(${clickedTarotCardId === card.id ? 180 : 0}deg) ${cardStyle.transform}`, // Aplica la rotación de volteo
                        transformOrigin: cardStyle.transformOrigin, // Mantiene el origen de la transformación
                        opacity: cardStyle.opacity // Controla la opacidad para el efecto de aparición
                      }}
                      onMouseEnter={() => setHoveredCardId(card.id)} // Manejador de entrada del ratón
                      onMouseLeave={() => setHoveredCardId(null)}   // Manejador de salida del ratón
                      onClick={() => handleTarotCardClick(card)} // Simplified click handler
                    >
                      {/* Front Face (dorso de la carta) */}
                      <div
                        className="absolute w-full h-full rounded-xl backface-hidden overflow-hidden front"
                        style={{ zIndex: clickedTarotCardId === card.id ? 1 : 2 }} // Asegura que el frente esté encima del dorso cuando no está volteado
                      >
                        <img
                          src={card.imageUrlFront}
                          alt="Tarot Card Back Design"
                          className="w-full h-full object-cover rounded-xl" // Added rounded-xl here
                          onError={(e) => {
                            e.target.onerror = null; // Evita bucles infinitos si la imagen de fallback también falla
                            e.target.src = 'https://placehold.co/120x200/CCCCCC/333333?text=Error+Carga+Dorso'; // Imagen de fallback
                            console.error(`Error al cargar la imagen del dorso para la carta ${card.id}: ${card.imageUrlFront}`);
                          }}
                        />
                      </div>

                      {/* Back Face (ilustración de la carta y contenido) */}
                      <div
                        className="absolute w-full h-full rounded-xl backface-hidden overflow-hidden back"
                        style={{
                            transform: 'rotateY(180deg)', // Rotación inicial para la cara trasera
                            backgroundColor: '#1A1A1A', // Fondo oscuro para la cara trasera
                            color: '#FFFFFF', // Texto blanco para contraste
                            padding: '15px', // Añadir padding
                            boxSizing: 'border-box',
                            zIndex: clickedTarotCardId === card.id ? 2 : 1
                        }}
                      >
                        {/* El contenido de la cara trasera solo se renderiza si la carta está volteada */}
                        {clickedTarotCardId === card.id && ( 
                          <div className="tarot-card-back-content">
                            <h3 className="tarot-back-title">{card.title}</h3>
                            {card.imageUrlBack && (
                              <img
                                src={card.imageUrlBack}
                                alt={card.title}
                                className="tarot-back-image"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  console.error(`Error loading back image for card ${card.id}: ${card.imageUrlBack}`);
                                }}
                              />
                            )}
                            <div className="tarot-back-main-text custom-scrollbar">
                              {card.mainText}
                            </div>
                            {card.practiceText && (
                              <div className="tarot-back-practice-text">
                                {card.practiceText}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Onda al final de la sección Tarot */}
            <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 96" preserveAspectRatio="none">
                {/* La onda del Tarot ahora rellena con el color de la sección de Videos (blanco) */}
                <path d={wavePath} fill="white"></path> 
              </svg>
            </div>
          </section>

          {/* Videos Section */}
          <section id="videos" className="bg-white overflow-hidden"> {/* Changed bg-main-white to bg-white */}
            <div className="max-w-6xl mx-auto py-12 px-4">
              <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Biblioteca de Videos</h2>
              
              {/* Category Tabs */}
              <div className="flex justify-center mb-8">
                <div className="flex space-x-2 bg-fondo-claro p-2 rounded-lg">
                  {['COMUNIDAD', 'MEDITACION', 'YOGA'].map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedVideoCategory(category)}
                      className={`px-6 py-3 rounded-lg font-montserrat transition ${
                        selectedVideoCategory === category
                          ? 'bg-fondo-oscuro text-texto-claro-white'
                          : 'text-texto-principal-dark hover:bg-acento-claro'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {videos
                  .filter(video => video.category === selectedVideoCategory)
                  .map(video => (
                    <div key={video.id} className="bg-fondo-claro rounded-2xl overflow-hidden shadow-lg text-texto-principal-dark">
                      <div className="relative">
                        <img 
                          src={video.thumbnail_url || 'https://placehold.co/400x225/e0e0e0/333333?text=Video'} 
                          alt={video.title} 
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          {/* Always show play button for COMMUNITY videos, otherwise check login/premium */}
                          {(video.category === 'COMUNIDAD' || isLoggedIn()) ? (
                            <div 
                              className="w-16 h-16 bg-gris-palido-btn rounded-full flex items-center justify-center cursor-pointer hover:bg-acento-claro transition"
                              onClick={() => handleVideoClick(video)}
                            >
                              <i className="fas fa-play text-texto-principal-dark text-xl"></i>
                            </div>
                          ) : (
                            <div 
                              className="w-16 h-16 bg-gris-palido-btn rounded-full flex items-center justify-center cursor-pointer hover:bg-acento-claro transition"
                              onClick={() => handleVideoClick(video)} // This will trigger login/upgrade modal
                            >
                              <i className="fas fa-lock text-texto-principal-dark text-xl"></i> {/* Lock icon for restricted videos */}
                            </div>
                          )}
                        </div>
                        {video.is_premium && (
                          <div className="absolute top-3 right-3 bg-acento-claro text-texto-principal-dark text-xs px-2 py-1 rounded-full font-montserrat">
                            Premium
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mb-2">{video.title}</h3>
                        <p className="font-montserrat text-texto-secundario-dark mb-3">{video.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-texto-secundario-dark font-montserrat">
                            {video.duration}
                          </span>
                          <span className="text-sm text-acento-claro font-montserrat">
                            {video.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Premium Prompt for Free Users */}
              {!isPremium() && (selectedVideoCategory === 'MEDITACION' || selectedVideoCategory === 'YOGA') && (
                <div className="mt-12 p-8 bg-fondo-oscuro text-texto-claro-white rounded-2xl text-center">
                  <h3 className="text-2xl font-bodoni-moda font-medium mb-4">
                    Contenido Premium
                  </h3>
                  <p className="font-montserrat mb-6">
                    Los videos de {selectedVideoCategory} están disponibles solo para miembros Premium.
                  </p>
                  <button
                    onClick={() => openModal(setIsUpgradeModalOpen)}
                    className="btn-general px-8 py-3 font-montserrat"
                  >
                    Actualizar a Premium
                  </button>
                </div>
              )}
            </div>
            {/* Onda al final de la sección Videos */}
            <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 96" preserveAspectRatio="none">
                {/* La onda de Videos ahora rellena con el color de la sección Cursos */}
                <path d={wavePath} fill="white"></path> 
              </svg>
            </div>
          </section>

          {/* Courses Section */}
          <section id="courses" className="bg-white overflow-hidden"> {/* Changed bg-[#f8f7f4] to bg-white */}
            <div className="max-w-6xl mx-auto py-12 px-4">
              <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Cursos Especializados</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {courses.map(course => (
                  <div key={course.id} className="bg-fondo-claro p-6 rounded-2xl shadow-lg text-texto-principal-dark relative"> {/* Removed bg-gradient-main-sections, used bg-fondo-claro */}
                    {isPremium() && course.discounted_price && ( // Solo muestra el badge si es premium y hay descuento
                      <div className="absolute top-3 right-3 bg-detail-accent text-texto-principal-dark text-xs px-2 py-1 rounded-full font-montserrat"> {/* Changed bg-acento-secundario to bg-detail-accent */}
                        30% OFF
                      </div>
                    )}
                    <div className="text-center mb-6">
                      <img 
                        src={course.image_url || 'https://placehold.co/200x150/e0e0e0/333333?text=Curso'} 
                        alt={course.title} 
                        className="w-full h-32 object-cover rounded-lg mx-auto mb-4"
                      />
                      <h3 className="text-xl font-bodoni-moda font-medium">{course.title}</h3>
                      <p className="text-sm text-texto-secundario-dark font-montserrat mt-1">{course.level}</p>
                    </div>
                    <p className="font-montserrat mb-4 text-texto-secundario-dark text-sm">{course.description}</p>
                    <div className="mb-4">
                      <p className="text-sm text-texto-secundario-dark font-montserrat">
                        Duración: {course.duration}
                      </p>
                    </div>
                    <div className="mb-4">
                      {isPremium() && course.discounted_price ? ( // Muestra precio con descuento si es premium
                        <div className="text-center">
                          <span className="text-lg text-acento-claro font-raleway font-semibold">
                            ${course.discounted_price.toFixed(0)}
                          </span>
                          <span className="text-sm text-texto-secundario-dark line-through ml-2">
                            ${course.price.toFixed(0)}
                          </span>
                          <p className="text-xs text-texto-secundario-dark">Precio Premium</p>
                        </div>
                      ) : ( // Muestra precio general para no premium o si no hay descuento
                        <p className="text-lg text-acento-claro font-raleway font-semibold text-center">
                          ${course.price.toFixed(0)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCourseDetails(course)}
                      className="btn-general w-full py-2 font-montserrat"
                    >
                      Ver Más
                    </button>
                  </div>
                ))}
              </div>
              
              {!isPremium() && (
                <div className="mt-12 p-6 bg-white text-texto-principal-dark rounded-lg text-center font-montserrat"> {/* Changed bg-main-white to bg-white */}
                  <p className="mb-4 text-lg">¿Quieres un 30% de descuento en todos los cursos?</p>
                  <button
                    onClick={() => openModal(setIsUpgradeModalOpen)}
                    className="btn-general px-6 py-3 text-md font-montserrat"
                  >
                    Suscríbete a Premium
                  </button>
                </div>
              )}
            </div>
            {/* Onda al final de la sección Cursos */}
            <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 96" preserveAspectRatio="none">
                {/* La onda de Cursos ahora rellena con el color de la sección Servicios */}
                <path d={wavePath} fill="white"></path> 
              </svg>
            </div>
          </section>

          {/* Services Section */}
          <section id="services" className="bg-white overflow-hidden"> {/* Changed bg-main-white to bg-white */}
            <div className="max-w-6xl mx-auto py-12 px-4">
              <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Nuestros Servicios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { name: 'Reiki Healing', price: '$85', desc: 'Experimenta la suave técnica de curación energética que promueve la relajación y el bienestar general.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Reiki' },
                  { name: 'Yoga 1:1', price: '$95', desc: 'Sesiones de yoga personalizadas adaptadas a tus necesidades, enfocándose en la alineación, respiración y mindfulness.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Yoga' },
                  { name: 'Meditación Guiada', price: '$70', desc: 'Sumérgete en viajes guiados para calmar la mente, reducir el estrés y mejorar la autoconciencia.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Meditación' },
                  { name: 'Flores de Bach', price: '$75', desc: 'Aprovecha las esencias florales para equilibrar las emociones y promover la armonía interior.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Flores' },
                ].map((service, index) => (
                  <div key={index} className="service-card relative service-card-bg rounded-2xl shadow-lg"> {/* Changed bg-gradient-services-cards to service-card-bg */}
                    {isPremium() && <div className="discount-badge bg-detail-accent text-texto-principal-dark">30% OFF</div>} {/* Changed bg-acento-secundario to bg-detail-accent */}
                    <div className="text-center mb-6">
                      <img src={service.img} alt={service.name} className="w-20 h-20 object-cover rounded-full mx-auto mb-4"/>
                      <h3 className="text-xl font-bodoni-moda font-medium">{service.name}</h3>
                    </div>
                    <p className="font-montserrat mb-4 text-texto-claro-white">{service.desc}</p> {/* Changed text-texto-secundario-dark to text-texto-claro-white */}
                    <p className="text-lino font-medium font-raleway text-lg"> {/* Changed text-acento-personalizado to text-lino */}
                      {isPremium() ? `$${Math.round(parseInt(service.price.replace('$', '')) * 0.7)}` : service.price} por sesión
                      {isPremium() && <span className="text-sm text-texto-claro-white"> (30% desc.)</span>} {/* Changed text-texto-secundario-dark to text-texto-claro-white */}
                    </p>
                    <button
                      onClick={() => alert(`Agendar ${service.name} - ${isPremium() ? 'con descuento premium' : 'precio regular'} (funcionalidad pendiente)`)}
                      className="block w-full mt-4 text-center btn-service-card py-2 font-montserrat" /* Changed bg-btn-servicios-personalizado text-btn-servicios-texto-personalizado to btn-service-card */
                    >
                      {isLoggedIn() ? 'Agendar Ahora' : 'Ver Más'}
                    </button>
                  </div>
                ))}
              </div>
              {!isPremium() && (
                <div className="mt-12 p-6 bg-white text-texto-principal-dark rounded-lg text-center font-montserrat"> {/* Changed bg-[#f8f7f4] to bg-white */}
                  <p className="mb-4 text-lg">¿Quieres un 30% de descuento en todos los servicios?</p>
                  <button
                    onClick={() => openModal(setIsUpgradeModalOpen)}
                    className="btn-general px-6 py-3 text-md font-montserrat"
                  >
                    Suscríbete a Premium
                  </button>
                </div>
              )}
            </div>
            {/* Onda al final de la sección Servicios */}
            <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 96" preserveAspectRatio="none">
                {/* La onda de Servicios ahora rellena con el color de la sección Membresía */}
                <path d={wavePath} fill="white"></path> 
              </svg>
            </div>
          </section>

          {/* Membership Section */}
          <section id="membership" className="bg-white overflow-hidden"> {/* Changed bg-[#f8f7f4] to bg-white */}
            <div className="max-w-6xl mx-auto py-12 px-4">
              <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Beneficios de Membresía</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Membresía Gratuita */}
                <div className="bg-fondo-claro p-10 rounded-2xl shadow-lg text-texto-principal-dark">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-2">Membresía Gratuita</h3>
                    <p className="font-montserrat text-texto-secundario-dark">Comienza tu viaje de bienestar</p>
                    <p className="text-2xl text-acento-principal mt-4 font-raleway">$0 / mes</p> {/* Changed text-acento-personalizado to text-acento-principal */}
                  </div>
                  <ul className="space-y-4 font-montserrat">
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Lectura de tarot cada 3 días</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Acceso a videos de la comunidad</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Acceso limitado al blog</span>
                    </li>
                    <li className="flex items-center text-texto-secundario-dark">
                      <i className="fas fa-times mr-3"></i>
                      <span>30% de descuento en servicios y cursos</span>
                    </li>
                    <li className="flex items-center text-texto-secundario-dark">
                      <i className="fas fa-times mr-3"></i>
                      <span>Horóscopo diario personalizado</span>
                    </li>
                    <li className="flex items-center text-texto-secundario-dark">
                      <i className="fas fa-times mr-3"></i>
                      <span>Acceso completo a videos de yoga y meditación</span>
                    </li>
                    <li className="flex items-center text-texto-secundario-dark">
                      <i className="fas fa-times mr-3"></i>
                      <span>Contenido completo del blog</span>
                    </li>
                    <li className="flex items-center text-texto-secundario-dark">
                      <i className="fas fa-times mr-3"></i>
                      <span>Regalo de bienestar mensual</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => !isLoggedIn() ? openModal(setIsLoginModalOpen) : alert('¡Ya tienes membresía gratuita!')}
                    className="btn-general w-full mt-8 font-montserrat"
                  >
                    {isLoggedIn() ? 'Membresía Actual' : 'Únete Gratis'}
                  </button>
                </div>

                {/* Membresía Premium */}
                <div className="bg-terracota p-10 rounded-2xl shadow-lg relative overflow-hidden text-texto-claro-white"> {/* Changed bg-pink-section to bg-terracota and text-texto-principal-dark to text-texto-claro-white */}
                  <div className="absolute top-0 right-0 bg-detail-accent text-texto-principal-dark py-1 px-4 text-sm font-medium rounded-bl-lg">Más Popular</div> {/* Changed bg-acento-secundario to bg-detail-accent */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bodoni-moda font-medium text-texto-claro-white mb-2">Membresía Premium</h3> {/* Changed text-texto-principal-dark to text-texto-claro-white */}
                    <p className="font-montserrat text-lino">Experiencia de bienestar completa</p> {/* Changed text-acento-principal to text-lino */}
                    <p className="text-2xl text-lino mt-4 font-raleway">$19.99 / mes</p> {/* Changed text-acento-principal to text-lino */}
                  </div>
                  <ul className="space-y-4 font-montserrat">
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Lectura diaria de tarot (insights premium)</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>30% de descuento en todos los servicios y cursos</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Horóscopo diario personalizado con IA</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Acceso completo a todos los videos</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Contenido completo del blog</span>
                    </li>
                    <li className="flex items-center">
                      <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                      <span>Regalo de bienestar mensual</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => isPremium() ? alert('¡Ya eres usuario Premium!') : openModal(setIsUpgradeModalOpen)}
                    className="btn-general w-full mt-8 font-montserrat"
                  >
                    {isPremium() ? 'Ya eres Premium' : 'Actualizar Ahora'}
                  </button>
                </div>
              </div>
            </div>
            {/* Onda al final de la sección Membresía */}
            <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 96" preserveAspectRatio="none">
                {/* La onda de Membresía ahora rellena con el color de la sección Horóscopo/Blog */}
                <path d={wavePath} fill="white"></path> 
              </svg>
            </div>
          </section>

          {/* Horoscope Section (Solo Premium) */}
          {isPremium() && (
            <>
              <section id="horoscope" className="bg-white overflow-hidden"> {/* Changed bg-main-white to bg-white */}
                <div className="max-w-4xl mx-auto py-12 px-4">
                  <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-6">Horóscopo Diario</h2>
                  <p className="text-center font-montserrat text-texto-secundario-dark mb-16 max-w-2xl mx-auto">
                    Descubre lo que los astros tienen preparado para ti hoy. Ingresa tu fecha de nacimiento para recibir tu horóscopo personalizado.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="bg-fondo-claro p-8 rounded-2xl shadow-lg text-texto-principal-dark"> {/* Removed bg-gradient-main-sections, used bg-fondo-claro */}
                      <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Tu Fecha de Nacimiento</h3>
                      <form onSubmit={handleHoroscopeSubmit}>
                        <div className="mb-6">
                          <label htmlFor="birth-date" className="block text-texto-secundario-dark mb-2 font-montserrat">Fecha de Nacimiento</label>
                          <input 
                            type="date" 
                            name="birth_date" 
                            id="birth-date" 
                            required 
                            className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"
                          />
                        </div>
                        <button type="submit" className="btn-general w-full py-3 font-montserrat">
                          Obtener Mi Horóscopo
                        </button>
                      </form>
                    </div>

                    <div className="bg-fondo-claro p-8 rounded-2xl shadow-lg text-texto-principal-dark"> {/* Removed bg-gradient-main-sections, used bg-fondo-claro */}
                      <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-4">Tu Horóscopo de Hoy</h3>
                      {isLoadingHoroscope ? (
                        <div className="loading">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      ) : horoscope ? (
                        <div id="horoscope-content">
                          <div className="bg-fondo-claro p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-texto-principal-dark mb-2">
                              {horoscope.zodiac_sign} - {new Date(horoscope.date).toLocaleDateString('es-ES')}
                            </h4>
                            <p className="text-sm text-texto-secundario-dark font-montserrat whitespace-pre-line">
                              {horoscope.daily_horoscope}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-montserrat text-texto-secundario-dark">
                          Ingresa tu fecha de nacimiento para recibir tu horóscopo diario personalizado generado con inteligencia artificial.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Onda al final de la sección Horóscopo */}
                <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 100 96" preserveAspectRatio="none">
                    {/* La onda de Horóscopo ahora rellena con el color de la sección Blog */}
                    <path d={wavePath} fill="white"></path> 
                  </svg>
                </div>
              </section>
            </>
          )}

          {/* Blog Section */}
          <section id="blog" className="bg-white overflow-hidden"> {/* Changed bg-main-white to bg-white */}
            <div className="max-w-6xl mx-auto py-12 px-4">
              <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Blog de Bienestar</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                {blogPosts.map(post => (
                  <div key={post.id} className="blog-card bg-fondo-claro text-texto-principal-dark rounded-2xl shadow-lg">
                    <img 
                      src={post.image_url || 'https://placehold.co/400x200/e0e0e0/333333?text=Blog'} 
                      alt={post.title} 
                      className="w-full h-48 object-cover rounded-t-2xl"
                    />
                    <div className="p-6">
                      <span className="text-xs text-texto-secundario-dark font-montserrat">
                        {new Date(post.published_date).toLocaleDateString('es-ES')}
                      </span>
                      <h3 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mt-2 mb-3">
                        {post.title}
                      </h3>
                      {/* Muestra solo el excerpt para no logueados/no premium */}
                      <p className="font-montserrat mb-4 line-clamp-3 text-texto-secundario-dark">
                        {post.excerpt}
                      </p>
                      <button 
                        onClick={() => handleBlogPostClick(post)}
                        className="text-acento-claro hover:underline font-montserrat"
                      >
                        Leer Más
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Blog Creation for Premium Users */}
              {isPremium() && (
                <div className="bg-fondo-claro p-8 rounded-2xl shadow-lg">
                  <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">
                    Crear Nuevo Artículo
                  </h3>
                  <form onSubmit={handleBlogPostCreate}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label htmlFor="blog-title" className="block text-texto-secundario-dark mb-2 font-montserrat">
                          Título del Artículo
                        </label>
                        <input 
                          type="text" 
                          name="title" 
                          id="blog-title" 
                          required 
                          className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"
                        />
                      </div>
                      <div>
                        <label htmlFor="blog-image" className="block text-texto-secundario-dark mb-2 font-montserrat">
                          URL de Imagen (opcional)
                        </label>
                        <input 
                          type="url" 
                          name="image_url" 
                          id="blog-image" 
                          className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"
                        />
                      </div>
                    </div>
                    <div className="mb-6">
                      <label htmlFor="blog-excerpt" className="block text-texto-secundario-dark mb-2 font-montserrat">
                        Resumen (máximo 3 líneas)
                      </label>
                      <textarea 
                        name="excerpt" 
                        id="blog-excerpt" 
                        rows="3" 
                        required 
                        className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"
                      ></textarea>
                    </div>
                    <div className="mb-6">
                      <label htmlFor="blog-content" className="block text-texto-secundario-dark mb-2 font-montserrat">
                        Contenido Completo
                      </label>
                      <textarea 
                        name="content" 
                        id="blog-content" 
                        rows="10" 
                        required 
                        className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"></textarea>
                    </div>
                    <button 
                      type="submit" 
                      className="btn-general px-8 py-3 font-montserrat"
                    >
                      Publicar Artículo
                    </button>
                  </form>
                </div>
              )}
              
              {/* Premium Prompt for Free Users */}
              {!isPremium() && (
                <div className="mt-12 p-8 bg-lino text-texto-principal-dark rounded-2xl text-center"> {/* Changed bg-pink-section to bg-lino */}
                  <h3 className="text-2xl font-bodoni-moda font-medium mb-4">
                    ¿Quieres acceso completo al blog?
                  </h3>
                  <p className="font-montserrat mb-6">
                    Los usuarios Premium pueden leer artículos completos y crear sus propios posts.
                  </p>
                  <button
                    onClick={() => openModal(setIsUpgradeModalOpen)}
                    className="btn-general px-8 py-3 font-montserrat"
                  >
                    Actualizar a Premium
                  </button>
                </div>
              )}
            </div>
            {/* Onda al final de la sección Blog */}
            <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 96" preserveAspectRatio="none">
                {/* La onda del Blog ahora rellena con el color de la sección Contacto (fondo-oscuro) */}
                <path d={wavePath} fill="rgb(26, 26, 26)"></path> 
              </svg>
            </div>
          </section>

          {/* Contact & Social Section */}
          <section id="contact" className="bg-lino relative py-12 px-4" ref={contactSectionRef}> {/* Changed bg-pink-section to bg-lino */}
            <FloatingIconsBackground numberOfIcons={30} iconFilterStyle="brightness(0.5)" /> 
            <div className="max-w-6xl mx-auto relative z-20 text-texto-principal-dark">
              <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Conecta Con Nosotros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Envíanos un Mensaje</h3>
                  <form onSubmit={handleContactSubmit}>
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-acento-principal mb-2 font-montserrat">Tu Nombre</label> {/* Changed text-acento-personalizado to text-acento-principal */}
                      <input type="text" id="name" name="name" required className="w-full p-3 border border-acento-principal rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/> {/* Changed border-acento-personalizado to border-acento-principal */}
                    </div>
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-acento-principal mb-2 font-montserrat">Correo Electrónico</label> {/* Changed text-acento-personalizado to text-acento-principal */}
                      <input type="email" id="email" name="email" required className="w-full p-3 border border-acento-principal rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/> {/* Changed border-acento-personalizado to border-acento-principal */}
                    </div>
                    <div className="mb-4">
                      <label htmlFor="subject" className="block text-acento-principal mb-2 font-montserrat">Asunto</label> {/* Changed text-acento-personalizado to text-acento-principal */}
                      <input type="text" id="subject" name="subject" required className="w-full p-3 border border-acento-principal rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/> {/* Changed border-acento-personalizado to border-acento-principal */}
                    </div>
                    <div className="mb-6">
                      <label htmlFor="message" className="block text-acento-principal mb-2 font-montserrat">Tu Mensaje</label> {/* Changed text-acento-personalizado to text-acento-principal */}
                      <textarea id="message" name="message" rows="4" required className="w-full p-3 border border-acento-principal rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"></textarea> {/* Changed border-acento-personalizado to border-acento-principal */}
                    </div>
                    <button type="submit" className="btn-general px-6 py-3 font-montserrat">
                      Enviar Mensaje
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Síguenos</h3>
                  <div className="flex space-x-4 mb-10">
                    <a href="#" className="w-12 h-12 bg-acento-claro rounded-full flex items-center justify-center text-texto-principal-dark hover:bg-gris-palido-btn hover:text-texto-principal-dark transition">
                      <i className="fab fa-instagram text-xl"></i>
                    </a>
                    <a href="#" className="w-12 h-12 bg-acento-claro rounded-full flex items-center justify-center text-texto-principal-dark hover:bg-gris-palido-btn hover:text-texto-principal-dark transition">
                      <i className="fab fa-facebook-f text-xl"></i>
                    </a>
                    <a href="#" className="w-12 h-12 bg-acento-claro rounded-full flex items-center justify-center text-texto-principal-dark hover:bg-gris-palido-btn hover:text-texto-principal-dark transition">
                      <i className="fab fa-twitter text-xl"></i>
                    </a>
                    <a href="#" className="w-12 h-12 bg-acento-claro rounded-full flex items-center justify-center text-texto-principal-dark hover:bg-gris-palido-btn hover:text-texto-principal-dark transition">
                      <i className="fab fa-pinterest text-xl"></i>
                    </a>
                  </div>

                  <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Visítanos</h3>
                  <address className="not-italic font-montserrat text-acento-principal mb-6"> {/* Changed text-acento-personalizado to text-acento-principal */}
                    <p className="mb-2">123 Serenity Lane</p>
                    <p className="mb-2">Harmony Hills, CA 90210</p>
                    <p className="mb-2">Estados Unidos</p>
                  </address>

                  <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Información de Contacto</h3>
                  <div className="font-montserrat text-acento-principal"> {/* Changed text-acento-personalizado to text-acento-principal */}
                    <p className="mb-2">Email: hola@calmamialma.com</p>
                    <p>Teléfono: (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {currentView === 'calendar' && (
        <CalendarSection />
      )}

      {currentView === 'my-courses' && (
        <MyCourses />
      )}

      {currentView === 'admin' && isAdmin() && (
        <AdminDashboard />
      )}

      {/* Footer */}
      <footer className="bg-terracota text-texto-claro-white py-10 px-4 rounded-t-lg"> {/* Changed bg-fondo-oscuro to bg-terracota */}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="text-2xl font-bodoni-moda font-semibold mb-6 md:mb-0">Calma Mi Alma</div>
            <div className="flex flex-wrap justify-center gap-6 font-montserrat">
              <a href="#tarot" onClick={() => handleViewChange('home')} className="hover:text-lino transition">Oráculo</a> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
              <a href="#services" onClick={() => handleViewChange('home')} className="hover:text-lino transition">Servicios</a> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
              <a href="#membership" onClick={() => handleViewChange('home')} className="hover:text-lino transition">Membresía</a> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
              {isPremium() && (
                <>
                  <li><a href="#horoscope" onClick={() => handleViewChange('home')} className="hover:text-lino transition">Horóscopo</a></li> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
                  <li><a href="#videos" onClick={() => handleViewChange('home')} className="hover:text-lino transition">Videos</a></li> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
                  <li><a href="#courses" onClick={() => handleViewChange('home')} className="hover:text-lino transition">Cursos</a></li> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
                  <li><a href="#" onClick={() => handleViewChange('calendar')} className="hover:text-lino transition">Mi Calendario</a></li> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
                  <li><a href="#" onClick={() => handleViewChange('my-courses')} className="hover:text-lino transition">Mis Cursos</a></li> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
                </>
              )}
              <a href="#contact" onClick={() => handleViewChange('home')} className="hover:text-lino transition">Contacto</a> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
            </div>
          </div>
          <div className="border-t border-lino pt-6 flex flex-col md:flex-row justify-between items-center font-montserrat"> {/* Changed border-acento-personalizado to border-lino */}
            <p>© 2025 Calma Mi Alma. Todos los derechos reservados.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-lino transition">Política de Privacidad</a> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
              <a href="#" className="hover:text-lino transition">Términos de Servicio</a> {/* Changed hover:text-acento-personalizado to hover:text-lino */}
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.classList.contains('modal') && closeModal(setIsLoginModalOpen)}>
          <div className="modal-content bg-white text-texto-principal-dark"> {/* Changed bg-main-white to bg-white */}
            <span className="close-modal" onClick={() => closeModal(setIsLoginModalOpen)}>&times;</span>
            <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Iniciar Sesión</h2>
            
            {apiError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {apiError}
              </div>
            )}
            
            <div className="mb-6">
              <button 
                onClick={handleGoogleLogin}
                className="w-full bg-blue-600 text-texto-claro-white py-3 rounded-btn flex justify-center items-center mb-4 font-montserrat hover:bg-blue-700 transition"
              >
                <i className="fab fa-google mr-2"></i> Iniciar Sesión con Google
              </button>
              <div className="relative flex items-center my-6">
                <div className="flex-grow border-t border-acento-claro"></div>
                <span className="flex-shrink mx-4 text-texto-secundario-dark font-montserrat">o</span>
                <div className="flex-grow border-t border-acento-claro"></div>
              </div>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label htmlFor="login-email" className="block text-texto-secundario-dark mb-2 font-montserrat">Correo Electrónico</label>
                <input type="email" name="email" id="login-email" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
              </div>
              <div className="mb-6">
                <label htmlFor="login-password" className="block text-texto-secundario-dark mb-2 font-montserrat">Contraseña</label>
                <input type="password" name="password" id="login-password" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
              </div>
              <button type="submit" className="btn-general w-full py-3 font-montserrat">
                Iniciar Sesión
              </button>
            </form>
            <div className="mt-6 text-center font-montserrat">
              <p className="text-texto-secundario-dark">¿No tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); closeModal(setIsLoginModalOpen); openModal(setIsRegisterModalOpen); }} className="text-acento-principal hover:underline">Regístrate</a></p> {/* Changed text-acento-personalizado to text-acento-principal */}
            </div>
          </div>
        </div>
      )}

      {/* Register Modal (Nuevo) */}
      {isRegisterModalOpen && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.classList.contains('modal') && closeModal(setIsRegisterModalOpen)}>
          <div className="modal-content bg-white text-texto-principal-dark"> {/* Changed bg-main-white to bg-white */}
            <span className="close-modal" onClick={() => closeModal(setIsRegisterModalOpen)}>&times;</span>
            <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Crear Cuenta</h2>
            
            {apiError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {apiError}
              </div>
            )}
            
            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label htmlFor="register-name" className="block text-texto-secundario-dark mb-2 font-montserrat">Tu Nombre</label>
                <input type="text" name="name" id="register-name" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
              </div>
              <div className="mb-4">
                <label htmlFor="register-email" className="block text-texto-secundario-dark mb-2 font-montserrat">Correo Electrónico</label>
                <input type="email" name="email" id="register-email" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
              </div>
              <div className="mb-6">
                <label htmlFor="register-password" className="block text-texto-secundario-dark mb-2 font-montserrat">Contraseña</label>
                <input type="password" name="password" id="register-password" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
              </div>
              <button type="submit" className="btn-general w-full py-3 font-montserrat">
                Registrarse
              </button>
            </form>
            <div className="mt-6 text-center font-montserrat">
              <p className="text-texto-secundario-dark">¿Ya tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); closeModal(setIsRegisterModalOpen); openModal(setIsLoginModalOpen); }} className="text-acento-principal hover:underline">Iniciar Sesión</a></p> {/* Changed text-acento-personalizado to text-acento-principal */}
            </div>
          </div>
        </div>
      )}


      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.classList.contains('modal') && closeModal(setIsUpgradeModalOpen)}>
          <div className="modal-content bg-white text-texto-principal-dark"> {/* Changed bg-main-white to bg-white */}
            <span className="close-modal" onClick={() => closeModal(setIsUpgradeModalOpen)}>&times;</span>
            <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-2">Actualizar a Premium</h2>
            <p className="font-montserrat text-texto-secundario-dark mb-6">Desbloquea todas las características premium y mejora tu viaje de bienestar.</p>
            
            {apiError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {apiError}
              </div>
            )}
            
            <div className="bg-acento-principal p-4 rounded-lg mb-6"> {/* Changed bg-acento-personalizado to bg-acento-principal */}
              <p className="font-bodoni-moda font-medium text-texto-principal-dark mb-2">La Membresía Premium Incluye:</p>
              <ul className="space-y-2 font-montserrat text-texto-secundario-dark">
                <li className="flex items-center">
                  <i className="fas fa-check text-fondo-oscuro mr-2"></i>
                  <span>30% de descuento en todos los servicios</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-fondo-oscuro mr-2"></i>
                  <span>Análisis detallado de la carta astral</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-fondo-oscuro mr-2"></i>
                  <span>Horóscopo diario personalizado</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-fondo-oscuro mr-2"></i>
                  <span>Contenido premium exclusivo</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-fondo-oscuro mr-2"></i>
                  <span>Regalo de bienestar mensual entregado en tu puerta</span>
                </li>
              </ul>
            </div>
            <div className="text-center mb-6">
              <p className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark">$19.99 <span className="text-texto-secundario-dark text-sm"> / mes</span></p>
            </div>
            <button 
              onClick={handleUpgrade} 
              className="btn-general w-full py-3 font-montserrat"
            >
              Actualizar Ahora
            </button>
            <p className="text-center text-xs text-texto-secundario-dark font-montserrat">Cancela en cualquier momento. No se requiere compromiso.</p>
          </div>
        </div>
      )}

      {/* Course Details Modal */}
      {isCourseModalOpen && selectedCourse && (
        <CourseModal
          course={selectedCourse}
          isPremium={isPremium()}
          isLoggedIn={isLoggedIn()}
          onClose={() => closeModal(setIsCourseModalOpen)}
          onUpgradeClick={() => { closeModal(setIsCourseModalOpen); openModal(setIsUpgradeModalOpen); }}
          onPurchaseSuccess={handleCoursePurchased}
        />
      )}
    </div>
  );
};

// Componente principal que envuelve todo con el AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
