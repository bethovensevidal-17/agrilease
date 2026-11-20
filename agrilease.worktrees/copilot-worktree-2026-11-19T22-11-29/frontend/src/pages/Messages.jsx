import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getUser } from '../api/client';

export default function Messages() {
  const user = getUser();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const selectedId = selected?.user_id;

  const loadContacts = useCallback(async () => {
    try {
      const [available, conversations] = await Promise.all([api('/messages/contacts'), api('/messages/conversations')]);
      const merged = new Map();
      (available.data || []).forEach(item => merged.set(item.user_id, item));
      (conversations.data || []).forEach(item => merged.set(item.user_id, { ...merged.get(item.user_id), ...item }));
      const list = [...merged.values()];
      setContacts(list);
      if (!selectedId && list.length) setSelected(list[0]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [selectedId]);

  const loadMessages = useCallback(async () => {
    if (!selectedId) { setMessages([]); return; }
    try { const result = await api(`/messages/${selectedId}`); setMessages(result.data || []); }
    catch (e) { setError(e.message); }
  }, [selectedId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => {
    loadMessages();
    const timer = window.setInterval(loadMessages, 5000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  async function submit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !selectedId) return;
    setDraft('');
    try { await api('/messages', { method: 'POST', body: { receiver_id: selectedId, message } }); await loadMessages(); }
    catch (e) { setDraft(message); setError(e.message); }
  }

  const heading = useMemo(() => selected?.full_name || 'Select a conversation', [selected]);
  if (loading) return <main className="messages-page"><p>Loading conversations...</p></main>;
  return <main className="messages-page">
    <header><h1>Messages</h1><p>Chat with farmers and equipment owners connected through rental requests.</p></header>
    {error && <p role="alert" className="messages-error">{error}</p>}
    <section className="messages-shell">
      <aside className="messages-contacts"><h2>Contacts</h2>{contacts.length === 0 && <p>No rental-related contacts yet.</p>}{contacts.map(contact => <button key={contact.user_id} className={selectedId === contact.user_id ? 'active' : ''} onClick={() => { setSelected(contact); setError(''); }}><strong>{contact.full_name}</strong><small>{contact.role}</small></button>)}</aside>
      <div className="messages-thread"><div className="messages-thread-head"><strong>{heading}</strong>{selected && <small>{selected.role}</small>}</div>
        <div className="messages-list" aria-live="polite">{!selected && <p>Select a contact to start messaging.</p>}{selected && messages.length === 0 && <p>No messages yet. Send the first message.</p>}{messages.map(item => <div key={item.id} className={`message-bubble ${Number(item.sender_id) === Number(user?.id) ? 'mine' : ''}`}><p>{item.message}</p><time>{item.sent_at}</time></div>)}</div>
        <form className="messages-compose" onSubmit={submit}><input value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} placeholder={selected ? 'Write a message...' : 'Select a contact first'} disabled={!selected}/><button disabled={!selected || !draft.trim()}>Send</button></form>
      </div>
    </section>
  </main>;
}
