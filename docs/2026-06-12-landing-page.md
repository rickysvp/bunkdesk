# HostelOps Landing Page 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个专业的 HostelOps 产品落地页，介绍青旅运营管理工具的核心功能，引导用户免费试用 demo。

**Architecture:** 在现有 React + Vite + Tailwind 项目中新增 LandingPage 组件，作为 App 的首屏。用户点击 CTA 后进入登录页。落地页为纯展示组件，不依赖 HostelContext/StaffContext，仅使用 I18nContext 支持中英双语。使用 motion/react 做滚动动画，lucide-react 做图标，复用项目已有的 Tailwind zinc 色系设计语言。

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, motion/react, lucide-react, date-fns

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/LandingPage.tsx` | 新建 | 落地页主组件，包含所有 section |
| `src/App.tsx` | 修改 | 添加 landing → login → app 三阶段路由 |
| `src/i18nContext.tsx` | 修改 | 添加 landing 相关 i18n key |

---

### Task 1: 添加 i18n key

**Files:**
- Modify: `src/i18nContext.tsx`

- [ ] **Step 1: 在 EN translations 中添加 landing section**

在 `en` 对象中添加 `landing` section：

```typescript
landing: {
  heroTitle: "Run Your Hostel, Not Chasing Paper",
  heroSubtitle: "The all-in-one operations hub for hostel managers and receptionists. Bed management, check-in, shift logs — everything in one place.",
  heroCta: "Try Free Demo",
  heroSecondary: "See How It Works",
  featureTitle: "Everything You Need to Run a Hostel",
  featureSubtitle: "Purpose-built for hostel operations, not hotel bureaucracy.",
  f1Title: "Visual Bed Board",
  f1Desc: "See every bed, every room, every status at a glance. Drag & drop to assign. Color-coded cleaning alerts.",
  f2Title: "Fast Check-In",
  f2Desc: "Walk-in or OTA booking — check in guests in under 60 seconds. Passport scan, payment, bed assignment, done.",
  f3Title: "Shift Handover",
  f3Desc: "Auto-logged check-ins, check-outs, and cleaning notes. Never lose information between shifts again.",
  f4Title: "Calendar & Reservations",
  f4Desc: "Timeline view of all bookings. iCal import from Airbnb, Booking.com, Expedia. Spot conflicts instantly.",
  f5Title: "Task Board",
  f5Desc: "Assign maintenance, pickups, and guest requests. Track progress in real-time. Nothing falls through the cracks.",
  f6Title: "Activity Management",
  f6Desc: "Organize hostel events, track sign-ups and check-ins. Turn guests into a community.",
  howTitle: "Get Started in Seconds",
  howSubtitle: "No credit card. No setup fee. No complicated onboarding.",
  step1Title: "Sign In",
  step1Desc: "Pick your name, enter your 4-digit PIN. That's it.",
  step2Title: "See Your Day",
  step2Desc: "Dashboard shows arrivals, departures, and urgent items at a glance.",
  step3Title: "Run Operations",
  step3Desc: "Check in guests, assign beds, log shift notes — all from one screen.",
  ctaTitle: "Ready to Simplify Your Hostel Operations?",
  ctaSubtitle: "Join hundreds of hostels already using HostelOps. Free forever for small operations.",
  ctaButton: "Start Using HostelOps — Free",
  footerTagline: "Lightweight operations hub for modern hostels.",
  footerFree: "Free forever",
  footerNoCredit: "No credit card required",
  footerSupport: "Community support",
},
```

- [ ] **Step 2: 在 ZH translations 中添加 landing section**

在 `zh` 对象中添加 `landing` section：

```typescript
landing: {
  heroTitle: "管好青旅，不再追着纸跑",
  heroSubtitle: "专为青旅经理和前台打造的一站式运营中心。床位管理、快速入住、交接班日志——一个平台全搞定。",
  heroCta: "免费试用",
  heroSecondary: "了解工作方式",
  featureTitle: "青旅运营所需的一切",
  featureSubtitle: "为青旅运营量身定制，而非酒店那套繁文缛节。",
  f1Title: "可视化床位看板",
  f1Desc: "一眼看清每张床、每个房间、每个状态。拖拽分配，颜色标记清洁提醒。",
  f2Title: "极速入住",
  f2Desc: "散客或 OTA 订单——60 秒内完成入住。护照扫描、收款、分配床位，一步到位。",
  f3Title: "交接班日志",
  f3Desc: "自动记录入住、退房和清洁事件。班次交接不再遗漏任何信息。",
  f4Title: "日历与预约",
  f4Desc: "时间线视图展示所有预订。支持 Airbnb、Booking.com、Expedia 的 iCal 导入，冲突一目了然。",
  f5Title: "任务看板",
  f5Desc: "分配维修、接送和客人需求，实时跟踪进度。事事有着落，件件有回音。",
  f6Title: "活动管理",
  f6Desc: "组织青旅活动，跟踪报名和签到。让客人成为社区。",
  howTitle: "几秒钟即可上手",
  howSubtitle: "无需信用卡。无安装费。无复杂流程。",
  step1Title: "登录",
  step1Desc: "选名字，输入 4 位 PIN 码，就这么简单。",
  step2Title: "查看今日",
  step2Desc: "仪表盘一目了然：预抵、预离、紧急事项。",
  step3Title: "高效运营",
  step3Desc: "办理入住、分配床位、记录交接——一屏搞定。",
  ctaTitle: "准备好简化你的青旅运营了吗？",
  ctaSubtitle: "已有数百家青旅在使用 HostelOps。小型青旅永久免费。",
  ctaButton: "开始使用 HostelOps — 免费",
  footerTagline: "现代青旅的轻量运营中心",
  footerFree: "永久免费",
  footerNoCredit: "无需信用卡",
  footerSupport: "社区支持",
},
```

- [ ] **Step 3: 运行 TypeScript 检查**

Run: `cd /Users/ricky/AICode/hostelite && npx tsc --noEmit`
Expected: 0 errors

---

### Task 2: 创建 LandingPage 组件

**Files:**
- Create: `src/components/LandingPage.tsx`

- [ ] **Step 1: 创建 LandingPage.tsx 完整组件**

```tsx
import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '../i18nContext';
import { Button } from '@/components/ui/button';
import {
  BedDouble, UserCheck, ClipboardList, Calendar, CheckSquare, Users,
  ArrowRight, Globe, Shield, Zap, ChevronRight, Languages
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const { t, language, setLanguage } = useTranslation();

  const features = [
    { icon: BedDouble, title: t('landing.f1Title'), desc: t('landing.f1Desc'), color: 'text-emerald-500 bg-emerald-50' },
    { icon: UserCheck, title: t('landing.f2Title'), desc: t('landing.f2Desc'), color: 'text-blue-500 bg-blue-50' },
    { icon: ClipboardList, title: t('landing.f3Title'), desc: t('landing.f3Desc'), color: 'text-amber-500 bg-amber-50' },
    { icon: Calendar, title: t('landing.f4Title'), desc: t('landing.f4Desc'), color: 'text-purple-500 bg-purple-50' },
    { icon: CheckSquare, title: t('landing.f5Title'), desc: t('landing.f5Desc'), color: 'text-orange-500 bg-orange-50' },
    { icon: Users, title: t('landing.f6Title'), desc: t('landing.f6Desc'), color: 'text-pink-500 bg-pink-50' },
  ];

  const steps = [
    { num: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { num: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { num: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ];

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
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">HO</span>
          </div>
          <span className="font-semibold text-lg text-zinc-900">HostelOps</span>
        </div>
        <Button onClick={onEnterApp} className="gap-2 text-sm h-9">
          {t('landing.heroCta')} <ArrowRight className="w-4 h-4" />
        </Button>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            {t('landing.footerFree')} · {t('landing.footerNoCredit')}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-zinc-900">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-500 leading-relaxed max-w-2xl">
            {t('landing.heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={onEnterApp} className="gap-2 h-12 px-8 text-base shadow-lg">
              {t('landing.heroCta')} <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base gap-2">
              <ChevronRight className="w-4 h-4" />
              {t('landing.heroSecondary')}
            </Button>
          </div>
        </motion.div>

        {/* Hero Image Placeholder — App Screenshot Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 relative"
        >
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-2 shadow-2xl shadow-zinc-200/50">
            <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
              {/* Mock App Header */}
              <div className="h-12 bg-zinc-50 border-b border-zinc-100 flex items-center px-4 gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                <span className="ml-3 text-xs text-zinc-400 font-medium">HostelOps — Today's Operations</span>
              </div>
              {/* Mock Dashboard Content */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-6 gap-3">
                  {['75%', '2', '1', '3', '4', '1'].map((v, i) => (
                    <div key={i} className="bg-zinc-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-zinc-900">{v}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">{['Occupancy', 'Arrivals', 'Departing', 'Cleaning', 'Tasks', 'Activities'][i]}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold text-zinc-500">Pending Arrivals</div>
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-zinc-100">
                        <div className="w-6 h-6 rounded-full bg-zinc-200" />
                        <div className="flex-1">
                          <div className="h-2.5 bg-zinc-200 rounded w-20" />
                          <div className="h-2 bg-zinc-100 rounded w-14 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold text-zinc-500">Departing Today</div>
                    {[1].map(i => (
                      <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-zinc-100">
                        <div className="w-6 h-6 rounded-full bg-zinc-200" />
                        <div className="flex-1">
                          <div className="h-2.5 bg-zinc-200 rounded w-16" />
                          <div className="h-2 bg-zinc-100 rounded w-12 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-b from-zinc-100/50 to-transparent rounded-3xl -z-10" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-zinc-50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.featureTitle')}</h2>
            <p className="mt-4 text-zinc-500 text-lg">{t('landing.featureSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-zinc-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.howTitle')}</h2>
            <p className="mt-4 text-zinc-500 text-lg">{t('landing.howSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-zinc-100 mb-4">{s.num}</div>
                <h3 className="font-semibold text-zinc-900 text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-900 py-20 md:py-28">
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
              className="mt-8 gap-2 h-12 px-8 text-base bg-white text-zinc-900 hover:bg-zinc-100 shadow-lg"
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
            <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">HO</span>
            </div>
            <span className="text-sm text-zinc-500">{t('landing.footerTagline')}</span>
          </div>
          <span className="text-xs text-zinc-400">© 2025 HostelOps</span>
        </div>
      </footer>
    </div>
  );
}
```

---

### Task 3: 修改 App.tsx 集成落地页

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 添加 landing 状态和 LandingPage 导入**

在 App.tsx 中：

1. 添加 import: `import { LandingPage } from './components/LandingPage';`
2. 在 AppContent 组件中添加状态: `const [showLanding, setShowLanding] = useState(true);`
3. 在 `if (!isAuthenticated)` 之前添加:
   ```tsx
   if (showLanding) {
     return <LandingPage onEnterApp={() => setShowLanding(false)} />;
   }
   ```
4. 当用户 logout 时，回到 landing 而非 login:
   修改 logout 后的逻辑，在 logout 按钮的 onClick 中改为 `() => { logout(); setShowLanding(true); }`

- [ ] **Step 2: 运行 TypeScript 检查**

Run: `cd /Users/ricky/AICode/hostelite && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: 运行 build 验证**

Run: `cd /Users/ricky/AICode/hostelite && npx vite build`
Expected: Build successful

---

### Task 4: 最终验证

- [ ] **Step 1: 启动 dev server 并验证**

Run: `cd /Users/ricky/AICode/hostelite && npx vite --port=3000 --host=0.0.0.0`

验证项：
1. 首屏显示 Landing Page（非登录页）
2. 中英切换正常
3. 点击 CTA 按钮进入登录页
4. 登录后正常使用 app
5. 登出后回到 Landing Page

---

## Self-Review

**1. Spec coverage:** Landing page 包含 hero、features、how-it-works、CTA、footer 五个 section，覆盖产品介绍和免费使用引导。

**2. Placeholder scan:** 无 TBD/TODO，所有文案和代码完整。

**3. Type consistency:** LandingPageProps 接口与 App.tsx 调用一致。i18n key 命名遵循 `landing.*` 模式。
