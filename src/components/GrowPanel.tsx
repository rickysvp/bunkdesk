import React, { useState, useEffect } from 'react';
import { Globe, Gift, TrendingUp, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18nContext';
import { HostelPage } from './HostelPage';
import { ReferralPanel } from './ReferralPanel';
import { RevenueBoost } from './RevenueBoost';
import { GuestCRM } from './GuestCRM';
import { OccupancyActions } from './OccupancyActions';

const SUB_TABS = [
  { id: 'hostel-page', icon: Globe, i18nKey: 'grow.hostelPage' },
  { id: 'crm', icon: Users, i18nKey: 'grow.crm' },
  { id: 'occupancy', icon: Zap, i18nKey: 'grow.occupancy' },
  { id: 'referral', icon: Gift, i18nKey: 'grow.referral' },
  { id: 'pricing', icon: TrendingUp, i18nKey: 'grow.pricing' },
];

interface GrowPanelProps {
  initialSubTab?: string | null;
  onSubTabChanged?: () => void;
  autoOpenPromo?: boolean;
  onAutoOpenPromoConsumed?: () => void;
}

export function GrowPanel({ initialSubTab, onSubTabChanged, autoOpenPromo, onAutoOpenPromoConsumed }: GrowPanelProps) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState('hostel-page');

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
      onSubTabChanged?.();
    }
  }, [initialSubTab]);

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSubTab === tab.id
                ? 'bg-white shadow-sm text-emerald-600'
                : 'text-muted-foreground hover:text-zinc-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {t(tab.i18nKey)}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {activeSubTab === 'hostel-page' && <HostelPage />}
          {activeSubTab === 'crm' && <GuestCRM />}
          {activeSubTab === 'referral' && <ReferralPanel />}
          {activeSubTab === 'pricing' && <RevenueBoost autoOpenPromo={autoOpenPromo} onAutoOpenPromoConsumed={onAutoOpenPromoConsumed} />}
          {activeSubTab === 'occupancy' && <OccupancyActions />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
