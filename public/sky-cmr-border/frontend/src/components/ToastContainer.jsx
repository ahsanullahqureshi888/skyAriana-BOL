import React from 'react';
import { useCmr } from '../context/CmrContext';

export const ToastContainer = () => {
  const { toasts } = useCmr();

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
