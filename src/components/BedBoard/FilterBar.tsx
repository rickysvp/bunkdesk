import React from 'react';
import { useTranslation } from '../../i18nContext';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface FilterBarProps {
  statusFilter: string;
  roomTypeFilter: string;
  startDate: Date;
  visibleDays: number;
  setStatusFilter: (val: string) => void;
  setRoomTypeFilter: (val: string) => void;
  goBack: () => void;
  goForward: () => void;
  goToday: () => void;
  onAddRoom: () => void;
  onDatePickerToggle: () => void;
}

export function FilterBar({
  statusFilter,
  roomTypeFilter,
  startDate,
  visibleDays,
  setStatusFilter,
  setRoomTypeFilter,
  goBack,
  goForward,
  goToday,
  onAddRoom,
  onDatePickerToggle,
}: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Date navigation */}
      <div className="flex items-center gap-1 bg-white border rounded-lg p-0.5">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          data-date-picker
          className="text-xs font-medium px-2 hover:bg-zinc-100 rounded h-9 min-w-[120px]"
          onClick={onDatePickerToggle}
        >
          {format(startDate, 'MMM d')} – {format(new Date(startDate.getTime() + (visibleDays - 1) * 86400000), 'MMM d')} ({visibleDays}d)
        </button>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={goForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-xs px-3" onClick={goToday}>
          {t('calendarview.today') || 'Today'}
        </Button>
      </div>

      {/* Status filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[120px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('calendarview.allStatuses') || 'All'}</SelectItem>
          <SelectItem value="empty">{t('calendarview.empty') || 'Empty'}</SelectItem>
          <SelectItem value="occupied">{t('calendarview.occupied') || 'Occupied'}</SelectItem>
          <SelectItem value="cleaning">{t('calendarview.cleaning') || 'Cleaning'}</SelectItem>
          <SelectItem value="reserved">{t('calendarview.reserved') || 'Reserved'}</SelectItem>
          <SelectItem value="late-arrival">{t('bedboard.lateArrival') || 'Late Arrival'}</SelectItem>
        </SelectContent>
      </Select>

      {/* Room type filter */}
      <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
        <SelectTrigger className="w-[130px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('calendarview.allRooms') || 'All Rooms'}</SelectItem>
          <SelectItem value="dorm-mixed">{t('calendarview.mixedDorm') || 'Mixed Dorm'}</SelectItem>
          <SelectItem value="dorm-female">{t('calendarview.femaleDorm') || 'Female Dorm'}</SelectItem>
          <SelectItem value="private">{t('calendarview.privateRoom') || 'Private'}</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={onAddRoom}>
        <Plus className="h-3.5 w-3.5" />
        {t('rooms.addRoom') || 'Add Room'}
      </Button>
    </div>
  );
}
