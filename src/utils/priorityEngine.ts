import { Guest } from '../types';
import { parseISO, differenceInMinutes } from 'date-fns';

export const WEIGHT_TIME = 30;
export const WEIGHT_INCOMPLETE = 20;
export const PIN_BONUS = 1_000_000;

/**
 * Time proximity score (0..1).
 *  - ≤ 1h:    1.0
 *  - ≤ 4h:    0.7
 *  - ≤ 12h:   0.4
 *  - ≤ 24h:   0.2
 *  - > 24h:   0
 *  - past:    0.5  (arrived but not yet checked in)
 */
export function timeProximityScore(checkInDate: string, now: Date): number {
  const minutes = differenceInMinutes(parseISO(checkInDate), now);
  if (minutes <= 0)    return 0.5;   // 客人已到 / 过期
  if (minutes <= 60)   return 1.0;
  if (minutes <= 240)  return 0.7;
  if (minutes <= 720)  return 0.4;
  if (minutes <= 1440) return 0.2;
  return 0;
}

/**
 * Incompleteness count 0..4.
 *  - passport: !passportScanned
 *  - payment: paymentStatus !== 'paid'
 *  - bed:     !assignedBedId
 *  - notes:   !notes?.trim() && !notesSkipped
 */
export function incompletenessCount(guest: Guest): number {
  const items = [
    !guest.passportScanned,
    guest.paymentStatus !== 'paid',
    !guest.assignedBedId,
    !guest.notes?.trim() && !guest.notesSkipped,
  ];
  return items.filter(Boolean).length;
}

/**
 * Total priority score. Higher = more urgent.
 */
export function scoreGuest(guest: Guest, now: Date): number {
  if (guest.pinned) return PIN_BONUS + 1;
  return (
    WEIGHT_TIME * timeProximityScore(guest.checkInDate, now) +
    WEIGHT_INCOMPLETE * incompletenessCount(guest)
  );
}

/**
 * Sort guests by priority score, descending.
 * Stable: same score keeps original order.
 */
export function sortByPriority(guests: Guest[], now: Date = new Date()): Guest[] {
  return [...guests]
    .map((g, idx) => ({ g, idx, s: scoreGuest(g, now) }))
    .sort((a, b) => b.s - a.s || a.idx - b.idx)
    .map(x => x.g);
}
