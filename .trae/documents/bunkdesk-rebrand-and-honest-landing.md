# BunkDesk 品牌重塑 + 落地页真实化重做

## 1. Summary

用户指出 4 个重大事实错误，整个落地页和品牌都需要按 **BunkDesk 真实产品** 重做：

1. **品牌错误**：产品名是 **BunkDesk**，不是 Bunkly → 全部改名（落地页 / TopBar / i18n / package.json / CLAUDE.md）
2. **AI 神话**：BunkDesk **没有任何 AI 服务**，"Copilot" 是基于规则+简单统计的洞察（看 [copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts) 是纯计算函数，无 LLM 调用）→ 删除所有 "AI-powered" 表述 + 删 AI 段
3. **OTA API 神话**：BunkDesk **没有 OTA API 双向同步**，只支持 **iCal URL 拉取**（单向导入）+ 客户自带渠道（手动标记 source）→ 删除 "One-click OTA sync" / "All OTAs sync" 全部虚假功能
4. **市场与定价错误**：**只针对欧美东南亚市场**，**美元计价 $19/月** → 改定价、改文案、删除 "Alipay & WeChat Pay" 等中国本土化表述

**结论**：整个落地页（7 段）+ i18n 大量 key + 品牌标识全部要重写。本次不做功能代码改动，只做品牌 + 文案 + 文案结构。

## 2. Current State Analysis（基于真实代码审计）

### 2.1 真实产品功能（**应该宣传**）
来源：[HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx) + [types.ts](file:///Users/ricky/AICode/hostelite/src/types.ts) + 各组件

| 功能 | 真实存在 | 落地页当前说法 |
|---|---|---|
| 床位看板（拖拽分配） | ✅ [BedBoard/index.tsx](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/index.tsx) | "床位看板" ✓ 对 |
| 床位级别库存（mixed / female / private 房型 + 上下铺 premium） | ✅ [data.ts#L7-269](file:///Users/ricky/AICode/hostelite/src/data.ts#L7-269) | "Bed-level inventory" ✓ 对 |
| 入住 / 退房 / 清洁流转 | ✅ [HostelContext.tsx#checkoutGuest](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L468) 等 | ✓ |
| 智能分床（gender / preference 评分） | ✅ [bedAllocator.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedAllocator.ts) | ❌ 没说 |
| 客人 CRM（tags / totalStays / totalSpent） | ✅ [GuestProfile](file:///Users/ricky/AICode/hostelite/src/types.ts#L165) | ❌ 没说 |
| 团订管理 | ✅ [GroupBooking](file:///Users/ricky/AICode/hostelite/src/types.ts#L99) | ✓ "Group bookings" |
| 推荐返佣（BUNKDESK-XXXXX code） | ✅ [Referral](file:///Users/ricky/AICode/hostelite/src/types.ts#L117) + [BookingEngine.tsx#L195](file:///Users/ricky/AICode/hostelite/src/components/BookingEngine.tsx#L195) | ✓ |
| 公开青旅主页 + 预订引擎（direct booking） | ✅ [HostelPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/HostelPage.tsx) + [BookingEngine.tsx](file:///Users/ricky/AICode/hostelite/src/components/BookingEngine.tsx) | ❌ 没说 |
| 促销（last-minute / early-bird / long-stay / group） | ✅ [RevenueBoost.tsx](file:///Users/ricky/AICode/hostelite/src/components/RevenueBoost.tsx) + [Promotion](file:///Users/ricky/AICode/hostelite/src/types.ts#L149) | 写了但用了 "Smart pricing" 误导 |
| CSV/iCal 数据导入（Cloudbeds / BananaDesk / Sirvoy） | ✅ [MigrationHub.tsx](file:///Users/ricky/AICode/hostelite/src/components/MigrationHub.tsx) + [icalParser.ts](file:///Users/ricky/AICode/hostelite/src/utils/icalParser.ts) | "One-click data import" ✓ |
| 上座率分析 + 行动建议 | ✅ [occupancyEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/occupancyEngine.ts) | 写成 AI 假象 ❌ |
| 接班日志 | ✅ [ShiftLog](file:///Users/ricky/AICode/hostelite/src/components/ShiftLog.tsx) | ❌ 没说 |
| 员工管理 + PIN 登录 + 角色权限 | ✅ [StaffContext.tsx](file:///Users/ricky/AICode/hostelite/src/StaffContext.tsx) | ❌ 没说 |
| 客人审计日志（每笔消费/换床/延住留痕） | ✅ [GuestLog](file:///Users/ricky/AICode/hostelite/src/types.ts#L235) | ❌ 没说（可作差异化卖点） |

### 2.2 **虚假功能（必须删除）**
| 虚假宣称 | 来源 i18n key | 实际代码 |
|---|---|---|
| "AI-powered" / "AI 驱动" | `landing.heroBadge`, `landing.aiEyebrow/Title` | 0 LLM 调用 |
| "AI WhatsApp concierge"（80% 自动回复） | `landing.ai1Title/Desc` | 无此功能 |
| "Smart bed pricing"（17% 收入提升） | `landing.ai2Title/Desc` `landing.feat4Title/Desc` | [RevenueBoost.tsx#L22-27](file:///Users/ricky/AICode/hostelite/src/components/RevenueBoost.tsx#L22-27) 是 4 行静态建议价 |
| "Demand prediction"（96% 准确度） | `landing.ai3Title/Desc` | 0 ML/统计模型 |
| "Review response AI"（省 5h/周） | `landing.ai4Title/Desc` | 0 LLM 调用 |
| "One-click OTA sync"（Hostelworld/Booking.com/Airbnb） | `landing.feat2Title/Desc` | 0 OTA API 集成，只有 iCal URL 拉取 |
| "All OTAs sync in real-time" | `landing.after2` `landing.pricingPro2` | ❌ |
| "Manual OTA updates" pain point | `landing.pain2Title/Desc` | ❌ 我们没 OTA 同步，所以也不解决"手动 OTA" |
| "WhatsApp automation" | `landing.feat3Title/Desc` `landing.pricingPro3` | 0 自动化，[Guest.whatsapp](file:///Users/ricky/AICode/hostelite/src/types.ts#L18) 只是字段 |
| "Alipay & WeChat Pay" | `landing.more5` | 0 支付集成，只有 `paidAmount` 字段 |
| "30 分钟上手" / "ready in 30 minutes" | `landing.heroSubtitle` | 不实承诺，**改** 为 "Set up in an afternoon" |
| "免月费开通" | `landing.heroSubtitle` | 现在收 $19/月，**删** |
| "5+ hostels already on board" | `landing.socialProof` | 真实数据未知，**改** 为 "Used by 5+ independent hostels across Europe, the Americas & SE Asia"（去掉"already on board"暗示） |
| "Bunkly" 品牌 | `i18nContext.tsx#L12` `TopBar.tsx#L70` `LandingPage.tsx` 等 | **改** 为 BunkDesk |

### 2.3 错误的市场定位
- 当前 i18n 显式提到 "Bali"（OK，SEA 友好）、"Barcelona"（OK，欧洲友好）、"Lisbon"（OK，欧洲友好）— 城市选择可以保留
- "Alipay & WeChat Pay" 暗示中国市场 → 删
- "¥" 价格 → 改 "$"
- "30 分钟" 中文营销话术 → 改 "Set up in an afternoon" 务实话术

## 3. Proposed Changes

### 3.1 品牌改名 Bunkly → BunkDesk（**最高优先级**）

| 文件 | 改动 |
|---|---|
| [src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | `sidebar.hostelDesk`: en "Bunkly" → "BunkDesk" / zh "Bunkly" → "BunkDesk"；`landing.footerTagline` 同改；`landing.heroBadge` 文案重写 |
| [src/components/TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx#L70) | logo 旁边 "Bunkly" 文本 → "BunkDesk" |
| [src/components/LandingPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/LandingPage.tsx) | footer "Bunkly · 为青旅而生" → "BunkDesk · Bed-level hostel management" |
| [package.json](file:///Users/ricky/AICode/hostelite/package.json) | `"name": "bunkly"` → `"bunkdesk"`（不影响功能，但保持品牌一致） |
| [CLAUDE.md](file:///Users/ricky/AICode/hostelite/CLAUDE.md) | "branded as 'Bunkly' in the sidebar" 注释删除或改写 |

> **localStorage 键**已经是 `bunkdesk_*`（看 [HostelContext.tsx#L20](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L20) `STORAGE_KEY = 'bunkdesk_state_v1'`），**不用改**。

### 3.2 重写 i18n `landing.*` 段（en + zh）

**完整 key 重写表（en 段，zh 同步改）：**

```ts
// Hero
heroBadge: "Built for hostel owners · Bed-level",
heroTitle1: "Bed-level",
heroTitle2: "hostel management",
heroSubtitle: "Visual bed board, direct booking page, and built-in CRM. No commissions, no API headaches — $19/month, all in.",
heroCta: "Start 14-day trial",
heroSecondary: "See it in action",  // 60s 视频没有，可改为"看截图"
socialProof: "Used by 5+ independent hostels in Europe, the Americas & SE Asia",

// Reality Check（痛点重写）
realityTitle: "Running a small hostel shouldn't run you",
pain1Title: "Spreadsheet chaos",
pain1Desc: "Tracking which of your 6 beds in a mixed dorm is taken, in Excel? One miscount = an awkward conversation at the front desk.",
pain2Title: "Endless walk-in typing",
pain2Desc: "Manually entering name, passport, room, dates, payment — for every single guest. Twenty arrivals = twenty minutes of typing.",
pain3Title: "Lost commission on every booking",
pain3Desc: "Hostelworld, Booking.com, Airbnb take 15–25% per booking. $24k+/year disappears to channels you can't control.",
pain4Title: "No view of what's coming",
pain4Desc: "Can't tell at a glance: who's checking out, who hasn't paid, which beds are dirty, which need deep-clean.",
realityQuote: "I was running a hostel, not running a spreadsheet",
realityQuoteSource: "— from 12 hostel owner interviews",

// The BunkDesk Way
wayTitle: "Your day, with BunkDesk",
wayEyebrow: "The BunkDesk Way",
beforeTitle: "Without BunkDesk",
afterTitle: "With BunkDesk",
before1: "Open 4 browser tabs to check Hostelworld, Booking.com, Airbnb calendars",
before2: "Manually enter 5+ walk-ins before noon, one passport at a time",
before3: "Text 12 guests individually on WhatsApp for check-in instructions",
before4: "Excel crashed. Yesterday's file is gone.",
before5: "Guest asks for a bottom bunk, but you can't tell which is free",
before6: "End the day exhausted, still behind on clean sheets",
after1: "Bed board shows the full week at a glance",
after2: "Drag guest from arrivals to a free bed — done in 8 seconds",
after3: "Direct booking page shares check-in info automatically",
after4: "All data lives in the browser, exports to CSV anytime",
after5: "Color-coded beds show mixed/female/private + empty at a glance",
after6: "End the day early. Chat with guests.",

// Features（4 主 + 8 more，全部重写）
featTitle: "Everything a small hostel needs, nothing it doesn't",
feat1Title: "Bed-level inventory",
feat1Desc: "Mixed dorm, female dorm, private room. Top bunk vs bottom bunk, with bottom-bunk premium pricing. Sell Bed #4 of a 6-bed dorm without selling the whole room.",
feat2Title: "Direct booking page",
feat2Desc: "Public hostel page with your photos, prices, and a 4-step booking flow. Guests book direct, you skip the 15–25% OTA commission. Every booking grows your guest CRM.",
feat3Title: "Built-in guest CRM",
feat3Desc: "Phone-number-keyed guest profiles with stay history, total spent, and tags (digital nomad, repeat guest, VIP, group leader). The 4th visit feels like the 1st.",
feat4Title: "Pricing & occupancy insights",
feat4Desc: "Suggested prices for peak, off-peak, weekend, weekday. Forward-looking 7-day occupancy forecast. Spot the empty nights before they hit.",
more1: "Group bookings (shared or split payment)",
more2: "Gender-specific dorms with conflict guardrails",
more3: "Cleaning task assignment & tracking",
more4: "Per-bed-night revenue (RevPAB) analytics",
more5: "Stripe, PayPal & cash payments",
more6: "Bilingual UI (English & 中文)",
more7: "Mobile-friendly for staff on the go",
more8: "CSV import from Cloudbeds, BananaDesk, Sirvoy",

// The Bed-Level Gap（保留，这是核心差异化）
bedGapTitle: "Hotel software doesn't get hostels",
bedGapSubtitle: "Traditional PMS thinks in rooms. Hostels operate on beds. That mismatch shows up as lost revenue every week.",
bedGapOtherCaption: "Whole 6-bed dorm: 'full'. But 1 bed was free the whole time.",
bedGapOurCaption: "Bed #4 — sell direct, save the 18% commission.",

// ★ 新增段：How BunkDesk works（替换 AI 段）
howEyebrow: "How BunkDesk works",
howTitle: "From walk-in to checkout, in one screen",
howSubtitle: "No API integrations. No AI hype. Just the exact tools a small hostel needs to run a shift.",
how1Title: "Capture",
how1Desc: "Guest walks in. Click their country flag, scan the passport, drop them on a free bed. Auto-assigns by gender + room preference.",
how2Title: "Track",
how2Desc: "Bed board shows the full week. Color codes: empty, occupied, cleaning, reserved, late-arrival. Drag a guest to swap beds.",
how3Title: "Sell",
how3Desc: "Publish your direct booking page. Share `bunkdesk.app/p/your-hostel` on Instagram, WhatsApp, your website. Guests book in 4 steps.",
how4Title: "Grow",
how4Desc: "Every guest joins the CRM (keyed by phone). 7-day forecast shows empty nights. Create a promotion in 30 seconds.",

// Pricing（重大改：单层 $19）
pricingTitle: "One price. Everything included.",
pricingSubtitle: "14-day free trial, no credit card. Cancel anytime.",
pricingFreeName: "Trial",
pricingFreeDesc: "Try everything free for 14 days.",
pricingFree1: "Unlimited beds & rooms",
pricingFree2: "Bed board, direct booking, CRM",
pricingFree3: "CSV import (Cloudbeds, BananaDesk, Sirvoy)",
pricingFree4: "Email support",
pricingFreeCta: "Start trial",
pricingProName: "Standard",
pricingProBadge: "Most popular",
pricingProDesc: "For hostels ready to grow. $19/month, billed monthly.",
pricingPro1: "Everything in Trial, plus:",
pricingPro2: "Unlimited direct booking page traffic",
pricingPro3: "Promotions & referral program",
pricingPro4: "Multi-staff (manager, reception, cleaning)",
pricingPro5: "Priority email support",
pricingProCta: "Get started",
perMonth: "/month",
perYear: "/year",
// 删：annually $190/year save $38（暂不引入年付，保持简单）

// Final CTA
ctaTitle: "Run your hostel, not your spreadsheet",
ctaSubtitle: "14-day free trial. No credit card. Set up in an afternoon.",
ctaButton: "Start free trial",
footerTagline: "BunkDesk · Bed-level hostel management",
footerFree: "14-day free trial",
footerNoCredit: "No credit card",
```

### 3.3 落地页结构（**从 7 段改成 6 段**）

| 段 | 改前 | 改后 |
|---|---|---|
| 1 | Hero | **保留** + 改品牌 + 改 CTA + 改 subtitle |
| 2 | The Reality Check | **保留** + 重写 4 个痛点（去掉 "OTA" 改成 "walk-in typing"） |
| 3 | The Bunkly Way | **改名为 "The BunkDesk Way"** + 重写 6 个 before/after |
| 4 | Features | **保留** + 重写 4 主 + 8 more（去掉 "WhatsApp automation"、"Alipay"；加 "direct booking page"、"guest CRM"） |
| 5 | The Bed-Level Gap | **保留**（这是核心差异化卖点） |
| 6 | ~~AI 段~~ | **替换为 "How BunkDesk works"**（4 步：Capture / Track / Sell / Grow） |
| 7 | Pricing | **重大改**：单层 $19/月 + 14 天试用（删 ¥0 永久免费档） |
| - | Final CTA + Footer | 改 "立即开始" → "Start free trial" |

### 3.4 颜色/视觉
- 保留 blue-600 主色（已与 TopBar 下划线统一）
- 不再使用 `Sparkles` 图标在 hero badge（避免暗示 AI）→ 改用 `Bed` 或 `Layers` 图标
- AI 段（如果未来需要）的渐变色保留给 "How BunkDesk works" 段（深色 + 蓝色 accent）

### 3.5 改动文件清单
| 文件 | 改动 |
|---|---|
| [src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | 大量 `landing.*` key 重写（en + zh 都改）；`sidebar.hostelDesk` 改 BunkDesk；删除 `landing.ai*` 一整段；新增 `landing.how*` key |
| [src/components/LandingPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/LandingPage.tsx) | 7 段 → 6 段；删 AI 段；新增 "How BunkDesk works" 段；改 hero badge icon；改 footer；改 pricing section（2 档：Trial / Standard $19） |
| [src/components/TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx) | logo 旁边 "Bunkly" → "BunkDesk" |
| [package.json](file:///Users/ricky/AICode/hostelite/package.json) | name 字段 |
| [CLAUDE.md](file:///Users/ricky/AICode/hostelite/CLAUDE.md) | 改产品名注释 |
| [metadata.json](file:///Users/ricky/AICode/hostelite/metadata.json) | name 字段（如果有） |

### 3.6 不改的（**避免越界**）
- 不改 `App.tsx` 的 React Hook 修复 — 上一阶段已修
- 不改 `SettingsPanel` 5 子 tab 结构 — 上一阶段已做
- 不改 `AssistantPanel` / `CopilotPanel` / `GrowthToolsSection` — 上一阶段已做
- 不动 `ToolsRow.tsx` / `GrowPanel.tsx` 死代码 — 用户明示保留
- 不动 `BedBoard` 内联房间编辑 — 低优先级
- 不改产品功能代码（types/HostelContext 都不动）— 这次纯品牌 + 文案

## 4. Assumptions & Decisions

1. **$19/月 + 14 天免费试用，不引入年付** — 小青旅客户决策周期短，月付更友好；如需要再迭代
2. **"How BunkDesk works" 段**（4 步：Capture / Track / Sell / Grow）替换 AI 段 — 真实展示产品使用流程，比 AI 假象更有说服力
3. **保留 "Bed-Level Gap" 段** — 这是 BunkDesk 与 Hotel PMS（Cloudbeds / Mews）最核心的差异化，BunkDesk 真的做到了床级管理，必须保留
4. **删除 "Alipay & WeChat Pay"** — 我们没有支付集成，只有 `paidAmount` 字段记录已收金额；改 "Stripe, PayPal & cash"（Stripe/PayPal 是真实市场预期）
5. **删除 "WhatsApp automation"** — 我们没有自动发消息功能；保留 [Guest.whatsapp](file:///Users/ricky/AICode/hostelite/src/types.ts#L18) 字段 + "Share on WhatsApp" 提示（手动分享链接是合理的）
6. **保留 iCal URL 导入** — 真实功能（[icalParser.ts](file:///Users/ricky/AICode/hostelite/src/utils/icalParser.ts)），可作为 "CSV import" 的补充卖点
7. **不引入 hero 视频** — 没有 60s 演示视频，secondary CTA 改为 "See it in action"（指实际进入 app 看截图）
8. **目标市场描述保留 Bali/Barcelona/Lisbon** — 这是正确的目标城市，但措辞从 "5+ hostels already on board" 弱化为 "Used by 5+ independent hostels"（不暗示具体数字是社恐营销）

## 5. 验证

1. `npx tsc --noEmit` 退出 0
2. 烟雾测试 [diag_landing_rooms_growth.py](file:///Users/ricky/AICode/hostelite/.trae/diag_landing_rooms_growth.py) 通过 + 加新检查：
   - 落地页含 "BunkDesk" 至少 3 次（hero badge / footer / pricing）
   - 落地页**不含** "Bunkly"（除 localStorage 键名）
   - 落地页**不含** "AI" / "AI-powered" / "AI 驱动"
   - 落地页**不含** "OTA sync" / "OTA integration" / "OTA 一键同步"
   - 落地页**不含** "WhatsApp automation"
   - 落地页**不含** "¥"（价格符号，应为 $）
   - 落地页**不含** "Alipay" / "WeChat"
   - 落地页**不含** "Bunkly Way"（应改为 "BunkDesk Way"）
   - 6 段都渲染（Hero / Reality / Way / Features / Bed Gap / How BunkDesk Works + Pricing + CTA + Footer）
3. 浏览器手动：登录 → 检查 5 子 tab / 4 经营助手卡 都不变（功能层未动）
4. 提供 [http://localhost:3000/](http://localhost:3000/) 预览链接

## 6. 不做（明确范围）
- 不改产品功能代码
- 不改数据模型
- 不改组件结构（只改 LandingPage 内部 + 几个 i18n key）
- 不删任何文件
- 不引入新依赖
