import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { CmrProvider } from './context/CmrContext';
import './index.css';
import './analytics.css';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.log('SW registration note:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CmrProvider>
      <App />
    </CmrProvider>
  </React.StrictMode>
);

