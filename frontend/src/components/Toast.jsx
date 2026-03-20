import React from 'react';
import './Toast.css';

const Toast = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast-${toast.type} ${toast.className || ''}`}>
      <div className="toast-icon">
        {getIcon()}
      </div>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      {toast.duration !== 0 && (
        <button className="toast-close" onClick={() => onRemove(toast.id)}>
          ×
        </button>
      )}
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast, position = 'top-right' }) => {
  return (
    <div className={`toast-container toast-${position}`}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
export default ToastContainer;
