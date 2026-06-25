import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useHostel } from '../HostelContext';
import { Users, Info, IdCard, CheckCircle2, ChevronRight, BedDouble, Plus, Calendar as CalendarIcon, User as UserIcon, Globe, FileText, Link as LinkIcon, ArrowRight, Search, LogOut, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation, formatCurrency } from '../i18nContext';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ICalImport } from './ICalImport';
import { EditGuestInfoModal } from './EditGuestInfoModal';
import { AutoAssignConfirmDialog } from './AutoAssignConfirmDialog';
import { Guest, Bed, Room } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getSourceConfig, getPaymentStatusClass } from '../utils/guestDisplay';
import { scoreBeds, getRoomSummaries, type BedScore } from '../utils/bedAllocator';
import { EmptyState } from './EmptyState';

const COUNTRY_MAP: Record<string, string> = {
  US: 'USA', GBR: 'United Kingdom', AU: 'Australia',
  ESP: 'Spain', CN: 'China', FR: 'France', DE: 'Germany'
};
type SubTab = 'pending' | 'checked-in' | 'reserved';

function FieldRow({ icon, iconBg, label, value, placeholder, children }: {
  icon: string; iconBg: string; label: string; value?: string; placeholder: string; children?: React.ReactNode;
}) {
  const hasValue = !!value && value.length > 0;
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-b-0">
      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0", iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
        {children ? children : (
          <div className={cn("truncate text-sm", hasValue ? "text-foreground font-semibold" : "text-muted-foreground italic font-normal")}>
            {hasValue ? value : placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckInPanel({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { arrivals, rooms, assignArrival, autoAssignBed, settlePayment, scanPassport, addArrival, updateArrival, importArrivals, checkoutGuest, cancelArrival, undoCheckout } = useHostel();
  const { t, language } = useTranslation();
  const AVG_PRICE = useMemo(() => rooms.length > 0 ? Math.round(rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length) : 85, [rooms]);
  const [subTab, setSubTab] = useState<SubTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pending tab state
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [icalOpen, setIcalOpen] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editRoomPref, setEditRoomPref] = useState('');
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  // Auto-assign confirm dialog state
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [pendingAutoAssign, setPendingAutoAssign] = useState<BedScore | null>(null);

  // New guest state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [newGuestRef, setNewGuestRef] = useState({
    firstName: '', lastName: '',
    countryCode: '', gender: 'male' as "male" | "female" | "other",
    checkInDate: format(new Date(), 'yyyy-MM-dd'), checkOutDate: format(tomorrow, 'yyyy-MM-dd'),
    phone: '', email: '',
    idType: 'passport' as "passport" | "idCard" | "driverLicense",
    passportOrId: '', arrivalTime: '' as "" | "morning" | "afternoon" | "evening" | "late",
    roomPreference: '' as '' | 'dorm-mixed' | 'dorm-female' | 'private',
    bedPreference: '' as '' | 'top' | 'bottom' | 'any',
    bookingSource: 'walk-in' as "walk-in" | "hostelworld" | "booking-com" | "airbnb" | "google" | "other-ota",
    notes: '',
  });

  const selectedGuest = arrivals.find(g => g.id === selectedGuestId);

  React.useEffect(() => {
    if (selectedGuest) {
      setEditNotes(selectedGuest.notes || '');
      setEditRoomPref(selectedGuest.roomPreference || '');
    }
  }, [selectedGuestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const emptyBeds = useMemo(() => rooms.flatMap(r =>
    r.beds.filter(b => b.status === 'empty').map(b => ({ ...b, roomType: r.type, roomNumber: r.number }))
  ), [rooms]);

  // Scored beds for the selected guest (sorted by recommendation)
  const scoredBeds = useMemo(() => {
    if (!selectedGuest || selectedGuestId === 'NEW') return [];
    return scoreBeds(selectedGuest, rooms);
  }, [selectedGuest, rooms, selectedGuestId]);

  // Room summaries for Checked In tab
  const roomSummaries = useMemo(() => getRoomSummaries(rooms), [rooms]);

  // Gather checked-in guests
  const checkedInGuests = useMemo(() => rooms.flatMap(r =>
    r.beds.filter(b => b.guest).map(b => ({
      guest: b.guest!, bed: b, room: r,
    }))
  ), [rooms]);

  // Gather reserved guests (future reservations on beds)
  const reservedGuests = useMemo(() => rooms.flatMap(r =>
    r.beds.flatMap(b => (b.reservations || []).map(res => ({
      guest: res, bed: b, room: r,
    })))
  ), [rooms]);

  // Counts
  const pendingCount = arrivals.length;
  const checkedInCount = checkedInGuests.length;
  const reservedCount = reservedGuests.length;

  const handleCheckIn = () => {
    if (selectedGuestId && selectedBedId) {
      const guestName = selectedGuest?.name || '';
      setIsProcessing(true);
      // 使用微任务延迟，确保 spinner 能渲染
      requestAnimationFrame(() => {
        assignArrival(selectedGuestId, selectedBedId);
        setSelectedGuestId(null);
        setSelectedBedId(null);
        setCheckInSuccess(guestName);
        toast.success(`${guestName} 已入住`, { duration: 4000 });
        setTimeout(() => setCheckInSuccess(null), 5000);
        setIsProcessing(false);
      });
    }
  };

  const handleCreateArrival = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestRef.firstName || !newGuestRef.lastName || !newGuestRef.countryCode || !newGuestRef.checkInDate || !newGuestRef.checkOutDate || !newGuestRef.gender) {
      toast.error('请填写必填字段');
      return;
    }
    const countryName = COUNTRY_MAP[newGuestRef.countryCode.toUpperCase()] || newGuestRef.countryCode.toUpperCase();
    const checkIn = parseISO(newGuestRef.checkInDate);
    const checkOut = parseISO(newGuestRef.checkOutDate);
    const calculatedNights = Math.max(1, differenceInDays(checkOut, checkIn));
    addArrival({
      name: [newGuestRef.firstName, newGuestRef.lastName].filter(Boolean).join(' '),
      firstName: newGuestRef.firstName,
      lastName: newGuestRef.lastName,
      country: countryName, countryCode: newGuestRef.countryCode.toUpperCase(),
      gender: newGuestRef.gender,
      checkInDate: newGuestRef.checkInDate, checkOutDate: newGuestRef.checkOutDate,
      nights: calculatedNights,
      paymentStatus: 'unpaid' as const, totalAmount: calculatedNights * AVG_PRICE,
      phone: newGuestRef.phone, email: newGuestRef.email,
      passportScanned: true, passportOrId: newGuestRef.passportOrId,
      idType: newGuestRef.idType,
      arrivalTime: newGuestRef.arrivalTime || undefined,
      roomPreference: newGuestRef.roomPreference || undefined,
      bedPreference: newGuestRef.bedPreference || undefined,
      bookingSource: newGuestRef.bookingSource,
      notes: newGuestRef.notes,
      source: 'walk-in' as const,
    });
    toast.success(`${newGuestRef.firstName} ${newGuestRef.lastName} 已添加到待入住列表`);
    setSelectedGuestId(null);
    setNewGuestRef({
      firstName: '', lastName: '',
      countryCode: '', gender: 'male' as "male" | "female" | "other",
      checkInDate: format(new Date(), 'yyyy-MM-dd'), checkOutDate: format(tomorrow, 'yyyy-MM-dd'),
      phone: '', email: '',
      idType: 'passport' as "passport" | "idCard" | "driverLicense",
      passportOrId: '', arrivalTime: '' as "" | "morning" | "afternoon" | "evening" | "late",
      roomPreference: '' as '' | 'dorm-mixed' | 'dorm-female' | 'private',
      bedPreference: '' as '' | 'top' | 'bottom' | 'any',
      bookingSource: 'walk-in' as "walk-in" | "hostelworld" | "booking-com" | "airbnb" | "google" | "other-ota",
      notes: '',
    });
  };

  // 收款 + toast
  const handleCollectPayment = (guestId: string, guestName: string, amount?: number) => {
    settlePayment(guestId);
    toast.success(`已收款 ${amount ? formatCurrency(amount, language) : ''} — ${guestName}`);
  };

  // 退房 + 撤销 toast
  const handleCheckout = (bedId: string, guestName: string, guestSnapshot: Guest) => {
    checkoutGuest(bedId);
    toast(`${guestName} 已退房`, {
      duration: 6000,
      action: {
        label: '撤销',
        onClick: () => {
          undoCheckout(bedId, guestSnapshot);
          toast.success(`已撤销退房 — ${guestName} 已恢复`);
        },
      },
    });
  };

  // 取消到达 + 撤销 toast
  const handleCancelArrival = (guestId: string, guestName: string, guestSnapshot: Guest) => {
    cancelArrival(guestId);
    toast(`${guestName} 已取消`, {
      duration: 6000,
      action: {
        label: '撤销',
        onClick: () => {
          addArrival({ ...guestSnapshot });
          toast.success(`已恢复 — ${guestName}`);
        },
      },
    });
  };

  // Notes 防抖更新
  const handleNotesChange = useCallback((value: string, guestId: string) => {
    setEditNotes(value);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      updateArrival(guestId, { notes: value });
    }, 500);
  }, [updateArrival]);

  // Filter helpers
  const filterList = <T extends { guest: Guest; bed: Bed; room: Room }>(list: T[]): T[] => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item =>
      item.guest.name.toLowerCase().includes(q) || item.guest.country.toLowerCase().includes(q)
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Check-in Success Banner */}
      <AnimatePresence>
        {checkInSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 18, stiffness: 280 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-success-foreground px-4 sm:px-5 py-3 rounded-xl shadow-modal flex items-center gap-3 max-w-[calc(100vw-2rem)]"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', damping: 12, stiffness: 200 }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            </motion.div>
            <span className="text-sm font-medium">{checkInSuccess} {t('checkin.checkedInSuccess') || 'checked in successfully!'}</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-success-foreground hover:bg-success/80 gap-1 ml-2"
              onClick={() => { setCheckInSuccess(null); setActiveTab?.('bedboard'); }}>
              {t('checkin.viewOnBoard') || 'View on Board'} <ArrowRight className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub Tab Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-w-full">
          {([
            { id: 'pending' as SubTab, label: t('checkin.pending') || 'Pending', count: pendingCount, color: 'text-chart-3' },
            { id: 'checked-in' as SubTab, label: t('checkin.checkedIn') || 'Checked In', count: checkedInCount, color: 'text-chart-5' },
            { id: 'reserved' as SubTab, label: t('checkin.reserved') || 'Reserved', count: reservedCount, color: 'text-chart-1' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0",
                subTab === tab.id ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {tab.label}
              <span className={cn("text-xs font-bold", subTab === tab.id ? tab.color : "text-muted-foreground/70")}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder={t('reservations.searchBookings') || 'Search guests...'}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* ── Pending Tab ── */}
      {subTab === 'pending' && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          {/* Arrivals List */}
          <div className="w-full md:w-72 flex-shrink-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-card max-h-[260px] md:max-h-none">
            <div className="p-3 border-b border-border bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.pending')}</span>
              <span className="bg-muted text-foreground px-2 py-0.5 rounded-full text-xs font-bold">{pendingCount}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <button onClick={() => { setSelectedGuestId('NEW'); setSelectedBedId(null); }}
                className={cn("w-full text-left p-3 rounded-xl border border-dashed transition-all cursor-pointer flex items-center gap-2.5",
                  selectedGuestId === 'NEW' ? 'border-primary bg-primary text-primary-foreground shadow-pop' : 'border-border bg-card hover:bg-accent/50 hover:border-primary/40 text-foreground')}>
                <div className={cn("p-1 rounded-lg transition-colors", selectedGuestId === 'NEW' ? 'bg-primary/80 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  <Plus className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs">{t('checkin.newWalkIn')}</span>
              </button>
              <button onClick={() => setIcalOpen(true)}
                className="w-full text-left p-2.5 rounded-xl border border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 transition-all cursor-pointer flex items-center gap-2.5">
                <div className="p-1 rounded-lg bg-purple-100 text-purple-600"><LinkIcon className="w-3.5 h-3.5" /></div>
                <span className="font-medium text-xs text-purple-700">{t('checkin.importICal')}</span>
              </button>
              {arrivals.map(guest => (
                <div key={guest.id} className="relative">
                  <button onClick={() => { setSelectedGuestId(guest.id); setSelectedBedId(null); }}
                    className={cn("w-full text-left p-3 pr-9 rounded-xl transition-all cursor-pointer",
                      selectedGuestId === guest.id ? 'bg-primary text-primary-foreground shadow-pop' : 'bg-card hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-card border border-border')}>
                    <div className="font-medium text-xs flex items-center justify-between">
                      {guest.name}
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", selectedGuestId === guest.id ? 'text-primary-foreground/60' : 'text-muted-foreground group-hover:translate-x-0.5')} />
                    </div>
                    <div className={cn("text-xs mt-0.5", selectedGuestId === guest.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {guest.countryCode} · {guest.nights}N
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelArrival(guest.id, guest.name, guest);
                    }}
                    className={cn("absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-md transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center",
                      selectedGuestId === guest.id
                        ? 'text-primary-foreground/60 hover:text-destructive hover:bg-primary-foreground/10'
                        : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10')}
                    title={t('checkin.cancelArrival') || 'Cancel arrival'}
                    aria-label={t('checkin.cancelArrival') || 'Cancel arrival'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {arrivals.length === 0 && (
                <EmptyState
                  emoji="🧳"
                  title={t('checkin.noPending') || 'No pending arrivals'}
                  description={t('checkin.noPendingDesc') || 'Add a walk-in guest or import from iCal to get started'}
                  actionLabel={t('checkin.newWalkIn')}
                  onAction={() => { setSelectedGuestId('NEW'); setSelectedBedId(null); }}
                  compact
                />
              )}
            </div>
          </div>

          {/* Check-in Details */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {selectedGuestId === 'NEW' ? (
              <div className="bg-card p-5 rounded-2xl border border-border shadow-card">
                <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-muted-foreground" />{t('checkin.walkInRegistration') || t('checkin.newWalkIn')}
                </h2>
                <form onSubmit={handleCreateArrival} className="space-y-4">
                  {/* ── Section 1: Personal Info ── */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Personal Info</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.firstName')}<span className="text-red-500">*</span></Label>
                        <Input required autoComplete="given-name" value={newGuestRef.firstName} onChange={e => setNewGuestRef({...newGuestRef, firstName: e.target.value})} className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.lastName')}<span className="text-red-500">*</span></Label>
                        <Input required autoComplete="family-name" value={newGuestRef.lastName} onChange={e => setNewGuestRef({...newGuestRef, lastName: e.target.value})} className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.country')}<span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input required maxLength={3} inputMode="text" autoComplete="country-code" className="pl-8 h-10 bg-zinc-50 border-zinc-200 uppercase" placeholder="US" value={newGuestRef.countryCode} onChange={e => setNewGuestRef({...newGuestRef, countryCode: e.target.value.toUpperCase()})} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.phone')}<span className="text-red-500">*</span></Label>
                        <Input required type="tel" inputMode="tel" autoComplete="tel" value={newGuestRef.phone} onChange={e => setNewGuestRef({...newGuestRef, phone: e.target.value})} placeholder="+1-555-0100" className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.email')}<span className="text-red-500">*</span></Label>
                        <Input required type="email" inputMode="email" autoComplete="email" value={newGuestRef.email} onChange={e => setNewGuestRef({...newGuestRef, email: e.target.value})} placeholder="john@mail.com" className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('guest.gender') || 'Gender'}<span className="text-red-500">*</span></Label>
                        <Select required value={newGuestRef.gender} onValueChange={(val: string) => {
                          // If changing to male and roomPreference is female-only, reset it
                          const updates: Partial<typeof newGuestRef> = { gender: val as "male" | "female" | "other" };
                          if (val === 'male' && newGuestRef.roomPreference === 'dorm-female') {
                            updates.roomPreference = '';
                          }
                          setNewGuestRef({...newGuestRef, ...updates});
                        }}>
                          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t('guest.male') || 'Male'}</SelectItem>
                            <SelectItem value="female">{t('guest.female') || 'Female'}</SelectItem>
                            <SelectItem value="other">{t('guest.other') || 'Other'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 2: Stay ── */}
                  <div className="space-y-3 pt-3 border-t border-zinc-100">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stay</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.checkInDate')}<span className="text-red-500">*</span></Label>
                        <Input type="date" required className="h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkInDate} onChange={e => setNewGuestRef({...newGuestRef, checkInDate: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.checkOutDate')}<span className="text-red-500">*</span></Label>
                        <Input type="date" required className="h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkOutDate} onChange={e => setNewGuestRef({...newGuestRef, checkOutDate: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.arrivalTime.label')}</Label>
                        <Select value={newGuestRef.arrivalTime} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, arrivalTime: val as "morning" | "afternoon" | "evening" | "late"})}>
                          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">{t('checkin.arrivalTime.morning')}</SelectItem>
                            <SelectItem value="afternoon">{t('checkin.arrivalTime.afternoon')}</SelectItem>
                            <SelectItem value="evening">{t('checkin.arrivalTime.evening')}</SelectItem>
                            <SelectItem value="late">{t('checkin.arrivalTime.late')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.roomPreference')}</Label>
                        <Select value={newGuestRef.roomPreference} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, roomPreference: val as '' | 'dorm-mixed' | 'dorm-female' | 'private'})}>
                          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {newGuestRef.gender === 'female' && (
                              <SelectItem value="dorm-female">{t('bedboard.femaleDorm')}</SelectItem>
                            )}
                            <SelectItem value="dorm-mixed">{t('bedboard.mixedDorm')}</SelectItem>
                            <SelectItem value="private">{t('bedboard.private')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:w-1/3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.bedPreference') || 'Bed Preference'}</Label>
                        <Select value={newGuestRef.bedPreference} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, bedPreference: val as '' | 'top' | 'bottom' | 'any'})}>
                          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">{t('checkin.noPreference') || 'No preference'}</SelectItem>
                            <SelectItem value="bottom">{t('checkin.bottomBunk') || 'Bottom bunk'}</SelectItem>
                            <SelectItem value="top">{t('checkin.topBunk') || 'Top bunk'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 3: ID & Source ── */}
                  <div className="space-y-3 pt-3 border-t border-zinc-100">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ID &amp; Source</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.idType.label')}<span className="text-red-500">*</span></Label>
                        <Select required value={newGuestRef.idType} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, idType: val as "passport" | "idCard" | "driverLicense"})}>
                          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="passport">{t('checkin.idType.passport')}</SelectItem>
                            <SelectItem value="idCard">{t('checkin.idType.idCard')}</SelectItem>
                            <SelectItem value="driverLicense">{t('checkin.idType.driverLicense')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.passportOrId')}<span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input required className="pl-8 h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.passportOrId} onChange={e => setNewGuestRef({...newGuestRef, passportOrId: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">{t('checkin.source.label')}</Label>
                        <Select value={newGuestRef.bookingSource} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, bookingSource: val as "walk-in" | "hostelworld" | "booking-com" | "airbnb" | "google" | "other-ota"})}>
                          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="walk-in">{t('checkin.source.walkIn')}</SelectItem>
                            <SelectItem value="hostelworld">Hostelworld</SelectItem>
                            <SelectItem value="booking-com">Booking.com</SelectItem>
                            <SelectItem value="airbnb">Airbnb</SelectItem>
                            <SelectItem value="google">Google</SelectItem>
                            <SelectItem value="other-ota">{t('checkin.source.otherOta')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5"><FileText className="w-3 h-3" />{t('checkin.notes')}</Label>
                      <Input className="h-10 bg-zinc-50 border-zinc-200" placeholder="E.g., Prefers bottom bunk" value={newGuestRef.notes} onChange={e => setNewGuestRef({...newGuestRef, notes: e.target.value})} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex justify-end">
                    <Button type="submit" size="lg" className="h-11 px-6 text-sm shadow-sm w-full sm:w-auto">{t('checkin.createArrival')}</Button>
                  </div>
                </form>
              </div>
            ) : selectedGuest ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* ── Left 60%: Info Card ── */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Header Card */}
                  <div className="bg-card p-5 rounded-2xl border border-border shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-xl font-extrabold text-foreground truncate">
                          {[selectedGuest.firstName, selectedGuest.lastName].filter(Boolean).join(' ') || selectedGuest.name}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-info/10 text-info text-xs font-bold">
                            {selectedGuest.countryCode || selectedGuest.country}
                          </span>
                          {selectedGuest.gender && (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold",
                              selectedGuest.gender === 'female' ? 'bg-pink-50 text-pink-700' :
                              selectedGuest.gender === 'male' ? 'bg-sky-50 text-sky-700' :
                              'bg-muted text-muted-foreground')}>
                              {selectedGuest.gender === 'female' ? '♀' : selectedGuest.gender === 'male' ? '♂' : '○'} {t(`guest.${selectedGuest.gender}`) || selectedGuest.gender}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{selectedGuest.nights} {t('dashboard.nights')} · {t('checkin.checkout')} {selectedGuest.checkOutDate}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-9 text-xs shrink-0" onClick={() => setEditInfoOpen(true)}>
                        ✎ {t('checkin.editInfo')}
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {selectedGuest.paymentStatus === 'unpaid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-bold">
                          ⚠ {t('checkin.paymentDue')} {formatCurrency(selectedGuest.totalAmount ?? (selectedGuest.nights * AVG_PRICE), language)}
                        </span>
                      )}
                      {selectedGuest.paymentStatus === 'paid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-bold">
                          ✓ {t('checkin.paid')}
                        </span>
                      )}
                      {selectedGuest.arrivalTime && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-info/10 text-info text-xs font-bold">
                          🕒 {t(`checkin.arrivalTime.${selectedGuest.arrivalTime}`)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact + ID Card */}
                  <div className="bg-card p-5 rounded-2xl border border-border shadow-card">
                    {/* Contact Section */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <div className="text-xs font-extrabold text-blue-500 uppercase tracking-wider">{t('checkin.contactSection')}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
                      <FieldRow icon="📧" iconBg="bg-blue-50" label={t('checkin.email')} value={selectedGuest.email} placeholder={t('checkin.notProvided')} />
                      <FieldRow icon="📞" iconBg="bg-blue-50" label={t('checkin.phone')} value={selectedGuest.phone} placeholder={t('checkin.notProvided')} />
                      <FieldRow icon="🕒" iconBg="bg-blue-50" label={t('checkin.arrivalTime.label')} value={selectedGuest.arrivalTime ? t(`checkin.arrivalTime.${selectedGuest.arrivalTime}`) : undefined} placeholder={t('checkin.notProvided')} />
                      <div className="col-span-1 sm:col-span-2">
                        <FieldRow icon="📋" iconBg="bg-blue-50" label={t('checkin.source.label')} value="" placeholder="">
                          <Select value={selectedGuest.bookingSource ?? 'walk-in'} onValueChange={(val: string) => updateArrival(selectedGuest.id, { bookingSource: val as Guest['bookingSource'] })}>
                            <SelectTrigger className="h-9 sm:h-7 text-xs bg-zinc-100 border-zinc-200 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="walk-in">{t('checkin.source.walkIn')}</SelectItem>
                              <SelectItem value="hostelworld">Hostelworld</SelectItem>
                              <SelectItem value="booking-com">Booking.com</SelectItem>
                              <SelectItem value="airbnb">Airbnb</SelectItem>
                              <SelectItem value="google">Google</SelectItem>
                              <SelectItem value="other-ota">{t('checkin.source.otherOta')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                      </div>
                    </div>

                    {/* ID Section */}
                    <div className="border-t border-zinc-100 mt-2 pt-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        <div className="text-xs font-extrabold text-violet-500 uppercase tracking-wider">{t('checkin.idSection')}</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
                        <FieldRow icon="🛂" iconBg="bg-violet-50" label={t('checkin.idType.label')} value={selectedGuest.idType ? t(`checkin.idType.${selectedGuest.idType}`) : undefined} placeholder={t('checkin.notProvided')}>
                          {selectedGuest.passportScanned && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-900">{selectedGuest.idType ? t(`checkin.idType.${selectedGuest.idType}`) : t('checkin.notProvided')}</span>
                              <span className="inline-flex items-center px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-bold">✓</span>
                            </div>
                          )}
                        </FieldRow>
                        <FieldRow icon="#" iconBg="bg-violet-50" label={t('checkin.passportOrId')} value={selectedGuest.passportOrId} placeholder={t('checkin.notProvided')} />
                        <FieldRow icon="👥" iconBg="bg-violet-50" label={t('guest.gender') || 'Gender'} value={selectedGuest.gender ? t(`guest.${selectedGuest.gender}`) || selectedGuest.gender : undefined} placeholder={t('checkin.notProvided')} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Right 40%: Actions Stack ── */}
                <div className="lg:col-span-2 space-y-4">
                  <Card className="p-3 border-border bg-card shadow-card">
                    <div className="flex flex-col gap-0">
                      {/* Verification */}
                      <div className="flex items-center justify-between py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs",
                            selectedGuest.passportScanned ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                            {selectedGuest.passportScanned ? '✓' : '○'}
                          </div>
                          <span className={cn("text-sm font-semibold", selectedGuest.passportScanned ? 'text-success' : 'text-muted-foreground')}>
                            {selectedGuest.passportScanned ? t('checkin.verified') : t('checkin.scanPassport')}
                          </span>
                        </div>
                        {!selectedGuest.passportScanned && (
                          <Button variant="outline" size="sm" className="h-9 text-xs px-3" onClick={() => scanPassport(selectedGuest.id)}>{t('checkin.scanPassport')}</Button>
                        )}
                      </div>
                      {/* Payment */}
                      <div className="flex items-center justify-between py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs",
                            selectedGuest.paymentStatus === 'unpaid' ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success')}>
                            {selectedGuest.paymentStatus === 'unpaid' ? '⚠' : '✓'}
                          </div>
                          <span className={cn("text-sm font-semibold", selectedGuest.paymentStatus === 'unpaid' ? 'text-destructive' : 'text-success')}>
                            {selectedGuest.paymentStatus === 'unpaid'
                              ? `${formatCurrency(selectedGuest.totalAmount ?? (selectedGuest.nights * AVG_PRICE), language)} ${t('checkin.unpaid')}`
                              : t('checkin.allSettled')}
                          </span>
                        </div>
                        {selectedGuest.paymentStatus === 'unpaid' && (
                          <Button size="sm" variant="destructive" className="h-9 text-xs px-3 min-w-[64px]" onClick={() => handleCollectPayment(selectedGuest.id, selectedGuest.name, selectedGuest.totalAmount)}>{t('checkin.collect')}</Button>
                        )}
                      </div>
                      {/* Notes */}
                      <div className="flex items-center gap-2 py-2.5">
                        <div className="w-6 h-6 rounded-md bg-warning/15 flex items-center justify-center text-xs text-warning">📝</div>
                        <Input className="h-9 bg-muted border-border text-xs flex-1" placeholder="..." value={editNotes}
                          onChange={e => { if (selectedGuest) handleNotesChange(e.target.value, selectedGuest.id); }} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-success/30 shadow-card">
                    <Label className="text-xs text-success font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" />{t('checkin.assignBed')}
                    </Label>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t('checkin.recommendationFor') || 'For'}
                      <span className="font-bold text-pink-600">{selectedGuest.gender === 'female' ? ' ♀ Female' : selectedGuest.gender === 'male' ? ' ♂ Male' : ''}</span>
                      {selectedGuest.roomPreference && (
                        <> · <span className="font-bold text-info">{t('checkin.prefers') || 'prefers'} {selectedGuest.roomPreference}</span></>
                      )}
                    </div>
                    <Button size="lg" className="w-full h-11 sm:h-10 text-sm mb-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-pop disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                      disabled={!scoredBeds.length || selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial'}
                      onClick={() => {
                        if (!scoredBeds.length) return;
                        // Open mobile-first confirmation sheet/dialog
                        setPendingAutoAssign(scoredBeds[0]);
                        setAutoAssignOpen(true);
                      }}>
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      {t('checkin.autoAssign') || 'Auto Assign & Check-in'}
                    </Button>
                    {(selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial') && (
                      <p className="text-xs text-warning mb-2 -mt-1 font-medium">⚠ {t('checkin.collectBeforeAssign') || 'Please collect payment first before assigning a bed'}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
                      {scoredBeds.map((score, idx) => {
                        const isTop = idx === 0;
                        const isSelected = selectedBedId === score.bedId;
                        const showBestTag = isTop && !isSelected;
                        const totalForStay = Math.round(score.pricePerNight * selectedGuest.nights * 100) / 100;
                        const priceDiff = score.pricePerNight - AVG_PRICE;
                        const roomTypeName = score.roomType === 'dorm-mixed' ? t('bedboard.mixedDorm') : score.roomType === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private');
                        const bedTypeName = score.bedType === 'bottom' ? t('checkin.bottomBunk') : t('checkin.topBunk');
                        return (
                          <button key={score.bedId} onClick={() => setSelectedBedId(score.bedId)}
                            className={cn("p-3 sm:p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer relative min-h-[140px] sm:min-h-[150px] flex flex-col hover:-translate-y-0.5",
                              isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/20 shadow-pop scale-[1.02]' :
                              isTop ? 'border-success/60 bg-success/5 hover:border-success hover:shadow-pop' :
                              'border-border bg-card hover:border-primary/40 hover:shadow-pop')}>
                            {showBestTag && <span className="absolute -top-2.5 left-3 text-xs font-extrabold bg-success text-success-foreground px-2.5 py-0.5 rounded-full shadow-pop ring-2 ring-card">★ BEST MATCH</span>}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-sm text-foreground truncate">{roomTypeName}</span>
                              <span className="text-xs text-muted-foreground shrink-0">R{score.roomNumber}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {score.bedName} · {bedTypeName}
                            </div>
                            <div className="flex items-baseline gap-1 mb-1.5">
                              <span className="text-xl font-extrabold text-foreground">
                                {formatCurrency(score.pricePerNight, language)}
                              </span>
                              <span className="text-xs text-muted-foreground">/night</span>
                            </div>
                            <div className="text-xs text-foreground mb-2 px-2 py-1 bg-muted/50 rounded">
                              × {selectedGuest.nights} {t('dashboard.nights')} = <span className="font-bold text-foreground">{formatCurrency(totalForStay, language)}</span>
                              {priceDiff !== 0 && (
                                <span className={cn("ml-1 text-xs", priceDiff > 0 ? 'text-warning' : 'text-success')}>
                                  ({priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff, language)} vs avg)
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-auto">
                              {score.bedTierMatch && <span className="text-xs font-bold bg-warning/15 text-warning px-1.5 py-0.5 rounded">💰 {t('checkin.tagTierMatch')}</span>}
                              {score.genderMatch && <span className="text-xs font-bold bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">♀ {t('checkin.tagGender')}</span>}
                              {score.preferenceMatch && <span className="text-xs font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">✓ {t('checkin.tagPref')}</span>}
                              {score.fillExisting && <span className="text-xs font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">▣ {t('checkin.tagFill')}</span>}
                              {score.fragmentationScore >= 7 && <span className="text-xs font-bold bg-success/15 text-success px-1.5 py-0.5 rounded">◇ {t('checkin.tagLowFrag')}</span>}
                            </div>
                          </button>
                        );
                      })}
                      {scoredBeds.length === 0 && (
                        <div className="col-span-full py-3 text-center text-xs text-destructive">{t('checkin.noAvailableBeds') || 'No suitable beds available'}</div>
                      )}
                    </div>
                    {(selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial') && (
                      <p className="text-xs font-medium text-warning mt-1.5">⚠️ {t('checkin.unpaidWarning')}</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-border flex justify-end gap-2">
                      <Button size="lg"
                        disabled={!selectedBedId || !selectedGuest.passportScanned || selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial' || isProcessing}
                        onClick={handleCheckIn}
                        className="w-full sm:w-auto h-11 sm:h-10 px-5 text-sm shadow-pop bg-primary hover:bg-primary/90 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed">
                        {isProcessing ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('checkin.processing') || 'Processing...'}</>
                        ) : (
                          t('checkin.completeCheckIn')
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>

                <EditGuestInfoModal
                  open={editInfoOpen}
                  onClose={() => setEditInfoOpen(false)}
                  guest={selectedGuest}
                  onSave={(updates) => updateArrival(selectedGuest.id, updates)}
                />

                {/* Auto-assign confirmation (mobile: bottom sheet / desktop: modal) */}
                {autoAssignOpen && pendingAutoAssign && (
                  <AutoAssignConfirmDialog
                    open={autoAssignOpen}
                    onClose={() => setAutoAssignOpen(false)}
                    onConfirm={() => {
                      const result = autoAssignBed(selectedGuest.id);
                      if (result) {
                        setCheckInSuccess(selectedGuest.name);
                        setSelectedGuestId(null);
                        setSelectedBedId(null);
                        setAutoAssignOpen(false);
                        setPendingAutoAssign(null);
                      }
                    }}
                    guest={selectedGuest}
                    recommendedBed={pendingAutoAssign}
                    totalForStay={Math.round(pendingAutoAssign.pricePerNight * selectedGuest.nights * 100) / 100}
                    AVG_PRICE={AVG_PRICE}
                  />
                )}
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-border rounded-2xl flex items-center justify-center bg-muted/30">
                <EmptyState
                  emoji="👋"
                  title={t('checkin.selectGuestToBegin')}
                  description={t('checkin.selectGuestDesc') || 'Pick a guest from the left or create a new walk-in'}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Checked In Tab ── */}
      {subTab === 'checked-in' && (
        <div className="flex-1 overflow-auto">
          {/* Room Summaries */}
          <div className="mb-3 p-3 bg-card rounded-xl border border-border shadow-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t('checkin.roomStatus') || 'Room Status'}</h4>
            <div className="space-y-1">
              {roomSummaries.map(s => (
                <div key={s.roomId} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-muted/60">
                  <span className="text-muted-foreground font-medium">
                    {s.roomType === 'dorm-mixed' ? t('bedboard.mixedDorm') : s.roomType === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private')} R{s.roomNumber}
                  </span>
                  <span className={cn("text-xs font-bold",
                    s.occupiedBeds === s.totalBeds ? "text-destructive" :
                    s.occupiedBeds > 0 ? "text-warning" : "text-success")}>
                    {s.occupiedBeds}/{s.totalBeds}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* 移动端卡片列表 */}
          <div className="md:hidden space-y-2">
            {filterList(checkedInGuests).map(({ guest, bed, room }) => (
              <motion.div
                key={`${guest.id}-${bed.id}`}
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-xl border border-border p-3 shadow-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-xs">{guest.name.charAt(0)}</div>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{guest.name}</span>
                      <span className="text-xs text-muted-foreground block">{guest.countryCode}</span>
                    </div>
                  </div>
                  <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase",
                    guest.paymentStatus === 'paid' ? 'text-success bg-success/10' :
                    guest.paymentStatus === 'unpaid' ? 'text-destructive bg-destructive/10' : 'text-warning bg-warning/10')}>
                    {guest.paymentStatus === 'paid' ? t('checkin.paid') : guest.paymentStatus === 'unpaid' ? t('checkin.unpaid') : t('checkin.partial')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-medium">{format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d')} · {guest.nights}N</span>
                  <span className="font-semibold text-foreground">{bed.name} · {room.name || room.number}</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  onClick={() => handleCheckout(bed.id, guest.name, guest)}>
                  <LogOut className="h-3 w-3" /> {t('checkin.checkout') || 'Checkout'}
                </Button>
              </motion.div>
            ))}
            {filterList(checkedInGuests).length === 0 && (
              <EmptyState
                emoji="🛏️"
                title={t('checkin.noCheckedIn') || 'No checked-in guests'}
                description={t('checkin.noCheckedInDesc') || 'Guests will appear here once they check in'}
                compact
              />
            )}
          </div>
          {/* 桌面端表格 */}
          <div className="hidden md:block bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.guest')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.dates')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.bed')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.payment')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filterList(checkedInGuests).map(({ guest, bed, room }) => (
                  <tr key={`${guest.id}-${bed.id}`} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-xs">{guest.name.charAt(0)}</div>
                        <div>
                          <span className="text-xs font-semibold text-foreground">{guest.name}</span>
                          <span className="text-xs text-muted-foreground block">{guest.countryCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-foreground font-medium">{format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d')}</span>
                      <span className="text-xs text-muted-foreground block">{guest.nights}N</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-foreground">{bed.name}</span>
                      <span className="text-xs text-muted-foreground block">{room.name || room.number}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase",
                        guest.paymentStatus === 'paid' ? 'text-success bg-success/10' :
                        guest.paymentStatus === 'unpaid' ? 'text-destructive bg-destructive/10' : 'text-warning bg-warning/10')}>
                        {guest.paymentStatus === 'paid' ? t('checkin.paid') : guest.paymentStatus === 'unpaid' ? t('checkin.unpaid') : t('checkin.partial')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => handleCheckout(bed.id, guest.name, guest)}>
                        <LogOut className="h-3 w-3" /> {t('checkin.checkout') || 'Checkout'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filterList(checkedInGuests).length === 0 && (
              <EmptyState
                emoji="🛏️"
                title={t('checkin.noCheckedIn') || 'No checked-in guests'}
                description={t('checkin.noCheckedInDesc') || 'Guests will appear here once they check in'}
                compact
              />
            )}
          </div>
        </div>
      )}

      {/* ── Reserved Tab ── */}
      {subTab === 'reserved' && (
        <div className="flex-1 overflow-auto">
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.guest')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.dates')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.bed')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('reservations.payment')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filterList(reservedGuests).map(({ guest, bed, room }) => {
                  const src = getSourceConfig(guest.source);
                  return (
                    <tr key={`${guest.id}-${bed.id}`} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-xs">{guest.name.charAt(0)}</div>
                          <div>
                            <span className="text-xs font-semibold text-foreground">{guest.name}</span>
                            <span className="text-xs text-muted-foreground block">{guest.countryCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-foreground font-medium">{format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d')}</span>
                        <span className="text-xs text-muted-foreground block">{guest.nights}N</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-foreground">{bed.name}</span>
                        <span className="text-xs text-muted-foreground block">{room.name || room.number}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase",
                          guest.paymentStatus === 'paid' ? 'text-success bg-success/10' :
                          guest.paymentStatus === 'unpaid' ? 'text-destructive bg-destructive/10' : 'text-warning bg-warning/10')}>
                          {guest.paymentStatus === 'paid' ? t('checkin.paid') : guest.paymentStatus === 'unpaid' ? t('checkin.unpaid') : t('checkin.partial')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", src.cls)}>{t(src.labelKey)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filterList(reservedGuests).length === 0 && (
              <EmptyState
                emoji="📅"
                title={t('checkin.noReserved') || 'No upcoming reservations'}
                description={t('checkin.noReservedDesc') || 'Future reservations from iCal or manual bookings will show here'}
                compact
              />
            )}
          </div>
        </div>
      )}

      <ICalImport open={icalOpen} onClose={() => setIcalOpen(false)} onImport={(guests) => importArrivals(guests)} />
    </div>
  );
}
