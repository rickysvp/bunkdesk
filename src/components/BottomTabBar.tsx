/**
 * BottomTabBar — 移动端底部导航
 *
 * 新设计 v3.0：emoji 图标 + 文字标签，激活态 primary 蓝。
 * 仅在 < md 屏显示，桌面端 TopBar 接管。
 */

import { cn } from '@/lib/utils';
import { useTranslation } from '../i18nContext';
import { useStaff } from '../StaffContext';

interface BottomTabBarProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

// Tab config — emoji 图标匹配新设计文件
const TAB_CONFIG: { id: string; emoji: string; i18nKey: string }[] = [
  { id: 'assistant', emoji: '🏠', i18nKey: 'sidebar.assistant' },
  { id: 'bedboard',  emoji: '🛏️', i18nKey: 'sidebar.bedBoard' },
  { id: 'checkin',   emoji: '🔑', i18nKey: 'sidebar.checkIn' },
  { id: 'shiftlog',  emoji: '📋', i18nKey: 'sidebar.shiftLog' },
  { id: 'settings',  emoji: '⚙️', i18nKey: 'sidebar.settings' },
];

export function BottomTabBar({ activeTab, setActiveTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { visibleTabs } = useStaff();

  const tabs = TAB_CONFIG.filter((tab) => visibleTabs.includes(tab.id));
  const cols = Math.max(tabs.length, 2);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border"
      role="tablist"
      aria-label="Primary mobile"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span className="text-lg leading-none">{tab.emoji}</span>
              <span className="text-[10px] font-semibold leading-none">{t(tab.i18nKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
