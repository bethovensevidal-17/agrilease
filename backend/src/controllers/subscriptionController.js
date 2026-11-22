const db = require('../db');
const path = require('path');
const fs = require('fs');
const { notifyUser, notifyAdmins } = require('../services/notifications');
const { GRACE_DAYS } = require('../services/subscriptionAccess');

const fmtDate = value => (value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '');

const PLAN_CODES = {
  'FREE TRIAL': 'trial',
  MONTHLY: 'paid',
  QUARTERLY: 'paid',
  'SEMI-ANNUAL': 'paid',
  ANNUAL: 'paid'
};

async function listPlans(_req, res, next) {
  try {
    const [plans] = await db.execute(
      'SELECT id, plan_name, price, duration_days, equipment_limit, description FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC'
    );
    res.json({ success: true, data: plans });
  } catch (error) { next(error); }
}

async function mySubscription(req, res, next) {
  try {
    // Mark expired subscriptions automatically.
    await db.execute(
      `UPDATE subscriptions
          SET status = 'expired'
        WHERE owner_id = ?
          AND status = 'active'
          AND (end_date IS NULL OR end_date < NOW())`,
      [req.user.id]
    );

    // Get the current active subscription first.
    const [activeRows] = await db.execute(
      `SELECT s.id, s.owner_id, s.plan_id, s.subscription_type,
              s.status, s.start_date, s.end_date,
              p.plan_name, p.price, p.duration_days,
              p.equipment_limit
         FROM subscriptions s
         LEFT JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.owner_id = ?
          AND s.status = 'active'
          AND s.end_date >= NOW()
        ORDER BY s.end_date DESC, s.id DESC
        LIMIT 1`,
      [req.user.id]
    );

    // Get the latest pending request separately.
    const [pendingRows] = await db.execute(
      `SELECT s.id, s.owner_id, s.plan_id, s.subscription_type,
              s.status, s.start_date, s.end_date,
              p.plan_name, p.price, p.duration_days,
              p.equipment_limit
         FROM subscriptions s
         LEFT JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.owner_id = ?
          AND s.status = 'pending'
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT 1`,
      [req.user.id]
    );

    // Keep the existing equipment count.
    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS equipment_count
         FROM equipment
        WHERE owner_id = ?
          AND is_archived = 0`,
      [req.user.id]
    );

    // Preserve compatibility with the existing Owner frontend.
    const subscription = activeRows[0] || pendingRows[0] || null;

    // Grace period: kung nag-expire na, hanggang kailan pa nakikita ang listings.
    const [[last]] = await db.execute(
      `SELECT MAX(end_date) AS last_end
         FROM subscriptions
        WHERE owner_id = ? AND status IN ('active', 'expired')`,
      [req.user.id]
    );
    let graceInfo = { days: GRACE_DAYS, in_grace: false, listings_hidden: false, last_end: null, grace_ends_at: null };
    if (!activeRows[0] && last.last_end && Number(count.equipment_count || 0) > 0) {
      const graceEnds = new Date(new Date(last.last_end).getTime() + GRACE_DAYS * 86400000);
      const inGrace = graceEnds.getTime() >= Date.now();
      graceInfo = { days: GRACE_DAYS, in_grace: inGrace, listings_hidden: !inGrace, last_end: last.last_end, grace_ends_at: graceEnds };
    }

    res.json({
      success: true,
      subscription,
      pending_subscription: pendingRows[0] || null,
      equipment_count: Number(count.equipment_count || 0),
      grace: graceInfo
    });
  } catch (error) {
    next(error);
  }
}

async function requestPlan(req, res, next) {
  const conn = await db.getConnection();
  try {
    const planId = Number(req.body.plan_id);
    if (!Number.isInteger(planId) || planId < 1) return res.status(400).json({ error: 'Select a valid subscription plan.' });
    await conn.beginTransaction();
    const [[plan]] = await conn.execute('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1', [planId]);
    if (!plan) { await conn.rollback(); return res.status(404).json({ error: 'This subscription plan is not available.' }); }
    const [[owner]] = await conn.execute('SELECT trial_used FROM provider_profiles WHERE user_id = ? FOR UPDATE', [req.user.id]);
    if (!owner) { await conn.rollback(); return res.status(404).json({ error: 'Owner profile not found.' }); }

    const [pendingRequests] = await conn.execute(
      `SELECT id
         FROM subscriptions
        WHERE owner_id = ?
          AND status = 'pending'
        LIMIT 1
        FOR UPDATE`,
      [req.user.id]
    );

    if (pendingRequests.length) {
      await conn.rollback();
      return res.status(409).json({
        error: 'You still have a pending subscription request. Please wait for Admin verification before submitting again.'
      });
    }

    const isTrial = Number(plan.price) === 0;
    if (isTrial) {
      if (owner.trial_used) { await conn.rollback(); return res.status(409).json({ error: 'Your one-time free trial has already been used.' }); }
      const trialDays = Number(plan.duration_days) || 7;
      const [active] = await conn.execute("SELECT id FROM subscriptions WHERE owner_id = ? AND status = 'active' AND end_date >= NOW() LIMIT 1", [req.user.id]);
      if (active.length) { await conn.rollback(); return res.status(409).json({ error: 'You already have an active subscription.' }); }
      await conn.execute(
        "INSERT INTO subscriptions (owner_id, plan_id, subscription_type, status, start_date, end_date) VALUES (?, ?, 'trial', 'active', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))",
        [req.user.id, planId, trialDays]
      );
      await conn.execute('UPDATE provider_profiles SET trial_used = 1 WHERE user_id = ?', [req.user.id]);
      await conn.commit();
      return res.status(201).json({ success: true, message: `Your ${trialDays}-day free trial is now active.` });
    }

    const method = String(req.body.payment_method || '').toLowerCase();
    if (!['gcash', 'bank_transfer', 'other'].includes(method)) { await conn.rollback(); return res.status(400).json({ error: 'Select GCash, Bank Transfer, or Other for the subscription payment.' }); }
    const reference = String(req.body.reference_number || '').trim();
    if (reference.length > 100) { await conn.rollback(); return res.status(400).json({ error: 'Payment reference is too long.' }); }
    const proof = req.file ? `payment-proofs/${req.file.filename}` : null;
    if (!proof) { await conn.rollback(); return res.status(400).json({ error: 'Proof of payment is required.' }); }

    const [sub] = await conn.execute(
      "INSERT INTO subscriptions (owner_id, plan_id, subscription_type, status, start_date, end_date) VALUES (?, ?, 'paid', 'pending', NULL, NULL)",
      [req.user.id, planId]
    );
    await conn.execute(
      "INSERT INTO subscription_payments (subscription_id, amount, payment_method, reference_number, proof_image, payment_status) VALUES (?, ?, ?, ?, ?, 'pending')",
      [sub.insertId, plan.price, method, reference || null, proof]
    );
    await conn.commit();

    try {
      await notifyAdmins(
        'New subscription payment',
        `Owner #${req.user.id} submitted a ${plan.plan_name} subscription payment request of PHP ${Number(plan.price).toFixed(2)}. Awaiting verification.`,
        '/admin/subscriptions'
      );
    } catch (notificationError) {
      console.error('Subscription notification to admins failed:', notificationError);
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription request submitted. Awaiting admin payment verification.'
    });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    next(error);
  } finally { conn.release(); }
}

async function verifyPayment(req, res, next) {
  const conn = await db.getConnection();
  try {
    const paymentId = Number(req.params.id);
    const decision = String(req.body.status || '').toLowerCase();
    const reason = String(req.body.reason || '').trim().slice(0, 255);
    if (!Number.isInteger(paymentId) || paymentId < 1 || !['verified', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid payment ID or verification status.' });
    }
    if (decision === 'rejected' && reason.length < 3) {
      return res.status(400).json({ error: 'Enter a reason for rejecting this payment so the owner knows what to fix.' });
    }
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT sp.id, sp.subscription_id, sp.payment_status, s.status AS subscription_status, s.owner_id, s.plan_id, p.duration_days
         FROM subscription_payments sp
         JOIN subscriptions s ON s.id = sp.subscription_id
         JOIN subscription_plans p ON p.id = s.plan_id
        WHERE sp.id = ? FOR UPDATE`, [paymentId]
    );
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: 'Payment record not found.' }); }
    const payment = rows[0];
    if (payment.payment_status !== 'pending') { await conn.rollback(); return res.status(409).json({ error: 'Payment has already been reviewed.' }); }
    if (decision === 'verified' && payment.subscription_status !== 'pending') {
      await conn.rollback();
      return res.status(409).json({ error: 'This subscription request is no longer pending (it may have been cancelled). Ask the owner to submit a new request.' });
    }
    await conn.execute(
      'UPDATE subscription_payments SET payment_status = ?, verified_by = ?, payment_date = NOW(), rejection_reason = ? WHERE id = ?',
      [decision, req.user.id, decision === 'rejected' ? reason : null, paymentId]
    );
    if (decision === 'verified') {
      // Find the current valid subscription before replacing it.
      const [activeRows] = await conn.execute(
        `SELECT id, end_date
           FROM subscriptions
          WHERE owner_id = ?
            AND status = 'active'
            AND end_date >= NOW()
          ORDER BY end_date DESC, id DESC
          LIMIT 1
          FOR UPDATE`,
        [payment.owner_id]
      );

      // Continue from the current expiry date when renewing early.
      const activeEndDate = activeRows.length ? activeRows[0].end_date : null;

      // Expire the previous active subscription.
      await conn.execute(
        `UPDATE subscriptions
            SET status = 'expired'
          WHERE owner_id = ?
            AND status = 'active'`,
        [payment.owner_id]
      );

      // Activate the verified plan.
      await conn.execute(
        `UPDATE subscriptions
            SET status = 'active',
                start_date = GREATEST(NOW(), COALESCE(?, NOW())),
                end_date = DATE_ADD(
                  GREATEST(NOW(), COALESCE(?, NOW())),
                  INTERVAL ? DAY
                )
          WHERE id = ?`,
        [
          activeEndDate,
          activeEndDate,
          Number(payment.duration_days),
          payment.subscription_id
        ]
      );
    } else {
      await conn.execute(
        "UPDATE subscriptions SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
        [payment.subscription_id]
      );
    }
    await conn.commit();

    let activated = null;
    if (decision === 'verified') {
      const [[row]] = await db.execute(
        `SELECT s.start_date, s.end_date, p.plan_name
           FROM subscriptions s LEFT JOIN subscription_plans p ON p.id = s.plan_id
          WHERE s.id = ?`, [payment.subscription_id]
      );
      activated = row || null;
    }
    try {
      await notifyUser(
        payment.owner_id,
        `Subscription payment ${decision}`,
        decision === 'verified'
          ? `Your payment was verified. Your ${activated?.plan_name || ''} subscription is active until ${fmtDate(activated?.end_date)}.`.replace('  ', ' ')
          : `Your subscription payment was rejected. Reason: ${reason}. You can submit a new request with the correct details.`,
        '/owner/subscription'
      );
    } catch (notificationError) {
      console.error('Subscription payment notification failed:', notificationError);
    }

    res.json({
      success: true,
      message: decision === 'verified'
        ? `Payment verified. Subscription is active until ${fmtDate(activated?.end_date)}.`
        : 'Payment rejected. The owner was notified with your reason.',
      start_date: activated?.start_date || null,
      end_date: activated?.end_date || null
    });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    next(error);
  } finally { conn.release(); }
}


async function getPaymentProof(req, res, next) {
  try {
    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId < 1) return res.status(400).json({ error: 'Invalid payment ID.' });
    const [rows] = await db.execute('SELECT proof_image FROM subscription_payments WHERE id = ? LIMIT 1', [paymentId]);
    if (!rows.length || !rows[0].proof_image) return res.status(404).json({ error: 'Payment proof not found.' });
    const filename = path.basename(rows[0].proof_image);
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'payment-proofs', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Payment proof file is missing from the server.' });
    return res.sendFile(filePath);
  } catch (error) { next(error); }
}

async function myPayments(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT
          sp.id,
          sp.subscription_id,
          sp.amount,
          sp.payment_method,
          sp.reference_number,
          sp.payment_status,
          sp.payment_date,
          sp.rejection_reason,
          s.plan_id,
          s.status AS subscription_status,
          p.plan_name,
          p.duration_days,
          p.equipment_limit
       FROM subscription_payments sp
       INNER JOIN subscriptions s
         ON s.id = sp.subscription_id
       LEFT JOIN subscription_plans p
         ON p.id = s.plan_id
       WHERE s.owner_id = ?
       ORDER BY sp.id DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

// ---------- ADMIN: plans and subscriptions management ----------
function cleanPlan(body) {
  const name = String(body.plan_name || '').trim();
  const price = Number(body.price);
  const days = Number(body.duration_days);
  const limitRaw = body.equipment_limit;
  const limit = limitRaw === null || limitRaw === undefined || limitRaw === '' ? null : Number(limitRaw);
  const description = String(body.description || '').trim();
  if (name.length < 2 || name.length > 50) return { error: 'Plan name must be 2 to 50 characters.' };
  if (!Number.isFinite(price) || price < 0 || price > 99999999) return { error: 'Enter a valid price (0 or higher).' };
  if (!Number.isInteger(days) || days < 1 || days > 3650) return { error: 'Duration must be a whole number of days (1 to 3650).' };
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return { error: 'Equipment limit must be a whole number, or blank for unlimited.' };
  if (description.length > 1000) return { error: 'Description is too long.' };
  const isActive = body.is_active === undefined ? 1 : (body.is_active === true || body.is_active === 1 || body.is_active === '1' ? 1 : 0);
  return { value: { name, price, days, limit, description: description || null, isActive } };
}

async function adminCreatePlan(req, res, next) {
  try {
    const { value, error } = cleanPlan(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    const [dupe] = await db.execute('SELECT id FROM subscription_plans WHERE LOWER(plan_name) = LOWER(?) LIMIT 1', [value.name]);
    if (dupe.length) return res.status(409).json({ success: false, message: 'A plan with this name already exists.' });
    const [result] = await db.execute(
      'INSERT INTO subscription_plans (plan_name, price, duration_days, equipment_limit, description, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [value.name, value.price, value.days, value.limit, value.description, value.isActive]
    );
    res.status(201).json({ success: true, message: 'Plan added.', id: result.insertId });
  } catch (error) { next(error); }
}

async function adminUpdatePlan(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid plan ID.' });
    const { value, error } = cleanPlan(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    const [dupe] = await db.execute('SELECT id FROM subscription_plans WHERE LOWER(plan_name) = LOWER(?) AND id <> ? LIMIT 1', [value.name, id]);
    if (dupe.length) return res.status(409).json({ success: false, message: 'Another plan with this name already exists.' });
    const [result] = await db.execute(
      'UPDATE subscription_plans SET plan_name = ?, price = ?, duration_days = ?, equipment_limit = ?, description = ?, is_active = ? WHERE id = ?',
      [value.name, value.price, value.days, value.limit, value.description, value.isActive, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Plan not found.' });
    res.json({ success: true, message: 'Plan updated.' });
  } catch (error) { next(error); }
}

function validDateTime(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

async function adminCreateSubscription(req, res, next) {
  const conn = await db.getConnection();
  try {
    const ownerId = Number(req.body.owner_id);
    const planId = Number(req.body.plan_id);
    if (!Number.isInteger(ownerId) || ownerId < 1) return res.status(400).json({ success: false, message: 'Select an owner.' });
    if (!Number.isInteger(planId) || planId < 1) return res.status(400).json({ success: false, message: 'Select a plan.' });
    const [[owner]] = await conn.execute("SELECT id, status FROM users WHERE id = ? AND role = 'owner' LIMIT 1", [ownerId]);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found.' });
    const [[plan]] = await conn.execute('SELECT id, plan_name, price, duration_days FROM subscription_plans WHERE id = ? LIMIT 1', [planId]);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });
    const startDate = req.body.start_date && validDateTime(req.body.start_date) ? req.body.start_date : null;
    const type = Number(plan.price) === 0 ? 'trial' : 'paid';
    const recordPayment = type === 'paid' && (req.body.record_payment === true || req.body.record_payment === 1 || req.body.record_payment === '1');

    await conn.beginTransaction();
    // Walang "pending" na ginagawa ng admin: nauuwi iyon sa request na walang bayad na humaharang sa owner.
    await conn.execute("UPDATE subscriptions SET status = 'expired' WHERE owner_id = ? AND status = 'active'", [ownerId]);
    const [result] = await conn.execute(
      `INSERT INTO subscriptions (owner_id, plan_id, subscription_type, status, start_date, end_date)
       VALUES (?, ?, ?, 'active', COALESCE(?, NOW()), DATE_ADD(COALESCE(?, NOW()), INTERVAL ? DAY))`,
      [ownerId, planId, type, startDate, startDate, Number(plan.duration_days)]
    );
    if (recordPayment) {
      await conn.execute(
        "INSERT INTO subscription_payments (subscription_id, amount, payment_method, reference_number, payment_status, verified_by, payment_date) VALUES (?, ?, 'cash', 'Recorded by admin', 'verified', ?, NOW())",
        [result.insertId, plan.price, req.user.id]
      );
    }
    if (type === 'trial') await conn.execute('UPDATE provider_profiles SET trial_used = 1 WHERE user_id = ?', [ownerId]).catch(() => {});
    await conn.commit();

    const [[row]] = await db.execute('SELECT end_date FROM subscriptions WHERE id = ?', [result.insertId]);
    try { await notifyUser(ownerId, 'Subscription updated', `An administrator activated your ${plan.plan_name} subscription until ${fmtDate(row?.end_date)}.`, '/owner/subscription'); } catch (e) { console.error('Subscription notification failed:', e.message); }
    res.status(201).json({ success: true, message: `Subscription added. Active until ${fmtDate(row?.end_date)}.`, id: result.insertId });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    next(error);
  } finally { conn.release(); }
}

// ADMIN: pag-aayos ng ACTIVE na subscription (palitan ang plan, ilipat ang expiry, o i-cancel).
// Hindi ito para mag-approve ng pending request. Para doon, gamitin ang Review Payment (verifyPayment),
// kasi doon kusang kinukuwenta ang start at expiry date.
async function adminUpdateSubscription(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid subscription ID.' });
    const [[current]] = await db.execute('SELECT id, owner_id, plan_id, status, start_date, end_date FROM subscriptions WHERE id = ? LIMIT 1', [id]);
    if (!current) return res.status(404).json({ success: false, message: 'Subscription not found.' });
    if (current.status === 'pending') {
      return res.status(409).json({ success: false, message: 'This is a pending request. Use Review Payment to verify or reject it so the dates are set automatically.' });
    }
    if (current.status !== 'active') {
      return res.status(409).json({ success: false, message: 'Only active subscriptions can be adjusted. To give the owner a new plan, use Add Subscription.' });
    }
    const reason = String(req.body.reason || '').trim().slice(0, 255);
    if (reason.length < 3) return res.status(400).json({ success: false, message: 'Enter a reason for this change (at least 3 characters).' });

    if (String(req.body.status || '') === 'cancelled') {
      await db.execute("UPDATE subscriptions SET status = 'cancelled', admin_note = ? WHERE id = ?", [reason, id]);
      try { await notifyUser(current.owner_id, 'Subscription cancelled', `An administrator cancelled your subscription. Reason: ${reason}.`, '/owner/subscription'); } catch (e) { console.error('Subscription notification failed:', e.message); }
      return res.json({ success: true, message: 'Subscription cancelled.' });
    }

    const planId = req.body.plan_id ? Number(req.body.plan_id) : current.plan_id;
    const [[plan]] = await db.execute('SELECT id, plan_name, price, duration_days FROM subscription_plans WHERE id = ? LIMIT 1', [planId]);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });
    const planChanged = Number(planId) !== Number(current.plan_id);
    if (planChanged && Number(plan.price) === 0) {
      return res.status(400).json({ success: false, message: 'The Free Trial is one-time only and cannot be assigned here.' });
    }

    let endSql = null;
    if (req.body.end_date) {
      if (!validDateTime(req.body.end_date)) return res.status(400).json({ success: false, message: 'Invalid expiry date.' });
      const requested = new Date(`${req.body.end_date}T23:59:59`);
      if (requested.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'The expiry date must be today or later. To end the subscription now, use Cancel subscription.' });
      }
      if (current.start_date && requested.getTime() < new Date(current.start_date).getTime()) {
        return res.status(400).json({ success: false, message: 'The expiry date cannot be earlier than the start date.' });
      }
      endSql = `${req.body.end_date} 23:59:59`;
    }

    // Kapag nagpalit ng plan at walang inilagay na expiry, kukunin ang expiry mula sa duration ng bagong plan.
    await db.execute(
      `UPDATE subscriptions
          SET plan_id = ?,
              subscription_type = ?,
              end_date = COALESCE(?, ${planChanged ? 'DATE_ADD(COALESCE(start_date, NOW()), INTERVAL ? DAY)' : 'end_date'}),
              reminder_7d_sent_at = NULL,
              reminder_1d_sent_at = NULL,
              admin_note = ?
        WHERE id = ?`,
      planChanged
        ? [planId, Number(plan.price) === 0 ? 'trial' : 'paid', endSql, Number(plan.duration_days), reason, id]
        : [planId, Number(plan.price) === 0 ? 'trial' : 'paid', endSql, reason, id]
    );
    const [[after]] = await db.execute('SELECT end_date FROM subscriptions WHERE id = ?', [id]);
    try { await notifyUser(current.owner_id, 'Subscription updated', `Your subscription is now ${plan.plan_name}, active until ${fmtDate(after?.end_date)}. Reason: ${reason}.`, '/owner/subscription'); } catch (e) { console.error('Subscription notification failed:', e.message); }
    res.json({ success: true, message: `Subscription updated. Active until ${fmtDate(after?.end_date)}.` });
  } catch (error) { next(error); }
}

module.exports = {
  listPlans,
  mySubscription,
  myPayments,
  requestPlan,
  verifyPayment,
  getPaymentProof,
  adminCreatePlan,
  adminUpdatePlan,
  adminCreateSubscription,
  adminUpdateSubscription
};
