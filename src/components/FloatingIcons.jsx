import React, { useEffect, useRef, useCallback } from 'react';

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
    if (!containerRef.current) return;

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

    for (let i = 0; i < numberOfIcons; i++) {
      const icon = document.createElement('img');
      icon.src = iconUrls[Math.floor(Math.random() * iconUrls.length)];
      icon.classList.add('floating-icon');
      // pointer-events: auto ya está en CSS, permite el hover

      // Algunos iconos el doble de grandes
      const baseSize = Math.random() * 80 + 50; // Rango base de 50px a 130px
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

      // Opacidad ajustada para que sean más visibles (0.3 a 0.8)
      icon.style.opacity = (Math.random() * 0.5 + 0.3).toString();

      // Aplicar el filtro de color si se proporciona
      if (iconFilterStyle) {
        icon.style.filter = iconFilterStyle;
      }

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
          z-index: 0; /* Asegura que esté detrás del contenido principal */
        }

        .floating-icon {
          position: absolute;
          opacity: 0.5; /* Opacidad inicial para un efecto sutil */
          pointer-events: auto; /* Permite interacciones de ratón */
          transition: transform 0.1s ease-out; /* Transición para el movimiento al pasar el cursor */
          will-change: transform, opacity; /* Optimización de rendimiento */
        }

        .floating-icon.hover-move {
          transform: scale(1.1) rotate(5deg) !important; /* Más grande y rotado al pasar el cursor */
          filter: brightness(1.2); /* Más brillante al pasar el pasar el cursor */
        }
      `}</style>
    </div>
  );
};

export default FloatingIconsBackground;
