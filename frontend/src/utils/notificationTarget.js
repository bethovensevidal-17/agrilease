export function getNotificationTarget(item, role) {
  const url = item?.action_url;
  const selfPages = ['/admin/notifications', '/owner/notifications', '/farmer/notifications'];
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !selfPages.includes(url)) return url;
  const text = `${item?.title || ''} ${item?.message || ''}`.toLowerCase();
  if (role === 'admin') {
    if (text.includes('owner') || text.includes('verification') || text.includes('application')) return '/admin/owners';
    if (text.includes('payment') || text.includes('subscription')) return '/admin/subscriptions';
    if (text.includes('equipment')) return '/admin/equipment';
    if (text.includes('booking') || text.includes('rental')) return '/admin/reports';
    if (text.includes('user') || text.includes('account') || text.includes('suspend')) return '/admin/users';
    return '/admin';
  }
  if (role === 'owner') {
    if (text.includes('payment') || text.includes('subscription') || text.includes('trial')) return '/owner/subscription';
    if (text.includes('equipment')) return '/owner/equipment';
    if (text.includes('booking') || text.includes('rental')) return '/owner/bookings';
    return '/owner';
  }
  if (text.includes('payment') || text.includes('transaction')) return '/farmer/transactions';
  if (text.includes('equipment')) return '/farmer/equipment';
  if (text.includes('booking') || text.includes('rental')) return '/farmer/rentals';
  return '/farmer';
}
