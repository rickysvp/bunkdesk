/**
 * TopBar — 桌面端水平导航（≥ md 屏显示）
 *
 * 新设计 v3.0：Google 风格 pill tabs（纯文字无图标），h-14 紧凑高度。
 * 移动端由 BottomTabBar 接管。
 */

import React from 'react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation, type Language } from '../i18nContext';
import { useStaff } from '../StaffContext';
import { APP_VERSION } from '../version';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

// 顶级 tab 配置 — 纯文字 pill，无图标（匹配新设计）
const TAB_CONFIG: { id: string; i18nKey: string }[] = [
  { id: 'assistant', i18nKey: 'sidebar.assistant' },
  { id: 'bedboard',  i18nKey: 'sidebar.bedBoard' },
  { id: 'checkin',   i18nKey: 'sidebar.checkIn' },
  { id: 'shiftlog',  i18nKey: 'sidebar.shiftLog' },
  { id: 'settings',  i18nKey: 'sidebar.settings' },
];

export function TopBar({ activeTab, setActiveTab }: TopBarProps) {
  const { t } = useTranslation();
  const { visibleTabs, currentStaff } = useStaff();

  const tabs = TAB_CONFIG.filter((tab) => visibleTabs.includes(tab.id));
  const onSignOut = () => {
    window.dispatchEvent(new CustomEvent('bunkly:signout'));
  };

  // 用户头像首字母
  const initial = currentStaff?.name?.charAt(0) ?? 'A';

  return (
    <header
      className="hidden md:flex h-14 flex-shrink-0 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 items-center gap-3 px-6"
      data-topbar
    >
      {/* Logo — 品牌蓝方块 + 名称 + 版本号 */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">B</span>
        </div>
        <span className="font-semibold text-sm tracking-tight text-foreground">BunkDesk</span>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">v{APP_VERSION}</span>
      </div>

      {/* Primary tabs — 纯文字 pill */}
      <nav
        className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Primary"
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
                'px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {t(tab.i18nKey)}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <LanguageToggle />
        {currentStaff && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-xs font-semibold text-accent-foreground">{initial}</span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:inline">{currentStaff.name}</span>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          title={t('common.logout')}
          aria-label={t('common.logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

/* --------------------------- Language Toggle --------------------------- */
function LanguageToggle() {
  const { language, setLanguage } = useTranslation();
  const options: { value: Language; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中' },
  ];
  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center bg-muted rounded-lg p-0.5"
    >
      {options.map((opt) => {
        const active = language === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setLanguage(opt.value)}
            aria-pressed={active}
            className={cn(
              'px-2 py-1 text-xs font-semibold rounded-md transition-colors min-w-[28px]',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
