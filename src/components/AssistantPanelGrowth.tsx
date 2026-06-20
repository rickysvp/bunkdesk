/**
 * AssistantPanelGrowth — "获客" sub-tab of the 经营助手.
 *
 * Hosts the 5 growth tools (HostelPage / GuestCRM / OccupancyActions /
 * ReferralPanel / RevenueBoost) as an inline 5-sub-sub-tab strip, with
 * a sticky overview card at the top showing "5 tools · 7-day potential
 * $X · N recallable".
 *
 * Replaces the old `Settings → 获客` sub-tab (which was a UX dead-end).
 * Now everything from "see today's revenue potential" to "apply a
 * promotion" happens in one screen.
 *
 * Deep-link support: parent (AssistantPanel) can pass `initialSubTab`
 * + `autoOpenPromo` to land on a specific tool.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation, formatCurrency } from '../i18nContext';
import { Globe, Gift, TrendingUp, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { HostelPage } from './HostelPage';
import { ReferralPanel } from './ReferralPanel';
import { RevenueBoost } from './RevenueBoost';
import { GuestCRM } from './GuestCRM';
import { OccupancyActions } from './OccupancyActions';
import { generateOccupancyActions } from '../utils/occupancyEngine';
import { findRecallCandidates } from '../utils/guestCrmEngine';
import { cn } from '@/lib/utils';

const SUB_TABS = [
  { id: 'hostel-page', icon: Globe, i18nKey: 'grow.hostelPage' },
  { id: 'crm',         icon: Users, i18nKey: 'grow.crm' },
  { id: 'occupancy',   icon: Zap,   i18nKey: 'grow.occupancy' },
  { id: 'referral',    icon: Gift,  i18nKey: 'grow.referral' },
  { id: 'pricing',     icon: TrendingUp, i18nKey: 'grow.pricing' },
] as const;

export type GrowthSubTabId = typeof SUB_TABS[number]['id'];

interface AssistantPanelGrowthProps {
  initialSubTab?: string | null;
  onSubTabChanged?: () => void;
  autoOpenPromo?: boolean;
  onAutoOpenPromoConsumed?: () => void;
}

export function AssistantPanelGrowth({
  initialSubTab,
  onSubTabChanged,
  autoOpenPromo,
  onAutoOpenPromoConsumed,
}: AssistantPanelGrowthProps) {
  const { rooms, guestProfiles } = useHostel();
  const { t, language } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<GrowthSubTabId>('hostel-page');

  // Deep-link sync
  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab as GrowthSubTabId);
      onSubTabChanged?.();
    }
  }, [initialSubTab, activeSubTab, onSubTabChanged]);

  // Overview numbers
  const occupancyActions = useMemo(
    () => generateOccupancyActions(rooms, guestProfiles, 7, t),
    [rooms, guestProfiles, t],
  );
  const recallCount = useMemo(
    () => findRecallCandidates(guestProfiles).length,
    [guestProfiles],
  );
  const totalPotentialRevenue = useMemo(
    () => occupancyActions.reduce((s, a) => s + a.estimatedRevenue, 0),
    [occupancyActions],
  );
  const totalPotentialBedNights = useMemo(
    () => occupancyActions.reduce((s, a) => s + a.estimatedBedNights, 0),
    [occupancyActions],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-6">
      {/* Overview card — sticky guidance on revenue potential */}
      <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
              {t('assistant.growthOverview.title')}
            </p>
            <p className="mt-1.5 text-2xl font-bold text-zinc-900 flex items-baseline gap-2">
              <span className="text-emerald-700">
                {formatCurrency(totalPotentialRevenue, language)}
              </span>
              <span className="text-sm font-normal text-zinc-500">
                {t('assistant.growthOverview.potential7d')}
              </span>
            </p>
            {totalPotentialBedNights > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {t('dashboard.moreCount', { n: totalPotentialBedNights }).replace('+', '+')}
                {' '}
                {t('assistant.growthOverview.bedNights')}
              </p>
            )}
          </div>
          <div className="flex gap-5 text-sm">
            <div>
              <p className="text-2xl font-bold text-zinc-900">5</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                {t('assistant.growthOverview.tools')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{recallCount}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                {t('assistant.growthOverview.recallable')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{occupancyActions.length}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                {t('assistant.needsAttention')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-sub-tab bar */}
      <div
        className="flex items-center gap-1 border-b border-zinc-200 -mt-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('assistant.growth')}
      >
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors flex-shrink-0',
                active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-blue-600' : 'text-zinc-400')} />
              <span>{t(tab.i18nKey)}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute left-2 right-2 -bottom-px h-[2px] bg-blue-600 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {activeSubTab === 'hostel-page' && <HostelPage />}
          {activeSubTab === 'crm' && <GuestCRM />}
          {activeSubTab === 'occupancy' && <OccupancyActions />}
          {activeSubTab === 'referral' && <ReferralPanel />}
          {activeSubTab === 'pricing' && (
            <RevenueBoost
              autoOpenPromo={autoOpenPromo}
              onAutoOpenPromoConsumed={onAutoOpenPromoConsumed}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
