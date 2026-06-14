import { parseISO } from 'date-fns';
import { Guest, Room } from '../types';

export function canGuestOccupyRoom(guest: Guest, room: Room): boolean {
  if (guest.gender === 'male' && room.type === 'dorm-female') {
    return false;
  }

  return true;
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return parseISO(startA).getTime() < parseISO(endB).getTime() && parseISO(startB).getTime() < parseISO(endA).getTime();
}
