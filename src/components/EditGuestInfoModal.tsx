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
  referral?: string;
  bookingSource?: Guest['bookingSource'];
  dob?: string;
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
        referral: guest.referral ?? '',
        bookingSource: guest.bookingSource,
        dob: guest.dob ?? '',
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
      referral: draft.referral || undefined,
      bookingSource: draft.bookingSource,
      dob: draft.dob || undefined,
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
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-zinc-900">{t('checkin.editInfo')}</h3>
              <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg">
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.firstName')}</Label>
                  <Input value={draft.firstName ?? ''} onChange={e => setDraft({...draft, firstName: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.lastName')}</Label>
                  <Input value={draft.lastName ?? ''} onChange={e => setDraft({...draft, lastName: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.phone')}</Label>
                  <Input type="tel" value={draft.phone ?? ''} onChange={e => setDraft({...draft, phone: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.email')}</Label>
                  <Input type="email" value={draft.email ?? ''} onChange={e => setDraft({...draft, email: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.idType.label')}</Label>
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
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.passportOrId')}</Label>
                  <Input value={draft.passportOrId ?? ''} onChange={e => setDraft({...draft, passportOrId: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.arrivalTime.label')}</Label>
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
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.source.label')}</Label>
                  <Select value={draft.bookingSource ?? 'walk-in'} onValueChange={(val: string) => setDraft({...draft, bookingSource: val as Guest['bookingSource']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">{t('checkin.source.walkIn')}</SelectItem>
                      <SelectItem value="phone">{t('checkin.source.phone')}</SelectItem>
                      <SelectItem value="email">{t('checkin.source.email')}</SelectItem>
                      <SelectItem value="referral">{t('checkin.source.referral')}</SelectItem>
                      <SelectItem value="other">{t('checkin.source.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.referral')}</Label>
                  <Input value={draft.referral ?? ''} onChange={e => setDraft({...draft, referral: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.dob') || 'DOB'}</Label>
                  <Input type="date" value={draft.dob ?? ''} onChange={e => setDraft({...draft, dob: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('guest.gender') || 'Gender'}</Label>
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
                <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.notes')}</Label>
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
