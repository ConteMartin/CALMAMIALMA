import React from 'react';
import './SpotlightCard.css';

const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(0, 229, 255, 0.2)' }) => {
  return (
    <div 
      className={`spotlight-card ${className}`}
      style={{ '--spotlight-color': spotlightColor }}
    >
      <div className="spotlight-content">
        {children}
      </div>
    </div>
  );
};

export default SpotlightCard;