import React, { useMemo, useState } from 'react';
import { useHostel } from '../HostelContext';
import { Users, LogIn, LogOut, Bed, UserPlus, Search, Sparkles, AlertTriangle, ClipboardList, X, Globe, CreditCard, FileText, Phone, Mail, Calendar, Tag, Lightbulb, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../i18nContext';
import { format, parseISO, isToday } from 'date-fns';
import { Guest, GuestSource } from '../types';
import { getSourceConfig, getPaymentStatusClass } from '../utils/guestDisplay';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  navigateToGrow?: (subTab: string, options?: { autoOpenPromo?: boolean }) => void;
}

export function Dashboard({ setActiveTab, navigateToGrow }: DashboardProps) {
  const { rooms, arrivals, shiftNotes } = useHostel();
  const { t } = useTranslation();
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const totalBeds = rooms.reduce((acc, r) => acc + r.beds.length, 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
  const emptyBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'empty').length, 0);
  const cleaningBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'cleaning').length, 0);

  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Per-room occupancy
  const roomStats = useMemo(() => rooms.map(room => {
    const total = room.beds.length;
    const occupied = room.beds.filter(b => b.status === 'occupied').length;
    const empty = room.beds.filter(b => b.status === 'empty').length;
    const cleaning = room.beds.filter(b => b.status === 'cleaning').length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const genderInRoom = {
      male: room.beds.filter(b => b.guest?.gender === 'male').length,
      female: room.beds.filter(b => b.guest?.gender === 'female').length,
    };
    return { ...room, total, occupied, empty, cleaning, rate, genderInRoom };
  }), [rooms]);

  // Today's departing guests with details
  const todayDepartingGuests = useMemo(() => {
    return rooms.flatMap(r => r.beds
      .filter(b => b.guest && isToday(parseISO(b.guest.checkOutDate)))
      .map(b => ({ guest: b.guest!, bedName: b.name, roomName: r.name, roomNumber: r.number }))
    );
  }, [rooms]);

  // Unresolved shift notes
  const unresolvedNotes = useMemo(() => shiftNotes.filter(n => !n.isResolved), [shiftNotes]);
  const urgentNotes = useMemo(() => shiftNotes.filter(n => !n.isResolved && n.priority === 'urgent'), [shiftNotes]);

  const handleWalkIn = () => setActiveTab('checkin');

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const statCards = [
    { label: t('dashboard.occupancy') || 'Occupancy', value: `${occupancyRate}%`, sub: `${occupiedBeds}/${totalBeds}`, icon: Users, color: "text-emerald-500", bg: "bg-emerald-50", tab: "bedboard" },
    { label: t('dashboard.arrivals') || 'Arrivals', value: arrivals.length, sub: t('dashboard.pendingArrivals') || 'pending', icon: LogIn, color: "text-blue-500", bg: "bg-blue-50", tab: "checkin" },
    { label: t('dashboard.departing') || 'Departing', value: todayDepartingGuests.length, sub: t('dashboard.departingToday') || 'today', icon: LogOut, color: "text-orange-500", bg: "bg-orange-50", tab: "bedboard" },
    { label: t('dashboard.cleaning') || 'Cleaning', value: cleaningBeds, sub: t('dashboard.availableBeds') || 'beds', icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50", tab: "bedboard" },
  ];

  const genderIcon = (gender?: string) => {
    if (gender === 'male') return <span className="text-blue-500 text-xs">♂</span>;
    if (gender === 'female') return <span className="text-pink-500 text-xs">♀</span>;
    return <span className="text-zinc-400 text-xs">?</span>;
  };

  const sourceBadge = (source: GuestSource) => {
    const c = getSourceConfig(source);
    return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.cls}`}>{t(c.labelKey)}</span>;
  };

  const paymentLabel = (guest: Guest) => {
    if (guest.paymentStatus === 'paid') return <span className="text-emerald-600 text-[10px] font-medium">{t('checkin.paid')}</span>;
    if (guest.paymentStatus === 'partial') return <span className="text-amber-600 text-[10px] font-medium">{t('checkin.partial') || 'Partial'}</span>;
    return <span className="text-red-500 text-[10px] font-medium">{t('checkin.unpaid')}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{t('dashboard.todaysOperations') || "Today's Operations"}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('dashboard.date') || format(new Date(), 'MMM d, yyyy')} &middot; {totalBeds} {t('dashboard.totalBeds') || 'beds'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Search className="h-4 w-4" />
            {t('dashboard.search') || 'Search'}
          </Button>
          <Button size="sm" className="h-9 gap-2" onClick={handleWalkIn}>
            <UserPlus className="h-4 w-4" />
            {t('dashboard.walkIn') || 'Walk-in'}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <motion.div variants={item} key={i}>
            <Card
              className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setActiveTab(stat.tab)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{stat.value}</p>
                  <p className="text-xs font-medium text-zinc-500 mt-1">{stat.label}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Urgent Alerts */}
      {urgentNotes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-red-200 bg-red-50/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">{t('dashboard.urgent') || 'Urgent'}</span>
              </div>
              <div className="space-y-2">
                {urgentNotes.slice(0, 3).map(note => (
                  <div key={note.id} className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 mt-0.5">&bull;</span>
                    <span className="text-red-800">{note.content}</span>
                    {note.assignee && <span className="text-red-500 text-xs ml-auto">@{note.assignee}</span>}
                  </div>
                ))}
                {urgentNotes.length > 3 && (
                  <button onClick={() => setActiveTab('shiftlog')} className="text-xs text-red-500 hover:underline">
                    {t('dashboard.moreCount').replace('{n}', String(urgentNotes.length - 3))}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty Bed Opportunity Alert */}
      {emptyBeds > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm border-l-4 border-l-amber-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">💡</span>
                <span className="text-sm font-semibold text-amber-800">{t('dashboard.emptyBedsTitle').replace('{n}', String(emptyBeds))}</span>
              </div>
              <p className="text-xs text-amber-600 mb-3">{t('dashboard.emptyBedsDesc')}</p>
              <div className="space-y-1.5">
                <div
                  className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer hover:underline"
                  onClick={() => navigateToGrow?.('pricing', { autoOpenPromo: true })}
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>{t('dashboard.suggestPromo')}</span>
                  <ArrowRight className="h-3 w-3 text-amber-400 shrink-0 ml-auto" />
                </div>
                <div
                  className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer hover:underline"
                  onClick={() => navigateToGrow?.('social')}
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>{t('dashboard.suggestWhatsApp')}</span>
                  <ArrowRight className="h-3 w-3 text-amber-400 shrink-0 ml-auto" />
                </div>
                <div
                  className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer hover:underline"
                  onClick={() => navigateToGrow?.('pricing')}
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>{t('dashboard.suggestPricing')}</span>
                  <ArrowRight className="h-3 w-3 text-amber-400 shrink-0 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : totalBeds > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm border-l-4 border-l-emerald-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🎉</span>
                <span className="text-sm font-semibold text-emerald-800">{t('dashboard.fullHouseTitle')}</span>
              </div>
              <p className="text-xs text-emerald-600">{t('dashboard.fullHouseDesc')}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Room Occupancy */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Bed className="h-4 w-4 text-zinc-400" />
            {t('dashboard.roomOccupancy') || 'Room Occupancy'}
          </h2>
          <button onClick={() => setActiveTab('bedboard')} className="text-xs text-zinc-500 hover:text-zinc-700 hover:underline">
            {t('dashboard.viewAll') || 'View All'}
          </button>
        </div>
        <Card className="border-zinc-200/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-700" /> {t('dashboard.occupied') || 'Occupied'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> {t('dashboard.cleaning') || 'Cleaning'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {t('dashboard.availableBeds') || 'Available'}</span>
            </div>
            {roomStats.map(room => (
              <div key={room.id} className="space-y-1.5 cursor-pointer hover:bg-zinc-50 -mx-2 px-2 py-1 rounded-lg transition-colors" onClick={() => setActiveTab('bedboard')}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700 font-medium">{room.name || room.number}</span>
                  <div className="flex items-center gap-2">
                    {room.genderInRoom.male > 0 && (
                      <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                        ♂ {room.genderInRoom.male}
                      </span>
                    )}
                    {room.genderInRoom.female > 0 && (
                      <span className="text-[10px] text-pink-500 flex items-center gap-0.5">
                        ♀ {room.genderInRoom.female}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">{room.occupied}/{room.total}</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden flex">
                  {room.occupied > 0 && (
                    <div className="bg-zinc-700 h-full transition-all" style={{ width: `${(room.occupied / room.total) * 100}%` }} />
                  )}
                  {room.cleaning > 0 && (
                    <div className="bg-purple-400 h-full transition-all" style={{ width: `${(room.cleaning / room.total) * 100}%` }} />
                  )}
                  {room.empty > 0 && (
                    <div className="bg-emerald-400 h-full transition-all" style={{ width: `${(room.empty / room.total) * 100}%` }} />
                  )}
                </div>
              </div>
            ))}
            {roomStats.length === 0 && (
              <div className="py-4 text-center text-sm text-zinc-500">{t('dashboard.noRooms') || 'No rooms configured'}</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Arrivals + Departing Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Arrivals */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 mb-4">
            <LogIn className="h-4 w-4 text-zinc-400" />
            {t('dashboard.pendingArrivals') || 'Pending Arrivals'}
            <span className="text-xs font-normal text-zinc-400">({t('dashboard.arrivalsSource') || 'unassigned guests'})</span>
          </h2>
          <Card className="overflow-hidden border-zinc-200/60 shadow-sm">
            <div className="divide-y divide-zinc-100">
              {arrivals.map(guest => (
                <div key={guest.id} className="p-3 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer" onClick={() => setSelectedGuest(guest)}>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                      {genderIcon(guest.gender)}
                      <span className="truncate">{guest.name}</span>
                      {sourceBadge(guest.source)}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                      {guest.countryCode} &middot; {guest.nights}{t('dashboard.nights') || 'N'} &middot; {format(parseISO(guest.checkInDate), 'MMM d')}-{format(parseISO(guest.checkOutDate), 'd')}
                      <span className="mx-0.5">&middot;</span>
                      {paymentLabel(guest)}
                      {guest.totalAmount && <span className="text-zinc-400">${guest.totalAmount}</span>}
                    </span>
                    {guest.notes && (
                      <span className="text-[10px] text-zinc-400 truncate">📝 {guest.notes}</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs shadow-none ml-2 shrink-0" onClick={(e) => { e.stopPropagation(); setActiveTab('checkin'); }}>
                    {t('dashboard.checkIn') || 'Check In'}
                  </Button>
                </div>
              ))}
              {arrivals.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-500">{t('dashboard.noMoreArrivals') || 'No pending arrivals'}</div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Departing Today */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 mb-4">
            <LogOut className="h-4 w-4 text-zinc-400" />
            {t('dashboard.departingToday') || 'Departing Today'}
          </h2>
          <Card className="overflow-hidden border-zinc-200/60 shadow-sm">
            <div className="divide-y divide-zinc-100">
              {todayDepartingGuests.map(({ guest, bedName, roomName, roomNumber }, i) => (
                <div key={`${guest.id}-${i}`} className="p-3 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                      {genderIcon(guest.gender)}
                      {guest.name}
                      <span className="text-xs text-zinc-400">{guest.countryCode}</span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      {roomName || roomNumber} · {bedName}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-zinc-500">{format(parseISO(guest.checkOutDate), 'MMM d')}</span>
                    <span className="text-[10px] text-zinc-400">{guest.nights}N</span>
                  </div>
                </div>
              ))}
              {todayDepartingGuests.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-500">{t('dashboard.noDepartures') || 'No departures today'}</div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Shift Notes */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-zinc-400" />
            {t('dashboard.shiftNotes') || 'Shift Notes'}
            <span className="text-xs font-normal text-zinc-500">({unresolvedNotes.length} unresolved)</span>
          </h2>
          <button onClick={() => setActiveTab('shiftlog')} className="text-xs text-zinc-500 hover:text-zinc-700 hover:underline">
            {t('dashboard.viewAll') || 'View All'}
          </button>
        </div>
        <Card className="overflow-hidden border-zinc-200/60 shadow-sm">
          <div className="divide-y divide-zinc-100">
            {unresolvedNotes.slice(0, 4).map(note => (
              <div key={note.id} className="p-3 flex items-start gap-3 hover:bg-zinc-50 transition-colors">
                <div className={`w-1 h-full min-h-[24px] rounded-full flex-shrink-0 mt-0.5 ${
                  note.priority === 'urgent' ? 'bg-red-400' : 'bg-zinc-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 truncate">{note.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-400">{note.author}</span>
                    {note.assignee && <span className="text-[10px] text-blue-500">@{note.assignee}</span>}
                  </div>
                </div>
              </div>
            ))}
            {unresolvedNotes.length === 0 && (
              <div className="p-6 text-center text-sm text-zinc-500">{t('dashboard.allResolved') || 'All notes resolved!'}</div>
            )}
            {unresolvedNotes.length > 4 && (
              <button onClick={() => setActiveTab('shiftlog')} className="w-full p-2 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50">
                +{unresolvedNotes.length - 4} more
              </button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Guest Detail Modal */}
      <AnimatePresence>
        {selectedGuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setSelectedGuest(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-lg">
                    {selectedGuest.gender === 'female' ? '♀' : '♂'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                      {selectedGuest.name}
                      {sourceBadge(selectedGuest.source)}
                    </h3>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {selectedGuest.country}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedGuest(null)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              {/* Details */}
              <div className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase">{t('checkin.checkIn') || 'Check-in'}</span>
                    <p className="font-medium text-zinc-900 mt-0.5">{format(parseISO(selectedGuest.checkInDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase">{t('checkin.checkOut') || 'Check-out'}</span>
                    <p className="font-medium text-zinc-900 mt-0.5">{format(parseISO(selectedGuest.checkOutDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-600">
                  <span>{selectedGuest.nights} {t('dashboard.nights') || 'nights'}</span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    <span className={getPaymentStatusClass(selectedGuest.paymentStatus)}>
                      {selectedGuest.paymentStatus === 'paid' ? (t('checkin.paid') || 'Paid') : selectedGuest.paymentStatus === 'unpaid' ? (t('checkin.unpaid') || 'Unpaid') : (t('checkin.partial') || 'Partial')}
                    </span>
                  </span>
                </div>

                {/* Amount Details */}
                {selectedGuest.totalAmount && (
                  <div className="bg-zinc-50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">{t('guest.totalAmount') || 'Total'}</span>
                      <span className="font-medium text-zinc-900">${selectedGuest.totalAmount}</span>
                    </div>
                    {selectedGuest.paidAmount !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">{t('guest.paidAmount') || 'Paid'}</span>
                        <span className="font-medium text-emerald-600">${selectedGuest.paidAmount}</span>
                      </div>
                    )}
                    {selectedGuest.totalAmount && selectedGuest.paidAmount !== undefined && (
                      <div className="flex items-center justify-between text-xs border-t border-zinc-200 pt-1.5">
                        <span className="text-zinc-500">{t('dashboard.amountDue') || 'Due'}</span>
                        <span className="font-medium text-red-500">${selectedGuest.totalAmount - selectedGuest.paidAmount}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedGuest.dob && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>{t('guest.dob') || 'DOB'}: {selectedGuest.dob}</span>
                  </div>
                )}
                {selectedGuest.roomPreference && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Tag className="w-3 h-3 text-zinc-400" />
                    <span>{t('dashboard.roomPreference') || 'Room Pref'}: {selectedGuest.roomPreference}</span>
                  </div>
                )}
                {selectedGuest.passportOrId && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <FileText className="w-3 h-3 text-zinc-400" />
                    <span>{t('checkin.passportId') || 'Passport/ID'}: {selectedGuest.passportOrId}</span>
                  </div>
                )}
                {selectedGuest.phone && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    <span>{selectedGuest.phone}</span>
                  </div>
                )}
                {selectedGuest.email && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Mail className="w-3 h-3 text-zinc-400" />
                    <span>{selectedGuest.email}</span>
                  </div>
                )}
                {selectedGuest.notes && (
                  <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-600">
                    <span className="font-medium text-zinc-400">{t('checkin.notes') || 'Notes'}:</span> {selectedGuest.notes}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-100 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setSelectedGuest(null)}>
                  {t('staff.cancel') || 'Close'}
                </Button>
                <Button size="sm" className="flex-1 text-xs" onClick={() => { setSelectedGuest(null); setActiveTab('checkin'); }}>
                  {t('dashboard.checkIn') || 'Check In'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
