/**
 * LandingPage — public marketing site for BunkDesk.
 *
 * Sections (matching bunkdesk-redesign/pages/landing.html):
 *   1. Sticky nav        — logo + nav links + 免费试用 CTA
 *   2. Hero              — photo-first, gradient overlay, dual CTA
 *   3. Pain points       — 3 emotional stats
 *   4. Bed board mockup  — CSS mini bed board + feature rows
 *   5. Direct booking    — scene-beds + feature rows
 *   6. Team collaboration— scene-common + feature rows
 *   7. Revenue           — scene-owner + feature rows
 *   8. CTA               — scene-exterior bg + trust badges
 *   9. Pricing           — Trial $0 + Standard $19
 *  10. Footer
 */

import React from 'react';
import { useTranslation } from '../i18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, Play, LayoutGrid, MousePointerClick, Palette, Zap,
  Globe, Link as LinkIcon, CalendarCheck, CreditCard,
  Users, FileText, Shield, MessageCircle,
  BarChart3, TrendingUp, Clock, SprayCan, Move, Check, Headphones, Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const { t, language, setLanguage } = useTranslation();

  // Pain points (3 emotional stats — reuse existing i18n keys)
  const painPoints = [
    { stat: '67%', title: t('landing.pain1Title'), desc: t('landing.pain1Desc'), color: 'destructive' },
    { stat: '20 min', title: t('landing.pain2Title'), desc: t('landing.pain2Desc'), color: 'amber' },
    { stat: '$24k', title: t('landing.pain3Title'), desc: t('landing.pain3Desc'), color: 'blue' },
  ] as const;

  return (
    <div className="min-h-screen bg-card text-foreground overflow-x-hidden">
      {/* ================== STICKY NAV ================== */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-card/90 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-sm shadow-primary/20">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-base font-bold text-foreground">BunkDesk</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">功能</a>
            <a href="#pricing" className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">定价</a>
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle language"
            >
              <Languages className="h-3.5 w-3.5" />
              {language === 'zh' ? 'EN' : '中'}
            </button>
            <Button
              onClick={onEnterApp}
              className="h-9 px-4 text-sm shadow-sm"
            >
              免费试用
            </Button>
          </div>
        </div>
      </nav>

      {/* ================== HERO (photo-first, text overlay) ================== */}
      <section className="relative min-h-[85vh] flex items-end">
        <img src="/assets/hero-hostel.jpg" className="absolute inset-0 w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="relative max-w-6xl mx-auto px-6 pb-16 md:pb-24 pt-32">
          <p className="text-chart-4 text-sm font-medium tracking-wide">专为青旅打造的管理工具</p>
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] max-w-3xl">
            告别表格<br />
            <span className="text-chart-4">看清每一张床位</span>
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-xl leading-relaxed">
            可视化床位看板、一键入住、直销预订链接。专为 50 张床位以下的小型青旅设计，每月 $19。
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onEnterApp}
              size="lg"
              className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90"
            >
              14 天免费试用 <ArrowRight className="h-4 w-4" />
            </Button>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-white/10 backdrop-blur text-white text-base font-medium border border-white/20 hover:bg-white/20 transition-all"
            >
              <Play className="h-4 w-4" /> 看看怎么用
            </a>
          </div>
          {/* Trust line */}
          <div className="mt-10 flex items-center gap-6 text-white/50 text-sm">
            <span>已有 5+ 青旅在使用</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>支持 Booking.com / Airbnb / Walk-in</span>
          </div>
        </div>
      </section>

      {/* ================== PAIN POINT SECTION ================== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-muted-foreground mb-12">经营青旅的现实</p>
          <div className="grid md:grid-cols-3 gap-8">
            {painPoints.map((p, i) => (
              <div key={i} className="text-center">
                <div
                  className={cn(
                    'text-5xl font-extrabold',
                    p.color === 'destructive' && 'text-destructive',
                    p.color === 'amber' && 'text-chart-3',
                    p.color === 'blue' && 'text-chart-1',
                  )}
                >
                  {p.stat}
                </div>
                <p className="mt-3 text-base font-semibold text-foreground">{p.title}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================== CSS PRODUCT MOCKUP SECTION ================== */}
      <section id="features" className="py-16 md:py-20 bg-card">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: CSS Mini Bed Board */}
            <div className="relative">
              <BedBoardMockup />
              {/* Annotation callout */}
              <div className="absolute -bottom-3 right-6 bg-white rounded-lg shadow-lg border border-border px-3 py-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Move className="h-3 w-3 text-primary" />
                </div>
                <span className="text-xs text-foreground font-medium">拖拽即可换床</span>
              </div>
            </div>
            {/* Right: Feature description */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-xs font-medium text-primary mb-4">
                <LayoutGrid className="h-3.5 w-3.5" /> 核心功能
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
                可视化床位看板<br />
                <span className="text-muted-foreground">一眼看清每张床</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                不再翻表格。甘特图式时间线，每张床位、每个房间、每天状态一目了然。拖拽换床、边缘调整日期，就像操作日历一样简单。
              </p>
              <div className="mt-6 space-y-3">
                <FeatureRow
                  icon={MousePointerClick}
                  iconClass="bg-chart-1/10 text-chart-1"
                  title="拖拽入住 / 换床"
                  desc="拖动客人色块到目标床位，自动检测冲突"
                />
                <FeatureRow
                  icon={Palette}
                  iconClass="bg-chart-3/10 text-chart-3"
                  title="颜色 = 状态"
                  desc="蓝色已付、琥珀待付、绿色已预订、红色冲突"
                />
                <FeatureRow
                  icon={Zap}
                  iconClass="bg-chart-5/10 text-chart-5"
                  title="智能推荐床位"
                  desc="根据性别、偏好、价格自动匹配最佳床位"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================== DIRECT BOOKING ================== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: Photo */}
            <div className="relative rounded-2xl overflow-hidden">
              <img src="/assets/scene-beds.jpg" alt="Clean dorm room with bunk beds" className="w-full h-[320px] md:h-[420px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
            {/* Right: Direct booking text */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-chart-5/10 text-xs font-medium text-chart-5 mb-4">
                <Globe className="h-3.5 w-3.5" /> 直销预订
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
                你的专属预订页<br />
                <span className="text-muted-foreground">0% 佣金</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                OTA 每单抽 15-20%。我们给你一个链接，客人直接预订、直接付款、自动出现在床位看板上。省下来的钱够付 BunkDesk 一整年。
              </p>
              <div className="mt-6 space-y-3">
                <FeatureRow
                  icon={LinkIcon}
                  iconClass="bg-chart-5/10 text-chart-5"
                  title="一键生成预订链接"
                  desc="分享到微信、Instagram、网站，客人扫码即可预订"
                />
                <FeatureRow
                  icon={CalendarCheck}
                  iconClass="bg-chart-5/10 text-chart-5"
                  title="自动同步到床位看板"
                  desc="客人订完立刻显示，不用手动录入"
                />
                <FeatureRow
                  icon={CreditCard}
                  iconClass="bg-chart-5/10 text-chart-5"
                  title="在线收款"
                  desc={'支持 Stripe / 支付宝，到账自动标记"已付"'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================== TEAM COLLABORATION ================== */}
      <section className="py-16 md:py-20 bg-card">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: Text (comes first on mobile via order) */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-chart-3/10 text-xs font-medium text-chart-3 mb-4">
                <Users className="h-3.5 w-3.5" /> 团队协作
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
                交接班不再<br />
                <span className="text-muted-foreground">靠微信消息</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                前台换班时最怕信息断层。BunkDesk 内置交接日志：谁入住、谁退房、谁还没付款、有什么特殊需求。下一个同事打开就能看到全部。
              </p>
              <div className="mt-6 space-y-3">
                <FeatureRow
                  icon={FileText}
                  iconClass="bg-chart-3/10 text-chart-3"
                  title="交接日志"
                  desc="入住、退房、维修、投诉——分类记录，不会遗漏"
                />
                <FeatureRow
                  icon={Shield}
                  iconClass="bg-chart-3/10 text-chart-3"
                  title="权限分级"
                  desc="老板看全部、前台操作入住、保洁员看清洁任务"
                />
                <FeatureRow
                  icon={MessageCircle}
                  iconClass="bg-chart-3/10 text-chart-3"
                  title="客人备注 & 便签"
                  desc="谁怕冷需要下铺、谁晚到——随手记，全员可见"
                />
              </div>
            </div>
            {/* Right: Photo */}
            <div className="order-1 lg:order-2 relative rounded-2xl overflow-hidden">
              <img src="/assets/scene-common.jpg" alt="Cozy hostel common area" className="w-full h-[320px] md:h-[420px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ================== REVENUE ================== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: Photo */}
            <div className="relative rounded-2xl overflow-hidden">
              <img src="/assets/scene-owner.jpg" alt="Hostel owner working in back office" className="w-full h-[280px] md:h-[380px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
            {/* Right: Revenue text */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-chart-1/10 text-xs font-medium text-chart-1 mb-4">
                <BarChart3 className="h-3.5 w-3.5" /> 数据驱动
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
                知道每张床<br />
                <span className="text-muted-foreground">赚了多少</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                不只看入住率。BunkDesk 帮你追踪每张床的真实收入、空床损失、清洁成本。周末该涨价吗？哪间房卖得最好？数据告诉你答案。
              </p>
              <div className="mt-6 space-y-3">
                <FeatureRow
                  icon={TrendingUp}
                  iconClass="bg-chart-1/10 text-chart-1"
                  title="床位收入分析"
                  desc="上铺 vs 下铺、不同价位段的入住对比"
                />
                <FeatureRow
                  icon={Clock}
                  iconClass="bg-chart-1/10 text-chart-1"
                  title="空床损失追踪"
                  desc={'按"房间"管理永远发现不了的隐性损失'}
                />
                <FeatureRow
                  icon={SprayCan}
                  iconClass="bg-chart-1/10 text-chart-1"
                  title="清洁状态追踪"
                  desc="退房自动生成清洁任务，保洁完成后自动标记"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================== EXTERIOR PHOTO + CTA ================== */}
      <section id="cta" className="relative py-24 md:py-32">
        <img src="/assets/scene-exterior.jpg" className="absolute inset-0 w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            14 天免费试用<br className="sm:hidden" /> 无需信用卡
          </h2>
          <p className="mt-4 text-lg text-white/70">一整个下午就能搭好</p>
          <Button
            onClick={onEnterApp}
            size="lg"
            className="mt-8 h-12 px-8 text-base gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90"
          >
            免费试用 <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> 无需信用卡
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 下午搭好，晚上使用
            </span>
            <span className="flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" /> 中文客服支持
            </span>
          </div>
        </div>
      </section>

      {/* ================== PRICING ================== */}
      <section id="pricing" className="py-16 md:py-20 bg-card">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">{t('landing.pricingEyebrow') || 'Pricing'}</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-foreground">{t('landing.pricingTitle') || 'One price, everything'}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{t('landing.pricingSubtitle') || '14-day free trial, no credit card. Cancel anytime.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Trial */}
            <Card className="ring-0 border border-border bg-card shadow-none rounded-xl py-0">
              <CardContent className="p-7 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('landing.pricingFreeName') || 'Trial'}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">$0</span>
                    <span className="text-sm text-muted-foreground">{t('landing.perMonth') || '/month'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t('landing.pricingFreeDesc') || '14-day full-feature trial.'}</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 text-chart-5 shrink-0 mt-0.5" />
                      <span>{t(`landing.pricingFree${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={onEnterApp}
                >
                  {t('landing.pricingFreeCta') || 'Start trial'}
                </Button>
              </CardContent>
            </Card>

            {/* Standard (highlighted, $19) */}
            <Card className="ring-0 border border-primary shadow-xl shadow-primary/10 bg-gradient-to-br from-primary/5 to-card relative rounded-xl py-0">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {t('landing.pricingProBadge') || 'Most popular'}
              </span>
              <CardContent className="p-5 sm:p-7 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">{t('landing.pricingProName') || 'Standard'}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">$19</span>
                    <span className="text-sm text-muted-foreground">{t('landing.perMonth') || '/month'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t('landing.pricingProDesc') || 'For growing hostels. $19/month.'}</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 text-chart-5 shrink-0 mt-0.5" />
                      <span>{t(`landing.pricingPro${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-10 hover:bg-primary/90"
                  onClick={onEnterApp}
                >
                  {t('landing.pricingProCta') || 'Get started'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================== FOOTER ================== */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <span className="text-sm text-muted-foreground">{t('landing.footerTagline') || 'BunkDesk'}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">功能</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">定价</a>
            <span>&copy; 2026 BunkDesk</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------- sub-components ----------

function FeatureRow({
  icon: Icon,
  iconClass,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn('mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0', iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function BedBoardMockup() {
  return (
    <div className="rounded-2xl bg-white shadow-xl shadow-black/5 border border-border/50 overflow-hidden">
      {/* Mini toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-2" />
          <div className="w-3 h-3 rounded-full bg-chart-3" />
          <div className="w-3 h-3 rounded-full bg-chart-5" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">BunkDesk — 床位看板</span>
        <div className="w-12" />
      </div>
      {/* Date header */}
      <div className="flex border-b border-border">
        <div className="w-20 shrink-0 px-2 py-1.5 text-[9px] font-semibold text-muted-foreground border-r border-border">床位</div>
        <div className="flex-1 grid grid-cols-7">
          <div className="px-1 py-1.5 text-[8px] text-center text-muted-foreground border-r border-border">周一<br /><span className="font-bold">23</span></div>
          <div className="px-1 py-1.5 text-[8px] text-center text-muted-foreground border-r border-border">周二<br /><span className="font-bold">24</span></div>
          <div className="px-1 py-1.5 text-[8px] text-center font-bold text-primary bg-primary/5 border-r border-border">今天<br /><span className="text-primary">25</span></div>
          <div className="px-1 py-1.5 text-[8px] text-center text-muted-foreground border-r border-border">周四<br /><span className="font-bold">26</span></div>
          <div className="px-1 py-1.5 text-[8px] text-center text-muted-foreground border-r border-border">周五<br /><span className="font-bold">27</span></div>
          <div className="px-1 py-1.5 text-[8px] text-center text-muted-foreground/50 bg-muted/30 border-r border-border">周六<br /><span className="font-bold">28</span></div>
          <div className="px-1 py-1.5 text-[8px] text-center text-muted-foreground/50 bg-muted/30">周日<br /><span className="font-bold">29</span></div>
        </div>
      </div>
      {/* Room 101 header */}
      <div className="flex border-b border-border bg-muted/30">
        <div className="w-20 shrink-0 px-2 py-1 text-[9px] font-bold text-foreground border-r border-border">101 · 6人间</div>
        <div className="flex-1 grid grid-cols-7">
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">2</div>
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">1</div>
          <div className="text-[8px] text-center text-chart-2 border-r border-border py-1">0</div>
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">3</div>
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">2</div>
          <div className="text-[8px] text-center text-chart-3 border-r border-border py-1 bg-muted/30">1</div>
          <div className="text-[8px] text-center text-chart-3 py-1 bg-muted/30">1</div>
        </div>
      </div>
      {/* Bed A row */}
      <div className="flex border-b border-border">
        <div className="w-20 shrink-0 px-2 py-1.5 text-[8px] text-muted-foreground border-r border-border">A · 上铺 · ¥60</div>
        <div className="flex-1 relative h-7">
          <div className="absolute top-0.5 left-[14.28%] right-[57.14%] h-[calc(100%-4px)] rounded bg-chart-1/15 border border-chart-1/30 flex items-center px-1.5">
            <span className="text-[7px] font-medium text-chart-1 truncate">张伟 CN · 3晚</span>
          </div>
        </div>
      </div>
      {/* Bed B row */}
      <div className="flex border-b border-border">
        <div className="w-20 shrink-0 px-2 py-1.5 text-[8px] text-muted-foreground border-r border-border">B · 下铺 · ¥70</div>
        <div className="flex-1 relative h-7">
          <div className="absolute top-0.5 left-[0%] right-[28.57%] h-[calc(100%-4px)] rounded bg-chart-3/20 border border-chart-3 flex items-center px-1.5">
            <span className="text-[7px] font-medium text-chart-3 truncate">Emma · 4晚</span>
          </div>
        </div>
      </div>
      {/* Bed C row */}
      <div className="flex border-b border-border">
        <div className="w-20 shrink-0 px-2 py-1.5 text-[8px] text-muted-foreground border-r border-border">C · 上铺 · ¥60</div>
        <div className="flex-1 relative h-7">
          <div className="absolute top-0.5 left-[42.85%] right-[0%] h-[calc(100%-4px)] rounded bg-chart-5/20 border border-dashed border-chart-5 flex items-center px-1.5">
            <span className="text-[7px] font-medium text-chart-5 truncate">李明 · 预订</span>
          </div>
        </div>
      </div>
      {/* Bed D row (empty) */}
      <div className="flex border-b border-border">
        <div className="w-20 shrink-0 px-2 py-1.5 text-[8px] text-muted-foreground border-r border-border">D · 下铺 · ¥70</div>
        <div className="flex-1 relative h-7 bg-muted/30">
          <div className="absolute inset-0.5 flex items-center justify-center">
            <span className="text-[7px] text-muted-foreground/50 border border-dashed border-border rounded px-1.5 py-0.5">+ 快速预订</span>
          </div>
        </div>
      </div>
      {/* Room 201 header */}
      <div className="flex border-b border-border bg-muted/30">
        <div className="w-20 shrink-0 px-2 py-1 text-[9px] font-bold text-foreground border-r border-border">201 · 8人间</div>
        <div className="flex-1 grid grid-cols-7">
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">5</div>
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">4</div>
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">3</div>
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">4</div>
          <div className="text-[8px] text-center text-chart-5 border-r border-border py-1">5</div>
          <div className="text-[8px] text-center text-chart-3 border-r border-border py-1 bg-muted/30">2</div>
          <div className="text-[8px] text-center text-chart-3 py-1 bg-muted/30">2</div>
        </div>
      </div>
      {/* Bed E row */}
      <div className="flex">
        <div className="w-20 shrink-0 px-2 py-1.5 text-[8px] text-muted-foreground border-r border-border">E · 上铺 · ¥55</div>
        <div className="flex-1 relative h-7">
          <div className="absolute top-0.5 left-[0%] right-[0%] h-[calc(100%-4px)] rounded bg-chart-1/15 border border-chart-1/30 flex items-center px-1.5">
            <span className="text-[7px] font-medium text-chart-1 truncate">Sarah K. · 全周</span>
          </div>
        </div>
      </div>
    </div>
  );
}
