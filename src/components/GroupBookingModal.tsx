import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Users, Calendar as CalendarIcon, DollarSign, FileText,
  BedDouble, ChevronDown, ChevronUp, User as UserIcon, ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import { differenceInDays, parseISO, format } from 'date-fns';

const DORM_PRICE = 85;

interface GroupBookingModalProps {
  open: boolean;
  onClose: () => void;
}

interface MemberSlot {
  name: string;
  gender: 'male' | 'female' | 'other';
  bedId: string | null;
}

const SOURCES = ['direct', 'group', 'walk-in', 'booking', 'airbnb', 'expedia', 'ical', 'manual'] as const;

export function GroupBookingModal({ open, onClose }: GroupBookingModalProps) {
  const { rooms, groupBookings, addGroupBooking } = useHostel();
  const { t } = useTranslation();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ── Form state ────────────────────────────────────────────────
  const [leaderName, setLeaderName] = useState('');
  const [source, setSource] = useState<string>('direct');
  const [checkInDate, setCheckInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOutDate, setCheckOutDate] = useState(format(tomorrow, 'yyyy-MM-dd'));
  const [memberCount, setMemberCount] = useState(4);
  const [paymentMode, setPaymentMode] = useState<'shared' | 'split'>('shared');
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState<MemberSlot[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // ── Derived values ────────────────────────────────────────────
  const nights = useMemo(() => {
    try {
      return Math.max(1, differenceInDays(parseISO(checkOutDate), parseISO(checkInDate)));
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  const autoTotal = memberCount * nights * DORM_PRICE;

  // Sync member slots when count changes
  React.useEffect(() => {
    setMembers(prev => {
      const next: MemberSlot[] = [];
      for (let i = 0; i < memberCount; i++) {
        next.push(prev[i] || { name: '', gender: 'male', bedId: null });
      }
      return next;
    });
  }, [memberCount]);

  // ── Available beds ────────────────────────────────────────────
  const availableBeds = useMemo(() => {
    return rooms.flatMap(r =>
      r.beds
        .filter(b => b.status === 'empty')
        .map(b => ({ ...b, roomType: r.type, roomNumber: r.number, roomId: r.id }))
    );
  }, [rooms]);

  // ── Auto-assign algorithm ─────────────────────────────────────
  const autoAssign = useCallback(() => {
    const assigned = [...members];
    const usedBedIds = new Set<string>();

    // Prefer same room, adjacent beds
    const roomsSorted = [...rooms].sort((a, b) => {
      const aEmpty = a.beds.filter(b => b.status === 'empty').length;
      const bEmpty = b.beds.filter(b => b.status === 'empty').length;
      return bEmpty - aEmpty; // rooms with more empty beds first
    });

    let memberIdx = 0;
    for (const room of roomsSorted) {
      if (memberIdx >= memberCount) break;
      const emptyBeds = room.beds.filter(b => b.status === 'empty' && !usedBedIds.has(b.id));
      for (const bed of emptyBeds) {
        if (memberIdx >= memberCount) break;
        assigned[memberIdx] = { ...assigned[memberIdx], bedId: bed.id };
        usedBedIds.add(bed.id);
        memberIdx++;
      }
    }

    setMembers(assigned);
  }, [rooms, memberCount, members]);

  // ── Manual reassign ───────────────────────────────────────────
  const reassignMember = (memberIdx: number, bedId: string | null) => {
    setMembers(prev => {
      const next = [...prev];
      // Free up old bed
      next[memberIdx] = { ...next[memberIdx], bedId };
      return next;
    });
  };

  // ── Update member field ───────────────────────────────────────
  const updateMember = (idx: number, field: keyof MemberSlot, value: string) => {
    setMembers(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderName) return;

    addGroupBooking({
      leaderName,
      source: source as any,
      checkInDate,
      checkOutDate,
      memberIds: members.map((_, i) => `gb_member_${Date.now()}_${i}`),
      bedIds: members.map(m => m.bedId).filter(Boolean) as string[],
      paymentMode,
      totalAmount: totalAmount || autoTotal,
      paidAmount: 0,
      notes: notes || undefined,
    });

    // Reset form
    setLeaderName('');
    setSource('direct');
    setCheckInDate(format(new Date(), 'yyyy-MM-dd'));
    setCheckOutDate(format(tomorrow, 'yyyy-MM-dd'));
    setMemberCount(4);
    setPaymentMode('shared');
    setTotalAmount(0);
    setNotes('');
    setMembers([]);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  // ── Helpers ───────────────────────────────────────────────────
  const getBedLabel = (bedId: string) => {
    for (const room of rooms) {
      const bed = room.beds.find(b => b.id === bedId);
      if (bed) return `${bed.name} · R${room.number}`;
    }
    return bedId;
  };

  const getRoomLabel = (roomType: string) => {
    if (roomType === 'dorm-mixed') return t('bedboard.mixedDorm');
    if (roomType === 'dorm-female') return t('bedboard.femaleDorm');
    return t('bedboard.private');
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm p-4 pt-[5vh] overflow-y-auto"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {t('groupBooking.title')}
              </h3>
              <button onClick={handleClose} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Row 1: Leader Name + Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {t('groupBooking.leaderName')}
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      required
                      className="pl-9 h-11 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                      placeholder="e.g. Marco's Surf Crew"
                      value={leaderName}
                      onChange={e => setLeaderName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {t('groupBooking.source')}
                  </Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="h-11 bg-zinc-50 border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => (
                        <SelectItem key={s} value={s}>
                          {t(`groupBooking.source_${s}`) || s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {t('groupBooking.checkIn')}
                  </Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      type="date"
                      required
                      className="pl-9 h-11 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                      value={checkInDate}
                      onChange={e => setCheckInDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {t('groupBooking.checkOut')}
                  </Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      type="date"
                      required
                      className="pl-9 h-11 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                      value={checkOutDate}
                      onChange={e => setCheckOutDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Members + Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {t('groupBooking.memberCount')}
                  </Label>
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    required
                    className="h-11 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                    value={memberCount}
                    onChange={e => setMemberCount(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {t('groupBooking.paymentMode')}
                  </Label>
                  <div className="flex gap-2 h-11">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('shared')}
                      className={`flex-1 rounded-lg text-sm font-medium transition-all ${
                        paymentMode === 'shared'
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {t('groupBooking.shared')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('split')}
                      className={`flex-1 rounded-lg text-sm font-medium transition-all ${
                        paymentMode === 'split'
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {t('groupBooking.split')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Total Amount */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" />
                  {t('groupBooking.totalAmount')}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    className="h-11 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                    value={totalAmount || autoTotal}
                    onChange={e => setTotalAmount(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    {t('groupBooking.autoCalc') || `${memberCount} × ${nights} × $${DORM_PRICE}`}
                  </span>
                </div>
              </div>

              {/* Row 5: Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  {t('groupBooking.notes')}
                </Label>
                <textarea
                  className="w-full h-20 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                  placeholder={t('groupBooking.notesPlaceholder') || 'Special requests...'}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* ── Bed Assignment Section ──────────────────────── */}
              <div className="border-t border-zinc-100 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <BedDouble className="w-4 h-4" />
                    {t('groupBooking.bedAssignment')}
                  </Label>
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={autoAssign}>
                    <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                    {t('groupBooking.autoAssign')}
                  </Button>
                </div>

                {/* Visual beds grouped by room */}
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {rooms.map(room => {
                    const emptyBeds = room.beds.filter(b => b.status === 'empty');
                    if (emptyBeds.length === 0) return null;
                    return (
                      <div key={room.id} className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                        <p className="text-xs font-semibold text-zinc-500 mb-2">
                          {getRoomLabel(room.type)} · R{room.number}
                          <span className="ml-1 text-zinc-400">({emptyBeds.length} {t('bedboard.empty')})</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {emptyBeds.map(bed => {
                            const assignedMember = members.findIndex(m => m.bedId === bed.id);
                            return (
                              <button
                                key={bed.id}
                                type="button"
                                onClick={() => {
                                  if (assignedMember >= 0) {
                                    reassignMember(assignedMember, null);
                                  }
                                }}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                                  assignedMember >= 0
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                                }`}
                              >
                                {bed.name}
                                {assignedMember >= 0 && (
                                  <span className="ml-1.5 text-emerald-600">
                                    → {members[assignedMember].name || `${t('groupBooking.member')} ${assignedMember + 1}`}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Member List ─────────────────────────────────── */}
              <div className="border-t border-zinc-100 pt-5 space-y-3">
                <Label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('groupBooking.memberList')}
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {members.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100"
                    >
                      <span className="text-xs font-bold text-zinc-400 w-6 shrink-0">{idx + 1}</span>
                      <Input
                        className="h-9 bg-white border-zinc-200 focus-visible:ring-zinc-900 text-sm flex-1"
                        placeholder={
                          idx === 0
                            ? `${t('groupBooking.member')} 1 (${t('groupBooking.leader')})`
                            : `${t('groupBooking.member')} ${idx + 1}`
                        }
                        value={member.name}
                        onChange={e => updateMember(idx, 'name', e.target.value)}
                      />
                      <Select
                        value={member.gender}
                        onValueChange={val => updateMember(idx, 'gender', val)}
                      >
                        <SelectTrigger className="h-9 w-24 bg-white border-zinc-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t('guest.male')}</SelectItem>
                          <SelectItem value="female">{t('guest.female')}</SelectItem>
                          <SelectItem value="other">{t('guest.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {member.bedId ? (
                        <span className="text-xs text-emerald-600 font-medium whitespace-nowrap flex items-center gap-1">
                          <BedDouble className="w-3 h-3" />
                          {getBedLabel(member.bedId)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                          {t('groupBooking.unassigned')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Actions ─────────────────────────────────────── */}
              <div className="border-t border-zinc-100 pt-5 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {t('staff.cancel')}
                </Button>
                <Button type="submit" disabled={!leaderName}>
                  {t('groupBooking.createBooking')}
                </Button>
              </div>
            </form>

            {/* ── Existing Group Bookings ──────────────────────── */}
            {groupBookings.length > 0 && (
              <div className="border-t border-zinc-100 p-5">
                <h4 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  {t('groupBooking.existingBookings')}
                </h4>
                <div className="space-y-2">
                  {groupBookings.map(gb => {
                    const isExpanded = expandedGroupId === gb.id;
                    const paymentPct = gb.totalAmount > 0 ? Math.round((gb.paidAmount / gb.totalAmount) * 100) : 0;
                    return (
                      <div
                        key={gb.id}
                        className="bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedGroupId(isExpanded ? null : gb.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                              {gb.memberIds.length}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{gb.leaderName}</p>
                              <p className="text-xs text-zinc-500">
                                {gb.checkInDate} → {gb.checkOutDate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs font-semibold text-zinc-700">
                                ${gb.totalAmount}
                              </p>
                              <div className="w-16 h-1.5 bg-zinc-200 rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${paymentPct >= 100 ? 'bg-emerald-500' : paymentPct > 0 ? 'bg-amber-400' : 'bg-zinc-300'}`}
                                  style={{ width: `${Math.min(100, paymentPct)}%` }}
                                />
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-2 border-t border-zinc-100 pt-3">
                                <div className="flex items-center gap-4 text-xs text-zinc-500">
                                  <span>{t('groupBooking.source')}: <strong className="text-zinc-700">{gb.source}</strong></span>
                                  <span>{t('groupBooking.paymentMode')}: <strong className="text-zinc-700">{gb.paymentMode === 'shared' ? t('groupBooking.shared') : t('groupBooking.split')}</strong></span>
                                  <span>{t('groupBooking.paid')}: <strong className={paymentPct >= 100 ? 'text-emerald-600' : 'text-amber-600'}>${gb.paidAmount}/{gb.totalAmount}</strong></span>
                                </div>

                                {/* Members */}
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    {t('groupBooking.memberList')} ({gb.memberIds.length})
                                  </p>
                                  {gb.memberIds.map((mid, i) => (
                                    <div key={mid} className="flex items-center gap-2 text-xs text-zinc-600">
                                      <span className="w-4 text-zinc-400 font-medium">{i + 1}</span>
                                      <span>{i === 0 ? `${t('groupBooking.leader')}` : `${t('groupBooking.member')} ${i + 1}`}</span>
                                      {gb.bedIds[i] && (
                                        <span className="text-emerald-600 flex items-center gap-0.5">
                                          <BedDouble className="w-3 h-3" />
                                          {getBedLabel(gb.bedIds[i])}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {gb.notes && (
                                  <p className="text-xs text-zinc-500 italic">{gb.notes}</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
