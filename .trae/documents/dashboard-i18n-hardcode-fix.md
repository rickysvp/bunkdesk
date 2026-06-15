# Dashboard 多语言硬编码清理 + 中英文切换 + 未来多语言架构

> 背景：用户问"后退箭头 `←` 是什么意思"以及"Dashboard 为什么没有支持多语言? 不要有任何硬编码，要先支持中英文切换，后续支持多语言切换"。
>
> 探索发现 Dashboard（经营助手模块）有 3 层硬编码：数据层（copilotEngine）、视图层（AssistantPanel* ）、组件层（5 个子工具）。`t()` 还不支持参数化。计划一次性把 Dashboard 完全 i18n 化，并把 `t()` 升级为可扩展的多语言架构。

---

## 1. 探索发现

### 1.1 后退箭头 `←` 的语义
- 位置：[BookingBlock.tsx#L266](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/BookingBlock.tsx#L266)
- 含义：此预订是"延续状态"——实际入住日期早于可视时间轴的左边界（如 Yuki Tanaka 的 6/13 是块"进入可视范围"的那天，不是真实 check-in）。`←` 是视觉标记，不参与 i18n。

### 1.2 Dashboard 三层硬编码

| 层 | 文件 | 硬编码数 | 性质 |
|---|---|---|---|
| 数据层 | [copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts) | **21 处**（7 个 insight 模板 × 3 字段） | 最严重，模板字符串拼插数字 |
| 视图层 | [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) + [AssistantPanelToday.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelToday.tsx) + [AssistantPanelGrowth.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelGrowth.tsx) | **~25 处** | `t('copilot.xxx') || 'fallback'` 模式 |
| 组件层 | [HostelPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/HostelPage.tsx) + [GuestCRM.tsx](file:///Users/ricky/AICode/hostelite/src/components/GuestCRM.tsx) + [OccupancyActions.tsx](file:///Users/ricky/AICode/hostelite/src/components/OccupancyActions.tsx) + [ReferralPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/ReferralPanel.tsx) + [RevenueBoost.tsx](file:///Users/ricky/AICode/hostelite/src/components/RevenueBoost.tsx) | **~40 处** | `t('xxx.yyy') || 'fallback'` 模式 + `¥` 硬编码 |

### 1.3 `t()` 现状
- 签名：`t(path: string) => string`
- 行为：路径查找 `translations[language][...path]`，缺键回落 en，en 也没有就返回 path
- **问题**：不支持参数化（无法做 `{n} empty beds`），不能扩展到第三种语言

---

## 2. 目标

1. **零硬编码**：所有展示给用户的字符串走 `t()`，没有 `|| 'fallback'`
2. **参数化 `t()`**：`t('insights.emptyBeds.title', { count: 8 })` → `"8 empty beds in next 3 days"` / `"未来 3 天有 8 张空床"`
3. **架构可扩展**：未来加新语言只需新增 namespace 对象，不改组件
4. **可见的中英文切换器**：TopBar 右上角加 EN/中 快速切换
5. **影响范围**：Dashboard（经营助手）模块 + 全局 `t()` 升级 + i18nContext 持久化

---

## 3. 实施步骤

### Step 1 · 升级 `i18nContext.tsx` 支持参数化

**改动**：[src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx)

```ts
// 旧：t(path: string) => string
// 新：
t(path: string, params?: Record<string, string | number>, options?: { defaultValue?: string }) => string
```

- 内部：找到 raw 字符串后做 `{key}` 替换。`{n}` 之类占位符从 params 取。
- 保留 en 回退链。
- 保留 key 缺失时返回 `options.defaultValue ?? path`（**没有 defaultValue 就直接显示 key** —— 这强制把硬编码全部清掉，因为没 fallback 可用）。
- 把 `useState("zh")` 升级为：先读 `localStorage.bunkdesk_language`，无则 zh；setLanguage 时写回 localStorage。

### Step 2 · 新增 `insights.*` i18n namespace

**改动**：[src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) 的 `translations.en.insights` 和 `translations.zh.insights`。

7 个 insight × 3 字段 = 21 条新 key。结构示例：

```ts
insights: {
  femaleRoom: {
    title:       "{name} has high vacancy",                              // en
    title_zh:    "{name} 空置率较高",                                    // zh
    description: "{empty}/{total} beds empty. Consider converting {count} beds to Mixed Dorm to increase bookings.",
    description_zh: "{empty}/{total} 张床位空置。建议将 {count} 张改为混合宿舍以增加预订。",
    actionLabel: "View Occupancy Actions",   actionLabel_zh: "查看空床动作",
  },
  emptyBeds3d: {
    title:       "{count} empty beds in next 3 days",
    title_zh:    "未来 3 天有 {count} 张空床",
    description: "Push long-stay discount or last-minute deal to fill empty beds.",
    description_zh: "推长住折扣或尾房特惠来填满这些床位。",
    actionLabel: "Create Promotion",         actionLabel_zh: "创建促销",
  },
  recall6m: {
    title:       "{count} guests haven't returned in 6+ months",
    title_zh:    "{count} 位客人 6 个月以上未回访",
    description: "Send them a personalized offer to come back.",
    description_zh: "给他们发个性化优惠邀请回来。",
    actionLabel: "View Guest CRM",          actionLabel_zh: "查看客人资产",
  },
  overbooking: {
    title:       "Overbooking on {date}",
    title_zh:    "{date} 存在超售风险",
    description: "{occupied} guests but only {total} beds available.",
    description_zh: "已分配 {occupied} 位客人但只有 {total} 张床可用。",
    actionLabel: "View Bed Board",          actionLabel_zh: "查看床位看板",
  },
  unconfirmed: {
    title:       "{count, plural, one {# unconfirmed reservation} other {# unconfirmed reservations}}",
    title_zh:    "{count} 条未确认预订",
    description: "{details}",
    description_zh: "{details}",
    actionLabel: "View Reservations",       actionLabel_zh: "查看预定管理",
  },
  urgentNotes: {
    title:       "{count, plural, one {# urgent shift note} other {# urgent shift notes}}",
    title_zh:    "{count} 条紧急交接班记录",
    description: "{details}",
    description_zh: "{details}",
    actionLabel: "View Shift Log",          actionLabel_zh: "查看交接班日志",
  },
  cleaning: {
    title:       "{count} beds waiting to be cleaned",
    title_zh:    "{count} 张床位待清洁",
    description: "High number of beds in cleaning status may delay check-ins.",
    description_zh: "过多待清洁床位可能延迟入住。",
    actionLabel: "View Bed Board",          actionLabel_zh: "查看床位看板",
  },
}
```

**plural 支持**：用 `{count, plural, one {…} other {…}}` ICU 风格——Step 1 的 `t()` 解析器要支持这种语法（简单的正则解析即可，不引入完整 ICU 库）。

**unconfirmed.title / urgentNotes.title** 用 `||` 表达英语单复数：1 → "1 unconfirmed reservation"，>1 → "3 unconfirmed reservations"。中文不区分单复数。

### Step 3 · 改 `copilotEngine.ts` 签名接受 `t`

**改动**：[src/utils/copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts)

```ts
// 旧：
export function generateOpportunities(rooms, guestProfiles, shiftNotes): CopilotInsight[]
// 新：
export function generateOpportunities(
  rooms: Room[],
  guestProfiles: GuestProfile[],
  shiftNotes: ShiftNote[],
  t: (path: string, params?: Record<string, string | number>) => string,
): CopilotInsight[]
```

把 7 个 insight 模板里的 `title: '...'` 全部改为 `title: t('insights.xxx.title', { ... })`，description/actionLabel 同理。

**调用方更新**：[AssistantPanelToday.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelToday.tsx#L63-70) —— 已经有 `t`，直接传入。

注意 `unconfirmedReservations` 和 `urgentNotes` 的 `description` 是动态拼接的（多人名/多条 note 拼成逗号串）。这个拼接的连接符 "," 也要走 i18n（`insights.listSeparator`），但实际显示名/内容仍是数据本身，不需要翻译。

### Step 4 · 清理 `|| 'fallback'` 模式（视图层）

**3 个文件**：
- [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) — `t('sidebar.assistant') || 'Assistant'` 等
- [AssistantPanelToday.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelToday.tsx) — 所有 stat card label、week forecast 标题、需关注标题等
- [AssistantPanelGrowth.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelGrowth.tsx) — `SUB_TABS` 数组里的 `fallback` 字段、overview card 标题等

逐个 `||` 改成纯 `t('xxx.yyy')`，并确保 i18nContext 中对应 key 在 en + zh 都存在（缺一就显示 key 字符串 —— 故意保留这行为以便"缺 key 一眼可见"）。

### Step 5 · 清理 5 个子工具组件的 `|| 'fallback'`

| 文件 | 硬编码位置 | 处理 |
|---|---|---|
| [HostelPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/HostelPage.tsx) | L94, 97, 106, 124, 144, 151, 164, 177, 200, 227, 238, 251, 265, 269, 270, 294, 295, 307, 311, 404, 412, 423, 457, 462 | 全部 `t('hostelPage.xxx')`，删除 `\|\| 'fallback'` |
| [GuestCRM.tsx](file:///Users/ricky/AICode/hostelite/src/components/GuestCRM.tsx) | L72, 83, 94, 104, 105, 106, 124, 157, 161, 192, 223, 224, 265, 269, 273, 277, 288, 293, 310, 314, 316, 319, 325, 329 | 全部 `t('crm.xxx')`，删除 `\|\| 'fallback'`。Tag 显示用 `language === 'zh' ? label.zh : label.en` 保留（数据驱动，不是文案） |
| [OccupancyActions.tsx](file:///Users/ricky/AICode/hostelite/src/components/OccupancyActions.tsx) | L45, 48, 73, 74, 84, 117, 128, 131, 148, 149 | 同上。`typeLabel` 也是数据驱动，保留 |
| [ReferralPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/ReferralPanel.tsx) | `formatCurrency` L77 — `¥${amount}` 硬编码 | 改为 `Intl.NumberFormat('zh', { style: 'currency', currency: 'CNY' }).format(amount)` 或基于 `language` 动态货币 —— 由于 BunkDesk 目标市场是欧美东南亚，**统一用 `t('common.currency')` 拿当前 locale 的货币符号**。i18n 加 `common.currency: { en: '$', zh: '¥' }`（或更优：加 `common.currencyCode: { en: 'USD', zh: 'CNY' }`） |
| [RevenueBoost.tsx](file:///Users/ricky/AICode/hostelite/src/components/RevenueBoost.tsx) | L169 — `Last Minute — ${day.dayName}` 硬编码英文 | 改为 `t('revenue.lastMinuteForDay', { day: ..., date: ... })`（zh: "尾房特惠 — 周三 6/17"）。其他 `t('revenue.xxx')` 已经无 fallback，OK |

**Step 5 副产物**：
- [i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) 增补 `common.currency`、`revenue.lastMinuteForDay` 等缺失 key。

### Step 6 · TopBar 加 EN/中 快速切换

**改动**：[src/components/TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx) 右侧 user badge 之前。

- 新增一个 `LanguageToggle` 子组件：两颗 tab 风格按钮 "EN" / "中"，高亮当前。
- 视觉紧凑（30px 高），用 [Settings → 通用](file:///Users/ricky/AICode/hostelite/src/components/GeneralSection.tsx) 里那个 toggle 的视觉变体。
- 保持现有的"Settings → 通用"长 toggle 也存在（不冲突）—— 顶部那个是快速切换，详情页那个是显式选择。

### Step 7 · 把 经营助手 里的 "今日潜在 $X" 数字国际化

**位置**：[AssistantPanelToday.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelToday.tsx#L160) `value={`$${totalPotentialRevenue}`}`

改为 `formatCurrency(totalPotentialRevenue, language)`，统一用 `Intl.NumberFormat` + `common.currency`：

```ts
function formatCurrency(amount: number, lang: 'en' | 'zh') {
  const code = lang === 'en' ? 'USD' : 'CNY';
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'zh-CN', {
    style: 'currency', currency: code, maximumFractionDigits: 0,
  }).format(amount);
}
```

同样应用于：
- AssistantPanelGrowth.tsx L95 `${totalPotentialRevenue}` →
- OccupancyActions.tsx L74, L121
- RevenueBoost.tsx L304, L307
- ReferralPanel.tsx L77 `formatCurrency`

### Step 8 · 全局 `|| 'fallback'` 扫尾

把搜索关键词 `|| 'fallback'` 和 `|| "fallback"` 跑一遍，把所有 `t(...) || 'X'` 改成 `t(...)` 并补齐 i18n key。

涉及的非 Dashboard 文件（次要）：
- [TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx) 3 处
- [GeneralSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GeneralSection.tsx) L64 描述行有 `language === 'en' ? 'English' : '中文'` 硬编码 → 走 i18n

### Step 9 · 持久化 + 验证

- i18nContext 读 `localStorage.bunkdesk_language`（key 改用 bunkdesk_ 前缀与现有约定一致）
- 切换语言：刷不刷页面都能用
- 验证：
  - zh/en 切换后：所有 Dashboard 文案跟着变
  - 7 个 insight 模板都正确显示
  - 数字（货币、千分位）按 locale 格式化
  - 单复数：unconfirmed = 1 vs >1 文案不同；中文不区分
  - deep-link：今日 → 5 个 insight action 跳转全部正常
  - 缺 key 时显示 key 字符串本身（不留空白，也不再回退英文）

### Step 10 · 交付预览链接
- 启动 dev server，给链接 `http://localhost:3000/`
- 提示：登录后默认是中文（之前的默认），点 TopBar 的 EN/中 切换

---

## 4. 文件改动清单

| 文件 | 类型 |
|---|---|
| [src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | 改：`t()` 加 params + plural；增：insights.*、common.currency、revenue.lastMinuteForDay、多个补全 key；持久化 |
| [src/utils/copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts) | 改：7 个 insight 模板走 `t()`，函数签名加 `t` 参数 |
| [src/components/AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) | 改：清 `|| 'fallback'` |
| [src/components/AssistantPanelToday.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelToday.tsx) | 改：清 `|| 'fallback'`、传 `t` 给 engine、货币用 Intl |
| [src/components/AssistantPanelGrowth.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelGrowth.tsx) | 改：清 `|| 'fallback'`、货币用 Intl |
| [src/components/HostelPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/HostelPage.tsx) | 改：清 `|| 'fallback'` |
| [src/components/GuestCRM.tsx](file:///Users/ricky/AICode/hostelite/src/components/GuestCRM.tsx) | 改：清 `|| 'fallback'` |
| [src/components/OccupancyActions.tsx](file:///Users/ricky/AICode/hostelite/src/components/OccupancyActions.tsx) | 改：清 `|| 'fallback'`、货币用 Intl |
| [src/components/ReferralPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/ReferralPanel.tsx) | 改：货币 `¥` → Intl；已无 `\|\|` |
| [src/components/RevenueBoost.tsx](file:///Users/ricky/AICode/hostelite/src/components/RevenueBoost.tsx) | 改：Last Minute 模板走 i18n、货币用 Intl |
| [src/components/TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx) | 改：加 LanguageToggle、清 `|| 'fallback'` |
| [src/components/GeneralSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GeneralSection.tsx) | 改：language 描述走 i18n |

预计 **12 个文件**改动。

---

## 5. 范围之外（不这次做）

- **第三种语言**：用户说"后续支持多语言切换"，先打好架构（参数化 t + plural + Intl），实际加 ja/es/de 留到下次。
- **整 App 全模块扫荡**：本次只彻底修 Dashboard（经营助手模块）+ i18n 核心 + 顺手扫 TopBar/GeneralSection。BedBoard / CheckIn / ShiftLog / Settings / MigrationHub / BookingEngine 等模块可能还有零星 `|| 'fallback'`，**后续单独排期**。
- **BookingBlock 的 `←`**：视觉标记，无需翻译，但可以加 `aria-label` / `title` 提示增强可访问性 —— 顺手做。
- **语言切换持久化范围**：i18nContext 持久化只存 `bunkdesk_language` 一条 key，**不**改其他 bunkdesk_* 存储。
- **架构图 / 文档**：本次不写 i18n 文档，等第三种语言接入前再写。

---

## 6. 风险与对策

- **plural 解析器自研风险**：用简单正则（`/{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\s*}/g`）只支持 one/other 两种形式，不引入 ICU 库（bundle 不增重）。这对中英足够。
- **insight 文案在 en/zh 长度差异**：英文标题可能 30 字符，中文 12 字符。InsightRow 组件当前 `text-sm font-medium` 单行不截断，长标题可能溢出 → 改 `truncate` 或在 InsightRow 用 `whitespace-normal`。
- **localStorage 读取 SSR 风险**：纯 SPA，不影响。`useState` 初始化时读 localStorage 用 `typeof window !== 'undefined'` 保护一下。

---

## 7. 验证清单

- [ ] zh 模式：Dashboard 全部文案中文，数字格式 `¥1,234`
- [ ] en 模式：Dashboard 全部文案英文，数字格式 `$1,234`
- [ ] 切换语言：实时生效，无须刷新
- [ ] 7 个 insight 模板在 2 种语言下都正确渲染（包括 0 张空床、1 条未确认、N 条未确认 3 种 case）
- [ ] 单复数：1 条 / 3 条未确认预订 英文标题不同；中文一致
- [ ] TopBar EN/中 toggle 和 Settings → 通用 长 toggle 双向同步
- [ ] 缺 key 时显示 key 字符串本身（不静默回退）
- [ ] 货币：所有 `$${...}` / `¥${...}` 全部走 Intl
- [ ] deep-link：5 种 insight action → 跳到对应 grow 子 tab 正常
- [ ] 刷新页面：语言偏好保留
- [ ] 没有 `|| 'fallback'` / `|| "fallback"` 字符串残留（grep 验证）
