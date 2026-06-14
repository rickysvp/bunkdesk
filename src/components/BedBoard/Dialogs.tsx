import React from 'react';
import { useTranslation } from '../../i18nContext';
import { useHostel } from '../../HostelContext';
import { Room, Bed, Guest, GuestLogEntry, GuestLogType } from '../../types';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LogOut, X, Plus, Receipt, Clock, Bed as BedIcon, CreditCard,
  Pencil, FileText, ArrowLeftRight, UserPlus, ScanLine, Wallet,
  ScrollText, History, Hash, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

const LOG_TYPE_META: Record<GuestLogType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  'created':         { icon: UserPlus,        color: 'text-slate-600 bg-slate-100',      label: '创建' },
  'check-in':        { icon: BedIcon,         color: 'text-emerald-700 bg-emerald-100',  label: '入住' },
  'check-out':       { icon: LogOut,          color: 'text-zinc-700 bg-zinc-100',        label: '退房' },
  'payment':         { icon: Wallet,          color: 'text-emerald-700 bg-emerald-100',  label: '付款' },
  'charge':          { icon: Receipt,         color: 'text-amber-700 bg-amber-100',      label: '消费' },
  'note':            { icon: FileText,        color: 'text-blue-700 bg-blue-100',        label: '备注' },
  'edit':            { icon: Pencil,          color: 'text-violet-700 bg-violet-100',    label: '编辑' },
  'bed-change':      { icon: ArrowLeftRight,  color: 'text-cyan-700 bg-cyan-100',        label: '换床' },
  'extend-stay':     { icon: Plus,            color: 'text-indigo-700 bg-indigo-100',    label: '延住' },
  'shorten-stay':    { icon: Clock,           color: 'text-orange-700 bg-orange-100',    label: '缩住' },
  'scan-passport':   { icon: ScanLine,        color: 'text-blue-700 bg-blue-100',        label: '扫护照' },
  'reservation':     { icon: BedIcon,         color: 'text-slate-600 bg-slate-100',      label: '改预订' },
  'shift-note':      { icon: ScrollText,      color: 'text-zinc-600 bg-zinc-100',        label: '值班' },
  'profile-merge':   { icon: Hash,            color: 'text-pink-700 bg-pink-100',        label: '合并' },
};

function LogEntry({ entry }: { entry: GuestLogEntry } & React.HTMLAttributes<HTMLDivElement>) {
  const meta = LOG_TYPE_META[entry.type] || LOG_TYPE_META['note'];
  const Icon = meta.icon;
  const ago = formatDistanceToNow(parseISO(entry.createdAt), { addSuffix: true });
  return (
    <div className="flex gap-2.5 items-start py-1.5">
      <div className={cn('flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center', meta.color)}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-zinc-800">{meta.label}</span>
          <span className="text-[10px] text-zinc-400">{ago}</span>
          {entry.amount !== undefined && entry.amount > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 ml-auto">${entry.amount}</span>
          )}
        </div>
        <div className="text-[11px] text-zinc-600 mt-0.5 break-words">{entry.description}</div>
        <div className="text-[9px] text-zinc-400 mt-0.5">by {entry.author}</div>
      </div>
    </div>
  );
}

export function GuestDetailModal({ guest, bed, room, onClose, onCheckout }: GuestDetailModalProps) {
  const { t } = useTranslation();
  const {
    rooms, arrivals, guestLogs,
    addCharge, extendStay, addPartialPayment, addGuestNote, updateGuestField,
    scanPassport, settlePayment,
  } = useHostel();

  const [extendNights, setExtendNights] = React.useState('');
  const [chargeAmount, setChargeAmount] = React.useState('');
  const [chargeReason, setChargeReason] = React.useState('');
  const [notesDraft, setNotesDraft] = React.useState('');
  const [showFullLog, setShowFullLog] = React.useState(false);

  // Resolve the live guest by id from either arrivals or rooms/beds.
  // This is the fix for the "extend-stay but due didn't update" bug —
  // we always read the latest state, not the snapshot taken at click time.
  const liveGuest = React.useMemo<Guest | null>(() => {
    if (!guest) return null;
    const fromArrivals = arrivals.find((g) => g.id === guest.id);
    if (fromArrivals) return fromArrivals;
    for (const r of rooms) {
      for (const b of r.beds) {
        if (b.guest?.id === guest.id) return b.guest;
      }
    }
    return guest;
  }, [guest, arrivals, rooms]);

  // Find the live bed/room too in case the guest was moved.
  const { liveBed, liveRoom } = React.useMemo(() => {
    if (!liveGuest) return { liveBed: null, liveRoom: null };
    for (const r of rooms) {
      for (const b of r.beds) {
        if (b.guest?.id === liveGuest.id) return { liveBed: b, liveRoom: r };
      }
    }
    return { liveBed: bed, liveRoom: room };
  }, [liveGuest, rooms, bed, room]);

  // Reset drafts when opening a different guest.
  React.useEffect(() => {
    if (liveGuest) {
      setNotesDraft(liveGuest.notes || '');
      setExtendNights('');
      setChargeAmount('');
      setChargeReason('');
      setShowFullLog(false);
    }
  }, [liveGuest?.id]);

  if (!liveGuest) return null;

  // ── Derived values ──
  const checkIn = parseISO(liveGuest.checkInDate);
  const checkOut = parseISO(liveGuest.checkOutDate);
  const totalNights = liveGuest.nights || 0;
  const nightsStayed = Math.max(0, Math.min(totalNights, Math.floor((Date.now() - checkIn.getTime()) / 86400000)));
  const progress = totalNights > 0 ? Math.min(1, nightsStayed / totalNights) : 0;
  const totalAmt = liveGuest.totalAmount || 0;
  const paidAmt = liveGuest.paidAmount || 0;
  const dueAmt = Math.max(0, totalAmt - paidAmt);
  const pricePerNight = liveRoom && liveBed ? getBedPrice(liveRoom, liveBed) : 0;

  // Audit log for this guest: prefer the phone key to link across visits.
  const guestHistory: GuestLogEntry[] = React.useMemo(() => {
    if (liveGuest.phone) {
      return guestLogs.filter((l) => l.phone === liveGuest.phone);
    }
    return guestLogs.filter((l) => l.guestId === liveGuest.id);
  }, [guestLogs, liveGuest.id, liveGuest.phone]);

  const visibleLog = showFullLog ? guestHistory : guestHistory.slice(0, 8);

  // ── Handlers ──
  const handleExtend = () => {
    const n = parseInt(extendNights, 10);
    if (!n || n < 1) return;
    extendStay(liveGuest.id, n);
    setExtendNights('');
  };

  const handleCharge = () => {
    const amt = parseFloat(chargeAmount);
    if (!amt || amt <= 0) return;
    addCharge(liveGuest.id, amt, chargeReason);
    setChargeAmount('');
    setChargeReason('');
  };

  const handleSettle = () => {
    if (dueAmt > 0) addPartialPayment(liveGuest.id, dueAmt);
    settlePayment(liveGuest.id);
  };

  const handleSaveNotes = () => {
    if (notesDraft === (liveGuest.notes || '')) return;
    addGuestNote(liveGuest.id, notesDraft);
  };

  const paymentBadge =
    liveGuest.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    liveGuest.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-red-100 text-red-700 border-red-200';

  return (
    <Dialog open={!!liveGuest} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-0">
        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 bg-gradient-to-br from-zinc-50 to-white">
          <div className="flex items-start gap-3">
            <div className="text-3xl leading-none mt-0.5 select-none">{countryFlag(liveGuest.countryCode)}</div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight truncate">{liveGuest.name}</DialogTitle>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {liveGuest.country} · {liveGuest.gender || '—'}
                {liveBed && liveRoom && <span> · {liveRoom.name} / {liveBed.name}</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border', paymentBadge)}>
                  {liveGuest.paymentStatus}
                </span>
                {liveGuest.passportScanned && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-200">
                    ID ✓
                  </span>
                )}
                {liveGuest.phone && (
                  <span className="text-[10px] text-zinc-500">📞 {liveGuest.phone}</span>
                )}
                {liveGuest.email && (
                  <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">✉ {liveGuest.email}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-4 space-y-4">
          {/* Stay progress + extend */}
          <div className="bg-zinc-50 rounded-lg p-3">
            <div className="flex justify-between items-baseline text-[11px] text-zinc-500 mb-1">
              <span>{format(checkIn, 'MMM d, yyyy')}</span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {nightsStayed}/{totalNights} nights
                {progress >= 1 && <span className="text-emerald-600 ml-1">· 完</span>}
              </span>
              <span>{format(checkOut, 'MMM d, yyyy')}</span>
            </div>
            <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  progress >= 1 ? 'bg-emerald-500' :
                  progress >= 0.6 ? 'bg-blue-500' : 'bg-amber-500')}
                style={{ width: `${Math.max(progress * 100, 2)}%` }}
              />
            </div>
            {/* Extend stay */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-medium text-zinc-500">延住</span>
              <Input
                type="number" min={1} max={30}
                value={extendNights}
                onChange={(e) => setExtendNights(e.target.value)}
                placeholder="N"
                className="h-7 w-14 text-xs"
              />
              <span className="text-[10px] text-zinc-500">晚</span>
              {pricePerNight > 0 && extendNights && (
                <span className="text-[10px] text-amber-600 font-medium">
                  +${(pricePerNight * (parseInt(extendNights, 10) || 0)).toFixed(0)}
                </span>
              )}
              <Button size="sm" variant="outline" className="h-7 text-[11px] ml-auto"
                onClick={handleExtend} disabled={!extendNights || parseInt(extendNights, 10) < 1}>
                <Plus className="h-3 w-3 mr-0.5" />延住
              </Button>
            </div>
          </div>

          {/* Profile fields (editable) */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-zinc-400">电话</Label>
              <Input className="h-7 text-xs mt-0.5" defaultValue={liveGuest.phone || ''}
                onBlur={(e) => e.target.value !== (liveGuest.phone || '') && updateGuestField(liveGuest.id, 'phone', e.target.value)} />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-zinc-400">邮箱</Label>
              <Input className="h-7 text-xs mt-0.5" defaultValue={liveGuest.email || ''}
                onBlur={(e) => e.target.value !== (liveGuest.email || '') && updateGuestField(liveGuest.id, 'email', e.target.value)} />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-zinc-400">证件</Label>
              <Input className="h-7 text-xs mt-0.5" defaultValue={liveGuest.passportOrId || ''}
                onBlur={(e) => e.target.value !== (liveGuest.passportOrId || '') && updateGuestField(liveGuest.id, 'passportOrId', e.target.value)} />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-zinc-400">生日</Label>
              <Input className="h-7 text-xs mt-0.5" defaultValue={liveGuest.dob || ''} placeholder="YYYY-MM-DD"
                onBlur={(e) => e.target.value !== (liveGuest.dob || '') && updateGuestField(liveGuest.id, 'dob', e.target.value)} />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-zinc-400">性别</Label>
              <Select value={liveGuest.gender || 'male'} onValueChange={(v) => updateGuestField(liveGuest.id, 'gender', v)}>
                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男 Male</SelectItem>
                  <SelectItem value="female">女 Female</SelectItem>
                  <SelectItem value="other">其他 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-zinc-400">来源</Label>
              <Select value={liveGuest.source} onValueChange={(v) => updateGuestField(liveGuest.id, 'source', v)}>
                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
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

          {/* Financial card */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">财务</span>
              {liveGuest.roomPreference && <span className="text-[10px] text-zinc-400">偏好: {liveGuest.roomPreference}</span>}
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-200">
              <div className="p-2.5 text-center">
                <div className="text-[9px] uppercase text-zinc-500 tracking-wider">总额</div>
                <div className="text-lg font-semibold text-zinc-800">${totalAmt}</div>
              </div>
              <div className="p-2.5 text-center">
                <div className="text-[9px] uppercase text-emerald-600 tracking-wider">已付</div>
                <div className="text-lg font-semibold text-emerald-700">${paidAmt}</div>
              </div>
              <div className={cn('p-2.5 text-center', dueAmt > 0 ? 'bg-red-50' : '')}>
                <div className={cn('text-[9px] uppercase tracking-wider', dueAmt > 0 ? 'text-red-600' : 'text-zinc-500')}>待付</div>
                <div className={cn('text-lg font-semibold', dueAmt > 0 ? 'text-red-600' : 'text-zinc-400')}>${dueAmt}</div>
              </div>
            </div>
            {/* Add charge */}
            <div className="p-2.5 bg-zinc-50 border-t border-zinc-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Receipt className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="text-[10px] font-medium text-zinc-500 shrink-0">+消费</span>
                <Input type="number" min={0} step="0.01" placeholder="金额"
                  value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)}
                  className="h-7 w-20 text-xs" />
                <Input placeholder="说明 (e.g. 洗衣/小食/酒水)"
                  value={chargeReason} onChange={(e) => setChargeReason(e.target.value)}
                  className="h-7 text-xs flex-1 min-w-[120px]" />
                <Button size="sm" variant="outline" className="h-7 text-[11px]"
                  onClick={handleCharge}
                  disabled={!chargeAmount || parseFloat(chargeAmount) <= 0}>
                  <Plus className="h-3 w-3 mr-0.5" />记账
                </Button>
              </div>
              {/* Pay actions */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {dueAmt > 0 && (
                  <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSettle}>
                    <CreditCard className="h-3 w-3 mr-1" />补差价 ${dueAmt}
                  </Button>
                )}
                {dueAmt > 0 && [10, 20, 50, 100].filter((n) => n <= dueAmt).map((n) => (
                  <Button key={n} size="sm" variant="outline" className="h-7 text-[11px]"
                    onClick={() => addPartialPayment(liveGuest.id, n)}>
                    +${n}
                  </Button>
                ))}
                {liveGuest.paymentStatus === 'paid' && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" />已结清
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-[9px] uppercase tracking-wider text-zinc-400">备注 (失焦自动保存)</Label>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="如: VIP客户、晚到、过敏等..."
              rows={2}
              className="w-full mt-1 px-2.5 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* Status toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => scanPassport(liveGuest.id)}
              className={cn('text-[10px] px-2 py-1 rounded-full border transition-colors',
                liveGuest.passportScanned
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-blue-50 hover:border-blue-200')}>
              <ScanLine className="h-3 w-3 inline mr-0.5" />
              {liveGuest.passportScanned ? '已扫' : '扫护照'}
            </button>
            <code className="text-[9px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded ml-auto">
              {liveGuest.id}
            </code>
          </div>

          {/* Audit log timeline */}
          <div className="border-t border-zinc-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <History className="h-3 w-3" />
                历史日志 {liveGuest.phone && <span className="text-zinc-400 font-normal normal-case">· {liveGuest.phone}</span>}
                {guestHistory.length > 0 && <span className="text-zinc-400 font-normal">({guestHistory.length})</span>}
              </h4>
              {guestHistory.length > 8 && (
                <button className="text-[10px] text-blue-600 hover:underline"
                  onClick={() => setShowFullLog((s) => !s)}>
                  {showFullLog ? '收起' : `全部 ${guestHistory.length}`}
                </button>
              )}
            </div>
            {guestHistory.length === 0 ? (
              <div className="text-[11px] text-zinc-400 italic py-2 text-center">
                {liveGuest.phone ? '该住客尚无历史记录' : '未填写手机号,无法关联历史记录'}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-60 overflow-y-auto">
                {visibleLog.map((entry) => <LogEntry key={entry.id} entry={entry} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/60 gap-2">
          <Button variant="outline" onClick={onClose} size="sm">关闭</Button>
          {liveBed && (
            <Button variant="destructive" size="sm" onClick={() => onCheckout(liveBed.id)}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />退房
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
