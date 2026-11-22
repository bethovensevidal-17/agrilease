// Iisang lugar para sa label ng payment status, para pareho ang lumalabas sa farmer, owner at admin.
// - Cash: walang proof at hindi dumadaan sa admin; ang owner ang nagkukumpirma ng natanggap na bayad.
// - Online (GCash/bank/other): ang owner din ang nagve-verify o nagre-reject ng proof, kaya pretty(payment_status) lang.
const pretty = value => String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function paymentState(row, viewer = 'owner') {
  const method = String(row.payment_method || '').toLowerCase();
  const pay = String(row.payment_status || 'pending').toLowerCase();
  const booking = String(row.status ?? row.booking_status ?? '').toLowerCase();
  if (method !== 'cash') return { text: pretty(pay), cls: pay };
  if (pay === 'verified') return { text: 'Cash received', cls: 'verified' };
  if (pay === 'rejected') return { text: 'Rejected', cls: 'rejected' };
  // Walang babayaran kung na-reject o na-cancel ang booking.
  if (booking === 'rejected' || booking === 'cancelled') return { text: 'No payment due', cls: 'none' };
  return { text: viewer === 'farmer' ? 'To pay in cash' : 'Awaiting cash', cls: 'pending' };
}

export const canConfirmCash = row =>
  String(row.payment_method || '').toLowerCase() === 'cash' &&
  String(row.payment_status || 'pending').toLowerCase() === 'pending' &&
  ['approved', 'ongoing', 'completed'].includes(String(row.status || '').toLowerCase());

// Online payment na may proof/reference na naghihintay ng review ng owner.
export const canReviewOnline = row =>
  String(row.payment_method || '').toLowerCase() !== 'cash' &&
  !!row.payment_method &&
  String(row.payment_status || 'pending').toLowerCase() === 'pending' &&
  !['rejected', 'cancelled'].includes(String(row.status || '').toLowerCase()) &&
  !!(row.payment_proof || row.payment_reference);
