const HOUR_MS = 60 * 60 * 1000;
const MIN_DAY_HOURS = 24; // per-day rate: minimum charge is one full day
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Database rate types are `hour`, `day`, and `hectare`.
 * Hourly rentals are prorated by the exact rental duration. Daily rentals have a minimum charge of 1 day (24 hours)
 * and are prorated by hour only for the time beyond that;
 * hectare rentals use farm area and do not depend on the selected time duration.
 */
function calculateRentalTotal({ rate, rateType, start, end, quantity = 1, farmArea = null }) {
  const unitRate = Number(rate);
  const units = Number(quantity);
  if (!Number.isFinite(unitRate) || unitRate <= 0) throw new Error('Invalid rental rate.');
  if (!Number.isInteger(units) || units < 1) throw new Error('Rental quantity must be at least 1.');

  let subtotal;
  if (rateType === 'hectare') {
    const area = Number(farmArea);
    if (!Number.isFinite(area) || area <= 0) throw new Error('Farm area must be greater than zero.');
    subtotal = unitRate * area * units;
  } else {
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('Rental duration must be greater than zero.');
    const hours = durationMs / HOUR_MS;
    if (rateType === 'hour') subtotal = unitRate * hours * units;
    else if (rateType === 'day') subtotal = (unitRate / 24) * Math.max(hours, MIN_DAY_HOURS) * units;
    else throw new Error('Unsupported rental rate type.');
  }
  return roundMoney(subtotal);
}

// Backward-compatible exports used by older code paths.
function calcBase(rate, rateType, start, end, hectares, quantity = 1) {
  return calculateRentalTotal({ rate, rateType, start, end, farmArea: hectares, quantity });
}

async function hasConflict(db, equipmentId, start, end, excludeId = null) {
  const sql = `SELECT id FROM rental_requests
    WHERE equipment_id = ? AND status IN ('approved','ongoing')
      AND start_date < ? AND end_date > ? ${excludeId ? 'AND id <> ?' : ''}
    LIMIT 1`;
  const params = [equipmentId, end, start];
  if (excludeId) params.push(excludeId);
  const [rows] = await db.query(sql, params);
  return rows.length > 0;
}

module.exports = { H: HOUR_MS, r2: roundMoney, calcBase, calculateRentalTotal, hasConflict };
