import { Room, GuestProfile, CopilotInsight, ShiftNote } from '../types';
import { format, addDays, parseISO, isToday, subMonths, isAfter } from 'date-fns';
import { calculateAvailability } from './occupancyEngine';

/**
 * Generate "Today" summary: check-ins, check-outs, empty beds.
 */
export function generateTodaySummary(rooms: Room[]) {
  let checkIns = 0;
  let checkOuts = 0;
  let emptyBeds = 0;
  let occupiedBeds = 0;
  let totalBeds = 0;
  let cleaningBeds = 0;

  for (const room of rooms) {
    for (const bed of room.beds) {
      totalBeds++;
      if (bed.status === 'occupied') {
        occupiedBeds++;
        if (bed.guest && isToday(parseISO(bed.guest.checkInDate))) {
          checkIns++;
        }
        if (bed.guest && isToday(parseISO(bed.guest.checkOutDate))) {
          checkOuts++;
        }
      } else if (bed.status === 'empty') {
        emptyBeds++;
      } else if (bed.status === 'cleaning') {
        cleaningBeds++;
      }
    }
  }

  return {
    checkIns,
    checkOuts,
    emptyBeds,
    occupiedBeds,
    totalBeds,
    cleaningBeds,
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  };
}

/**
 * Generate "This Week" forecast.
 */
export function generateWeekForecast(rooms: Room[]) {
  const availability = calculateAvailability(rooms, new Date(), 7);

  const avgOccupancy = availability.reduce((sum, d) => sum + d.occupancyRate, 0) / availability.length;
  const peakDay = availability.reduce((max, d) => d.occupancyRate > max.occupancyRate ? d : max, availability[0]);
  const lowDay = availability.reduce((min, d) => d.occupancyRate < min.occupancyRate ? d : min, availability[0]);
  const totalEmptyBedNights = availability.reduce((sum, d) => sum + d.emptyBeds, 0);

  return {
    avgOccupancy: Math.round(avgOccupancy),
    peakDay: { date: peakDay.date, rate: peakDay.occupancyRate },
    lowDay: { date: lowDay.date, rate: lowDay.occupancyRate },
    totalEmptyBedNights,
    // Daily breakdown for downstream consumers (e.g. CopilotPanel chart).
    daily: availability.map((d) => ({
      date: d.date,
      occupancyRate: d.occupancyRate,
      occupiedBeds: d.occupiedBeds,
      totalBeds: d.totalBeds,
    })),
  };
}

/**
 * Generate opportunities: actionable suggestions to improve business.
 */
export function generateOpportunities(
  rooms: Room[],
  guestProfiles: GuestProfile[],
  shiftNotes: ShiftNote[]
): CopilotInsight[] {
  const insights: CopilotInsight[] = [];
  const today = new Date();

  // Female Dorm Vacancy
  const femaleDorms = rooms.filter(r => r.type === 'dorm-female');
  const mixedDorms = rooms.filter(r => r.type === 'dorm-mixed');

  for (const femaleRoom of femaleDorms) {
    const total = femaleRoom.beds.length;
    const empty = femaleRoom.beds.filter(b => b.status === 'empty').length;
    const vacancyRate = total > 0 ? empty / total : 0;

    if (vacancyRate >= 0.5 && mixedDorms.length > 0) {
      const convertCount = Math.min(2, empty);
      insights.push({
        id: `ci_${crypto.randomUUID()}`,
        type: 'opportunity',
        severity: 'opportunity',
        title: `${femaleRoom.name} has high vacancy`,
        description: `${empty}/${total} beds empty. Consider converting ${convertCount} beds to Mixed Dorm to increase bookings.`,
        actionLabel: 'View Occupancy Actions',
        actionTarget: 'grow:occupancy',
        relatedIds: [femaleRoom.id],
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  }

  // Empty beds in next 3 days
  const availability3d = calculateAvailability(rooms, today, 3);
  const empty3d = availability3d.reduce((sum, d) => sum + d.emptyBeds, 0);

  if (empty3d >= 8) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'action',
      severity: 'opportunity',
      title: `${empty3d} empty beds in next 3 days`,
      description: 'Push long-stay discount or last-minute deal to fill empty beds.',
      actionLabel: 'Create Promotion',
      actionTarget: 'grow:pricing',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // Old guest recall
  const sixMonthsAgo = subMonths(today, 6);
  const recallable = guestProfiles.filter(p => {
    const lastStay = parseISO(p.lastStayDate);
    return isAfter(today, addDays(lastStay, 180)) && p.totalStays >= 1 && (p.email || p.whatsapp);
  });

  if (recallable.length >= 5) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'action',
      severity: 'opportunity',
      title: `${recallable.length} guests haven't returned in 6+ months`,
      description: 'Send them a personalized offer to come back.',
      actionLabel: 'View Guest CRM',
      actionTarget: 'grow:crm',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  return insights;
}

/**
 * Generate risks: warnings about potential problems.
 */
export function generateRisks(
  rooms: Room[],
  shiftNotes: ShiftNote[]
): CopilotInsight[] {
  const insights: CopilotInsight[] = [];
  const today = new Date();

  // Overbooking risk
  const availability = calculateAvailability(rooms, today, 7);
  for (const day of availability) {
    if (day.occupiedBeds > day.totalBeds) {
      insights.push({
        id: `ci_${crypto.randomUUID()}`,
        type: 'risk',
        severity: 'risk',
        title: `Overbooking on ${format(parseISO(day.date), 'EEE, MMM d')}`,
        description: `${day.occupiedBeds} guests but only ${day.totalBeds} beds available.`,
        actionLabel: 'View Bed Board',
        actionTarget: 'bedboard',
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  }

  // Unconfirmed reservations
  const unconfirmedReservations: { guestName: string; bedName: string; roomName: string }[] = [];
  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bed.reservations) {
        for (const res of bed.reservations) {
          if (res.paymentStatus === 'unpaid') {
            unconfirmedReservations.push({
              guestName: res.name,
              bedName: bed.name,
              roomName: room.name || room.number,
            });
          }
        }
      }
    }
  }

  if (unconfirmedReservations.length > 0) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'risk',
      severity: 'warning',
      title: `${unconfirmedReservations.length} unconfirmed reservation${unconfirmedReservations.length > 1 ? 's' : ''}`,
      description: unconfirmedReservations.map(r => `${r.guestName} (${r.roomName} ${r.bedName})`).join(', '),
      actionLabel: 'View Reservations',
      actionTarget: 'reservations',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // Urgent shift notes
  const urgentNotes = shiftNotes.filter(n => !n.isResolved && n.priority === 'urgent');
  if (urgentNotes.length > 0) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'risk',
      severity: 'risk',
      title: `${urgentNotes.length} urgent shift note${urgentNotes.length > 1 ? 's' : ''}`,
      description: urgentNotes.slice(0, 2).map(n => n.content).join(' | '),
      actionLabel: 'View Shift Log',
      actionTarget: 'shiftlog',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // Many beds in cleaning
  const cleaningBeds = rooms.reduce((sum, r) => sum + r.beds.filter(b => b.status === 'cleaning').length, 0);
  const totalBeds = rooms.reduce((sum, r) => sum + r.beds.length, 0);
  if (cleaningBeds > 3 || (totalBeds > 0 && cleaningBeds / totalBeds > 0.3)) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'risk',
      severity: 'warning',
      title: `${cleaningBeds} beds waiting to be cleaned`,
      description: 'High number of beds in cleaning status may delay check-ins.',
      actionLabel: 'View Bed Board',
      actionTarget: 'bedboard',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  return insights;
}
