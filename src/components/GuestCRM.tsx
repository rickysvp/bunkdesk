import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation, formatCurrency } from '../i18nContext';
import { GuestProfile, GuestTag } from '../types';
import { findRecallCandidates, getTagLabel, syncGuestProfiles } from '../utils/guestCrmEngine';
import { Users, Search, Tag, Mail, Phone, MessageCircle, Star, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type CRMView = 'all' | 'recall' | 'tags';

export function GuestCRM() {
  const { rooms, arrivals, guestProfiles, addGuestProfile, updateGuestProfile } = useHostel();
  const { t, language } = useTranslation();
  const [view, setView] = useState<CRMView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<GuestProfile | null>(null);
  const [tagFilter, setTagFilter] = useState<GuestTag | null>(null);

  const syncResult = useMemo(() => syncGuestProfiles(guestProfiles, rooms, arrivals), [guestProfiles, rooms, arrivals]);

  const recallCandidates = useMemo(() => findRecallCandidates(guestProfiles), [guestProfiles]);

  const filteredProfiles = useMemo(() => {
    let profiles = guestProfiles;

    if (view === 'recall') {
      profiles = recallCandidates;
    }

    if (tagFilter) {
      profiles = profiles.filter(p => p.tags.includes(tagFilter));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      profiles = profiles.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    }

    return profiles.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [guestProfiles, view, recallCandidates, tagFilter, searchQuery]);

  const allTags = useMemo(() => {
    const tagSet = new Set<GuestTag>();
    guestProfiles.forEach(p => p.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [guestProfiles]);

  const totalGuests = guestProfiles.length;
  const totalRepeatGuests = guestProfiles.filter(p => p.tags.includes('repeat-guest')).length;
  const totalRecallable = recallCandidates.length;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border shadow-none bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 leading-none">{totalGuests}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t('crm.totalGuests')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-500">
              <Star className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 leading-none">{totalRepeatGuests}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t('crm.repeatGuests')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setView(view === 'recall' ? 'all' : 'recall')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-500">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 leading-none">{totalRecallable}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t('crm.toRecall')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {([
            { id: 'all' as CRMView, label: t('crm.allGuests') },
            { id: 'recall' as CRMView, label: t('crm.recallCandidates') },
            { id: 'tags' as CRMView, label: t('crm.byTag') },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setView(tab.id); setTagFilter(null); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                view === tab.id ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            className="pl-9 h-9"
            placeholder={t('crm.searchGuests')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tag Filter */}
      {view === 'tags' && (
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => {
            const label = getTagLabel(tag);
            return (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  tagFilter === tag ? label.color + ' ring-2 ring-offset-1' : label.color + ' opacity-60 hover:opacity-100'
                )}
              >
                {language === 'zh' ? label.zh : label.en}
              </button>
            );
          })}
        </div>
      )}

      {/* Sync Notice */}
      {syncResult.toAdd.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-amber-700">
              {syncResult.toAdd.length} {t('crm.newProfilesToSync')}
            </span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <RefreshCw className="h-3 w-3" />
              {t('crm.syncNow')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Guest List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredProfiles.map((profile, i) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card
                className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => setSelectedProfile(profile)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600 shrink-0">
                    {profile.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 truncate">{profile.name}</span>
                      <span className="text-[10px] text-zinc-400">{profile.countryCode}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-500">{profile.totalStays}x {t('crm.stays')}</span>
                      <span className="text-xs text-zinc-500">{profile.totalNights}N</span>
                      <span className="text-xs font-medium text-emerald-600">{formatCurrency(profile.totalSpent, language)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {profile.tags.slice(0, 3).map(tag => {
                      const label = getTagLabel(tag);
                      return (
                        <span key={tag} className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", label.color)}>
                          {language === 'zh' ? label.zh : label.en}
                        </span>
                      );
                    })}
                    {profile.tags.length > 3 && (
                      <span className="text-[10px] text-zinc-400">+{profile.tags.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {profile.email && <Mail className="h-3.5 w-3.5 text-zinc-300" />}
                    {profile.whatsapp && <MessageCircle className="h-3.5 w-3.5 text-green-400" />}
                    {profile.phone && <Phone className="h-3.5 w-3.5 text-zinc-300" />}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredProfiles.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-500">
            {view === 'recall'
              ? (t('crm.noRecallCandidates'))
              : (t('crm.noGuests'))
            }
          </div>
        )}
      </div>

      {/* Guest Detail Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setSelectedProfile(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-zinc-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-lg font-medium text-zinc-600">
                    {selectedProfile.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900">{selectedProfile.name}</h3>
                    <span className="text-xs text-zinc-500">{selectedProfile.country}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedProfile(null)} className="p-1 hover:bg-zinc-100 rounded-lg">
                  <span className="text-zinc-400 text-lg">&times;</span>
                </button>
              </div>
              <div className="p-5 grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-zinc-900">{selectedProfile.totalStays}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{t('crm.stays')}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-zinc-900">{selectedProfile.totalNights}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{t('crm.nights')}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-emerald-600">{formatCurrency(selectedProfile.totalSpent, language)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{t('crm.spent')}</p>
                </div>
              </div>
              <div className="px-5 pb-4">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-2">{t('crm.tags')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.tags.map(tag => {
                    const label = getTagLabel(tag);
                    return (
                      <span key={tag} className={cn("text-xs font-medium px-2 py-1 rounded-lg", label.color)}>
                        {language === 'zh' ? label.zh : label.en}
                      </span>
                    );
                  })}
                  {selectedProfile.tags.length === 0 && (
                    <span className="text-xs text-zinc-400">{t('crm.noTags')}</span>
                  )}
                </div>
              </div>
              <div className="px-5 pb-4 space-y-2">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-2">{t('crm.contact')}</p>
                {selectedProfile.email && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Mail className="h-3.5 w-3.5 text-zinc-400" /> {selectedProfile.email}
                  </div>
                )}
                {selectedProfile.phone && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Phone className="h-3.5 w-3.5 text-zinc-400" /> {selectedProfile.phone}
                  </div>
                )}
                {selectedProfile.whatsapp && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <MessageCircle className="h-3.5 w-3.5 text-green-500" /> {selectedProfile.whatsapp}
                  </div>
                )}
                {!selectedProfile.email && !selectedProfile.phone && !selectedProfile.whatsapp && (
                  <span className="text-xs text-zinc-400">{t('crm.noContact')}</span>
                )}
              </div>
              <div className="px-5 pb-5">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-2">{t('crm.stayHistory')}</p>
                <div className="text-xs text-zinc-500">
                  {t('crm.firstStay')}: {format(parseISO(selectedProfile.firstStayDate), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-zinc-500">
                  {t('crm.lastStay')}: {format(parseISO(selectedProfile.lastStayDate), 'MMM d, yyyy')}
                </div>
              </div>
              <div className="p-4 border-t border-zinc-100 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5">
                  <Tag className="h-3 w-3" />
                  {t('crm.editTags')}
                </Button>
                <Button size="sm" className="flex-1 text-xs gap-1.5">
                  <MessageCircle className="h-3 w-3" />
                  {t('crm.sendOffer')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
