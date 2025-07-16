import React from 'react';
import ProfileCard from './ProfileCard.jsx';
import './TarotDetailsModal.css'; // Nuevo CSS para el modal

const TarotDetailsModal = ({ isOpen, onClose, cardData }) => {
  if (!isOpen || !cardData) return null;

  return (
    <div className="tarot-modal-overlay" onClick={onClose}>
      <div className="tarot-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="tarot-modal-close" onClick={onClose}>&times;</button>
        <div className="tarot-modal-body">
          {/* Lado izquierdo: ProfileCard con la imagen de la carta */}
          <div className="tarot-modal-card-container">
            <ProfileCard
              mainTitle={cardData.title}
              // No pasamos mainText o practiceText a ProfileCard aquí si ya están en el lado derecho
              avatarUrl={cardData.imageUrlBack} // Usa la imagen del reverso de la carta de tarot
              enableTilt={false} // Deshabilita el efecto de inclinación para el modal
              cardBackground="#1A1A1A" // Fondo oscuro para la tarjeta dentro del modal
              className="tarot-modal-profile-card" // Clase personalizada para estilos específicos del modal
            />
          </div>
          {/* Lado derecho: Texto detallado de la lectura */}
          <div className="tarot-modal-text-container custom-scrollbar">
            <h3 className="tarot-modal-text-title">{cardData.title}</h3>
            <p className="tarot-modal-main-text">{cardData.mainText}</p>
            {cardData.practiceText && (
              <div className="tarot-modal-practice-text">
                <p>{cardData.practiceText}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TarotDetailsModal;
