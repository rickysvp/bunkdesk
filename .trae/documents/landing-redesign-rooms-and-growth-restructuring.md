# 落地页重构 + 设置模块扩充 + 获客工具重定位

## 1. Summary

三件互相关联的重构：

1. **落地页** 整体重做，参考 [bunkflow.com](https://bunkflow.com) 的版式节奏（hero → 痛点 → 前后对比 → 功能 → 床位差异 → 定价 → CTA），但用 Bunkly 自家产品语言和卖点
2. **设置模块** 增 2 个子 tab：`房间`（房间/床位管理）+ `获客`（5 个获客工具的归宿）
3. **经营助手** 移除底部工具行 → 变为纯洞察仪表盘（4 卡 + 柱图 + 需关注）

## 2. Current State Analysis

### 2.1 落地页 [LandingPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/LandingPage.tsx) 现状
- 480 行单文件，8 段：nav / hero（黑底） / 痛点 4 卡 / before-after / 4 功能 / 差异化 / 3 列对比 / 2 档定价 / CTA / footer
- 用了 emerald-500 作为主色，但文案语气偏 SaaS 营销，与产品实际功能（青旅 PMS）匹配度有提升空间
- Hero CTA 是「立即体验」（demo 风），与 bunkflow 的「Get Early Access」waitlist 风不一致

### 2.2 [bunkflow.com](https://bunkflow.com) 参考版式
按出现顺序：
1. **Hero**（深色）— "The World's First AI-Powered Hostel Management System" + 定价 + 双 CTA（Get Early Access / Watch Demo）+ 50+ hostels waitlist
2. **The Reality Check** — 4 痛点卡（每张带大数字 stat：67%、3hrs、₹2.4L、45+）+ 引言
3. **The BunkFlow Way** — Before/After 双列对比
4. **Features** — 4 主功能（bed-level inventory、OTA sync、WhatsApp、smart pricing）+ 8 more 小项
5. **The Bed-Level Gap** — 床位差异可视化（左侧传统 PMS 6 床位整房售卖 → 右侧 BunkFlow 床位单独售卖）
6. **AI 段落** — 4 块（WhatsApp concierge、smart pricing、demand prediction、review response）+ 3 大 stat（80%、17%、70%）
7. **The Comparison** — 简单表格 vs Cloudbeds/Mews
8. **Simple Pricing** — 3 档（₹1,499 / ₹2,999 / ₹4,999）+ "Compare with enterprise" 横幅
9. **Be among the first 100 hostels** — waitlist CTA

### 2.3 房间管理 现状
- [BedBoard/Dialogs.tsx](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/Dialogs.tsx) 内有 `RoomSettingsDialog` (床位增删改) 和 `AddRoomDialog`（新增房间）
- 没有独立的「房间管理」页面/组件
- i18n `rooms.*` 已经准备好（"管理房间与床位" 等 26 个 key）但无人用
- 房间编辑入口在 BedBoard 各房间的 popover 内，操作分散

### 2.4 获客工具 现状
- [ToolsRow.tsx](file:///Users/ricky/AICode/hostelite/src/components/ToolsRow.tsx) 5 个 chip 放在 [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) 最底部
- 点击 chip 在右侧 [Sheet](file:///Users/ricky/AICode/hostelite/components/ui/sheet.tsx) 弹窗中打开对应工具
- 问题：位置像 afterthought，弹窗隐藏主内容，工具之间关系不清

### 2.5 [SettingsPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/SettingsPanel.tsx) 现状
- 3 个子 tab：员工管理 / 数据迁移 / 通用
- 改后变 5 个：员工 / 迁移 / **房间** / **获客** / 通用

## 3. Proposed Changes

### 3.1 落地页重构 [LandingPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/LandingPage.tsx)

**结构（7 段，参考 bunkflow 但用 Bunkly 自家语言）：**

```
1. Hero (黑底)
   badge: "为青旅而生 · AI 驱动"
   H1: "床位级别的青旅操作系统"  (大字号)
   sub: "床位看板 · 智能洞察 · 获客工具一站搞定。免抽成、免月费开通。"
   双 CTA: [免费开始]  [观看 60 秒演示]
   social proof: 头像组 + "5+ 青旅正在使用" + "覆盖 Bali / 巴塞罗那 / 里斯本"

2. The Reality Check (白底)
   4 痛点卡片，每张带大数字：
   - 67% 小青旅仍用 Excel  → 床位超卖噩梦
   - 3hrs/天  浪费在手动更新 OTA
   - ¥2.4L/年  因库存错误损失
   - 45+ 消息/天  全部 WhatsApp 手动处理
   引言: "我花在管预订上的时间比跟客人聊天还多" — 12 位青旅老板访谈

3. The Bunkly Way (灰底)
   Before / After 双列:
   - Before: 6+ hrs/天  (Excel 跨床、OTA 漏更、客人投诉)
   - After: 30 min/天  (床位实时同步、洞察自动推)

4. Features (白底)
   4 主功能（大卡）+ 8 more（小 chip 网格）:
   - 床位级库存
   - OTA 一键同步
   - WhatsApp 自动化
   - 智能定价
   + 拼房 / 性别宿舍 / 清洁任务 / RevPAB / 收款 / 多语言 / 移动端 / 数据迁移

5. The Bed-Level Gap (白底，左右对比可视化)
   左侧: "传统 PMS" → 6 床整房售卖，"床位 #4 已售完" 实际还有 1 床
   右侧: "Bunkly" → 床位 #4 单独上架 Hostelworld/Booking.com/Walk-in
   下方引言: "Hotel PMS 是按房算的，青旅是按床算的"

6. AI 段落 (黑底)
   4 块带 stat:
   - WhatsApp 智能客服 (80% 查询自动处理)
   - 智能床位定价 (17% 收入提升)
   - 需求预测 (96% 准确度)
   - 点评智能回复 (省 5+ hrs/周)
   顶部 3 大 stat: 80% / 17% / 70%

7. Simple Pricing (白底) + Final CTA (黑底) + Footer
   2 档（保留现有 Free + Pro，不引入 bunkflow 的 3 档）
   Pro 卡片高亮
   "30 分钟开通，不绑信用卡"
```

**颜色 / 排版：**
- 主色从 emerald-500 改为 blue-600（更专业，更接近 Bunkly 当前 app 的蓝色下划线）
- 保留 hero 黑底 + 大字号 H1 + 渐变色 accent
- 删除对比表 8 行中 "BananaDesk" 那列（自家产品对比自己很奇怪），只保留 "Others" vs "Bunkly" 2 列
- 文案整体重写：从 SaaS 风 → 简洁直白青旅运营者语言

**新增/修改的 i18n key：**
- `landing.heroBadge` / `landing.heroTitle1/2` / `landing.heroSubtitle` / `landing.heroCta` / `landing.heroSecondary`（重写）
- `landing.realityCheckTitle/Subtitle` / `landing.pain1Stat` / 等 4 个 stat 数字
- `landing.bunklyWayTitle` / `landing.beforeTime` / `landing.afterTime`（重写文案）
- `landing.featuresTitle` / `landing.feature1Title` 等
- `landing.bedGapTitle/Subtitle/Quote`（新）
- `landing.aiTitle` / `landing.aiFeature1Stat` 等
- `landing.pricingSimpleNote`

### 3.2 房间管理 → 设置 [RoomsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/RoomsSection.tsx) (新增)

**新文件** [src/components/RoomsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/RoomsSection.tsx)：
- 顶部 "添加房间" 按钮（打开 [AddRoomDialog](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/Dialogs.tsx#L680)）
- 房间列表（卡片或表格），每行：房间号 / 名称 / 类型 / 床位数 / 已入住 / 操作（编辑 / 删除）
- 复用现有 [RoomSettingsDialog](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/Dialogs.tsx#L520) 和 [AddRoomDialog](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/Dialogs.tsx#L680)（迁出 BedBoard/Dialogs.tsx 到独立文件以便两处复用）
- 删除 BedBoard 内联的房间编辑入口（点击房间名直接跳设置的房间 tab）

**设置 panel 改造 [SettingsPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/SettingsPanel.tsx)：**
```ts
type SettingsSubTab = 'staff' | 'migrate' | 'rooms' | 'general';
```
- 增加 `<SubTabButton>` for `rooms` (图标 BedDouble)
- 增加 `{subTab === 'rooms' && <RoomsSection />}`
- 排序：员工 / 迁移 / 房间 / 通用（按使用频率排，房间管理使用最频繁往前放）

**复用**：
- 迁出 `AddRoomDialog` / `RoomSettingsDialog` 到 [src/components/RoomsDialogs.tsx](file:///Users/ricky/AICode/hostelite/src/components/RoomsDialogs.tsx)（新）
- [BedBoard/Dialogs.tsx](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/Dialogs.tsx) 改为 re-export 或直接 import
- BedBoard 内的房间编辑入口移除（保留床位操作，移除房间级操作）

### 3.3 获客工具 → 设置 [GrowthToolsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowthToolsSection.tsx) (新增)

**结构**：5 个子 tab 内部保留
```
[青旅主页]  [客人资产]  [空床动作]  [推荐奖励]  [定价参考]
```
- 内嵌 5 子 tab 切换条（不用 Sheet 弹窗，因为是常用工具）
- 主体渲染对应组件：HostelPage / GuestCRM / OccupancyActions / ReferralPanel / RevenueBoost
- 这与 [GrowPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowPanel.tsx) 几乎一致 → 实际上是「把它移过来」

**改动**：
- 新建 [GrowthToolsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowthToolsSection.tsx) = 现有 [GrowPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowPanel.tsx) 逻辑 + i18n subTab
- 删 [ToolsRow.tsx](file:///Users/ricky/AICode/hostelite/src/components/ToolsRow.tsx)
- 删 [GrowPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowPanel.tsx)
- [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) 移除 ToolsRow 引用，回到纯仪表盘布局

**设置 panel 改造**：
```ts
type SettingsSubTab = 'staff' | 'migrate' | 'rooms' | 'growth' | 'general';
```
- 增加 `<SubTabButton>` for `growth` (图标 TrendingUp)
- 排序：员工 / 迁移 / 房间 / 获客 / 通用

**Copilot 洞察跳转修复**：
- [CopilotPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CopilotPanel.tsx) 的 `openTool` 回调需要改为：跳到 `setActiveTab('settings')` + 切到 `growth` subTab + 切到对应 toolId
- 之前用 Sheet 弹窗不需要传 context，现在要传 3 层 state
- App.tsx 新增 `growthSubTab` state 管理（同 `navigateToGrow` 模式）
- 这就回到了设置多级路由的旧模式（subTab + subOfSub）

### 3.4 经营助手净化

[AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) 改动：
- 删除 `<ToolsRow />` 渲染
- 删除 `requestedTool` / `setRequestedTool` 状态
- 删除 `autoOpenPromo` 处理 effect（保留 prop 透传以防 App.tsx 还在用）
- 净化为：4 stat 卡 + 柱图 + 需关注（3 个 row 干净）
- 顶部可加一行小字："工具 → 设置 · 获客"，作为入口提示

[App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) 改动：
- 新增 `settingsSubTab` state + `setSettingsSubTab` setter
- 新增 `settingsSubSubTab` state（用于 growth section 内部 5 子 tab）—— 或者用一个对象 `{tab, subTab}` 统一管理
- 简化 `navigateToGrow` → 不再是 sheet 打开，改为跳转到 settings + 切到对应子 subTab

## 4. 关键文件清单

| 文件 | 变更 |
|---|---|
| [LandingPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/LandingPage.tsx) | 整体重写，480 行 → 约 600 行（更多 section） |
| [i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | 大批量新增/重写 `landing.*` key（中英） |
| [SettingsPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/SettingsPanel.tsx) | 加 2 个 sub-tab (rooms, growth) |
| [RoomsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/RoomsSection.tsx) | **新建**：房间管理主页面 |
| [RoomsDialogs.tsx](file:///Users/ricky/AICode/hostelite/src/components/RoomsDialogs.tsx) | **新建**：从 BedBoard/Dialogs.tsx 迁出 AddRoomDialog / RoomSettingsDialog |
| [GrowthToolsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowthToolsSection.tsx) | **新建**：原 GrowPanel 内容 |
| [BedBoard/Dialogs.tsx](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/Dialogs.tsx) | 删除 RoomSettingsDialog + AddRoomDialog，删除内联房间编辑入口 |
| [ToolsRow.tsx](file:///Users/ricky/AICode/hostelite/src/components/ToolsRow.tsx) | **删除** |
| [GrowPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowPanel.tsx) | **删除**（内容搬到 GrowthToolsSection） |
| [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) | 移除 ToolsRow |
| [CopilotPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CopilotPanel.tsx) | `openTool` 改为跳 settings |
| [App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) | 新增 settingsSubTab / settingsSubSubTab state |

## 5. Assumptions & Decisions

1. **落地页用 7 段（含 AI）**：bunkflow 9 段太长，删了 "Be among the first 100" waitlist（我们没 waitlist），删了 "AI" 之外的 stat 数字（保留作为信任）。如果你觉得太多，可缩为 5 段（去掉 AI 和床位差异）
2. **主色从 emerald-500 改为 blue-600**：当前 app 已经用 blue-600 作 accent（TopBar 下划线、focus ring），落地页用同一蓝色更整体
3. **获客工具用「内嵌子 tab」而非「Sheet 弹窗」**：用户说位置恶心，弹窗形式确实更糟。直接放在 settings 子 tab 内部，跳转深度 +1 但可读性强
4. **房间管理是子 tab 而非顶级 tab**：用户说 "放到设置模块里"，所以是子 tab。如果以后频率高再提升
5. **删除 BedBoard 内联房间编辑**：避免两处入口的不一致。如要保留，可以做 "跳到设置" 按钮
6. **Copilot 洞察的"跳到获客工具" 现在变成 3 跳**：setActiveTab('settings') → setSettingsSubTab('growth') → setSettingsSubSubTab('pricing')。仍然用 App.tsx 持有 state，避免 prop drilling

## 6. 验证

1. `npx tsc --noEmit` exit 0
2. Playwright 烟雾测试 [.trae/diag_assistant_redesign.py](file:///Users/ricky/AICode/hostelite/.trae/diag_assistant_redesign.py) 仍过：5 tabs + 经营助手 4 卡 + 柱图 + 需关注（无工具行）
3. 新增测试 [.trae/diag_landing_rooms_growth.py](file:///Users/ricky/AICode/hostelite/.trae/diag_landing_rooms_growth.py)：
   - 落地页：7 段都渲染，对比表只剩 2 列，hero 主 CTA 显示
   - 设置 → 房间 tab：能看到房间列表 + 添加按钮
   - 设置 → 获客 tab：5 子 tab 切换正常
   - 经营助手：底部无「获客工具」行
4. 浏览器手动：登录 → 跳到设置 → 切到获客 → 切到定价 → 创建促销流程通
