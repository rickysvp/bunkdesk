/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from './components/TopBar';
import { BedBoard } from './components/BedBoard';
import { CheckInPanel } from './components/CheckInPanel';
import { ShiftLog } from './components/ShiftLog';
import { AssistantPanel } from './components/AssistantPanel';
import { SettingsPanel, type SettingsSubTab } from './components/SettingsPanel';
import { LoginScreen } from './components/LoginScreen';
import { LandingPage } from './components/LandingPage';
import { HostelProvider } from './HostelContext';
import { I18nProvider, useTranslation } from './i18nContext';
import { StaffProvider, useStaff } from './StaffContext';

function AppContent() {
  // Top-level tab ids: assistant | bedboard | checkin | shiftlog | settings
  const [activeTab, setActiveTab] = useState('assistant');

  // Settings sub-tab state, lifted to App so deep-links (e.g. from the
  // bunkly:navigate event) can land on a specific sub-tab.
  // (获客 moved into 经营助手 — no more 'growth' here.)
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('staff');

  // Deep-link hint for the 经营助手 → 获客 sub-tab. Set by
  // navigateToGrow() and consumed by AssistantPanel so insights
  // like actionTarget="grow:pricing" open the right tool with zero
  // tab hops.
  const [growHint, setGrowHint] = useState<{ subTab: string; autoOpenPromo: boolean } | null>(null);

  const [showLanding, setShowLanding] = useState(true);
  // All useStaff() fields are destructured at the top so the hook
  // count is stable across renders (the previous version called
  // useStaff() twice — once here and once after `if (showLanding)`
  // — which triggered React's "change in the order of Hooks"
  // error on the second render).
  const { logout, visibleTabs, isAuthenticated } = useStaff();

  // Listen for sign-out dispatched from the TopBar (or GeneralSection),
  // and for navigation events dispatched by cross-tab buttons.
  useEffect(() => {
    const onSignOut = () => {
      logout();
      setShowLanding(true);
    };
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ tab: string; subTab?: string }>).detail;
      if (!detail?.tab) return;
      setActiveTab(detail.tab);
      if (detail.subTab) {
        setSettingsSubTab(detail.subTab as SettingsSubTab);
      }
    };
    window.addEventListener('bunkly:signout', onSignOut as EventListener);
    window.addEventListener('bunkly:navigate', onNavigate as EventListener);
    return () => {
      window.removeEventListener('bunkly:signout', onSignOut as EventListener);
      window.removeEventListener('bunkly:navigate', onNavigate as EventListener);
    };
  }, [logout]);

  // Deep-link from Copilot insights: jump to 经营助手 → 获客
  // sub-tab with the target sub-sub-tab selected. Stays on the
  // Assistant module — no top-level tab switch.
  const navigateToGrow = (
    subTab: string,
    options?: { autoOpenPromo?: boolean },
  ) => {
    setActiveTab('assistant');
    setGrowHint({ subTab, autoOpenPromo: options?.autoOpenPromo ?? false });
  };

  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  // Past the landing page: if not authenticated yet, show login.
  // isAuthenticated comes from the top-level useStaff() destructure
  // (no second hook call here).
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // If activeTab is not in visibleTabs, reset to first visible tab
  const effectiveTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] || 'assistant');

  return (
    <div className="flex flex-col h-screen bg-[#F7F7F7] font-sans overflow-hidden">
      <TopBar activeTab={effectiveTab} setActiveTab={setActiveTab} />

      <main className="flex-1 h-full overflow-hidden flex flex-col relative w-full">
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
              {effectiveTab === 'assistant' && (
                <AssistantPanel
                  setActiveTab={setActiveTab}
                  growHint={growHint}
                  onGrowHintConsumed={() => setGrowHint(null)}
                />
              )}
              {effectiveTab === 'bedboard' && <BedBoard navigateToGrow={navigateToGrow} setActiveTab={setActiveTab} />}
              {effectiveTab === 'checkin' && <CheckInPanel setActiveTab={setActiveTab} />}
              {effectiveTab === 'shiftlog' && <ShiftLog onNavigate={setActiveTab} />}
              {effectiveTab === 'settings' && (
                <SettingsPanel
                  subTab={settingsSubTab}
                  onSubTabChange={setSettingsSubTab}
                />
              )}
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
