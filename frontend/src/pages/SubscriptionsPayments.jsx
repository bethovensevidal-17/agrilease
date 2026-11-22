import { useEffect, useMemo, useRef, useState } from 'react';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
import './subscription-review.css';

const PAGE_SIZE = 8;
const EMPTY_PLAN = { id: null, plan_name: '', price: '', duration_days: '', equipment_limit: '', description: '', is_active: true };
const EMPTY_SUB = { owner_id: '', plan_id: '', start_date: '', record_payment: true };

const dayValue = value => (value ? String(value).slice(0, 10) : '');
const titleCase = value => String(value || '').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase());

function money(value) {
  return Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });
}

function date(value) {
  if (!value) return '—';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function sortById(a, b) {
  const idA = Number(a.id);
  const idB = Number(b.id);

  if (Number.isFinite(idA) && Number.isFinite(idB)) {
    return idA - idB;
  }

  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

function getSubscriptionCategory(subscription) {
  const status = String(subscription.status || '').toLowerCase();
  const plan = String(subscription.plan_name || '').toLowerCase();

  // Kapag lampas na ang expiry date, expired na kahit active pa ang naka-save na status.
  if (status === 'active' && subscription.ends_at) {
    const endsAt = new Date(subscription.ends_at);
    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() < Date.now()) return 'expired';
  }

  if (
    status.includes('trial') ||
    plan.includes('free trial') ||
    (subscription.subscription_type === 'trial' && status === 'active')
  ) {
    return 'trial';
  }

  if (status.includes('expired')) {
    return 'expired';
  }

  if (
    status.includes('pending') ||
    status.includes('awaiting')
  ) {
    return 'pending';
  }

  if (
    status === 'active' ||
    status === 'approved' ||
    status === 'verified'
  ) {
    return 'active';
  }

  if (subscription.ends_at) {
    const expiry = new Date(subscription.ends_at);

    if (
      !Number.isNaN(expiry.getTime()) &&
      expiry.getTime() < Date.now()
    ) {
      return 'expired';
    }
  }

  return status || 'unknown';
}

function statusClass(status) {
  return String(status || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
}

function StatusBadge({ status }) {
  const label = status
    ? String(status).replace(/[_-]/g, ' ')
    : 'Not recorded';

  return (
    <span className={`am-pill ${statusClass(status)}`}>
      {label}
    </span>
  );
}

function SummaryCard({ label, value, description }) {
  return (
    <article className="am-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className="am-subtext">{description}</small>
    </article>
  );
}


function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="sub-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="sub-modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}

export default function SubscriptionsPayments() {
  const [data, setData] = useState({
    subscriptions: [],
    plans: [],
    payments: [],
    subscriptionsConfigured: true,
    paymentsConfigured: false,
  });
  const [owners, setOwners] = useState([]);
  const recordsRef = useRef(null);

  const [tab, setTab] = useState('subscriptions');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [planForm, setPlanForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [adjustForm, setAdjustForm] = useState(null);
  const [review, setReview] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofState, setProofState] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load(silent = false) {
    try {
      if (!silent) { setLoading(true); setError(''); }

      const [result, ownerResult] = await Promise.all([
        api('/admin/subscriptions'),
        api('/admin/owners?status=verified').catch(() => ({ data: [] })),
      ]);

      setData({
        subscriptions: result.subscriptions || [],
        plans: result.plans || [],
        payments: result.payments || [],
        subscriptionsConfigured: result.subscriptionsConfigured !== false,
        paymentsConfigured: result.paymentsConfigured === true,
      });
      setOwners(ownerResult.data || []);
    } catch (err) {
      if (!silent) setError(err.message || 'Unable to load subscription records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true));

  const subscriptionStats = useMemo(() => {
    const counts = { active: 0, trial: 0, expired: 0, pending: 0 };
    data.subscriptions.forEach(subscription => {
      const category = getSubscriptionCategory(subscription);
      if (Object.prototype.hasOwnProperty.call(counts, category)) counts[category] += 1;
    });
    return counts;
  }, [data.subscriptions]);

  const rows = useMemo(() => {
    const source = tab === 'subscriptions' ? data.subscriptions : data.payments;
    const normalizedSearch = search.trim().toLowerCase();

    return [...source]
      .sort(sortById)
      .filter(record => {
        if (statusFilter !== 'all') {
          const status = tab === 'subscriptions'
            ? getSubscriptionCategory(record)
            : String(record.status || 'unknown').toLowerCase();
          if (status !== statusFilter) return false;
        }
        if (!normalizedSearch) return true;
        return Object.values(record).some(value => String(value ?? '').toLowerCase().includes(normalizedSearch));
      });
  }, [tab, data, search, statusFilter]);

  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeTab(nextTab) {
    setTab(nextTab);
    setPage(1);
    setSearch('');
    setStatusFilter('all');
  }

  function changeSearch(value) {
    setSearch(value);
    setPage(1);
  }

  async function openPaymentProof(payment) {
    try {
      const blob = await getAuthenticatedFile(`/admin/subscription-payments/${payment.id}/proof`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { setError(err.message || 'Unable to open payment proof.'); }
  }

  /* ----- Review Payment: dito kusang nakukuwenta ang start at expiry ----- */
  function closeReview() {
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(''); setProofState('idle'); setReview(null); setRejecting(false); setRejectReason(''); setFormError('');
  }

  async function openReview(payment) {
    setFormError(''); setRejecting(false); setRejectReason(''); setReview(payment);
    setProofState('loading');
    try {
      const blob = await getAuthenticatedFile(`/admin/subscription-payments/${payment.id}/proof`);
      setProofUrl(URL.createObjectURL(blob));
      setProofState('ready');
    } catch (_) { setProofState('missing'); }
  }

  // Preview ng petsa na gagamitin ng server kapag ni-verify: tuloy sa expiry ng kasalukuyang plan kung early renewal.
  const reviewPreview = useMemo(() => {
    if (!review) return null;
    const days = Number(review.duration_days);
    if (!Number.isFinite(days) || days < 1) return null;
    const now = Date.now();
    const currentEnd = data.subscriptions
      .filter(sub => Number(sub.owner_id) === Number(review.owner_id) && String(sub.status).toLowerCase() === 'active' && sub.ends_at)
      .map(sub => new Date(sub.ends_at).getTime())
      .filter(time => Number.isFinite(time) && time > now)
      .sort((a, b) => b - a)[0];
    const start = Math.max(now, currentEnd || now);
    return { start: new Date(start), end: new Date(start + days * 86400000), early: Boolean(currentEnd) };
  }, [review, data.subscriptions]);

  async function submitReview(status) {
    setFormError('');
    if (status === 'rejected' && rejectReason.trim().length < 3) { setFormError('Enter a reason for rejecting this payment (at least 3 characters).'); return; }
    const confirmText = status === 'verified'
      ? `Verify payment #${review.id} and activate the ${review.plan_name || 'selected'} plan?`
      : `Reject payment #${review.id}? The owner will see your reason.`;
    if (!await window.agrileaseDialog.confirm(confirmText)) return;
    try {
      setSaving(true);
      const result = await api(`/admin/subscription-payments/${review.id}/verify`, { method: 'PATCH', body: { status, reason: status === 'rejected' ? rejectReason.trim() : undefined } });
      setNotice(result.message || `Payment #${review.id} ${status}.`);
      closeReview();
      await load();
    } catch (err) {
      setFormError(err.message || 'Unable to update payment status.');
    } finally { setSaving(false); }
  }

  /* ----- Plans: add / edit ----- */
  function openPlanForm(plan) {
    setFormError('');
    setPlanForm(plan
      ? { id: plan.id, plan_name: plan.plan_name || '', price: String(plan.price ?? ''), duration_days: String(plan.duration_days ?? ''), equipment_limit: plan.equipment_limit == null ? '' : String(plan.equipment_limit), description: plan.description || '', is_active: Number(plan.is_active) !== 0 }
      : { ...EMPTY_PLAN });
  }

  async function savePlan(event) {
    event.preventDefault();
    setFormError('');
    const isEdit = Boolean(planForm.id);
    if (!await window.agrileaseDialog.confirm(isEdit ? `Save changes to the ${planForm.plan_name || 'selected'} plan?` : `Add the ${planForm.plan_name || 'new'} plan?`, { title: isEdit ? 'Save plan changes' : 'Add plan', confirmText: isEdit ? 'Save' : 'Add plan' })) return;
    try {
      setSaving(true);
      const body = {
        plan_name: planForm.plan_name,
        price: planForm.price,
        duration_days: planForm.duration_days,
        equipment_limit: planForm.equipment_limit === '' ? null : planForm.equipment_limit,
        description: planForm.description,
        is_active: planForm.is_active ? 1 : 0,
      };
      const result = isEdit
        ? await api(`/admin/subscription-plans/${planForm.id}`, { method: 'PATCH', body })
        : await api('/admin/subscription-plans', { method: 'POST', body });
      setNotice(result.message || 'Plan saved.');
      setPlanForm(null);
      await load();
    } catch (err) {
      setFormError(err.message || 'Unable to save plan.');
    } finally { setSaving(false); }
  }

  /* ----- Owner subscriptions: add (cash/walk-in) at adjust (active lang) ----- */
  function openSubForm() {
    setFormError('');
    setSubForm({ ...EMPTY_SUB });
  }

  async function saveSubscription(event) {
    event.preventDefault();
    setFormError('');
    if (!subForm.owner_id || !subForm.plan_id) { setFormError('Choose an owner and a plan.'); return; }
    const plan = data.plans.find(item => String(item.id) === String(subForm.plan_id));
    if (!await window.agrileaseDialog.confirm(`Activate the ${plan?.plan_name || 'selected'} plan for this owner?`, { title: 'Add subscription', confirmText: 'Add' })) return;
    try {
      setSaving(true);
      const paid = plan && Number(plan.price) > 0;
      const body = { owner_id: subForm.owner_id, plan_id: subForm.plan_id, start_date: subForm.start_date || undefined, record_payment: paid && subForm.record_payment ? 1 : 0 };
      const result = await api('/admin/subscriptions', { method: 'POST', body });
      setNotice(result.message || 'Subscription saved.');
      setSubForm(null);
      await load();
    } catch (err) {
      setFormError(err.message || 'Unable to save subscription.');
    } finally { setSaving(false); }
  }

  function openAdjust(subscription) {
    setFormError('');
    setAdjustForm({
      id: subscription.id,
      owner_name: subscription.owner_name,
      plan_id: String(subscription.plan_id || ''),
      original_plan_id: String(subscription.plan_id || ''),
      end_date: dayValue(subscription.ends_at),
      original_end_date: dayValue(subscription.ends_at),
      reason: '',
    });
  }

  async function saveAdjust(event) {
    event.preventDefault();
    setFormError('');
    if (adjustForm.reason.trim().length < 3) { setFormError('Enter a reason for this change (at least 3 characters).'); return; }
    if (!await window.agrileaseDialog.confirm(`Save changes to subscription #${adjustForm.id}? The owner will be notified.`, { title: 'Adjust subscription', confirmText: 'Save' })) return;
    try {
      setSaving(true);
      const body = { plan_id: adjustForm.plan_id, reason: adjustForm.reason.trim() };
      if (adjustForm.end_date && adjustForm.end_date !== adjustForm.original_end_date) body.end_date = adjustForm.end_date;
      const result = await api(`/admin/subscriptions/${adjustForm.id}`, { method: 'PATCH', body });
      setNotice(result.message || 'Subscription updated.');
      setAdjustForm(null);
      await load();
    } catch (err) {
      setFormError(err.message || 'Unable to update subscription.');
    } finally { setSaving(false); }
  }

  async function cancelSubscription() {
    setFormError('');
    if (adjustForm.reason.trim().length < 3) { setFormError('Enter a reason for cancelling (at least 3 characters).'); return; }
    if (!await window.agrileaseDialog.confirm(`Cancel subscription #${adjustForm.id} now? The owner will lose access to adding listings and their listings will be hidden after the grace period.`, { title: 'Cancel subscription', confirmText: 'Cancel subscription' })) return;
    try {
      setSaving(true);
      const result = await api(`/admin/subscriptions/${adjustForm.id}`, { method: 'PATCH', body: { status: 'cancelled', reason: adjustForm.reason.trim() } });
      setNotice(result.message || 'Subscription cancelled.');
      setAdjustForm(null);
      await load();
    } catch (err) {
      setFormError(err.message || 'Unable to cancel subscription.');
    } finally { setSaving(false); }
  }

  const pendingPayments = useMemo(
    () => data.payments.filter(payment => String(payment.status).toLowerCase() === 'pending'),
    [data.payments]
  );

  function pendingPaymentFor(subscription) {
    return pendingPayments.find(payment => Number(payment.subscription_id) === Number(subscription.id));
  }

  return (
    <div className="am-page am-subscriptions-page">
      {error && <div className="um-message error">{error}</div>}
      {notice && <div className="um-message success">{notice}</div>}
      {pendingPayments.length > 0 && (
        <div className="sub-banner warn am-pending-banner">
          <span><strong>{pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} waiting for review</strong>Verify a payment to activate the owner's plan. The start and expiry dates are set automatically.</span>
          <button type="button" className="am-button sub-primary-btn" onClick={() => {
            changeTab('payments');
            setStatusFilter('pending');
            // Ang Payment Records ay nasa ibaba ng Plans, kaya i-scroll papunta roon.
            window.setTimeout(() => recordsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
          }}>Review payments</button>
        </div>
      )}

      {/* SUBSCRIPTION OVERVIEW */}
      <section className="am-subscription-overview">
        <div className="am-section-heading">
          <div>
            <h2>Subscription Overview</h2>
            <p>Current subscription records of equipment owners.</p>
          </div>
          <span className="um-total">{data.subscriptions.length} total records</span>
        </div>

        <div className="am-stats">
          <SummaryCard label="Active Subscriptions" value={subscriptionStats.active} description="Currently active owners" />
          <SummaryCard label="Free Trial" value={subscriptionStats.trial} description="Owners under trial" />
          <SummaryCard label="Expired" value={subscriptionStats.expired} description="Expired subscriptions" />
          <SummaryCard label="Pending" value={subscriptionStats.pending} description="Awaiting subscription activation" />
        </div>
      </section>

      {/* SUBSCRIPTION PLANS (live from the system, with Add / Edit) */}
      <section className="um-panel am-plans-panel">
        <div className="um-panel-heading">
          <div>
            <h2>Subscription Plans</h2>
            <p>Plans that equipment owners can choose from. Farmers rent for free.</p>
          </div>
          <div className="sub-section-actions">
            <span className="um-total">{data.plans.length} plans</span>
            <button type="button" className="am-button sub-primary-btn" onClick={() => openPlanForm(null)}>Add Plan</button>
          </div>
        </div>

        {loading ? (
          <div className="am-empty">Loading plans...</div>
        ) : data.plans.length ? (
          <div className="sub-plan-grid">
            {data.plans.map(plan => (
              <article key={plan.id} className={`sub-plan-card ${Number(plan.is_active) === 0 ? 'inactive' : ''}`}>
                <h3>{plan.plan_name}</h3>
                <span className="sub-plan-price">{Number(plan.price) === 0 ? 'FREE' : money(plan.price)}</span>
                <p className="sub-plan-meta">{plan.duration_days} days · {plan.equipment_limit == null ? 'Unlimited equipment' : `${plan.equipment_limit} equipment`}</p>
                {plan.description && <p className="sub-plan-meta">{plan.description}</p>}
                <StatusBadge status={Number(plan.is_active) === 0 ? 'inactive' : 'active'} />
                <div className="sub-plan-actions">
                  <button type="button" className="am-button neutral" onClick={() => openPlanForm(plan)}>Edit</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="am-empty">No plans yet. Use Add Plan to create one.</div>
        )}
      </section>

      {!data.subscriptionsConfigured && (
        <div className="am-warning">The subscriptions table is not available in the connected database. Subscription records cannot currently be displayed.</div>
      )}

      {/* RECORDS */}
      <section className="um-panel am-subscription-records" ref={recordsRef}>
        <div className="am-tabs">
          <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => changeTab('subscriptions')}>Owner Subscriptions</button>
          <button className={tab === 'payments' ? 'active' : ''} onClick={() => changeTab('payments')}>Payment Records</button>
        </div>

        <div className="um-panel-heading am-subscription-record-heading">
          <div>
            <h2>{tab === 'subscriptions' ? 'Owner Subscriptions' : 'Subscription Payment Records'}</h2>
            <p>{rows.length} records found</p>
          </div>
          <div className="sub-section-actions">
            <span className="um-total">{rows.length} records</span>
            {tab === 'subscriptions' && <button type="button" className="am-button sub-primary-btn" onClick={openSubForm}>Add Subscription</button>}
          </div>
        </div>

        <div className="am-subscription-search">
          <input
            className="am-report-search"
            type="search"
            value={search}
            onChange={event => changeSearch(event.target.value)}
            placeholder={tab === 'subscriptions' ? 'Search owner, plan, status, or ID...' : 'Search payment ID, owner, reference, or status...'}
          />
          <select className="am-report-search am-subscription-status-filter" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter status">
            <option value="all">All statuses</option>
            {(tab === 'subscriptions' ? ['active', 'trial', 'pending', 'expired'] : ['pending', 'verified', 'rejected']).map(status => <option key={status} value={status}>{titleCase(status)}</option>)}
          </select>
          <button type="button" className="um-refresh" onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1); }}>Clear Filters</button>
        </div>

        <div className="um-table-wrapper">
          <table className="um-table">
            {tab === 'subscriptions' ? (
              <>
                <thead>
                  <tr>
                    <th>ID</th><th>Owner</th><th>Plan</th><th>Price</th><th>Start Date</th><th>Expiry Date</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="um-empty">Loading subscriptions...</td></tr>
                  ) : shown.length ? (
                    shown.map(subscription => (
                      <tr key={subscription.id}>
                        <td>#{subscription.id}</td>
                        <td>{subscription.owner_name || `Owner #${subscription.owner_id || '—'}`}</td>
                        <td>{subscription.plan_name || '—'}</td>
                        <td>{money(subscription.price)}</td>
                        <td>{date(subscription.starts_at)}</td>
                        <td>{date(subscription.ends_at)}</td>
                        <td><StatusBadge status={getSubscriptionCategory(subscription)} /></td>
                        <td>
                          {String(subscription.status).toLowerCase() === 'pending' ? (
                            pendingPaymentFor(subscription)
                              ? <button type="button" className="am-button approve" onClick={() => openReview(pendingPaymentFor(subscription))}>Review Payment</button>
                              : '—'
                          ) : String(subscription.status).toLowerCase() === 'active' && getSubscriptionCategory(subscription) !== 'expired' ? (
                            <button type="button" className="am-button neutral" onClick={() => openAdjust(subscription)}>Adjust</button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="um-empty">No subscription records found.</td></tr>
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Payment ID</th><th>Owner</th><th>Plan</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" className="um-empty">Loading payment records...</td></tr>
                  ) : shown.length ? (
                    shown.map(payment => (
                      <tr key={payment.id}>
                        <td>#{payment.id}</td>
                        <td>{payment.owner_name || `Owner #${payment.owner_id || '—'}`}</td>
                        <td>{payment.plan_name || '—'}</td>
                        <td>{money(payment.amount)}</td>
                        <td>{titleCase(payment.payment_method) || '—'}</td>
                        <td>{payment.reference || '—'}</td>
                        <td><StatusBadge status={payment.status} /></td>
                        <td>{date(payment.created_at)}</td>
                        <td>
                          {String(payment.status).toLowerCase() === 'pending' ? (
                            <div className="am-action-group">
                              <button type="button" className="am-button approve" onClick={() => openReview(payment)}>Review</button>
                            </div>
                          ) : (payment.rejection_reason ? <span title={payment.rejection_reason}>Reviewed · {payment.rejection_reason}</span> : 'Reviewed')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="9" className="um-empty">{data.paymentsConfigured ? 'No subscription payment records found.' : 'Subscription payment records are not available yet.'}</td></tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>

        {!loading && <Pagination totalItems={rows.length} itemsPerPage={PAGE_SIZE} currentPage={page} onPageChange={setPage} />}
      </section>

      {/* ADD / EDIT PLAN */}
      {planForm && (
        <Modal title={planForm.id ? 'Edit Plan' : 'Add Plan'} subtitle="Set the price, duration, and equipment limit of this plan." onClose={() => !saving && setPlanForm(null)}>
          <form className="sub-form" onSubmit={savePlan}>
            {formError && <div className="um-message error">{formError}</div>}
            <label>Plan name<input value={planForm.plan_name} maxLength={50} required onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })} /></label>
            <div className="sub-form-row">
              <label>Price (PHP)<input type="number" min="0" step="0.01" required value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} /></label>
              <label>Duration (days)<input type="number" min="1" step="1" required value={planForm.duration_days} onChange={e => setPlanForm({ ...planForm, duration_days: e.target.value })} /></label>
            </div>
            <div className="sub-form-row">
              <label>Equipment limit<input type="number" min="1" step="1" placeholder="Blank = unlimited" value={planForm.equipment_limit} onChange={e => setPlanForm({ ...planForm, equipment_limit: e.target.value })} /></label>
              <label>Availability
                <select value={planForm.is_active ? '1' : '0'} onChange={e => setPlanForm({ ...planForm, is_active: e.target.value === '1' })}>
                  <option value="1">Active (owners can choose it)</option>
                  <option value="0">Inactive (hidden)</option>
                </select>
              </label>
            </div>
            <label>Description<textarea value={planForm.description} maxLength={1000} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /></label>
            <div className="sub-form-actions">
              <button type="button" className="um-refresh" onClick={() => setPlanForm(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="am-button sub-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADD SUBSCRIPTION (cash / walk-in) */}
      {subForm && (() => {
        const chosen = data.plans.find(plan => String(plan.id) === String(subForm.plan_id));
        const isPaid = chosen && Number(chosen.price) > 0;
        return (
          <Modal title="Add Subscription" subtitle="Use this for walk-in or cash payments. For online payments, verify the owner's request instead." onClose={() => !saving && setSubForm(null)}>
            <form className="sub-form" onSubmit={saveSubscription}>
              {formError && <div className="um-message error">{formError}</div>}
              <label>Owner
                <select value={subForm.owner_id} required onChange={e => setSubForm({ ...subForm, owner_id: e.target.value })}>
                  <option value="">Select an owner</option>
                  {owners.map(owner => <option key={owner.id} value={owner.id}>{owner.full_name} ({owner.email})</option>)}
                </select>
              </label>
              <label>Plan
                <select value={subForm.plan_id} required onChange={e => setSubForm({ ...subForm, plan_id: e.target.value })}>
                  <option value="">Select a plan</option>
                  {data.plans.filter(plan => Number(plan.is_active) !== 0).map(plan => <option key={plan.id} value={plan.id}>{plan.plan_name} — {Number(plan.price) === 0 ? 'Free' : money(plan.price)} / {plan.duration_days} days</option>)}
                </select>
              </label>
              <label>Start date (optional)<input type="date" value={subForm.start_date} onChange={e => setSubForm({ ...subForm, start_date: e.target.value })} /></label>
              {isPaid && (
                <label className="sub-check">
                  <input type="checkbox" checked={subForm.record_payment} onChange={e => setSubForm({ ...subForm, record_payment: e.target.checked })} />
                  Record {money(chosen.price)} as paid in cash (appears in Payment Records)
                </label>
              )}
              <p className="am-note">The expiry date is set automatically from the plan duration. Any current active plan of this owner is replaced.</p>
              <div className="sub-form-actions">
                <button type="button" className="um-refresh" onClick={() => setSubForm(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="am-button sub-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Add subscription'}</button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* ADJUST ACTIVE SUBSCRIPTION */}
      {adjustForm && (
        <Modal title={`Adjust Subscription #${adjustForm.id}`} subtitle={adjustForm.owner_name || ''} onClose={() => !saving && setAdjustForm(null)}>
          <form className="sub-form" onSubmit={saveAdjust}>
            {formError && <div className="um-message error">{formError}</div>}
            <label>Plan
              <select value={adjustForm.plan_id} required onChange={e => setAdjustForm({ ...adjustForm, plan_id: e.target.value })}>
                {data.plans.filter(plan => Number(plan.is_active) !== 0 || String(plan.id) === adjustForm.original_plan_id).map(plan => <option key={plan.id} value={plan.id}>{plan.plan_name} — {Number(plan.price) === 0 ? 'Free' : money(plan.price)} / {plan.duration_days} days</option>)}
              </select>
            </label>
            <label>Expiry date<input type="date" value={adjustForm.end_date} onChange={e => setAdjustForm({ ...adjustForm, end_date: e.target.value })} /></label>
            <p className="am-note">If you change the plan and leave the expiry date as is, the expiry is recalculated from the new plan's duration.</p>
            <label>Reason (the owner will see this)<textarea value={adjustForm.reason} maxLength={255} required placeholder="Example: Extended 7 days because of a payment delay." onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} /></label>
            <div className="sub-form-actions">
              <button type="button" className="sub-danger-btn" onClick={cancelSubscription} disabled={saving}>Cancel subscription</button>
              <button type="button" className="um-refresh" onClick={() => setAdjustForm(null)} disabled={saving}>Close</button>
              <button type="submit" className="am-button sub-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* REVIEW SUBSCRIPTION PAYMENT */}
      {review && (
        <Modal title={`Review Payment #${review.id}`} subtitle="Check the proof and reference. Verifying activates the plan with automatic dates." onClose={() => !saving && closeReview()}>
          {formError && <div className="um-message error">{formError}</div>}
          <div className="sub-review-grid">
            <div><small>Owner</small><strong>{review.owner_name || `Owner #${review.owner_id || '—'}`}</strong></div>
            <div><small>Plan</small><strong>{review.plan_name || '—'}{review.duration_days ? ` · ${review.duration_days} days` : ''}</strong></div>
            <div><small>Amount paid</small><strong>{money(review.amount)}</strong></div>
            <div><small>Method</small><strong>{titleCase(review.payment_method) || '—'}</strong></div>
            <div><small>Reference number</small><strong>{review.reference || '—'}</strong></div>
            <div><small>Submitted</small><strong>{date(review.created_at)}</strong></div>
          </div>
          <div className="sub-proof">
            {proofState === 'loading' && <span className="sub-proof-empty">Loading proof of payment...</span>}
            {proofState === 'ready' && <img src={proofUrl} alt="Proof of payment" />}
            {proofState === 'missing' && <span className="sub-proof-empty">The proof image could not be loaded.</span>}
          </div>
          {proofState === 'ready' && <p className="am-note"><button type="button" className="um-refresh" onClick={() => openPaymentProof(review)}>Open full size</button></p>}
          {reviewPreview && (
            <div className="sub-review-preview">
              If verified: starts <strong>{date(reviewPreview.start)}</strong> and expires <strong>{date(reviewPreview.end)}</strong>.
              {reviewPreview.early && ' The owner still has an active plan, so the new plan continues right after it. No days are lost.'}
            </div>
          )}
          {rejecting && (
            <label className="sub-form">Reason for rejecting (the owner will see this)
              <textarea value={rejectReason} maxLength={255} placeholder="Example: The reference number does not match the proof." onChange={e => setRejectReason(e.target.value)} />
            </label>
          )}
          <div className="sub-form-actions">
            <button type="button" className="um-refresh" onClick={closeReview} disabled={saving}>Close</button>
            {!rejecting ? (
              <>
                <button type="button" className="am-button reject" onClick={() => setRejecting(true)} disabled={saving}>Reject</button>
                <button type="button" className="am-button approve" onClick={() => submitReview('verified')} disabled={saving}>{saving ? 'Saving...' : 'Verify and activate'}</button>
              </>
            ) : (
              <>
                <button type="button" className="um-refresh" onClick={() => { setRejecting(false); setFormError(''); }} disabled={saving}>Back</button>
                <button type="button" className="am-button reject" onClick={() => submitReview('rejected')} disabled={saving}>{saving ? 'Saving...' : 'Confirm rejection'}</button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
