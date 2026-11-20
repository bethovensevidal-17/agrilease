import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function GlobalDialogHost() {
  const [dialog, setDialog] = useState(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    const api = {
      confirm: (message, options = {}) => new Promise(resolve => setDialog({ type: 'confirm', title: options.title || 'Confirm action', message, confirmText: options.confirmText || 'Confirm', resolve })),
      alert: (message, options = {}) => new Promise(resolve => setDialog({ type: 'alert', title: options.title || 'Notice', message, confirmText: options.confirmText || 'OK', resolve })),
      prompt: (message, options = {}) => new Promise(resolve => { setInput(options.defaultValue || ''); setDialog({ type: 'prompt', title: options.title || 'Additional information', message, placeholder: options.placeholder || '', confirmText: options.confirmText || 'Submit', resolve }); })
    };
    window.agrileaseDialog = api;
    return () => { delete window.agrileaseDialog; };
  }, []);

  if (!dialog) return null;
  const finish = value => { const resolve = dialog.resolve; setDialog(null); resolve?.(value); };
  return createPortal(
    <div className="al-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) finish(dialog.type === 'prompt' ? null : false); }}>
      <section className="al-dialog" role="dialog" aria-modal="true" aria-labelledby="al-dialog-title">
        <div className="al-dialog-mark">A</div>
        <h2 id="al-dialog-title">{dialog.title}</h2>
        <p>{dialog.message}</p>
        {dialog.type === 'prompt' && <textarea autoFocus value={input} onChange={event => setInput(event.target.value)} placeholder={dialog.placeholder} rows={4} />}
        <div className="al-dialog-actions">
          {dialog.type !== 'alert' && <button type="button" className="al-dialog-cancel" onClick={() => finish(dialog.type === 'prompt' ? null : false)}>Cancel</button>}
          <button type="button" className="al-dialog-confirm" onClick={() => finish(dialog.type === 'prompt' ? input : true)}>{dialog.confirmText}</button>
        </div>
      </section>
    </div>, document.body
  );
}
