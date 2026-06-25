/**
 * AssistantPanelToday — "今日" sub-tab of 经营助手.
 *
 * Layout (rev 2026-06-25 — Google-blue chart palette, matches
 * bunkdesk-redesign/pages/assistant.html):
 *   Row 1 · Hero        「今日入住率」大字 + 对比 7 天均值 + 图例点
 *   Row 2 · 4 stat      入住 / 退房 / 空床 / 今日潜在 $X
 *   Row 3 · 3 天 strip  今晚 / 明天 / 后天 入住率 + 空床 + 查看
 *   Row 4 · 7 天 forecast 高条形图（% 标签在柱顶，颜色随入住率分级）
 *   Row 5 · 两列 需关注  左：需要立刻处理（risks）| 右：抓住机会（opportunities）
 *
 * 接收 onSwitchToGrowth(subTab?) 让 insight 跳转在 Assistant 内部完成
 * （不切换顶部 tab）。3 天 strip 的「查看」目前统一跳到 bedboard。
 */

import React, { useState, useMemo, Fragment } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation, formatCurrency } from '../i18nContext';
import { CopilotInsight } from '../types';
import {
  generateTodaySummary,
  generateWeekForecast,
  generateOpportunities,
  generateRisks,
} from '../utils/copilotEngine';
import { generateOccupancyActions } from '../utils/occupancyEngine';
import { findRecallCandidates } from '../utils/guestCrmEngine';
import {
  LogIn,
  LogOut,
  Bed,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Shield,
  DollarSign,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface AssistantPanelTodayProps {
  setActiveTab?: (tab: string) => void;
  onSwitchToGrowth?: (subTab?: string, options?: { autoOpenPromo?: boolean }) => void;
}

type GrowthToolId = 'hostel-page' | 'crm' | 'occupancy' | 'referral' | 'pricing';

export function AssistantPanelToday({ setActiveTab, onSwitchToGrowth }: AssistantPanelTodayProps) {
  const { rooms, guestProfiles, arrivals, groupBookings } = useHostel();
  const { t, language } = useTranslation();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const todaySummary = useMemo(
    () => generateTodaySummary(rooms, arrivals, t),
    [rooms, arrivals, t],
  );
  const weekForecast = useMemo(
    () => generateWeekForecast(rooms, arrivals, t),
    [rooms, arrivals, t],
  );
  const opportunities = useMemo(
    () => generateOpportunities(rooms, guestProfiles, arrivals, groupBookings, t),
    [rooms, guestProfiles, arrivals, groupBookings, t],
  );
  const risks = useMemo(
    () => generateRisks(rooms, guestProfiles, arrivals, groupBookings, t),
    [rooms, guestProfiles, arrivals, groupBookings, t],
  );

  // ── 今日潜在 $X（来自 occupancyEngine，与 Growth tab 同源） ──
  const occupancyActions = useMemo(
    () => generateOccupancyActions(rooms, guestProfiles, 7, t),
    [rooms, guestProfiles, t],
  );
  const recallCount = useMemo(
    () => findRecallCandidates(guestProfiles).length,
    [guestProfiles],
  );
  const totalPotentialRevenue = useMemo(
    () => occupancyActions.reduce((s, a) => s + a.estimatedRevenue, 0),
    [occupancyActions],
  );
  const totalPotentialBedNights = useMemo(
    () => occupancyActions.reduce((s, a) => s + a.estimatedBedNights, 0),
    [occupancyActions],
  );

  // 两列 需关注 — 拆 risks / opportunities
  const visibleOpportunities = opportunities.filter((i) => !dismissed.has(i.id));
  const visibleRisks = risks.filter((i) => !dismissed.has(i.id));

  const handleInsightAction = (insight: CopilotInsight) => {
    if (!insight.actionTarget) return;
    if (insight.actionTarget.includes(':')) {
      const [tab, subTab] = insight.actionTarget.split(':');
      if (tab === 'grow' && onSwitchToGrowth) {
        onSwitchToGrowth(subTab, { autoOpenPromo: insight.id.includes('promo') });
        return;
      }
      if (setActiveTab) setActiveTab(tab);
    } else if (setActiveTab) {
      setActiveTab(insight.actionTarget);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handlePotentialClick = () => {
    if (onSwitchToGrowth) onSwitchToGrowth('occupancy' as GrowthToolId);
  };

  // Hero 对比 7 天均值的差值（百分点）
  const diffPct = todaySummary.occupancy - weekForecast.avgOccupancy;
  // 图例文本：复用现有 i18n key，按 " · " 拆成两段，对应两个图例点
  const bedsLegend = t('assistant.hero.bedsFmt', {
    occupied: todaySummary.occupied,
    total: todaySummary.totalBeds,
    empty: todaySummary.emptyBeds,
  });
  const [legendOccupied, legendEmpty] = bedsLegend.split(' · ');

  return (
    <div className="max-w-6xl mx-auto space-y-3 pb-6">
      {/* ───── Row 1 · Hero 入住率 ───── */}
      <div className="rounded-xl border border-chart-1/30 bg-gradient-to-br from-chart-1/10 to-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('assistant.hero.occupancy')}
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold font-mono text-foreground">
                {todaySummary.occupancy}%
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  diffPct > 0
                    ? 'text-chart-5'
                    : diffPct < 0
                      ? 'text-chart-2'
                      : 'text-muted-foreground',
                )}
              >
                {diffPct > 0 &&
                  t('assistant.hero.comparisonUp', { pct: diffPct })}
                {diffPct < 0 &&
                  t('assistant.hero.comparisonDown', { pct: Math.abs(diffPct) })}
                {diffPct === 0 && t('assistant.hero.comparisonEqual')}
              </span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-chart-1/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-chart-1" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chart-1" />
            {legendOccupied}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chart-3" />
            {legendEmpty}
          </span>
        </div>
      </div>

      {/* ───── Row 2 · 4 stat cards ───── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={t('assistant.todaySummary.checkIns')}
          value={todaySummary.checkIns}
          icon={<LogIn className="h-4 w-4" />}
          color="blue"
          onClick={() => setActiveTab?.('checkin')}
        />
        <StatCard
          label={t('assistant.todaySummary.checkOuts')}
          value={todaySummary.checkOuts}
          icon={<LogOut className="h-4 w-4" />}
          color="orange"
          onClick={() => setActiveTab?.('bedboard')}
        />
        <StatCard
          label={t('assistant.todaySummary.emptyBeds')}
          value={todaySummary.emptyBeds}
          icon={<Bed className="h-4 w-4" />}
          color="emerald"
          onClick={() => setActiveTab?.('bedboard')}
        />
        <StatCard
          label={t('assistant.potentialRevenue')}
          value={formatCurrency(totalPotentialRevenue, language)}
          subValue={
            totalPotentialBedNights > 0
              ? `+${totalPotentialBedNights} ${t('assistant.potentialBedNights')}`
              : undefined
          }
          icon={<DollarSign className="h-4 w-4" />}
          color="purple"
          highlight
          onClick={handlePotentialClick}
        />
      </div>

      {/* ───── Row 3 · 3 天 strip ───── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {weekForecast.threeDay.map((day, i) => (
          <Fragment key={day.date}>
            <ThreeDayCard
              day={day}
              label={[t('assistant.threeDay.tonight'), t('assistant.threeDay.tomorrow'), t('assistant.threeDay.dayAfter')][i]}
              t={t}
              language={language}
              onAction={() => setActiveTab?.('bedboard')}
            />
          </Fragment>
        ))}
      </div>

      {/* ───── Row 4 · 7 天 forecast（高条形图） ───── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('assistant.week.sevenDays')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('assistant.todaySummary.thisWeek')} · {weekForecast.avgOccupancy}%
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-1" />
              {t('assistant.hero.occupancy')}
            </span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 h-48 px-2">
          {weekForecast.daily.map(({ date, occupancyRate }) => {
            const dayDate = parseISO(date);
            const isPeak = date === weekForecast.peakDay.date;
            const barColor = isPeak
              ? 'bg-chart-4'
              : occupancyRate >= 90
                ? 'bg-chart-5'
                : occupancyRate >= 70
                  ? 'bg-chart-1'
                  : occupancyRate >= 50
                    ? 'bg-chart-3'
                    : 'bg-chart-2';
            return (
              <div
                key={date}
                className="flex-1 flex flex-col items-center gap-2 h-full"
                title={`${format(dayDate, 'EEE MMM d')} — ${occupancyRate}%`}
              >
                <span className="text-xs font-mono font-medium text-foreground">
                  {occupancyRate}%
                </span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={cn('w-full rounded-t-lg', barColor)}
                    style={{ height: `${Math.max(occupancyRate, 4)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(dayDate, 'EEE')}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 mt-2 border-t border-border">
          <span>
            {t('assistant.todaySummary.peak')}: {format(parseISO(weekForecast.peakDay.date), 'EEE')} ({weekForecast.peakDay.rate}%)
          </span>
          <span>
            {t('assistant.todaySummary.empty')}: {weekForecast.totalEmptyBedNights}
          </span>
        </div>
      </div>

      {/* ───── Row 5 · 两列 需关注 ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <InsightColumn
          kind="risk"
          title={t('assistant.needsAction')}
          insights={visibleRisks}
          allClearText={t('assistant.todaySummary.allClear')}
          onAction={handleInsightAction}
          onDismiss={handleDismiss}
        />
        <InsightColumn
          kind="opportunity"
          title={t('assistant.opportunities')}
          insights={visibleOpportunities}
          allClearText={t('occupancy.allGood')}
          onAction={handleInsightAction}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
}

// ---------- sub-components ----------

function StatCard({
  label, value, subValue, icon, color, highlight, onClick,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'emerald' | 'purple';
  highlight?: boolean;
  onClick?: () => void;
}) {
  // chart token 颜色映射：blue→chart-1, orange→chart-2, emerald→chart-5, purple→chart-4
  const colorMap = {
    blue: 'bg-chart-1/10 text-chart-1',
    orange: 'bg-chart-2/10 text-chart-2',
    emerald: 'bg-chart-5/10 text-chart-5',
    purple: 'bg-chart-4/10 text-chart-4',
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-xl p-3 transition-all',
        onClick && 'cursor-pointer hover:shadow-sm hover:-translate-y-0.5',
        highlight && 'border-chart-4/30',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground truncate">{label}</span>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', colorMap[color])}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
      {subValue && <p className="text-xs text-chart-5 mt-1">{subValue}</p>}
    </div>
  );
}

function ThreeDayCard({
  day, label, t, language: _language, onAction,
}: {
  day: { date: string; occupancyRate: number; emptyBeds: number; canFill: number };
  label: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  language: 'en' | 'zh';
  onAction: () => void;
}) {
  const dayDate = parseISO(day.date);
  const isFull = day.emptyBeds === 0;
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mb-3">{format(dayDate, 'M/d')}</p>
        <p className="text-2xl font-bold font-mono text-foreground">{day.occupancyRate}%</p>
        <p className="text-xs text-muted-foreground mt-1">
          {isFull
            ? t('assistant.threeDay.fullHouse')
            : t('assistant.threeDay.canFill', { n: day.emptyBeds })}
        </p>
      </div>
      <button
        onClick={onAction}
        className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        {t('assistant.threeDay.action')}
      </button>
    </div>
  );
}

function InsightColumn({
  kind, title, insights, allClearText, onAction, onDismiss,
}: {
  kind: 'risk' | 'opportunity';
  title: string;
  insights: CopilotInsight[];
  allClearText: string;
  onAction: (i: CopilotInsight) => void;
  onDismiss: (id: string) => void;
}) {
  const isRisk = kind === 'risk';
  const headerBg = isRisk ? 'bg-chart-2/10' : 'bg-chart-5/10';
  const headerIconColor = isRisk ? 'text-chart-2' : 'text-chart-5';
  const HeaderIcon = isRisk ? AlertTriangle : Lightbulb;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', headerBg)}>
          <HeaderIcon className={cn('w-4 h-4', headerIconColor)} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">({insights.length})</span>
      </div>
      {insights.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          {isRisk ? (
            <Shield className="h-4 w-4 text-chart-5" />
          ) : (
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          )}
          <p className={cn('text-sm', isRisk ? 'text-chart-5' : 'text-muted-foreground')}>
            {allClearText}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {insights.map((insight) => (
              <motion.div
                key={insight.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                <InsightRow
                  insight={insight}
                  kind={kind}
                  onAction={() => onAction(insight)}
                  onDismiss={() => onDismiss(insight.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function InsightRow({
  insight, kind, onAction, onDismiss,
}: {
  insight: CopilotInsight;
  kind: 'risk' | 'opportunity';
  onAction: () => void;
  onDismiss: () => void;
}) {
  const isRisk = kind === 'risk';
  // risk → chart-2，opportunity → chart-5
  const borderColor = isRisk ? 'border-l-chart-2' : 'border-l-chart-5';
  const bgColor = isRisk ? 'bg-chart-2/5' : 'bg-chart-5/5';
  const Icon = isRisk ? AlertTriangle : Lightbulb;
  const iconColor = isRisk ? 'text-chart-2' : 'text-chart-5';
  const actionBtn = isRisk
    ? 'bg-chart-2 text-white hover:bg-chart-2/90'
    : 'bg-chart-5 text-white hover:bg-chart-5/90';
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border-l-[3px]', borderColor, bgColor)}>
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', iconColor)} />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm text-foreground whitespace-normal">{insight.title}</h4>
        {insight.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
        )}
        {insight.actionLabel && (
          <button
            onClick={onAction}
            className={cn(
              'mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors',
              actionBtn,
            )}
          >
            {insight.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-muted rounded transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
