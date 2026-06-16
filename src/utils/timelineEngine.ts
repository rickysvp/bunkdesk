import { Room, Bed, Guest } from '../types';
import { parseISO, differenceInDays } from 'date-fns';
import { rangesOverlap } from './bedRules';

// Re-export so existing imports from timelineEngine keep working.
export { rangesOverlap };

function safeParseISO(dateStr: string, fallback: Date = new Date(0)): Date {
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return d;
  } catch {
    return fallback;
  }
}

/**
 * Get all bookings for a bed (current guest + future reservations), deduplicated by ID.
 */
export function getBookingsForBed(bed: Bed): Guest[] {
  const seen = new Set<string>();
  const bookings: Guest[] = [];
  if (bed.guest && !seen.has(bed.guest.id)) {
    bookings.push(bed.guest);
    seen.add(bed.guest.id);
  }
  if (bed.reservations) {
    for (const r of bed.reservations) {
      if (!seen.has(r.id)) {
        bookings.push(r);
        seen.add(r.id);
      }
    }
  }
  return bookings;
}

/**
 * Find which booking covers a given date.
 */
export function getBookingForDate(bookings: Guest[], date: Date): Guest | undefined {
  const dateTime = date.getTime();
  return bookings.find(b => {
    const inTime = safeParseISO(b.checkInDate).getTime();
    const outTime = safeParseISO(b.checkOutDate).getTime();
    return inTime <= dateTime && outTime > dateTime;
  });
}

/**
 * How many nights of a booking are visible within the current date window.
 */
export function getVisibleNights(booking: Guest, dateIndex: number, dates: Date[]): number {
  const checkIn = safeParseISO(booking.checkInDate);
  const checkOut = safeParseISO(booking.checkOutDate);
  const totalNights = differenceInDays(checkOut, checkIn);
  const startOffset = Math.max(0, -dateIndex);
  const remaining = totalNights - startOffset;
  const visibleInWindow = Math.min(remaining, dates.length - Math.max(0, dateIndex));
  return Math.max(1, Math.min(visibleInWindow, remaining));
}

/**
 * Per-day free bed count for a room header.
 */
export function computeRoomDailyFree(room: Room, dates: Date[]): number[] {
  return dates.map(date => {
    const dateTime = date.getTime();
    const occupied = room.beds.filter(bed => {
      const bookings = getBookingsForBed(bed);
      return bookings.some(b => {
        const inTime = safeParseISO(b.checkInDate).getTime();
        const outTime = safeParseISO(b.checkOutDate).getTime();
        return inTime <= dateTime && outTime > dateTime;
      });
    }).length;
    return room.beds.length - occupied;
  });
}

/**
 * Look up a bed and its parent room.
 */
export function findBedContext(rooms: Room[], bedId: string): { room: Room; bed: Bed } | null {
  for (const room of rooms) {
    const bed = room.beds.find(b => b.id === bedId);
    if (bed) return { room, bed };
  }
  return null;
}

/**
 * Check if two date ranges overlap.
 * (Implementation lives in `bedRules.ts`; re-exported above for backwards compatibility.)
 */
