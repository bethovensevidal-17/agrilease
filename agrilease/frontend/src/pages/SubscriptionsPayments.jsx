import { useEffect, useMemo, useState } from 'react';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
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
    plan.includes('free trial')
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

export default function SubscriptionsPayments() {
  const [data, setData] = useState({
    subscriptions: [],
    plans: [],
    payments: [],
    subscriptionsConfigured: true,
    paymentsConfigured: false,
  });

  const [tab, setTab] = useState('subscriptions');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
        subscriptionsConfigured:
          result.subscriptionsConfigured !== false,
        paymentsConfigured:
          result.paymentsConfigured === true,
      });
    } catch (err) {
      setError(
        err.message || 'Unable to load subscription records.'
      );
    } finally {
      setLoading(false);
    }
  }

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

    return counts;
  }, [data.subscriptions]);

  const rows = useMemo(() => {
    const source =
      tab === 'subscriptions'
        ? data.subscriptions
        : tab === 'plans'
          ? data.plans
          : data.payments;

    const normalizedSearch = search.trim().toLowerCase();

    return [...source]
      .sort(sortById)
      .filter(record => {
        if (statusFilter !== 'all' && tab !== 'plans') {
          const status = tab === 'subscriptions'
            ? getSubscriptionCategory(record)
            : String(record.status || 'unknown').toLowerCase();
          if (status !== statusFilter) return false;
        }
        if (!normalizedSearch) return true;

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
    if (!window.confirm(`Are you sure you want to ${action} payment #${payment.id}?`)) return;
    try {
      await api(`/admin/subscription-payments/${payment.id}/verify`, {
        method: 'PATCH',
        body: { status }
      });
      await load();
    } catch (err) {
      setError(err.message || 'Unable to update payment status.');
    }
  }

  return (
    <div className="am-page am-subscriptions-page">
      <div className="admin-page-heading">
        <div>
          <h1>Subscriptions</h1>
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
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="um-message error">{error}</div>
      )}

      {/* SUBSCRIPTION OVERVIEW */}
      <section className="am-subscription-overview">
        <div className="am-section-heading">
          <div>
            <h2>Subscription Overview</h2>
            <p>Current subscription records of equipment owners.</p>
          </div>
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
      )}

      {/* RECORDS */}
      <section className="um-panel am-subscription-records">
        <div className="am-tabs">
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
        </div>

        <div className="um-panel-heading am-subscription-record-heading">
          <div>
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
        </div>

        <div className="am-subscription-search">
          <input
            className="am-report-search"
            type="search"
            value={search}
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
          <button type="button" className="um-refresh" onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1); }}>Clear Filters</button>
        </div>

        <div className="um-table-wrapper">
          <table className="um-table">
            {tab === 'subscriptions' ? (
              <>
                <thead>
                  <tr>
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
                  ) : shown.length ? (
                    shown.map(subscription => (
                      <tr key={subscription.id}>
                        <td>#{subscription.id}</td>

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
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
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
                  ) : shown.length ? (
                    shown.map(payment => (
                      <tr key={payment.id}>
                        <td>#{payment.id}</td>

                        <td>
                          {payment.owner_name ||
                            `Owner #${payment.owner_id || '—'}`}
                        </td>

                        <td>{money(payment.amount)}</td>

                        <td>{payment.reference || '—'}</td>

                        <td>
                          <StatusBadge status={payment.status} />
                        </td>

                        <td>{date(payment.created_at)}</td>
                        <td>
                          {String(payment.status).toLowerCase() === 'pending' ? (
                            <div className="am-action-group">
                              <button type="button" onClick={() => openPaymentProof(payment)}>View Proof</button>
                              <button type="button" onClick={() => reviewPayment(payment, 'verified')}>Verify</button>
                              <button type="button" onClick={() => reviewPayment(payment, 'rejected')}>Reject</button>
                            </div>
                          ) : 'Reviewed'}
                        </td>
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
              </>
            )}
          </table>
        </div>

        {!loading && (
          <Pagination
            totalItems={rows.length}
            itemsPerPage={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
          />
        )}
      </section>
    </div>
  );
}
