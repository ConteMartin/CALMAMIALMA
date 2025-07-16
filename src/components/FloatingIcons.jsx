import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Componente FloatingIconsBackground
 * Genera y anima iconos flotantes en el fondo de un contenedor.
 * Los iconos se mueven libremente y tienen una opacidad variada para un efecto de "destello".
 *
 * @param {number} numberOfIcons - El número de iconos a generar (por defecto 70).
 * @param {string} iconFilterStyle - Estilo CSS 'filter' a aplicar a los iconos (ej. "invert(1)" para blanco, "brightness(0.9)" para más oscuro).
 */
const FloatingIconsBackground = ({ numberOfIcons = 70, iconFilterStyle }) => {
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

    if (containerWidth === 0 || containerHeight === 0) {
        console.warn("FloatingIconsBackground container has zero dimensions. Icons might not be visible.");
        // Si las dimensiones son cero, no tiene sentido crear iconos, salimos.
        return;
    }

    for (let i = 0; i < numberOfIcons; i++) {
      const icon = document.createElement('img');
      icon.src = iconUrls[Math.floor(Math.random() * iconUrls.length)];
      icon.classList.add('floating-icon');
      
      // Manejo de errores para la carga de imágenes
      icon.onerror = () => {
        console.error(`Error al cargar el icono: ${icon.src}. Usando marcador de posición.`);
        icon.src = `https://placehold.co/100x100/CCCCCC/333333?text=Error`;
        icon.style.filter = 'none'; // Asegura que el marcador de posición sea visible
      };

      // Algunos iconos el doble de grandes
      const baseSize = Math.random() * 100 + 70; // Rango base de 70px a 170px
      const size = Math.random() < 0.2 ? baseSize * 2 : baseSize; // 20% de probabilidad de ser el doble
      icon.style.width = `${size}px`;
      icon.style.height = `${size}px`;

      // Inicializamos posiciones y velocidades para el movimiento libre
      let x, y;
      let attempts = 0;
      const maxAttempts = 100;
      // Distancia mínima entre iconos para una mejor dispersión inicial
      const minDistance = size * 0.1; 

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

      const finalScale = 0.5 + Math.random() * 0.5; // Escala final entre 0.5 y 1.0
      const finalOpacity = 0.3 + Math.random() * 0.4; // Opacidad final entre 0.3 y 0.7

      const iconData = {
        x: x,
        y: y,
        // Velocidad horizontal y vertical ligeramente ajustada para un movimiento suave
        vx: (Math.random() - 0.5) * 0.7, 
        vy: (Math.random() - 0.5) * 0.7, 
        size: size,
        finalScale: finalScale, // Guardar la escala final
        finalOpacity: finalOpacity, // Guardar la opacidad final
        element: icon // Referencia al elemento DOM
      };
      iconsState.current.push(iconData);

      // Establecer estilos iniciales para la animación de aparición
      icon.style.transform = `translate(${x}px, ${y}px) scale(0.1)`; // Empieza pequeño
      icon.style.opacity = '0'; // Empieza invisible

      // Aplicar el filtro de color si se proporciona
      if (iconFilterStyle) {
        icon.style.filter = iconFilterStyle;
      }

      containerRef.current.appendChild(icon);

      // Activar la transición después de un pequeño retraso para asegurar que los estilos iniciales se apliquen
      setTimeout(() => {
        icon.style.transform = `translate(${x}px, ${y}px) scale(${finalScale})`;
        icon.style.opacity = `${finalOpacity}`;
      }, 50); // Pequeño retraso
    }

    const animateLoop = () => {
      const parentWidth = containerRef.current.offsetWidth;
      const parentHeight = containerRef.current.offsetHeight;

      iconsState.current.forEach(iconData => {
        const iconElement = iconData.element;
        if (!iconElement) return; 

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

        // Aplicar la transformación manteniendo la escala final
        iconElement.style.transform = `translate(${iconData.x}px, ${iconData.y}px) scale(${iconData.finalScale})`;
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
  }, [numberOfIcons, iconFilterStyle]);

  useEffect(() => {
    const cleanupIcons = createAndAnimateIcons();

    const handleResize = () => {
      // Forzar la recreación y redistribución de los iconos en cada redimensionamiento
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
          overflow: hidden; /* Asegura que los iconos no se desborden del contenedor */
          z-index: 1; /* Asegura que esté detrás del contenido principal, pero encima del fondo de la sección */
          pointer-events: none; /* Deshabilita eventos de ratón en el contenedor para que no interfiera con el contenido */
        }

        .floating-icon {
          position: absolute;
          pointer-events: none; /* Deshabilita eventos de ratón en los iconos para que no interfiera con el contenido */
          transition: transform 1.5s ease-out, opacity 1.5s ease-out; /* Transición para la animación de aparición */
          will-change: transform, opacity; /* Optimización de rendimiento */
        }
      `}</style>
    </div>
  );
};

export default FloatingIconsBackground;
