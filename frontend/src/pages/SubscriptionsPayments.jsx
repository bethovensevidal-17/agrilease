import { useEffect, useMemo, useState } from 'react';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
<<<<<<< HEAD
import { API_BASE } from '../api/config';

const PAGE_SIZE = 8;

const AGREED_PLANS = [
  {
    code: 'FREE-TRIAL',
    name: 'Free Trial',
    price: 0,
    duration_days: 7,
    equipment_limit: 2,
    note: 'One-time 7-day trial with up to 2 equipment listings',
  },
  {
    code: 'MONTHLY',
    name: 'Monthly',
    price: 199,
    duration_days: 30,
    equipment_limit: 3,
  },
  {
    code: 'QUARTERLY',
    name: 'Quarterly',
    price: 549,
    duration_days: 90,
    equipment_limit: 5,
  },
  {
    code: 'SEMI-ANNUAL',
    name: 'Semi-Annual',
    price: 999,
    duration_days: 180,
    equipment_limit: 10,
  },
  {
    code: 'ANNUAL',
    name: 'Annual',
    price: 1799,
    duration_days: 365,
    equipment_limit: null,
  },
];
=======

const PAGE_SIZE = 8;
const SUB_STATUSES = ['active', 'pending', 'expired', 'cancelled'];
const EMPTY_PLAN = { id: null, plan_name: '', price: '', duration_days: '', equipment_limit: '', description: '', is_active: true };
const EMPTY_SUB = { id: null, owner_id: '', plan_id: '', status: 'active', start_date: '', end_date: '' };

const dayValue = value => (value ? String(value).slice(0, 10) : '');
const titleCase = value => String(value || '').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase());
>>>>>>> master

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

  if (
    status.includes('trial') ||
<<<<<<< HEAD
    plan.includes('free trial')
=======
    plan.includes('free trial') ||
    (subscription.subscription_type === 'trial' && status === 'active')
>>>>>>> master
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

<<<<<<< HEAD
=======

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

>>>>>>> master
export default function SubscriptionsPayments() {
  const [data, setData] = useState({
    subscriptions: [],
    plans: [],
    payments: [],
    subscriptionsConfigured: true,
    paymentsConfigured: false,
  });
<<<<<<< HEAD
=======
  const [owners, setOwners] = useState([]);
>>>>>>> master

  const [tab, setTab] = useState('subscriptions');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
<<<<<<< HEAD
=======
  const [notice, setNotice] = useState('');
  const [planForm, setPlanForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
>>>>>>> master

  async function load() {
    try {
      setLoading(true);
      setError('');

<<<<<<< HEAD
      const result = await api('/admin/subscriptions');
=======
      const [result, ownerResult] = await Promise.all([
        api('/admin/subscriptions'),
        api('/admin/owners?status=verified').catch(() => ({ data: [] })),
      ]);
>>>>>>> master

      setData({
        subscriptions: result.subscriptions || [],
        plans: result.plans || [],
        payments: result.payments || [],
<<<<<<< HEAD
        subscriptionsConfigured:
          result.subscriptionsConfigured !== false,
        paymentsConfigured:
          result.paymentsConfigured === true,
      });
    } catch (err) {
      setError(
        err.message || 'Unable to load subscription records.'
      );
=======
        subscriptionsConfigured: result.subscriptionsConfigured !== false,
        paymentsConfigured: result.paymentsConfigured === true,
      });
      setOwners(ownerResult.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load subscription records.');
>>>>>>> master
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  useEffect(() => {
    load();
  }, []);

  const subscriptionStats = useMemo(() => {
    const counts = {
      active: 0,
      trial: 0,
      expired: 0,
      pending: 0,
    };

    data.subscriptions.forEach(subscription => {
      const category = getSubscriptionCategory(subscription);

      if (Object.prototype.hasOwnProperty.call(counts, category)) {
        counts[category] += 1;
      }
    });

=======
  useEffect(() => { load(); }, []);

  const subscriptionStats = useMemo(() => {
    const counts = { active: 0, trial: 0, expired: 0, pending: 0 };
    data.subscriptions.forEach(subscription => {
      const category = getSubscriptionCategory(subscription);
      if (Object.prototype.hasOwnProperty.call(counts, category)) counts[category] += 1;
    });
>>>>>>> master
    return counts;
  }, [data.subscriptions]);

  const rows = useMemo(() => {
<<<<<<< HEAD
    const source =
      tab === 'subscriptions'
        ? data.subscriptions
        : tab === 'plans'
          ? data.plans
          : data.payments;

=======
    const source = tab === 'subscriptions' ? data.subscriptions : data.payments;
>>>>>>> master
    const normalizedSearch = search.trim().toLowerCase();

    return [...source]
      .sort(sortById)
      .filter(record => {
<<<<<<< HEAD
        if (statusFilter !== 'all' && tab !== 'plans') {
=======
        if (statusFilter !== 'all') {
>>>>>>> master
          const status = tab === 'subscriptions'
            ? getSubscriptionCategory(record)
            : String(record.status || 'unknown').toLowerCase();
          if (status !== statusFilter) return false;
        }
        if (!normalizedSearch) return true;
<<<<<<< HEAD

        return Object.values(record).some(value =>
          String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch)
        );
      });
  }, [tab, data, search, statusFilter]);

  const shown = rows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );
=======
        return Object.values(record).some(value => String(value ?? '').toLowerCase().includes(normalizedSearch));
      });
  }, [tab, data, search, statusFilter]);

  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
>>>>>>> master

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

  async function reviewPayment(payment, status) {
    const action = status === 'verified' ? 'verify' : 'reject';
    if (!await window.agrileaseDialog.confirm(`Are you sure you want to ${action} payment #${payment.id}?`)) return;
    try {
<<<<<<< HEAD
      await api(`/admin/subscription-payments/${payment.id}/verify`, {
        method: 'PATCH',
        body: { status }
      });
=======
      await api(`/admin/subscription-payments/${payment.id}/verify`, { method: 'PATCH', body: { status } });
      setNotice(`Payment #${payment.id} ${status}.`);
>>>>>>> master
      await load();
    } catch (err) {
      setError(err.message || 'Unable to update payment status.');
    }
  }

<<<<<<< HEAD
=======
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

  /* ----- Owner subscriptions: add / edit ----- */
  function openSubForm(subscription) {
    setFormError('');
    setSubForm(subscription
      ? { id: subscription.id, owner_id: String(subscription.owner_id || ''), plan_id: String(subscription.plan_id || ''), status: ['active', 'pending', 'expired', 'cancelled'].includes(subscription.status) ? subscription.status : 'active', start_date: dayValue(subscription.starts_at), end_date: dayValue(subscription.ends_at), owner_name: subscription.owner_name }
      : { ...EMPTY_SUB });
  }

  async function saveSubscription(event) {
    event.preventDefault();
    setFormError('');
    const isEdit = Boolean(subForm.id);
    if (!isEdit && (!subForm.owner_id || !subForm.plan_id)) { setFormError('Choose an owner and a plan.'); return; }
    if (subForm.start_date && subForm.end_date && subForm.start_date > subForm.end_date) { setFormError('The start date cannot be later than the expiry date.'); return; }
    if (!await window.agrileaseDialog.confirm(isEdit ? `Save changes to subscription #${subForm.id}?` : 'Add this subscription to the selected owner?', { title: isEdit ? 'Save subscription changes' : 'Add subscription', confirmText: isEdit ? 'Save' : 'Add' })) return;
    try {
      setSaving(true);
      const body = { owner_id: subForm.owner_id, plan_id: subForm.plan_id, status: subForm.status, start_date: subForm.start_date || undefined, end_date: subForm.end_date || undefined };
      const result = isEdit
        ? await api(`/admin/subscriptions/${subForm.id}`, { method: 'PATCH', body })
        : await api('/admin/subscriptions', { method: 'POST', body });
      setNotice(result.message || 'Subscription saved.');
      setSubForm(null);
      await load();
    } catch (err) {
      setFormError(err.message || 'Unable to save subscription.');
    } finally { setSaving(false); }
  }

>>>>>>> master
  return (
    <div className="am-page am-subscriptions-page">
      <div className="admin-page-heading">
        <div>
          <h1>Subscriptions</h1>
<<<<<<< HEAD
          <p>
            Monitor equipment-owner subscriptions, plans, and
            subscription payments across AGRILEASE.
          </p>
        </div>

        <button
          className="um-refresh"
          type="button"
          onClick={load}
          disabled={loading}
        >
=======
          <p>Manage subscription plans, equipment-owner subscriptions, and subscription payments.</p>
        </div>

        <button className="um-refresh" type="button" onClick={load} disabled={loading}>
>>>>>>> master
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

<<<<<<< HEAD
      {error && (
        <div className="um-message error">{error}</div>
      )}
=======
      {error && <div className="um-message error">{error}</div>}
      {notice && <div className="um-message success">{notice}</div>}
>>>>>>> master

      {/* SUBSCRIPTION OVERVIEW */}
      <section className="am-subscription-overview">
        <div className="am-section-heading">
          <div>
            <h2>Subscription Overview</h2>
            <p>Current subscription records of equipment owners.</p>
          </div>
<<<<<<< HEAD
          <span className="um-total">
            {data.subscriptions.length} total records
          </span>
        </div>

        <div className="am-stats">
          <SummaryCard
            label="Active Subscriptions"
            value={subscriptionStats.active}
            description="Currently active owners"
          />

          <SummaryCard
            label="Free Trial"
            value={subscriptionStats.trial}
            description="Owners under trial"
          />

          <SummaryCard
            label="Expired"
            value={subscriptionStats.expired}
            description="Expired subscriptions"
          />

          <SummaryCard
            label="Pending"
            value={subscriptionStats.pending}
            description="Awaiting subscription activation"
          />
        </div>
      </section>

      {/* FIXED SUBSCRIPTION PLANS */}
      <section className="um-panel am-plans-panel">
        <div className="um-panel-heading">
          <div>
            <h2>AGRILEASE Subscription Plans</h2>
            <p>
              Fixed subscription options available to equipment
              owners. Farmers can browse and rent for free.
            </p>
          </div>

          <span className="um-total">
            {AGREED_PLANS.length} plans
          </span>
        </div>

        <div className="am-subscription-intro">
          <span>Owners Only</span>
          <p>
            Equipment owners receive a one-time 7-day trial
            after approval. A paid plan is needed to continue
            listing equipment after the trial.
          </p>
        </div>

        <div className="um-table-wrapper am-plan-table-wrap">
          <table className="um-table am-plan-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Equipment Limit</th>
                <th>Eligibility / Notes</th>
              </tr>
            </thead>

            <tbody>
              {AGREED_PLANS.map(plan => (
                <tr key={plan.code}>
                  <td>
                    <strong>{plan.name}</strong>
                    <small>{plan.code}</small>
                  </td>

                  <td>
                    <strong>
                      {plan.price === 0
                        ? 'FREE'
                        : money(plan.price)}
                    </strong>
                  </td>

                  <td>{plan.duration_days} days</td>

                  <td>
                    {plan.equipment_limit == null
                      ? 'Unlimited'
                      : `${plan.equipment_limit} units`}
                  </td>

                  <td>
                    {plan.note ||
                      (plan.code === 'ANNUAL'
                        ? 'Best value for long-term owners'
                        : 'For verified equipment owners')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="am-note am-panel-note">
          These are the agreed AGRILEASE proposal prices.
          Database plan configurations are available in the
          Database Plans tab below.
        </p>
      </section>

      {/* PAYMENT MONITORING INFORMATION */}
      <section className="um-panel am-payment-panel">
        <div className="um-panel-heading">
          <div>
            <h2>Payment Monitoring</h2>
            <p>
              Review recorded subscription payments and their
              current verification status.
            </p>
          </div>
        </div>

        <div className="am-payment-monitoring-note">
          <strong>Admin Monitoring Only</strong>
          <p>
            Payment records shown below come from the connected
            database. A payment must not be considered paid
            unless its actual payment status has been recorded
            and verified through the existing payment process.
          </p>
        </div>
      </section>

      {/* DATABASE WARNINGS */}
      {!data.subscriptionsConfigured && (
        <div className="am-warning">
          The subscriptions table is not available in the
          connected database. Subscription records cannot
          currently be displayed.
        </div>
      )}

      {!data.paymentsConfigured && (
        <div className="am-warning">
          Payment recording and verification are not connected
          yet. Payment monitoring will be available when the
          subscription payment records are configured.
        </div>
=======
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
>>>>>>> master
      )}

      {/* RECORDS */}
      <section className="um-panel am-subscription-records">
        <div className="am-tabs">
<<<<<<< HEAD
          <button
            className={tab === 'subscriptions' ? 'active' : ''}
            onClick={() => changeTab('subscriptions')}
          >
            Owner Subscriptions
          </button>

          <button
            className={tab === 'plans' ? 'active' : ''}
            onClick={() => changeTab('plans')}
          >
            Database Plans
          </button>

          <button
            className={tab === 'payments' ? 'active' : ''}
            onClick={() => changeTab('payments')}
          >
            Payment Records
          </button>
=======
          <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => changeTab('subscriptions')}>Owner Subscriptions</button>
          <button className={tab === 'payments' ? 'active' : ''} onClick={() => changeTab('payments')}>Payment Records</button>
>>>>>>> master
        </div>

        <div className="um-panel-heading am-subscription-record-heading">
          <div>
<<<<<<< HEAD
            <h2>
              {tab === 'subscriptions'
                ? 'Owner Subscriptions'
                : tab === 'plans'
                  ? 'Configured Database Plans'
                  : 'Subscription Payment Records'}
            </h2>

            <p>
              {rows.length} records found
            </p>
          </div>

          <span className="um-total">
            {rows.length} records
          </span>
=======
            <h2>{tab === 'subscriptions' ? 'Owner Subscriptions' : 'Subscription Payment Records'}</h2>
            <p>{rows.length} records found</p>
          </div>
          <div className="sub-section-actions">
            <span className="um-total">{rows.length} records</span>
            {tab === 'subscriptions' && <button type="button" className="am-button sub-primary-btn" onClick={() => openSubForm(null)}>Add Subscription</button>}
          </div>
>>>>>>> master
        </div>

        <div className="am-subscription-search">
          <input
            className="am-report-search"
            type="search"
            value={search}
<<<<<<< HEAD
            onChange={event =>
              changeSearch(event.target.value)
            }
            placeholder={
              tab === 'subscriptions'
                ? 'Search owner, plan, status, or ID...'
                : tab === 'plans'
                  ? 'Search plan name, code, or price...'
                  : 'Search payment ID, owner, reference, or status...'
            }
          />
          {tab !== 'plans' && (
            <select
              className="am-report-search am-subscription-status-filter"
              value={statusFilter}
              onChange={event => { setStatusFilter(event.target.value); setPage(1); }}
              aria-label="Filter subscription status"
            >
              <option value="all">All statuses</option>
              {(tab === 'subscriptions'
                ? ['active', 'trial', 'pending', 'expired']
                : ['pending', 'verified', 'rejected']
              ).map(status => <option key={status} value={status}>{status.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())}</option>)}
            </select>
          )}
=======
            onChange={event => changeSearch(event.target.value)}
            placeholder={tab === 'subscriptions' ? 'Search owner, plan, status, or ID...' : 'Search payment ID, owner, reference, or status...'}
          />
          <select className="am-report-search am-subscription-status-filter" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter status">
            <option value="all">All statuses</option>
            {(tab === 'subscriptions' ? ['active', 'trial', 'pending', 'expired'] : ['pending', 'verified', 'rejected']).map(status => <option key={status} value={status}>{titleCase(status)}</option>)}
          </select>
>>>>>>> master
          <button type="button" className="um-refresh" onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1); }}>Clear Filters</button>
        </div>

        <div className="um-table-wrapper">
          <table className="um-table">
            {tab === 'subscriptions' ? (
              <>
                <thead>
                  <tr>
<<<<<<< HEAD
                    <th>ID</th>
                    <th>Owner</th>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="um-empty">
                        Loading subscriptions...
                      </td>
                    </tr>
=======
                    <th>ID</th><th>Owner</th><th>Plan</th><th>Price</th><th>Start Date</th><th>Expiry Date</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="um-empty">Loading subscriptions...</td></tr>
>>>>>>> master
                  ) : shown.length ? (
                    shown.map(subscription => (
                      <tr key={subscription.id}>
                        <td>#{subscription.id}</td>
<<<<<<< HEAD

                        <td>
                          {subscription.owner_name ||
                            `Owner #${subscription.owner_id || '—'}`}
                        </td>

                        <td>
                          {subscription.plan_name || '—'}
                        </td>

                        <td>{money(subscription.price)}</td>

                        <td>{date(subscription.starts_at)}</td>

                        <td>{date(subscription.ends_at)}</td>

                        <td>
                          <StatusBadge
                            status={getSubscriptionCategory(
                              subscription
                            )}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="um-empty">
                        No subscription records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            ) : tab === 'plans' ? (
              <>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Plan</th>
                    <th>Code</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Equipment Limit</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="um-empty">
                        Loading database plans...
                      </td>
                    </tr>
                  ) : shown.length ? (
                    shown.map(plan => (
                      <tr key={plan.id}>
                        <td>#{plan.id}</td>
                        <td>{plan.plan_name || plan.name || '—'}</td>
                        <td>{plan.code || '—'}</td>
                        <td>{money(plan.price)}</td>
                        <td>
                          {plan.duration_days ?? '—'} days
                        </td>
                        <td>
                          {plan.equipment_limit == null
                            ? 'Unlimited'
                            : plan.equipment_limit}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="um-empty">
                        No configured database plans found.
                      </td>
                    </tr>
=======
                        <td>{subscription.owner_name || `Owner #${subscription.owner_id || '—'}`}</td>
                        <td>{subscription.plan_name || '—'}</td>
                        <td>{money(subscription.price)}</td>
                        <td>{date(subscription.starts_at)}</td>
                        <td>{date(subscription.ends_at)}</td>
                        <td><StatusBadge status={getSubscriptionCategory(subscription)} /></td>
                        <td><button type="button" className="am-button neutral" onClick={() => openSubForm(subscription)}>Edit</button></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="um-empty">No subscription records found.</td></tr>
>>>>>>> master
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
<<<<<<< HEAD
                    <th>Payment ID</th>
                    <th>Owner</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="um-empty">
                        Loading payment records...
                      </td>
                    </tr>
=======
                    <th>Payment ID</th><th>Owner</th><th>Amount</th><th>Reference</th><th>Status</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="um-empty">Loading payment records...</td></tr>
>>>>>>> master
                  ) : shown.length ? (
                    shown.map(payment => (
                      <tr key={payment.id}>
                        <td>#{payment.id}</td>
<<<<<<< HEAD

                        <td>
                          {payment.owner_name ||
                            `Owner #${payment.owner_id || '—'}`}
                        </td>

                        <td>{money(payment.amount)}</td>

                        <td>{payment.reference || '—'}</td>

                        <td>
                          <StatusBadge status={payment.status} />
                        </td>

=======
                        <td>{payment.owner_name || `Owner #${payment.owner_id || '—'}`}</td>
                        <td>{money(payment.amount)}</td>
                        <td>{payment.reference || '—'}</td>
                        <td><StatusBadge status={payment.status} /></td>
>>>>>>> master
                        <td>{date(payment.created_at)}</td>
                        <td>
                          {String(payment.status).toLowerCase() === 'pending' ? (
                            <div className="am-action-group">
<<<<<<< HEAD
                              <button type="button" onClick={() => openPaymentProof(payment)}>View Proof</button>
                              <button type="button" onClick={() => reviewPayment(payment, 'verified')}>Verify</button>
                              <button type="button" onClick={() => reviewPayment(payment, 'rejected')}>Reject</button>
=======
                              <button type="button" className="am-button neutral" onClick={() => openPaymentProof(payment)}>View Proof</button>
                              <button type="button" className="am-button approve" onClick={() => reviewPayment(payment, 'verified')}>Verify</button>
                              <button type="button" className="am-button reject" onClick={() => reviewPayment(payment, 'rejected')}>Reject</button>
>>>>>>> master
                            </div>
                          ) : 'Reviewed'}
                        </td>
                      </tr>
                    ))
                  ) : (
<<<<<<< HEAD
                    <tr>
                      <td colSpan="7" className="um-empty">
                        No subscription payment records found.
                      </td>
                    </tr>
=======
                    <tr><td colSpan="7" className="um-empty">{data.paymentsConfigured ? 'No subscription payment records found.' : 'Subscription payment records are not available yet.'}</td></tr>
>>>>>>> master
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>

<<<<<<< HEAD
        {!loading && (
          <Pagination
            totalItems={rows.length}
            itemsPerPage={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
          />
        )}
      </section>
=======
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

      {/* ADD / EDIT OWNER SUBSCRIPTION */}
      {subForm && (
        <Modal title={subForm.id ? `Edit Subscription #${subForm.id}` : 'Add Subscription'} subtitle={subForm.id ? subForm.owner_name || '' : 'Give a verified owner a subscription plan.'} onClose={() => !saving && setSubForm(null)}>
          <form className="sub-form" onSubmit={saveSubscription}>
            {formError && <div className="um-message error">{formError}</div>}
            {!subForm.id && (
              <label>Owner
                <select value={subForm.owner_id} required onChange={e => setSubForm({ ...subForm, owner_id: e.target.value })}>
                  <option value="">Select an owner</option>
                  {owners.map(owner => <option key={owner.id} value={owner.id}>{owner.full_name} ({owner.email})</option>)}
                </select>
              </label>
            )}
            <label>Plan
              <select value={subForm.plan_id} required onChange={e => setSubForm({ ...subForm, plan_id: e.target.value })}>
                <option value="">Select a plan</option>
                {data.plans.map(plan => <option key={plan.id} value={plan.id}>{plan.plan_name} — {Number(plan.price) === 0 ? 'Free' : money(plan.price)} / {plan.duration_days} days</option>)}
              </select>
            </label>
            <label>Status
              <select value={subForm.status} onChange={e => setSubForm({ ...subForm, status: e.target.value })}>
                {SUB_STATUSES.map(status => <option key={status} value={status}>{titleCase(status)}</option>)}
              </select>
            </label>
            <div className="sub-form-row">
              <label>Start date<input type="date" value={subForm.start_date} onChange={e => setSubForm({ ...subForm, start_date: e.target.value })} /></label>
              <label>Expiry date<input type="date" value={subForm.end_date} min={subForm.start_date || undefined} disabled={!subForm.id} onChange={e => setSubForm({ ...subForm, end_date: e.target.value })} /></label>
            </div>
            {!subForm.id && <p className="am-note">The expiry date is set automatically from the plan duration.</p>}
            <div className="sub-form-actions">
              <button type="button" className="um-refresh" onClick={() => setSubForm(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="am-button sub-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
>>>>>>> master
    </div>
  );
}
