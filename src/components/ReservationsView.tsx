import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import { Guest, Bed } from '../types';
import { Search, Plus, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export function ReservationsView({ setActiveTab }: { setActiveTab: (t: string) => void }) {
  const { arrivals, rooms } = useHostel();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Gather all reservations
  const allReservations = useMemo<{ guest: Guest; status: string; bed?: Bed }[]>(() => [
    // 1. Pending Arrivals
    ...arrivals.map(g => ({ guest: g, status: 'pending_arrival' })),
    // 2. Currently Checked In / Reserved on a bed
    ...rooms.flatMap(r => r.beds.flatMap(b => [
      ...(b.guest ? [{ guest: b.guest, status: 'checked_in', bed: b }] : []),
      ...(b.reservations ? b.reservations.map(res => ({ guest: res, status: 'reserved', bed: b })) : []),
    ]))
  ].sort((a, b) => parseISO(a.guest.checkInDate).getTime() - parseISO(b.guest.checkInDate).getTime()), [arrivals, rooms]);

  const filteredReservations = useMemo(() => allReservations.filter(r => {
    const matchesSearch = r.guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.guest.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [allReservations, searchQuery, statusFilter]);

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 overflow-auto hide-scrollbar p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder={t('reservations.searchBookings')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all text-zinc-900 placeholder:text-zinc-400 font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-white border border-zinc-200 rounded-lg p-1 w-full sm:w-auto overflow-x-auto hide-scrollbar">
            <button onClick={() => setStatusFilter('all')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap", statusFilter === 'all' ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>
               {t('reservations.allStatus')}
            </button>
            <button onClick={() => setStatusFilter('pending_arrival')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap", statusFilter === 'pending_arrival' ? "bg-amber-100 text-amber-900" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50")}>
               {t('reservations.pendingArrival')}
            </button>
            <button onClick={() => setStatusFilter('checked_in')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap", statusFilter === 'checked_in' ? "bg-emerald-100 text-emerald-900" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50")}>
               {t('reservations.checkedIn')}
            </button>
            <button onClick={() => setStatusFilter('reserved')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap", statusFilter === 'reserved' ? "bg-blue-100 text-blue-900" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50")}>
               {t('reservations.reserved')}
            </button>
          </div>
          <Button size="sm" className="h-10 gap-2 shrink-0 shadow-sm ml-auto" onClick={() => setActiveTab('checkin')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reservations.newReservation')}</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.guest')}</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.dates')}</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.bed')}</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('reservations.payment')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredReservations.map((r, i) => (
                <tr key={`${r.guest.id}-${i}`} className="hover:bg-zinc-50/50 transition-colors group cursor-default">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-sm">
                        {r.guest.name.charAt(0)}
                      </div>
                      <div className="flex flex-col border-none">
                        <span className="text-sm font-semibold text-zinc-900 border-none">{r.guest.name}</span>
                        <span className="text-xs font-medium text-zinc-500 border-none">{r.guest.countryCode}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-zinc-800 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {format(parseISO(r.guest.checkInDate), 'MMM d')} - {format(parseISO(r.guest.checkOutDate), 'MMM d')}
                      </div>
                      <span className="text-xs text-zinc-500">{r.guest.nights} {t('dashboard.nights')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {r.bed ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-900 border-none">{r.bed.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 bg-zinc-100 text-zinc-500 rounded border-none">{t('reservations.unassigned')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
                      r.status === 'pending_arrival' && "bg-amber-50 text-amber-700 border-amber-200",
                      r.status === 'checked_in' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                      r.status === 'reserved' && "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {r.status === 'pending_arrival' && t('reservations.pendingArrival')}
                      {r.status === 'checked_in' && t('reservations.checkedIn')}
                      {r.status === 'reserved' && t('reservations.reserved')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase",
                      r.guest.paymentStatus === 'paid' ? "text-emerald-600 bg-emerald-50" : 
                      r.guest.paymentStatus === 'unpaid' ? "text-red-600 bg-red-50" : 
                      "text-amber-600 bg-amber-50"
                    )}>
                      {r.guest.paymentStatus === 'paid' ? t('checkin.paid') : r.guest.paymentStatus === 'unpaid' ? t('checkin.unpaid') : t('checkin.partial')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReservations.length === 0 && (
            <div className="p-8 text-center text-zinc-500 font-medium">
              {t('reservations.noReservations')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
