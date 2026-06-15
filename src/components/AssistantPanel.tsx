/**
 * AssistantPanel — 经营助手 with merged 获客 sub-tab.
 *
 * Layout (2 sub-tabs, no Sheet):
 *   sub-tab bar: [今日] [获客]
 *   [今日]   → AssistantPanelToday (4+1 stat cards + week forecast + 需关注)
 *   [获客]   → AssistantPanelGrowth (overview + 5 tools inline)
 *
 * Deep links from Copilot insights (e.g. actionTarget="grow:pricing")
 * now stay inside the Assistant module: the assistantSubTab state flips
 * to 'growth' and the growthSubTab is forwarded into the Growth panel.
 * No top-level tab switch is involved.
 *
 * The old "tools moved to settings/growth" hint is gone — tools live
 * here now.
 */

import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { useTranslation } from '../i18nContext';
import { AssistantPanelToday } from './AssistantPanelToday';
import { AssistantPanelGrowth, type GrowthSubTabId } from './AssistantPanelGrowth';
import { cn } from '@/lib/utils';

type AssistantSubTab = 'today' | 'growth';

interface AssistantPanelProps {
  setActiveTab?: (tab: string) => void;
  // Deep-link into a Growth tool (and switch to Growth sub-tab).
  // Maps from App's navigateToGrow().
  growHint?: { subTab: string; autoOpenPromo: boolean } | null;
  onGrowHintConsumed?: () => void;
}

export function AssistantPanel({ setActiveTab, growHint, onGrowHintConsumed }: AssistantPanelProps) {
  const { t } = useTranslation();
  const [assistantSubTab, setAssistantSubTab] = useState<AssistantSubTab>('today');
  const [growthSubTab, setGrowthSubTab] = useState<GrowthSubTabId | null>(null);
  const [autoOpenPromo, setAutoOpenPromo] = useState(false);

  // External deep-link (from App's navigateToGrow)
  useEffect(() => {
    if (growHint?.subTab) {
      setAssistantSubTab('growth');
      setGrowthSubTab(growHint.subTab as GrowthSubTabId);
      if (growHint.autoOpenPromo) setAutoOpenPromo(true);
      onGrowHintConsumed?.();
    }
  }, [growHint, onGrowHintConsumed]);

  const switchToGrowth = (subTab?: string, options?: { autoOpenPromo?: boolean }) => {
    setAssistantSubTab('growth');
    if (subTab) setGrowthSubTab(subTab as GrowthSubTabId);
    if (options?.autoOpenPromo) setAutoOpenPromo(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar — matches SettingsPanel visual style */}
      <div
        className="flex items-center gap-1 border-b border-zinc-200 mb-4 md:mb-6 -mt-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('sidebar.assistant')}
      >
        <SubTabButton
          active={assistantSubTab === 'today'}
          onClick={() => setAssistantSubTab('today')}
          icon={<Calendar className="h-4 w-4" />}
          label={t('assistant.subTabs.today')}
        />
        <SubTabButton
          active={assistantSubTab === 'growth'}
          onClick={() => setAssistantSubTab('growth')}
          icon={<TrendingUp className="h-4 w-4" />}
          label={t('assistant.subTabs.growth')}
        />
      </div>

      <div className="flex-1 min-h-0">
        {assistantSubTab === 'today' && (
          <AssistantPanelToday
            setActiveTab={setActiveTab}
            onSwitchToGrowth={switchToGrowth}
          />
        )}
        {assistantSubTab === 'growth' && (
          <AssistantPanelGrowth
            initialSubTab={growthSubTab}
            onSubTabChanged={() => setGrowthSubTab(null)}
            autoOpenPromo={autoOpenPromo}
            onAutoOpenPromoConsumed={() => setAutoOpenPromo(false)}
          />
        )}
      </div>
    </div>
  );
}

function SubTabButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors flex-shrink-0',
        active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900',
      )}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <span
          aria-hidden
          className="absolute left-2 right-2 -bottom-px h-[2px] bg-blue-600 rounded-full"
        />
      )}
    </button>
  );
}
