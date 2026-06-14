import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useHostel } from '../HostelContext';
import { addDays, format, parseISO, startOfDay, isSameDay, subDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { useTranslation } from '../i18nContext';
import { Guest, Bed, Room } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Globe, CreditCard, FileText, Phone, Mail, Tag, Filter } from 'lucide-react';
import { getSourceConfig, getPaymentStatusClass } from '../utils/guestDisplay';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { QuickBookingModal } from './QuickBookingModal';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

const LABEL_WIDTH = 160;
const MIN_DAY_WIDTH = 56;

export function getBedPrice(room: Room, bed: Bed): number {
  return room.pricePerNight + (bed.bedType === 'bottom' ? (room.bottomBunkPremium || 0) : 0);
}

function getRoomPriceRange(room: Room): { min: number; max: number } {
  const base = room.pricePerNight;
  const bottom = base + (room.bottomBunkPremium || 0);
  if (room.type === 'private' || !(room.bottomBunkPremium > 0)) return { min: base, max: base };
  return { min: base, max: bottom };
}

// --- Draggable booking block (for bed swap) ---
function DraggableBookingBlock({
  booking,
  sourceBedId,
  visibleDays,
  dateIndex,
  visibleNights,
  isContinuation,
  onClick,
  onResizeLeft,
  onResizeRight,
  onCheckIn,
  onCheckout,
  onEdit,
  t,
}: {
  booking: Guest;
  sourceBedId: string;
  visibleDays: number;
  dateIndex: number;
  visibleNights: number;
  isContinuation?: boolean;
  onClick: () => void;
  onResizeLeft?: (deltaDays: number) => void;
  onResizeRight?: (deltaDays: number) => void;
  onCheckIn?: () => void;
  onCheckout?: () => void;
  onEdit?: () => void;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-${booking.id}`,
    data: { type: 'guest', sourceBedId, guest: booking },
  });

  if (visibleNights === 0) return null;

  const leftPercent = (dateIndex / visibleDays) * 100;
  const widthPercent = (visibleNights / visibleDays) * 100;

  // Edge resize handler factory
  const startResize = (e: React.PointerEvent, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const blockEl = e.currentTarget.parentElement!;
    const dayWidth = blockEl.offsetWidth / visibleNights;

    const onMove = (ev: PointerEvent) => {
      const deltaPx = ev.clientX - startX;
      const deltaDays = Math.round(deltaPx / dayWidth);
      if (edge === 'left') {
        const newIdx = dateIndex + deltaDays;
        const newNights = visibleNights - deltaDays;
        if (newNights < 1 || newIdx < 0) return;
        blockEl.style.left = `${(newIdx / visibleDays) * 100}%`;
        blockEl.style.width = `calc(${(newNights / visibleDays) * 100}% - 2px)`;
      } else {
        const newNights = visibleNights + deltaDays;
        if (newNights < 1) return;
        blockEl.style.width = `calc(${(newNights / visibleDays) * 100}% - 2px)`;
      }
    };

    const onUp = (ev: PointerEvent) => {
      const deltaPx = ev.clientX - startX;
      const deltaDays = Math.round(deltaPx / dayWidth);
      if (deltaDays !== 0) {
        if (edge === 'left') onResizeLeft?.(deltaDays);
        else onResizeRight?.(deltaDays);
      }
      blockEl.style.left = '';
      blockEl.style.width = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={cn(
        "absolute top-1 bottom-1 z-10 px-2 flex flex-col justify-center overflow-hidden border shadow-sm transition-opacity group/block",
        isDragging && "opacity-30",
        isContinuation ? "rounded-r-lg rounded-l-sm border-l-2 border-l-current" : "rounded-lg",
        booking.paymentStatus === 'paid' ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" :
        booking.paymentStatus === 'unpaid' ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100" :
        "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
      )}
      style={{ left: `${leftPercent}%`, width: `calc(${widthPercent}% - 2px)` }}
    >
      {/* Left edge resize handle */}
      {onResizeLeft && !isContinuation && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 hover:bg-blue-300/50 rounded-l-lg transition-colors"
          onPointerDown={(e) => startResize(e, 'left')}
        />
      )}

      {/* Right edge resize handle */}
      {onResizeRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 hover:bg-blue-300/50 rounded-r-lg transition-colors"
          onPointerDown={(e) => startResize(e, 'right')}
        />
      )}

      {/* Center drag area (for bed swap) — uses dnd-kit listeners */}
      <div
        {...listeners}
        className="flex-1 flex flex-col justify-center cursor-grab active:cursor-grabbing min-w-0"
        onClick={(e) => { if (!isDragging) onClick(); }}
      >
        {/* Hover action buttons */}
        {(onCheckIn || onCheckout || onEdit) && widthPercent > 12 && (
          <div className="absolute top-0.5 right-1 flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity z-30">
            {onCheckIn && (
              <button
                onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
                className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                title={t('calendarview.actionCheckIn')}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              </button>
            )}
            {onCheckout && (
              <button
                onClick={(e) => { e.stopPropagation(); onCheckout(); }}
                className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                title={t('calendarview.actionCheckout')}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1 rounded bg-zinc-500 text-white hover:bg-zinc-600 transition-colors shadow-sm"
                title={t('calendarview.actionEdit')}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
          </div>
        )}

        <span className="text-[11px] font-semibold truncate leading-tight">{booking.name}</span>
        {widthPercent > 8 && (
          <span className="text-[10px] opacity-70 truncate">{booking.countryCode} · {booking.nights}N</span>
        )}
      </div>
    </div>
  );
}

// --- Droppable date cell ---
function DroppableDateCell({ bedId, dateIndex, date, isEmptySlot, isValidDrop, onEmptyClick, priceLabel }: {
  bedId: string;
  dateIndex: number;
  date: Date;
  isEmptySlot: boolean;
  isValidDrop?: boolean; // undefined = not dragging, true = valid, false = invalid
  onEmptyClick?: () => void;
  priceLabel?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${bedId}-d${dateIndex}`,
    data: { type: 'bed-date', bedId, dateIndex, date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 border-r border-zinc-100 transition-colors",
        isSameDay(date, new Date()) ? "bg-amber-50/10" : "",
        isOver && isValidDrop && "bg-emerald-100/70 ring-2 ring-emerald-300 ring-inset",
        isOver && isValidDrop === false && "bg-red-100/70 ring-2 ring-red-300 ring-inset",
        isValidDrop === false && "bg-red-50/30",
        isValidDrop === true && !isOver && isEmptySlot && "bg-emerald-50/20",
        isEmptySlot && !isOver && isValidDrop !== false && "cursor-pointer hover:bg-emerald-50/40"
      )}
      onClick={isEmptySlot ? onEmptyClick : undefined}
    >
      {isEmptySlot && !isOver && isValidDrop !== false && (
        <div className="h-full flex items-center justify-center">
          <span className="text-[10px] font-medium text-emerald-500/30">{priceLabel}</span>
        </div>
      )}
      {isOver && isValidDrop && (
        <div className="h-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-emerald-600">↓</span>
        </div>
      )}
      {isOver && isValidDrop === false && (
        <div className="h-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-red-500">✕</span>
        </div>
      )}
      {isValidDrop === false && !isOver && !isEmptySlot && (
        <div className="h-full flex items-center justify-center">
          <span className="text-[10px] text-red-400/50">✕</span>
        </div>
      )}
    </div>
  );
}

// --- Mini month picker ---
function MiniMonthPicker({ currentMonth, onDateSelect, onClose }: {
  currentMonth: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 z-50 w-[260px]"
    >
      <div className="text-center text-xs font-semibold text-zinc-700 mb-2">
        {format(currentMonth, 'MMMM yyyy')}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {weekDays.map(d => <span key={d} className="text-[9px] font-medium text-zinc-400 py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDay }).map((_, i) => <span key={`e-${i}`} />)}
        {days.map(day => (
          <button key={day.toISOString()} className="text-[11px] py-1 rounded hover:bg-zinc-100 transition-colors text-zinc-700" onClick={() => { onDateSelect(day); onClose(); }}>
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// --- Main CalendarView ---
export function CalendarView() {
  const { rooms, updateArrival, assignArrival, checkoutGuest, moveGuest } = useHostel();
  const { t } = useTranslation();

  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [quickBooking, setQuickBooking] = useState<{ bed: Bed; room: Room; date: Date } | null>(null);
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const today = startOfDay(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const visibleDays = useMemo(() => {
    if (containerWidth <= 0) return 14;
    const available = containerWidth - LABEL_WIDTH;
    const days = Math.floor(available / MIN_DAY_WIDTH);
    return Math.max(7, Math.min(14, days));
  }, [containerWidth]);

  const dates = useMemo(
    () => Array.from({ length: visibleDays }).map((_, i) => addDays(startDate, i)),
    [startDate, visibleDays]
  );

  const filteredRooms = useMemo(() => rooms
    .filter(room => roomTypeFilter === 'all' || room.type === roomTypeFilter)
    .map(room => ({
      ...room,
      beds: room.beds.filter(bed => statusFilter === 'all' || bed.status === statusFilter),
    }))
    .filter(room => room.beds.length > 0),
  [rooms, roomTypeFilter, statusFilter]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!showDatePicker) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-date-picker]')) setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDatePicker]);

  const goBack = useCallback(() => setStartDate(d => subDays(d, 7)), []);
  const goForward = useCallback(() => setStartDate(d => addDays(d, 7)), []);
  const goToday = useCallback(() => setStartDate(startOfDay(new Date())), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      else if (e.key === 'Home') { e.preventDefault(); goToday(); }
      else if (e.key === 'Escape') { setSelectedGuest(null); setShowDatePicker(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward, goToday]);

  const getBookingsForBed = useCallback((bed: Bed) => {
    const bookings: Guest[] = [];
    if (bed.guest) bookings.push(bed.guest);
    if (bed.reservations) bookings.push(...bed.reservations);
    return bookings;
  }, []);

  const getBookingForDate = useCallback((bookings: Guest[], date: Date) => {
    const dateTime = date.getTime();
    return bookings.find(b => {
      const checkIn = parseISO(b.checkInDate).getTime();
      const checkOut = parseISO(b.checkOutDate).getTime();
      return dateTime >= checkIn && dateTime < checkOut;
    });
  }, []);

  const getVisibleNights = useCallback((booking: Guest, dateIndex: number) => {
    const checkOutDate = parseISO(booking.checkOutDate).getTime();
    let nights = 0;
    for (let i = dateIndex; i < dates.length; i++) {
      if (dates[i].getTime() < checkOutDate) nights++;
      else break;
    }
    return nights;
  }, [dates]);

  const occupancySummary = useMemo(() => {
    const totalBeds = filteredRooms.reduce((acc, r) => acc + r.beds.length, 0);
    if (totalBeds === 0) return null;
    const totalBedNights = totalBeds * visibleDays;
    let occupiedBedNights = 0;
    filteredRooms.forEach(room => {
      room.beds.forEach(bed => {
        const bookings = getBookingsForBed(bed);
        dates.forEach(date => { if (getBookingForDate(bookings, date)) occupiedBedNights++; });
      });
    });
    return Math.round((occupiedBedNights / totalBedNights) * 100);
  }, [filteredRooms, visibleDays, dates, getBookingsForBed, getBookingForDate]);

  // DnD handlers — same pattern as BedBoard
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'guest') {
      setActiveGuest(active.data.current.guest);
    }
  }, []);

  // Compute drop validity map: for each bed+date, is it a valid drop target for the active guest?
  const dropValidity = useMemo(() => {
    if (!activeGuest) return new Map<string, boolean>();

    const map = new Map<string, boolean>();
    const guestNights = activeGuest.nights;

    // Find source bed from the draggable data (stored in activeGuest context)
    // We search all rooms for this guest
    let sourceBedId: string | undefined;
    for (const room of rooms) {
      for (const bed of room.beds) {
        if (bed.guest?.id === activeGuest.id || bed.reservations?.some(r => r.id === activeGuest.id)) {
          sourceBedId = bed.id;
          break;
        }
      }
      if (sourceBedId) break;
    }

    // For each bed, check each possible start date
    rooms.forEach(room => {
      room.beds.forEach(bed => {
        const bedBookings = getBookingsForBed(bed);
        const isSourceBed = bed.id === sourceBedId;

        dates.forEach((date, dateIdx) => {
          const key = `${bed.id}-d${dateIdx}`;
          // Check if all nights from this date are available
          let allNightsAvailable = true;
          for (let n = 0; n < guestNights; n++) {
            const nightDate = addDays(date, n);
            const bookingOnNight = getBookingForDate(bedBookings, nightDate);
            // If there's a booking on this night that isn't the guest being dragged, it's blocked
            if (bookingOnNight && bookingOnNight.id !== activeGuest.id) {
              allNightsAvailable = false;
              break;
            }
          }

          if (isSourceBed) {
            // Same bed: always valid (just date shift)
            map.set(key, true);
          } else {
            // Different bed: only valid if all nights are free (no other guests)
            map.set(key, allNightsAvailable);
          }
        });
      });
    });

    return map;
  }, [activeGuest, rooms, dates, getBookingsForBed, getBookingForDate]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveGuest(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === 'guest') {
      const sourceBedId = active.data.current.sourceBedId;
      const guest = active.data.current.guest as Guest;
      const overData = over.data.current;

      if (overData?.type === 'bed-date') {
        const targetBedId = overData.bedId as string;
        const targetDateIndex = overData.dateIndex as number;
        const targetDate = dates[targetDateIndex];
        const validityKey = `${targetBedId}-d${targetDateIndex}`;

        // Check validity
        const isValid = dropValidity.get(validityKey);
        if (isValid === false) return; // Block invalid drop

        if (targetDate) {
          const currentCheckIn = parseISO(guest.checkInDate);
          const dayShift = differenceInDays(targetDate, currentCheckIn);

          if (sourceBedId !== targetBedId) {
            moveGuest(sourceBedId, targetBedId);
          }

          if (dayShift !== 0) {
            const newCheckIn = addDays(currentCheckIn, dayShift);
            const newCheckOut = addDays(parseISO(guest.checkOutDate), dayShift);
            updateArrival(guest.id, {
              checkInDate: format(newCheckIn, 'yyyy-MM-dd'),
              checkOutDate: format(newCheckOut, 'yyyy-MM-dd'),
            });
          }
        }
      }
    }
  }, [moveGuest, updateArrival, dates, dropValidity]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div ref={containerRef} className="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden h-full pb-20 md:pb-0">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-zinc-50/50 flex-shrink-0">
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-zinc-500" />
            {t('sidebar.calendar')}
          </h2>
          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                <SelectTrigger className="h-7 w-[110px] text-[11px] bg-white border-zinc-200">
                  <SelectValue placeholder={t('calendarview.roomType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('calendarview.allRooms')}</SelectItem>
                  <SelectItem value="dorm-mixed">{t('calendarview.mixedDorm')}</SelectItem>
                  <SelectItem value="dorm-female">{t('calendarview.femaleDorm')}</SelectItem>
                  <SelectItem value="private">{t('calendarview.privateRoom')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-[110px] text-[11px] bg-white border-zinc-200">
                  <SelectValue placeholder={t('calendarview.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('calendarview.allStatuses')}</SelectItem>
                  <SelectItem value="occupied">{t('calendarview.occupied')}</SelectItem>
                  <SelectItem value="empty">{t('calendarview.empty')}</SelectItem>
                  <SelectItem value="reserved">{t('calendarview.reserved')}</SelectItem>
                  <SelectItem value="cleaning">{t('calendarview.cleaning')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-4 w-px bg-zinc-200 hidden md:block" />
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200" /> {t('checkin.paid') || 'Paid'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200" /> {t('checkin.unpaid') || 'Unpaid'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200" /> {t('checkin.partial') || 'Partial'}</span>
            </div>
            <div className="h-4 w-px bg-zinc-200 hidden md:block" />
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={goBack}><ChevronLeft className="w-4 h-4" /></Button>
              <div className="relative" data-date-picker>
                <button className="text-xs font-semibold text-zinc-700 min-w-[100px] md:min-w-[120px] text-center hover:text-emerald-600 transition-colors" onClick={() => setShowDatePicker(prev => !prev)}>
                  {format(dates[0], 'MMM d')} – {format(dates[dates.length - 1], 'MMM d')}
                </button>
                <AnimatePresence>
                  {showDatePicker && <MiniMonthPicker currentMonth={startDate} onDateSelect={(date) => setStartDate(startOfDay(date))} onClose={() => setShowDatePicker(false)} />}
                </AnimatePresence>
              </div>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={goForward}><ChevronRight className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium" onClick={goToday}>{t('calendarview.today') || 'Today'}</Button>
            </div>
            {occupancySummary !== null && (<><div className="h-4 w-px bg-zinc-200 hidden lg:block" /><span className="text-[10px] font-medium text-zinc-400 hidden lg:inline">{occupancySummary}% {t('calendarview.avgOccupancy')}</span></>)}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto hide-scrollbar min-h-0">
          <div className="flex flex-col h-full min-w-0">
            {/* Date Header Row */}
            <div className="flex border-b border-zinc-200 sticky top-0 z-30 bg-white">
              <div className="flex-shrink-0 sticky left-0 z-40 bg-zinc-50 border-r border-zinc-200 px-3 py-2.5 flex items-end shadow-[1px_0_0_0_#e4e4e7]" style={{ width: LABEL_WIDTH }}>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{t('bedboard.roomType')} / {t('bedboard.beds')}</span>
              </div>
              <div className="flex flex-1">
                {dates.map(date => {
                  const isToday = isSameDay(date, today);
                  return (
                    <div key={date.toISOString()} className={cn("flex-1 min-w-[56px] border-r border-zinc-100 py-2.5 text-center flex flex-col items-center justify-center", isToday ? "bg-amber-50/80" : "bg-white")}>
                      <span className="text-[10px] font-medium text-zinc-400 uppercase">{format(date, 'EEE')}</span>
                      <span className={cn("text-sm font-bold leading-none mt-0.5", isToday ? "bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-zinc-900")}>{format(date, 'd')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Rows */}
            {filteredRooms.map(room => (
              <React.Fragment key={room.id}>
                <div className="flex bg-zinc-50/50 border-b border-zinc-200">
                  <div className="flex-shrink-0 sticky left-0 z-20 bg-zinc-50/90 border-r border-zinc-200 px-3 py-1.5 flex items-center justify-between shadow-[1px_0_0_0_#e4e4e7] backdrop-blur-sm" style={{ width: LABEL_WIDTH }}>
                    <span className="text-[11px] font-bold text-zinc-600">
                      {room.type === 'dorm-mixed' ? t('bedboard.mixedDorm') : room.type === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private')} R{room.number}
                    </span>
                    {(() => { const r = getRoomPriceRange(room); return <span className="text-[10px] font-semibold text-emerald-600">{r.min === r.max ? `$${r.min}` : `$${r.min}–$${r.max}`}</span>; })()}
                  </div>
                  <div className="flex flex-1">
                    {dates.map(date => <div key={date.toISOString()} className={cn("flex-1 min-w-[56px] border-r border-zinc-100", isSameDay(date, today) ? "bg-amber-50/20" : "")} />)}
                  </div>
                </div>

                {room.beds.map(bed => {
                  const bookings = getBookingsForBed(bed);
                  return (
                    <div key={bed.id} className="flex border-b border-zinc-100 group hover:bg-zinc-50/50 transition-colors">
                      <div className="flex-shrink-0 sticky left-0 z-20 bg-white group-hover:bg-zinc-50/50 border-r border-zinc-200 px-3 py-2 flex items-center justify-between shadow-[1px_0_0_0_#e4e4e7]" style={{ width: LABEL_WIDTH }}>
                        <span className="text-xs font-medium text-zinc-600 truncate mr-2">{bed.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-emerald-600">${getBedPrice(room, bed)}</span>
                          {bed.status === 'cleaning' && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                          {bed.status === 'empty' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                      </div>

                      <div className="flex-1 relative h-14">
                        <div className="absolute inset-0 flex">
                          {dates.map((date, dateIdx) => {
                            const booking = getBookingForDate(bookings, date);
                            const isEmptySlot = !booking && bed.status !== 'occupied';
                            const validityKey = `${bed.id}-d${dateIdx}`;
                            const isValidDrop = activeGuest ? dropValidity.get(validityKey) : undefined;
                            return (
                              <DroppableDateCell
                                key={date.toISOString()}
                                bedId={bed.id}
                                dateIndex={dateIdx}
                                date={date}
                                isEmptySlot={isEmptySlot}
                                isValidDrop={isValidDrop}
                                onEmptyClick={() => setQuickBooking({ bed, room, date })}
                                priceLabel={`$${getBedPrice(room, bed)}`}
                              />
                            );
                          })}
                        </div>

                        {dates.map((date, index) => {
                          const booking = getBookingForDate(bookings, date);
                          const isCheckInDay = booking && isSameDay(date, parseISO(booking.checkInDate));
                          const isFirstDayVisible = booking && index === 0 && parseISO(booking.checkInDate).getTime() <= date.getTime();

                          if (booking && (isCheckInDay || isFirstDayVisible)) {
                            const vNights = getVisibleNights(booking, index);
                            const isCurrentGuest = bed.guest?.id === booking.id;
                            const isReservation = bed.reservations?.some(r => r.id === booking.id);
                            return (
                              <DraggableBookingBlock
                                key={booking.id}
                                booking={booking}
                                sourceBedId={bed.id}
                                visibleDays={visibleDays}
                                dateIndex={index}
                                visibleNights={vNights}
                                isContinuation={isFirstDayVisible && !isCheckInDay}
                                onClick={() => setSelectedGuest(booking)}
                                t={t}
                                onResizeLeft={(deltaDays: number) => {
                                  const currentCheckIn = parseISO(booking.checkInDate);
                                  const currentCheckOut = parseISO(booking.checkOutDate);
                                  const newCheckIn = addDays(currentCheckIn, deltaDays);
                                  if (newCheckIn.getTime() >= currentCheckOut.getTime()) return;
                                  const newNights = differenceInDays(currentCheckOut, newCheckIn);
                                  if (newNights < 1) return;
                                  updateArrival(booking.id, { checkInDate: format(newCheckIn, 'yyyy-MM-dd'), nights: newNights });
                                }}
                                onResizeRight={(deltaDays: number) => {
                                  const currentCheckIn = parseISO(booking.checkInDate);
                                  const currentCheckOut = parseISO(booking.checkOutDate);
                                  const newCheckOut = addDays(currentCheckOut, deltaDays);
                                  if (newCheckOut.getTime() <= currentCheckIn.getTime()) return;
                                  const newNights = differenceInDays(newCheckOut, currentCheckIn);
                                  if (newNights < 1) return;
                                  updateArrival(booking.id, { checkOutDate: format(newCheckOut, 'yyyy-MM-dd'), nights: newNights });
                                }}
                                onCheckIn={isReservation ? () => assignArrival(booking.id, bed.id) : undefined}
                                onCheckout={isCurrentGuest ? () => checkoutGuest(bed.id) : undefined}
                                onEdit={() => setSelectedGuest(booking)}
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {quickBooking && <QuickBookingModal isOpen={true} onClose={() => setQuickBooking(null)} bed={quickBooking.bed} room={quickBooking.room} initialDate={quickBooking.date} />}

        {/* Guest Detail Modal */}
        <AnimatePresence>
          {selectedGuest && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setSelectedGuest(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.15 }} className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-zinc-100 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-lg">{selectedGuest.gender === 'female' ? '♀' : '♂'}</div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 flex items-center gap-2">{selectedGuest.name}{(() => { const c = getSourceConfig(selectedGuest.source); return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.cls}`}>{t(c.labelKey)}</span>; })()}</h3>
                      <span className="text-xs text-zinc-500 flex items-center gap-1"><Globe className="w-3 h-3" /> {selectedGuest.country}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedGuest(null)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"><X className="w-4 h-4 text-zinc-400" /></button>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-lg p-3"><span className="text-[10px] font-medium text-zinc-400 uppercase">{t('checkin.checkIn') || 'Check-in'}</span><p className="font-medium text-zinc-900 mt-0.5">{format(parseISO(selectedGuest.checkInDate), 'MMM d, yyyy')}</p></div>
                    <div className="bg-zinc-50 rounded-lg p-3"><span className="text-[10px] font-medium text-zinc-400 uppercase">{t('checkin.checkOut') || 'Check-out'}</span><p className="font-medium text-zinc-900 mt-0.5">{format(parseISO(selectedGuest.checkOutDate), 'MMM d, yyyy')}</p></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-600">
                    <span>{selectedGuest.nights} {t('dashboard.nights') || 'nights'}</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /><span className={getPaymentStatusClass(selectedGuest.paymentStatus)}>{selectedGuest.paymentStatus === 'paid' ? (t('checkin.paid') || 'Paid') : selectedGuest.paymentStatus === 'unpaid' ? (t('checkin.unpaid') || 'Unpaid') : (t('checkin.partial') || 'Partial')}</span></span>
                  </div>
                  {selectedGuest.totalAmount && (
                    <div className="bg-zinc-50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">{t('guest.totalAmount') || 'Total'}</span><span className="font-medium text-zinc-900">${selectedGuest.totalAmount}</span></div>
                      {selectedGuest.paidAmount !== undefined && <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">{t('guest.paidAmount') || 'Paid'}</span><span className="font-medium text-emerald-600">${selectedGuest.paidAmount}</span></div>}
                      {selectedGuest.totalAmount && selectedGuest.paidAmount !== undefined && <div className="flex items-center justify-between text-xs border-t border-zinc-200 pt-1.5"><span className="text-zinc-500">{t('dashboard.amountDue') || 'Due'}</span><span className="font-medium text-red-500">${selectedGuest.totalAmount - selectedGuest.paidAmount}</span></div>}
                    </div>
                  )}
                  {selectedGuest.dob && <div className="flex items-center gap-2 text-xs text-zinc-600"><CalendarIcon className="w-3 h-3 text-zinc-400" /><span>{t('guest.dob') || 'DOB'}: {selectedGuest.dob}</span></div>}
                  {selectedGuest.roomPreference && <div className="flex items-center gap-2 text-xs text-zinc-600"><Tag className="w-3 h-3 text-zinc-400" /><span>{t('dashboard.roomPreference') || 'Room Pref'}: {selectedGuest.roomPreference}</span></div>}
                  {selectedGuest.passportOrId && <div className="flex items-center gap-2 text-xs text-zinc-600"><FileText className="w-3 h-3 text-zinc-400" /><span>{t('checkin.passportId') || 'Passport/ID'}: {selectedGuest.passportOrId}</span></div>}
                  {selectedGuest.phone && <div className="flex items-center gap-2 text-xs text-zinc-600"><Phone className="w-3 h-3 text-zinc-400" /><span>{selectedGuest.phone}</span></div>}
                  {selectedGuest.email && <div className="flex items-center gap-2 text-xs text-zinc-600"><Mail className="w-3 h-3 text-zinc-400" /><span>{selectedGuest.email}</span></div>}
                  {selectedGuest.notes && <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-600"><span className="font-medium text-zinc-400">{t('checkin.notes') || 'Notes'}:</span> {selectedGuest.notes}</div>}
                </div>
                <div className="p-4 border-t border-zinc-100">
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setSelectedGuest(null)}>{t('calendarview.today') || 'Close'}</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drag Overlay — floating preview while dragging (same as BedBoard) */}
      <DragOverlay zIndex={1000}>
        {activeGuest ? (
          <div className={cn(
            "px-3 py-2 rounded-lg border shadow-2xl flex flex-col justify-center min-w-[140px] rotate-2",
            activeGuest.paymentStatus === 'paid' ? "bg-blue-100 border-blue-300 text-blue-900" :
            activeGuest.paymentStatus === 'unpaid' ? "bg-red-100 border-red-300 text-red-900" :
            "bg-amber-100 border-amber-300 text-amber-900"
          )}>
            <span className="text-xs font-bold truncate">{activeGuest.name}</span>
            <span className="text-[10px] opacity-70">{activeGuest.countryCode} · {activeGuest.nights}N</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
