import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '../i18nContext';
import { Button } from '@/components/ui/button';
import {
  BedDouble, ArrowRight, Globe, Shield, Zap, ChevronRight, Languages, X, Check,
  Globe2, Gift, ArrowRightLeft, Users
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const { t, language, setLanguage } = useTranslation();

  const painPoints = [
    { title: t('landing.pain1Title'), desc: t('landing.pain1Desc'), color: 'text-red-500 bg-red-50' },
    { title: t('landing.pain2Title'), desc: t('landing.pain2Desc'), color: 'text-amber-500 bg-amber-50' },
    { title: t('landing.pain3Title'), desc: t('landing.pain3Desc'), color: 'text-purple-500 bg-purple-50' },
    { title: t('landing.pain4Title'), desc: t('landing.pain4Desc'), color: 'text-blue-500 bg-blue-50' },
  ];

  const beforeItems = [1,2,3,4].map(i => t(`landing.before${i}`));
  const afterItems = [1,2,3,4].map(i => t(`landing.after${i}`));

  const showcaseItems = [
    { icon: BedDouble, title: t('landing.showcase1Title'), desc: t('landing.showcase1Desc'), color: 'text-emerald-500 bg-emerald-50' },
    { icon: Globe2, title: t('landing.showcase2Title'), desc: t('landing.showcase2Desc'), color: 'text-blue-500 bg-blue-50' },
    { icon: Gift, title: t('landing.showcase3Title'), desc: t('landing.showcase3Desc'), color: 'text-pink-500 bg-pink-50' },
    { icon: ArrowRightLeft, title: t('landing.showcase4Title'), desc: t('landing.showcase4Desc'), color: 'text-amber-500 bg-amber-50' },
  ];

  const diffItems = [
    { icon: Globe, text: t('landing.diff1'), color: 'text-blue-500 bg-blue-50' },
    { icon: Zap, text: t('landing.diff2'), color: 'text-emerald-500 bg-emerald-50' },
    { icon: BedDouble, text: t('landing.diff3'), color: 'text-amber-500 bg-amber-50' },
    { icon: Users, text: t('landing.diff4'), color: 'text-purple-500 bg-purple-50' },
  ];

  const compareRows = [
    'Price', 'Commission', 'Beds', 'Guidance', 'Page', 'Referral', 'Migration', 'Setup',
  ] as const;

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden">
      {/* Language Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
          className="gap-2 text-xs h-8 bg-white/80 backdrop-blur-sm shadow-sm"
        >
          <Languages className="w-3.5 h-3.5" />
          {language === 'en' ? '中文' : 'English'}
        </Button>
      </div>

      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BD</span>
          </div>
          <span className="font-semibold text-lg text-white">BunkDesk</span>
        </div>
        <Button onClick={onEnterApp} className="gap-2 text-sm h-9 bg-emerald-500 hover:bg-emerald-600 text-white">
          {t('landing.heroCta')} <ArrowRight className="w-4 h-4" />
        </Button>
      </nav>

      {/* Hero — Dark Background */}
      <section className="bg-zinc-950 pt-8 pb-24 md:pt-12 md:pb-32 -mt-20 pt-20 relative">
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 border border-emerald-500/30 text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5" />
              {t('landing.heroBadge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-white">
              {t('landing.heroTitle1')}
              <br />
              <span className="text-emerald-400">{t('landing.heroTitle2')}</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl">
              {t('landing.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={onEnterApp} className="gap-2 h-12 px-8 text-base bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                {t('landing.heroCta')} <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}>
                <ChevronRight className="w-4 h-4" />
                {t('landing.heroSecondary')}
              </Button>
            </div>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 flex items-center gap-4"
          >
            <div className="flex -space-x-2">
              {['RK','PS','AM','VD','NS'].map((initials, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-zinc-700 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                  {initials}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm text-white font-medium">{t('landing.socialProof')}</p>
              <p className="text-xs text-zinc-500">{t('landing.socialLocations')}</p>
            </div>
          </motion.div>

          {/* App Screenshot Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 relative"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl shadow-black/50">
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-zinc-500 font-medium">BunkDesk — Today's Operations</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-6 gap-3">
                    {['75%', '2', '1', '3'].map((v, i) => (
                      <div key={i} className="bg-zinc-900 rounded-lg p-3">
                        <div className="text-xl font-bold text-white">{v}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">{['Occupancy', 'Arrivals', 'Departing', 'Cleaning'][i]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
                      <div className="text-xs font-semibold text-zinc-400">Pending Arrivals</div>
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-lg p-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-700" />
                          <div className="flex-1">
                            <div className="h-2.5 bg-zinc-700 rounded w-20" />
                            <div className="h-2 bg-zinc-800 rounded w-14 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
                      <div className="text-xs font-semibold text-zinc-400">Departing Today</div>
                      {[1].map(i => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-lg p-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-700" />
                          <div className="flex-1">
                            <div className="h-2.5 bg-zinc-700 rounded w-16" />
                            <div className="h-2 bg-zinc-800 rounded w-12 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pain Points — 4 cards with title + description */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.painTitle')}</h2>
            <p className="mt-4 text-zinc-500 text-lg">{t('landing.painSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {painPoints.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="bg-zinc-50 rounded-xl p-6 border border-zinc-200"
              >
                <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center mb-3`}>
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-zinc-900 mb-2">{p.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-lg text-zinc-400 italic">"{t('landing.painQuote')}"</p>
            <p className="text-sm text-zinc-400 mt-2">{t('landing.painQuoteAttr')}</p>
          </motion.div>
        </div>
      </section>

      {/* Before / After */}
      <section className="bg-zinc-50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-red-100 p-8"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-6">{t('landing.beforeTitle')}</h3>
              <ul className="space-y-4">
                {beforeItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-600">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-red-100">
                <p className="text-sm font-medium text-red-500">{t('landing.beforeTime')}</p>
              </div>
            </motion.div>
            {/* After */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-emerald-100 p-8"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-6">{t('landing.afterTitle')}</h3>
              <ul className="space-y-4">
                {afterItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-600">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-emerald-100">
                <p className="text-sm font-medium text-emerald-600">{t('landing.afterTime')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="showcase" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.showcaseTitle')}</h2>
            <p className="mt-4 text-zinc-500 text-lg">{t('landing.showcaseSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showcaseItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="bg-zinc-50 rounded-xl p-6 border border-zinc-200"
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiation Narrative — OTA positioning */}
      <section className="py-20 md:py-28 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.diffTitle')}</h2>
            <p className="mt-4 text-zinc-500 text-lg">{t('landing.diffSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {diffItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="bg-white rounded-xl p-5 border border-zinc-200 flex items-start gap-4"
              >
                <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table — 3 columns: Cloudbeds, BananaDesk, BunkDesk */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.compareTitle')}</h2>
            <p className="mt-4 text-zinc-500 text-lg">{t('landing.compareSubtitle')}</p>
          </motion.div>
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-0">
              <div className="p-4 bg-zinc-50 border-b border-zinc-200" />
              <div className="p-4 bg-zinc-50 text-zinc-500 text-center font-semibold border-b border-zinc-200 text-sm">{t('landing.compareColCloudbeds')}</div>
              <div className="p-4 bg-zinc-50 text-zinc-500 text-center font-semibold border-b border-zinc-200 text-sm">{t('landing.compareColBananaDesk')}</div>
              <div className="p-4 bg-zinc-900 text-white text-center font-semibold border-b border-zinc-700 text-sm">{t('landing.compareColBunkDesk')}</div>
              {compareRows.map((row, i) => {
                const rowKey = row as string;
                const label = t(`landing.compareRow${rowKey}`);
                const cloudbeds = t(`landing.compareRow${rowKey}Cloudbeds`);
                const bananaDesk = t(`landing.compareRow${rowKey}BananaDesk`);
                const bunkDesk = t(`landing.compareRow${rowKey}BunkDesk`);
                const isBunkDeskHighlight = bunkDesk === 'Free' || bunkDesk === '0%' || bunkDesk === '✅' || bunkDesk === '30 min';
                return (
                  <React.Fragment key={i}>
                    <div className="p-3 text-sm text-zinc-600 border-b border-zinc-100 flex items-center">{label}</div>
                    <div className="p-3 text-center text-sm border-b border-zinc-100 text-zinc-500">{cloudbeds}</div>
                    <div className="p-3 text-center text-sm border-b border-zinc-100 text-zinc-500">{bananaDesk}</div>
                    <div className={`p-3 text-center text-sm font-medium border-b border-zinc-100 ${isBunkDeskHighlight ? 'text-emerald-600 bg-emerald-50/50' : 'text-zinc-700'}`}>{bunkDesk}</div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-28 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.pricingTitle')}</h2>
            <p className="mt-4 text-zinc-500 text-lg">{t('landing.pricingSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-8">
              <h3 className="text-lg font-bold text-zinc-900">{t('landing.pricingFree')}</h3>
              <p className="text-sm text-zinc-400 mt-1">{t('landing.pricingFreeDesc')}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-900">{t('landing.pricingFreePrice')}</span>
                <span className="text-zinc-400">{t('landing.pricingFreePeriod')}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {[1,2,3,4,5].map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {t(`landing.pricingFree${i}`)}
                  </li>
                ))}
              </ul>
              <Button onClick={onEnterApp} variant="outline" className="w-full mt-6 h-10">
                {t('landing.pricingFreeCta')}
              </Button>
            </div>
            {/* Pro */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t('landing.pricingProBadge')}
              </div>
              <h3 className="text-lg font-bold text-zinc-900">{t('landing.pricingPro')}</h3>
              <p className="text-sm text-zinc-400 mt-1">{t('landing.pricingProDesc')}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-900">{t('landing.pricingProPrice')}</span>
                <span className="text-zinc-400">{t('landing.pricingProPeriod')}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {[1,2,3,4,5].map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {t(`landing.pricingPro${i}`)}
                  </li>
                ))}
              </ul>
              <Button onClick={onEnterApp} className="w-full mt-6 h-10 bg-emerald-500 hover:bg-emerald-600 text-white">
                {t('landing.pricingProCta')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">{t('landing.ctaTitle')}</h2>
            <p className="mt-4 text-zinc-400 text-lg max-w-xl mx-auto">{t('landing.ctaSubtitle')}</p>
            <Button
              size="lg"
              onClick={onEnterApp}
              className="mt-8 gap-2 h-12 px-8 text-base bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              {t('landing.ctaButton')} <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {t('landing.footerFree')}</span>
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {t('landing.footerNoCredit')}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">BD</span>
            </div>
            <span className="text-sm text-zinc-500">{t('landing.footerTagline')}</span>
          </div>
          <span className="text-xs text-zinc-400">© 2026 BunkDesk</span>
        </div>
      </footer>
    </div>
  );
}
