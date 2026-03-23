import React from 'react';
import './Toast.css';

const Toast = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'OK';
      case 'error':
        return 'ERR';
      case 'warning':
        return 'WARN';
      case 'info':
      default:
        return 'INFO';
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
        <button type="button" className="toast-close" onClick={() => onRemove(toast.id)}>
          x
        </button>
      )}
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast, position = 'top-right' }) => {
  return (
    <div className={`toast-container toast-${position}`}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
export default ToastContainer;
