import { Bed, Room } from '../types';

export function getBedPrice(room: Room, bed: Bed): number {
  return room.pricePerNight + (bed.bedType === 'bottom' ? (room.bottomBunkPremium || 0) : 0);
}

export function getRoomPriceRange(room: Room): { min: number; max: number } {
  const base = room.pricePerNight;
  const bottom = base + (room.bottomBunkPremium || 0);
  if (room.type === 'private' || !(room.bottomBunkPremium > 0)) return { min: base, max: base };
  return { min: base, max: bottom };
}
