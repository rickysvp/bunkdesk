import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Room, Bed, Guest } from '../../types';
import { parseISO, differenceInDays, format, addDays } from 'date-fns';
import { useTranslation, formatCurrency } from '../../i18nContext';
import { useHostel } from '../../HostelContext';
import { getBookingsForBed, getBookingForDate, getVisibleNights } from '../../utils/timelineEngine';
import { getBedPrice } from '../../utils/bedPricing';
import { canGuestOccupyRoom, rangesOverlap } from '../../utils/bedRules';
import { BookingBlock } from './BookingBlock';
import { Sparkles } from 'lucide-react';

interface BedRowProps {
  bed: Bed;
  room: Room;
  dates: Date[];
  visibleDays: number;
  dayWidth: number;
  labelWidth: number;
  isResizingRef: React.MutableRefObject<boolean>;
  suppressClickRef: React.MutableRefObject<boolean>;
  activeGuest: Guest | null;
  hoveredBedId: string | null;
  hoveredDateIndex: number | null;
  dropValidity: Map<string, boolean>;
  isReservation: (guest: Guest, bed: Bed) => boolean;
  onBookingClick: (guest: Guest, bed: Bed) => void;
  onCheckout: (bedId: string) => void;
  onQuickBooking: (bed: Bed, room: Room, date: Date) => void;
  onAssignArrival: (guestId: string, bedId: string) => void;
  onResizeLeft: (booking: Guest, deltaDays: number) => void;
  onResizeRight: (booking: Guest, deltaDays: number) => void;
}

export function BedRow({
  bed,
  room,
  dates,
  visibleDays,
  dayWidth,
  labelWidth,
  isResizingRef,
  suppressClickRef,
  activeGuest,
  hoveredBedId,
  hoveredDateIndex,
  dropValidity,
  isReservation,
  onBookingClick,
  onCheckout,
  onQuickBooking,
  onAssignArrival,
  onResizeLeft,
  onResizeRight,
}: BedRowProps) {
  const { t, language } = useTranslation();
  const { markBedClean } = useHostel();

  const { isOver, setNodeRef } = useDroppable({
    id: bed.id,
    data: { type: 'bed', bed, room },
  });

  const bookings = useMemo(() => getBookingsForBed(bed), [bed]);

  const isValidDrop = activeGuest ? dropValidity.get(bed.id) ?? true : null;
  const isHovered = hoveredBedId === bed.id;

  // Date-overlap check: would the active guest's effective date range
  // (based on the hovered date column) collide with any existing booking
  // on this bed? Excludes the active guest themselves and the guest being
  // swapped out, mirroring the rules in BedBoard.handleDragEnd.
  const hasDateOverlap = useMemo(() => {
    if (!activeGuest) return false;
    const startIdx = hoveredDateIndex ?? 0;
    if (startIdx < 0) return false;
    const effectiveCheckIn = dates[startIdx];
    if (!effectiveCheckIn) return false;
    const checkInStr = format(effectiveCheckIn, 'yyyy-MM-dd');
    const checkOutStr = format(addDays(effectiveCheckIn, activeGuest.nights || 1), 'yyyy-MM-dd');
    return bookings.some((b) => {
      if (b.id === activeGuest.id) return false;
      if (bed.guest && b.id === bed.guest.id) return false;
      return rangesOverlap(checkInStr, checkOutStr, b.checkInDate, b.checkOutDate);
    });
  }, [activeGuest, hoveredDateIndex, dates, bookings, bed.guest]);

  const isDropValid = isValidDrop !== false && !hasDateOverlap;

  // Visual feedback classes
  const rowClasses = isHovered && isDropValid
    ? 'ring-2 ring-emerald-400 bg-emerald-50/50'
    : isHovered && !isDropValid
    ? 'ring-2 ring-red-400 bg-red-50/50'
    : isDropValid && activeGuest
    ? 'bg-emerald-50/20'
    : !isDropValid && activeGuest
    ? 'bg-red-50/20'
    : '';

  const bedTypeIcons: Record<string, string> = {
    top: '⬆',
    bottom: '⬇',
    single: '▤',
    double: '▥',
  };

  const price = getBedPrice(room, bed);

  return (
    <div ref={setNodeRef} className={`flex border-b border-zinc-100 transition-colors ${rowClasses}`}>
      {/* Sticky label column */}
      <div
        className="sticky left-0 z-10 flex items-center gap-2 px-3 py-1 bg-white border-r border-zinc-100 shrink-0"
        style={{ width: labelWidth }}
      >
        <span className="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">
          {bed.name.split(' ')[0]}
        </span>
        <span className="text-sm" title={bed.bedType}>
          {bedTypeIcons[bed.bedType || 'single'] || '▤'}
        </span>
        <span className="text-xs text-zinc-400 ml-auto">{formatCurrency(price, language)}</span>
        {bed.status === 'cleaning' && (
          <button
            className="p-0.5 hover:bg-purple-100 rounded text-purple-500 shrink-0"
            title={t('bedboard.needsCleaning') || 'Mark as Cleaned'}
            onClick={() => markBedClean(bed.id)}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Date grid area */}
      <div className="flex-1 relative" style={{ height: 52 }}>
        {/* Day column backgrounds */}
        <div className="absolute inset-0 flex">
          {dates.map((date, idx) => {
            const booking = getBookingForDate(bookings, date);
            // An empty date slot is simply one that has no booking on it.
            // `bed.status` (e.g. 'cleaning') is a bed-level state, not a
            // per-date state — using it to gate date clicks would block
            // future-dated quick-bookings on any bed that's currently
            // marked as dirty, which is a regression. Cleaning status is
            // surfaced via the sparkle button on the left label.
            const isEmptySlot = !booking;
            return (
              <div
                key={idx}
                className={`flex-1 border-r border-zinc-50 ${
                  isEmptySlot ? 'cursor-pointer hover:bg-blue-50/50' : ''
                }`}
                onClick={isEmptySlot ? () => onQuickBooking(bed, room, date) : undefined}
              />
            );
          })}
        </div>

        {/* Ghost placeholder for hovered drop target — shows where the
            block will land. Turns red the moment the would-be dates
            overlap with an existing booking on this bed, and pins a
            "Dates overlap" label so the user knows the drop will be
            rejected. */}
        {isHovered && activeGuest && hoveredDateIndex !== null && hoveredDateIndex >= 0 && (
          <div
            className={`absolute top-1 bottom-1 rounded-lg z-20 pointer-events-none border-2 border-dashed ${
              !isDropValid
                ? 'border-red-500 bg-red-100/60'
                : activeGuest.paymentStatus === 'paid' ? 'border-blue-400 bg-blue-100/40' :
                  activeGuest.paymentStatus === 'partial' ? 'border-amber-400 bg-amber-100/40' :
                  'border-red-400 bg-red-100/40'
            }`}
            style={{
              left: `${hoveredDateIndex * (100 / visibleDays)}%`,
              width: `${Math.max(1, (activeGuest.nights || 1)) * (100 / visibleDays)}%`,
            }}
          >
            <div className="px-2 py-1 text-xs font-semibold text-zinc-700 truncate">
              {!isDropValid
                ? t('calendarview.dateOverlapBlocked') || 'Dates overlap'
                : `${activeGuest.name} · ${activeGuest.nights || '?'}n`}
            </div>
          </div>
        )}

        {/* Booking blocks */}
        {bookings.map((booking) => {
          const cIn = parseISO(booking.checkInDate);
          const cOut = parseISO(booking.checkOutDate);
          const firstDate = dates[0];
          const bookingStart = cIn < firstDate ? firstDate : cIn;
          const dateIndex = Math.max(0, differenceInDays(bookingStart, firstDate));
          const visibleNights = getVisibleNights(booking, dateIndex, dates);
          const isContinuation = cIn < firstDate;

          if (visibleNights <= 0 && !isContinuation) return null;

          // Calculate max resize deltas from adjacent bookings
          const prevBooking = bookings
            .filter(b => b.id !== booking.id && parseISO(b.checkOutDate) <= cIn)
            .sort((a, b) => parseISO(b.checkOutDate).getTime() - parseISO(a.checkOutDate).getTime())
            .pop();
          const maxLeftDelta = prevBooking
            ? -(differenceInDays(cIn, parseISO(prevBooking.checkOutDate)))
            : undefined;

          const nextBooking = bookings
            .filter(b => b.id !== booking.id && parseISO(b.checkInDate) >= cOut)
            .sort((a, b) => parseISO(a.checkInDate).getTime() - parseISO(b.checkInDate).getTime())[0];
          const maxRightDelta = nextBooking
            ? differenceInDays(parseISO(nextBooking.checkInDate), cOut)
            : undefined;

          return (
            <React.Fragment key={booking.id}>
              <BookingBlock
              booking={booking}
              sourceBedId={bed.id}
              visibleDays={visibleDays}
              dateIndex={dateIndex}
              visibleNights={Math.max(1, visibleNights)}
              isContinuation={isContinuation}
              dayWidth={dayWidth}
              maxLeftDelta={maxLeftDelta}
              maxRightDelta={maxRightDelta}
              isResizingRef={isResizingRef}
              suppressClickRef={suppressClickRef}
              onResizeLeft={(delta) => onResizeLeft(booking, delta)}
              onResizeRight={(delta) => onResizeRight(booking, delta)}
              onClick={() => onBookingClick(booking, bed)}
              onCheckOut={booking.id === bed.guest?.id ? () => onCheckout(bed.id) : undefined}
              onCheckIn={
                isReservation(booking, bed)
                  ? () => onAssignArrival(booking.id, bed.id)
                  : undefined
              }
            />
            </React.Fragment>
          );
        })}

        {/* Drop indicator text */}
        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              isDropValid
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {isDropValid
                ? t('calendarview.dropToSwap') || 'Release to swap beds'
                : t('calendarview.dateOverlapBlocked') || 'Dates overlap'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
