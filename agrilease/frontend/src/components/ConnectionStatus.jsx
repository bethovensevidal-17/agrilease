import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';

// Browser connectivity indicator; click it to open role-specific offline details.
export default function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Link
      to="/offline-access"
      className={`connection-status ${online ? 'is-online' : 'is-offline'}`}
      role="status"
      aria-live="polite"
      title="Open offline access and synchronization status"
    >
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
      <span>{online ? 'Online' : 'Offline'}</span>
    </Link>
  );
}
