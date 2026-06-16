import { Bed, Room } from '../types';

export function getBedPrice(room: Room, bed: Bed): number {
  if (!room || !bed) return 0;
  return (room.pricePerNight || 0) + (bed.bedType === 'bottom' ? (room.bottomBunkPremium || 0) : 0);
}

export function getRoomPriceRange(room: Room): { min: number; max: number } {
  if (!room) return { min: 0, max: 0 };
  const base = room.pricePerNight || 0;
  const bottom = base + (room.bottomBunkPremium || 0);
  if (room.type === 'private' || !(room.bottomBunkPremium > 0)) return { min: base, max: base };
  return { min: base, max: bottom };
}
