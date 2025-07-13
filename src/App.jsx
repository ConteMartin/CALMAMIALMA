import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import apiService from './services/api';

// Componente para los iconos flotantes
const FloatingIconsBackground = ({ numberOfIcons = 30, iconFilterStyle }) => {
  const containerRef = useRef(null);
  const animationFrameId = useRef(null);
  const iconsState = useRef([]);

  const createAndAnimateIcons = useCallback(() => {
    if (!containerRef.current) {
      console.log("Container ref is null, cannot create icons.");
      return;
    }

    const iconUrls = [
      '/iconos/1.png',
      '/iconos/2.png',
      '/iconos/3.png',
      '/iconos/4.png',
      '/iconos/5.png',
      '/iconos/6.png',
      '/iconos/7.png',
      '/iconos/8.png',
      '/iconos/9.png'
    ];

    containerRef.current.innerHTML = '';
    iconsState.current = [];

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    if (containerWidth === 0 || containerHeight === 0) {
        console.warn("FloatingIconsBackground container has zero dimensions. Icons might not be visible.");
    }

    for (let i = 0; i < numberOfIcons; i++) {
      const icon = document.createElement('img');
      icon.src = iconUrls[Math.floor(Math.random() * iconUrls.length)];
      icon.classList.add('floating-icon');
      
      icon.onerror = () => {
        console.error(`Error al cargar el icono: ${icon.src}. Usando marcador de posición.`);
        icon.src = `https://placehold.co/100x100/CCCCCC/333333?text=Error`;
        icon.style.filter = 'none';
      };

      const baseSize = Math.random() * 100 + 80;
      const size = Math.random() < 0.2 ? baseSize * 2 : baseSize;
      icon.style.width = `${size}px`;
      icon.style.height = `${size}px`;

      let x, y;
      let attempts = 0;
      const maxAttempts = 100;
      const minDistance = size * 0.8;

      do {
        x = Math.random() * (containerWidth - size);
        y = Math.random() * (containerHeight - size);
        attempts++;
        if (attempts > maxAttempts) break;
      } while (iconsState.current.some(data => {
        const dx = x - data.x;
        const dy = y - data.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      }));

      const iconData = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        size: size,
        element: icon
      };
      iconsState.current.push(iconData);

      icon.style.opacity = (Math.random() * 0.5 + 0.3).toString();

      if (iconFilterStyle) {
        icon.style.filter = iconFilterStyle;
      }

      icon.onmouseenter = () => {
        icon.classList.add('hover-move');
      };
      icon.onmouseleave = () => {
        icon.classList.remove('hover-move');
        icon.style.transform = `translate(${iconData.x}px, ${iconData.y}px)`;
      };

      containerRef.current.appendChild(icon);
    }

    const animateLoop = () => {
      const parentWidth = containerRef.current.offsetWidth;
      const parentHeight = containerRef.current.offsetHeight;

      iconsState.current.forEach(iconData => {
        const iconElement = iconData.element;
        if (!iconElement || iconElement.classList.contains('hover-move')) return;

        iconData.x += iconData.vx;
        iconData.y += iconData.vy;

        if (iconData.x + iconData.size > parentWidth || iconData.x < 0) {
          iconData.vx *= -1;
          iconData.x = Math.max(0, Math.min(iconData.x, parentWidth - iconData.size));
        }
        if (iconData.y + iconData.size > parentHeight || iconData.y < 0) {
          iconData.vy *= -1;
          iconData.y = Math.max(0, Math.min(iconData.y, parentHeight - iconData.size));
        }

        iconElement.style.transform = `translate(${iconData.x}px, ${iconData.y}px)`;
      });

      animationFrameId.current = requestAnimationFrame(animateLoop);
    };

    animationFrameId.current = requestAnimationFrame(animateLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [numberOfIcons, iconFilterStyle]);

  useEffect(() => {
    const cleanupIcons = createAndAnimateIcons();

    const handleResize = () => {
      cleanupIcons();
      createAndAnimateIcons();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupIcons();
    };
  }, [createAndAnimateIcons]);

  return (
    <div className="floating-background-container" ref={containerRef}>
      <style>{`
        .floating-background-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        .floating-icon {
          position: absolute;
          opacity: 0.5;
          pointer-events: auto;
          transition: transform 0.1s ease-out;
          will-change: transform, opacity;
        }

        .floating-icon.hover-move {
          transform: scale(1.1) rotate(5deg) !important;
          filter: brightness(1.2);
        }
      `}</style>
    </div>
  );
};

// Componente principal de la aplicación que ahora usa autenticación real
const AppContent = () => {
  const { user, loginWithGoogle, login, logout, isLoggedIn, isPremium, loading, error } = useAuth();

  // Estados para la visibilidad de los modales
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isTarotModalOpen, setIsTarotModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoadingHoroscope, setIsLoadingHoroscope] = useState(false);
  const [clickedTarotCardId, setClickedTarotCardId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [selectedVideoCategory, setSelectedVideoCategory] = useState('COMUNIDAD');

  // Estados para datos del backend
  const [tarotReading, setTarotReading] = useState(null);
  const [horoscope, setHoroscope] = useState(null);
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [apiError, setApiError] = useState(null);

  // Referencias para las secciones donde los iconos deben ser visibles
  const tarotSectionRef = useRef(null);
  const contactSectionRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar datos cuando el usuario está autenticado
  useEffect(() => {
    if (isLoggedIn()) {
      loadVideos();
      loadCourses();
      loadBlogPosts();
    }
  }, [isLoggedIn]);

  // Función para cargar videos
  const loadVideos = async () => {
    try {
      const videosData = await apiService.getVideos();
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  // Función para cargar cursos
  const loadCourses = async () => {
    try {
      const coursesData = await apiService.getCourses();
      setCourses(coursesData);
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
    setClickedTarotCardId(null); // Reinicia la carta seleccionada al cerrar el modal
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

  // Manejador del clic en las cartas del tarot
  const handleTarotCardClick = async (e, cardData) => {
    if (!isLoggedIn()) {
      openModal(setIsLoginModalOpen);
      return;
    }

    // Establece la carta clicada inmediatamente para activar la animación de revelado
    setClickedTarotCardId(cardData.id);

    // Si el usuario está logueado, usa los datos locales de la carta
    // Si no es premium, la lectura será básica. Si es premium, la API la generaría.
    // Para esta solicitud, siempre usaremos los datos locales si está logueado.
    const localReading = {
      card: {
        id: cardData.id,
        title: cardData.title,
        meaning: cardData.text, // Usamos 'text' como 'meaning' para la lectura
        imageUrlBack: cardData.imageUrlBack
      },
      interpretation: `Hoy, la carta de ${cardData.title} te trae un mensaje de ${cardData.text.toLowerCase()}. Reflexiona sobre cómo esto se aplica a tu día.`,
      is_premium: isPremium() // Esto determinará si se muestra el "Insight Premium" en el modal
    };
    setTarotReading(localReading);


    // Después de un breve retraso (para permitir que la animación de la carta se complete), abre el modal
    setTimeout(() => {
      openModal(setIsTarotModalOpen);
    }, 800); // Ajusta este retraso para que coincida con la duración de tu animación
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
    if (video.is_premium && !isPremium()) {
      openModal(setIsUpgradeModalOpen);
      return;
    }
    
    if (video.youtube_url) {
      window.open(video.youtube_url, '_blank');
    } else {
      openModal(setIsUpgradeModalOpen);
    }
  };

  // Manejador del formulario de contacto
  const handleContactSubmit = (e) => {
    e.preventDefault();
    alert('¡Gracias por tu mensaje! En la versión completa tu mensaje sería enviado a nuestro equipo.');
    e.target.reset();
  };

  // Calcula las propiedades de estilo para el efecto de abanico de las cartas del tarot
  const calculateTarotCardStyle = (index, totalCards, isHovered) => {
    const cardWidth = 180;
    const cardHeight = 300;
    const isMobile = windowWidth < 768; // Define el punto de corte para móvil

    let baseTransform = '';
    let currentOffsetY = 0; // For fanning effect
    let currentScale = 1;
    let currentTranslateY = 0;

    if (isMobile) {
      const visibleCardsMobile = 7; // Número de cartas visibles en móvil
      const mobileSpreadWidthPercentage = 0.70; // Ocupa el 70% del ancho de la pantalla
      const mobileSpreadPixels = windowWidth * mobileSpreadWidthPercentage;
      const overlapFactor = 0.8; // Cuánto se superponen las cartas (0.8 = 80% de superposición)
      const effectiveCardWidth = cardWidth * (1 - overlapFactor); // Ancho efectivo de cada carta en la superposición

      // Calcula el espacio total que ocuparán las cartas superpuestas
      const totalOccupiedWidth = (visibleCardsMobile - 1) * effectiveCardWidth + cardWidth;
      
      // Ajusta el offset horizontal para centrar el grupo de cartas
      const horizontalOffset = ((mobileSpreadPixels - totalOccupiedWidth) / 2) + (index * effectiveCardWidth);

      const angle = (index - (visibleCardsMobile - 1) / 2) * 2; // Pequeña rotación para el efecto de abanico compacto
      currentOffsetY = Math.abs(index - (visibleCardsMobile - 1) / 2) * 5; // Pequeña curva vertical

      baseTransform = `rotate(${angle}deg)`;
      // Position for mobile
      const leftPos = `calc(50% - ${mobileSpreadPixels / 2}px + ${horizontalOffset}px)`;
      const topPos = `calc(50% - ${cardHeight / 2}px + ${currentOffsetY}px + 30px)`;

      if (isHovered) {
        currentTranslateY = -5;
        currentScale = 1.10;
      }

      return {
        display: index < visibleCardsMobile ? 'block' : 'none',
        left: leftPos,
        top: topPos,
        zIndex: index,
        transform: `${baseTransform} translateY(${currentTranslateY}px) scale(${currentScale})`,
        transformOrigin: 'center bottom'
      };

    } else {
      // Lógica para desktop (más de 768px)
      const fanSpreadPixels = 1500;
      const totalRotationDegrees = 10;
      const centerIndex = (totalCards - 1) / 2;
      const angle = (index - centerIndex) * (totalRotationDegrees / totalCards);
      const horizontalOffset = (index - centerIndex) * (fanSpreadPixels / totalCards);
      const verticalCurve = 0.000002;
      currentOffsetY = Math.abs(index - centerIndex) * Math.abs(index - centerIndex) * verticalCurve * cardHeight;

      baseTransform = `rotate(${angle}deg)`;
      // Position for desktop
      const leftPos = `calc(50% - ${cardWidth / 2}px + ${horizontalOffset}px)`;
      const topPos = `calc(50% - ${cardHeight / 2}px + ${currentOffsetY}px + 30px)`;

      if (isHovered) {
        currentTranslateY = -5;
        currentScale = 1.10;
      }

      return {
        left: leftPos,
        top: topPos,
        zIndex: index,
        transform: `${baseTransform} translateY(${currentTranslateY}px) scale(${currentScale})`,
        transformOrigin: 'center bottom'
      };
    }
  };

  // Datos de ejemplo para las cartas del tarot (40 cartas genéricas)
  const tarotCardsData = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    title: `Carta ${i + 1}`,
    text: `El significado de la Carta ${i + 1} es un mensaje de introspección y nuevos comienzos. Reflexiona sobre tus pasos y prepárate para un cambio positivo.`,
    imageUrlFront: '/carta-tarot-dorso.png', // Ruta para la imagen del dorso
    imageUrlBack: `https://placehold.co/180x300/c2bae5/171717?text=ILUSTRACION+CARTA+${i + 1}` // Placeholder para la ilustración
  }));


  if (loading) {
    return (
      <div className="min-h-screen bg-fondo-claro flex items-center justify-center">
        <div className="loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header / Navigation */}
      <header className="fixed top-0 left-0 w-full bg-fondo-oscuro text-texto-claro-white bg-opacity-90 z-50 py-4 px-6 flex justify-between items-center shadow-sm rounded-b-lg">
        <a href="#hero" className="text-2xl font-bodoni-moda font-semibold">Calma Mi Alma</a>
        <nav>
          <ul className="flex space-x-6 font-montserrat">
            <li><a href="#tarot" className="text-texto-claro-white hover:text-acento-claro transition">Tarot</a></li>
            <li><a href="#services" className="text-texto-claro-white hover:text-acento-claro transition">Servicios</a></li>
            <li><a href="#membership" className="text-texto-claro-white hover:text-acento-claro transition">Membresía</a></li>
            {isPremium() && (
              <>
                <li><a href="#horoscope" className="text-texto-claro-white hover:text-acento-claro transition">Horóscopo</a></li>
                <li><a href="#videos" className="text-texto-claro-white hover:text-acento-claro transition">Videos</a></li>
                <li><a href="#courses" className="text-texto-claro-white hover:text-acento-claro transition">Cursos</a></li>
                <li><a href="#blog" className="text-texto-claro-white hover:text-acento-claro transition">Blog</a></li>
              </>
            )}
            <li><a href="#contact" className="text-texto-claro-white hover:text-acento-claro transition">Contacto</a></li>
          </ul>
        </nav>
        <div>
          {isLoggedIn() ? (
            <div className="flex items-center space-x-4">
              <span className="text-acento-claro">Hola, {user?.name}</span>
              {isPremium() && <span className="bg-acento-claro text-texto-principal-dark px-2 py-1 rounded text-xs">Premium</span>}
              <button
                onClick={logout}
                className="bg-gris-palido-btn text-texto-principal-dark px-4 py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button
              onClick={() => openModal(setIsLoginModalOpen)}
              className="bg-gris-palido-btn text-texto-principal-dark px-4 py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* Mostrar errores de API si existen */}
      {apiError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg z-50">
          {apiError}
          <button onClick={() => setApiError(null)} className="ml-4">×</button>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="min-h-screen bg-fondo-claro flex flex-col justify-center items-center py-12 px-4 text-center relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-75"
          src="/sahumo.mp4"
        ></video>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bodoni-moda font-light text-texto-principal-dark mb-6 animate-fade-in-up">
            Encuentra Tu Paz Interior
          </h1>
          <p className="text-xl text-texto-secundario-dark mb-10 font-montserrat animate-fade-in-up delay-150">
            Emprende un viaje de autodescubrimiento y bienestar a través de la sabiduría ancestral y prácticas modernas.
          </p>
          <a
            href="#tarot"
            className="bg-gris-palido-btn text-texto-principal-dark px-8 py-3 rounded-btn hover:bg-gris-btn-hover transition text-lg font-montserrat animate-fade-in-up delay-300"
          >
            Comienza Tu Viaje
          </a>
        </div>
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <i className="fas fa-chevron-down text-texto-principal-dark text-2xl"></i>
        </div>
      </section>

      {/* Tarot Section */}
      <section id="tarot" ref={tarotSectionRef} className="relative bg-fondo-tarot-contacto-nuevo py-12 px-4">
        <FloatingIconsBackground numberOfIcons={250} iconFilterStyle="brightness(0.9)" />
        <div className="max-w-[120vw] mx-auto relative z-20">
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Oráculo Diario</h2>
          <div className="relative h-[400px] flex justify-center items-center">
            {tarotCardsData.map((card, index) => {
              const cardStyle = calculateTarotCardStyle(index, tarotCardsData.length, hoveredCardId === card.id);
              
              return (
                <div
                  key={card.id}
                  // Aplica la clase 'selected-for-reveal' cuando esta carta es la clicada
                  className={`tarot-card absolute group bg-heavy-metal rounded-xl shadow-lg 
                              ${clickedTarotCardId === card.id ? 'selected-for-reveal' : ''}`}
                  style={{
                    width: '180px', // Ancho fijo
                    height: '300px', // Alto fijo
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.6s ease-out, box-shadow 0.6s ease-out',
                    perspective: "1000px", // Asegura la perspectiva para el volteo
                    left: cardStyle.left, // Aplica las propiedades individuales de posición
                    top: cardStyle.top,
                    // Z-index: La carta clicada va al frente (101), las demás mantienen su z-index basado en el índice.
                    zIndex: clickedTarotCardId === card.id ? 101 : index,
                    transform: cardStyle.transform, // Transformación inicial de abanico
                    transformOrigin: cardStyle.transformOrigin // Mantiene el origen de la transformación
                  }}
                  onMouseEnter={() => setHoveredCardId(card.id)} // Manejador de entrada del ratón
                  onMouseLeave={() => setHoveredCardId(null)}   // Manejador de salida del ratón
                  onClick={(e) => handleTarotCardClick(e, card)}
                >
                  {/* Front Face (dorso de la carta) */}
                  <div
                    className="absolute w-full h-full rounded-xl backface-hidden overflow-hidden front"
                  >
                    <img
                      src={card.imageUrlFront}
                      alt="Tarot Card Back Design"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null; // Evita bucles infinitos si la imagen de fallback también falla
                        e.target.src = 'https://placehold.co/180x300/CCCCCC/333333?text=Error+Carga+Dorso'; // Imagen de fallback
                        console.error(`Error al cargar la imagen del dorso para la carta ${card.id}: ${card.imageUrlFront}`);
                      }}
                    />
                  </div>

                  {/* Back Face (ilustración de la carta y contenido) */}
                  <div
                    className="absolute w-full h-full rounded-xl backface-hidden overflow-hidden flex flex-col justify-center items-center text-pearl-bush text-center back"
                  >
                    <img
                      src={card.imageUrlBack}
                      alt="Tarot Card Illustration"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/180x300/c2bae5/171717?text=ILUSTRACION+TAROT+Error';
                        console.error(`Error al cargar la imagen de ilustración para la carta ${card.id}: ${card.imageUrlBack}`);
                      }}
                    />
                    {/* Overlay para el texto para asegurar la legibilidad - SOLO visible cuando la carta está volteada */}
                    {clickedTarotCardId === card.id && ( // Este overlay de texto solo aparece cuando la carta está en el estado final revelado
                      <div className="relative z-10 bg-black bg-opacity-40 p-4 rounded-lg mx-2 text-texto-claro-white">
                        <h3 className="text-2xl mb-4 font-bodoni-moda">{card.title}</h3>
                        <p className="font-montserrat">{card.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section id="videos" className="py-12 px-4 bg-gradient-main-sections">
        <div className="max-w-6xl mx-auto">
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
                      <div 
                        className="w-16 h-16 bg-gris-palido-btn rounded-full flex items-center justify-center cursor-pointer hover:bg-acento-claro transition"
                        onClick={() => handleVideoClick(video)}
                      >
                        <i className="fas fa-play text-texto-principal-dark text-xl"></i>
                      </div>
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
                className="bg-acento-claro text-texto-principal-dark px-8 py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
              >
                Actualizar a Premium
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-12 px-4 bg-fondo-claro">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Cursos Especializados</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courses.map(course => (
              <div key={course.id} className="bg-gradient-main-sections p-6 rounded-2xl shadow-lg text-texto-principal-dark relative">
                {course.discounted_price && (
                  <div className="absolute top-3 right-3 bg-acento-claro text-texto-principal-dark text-xs px-2 py-1 rounded-full font-montserrat">
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
                  {course.discounted_price ? (
                    <div className="text-center">
                      <span className="text-lg text-acento-claro font-raleway font-semibold">
                        ${course.discounted_price.toFixed(0)}
                      </span>
                      <span className="text-sm text-texto-secundario-dark line-through ml-2">
                        ${course.price.toFixed(0)}
                      </span>
                      <p className="text-xs text-texto-secundario-dark">Precio Premium</p>
                    </div>
                  ) : (
                    <p className="text-lg text-acento-claro font-raleway font-semibold text-center">
                      ${course.price.toFixed(0)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => alert(`Inscribirse en ${course.title} - ${course.discounted_price ? 'Precio Premium' : 'Precio Regular'} (funcionalidad pendiente)`)}
                  className="w-full bg-gris-palido-btn text-texto-principal-dark py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
                >
                  {isLoggedIn() ? 'Inscribirse' : 'Ver Más'}
                </button>
              </div>
            ))}
          </div>
          
          {!isPremium() && (
            <div className="mt-12 p-6 bg-acento-claro text-texto-principal-dark rounded-lg text-center font-montserrat">
              <p className="mb-4 text-lg">¿Quieres un 30% de descuento en todos los cursos?</p>
              <button
                onClick={() => openModal(setIsUpgradeModalOpen)}
                className="bg-fondo-oscuro text-texto-claro-white px-6 py-3 rounded-btn hover:bg-gris-btn-hover transition text-md"
              >
                Suscríbete a Premium
              </button>
            </div>
          )}
        </div>

      {/* Services Section */}
      <section id="services" className="py-12 px-4 bg-gradient-main-sections">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Nuestros Servicios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Reiki Healing', price: '$85', desc: 'Experimenta la suave técnica de curación energética que promueve la relajación y el bienestar general.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Reiki' },
              { name: 'Yoga 1:1', price: '$95', desc: 'Sesiones de yoga personalizadas adaptadas a tus necesidades, enfocándose en la alineación, respiración y mindfulness.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Yoga' },
              { name: 'Meditación Guiada', price: '$70', desc: 'Sumérgete en viajes guiados para calmar la mente, reducir el estrés y mejorar la autoconciencia.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Meditación' },
              { name: 'Flores de Bach', price: '$75', desc: 'Aprovecha las esencias florales para equilibrar las emociones y promover la armonía interior.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Flores' },
            ].map((service, index) => (
              <div key={index} className="service-card relative bg-fondo-card-servicios text-texto-principal-dark rounded-2xl shadow-lg">
                {isPremium() && <div className="discount-badge bg-acento-claro text-texto-principal-dark">30% OFF</div>}
                <div className="text-center mb-6">
                  <img src={service.img} alt={service.name} className="w-20 h-20 object-cover rounded-full mx-auto mb-4"/>
                  <h3 className="text-xl font-bodoni-moda font-medium">{service.name}</h3>
                </div>
                <p className="font-montserrat mb-4 text-texto-secundario-dark">{service.desc}</p>
                <p className="text-acento-claro font-medium font-raleway text-lg">
                  {isPremium() ? `$${Math.round(parseInt(service.price.replace('$', '')) * 0.7)}` : service.price} por sesión
                  {isPremium() && <span className="text-sm text-texto-secundario-dark"> (30% desc.)</span>}
                </p>
                <button
                  onClick={() => alert(`Agendar ${service.name} - ${isPremium() ? 'con descuento premium' : 'precio regular'} (funcionalidad pendiente)`)}
                  className="block w-full mt-4 text-center bg-gradient-btn-servicios text-btn-servicios-texto py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
                >
                  {isLoggedIn() ? 'Agendar Ahora' : 'Ver Más'}
                </button>
              </div>
            ))}
          </div>
          {!isPremium() && (
            <div className="mt-12 p-6 bg-acento-claro text-texto-principal-dark rounded-lg text-center font-montserrat">
              <p className="mb-4 text-lg">¿Quieres un 30% de descuento en todos los servicios?</p>
              <button
                onClick={() => openModal(setIsUpgradeModalOpen)}
                className="bg-fondo-oscuro text-texto-claro-white px-6 py-3 rounded-btn hover:bg-gris-btn-hover transition text-md"
              >
                Suscríbete a Premium
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Membership Section */}
      <section id="membership" className="py-12 px-4 bg-fondo-membresia-seccion">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Beneficios de Membresía</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Membresía Gratuita */}
            <div className="bg-fondo-claro p-10 rounded-2xl shadow-lg text-texto-principal-dark">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-2">Membresía Gratuita</h3>
                <p className="font-montserrat text-texto-secundario-dark">Comienza tu viaje de bienestar</p>
                <p className="text-2xl text-acento-claro mt-4 font-raleway">$0 / mes</p>
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
                  <span>Primeras 3 líneas de artículos del blog</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-fondo-oscuro mr-3"></i>
                  <span>Cursos a precio completo</span>
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
                className="w-full mt-8 bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
              >
                {isLoggedIn() ? 'Membresía Actual' : 'Únete Gratis'}
              </button>
            </div>

            {/* Membresía Premium */}
            <div className="bg-fondo-oscuro p-10 rounded-2xl shadow-lg relative overflow-hidden text-texto-claro-white">
              <div className="absolute top-0 right-0 bg-acento-claro text-texto-principal-dark py-1 px-4 text-sm font-medium rounded-bl-lg">Más Popular</div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bodoni-moda font-medium text-texto-claro-white mb-2">Membresía Premium</h3>
                <p className="font-montserrat text-acento-claro">Experiencia de bienestar completa</p>
                <p className="text-2xl text-acento-claro mt-4 font-raleway">$19.99 / mes</p>
              </div>
              <ul className="space-y-4 font-montserrat">
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Lectura diaria de tarot (insights premium)</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>30% de descuento en todos los servicios y cursos</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Horóscopo diario personalizado con IA</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Acceso completo a todos los videos</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Contenido completo del blog</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Regalo de bienestar mensual</span>
                </li>
              </ul>
              <button
                onClick={() => isPremium() ? alert('¡Ya eres usuario Premium!') : openModal(setIsUpgradeModalOpen)}
                className="w-full mt-8 bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
              >
                {isPremium() ? 'Ya eres Premium' : 'Actualizar Ahora'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Horoscope Section (Solo Premium) */}
      {isPremium() && (
        <section id="horoscope" className="py-12 px-4 bg-fondo-claro">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-6">Horóscopo Diario</h2>
            <p className="text-center font-montserrat text-texto-secundario-dark mb-16 max-w-2xl mx-auto">
              Descubre lo que los astros tienen preparado para ti hoy. Ingresa tu fecha de nacimiento para recibir tu horóscopo personalizado.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-gradient-main-sections p-8 rounded-2xl shadow-lg text-texto-principal-dark">
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
                  <button type="submit" className="w-full bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                    Obtener Mi Horóscopo
                  </button>
                </form>
              </div>

              <div className="bg-gradient-main-sections p-8 rounded-2xl shadow-lg text-texto-principal-dark">
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
        </section>
      )}

      {/* Blog & Media Section (Solo Premium) */}
      {isPremium() && (
        <section id="blog" className="py-12 px-4 bg-gradient-main-sections">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Blog & Media</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {/* Blog Post 1 */}
              <div className="blog-card bg-fondo-claro text-texto-principal-dark rounded-2xl shadow-lg">
                <img src="https://placehold.co/400x200/e0e0e0/333333?text=Cristales" alt="Cristales para Principiantes" className="w-full h-48 object-cover rounded-t-2xl"/>
                <div className="p-6">
                  <span className="text-xs text-texto-secundario-dark font-montserrat">Abril 15, 2025</span>
                  <h3 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mt-2 mb-3">Cristales para Principiantes: Por Dónde Empezar</h3>
                  <p className="font-montserrat mb-4 line-clamp-3 text-texto-secundario-dark">
                    Descubre los mejores cristales para principiantes y cómo incorporarlos en tu rutina diaria de bienestar.
                  </p>
                  <a href="#" className="text-acento-claro hover:underline font-montserrat">Leer Más</a>
                </div>
              </div>

              {/* Blog Post 2 */}
              <div className="blog-card bg-fondo-claro text-texto-principal-dark rounded-2xl shadow-lg">
                <img src="https://placehold.co/400x200/e0e0e0/333333?text=Yoga" alt="Rutina de Yoga Matutina" className="w-full h-48 object-cover rounded-t-2xl"/>
                <div className="p-6">
                  <span className="text-xs text-texto-secundario-dark font-montserrat">Abril 10, 2025</span>
                  <h3 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mt-2 mb-3">Rutina de Yoga Matutina de 5 Minutos</h3>
                  <p className="font-montserrat mb-4 line-clamp-3 text-texto-secundario-dark">
                    Comienza tu día con esta secuencia de yoga simple pero efectiva diseñada para energizar tu cuerpo y calmar tu mente.
                  </p>
                  <a href="#" className="text-acento-claro hover:underline font-montserrat">Leer Más</a>
                </div>
              </div>

              {/* Blog Post 3 (Premium) */}
              <div className="blog-card bg-fondo-claro text-texto-principal-dark rounded-2xl shadow-lg">
                <div className="relative">
                  <img src="https://placehold.co/400x200/e0e0e0/333333?text=Tarot" alt="Lectura de Tarot" className="w-full h-48 object-cover rounded-t-2xl"/>
                  <div className="absolute top-3 right-3 bg-acento-claro text-texto-principal-dark text-xs px-2 py-1 rounded-full font-montserrat">Premium</div>
                </div>
                <div className="p-6">
                  <span className="text-xs text-texto-secundario-dark font-montserrat">Abril 5, 2025</span>
                  <h3 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mt-2 mb-3">Tiradas de Tarot Avanzadas para el Autodescubrimiento</h3>
                  <p className="font-montserrat mb-4 line-clamp-3 text-texto-secundario-dark">
                    Lleva tu práctica de tarot al siguiente nivel con estas tiradas en profundidad diseñadas para una reflexión más profunda.
                  </p>
                  <a href="#" className="text-acento-claro hover:underline font-montserrat">Leer Más</a>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-10">Videos Destacados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Video 1 */}
              <div className="bg-fondo-claro rounded-2xl overflow-hidden shadow-lg text-texto-principal-dark">
                <div className="aspect-w-16 aspect-h-9 bg-acento-claro flex items-center justify-center">
                  <img src="https://placehold.co/400x200/e0e0e0/333333?text=Meditación" alt="Video de Meditación Guiada" className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gris-palido-btn rounded-full flex items-center justify-center cursor-pointer pulse"
                         onClick={() => alert('Reproducir video de meditación (funcionalidad pendiente)')}>
                      <i className="fas fa-play text-texto-principal-dark text-xl"></i>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mb-2">Meditación Guiada de 15 Minutos para Aliviar el Estrés</h4>
                  <p className="font-montserrat text-texto-secundario-dark">
                    Una práctica de meditación tranquilizante para ayudarte a liberar la tensión y encontrar tu centro.
                  </p>
                </div>
              </div>

              {/* Video 2 (Premium) */}
              <div className="bg-fondo-claro rounded-2xl overflow-hidden shadow-lg">
                <div className="relative">
                  <div className="aspect-w-16 aspect-h-9 bg-acento-claro flex items-center justify-center">
                    <img src="https://placehold.co/400x200/e0e0e0/333333?text=Yoga" alt="Video de Yoga Flow" className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-gris-palido-btn rounded-full flex items-center justify-center cursor-pointer pulse"
                           onClick={() => alert('Reproducir video de yoga (funcionalidad pendiente)')}>
                        <i className="fas fa-play text-texto-principal-dark text-xl"></i>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 bg-acento-claro text-texto-principal-dark text-xs px-2 py-1 rounded-full font-montserrat">Premium</div>
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mb-2">Flujo de Yoga Suave de 30 Minutos para Principiantes</h4>
                  <p className="font-montserrat text-texto-secundario-dark">
                    Una secuencia de yoga de ritmo lento perfecta para principiantes o cualquiera que busque una práctica suave.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact & Social Section */}
      <section id="contact" className="py-12 px-4 bg-fondo-oscuro relative" ref={contactSectionRef}>
        <FloatingIconsBackground numberOfIcons={30} iconFilterStyle="brightness(0.5)" />
        <div className="max-w-6xl mx-auto relative z-20 text-texto-claro-white">
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-claro-white text-center mb-16">Conecta Con Nosotros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-2xl font-bodoni-moda font-medium text-texto-claro-white mb-6">Envíanos un Mensaje</h3>
              <form onSubmit={handleContactSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-acento-claro mb-2 font-montserrat">Tu Nombre</label>
                  <input type="text" id="name" name="name" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-acento-claro mb-2 font-montserrat">Correo Electrónico</label>
                  <input type="email" id="email" name="email" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                </div>
                <div className="mb-4">
                  <label htmlFor="subject" className="block text-acento-claro mb-2 font-montserrat">Asunto</label>
                  <input type="text" id="subject" name="subject" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                </div>
                <div className="mb-6">
                  <label htmlFor="message" className="block text-acento-claro mb-2 font-montserrat">Tu Mensaje</label>
                  <textarea id="message" name="message" rows="4" required className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"></textarea>
                </div>
                <button type="submit" className="bg-gris-palido-btn text-texto-principal-dark px-6 py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                  Enviar Mensaje
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-2xl font-bodoni-moda font-medium text-texto-claro-white mb-6">Síguenos</h3>
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

              <h3 className="text-2xl font-bodoni-moda font-medium text-texto-claro-white mb-6">Visítanos</h3>
              <address className="not-italic font-montserrat text-acento-claro mb-6">
                <p className="mb-2">123 Serenity Lane</p>
                <p className="mb-2">Harmony Hills, CA 90210</p>
                <p className="mb-2">Estados Unidos</p>
              </address>

              <h3 className="text-2xl font-bodoni-moda font-medium text-texto-claro-white mb-6">Información de Contacto</h3>
              <div className="font-montserrat text-acento-claro">
                <p className="mb-2">Email: hola@calmamialma.com</p>
                <p>Teléfono: (555) 123-4567</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-fondo-oscuro text-texto-claro-white py-10 px-4 rounded-t-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="text-2xl font-bodoni-moda font-semibold mb-6 md:mb-0">Calma Mi Alma</div>
            <div className="flex flex-wrap justify-center gap-6 font-montserrat">
              <a href="#tarot" className="hover:text-acento-claro transition">Tarot</a>
              <a href="#services" className="hover:text-acento-claro transition">Servicios</a>
              <a href="#membership" className="hover:text-acento-claro transition">Membresía</a>
              {isPremium() && (
                <>
                  <li><a href="#horoscope" className="hover:text-acento-claro transition">Carta Astral</a></li>
                  <li><a href="#blog" className="hover:text-acento-claro transition">Blog</a></li>
                </>
              )}
              <a href="#contact" className="hover:text-acento-claro transition">Contacto</a>
            </div>
          </div>
          <div className="border-t border-acento-claro pt-6 flex flex-col md:flex-row justify-between items-center font-montserrat">
            <p>© 2025 Calma Mi Alma. Todos los derechos reservados.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-acento-claro transition">Política de Privacidad</a>
              <a href="#" className="hover:text-acento-claro transition">Términos de Servicio</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.classList.contains('modal') && closeModal(setIsLoginModalOpen)}>
          <div className="modal-content bg-fondo-claro text-texto-principal-dark">
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
              <button type="submit" className="w-full bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                Iniciar Sesión
              </button>
            </form>
            <div className="mt-6 text-center font-montserrat">
              <p className="text-texto-secundario-dark">¿No tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); closeModal(setIsLoginModalOpen); openModal(setIsRegisterModalOpen); }} className="text-acento-claro hover:underline">Regístrate</a></p>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal (Nuevo) */}
      {isRegisterModalOpen && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.classList.contains('modal') && closeModal(setIsRegisterModalOpen)}>
          <div className="modal-content bg-fondo-claro text-texto-principal-dark">
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
              <button type="submit" className="w-full bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                Registrarse
              </button>
            </form>
            <div className="mt-6 text-center font-montserrat">
              <p className="text-texto-secundario-dark">¿Ya tienes una cuenta? <a href="#" onClick={(e) => { e.preventDefault(); closeModal(setIsRegisterModalOpen); openModal(setIsLoginModalOpen); }} className="text-acento-claro hover:underline">Iniciar Sesión</a></p>
            </div>
          </div>
        </div>
      )}


      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.classList.contains('modal') && closeModal(setIsUpgradeModalOpen)}>
          <div className="modal-content bg-fondo-claro text-texto-principal-dark">
            <span className="close-modal" onClick={() => closeModal(setIsUpgradeModalOpen)}>&times;</span>
            <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-2">Actualizar a Premium</h2>
            <p className="font-montserrat text-texto-secundario-dark mb-6">Desbloquea todas las características premium y mejora tu viaje de bienestar.</p>
            
            {apiError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {apiError}
              </div>
            )}
            
            <div className="bg-acento-claro p-4 rounded-lg mb-6">
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
              className="w-full bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition mb-4 font-montserrat"
            >
              Actualizar Ahora
            </button>
            <p className="text-center text-xs text-texto-secundario-dark font-montserrat">Cancela en cualquier momento. No se requiere compromiso.</p>
          </div>
        </div>
      )}

      {/* Tarot Reveal Modal */}
      {isTarotModalOpen && (
        <div className="modal" style={{ display: 'flex' }} onClick={(e) => e.target.classList.contains('modal') && closeModal(setIsTarotModalOpen)}>
          <div className="modal-content bg-fondo-claro text-texto-principal-dark">
            <span className="close-modal" onClick={() => closeModal(setIsTarotModalOpen)}>&times;</span>
            
            {tarotReading ? (
              <div id="tarot-content">
                <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Tu Oráculo Diario</h2>
                <div className="text-center mb-6">
                  {/* Aquí se muestra la imagen de la carta volteada en el modal */}
                  <img src={tarotReading.card.imageUrlBack || '/tarot-card-placeholder.png'} alt="Tarot Card" className="w-32 h-48 object-cover rounded-lg mx-auto"/>
                  <h3 className="text-xl font-bodoni-moda font-medium text-acento-claro mt-4">{tarotReading.card.title}</h3>
                </div>
                
                <div className="bg-fondo-claro p-4 rounded-lg mb-4">
                  <p className="font-montserrat text-texto-secundario-dark whitespace-pre-line">
                    {tarotReading.card.meaning}
                  </p>
                </div>
                
                {isPremium() ? (
                  <div className="mt-6 p-4 bg-fondo-oscuro rounded-lg">
                    <h4 className="font-bodoni-moda font-medium text-texto-claro-white mb-2">Insight Premium:</h4>
                    <p className="font-montserrat text-texto-claro-white">
                      Como usuario premium, has recibido una lectura detallada y personalizada generada específicamente para ti.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-acento-claro bg-opacity-20 rounded-lg border border-acento-claro">
                    <p className="text-center font-montserrat text-texto-principal-dark mb-4">
                      Desbloquea insights premium con una Membresía Premium
                    </p>
                    <button onClick={() => { closeModal(setIsTarotModalOpen); openModal(setIsUpgradeModalOpen); }} className="w-full bg-gris-palido-btn text-texto-principal-dark py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                      Actualizar Ahora
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="loading mb-4">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>Obteniendo tu lectura diaria...</p>
              </div>
            )}
          </div>
        </div>
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