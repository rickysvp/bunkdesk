/**
 * GrowthToolsSection — Settings → 获客 sub-tab.
 *
 * Hosts the 5 growth tools (HostelPage / GuestCRM / OccupancyActions /
 * ReferralPanel / RevenueBoost) as an inline 5-tab strip, replacing the
 * old sheet-based ToolsRow in the assistant dashboard.
 *
 * Deep-link support: when the Copilot engine surfaces an insight with
 * actionTarget="grow:xxx", the parent (App) flips
 *   activeTab=settings, settingsSubTab=growth, growthSubTab=xxx
 * and this component picks the right sub-tab on mount.
 */

import React, { useState, useEffect } from 'react';
import { Globe, Gift, TrendingUp, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18nContext';
import { HostelPage } from './HostelPage';
import { ReferralPanel } from './ReferralPanel';
import { RevenueBoost } from './RevenueBoost';
import { GuestCRM } from './GuestCRM';
import { OccupancyActions } from './OccupancyActions';
import { cn } from '@/lib/utils';

const SUB_TABS = [
  { id: 'hostel-page', icon: Globe, i18nKey: 'grow.hostelPage', fallback: '青旅主页' },
  { id: 'crm',         icon: Users, i18nKey: 'grow.crm',         fallback: '客人资产' },
  { id: 'occupancy',   icon: Zap,   i18nKey: 'grow.occupancy',   fallback: '空床动作' },
  { id: 'referral',    icon: Gift,  i18nKey: 'grow.referral',    fallback: '推荐奖励' },
  { id: 'pricing',     icon: TrendingUp, i18nKey: 'grow.pricing', fallback: '定价参考' },
];

export type GrowthSubTabId = typeof SUB_TABS[number]['id'];

interface GrowthToolsSectionProps {
  initialSubTab?: string | null;
  onSubTabChanged?: () => void;
  autoOpenPromo?: boolean;
  onAutoOpenPromoConsumed?: () => void;
}

export function GrowthToolsSection({
  initialSubTab,
  onSubTabChanged,
  autoOpenPromo,
  onAutoOpenPromoConsumed,
}: GrowthToolsSectionProps) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<GrowthSubTabId>('hostel-page');

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab as GrowthSubTabId);
      onSubTabChanged?.();
    }
  }, [initialSubTab, activeSubTab, onSubTabChanged]);

  return (
    <div className="space-y-5">
      {/* Sub-tab bar — matches SettingsPanel style for visual consistency */}
      <div
        className="flex items-center gap-1 border-b border-zinc-200 -mt-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('assistant.growth') || '获客工具'}
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
              <span>{t(tab.i18nKey) || tab.fallback}</span>
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
