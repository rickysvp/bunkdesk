/**
 * LandingPage — public marketing site for BunkDesk.
 *
 * 6 sections (down from 7 after the BunkDesk rebrand):
 *
 *   1. Hero                  — dark, blue-600 accent, dual CTA
 *   2. The Reality Check     — 4 pain points with stats
 *   3. The BunkDesk Way      — Before / After
 *   4. Features              — 4 main + 8 more
 *   5. The Bed-Level Gap     — visual comparison (kept — core differentiator)
 *   6. How BunkDesk works    — 4-step workflow (replaces the old AI section)
 *   7. Pricing + Final CTA   — Trial + Standard ($19/mo)
 *   8. Footer
 *
 * Brand: BunkDesk (formerly "Bunkly" — fully renamed).
 * Markets: Europe, the Americas, Southeast Asia. USD pricing.
 * No AI features. No OTA API integrations. No WhatsApp automation.
 * Those three things were false claims in earlier versions and have
 * been removed; only the features that actually exist in the
 * codebase are advertised.
 *
 * Theme: blue-600 accent (matches the app's TopBar underline).
 * Language toggle: top-right corner.
 */

import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '../i18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, Globe, Shield, Zap, Languages, X, Check,
  BedDouble, Users, TrendingUp, CreditCard,
  BarChart3, Database, Smartphone, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const { t, language, setLanguage } = useTranslation();

  // Pain points (4)
  const painPoints = [
    { stat: '67%', title: t('landing.pain1Title'), desc: t('landing.pain1Desc'), color: 'red' },
    { stat: '20m', title: t('landing.pain2Title'), desc: t('landing.pain2Desc'), color: 'amber' },
    { stat: '$24k', title: t('landing.pain3Title'), desc: t('landing.pain3Desc'), color: 'purple' },
    { stat: '8s', title: t('landing.pain4Title'), desc: t('landing.pain4Desc'), color: 'blue' },
  ] as const;

  // Before / After
  const beforeItems = [1, 2, 3, 4, 5, 6].map((i) => t(`landing.before${i}`));
  const afterItems = [1, 2, 3, 4, 5, 6].map((i) => t(`landing.after${i}`));

  // Features (4 main + 8 more)
  const mainFeatures = [
    {
      icon: BedDouble, color: 'blue',
      title: t('landing.feat1Title'), desc: t('landing.feat1Desc'),
    },
    {
      icon: Globe, color: 'emerald',
      title: t('landing.feat2Title'), desc: t('landing.feat2Desc'),
    },
    {
      icon: Users, color: 'pink',
      title: t('landing.feat3Title'), desc: t('landing.feat3Desc'),
    },
    {
      icon: TrendingUp, color: 'amber',
      title: t('landing.feat4Title'), desc: t('landing.feat4Desc'),
    },
  ] as const;
  const moreFeatures = [
    { icon: Users, label: t('landing.more1') },
    { icon: Shield, label: t('landing.more2') },
    { icon: Zap, label: t('landing.more3') },
    { icon: BarChart3, label: t('landing.more4') },
    { icon: CreditCard, label: t('landing.more5') },
    { icon: Globe, label: t('landing.more6') },
    { icon: Smartphone, label: t('landing.more7') },
    { icon: Database, label: t('landing.more8') },
  ] as const;

  // How BunkDesk works (4 steps — replaces the old AI section)
  const howSteps = [
    { num: '01', title: t('landing.how1Title'), desc: t('landing.how1Desc'), icon: BedDouble },
    { num: '02', title: t('landing.how2Title'), desc: t('landing.how2Desc'), icon: BarChart3 },
    { num: '03', title: t('landing.how3Title'), desc: t('landing.how3Desc'), icon: Globe },
    { num: '04', title: t('landing.how4Title'), desc: t('landing.how4Desc'), icon: TrendingUp },
  ] as const;

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden">
      {/* Language toggle — floating top-right */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          className="gap-1.5 bg-white/80 backdrop-blur shadow-sm"
        >
          <Languages className="h-3.5 w-3.5" />
          {language === 'zh' ? 'EN' : '中'}
        </Button>
      </div>

      {/* ================== 1. HERO ================== */}
      <section className="relative min-h-[680px] flex items-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-blue-950 text-white">
        {/* Decorative gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-muted-foreground/70 backdrop-blur">
              <BedDouble className="h-3 w-3 text-blue-400" />
              {t('landing.heroBadge') || 'Built for hostel owners · Bed-level'}
            </div>

            <h1 className="mt-6 text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              {t('landing.heroTitle1') || 'Bed-level'}
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                {t('landing.heroTitle2') || 'hostel management'}
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground/70 max-w-md leading-relaxed">
              {t('landing.heroSubtitle') ||
                'Visual bed board, direct booking page, and built-in CRM. No commissions, no API headaches — $19/month, all in.'}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onEnterApp}
                className="h-12 px-6 text-base gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
              >
                {t('landing.heroCta') || 'Start 14-day trial'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base gap-2 border-white/20 text-white hover:bg-white/10 bg-transparent"
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('landing.heroSecondary') || 'See it in action'}
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {['bg-amber-400', 'bg-rose-400', 'bg-emerald-400', 'bg-blue-400'].map((c, i) => (
                  <div key={i} className={cn('w-7 h-7 rounded-full border-2 border-zinc-900', c)} />
                ))}
              </div>
              <span>
                {t('landing.socialProof') || 'Used by 5+ independent hostels in Europe, the Americas & SE Asia'}
              </span>
            </div>
          </motion.div>

          {/* Right: product mockup card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="hidden lg:block"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </section>

      {/* ================== 2. THE REALITY CHECK ================== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
              {t('landing.realityEyebrow') || 'The Reality Check'}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">
              {t('landing.realityTitle') || 'Running a small hostel shouldn\u2019t run you'}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {painPoints.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="h-full border-zinc-100 shadow-none hover:shadow-sm transition-shadow bg-white">
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <div
                      className={cn(
                        'inline-flex items-center justify-center text-2xl font-bold px-3 py-1.5 rounded-lg',
                        p.color === 'red' && 'bg-red-50 text-red-600',
                        p.color === 'amber' && 'bg-amber-50 text-amber-600',
                        p.color === 'purple' && 'bg-purple-50 text-purple-600',
                        p.color === 'blue' && 'bg-blue-50 text-blue-600',
                      )}
                    >
                      {p.stat}
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900">{p.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 text-center text-base text-muted-foreground italic max-w-2xl mx-auto"
          >
            &ldquo;{t('landing.realityQuote') || 'I was running a hostel, not running a spreadsheet'}&rdquo;
            <span className="block text-xs not-italic text-muted-foreground mt-2">
              {t('landing.realityQuoteSource') || '\u2014 from 12 hostel owner interviews'}
            </span>
          </motion.p>
        </div>
      </section>

      {/* ================== 3. THE BUNKDESK WAY (BEFORE / AFTER) ================== */}
      <section className="py-20 md:py-28 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
              {t('landing.wayEyebrow') || 'The BunkDesk Way'}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">
              {t('landing.wayTitle') || 'Your day, with BunkDesk'}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* BEFORE */}
            <Card className="border-zinc-200 shadow-none bg-white">
              <CardContent className="p-5 sm:p-7 space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t('landing.beforeTitle') || 'Without BunkDesk'}
                  </h3>
                  <span className="text-2xl font-bold text-red-500 font-mono">
                    6+<span className="text-sm text-muted-foreground font-sans font-normal"> {t('landing.hoursPerDay') || 'hours/day'}</span>
                  </span>
                </div>
                <ul className="space-y-2.5 text-sm text-zinc-600">
                  {beforeItems.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* AFTER */}
            <Card className="border-blue-200 shadow-md shadow-blue-600/5 bg-gradient-to-br from-blue-50/50 to-white">
              <CardContent className="p-5 sm:p-7 space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t('landing.afterTitle') || 'With BunkDesk'}
                  </h3>
                  <span className="text-2xl font-bold text-emerald-600 font-mono">
                    30<span className="text-sm text-muted-foreground font-sans font-normal"> {t('landing.minutesPerDay') || 'min/day'}</span>
                  </span>
                </div>
                <ul className="space-y-2.5 text-sm text-zinc-700">
                  {afterItems.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================== 4. FEATURES ================== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
              {t('landing.featEyebrow') || 'Features'}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">
              {t('landing.featTitle') || 'Everything a small hostel needs, nothing it doesn\u2019t'}
            </h2>
          </motion.div>

          {/* 4 main features */}
          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {mainFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="h-full border-zinc-100 shadow-none hover:shadow-md transition-shadow bg-white">
                    <CardContent className="p-6 space-y-3 flex gap-4">
                      <div
                        className={cn(
                          'shrink-0 h-11 w-11 rounded-xl flex items-center justify-center',
                          f.color === 'blue' && 'bg-blue-50 text-blue-600',
                          f.color === 'emerald' && 'bg-emerald-50 text-emerald-600',
                          f.color === 'pink' && 'bg-pink-50 text-pink-600',
                          f.color === 'amber' && 'bg-amber-50 text-amber-600',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900">{f.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* 8 more features as a chip grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-zinc-100">
            {moreFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================== 5. THE BED-LEVEL GAP ================== */}
      <section className="py-20 md:py-28 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
              {t('landing.bedGapEyebrow') || 'The Bed-Level Gap'}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">
              {t('landing.bedGapTitle') || 'Hotel software doesn’t get hostels'}
            </h2>
            <p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto">
              {t('landing.bedGapSubtitle') ||
                'Traditional PMS thinks in rooms. Hostels operate on beds. That mismatch shows up as lost revenue every week.'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Traditional PMS */}
            <Card className="border-zinc-200 shadow-none bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t('landing.bedGapOther') || 'Traditional PMS'}
                  </h3>
                  <span className="text-xs font-mono uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    {t('landing.bedGapOtherTag') || 'Whole-room inventory'}
                  </span>
                </div>
                <BedGridOccupied layout="full" />
                <p className="text-xs text-muted-foreground text-center pt-2">
                  {t('landing.bedGapOtherCaption') || 'Whole 6-bed dorm: ‘full’. But 1 bed was free the whole time.'}
                </p>
              </CardContent>
            </Card>

            {/* BunkDesk */}
            <Card className="border-blue-200 shadow-md shadow-blue-600/5 bg-gradient-to-br from-blue-50/30 to-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    BunkDesk
                  </h3>
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {t('landing.bedGapOurTag') || 'Bed-level inventory'}
                  </span>
                </div>
                <BedGridOccupied layout="split" />
                <p className="text-xs text-zinc-700 text-center pt-2 font-medium">
                  {t('landing.bedGapOurCaption') || 'Bed #4 — sell direct, save the 18% commission.'}
                </p>
              </CardContent>
            </Card>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 text-center text-sm text-muted-foreground italic max-w-2xl mx-auto"
          >
            &ldquo;{t('landing.bedGapQuote') || 'Hotel PMS thinks in rooms. Hostels think in beds.'}&rdquo;
          </motion.p>
        </div>
      </section>

      {/* ================== 6. HOW BUNKDESK WORKS (replaces old AI section) ================== */}
      <section id="how" className="py-20 md:py-28 bg-zinc-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase">
              {t('landing.howEyebrow') || 'How BunkDesk works'}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              {t('landing.howTitle') || 'From walk-in to checkout, in one screen'}
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              {t('landing.howSubtitle') ||
                'No API integrations. No AI hype. Just the exact tools a small hostel needs to run a shift.'}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {howSteps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="h-full border-zinc-800 bg-zinc-900/60 shadow-none hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4 sm:p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold font-mono bg-gradient-to-br from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                          {s.num}
                        </span>
                        <div className="h-8 w-8 rounded-lg bg-blue-600/15 text-blue-400 flex items-center justify-center">
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100">{s.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================== 7. PRICING ================== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
              {t('landing.pricingEyebrow') || 'Simple Pricing'}
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">
              {t('landing.pricingTitle') || 'One price. Everything included.'}
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              {t('landing.pricingSubtitle') || '14-day free trial, no credit card. Cancel anytime.'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Trial */}
            <Card className="border-zinc-200 shadow-none bg-white">
              <CardContent className="p-7 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('landing.pricingFreeName') || 'Trial'}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-zinc-900">$0</span>
                    <span className="text-sm text-muted-foreground">{t('landing.perMonth') || '/month'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('landing.pricingFreeDesc') || 'Try everything free for 14 days.'}
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-zinc-600">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{t(`landing.pricingFree${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onEnterApp}
                >
                  {t('landing.pricingFreeCta') || 'Start trial'}
                </Button>
              </CardContent>
            </Card>

            {/* Standard (highlighted, $19) */}
            <Card className="border-blue-600 shadow-xl shadow-blue-600/10 bg-gradient-to-br from-blue-50/30 to-white relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {t('landing.pricingProBadge') || 'Most popular'}
              </span>
              <CardContent className="p-5 sm:p-7 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    {t('landing.pricingProName') || 'Standard'}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-zinc-900">$19</span>
                    <span className="text-sm text-muted-foreground">{t('landing.perMonth') || '/month'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('landing.pricingProDesc') || 'For hostels ready to grow. $19/month, billed monthly.'}
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-zinc-600">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{t(`landing.pricingPro${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                  onClick={onEnterApp}
                >
                  {t('landing.pricingProCta') || 'Get started'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================== FINAL CTA ================== */}
      <section className="py-20 md:py-24 bg-gradient-to-br from-zinc-950 via-zinc-900 to-blue-950 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t('landing.ctaTitle') || 'Run your hostel, not your spreadsheet'}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              {t('landing.ctaSubtitle') || '14-day free trial. No credit card. Set up in an afternoon.'}
            </p>
            <Button
              size="lg"
              onClick={onEnterApp}
              className="mt-8 gap-2 h-12 px-8 text-base bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
            >
              {t('landing.ctaButton') || 'Start free trial'}
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> {t('landing.footerFree') || '14-day free trial'}
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> {t('landing.footerNoCredit') || 'No credit card'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {language === 'zh' ? '一个下午开通' : 'Set up in an afternoon'}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================== FOOTER ================== */}
      <footer className="border-t border-zinc-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <span className="text-sm text-muted-foreground">{t('landing.footerTagline') || 'BunkDesk · Bed-level hostel management'}</span>
          </div>
          <span className="text-xs text-muted-foreground">© 2026 BunkDesk</span>
        </div>
      </footer>
    </div>
  );
}

// ---------- sub-components ----------

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          <div className="ml-3 text-xs text-muted-foreground font-mono">bunkdesk.app</div>
        </div>
        {/* Mockup content */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Check-ins', val: '8', color: 'blue' },
              { label: 'Check-outs', val: '3', color: 'orange' },
              { label: 'Empty beds', val: '5', color: 'emerald' },
              { label: 'To clean', val: '4', color: 'purple' },
            ].map((c) => (
              <div key={c.label} className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-xl font-bold text-white mt-0.5">{c.val}</div>
              </div>
            ))}
          </div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-400" />
              7-day occupancy forecast
            </div>
            <div className="mt-2 flex items-end gap-1 h-10">
              {[40, 60, 28, 55, 75, 92, 65].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="text-xs text-amber-300 font-medium">Heads up</div>
            <div className="text-xs text-muted-foreground/70 mt-0.5">Wed occupancy at 28% \u2014 consider a last-minute promo</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BedGridOccupied({ layout }: { layout: 'full' | 'split' }) {
  if (layout === 'full') {
    // 6 beds all "occupied" as one room — 5 colored, 1 dimmed
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {[
          'bg-rose-500',
          'bg-rose-500',
          'bg-rose-500',
          'bg-rose-500',
          'bg-rose-500',
          'bg-rose-300/40',
        ].map((c, i) => (
          <div key={i} className={cn('aspect-square rounded text-white text-xs flex items-center justify-center font-mono', c)}>
            {i + 1}
          </div>
        ))}
      </div>
    );
  }
  // split: 5 occupied, 1 free (highlighted)
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[
        'bg-rose-500',
        'bg-rose-500',
        'bg-rose-500',
        'bg-emerald-500',
        'bg-rose-500',
        'bg-rose-500',
      ].map((c, i) => (
        <div
          key={i}
          className={cn(
            'aspect-square rounded text-white text-xs flex items-center justify-center font-mono',
            c === 'bg-emerald-500' && 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-blue-50/30 animate-pulse',
            c,
          )}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
