import { Room, GuestProfile, GuestTag, Guest } from '../types';
import { subMonths, parseISO, isAfter } from 'date-fns';

/**
 * Build a GuestProfile from all stays of a guest across rooms.
 * Aggregates total stays, nights, spending from current bed assignments.
 */
export function buildGuestProfileFromRooms(
  guestName: string,
  rooms: Room[]
): Omit<GuestProfile, 'id'> | null {
  const stays: Guest[] = [];

  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bed.guest && bed.guest.name === guestName) {
        stays.push(bed.guest);
      }
      if (bed.reservations) {
        for (const res of bed.reservations) {
          if (res.name === guestName) {
            stays.push(res);
          }
        }
      }
    }
  }

  if (stays.length === 0) return null;

  const first = stays.reduce((earliest, s) =>
    parseISO(s.checkInDate) < parseISO(earliest.checkInDate) ? s : earliest
  );
  const last = stays.reduce((latest, s) =>
    parseISO(s.checkOutDate) > parseISO(latest.checkOutDate) ? s : latest
  );

  const totalNights = stays.reduce((sum, s) => sum + s.nights, 0);
  const totalSpent = stays.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const mostComplete = stays.reduce((best, s) => {
    let score = 0;
    if (s.email) score++;
    if (s.phone) score++;
    if (s.country) score++;
    return score > best.score ? { guest: s, score } : best;
  }, { guest: stays[0], score: 0 }).guest;

  return {
    name: guestName,
    email: mostComplete.email,
    phone: mostComplete.phone,
    country: mostComplete.country,
    countryCode: mostComplete.countryCode,
    gender: mostComplete.gender,
    tags: autoTagGuest(stays, totalNights),
    totalStays: stays.length,
    totalNights,
    totalSpent,
    firstStayDate: first.checkInDate,
    lastStayDate: last.checkOutDate,
  };
}

/**
 * Auto-tag a guest based on their stay patterns.
 */
export function autoTagGuest(stays: Guest[], totalNights: number): GuestTag[] {
  const tags: GuestTag[] = [];

  if (stays.some(s => s.nights >= 14)) {
    tags.push('long-stay');
  }

  if (stays.length >= 2) {
    tags.push('repeat-guest');
  }

  if (totalNights >= 30 && stays.length >= 2) {
    tags.push('digital-nomad');
  }

  if (stays.length >= 2 && stays.every(s => s.nights <= 5)) {
    tags.push('backpacker');
  }

  const totalSpent = stays.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  if (totalSpent > 2000) {
    tags.push('vip');
  }

  return tags;
}

/**
 * Find guests who haven't returned in N months (recall candidates).
 */
export function findRecallCandidates(
  profiles: GuestProfile[],
  monthsInactive: number = 6
): GuestProfile[] {
  const cutoff = subMonths(new Date(), monthsInactive);
  return profiles.filter(p => {
    const lastStay = parseISO(p.lastStayDate);
    return isAfter(cutoff, lastStay) && p.totalStays >= 1;
  }).sort((a, b) => parseISO(a.lastStayDate).getTime() - parseISO(b.lastStayDate).getTime());
}

/**
 * Get all unique guest names currently in the system.
 */
export function getAllGuestNames(rooms: Room[], arrivals: Guest[]): string[] {
  const names = new Set<string>();

  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bed.guest) names.add(bed.guest.name);
      if (bed.reservations) {
        for (const res of bed.reservations) names.add(res.name);
      }
    }
  }

  for (const arrival of arrivals) {
    names.add(arrival.name);
  }

  return Array.from(names).sort();
}

/**
 * Sync guest profiles: create new profiles for guests not yet in the system,
 * update existing profiles with latest stay data.
 */
export function syncGuestProfiles(
  existingProfiles: GuestProfile[],
  rooms: Room[],
  arrivals: Guest[]
): { toAdd: Omit<GuestProfile, 'id'>[]; toUpdate: { id: string; updates: Partial<GuestProfile> }[] } {
  const allNames = getAllGuestNames(rooms, arrivals);
  const existingNames = new Set(existingProfiles.map(p => p.name));

  const toAdd: Omit<GuestProfile, 'id'>[] = [];
  const toUpdate: { id: string; updates: Partial<GuestProfile> }[] = [];

  for (const name of allNames) {
    const built = buildGuestProfileFromRooms(name, rooms);
    if (!built) continue;

    const existing = existingProfiles.find(p => p.name === name);
    if (!existing) {
      toAdd.push(built);
    } else {
      const updates: Partial<GuestProfile> = {};
      if (built.totalStays > existing.totalStays) updates.totalStays = built.totalStays;
      if (built.totalNights > existing.totalNights) updates.totalNights = built.totalNights;
      if (built.totalSpent > existing.totalSpent) updates.totalSpent = built.totalSpent;
      if (built.lastStayDate > existing.lastStayDate) updates.lastStayDate = built.lastStayDate;
      if (built.email && !existing.email) updates.email = built.email;
      if (built.phone && !existing.phone) updates.phone = built.phone;

      const newTags = built.tags.filter(t => !existing.tags.includes(t));
      if (newTags.length > 0) updates.tags = [...existing.tags, ...newTags];

      if (Object.keys(updates).length > 0) {
        toUpdate.push({ id: existing.id, updates });
      }
    }
  }

  return { toAdd, toUpdate };
}

/**
 * Get display label for a guest tag.
 */
export function getTagLabel(tag: GuestTag): { en: string; zh: string; color: string } {
  const map: Record<GuestTag, { en: string; zh: string; color: string }> = {
    'digital-nomad': { en: 'Digital Nomad', zh: '数字游民', color: 'bg-blue-50 text-blue-700' },
    'backpacker': { en: 'Backpacker', zh: '背包客', color: 'bg-green-50 text-green-700' },
    'long-stay': { en: 'Long Stay', zh: '长住', color: 'bg-purple-50 text-purple-700' },
    'repeat-guest': { en: 'Repeat Guest', zh: '回头客', color: 'bg-amber-50 text-amber-700' },
    'vip': { en: 'VIP', zh: 'VIP', color: 'bg-rose-50 text-rose-700' },
    'group-leader': { en: 'Group Leader', zh: '团队领队', color: 'bg-indigo-50 text-indigo-700' },
  };
  return map[tag];
}
