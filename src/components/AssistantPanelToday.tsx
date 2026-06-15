/**
 * AssistantPanelToday — "今日" sub-tab of 经营助手.
 *
 * Layout (rev 2026-06-15 — 聚焦经营者视角):
 *   Row 1 · Hero        「今日入住率」大字 + 对比 7 天均值
 *   Row 2 · 4 stat      入住 / 退房 / 空床 / 今日潜在 $X（去掉了「待清洁」）
 *   Row 3 · 3 天 strip  今晚 / 明天 / 后天 入住率 + 可填床数 + 动作
 *   Row 4 · 7 天 forecast 细条形图（avg% + 高峰日）
 *   Row 5 · 两列 需关注  左：需要立刻处理（risks）| 右：抓住机会（opportunities）
 *
 * 移除了与经营者决策无关的：
 *   - 「待清洁」stat card
 *   - 「紧急交接班」「待清洁床位」insight 模板
 *
 * 接收 onSwitchToGrowth(subTab?) 让 insight 跳转在 Assistant 内部完成
 * （不切换顶部 tab）。3 天 strip 的「查看对策」目前统一跳到 bedboard
 * 顶层——后续若加日期筛选再优化目标。
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
  ArrowUp,
  ArrowDown,
  Minus,
  Shield,
  Check,
  DollarSign,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  const heroColor =
    todaySummary.occupancy >= 70
      ? 'emerald'
      : todaySummary.occupancy >= 40
        ? 'amber'
        : 'red';
  const heroColorMap = {
    emerald: { bg: 'from-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-200', sub: 'text-emerald-600' },
    amber:   { bg: 'from-amber-50/60',   text: 'text-amber-700',   border: 'border-amber-200',   sub: 'text-amber-600' },
    red:     { bg: 'from-red-50/60',     text: 'text-red-700',     border: 'border-red-200',     sub: 'text-red-600' },
  };
  const hero = heroColorMap[heroColor];

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-6">
      {/* ───── Row 1 · Hero 入住率 ───── */}
      <Card
        className={cn(
          'border shadow-none bg-gradient-to-br to-white',
          hero.bg,
          hero.border,
        )}
      >
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className={cn('text-xs font-semibold tracking-widest uppercase', hero.sub)}>
              {t('assistant.hero.occupancy')}
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className={cn('text-5xl sm:text-6xl font-bold leading-none tracking-tight', hero.text)}>
                {todaySummary.occupancy}
                <span className="text-2xl font-semibold">%</span>
              </span>
              <p className="text-sm text-zinc-500">
                {t('assistant.hero.bedsFmt', {
                  occupied: todaySummary.occupied,
                  total: todaySummary.totalBeds,
                  empty: todaySummary.emptyBeds,
                })}
              </p>
            </div>
            <div className={cn('mt-3 flex items-center gap-1.5 text-sm font-medium', hero.text)}>
              {diffPct > 0 && (
                <>
                  <ArrowUp className="h-4 w-4" />
                  <span>{t('assistant.hero.comparisonUp', { pct: diffPct })}</span>
                </>
              )}
              {diffPct < 0 && (
                <>
                  <ArrowDown className="h-4 w-4" />
                  <span>{t('assistant.hero.comparisonDown', { pct: Math.abs(diffPct) })}</span>
                </>
              )}
              {diffPct === 0 && (
                <>
                  <Minus className="h-4 w-4" />
                  <span>{t('assistant.hero.comparisonEqual')}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-2xl font-bold text-zinc-900">{recallCount}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {t('assistant.growthOverview.recallable')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">
                {formatCurrency(totalPotentialRevenue, language)}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {t('assistant.growthOverview.potential7d')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ───── Row 2 · 4 stat cards（已去 待清洁） ───── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          color="emerald"
          highlight
          onClick={handlePotentialClick}
        />
      </div>

      {/* ───── Row 3 · 3 天 strip ───── */}
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">
            {t('assistant.threeDay.title')}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
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
      </section>

      {/* ───── Row 4 · 7 天 forecast（细条形图） ───── */}
      <Card className="border shadow-none bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              {t('assistant.week.sevenDays')}
            </h3>
            <span
              className={cn(
                'text-base font-bold',
                weekForecast.avgOccupancy >= 70
                  ? 'text-emerald-600'
                  : weekForecast.avgOccupancy >= 40
                    ? 'text-amber-600'
                    : 'text-red-600',
              )}
            >
              {t('assistant.todaySummary.thisWeek')} · {weekForecast.avgOccupancy}%
            </span>
          </div>
          <div className="flex gap-1.5 items-end h-16">
            {weekForecast.daily.map(({ date, occupancyRate }) => {
              const dayDate = parseISO(date);
              return (
                <div
                  key={date}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${format(dayDate, 'EEE MMM d')} — ${occupancyRate}%`}
                >
                  <div className="w-full relative h-full bg-zinc-100 rounded overflow-hidden">
                    <div
                      className={cn(
                        'absolute bottom-0 w-full transition-all',
                        occupancyRate >= 80
                          ? 'bg-emerald-400'
                          : occupancyRate >= 50
                            ? 'bg-amber-400'
                            : 'bg-red-400',
                      )}
                      style={{ height: `${Math.max(occupancyRate, 5)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {format(dayDate, 'EEE')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 mt-2 border-t border-zinc-100">
            <span>
              {t('assistant.todaySummary.peak')}: {format(parseISO(weekForecast.peakDay.date), 'EEE')} ({weekForecast.peakDay.rate}%)
            </span>
            <span>
              {t('assistant.todaySummary.empty')}: {weekForecast.totalEmptyBedNights}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ───── Row 5 · 两列 需关注 ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
  const colorMap = {
    blue: 'bg-blue-50 text-blue-500',
    orange: 'bg-orange-50 text-orange-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    purple: 'bg-purple-50 text-purple-500',
  };
  const valueColor = {
    blue: 'text-zinc-900',
    orange: 'text-zinc-900',
    emerald: 'text-emerald-700',
    purple: 'text-zinc-900',
  };
  return (
    <Card
      className={cn(
        'border shadow-none bg-white transition-shadow',
        onClick && 'cursor-pointer hover:shadow-sm',
        highlight && 'border-emerald-200 bg-emerald-50/30',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', colorMap[color])}>{icon}</div>
        <div className="min-w-0">
          <p className={cn('text-2xl font-semibold leading-none', valueColor[color])}>
            {value}
          </p>
          {subValue && <p className="text-[10px] text-zinc-500 mt-0.5">{subValue}</p>}
          <p className="text-xs text-zinc-500 mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
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
  const cardColor = isFull
    ? 'border-zinc-200 bg-zinc-50/50'
    : day.occupancyRate >= 70
      ? 'border-amber-200 bg-amber-50/30'
      : 'border-emerald-200 bg-emerald-50/30';
  const rateColor = isFull
    ? 'text-zinc-400'
    : day.occupancyRate >= 70
      ? 'text-amber-600'
      : 'text-emerald-600';
  return (
    <Card className={cn('border shadow-none', cardColor)}>
      <CardContent className="p-3 sm:p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-[10px] text-zinc-400">{format(dayDate, 'MMM d')}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-3xl font-bold leading-none', rateColor)}>
            {day.occupancyRate}
          </span>
          <span className="text-sm font-semibold text-zinc-500">%</span>
          <span className="text-xs text-zinc-400 ml-1">
            {t('assistant.threeDay.occupancyFmt', { pct: day.occupancyRate }).replace(`${day.occupancyRate}% `, '')}
          </span>
        </div>
        {isFull ? (
          <div className="flex items-center gap-1 text-xs font-medium text-zinc-500">
            <Check className="h-3.5 w-3.5" />
            <span>{t('assistant.threeDay.fullHouse')}</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-600">
              {t('assistant.threeDay.canFill', { n: day.canFill })}
            </p>
            <button
              onClick={onAction}
              className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors self-start"
            >
              {t('assistant.threeDay.action')} →
            </button>
          </>
        )}
      </CardContent>
    </Card>
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
  const headerColor = kind === 'risk' ? 'text-red-600' : 'text-emerald-600';
  const HeaderIcon = kind === 'risk' ? AlertTriangle : Lightbulb;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <HeaderIcon className={cn('h-4 w-4', headerColor)} />
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <span className="text-xs text-zinc-400">({insights.length})</span>
      </div>
      {insights.length === 0 ? (
        <Card
          className={cn(
            'border shadow-sm',
            kind === 'risk'
              ? 'border-emerald-200 bg-emerald-50/50'
              : 'border-zinc-200 bg-zinc-50/50',
          )}
        >
          <CardContent className="p-4 flex items-center gap-2">
            {kind === 'risk' ? (
              <Shield className="h-4 w-4 text-emerald-500" />
            ) : (
              <Lightbulb className="h-4 w-4 text-zinc-400" />
            )}
            <p
              className={cn(
                'text-xs',
                kind === 'risk' ? 'text-emerald-700' : 'text-zinc-500',
              )}
            >
              {allClearText}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
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
    </section>
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
  const borderColor = kind === 'risk' ? 'border-l-red-500' : 'border-l-emerald-400';
  const Icon = kind === 'risk' ? AlertTriangle : Lightbulb;
  const iconColor = kind === 'risk' ? 'text-red-500' : 'text-emerald-500';
  return (
    <Card className={cn('border shadow-none bg-white border-l-4', borderColor)}>
      <CardContent className="p-3.5 flex items-start gap-3">
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-900 whitespace-normal">{insight.title}</h4>
          {insight.description && (
            <p className="text-xs text-zinc-500 mt-0.5">{insight.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {insight.actionLabel && (
            <button
              onClick={onAction}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors',
                kind === 'risk'
                  ? 'text-white bg-red-600 hover:bg-red-700'
                  : 'text-white bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {insight.actionLabel}
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-zinc-100 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
