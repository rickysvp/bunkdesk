import React from 'react';
import { Room, Guest } from '../../types';
import { format } from 'date-fns';
import { useTranslation, formatCurrency } from '../../i18nContext';
import { BedRow } from './BedRow';
import { computeRoomDailyFree } from '../../utils/timelineEngine';
import { getRoomPriceRange } from '../../utils/bedPricing';

interface TimelineGridProps {
  rooms: Room[];
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
  isReservation: (guest: Guest, bed: any) => boolean;
  onBookingClick: (guest: Guest, bed: any) => void;
  onCheckout: (bedId: string) => void;
  onQuickBooking: (bed: any, room: Room, date: Date) => void;
  onAssignArrival: (guestId: string, bedId: string) => void;
  onResizeLeft: (booking: Guest, deltaDays: number) => void;
  onResizeRight: (booking: Guest, deltaDays: number) => void;
  onRoomSettings: (room: Room) => void;
}

export function TimelineGrid({
  rooms,
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
  onRoomSettings,
}: TimelineGridProps) {
  const { t, language } = useTranslation();

  return (
    <>
      {/* Sticky date header row */}
      <div className="sticky top-0 z-20 flex bg-white border-b border-zinc-200">
        <div
          className="shrink-0 border-r border-zinc-100 px-3 py-2 flex items-end"
          style={{ width: labelWidth }}
        >
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
            {t('bedboard.beds') || 'Beds'}
          </span>
        </div>
        <div className="flex flex-1">
          {dates.map((date, i) => (
            <div
              key={i}
              className="flex-1 min-w-0 text-center py-2 border-r border-zinc-50"
            >
              <div className="text-xs text-zinc-400">{format(date, 'EEE')}</div>
              <div className="text-xs font-medium text-zinc-600">{format(date, 'd')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Room groups and bed rows */}
      {rooms.map((room) => {
        const dailyFree = computeRoomDailyFree(room, dates);
        const priceRange = getRoomPriceRange(room);
        const roomTypeLabels: Record<string, string> = {
          'dorm-mixed': t('bedboard.mixedDorm') || 'Mixed Dorm',
          'dorm-female': t('bedboard.femaleDorm') || 'Female Dorm',
          'private': t('bedboard.private') || 'Private Room',
        };

        return (
          <React.Fragment key={room.id}>
            {/* Room group header */}
            <div
              className="flex bg-zinc-50 border-b border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors"
              onClick={() => onRoomSettings(room)}
            >
              <div
                className="shrink-0 border-r border-zinc-100 px-3 py-1.5 flex items-center gap-2"
                style={{ width: labelWidth }}
              >
                <span className="text-xs font-semibold text-zinc-700 truncate">
                  {room.name || roomTypeLabels[room.type] || room.number}
                </span>
                <span className="text-xs text-zinc-400 bg-zinc-200 px-1 rounded">
                  {roomTypeLabels[room.type] || room.type}
                </span>
                <span className="text-xs text-zinc-400 ml-auto">
                  {priceRange.min === priceRange.max
                    ? formatCurrency(priceRange.min, language)
                    : `${formatCurrency(priceRange.min, language)}-${formatCurrency(priceRange.max, language)}`}
                </span>
              </div>
              <div className="flex flex-1">
                {dailyFree.map((free, i) => (
                  <div key={i} className="flex-1 text-center py-1.5 border-r border-zinc-100">
                    <span className={`text-xs font-medium ${
                      free === 0 ? 'text-red-500' : free <= 2 ? 'text-amber-500' : 'text-emerald-600'
                    }`}>
                      {free}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bed rows */}
            {room.beds.map((bed) => (
              <React.Fragment key={bed.id}>
                <BedRow
                bed={bed}
                room={room}
                dates={dates}
                visibleDays={visibleDays}
                dayWidth={dayWidth}
                labelWidth={labelWidth}
                isResizingRef={isResizingRef}
                suppressClickRef={suppressClickRef}
                activeGuest={activeGuest}
                hoveredBedId={hoveredBedId}
                hoveredDateIndex={hoveredDateIndex}
                dropValidity={dropValidity}
                isReservation={isReservation}
                onBookingClick={onBookingClick}
                onCheckout={onCheckout}
                onQuickBooking={onQuickBooking}
                onAssignArrival={onAssignArrival}
                onResizeLeft={onResizeLeft}
                onResizeRight={onResizeRight}
              />
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
}
