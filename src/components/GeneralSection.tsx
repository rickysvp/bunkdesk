/**
 * GeneralSection — "通用" sub-tab inside the Settings page.
 *
 * Centralizes the cross-cutting concerns that used to live in the
 * App-level header before the TopBar refactor:
 *
 *   1. Language switch    — en / zh, calls useI18n().setLanguage
 *   2. App version        — read from src/version.ts (APP_VERSION)
 *   3. Sign out           — clears staff auth state, returns to landing
 *   4. Reset local data   — wipes `bunkdesk_*` keys in localStorage
 *                           and reloads (escape hatch for support /
 *                           development)
 *
 * Each row is a self-contained "card" with a left-side label + icon
 * and a right-side control/button. Keeps the visual weight low so
 * future "通用" items (e.g. theme toggle) can be added as additional
 * rows without restructuring.
 */

import React from 'react';
import { Languages, LogOut, AlertTriangle, Info } from 'lucide-react';
import { useTranslation, type Language } from '../i18nContext';
import { useStaff } from '../StaffContext';
import { APP_VERSION, APP_NAME } from '../version';
import { cn } from '@/lib/utils';

const BUNKDESK_KEY_PREFIX = 'bunkdesk_';

export function GeneralSection() {
  const { t, language, setLanguage } = useTranslation();
  const { logout } = useStaff();

  const onSignOut = () => {
    logout();
    // Route back to the landing page the same way the TopBar does.
    window.dispatchEvent(new CustomEvent('bunkly:signout'));
  };

  const onResetData = () => {
    const msg = t('common.confirmReset');
    if (!window.confirm(msg)) return;
    // Wipe every `bunkdesk_*` key. We do not use `localStorage.clear()`
    // so we don't disturb unrelated tabs (e.g. dev tools) and we keep
    // the language preference persisted in a single, dedicated key.
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BUNKDESK_KEY_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => localStorage.removeItem(k));
    // Reload so providers re-initialize with empty state. The
    // LandingPage will appear because the user is no longer
    // authenticated.
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-20 md:pb-0">
      <Section title={t('common.language')}>
        <Row
          icon={<Languages className="h-4 w-4 text-zinc-500" />}
          label={t('common.language')}
          description={t('common.currentLanguage')}
        >
          <LanguageSwitcher value={language} onChange={setLanguage} />
        </Row>
      </Section>

      <Section title={t('common.version')}>
        <Row
          icon={<Info className="h-4 w-4 text-zinc-500" />}
          label={APP_NAME}
          description={`${t('common.version')} ${APP_VERSION}`}
        >
          <span className="text-xs font-mono text-zinc-400">v{APP_VERSION}</span>
        </Row>
      </Section>

      <Section title={t('common.logout')}>
        <Row
          icon={<LogOut className="h-4 w-4 text-zinc-500" />}
          label={t('common.logout')}
          description=""
        >
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            {t('common.logout')}
          </button>
        </Row>
      </Section>

      <Section title={t('common.resetData')}>
        <Row
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          label={t('common.resetData')}
          description={t('common.resetDataDesc')}
        >
          <button
            onClick={onResetData}
            className="px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            {t('common.resetData')}
          </button>
        </Row>
      </Section>
    </div>
  );
}

function LanguageSwitcher({ value, onChange }: { value: Language; onChange: (l: Language) => void }) {
  const options: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ];
  return (
    <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-lg p-0.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors min-w-[64px]',
              active
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <h3 className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 bg-zinc-50/50">
        {title}
      </h3>
      <div className="divide-y divide-zinc-100">{children}</div>
    </section>
  );
}

function Row({
  icon, label, description, children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-8 w-8 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-900 truncate">{label}</div>
        {description && (
          <div className="text-xs text-zinc-500 truncate">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
