import { Guest, Bed, Room } from '../types';
import { parseISO, differenceInDays } from 'date-fns';

export interface BedScore {
  bedId: string;
  bedName: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  bedType: string;
  pricePerNight: number;
  score: number;
  reasons: string[];
  fillExisting: boolean;
  genderMatch: boolean;
  preferenceMatch: boolean;
  bedTierMatch: boolean;
  fragmentationScore: number;
}

export interface RoomSummary {
  roomId: string;
  roomNumber: string;
  roomType: string;
  totalBeds: number;
  occupiedBeds: number;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Score and rank all available beds for a given guest.
 * Returns sorted array: best bed first.
 * Returns empty array if no suitable bed found (e.g. gender conflict).
 */
export function scoreBeds(
  guest: Guest,
  rooms: Room[],
): BedScore[] {
  if (!guest) return [];
  const results: BedScore[] = [];

  for (const room of rooms) {
    for (const bed of room.beds) {
      // Skip occupied or cleaning beds
      if (bed.status === 'occupied' || bed.status === 'cleaning') continue;

      // 检查日期冲突：客人入住日期与现有预订重叠则跳过
      if (bed.reservations && bed.reservations.length > 0) {
        const guestCheckIn = parseISO(guest.checkInDate);
        const guestCheckOut = parseISO(guest.checkOutDate);
        const hasConflict = bed.reservations.some(res => {
          const resCheckIn = parseISO(res.checkInDate);
          const resCheckOut = parseISO(res.checkOutDate);
          return guestCheckIn < resCheckOut && resCheckIn < guestCheckOut;
        });
        if (hasConflict) continue;
      }

      const score = computeBedScore(guest, room, bed);
      if (score === null) continue; // gender hard-block

      results.push({
        bedId: bed.id,
        bedName: bed.name,
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        bedType: bed.bedType || 'single',
        pricePerNight: room.pricePerNight + (bed.bedType === 'bottom' ? (room.bottomBunkPremium || 0) : 0),
        ...score,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Get the best bed for a guest, or null if none available.
 */
export function pickBestBed(guest: Guest, rooms: Room[]): BedScore | null {
  const scores = scoreBeds(guest, rooms);
  return scores.length > 0 ? scores[0] : null;
}

/**
 * Get room occupancy summaries for display.
 */
export function getRoomSummaries(rooms: Room[]): RoomSummary[] {
  return rooms.map(room => ({
    roomId: room.id,
    roomNumber: room.number,
    roomType: room.type,
    totalBeds: room.beds.length,
    occupiedBeds: room.beds.filter(b => b.status === 'occupied').length,
  }));
}

// ─── Scoring Engine ──────────────────────────────────────────────

const WEIGHT_FILL_EXISTING = 40;
const WEIGHT_GENDER_MATCH = 30;
const WEIGHT_PREFERENCE_MATCH = 20;
const WEIGHT_BED_TIER = 50; // Highest weight - respect what guest paid for
const WEIGHT_FRAGMENTATION = 10;

function computeBedScore(
  guest: Guest,
  room: Room,
  bed: Bed,
): { score: number; fillExisting: boolean; genderMatch: boolean; preferenceMatch: boolean; bedTierMatch: boolean; fragmentationScore: number; reasons: string[] } | null {
  let score = 0;
  const reasons: string[] = [];
  let fillExisting = false;
  let genderMatch = false;
  let preferenceMatch = false;
  let bedTierMatch = false;
  let fragmentationScore = 0;

  // ── 0. Gender hard constraint ──
  // Male cannot be placed in female-only dorm
  if (guest.gender === 'male' && room.type === 'dorm-female') {
    return null; // Hard block
  }
  // Female can go anywhere, but female-only dorm is preferred

  // ── 5. Bed tier match (weight 50) - respect what guest actually paid for ──
  // Use guest.totalAmount to detect which tier they paid for.
  // Top bunk = room base price, Bottom = base + bottomBunkPremium.
  // If totalAmount doesn't match (e.g. for a custom promo price), fall back to bedPreference.
  const topPrice = room.pricePerNight;
  const bottomPrice = room.pricePerNight + (room.bottomBunkPremium || 0);
  const nights = guest.nights || 1;
  const expectedTopTotal = topPrice * nights;
  const expectedBottomTotal = bottomPrice * nights;
  const actualTotal = guest.totalAmount || 0;
  const tierTolerance = 0.05; // ±5% to handle rounding

  const paidForBottom = actualTotal > 0 && expectedBottomTotal > 0 &&
    Math.abs(actualTotal - expectedBottomTotal) / expectedBottomTotal < tierTolerance;
  const paidForTop = actualTotal > 0 && expectedTopTotal > 0 &&
    Math.abs(actualTotal - expectedTopTotal) / expectedTopTotal < tierTolerance;

  if (paidForBottom && bed.bedType === 'bottom') {
    score += WEIGHT_BED_TIER;
    bedTierMatch = true;
    reasons.push('tier-match-bottom-paid');
  } else if (paidForTop && bed.bedType === 'top') {
    score += WEIGHT_BED_TIER;
    bedTierMatch = true;
    reasons.push('tier-match-top-paid');
  } else if (guest.bedPreference === 'bottom' && bed.bedType === 'bottom') {
    // User explicitly chose bottom preference (no totalAmount hint)
    score += Math.floor(WEIGHT_BED_TIER * 0.8);
    bedTierMatch = true;
    reasons.push('tier-pref-bottom');
  } else if (guest.bedPreference === 'top' && bed.bedType === 'top') {
    score += Math.floor(WEIGHT_BED_TIER * 0.8);
    bedTierMatch = true;
    reasons.push('tier-pref-top');
  }

  // ── 1. Fill existing (weight 40%) ──
  const occupiedCount = room.beds.filter(b => b.status === 'occupied').length;
  if (occupiedCount > 0) {
    score += WEIGHT_FILL_EXISTING;
    fillExisting = true;
    reasons.push('fill-existing');
  }

  // ── 2. Gender match (weight 30%) ──
  if (guest.gender === 'female' && room.type === 'dorm-female') {
    score += WEIGHT_GENDER_MATCH;
    genderMatch = true;
    reasons.push('gender-match-female-dorm');
  } else if (guest.gender === 'male' && room.type === 'dorm-mixed') {
    score += WEIGHT_GENDER_MATCH;
    genderMatch = true;
    reasons.push('gender-match-mixed-dorm');
  }
  // Female in mixed dorm: acceptable (no hard block) but no gender-match tag.
  // The tag now only fires for ideal pairings: ♀→female-dorm or ♂→mixed-dorm.

  // ── 3. Room type preference (weight 20%) ──
  if (guest.roomPreference) {
    const pref = guest.roomPreference.toLowerCase();
    const roomType = room.type.toLowerCase();
    if (
      (pref.includes('mixed') && roomType.includes('mixed')) ||
      (pref.includes('female') && roomType.includes('female')) ||
      (pref.includes('private') && roomType.includes('private')) ||
      (pref === room.type)
    ) {
      score += WEIGHT_PREFERENCE_MATCH;
      preferenceMatch = true;
      reasons.push('preference-match');
    }
  }

  // ── 4. Fragmentation avoidance (weight 10%) ──
  // Check how many days the bed is free before and after the guest's stay
  fragmentationScore = computeFragmentationScore(guest, bed, room);
  score += fragmentationScore * WEIGHT_FRAGMENTATION / 10;

  return { score, fillExisting, genderMatch, preferenceMatch, bedTierMatch, fragmentationScore, reasons };
}

// ── Fragmentation Calculation ────────────────────────────────────

function computeFragmentationScore(guest: Guest, bed: Bed, room: Room): number {
  const guestCheckIn = parseISO(guest.checkInDate);
  const guestCheckOut = parseISO(guest.checkOutDate);

  // Collect all bookings on this bed (guest + reservations)
  const bookings: { checkIn: Date; checkOut: Date }[] = [];
  if (bed.guest) {
    bookings.push({ checkIn: parseISO(bed.guest.checkInDate), checkOut: parseISO(bed.guest.checkOutDate) });
  }
  const reservations = bed.reservations || [];
  if (reservations.length > 0) {
    for (const r of reservations) {
      bookings.push({ checkIn: parseISO(r.checkInDate), checkOut: parseISO(r.checkOutDate) });
    }
  }

  // Sort by check-in date
  bookings.sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());

  // How many free days before the guest's check-in on this bed?
  // Find the latest booking that ends before or at the guest's check-in
  const prevBooking = bookings
    .filter(b => b.checkOut.getTime() <= guestCheckIn.getTime())
    .sort((a, b) => b.checkOut.getTime() - a.checkOut.getTime())[0];

  let freeBefore = 30; // Default: plenty of free days
  if (prevBooking) {
    freeBefore = differenceInDays(guestCheckIn, prevBooking.checkOut);
  }

  // How many free days after the guest's check-out on this bed?
  const nextBooking = bookings
    .filter(b => b.checkIn.getTime() >= guestCheckOut.getTime())
    .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime())[0];

  let freeAfter = 30;
  if (nextBooking) {
    freeAfter = differenceInDays(nextBooking.checkIn, guestCheckOut);
  }

  // Score: higher is better (less fragmentation)
  // Perfect fit: guest fits exactly in a gap → score 10
  // Moderate fragmentation: at least one side has good gap → score 5
  // Bad fragmentation: creates small gaps on both sides → score 0

  const guestNights = guest.nights || differenceInDays(guestCheckOut, guestCheckIn);

  if (freeBefore >= guestNights && freeAfter >= guestNights) {
    return 10; // Plenty of room both sides
  }
  if (freeBefore >= guestNights || freeAfter >= guestNights) {
    return 7; // One side is good
  }
  if (freeBefore >= 2 && freeAfter >= 2) {
    return 5; // Both sides have at least 2 day gaps
  }
  if (freeBefore >= 1 || freeAfter >= 1) {
    return 3; // At least one side has a gap
  }
  return 0; // Tightly packed - already good or bad depending on context
}