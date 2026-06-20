import React, { useRef, useCallback, useState } from 'react';
import { Guest } from '../../types';
import { parseISO, differenceInDays, format, addDays } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { LogIn, LogOut, Pencil } from 'lucide-react';

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

        // Restore the inline styles to the React-controlled values
        // instead of clearing them. Clearing `block.style.width = ''`
        // removes the inline width entirely, and since the block is
        // `position: absolute` with no CSS-specified width, the DOM
        // collapses to 0 — the block becomes invisible and looks
        // like "the accommodation info disappeared". By setting the
        // inline style back to the same values React would compute,
        // we keep the DOM consistent with React's render output even
        // when no re-render is triggered (e.g. on a simple click
        // with no actual resize).
        const pctPerDay = 100 / visibleDays;
        block.style.boxShadow = '';
        block.style.left = `${dateIndex * pctPerDay}%`;
        block.style.width = `${visibleNights * pctPerDay}%`;

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

  // Render continuations (bookings that start before the visible date
  // range) as a partial block at the left edge instead of hiding them
  // entirely. Hiding them caused the "住宿信息消失了" bug: after a
  // left-edge resize pulled the check-in date outside the visible
  // window, the entire block vanished from the timeline with no way
  // to see it (until the user manually scrolled back). Rendering
  // the clipped block + a `←` chevron + the actual start date in
  // the text label makes the truncation obvious and recoverable.
  if (visibleNights <= 0) return null;

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
    >
      {/* The full color block is the drag + click target. The dnd-kit
          attributes/listeners live on the SAME element as the onClick
          handler — this is the dnd-kit recommended pattern. Splitting
          them onto a sibling overlay (the previous approach) caused
          the click event to never reach the parent, so the detail
          modal opened against a stale (or missing) guest snapshot
          and rendered as a blank dialog. The resize edges and action
          buttons sit on top with their own pointer handlers
          (stopping propagation) so they remain usable. */}
      <div
        className="absolute inset-0 z-[1]"
        {...attributes}
        {...dragListeners}
        role="button"
        aria-label={`Guest ${booking.name}, drag to move or press space to pick up`}
        onClick={(e) => {
          e.stopPropagation();
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onClick?.();
        }}
      />

      {/* Left resize handle (20%) */}
      {onResizeLeft && (
        <div
          data-resize="left"
          className="absolute left-0 top-0 bottom-0 w-[20%] cursor-ew-resize z-20 hover:bg-white/30 rounded-l-lg transition-colors"
          onPointerDown={(e) => startResize(e, 'left')}
        />
      )}

      {/* Center text label. 2-line layout so the dates are always
          visible even on short blocks: line 1 = name, line 2 = country
          + nights + dates. The previous 1-line layout got truncated
          to "John Doe · US ·..." on 3-night blocks because the full
          text was ~143px wide while the inner 60% container was only
          ~118px. 2 lines comfortably fit in the 44px block height.
          When the booking is a continuation (starts before the
          visible range) we prefix the name with a `←` chevron and
          show the *actual* check-in date so the user knows the
          block extends back further than they can see. */}
      <div className="absolute left-[20%] right-[20%] top-0 bottom-0 z-[5] flex flex-col justify-center px-2 min-w-0 pointer-events-none overflow-hidden">
        <div className="truncate text-xs font-medium leading-tight">
          {isContinuation && <span className="text-muted-foreground mr-0.5">←</span>}
          {booking.name}
        </div>
        <div className="truncate text-xs leading-tight opacity-75 mt-0.5">
          {booking.countryCode}
          {typeof booking.nights === 'number' && booking.nights > 0 && (
            <>
              <span className="text-muted-foreground mx-0.5">·</span>
              <span>{booking.nights}n</span>
            </>
          )}
          {/* Always show the booking's *real* check-in/check-out,
              not the visible window's. For a continuation that means
              showing dates like "6/13 – 6/19" even though only 6/14
              onward is rendered, so the user understands the block
              is clipped. */}
          <span className="text-muted-foreground mx-0.5">·</span>
          <span>{format(checkIn, 'M/d')} – {format(checkOut, 'M/d')}</span>
        </div>
      </div>

      {/* Hover action buttons (center). The wrapper is always
          `pointer-events-none` so the click area around the buttons
          passes through to the booking block's onClick. Only the
          individual `<button>` elements get `group-hover:pointer-events-auto`,
          so the actual button rectangles are clickable on hover but
          the pill's padding (between/around the buttons) is NOT a
          click target. If we made the pill pointer-events-auto, the
          pill's padding would silently swallow every click on the
          booking block. */}
      <div className="absolute left-[20%] right-[20%] top-0 bottom-0 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 z-30 pointer-events-none">
        <div className="flex items-center gap-0.5 bg-white/90 rounded-md shadow-sm px-1 py-0.5 pointer-events-none">
          {onCheckIn && (
            <button
              className="p-1 rounded text-emerald-600 pointer-events-auto group-hover:pointer-events-auto hover:bg-emerald-100 active:scale-90 transition-transform"
              title="Assign to this bed (check-in)"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
            >
              {/* Use LogIn (not LogOut rotate-180) so the arrow
                  unambiguously points INTO the bed — the previous
                  rotated icon was easy to misread as "log out". */}
              <LogIn className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            className="p-1 rounded text-muted-foreground pointer-events-auto group-hover:pointer-events-auto hover:bg-zinc-100 active:scale-90 transition-transform"
            title="Edit guest details"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {onCheckOut && (
            <button
              className="p-1 rounded text-red-500 pointer-events-auto group-hover:pointer-events-auto hover:bg-red-100 active:scale-90 transition-transform"
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
