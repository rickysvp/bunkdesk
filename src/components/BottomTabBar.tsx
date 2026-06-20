/**
 * BottomTabBar — 移动端底部导航（iOS 风格）
 *
 * 仅在 < md 屏（< 768px）显示，桌面端 TopBar 接管。
 * - 复用 `useStaff().visibleTabs` 与 TopBar 同步角色权限
 *   （manager=5, reception=4, cleaning=3）
 * - 高 56px + iOS safe area 底部 padding
 * - 激活态：蓝色图标 + 蓝色文字 + 顶部 2px 蓝色指示线
 * - 触摸目标 56x56 满足 iOS HIG (44pt min) 与 Material 48dp
 *
 * 与 TopBar 的关系：两个组件解耦，但 tab id + i18n key 必须一致。
 * TopBar 仅桌面（hidden md:flex），BottomTabBar 仅移动（md:hidden）。
 */

import React from 'react';
import { LayoutDashboard, Grid, KeyRound, ClipboardList, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18nContext';
import { useStaff } from '../StaffContext';

interface BottomTabBarProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

// Tab config — must stay in sync with TopBar.tsx TAB_CONFIG (same IDs + i18n keys).
// 顺序：从左到右展示 1-2-3-4-5，固定 grid-cols-5 布局。
const TAB_CONFIG: { id: string; icon: React.ElementType; i18nKey: string }[] = [
  { id: 'assistant', icon: LayoutDashboard, i18nKey: 'sidebar.assistant' },
  { id: 'bedboard',  icon: Grid,            i18nKey: 'sidebar.bedBoard' },
  { id: 'checkin',   icon: KeyRound,        i18nKey: 'sidebar.checkIn' },
  { id: 'shiftlog',  icon: ClipboardList,   i18nKey: 'sidebar.shiftLog' },
  { id: 'settings',  icon: Sparkles,        i18nKey: 'sidebar.settings' },
];

export function BottomTabBar({ activeTab, setActiveTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { visibleTabs } = useStaff();

  // Filter to role-visible tabs but keep the 5-column grid layout
  // (hidden tabs simply render nothing in their slot).
  // We render `visibleTabs.length` columns; hidden tabs are skipped.
  // If the user has ≤ 3 tabs, the layout still uses grid-cols-N from inline style.
  const tabs = TAB_CONFIG.filter((tab) => visibleTabs.includes(tab.id));
  const cols = Math.max(tabs.length, 2);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-zinc-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]"
      role="tablist"
      aria-label="Primary mobile"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 transition-colors active:scale-95',
                isActive ? 'text-blue-600' : 'text-muted-foreground active:text-zinc-700',
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 bg-blue-600 rounded-full"
                />
              )}
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} />
              <span className="text-xs font-semibold tracking-tight leading-none">
                {t(tab.i18nKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
