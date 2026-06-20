/**
 * RoomsSection — Settings → 房间 sub-tab.
 *
 * Room & bed management surface. Renders a list of rooms with
 * add/edit/delete actions. Delegates the actual room editing to the
 * existing RoomSettingsDialog / AddRoomDialog (re-exported via
 * RoomsDialogs).
 */

import React, { useState } from 'react';
import { Plus, BedDouble, Pencil, Users, Trash2 } from 'lucide-react';
import { useTranslation, formatCurrency } from '../i18nContext';
import { useHostel } from '../HostelContext';
import { Room } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AddRoomDialog, RoomSettingsDialog } from './RoomsDialogs';

export function RoomsSection() {
  const { t, language } = useTranslation();
  const { rooms, deleteRoom } = useHostel();
  const [addOpen, setAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const occupiedBeds = (room: Room) =>
    room.beds.filter((b) => b.status === 'occupied').length;

  const typeLabel = (type: string) => {
    switch (type) {
      case 'dorm-mixed':
        return t('rooms.mixedDorm') || 'Mixed Dorm';
      case 'dorm-female':
        return t('rooms.femaleDorm') || 'Female Dorm';
      case 'private':
        return t('rooms.privateRoom') || 'Private Room';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            {t('rooms.manageRooms') || 'Rooms & Beds'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('rooms.subtitle') || '添加、编辑房间和床位。所有更改实时同步到床位看板。'}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('rooms.addRoom') || 'Add Room'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rooms.length === 0 && (
          <Card className="col-span-full border-dashed shadow-none">
            <CardContent className="p-8 text-center">
              <BedDouble className="h-8 w-8 text-muted-foreground/70 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('rooms.empty') || '还没有房间。点击右上角「添加房间」开始。'}
              </p>
            </CardContent>
          </Card>
        )}

        {rooms.map((room) => {
          const total = room.beds.length;
          const occ = occupiedBeds(room);
          const occRate = total > 0 ? Math.round((occ / total) * 100) : 0;
          return (
            <Card
              key={room.id}
              className="border shadow-none bg-white hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">
                      {t('rooms.roomNumber') || 'Room'} {room.number}
                      {room.name && (
                        <span className="text-muted-foreground font-normal"> · {room.name}</span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{typeLabel(room.type)}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 bg-zinc-50 rounded">
                    {formatCurrency(room.pricePerNight, language)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                    {total} {t('rooms.bedsCount') || 'beds'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {occ} {t('rooms.occupied') || 'occupied'}
                  </span>
                  <span
                    className={cn(
                      'ml-auto text-xs font-medium px-1.5 py-0.5 rounded',
                      occRate >= 80
                        ? 'bg-emerald-50 text-emerald-700'
                        : occRate >= 40
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-zinc-50 text-muted-foreground',
                    )}
                  >
                    {occRate}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-1"
                    onClick={() => setEditingRoom(room)}
                  >
                    <Pencil className="h-3 w-3" />
                    {t('common.edit') || 'Edit'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                    disabled={occ > 0}
                    onClick={() => {
                      // 检查是否有未来预订
                      const reservationCount = room.beds.reduce(
                        (sum, b) => sum + (b.reservations?.length || 0), 0,
                      );
                      const hasOccupied = occ > 0;
                      const hasReservations = reservationCount > 0;
                      if (hasOccupied || hasReservations) {
                        const parts: string[] = [];
                        if (hasOccupied) parts.push(`${occ} 个入住床位`);
                        if (hasReservations) parts.push(`${reservationCount} 个预订`);
                        if (!confirm(`该房间有${parts.join('和')}，删除后数据将丢失，确认删除？`)) return;
                      } else {
                        if (!confirm(t('rooms.confirmDelete') || 'Delete this room?')) return;
                      }
                      deleteRoom(room.id);
                    }}
                    title={occ > 0 ? (t('rooms.cannotDeleteOccupied') || 'Cannot delete occupied room') : ''}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AddRoomDialog isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <RoomSettingsDialog room={editingRoom} onClose={() => setEditingRoom(null)} />
    </div>
  );
}
