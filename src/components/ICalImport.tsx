import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Link, CheckSquare, Square, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '../i18nContext';
import { parseICal, ParsedEvent } from '../utils/icalParser';
import { Guest } from '../types';

function parseSummaryToName(summary: string): { firstName: string; lastName: string; name: string } {
  const s = summary.trim();
  if (!s) return { firstName: '', lastName: '', name: '' };

  // 1. "Last, First" format (Western name order)
  if (s.includes(',')) {
    const [lastPart, firstPart] = s.split(',').map(x => x.trim());
    const last = lastPart || '';
    const first = firstPart || '';
    return { firstName: first, lastName: last, name: [first, last].filter(Boolean).join(' ') };
  }

  // 2. "First Last" format (default)
  const parts = s.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', name: parts[0] };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName, name: [firstName, lastName].filter(Boolean).join(' ') };
}

function mapEventToGuest(event: ParsedEvent): Omit<Guest, 'id'> {
  const checkIn = new Date(event.dtStart);
  const checkOut = new Date(event.dtEnd);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const parsedName = parseSummaryToName(event.summary);

  return {
    name: parsedName.name,
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    country: '',
    countryCode: '',
    checkInDate: event.dtStart,
    checkOutDate: event.dtEnd,
    nights,
    paymentStatus: 'unpaid',
    passportScanned: false,
    source: 'ical',
    notes: event.description || undefined,
    roomPreference: event.location || undefined,
  };
}

interface ICalImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (guests: Omit<Guest, 'id'>[]) => void;
}

export function ICalImport({ open, onClose, onImport }: ICalImportProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fetched, setFetched] = useState(false);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setEvents([]);
    setSelected(new Set());
    setFetched(false);

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url.trim())}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('fetch');
      const text = await res.text();
      const parsed = parseICal(text);
      if (parsed.length === 0) {
        setError(t('checkin.noEventsFound'));
      } else {
        setEvents(parsed);
        setSelected(new Set(parsed.map((_, i) => i)));
      }
    } catch {
      setError(t('checkin.fetchError'));
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleImport = () => {
    const guests = events
      .filter((_, i) => selected.has(i))
      .map(mapEventToGuest);
    if (guests.length > 0) {
      onImport(guests);
      handleClose();
    }
  };

  const handleClose = () => {
    setUrl('');
    setEvents([]);
    setSelected(new Set());
    setError('');
    setFetched(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900">{t('checkin.importICal')}</h3>
          <button onClick={handleClose} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* URL Input */}
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                className="pl-9 h-10 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
            <Button
              size="sm"
              className="h-10 px-4"
              onClick={handleFetch}
              disabled={loading || !url.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('checkin.fetch')}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Preview List */}
          {events.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium">{t('checkin.selectToImport')}</p>
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {events.map((evt, idx) => (
                  <button
                    key={evt.uid || idx}
                    onClick={() => toggleSelect(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selected.has(idx) ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {selected.has(idx) ? (
                        <CheckSquare className="w-4 h-4 text-zinc-900 mt-0.5 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{evt.summary}</p>
                        <p className="text-xs text-zinc-500">
                          {evt.dtStart} → {evt.dtEnd}
                        </p>
                        {evt.description && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{evt.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {fetched && events.length === 0 && !error && (
            <div className="py-4 text-center text-sm text-zinc-500">{t('checkin.noEventsFound')}</div>
          )}
        </div>

        {/* Footer */}
        {events.length > 0 && (
          <div className="p-4 border-t border-zinc-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              {t('staff.cancel')}
            </Button>
            <Button size="sm" onClick={handleImport} disabled={selected.size === 0}>
              {t('checkin.confirmImport')} ({selected.size})
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
