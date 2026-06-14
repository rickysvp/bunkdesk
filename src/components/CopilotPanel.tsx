import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import { CopilotInsight } from '../types';
import {
  generateTodaySummary,
  generateWeekForecast,
  generateOpportunities,
  generateRisks,
} from '../utils/copilotEngine';
import {
  Brain,
  LogIn,
  LogOut,
  Bed,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  X,
  Calendar,
  Zap,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface CopilotPanelProps {
  setActiveTab?: (tab: string) => void;
  navigateToGrow?: (subTab: string, options?: { autoOpenPromo?: boolean }) => void;
}

export function CopilotPanel({ setActiveTab, navigateToGrow }: CopilotPanelProps) {
  const { rooms, guestProfiles, shiftNotes } = useHostel();
  const { t } = useTranslation();
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  const todaySummary = useMemo(() => generateTodaySummary(rooms), [rooms]);
  const weekForecast = useMemo(() => generateWeekForecast(rooms), [rooms]);
  const opportunities = useMemo(() => generateOpportunities(rooms, guestProfiles, shiftNotes), [rooms, guestProfiles, shiftNotes]);
  const risks = useMemo(() => generateRisks(rooms, shiftNotes), [rooms, shiftNotes]);

  const activeOpportunities = opportunities.filter(i => !dismissedInsights.has(i.id));
  const activeRisks = risks.filter(i => !dismissedInsights.has(i.id));

  const handleInsightAction = (insight: CopilotInsight) => {
    if (!insight.actionTarget) return;

    if (insight.actionTarget.includes(':')) {
      const [tab, subTab] = insight.actionTarget.split(':');
      if (tab === 'grow' && navigateToGrow) {
        navigateToGrow(subTab);
      } else if (setActiveTab) {
        setActiveTab(tab);
      }
    } else if (setActiveTab) {
      setActiveTab(insight.actionTarget);
    }
  };

  const handleDismiss = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
          <Brain className="h-6 w-6 text-zinc-400" />
          {t('copilot.title') || 'Hostel Copilot'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{t('copilot.subtitle') || 'Your daily decision dashboard'}</p>
      </div>

      {/* Today Summary */}
      <motion.div variants={container} initial="hidden" animate="show">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-400" />
          {t('copilot.today') || 'Today'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div variants={item}>
            <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveTab?.('checkin')}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                  <LogIn className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.checkIns}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.checkIns') || 'Check-ins'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveTab?.('bedboard')}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-500">
                  <LogOut className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.checkOuts}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.checkOuts') || 'Check-outs'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveTab?.('bedboard')}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500">
                  <Bed className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.emptyBeds}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.emptyBeds') || 'Empty Beds'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-none bg-white">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-500">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.cleaningBeds}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.cleaning') || 'Cleaning'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* This Week Forecast */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-zinc-400" />
                {t('copilot.thisWeek') || 'This Week'}
              </h2>
              <span className={cn(
                "text-lg font-bold",
                weekForecast.avgOccupancy >= 70 ? "text-emerald-600" :
                weekForecast.avgOccupancy >= 40 ? "text-amber-600" : "text-red-600"
              )}>
                {weekForecast.avgOccupancy}%
              </span>
            </div>

            <div className="flex gap-1.5 items-end h-20 mb-3">
              {Array.from({ length: 7 }, (_, i) => {
                const date = addDays(new Date(), i);
                const dayAvail = rooms.reduce((acc, r) => {
                  const total = r.beds.length;
                  const occupied = r.beds.filter(b => b.status === 'occupied').length;
                  return { total: acc.total + total, occupied: acc.occupied + occupied };
                }, { total: 0, occupied: 0 });
                const rate = dayAvail.total > 0 ? Math.round((dayAvail.occupied / dayAvail.total) * 100) : 0;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative h-16 bg-zinc-100 rounded overflow-hidden">
                      <div
                        className={cn(
                          "absolute bottom-0 w-full transition-all",
                          rate >= 80 ? "bg-emerald-400" :
                          rate >= 50 ? "bg-amber-400" : "bg-red-400"
                        )}
                        style={{ height: `${Math.max(rate, 5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {format(date, 'EEE')}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{t('copilot.peakDay') || 'Peak'}: {format(parseISO(weekForecast.peakDay.date), 'EEE')} ({weekForecast.peakDay.rate}%)</span>
              <span>{t('copilot.emptyBedNights') || 'Empty bed-nights'}: {weekForecast.totalEmptyBedNights}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Opportunities */}
      {activeOpportunities.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {t('copilot.opportunities') || 'Opportunities'}
            <span className="text-xs font-normal text-zinc-400">({activeOpportunities.length})</span>
          </h2>
          <div className="space-y-2">
            {activeOpportunities.map(insight => (
              <Card key={insight.id} className="border shadow-none bg-white border-l-4 border-l-amber-400">
                <CardContent className="p-4 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-900">{insight.title}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{insight.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {insight.actionLabel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleInsightAction(insight)}
                      >
                        {insight.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="p-1 hover:bg-zinc-100 rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Risks */}
      {activeRisks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {t('copilot.risks') || 'Risks'}
            <span className="text-xs font-normal text-zinc-400">({activeRisks.length})</span>
          </h2>
          <div className="space-y-2">
            {activeRisks.map(insight => (
              <Card key={insight.id} className={cn(
                "border shadow-none bg-white border-l-4",
                insight.severity === 'risk' ? 'border-l-red-500' : 'border-l-amber-400'
              )}>
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    insight.severity === 'risk' ? 'text-red-500' : 'text-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-900">{insight.title}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{insight.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {insight.actionLabel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleInsightAction(insight)}
                      >
                        {insight.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="p-1 hover:bg-zinc-100 rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* All Clear */}
      {activeOpportunities.length === 0 && activeRisks.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">{t('copilot.allClear') || 'All clear!'}</p>
              <p className="text-xs text-emerald-600 mt-1">{t('copilot.noIssues') || 'No issues or opportunities right now.'}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
