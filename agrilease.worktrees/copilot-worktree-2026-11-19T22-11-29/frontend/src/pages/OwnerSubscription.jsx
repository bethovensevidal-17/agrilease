import { useEffect, useState } from 'react';
import { api } from '../api/client';

const peso = value => Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

export default function OwnerSubscription() {
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [payments, setPayments] = useState([]);
  const [method, setMethod] = useState('gcash');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [planResult, mine, paymentResult] = await Promise.all([
        api('/subscriptions/plans'),
        api('/subscriptions/mine'),
        api('/subscriptions/payments')
      ]);

      setPlans(planResult.data || []);
      setCurrent(mine.subscription || null);
      setEquipmentCount(Number(mine.equipment_count || 0));
      setPayments(paymentResult.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load subscriptions.');
    }
  }

  useEffect(() => { load(); }, []);

  async function choosePlan(plan) {
    setError(''); setMessage('');
    if (busy) return;
    if (Number(plan.price) === 0) {
      if (!window.confirm('Activate your one-time 7-day Free Trial with up to 2 equipment listings?')) return;
      setBusy(true);
      try {
        const result = await api('/subscriptions/request', { method: 'POST', body: { plan_id: plan.id } });
        setMessage(result.message || 'Free trial activated.');
        await load();
      } catch (err) { setError(err.message); }
      finally { setBusy(false); }
      return;
    }
    const form = new FormData();
    form.append('plan_id', String(plan.id));
    form.append('payment_method', method);
    form.append('reference_number', reference);
    if (proof) form.append('payment_proof', proof);
    setBusy(true);
    try {
      const result = await api('/subscriptions/request', { method: 'POST', formData: form });
      setMessage(result.message || 'Subscription request submitted.');
      setProof(null); setReference('');
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="am-page" style={{maxWidth: 1100, margin: '0 auto'}}>
    <div className="admin-page-heading"><div><h1>My Subscription</h1><p>Manage your equipment listing plan and subscription status.</p></div><button className="um-refresh" onClick={load}>Refresh</button></div>
    {error && <div className="um-message error">{error}</div>}
    {message && <div className="um-message success">{message}</div>}
    <div className="um-panel" style={{padding:20, marginBottom:20}}>
      <h2>Current Subscription</h2>
      {current ? <p><strong>{current.plan_name}</strong> · {current.status} · Expires: {current.end_date || 'Awaiting verification'} · Equipment: {equipmentCount}/{current.equipment_limit == null ? 'Unlimited' : current.equipment_limit}</p> : <p>No active subscription found. Choose a plan below to list equipment.</p>}
    </div>
    <div className="um-panel" style={{ padding: 20, marginBottom: 20 }}>
      <h2>Subscription Payment History</h2>

      <div className="um-table-wrapper">
        <table className="um-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Payment Date</th>
            </tr>
          </thead>

          <tbody>
            {payments.length > 0 ? (
              payments.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.plan_name || '—'}</td>
                  <td>{peso(payment.amount)}</td>
                  <td>{payment.payment_method || '—'}</td>
                  <td>{payment.reference_number || '—'}</td>
                  <td>{payment.payment_status || '—'}</td>
                  <td>
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString('en-PH')
                      : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="um-empty">
                  No subscription payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    <div className="um-panel" style={{padding:20, marginBottom:20}}>
      <h2>Online Payment Details</h2>
      <p>For paid plans, submit your payment reference and proof. Your plan activates only after Admin verification.</p>
      <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:12}}>
        <label>Payment method <select value={method} onChange={e=>setMethod(e.target.value)}><option value="gcash">GCash</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select></label>
        <label>Reference number <input value={reference} onChange={e=>setReference(e.target.value)} maxLength={100} /></label>
        <label>Proof of payment (JPG/PNG/WEBP, max 5MB) <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setProof(e.target.files?.[0] || null)} /></label>
      </div>
    </div>
    <div className="am-stats" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16}}>
      {plans.map(plan => <article className="um-panel" key={plan.id} style={{padding:20}}>
        <h3>{plan.plan_name}</h3><h2>{Number(plan.price) === 0 ? 'FREE' : peso(plan.price)}</h2>
        <p>{plan.duration_days} days</p>
        <p>{plan.equipment_limit == null ? 'Unlimited equipment listings' : `Up to ${plan.equipment_limit} equipment listings`}</p>
        <p>{plan.description}</p>
        <button className="um-refresh" disabled={busy} onClick={()=>choosePlan(plan)}>{busy ? 'Please wait...' : Number(plan.price) === 0 ? 'Start Free Trial' : 'Submit Payment & Request Plan'}</button>
      </article>)}
    </div>
  </section>;
}
