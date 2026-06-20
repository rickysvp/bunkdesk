import type { Guest, BookingSource } from '../types';

/**
 * One-time migration for guests stored in pre-v1.7.0 localStorage.
 *  - Splits `name` into `firstName` / `lastName` when both are absent
 *  - Defaults `idType` to 'passport' when absent
 *  - Maps old bookingSource values (phone/email/referral/other) to new OTA values
 *  - Removes obsolete dob, policeConsent, referral fields
 */
export function migrateGuest(g: Guest): Guest {
  const result: Guest = { ...g };

  if (!g.firstName && !g.lastName && g.name) {
    const parts = g.name.trim().split(/\s+/);
    result.firstName = parts[0] || '';
    result.lastName = parts.slice(1).join(' ') || '';
  }

  if (!g.idType) {
    result.idType = 'passport';
  }

  if (!result.name && (result.firstName || result.lastName)) {
    result.name = [result.firstName, result.lastName].filter(Boolean).join(' ');
  }
  if (!result.name) {
    result.name = 'Unknown';
  }

  // Map old bookingSource values to new OTA channels
  const oldSourceMap: Record<string, BookingSource> = {
    'phone': 'other-ota',
    'email': 'other-ota',
    'referral': 'other-ota',
    'other': 'other-ota',
  };
  if (result.bookingSource && oldSourceMap[result.bookingSource]) {
    result.bookingSource = oldSourceMap[result.bookingSource];
  }

  // dob 字段在 v1.8.3 重新启用，不再删除
  delete (result as any).policeConsent;
  delete (result as any).referral;

  return result;
}

/**
 * Apply migrateGuest to every guest in arrivals + every guest
 * inside rooms (beds.guest and beds.reservations).
 */
export function migrateGuestsDeep<T extends { arrivals: Guest[]; rooms: Array<{ beds: Array<{ guest?: Guest; reservations?: Guest[] }> }> }>(
  state: T
): T {
  return {
    ...state,
    arrivals: state.arrivals.map(migrateGuest),
    rooms: state.rooms.map((r) => ({
      ...r,
      beds: r.beds.map((b) => ({
        ...b,
        guest: b.guest ? migrateGuest(b.guest) : undefined,
        reservations: b.reservations ? b.reservations.map(migrateGuest) : undefined,
      })),
    })),
  };
}
