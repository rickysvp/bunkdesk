import React from 'react';
import { useTranslation } from '../../i18nContext';
import { useHostel } from '../../HostelContext';
import { Sparkles, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BannersProps {
  statusFilter: string;
  dirtyBedsCount: number;
  arrivalsCount: number;
  setStatusFilter: (val: string) => void;
  setActiveTab?: (tab: string) => void;
}

export function Banners({ statusFilter, dirtyBedsCount, arrivalsCount, setStatusFilter, setActiveTab }: BannersProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Arrivals banner */}
      {arrivalsCount > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <Users className="h-5 w-5 text-blue-500 shrink-0" />
          <span className="text-blue-700 font-medium">
            {arrivalsCount} {t('bedboard.queue') || 'pending arrivals'}
          </span>
          <span className="text-blue-500 text-xs hidden sm:inline">
            {t('bedboard.goToCheckInHint') || 'Go to Check-in to assign beds'}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 h-8 text-xs border-blue-300 text-blue-600 hover:bg-blue-100"
            onClick={() => setActiveTab?.('checkin')}
          >
            {t('bedboard.goToCheckIn') || 'Go to Check-in'}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Dirty beds alert */}
      {dirtyBedsCount > 0 && statusFilter !== 'cleaning' && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm">
          <Sparkles className="h-5 w-5 text-purple-500 shrink-0" />
          <span className="text-purple-700 font-medium">
            {t('bedboard.bedsNeedCleaning', { n: dirtyBedsCount }).replace('{n}', String(dirtyBedsCount))}
          </span>
          <span className="text-purple-500 text-xs hidden sm:inline">
            {t('bedboard.bedsNeedCleaningDesc') || 'Prioritize preparing beds for incoming guests.'}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 h-8 text-xs border-purple-300 text-purple-600 hover:bg-purple-100"
            onClick={() => setStatusFilter('cleaning')}
          >
            {t('bedboard.reviewAndClean') || 'Review & Clean'}
          </Button>
        </div>
      )}

      {/* Cleaning mode active banner */}
      {statusFilter === 'cleaning' && (
        <div className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm">
          <Sparkles className="h-5 w-5 text-purple-400 shrink-0" />
          <span className="text-zinc-200 font-medium">
            {t('bedboard.cleaningModeActive') || 'Cleaning Mode Active'}
          </span>
          <span className="text-zinc-400 text-xs hidden sm:inline">
            {t('bedboard.showingOnlyDirty') || 'Showing only beds that need attention.'}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 h-8 text-xs border-zinc-500 text-zinc-300 hover:bg-zinc-700"
            onClick={() => setStatusFilter('all')}
          >
            {t('bedboard.exitCleaningMode') || 'Exit Cleaning Mode'}
          </Button>
        </div>
      )}
    </>
  );
}
