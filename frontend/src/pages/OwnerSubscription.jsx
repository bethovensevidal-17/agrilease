import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BadgeCheck, CalendarCheck, CalendarDays, Check, ShieldCheck, Layers, Activity, CalendarClock, Package } from 'lucide-react';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import './subscription-review.css';

const PLAN_ICONS = [CalendarDays, CalendarCheck, ShieldCheck, BadgeCheck];
const cap = v => String(v || '—').replace(/_/g, ' ');
const fmtDate = v => v ? new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Awaiting verification';
const peso = value => Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

export default function OwnerSubscription() {
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [pending, setPending] = useState(null);
  const [grace, setGrace] = useState(null);
  const [payments, setPayments] = useState([]);
  const [method, setMethod] = useState('gcash');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load(quiet = false) {
    try {
      const [planResult, mine, paymentResult] = await Promise.all([
        api('/subscriptions/plans'),
        api('/subscriptions/mine'),
        api('/subscriptions/payments')
      ]);

      setPlans(planResult.data || []);
      setCurrent(mine.subscription || null);
      setEquipmentCount(Number(mine.equipment_count || 0));
      setPending(mine.pending_subscription || null);
      setGrace(mine.grace || null);
      setPayments(paymentResult.data || []);
    } catch (err) {
      if (!quiet) setError(err.message || 'Unable to load subscriptions.');
    }
  }

  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true));

  async function choosePlan(plan) {
    setError(''); setMessage('');
    if (busy || pending) return;
    if (Number(plan.price) === 0) {
      if (!await window.agrileaseDialog.confirm(`Activate your one-time ${plan.duration_days}-day Free Trial${plan.equipment_limit ? ` with up to ${plan.equipment_limit} equipment listings` : ''}?`)) return;
      setBusy(true);
      try {
        const result = await api('/subscriptions/request', { method: 'POST', body: { plan_id: plan.id } });
        setMessage(result.message || 'Free trial activated.');
        await load();
      } catch (err) { setError(err.message); }
      finally { setBusy(false); }
      return;
    }
    if (!await window.agrileaseDialog.confirm(`Submit your payment and request for the ${plan.plan_name} plan? The plan activates after the administrator verifies your payment.`, { title: 'Submit subscription request', confirmText: 'Submit' })) return;
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

  const isActive = current && String(current.status).toLowerCase() === 'active';
  const daysLeft = isActive && current.end_date
    ? Math.ceil((new Date(String(current.end_date).replace(' ', 'T')).getTime() - Date.now()) / 86400000)
    : null;
  const expiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const fmtShort = v => v ? new Date(v).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const paidPlans = plans.filter(plan => Number(plan.price) !== 0).sort((a, b) => Number(a.duration_days) - Number(b.duration_days));
  const trialPlan = plans.find(plan => Number(plan.price) === 0);

  return <section className="am-page sub-page">
    {error && <div className="um-message error">{error}</div>}
    {message && <div className="um-message success">{message}</div>}
    {pending && <div className="sub-banner info"><strong>Payment submitted, waiting for verification</strong>Your {pending.plan_name} request is being checked by the administrator. Your plan starts automatically once it is verified, and you will get a notification. You cannot submit another request until then.</div>}
    {expiringSoon && <div className="sub-banner warn"><strong>Your plan expires {daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}</strong>Renew now to avoid interruption. If you renew early, your remaining days are kept and the new plan continues after it.</div>}
    {!isActive && grace?.in_grace && <div className="sub-banner warn"><strong>Your plan has expired</strong>Your listings stay visible until {fmtShort(grace.grace_ends_at)}. Renew before then so farmers can still book your equipment.</div>}
    {!isActive && grace?.listings_hidden && <div className="sub-banner danger"><strong>Your listings are hidden</strong>Your plan expired on {fmtShort(grace.last_end)}, so farmers cannot see or book your equipment. Renew a plan to show them again.</div>}
    <div className="um-panel sub-panel">
      <div className="sub-panel-head"><h2>Current Subscription</h2>{current && <span className={`sub-pill st-${String(current.status || '').toLowerCase()}`}>{cap(current.status)}</span>}</div>
      {current ? (() => { const limit = current.equipment_limit; const pct = limit == null || Number(limit) === 0 ? 0 : Math.min(100, Math.round(equipmentCount / Number(limit) * 100)); return <div className="sub-current-grid">
        <div className="sub-stat"><span className="sub-stat-icon"><Layers size={18} /></span><div><small>Plan</small><strong>{current.plan_name}</strong></div></div>
        <div className="sub-stat"><span className="sub-stat-icon"><Activity size={18} /></span><div><small>Status</small><strong>{cap(current.status)}</strong></div></div>
        <div className="sub-stat"><span className="sub-stat-icon"><CalendarClock size={18} /></span><div><small>Expires</small><strong>{fmtDate(current.end_date)}</strong></div></div>
        <div className="sub-stat"><span className="sub-stat-icon"><Package size={18} /></span><div><small>Equipment used</small><strong>{equipmentCount} / {limit == null ? 'Unlimited' : limit}</strong>{limit != null && <i className="sub-meter"><b style={{ width: pct + '%' }} /></i>}</div></div>
      </div>; })() : <p className="sub-empty-note">No active subscription found. Choose a plan below to list equipment.</p>}
    </div>
    <div className="um-panel sub-panel">
      <div className="sub-panel-head"><h2>Subscription Payment History</h2></div>

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
              <th>Note</th>
            </tr>
          </thead>

          <tbody>
            {payments.length > 0 ? (
              payments.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.plan_name || '—'}</td>
                  <td>{peso(payment.amount)}</td>
                  <td className="sub-cap">{cap(payment.payment_method)}</td>
                  <td>{payment.reference_number || '—'}</td>
                  <td><span className={`sub-pill st-${String(payment.payment_status || '').toLowerCase()}`}>{cap(payment.payment_status)}</span></td>
                  <td>
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString('en-PH')
                      : '—'}
                  </td>
                  <td>{payment.rejection_reason || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="um-empty">
                  No subscription payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    <div className="um-panel sub-panel">
      <div className="sub-panel-head"><h2>Online Payment Details</h2></div>
      <p className="sub-empty-note">For paid plans, submit your payment reference and proof. Your plan activates only after Admin verification.</p>
      <div className="sub-pay-fields">
        <label>Payment method <select value={method} onChange={e=>setMethod(e.target.value)}><option value="gcash">GCash</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select></label>
        <label>Reference number <input value={reference} onChange={e=>setReference(e.target.value)} maxLength={100} /></label>
        <label>Proof of payment (JPG/PNG/WEBP, max 5MB) <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setProof(e.target.files?.[0] || null)} /></label>
      </div>
    </div>
    {!current && trialPlan && <div className="sub-trial"><div><strong>{trialPlan.plan_name}</strong><span>{trialPlan.description || `One-time ${trialPlan.duration_days}-day trial.`}</span></div><button type="button" className="um-refresh" disabled={busy || Boolean(pending)} onClick={()=>choosePlan(trialPlan)}>{busy ? 'Please wait...' : 'Start Free Trial'}</button></div>}
    <div className="sub-plan-grid">
      {paidPlans.map((plan, index) => { const Icon = PLAN_ICONS[index % PLAN_ICONS.length]; return <article className="sub-plan-card" key={plan.id}>
        <span className="sub-plan-icon"><Icon size={22} strokeWidth={1.8} /></span>
        <h3>{plan.plan_name}</h3>
        <div className="sub-plan-price"><strong>{peso(plan.price)}</strong><small>/ {plan.duration_days} days</small></div>
        <ul className="sub-plan-list">
          <li><Check size={15} strokeWidth={2.4} />{plan.equipment_limit == null ? 'Unlimited equipment listings' : `Up to ${plan.equipment_limit} equipment listings`}</li>
          {plan.description && <li><Check size={15} strokeWidth={2.4} />{plan.description}</li>}
        </ul>
        <button type="button" className="um-refresh sub-plan-btn" disabled={busy || Boolean(pending)} onClick={()=>choosePlan(plan)}>{busy ? 'Please wait...' : pending ? 'Waiting for verification' : isActive ? 'Submit Payment & Renew' : 'Submit Payment & Request Plan'}</button>
      </article>; })}
    </div>
  </section>;
}
