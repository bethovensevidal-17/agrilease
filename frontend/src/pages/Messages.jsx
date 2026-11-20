import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, getUser, getToken } from '../api/client';
import { isNetworkFailure, newRequestId, queueMessage, requestSync } from '../offline/sync';
import { chatSocketUrl } from '../api/socket';

// Real-time chat gamit ang WebSocket (ws://.../ws). Ang pagse-send ay dumadaan pa rin sa REST API
// (para gumana ang offline queue); ang bagong message ay ibinabalik agad ng server sa receiver sa WebSocket.
// Kung naputol ang WebSocket, awtomatikong magre-reconnect at babalik muna sa polling habang walang koneksyon.
export default function Messages() {
  const user = getUser();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const selectedId = selected?.user_id;
  const bottomRef = useRef(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [live, setLive] = useState(false); // true kapag bukas ang WebSocket
  const selectedIdRef = useRef(null);
  const loadersRef = useRef({});

  const loadContacts = useCallback(async (quiet = false) => {
    try {
      const [available, conversations] = await Promise.all([
        api('/messages/contacts'), api('/messages/conversations'),
      ]);
      const merged = new Map();
      (available.data || []).forEach(item => merged.set(Number(item.user_id), item));
      (conversations.data || []).forEach(item => merged.set(Number(item.user_id), { ...merged.get(Number(item.user_id)), ...item }));
      const list = [...merged.values()];
      setContacts(list);
      setSelected(current => current || list[0] || null);
      if (!quiet) setError('');
    } catch (e) { setError(e.message || 'Unable to load conversations.'); }
    finally { setLoading(false); }
  }, []);

  const loadMessages = useCallback(async (quiet = false) => {
    if (!selectedId) { setMessages([]); return; }
    try {
      const result = await api(`/messages/${selectedId}`);
      setMessages(result.data || []);
      if (!quiet) setError('');
    } catch (e) { setError(e.message || 'Unable to load messages.'); }
  }, [selectedId]);

  useEffect(() => { selectedIdRef.current = selectedId; loadersRef.current = { loadMessages, loadContacts }; });
  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // WebSocket: bagong message agad, walang hinihintay na polling.
  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    let socket; let retry = 0; let retryTimer; let pingTimer; let stopped = false;

    const onIncoming = message => {
      const mine = Number(message.sender_id) === Number(user?.id);
      const otherId = mine ? Number(message.receiver_id) : Number(message.sender_id);
      if (otherId === Number(selectedIdRef.current)) {
        setMessages(list => (list.some(item => Number(item.id) === Number(message.id)) ? list : [...list, message]));
        if (!mine) loadersRef.current.loadMessages(true); // minamarkahan bilang nabasa na
      }
      loadersRef.current.loadContacts(true); // para sa unread badge at ayos ng contacts
    };

    const connect = () => {
      socket = new WebSocket(chatSocketUrl());
      socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token }));
      socket.onmessage = event => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'ready') {
          retry = 0; setLive(true);
          // Kunin ang mga message na nalampasan habang walang koneksyon.
          loadersRef.current.loadMessages(true); loadersRef.current.loadContacts(true);
          pingTimer = window.setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })); }, 25000);
        } else if (data.type === 'message') onIncoming(data.data);
      };
      socket.onclose = () => {
        setLive(false); window.clearInterval(pingTimer);
        if (!stopped) retryTimer = window.setTimeout(connect, Math.min(30000, 1000 * 2 ** retry++)); // 1s, 2s, 4s ... max 30s
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => { stopped = true; window.clearTimeout(retryTimer); window.clearInterval(pingTimer); socket?.close(); };
  }, [user?.id]);

  // Polling ay fallback lang kapag walang WebSocket.
  useEffect(() => {
    if (live || !selectedId) return undefined;
    const timer = window.setInterval(() => loadMessages(true), 2500);
    return () => window.clearInterval(timer);
  }, [live, loadMessages, selectedId]);
  useEffect(() => {
    const timer = window.setInterval(() => loadContacts(true), live ? 60000 : 15000);
    return () => window.clearInterval(timer);
  }, [live, loadContacts]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  // Messages written while offline are sent automatically once the connection returns.
  useEffect(() => {
    const onOnline = () => { requestSync({ release: true }); loadMessages(true); };
    const onSynced = () => { setQueuedCount(0); setError(''); loadMessages(true); loadContacts(true); };
    window.addEventListener('online', onOnline);
    window.addEventListener('agrilease:sync-complete', onSynced);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('agrilease:sync-complete', onSynced); };
  }, [loadMessages, loadContacts]);

  async function submit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !selectedId || sending) return;
    setSending(true);
    setError('');
    try {
      if (!navigator.onLine) {
        await queueMessage(selectedId, message, getToken());
        setQueuedCount(count => count + 1);
        setDraft('');
        setError('You are offline. Your message is saved and will be sent when your connection returns.');
      } else {
        try {
          await api('/messages', { method: 'POST', body: { receiver_id: selectedId, message }, headers: { 'X-Idempotency-Key': newRequestId() } });
          setDraft('');
          await Promise.all([loadMessages(true), loadContacts(true)]);
        } catch (requestError) {
          if (!isNetworkFailure(requestError)) throw requestError;
          await queueMessage(selectedId, message, getToken());
          setQueuedCount(count => count + 1);
          setDraft('');
          setError('The server could not be reached. Your message is saved and will be sent automatically.');
        }
      }
    } catch (e) { setError(e.message || 'Message could not be sent.'); }
    finally { setSending(false); }
  }

  const heading = useMemo(() => selected?.full_name || 'Select a conversation', [selected]);
  if (loading) return <main className="messages-page"><p>Loading conversations...</p></main>;
  return <main className="messages-page">
    <header><h1>Messages</h1><p>Chat with farmers and equipment owners connected through rental requests. <span className={`messages-live ${live ? 'on' : ''}`}>{live ? 'Live' : 'Reconnecting…'}</span>{queuedCount ? ` · ${queuedCount} message(s) waiting to send` : ''}</p></header>
    {error && <div role="alert" className="messages-error"><span>{error}</span><button type="button" onClick={() => { setError(''); loadContacts(); loadMessages(); }}>Retry</button></div>}
    <section className="messages-shell">
      <aside className="messages-contacts"><h2>Contacts</h2>{contacts.length === 0 && <p>No rental-related contacts yet. A conversation becomes available when you have a rental request with another account.</p>}{contacts.map(contact => <button type="button" key={contact.user_id} className={Number(selectedId) === Number(contact.user_id) ? 'active' : ''} onClick={() => { setSelected(contact); setError(''); }}><strong>{contact.full_name}</strong><small>{contact.role}</small>{Number(contact.unread_count) > 0 && <span className="messages-contact-unread">{Number(contact.unread_count) > 99 ? '99+' : contact.unread_count}</span>}</button>)}</aside>
      <div className="messages-thread"><div className="messages-thread-head"><strong>{heading}</strong>{selected && <small>{selected.role}</small>}</div>
        <div className="messages-list" aria-live="polite">{!selected && <p>Select a contact to start messaging.</p>}{selected && messages.length === 0 && <p>No messages yet. Send the first message.</p>}{messages.map(item => <div key={item.id} className={`message-bubble ${Number(item.sender_id) === Number(user?.id) ? 'mine' : ''}`}><p>{item.message}</p><time>{item.sent_at}</time></div>)}<div ref={bottomRef}/></div>
        <form className="messages-compose" onSubmit={submit}><input value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} placeholder={selected ? 'Write a message...' : 'Select a contact first'} disabled={!selected || sending}/><button disabled={!selected || !draft.trim() || sending}>{sending ? 'Sending…' : 'Send'}</button></form>
      </div>
    </section>
  </main>;
}
