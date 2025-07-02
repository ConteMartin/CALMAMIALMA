import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Importa tu componente principal App
import './index.css'; // Importa tus estilos CSS globales (¡este es el archivo clave para que Tailwind se aplique!)

// Crea la raíz de React y renderiza tu aplicación
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
