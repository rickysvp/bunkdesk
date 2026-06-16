import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { Users, Info, IdCard, CheckCircle2, ChevronRight, BedDouble, Plus, Calendar as CalendarIcon, User as UserIcon, Globe, FileText, Link as LinkIcon, ArrowRight, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation, formatCurrency } from '../i18nContext';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ICalImport } from './ICalImport';
import { EditGuestInfoModal } from './EditGuestInfoModal';
import { Guest, Bed, Room } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getSourceConfig, getPaymentStatusClass } from '../utils/guestDisplay';
import { scoreBeds, getRoomSummaries, type BedScore } from '../utils/bedAllocator';

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
    <div className="flex items-center gap-2 py-2 border-b border-zinc-50 last:border-b-0">
      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0", iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{label}</div>
        {children ? children : (
          <div className={cn("truncate text-sm", hasValue ? "text-zinc-900 font-semibold" : "text-zinc-300 italic font-normal")}>
            {hasValue ? value : placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckInPanel({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { arrivals, rooms, assignArrival, autoAssignBed, settlePayment, scanPassport, addArrival, updateArrival, importArrivals, checkoutGuest } = useHostel();
  const { t, language } = useTranslation();
  const AVG_PRICE = useMemo(() => rooms.length > 0 ? Math.round(rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length) : 85, [rooms]);
  const [subTab, setSubTab] = useState<SubTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Pending tab state
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [icalOpen, setIcalOpen] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editRoomPref, setEditRoomPref] = useState('');
  const [editInfoOpen, setEditInfoOpen] = useState(false);

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
      assignArrival(selectedGuestId, selectedBedId);
      setSelectedGuestId(null);
      setSelectedBedId(null);
      setCheckInSuccess(guestName);
      setTimeout(() => setCheckInSuccess(null), 5000);
    }
  };

  const handleCreateArrival = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestRef.firstName || !newGuestRef.lastName || !newGuestRef.countryCode || !newGuestRef.checkInDate || !newGuestRef.checkOutDate || !newGuestRef.gender) return;
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

  // Filter helpers
  const filterList = <T extends { guest: Guest; bed: Bed; room: Room }>(list: T[]): T[] => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item =>
      item.guest.name.toLowerCase().includes(q) || item.guest.country.toLowerCase().includes(q)
    );
  };

  return (
    <div className="flex flex-col h-full pb-20 md:pb-0">
      {/* Check-in Success Banner */}
      <AnimatePresence>
        {checkInSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{checkInSuccess} {t('checkin.checkedInSuccess') || 'checked in successfully!'}</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-white hover:bg-emerald-700 gap-1 ml-2"
              onClick={() => { setCheckInSuccess(null); setActiveTab?.('bedboard'); }}>
              {t('checkin.viewOnBoard') || 'View on Board'} <ArrowRight className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub Tab Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {([
            { id: 'pending' as SubTab, label: t('checkin.pending') || 'Pending', count: pendingCount, color: 'text-amber-600' },
            { id: 'checked-in' as SubTab, label: t('checkin.checkedIn') || 'Checked In', count: checkedInCount, color: 'text-emerald-600' },
            { id: 'reserved' as SubTab, label: t('checkin.reserved') || 'Reserved', count: reservedCount, color: 'text-blue-600' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                subTab === tab.id ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
              )}>
              {tab.label}
              <span className={cn("text-xs font-bold", subTab === tab.id ? tab.color : "text-zinc-400")}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input className="pl-9 h-9" placeholder={t('reservations.searchBookings') || 'Search guests...'}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* ── Pending Tab ── */}
      {subTab === 'pending' && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          {/* Arrivals List */}
          <div className="w-full md:w-72 flex-shrink-0 flex flex-col bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.pending')}</span>
              <span className="bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full text-xs font-bold">{pendingCount}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <button onClick={() => { setSelectedGuestId('NEW'); setSelectedBedId(null); }}
                className={cn("w-full text-left p-3 rounded-xl border border-dashed transition-all cursor-pointer flex items-center gap-2.5",
                  selectedGuestId === 'NEW' ? 'border-zinc-900 bg-zinc-900 text-white shadow-md' : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700')}>
                <div className={cn("p-1 rounded-lg", selectedGuestId === 'NEW' ? 'bg-zinc-800' : 'bg-zinc-100 text-zinc-500')}>
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
                <button key={guest.id} onClick={() => { setSelectedGuestId(guest.id); setSelectedBedId(null); }}
                  className={cn("w-full text-left p-3 rounded-xl transition-all cursor-pointer",
                    selectedGuestId === guest.id ? 'bg-zinc-900 text-white shadow-md' : 'bg-white hover:bg-zinc-50 border border-zinc-100')}>
                  <div className="font-medium text-xs flex items-center justify-between">
                    {guest.name}
                    <ChevronRight className={cn("h-3.5 w-3.5", selectedGuestId === guest.id ? 'text-zinc-400' : 'text-zinc-300')} />
                  </div>
                  <div className={cn("text-[10px] mt-0.5", selectedGuestId === guest.id ? 'text-zinc-300' : 'text-zinc-500')}>
                    {guest.countryCode} · {guest.nights}N
                  </div>
                </button>
              ))}
              {arrivals.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-400">{t('checkin.noPending') || 'No pending arrivals'}</div>
              )}
            </div>
          </div>

          {/* Check-in Details */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {selectedGuestId === 'NEW' ? (
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900 tracking-tight mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-zinc-400" />{t('checkin.walkInRegistration') || t('checkin.newWalkIn')}
                </h2>
                <form onSubmit={handleCreateArrival} className="space-y-4">
                  {/* ── Section 1: Personal Info ── */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Personal Info</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.firstName')}<span className="text-red-500">*</span></Label>
                        <Input required value={newGuestRef.firstName} onChange={e => setNewGuestRef({...newGuestRef, firstName: e.target.value})} className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.lastName')}<span className="text-red-500">*</span></Label>
                        <Input required value={newGuestRef.lastName} onChange={e => setNewGuestRef({...newGuestRef, lastName: e.target.value})} className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.country')}<span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                          <Input required maxLength={3} className="pl-8 h-10 bg-zinc-50 border-zinc-200 uppercase" placeholder="US" value={newGuestRef.countryCode} onChange={e => setNewGuestRef({...newGuestRef, countryCode: e.target.value.toUpperCase()})} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.phone')}<span className="text-red-500">*</span></Label>
                        <Input required type="tel" value={newGuestRef.phone} onChange={e => setNewGuestRef({...newGuestRef, phone: e.target.value})} placeholder="+1-555-0100" className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.email')}<span className="text-red-500">*</span></Label>
                        <Input required type="email" value={newGuestRef.email} onChange={e => setNewGuestRef({...newGuestRef, email: e.target.value})} placeholder="john@mail.com" className="h-10 bg-zinc-50 border-zinc-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('guest.gender') || 'Gender'}<span className="text-red-500">*</span></Label>
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
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stay</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.checkInDate')}<span className="text-red-500">*</span></Label>
                        <Input type="date" required className="h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkInDate} onChange={e => setNewGuestRef({...newGuestRef, checkInDate: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.checkOutDate')}<span className="text-red-500">*</span></Label>
                        <Input type="date" required className="h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkOutDate} onChange={e => setNewGuestRef({...newGuestRef, checkOutDate: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.arrivalTime.label')}</Label>
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
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.roomPreference')}</Label>
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
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.bedPreference') || 'Bed Preference'}</Label>
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
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID &amp; Source</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.idType.label')}<span className="text-red-500">*</span></Label>
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
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.passportOrId')}<span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                          <Input required className="pl-8 h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.passportOrId} onChange={e => setNewGuestRef({...newGuestRef, passportOrId: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.source.label')}</Label>
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
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5"><FileText className="w-3 h-3" />{t('checkin.notes')}</Label>
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
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-xl font-extrabold text-zinc-900 truncate">
                          {[selectedGuest.firstName, selectedGuest.lastName].filter(Boolean).join(' ') || selectedGuest.name}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                            {selectedGuest.countryCode || selectedGuest.country}
                          </span>
                          {selectedGuest.gender && (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold",
                              selectedGuest.gender === 'female' ? 'bg-pink-50 text-pink-700' :
                              selectedGuest.gender === 'male' ? 'bg-sky-50 text-sky-700' :
                              'bg-zinc-100 text-zinc-600'
                            )}>
                              {selectedGuest.gender === 'female' ? '♀' : selectedGuest.gender === 'male' ? '♂' : '○'} {t(`guest.${selectedGuest.gender}`) || selectedGuest.gender}
                            </span>
                          )}
                          <span className="text-xs text-zinc-400">{selectedGuest.nights} {t('dashboard.nights')} · {t('checkin.checkout')} {selectedGuest.checkOutDate}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => setEditInfoOpen(true)}>
                        ✎ {t('checkin.editInfo')}
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {selectedGuest.paymentStatus === 'unpaid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                          ⚠ {t('checkin.paymentDue')} {formatCurrency(selectedGuest.totalAmount ?? (selectedGuest.nights * AVG_PRICE), language)}
                        </span>
                      )}
                      {selectedGuest.paymentStatus === 'paid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                          ✓ {t('checkin.paid')}
                        </span>
                      )}
                      {selectedGuest.arrivalTime && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                          🕒 {t(`checkin.arrivalTime.${selectedGuest.arrivalTime}`)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact + ID Card */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                    {/* Contact Section */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <div className="text-[11px] font-extrabold text-blue-500 uppercase tracking-wider">{t('checkin.contactSection')}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-5">
                      <FieldRow icon="📧" iconBg="bg-blue-50" label={t('checkin.email')} value={selectedGuest.email} placeholder={t('checkin.notProvided')} />
                      <FieldRow icon="📞" iconBg="bg-blue-50" label={t('checkin.phone')} value={selectedGuest.phone} placeholder={t('checkin.notProvided')} />
                      <FieldRow icon="🕒" iconBg="bg-blue-50" label={t('checkin.arrivalTime.label')} value={selectedGuest.arrivalTime ? t(`checkin.arrivalTime.${selectedGuest.arrivalTime}`) : undefined} placeholder={t('checkin.notProvided')} />
                      <div className="col-span-2">
                        <FieldRow icon="📋" iconBg="bg-blue-50" label={t('checkin.source.label')} value="" placeholder="">
                          <Select value={selectedGuest.bookingSource ?? 'walk-in'} onValueChange={(val: string) => updateArrival(selectedGuest.id, { bookingSource: val as Guest['bookingSource'] })}>
                            <SelectTrigger className="h-7 text-xs bg-zinc-100 border-zinc-200 w-32">
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
                        <div className="text-[11px] font-extrabold text-violet-500 uppercase tracking-wider">{t('checkin.idSection')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-5">
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
                  <Card className="p-3 border-zinc-200 bg-white shadow-none">
                    <div className="flex flex-col gap-0">
                      {/* Verification */}
                      <div className="flex items-center justify-between py-2.5 border-b border-zinc-50">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs",
                            selectedGuest.passportScanned ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400')}>
                            {selectedGuest.passportScanned ? '✓' : '○'}
                          </div>
                          <span className={cn("text-sm font-semibold", selectedGuest.passportScanned ? 'text-emerald-600' : 'text-zinc-500')}>
                            {selectedGuest.passportScanned ? t('checkin.verified') : t('checkin.scanPassport')}
                          </span>
                        </div>
                        {!selectedGuest.passportScanned && (
                          <Button variant="outline" size="sm" className="h-5 text-[9px] px-2" onClick={() => scanPassport(selectedGuest.id)}>{t('checkin.scanPassport')}</Button>
                        )}
                      </div>
                      {/* Payment */}
                      <div className="flex items-center justify-between py-2.5 border-b border-zinc-50">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs",
                            selectedGuest.paymentStatus === 'unpaid' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500')}>
                            {selectedGuest.paymentStatus === 'unpaid' ? '⚠' : '✓'}
                          </div>
                          <span className={cn("text-sm font-semibold", selectedGuest.paymentStatus === 'unpaid' ? 'text-red-600' : 'text-emerald-600')}>
                            {selectedGuest.paymentStatus === 'unpaid'
                              ? `${formatCurrency(selectedGuest.totalAmount ?? (selectedGuest.nights * AVG_PRICE), language)} ${t('checkin.unpaid')}`
                              : t('checkin.allSettled')}
                          </span>
                        </div>
                        {selectedGuest.paymentStatus === 'unpaid' && (
                          <Button size="sm" variant="destructive" className="h-5 text-[9px] px-2" onClick={() => { if (window.confirm(t('checkin.confirmCollect') || 'Mark this guest as paid?')) settlePayment(selectedGuest.id); }}>{t('checkin.collect')}</Button>
                        )}
                      </div>
                      {/* Notes */}
                      <div className="flex items-center gap-2 py-2.5">
                        <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-xs text-amber-600">📝</div>
                        <Input className="h-7 bg-zinc-50 border-zinc-200 text-xs flex-1" placeholder="..." value={editNotes}
                          onChange={e => { setEditNotes(e.target.value); if (selectedGuest) updateArrival(selectedGuest.id, { notes: e.target.value }); }} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-emerald-200 shadow-none">
                    <Label className="text-xs text-emerald-600 font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" />{t('checkin.assignBed')}
                    </Label>
                    <div className="text-[11px] text-zinc-500 mb-2">
                      {t('checkin.recommendationFor') || 'For'}
                      <span className="font-bold text-pink-600">{selectedGuest.gender === 'female' ? ' ♀ Female' : selectedGuest.gender === 'male' ? ' ♂ Male' : ''}</span>
                      {selectedGuest.roomPreference && (
                        <> · <span className="font-bold text-indigo-600">{t('checkin.prefers') || 'prefers'} {selectedGuest.roomPreference}</span></>
                      )}
                    </div>
                    <Button size="lg" className="w-full h-10 text-sm mb-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:bg-zinc-300 disabled:cursor-not-allowed"
                      disabled={!scoredBeds.length || selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial'}
                      onClick={() => {
                        if (!scoredBeds.length) return;
                        const best = scoredBeds[0];
                        const roomTypeName = best.roomType === 'dorm-mixed' ? t('bedboard.mixedDorm') : best.roomType === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private');
                        const totalForStay = Math.round(best.pricePerNight * selectedGuest.nights * 100) / 100;
                        const reasonSummary = [best.genderMatch && t('checkin.tagGender'), best.preferenceMatch && t('checkin.tagPref'), best.fillExisting && t('checkin.tagFill'), best.fragmentationScore >= 7 && t('checkin.tagLowFrag')].filter(Boolean).join(' · ') || t('checkin.bestFit') || 'Best fit';
                        const confirmMsg = `${t('checkin.confirmAutoAssign') || 'Assign guest to'}\n\n${selectedGuest.name} → ${roomTypeName} ${best.bedName} · R${best.roomNumber}\n${formatCurrency(best.pricePerNight, language)}/night × ${selectedGuest.nights} ${t('dashboard.nights')} = ${formatCurrency(totalForStay, language)}\n\n✓ ${reasonSummary}\n\n${t('checkin.confirmProceed') || 'Proceed?'}`;
                        if (window.confirm(confirmMsg)) {
                          const result = autoAssignBed(selectedGuest.id);
                          if (result) {
                            setCheckInSuccess(selectedGuest.name);
                            setSelectedGuestId(null);
                            setSelectedBedId(null);
                          }
                        }
                      }}>
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      {t('checkin.autoAssign') || 'Auto Assign & Check-in'}
                    </Button>
                    {(selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial') && (
                      <p className="text-xs text-amber-600 mb-2 -mt-1 font-medium">⚠ {t('checkin.collectBeforeAssign') || 'Please collect payment first before assigning a bed'}</p>
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
                            className={cn("p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer relative min-h-[150px] flex flex-col",
                              isSelected ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-200 shadow-lg scale-[1.02]' :
                              isTop ? 'border-emerald-400 bg-emerald-50/40 hover:border-emerald-500 shadow-sm' :
                              'border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm')}>
                            {showBestTag && <span className="absolute -top-2.5 left-3 text-[10px] font-extrabold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-md ring-2 ring-white">★ BEST MATCH</span>}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-sm text-zinc-900 truncate">{roomTypeName}</span>
                              <span className="text-[10px] text-zinc-400 shrink-0">R{score.roomNumber}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mb-2">
                              {score.bedName} · {bedTypeName}
                            </div>
                            <div className="flex items-baseline gap-1 mb-1.5">
                              <span className="text-xl font-extrabold text-zinc-900">
                                {formatCurrency(score.pricePerNight, language)}
                              </span>
                              <span className="text-[10px] text-zinc-500">/night</span>
                            </div>
                            <div className="text-[11px] text-zinc-600 mb-2 px-2 py-1 bg-white/70 rounded">
                              × {selectedGuest.nights} {t('dashboard.nights')} = <span className="font-bold text-zinc-900">{formatCurrency(totalForStay, language)}</span>
                              {priceDiff !== 0 && (
                                <span className={cn("ml-1 text-[10px]", priceDiff > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                                  ({priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff, language)} vs avg)
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-auto">
                              {score.bedTierMatch && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">💰 {t('checkin.tagTierMatch')}</span>}
                              {score.genderMatch && <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">♀ {t('checkin.tagGender')}</span>}
                              {score.preferenceMatch && <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">✓ {t('checkin.tagPref')}</span>}
                              {score.fillExisting && <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded">▣ {t('checkin.tagFill')}</span>}
                              {score.fragmentationScore >= 7 && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">◇ {t('checkin.tagLowFrag')}</span>}
                            </div>
                          </button>
                        );
                      })}
                      {scoredBeds.length === 0 && (
                        <div className="col-span-full py-3 text-center text-xs text-red-500">{t('checkin.noAvailableBeds') || 'No suitable beds available'}</div>
                      )}
                    </div>
                    {(selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial') && (
                      <p className="text-[11px] font-medium text-amber-600 mt-1.5">⚠️ {t('checkin.unpaidWarning')}</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-end gap-2">
                      <Button size="lg" 
                        disabled={!selectedBedId || !selectedGuest.passportScanned || selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial'} 
                        onClick={handleCheckIn}
                        className="w-full sm:w-auto h-10 px-5 text-sm shadow-lg disabled:bg-zinc-300 disabled:cursor-not-allowed">
                        {t('checkin.completeCheckIn')}
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
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-400 bg-zinc-50/50 text-sm">
                {t('checkin.selectGuestToBegin')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Checked In Tab ── */}
      {subTab === 'checked-in' && (
        <div className="flex-1 overflow-auto">
          {/* Room Summaries */}
          <div className="mb-3 p-3 bg-white rounded-xl border border-zinc-200 shadow-sm">
            <h4 className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">{t('checkin.roomStatus') || 'Room Status'}</h4>
            <div className="space-y-1">
              {roomSummaries.map(s => (
                <div key={s.roomId} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-zinc-50">
                  <span className="text-zinc-600 font-medium">
                    {s.roomType === 'dorm-mixed' ? t('bedboard.mixedDorm') : s.roomType === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private')} R{s.roomNumber}
                  </span>
                  <span className={cn("text-[11px] font-bold",
                    s.occupiedBeds === s.totalBeds ? "text-red-600" :
                    s.occupiedBeds > 0 ? "text-amber-600" : "text-emerald-600")}>
                    {s.occupiedBeds}/{s.totalBeds}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.guest')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.dates')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.bed')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.payment')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterList(checkedInGuests).map(({ guest, bed, room }) => (
                  <tr key={`${guest.id}-${bed.id}`} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-xs">{guest.name.charAt(0)}</div>
                        <div>
                          <span className="text-xs font-semibold text-zinc-900">{guest.name}</span>
                          <span className="text-[10px] text-zinc-500 block">{guest.countryCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-zinc-700 font-medium">{format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d')}</span>
                      <span className="text-[10px] text-zinc-500 block">{guest.nights}N</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-zinc-900">{bed.name}</span>
                      <span className="text-[10px] text-zinc-500 block">{room.name || room.number}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        guest.paymentStatus === 'paid' ? 'text-emerald-600 bg-emerald-50' :
                        guest.paymentStatus === 'unpaid' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50')}>
                        {guest.paymentStatus === 'paid' ? t('checkin.paid') : guest.paymentStatus === 'unpaid' ? t('checkin.unpaid') : t('checkin.partial')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                        onClick={() => { if (window.confirm(t('guest.checkoutWarning') + guest.name)) checkoutGuest(bed.id); }}>
                        <LogOut className="h-3 w-3" /> {t('checkin.checkout') || 'Checkout'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filterList(checkedInGuests).length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400">{t('checkin.noCheckedIn') || 'No checked-in guests'}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Reserved Tab ── */}
      {subTab === 'reserved' && (
        <div className="flex-1 overflow-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.guest')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.dates')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.bed')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.payment')}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterList(reservedGuests).map(({ guest, bed, room }) => {
                  const src = getSourceConfig(guest.source);
                  return (
                    <tr key={`${guest.id}-${bed.id}`} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-xs">{guest.name.charAt(0)}</div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-900">{guest.name}</span>
                            <span className="text-[10px] text-zinc-500 block">{guest.countryCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-zinc-700 font-medium">{format(parseISO(guest.checkInDate), 'MMM d')} – {format(parseISO(guest.checkOutDate), 'MMM d')}</span>
                        <span className="text-[10px] text-zinc-500 block">{guest.nights}N</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-zinc-900">{bed.name}</span>
                        <span className="text-[10px] text-zinc-500 block">{room.name || room.number}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          guest.paymentStatus === 'paid' ? 'text-emerald-600 bg-emerald-50' :
                          guest.paymentStatus === 'unpaid' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50')}>
                          {guest.paymentStatus === 'paid' ? t('checkin.paid') : guest.paymentStatus === 'unpaid' ? t('checkin.unpaid') : t('checkin.partial')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", src.cls)}>{t(src.labelKey)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filterList(reservedGuests).length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400">{t('checkin.noReserved') || 'No upcoming reservations'}</div>
            )}
          </div>
        </div>
      )}

      <ICalImport open={icalOpen} onClose={() => setIcalOpen(false)} onImport={(guests) => importArrivals(guests)} />
    </div>
  );
}
