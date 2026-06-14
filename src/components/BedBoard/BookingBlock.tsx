import React, { useRef, useCallback, useState } from 'react';
import { Guest } from '../../types';
import { parseISO, differenceInDays, format, addDays } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { LogOut, Pencil } from 'lucide-react';

interface BookingBlockProps {
  booking: Guest;
  sourceBedId: string;
  visibleDays: number;
  dateIndex: number;
  visibleNights: number;
  isContinuation: boolean;
  dayWidth: number;
  maxLeftDelta?: number;
  maxRightDelta?: number;
  isResizingRef: React.MutableRefObject<boolean>;
  suppressClickRef: React.MutableRefObject<boolean>;
  onResizeLeft?: (deltaDays: number) => void;
  onResizeRight?: (deltaDays: number) => void;
  onClick?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
}

/**
 * A draggable booking block on the timeline.
 *
 * Interaction zones:
 * - Left 20%: resize handle (adjust check-in date)
 * - Right 20%: resize handle (adjust check-out date)
 * - Center 60%: drag handle (move between beds)
 *
 * This strict zone separation eliminates the drag vs. resize interference
 * that plagued the old CalendarView.
 */
export function BookingBlock({
  booking,
  sourceBedId,
  visibleDays,
  dateIndex,
  visibleNights,
  isContinuation,
  dayWidth,
  maxLeftDelta,
  maxRightDelta,
  isResizingRef,
  suppressClickRef,
  onResizeLeft,
  onResizeRight,
  onClick,
  onCheckIn,
  onCheckOut,
}: BookingBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-${booking.id}`,
    data: { type: 'guest', sourceBedId, guest: booking },
  });

  // Combined ref for dnd-kit + internal use
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      (blockRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  // DnD listeners only go on the center drag zone (NOT on resize edges)
  const dragListeners = {
    onPointerDown: listeners?.onPointerDown,
    onKeyDown: listeners?.onKeyDown,
  };

  // ── Resize logic (PointerEvent capture) ──
  // IMPORTANT: we mutate the OUTER color block's `left`/`width`, not the
  // 20%-wide resize strip's. That way the entire color block — not just
  // the edge strip — follows the cursor during the resize, giving a clear
  // visual preview of the new date range.

  const startResize = useCallback(
    (e: React.PointerEvent, edge: 'left' | 'right') => {
      e.stopPropagation();
      e.preventDefault();
      isResizingRef.current = true;

      const handle = e.currentTarget as HTMLElement;
      // The outer BookingBlock container is the parent of the resize handle.
      const block = handle.parentElement as HTMLElement | null;
      if (!block) return;
      handle.setPointerCapture(e.pointerId);

      let deltaPx = 0;
      let isConflict = false;
      const maxDeltaPx = edge === 'left'
        ? (maxLeftDelta ?? -30) * dayWidth
        : (maxRightDelta ?? 30) * dayWidth;

      const onMove = (ev: PointerEvent) => {
        deltaPx += ev.movementX;

        let dayDelta = Math.round(deltaPx / dayWidth);

        if (edge === 'left') {
          if (dayDelta > 0) dayDelta = 0;
          if (maxLeftDelta !== undefined && dayDelta < maxLeftDelta) {
            dayDelta = maxLeftDelta;
            isConflict = true;
          } else {
            isConflict = false;
          }
        } else {
          if (dayDelta < 0) dayDelta = 0;
          if (maxRightDelta !== undefined && dayDelta > maxRightDelta) {
            dayDelta = maxRightDelta;
            isConflict = true;
          } else {
            isConflict = false;
          }
        }

        const pctPerDay = 100 / visibleDays;

        if (edge === 'left') {
          const newLeft = dateIndex * pctPerDay + dayDelta * pctPerDay;
          const newWidth = visibleNights * pctPerDay - dayDelta * pctPerDay;
          // Mutate the OUTER block so the whole color block resizes.
          block.style.left = `${newLeft}%`;
          block.style.width = `${Math.max(pctPerDay, newWidth)}%`;
        } else {
          const newWidth = visibleNights * pctPerDay + dayDelta * pctPerDay;
          block.style.width = `${Math.max(pctPerDay, newWidth)}%`;
        }

        block.style.boxShadow = isConflict
          ? '0 0 0 2px rgba(239,68,68,0.6)'
          : '0 0 0 2px rgba(59,130,246,0.6)';
      };

      const onUp = () => {
        handle.releasePointerCapture(e.pointerId);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);

        block.style.boxShadow = '';
        block.style.left = '';
        block.style.width = '';

        let dayDelta = Math.round(deltaPx / dayWidth);

        if (edge === 'left') {
          if (dayDelta > 0) dayDelta = 0;
          if (maxLeftDelta !== undefined && dayDelta < maxLeftDelta) dayDelta = maxLeftDelta;
        } else {
          if (dayDelta < 0) dayDelta = 0;
          if (maxRightDelta !== undefined && dayDelta > maxRightDelta) dayDelta = maxRightDelta;
        }

        if (dayDelta !== 0 && !isConflict) {
          if (edge === 'left') onResizeLeft?.(dayDelta);
          else onResizeRight?.(dayDelta);
        }

        suppressClickRef.current = true;
        setTimeout(() => {
          isResizingRef.current = false;
        }, 0);
      };

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
    },
    [dayWidth, visibleDays, dateIndex, visibleNights, maxLeftDelta, maxRightDelta, isResizingRef, onResizeLeft, onResizeRight],
  );

  const checkIn = parseISO(booking.checkInDate);
  const checkOut = parseISO(booking.checkOutDate);

  const pctPerDay = 100 / visibleDays;
  const left = `${dateIndex * pctPerDay}%`;
  const width = `${visibleNights * pctPerDay}%`;

  if (isContinuation) {
    return null;
  }

  return (
    <div
      ref={setRefs}
      data-booking-block="true"
      className={cn(
        'absolute top-1 bottom-1 rounded-lg flex items-center overflow-hidden z-10 group cursor-grab active:cursor-grabbing select-none',
        booking.paymentStatus === 'paid' ? 'bg-blue-100 text-blue-800' :
        booking.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' :
        'bg-red-100 text-red-800',
        // Keep the source block mostly visible during drag — the floating
        // DragOverlay clone carries the visible "ghost" that follows the cursor.
        isDragging && 'opacity-50 ring-2 ring-blue-400 ring-offset-1',
      )}
      style={{ left, width, touchAction: 'none' }}
      onClick={(e) => {
        e.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onClick?.();
      }}
    >
      {/* The full color block is the drag handle. The invisible overlay
          below captures pointer events for dnd-kit, while the resize edges
          and action buttons sit on top with their own pointer handlers
          (stopping propagation) so they remain usable. */}
      <div
        className="absolute inset-0 z-[1]"
        aria-hidden="true"
        {...attributes}
        {...dragListeners}
      />

      {/* Left resize handle (20%) */}
      {onResizeLeft && (
        <div
          data-resize="left"
          className="absolute left-0 top-0 bottom-0 w-[20%] cursor-ew-resize z-20 hover:bg-white/30 rounded-l-lg transition-colors"
          onPointerDown={(e) => startResize(e, 'left')}
        />
      )}

      {/* Center text label */}
      <div className="absolute left-[20%] right-[20%] top-0 bottom-0 z-[5] flex items-center px-2 min-w-0 pointer-events-none">
        <div className="truncate text-xs">
          <span className="font-medium truncate">{booking.name}</span>
          <span className="text-zinc-400 mx-1">·</span>
          <span>{booking.countryCode}</span>
          {visibleNights >= 3 && (
            <>
              <span className="text-zinc-400 mx-1">·</span>
              <span className="opacity-75">
                {format(checkIn, 'M/d')} – {format(checkOut, 'M/d')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Hover action buttons (center) */}
      <div className="absolute left-[20%] right-[20%] top-0 bottom-0 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 z-30 pointer-events-none">
        <div className="flex items-center gap-0.5 bg-white/90 rounded-md shadow-sm px-1 py-0.5 pointer-events-auto">
          {onCheckIn && (
            <button
              className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
              title="Check-in"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
            >
              <LogOut className="h-3.5 w-3.5 rotate-180" />
            </button>
          )}
          <button
            className="p-1 hover:bg-zinc-100 rounded text-zinc-500"
            title="Edit"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {onCheckOut && (
            <button
              className="p-1 hover:bg-red-100 rounded text-red-500"
              title="Check-out"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onCheckOut(); }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right resize handle (20%) */}
      {onResizeRight && (
        <div
          data-resize="right"
          className="absolute right-0 top-0 bottom-0 w-[20%] cursor-ew-resize z-20 hover:bg-white/30 rounded-r-lg transition-colors"
          onPointerDown={(e) => startResize(e, 'right')}
        />
      )}
    </div>
  );
}
