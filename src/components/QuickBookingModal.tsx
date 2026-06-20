import React, { useEffect, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, IdCard } from 'lucide-react';
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
import { toast } from 'sonner';

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
  const [idType, setIdType] = useState<'passport' | 'idCard' | 'driverLicense'>('passport');
  const [passportOrId, setPassportOrId] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setCountryCode('');
    setGender('male');
    setCheckInDate(format(initialDate, 'yyyy-MM-dd'));
    setCheckOutDate(format(addDays(initialDate, 1), 'yyyy-MM-dd'));
    setSource('walk-in');
    setIdType('passport');
    setPassportOrId('');
    setIsSuccess(false);
  }, [isOpen, initialDate, bed.id, room.id]);

  const nights = Math.max(1, Math.round((parseISO(checkOutDate).getTime() - parseISO(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
  const pricePerNight = getBedPrice(room, bed);
  const totalAmount = nights * pricePerNight;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !countryCode) return;
    // 护照/证件号必填校验
    if (!passportOrId.trim()) {
      toast.error(t('calendarview.passportRequired') || '请填写护照/证件号');
      return;
    }

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
      passportScanned: true,
      passportOrId: passportOrId.trim(),
      idType,
      roomPreference: room.name,
    };

    const guestId = addArrival(guestInput);
    occupyBed(bed.id, guestInput, guestId);

    toast.success(`${name.trim()} 已预订 ${bed.name}`);
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
      setIdType('passport');
      setPassportOrId('');
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="bg-card rounded-2xl shadow-modal max-w-sm w-full overflow-hidden ring-1 ring-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-success" />
                <h3 className="font-semibold text-foreground">{t('calendarview.quickBooking')}</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </motion.div>
                <p className="font-semibold text-success">{t('calendarview.bookingCreated')}</p>
                <p className="text-xs text-muted-foreground">{bed.name} · {nights}N · {formatCurrency(totalAmount, language)}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{bed.name}</span>
                  <span className="text-xs font-semibold text-success">${pricePerNight}/N</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('calendarview.guestName')}</Label>
                  <Input required placeholder={t('calendarview.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" autoFocus />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('calendarview.country')}</Label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('calendarview.selectCountry')} /></SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map(c => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('calendarview.gender')}</Label>
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
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('calendarview.checkIn')}</Label>
                    <Input type="date" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('calendarview.checkOut')}</Label>
                    <Input type="date" required value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="h-9 text-sm" min={checkInDate} />
                  </div>
                </div>

                {/* 护照/证件 — 必填 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.idType.label')}<span className="text-red-500">*</span></Label>
                    <Select value={idType} onValueChange={(v: string) => setIdType(v as 'passport' | 'idCard' | 'driverLicense')}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">{t('checkin.idType.passport')}</SelectItem>
                        <SelectItem value="idCard">{t('checkin.idType.idCard')}</SelectItem>
                        <SelectItem value="driverLicense">{t('checkin.idType.driverLicense')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.passportOrId')}<span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <IdCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input required className="pl-8 h-9 text-sm" value={passportOrId} onChange={(e) => setPassportOrId(e.target.value)} placeholder="AB1234567" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('calendarview.source')}</Label>
                  <Select value={source} onValueChange={(v: string) => setSource(v as 'walk-in' | 'manual')}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('calendarview.selectSource')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">{t('dashboard.sourceWalkIn')}</SelectItem>
                      <SelectItem value="manual">{t('dashboard.sourceManual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted rounded-lg p-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{nights} {t('dashboard.nights')} × ${pricePerNight}</span>
                  <span className="font-bold text-foreground">${totalAmount}</span>
                </div>

                <Button type="submit" className="w-full h-9 text-sm" disabled={!name.trim() || !countryCode || !passportOrId.trim()}>
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
