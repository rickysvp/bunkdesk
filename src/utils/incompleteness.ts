import { Guest } from '../types';

export interface IncompletenessBreakdown {
  passport: boolean;
  payment: boolean;
  bed: boolean;
  notes: boolean;
  count: number;
}

export function computeIncompleteness(guest: Guest): IncompletenessBreakdown {
  const breakdown = {
    passport: !guest.passportScanned,
    payment: guest.paymentStatus !== 'paid',
    bed: !guest.assignedBedId,
    notes: !guest.notes?.trim() && !guest.notesSkipped,
  };
  return { ...breakdown, count: Object.values(breakdown).filter(Boolean).length };
}

export function isItemDone(guest: Guest, itemKey: keyof Omit<IncompletenessBreakdown, 'count'>): boolean {
  return !computeIncompleteness(guest)[itemKey];
}

export function allItemsDone(guest: Guest): boolean {
  return computeIncompleteness(guest).count === 0;
}
