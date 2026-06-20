import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '../i18nContext';
import { motion, AnimatePresence } from 'motion/react';
import type { Guest } from '../types';

export interface GuestInfoUpdates {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  idType?: Guest['idType'];
  passportOrId?: string;
  arrivalTime?: Guest['arrivalTime'];
  bookingSource?: Guest['bookingSource'];
  bedPreference?: Guest['bedPreference'];
  gender?: Guest['gender'];
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  guest: Guest;
  onSave: (updates: GuestInfoUpdates) => void;
}

export function EditGuestInfoModal({ open, onClose, guest, onSave }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<GuestInfoUpdates>({});

  useEffect(() => {
    if (open) {
      setDraft({
        firstName: guest.firstName ?? '',
        lastName: guest.lastName ?? '',
        phone: guest.phone ?? '',
        email: guest.email ?? '',
        idType: guest.idType,
        passportOrId: guest.passportOrId ?? '',
        arrivalTime: guest.arrivalTime,
        bookingSource: guest.bookingSource,
        bedPreference: guest.bedPreference,
        gender: guest.gender,
        notes: guest.notes ?? '',
      });
    }
  }, [open, guest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstName: draft.firstName || undefined,
      lastName: draft.lastName || undefined,
      phone: draft.phone || undefined,
      email: draft.email || undefined,
      idType: draft.idType,
      passportOrId: draft.passportOrId || undefined,
      arrivalTime: draft.arrivalTime,
      bookingSource: draft.bookingSource,
      bedPreference: draft.bedPreference,
      gender: draft.gender,
      notes: draft.notes || undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="bg-card rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto ring-1 ring-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="text-base font-semibold text-foreground">{t('checkin.editInfo')}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.firstName')}</Label>
                  <Input value={draft.firstName ?? ''} onChange={e => setDraft({...draft, firstName: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.lastName')}</Label>
                  <Input value={draft.lastName ?? ''} onChange={e => setDraft({...draft, lastName: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.phone')}</Label>
                  <Input type="tel" value={draft.phone ?? ''} onChange={e => setDraft({...draft, phone: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.email')}</Label>
                  <Input type="email" value={draft.email ?? ''} onChange={e => setDraft({...draft, email: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.idType.label')}</Label>
                  <Select value={draft.idType ?? 'passport'} onValueChange={(val: string) => setDraft({...draft, idType: val as Guest['idType']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">{t('checkin.idType.passport')}</SelectItem>
                      <SelectItem value="idCard">{t('checkin.idType.idCard')}</SelectItem>
                      <SelectItem value="driverLicense">{t('checkin.idType.driverLicense')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.passportOrId')}</Label>
                  <Input value={draft.passportOrId ?? ''} onChange={e => setDraft({...draft, passportOrId: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.arrivalTime.label')}</Label>
                  <Select value={draft.arrivalTime ?? ''} onValueChange={(val: string) => setDraft({...draft, arrivalTime: val as Guest['arrivalTime']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">{t('checkin.arrivalTime.morning')}</SelectItem>
                      <SelectItem value="afternoon">{t('checkin.arrivalTime.afternoon')}</SelectItem>
                      <SelectItem value="evening">{t('checkin.arrivalTime.evening')}</SelectItem>
                      <SelectItem value="late">{t('checkin.arrivalTime.late')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.source.label')}</Label>
                  <Select value={draft.bookingSource ?? 'walk-in'} onValueChange={(val: string) => setDraft({...draft, bookingSource: val as Guest['bookingSource']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.bedPreference') || 'Bed Preference'}</Label>
                  <Select value={draft.bedPreference ?? ''} onValueChange={(val: string) => setDraft({...draft, bedPreference: val as Guest['bedPreference']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t('checkin.noPreference') || 'No preference'}</SelectItem>
                      <SelectItem value="bottom">{t('checkin.bottomBunk') || 'Bottom bunk'}</SelectItem>
                      <SelectItem value="top">{t('checkin.topBunk') || 'Top bunk'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('guest.gender') || 'Gender'}</Label>
                  <Select value={draft.gender ?? ''} onValueChange={(val: string) => setDraft({...draft, gender: val as Guest['gender']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('guest.male') || 'Male'}</SelectItem>
                      <SelectItem value="female">{t('guest.female') || 'Female'}</SelectItem>
                      <SelectItem value="other">{t('guest.other') || 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500 uppercase">{t('checkin.notes')}</Label>
                <Input value={draft.notes ?? ''} onChange={e => setDraft({...draft, notes: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
              </div>
              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} size="sm" className="h-9 text-xs">{t('common.cancel') || 'Cancel'}</Button>
                <Button type="submit" size="sm" className="h-9 text-xs">{t('common.save') || 'Save'}</Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
