/**
 * TopBar — 桌面端水平导航（≥ md 屏显示）
 *
 * 移动端由 BottomTabBar 接管。两者通过 `useStaff().visibleTabs` 同步角色权限。
 *
 * Layout (left → right):
 *   [BunkDesk logo]  [5 primary tabs]  [LanguageToggle] [user badge + sign-out]
 *
 * - Tabs are filtered by role via `visibleTabs`.
 * - Active tab gets a bottom blue underline + bold text.
 * - LanguageToggle gives quick EN/中 switching; settings page also has
 *   a long-form toggle that stays in sync.
 * - User badge (name + role) and sign-out are two separate buttons for
 *   a low-friction pattern (per the redesign decision).
 */

import React from 'react';
import { LayoutDashboard, Grid, KeyRound, ClipboardList, Sparkles, Shield, Headphones, Brush } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation, type Language } from '../i18nContext';
import { useStaff } from '../StaffContext';
import { APP_VERSION } from '../version';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

// Top-level tab config. The 5 entries correspond to the post-refactor
// nav structure. Each tab maps to a single top-level icon and i18n key.
const TAB_CONFIG: { id: string; icon: React.ElementType; i18nKey: string }[] = [
  { id: 'assistant', icon: LayoutDashboard, i18nKey: 'sidebar.assistant' },
  { id: 'bedboard',  icon: Grid,            i18nKey: 'sidebar.bedBoard' },
  { id: 'checkin',   icon: KeyRound,        i18nKey: 'sidebar.checkIn' },
  { id: 'shiftlog',  icon: ClipboardList,   i18nKey: 'sidebar.shiftLog' },
  { id: 'settings',  icon: Sparkles,        i18nKey: 'sidebar.settings' },
];

// Role badge styling. Replaces the old sub-header user badge.
const ROLE_BADGE: Record<string, { icon: React.ElementType; className: string }> = {
  manager:   { icon: Shield,     className: "bg-amber-50 text-amber-700" },
  reception: { icon: Headphones, className: "bg-blue-50 text-blue-700" },
  cleaning:  { icon: Brush,      className: "bg-purple-50 text-purple-700" },
};

export function TopBar({ activeTab, setActiveTab }: TopBarProps) {
  const { t } = useTranslation();
  const { visibleTabs, currentStaff } = useStaff();

  const tabs = TAB_CONFIG.filter((tab) => visibleTabs.includes(tab.id));
  const onSignOut = () => {
    // Defer to the parent (AppContent) which owns the showLanding state
    // and `useStaff().logout`. We dispatch a custom event the parent
    // listens for; this keeps the TopBar decoupled from auth wiring.
    window.dispatchEvent(new CustomEvent('bunkly:signout'));
  };

  const roleBadge = currentStaff ? ROLE_BADGE[currentStaff.role] : null;
  const RoleIcon = roleBadge?.icon;

  return (
    <header
      className="hidden md:flex h-14 flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-md items-center px-3 md:px-6 sticky top-0 z-30 gap-2"
      data-topbar
    >
      {/* Logo — kept on the left so the brand is always anchored */}
      <div className="flex items-center gap-2 pr-3 md:pr-4 mr-1 md:mr-2 border-r border-zinc-200/60 flex-shrink-0">
        <div className="h-7 w-7 bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-sm tracking-tighter">B</span>
        </div>
        <span className="font-semibold text-zinc-900 tracking-tight text-sm hidden sm:inline">
          {t('sidebar.hostelDesk')}
        </span>
        <span className="text-xs text-muted-foreground hidden md:inline ml-1">v{APP_VERSION}</span>
      </div>

      {/* Primary tabs — horizontal scroll on narrow screens */}
      <nav
        className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Primary"
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
                'relative flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap',
                isActive
                  ? 'text-zinc-900'
                  : 'text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100',
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-muted-foreground')} />
              <span>{t(tab.i18nKey)}</span>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-2 right-2 -bottom-[7px] h-[2px] bg-blue-600 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right side: language toggle + user badge + sign-out */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <LanguageToggle />
        {currentStaff && (
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-zinc-700">{currentStaff.name}</span>
            {RoleIcon && roleBadge && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${roleBadge.className}`}>
                <RoleIcon className="h-3 w-3" />
                {t(`staff.${currentStaff.role}`)}
              </span>
            )}
          </div>
        )}
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          title={t('common.logout')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">{t('common.logout')}</span>
        </button>
      </div>
    </header>
  );
}

/* --------------------------- Language Toggle --------------------------- *
 * 紧凑的 EN/中 切换器。持久化由 I18nProvider 处理（写 localStorage）。
 * -------------------------------------------------------------------- */
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
      className="flex items-center bg-zinc-100 border border-zinc-200 rounded-lg p-0.5"
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
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-muted-foreground hover:text-zinc-900',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
