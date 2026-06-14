/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { BedBoard } from './components/BedBoard';
import { CheckInPanel } from './components/CheckInPanel';
import { ShiftLog } from './components/ShiftLog';
import { StaffPanel } from './components/StaffPanel';
import { GrowPanel } from './components/GrowPanel';
import { CopilotPanel } from './components/CopilotPanel';
import { MigrationHub } from './components/MigrationHub';
import { LoginScreen } from './components/LoginScreen';
import { LandingPage } from './components/LandingPage';
import { HostelProvider } from './HostelContext';
import { I18nProvider, useTranslation } from './i18nContext';
import { StaffProvider, useStaff } from './StaffContext';
import { Button } from '@/components/ui/button';
import { Languages, LogOut, Shield, Headphones, Sparkles } from 'lucide-react';

const ROLE_BADGE: Record<string, { icon: React.ElementType; className: string }> = {
  manager: { icon: Shield, className: "bg-amber-50 text-amber-700" },
  reception: { icon: Headphones, className: "bg-blue-50 text-blue-700" },
  cleaning: { icon: Sparkles, className: "bg-purple-50 text-purple-700" },
};

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [growSubTab, setGrowSubTab] = useState<string | null>(null);
  const [growAutoOpenPromo, setGrowAutoOpenPromo] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const { t, language, setLanguage } = useTranslation();
  const { currentStaff, isAuthenticated, logout, visibleTabs } = useStaff();

  const navigateToGrow = (subTab: string, options?: { autoOpenPromo?: boolean }) => {
    setGrowSubTab(subTab);
    if (options?.autoOpenPromo) setGrowAutoOpenPromo(true);
    setActiveTab('grow');
  };

  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  if (!isAuthenticated || !currentStaff) {
    return <LoginScreen />;
  }

  // If activeTab is not in visibleTabs, reset to first visible tab
  const effectiveTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] || 'dashboard');

  const headerTitles: Record<string, string> = {
    dashboard: t('copilot.title') || 'Hostel Copilot',
    bedboard: t('header.visualBedBoard') || 'Bed Board',
    checkin: t('header.fastCheckInPanel') || 'Check-In',
    shiftlog: t('header.shiftLog') || 'Shift Log',
    staff: t('staff.title') || 'Staff',
    grow: t('sidebar.grow') || 'Grow',
    migrate: t('sidebar.migrate') || 'Migrate',
  };

  const roleBadge = ROLE_BADGE[currentStaff.role];
  const RoleIcon = roleBadge?.icon;

  return (
    <div className="flex h-screen bg-[#F7F7F7] font-sans overflow-hidden">
      <Sidebar activeTab={effectiveTab} setActiveTab={setActiveTab} />

      <main className="flex-1 left-0 md:ml-64 h-full overflow-hidden flex flex-col relative w-full">
        <header className="h-16 flex-shrink-0 border-b border-[#EBEBEB] bg-white/80 backdrop-blur-md flex items-center px-4 md:px-6 sticky top-0 z-10 transition-shadow">
           <h2 className="text-lg font-semibold text-zinc-900 tracking-tight truncate">
            {headerTitles[effectiveTab] || effectiveTab}
           </h2>
           <div className="ml-auto flex items-center gap-2">
             {/* Current user badge */}
             <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5">
               <span className="text-xs font-medium text-zinc-700">{currentStaff.name}</span>
               {RoleIcon && (
                 <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${roleBadge.className}`}>
                   <RoleIcon className="h-3 w-3" />
                   {t(`staff.${currentStaff.role}`) || currentStaff.role}
                 </span>
               )}
             </div>
             <Button variant="outline" size="sm" onClick={() => { logout(); setShowLanding(true); }} className="gap-1.5 text-xs h-8 text-zinc-500 hover:text-red-600">
               <LogOut className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">{t('staff.logout') || 'Sign Out'}</span>
             </Button>
             <Button variant="outline" size="sm" onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} className="gap-2 text-xs h-8">
               <Languages className="w-4 h-4" />
               {language === 'en' ? '中文' : 'English'}
             </Button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectiveTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full"
            >
              {effectiveTab === 'dashboard' && <CopilotPanel setActiveTab={setActiveTab} navigateToGrow={navigateToGrow} />}
              {effectiveTab === 'bedboard' && <BedBoard navigateToGrow={navigateToGrow} setActiveTab={setActiveTab} />}
              {effectiveTab === 'checkin' && <CheckInPanel setActiveTab={setActiveTab} />}
              {effectiveTab === 'shiftlog' && <ShiftLog onNavigate={setActiveTab} />}
              {effectiveTab === 'staff' && <StaffPanel />}
              {effectiveTab === 'grow' && <GrowPanel initialSubTab={growSubTab} onSubTabChanged={() => setGrowSubTab(null)} autoOpenPromo={growAutoOpenPromo} onAutoOpenPromoConsumed={() => setGrowAutoOpenPromo(false)} />}
              {effectiveTab === 'migrate' && <MigrationHub />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <StaffProvider>
        <HostelProvider>
          <AppContent />
        </HostelProvider>
      </StaffProvider>
    </I18nProvider>
  );
}
