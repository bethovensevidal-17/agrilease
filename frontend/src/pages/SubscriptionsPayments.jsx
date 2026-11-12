import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Pagination from '../components/admin/Pagination';
import { BadgeCheck, QrCode, Truck } from 'lucide-react';

const PAGE_SIZE = 10;
const AGREED_PLANS = [
  { code: 'FREE-TRIAL', name: 'Free Trial', price: 0, duration_days: 7, equipment_limit: 3, note: 'One-time trial for new equipment owners' },
  { code: 'MONTHLY', name: 'Monthly', price: 199, duration_days: 30, equipment_limit: 3 },
  { code: 'QUARTERLY', name: 'Quarterly', price: 549, duration_days: 90, equipment_limit: 5 },
  { code: 'SEMI-ANNUAL', name: 'Semi-Annual', price: 999, duration_days: 180, equipment_limit: 10 },
  { code: 'ANNUAL', name: 'Annual', price: 1799, duration_days: 365, equipment_limit: null },
];

function money(value) {
  return Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}
function date(value) {
  return value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function SubscriptionsPayments() {
  const [data, setData] = useState({ subscriptions: [], plans: [], payments: [], subscriptionsConfigured: true, paymentsConfigured: false });
  const [tab, setTab] = useState('subscriptions');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const result = await api('/admin/subscriptions');
      setData({
        subscriptions: result.subscriptions || [],
        plans: result.plans || [],
        payments: result.payments || [],
        subscriptionsConfigured: result.subscriptionsConfigured !== false,
        paymentsConfigured: result.paymentsConfigured === true,
      });
    } catch (err) {
      setError(err.message || 'Unable to load subscription records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rows = tab === 'subscriptions' ? data.subscriptions : tab === 'plans' ? data.plans : data.payments;
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="am-page">
      <div className="admin-page-heading">
        <div>
          <h1>Subscriptions &amp; Payments</h1>
          <p>Manage AGRILEASE owner plans, subscription records, and accepted payment methods.</p>
        </div>
        <button className="um-refresh" type="button" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>

      <section className="um-panel am-plans-panel">
        <div className="um-panel-heading">
          <div><h2>AGRILEASE Subscription Plans</h2><p>Equipment owners pay for listing access. Farmers can browse and rent for free.</p></div>
          <span className="um-total">5 plans</span>
        </div>
        <div className="am-subscription-intro">
          <span><BadgeCheck size={18} /> Owners only</span>
          <p>Farmers can browse and rent equipment for free. Equipment owners receive a one-time 7-day trial after approval, then choose a paid plan to continue listing equipment.</p>
        </div>
        <div className="um-table-wrapper am-plan-table-wrap">
          <table className="um-table am-plan-table">
            <thead><tr><th>Plan</th><th>Price</th><th>Duration</th><th>Equipment Limit</th><th>Eligibility / Notes</th></tr></thead>
            <tbody>{AGREED_PLANS.map(plan => <tr key={plan.code}>
              <td><strong>{plan.name}</strong><small>{plan.code}</small></td>
              <td><strong>{plan.price === 0 ? 'FREE' : money(plan.price)}</strong></td>
              <td>{plan.duration_days} days</td>
              <td>{plan.equipment_limit == null ? 'Unlimited' : `${plan.equipment_limit} units`}</td>
              <td>{plan.note || (plan.code === 'ANNUAL' ? 'Best value for long-term owners' : 'For verified equipment owners')}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="am-note am-panel-note">Plan prices are the agreed AGRILEASE proposal. Before paid activation, confirm that the same values are configured in the database and payment verification is enabled.</p>
      </section>

      <section className="um-panel am-payment-panel">
        <div className="um-panel-heading"><div><h2>Accepted Payment Methods</h2><p>Payment options for equipment-owner subscriptions.</p></div></div>
        <div className="am-payment-grid">
          <article className="am-payment-card">
            <div className="am-payment-heading"><span className="am-payment-icon maya"><QrCode size={22} /></span><div><h3>Maya via QR Code</h3><p>Scan the official AGRILEASE Maya QR code to pay.</p></div></div>
            <div className="am-qr-placeholder"><QrCode size={52} /><strong>Maya QR code image not yet added</strong><span>Insert the official Maya merchant QR image here before accepting QR payments. Do not use a sample or generated QR.</span></div>
            <span className="am-payment-footnote">Admin must verify the actual Maya transaction before marking a subscription payment as paid.</span>
          </article>
          <article className="am-payment-card">
            <div className="am-payment-heading"><span className="am-payment-icon cod"><Truck size={22} /></span><div><h3>Cash on Delivery (COD)</h3><p>Cash collection for subscription payment.</p></div></div>
            <div className="am-cod-details"><span className="am-cod-status">Available payment option</span><strong>Cash on Delivery</strong><p>The equipment owner pays the subscription fee in cash to the authorized AGRILEASE representative. Record the payment only after the money is received.</p></div>
            <span className="am-payment-footnote">COD is shown as a payment option; it does not automatically collect or verify payment.</span>
          </article>
        </div>
      </section>

      {!data.subscriptionsConfigured && <div className="am-warning">The subscriptions table is not available in the connected database. No database changes were made.</div>}
      {!data.paymentsConfigured && <div className="am-warning">Payment recording and verification are not connected yet. Maya QR and COD are displayed as payment methods only; no payment is automatically marked as paid.</div>}
      {error && <div className="um-message error">{error}</div>}

      <section className="um-panel">
        <div className="am-tabs">
          <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => { setTab('subscriptions'); setPage(1); }}>Owner Subscriptions</button>
          <button className={tab === 'plans' ? 'active' : ''} onClick={() => { setTab('plans'); setPage(1); }}>Database Plans</button>
          <button className={tab === 'payments' ? 'active' : ''} onClick={() => { setTab('payments'); setPage(1); }}>Payment Records</button>
        </div>
        <div className="um-panel-heading">
          <div><h2>{tab === 'subscriptions' ? 'Owner Subscriptions' : tab === 'plans' ? 'Configured Database Plans' : 'Subscription Payment Records'}</h2><p>{rows.length} records found</p></div>
          <span className="um-total">{rows.length} records</span>
        </div>
        <div className="um-table-wrapper">
          <table className="um-table">
            {tab === 'subscriptions' ? <>
              <thead><tr><th>Owner</th><th>Plan</th><th>Price</th><th>Method</th><th>Start</th><th>Expiry</th><th>Status</th></tr></thead>
              <tbody>{loading ? <tr><td colSpan="7" className="um-empty">Loading...</td></tr> : shown.length ? shown.map(s => <tr key={s.id}><td>{s.owner_name || `Owner #${s.owner_id || '—'}`}</td><td>{s.plan_name || '—'}</td><td>{money(s.price)}</td><td>{s.method || '—'}</td><td>{date(s.starts_at)}</td><td>{date(s.ends_at)}</td><td><span className={`am-pill ${s.status || ''}`}>{s.status || 'Not recorded'}</span></td></tr>) : <tr><td colSpan="7" className="um-empty">No subscription records found.</td></tr>}</tbody>
            </> : tab === 'plans' ? <>
              <thead><tr><th>Plan</th><th>Code</th><th>Price</th><th>Duration</th><th>Equipment Limit</th></tr></thead>
              <tbody>{loading ? <tr><td colSpan="5" className="um-empty">Loading...</td></tr> : shown.length ? shown.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.code || '—'}</td><td>{money(p.price)}</td><td>{p.duration_days ?? '—'} days</td><td>{p.equipment_limit == null ? 'Unlimited' : p.equipment_limit}</td></tr>) : <tr><td colSpan="5" className="um-empty">No configured database plans found yet.</td></tr>}</tbody>
            </> : <>
              <thead><tr><th>Payment ID</th><th>Owner</th><th>Amount</th><th>Reference</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{loading ? <tr><td colSpan="6" className="um-empty">Loading...</td></tr> : shown.length ? shown.map(p => <tr key={p.id}><td>#{p.id}</td><td>{p.owner_name || '—'}</td><td>{money(p.amount)}</td><td>{p.reference || '—'}</td><td><span className={`am-pill ${p.status || ''}`}>{p.status || '—'}</span></td><td>{date(p.created_at)}</td></tr>) : <tr><td colSpan="6" className="um-empty">No subscription payment records found.</td></tr>}</tbody>
            </>}
          </table>
        </div>
        {!loading && <Pagination totalItems={rows.length} itemsPerPage={PAGE_SIZE} currentPage={page} onPageChange={setPage} />}
      </section>
    </div>
  );
}
