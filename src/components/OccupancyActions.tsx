import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation, formatCurrency } from '../i18nContext';
import { OccupancyAction } from '../types';
import { generateOccupancyActions, calculateAvailability, getActionTypeLabel } from '../utils/occupancyEngine';
import { Zap, TrendingUp, Bed, BarChart3, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export function OccupancyActions() {
  const { rooms, guestProfiles } = useHostel();
  const { t, language } = useTranslation();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const actions = useMemo(() => generateOccupancyActions(rooms, guestProfiles, 7, t), [rooms, guestProfiles, t]);

  const activeActions = actions.filter(a => !dismissedIds.has(a.id));

  const availability = useMemo(() => calculateAvailability(rooms, new Date(), 7), [rooms]);
  const totalEmptyBedNights = availability.reduce((sum, d) => sum + d.emptyBeds, 0);
  const avgOccupancy = availability.reduce((sum, d) => sum + d.occupancyRate, 0) / availability.length;
  const totalPotentialRevenue = activeActions.reduce((sum, a) => sum + a.estimatedRevenue, 0);
  const totalPotentialBedNights = activeActions.reduce((sum, a) => sum + a.estimatedBedNights, 0);

  const handleApply = (action: OccupancyAction) => {
    setDismissedIds(prev => new Set([...prev, action.id]));
  };

  const handleDismiss = (actionId: string) => {
    setDismissedIds(prev => new Set([...prev, actionId]));
  };

  return (
    <div className="space-y-6">
      {/* 7-Day Overview */}
      <Card className="border shadow-none bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-zinc-400" />
              {t('occupancy.next7Days')}
            </h3>
            <span className="text-xs text-zinc-500">
              {t('occupancy.avgOccupancy')}: {Math.round(avgOccupancy)}%
            </span>
          </div>

          <div className="flex gap-1.5 items-end h-20">
            {availability.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative h-16 bg-zinc-100 rounded overflow-hidden">
                  <div
                    className={cn(
                      "absolute bottom-0 w-full transition-all",
                      day.occupancyRate >= 80 ? "bg-emerald-400" :
                      day.occupancyRate >= 50 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ height: `${day.occupancyRate}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400">
                  {format(addDays(new Date(), i), 'EEE')}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>{totalEmptyBedNights} {t('occupancy.emptyBedNights')}</span>
            <span>{t('occupancy.potentialRevenue')}: <span className="font-medium text-emerald-600">{formatCurrency(totalPotentialRevenue, language)}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t('occupancy.suggestedActions')}
            <Badge variant="secondary" className="text-xs">{activeActions.length}</Badge>
          </h3>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {activeActions.map((action, i) => {
              const typeLabel = getActionTypeLabel(action.type);
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border shadow-none bg-white border-l-4 border-l-amber-400">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{typeLabel.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-zinc-900">{action.title}</h4>
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                              {language === 'zh' ? typeLabel.zh : typeLabel.en}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mb-3">{action.description}</p>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5">
                              <Bed className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-600">+{action.estimatedBedNights} {t('occupancy.bedNights')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-600">+{formatCurrency(action.estimatedRevenue, language)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleApply(action)}>
                              <Check className="h-3 w-3" />
                              {t('occupancy.apply')}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400" onClick={() => handleDismiss(action.id)}>
                              {t('occupancy.dismiss')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {activeActions.length === 0 && (
            <div className="py-12 text-center">
              <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-zinc-900">{t('occupancy.allGood')}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('occupancy.noActionsNeeded')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
