import React from 'react';
import './Loading.css';

const Loading = ({ 
  size = 'medium',
  text = 'Chargement...',
  fullScreen = false,
  overlay = false
}) => {
  const LoadingSpinner = () => (
    <div className={`loading-spinner loading-${size}`}>
      <div className="spinner-circle"></div>
      <div className="spinner-circle"></div>
      <div className="spinner-circle"></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-content">
          <LoadingSpinner />
          {text && <p className="loading-text">{text}</p>}
        </div>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <LoadingSpinner />
          {text && <p className="loading-text">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-inline">
      <LoadingSpinner />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default Loading;
