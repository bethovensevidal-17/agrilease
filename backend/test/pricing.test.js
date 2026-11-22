const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateRentalTotal } = require('../src/utils/pricing');

test('hourly rate prorates exact duration and multiplies by quantity', () => {
  assert.equal(calculateRentalTotal({ rate: 200, rateType: 'hour', start: '2026-12-01T08:00:00', end: '2026-12-01T13:00:00', quantity: 2 }), 2000);
  assert.equal(calculateRentalTotal({ rate: 200, rateType: 'hour', start: '2026-12-01T08:00:00', end: '2026-12-01T09:30:00', quantity: 2 }), 600);
});

test('per hectare rate multiplies farm area by quantity', () => {
  assert.equal(calculateRentalTotal({ rate: 500, rateType: 'hectare', start: '2026-12-01T08:00:00', end: '2026-12-01T13:00:00', quantity: 2, farmArea: 4 }), 4000);
});

test('zero or negative duration is rejected for time-based rental', () => {
  assert.throws(() => calculateRentalTotal({ rate: 200, rateType: 'hour', start: '2026-12-01T13:00:00', end: '2026-12-01T08:00:00', quantity: 1 }));
});

test('invalid quantity is rejected', () => {
  assert.throws(() => calculateRentalTotal({ rate: 200, rateType: 'hour', start: '2026-12-01T08:00:00', end: '2026-12-01T09:00:00', quantity: 0 }));
});

test('per day rate charges a minimum of one day and prorates the time beyond it', () => {
  // 3 hours on a 600/day rate is still charged as one full day.
  assert.equal(calculateRentalTotal({ rate: 600, rateType: 'day', start: '2026-12-01T08:00:00', end: '2026-12-01T11:00:00', quantity: 1 }), 600);
  // Exactly one day, times 2 units.
  assert.equal(calculateRentalTotal({ rate: 600, rateType: 'day', start: '2026-12-01T08:00:00', end: '2026-12-02T08:00:00', quantity: 2 }), 1200);
  // 36 hours = 1.5 days.
  assert.equal(calculateRentalTotal({ rate: 600, rateType: 'day', start: '2026-12-01T08:00:00', end: '2026-12-02T20:00:00', quantity: 1 }), 900);
});
