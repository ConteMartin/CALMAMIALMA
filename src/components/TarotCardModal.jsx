// src/components/TarotCardModal.jsx
import React from 'react';
import ProfileCard from './ProfileCard'; // Importa el ProfileCard actualizado
import { useAuth } from '../hooks/useAuth'; // Importa useAuth para verificar si es premium
import './TarotCardModal.css'; // Importa el CSS consolidado para el modal

const TarotCardModal = ({ isOpen, onClose, tarotReading }) => {
  if (!isOpen || !tarotReading) return null;

  const { isPremium } = useAuth(); // Obtener el estado premium del usuario

  const handleBackdropClick = (e) => {
    // Cierra el modal solo si se hace clic directamente en el fondo
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Determinar el color del spotlight (el brillo que sigue al ratón)
  // Puedes ajustar estos colores a tu gusto
  const spotlightColor = tarotReading.is_premium ? 'rgba(255, 223, 0, 0.2)' : 'rgba(100, 100, 255, 0.2)';

  // Contenido para la hoja de papel
  const getPaperSheetContent = () => {
    let content = '';
    // Para usuarios Premium: description, full_meaning, practice_text
    if (isPremium()) {
      content += tarotReading.card.description ? `Descripción: ${tarotReading.card.description}\n\n` : '';
      content += tarotReading.card.full_meaning ? `Significado Completo: ${tarotReading.card.full_meaning}\n\n` : '';
      content += tarotReading.card.practice_text ? `Práctica Sugerida: ${tarotReading.card.practice_text}` : '';
    } else {
      // Para usuarios NO Premium: solo description
      content += tarotReading.card.description ? `Descripción: ${tarotReading.card.description}` : '';
    }
    return content.trim(); // Elimina espacios extra al inicio/final
  };

  return (
    <div className="tarot-modal-backdrop" onClick={handleBackdropClick}>
      <div className="tarot-modal-container">
        <button 
          className="tarot-modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <i className="fas fa-times"></i>
        </button>
        
        <div className="tarot-modal-content">
          {/* Columna de la carta holográfica */}
          <div className="tarot-card-column">
            <ProfileCard
              // Pasamos la URL de la imagen de la carta como avatarUrl (ahora se usará como fondo)
              avatarUrl={tarotReading.card.image_url} 
              // Solo pasamos el título a la carta
              mainTitle={tarotReading.card.title} 
              className="tarot-modal-card" // Clases CSS para el estilo específico del modal
              spotlightColor={spotlightColor} // Pasa el color del spotlight al SpotlightCard
            />
          </div>

          {/* Columna de la hoja de papel con el texto completo */}
          <div className="paper-sheet-column">
            <div className="paper-sheet-content">
              <h3 className="paper-sheet-title">{tarotReading.card.title}</h3>
              <p className="paper-sheet-text">{getPaperSheetContent()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TarotCardModal;
