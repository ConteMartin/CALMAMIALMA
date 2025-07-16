import React from 'react';
import ProfileCard from './ProfileCard';
import './TarotCardModal.css';

const TarotCardModal = ({ isOpen, onClose, tarotReading }) => {
  if (!isOpen || !tarotReading) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
          <ProfileCard
            name={tarotReading.card.title}
            title={tarotReading.card.description}
            practiceText={tarotReading.card.practice_text}
            avatarUrl={tarotReading.card.image_url}
            showUserInfo={false}
            enableTilt={true}
            className="tarot-modal-card"
            // Configuración para fondo holográfico negro
            behindGradient="radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(0,0%,20%,var(--card-opacity)) 4%,hsla(0,0%,15%,calc(var(--card-opacity)*0.75)) 10%,hsla(0,0%,10%,calc(var(--card-opacity)*0.5)) 50%,hsla(0,0%,5%,0) 100%),radial-gradient(35% 52% at 55% 20%,#333333c4 0%,#00000000 100%),radial-gradient(100% 100% at 50% 50%,#666666ff 1%,#00000000 76%),conic-gradient(from 124deg at 50% 50%,#444444ff 0%,#222222ff 40%,#222222ff 60%,#444444ff 100%)"
            innerGradient="linear-gradient(145deg,#1a1a1a 0%,#2a2a2a 100%)"
            onContactClick={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default TarotCardModal;