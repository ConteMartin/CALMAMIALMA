/** @type {import('tailwindcss').Config} */
export default {
  // `content` le dice a Tailwind dónde buscar tus clases CSS para saber qué estilos generar.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Escanea todos los archivos JavaScript/TypeScript/React en la carpeta `src/`
  ],
  theme: {
    extend: {
      colors: {
        // Mapea tus variables CSS personalizadas a nombres de colores de Tailwind.
        // Esto te permitirá usar clases como `bg-fondo-oscuro` o `text-texto-claro-white`.
        'fondo-claro': 'var(--color-fondo-claro)',
        'fondo-oscuro': 'var(--color-fondo-oscuro)',
        'acento-claro': 'var(--color-acento-claro)',
        'texto-claro-white': 'var(--color-texto-claro-white)',
        'texto-principal-dark': 'var(--color-texto-principal-dark)',
        'texto-secundario-dark': 'var(--color-texto-secundario-dark)',
        'gris-palido-btn': 'var(--color-gris-palido-btn)',
        'gris-btn-hover': 'var(--color-gris-btn-hover)',
        'fondo-tarot-contacto-nuevo': 'var(--color-fondo-tarot-contacto-nuevo)',
        'fondo-card-servicios': 'var(--color-fondo-card-servicios)',
        'fondo-membresia-seccion': 'var(--color-fondo-membresia-seccion)',
        'degradado-inicio': 'var(--color-degradado-inicio)',
        'degradado-fin': 'var(--color-degradado-fin)',
        'btn-servicios-texto': 'var(--color-btn-servicios-texto)',
        'btn-servicios-gradient-start': 'var(--color-btn-servicios-gradient-start)',
        'btn-servicios-gradient-end': 'var(--color-btn-servicios-gradient-end)',
      },
      fontFamily: {
        // Mapea tus fuentes personalizadas a nombres de clases de Tailwind.
        // Podrás usar `font-bodoni-moda`, `font-montserrat`, etc.
        'bodoni-moda': ['Bodoni Moda', 'serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
        'raleway': ['Raleway', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'], // Incluimos Inter por si lo usas en estilos globales
      },
      borderRadius: {
        // Define un valor personalizado para el `rounded-btn`
        'btn': '0.5rem', // Esto se mapea al `border-radius: 0.5rem;` que tenías en `index.css`
      }
    },
  },
  plugins: [],
}
