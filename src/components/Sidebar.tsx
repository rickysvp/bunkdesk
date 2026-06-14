import React, { useState } from 'react';
import { LayoutDashboard, Grid, KeyRound, ClipboardList, MoreHorizontal, Users, Sprout, ArrowRightLeft, Brain, ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18nContext';
import { useStaff } from '../StaffContext';
import { APP_VERSION } from '../version';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const MODULE_CONFIG = [
  {
    id: 'operations',
    i18nKey: 'sidebar.operations',
    defaultIcon: LayoutDashboard,
    tabs: [
      { id: 'bedboard', icon: Grid, i18nKey: 'sidebar.bedBoard' },
      { id: 'checkin', icon: KeyRound, i18nKey: 'sidebar.checkIn' },
      { id: 'shiftlog', icon: ClipboardList, i18nKey: 'sidebar.shiftLog' },
    ],
  },
  {
    id: 'growth',
    i18nKey: 'sidebar.growth',
    defaultIcon: Sprout,
    tabs: [
      { id: 'grow', icon: Sprout, i18nKey: 'sidebar.grow' },
    ],
  },
  {
    id: 'intelligence',
    i18nKey: 'sidebar.intelligence',
    defaultIcon: Brain,
    tabs: [
      { id: 'dashboard', icon: Brain, i18nKey: 'sidebar.copilot' },
    ],
  },
  {
    id: 'settings',
    i18nKey: 'sidebar.settings',
    defaultIcon: Settings,
    tabs: [
      { id: 'staff', icon: Users, i18nKey: 'staff.title' },
      { id: 'migrate', icon: ArrowRightLeft, i18nKey: 'sidebar.migrate' },
    ],
  },
];

const PRIMARY_TAB_IDS = ['dashboard', 'bedboard', 'checkin'];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { t } = useTranslation();
  const { currentStaff, visibleTabs } = useStaff();
  const [showMore, setShowMore] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    operations: true,
    growth: true,
    intelligence: true,
    settings: false,
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // Build filtered module tabs
  const filteredModules = MODULE_CONFIG.map(mod => ({
    ...mod,
    tabs: mod.tabs
      .filter(tab => visibleTabs.includes(tab.id))
      .map(tab => ({
        ...tab,
        label: t(tab.i18nKey) || tab.id,
      })),
  })).filter(mod => mod.tabs.length > 0);

  // Mobile: flat list of all visible tabs for bottom nav
  const allVisibleTabs = MODULE_CONFIG
    .flatMap(mod => mod.tabs)
    .filter(tab => visibleTabs.includes(tab.id))
    .map(tab => ({ ...tab, label: t(tab.i18nKey) || tab.id }));

  const primaryTabs = allVisibleTabs.filter(tab => PRIMARY_TAB_IDS.includes(tab.id));
  const moreTabs = allVisibleTabs.filter(tab => !PRIMARY_TAB_IDS.includes(tab.id));

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-[#F7F7F7] border-r border-[#EBEBEB] flex-col h-full inset-y-0 fixed z-10 selection:bg-zinc-200">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm tracking-tighter">B</span>
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight">{t('sidebar.hostelDesk') || 'Bunkly'}</span>
          </div>
          <nav className="flex flex-col gap-1.5">
            {filteredModules.map(mod => (
              <React.Fragment key={mod.id}>
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 transition-colors cursor-pointer"
                >
                  <mod.defaultIcon className="h-3.5 w-3.5" />
                  {t(mod.i18nKey) || mod.id}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 ml-auto transition-transform",
                      expandedModules[mod.id] ? "" : "-rotate-90"
                    )}
                  />
                </button>
                {expandedModules[mod.id] && mod.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ml-2",
                      activeTab === tab.id ? "bg-white shadow-sm ring-1 ring-black/5 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-zinc-900" : "text-zinc-400")} />
                    {tab.label}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="px-6 py-4 border-t border-zinc-200/60">
          <p className="text-[10px] text-zinc-400">Bunkly v{APP_VERSION}</p>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* More menu overlay */}
        {showMore && (
          <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-zinc-200 shadow-lg p-3">
            <div className="flex justify-around">
              {moreTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowMore(false); }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors",
                    activeTab === tab.id ? "text-zinc-900 bg-zinc-100" : "text-zinc-500"
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="h-16 bg-white/80 backdrop-blur-md border-t border-[#EBEBEB] flex items-center justify-around">
          {primaryTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowMore(false); }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer transition-colors",
                activeTab === tab.id ? "text-zinc-900" : "text-zinc-400"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
          {moreTabs.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer transition-colors",
                showMore || !PRIMARY_TAB_IDS.includes(activeTab) ? "text-zinc-900" : "text-zinc-400"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t('sidebar.more') || 'More'}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
