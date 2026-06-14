import { GuestSource } from '../types';

// Source badge config and renderer
const SOURCE_CONFIG: Record<GuestSource, { labelKey: string; cls: string }> = {
  'walk-in': { labelKey: 'dashboard.sourceWalkIn', cls: 'bg-zinc-100 text-zinc-600' },
  'booking': { labelKey: 'dashboard.sourceBooking', cls: 'bg-blue-50 text-blue-600' },
  'airbnb': { labelKey: 'dashboard.sourceAirbnb', cls: 'bg-pink-50 text-pink-600' },
  'expedia': { labelKey: 'dashboard.sourceExpedia', cls: 'bg-orange-50 text-orange-600' },
  'ical': { labelKey: 'dashboard.sourceIcal', cls: 'bg-purple-50 text-purple-600' },
  'manual': { labelKey: 'dashboard.sourceManual', cls: 'bg-zinc-100 text-zinc-600' },
  'direct': { labelKey: 'dashboard.sourceDirect', cls: 'bg-teal-50 text-teal-600' },
  'referral': { labelKey: 'dashboard.sourceReferral', cls: 'bg-cyan-50 text-cyan-600' },
  'group': { labelKey: 'dashboard.sourceGroup', cls: 'bg-indigo-50 text-indigo-600' },
};

export function getSourceConfig(source: GuestSource) {
  return SOURCE_CONFIG[source] || SOURCE_CONFIG['walk-in'];
}

// Payment status label helper
export function getPaymentStatusClass(status: string): string {
  if (status === 'paid') return 'text-emerald-600';
  if (status === 'partial') return 'text-amber-500';
  return 'text-red-500';
}
