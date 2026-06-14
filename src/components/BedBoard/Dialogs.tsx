import React from 'react';
import { useTranslation } from '../../i18nContext';
import { useHostel } from '../../HostelContext';
import { Room, Bed, Guest } from '../../types';
import { format, parseISO } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Sparkles, X } from 'lucide-react';
import { getBedPrice } from '../../utils/bedPricing';

// ─── Guest Detail Modal ────────────────────────────────────────

interface GuestDetailModalProps {
  guest: Guest | null;
  bed: Bed | null;
  room: Room | null;
  onClose: () => void;
  onCheckout: (bedId: string) => void;
}

export function GuestDetailModal({ guest, bed, room, onClose, onCheckout }: GuestDetailModalProps) {
  const { t } = useTranslation();
  if (!guest) return null;

  const checkIn = parseISO(guest.checkInDate);
  const checkOut = parseISO(guest.checkOutDate);
  const totalNights = guest.nights || 0;
  const nightsStayed = Math.max(0, Math.min(totalNights, Math.floor((Date.now() - checkIn.getTime()) / 86400000)));
  const progress = totalNights > 0 ? Math.min(1, nightsStayed / totalNights) : 0;

  return (
    <Dialog open={!!guest} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{guest.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Stay progress */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>{format(checkIn, 'MMM d, yyyy')}</span>
              <span>{format(checkOut, 'MMM d, yyyy')}</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="text-center text-xs text-zinc-500 mt-1">
              {nightsStayed}/{totalNights} {t('guest.nights') || 'Nights'}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-[10px] text-zinc-400">{t('guest.gender') || 'Gender'}</Label>
              <p className="text-zinc-800">{guest.gender || '-'}</p>
            </div>
            <div>
              <Label className="text-[10px] text-zinc-400">{t('guest.checkIn') || 'Country'}</Label>
              <p className="text-zinc-800">{guest.country} ({guest.countryCode})</p>
            </div>
            {guest.phone && (
              <div>
                <Label className="text-[10px] text-zinc-400">{t('guest.phone') || 'Phone'}</Label>
                <p className="text-zinc-800">{guest.phone}</p>
              </div>
            )}
            {guest.email && (
              <div>
                <Label className="text-[10px] text-zinc-400">{t('guest.email') || 'Email'}</Label>
                <p className="text-zinc-800 text-xs truncate">{guest.email}</p>
              </div>
            )}
            {guest.passportOrId && (
              <div>
                <Label className="text-[10px] text-zinc-400">{t('guest.idPassport') || 'ID/Passport'}</Label>
                <p className="text-zinc-800 text-xs">{guest.passportOrId}</p>
              </div>
            )}
            {guest.dob && (
              <div>
                <Label className="text-[10px] text-zinc-400">{t('guest.dob') || 'DOB'}</Label>
                <p className="text-zinc-800">{guest.dob}</p>
              </div>
            )}
          </div>

          {/* Bed info */}
          {bed && room && (
            <div className="bg-zinc-50 rounded-lg p-3 text-sm">
              <span className="text-zinc-500">{t('rooms.roomName')}: </span>
              <span className="font-medium">{room.name || room.number} - {bed.name}</span>
              <span className="text-zinc-400 ml-2">${getBedPrice(room, bed)}/night</span>
            </div>
          )}

          {/* Payment summary */}
          <div className="border-t pt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-500">{t('guest.totalAmount') || 'Total'}</span>
              <span className="font-medium">${guest.totalAmount || 0}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-500">{t('guest.paidAmount') || 'Paid'}</span>
              <span className="text-emerald-600">${guest.paidAmount || 0}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>{t('guest.dueAmount') || 'Due'}</span>
              <span className={guest.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-red-500'}>
                ${(guest.totalAmount || 0) - (guest.paidAmount || 0)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {guest.notes && (
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
              {guest.notes}
            </div>
          )}

          {/* Source */}
          <div className="text-xs text-zinc-400">
            {t('dashboard.source') || 'Source'}: {guest.source}
            {guest.roomPreference && ` · ${t('dashboard.roomPreference') || 'Pref'}: ${guest.roomPreference}`}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t('guest.cancel') || 'Cancel'}</Button>
          {bed && (
            <Button
              variant="destructive"
              onClick={() => onCheckout(bed.id)}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              {t('guest.confirmCheckout') || 'Check Out'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Checkout Confirmation Dialog ──────────────────────────────

interface CheckoutDialogProps {
  guest: Guest | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CheckoutDialog({ guest, onConfirm, onCancel }: CheckoutDialogProps) {
  const { t } = useTranslation();
  if (!guest) return null;

  return (
    <Dialog open={!!guest} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('guest.confirmCheckout') || 'Confirm Check Out'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600">
          {t('guest.checkoutWarning') || 'Are you sure you want to check out'} <strong>{guest.name}</strong>?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t('guest.cancel') || 'Cancel'}</Button>
          <Button variant="destructive" onClick={onConfirm}>
            <LogOut className="h-4 w-4 mr-1.5" />
            {t('guest.confirm') || 'Confirm Check Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gender Conflict Dialog ─────────────────────────────────────

interface GenderConflictDialogProps {
  guestName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GenderConflictDialog({ guestName, onConfirm, onCancel }: GenderConflictDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!guestName} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('bedboard.genderConflictTitle') || 'Gender Conflict'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600">
          {t('bedboard.genderConflictMessage') || 'This is a female-only dorm. Are you sure you want to assign a male guest here?'}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t('guest.cancel') || 'Cancel'}</Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('bedboard.assignAnyway') || 'Assign Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Room Settings Dialog ───────────────────────────────────────

interface RoomSettingsDialogProps {
  room: Room | null;
  onClose: () => void;
}

export function RoomSettingsDialog({ room, onClose }: RoomSettingsDialogProps) {
  const { t } = useTranslation();
  const { updateRoom, updateBed, deleteBed, addBedToRoom, deleteRoom } = useHostel();

  const [name, setName] = React.useState('');
  const [number, setNumber] = React.useState('');
  const [pricePerNight, setPricePerNight] = React.useState(0);
  const [bottomBunkPremium, setBottomBunkPremium] = React.useState(0);
  const [newBedName, setNewBedName] = React.useState('');
  const [newBedType, setNewBedType] = React.useState<string>('single');

  React.useEffect(() => {
    if (room) {
      setName(room.name || '');
      setNumber(room.number || '');
      setPricePerNight(room.pricePerNight || 0);
      setBottomBunkPremium(room.bottomBunkPremium || 0);
    }
  }, [room]);

  if (!room) return null;

  const handleSave = () => {
    updateRoom(room.id, name, number, pricePerNight, bottomBunkPremium);
    onClose();
  };

  const handleAddBed = () => {
    if (!newBedName.trim()) return;
    addBedToRoom(room.id, {
      name: newBedName.trim(),
      bedType: newBedType as 'top' | 'bottom' | 'single' | 'double',
    });
    setNewBedName('');
  };

  const occupiedCount = room.beds.filter(b => b.status === 'occupied').length;

  return (
    <Dialog open={!!room} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('rooms.editRoom') || 'Edit Room'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('rooms.roomNumber') || 'Number'}</Label>
              <Input value={number} onChange={e => setNumber(e.target.value)} />
            </div>
            <div>
              <Label>{t('rooms.roomName') || 'Name'}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('rooms.pricePerNight') || 'Price/Night'}</Label>
              <Input type="number" value={pricePerNight} onChange={e => setPricePerNight(Number(e.target.value))} />
            </div>
            {room.type !== 'private' && (
              <div>
                <Label>{t('rooms.pricePremium') || 'Bottom Premium'}</Label>
                <Input type="number" value={bottomBunkPremium} onChange={e => setBottomBunkPremium(Number(e.target.value))} />
              </div>
            )}
          </div>

          {/* Beds management */}
          <div>
            <Label className="mb-2 block">{t('rooms.bedsCount') || 'Beds'} ({room.beds.length})</Label>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {room.beds.map((bed) => (
                <div key={bed.id} className="flex items-center gap-2 bg-zinc-50 rounded p-2">
                  <Input
                    className="h-7 text-xs flex-1"
                    value={bed.name}
                    onChange={e => updateBed(room.id, bed.id, e.target.value)}
                  />
                  <Select
                    value={bed.bedType || 'single'}
                    onValueChange={v => updateBed(room.id, bed.id, bed.name, v as any)}
                  >
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">{t('rooms.topBunk') || 'Top'}</SelectItem>
                      <SelectItem value="bottom">{t('rooms.bottomBunk') || 'Bottom'}</SelectItem>
                      <SelectItem value="single">{t('rooms.singleBed') || 'Single'}</SelectItem>
                      <SelectItem value="double">{t('rooms.doubleBed') || 'Double'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-zinc-400 w-12 text-right">${getBedPrice(room, bed)}</span>
                  <button
                    className="p-1 hover:bg-red-100 rounded text-red-400"
                    onClick={() => deleteBed(room.id, bed.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                className="h-7 text-xs flex-1"
                placeholder={t('rooms.bedName') || 'Bed name'}
                value={newBedName}
                onChange={e => setNewBedName(e.target.value)}
              />
              <Select value={newBedType} onValueChange={setNewBedType}>
                <SelectTrigger className="h-7 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">{t('rooms.topBunk') || 'Top'}</SelectItem>
                  <SelectItem value="bottom">{t('rooms.bottomBunk') || 'Bottom'}</SelectItem>
                  <SelectItem value="single">{t('rooms.singleBed') || 'Single'}</SelectItem>
                  <SelectItem value="double">{t('rooms.doubleBed') || 'Double'}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" onClick={handleAddBed}>
                + {t('rooms.addBed') || 'Add Bed'}
              </Button>
            </div>
          </div>

          {/* Delete room */}
          <div className="border-t pt-3">
            <Button
              variant="destructive"
              size="sm"
              disabled={occupiedCount > 0}
              onClick={() => { deleteRoom(room.id); onClose(); }}
            >
              {t('rooms.deleteRoom') || 'Delete Room'}
            </Button>
            {occupiedCount > 0 && (
              <p className="text-[10px] text-zinc-400 mt-1">
                Cannot delete — {occupiedCount} bed{occupiedCount > 1 ? 's' : ''} occupied
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('guest.cancel') || 'Cancel'}</Button>
          <Button onClick={handleSave}>{t('rooms.save') || 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Room Dialog ────────────────────────────────────────────

interface AddRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddRoomDialog({ isOpen, onClose }: AddRoomDialogProps) {
  const { t } = useTranslation();
  const { addRoom } = useHostel();

  const [number, setNumber] = React.useState('');
  const [type, setType] = React.useState('dorm-mixed');
  const [price, setPrice] = React.useState(85);

  const handleCreate = () => {
    if (!number.trim()) return;
    addRoom({ number: number.trim(), name: '', type: type as any, pricePerNight: price, floor: 1 });
    setNumber('');
    setPrice(85);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('rooms.addRoom') || 'Add Room'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('rooms.roomNumber') || 'Number'}</Label>
            <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 103" />
          </div>
          <div>
            <Label>{t('rooms.roomType') || 'Type'}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dorm-mixed">{t('rooms.mixedDorm') || 'Mixed Dorm'}</SelectItem>
                <SelectItem value="dorm-female">{t('rooms.femaleDorm') || 'Female Dorm'}</SelectItem>
                <SelectItem value="private">{t('rooms.privateRoom') || 'Private Room'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('rooms.pricePerNight') || 'Price/Night'}</Label>
            <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('guest.cancel') || 'Cancel'}</Button>
          <Button onClick={handleCreate}>{t('rooms.createRoom') || 'Create Room'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
