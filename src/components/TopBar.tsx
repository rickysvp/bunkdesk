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
      className="hidden md:flex h-16 flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-xl items-center px-4 md:px-6 sticky top-0 z-30 gap-3"
      data-topbar
    >
      {/* Logo — 品牌青绿方块 + 品牌名 */}
      <div className="flex items-center gap-2.5 pr-4 md:pr-5 mr-1 md:mr-2 border-r border-border flex-shrink-0">
        <div className="h-9 w-9 bg-brand rounded-xl flex items-center justify-center shadow-pop">
          <span className="text-brand-foreground font-bold text-base tracking-tighter">B</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-bold text-foreground tracking-tight text-sm">
            {t('sidebar.hostelDesk')}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">v{APP_VERSION}</span>
        </div>
      </div>

      {/* Primary tabs — pill 风格 segmented control */}
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
                'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap',
                isActive
                  ? 'bg-brand text-brand-foreground shadow-pop'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t(tab.i18nKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* Right side: language toggle + user badge + sign-out */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <LanguageToggle />
        {currentStaff && (
          <div className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-foreground">{currentStaff.name}</span>
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
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
      className="flex items-center bg-muted border border-border rounded-lg p-0.5"
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
