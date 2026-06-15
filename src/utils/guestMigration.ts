import type { Guest } from '../types';

/**
 * One-time migration for guests stored in pre-v1.6.0 localStorage.
 *  - Splits `name` into `firstName` / `lastName` when both are absent
 *  - Defaults `idType` to 'passport' when absent
 *  - Leaves phone/email/arrivalTime/referral/bookingSource as undefined
 *    (UI will show 'Not provided' placeholder)
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
