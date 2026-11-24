// Iisang lugar para sa mga patakaran ng subscription ng owner:
// - may "grace period" pagkatapos mag-expire bago maitago ang listings
// - limit ng listings kada plan
const db = require('../db');

const parsedGrace = Number(process.env.SUBSCRIPTION_GRACE_DAYS);
const GRACE_DAYS = Number.isInteger(parsedGrace) && parsedGrace >= 0 && parsedGrace <= 60 ? parsedGrace : 3;

// SQL condition: ang owner ng equipment (alias) ay may active na plan, o nasa grace period pa.
// Ang 'expired' ay isinasama dahil kusang nagiging expired ang status pagkatapos ng end_date.
function coverageCondition(alias = 'e') {
  return `EXISTS (SELECT 1 FROM subscriptions sc
            WHERE sc.owner_id = ${alias}.owner_id
              AND sc.status IN ('active', 'expired')
              AND sc.end_date >= DATE_SUB(NOW(), INTERVAL ${GRACE_DAYS} DAY))`;
}

async function ownerHasCoverage(executor, ownerId) {
  const [rows] = await executor.query(
    `SELECT 1 FROM subscriptions
      WHERE owner_id = ? AND status IN ('active', 'expired')
        AND end_date >= DATE_SUB(NOW(), INTERVAL ${GRACE_DAYS} DAY)
      LIMIT 1`,
    [ownerId]
  );
  return rows.length > 0;
}

// Pang-create at pang-restore ng equipment. Ang bagong listing ay nangangailangan ng ACTIVE na plan (walang grace).
async function checkListingAllowance(ownerId, { extra = 1 } = {}) {
  const [subs] = await db.execute(
    `SELECT s.id, s.baseline_count, p.equipment_limit
       FROM subscriptions s
       JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.owner_id = ? AND s.status = 'active' AND s.end_date >= NOW()
      ORDER BY s.end_date DESC, s.id DESC LIMIT 1`,
    [ownerId]
  );
  if (!subs.length) {
    return { ok: false, status: 403, body: { error: 'You do not have an active subscription. Please choose a subscription plan before adding or restoring equipment.' } };
  }
  const limit = subs[0].equipment_limit;
  if (limit === null || limit === undefined) return { ok: true };
  const [[count]] = await db.execute(
    'SELECT COUNT(*) AS total FROM equipment WHERE owner_id = ? AND is_archived = 0',
    [ownerId]
  );
  const baseline = Number(subs[0].baseline_count || 0);
  const used = Math.max(0, Number(count.total) - baseline);
  if (used + extra > Number(limit)) {
    return {
      ok: false,
      status: 403,
      body: {
        error: `You have reached the equipment listing limit of ${limit} for your subscription. Upgrade to list more.`,
        code: 'SUBSCRIPTION_LIMIT_REACHED',
        equipment_limit: Number(limit),
        equipment_count: Number(count.total),
        equipment_used: used
      }
    };
  }
  return { ok: true };
}

module.exports = { GRACE_DAYS, coverageCondition, ownerHasCoverage, checkListingAllowance };
