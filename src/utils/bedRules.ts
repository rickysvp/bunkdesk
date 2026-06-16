import { parseISO } from 'date-fns';
import { Guest, Room } from '../types';

export function canGuestOccupyRoom(guest: Guest, room: Room): boolean {
  if (guest.gender === 'male' && room.type === 'dorm-female') {
    return false;
  }

  return true;
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  try {
    const aStart = parseISO(startA);
    const aEnd = parseISO(endA);
    const bStart = parseISO(startB);
    const bEnd = parseISO(endB);
    if (isNaN(aStart.getTime()) || isNaN(aEnd.getTime()) || isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) {
      return false;
    }
    return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
  } catch {
    return false;
  }
}
