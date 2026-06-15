import { Room, GuestProfile, OccupancyAction, OccupancyActionType } from '../types';
import { addDays, format, parseISO } from 'date-fns';

type TranslateFn = (
  path: string,
  params?: Record<string, string | number>,
) => string;

interface DayAvailability {
  date: string;
  totalBeds: number;
  occupiedBeds: number;
  emptyBeds: number;
  occupancyRate: number;
  rooms: {
    roomId: string;
    roomName: string;
    roomType: string;
    totalBeds: number;
    emptyBeds: number;
  }[];
}

/**
 * Calculate bed availability for each day in a date range.
 */
export function calculateAvailability(
  rooms: Room[],
  startDate: Date,
  days: number
): DayAvailability[] {
  const result: DayAvailability[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    let totalBeds = 0;
    let occupiedBeds = 0;
    const roomAvail = rooms.map(room => {
      const roomTotal = room.beds.length;
      const roomOccupied = room.beds.filter(b => {
        // Bug fix: check-in must also be <= dateStr, otherwise a future-arriving
        // guest is counted as occupying their previous nights. Aligned with the
        // reservation check below (check-out day is not counted as occupied).
        if (b.guest && b.guest.checkInDate <= dateStr && b.guest.checkOutDate > dateStr) return true;
        if (b.reservations?.some(r => r.checkInDate <= dateStr && r.checkOutDate > dateStr)) return true;
        return false;
      }).length;
      const roomEmpty = roomTotal - roomOccupied;

      totalBeds += roomTotal;
      occupiedBeds += roomOccupied;

      return {
        roomId: room.id,
        roomName: room.name || room.number,
        roomType: room.type,
        totalBeds: roomTotal,
        emptyBeds: roomEmpty,
      };
    });

    result.push({
      date: dateStr,
      totalBeds,
      occupiedBeds,
      emptyBeds: totalBeds - occupiedBeds,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      rooms: roomAvail,
    });
  }

  return result;
}

/**
 * Generate occupancy actions based on availability analysis.
 */
export function generateOccupancyActions(
  rooms: Room[],
  guestProfiles: GuestProfile[],
  lookaheadDays: number = 7,
  t?: TranslateFn,
): OccupancyAction[] {
  const today = new Date();
  const availability = calculateAvailability(rooms, today, lookaheadDays);

  const actions: OccupancyAction[] = [];

  const totalEmptyBedNights = availability.reduce((sum, day) => sum + day.emptyBeds, 0);

  if (totalEmptyBedNights === 0) return actions;

  // Action 1: Long Stay Discount
  if (totalEmptyBedNights >= 10) {
    const avgEmptyPerDay = totalEmptyBedNights / lookaheadDays;
    const estimatedFill = Math.min(Math.round(avgEmptyPerDay * 0.4), totalEmptyBedNights);
    const avgPrice = rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length;

    actions.push({
      id: `oa_${crypto.randomUUID()}`,
      type: 'long-stay-discount',
      title: t ? t('occupancy.longStay.title') : 'Open Long Stay Discount',
      description: t
        ? t('occupancy.longStay.description', {
            empty: totalEmptyBedNights,
            days: lookaheadDays,
          })
        : `${totalEmptyBedNights} empty bed-nights in next ${lookaheadDays} days. Offer 15% off for 7+ night stays to fill empty beds.`,
      estimatedBedNights: estimatedFill,
      estimatedRevenue: Math.round(estimatedFill * avgPrice * 0.85),
      roomIds: rooms.map(r => r.id),
      dateRange: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(addDays(today, lookaheadDays), 'yyyy-MM-dd'),
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // Action 2: Old Guest Recall
  const threeMonthsAgo = addDays(today, -90);
  const recallableGuests = guestProfiles.filter(p => {
    const lastStay = parseISO(p.lastStayDate);
    return lastStay < threeMonthsAgo && p.totalStays >= 1 && (p.email || p.whatsapp);
  });

  if (recallableGuests.length > 0 && totalEmptyBedNights >= 5) {
    const estimatedFill = Math.min(recallableGuests.length * 2, totalEmptyBedNights);
    const avgPrice = rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length;

    actions.push({
      id: `oa_${crypto.randomUUID()}`,
      type: 'old-guest-recall',
      title: t
        ? t('occupancy.recall.title', { count: recallableGuests.length })
        : `Recall ${recallableGuests.length} Previous Guests`,
      description: t
        ? t('occupancy.recall.description', {
            count: recallableGuests.length,
            empty: totalEmptyBedNights,
          })
        : `${recallableGuests.length} guests haven't returned in 3+ months. Send them a 10% off offer to fill ${totalEmptyBedNights} empty bed-nights.`,
      estimatedBedNights: estimatedFill,
      estimatedRevenue: Math.round(estimatedFill * avgPrice * 0.9),
      roomIds: rooms.map(r => r.id),
      dateRange: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(addDays(today, lookaheadDays), 'yyyy-MM-dd'),
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // Action 3: Last Minute Deal
  const next3Days = availability.slice(0, 3);
  const next3DaysEmpty = next3Days.reduce((sum, d) => sum + d.emptyBeds, 0);

  if (next3DaysEmpty >= 5) {
    const avgPrice = rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length;
    const estimatedFill = Math.min(Math.round(next3DaysEmpty * 0.35), next3DaysEmpty);

    actions.push({
      id: `oa_${crypto.randomUUID()}`,
      type: 'last-minute-deal',
      title: t ? t('occupancy.lastMinute.title') : 'Open Last Minute Deal',
      description: t
        ? t('occupancy.lastMinute.description', { empty: next3DaysEmpty })
        : `${next3DaysEmpty} empty beds in next 3 days. Offer 20% off for immediate bookings.`,
      estimatedBedNights: estimatedFill,
      estimatedRevenue: Math.round(estimatedFill * avgPrice * 0.8),
      roomIds: rooms.map(r => r.id),
      dateRange: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(addDays(today, 3), 'yyyy-MM-dd'),
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // Action 4: Room Type Conversion
  const femaleDorms = rooms.filter(r => r.type === 'dorm-female');
  const mixedDorms = rooms.filter(r => r.type === 'dorm-mixed');

  if (femaleDorms.length > 0 && mixedDorms.length > 0) {
    const femaleOccupancy = femaleDorms.reduce((sum, r) => {
      const total = r.beds.length;
      const occupied = r.beds.filter(b => b.status === 'occupied').length;
      return sum + (total > 0 ? occupied / total : 0);
    }, 0) / femaleDorms.length;

    const mixedOccupancy = mixedDorms.reduce((sum, r) => {
      const total = r.beds.length;
      const occupied = r.beds.filter(b => b.status === 'occupied').length;
      return sum + (total > 0 ? occupied / total : 0);
    }, 0) / mixedDorms.length;

    if (femaleOccupancy < 0.4 && mixedOccupancy > 0.6) {
      const femaleEmpty = femaleDorms.reduce((sum, r) => sum + r.beds.filter(b => b.status === 'empty').length, 0);
      const convertCount = Math.min(2, femaleEmpty);

      actions.push({
        id: `oa_${crypto.randomUUID()}`,
        type: 'room-type-conversion',
        title: t
          ? t('occupancy.conversion.title', { count: convertCount })
          : `Convert ${convertCount} Beds from Female to Mixed`,
        description: t
          ? t('occupancy.conversion.description', {
              femaleRate: Math.round(femaleOccupancy * 100),
              mixedRate: Math.round(mixedOccupancy * 100),
              count: convertCount,
            })
          : `Female dorm is ${Math.round(femaleOccupancy * 100)}% occupied while Mixed dorm is ${Math.round(mixedOccupancy * 100)}%. Converting ${convertCount} beds could increase bookings.`,
        estimatedBedNights: convertCount * lookaheadDays * Math.round(mixedOccupancy),
        estimatedRevenue: convertCount * lookaheadDays * Math.round(mixedOccupancy) * (mixedDorms[0]?.pricePerNight || 0),
        roomIds: femaleDorms.map(r => r.id),
        dateRange: {
          start: format(today, 'yyyy-MM-dd'),
          end: format(addDays(today, lookaheadDays), 'yyyy-MM-dd'),
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return actions.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
}

/**
 * Get a human-readable label for an occupancy action type.
 */
export function getActionTypeLabel(type: OccupancyActionType): { en: string; zh: string; icon: string } {
  const map: Record<OccupancyActionType, { en: string; zh: string; icon: string }> = {
    'long-stay-discount': { en: 'Long Stay Discount', zh: '长住优惠', icon: '🏠' },
    'old-guest-recall': { en: 'Guest Recall', zh: '老客召回', icon: '📧' },
    'last-minute-deal': { en: 'Last Minute Deal', zh: '限时特价', icon: '⚡' },
    'room-type-conversion': { en: 'Room Conversion', zh: '房型转换', icon: '🔄' },
  };
  return map[type];
}
