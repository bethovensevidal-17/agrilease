import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(error => console.error('PWA service worker registration failed:', error)));
  window.addEventListener('online', async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.sync) await registration.sync.register('agrilease-background-sync');
      (registration.active || navigator.serviceWorker.controller)?.postMessage({ type: 'FLUSH_BACKGROUND_QUEUE' });
    } catch (error) {
      console.warn('Background sync registration failed:', error);
      navigator.serviceWorker.controller?.postMessage({ type: 'FLUSH_BACKGROUND_QUEUE' });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
