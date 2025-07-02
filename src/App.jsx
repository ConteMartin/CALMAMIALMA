import React, { useState, useEffect, useRef, useCallback } from 'react';

// Datos para las cartas del tarot (ejemplo con 78 cartas)
// En una aplicación real, esto vendría de una API o un archivo de datos más grande
const tarotCardsData = Array.from({ length: 78 }, (_, i) => ({
  id: i + 1,
  title: `Carta ${i + 1}`,
  text: `Este es el significado de la Carta ${i + 1}. Explora tu intuición y descubre el mensaje oculto.`,
}));

/**
 * Componente FloatingIconsBackground
 * Genera y anima iconos flotantes en el fondo de un contenedor.
 * Los iconos se mueven libremente y reaccionan al pasar el cursor sobre ellos.
 *
 * @param {number} numberOfIcons - El número de iconos a generar (por defecto 30).
 * @param {string} iconFilterStyle - Estilo CSS 'filter' a aplicar a los iconos (ej. "brightness(0)" para negro).
 */
const FloatingIconsBackground = ({ numberOfIcons = 30, iconFilterStyle }) => {
  const containerRef = useRef(null);
  const animationFrameId = useRef(null);
  const iconsState = useRef([]); // Usar useRef para mantener el estado mutable de los iconos sin re-renderizar

  const createAndAnimateIcons = useCallback(() => {
    if (!containerRef.current) {
      console.log("Container ref is null, cannot create icons.");
      return;
    }

    // Rutas de los iconos del 1.png al 9.png
    // Asegúrate de que estas rutas sean correctas en tu proyecto (ej. en la carpeta 'public/iconos')
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

    // Limpia los iconos existentes antes de añadir nuevos para evitar duplicados
    containerRef.current.innerHTML = '';
    iconsState.current = []; // Reinicia el estado de los iconos

    // Obtener las dimensiones del contenedor para el posicionamiento
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    console.log(`FloatingIconsBackground Container dimensions: Width=${containerWidth}, Height=${containerHeight}`);

    if (containerWidth === 0 || containerHeight === 0) {
        console.warn("FloatingIconsBackground container has zero dimensions. Icons might not be visible.");
        // Considerar añadir una alerta visual si el contenedor no tiene tamaño.
    }


    for (let i = 0; i < numberOfIcons; i++) {
      const icon = document.createElement('img'); // Restaurado a 'img'
      icon.src = iconUrls[Math.floor(Math.random() * iconUrls.length)];
      icon.classList.add('floating-icon');
      // Establecer un controlador de errores para la imagen
      icon.onerror = () => {
        console.error(`Error al cargar el icono: ${icon.src}. Usando marcador de posición.`);
        icon.src = `https://placehold.co/100x100/CCCCCC/333333?text=Error`; // Marcador de posición
        icon.style.filter = 'none'; // Desactiva el filtro si es un marcador de posición
      };

      // Algunos iconos el doble de grandes
      // Aumentado el rango base para iconos más grandes
      const baseSize = Math.random() * 100 + 80; // Rango base de 80px a 180px (antes 50-130)
      const size = Math.random() < 0.2 ? baseSize * 2 : baseSize; // 20% de probabilidad de ser el doble
      icon.style.width = `${size}px`;
      icon.style.height = `${size}px`;

      // Inicializamos posiciones y velocidades para el movimiento libre
      let x, y;
      let attempts = 0;
      const maxAttempts = 100;
      const minDistance = size * 0.8; // Distancia mínima entre iconos

      // Intenta encontrar una posición sin solapamiento inicial
      do {
        x = Math.random() * (containerWidth - size);
        y = Math.random() * (containerHeight - size);
        attempts++;
        if (attempts > maxAttempts) break; // Evitar bucles infinitos si es imposible encontrar espacio
      } while (iconsState.current.some(data => {
        const dx = x - data.x;
        const dy = y - data.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      }));

      const iconData = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.7, // Velocidad horizontal
        vy: (Math.random() - 0.5) * 0.7, // Velocidad vertical
        size: size,
        element: icon // Referencia al elemento DOM
      };
      iconsState.current.push(iconData);

      // Opacidad restaurada para un efecto sutil
      icon.style.opacity = (Math.random() * 0.5 + 0.3).toString(); // Opacidad sutil (0.3 a 0.8)

      // Aplicar el filtro de color si se proporciona
      if (iconFilterStyle) {
        icon.style.filter = iconFilterStyle;
      }

      // Consola para depuración de posición (se mantiene por si es útil)
      console.log(`Icon created at: {src: ${icon.src}, x: ${iconData.x}, y: ${iconData.y}}`);

      // Eventos para el hover (movimiento al pasar el cursor)
      icon.onmouseenter = () => {
        icon.classList.add('hover-move');
      };
      icon.onmouseleave = () => {
        icon.classList.remove('hover-move');
        // Asegurarse de que vuelve a la posición de la animación de fondo
        icon.style.transform = `translate(${iconData.x}px, ${iconData.y}px)`;
      };

      containerRef.current.appendChild(icon);
    }

    const animateLoop = () => {
      const parentWidth = containerRef.current.offsetWidth;
      const parentHeight = containerRef.current.offsetHeight;

      iconsState.current.forEach(iconData => {
        const iconElement = iconData.element;
        if (!iconElement || iconElement.classList.contains('hover-move')) return; // No mover si está en hover

        iconData.x += iconData.vx;
        iconData.y += iconData.vy;

        // Detección de colisiones con los bordes del contenedor
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

    // Limpieza al desmontar o recrear
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [numberOfIcons, iconFilterStyle]); // Depende de numberOfIcons y iconFilterStyle para re-ejecutarse si cambian

  useEffect(() => {
    const cleanupIcons = createAndAnimateIcons();

    const handleResize = () => {
      // Forzar la recreación y redistribución de los iconos en cada redimensionamiento
      // Esto cancelará el bucle de animación anterior y comenzará uno nuevo con nuevas posiciones
      cleanupIcons(); // Limpia los requestAnimationFrame anteriores
      createAndAnimateIcons(); // Vuelve a crear y animar
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupIcons(); // Limpia los iconos cuando el componente se desmonta
    };
  }, [createAndAnimateIcons]);


  return (
    <div className="floating-background-container" ref={containerRef}>
      {/* Los iconos se añadirán aquí mediante JavaScript */}
      <style>{`
        /* Estilos CSS para los iconos flotantes */
        .floating-background-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          /* background-color: rgba(255, 0, 0, 0.4); */ /* ELIMINADO: Temporal para depuración */
          z-index: 1; /* Restaurado a 1 para que esté detrás del contenido principal (z-index 20) */
          pointer-events: none; /* Asegura que no bloquee clics en el contenido detrás */
          /* NOTA: Ahora el 'overflow: hidden' de las secciones padre ha sido eliminado */
        }

        .floating-icon {
          position: absolute;
          opacity: 0.5; /* Restaurado a la opacidad original para un efecto sutil */
          pointer-events: auto; /* Permite interacciones de ratón en el icono, pero no en el contenedor */
          transition: transform 0.1s ease-out; /* Transición para el movimiento al pasar el cursor */
          will-change: transform, opacity; /* Optimización de rendimiento */
          /* border: 5px solid yellow; */ /* ELIMINADO: Temporal para depuración */
        }

        .floating-icon.hover-move {
          transform: scale(1.1) rotate(5deg) !important; /* Más grande y rotado al pasar el cursor */
          filter: brightness(1.2); /* Más brillante al pasar el cursor */
        }
      `}</style>
    </div>
  );
};


const App = () => {
  // Simulamos el estado del usuario (login y premium)
  const [userState, setUserState] = useState({
    isLoggedIn: false,
    isPremium: false,
  });

  // Estados para la visibilidad de los modales
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isTarotModalOpen, setIsTarotModalOpen] = useState(false);
  const [isLoadingNatalChart, setIsLoadingNatalChart] = useState(false);
  const [showNatalChartContent, setShowNatalChartContent] = useState(false);
  const [selectedZodiac, setSelectedZodiac] = useState('');
  const [clickedTarotCardId, setClickedTarotCardId] = useState(null); // Nuevo estado para la carta clicada

  // Referencias para las secciones donde los iconos deben ser visibles (usadas por los Observadores de Intersección)
  const tarotSectionRef = useRef(null);
  const contactSectionRef = useRef(null);


  // Función para abrir un modal
  const openModal = (setter) => {
    setter(true);
    document.body.style.overflow = 'hidden';
  };

  // Función para cerrar un modal
  const closeModal = (setter) => {
    setter(false);
    document.body.style.overflow = 'auto';
    setClickedTarotCardId(null); // Resetear la carta clicada al cerrar el modal
  };

  // Manejador de login (simulado)
  const handleLogin = (e) => {
    e.preventDefault();
    // Aquí iría la lógica de autenticación real con Firebase/Auth0
    setUserState({ isLoggedIn: true, isPremium: false }); // Por defecto, es gratuito
    closeModal(setIsLoginModalOpen);
  };

  // Manejador de actualización a premium (simulado)
  const handleUpgrade = () => {
    setUserState(prevState => ({ ...prevState, isPremium: true }));
    closeModal(setIsUpgradeModalOpen);
  };

  // Manejador del clic en las cartas del tarot
  const handleTarotCardClick = (e, cardData) => {
    if (!userState.isLoggedIn) {
      openModal(setIsLoginModalOpen);
    } else {
      // Remover la clase 'flipped' de todas las cartas antes de aplicar a la clicada
      const allCards = document.querySelectorAll('.tarot-card');
      allCards.forEach(card => card.classList.remove('flipped'));

      setClickedTarotCardId(cardData.id); // Establecer la carta clicada para la animación

      // Esperar a que termine la animación de "salir del mazo" y voltear
      setTimeout(() => {
        const clickedCardElement = e.currentTarget;
        clickedCardElement.classList.add('flipped'); // Voltea la carta una vez centrada
        // Después de voltear, abrimos el modal
        setTimeout(() => {
            openModal(setIsTarotModalOpen);
        }, 300); // Pequeño retraso después de voltear para que se vea el efecto
      }, 800); // Coincide con la duración de la transición 'selected-for-reveal'
    }
  };

  // Manejador del formulario de carta astral
  const handleNatalChartSubmit = (e) => {
    e.preventDefault();
    setIsLoadingNatalChart(true);
    setShowNatalChartContent(false);

    // Simular carga de la API
    setTimeout(() => {
      setIsLoadingNatalChart(false);
      setShowNatalChartContent(true);
      // Aquí se llamaría a la API de GPT/Gemini para generar la carta astral real
    }, 1500);
  };

  // Manejador de selección de signo zodiacal
  const handleZodiacSelect = (sign) => {
    setSelectedZodiac(sign);
  };

  // Manejador del formulario de contacto
  const handleContactSubmit = (e) => {
    e.preventDefault();
    alert('¡Gracias por tu mensaje! Esto es un prototipo, en la versión completa tu mensaje sería enviado a nuestro equipo.');
    e.target.reset(); // Reinicia el formulario
  };

  // Calcula las propiedades de estilo para el efecto de abanico de las cartas del tarot
  const calculateTarotCardStyle = (index, totalCards) => {
    const cardWidth = 180;
    const cardHeight = 300;
    // Ancho total que cubrirá el abanico, ajustado para el 70% del contenedor.
    // Esto es un valor en píxeles que se adapta bien al "max-w-[70vw]" del contenedor.
    const fanSpreadPixels = 1500; // Aumentado para mayor separación horizontal y cubrir el 70%

    // Ángulo total del abanico en grados (reducido para un arco menos pronunciado)
    const totalRotationDegrees = 10; // Reducido aún más para una curva muy sutil, casi recta

    const centerIndex = (totalCards - 1) / 2;
    const angle = (index - centerIndex) * (totalRotationDegrees / totalCards);

    // Posición horizontal: distribuye las cartas a lo largo del "fanSpreadPixels"
    const horizontalOffset = (index - centerIndex) * (fanSpreadPixels / totalCards);

    // Curva vertical para el efecto de abanico (muy sutil para "romper la línea recta")
    const verticalCurve = 0.000002; // Coeficiente muy pequeño para una curva mínima
    const distanceFromCenter = Math.abs(index - centerIndex);
    const offsetY = distanceFromCenter * distanceFromCenter * verticalCurve * cardHeight;

    return {
      // Centra el grupo de cartas y aplica los offsets del abanico
      left: `calc(50% - ${cardWidth / 2}px + ${horizontalOffset}px)`,
      top: `calc(50% - ${cardHeight / 2}px + ${offsetY}px + 30px)`, // Ajuste para subir un poco el abanico
      zIndex: index, // Asegura el orden de apilamiento visual
      transform: `rotate(${angle}deg)`, // Aplica la rotación para el efecto abanico
      transformOrigin: 'center bottom' // Rotar desde el centro de la base de la carta
    };
  };


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
            <li><a href="#horoscope" className="text-texto-claro-white hover:text-acento-claro transition">Carta Astral</a></li>
            <li><a href="#blog" className="text-texto-claro-white hover:text-acento-claro transition">Blog</a></li>
            <li><a href="#contact" className="text-texto-claro-white hover:text-acento-claro transition">Contacto</a></li>
          </ul>
        </nav>
        <div>
          <button
            onClick={() => userState.isLoggedIn ? alert('Ir a Mi Cuenta (funcionalidad pendiente)') : openModal(setIsLoginModalOpen)}
            className="bg-gris-palido-btn text-texto-principal-dark px-4 py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
          >
            {userState.isLoggedIn ? 'Mi Cuenta' : 'Iniciar Sesión'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="min-h-screen bg-fondo-claro flex flex-col justify-center items-center py-12 px-4 text-center relative overflow-hidden">
        {/* Vídeo de fondo */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-75" // Opacidad ajustada aquí
          src="/sahumo.mp4" // ¡Ruta del video actualizada!
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
      <section id="tarot"  ref={tarotSectionRef}> {/* Eliminado overflow-hidden */}
        {/* Iconos flotantes para la sección de Tarot */}
        <FloatingIconsBackground numberOfIcons={250} iconFilterStyle="brightness(0.9)" /> {/* Ejemplo de filtro */}
        <div className="max-w-[120vw] mx-auto relative z-20"> {/* Ancho del 70% y centrado */}
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Oráculo Diario</h2>
          <div className="relative h-[400px] flex justify-center items-center"> {/* Altura para el mazo */}
            {tarotCardsData.map((card, index) => (
              <div
                key={card.id}
                className={`tarot-card absolute group ${clickedTarotCardId === card.id ? 'selected-for-reveal' : ''}`}
                style={calculateTarotCardStyle(index, tarotCardsData.length)}
                onClick={(e) => handleTarotCardClick(e, card)}
              >
                <div className="front"></div>
                <div className="back">
                  <h3 className="text-2xl mb-4 font-bodoni-moda">{card.title}</h3>
                  <p className="font-montserrat text-center">{card.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-12 px-4 bg-gradient-main-sections">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">Nuestros Servicios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Reiki Healing', price: '$85', desc: 'Experimenta la suave técnica de curación energética que promueve la relajación y el bienestar general.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Reiki' },
              { name: 'Yoga ', price: '$95', desc: 'Sesiones de yoga personalizadas adaptadas a tus necesidades, enfocándose en la alineación, respiración y mindfulness.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Yoga' },
              { name: 'Meditación Guiada', price: '$70', desc: 'Sumérgete en viajes guiados para calmar la mente, reducir el estrés y mejorar la autoconciencia.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Meditación' },
              { name: 'Flores de Bach', price: '$75', desc: 'Aprovecha las esencias florales para equilibrar las emociones y promover la armonía interior.', img: 'https://placehold.co/80x80/e0e0e0/333333?text=Flores' },
            ].map((service, index) => (
              <div key={index} className="service-card relative bg-fondo-card-servicios text-texto-principal-dark rounded-2xl shadow-lg">
                {userState.isPremium && <div className="discount-badge bg-acento-claro text-texto-principal-dark">30% OFF</div>}
                <div className="text-center mb-6">
                  <img src={service.img} alt={service.name} className="w-20 h-20 object-cover rounded-full mx-auto mb-4"/>
                  <h3 className="text-xl font-bodoni-moda font-medium">{service.name}</h3>
                </div>
                <p className="font-montserrat mb-4 text-texto-secundario-dark">{service.desc}</p>
                <p className="text-acento-claro font-medium font-raleway text-lg">{service.price} por sesión</p>
                <button
                  onClick={() => alert(`Agendar ${service.name} - ${userState.isPremium ? 'con descuento' : 'sin descuento'} (funcionalidad pendiente)`)}
                  className="block w-full mt-4 text-center bg-gradient-btn-servicios text-btn-servicios-texto py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
                  disabled={!userState.isLoggedIn && !userState.isPremium}
                >
                  {userState.isLoggedIn && userState.isPremium ? 'Agendar Ahora' : 'Ver Más'}
                </button>
              </div>
            ))}
          </div>
          {!userState.isPremium && (
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
                  <span>Lectura diaria de tarot (básica)</span>
                </li>
                <li className="flex items-center text-texto-secundario-dark">
                  <i className="fas fa-times mr-3"></i>
                  <span>30% de descuento en todos los servicios</span>
                </li>
                <li className="flex items-center text-texto-secundario-dark">
                  <i className="fas fa-times mr-3"></i>
                  <span>Carta astral detallada</span>
                </li>
                <li className="flex items-center text-texto-secundario-dark">
                  <i className="fas fa-times mr-3"></i>
                  <span>Horóscopo diario personalizado</span>
                </li>
                <li className="flex items-center text-texto-secundario-dark">
                  <i className="fas fa-times mr-3"></i>
                  <span>Contenido exclusivo del blog</span>
                </li>
                <li className="flex items-center text-texto-secundario-dark">
                  <i className="fas fa-times mr-3"></i>
                  <span>Acceso a la biblioteca de videos</span>
                </li>
                <li className="flex items-center text-texto-secundario-dark">
                  <i className="fas fa-times mr-3"></i>
                  <span>Regalo de bienestar mensual</span>
                </li>
              </ul>
              <button
                onClick={() => alert('¡Te has unido a la membresía gratuita! (simulado)')}
                className="w-full mt-8 bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
              >
                Únete Gratis
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
                  <span>30% de descuento en todos los servicios</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Carta astral detallada</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Horóscopo diario personalizado</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Contenido exclusivo del blog</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Acceso a la biblioteca de videos</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check mr-3"></i>
                  <span>Regalo de bienestar mensual</span>
                </li>
              </ul>
              <button
                onClick={() => openModal(setIsUpgradeModalOpen)}
                className="w-full mt-8 bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
              >
                Actualizar Ahora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Natal Chart & Horoscope Section (Solo Premium) */}
      {userState.isPremium && (
        <section id="horoscope" className="py-12 px-4 bg-fondo-claro">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-6">Carta Astral & Horóscopo</h2>
            <p className="text-center font-montserrat text-texto-secundario-dark mb-16 max-w-2xl mx-auto">
              Descubre las influencias cósmicas que moldean tu personalidad y destino con nuestro análisis detallado de la carta astral.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-gradient-main-sections p-8 rounded-2xl shadow-lg text-texto-principal-dark">
                <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Tu Información de Nacimiento</h3>
                <form onSubmit={handleNatalChartSubmit}>
                  <div className="mb-4">
                    <label htmlFor="birth-date" className="block text-texto-secundario-dark mb-2 font-montserrat">Fecha de Nacimiento</label>
                    <input type="date" id="birth-date" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="birth-time" className="block text-texto-secundario-dark mb-2 font-montserrat">Hora de Nacimiento</label>
                    <input type="time" id="birth-time" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                  </div>
                  <div className="mb-6">
                    <label htmlFor="birth-place" className="block text-texto-secundario-dark mb-2 font-montserrat">Lugar de Nacimiento</label>
                    <input type="text" id="birth-place" placeholder="Ciudad, País" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                  </div>

                  <h4 className="text-lg font-bodoni-moda font-medium text-texto-principal-dark mb-3">Selecciona Tu Signo Zodiacal</h4>
                  <div className="zodiac-selector">
                    {[
                      { sign: 'aries', icon: 'fas fa-fire' },
                      { sign: 'taurus', icon: 'fas fa-seedling' },
                      { sign: 'gemini', icon: 'fas fa-user-friends' },
                      { sign: 'cancer', icon: 'fas fa-water' },
                      { sign: 'leo', icon: 'fas fa-sun' },
                      { sign: 'virgo', icon: 'fas fa-leaf' },
                      { sign: 'libra', icon: 'fas fa-balance-scale' },
                      { sign: 'scorpio', icon: 'fas fa-dragon' },
                      { sign: 'sagittarius', icon: 'fas fa-horse' },
                      { sign: 'capricorn', icon: 'fas fa-mountain' },
                      { sign: 'aquarius', icon: 'fas fa-wind' },
                      { sign: 'pisces', icon: 'fas fa-fish' },
                    ].map(zodiac => (
                      <div
                        key={zodiac.sign}
                        className={`zodiac-icon bg-acento-claro text-texto-principal-dark hover:bg-fondo-oscuro hover:text-texto-claro-white ${selectedZodiac === zodiac.sign ? 'selected bg-fondo-oscuro text-texto-claro-white' : ''}`}
                        data-sign={zodiac.sign}
                        onClick={() => handleZodiacSelect(zodiac.sign)}
                      >
                        <i className={`${zodiac.icon} text-2xl`}></i>
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="w-full mt-6 bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                    Generar Carta Astral
                  </button>
                </form>
              </div>

              <div className="bg-gradient-main-sections p-8 rounded-2xl shadow-lg text-texto-principal-dark">
                <h3 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-4">Tu Huella Cósmica</h3>
                {isLoadingNatalChart ? (
                  <div className="loading">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : showNatalChartContent && (
                  <div id="chart-content">
                    <p className="mb-4 font-montserrat">
                      Este es un prototipo. En la versión completa, verás tu carta astral personalizada basada en tus detalles de nacimiento.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6 font-montserrat">
                      <div>
                        <h4 className="font-medium text-texto-principal-dark">Signo Solar</h4>
                        <p>Tauro</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-texto-principal-dark">Signo Lunar</h4>
                        <p>Cáncer</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-texto-principal-dark">Ascendente</h4>
                        <p>Libra</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-texto-principal-dark">Venus</h4>
                        <p>Géminis</p>
                      </div>
                    </div>
                    <p className="text-sm italic font-montserrat">
                      Para un análisis e interpretación completos, revisa cuando se lance la versión final.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Blog & Media Section (Solo Premium) */}
      {userState.isPremium && (
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

            <h3 className="text-2xl font-bodoni-moda font-light text-texto-claro-white text-center mb-10">Videos Destacados</h3>
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
      <section id="contact" className="py-12 px-4 bg-fondo-oscuro relative" ref={contactSectionRef}> {/* Eliminado overflow-hidden */}
        {/* Iconos flotantes para la sección de Contacto */}
        <FloatingIconsBackground numberOfIcons={30} iconFilterStyle="brightness(0.5)" /> {/* Ejemplo de filtro */}
        <div className="max-w-6xl mx-auto relative z-20 text-texto-claro-white">
          <h2 className="text-4xl font-bodoni-moda font-light text-texto-claro-white text-center mb-16">Conecta Con Nosotros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-2xl font-bodoni-moda font-medium text-texto-claro-white mb-6">Envíanos un Mensaje</h3>
              <form onSubmit={handleContactSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-acento-claro mb-2 font-montserrat">Tu Nombre</label>
                  <input type="text" id="name" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-acento-claro mb-2 font-montserrat">Correo Electrónico</label>
                  <input type="email" id="email" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                </div>
                <div className="mb-4">
                  <label htmlFor="subject" className="block text-acento-claro mb-2 font-montserrat">Asunto</label>
                  <input type="text" id="subject" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
                </div>
                <div className="mb-6">
                  <label htmlFor="message" className="block text-acento-claro mb-2 font-montserrat">Tu Mensaje</label>
                  <textarea id="message" rows="4" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"></textarea>
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
              <a href="#horoscope" className="hover:text-acento-claro transition">Carta Astral</a>
              <a href="#blog" className="hover:text-acento-claro transition">Blog</a>
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
            <div className="mb-6">
              <button className="w-full bg-blue-600 text-texto-claro-white py-3 rounded-btn flex justify-center items-center mb-4 font-montserrat">
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
                <input type="email" id="login-email" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
              </div>
              <div className="mb-6">
                <label htmlFor="login-password" className="block text-texto-secundario-dark mb-2 font-montserrat">Contraseña</label>
                <input type="password" id="login-password" className="w-full p-3 border border-acento-claro rounded-lg focus:outline-none focus:ring-2 focus:ring-fondo-oscuro bg-fondo-claro text-texto-principal-dark"/>
              </div>
              <button type="submit" className="w-full bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                Iniciar Sesión
              </button>
            </form>
            <div className="mt-6 text-center font-montserrat">
              <p className="text-texto-secundario-dark">¿No tienes una cuenta? <a href="#" className="text-acento-claro hover:underline">Regístrate</a></p>
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
            <button onClick={handleUpgrade} className="w-full bg-gris-palido-btn text-texto-principal-dark py-3 rounded-btn hover:bg-gris-btn-hover transition mb-4 font-montserrat">
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
            {userState.isPremium ? (
              <div id="premium-tarot-content">
                <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Tu Oráculo Diario</h2>
                <div className="text-center mb-6">
                  <img src="/tarot-card-placeholder.png" alt="Tarot Card" className="w-32 h-48 object-cover rounded-lg mx-auto"/>
                  <h3 className="text-xl font-bodoni-moda font-medium text-acento-claro mt-4">La Emperatriz</h3>
                </div>
                <p className="font-montserrat text-texto-secundario-dark mb-6">
                  La Emperatriz representa la abundancia, la fertilidad y la energía nutricia. Hoy, concéntrate en el autocuidado y en cultivar el crecimiento en tu vida.
                </p>
                <div className="bg-acento-claro p-4 rounded-lg mb-6">
                  <h4 className="font-bodoni-moda font-medium text-texto-principal-dark mb-2">Insight Premium:</h4>
                  <p className="font-montserrat text-texto-secundario-dark">
                    La Emperatriz te invita a conectar con la naturaleza hoy. Considera pasar tiempo al aire libre o traer plantas a tu espacio. Tu energía creativa es especialmente fuerte ahora, lo que hace que este sea un excelente momento para proyectos artísticos o para dar vida a nuevas ideas.
                  </p>
                </div>
                <div className="bg-fondo-oscuro p-4 rounded-lg">
                  <h4 className="font-bodoni-moda font-medium text-texto-claro-white mb-2">Afirmación Diaria:</h4>
                  <p className="font-montserrat text-texto-claro-white italic">
                    "Estoy conectado/a a la energía abundante de la naturaleza y confío en mi poder creativo."
                  </p>
                </div>
              </div>
            ) : (
              <div id="free-tarot-content">
                <h2 className="text-2xl font-bodoni-moda font-medium text-texto-principal-dark mb-6">Tu Oráculo Diario</h2>
                <div className="text-center mb-6">
                  <img src="/tarot-card-placeholder.png" alt="Tarot Card" className="w-32 h-48 object-cover rounded-lg mx-auto"/>
                  <h3 className="text-xl font-bodoni-moda font-medium text-acento-claro mt-4">La Emperatriz</h3>
                </div>
                <p className="font-montserrat text-texto-secundario-dark mb-6">
                  La Emperatriz representa la abundancia, la fertilidad y la energía nutricia. Hoy, concéntrate en el autocuidado y en cultivar el crecimiento en tu vida.
                </p>
                <div className="mt-6 p-4 bg-acento-claro bg-opacity-20 rounded-lg border border-acento-claro">
                  <p className="text-center font-montserrat text-texto-principal-dark mb-4">
                    Desbloquea insights premium con una Membresía Premium
                  </p>
                  <button onClick={() => { closeModal(setIsTarotModalOpen); openModal(setIsUpgradeModalOpen); }} className="w-full bg-gris-palido-btn text-texto-principal-dark py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat">
                    Actualizar Ahora
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
