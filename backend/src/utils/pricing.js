const H = 3600000; // milliseconds kada oras
const r2 = (n) => Math.round(n * 100) / 100;

// rateType: 'hourly' | 'daily' | 'hectare'
function calcBase(rate, rateType, start, end, hectares) {
  const hrs = (end - start) / H;
  rate = Number(rate);

  if (rateType === 'hourly') {
    return r2(rate * Math.max(1, Math.ceil(hrs)));
  }
  if (rateType === 'daily') {
    const days = Math.floor(hrs / 24);
    const extraHrs = Math.ceil(hrs - days * 24);
    return r2(days * rate + (extraHrs * rate) / 24);
  }
  // hectare: hindi nakabase sa oras
  return r2(rate * Number(hectares));
}

async function hasConflict(db, equipmentId, start, end) {
  const [rows] = await db.query(
    `SELECT id FROM rental_requests
     WHERE equipment_id = ?
       AND status IN ('approved','ongoing')
       AND ? < end_at AND ? > start_at
     LIMIT 1`,
    [equipmentId, start, end]
  );
  return rows.length > 0;
}

module.exports = { H, r2, calcBase, hasConflict };
