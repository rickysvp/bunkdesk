import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Room, Guest, Bed, ShiftNote, ShiftNoteSource, GroupBooking, Referral, HostelPage, Promotion, GuestProfile, GuestTag, OccupancyAction, GuestLogEntry, GuestLogType } from "./types";
import { INITIAL_ROOMS, ARRIVALS, INITIAL_SHIFT_NOTES, INITIAL_GROUP_BOOKINGS, INITIAL_REFERRALS, INITIAL_HOSTEL_PAGE, INITIAL_PROMOTIONS, INITIAL_GUEST_PROFILES } from "./data";
import { useStaff } from "./StaffContext";
import { pickBestBed, scoreBeds, type BedScore } from "./utils/bedAllocator";
import { getBedPrice } from './utils/bedPricing';
import { migrateGuestsDeep } from './utils/guestMigration';
import { addDays, format, parseISO } from "date-fns";
import { formatCurrency } from './i18nContext';
import type { Language } from './i18nContext';

function loadState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`bunkdesk_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

function currentLanguage(): Language {
  try {
    const v = localStorage.getItem('bunkdesk_language');
    return v === 'en' || v === 'zh' ? v : 'zh';
  } catch { return 'zh'; }
}

// Persist all 9 hostel slices under a single versioned key to:
//  - Avoid partial writes if any one slice serializes badly
//  - Make schema migrations explicit (bump STORAGE_VERSION and add a migrator)
//  - Keep reads/writes atomic from the app's perspective
const STORAGE_KEY = 'bunkdesk_state_v1';
const STORAGE_VERSION = 1;
type HostelPersisted = {
  rooms: Room[];
  arrivals: Guest[];
  shiftNotes: ShiftNote[];
  groupBookings: GroupBooking[];
  referrals: Referral[];
  hostelPage: HostelPage;
  promotions: Promotion[];
  guestProfiles: GuestProfile[];
  occupancyActions: OccupancyAction[];
  guestLogs: GuestLogEntry[];
};

function loadPersistedState(fallback: HostelPersisted): HostelPersisted {
  // Prefer the new versioned key; fall back to the legacy 9-key layout if
  // it exists so we don't drop data from older builds.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__v === STORAGE_VERSION && parsed.data) {
        return { ...fallback, ...parsed.data };
      }
    }
  } catch {
    // Ignore — fall through to legacy fallback
  }

  // Legacy fallback: read each key independently and merge.
  return {
    rooms: loadState('rooms', fallback.rooms),
    arrivals: loadState('arrivals', fallback.arrivals),
    shiftNotes: loadState('shiftNotes', fallback.shiftNotes),
    groupBookings: loadState('groupBookings', fallback.groupBookings),
    referrals: loadState('referrals', fallback.referrals),
    hostelPage: loadState('hostelPage', fallback.hostelPage),
    promotions: loadState('promotions', fallback.promotions),
    guestProfiles: loadState('guestProfiles', fallback.guestProfiles),
    occupancyActions: loadState('occupancyActions', fallback.occupancyActions),
    guestLogs: loadState('guestLogs', fallback.guestLogs),
  };
}

interface HostelState {
  rooms: Room[];
  arrivals: Guest[];
  moveGuest: (sourceBedId: string, targetBedId: string) => void;
  assignArrival: (guestId: string, bedId: string) => void;
  autoAssignBed: (guestId: string) => BedScore | null;
  occupyBed: (bedId: string, guest: Omit<Guest, "id">, guestId?: string) => string;
  moveReservation: (sourceBedId: string, targetBedId: string, guestId: string) => void;
  markBedClean: (bedId: string) => void;
  checkoutGuest: (bedId: string) => void;
  settlePayment: (guestId: string) => void;
  scanPassport: (guestId: string) => void;
  addArrival: (guest: Omit<Guest, "id">) => string;
  updateArrival: (guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights' | 'firstName' | 'lastName' | 'idType' | 'arrivalTime' | 'bookingSource' | 'bedPreference'>>) => void;
  importArrivals: (guests: Omit<Guest, "id">[]) => void;
  addRoom: (room: Omit<Room, "id" | "beds">) => void;
  updateRoom: (roomId: string, name: string, number: string, pricePerNight?: number, bottomBunkPremium?: number) => void;
  deleteRoom: (roomId: string) => void;
  addBedToRoom: (roomId: string, bed: Omit<Bed, "id" | "roomId" | "status">) => void;
  updateBed: (roomId: string, bedId: string, name: string, bedType?: "top" | "bottom" | "single" | "double") => void;
  deleteBed: (roomId: string, bedId: string) => void;
  // Shift Log
  shiftNotes: ShiftNote[];
  addShiftNote: (note: Omit<ShiftNote, "id" | "createdAt" | "isResolved">) => void;
  resolveShiftNote: (noteId: string) => void;
  unresolveShiftNote: (noteId: string) => void;
  deleteShiftNote: (noteId: string) => void;
  // Group Bookings
  groupBookings: GroupBooking[];
  addGroupBooking: (booking: Omit<GroupBooking, "id" | "createdAt">) => void;
  updateGroupBookingPayment: (groupId: string, paidAmount: number) => void;
  // Referrals
  referrals: Referral[];
  addReferral: (referral: Omit<Referral, "id" | "createdAt">) => void;
  useReferralCode: (code: string, newGuestId: string) => void;
  // Hostel Page
  hostelPage: HostelPage;
  updateHostelPage: (updates: Partial<HostelPage>) => void;
  // Promotions
  promotions: Promotion[];
  addPromotion: (promotion: Omit<Promotion, "id" | "createdAt">) => void;
  togglePromotion: (promotionId: string) => void;
  // Guest CRM
  guestProfiles: GuestProfile[];
  addGuestProfile: (profile: Omit<GuestProfile, "id">) => void;
  updateGuestProfile: (profileId: string, updates: Partial<Pick<GuestProfile, "email" | "phone" | "whatsapp" | "tags" | "notes" | "lastContactedAt">>) => void;
  addTagToGuest: (profileId: string, tag: GuestTag) => void;
  removeTagFromGuest: (profileId: string, tag: GuestTag) => void;
  // Occupancy Actions
  occupancyActions: OccupancyAction[];
  applyOccupancyAction: (actionId: string) => void;
  dismissOccupancyAction: (actionId: string) => void;
  // Guest Audit Log
  guestLogs: GuestLogEntry[];
  addGuestLog: (entry: Omit<GuestLogEntry, 'id' | 'createdAt' | 'author'>) => void;
  // High-level guest actions (combine state mutation + audit log)
  addCharge: (guestId: string, amount: number, reason: string) => void;
  extendStay: (guestId: string, extraNights: number) => void;
  addPartialPayment: (guestId: string, amount: number) => void;
  addGuestNote: (guestId: string, note: string) => void;
  updateGuestField: (guestId: string, field: 'phone' | 'email' | 'passportOrId' | 'dob' | 'gender' | 'source' | 'roomPreference', value: string) => void;
}

const HostelContext = createContext<HostelState | undefined>(undefined);

export function HostelProvider({ children }: { children: ReactNode }) {
  // Load all slices atomically from the versioned key (with legacy fallback).
  const initial = loadPersistedState({
    rooms: INITIAL_ROOMS,
    arrivals: ARRIVALS,
    shiftNotes: INITIAL_SHIFT_NOTES,
    groupBookings: INITIAL_GROUP_BOOKINGS,
    referrals: INITIAL_REFERRALS,
    hostelPage: INITIAL_HOSTEL_PAGE,
    promotions: INITIAL_PROMOTIONS,
    guestProfiles: INITIAL_GUEST_PROFILES,
    occupancyActions: [],
    guestLogs: [],
  });

  const [rooms, setRooms] = useState<Room[]>(initial.rooms);
  const [arrivals, setArrivals] = useState<Guest[]>(initial.arrivals);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>(initial.shiftNotes);
  const [groupBookings, setGroupBookings] = useState<GroupBooking[]>(initial.groupBookings);
  const [referrals, setReferrals] = useState<Referral[]>(initial.referrals);
  const [hostelPage, setHostelPage] = useState<HostelPage>(initial.hostelPage);
  const [promotions, setPromotions] = useState<Promotion[]>(initial.promotions);
  const [guestProfiles, setGuestProfiles] = useState<GuestProfile[]>(initial.guestProfiles);
  const [occupancyActions, setOccupancyActions] = useState<OccupancyAction[]>(initial.occupancyActions);
  const [guestLogs, setGuestLogs] = useState<GuestLogEntry[]>(initial.guestLogs);

  // Persist state to localStorage with debounce. All slices are written
  // atomically under a single versioned key inside a try/catch so a quota
  // or serialization error is logged but never crashes the React tree.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload = {
          __v: STORAGE_VERSION,
          data: { rooms, arrivals, shiftNotes, groupBookings, referrals, hostelPage, promotions, guestProfiles, occupancyActions, guestLogs },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        // QuotaExceededError, circular refs, etc. — log and let the app keep running.
        // eslint-disable-next-line no-console
        console.warn('[bunkdesk] localStorage persist failed:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [rooms, arrivals, shiftNotes, groupBookings, referrals, hostelPage, promotions, guestProfiles, occupancyActions, guestLogs]);

  const { currentStaff } = useStaff();

  // ── Internal: Auto-generate shift note ────────────────────────
  const addAutoNote = useCallback((
    content: string,
    source: ShiftNoteSource,
    relatedId?: string,
    relatedType?: "guest" | "bed" | "room",
  ) => {
    const authorName = currentStaff?.name || "System";
    const note: ShiftNote = {
      id: `sn_${crypto.randomUUID()}`,
      content,
      category: "general",
      priority: "normal",
      author: `${authorName} (System)`,
      createdAt: new Date().toISOString(),
      isResolved: true,
      resolvedAt: new Date().toISOString(),
      source,
      relatedId,
      relatedType,
      autoGenerated: true,
    };
    setShiftNotes((prev) => [note, ...prev]);
  }, [currentStaff]);

  // ── Guest Audit Log ───────────────────────────────────────────
  // Low-level: append a log entry (id/timestamp/author filled in here).
  const addGuestLog = useCallback((entry: Omit<GuestLogEntry, 'id' | 'createdAt' | 'author'>) => {
    const authorName = currentStaff?.name || 'System';
    const log: GuestLogEntry = {
      ...entry,
      id: `gl_${crypto.randomUUID()}`,
      author: authorName,
      createdAt: new Date().toISOString(),
    };
    setGuestLogs((prev) => [log, ...prev].slice(0, 2000)); // cap to last 2000 entries
  }, [currentStaff]);

  // Higher-level wrapper: look up the current guest by id (from arrivals
  // and rooms) and extract their phone to use as the cross-visit key.
  const logAction = useCallback((
    guestId: string,
    type: GuestLogType,
    description: string,
    opts?: { amount?: number; meta?: Record<string, any>; guestSnapshot?: Guest },
  ) => {
    // 优先使用传入的 guest 快照，避免闭包陈旧问题
    let guest: Guest | undefined = opts?.guestSnapshot;
    if (!guest) {
      guest = arrivals.find((g) => g.id === guestId);
    }
    if (!guest) {
      for (const r of rooms) {
        for (const b of r.beds) {
          if (b.guest?.id === guestId) { guest = b.guest; break; }
          if (b.reservations?.some((res) => res.id === guestId)) {
            guest = b.reservations!.find((res) => res.id === guestId); break;
          }
        }
        if (guest) break;
      }
    }
    if (!guest) return;
    addGuestLog({
      phone: guest.phone || '',
      guestId: guest.id,
      guestName: guest.name,
      type,
      description,
      amount: opts?.amount,
      meta: opts?.meta,
    });
  }, [arrivals, rooms, addGuestLog]);

  // ── Bed/Guest operations ──────────────────────────────────────

  const getBedStatusFromBookings = useCallback((bed: Bed) => {
    if (bed.guest) return bed.status === "late-arrival" ? "late-arrival" : "occupied";
    if ((bed.reservations?.length ?? 0) > 0) return "reserved";
    return "empty";
  }, []);

  const moveGuest = useCallback((sourceBedId: string, targetBedId: string) => {
    setRooms((prevRooms) => {
      if (sourceBedId === targetBedId) return prevRooms;

      let sourceRoom: Room | undefined;
      let targetRoom: Room | undefined;
      let sourceGuest: Guest | undefined;
      let targetGuest: Guest | undefined;

      for (const room of prevRooms) {
        for (const bed of room.beds) {
          if (bed.id === sourceBedId) {
            sourceRoom = room;
            sourceGuest = bed.guest;
          }
          if (bed.id === targetBedId) {
            targetRoom = room;
            targetGuest = bed.guest;
          }
        }
      }

      if (!sourceGuest || !sourceRoom || !targetRoom) return prevRooms;

      if (targetGuest && targetGuest.id !== sourceGuest.id) {
        return prevRooms.map((room) => ({
          ...room,
          beds: room.beds.map((bed) => {
            if (bed.id === sourceBedId) {
              const nextBed = { ...bed, guest: targetGuest };
              return { ...nextBed, status: getBedStatusFromBookings(nextBed) };
            }
            if (bed.id === targetBedId) {
              const nextBed = { ...bed, guest: sourceGuest };
              return { ...nextBed, status: getBedStatusFromBookings(nextBed) };
            }
            return bed;
          }),
        }));
      }

      return prevRooms.map((room) => ({
        ...room,
        beds: room.beds.map((bed) => {
          if (bed.id === sourceBedId) {
            const nextBed = { ...bed, guest: undefined };
            const nextStatus = (nextBed.reservations?.length ?? 0) > 0 ? "reserved" : "cleaning";
            return { ...nextBed, status: nextStatus } as Bed;
          }
          if (bed.id === targetBedId) {
            const nextBed = { ...bed, guest: sourceGuest };
            return { ...nextBed, status: getBedStatusFromBookings(nextBed) };
          }
          return bed;
        }),
      }));
    });
    // Audit log — record the move with the bed names of source/target.
    const sourceRoom = rooms.find((r) => r.beds.some((b) => b.id === sourceBedId));
    const sourceBed = sourceRoom?.beds.find((b) => b.id === sourceBedId);
    const targetRoom = rooms.find((r) => r.beds.some((b) => b.id === targetBedId));
    const targetBed = targetRoom?.beds.find((b) => b.id === targetBedId);
    if (sourceBed?.guest && targetBed) {
      const swapped = targetBed.guest && targetBed.guest.id !== sourceBed.guest.id;
      logAction(
        sourceBed.guest.id,
        'bed-change',
        swapped
          ? `Swapped with ${targetBed.guest?.name}: ${sourceRoom?.name}/${sourceBed.name} ↔ ${targetRoom?.name}/${targetBed.name}`
          : `Moved to ${targetRoom?.name} - ${targetBed.name}`,
      );
    }
  }, [getBedStatusFromBookings, rooms, logAction]);

  const assignArrival = useCallback((guestId: string, bedId: string) => {
    const guest = arrivals.find((g) => g.id === guestId);

    // Find room/bed to get the actual price for the assigned bed
    const room = rooms.find((r) => r.beds.some((b) => b.id === bedId));
    const bed = room?.beds.find((b) => b.id === bedId);
    const actualPricePerNight = room && bed
      ? (room.pricePerNight || 0) + (bed.bedType === 'bottom' ? (room.bottomBunkPremium || 0) : 0)
      : 0;

    setArrivals((prev) => prev.filter((g) => g.id !== guestId));
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          if (b.id === bedId) {
            const assignedGuest = prevRooms
              .flatMap((r2) => r2.beds.map((b2) => b2.guest))
              .find((g) => g?.id === guestId) || guest;
            if (assignedGuest) {
              // Recalculate totalAmount based on the actual bed's price
              const updatedGuest: typeof assignedGuest = {
                ...assignedGuest,
                totalAmount: Math.round(actualPricePerNight * (assignedGuest.nights || 1) * 100) / 100,
              };
              return { ...b, status: "occupied", guest: updatedGuest };
            }
          }
          return b;
        }),
      })),
    );
    // Auto-generate shift note
    if (guest) {
      addAutoNote(`${guest.name} checked in`, "checkin", guestId, "guest");
      // Audit log
      logAction(guestId, 'check-in', `Checked in → ${room?.name} - ${bed?.name} (${formatCurrency(actualPricePerNight, currentLanguage())}/night × ${guest.nights || 1}n = ${formatCurrency(Math.round(actualPricePerNight * (guest.nights || 1) * 100) / 100, currentLanguage())})`);
    }
  }, [arrivals, rooms, addAutoNote, logAction]);

  const autoAssignBed = useCallback((guestId: string): BedScore | null => {
    const guest = arrivals.find((g) => g.id === guestId);
    if (!guest) return null;

    const best = pickBestBed(guest, rooms);
    if (!best) return null;

    // Assign the guest to the best bed
    assignArrival(guestId, best.bedId);
    return best;
  }, [arrivals, rooms, assignArrival]);

  const occupyBed = useCallback((bedId: string, guest: Omit<Guest, "id">, guestId?: string): string => {
    const newGuest: Guest = { ...guest, id: guestId ?? `g_${crypto.randomUUID()}` };
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          if (b.id === bedId) {
            return { ...b, status: "occupied", guest: newGuest };
          }
          return b;
        }),
      })),
    );
    addAutoNote(`${newGuest.name} checked in`, "checkin", newGuest.id, "guest");
    const room = rooms.find((r) => r.beds.some((b) => b.id === bedId));
    const bed = room?.beds.find((b) => b.id === bedId);
    logAction(newGuest.id, 'check-in', `Checked in → ${room?.name} - ${bed?.name}`);
    return newGuest.id;
  }, [addAutoNote, rooms, logAction]);

  const moveReservation = useCallback((sourceBedId: string, targetBedId: string, guestId: string) => {
    setRooms((prevRooms) => {
      let movedReservation: Guest | undefined;

      const sourceRoom = prevRooms.find((room) => room.beds.some((bed) => bed.id === sourceBedId));
      const targetRoom = prevRooms.find((room) => room.beds.some((bed) => bed.id === targetBedId));
      if (!sourceRoom || !targetRoom) return prevRooms;

      const sourceBed = sourceRoom.beds.find((bed) => bed.id === sourceBedId);
      const targetBed = targetRoom.beds.find((bed) => bed.id === targetBedId);
      if (!sourceBed || !targetBed) return prevRooms;

      movedReservation = sourceBed.reservations?.find((reservation) => reservation.id === guestId);
      if (!movedReservation) return prevRooms;

      return prevRooms.map((room) => ({
        ...room,
        beds: room.beds.map((bed) => {
          if (bed.id === sourceBedId) {
            const nextReservations = (bed.reservations || []).filter((reservation) => reservation.id !== guestId);
            const nextBed = { ...bed, reservations: nextReservations };
            return {
              ...nextBed,
              status: getBedStatusFromBookings(nextBed),
            };
          }
          if (bed.id === targetBedId) {
            const existingReservations = bed.reservations || [];
            const duplicated = existingReservations.some((reservation) => reservation.id === guestId);
            const nextReservations = duplicated ? existingReservations : [...existingReservations, movedReservation!];
            const nextBed = { ...bed, reservations: nextReservations };
            return {
              ...nextBed,
              status: getBedStatusFromBookings(nextBed),
            };
          }
          return bed;
        }),
      }));
    });
    // Audit log
    const sourceRoom = rooms.find((r) => r.beds.some((b) => b.id === sourceBedId));
    const targetRoom = rooms.find((r) => r.beds.some((b) => b.id === targetBedId));
    const sourceBed = sourceRoom?.beds.find((b) => b.id === sourceBedId);
    const targetBed = targetRoom?.beds.find((b) => b.id === targetBedId);
    if (sourceBed && targetBed) {
      logAction(
        guestId,
        'reservation',
        `Reservation moved: ${sourceRoom?.name}/${sourceBed.name} → ${targetRoom?.name}/${targetBed.name}`,
      );
    }
  }, [getBedStatusFromBookings, rooms, logAction]);

  const markBedClean = useCallback((bedId: string) => {
    // Find bed info before updating
    const room = rooms.find(r => r.beds.some(b => b.id === bedId));
    const bed = room?.beds.find(b => b.id === bedId);
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          if (b.id === bedId) {
            return { ...b, status: "empty", lastCleanedAt: new Date().toISOString() };
          }
          return b;
        }),
      })),
    );
    // Auto-generate shift note
    if (bed && room) {
      addAutoNote(`${bed.name} in Room ${room.number} marked as clean`, "cleaning", bedId, "bed");
    }
  }, [rooms, addAutoNote]);

  const checkoutGuest = useCallback((bedId: string) => {
    // Find guest info before updating
    const room = rooms.find(r => r.beds.some(b => b.id === bedId));
    const bed = room?.beds.find(b => b.id === bedId);
    const guest = bed?.guest;
    // Bug fix: also remove the guest from the arrivals list if a record with
    // the same ID exists, otherwise we leave a "ghost" pending arrival.
    if (guest) {
      setArrivals((prev) => prev.filter((g) => g.id !== guest.id));
    }
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          if (b.id === bedId) {
            return { ...b, status: "cleaning", guest: undefined } as Bed;
          }
          return b;
        }),
      })),
    );
    // Auto-generate shift note
    if (guest) {
      addAutoNote(`${guest.name} checked out`, "checkout", guest.id, "guest");
      // Audit log
      logAction(
        guest.id,
        'check-out',
        `Checked out from ${room?.name} - ${bed?.name} (${guest.nights || 0}n, paid ${formatCurrency(guest.paidAmount || 0, currentLanguage())}/${formatCurrency(guest.totalAmount || 0, currentLanguage())})`,
      );
    }
  }, [rooms, addAutoNote, logAction]);

  const settlePayment = useCallback((guestId: string) => {
    let settledAmount = 0;
    setArrivals((prev) =>
      prev.map((g) => {
        if (g.id !== guestId) return g;
        settledAmount = g.totalAmount || 0;
        return { ...g, paidAmount: g.totalAmount || 0, paymentStatus: "paid" };
      }),
    );
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          if (b.guest?.id !== guestId) return b;
          const g = b.guest;
          settledAmount = g.totalAmount || 0;
          return { ...b, guest: { ...g, paidAmount: g.totalAmount || 0, paymentStatus: "paid" } };
        }),
      })),
    );
    logAction(guestId, 'payment', `Payment settled: ${formatCurrency(settledAmount, currentLanguage())}`, { amount: settledAmount });
  }, [logAction]);

  const scanPassport = useCallback((guestId: string) => {
    setArrivals((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, passportScanned: true } : g)),
    );
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) =>
          b.guest?.id === guestId
            ? { ...b, guest: { ...b.guest, passportScanned: true } }
            : b,
        ),
      })),
    );
    logAction(guestId, 'scan-passport', 'Passport scanned');
  }, [logAction]);

  const addArrival = useCallback((guest: Omit<Guest, "id">) => {
    const newGuest: Guest = { ...guest, id: `g_${crypto.randomUUID()}` };
    setArrivals((prev) => [...prev, newGuest]);
    logAction(newGuest.id, 'created', `Arrival created: ${newGuest.checkInDate} → ${newGuest.checkOutDate} (${newGuest.nights}n, ${formatCurrency(newGuest.totalAmount, currentLanguage())})`, { guestSnapshot: newGuest });
    return newGuest.id;
  }, [logAction]);

  const updateArrival = useCallback((guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights' | 'firstName' | 'lastName' | 'idType' | 'arrivalTime' | 'bookingSource' | 'bedPreference'>>) => {
    setArrivals((prev) => prev.map((g) => g.id === guestId ? { ...g, ...updates } : g));
    // Sync updates to rooms guest data AND reservations
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          const updated = { ...b };
          if (b.guest?.id === guestId) {
            updated.guest = { ...b.guest, ...updates };
          }
          if (b.reservations?.some(r => r.id === guestId)) {
            updated.reservations = b.reservations.map(r =>
              r.id === guestId ? { ...r, ...updates } : r
            );
          }
          return updated;
        }),
      })),
    );
  }, []);

  const importArrivals = useCallback((guests: Omit<Guest, "id">[]) => {
    const newGuests: Guest[] = guests.map((g) => ({ ...g, id: `g_${crypto.randomUUID()}` }));
    setArrivals((prev) => [...prev, ...newGuests]);
    for (const g of newGuests) {
      logAction(g.id, 'created', `Imported arrival: ${g.checkInDate} → ${g.checkOutDate} (${g.nights}n)`, { guestSnapshot: g });
    }
  }, [logAction]);

  // ── High-level guest actions (state + audit log) ──────────────
  // These all run an `updateArrival`-style sync to beds/reservations AND
  // append an audit log entry in one place so the log stays consistent.

  const addCharge = useCallback((guestId: string, amount: number, reason: string) => {
    if (!amount || amount <= 0) return;
    setArrivals((prev) => prev.map((g) => g.id === guestId
      ? { ...g, totalAmount: Math.round(((g.totalAmount || 0) + amount) * 100) / 100 }
      : g));
    setRooms((prev) => prev.map((r) => ({
      ...r,
      beds: r.beds.map((b) => {
        const u = { ...b };
        if (b.guest?.id === guestId) {
          u.guest = { ...b.guest, totalAmount: Math.round(((b.guest.totalAmount || 0) + amount) * 100) / 100 };
        }
        if (b.reservations?.some((r) => r.id === guestId)) {
          u.reservations = b.reservations.map((res) => res.id === guestId
            ? { ...res, totalAmount: Math.round(((res.totalAmount || 0) + amount) * 100) / 100 }
            : res);
        }
        return u;
      }),
    })));
    logAction(guestId, 'charge', `Charge ${formatCurrency(amount, currentLanguage())}: ${reason || 'misc'}`, { amount });
  }, [logAction]);

  const extendStay = useCallback((guestId: string, extraNights: number) => {
    if (!extraNights || extraNights < 1) return;
    const guest = arrivals.find((g) => g.id === guestId)
      || rooms.flatMap((r) => r.beds).map((b) => b.guest).find((g) => g?.id === guestId);
    if (!guest) return;
    const room = rooms.find((r) => r.beds.some((b) => b.guest?.id === guestId || b.reservations?.some((res) => res.id === guestId)));
    const bed = room?.beds.find((b) => b.guest?.id === guestId || b.reservations?.some((res) => res.id === guestId));
    const newNights = (guest.nights || 0) + extraNights;
    const checkOut = parseISO(guest.checkOutDate);
    const newCheckOut = format(addDays(checkOut, extraNights), 'yyyy-MM-dd');
    const pricePerNight = room && bed ? getBedPrice(room, bed) : 0;
    const newTotal = pricePerNight > 0
      ? Math.round(((guest.totalAmount || 0) + pricePerNight * extraNights) * 100) / 100
      : guest.totalAmount;

    setArrivals((prev) => prev.map((g) => g.id === guestId
      ? { ...g, nights: newNights, checkOutDate: newCheckOut, totalAmount: newTotal }
      : g));
    setRooms((prev) => prev.map((r) => ({
      ...r,
      beds: r.beds.map((b) => {
        const u = { ...b };
        if (b.guest?.id === guestId) {
          u.guest = { ...b.guest, nights: newNights, checkOutDate: newCheckOut, totalAmount: newTotal };
        }
        if (b.reservations?.some((r) => r.id === guestId)) {
          u.reservations = b.reservations.map((res) => res.id === guestId
            ? { ...res, nights: newNights, checkOutDate: newCheckOut, totalAmount: newTotal }
            : res);
        }
        return u;
      }),
    })));
    logAction(
      guestId,
      'extend-stay',
      `Extended +${extraNights}n → ${newCheckOut} (total now ${formatCurrency(newTotal, currentLanguage())})`,
      { amount: pricePerNight > 0 ? pricePerNight * extraNights : undefined, meta: { extraNights, newNights, newCheckOut, newTotal } },
    );
  }, [arrivals, rooms, logAction]);

  const addPartialPayment = useCallback((guestId: string, amount: number) => {
    if (!amount || amount <= 0) return;
    setArrivals((prev) => prev.map((g) => {
      if (g.id !== guestId) return g;
      const newPaid = Math.round(((g.paidAmount || 0) + amount) * 100) / 100;
      return { ...g, paidAmount: newPaid, paymentStatus: newPaid >= (g.totalAmount || 0) ? 'paid' : 'partial' };
    }));
    setRooms((prev) => prev.map((r) => ({
      ...r,
      beds: r.beds.map((b) => {
        const u = { ...b };
        if (b.guest?.id === guestId) {
          const newPaid = Math.round(((b.guest.paidAmount || 0) + amount) * 100) / 100;
          u.guest = { ...b.guest, paidAmount: newPaid, paymentStatus: newPaid >= (b.guest.totalAmount || 0) ? 'paid' : 'partial' };
        }
        return u;
      }),
    })));
    logAction(guestId, 'payment', `Partial payment ${formatCurrency(amount, currentLanguage())}`, { amount });
  }, [logAction]);

  const addGuestNote = useCallback((guestId: string, note: string) => {
    if (!note) return;
    setArrivals((prev) => prev.map((g) => g.id === guestId ? { ...g, notes: note } : g));
    setRooms((prev) => prev.map((r) => ({
      ...r,
      beds: r.beds.map((b) => {
        const u = { ...b };
        if (b.guest?.id === guestId) u.guest = { ...b.guest, notes: note };
        return u;
      }),
    })));
    logAction(guestId, 'note', `Note updated`, { meta: { length: note.length } });
  }, [logAction]);

  const updateGuestField = useCallback((
    guestId: string,
    field: 'phone' | 'email' | 'passportOrId' | 'gender' | 'source' | 'roomPreference',
    value: string,
  ) => {
    setArrivals((prev) => prev.map((g) => g.id === guestId ? { ...g, [field]: value } : g));
    setRooms((prev) => prev.map((r) => ({
      ...r,
      beds: r.beds.map((b) => {
        const u = { ...b };
        if (b.guest?.id === guestId) u.guest = { ...b.guest, [field]: value };
        return u;
      }),
    })));
    logAction(guestId, 'edit', `Updated ${field}: ${value || '—'}`);
  }, [logAction]);

  const addRoom = useCallback((room: Omit<Room, "id" | "beds">) => {
    const newRoom: Room = { ...room, id: `r_${crypto.randomUUID()}`, beds: [] };
    setRooms((prev) => [...prev, newRoom]);
  }, []);

  const addBedToRoom = useCallback((roomId: string, bed: Omit<Bed, "id" | "roomId" | "status">) => {
    const newBed: Bed = { ...bed, id: `b_${crypto.randomUUID()}`, roomId, status: "empty" };
    setRooms((prevRooms) =>
      prevRooms.map((r) => r.id === roomId ? { ...r, beds: [...r.beds, newBed] } : r),
    );
  }, []);

  const updateRoom = useCallback((roomId: string, name: string, number: string, pricePerNight?: number, bottomBunkPremium?: number) => {
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, name, number, ...(pricePerNight !== undefined ? { pricePerNight } : {}), ...(bottomBunkPremium !== undefined ? { bottomBunkPremium } : {}) } : r));
  }, []);

  const updateBed = useCallback((roomId: string, bedId: string, name: string, bedType?: "top" | "bottom" | "single" | "double") => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return { ...r, beds: r.beds.map(b => b.id === bedId ? { ...b, name, ...(bedType !== undefined ? { bedType } : {}) } : b) };
      })
    );
  }, []);

  const deleteRoom = useCallback((roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const deleteBed = useCallback((roomId: string, bedId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return { ...r, beds: r.beds.filter((b) => b.id !== bedId) };
      }),
    );
  }, []);

  // ── Shift Log operations ──────────────────────────────────────

  const addShiftNote = useCallback((note: Omit<ShiftNote, "id" | "createdAt" | "isResolved">) => {
    const newNote: ShiftNote = {
      ...note,
      id: `sn_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      isResolved: false,
    };
    setShiftNotes((prev) => [newNote, ...prev]);
  }, []);

  const resolveShiftNote = useCallback((noteId: string) => {
    setShiftNotes((prev) =>
      prev.map((n) => n.id === noteId ? { ...n, isResolved: true, resolvedAt: new Date().toISOString() } : n),
    );
  }, []);

  const unresolveShiftNote = useCallback((noteId: string) => {
    setShiftNotes((prev) =>
      prev.map((n) => n.id === noteId ? { ...n, isResolved: false, resolvedAt: undefined } : n),
    );
  }, []);

  const deleteShiftNote = useCallback((noteId: string) => {
    setShiftNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // ── Group Booking operations ──────────────────────────────────

  const addGroupBooking = useCallback((booking: Omit<GroupBooking, "id" | "createdAt">) => {
    const newBooking: GroupBooking = {
      ...booking,
      id: `gb_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setGroupBookings((prev) => [...prev, newBooking]);
  }, []);

  const updateGroupBookingPayment = useCallback((groupId: string, paidAmount: number) => {
    setGroupBookings((prev) =>
      prev.map((gb) => gb.id === groupId ? { ...gb, paidAmount } : gb),
    );
  }, []);

  // ── Referral operations ───────────────────────────────────────

  const addReferral = useCallback((referral: Omit<Referral, "id" | "createdAt">) => {
    const newReferral: Referral = {
      ...referral,
      id: `ref_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setReferrals((prev) => [...prev, newReferral]);
  }, []);

  const useReferralCode = useCallback((code: string, newGuestId: string) => {
    setReferrals((prev) =>
      prev.map((r) =>
        r.code === code
          ? { ...r, usedByGuestIds: [...r.usedByGuestIds, newGuestId] }
          : r,
      ),
    );
  }, []);

  // ── Hostel Page operations ────────────────────────────────────

  const updateHostelPage = useCallback((updates: Partial<HostelPage>) => {
    setHostelPage((prev) => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  }, []);

  // ── Promotion operations ──────────────────────────────────────

  const addPromotion = useCallback((promotion: Omit<Promotion, "id" | "createdAt">) => {
    const newPromotion: Promotion = {
      ...promotion,
      id: `promo_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setPromotions((prev) => [...prev, newPromotion]);
  }, []);

  const togglePromotion = useCallback((promotionId: string) => {
    setPromotions((prev) =>
      prev.map((p) => p.id === promotionId ? { ...p, active: !p.active } : p),
    );
  }, []);

  // ── Guest CRM operations ─────────────────────────────────────

  const addGuestProfile = useCallback((profile: Omit<GuestProfile, "id">) => {
    const newProfile: GuestProfile = { ...profile, id: `gp_${crypto.randomUUID()}` };
    setGuestProfiles((prev) => [...prev, newProfile]);
  }, []);

  const updateGuestProfile = useCallback((profileId: string, updates: Partial<Pick<GuestProfile, "email" | "phone" | "whatsapp" | "tags" | "notes" | "lastContactedAt">>) => {
    setGuestProfiles((prev) => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));
  }, []);

  const addTagToGuest = useCallback((profileId: string, tag: GuestTag) => {
    setGuestProfiles((prev) => prev.map(p => {
      if (p.id !== profileId) return p;
      if (p.tags.includes(tag)) return p;
      return { ...p, tags: [...p.tags, tag] };
    }));
  }, []);

  const removeTagFromGuest = useCallback((profileId: string, tag: GuestTag) => {
    setGuestProfiles((prev) => prev.map(p => {
      if (p.id !== profileId) return p;
      return { ...p, tags: p.tags.filter(t => t !== tag) };
    }));
  }, []);

  // ── Occupancy Action operations ────────────────────────────────

  const applyOccupancyAction = useCallback((actionId: string) => {
    setOccupancyActions((prev) => prev.map(a =>
      a.id === actionId ? { ...a, status: 'applied' as const, appliedAt: new Date().toISOString() } : a
    ));
  }, []);

  const dismissOccupancyAction = useCallback((actionId: string) => {
    setOccupancyActions((prev) => prev.map(a =>
      a.id === actionId ? { ...a, status: 'dismissed' as const, dismissedAt: new Date().toISOString() } : a
    ));
  }, []);

  // ── Context value ─────────────────────────────────────────────

  const value = useMemo(() => ({
    rooms, arrivals,
    moveGuest, assignArrival, autoAssignBed, occupyBed, moveReservation, markBedClean, checkoutGuest, settlePayment, scanPassport,
    addArrival, updateArrival, importArrivals, addRoom, updateRoom, deleteRoom, addBedToRoom, updateBed, deleteBed,
    shiftNotes, addShiftNote, resolveShiftNote, unresolveShiftNote, deleteShiftNote,
    groupBookings, addGroupBooking, updateGroupBookingPayment,
    referrals, addReferral, useReferralCode,
    hostelPage, updateHostelPage,
    promotions, addPromotion, togglePromotion,
    guestProfiles, addGuestProfile, updateGuestProfile, addTagToGuest, removeTagFromGuest,
    occupancyActions, applyOccupancyAction, dismissOccupancyAction,
    guestLogs, addGuestLog,
    addCharge, extendStay, addPartialPayment, addGuestNote, updateGuestField,
  }), [
    rooms, arrivals, moveGuest, assignArrival, autoAssignBed, occupyBed, moveReservation, markBedClean, checkoutGuest, settlePayment, scanPassport,
    addArrival, updateArrival, importArrivals, addRoom, updateRoom, deleteRoom, addBedToRoom, updateBed, deleteBed,
    shiftNotes, addShiftNote, resolveShiftNote, unresolveShiftNote, deleteShiftNote,
    groupBookings, addGroupBooking, updateGroupBookingPayment,
    referrals, addReferral, useReferralCode,
    hostelPage, updateHostelPage,
    promotions, addPromotion, togglePromotion,
    guestProfiles, addGuestProfile, updateGuestProfile, addTagToGuest, removeTagFromGuest,
    occupancyActions, applyOccupancyAction, dismissOccupancyAction,
    guestLogs, addGuestLog,
    addCharge, extendStay, addPartialPayment, addGuestNote, updateGuestField,
  ]);

  return (
    <HostelContext.Provider value={value}>
      {children}
    </HostelContext.Provider>
  );
}

export const useHostel = () => {
  const ctx = useContext(HostelContext);
  if (!ctx) throw new Error("useHostel must be within HostelProvider");
  return ctx;
};
