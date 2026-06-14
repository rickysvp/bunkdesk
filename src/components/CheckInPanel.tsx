import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { Users, Info, IdCard, CheckCircle2, ChevronRight, BedDouble, Plus, Calendar as CalendarIcon, User as UserIcon, Globe, FileText, Link as LinkIcon, ArrowRight, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '../i18nContext';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ICalImport } from './ICalImport';
import { Guest, Bed, Room } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getSourceConfig, getPaymentStatusClass } from '../utils/guestDisplay';
import { scoreBeds, getRoomSummaries, type BedScore } from '../utils/bedAllocator';

const COUNTRY_MAP: Record<string, string> = {
  US: 'USA', GBR: 'United Kingdom', AU: 'Australia',
  ESP: 'Spain', CN: 'China', FR: 'France', DE: 'Germany'
};
const DEFAULT_PRICE = 85;

type SubTab = 'pending' | 'checked-in' | 'reserved';

export function CheckInPanel({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { arrivals, rooms, assignArrival, autoAssignBed, settlePayment, scanPassport, addArrival, updateArrival, importArrivals, checkoutGuest } = useHostel();
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Pending tab state
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [icalOpen, setIcalOpen] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editRoomPref, setEditRoomPref] = useState('');

  // New guest state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [newGuestRef, setNewGuestRef] = useState({
    name: '', countryCode: '', gender: 'male' as "male" | "female" | "other",
    checkInDate: format(new Date(), 'yyyy-MM-dd'), checkOutDate: format(tomorrow, 'yyyy-MM-dd'),
    passportOrId: '', dob: '', policeConsent: false, notes: ''
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
    if (!newGuestRef.name || !newGuestRef.countryCode || !newGuestRef.checkInDate || !newGuestRef.checkOutDate || !newGuestRef.policeConsent) return;
    const countryName = COUNTRY_MAP[newGuestRef.countryCode.toUpperCase()] || newGuestRef.countryCode.toUpperCase();
    const checkIn = parseISO(newGuestRef.checkInDate);
    const checkOut = parseISO(newGuestRef.checkOutDate);
    const calculatedNights = Math.max(1, differenceInDays(checkOut, checkIn));
    addArrival({
      name: newGuestRef.name, country: countryName, countryCode: newGuestRef.countryCode.toUpperCase(),
      gender: newGuestRef.gender, checkInDate: newGuestRef.checkInDate, checkOutDate: newGuestRef.checkOutDate,
      nights: calculatedNights, paymentStatus: 'unpaid' as const, totalAmount: calculatedNights * DEFAULT_PRICE,
      passportScanned: true, passportOrId: newGuestRef.passportOrId, dob: newGuestRef.dob,
      policeConsent: newGuestRef.policeConsent, notes: newGuestRef.notes, source: 'walk-in' as const,
    });
    setSelectedGuestId(null);
    setNewGuestRef({
      name: '', countryCode: '', checkInDate: format(new Date(), 'yyyy-MM-dd'),
      checkOutDate: format(tomorrow, 'yyyy-MM-dd'), passportOrId: '', dob: '', policeConsent: false, notes: ''
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
                <form onSubmit={handleCreateArrival} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.name')}</Label>
                      <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input required className="pl-8 h-10 bg-zinc-50 border-zinc-200" placeholder="John Doe" value={newGuestRef.name} onChange={e => setNewGuestRef({...newGuestRef, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.country')}</Label>
                      <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input required maxLength={3} className="pl-8 h-10 bg-zinc-50 border-zinc-200 uppercase" placeholder="US" value={newGuestRef.countryCode} onChange={e => setNewGuestRef({...newGuestRef, countryCode: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('guest.gender') || "Gender"}</Label>
                      <Select value={newGuestRef.gender} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, gender: val as "male" | "female" | "other"})}>
                        <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t('guest.male') || "Male"}</SelectItem>
                          <SelectItem value="female">{t('guest.female') || "Female"}</SelectItem>
                          <SelectItem value="other">{t('guest.other') || "Other"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.checkInDate')}</Label>
                      <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input type="date" required className="pl-8 h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkInDate} onChange={e => setNewGuestRef({...newGuestRef, checkInDate: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.checkOutDate')}</Label>
                      <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input type="date" required className="pl-8 h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkOutDate} onChange={e => setNewGuestRef({...newGuestRef, checkOutDate: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.passportOrId')}</Label>
                      <div className="relative"><IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input required className="pl-8 h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.passportOrId} onChange={e => setNewGuestRef({...newGuestRef, passportOrId: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.dob')}</Label>
                      <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <Input type="date" required className="pl-8 h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.dob} onChange={e => setNewGuestRef({...newGuestRef, dob: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5"><FileText className="w-3 h-3" />{t('checkin.notes')}</Label>
                    <Input className="h-10 bg-zinc-50 border-zinc-200" placeholder="E.g., Prefers bottom bunk" value={newGuestRef.notes} onChange={e => setNewGuestRef({...newGuestRef, notes: e.target.value})} />
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" required checked={newGuestRef.policeConsent} onChange={e => setNewGuestRef({...newGuestRef, policeConsent: e.target.checked})} className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
                      <div><span className="text-xs font-semibold text-zinc-900">{t('checkin.policeRegistration')}</span><span className="text-[10px] text-zinc-500 block mt-0.5">{t('checkin.policeRegistrationDesc')}</span></div>
                    </label>
                  </div>
                  <div className="pt-3 border-t border-zinc-100 flex justify-end">
                    <Button type="submit" size="lg" className="h-11 px-6 text-sm shadow-sm w-full sm:w-auto">{t('checkin.createArrival')}</Button>
                  </div>
                </form>
              </div>
            ) : selectedGuest ? (
              <div className="space-y-4">
                {/* Guest Header */}
                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">{selectedGuest.name}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      <span className="font-medium text-zinc-700">{selectedGuest.country}</span>
                      {' · '}{selectedGuest.nights} {t('dashboard.nights')}
                      {' · '}{t('checkin.checkout')} {selectedGuest.checkOutDate}
                    </p>
                  </div>
                  {selectedGuest.paymentStatus === 'unpaid' ? (
                    <div className="text-right"><span className="block text-[10px] font-semibold text-red-600 uppercase">{t('checkin.paymentDue')}</span><span className="text-lg font-bold text-zinc-900">${DEFAULT_PRICE}</span></div>
                  ) : (
                    <div className="text-right"><span className="block text-[10px] font-semibold text-emerald-600 uppercase">{t('checkin.paid')}</span></div>
                  )}
                </div>
                {/* Verification + Payment */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 border-zinc-200 bg-white shadow-none">
                    <Label className="text-[10px] text-zinc-500 uppercase font-semibold">{t('checkin.verification')}</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", selectedGuest.passportScanned ? 'bg-emerald-50 text-emerald-500' : 'bg-zinc-100 text-zinc-400')}>
                        {selectedGuest.passportScanned ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                      </div>
                      {!selectedGuest.passportScanned ? (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => scanPassport(selectedGuest.id)}>{t('checkin.scanPassport')}</Button>
                      ) : <span className="text-xs font-medium text-emerald-600">{t('checkin.verified')}</span>}
                    </div>
                  </Card>
                  <Card className="p-3 border-zinc-200 bg-white shadow-none">
                    <Label className="text-[10px] text-zinc-500 uppercase font-semibold">{t('checkin.payment')}</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", selectedGuest.paymentStatus === 'unpaid' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500')}>
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      {selectedGuest.paymentStatus === 'unpaid' ? (
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => settlePayment(selectedGuest.id)}>{t('checkin.collect')} ${DEFAULT_PRICE}</Button>
                      ) : <span className="text-xs font-medium text-emerald-600">{t('checkin.allSettled')}</span>}
                    </div>
                  </Card>
                </div>
                {/* Notes */}
                <Card className="p-3 border-zinc-200 bg-white shadow-none">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500">{t('checkin.notes')}</Label>
                      <Input className="h-8 bg-zinc-50 border-zinc-200 text-xs" placeholder="Notes..." value={editNotes}
                        onChange={e => { setEditNotes(e.target.value); if (selectedGuest) updateArrival(selectedGuest.id, { notes: e.target.value }); }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500">{t('checkin.roomPreference')}</Label>
                      <Input className="h-8 bg-zinc-50 border-zinc-200 text-xs" placeholder="Room pref..." value={editRoomPref}
                        onChange={e => { setEditRoomPref(e.target.value); if (selectedGuest) updateArrival(selectedGuest.id, { roomPreference: e.target.value }); }} />
                    </div>
                  </div>
                </Card>
                {/* Bed Assignment */}
                <Card className="p-4 border-zinc-200 shadow-none">
                  <Label className="text-xs text-zinc-900 font-semibold mb-2 flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{t('checkin.assignBed')}</Label>
                  {/* Auto Assign Button */}
                  <Button size="lg" className="w-full h-11 text-sm mb-3 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    onClick={() => {
                      const result = autoAssignBed(selectedGuest.id);
                      if (result) {
                        setCheckInSuccess(selectedGuest.name);
                        setSelectedGuestId(null);
                        setSelectedBedId(null);
                      }
                    }}>
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {t('checkin.autoAssign') || 'Auto Assign & Check-in'}
                  </Button>
                  {/* Scored Bed List */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {scoredBeds.map((score, idx) => {
                      const isTop = idx === 0;
                      return (
                        <button key={score.bedId} onClick={() => setSelectedBedId(score.bedId)}
                          className={cn("p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[70px] relative",
                            selectedBedId === score.bedId ? 'border-zinc-900 bg-zinc-900 text-white shadow-md' :
                            isTop ? 'border-emerald-400 bg-emerald-50/70 hover:border-emerald-500 shadow-sm' :
                            'border-zinc-200 bg-white hover:border-zinc-400')}>
                          {isTop && <span className="absolute -top-2 left-2 text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">★ Best</span>}
                          <span className="font-semibold text-xs">
                            {score.roomType === 'dorm-mixed' ? t('bedboard.mixedDorm') : score.roomType === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private')}
                          </span>
                          <span className={cn("text-[10px] mt-0.5 block", selectedBedId === score.bedId ? 'text-zinc-300' : 'text-zinc-500')}>
                            {score.bedName} · R{score.roomNumber} · ${score.pricePerNight}
                          </span>
                          <div className="flex items-center gap-0.5 mt-1">
                            {score.fillExisting && <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-600">Fill</span>}
                            {score.genderMatch && <span className="text-[9px] bg-blue-50 px-1 py-0.5 rounded text-blue-600">Match</span>}
                          </div>
                        </button>
                      );
                    })}
                    {scoredBeds.length === 0 && (
                      <div className="col-span-full py-4 text-center text-xs text-red-500">{t('checkin.noAvailableBeds') || 'No suitable beds available'}</div>
                    )}
                  </div>
                  {(selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial') && (
                    <p className="text-[10px] font-medium text-amber-600 mt-2">⚠️ {t('checkin.unpaidWarning')}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-end gap-2">
                    <Button size="lg" disabled={!selectedBedId || !selectedGuest.passportScanned} onClick={handleCheckIn}
                      className="w-full sm:w-auto h-11 px-6 text-sm shadow-lg">{t('checkin.completeCheckIn')}</Button>
                  </div>
                </Card>
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
                        onClick={() => { checkoutGuest(bed.id); }}>
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
