import { useState } from 'react';
import { api } from '../api/client';
function decodeKey(value) { const padding='='.repeat((4-value.length%4)%4); const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'); const raw=atob(base64); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0))); }
export default function PushNotificationSetup() {
  const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false);
  async function enable() {
    setBusy(true);setStatus('');
    try {
      if(!('serviceWorker'in navigator)||!('PushManager'in window)) throw new Error('This browser does not support web push notifications.');
      const permission=await Notification.requestPermission(); if(permission!=='granted') throw new Error('Notification permission was not granted.');
      const key=await api('/push/public-key'); if(!key.enabled) throw new Error(key.error||'Push notifications are not configured.');
      const registration=await navigator.serviceWorker.ready;
      const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key.publicKey)});
      await api('/push/subscribe',{method:'POST',body:{subscription:subscription.toJSON()}});
      setStatus('Browser push notifications are enabled on this device.');
    } catch(e) { setStatus(e.message||'Could not enable push notifications.'); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true);try{const registration=await navigator.serviceWorker.ready;const sub=await registration.pushManager.getSubscription();if(sub){await api('/push/subscribe',{method:'DELETE',body:{endpoint:sub.endpoint}});await sub.unsubscribe();}setStatus('Push notifications disabled on this device.');}catch(e){setStatus(e.message||'Could not disable notifications.');}finally{setBusy(false);}
  }
  return <section className="um-panel" style={{marginBottom:18,padding:16}}><div className="um-panel-heading"><div><h2>Browser Push Notifications</h2><p>Receive alerts even when AgriLease is not open in this tab.</p></div><div className="am-actions"><button className="am-button approve" onClick={enable} disabled={busy}>{busy?'Please wait…':'Enable Push'}</button><button className="um-refresh" onClick={disable} disabled={busy}>Disable</button></div></div>{status&&<p role="status">{status}</p>}</section>;
}
