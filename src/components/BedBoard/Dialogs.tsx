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

// Country code → flag emoji
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  return String.fromCodePoint(
    0x1f1e6 + code.toUpperCase().charCodeAt(0) - 65,
    0x1f1e6 + code.toUpperCase().charCodeAt(1) - 65,
  );
}

export function GuestDetailModal({ guest, bed, room, onClose, onCheckout }: GuestDetailModalProps) {
  const { t } = useTranslation();
  const { updateArrival, scanPassport, settlePayment } = useHostel();
  const [notesDraft, setNotesDraft] = React.useState('');
  const [extendNights, setExtendNights] = React.useState('');
  const [chargeAmount, setChargeAmount] = React.useState('');
  const [chargeReason, setChargeReason] = React.useState('');

  // Reset drafts whenever a new guest opens
  React.useEffect(() => {
    if (guest) {
      setNotesDraft(guest.notes || '');
      setExtendNights('');
      setChargeAmount('');
      setChargeReason('');
    }
  }, [guest?.id]);

  if (!guest) return null;

  const checkIn = parseISO(guest.checkInDate);
  const checkOut = parseISO(guest.checkOutDate);
  const totalNights = guest.nights || 0;
  const nightsStayed = Math.max(0, Math.min(totalNights, Math.floor((Date.now() - checkIn.getTime()) / 86400000)));
  const progress = totalNights > 0 ? Math.min(1, nightsStayed / totalNights) : 0;
  const totalAmt = guest.totalAmount || 0;
  const paidAmt = guest.paidAmount || 0;
  const dueAmt = totalAmt - paidAmt;

  const pricePerNight = room && bed ? getBedPrice(room, bed) : 0;

  // ── Action handlers ──
  const handleSaveNotes = () => {
    if (notesDraft === guest.notes) return;
    updateArrival(guest.id, { notes: notesDraft });
  };

  const handleExtendStay = () => {
    const n = parseInt(extendNights, 10);
    if (!n || n < 1) return;
    const newNights = totalNights + n;
    const newCheckOut = format(
      new Date(checkOut.getTime() + n * 86400000),
      'yyyy-MM-dd',
    );
    const newTotal = (pricePerNight > 0)
      ? Math.round((totalAmt + pricePerNight * n) * 100) / 100
      : totalAmt;
    updateArrival(guest.id, {
      nights: newNights,
      checkOutDate: newCheckOut,
      totalAmount: newTotal,
    });
    setExtendNights('');
  };

  const handleAddCharge = () => {
    const amt = parseFloat(chargeAmount);
    if (!amt || amt <= 0) return;
    const newTotal = Math.round((totalAmt + amt) * 100) / 100;
    const noteLine = `[${format(new Date(), 'M/d HH:mm')}] $${amt.toFixed(2)} - ${chargeReason || 'misc'}`;
    updateArrival(guest.id, {
      totalAmount: newTotal,
      notes: notesDraft ? `${notesDraft}\n${noteLine}` : noteLine,
    });
    setNotesDraft((prev) => prev ? `${prev}\n${noteLine}` : noteLine);
    setChargeAmount('');
    setChargeReason('');
  };

  const handleSettleDue = () => {
    updateArrival(guest.id, {
      paidAmount: totalAmt,
      paymentStatus: 'paid',
    });
    settlePayment(guest.id);
  };

  const handlePartialPayment = (extra: number) => {
    const newPaid = Math.round((paidAmt + extra) * 100) / 100;
    const newStatus = newPaid >= totalAmt ? 'paid' : 'partial';
    updateArrival(guest.id, {
      paidAmount: newPaid,
      paymentStatus: newStatus as 'paid' | 'partial',
    });
  };

  const paymentBadge =
    guest.paymentStatus === 'paid'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : guest.paymentStatus === 'partial'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200';

  return (
    <Dialog open={!!guest} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        {/* Header — name + country + payment badge */}
        <DialogHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="text-3xl leading-none mt-1 select-none">{countryFlag(guest.countryCode)}</div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl truncate">{guest.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${paymentBadge}`}>
                  {guest.paymentStatus}
                </span>
                {guest.passportScanned && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                    ID ✓
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  {guest.gender || '—'} · {guest.country} ({guest.countryCode})
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stay progress with extension */}
          <div className="bg-zinc-50 rounded-lg p-3">
            <div className="flex justify-between text-xs text-zinc-600 mb-1.5">
              <span className="font-medium">Check-in</span>
              <span className="font-medium">Check-out</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-zinc-800 mb-2">
              <span>{format(checkIn, 'MMM d, yyyy')}</span>
              <span>{format(checkOut, 'MMM d, yyyy')}</span>
            </div>
            <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 1 ? 'bg-emerald-500' :
                  progress >= 0.6 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="text-center text-xs text-zinc-500 mt-1.5">
              {nightsStayed}/{totalNights} {t('guest.nights') || 'Nights'}
              {room && bed && (
                <span className="ml-2 text-zinc-400">· {room.name} / {bed.name}</span>
              )}
            </div>

            {/* Extend stay quick form */}
            <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center gap-2">
              <Label className="text-[11px] text-zinc-500 shrink-0">延住 +</Label>
              <Input
                type="number"
                min={1}
                placeholder="nights"
                value={extendNights}
                onChange={(e) => setExtendNights(e.target.value)}
                className="h-7 text-xs w-20"
              />
              <span className="text-[10px] text-zinc-500">晚</span>
              {pricePerNight > 0 && extendNights && (
                <span className="text-[10px] text-amber-600">
                  +${pricePerNight * (parseInt(extendNights, 10) || 0)}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs ml-auto"
                onClick={handleExtendStay}
                disabled={!extendNights || parseInt(extendNights, 10) < 1}
              >
                延住
              </Button>
            </div>
          </div>

          {/* 2-col details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Phone</Label>
              <Input
                className="h-7 text-xs mt-0.5"
                defaultValue={guest.phone || ''}
                onBlur={(e) => e.target.value !== (guest.phone || '') && updateArrival(guest.id, { phone: e.target.value })}
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Email</Label>
              <Input
                className="h-7 text-xs mt-0.5"
                defaultValue={guest.email || ''}
                onBlur={(e) => e.target.value !== (guest.email || '') && updateArrival(guest.id, { email: e.target.value })}
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">ID / Passport</Label>
              <Input
                className="h-7 text-xs mt-0.5"
                defaultValue={guest.passportOrId || ''}
                onBlur={(e) => e.target.value !== (guest.passportOrId || '') && updateArrival(guest.id, { passportOrId: e.target.value })}
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Date of Birth</Label>
              <Input
                className="h-7 text-xs mt-0.5"
                defaultValue={guest.dob || ''}
                onBlur={(e) => e.target.value !== (guest.dob || '') && updateArrival(guest.id, { dob: e.target.value })}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Gender</Label>
              <Select
                value={guest.gender || 'male'}
                onValueChange={(v) => updateArrival(guest.id, { gender: v as 'male' | 'female' | 'other' })}
              >
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男 Male</SelectItem>
                  <SelectItem value="female">女 Female</SelectItem>
                  <SelectItem value="other">其他 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Source</Label>
              <Select
                value={guest.source}
                onValueChange={(v) => updateArrival(guest.id, { source: v as any })}
              >
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="expedia">Expedia</SelectItem>
                  <SelectItem value="ical">iCal</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bed info */}
          {bed && room && (
            <div className="bg-blue-50/60 rounded-lg p-3 text-sm flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <span className="text-zinc-500">房间 </span>
                <span className="font-semibold text-zinc-800">{room.name || room.number}</span>
                <span className="text-zinc-400 mx-1.5">·</span>
                <span className="font-semibold text-zinc-800">{bed.name}</span>
                {bed.bedType && (
                  <span className="text-zinc-400 text-xs ml-1.5">({bed.bedType})</span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                ${pricePerNight}<span className="text-zinc-400">/night</span>
              </div>
            </div>
          )}

          {/* Financial card with quick actions */}
          <div className="border border-zinc-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">财务 Financial</span>
              {guest.roomPreference && (
                <span className="text-[10px] text-zinc-400">
                  偏好: {guest.roomPreference}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-zinc-50 rounded p-2">
                <div className="text-[10px] text-zinc-500 uppercase">总额</div>
                <div className="text-lg font-semibold text-zinc-800">${totalAmt}</div>
              </div>
              <div className="bg-emerald-50 rounded p-2">
                <div className="text-[10px] text-emerald-600 uppercase">已付</div>
                <div className="text-lg font-semibold text-emerald-700">${paidAmt}</div>
              </div>
              <div className={`rounded p-2 ${dueAmt > 0 ? 'bg-red-50' : 'bg-zinc-50'}`}>
                <div className={`text-[10px] uppercase ${dueAmt > 0 ? 'text-red-600' : 'text-zinc-500'}`}>待付</div>
                <div className={`text-lg font-semibold ${dueAmt > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                  ${dueAmt}
                </div>
              </div>
            </div>

            {/* Add charge row */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] text-zinc-500 shrink-0">+消费</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="金额"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                className="h-7 text-xs w-20"
              />
              <Input
                placeholder="说明 (e.g. 洗衣/饮料)"
                value={chargeReason}
                onChange={(e) => setChargeReason(e.target.value)}
                className="h-7 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleAddCharge}
                disabled={!chargeAmount || parseFloat(chargeAmount) <= 0}
              >
                记账
              </Button>
            </div>

            {/* Payment actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {dueAmt > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSettleDue}
                >
                  补差价 ${dueAmt}
                </Button>
              )}
              {dueAmt > 0 && [10, 20, 50, 100].filter((n) => n <= dueAmt).map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handlePartialPayment(n)}
                >
                  +${n}
                </Button>
              ))}
              {guest.paymentStatus === 'paid' && (
                <span className="text-xs text-emerald-600 font-medium">已结清 ✓</span>
              )}
            </div>
          </div>

          {/* Notes (always editable) */}
          <div>
            <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">备注 Notes</Label>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="添加备注..."
              rows={3}
              className="w-full mt-1 px-3 py-2 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* Status toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => scanPassport(guest.id)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                guest.passportScanned
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-blue-50'
              }`}
            >
              {guest.passportScanned ? '✓' : '○'} 护照扫描 Passport
            </button>
            <span className="text-[10px] text-zinc-400 ml-auto">
              ID: <code className="bg-zinc-100 px-1 rounded">{guest.id}</code>
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>关闭</Button>
          {bed && (
            <Button
              variant="destructive"
              onClick={() => onCheckout(bed.id)}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              退房 Check Out
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
