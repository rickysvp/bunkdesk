import React, { useEffect, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation, formatCurrency } from '../i18nContext';
import { useHostel } from '../HostelContext';
import { Guest, Bed, Room } from '../types';
import { getBedPrice } from '../utils/bedPricing';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bed: Bed;
  room: Room;
  initialDate: Date;
}

const COUNTRY_OPTIONS = [
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'South Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CA', name: 'Canada' },
  { code: 'SE', name: 'Sweden' },
  { code: 'IL', name: 'Israel' },
];

export function QuickBookingModal({ isOpen, onClose, bed, room, initialDate }: QuickBookingModalProps) {
  const { t, language } = useTranslation();
  const { addArrival, occupyBed } = useHostel();

  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [checkInDate, setCheckInDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [checkOutDate, setCheckOutDate] = useState(format(addDays(initialDate, 1), 'yyyy-MM-dd'));
  const [source, setSource] = useState<'walk-in' | 'manual'>('walk-in');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setCountryCode('');
    setGender('male');
    setCheckInDate(format(initialDate, 'yyyy-MM-dd'));
    setCheckOutDate(format(addDays(initialDate, 1), 'yyyy-MM-dd'));
    setSource('walk-in');
    setIsSuccess(false);
  }, [isOpen, initialDate, bed.id, room.id]);

  const nights = Math.max(1, Math.round((parseISO(checkOutDate).getTime() - parseISO(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
  const pricePerNight = getBedPrice(room, bed);
  const totalAmount = nights * pricePerNight;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !countryCode) return;

    // Build the guest payload once and reuse for both addArrival and occupyBed
    // to keep the two states in lock-step.
    const countryName = COUNTRY_OPTIONS.find(c => c.code === countryCode)?.name || countryCode;
    const guestInput: Omit<Guest, 'id'> = {
      name: name.trim(),
      country: countryName,
      countryCode,
      gender,
      checkInDate,
      checkOutDate,
      nights,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      totalAmount,
      source,
      passportScanned: false,
      roomPreference: room.name,
    };

    const guestId = addArrival(guestInput);
    occupyBed(bed.id, guestInput, guestId);

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      setName('');
      setCountryCode('');
      setGender('male');
      setCheckInDate(format(initialDate, 'yyyy-MM-dd'));
      setCheckOutDate(format(addDays(initialDate, 1), 'yyyy-MM-dd'));
      setSource('walk-in');
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-zinc-900">{t('calendarview.quickBooking')}</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-semibold text-emerald-700">{t('calendarview.bookingCreated')}</p>
                <p className="text-xs text-zinc-500">{bed.name} · {nights}N · {formatCurrency(totalAmount, language)}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="bg-zinc-50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">{bed.name}</span>
                  <span className="text-xs font-semibold text-emerald-600">${pricePerNight}/N</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.guestName')}</Label>
                  <Input required placeholder={t('calendarview.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" autoFocus />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.country')}</Label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('calendarview.selectCountry')} /></SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map(c => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.gender')}</Label>
                    <Select value={gender} onValueChange={(v: string) => setGender(v as 'male' | 'female' | 'other')}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('calendarview.selectGender')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('guest.male')}</SelectItem>
                        <SelectItem value="female">{t('guest.female')}</SelectItem>
                        <SelectItem value="other">{t('guest.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.checkIn')}</Label>
                    <Input type="date" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.checkOut')}</Label>
                    <Input type="date" required value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="h-9 text-sm" min={checkInDate} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.source')}</Label>
                  <Select value={source} onValueChange={(v: string) => setSource(v as 'walk-in' | 'manual')}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('calendarview.selectSource')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">{t('dashboard.sourceWalkIn')}</SelectItem>
                      <SelectItem value="manual">{t('dashboard.sourceManual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-zinc-50 rounded-lg p-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{nights} {t('dashboard.nights')} × ${pricePerNight}</span>
                  <span className="font-bold text-zinc-900">${totalAmount}</span>
                </div>

                <Button type="submit" className="w-full h-9 text-sm" disabled={!name.trim() || !countryCode}>
                  {t('calendarview.createBooking')}
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
