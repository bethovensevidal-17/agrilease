export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

export function formatDate(date) {
  if (!date) return '—';
  
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatEquipmentStatus(status) {
  switch (status) {
    case 'available':
      return 'Available for Rent';
    case 'rented':
      return 'Currently Rented';
    case 'under_maintenance':
      return 'Under Maintenance';
    default:
      return 'Unknown Status';
  }
}