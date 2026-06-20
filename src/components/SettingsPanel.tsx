/**
 * SettingsPanel — merged "设置" tab.
 *
 * 4 sub-tabs (after 获客 moved to 经营助手):
 *   员工管理 | 数据迁移 | 房间 | 通用
 *
 * - 员工管理 / 数据迁移 are wraps around StaffPanel / MigrationHub.
 * - 房间 is the dedicated room management surface (rooms 1-N with
 *   add/edit/delete, replaces the inline dialogs previously scattered
 *   in BedBoard).
 * - 通用 holds language / version / sign-out / reset.
 *
 * Reachable only by `manager` role — `ROLE_TABS` in StaffContext
 * hides the `settings` tab entirely for reception / cleaning.
 *
 * The settings sub-tab state is *controlled* by the parent (App) so
 * deep-links (e.g. from the bunkly:navigate event) can land on a
 * specific sub-tab.
 */

import React from 'react';
import {
  Users, ArrowRightLeft, BedDouble, Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18nContext';
import { StaffPanel } from './StaffPanel';
import { MigrationHub } from './MigrationHub';
import { GeneralSection } from './GeneralSection';
import { RoomsSection } from './RoomsSection';

export type SettingsSubTab = 'staff' | 'migrate' | 'rooms' | 'general';

interface SettingsPanelProps {
  subTab: SettingsSubTab;
  onSubTabChange: (s: SettingsSubTab) => void;
}

export function SettingsPanel({
  subTab,
  onSubTabChange,
}: SettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-1 border-b border-zinc-200 mb-4 md:mb-6 -mt-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('sidebar.settings') || 'Settings'}
      >
        <SubTabButton
          active={subTab === 'staff'}
          onClick={() => onSubTabChange('staff')}
          icon={<Users className="h-4 w-4" />}
          label={t('subnav.staff') || 'Staff'}
        />
        <SubTabButton
          active={subTab === 'migrate'}
          onClick={() => onSubTabChange('migrate')}
          icon={<ArrowRightLeft className="h-4 w-4" />}
          label={t('subnav.migrate') || 'Migrate'}
        />
        <SubTabButton
          active={subTab === 'rooms'}
          onClick={() => onSubTabChange('rooms')}
          icon={<BedDouble className="h-4 w-4" />}
          label={t('subnav.rooms') || 'Rooms'}
        />
        <SubTabButton
          active={subTab === 'general'}
          onClick={() => onSubTabChange('general')}
          icon={<SettingsIcon className="h-4 w-4" />}
          label={t('subnav.general') || 'General'}
        />
      </div>

      <div className="flex-1 min-h-0">
        {subTab === 'staff' && <StaffPanel />}
        {subTab === 'migrate' && <MigrationHub />}
        {subTab === 'rooms' && <RoomsSection />}
        {subTab === 'general' && <GeneralSection />}
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
        active ? 'text-zinc-900' : 'text-muted-foreground hover:text-zinc-900',
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
