import React, { useState, useEffect } from 'react';

/**
 * Toast notification component for displaying temporary messages
 * 
 * @param {Object} props Component properties
 * @param {string} props.message Message to display
 * @param {string} props.type Type of notification (success, info, warning, error)
 * @param {number} props.duration Duration in ms before auto-hide (default: 3000ms)
 * @param {Function} props.onClose Callback when notification is closed
 */
const ToastNotification = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Hide after duration
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // Give time for transition
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  return (
    <div 
      className={`toast-notification ${type} ${visible ? 'show' : ''}`}
      role="alert"
    >
      <div className="flex items-center">
        {type === 'success' && <span className="mr-2">✓</span>}
        {type === 'info' && <span className="mr-2">ℹ</span>}
        {type === 'warning' && <span className="mr-2">⚠</span>}
        {type === 'error' && <span className="mr-2">✗</span>}
        <span>{message}</span>
        <button 
          className="ml-3 text-gray-400 hover:text-white"
          onClick={() => {
            setVisible(false);
            if (onClose) {
              setTimeout(onClose, 300);
            }
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;

/**
 * Toast manager for showing notifications
 */
export const createToast = (() => {
  let toastId = 0;
  let toasts = [];
  let addToastCallback = null;
  let removeToastCallback = null;
  
  // Register callbacks
  const registerCallbacks = (add, remove) => {
    addToastCallback = add;
    removeToastCallback = remove;
  };
  
  // Create a new toast
  const showToast = (message, type = 'info', duration = 3000) => {
    const id = toastId++;
    const toast = { id, message, type, duration };
    
    toasts.push(toast);
    
    if (addToastCallback) {
      addToastCallback(toast);
    }
    
    return id;
  };
  
  // Remove a toast by ID
  const removeToast = (id) => {
    toasts = toasts.filter(toast => toast.id !== id);
    
    if (removeToastCallback) {
      removeToastCallback(id);
    }
  };
  
  // Success toast
  const success = (message, duration) => showToast(message, 'success', duration);
  
  // Info toast
  const info = (message, duration) => showToast(message, 'info', duration);
  
  // Warning toast
  const warning = (message, duration) => showToast(message, 'warning', duration);
  
  // Error toast
  const error = (message, duration) => showToast(message, 'error', duration);
  
  return {
    registerCallbacks,
    showToast,
    removeToast,
    success,
    info,
    warning,
    error
  };
})();

/**
 * Toast container component for managing multiple notifications
 */
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    // Register callbacks
    createToast.registerCallbacks(
      // Add toast
      (toast) => {
        setToasts(prev => [...prev, toast]);
      },
      // Remove toast
      (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }
    );
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => createToast.removeToast(toast.id)}
        />
      ))}
    </div>
  );
};