/**
 * AutoAssignConfirmDialog — 自动分配床位的确认卡片
 *
 * 移动优先交互：
 * - 移动端：底部 Sheet（圆角顶部，drag handle，贴底最大 90vh，可上滑关闭）
 * - 桌面端：居中 Modal（最大宽 480px，圆角 16，阴影 + backdrop blur）
 *
 * 显示内容（why this bed）：
 * - 客人姓名 + 头像 / 状态 chip
 * - 推荐床位卡片（房间类型 + 床名 + 房间号 + 上下铺）
 * - 价格分解（每晚 × 晚数 = 合计）
 * - 推荐原因 chip（💰 Tier Match / ♀ Gender / ✓ Pref / ▣ Fill Existing / ◇ Low Frag）
 * - 底部双按钮：取消 / 确认并入住
 *
 * 与 window.confirm 对比：
 * - 美观、响应式、可定制
 * - 支持点击 backdrop 关闭
 * - 移动端可拖拽 handle 关闭
 * - iOS safe area 适配
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import { BedDouble, X, Sparkles, ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../i18nContext';
import { useTranslation } from '../i18nContext';
import type { Guest } from '../types';
import type { BedScore } from '../utils/bedAllocator';

interface AutoAssignConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  guest: Guest;
  recommendedBed: BedScore;
  totalForStay: number;
  AVG_PRICE: number;
}

export function AutoAssignConfirmDialog({
  open,
  onClose,
  onConfirm,
  guest,
  recommendedBed,
  totalForStay,
  AVG_PRICE,
}: AutoAssignConfirmDialogProps) {
  const { t, language } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  // Lock body scroll when open (mobile UX)
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  // 响应式检测
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Reset confirming state when dialog closes
  useEffect(() => {
    if (!open) setIsConfirming(false);
  }, [open]);

  // 拖拽关闭处理（移动端）
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // 向下拖拽超过 100px 或速度足够快时关闭
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (isConfirming) return;
    setIsConfirming(true);
    // 使用微任务延迟，确保 spinner 能渲染
    requestAnimationFrame(() => {
      onConfirm();
    });
  };

  const roomTypeName =
    recommendedBed.roomType === 'dorm-mixed'
      ? t('bedboard.mixedDorm')
      : recommendedBed.roomType === 'dorm-female'
        ? t('bedboard.femaleDorm')
        : t('bedboard.private');
  const bedTypeName =
    recommendedBed.bedType === 'bottom'
      ? t('checkin.bottomBunk')
      : t('checkin.topBunk');

  // Build reason chip list
  const reasons: { key: string; icon: string; bg: string; text: string; label: string }[] = [];
  if (recommendedBed.bedTierMatch) {
    reasons.push({
      key: 'tier',
      icon: '💰',
      bg: 'bg-amber-50 text-amber-700 ring-amber-200',
      text: '',
      label: t('checkin.tagTierMatch'),
    });
  }
  if (recommendedBed.genderMatch) {
    reasons.push({
      key: 'gender',
      icon: '♀',
      bg: 'bg-pink-50 text-pink-700 ring-pink-200',
      text: '',
      label: t('checkin.tagGender'),
    });
  }
  if (recommendedBed.preferenceMatch) {
    reasons.push({
      key: 'pref',
      icon: '✓',
      bg: 'bg-violet-50 text-violet-700 ring-violet-200',
      text: '',
      label: t('checkin.tagPref'),
    });
  }
  if (recommendedBed.fillExisting) {
    reasons.push({
      key: 'fill',
      icon: '▣',
      bg: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
      text: '',
      label: t('checkin.tagFill'),
    });
  }
  if (recommendedBed.fragmentationScore >= 7) {
    reasons.push({
      key: 'frag',
      icon: '◇',
      bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      text: '',
      label: t('checkin.tagLowFrag'),
    });
  }
  if (reasons.length === 0) {
    reasons.push({
      key: 'best',
      icon: '★',
      bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      text: '',
      label: t('checkin.bestFit') || 'Best fit',
    });
  }

  const priceDiff = recommendedBed.pricePerNight - AVG_PRICE;
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || guest.name;
  const genderChip = guest.gender
    ? guest.gender === 'female'
      ? { icon: '♀', bg: 'bg-pink-50 text-pink-700' }
      : guest.gender === 'male'
        ? { icon: '♂', bg: 'bg-sky-50 text-sky-700' }
        : { icon: '○', bg: 'bg-zinc-100 text-zinc-600' }
    : null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden
          />

          {/* Mobile: Bottom sheet (fixed bottom, slide up) */}
          {/* Desktop: Centered modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'absolute bg-card shadow-modal flex flex-col overflow-hidden ring-1 ring-border/50',
              // Mobile: bottom sheet
              'inset-x-0 bottom-0 rounded-t-3xl max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]',
              // Desktop: centered modal
              'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
              'md:w-[480px] md:max-w-[calc(100vw-2rem)] md:rounded-2xl md:max-h-[85vh]',
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-assign-title"
          >
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>

            {/* Header */}
            <div className="relative px-5 pt-4 md:pt-5 pb-3 shrink-0">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 id="auto-assign-title" className="text-base md:text-lg font-extrabold text-zinc-900 leading-tight">
                    {t('checkin.confirmAutoAssignTitle') || 'Confirm auto-assignment'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('checkin.confirmAutoAssignSubtitle') || 'Review the recommended bed before checking in'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="md:flex hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              {/* Guest row */}
              <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-600 shrink-0">
                  {guestName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-zinc-900 truncate">{guestName}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{guest.countryCode}</span>
                    {genderChip && (
                      <span className={cn('inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded', genderChip.bg)}>
                        {genderChip.icon} {t(`guest.${guest.gender}`) || guest.gender}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{guest.nights} {t('dashboard.nights')}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>

              {/* Recommended bed card */}
              <div className="relative border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-white rounded-xl p-4 shadow-sm">
                <div className="absolute -top-2.5 left-3 text-xs font-extrabold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-md ring-2 ring-white flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t('checkin.bestMatch') || 'BEST MATCH'}
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-sm text-zinc-900 truncate">
                        {roomTypeName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 ml-5">
                      {recommendedBed.bedName} · {bedTypeName} · R{recommendedBed.roomNumber}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-3 flex items-baseline gap-1.5 px-3 py-2 bg-white/80 rounded-lg">
                  <span className="text-xl font-extrabold text-zinc-900">
                    {formatCurrency(recommendedBed.pricePerNight, language)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/night</span>
                  <span className="text-xs text-muted-foreground ml-1">×</span>
                  <span className="text-xs text-zinc-600 font-semibold">{guest.nights} {t('dashboard.nights')}</span>
                  <span className="text-xs text-muted-foreground ml-1">=</span>
                  <span className="text-base font-extrabold text-emerald-700 ml-auto">
                    {formatCurrency(totalForStay, language)}
                  </span>
                </div>
                {priceDiff !== 0 && (
                  <div className={cn('text-xs mt-1.5 px-3', priceDiff > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                    {priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff, language)} {t('checkin.vsAvg') || 'vs avg'}
                  </div>
                )}

                {/* Reasons */}
                <div className="mt-3 pt-3 border-t border-emerald-200/60">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                    {t('checkin.whyThisBed') || 'Why this bed'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reasons.map((r) => (
                      <span
                        key={r.key}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ring-1',
                          r.bg,
                        )}
                      >
                        <span className="text-xs">{r.icon}</span>
                        {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warning for unpaid */}
              {(guest.paymentStatus === 'unpaid' || guest.paymentStatus === 'partial') && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <span className="text-base shrink-0">⚠️</span>
                  <div className="flex-1">
                    <div className="font-bold">{t('checkin.unpaidWarning') || 'Payment not settled'}</div>
                    <div className="text-amber-600 mt-0.5">{t('checkin.collectBeforeAssign') || 'Please collect payment first before assigning a bed'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer (sticky, mobile-first) */}
            <div className="border-t border-border px-4 pt-3 pb-4 md:pb-3 flex gap-2 shrink-0 bg-card">
              <button
                onClick={onClose}
                className="flex-1 h-11 sm:h-10 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] transition-all"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={guest.paymentStatus === 'unpaid' || guest.paymentStatus === 'partial' || isConfirming}
                className="flex-[2] h-11 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:from-zinc-300 disabled:to-zinc-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-1.5"
              >
                {isConfirming ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('checkin.processing') || 'Processing...'}</>
                ) : (
                  <><Check className="w-4 h-4" strokeWidth={2.5} /> {t('checkin.confirmAndCheckIn') || 'Confirm & Check-in'}</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
