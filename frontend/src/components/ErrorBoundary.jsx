import React from 'react';
import logger from '../services/logger';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to logger
    logger.error('React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now()
    });

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReporting(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Reload the page if reset doesn't work
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <span>⚠️</span>
            </div>
            
            <h1 className="error-title">
              Oops! Une erreur est survenue
            </h1>
            
            <p className="error-message">
              Nous sommes désolés, mais quelque chose s'est mal passé. 
              Notre équipe a été notifiée et travaille sur une solution.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Details de l'erreur (développement)</summary>
                <div className="error-stack">
                  <h4>Message:</h4>
                  <pre>{this.state.error.toString()}</pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre>{this.state.error.stack}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="error-actions">
              <button 
                onClick={this.handleReset}
                className="btn btn-primary"
              >
                Réessayer
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="btn btn-secondary"
              >
                Retour à l'accueil
              </button>
            </div>

            <div className="error-help">
              <h4>Que pouvez-vous faire ?</h4>
              <ul>
                <li>Rafraîchir la page et réessayer</li>
                <li>Vérifier votre connexion internet</li>
                <li>Contacter notre support si le problème persiste</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
