import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import GlobalDialogHost from './components/GlobalDialogHost.jsx';
import './styles.css';
import './ui-consistency.css';
import './theme.css';
import './theme-phase3.css';
import './theme-modals.css';
import './theme-farmer.css';
import './theme-owner.css';
import './theme-controls.css';
import './theme-admin.css';
import './theme-views.css';
import { requestSync } from './offline/sync';
import { resyncPushSubscription } from './utils/push';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.error('PWA service worker registration failed:', error));
    if (navigator.onLine) {
      // Send anything that was saved on this device earlier, then make sure push alerts reach the signed-in account.
      requestSync({ release: true });
      resyncPushSubscription();
    }
  });

  // The connection came back: release actions saved while offline and send them to the server.
  window.addEventListener('online', () => requestSync({ release: true }));

  // Keep retrying while online so temporary server problems do not leave actions waiting forever.
  window.setInterval(() => { if (navigator.onLine && !document.hidden) requestSync(); }, 30000);

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'BACKGROUND_SYNC_COMPLETE') {
      window.dispatchEvent(new CustomEvent('agrilease:sync-complete', { detail: event.data }));
    }
    if (event.data?.type === 'NOTIFICATION_NAVIGATE' && typeof event.data.url === 'string' && event.data.url.startsWith('/') && !event.data.url.startsWith('//')) {
      window.history.pushState({}, '', event.data.url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <><App /><GlobalDialogHost /></>
    </BrowserRouter>
  </React.StrictMode>
);
