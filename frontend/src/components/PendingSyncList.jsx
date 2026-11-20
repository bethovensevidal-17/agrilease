import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { readQueue } from '../offline/idb';
import { currentQueueOwner } from '../offline/sync';
import { getUser } from '../api/client';

const boxStyle = { border: '1px solid #e0c36a', background: '#fff8e1', color: '#5c4500', borderRadius: 10, padding: '12px 14px', margin: '0 0 16px' };
const failedStyle = { ...boxStyle, border: '1px solid #e5a3a3', background: '#fdecec', color: '#7a1f1f' };

// Shows actions saved on this device (offline) that have not reached the server yet.
// kind: 'booking' | 'equipment'. onSynced runs after the server accepts queued actions so the page can reload.
export default function PendingSyncList({ kind, onSynced }) {
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const owner = currentQueueOwner();
      const all = await readQueue();
      setItems(all.filter(item => item.kind === kind && (!item.ownerKey || item.ownerKey === owner)));
    } catch { setItems([]); }
  }, [kind]);

  useEffect(() => {
    refresh();
    const onSyncComplete = event => {
      refresh();
      if (event.detail?.processed > 0) onSynced?.();
    };
    window.addEventListener('agrilease:sync-complete', onSyncComplete);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      window.removeEventListener('agrilease:sync-complete', onSyncComplete);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, [refresh, onSynced]);

  const failed = items.filter(item => item.status === 'failed' || item.failed);
  const waiting = items.filter(item => !(item.status === 'failed' || item.failed));
  if (!items.length) return null;

  return <>
    {waiting.length > 0 && <div style={boxStyle} role="status">
      <strong>{waiting.length} item(s) pending sync</strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {waiting.map(item => <li key={item.id}>{item.label || 'Saved action'} — {item.status === 'auth' ? 'sign in again to sync' : 'waiting for internet'}</li>)}
      </ul>
      <small>Naka-save sa device na ito. Awtomatikong ipapadala kapag may internet na.</small>
    </div>}
    {failed.length > 0 && <div style={failedStyle} role="alert">
      <strong>{failed.length} item(s) were rejected by the server</strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {failed.map(item => <li key={item.id}>{item.label}: {item.lastError || 'Needs review'}</li>)}
      </ul>
      <Link to={`/${getUser()?.role || 'farmer'}/offline`}>Review in Offline Access</Link>
    </div>}
  </>;
}
