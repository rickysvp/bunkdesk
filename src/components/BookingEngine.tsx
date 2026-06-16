import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation, formatCurrency } from '../i18nContext';
import {
  CalendarDays,
  Users,
  BedDouble,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Tag,
  CheckCircle2,
  Share2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO, format } from 'date-fns';

const GROUP_DISCOUNT_THRESHOLD = 5;
const GROUP_DISCOUNT_RATE = 0.1;
const REFERRAL_DISCOUNT_RATE = 0.1;
const OTA_COMMISSION_LOW = 0.15;
const OTA_COMMISSION_HIGH = 0.25;

type Step = 1 | 2 | 3 | 4;

interface RoomOption {
  roomId: string;
  name: string;
  type: 'dorm-mixed' | 'dorm-female' | 'private';
  availableBeds: number;
  pricePerBed: number;
  priceRange: { min: number; max: number };
}

export function BookingEngine() {
  const { rooms, referrals, promotions, addArrival, addReferral, occupyBed } = useHostel();
  const { t, language } = useTranslation();

  const [step, setStep] = useState<Step>(1);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const nights = checkIn && checkOut ? Math.max(differenceInDays(parseISO(checkOut), parseISO(checkIn)), 1) : 0;

  // Build room options from hostel rooms
  const roomOptions: RoomOption[] = useMemo(() => {
    return rooms.map(room => {
      const availableBeds = room.beds.filter(b => b.status === 'empty');
      const base = room.pricePerNight;
      const bottom = base + (room.bottomBunkPremium || 0);
      return {
        roomId: room.id,
        name: room.name,
        type: room.type,
        availableBeds: availableBeds.length,
        pricePerBed: base,
        priceRange: { min: base, max: Math.max(base, bottom) },
      };
    }).filter(r => r.availableBeds > 0);
  }, [rooms]);

  const selectedRoom = roomOptions.find(r => r.roomId === selectedRoomId);

  // Price calculation
  const basePrice = selectedRoom
    ? selectedRoom.pricePerBed * guests * nights
    : 0;

  const groupDiscount = guests >= GROUP_DISCOUNT_THRESHOLD ? basePrice * GROUP_DISCOUNT_RATE : 0;

  // Find matching active promotions
  const activePromo = useMemo(() => {
    if (!selectedRoom) return null;
    const roomType = selectedRoom.type;
    const today = new Date().toISOString().split('T')[0];
    return promotions.find(p => {
      if (!p.active) return false;
      if (p.startDate && p.startDate > today) return false;
      if (p.endDate && p.endDate < today) return false;
      if (p.roomTypeFilter && p.roomTypeFilter !== roomType) return false;
      if (p.minNights && nights < p.minNights) return false;
      if (p.minGuests && guests < p.minGuests) return false;
      return true;
    });
  }, [promotions, selectedRoom, nights, guests]);

  const promoDiscount = activePromo ? (basePrice - groupDiscount) * (activePromo.discount / 100) : 0;

  const referralDiscount = referralApplied ? (basePrice - groupDiscount - promoDiscount) * REFERRAL_DISCOUNT_RATE : 0;
  const totalPrice = basePrice - groupDiscount - promoDiscount - referralDiscount;
  const otaCommissionLow = totalPrice * OTA_COMMISSION_LOW;
  const otaCommissionHigh = totalPrice * OTA_COMMISSION_HIGH;
  const otaSaved = (otaCommissionLow + otaCommissionHigh) / 2;

  const matchedReferral = referrals.find(r => r.code === referralCode.trim().toUpperCase());

  const applyReferral = () => {
    setReferralError('');
    if (!referralCode.trim()) {
      setReferralError(t('booking.referralEmpty'));
      return;
    }
    if (matchedReferral) {
      setReferralApplied(true);
      setReferralError('');
    } else {
      setReferralApplied(false);
      setReferralError(t('booking.referralInvalid'));
    }
  };

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return !!checkIn && !!checkOut && nights > 0;
      case 2:
        return !!selectedRoomId;
      case 3:
        return !!name.trim() && !!email.trim();
      default:
        return false;
    }
  };

  const handleConfirm = () => {
    // Add arrival to hostel context
    addArrival({
      name: name.trim(),
      country,
      countryCode: country,
      gender,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      paymentStatus: 'unpaid',
      totalAmount: totalPrice,
      paidAmount: 0,
      phone,
      email,
      passportScanned: false,
      source: referralApplied ? 'referral' : 'direct',
      roomPreference: selectedRoom?.name,
    });

    // Auto-assign guests to empty beds in the selected room
    if (selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        const emptyBeds = room.beds.filter(b => b.status === 'empty');
        const guestsToAssign = Math.min(guests, emptyBeds.length);
        for (let i = 0; i < guestsToAssign; i++) {
          const guestName = guests === 1 ? name.trim() : `${name.trim()} ${i + 1}`;
          occupyBed(emptyBeds[i].id, {
            name: guestName,
            country,
            countryCode: country,
            gender,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            nights,
            paymentStatus: 'unpaid',
            totalAmount: totalPrice / guests,
            paidAmount: 0,
            phone,
            email,
            passportScanned: false,
            source: referralApplied ? 'referral' : 'direct',
            roomPreference: selectedRoom?.name,
          });
        }
      }
    }

    // Generate referral code for the new guest
    const namePart = name.trim().split(' ')[0].toUpperCase().slice(0, 6);
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    const newCode = `BUNKDESK-${namePart}-${randomPart}`;
    setGeneratedCode(newCode);

    // Add referral to context
    addReferral({
      code: newCode,
      referrerGuestId: 'pending',
      referrerGuestName: name.trim(),
      usedByGuestIds: [],
      reward: '10% off',
      commissionSaved: otaSaved,
    });

    setConfirmed(true);
  };

  const resetBooking = () => {
    setStep(1);
    setCheckIn('');
    setCheckOut('');
    setGuests(1);
    setSelectedRoomId(null);
    setGender('male');
    setName('');
    setEmail('');
    setPhone('');
    setCountry('');
    setReferralCode('');
    setReferralApplied(false);
    setReferralError('');
    setConfirmed(false);
    setGeneratedCode('');
  };

  const roomTypeLabel = (type: RoomOption['type']) => {
    switch (type) {
      case 'dorm-mixed': return t('booking.dormMixed');
      case 'dorm-female': return t('booking.dormFemale');
      case 'private': return t('booking.privateRoom');
    }
  };

  const roomTypeIcon = (type: RoomOption['type']) => {
    switch (type) {
      case 'dorm-mixed': return '🛏️';
      case 'dorm-female': return '♀️';
      case 'private': return '🔒';
    }
  };

  const stepLabels = [
    t('booking.step1Label'),
    t('booking.step2Label'),
    t('booking.step3Label'),
    t('booking.step4Label'),
  ];

  const shareText = `${t('booking.shareText')} ${generatedCode}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      {/* Step Indicator */}
      <div className="mb-6 sm:mb-8 flex items-center justify-center gap-1.5 sm:gap-2">
        {([1, 2, 3, 4] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  s < step
                    ? 'bg-emerald-500 text-white'
                    : s === step
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-200'
                    : 'bg-zinc-200 text-zinc-500'
                }`}
              >
                {s < step ? <CheckCircle2 className="size-3.5 sm:size-4" /> : s}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-medium ${s === step ? 'text-emerald-700' : 'text-zinc-400'}`}>
                {stepLabels[i]}
              </span>
            </div>
            {i < 3 && (
              <div className={`h-0.5 w-4 sm:w-8 rounded-full transition-all ${s < step ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select Dates */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-emerald-600" />
              {t('booking.selectDates')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600">{t('booking.checkIn')}</label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600">{t('booking.checkOut')}</label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  min={checkIn || format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>

            {nights > 0 && (
              <p className="text-sm text-zinc-500">
                {t('booking.nightCount', `${nights}`)} {nights > 1 ? t('booking.nights') : t('booking.night')}
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">{t('booking.guests')}</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                >
                  −
                </Button>
                <span className="w-8 text-center font-semibold">{guests}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setGuests(Math.min(10, guests + 1))}
                  disabled={guests >= 10}
                >
                  +
                </Button>
                {guests > 1 && (
                  <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">
                    {t('booking.groupBooking')}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Room Type */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="size-5 text-emerald-600" />
              {t('booking.selectRoom')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roomOptions.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-400">{t('booking.noRooms')}</p>
            )}
            {roomOptions.map(room => {
              const isSelected = selectedRoomId === room.roomId;
              const isFemaleDorm = room.type === 'dorm-female';
              const showGenderWarning = isFemaleDorm && gender === 'male';
              const hasEnoughBeds = room.availableBeds >= guests;

              return (
                <button
                  key={room.roomId}
                  onClick={() => {
                    if (hasEnoughBeds) setSelectedRoomId(room.roomId);
                  }}
                  disabled={!hasEnoughBeds}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : hasEnoughBeds
                      ? 'border-zinc-200 bg-white hover:border-zinc-300'
                      : 'cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{roomTypeIcon(room.type)}</span>
                      <div>
                        <p className="font-medium text-zinc-900">{room.name}</p>
                        <p className="text-xs text-zinc-500">{roomTypeLabel(room.type)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">
                        {room.priceRange.min === room.priceRange.max
                          ? formatCurrency(room.priceRange.min, language)
                          : `${formatCurrency(room.priceRange.min, language)}–${formatCurrency(room.priceRange.max, language)}`}
                      </p>
                      <p className="text-[10px] text-zinc-400">{t('booking.perBedNight')}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {room.availableBeds} {t('booking.bedsAvailable')}
                    </Badge>
                    {!hasEnoughBeds && (
                      <Badge variant="destructive" className="text-[10px]">
                        {t('booking.notEnoughBeds')}
                      </Badge>
                    )}
                  </div>
                  {showGenderWarning && isSelected && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>{t('booking.femaleDormWarning')}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Guest Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-600" />
              {t('booking.guestDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">{t('booking.fullName')} *</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('booking.namePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">{t('booking.email')} *</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600">{t('booking.phone')}</label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 0123"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600">{t('booking.country')}</label>
                <Input
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  placeholder="US"
                  maxLength={3}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">{t('booking.gender')}</label>
              <div className="flex gap-2">
                {(['male', 'female', 'other'] as const).map(g => (
                  <Button
                    key={g}
                    variant={gender === g ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGender(g)}
                    className={gender === g ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    {g === 'male' ? t('booking.male') : g === 'female' ? t('booking.female') : t('booking.otherGender')}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">{t('booking.referralCode')}</label>
              <div className="flex gap-2">
                <Input
                  value={referralCode}
                  onChange={e => {
                    setReferralCode(e.target.value);
                    if (referralApplied) {
                      setReferralApplied(false);
                    }
                    setReferralError('');
                  }}
                  placeholder={t('booking.referralPlaceholder')}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyReferral}
                  className="shrink-0"
                >
                  <Tag className="mr-1 size-3.5" />
                  {t('booking.apply')}
                </Button>
              </div>
              {referralApplied && matchedReferral && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3.5" />
                  <span>{t('booking.referralApplied')} — {matchedReferral.reward}</span>
                </div>
              )}
              {referralError && (
                <p className="text-xs text-red-500">{referralError}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && !confirmed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              {t('booking.confirmation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="space-y-2 rounded-xl bg-zinc-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">{t('booking.dates')}</span>
                <span className="font-medium">{checkIn} → {checkOut} ({nights} {nights > 1 ? t('booking.nights') : t('booking.night')})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">{t('booking.roomType')}</span>
                <span className="font-medium">{selectedRoom?.name} ({roomTypeLabel(selectedRoom!.type)})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">{t('booking.guests')}</span>
                <span className="font-medium">{guests} {guests > 1 ? t('booking.guestsPlural') : t('booking.guestSingular')}</span>
              </div>
              <div className="border-t border-zinc-200 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">{t('booking.basePrice')}</span>
                  <span>{formatCurrency(basePrice, language)}</span>
                </div>
                {groupDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>{t('booking.groupDiscount')} (10%)</span>
                    <span>−{formatCurrency(groupDiscount, language)}</span>
                  </div>
                )}
                {promoDiscount > 0 && activePromo && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>{t('booking.promoDiscount')} ({activePromo.name} {activePromo.discount}%)</span>
                    <span>−{formatCurrency(promoDiscount, language)}</span>
                  </div>
                )}
                {referralDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>{t('booking.referralDiscount')} (10%)</span>
                    <span>−{formatCurrency(referralDiscount, language)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-bold">
                  <span>{t('booking.total')}</span>
                  <span className="text-emerald-700">{formatCurrency(totalPrice, language)}</span>
                </div>
              </div>
            </div>

            {/* OTA Savings */}
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  {t('booking.otaSaved')} {formatCurrency(otaSaved, language)} {t('booking.otaSavedSuffix')}
                </p>
                <p className="text-xs text-emerald-600">
                  {t('booking.otaSavedDesc')}
                </p>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 text-base hover:bg-emerald-700"
              size="lg"
              onClick={handleConfirm}
            >
              <CheckCircle2 className="mr-2 size-5" />
              {t('booking.confirmBooking')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {step === 4 && confirmed && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">{t('booking.bookingConfirmed')}</h3>
            <p className="mt-1 text-sm text-zinc-500">{t('booking.bookingConfirmedDesc')}</p>

            <div className="mx-auto mt-6 max-w-xs rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-4">
              <p className="text-xs font-medium text-emerald-600">{t('booking.yourReferralCode')}</p>
              <p className="mt-1 text-xl font-bold tracking-wider text-emerald-800">{generatedCode}</p>
              <p className="mt-1 text-[10px] text-emerald-500">{t('booking.referralCodeDesc')}</p>
            </div>

            <div className="mx-auto mt-6 max-w-xs space-y-2">
              <p className="text-xs font-medium text-zinc-500">{t('booking.shareWithFriends')}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const url = `https://www.instagram.com/`;
                    window.open(url, '_blank');
                  }}
                >
                  <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  Instagram
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-6"
              onClick={resetBooking}
            >
              {t('booking.newBooking')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {!(step === 4 && confirmed) && (
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((step - 1) as Step)}>
              <ChevronLeft className="mr-1 size-4" />
              {t('booking.back')}
            </Button>
          ) : (
            <div />
          )}
          {step < 4 && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!canGoNext()}
              onClick={() => setStep((step + 1) as Step)}
            >
              {t('booking.next')}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
