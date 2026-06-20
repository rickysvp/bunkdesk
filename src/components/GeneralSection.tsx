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

import React, { useState, useRef } from 'react';
import { Languages, LogOut, AlertTriangle, Info, Download, Upload, Database } from 'lucide-react';
import { useTranslation, type Language } from '../i18nContext';
import { useStaff } from '../StaffContext';
import { APP_VERSION, APP_NAME } from '../version';
import { cn } from '@/lib/utils';

const BUNKDESK_KEY_PREFIX = 'bunkdesk_';

export function GeneralSection() {
  const { t, language, setLanguage } = useTranslation();
  const { logout } = useStaff();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSignOut = () => {
    logout();
    window.dispatchEvent(new CustomEvent('bunkly:signout'));
  };

  // 导出备份：收集所有 bunkdesk_* 数据为 JSON 文件下载
  const onExportBackup = () => {
    const backup: Record<string, any> = { _exportedAt: new Date().toISOString(), _appVersion: APP_VERSION };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BUNKDESK_KEY_PREFIX)) {
        try {
          backup[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          backup[key] = localStorage.getItem(key);
        }
      }
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bunkdesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入备份：上传 JSON 文件，校验后覆盖当前数据
  const onImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data || typeof data !== 'object') {
          alert('备份文件格式无效');
          return;
        }
        if (!confirm('导入备份将覆盖当前所有数据，确认继续？')) return;
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith(BUNKDESK_KEY_PREFIX) && value !== null) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          }
        });
        alert('备份导入成功，页面将刷新');
        window.location.reload();
      } catch {
        alert('备份文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const onResetData = () => {
    // 二次确认：输入 DELETE 文本
    if (resetConfirmOpen && resetConfirmText !== 'DELETE') {
      return;
    }
    if (!resetConfirmOpen) {
      setResetConfirmOpen(true);
      return;
    }
    // 先导出备份
    onExportBackup();
    // 清除所有 bunkdesk_* 数据
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BUNKDESK_KEY_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => localStorage.removeItem(k));
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
          icon={<Download className="h-4 w-4 text-blue-500" />}
          label="导出备份"
          description="下载所有数据为 JSON 文件"
        >
          <button
            onClick={onExportBackup}
            className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            导出
          </button>
        </Row>
        <Row
          icon={<Upload className="h-4 w-4 text-blue-500" />}
          label="导入备份"
          description="从 JSON 文件恢复数据（覆盖当前）"
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={onImportBackup}
            className="hidden"
          />
        </Row>
        <Row
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          label={t('common.resetData')}
          description={t('common.resetDataDesc')}
        >
          {resetConfirmOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder='输入 DELETE 确认'
                className="w-32 px-2 py-1.5 text-sm border border-red-300 rounded-md focus:outline-none focus:border-red-500"
              />
              <button
                onClick={onResetData}
                disabled={resetConfirmText !== 'DELETE'}
                className="px-3 py-1.5 rounded-md border border-red-300 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                确认重置
              </button>
              <button
                onClick={() => { setResetConfirmOpen(false); setResetConfirmText(''); }}
                className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={onResetData}
              className="px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              {t('common.resetData')}
            </button>
          )}
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
