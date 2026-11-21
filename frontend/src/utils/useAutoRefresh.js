import { useEffect, useRef } from 'react';

// Runs `callback` quietly on a timer and whenever the tab becomes visible, regains focus, the connection
// returns, or an offline sync finishes. This replaces manual "Refresh" buttons.
export default function useAutoRefresh(callback, intervalMs = 15000, { offline = false } = {}) {
  const latest = useRef(callback);
  useEffect(() => { latest.current = callback; });
  useEffect(() => {
    const run = () => {
      if (document.hidden) return;
      if (!offline && !navigator.onLine) return;
      latest.current();
    };
    const timer = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    window.addEventListener('agrilease:sync-complete', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      window.removeEventListener('agrilease:sync-complete', run);
    };
  }, [intervalMs, offline]);
}
