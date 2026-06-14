import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { addDays, startOfDay, parseISO, format, differenceInDays } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useHostel } from '../../HostelContext';
import { useTranslation } from '../../i18nContext';
import { useStaff } from '../../StaffContext';
import { useTimelineDateNavigation, useTimelineNavigation } from '../../hooks/useTimelineNavigation';
import { timelineCollisionDetection, getDropDateFromX } from '../../utils/dndCollision';
import { getBookingsForBed, findBedContext, rangesOverlap } from '../../utils/timelineEngine';
import { canGuestOccupyRoom } from '../../utils/bedRules';
import { Guest, Bed, Room } from '../../types';
import { Banners } from './Banners';
import { FilterBar } from './FilterBar';
import { TimelineGrid } from './TimelineGrid';
import {
  GuestDetailModal,
  CheckoutDialog,
  GenderConflictDialog,
  RoomSettingsDialog,
  AddRoomDialog,
} from './Dialogs';
import { QuickBookingModal } from '../QuickBookingModal';
import { motion } from 'motion/react';

const LABEL_WIDTH = 160;
const MIN_DAY_WIDTH = 56;

interface BedBoardProps {
  navigateToGrow?: (subTab: string, options?: { autoOpenPromo?: boolean }) => void;
  setActiveTab?: (tab: string) => void;
}

export function BedBoard({ navigateToGrow, setActiveTab }: BedBoardProps) {
  const { rooms, arrivals, moveGuest, moveReservation, checkoutGuest, updateArrival, assignArrival } = useHostel();
  const { t } = useTranslation();
  const { currentStaff } = useStaff();

  // ── Date / Viewport state ──────────────────────────────────────
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleDays = useMemo(() => {
    if (containerWidth <= 0) return 14;
    const available = containerWidth - LABEL_WIDTH;
    const days = Math.floor(available / MIN_DAY_WIDTH);
    return Math.max(7, Math.min(14, days));
  }, [containerWidth]);

  const dayWidth = useMemo(() => {
    if (containerWidth <= 0) return MIN_DAY_WIDTH;
    return (containerWidth - LABEL_WIDTH) / visibleDays;
  }, [containerWidth, visibleDays]);

  const dates = useMemo(
    () => Array.from({ length: visibleDays }).map((_, i) => addDays(startDate, i)),
    [startDate, visibleDays],
  );

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Filters ────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>(
    currentStaff?.role === 'cleaning' ? 'cleaning' : 'all',
  );
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');

  const filteredRooms = useMemo(() => rooms
    .filter((room) => roomTypeFilter === 'all' || room.type === roomTypeFilter)
    .map((room) => ({
      ...room,
      beds: room.beds.filter((bed) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'reserved') {
          return !bed.guest && (bed.reservations?.length ?? 0) > 0;
        }
        return bed.status === statusFilter;
      }),
    }))
    .filter((room) => room.beds.length > 0),
  [rooms, roomTypeFilter, statusFilter]);

  const dirtyBedsCount = useMemo(
    () => rooms.reduce((sum, r) => sum + r.beds.filter((b) => b.status === 'cleaning').length, 0),
    [rooms],
  );

  // ── Navigation ──────────────────────────────────────────────────
  const { goBack, goForward, goToday } = useTimelineDateNavigation(startDate, setStartDate);

  const [showDatePicker, setShowDatePicker] = useState(false);
  useTimelineNavigation({
    goBack,
    goForward,
    goToday,
    onEscape: () => {
      setShowDatePicker(false);
      setSelectedGuest(null);
    },
  });

  // Close date picker on outside click
  useEffect(() => {
    if (!showDatePicker) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-date-picker]')) setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDatePicker]);

  // ── DnD State ──────────────────────────────────────────────────
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [hoveredBedId, setHoveredBedId] = useState<string | null>(null);
  const [hoveredDateIndex, setHoveredDateIndex] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  // Suppress click events that fire after drag or resize operations
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // ── Drop validity computation ──────────────────────────────────
  const dropValidity = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!activeGuest) return map;

    const sourceContext = findBedContext(rooms, activeGuest.id);
    // We need the source bed ID from the active guest data - stored on drag start
    // For now, mark all beds; the actual check is in handleDragEnd

    for (const room of rooms) {
      for (const bed of room.beds) {
        // Skip occupied beds unless swapping
        if (bed.guest && bed.guest.id !== activeGuest.id) {
          // Check if swap is possible
          const canSwapGuestOntoThisBed = canGuestOccupyRoom(activeGuest, room);
          const otherGuestCanGoToSource = sourceContext
            ? canGuestOccupyRoom(bed.guest, sourceContext.room)
            : true;
          map.set(bed.id, canSwapGuestOntoThisBed && otherGuestCanGoToSource);
        } else {
          map.set(bed.id, canGuestOccupyRoom(activeGuest, room));
        }
      }
    }
    return map;
  }, [activeGuest, rooms]);

  // ── DnD Handlers ────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Block drag if resize is in progress
    if (isResizingRef.current) return;

    const activatorTarget = (event.activatorEvent as PointerEvent)?.target as HTMLElement | null;
    if (activatorTarget?.closest?.('[data-resize]')) return;

    const { active } = event;
    if (active.data.current?.type === 'guest') {
      setActiveGuest(active.data.current.guest as Guest);
      // Store source bed ID on the active data for use in dragEnd
      (active.data.current as any)._sourceBedId = active.data.current.sourceBedId;
      // Mark that a drag started — suppress the next click
      suppressClickRef.current = true;
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over || over.data.current?.type !== 'bed') {
      setHoveredBedId(null);
      setHoveredDateIndex(null);
      return;
    }

    setHoveredBedId(over.id as string);

    // Calculate which date column the pointer is over
    const pointerEvent = event.activatorEvent as PointerEvent;
    const overRect = over.rect;
    if (pointerEvent && overRect) {
      const dateIdx = Math.floor((pointerEvent.clientX - overRect.left) / dayWidth);
      setHoveredDateIndex(Math.max(0, Math.min(dateIdx, visibleDays - 1)));
    }
  }, [dayWidth, visibleDays]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveGuest(null);
      setHoveredBedId(null);
      setHoveredDateIndex(null);

      const { active, over } = event;
      if (!over || !over.data.current) {
        suppressClickRef.current = false;
        return;
      }

      if (active.data.current?.type === 'guest' && over.data.current?.type === 'bed') {
        const sourceBedId = (active.data.current as any)._sourceBedId || active.data.current.sourceBedId;
        const guest = active.data.current.guest as Guest;
        const targetBedId = over.id as string;
        const targetBed = (over.data.current as any).bed as Bed;
        const targetRoom = (over.data.current as any).room as Room;

        const sourceContext = findBedContext(rooms, sourceBedId);
        if (!sourceContext) { suppressClickRef.current = false; return; }

        // Same bed — no move needed
        if (sourceBedId === targetBedId) { suppressClickRef.current = false; return; }

        const targetGuest = targetBed.guest;

        // ── Date overlap check (Bug fix #1) ─────────────────────
        // Determine the effective date range for the moved guest
        let effectiveCheckIn = guest.checkInDate;
        let effectiveCheckOut = guest.checkOutDate;
        if (hoveredDateIndex !== null && hoveredDateIndex >= 0 && dates[hoveredDateIndex]) {
          effectiveCheckIn = format(dates[hoveredDateIndex], 'yyyy-MM-dd');
          effectiveCheckOut = format(addDays(dates[hoveredDateIndex], guest.nights || 1), 'yyyy-MM-dd');
        }

        // Check overlap with existing bookings on the target bed
        // (exclude the guest being swapped out, since they're trading places)
        const targetBookings = getBookingsForBed(targetBed);
        const swapGuestId = targetGuest?.id;
        const hasOverlap = targetBookings.some((b) => {
          if (b.id === guest.id) return false; // same guest
          if (swapGuestId && b.id === swapGuestId) return false; // being swapped out
          return rangesOverlap(effectiveCheckIn, effectiveCheckOut, b.checkInDate, b.checkOutDate);
        });

        if (hasOverlap) {
          // Dates overlap with existing bookings — reject the drop
          setDateOverlapWarning(true);
          suppressClickRef.current = false;
          return;
        }

        // ── Gender conflict check ───────────────────────────────
        if (guest.gender === 'male' && targetRoom.type === 'dorm-female') {
          setGenderConflict({ guestName: guest.name, sourceBedId, targetBedId });
          suppressClickRef.current = false;
          return;
        }

        // Determine if this is a reservation move
        const sourceIsReservation = !!sourceContext.bed.reservations?.some(
          (r) => r.id === guest.id,
        );

        // Swap check
        const canSwap =
          !!targetGuest &&
          targetGuest.id !== guest.id &&
          canGuestOccupyRoom(guest, targetRoom) &&
          canGuestOccupyRoom(targetGuest, sourceContext.room);

        // Execute move
        if (sourceIsReservation) {
          moveReservation(sourceBedId, targetBedId, guest.id);
        } else {
          moveGuest(sourceBedId, targetBedId);
        }

        // Adjust check-in date to the target date column if applicable
        if (hoveredDateIndex !== null && hoveredDateIndex >= 0) {
          const targetDate = dates[hoveredDateIndex];
          if (targetDate && effectiveCheckIn !== guest.checkInDate) {
            updateArrival(guest.id, {
              checkInDate: effectiveCheckIn,
              checkOutDate: effectiveCheckOut,
              nights: guest.nights || 1,
            });
          }
        }
      }

      // Suppress residual click after drag (Bug fix #2)
      suppressClickRef.current = true;
    },
    [rooms, dates, moveGuest, moveReservation, updateArrival],
  );

  // ── Dialog State ────────────────────────────────────────────────
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [confirmCheckout, setConfirmCheckout] = useState<Guest | null>(null);
  const [checkoutBedId, setCheckoutBedId] = useState<string | null>(null);
  const [genderConflict, setGenderConflict] = useState<{
    guestName: string;
    sourceBedId: string;
    targetBedId: string;
  } | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [dateOverlapWarning, setDateOverlapWarning] = useState(false);

  // Auto-dismiss the overlap warning after 3.5s so the user isn't stuck
  // dismissing it manually after a mis-drop.
  useEffect(() => {
    if (!dateOverlapWarning) return;
    const t = setTimeout(() => setDateOverlapWarning(false), 3500);
    return () => clearTimeout(t);
  }, [dateOverlapWarning]);
  const [quickBooking, setQuickBooking] = useState<{
    bed: Bed;
    room: Room;
    date: Date;
  } | null>(null);

  // ── Helper: is a guest a reservation (not checked in) ──────────
  const isReservation = useCallback(
    (guest: Guest, bed: Bed) => {
      return !bed.guest || bed.guest.id !== guest.id;
    },
    [],
  );

  // ── Booking Block callbacks ────────────────────────────────────
  const handleBookingClick = useCallback((guest: Guest, bed: Bed) => {
    const ctx = findBedContext(rooms, bed.id);
    setSelectedGuest(guest);
    setSelectedBed(bed);
    setSelectedRoom(ctx?.room || null);
  }, [rooms]);

  const handleCheckout = useCallback((bedId: string) => {
    const ctx = findBedContext(rooms, bedId);
    if (ctx?.bed.guest) {
      setConfirmCheckout(ctx.bed.guest);
      setCheckoutBedId(bedId);
      setSelectedGuest(null);
    }
  }, [rooms]);

  const handleConfirmCheckout = useCallback(() => {
    if (checkoutBedId) {
      checkoutGuest(checkoutBedId);
    }
    setConfirmCheckout(null);
    setCheckoutBedId(null);
  }, [checkoutBedId, checkoutGuest]);

  const handleQuickBooking = useCallback((bed: Bed, room: Room, date: Date) => {
    setQuickBooking({ bed, room, date });
  }, []);

  const handleAssignArrival = useCallback(
    (guestId: string, bedId: string) => {
      assignArrival(guestId, bedId);
    },
    [assignArrival],
  );

  const handleResizeLeft = useCallback(
    (booking: Guest, deltaDays: number) => {
      const cIn = parseISO(booking.checkInDate);
      const cOut = parseISO(booking.checkOutDate);
      const newIn = addDays(cIn, deltaDays);
      if (newIn.getTime() >= cOut.getTime()) return;
      const newNights = differenceInDays(cOut, newIn);
      if (newNights < 1) return;
      updateArrival(booking.id, {
        checkInDate: format(newIn, 'yyyy-MM-dd'),
        nights: newNights,
      });
    },
    [updateArrival],
  );

  const handleResizeRight = useCallback(
    (booking: Guest, deltaDays: number) => {
      const cIn = parseISO(booking.checkInDate);
      const cOut = parseISO(booking.checkOutDate);
      const newOut = addDays(cOut, deltaDays);
      if (newOut.getTime() <= cIn.getTime()) return;
      const newNights = differenceInDays(newOut, cIn);
      if (newNights < 1) return;
      updateArrival(booking.id, {
        checkOutDate: format(newOut, 'yyyy-MM-dd'),
        nights: newNights,
      });
    },
    [updateArrival],
  );

  const handleGenderConfirm = useCallback(() => {
    if (genderConflict) {
      moveGuest(genderConflict.sourceBedId, genderConflict.targetBedId);
      setGenderConflict(null);
    }
  }, [genderConflict, moveGuest]);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={timelineCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full space-y-3">
        {/* Date overlap warning */}
        {dateOverlapWarning && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm">
            <span className="text-red-600 font-medium">
              {t('calendarview.dateOverlapBlocked') || 'Date overlap — cannot move here.'}
            </span>
            <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setDateOverlapWarning(false)}>✕</button>
          </div>
        )}
        {/* Banners */}
        <Banners
          statusFilter={statusFilter}
          dirtyBedsCount={dirtyBedsCount}
          arrivalsCount={arrivals.length}
          setStatusFilter={setStatusFilter}
          setActiveTab={setActiveTab}
        />

        {/* Filter bar */}
        <FilterBar
          statusFilter={statusFilter}
          roomTypeFilter={roomTypeFilter}
          startDate={startDate}
          visibleDays={visibleDays}
          setStatusFilter={setStatusFilter}
          setRoomTypeFilter={setRoomTypeFilter}
          goBack={goBack}
          goForward={goForward}
          goToday={goToday}
          onAddRoom={() => setIsAddRoomOpen(true)}
          onDatePickerToggle={() => setShowDatePicker(!showDatePicker)}
        />

        {/* Timeline Grid */}
        <div ref={containerRef} className="flex-1 overflow-auto border border-zinc-200 rounded-xl bg-white">
          {filteredRooms.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
              {t('bedboard.noBedsFound') || 'No beds found matching filters.'}
            </div>
          ) : (
            <TimelineGrid
              rooms={filteredRooms}
              dates={dates}
              visibleDays={visibleDays}
              dayWidth={dayWidth}
              labelWidth={LABEL_WIDTH}
              isResizingRef={isResizingRef}
              suppressClickRef={suppressClickRef}
              activeGuest={activeGuest}
              hoveredBedId={hoveredBedId}
              hoveredDateIndex={hoveredDateIndex}
              dropValidity={dropValidity}
              isReservation={isReservation}
              onBookingClick={handleBookingClick}
              onCheckout={handleCheckout}
              onQuickBooking={handleQuickBooking}
              onAssignArrival={handleAssignArrival}
              onResizeLeft={handleResizeLeft}
              onResizeRight={handleResizeRight}
              onRoomSettings={setEditingRoom}
            />
          )}
        </div>
      </div>

      {/* Drag Overlay — render an actual booking-block styled clone that
          follows the cursor. The color matches the source block so the
          user can see exactly which reservation they are moving. */}
      <DragOverlay dropAnimation={null}>
        {activeGuest && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1.05, opacity: 1, rotate: -1.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`rounded-lg shadow-2xl ring-2 ring-white/40 px-3 py-2 pointer-events-none ${
              activeGuest.paymentStatus === 'paid' ? 'bg-blue-100 text-blue-800' :
              activeGuest.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}
            style={{ minWidth: 160 }}
          >
            <div className="text-xs font-semibold truncate">
              {activeGuest.name}
            </div>
            <div className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1">
              <span>{activeGuest.countryCode}</span>
              <span>·</span>
              <span>{activeGuest.nights || '?'}n</span>
              <span>·</span>
              <span>{format(parseISO(activeGuest.checkInDate), 'M/d')} – {format(parseISO(activeGuest.checkOutDate), 'M/d')}</span>
            </div>
          </motion.div>
        )}
      </DragOverlay>

      {/* Dialogs */}
      <GuestDetailModal
        guest={selectedGuest}
        bed={selectedBed}
        room={selectedRoom}
        onClose={() => { setSelectedGuest(null); setSelectedBed(null); setSelectedRoom(null); }}
        onCheckout={(bedId) => {
          setSelectedGuest(null);
          handleCheckout(bedId);
        }}
      />

      <CheckoutDialog
        guest={confirmCheckout}
        onConfirm={handleConfirmCheckout}
        onCancel={() => { setConfirmCheckout(null); setCheckoutBedId(null); }}
      />

      <GenderConflictDialog
        guestName={genderConflict?.guestName || ''}
        onConfirm={handleGenderConfirm}
        onCancel={() => setGenderConflict(null)}
      />

      <RoomSettingsDialog
        room={editingRoom}
        onClose={() => setEditingRoom(null)}
      />

      <AddRoomDialog
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
      />

      {quickBooking && (
        <QuickBookingModal
          isOpen={true}
          onClose={() => setQuickBooking(null)}
          bed={quickBooking.bed}
          room={quickBooking.room}
          initialDate={quickBooking.date}
        />
      )}
    </DndContext>
  );
}
