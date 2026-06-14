import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from "react";
import { Room, Guest, Bed, ShiftNote, ShiftNoteSource, Task, TaskStatus, Activity, ActivityParticipant, GroupBooking, Referral, HostelPage, Promotion, GuestProfile, GuestTag, OccupancyAction } from "./types";
import { INITIAL_ROOMS, ARRIVALS, INITIAL_SHIFT_NOTES, INITIAL_TASKS, INITIAL_ACTIVITIES, INITIAL_GROUP_BOOKINGS, INITIAL_REFERRALS, INITIAL_HOSTEL_PAGE, INITIAL_PROMOTIONS, INITIAL_GUEST_PROFILES } from "./data";
import { useStaff } from "./StaffContext";

function loadState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`bunkdesk_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

interface HostelState {
  rooms: Room[];
  arrivals: Guest[];
  moveGuest: (sourceBedId: string, targetBedId: string) => void;
  assignArrival: (guestId: string, bedId: string) => void;
  occupyBed: (bedId: string, guest: Omit<Guest, "id">) => string;
  markBedClean: (bedId: string) => void;
  checkoutGuest: (bedId: string) => void;
  settlePayment: (guestId: string) => void;
  scanPassport: (guestId: string) => void;
  addArrival: (guest: Omit<Guest, "id">) => void;
  updateArrival: (guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'dob' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights'>>) => void;
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
  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt" | "comments">) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTask: (taskId: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "assignee" | "dueDate" | "category">>) => void;
  deleteTask: (taskId: string) => void;
  addTaskComment: (taskId: string, author: string, content: string) => void;
  // Activities
  activities: Activity[];
  addActivity: (activity: Omit<Activity, "id" | "participants">) => void;
  updateActivityStatus: (activityId: string, status: Activity["status"]) => void;
  addParticipant: (activityId: string, participant: Omit<ActivityParticipant, "id">) => void;
  removeParticipant: (activityId: string, participantId: string) => void;
  toggleParticipantCheckIn: (activityId: string, participantId: string) => void;
  deleteActivity: (activityId: string) => void;
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
}

const HostelContext = createContext<HostelState | undefined>(undefined);

export function HostelProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(() => loadState('rooms', INITIAL_ROOMS));
  const [arrivals, setArrivals] = useState<Guest[]>(() => loadState('arrivals', ARRIVALS));
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>(() => loadState('shiftNotes', INITIAL_SHIFT_NOTES));
  const [tasks, setTasks] = useState<Task[]>(() => loadState('tasks', INITIAL_TASKS));
  const [activities, setActivities] = useState<Activity[]>(() => loadState('activities', INITIAL_ACTIVITIES));
  const [groupBookings, setGroupBookings] = useState<GroupBooking[]>(() => loadState('groupBookings', INITIAL_GROUP_BOOKINGS));
  const [referrals, setReferrals] = useState<Referral[]>(() => loadState('referrals', INITIAL_REFERRALS));
  const [hostelPage, setHostelPage] = useState<HostelPage>(() => loadState('hostelPage', INITIAL_HOSTEL_PAGE));
  const [promotions, setPromotions] = useState<Promotion[]>(() => loadState('promotions', INITIAL_PROMOTIONS));
  const [guestProfiles, setGuestProfiles] = useState<GuestProfile[]>(() => loadState('guestProfiles', INITIAL_GUEST_PROFILES));
  const [occupancyActions, setOccupancyActions] = useState<OccupancyAction[]>(() => loadState('occupancyActions', []));

  // Use ref for shiftNotes to avoid circular dependencies in useCallback
  const shiftNotesRef = useRef(shiftNotes);
  shiftNotesRef.current = shiftNotes;

  // Persist state to localStorage with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('bunkdesk_rooms', JSON.stringify(rooms));
      localStorage.setItem('bunkdesk_arrivals', JSON.stringify(arrivals));
      localStorage.setItem('bunkdesk_shiftNotes', JSON.stringify(shiftNotes));
      localStorage.setItem('bunkdesk_tasks', JSON.stringify(tasks));
      localStorage.setItem('bunkdesk_activities', JSON.stringify(activities));
      localStorage.setItem('bunkdesk_groupBookings', JSON.stringify(groupBookings));
      localStorage.setItem('bunkdesk_referrals', JSON.stringify(referrals));
      localStorage.setItem('bunkdesk_hostelPage', JSON.stringify(hostelPage));
      localStorage.setItem('bunkdesk_promotions', JSON.stringify(promotions));
      localStorage.setItem('bunkdesk_guestProfiles', JSON.stringify(guestProfiles));
      localStorage.setItem('bunkdesk_occupancyActions', JSON.stringify(occupancyActions));
    }, 300);
    return () => clearTimeout(timer);
  }, [rooms, arrivals, shiftNotes, tasks, activities, groupBookings, referrals, hostelPage, promotions, guestProfiles, occupancyActions]);

  const { currentStaff } = useStaff();

  // ── Internal: Auto-generate shift note ────────────────────────
  const addAutoNote = useCallback((
    content: string,
    source: ShiftNoteSource,
    relatedId?: string,
    relatedType?: "guest" | "bed" | "task" | "room",
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

  // ── Bed/Guest operations ──────────────────────────────────────

  const moveGuest = useCallback((sourceBedId: string, targetBedId: string) => {
    setRooms((prevRooms) => {
      let movedGuest: Guest | undefined;
      const step1Rooms = prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          if (b.id === sourceBedId) {
            movedGuest = b.guest;
            return { ...b, status: "cleaning", guest: undefined } as Bed;
          }
          return b;
        }),
      }));
      return step1Rooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) => {
          if (b.id === targetBedId && movedGuest) {
            return { ...b, status: "occupied", guest: movedGuest };
          }
          return b;
        }),
      }));
    });
  }, []);

  const assignArrival = useCallback((guestId: string, bedId: string) => {
    const guest = arrivals.find((g) => g.id === guestId);
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
              return { ...b, status: "occupied", guest: assignedGuest };
            }
          }
          return b;
        }),
      })),
    );
    // Auto-generate shift note
    if (guest) {
      addAutoNote(`${guest.name} checked in`, "checkin", guestId, "guest");
    }
  }, [arrivals, addAutoNote]);

  const occupyBed = useCallback((bedId: string, guest: Omit<Guest, "id">) => {
    const newGuest: Guest = { ...guest, id: `g_${crypto.randomUUID()}` };
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
    return newGuest.id;
  }, [addAutoNote]);

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
    }
  }, [rooms, addAutoNote]);

  const settlePayment = useCallback((guestId: string) => {
    setArrivals((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, paymentStatus: "paid" } : g)),
    );
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) =>
          b.guest?.id === guestId
            ? { ...b, guest: { ...b.guest, paymentStatus: "paid" } }
            : b,
        ),
      })),
    );
  }, []);

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
  }, []);

  const addArrival = useCallback((guest: Omit<Guest, "id">) => {
    const newGuest: Guest = { ...guest, id: `g_${crypto.randomUUID()}` };
    setArrivals((prev) => [...prev, newGuest]);
  }, []);

  const updateArrival = useCallback((guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'dob' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights'>>) => {
    setArrivals((prev) => prev.map((g) => g.id === guestId ? { ...g, ...updates } : g));
    // Sync updates to rooms guest data
    setRooms((prevRooms) =>
      prevRooms.map((r) => ({
        ...r,
        beds: r.beds.map((b) =>
          b.guest?.id === guestId
            ? { ...b, guest: { ...b.guest, ...updates } }
            : b,
        ),
      })),
    );
  }, []);

  const importArrivals = useCallback((guests: Omit<Guest, "id">[]) => {
    const newGuests: Guest[] = guests.map((g) => ({ ...g, id: `g_${crypto.randomUUID()}` }));
    setArrivals((prev) => [...prev, ...newGuests]);
  }, []);

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

  // ── Task operations ───────────────────────────────────────────

  const addTask = useCallback((task: Omit<Task, "id" | "createdAt" | "comments">) => {
    const newTask: Task = {
      ...task,
      id: `task_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) => {
      const task = prev.find(t => t.id === taskId);
      const updated = prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status,
          completedAt: status === "completed" ? new Date().toISOString() : undefined,
        };
      });
      // Auto-generate shift note when task is completed
      if (status === "completed" && task) {
        addAutoNote(`Task completed: ${task.title}`, "task", taskId, "task");
      }
      return updated;
    });
  }, [addAutoNote]);

  const updateTask = useCallback((taskId: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "assignee" | "dueDate" | "category">>) => {
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, ...updates } : t),
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const addTaskComment = useCallback((taskId: string, author: string, content: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          comments: [...t.comments, {
            id: `tc_${crypto.randomUUID()}`,
            author,
            content,
            createdAt: new Date().toISOString(),
          }],
        };
      }),
    );
  }, []);

  // ── Activity operations ───────────────────────────────────────

  const addActivity = useCallback((activity: Omit<Activity, "id" | "participants">) => {
    const newActivity: Activity = {
      ...activity,
      id: `act_${crypto.randomUUID()}`,
      participants: [],
    };
    setActivities((prev) => [...prev, newActivity]);
  }, []);

  const updateActivityStatus = useCallback((activityId: string, status: Activity["status"]) => {
    setActivities((prev) =>
      prev.map((a) => a.id === activityId ? { ...a, status } : a),
    );
  }, []);

  const addParticipant = useCallback((activityId: string, participant: Omit<ActivityParticipant, "id">) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== activityId) return a;
        if (a.participants.length >= a.capacity) return a;
        return {
          ...a,
          participants: [...a.participants, { ...participant, id: `ap_${crypto.randomUUID()}` }],
        };
      }),
    );
  }, []);

  const removeParticipant = useCallback((activityId: string, participantId: string) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== activityId) return a;
        return { ...a, participants: a.participants.filter((p) => p.id !== participantId) };
      }),
    );
  }, []);

  const toggleParticipantCheckIn = useCallback((activityId: string, participantId: string) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== activityId) return a;
        return {
          ...a,
          participants: a.participants.map((p) =>
            p.id === participantId ? { ...p, checkedIn: !p.checkedIn } : p,
          ),
        };
      }),
    );
  }, []);

  const deleteActivity = useCallback((activityId: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
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
    moveGuest, assignArrival, occupyBed, markBedClean, checkoutGuest, settlePayment, scanPassport,
    addArrival, updateArrival, importArrivals, addRoom, updateRoom, deleteRoom, addBedToRoom, updateBed, deleteBed,
    shiftNotes, addShiftNote, resolveShiftNote, unresolveShiftNote, deleteShiftNote,
    tasks, addTask, updateTaskStatus, updateTask, deleteTask, addTaskComment,
    activities, addActivity, updateActivityStatus, addParticipant, removeParticipant, toggleParticipantCheckIn, deleteActivity,
    groupBookings, addGroupBooking, updateGroupBookingPayment,
    referrals, addReferral, useReferralCode,
    hostelPage, updateHostelPage,
    promotions, addPromotion, togglePromotion,
    guestProfiles, addGuestProfile, updateGuestProfile, addTagToGuest, removeTagFromGuest,
    occupancyActions, applyOccupancyAction, dismissOccupancyAction,
  }), [
    rooms, arrivals, moveGuest, assignArrival, markBedClean, checkoutGuest, settlePayment, scanPassport,
    addArrival, updateArrival, importArrivals, addRoom, updateRoom, addBedToRoom, updateBed,
    shiftNotes, addShiftNote, resolveShiftNote, unresolveShiftNote, deleteShiftNote,
    tasks, addTask, updateTaskStatus, updateTask, deleteTask, addTaskComment,
    activities, addActivity, updateActivityStatus, addParticipant, removeParticipant, toggleParticipantCheckIn, deleteActivity,
    groupBookings, addGroupBooking, updateGroupBookingPayment,
    referrals, addReferral, useReferralCode,
    hostelPage, updateHostelPage,
    promotions, addPromotion, togglePromotion,
    guestProfiles, addGuestProfile, updateGuestProfile, addTagToGuest, removeTagFromGuest,
    occupancyActions, applyOccupancyAction, dismissOccupancyAction,
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
