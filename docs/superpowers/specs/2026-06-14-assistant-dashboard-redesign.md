# 经营助手单页重构 + 顶栏收口设计

## 1. 目标

把当前的「经营助手」tab（概览 + 获客增长两个子 tab）合并为单页仪表盘；同时把 App sub-header 里的标题删掉、用户徽章上移到 TopBar 右侧。

## 2. 现状分析

### 2.1 当前结构

`AssistantPanel` = `CopilotPanel`（概览） + `GrowPanel`（获客增长）

- **概览**（[CopilotPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CopilotPanel.tsx)）：
  - 4 个 stat 卡（Check-ins / Check-outs / Empty Beds / Cleaning）
  - 7 天入住率柱图
  - Opportunities 列表
  - Risks 列表
- **获客增长**（[GrowPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowPanel.tsx)）：5 个子 tab（HostelPage / GuestCRM / OccupancyActions / ReferralPanel / RevenueBoost）

### 2.2 痛点

- 两个子 tab 把"洞察"和"工具"割裂，用户需要点击才知道要看哪里
- Opportunities / Risks 是同一类信息，拆两区样式重复
- App sub-header 的 H2 标题（"经营助手"）和 TopBar tab 名重复
- 用户徽章（姓名 + 角色）在 sub-header 右侧，与 TopBar 的 sign-out 视觉上割裂

## 3. 设计方案

### 3.1 单页布局（大仪表盘式，方案 A）

纵向三段，桌面 1280+ 双列、移动端单列堆叠：

```
┌──────────────────────────────────────────────────────┐
│  [4 stat 卡：入住/退房/空床/待清洁]    │  本周预测柱图 │  ←  Row 1
│  (2x2 移动端 / 4 列桌面)             │  (右 1/3)    │
├──────────────────────────────────────────────────────┤
│  ⚠️  需关注 (N)                                       │  ←  Row 2
│  ┌──────────────────────────────────────────────────┐│
│  │ 行: 图标 + 标题 + 描述 + [动作按钮] + [✕]         ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│  获客工具                                             │  ←  Row 3
│  [主页]  [CRM 156]  [上座率]  [转介绍 12]  [定价 2] │     (chip row)
└──────────────────────────────────────────────────────┘
```

- **Row 1 高度统一**：左 4 卡 = 240px，右柱图 = 240px
- **Row 2 需关注**：单一滚动列表，最多默认显示 5 条，超出折叠
- **Row 3 工具**：5 个 chip 横向排列，**点击打开右侧 Sheet/Drawer**（沿用现有 `components/ui/sheet.tsx`）

### 3.2 需关注列表（合并 Opportunities + Risks）

保留 CopilotEngine 的 `generateOpportunities` / `generateRisks` 输出，统一渲染：

```
┌──────────────────────────────────────────────────────────┐
│ ⚠️  周三入住率 28%，建议推促销                  [去定价] ✕│  ← 红色左边框
│ 👥  有 2 位 VIP 即将退房                  [看 CRM]   ✕│  ← 黄色左边框
│ 📈  本周峰值在周六 92%                  [看预测]   ✕│  ← 绿色左边框
└──────────────────────────────────────────────────────────┘
```

- 颜色编码：红（risk） / 黄（warning） / 绿（opportunity），沿用 `border-l-4` 样式
- 动作按钮：保留 `actionTarget` 跳转逻辑
  - `tab:subTab` 格式：`tab === 'grow'` → 打开对应 Sheet；其他 → `setActiveTab`
- 关闭按钮：同当前 `dismissedInsights` 行为（前端 local state）

### 3.3 工具 Row

5 个 chip 样式（与 TopBar 风格统一：圆角、hover、active 态）：

```
[Globe 主页]   [Users CRM 156]   [Zap 上座率 68%]   [Gift 转介绍 12]   [TrendingUp 定价 2]
```

- 数字徽章：CRM 显示客户总数、上座率显示 %、转介绍显示活跃数、定价显示活动数（从 `HostelContext` 算）
- 主页 chip 没有数字，显示「立即更新」
- 点击：打开右侧 Sheet，渲染对应组件（HostelPage / GuestCRM / OccupancyActions / ReferralPanel / RevenueBoost）

### 3.4 TopBar 改造

新右侧布局：

```
┌────────────────────────────────────────────────────┐
│  [B] Bunkly v0.x.x │  5 tabs ... │ Emma·经理 │ 退出 │
└────────────────────────────────────────────────────┘
```

- 在 tabs 之后、sign-out 之前插入 user badge
- badge 内容：`<span>Emma</span> <badge>经理</badge>`（与现状样式一致）
- 当前 sub-header 的 user badge JSX 直接搬过去，App.tsx 的 sub-header 整体删除

### 3.5 App sub-header 清理

- 删除 `<header className="h-12 ...">` 整个块（包括 H2 和 user badge div）
- 顶部高度从 56px (TopBar) → 56px (TopBar)，少 48px 占用，主内容区上移
- 角色 badge 的 `ROLE_BADGE` 常量从 App.tsx 移到 TopBar.tsx（user badge 现在归 TopBar 管）

## 4. 文件变更清单

| 文件 | 变更 |
|---|---|
| [src/App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) | 删除 sub-header；删 `ROLE_BADGE` 常量；删 `headerTitles` map（TopBar 已自带标签） |
| [src/components/TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx) | 接收 `currentStaff` + `t` 作为 props（或自取 context）；渲染 user badge 在 sign-out 之前 |
| [src/components/AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) | **重写**：删除 sub-tab 状态（`overview` / `grow`），改为单页直渲染组合 |
| [src/components/CopilotPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CopilotPanel.tsx) | **重写**：拆出 Row 1 的 `<TodayStats />` + `<ForecastChart />`，合并 Opportunities+Risks 为 `<NeedsAttentionList />` |
| [src/components/NeedsAttentionList.tsx](file:///Users/ricky/AICode/hostelite/src/components/NeedsAttentionList.tsx) | **新增**：合并机会/风险为统一列表 |
| [src/components/ToolsRow.tsx](file:///Users/ricky/AICode/hostelite/src/components/ToolsRow.tsx) | **新增**：5 个 chip + Sheet 触发器 |
| [src/components/StaffContext.tsx](file:///Users/ricky/AICode/hostelite/src/StaffContext.tsx) | 不动 |
| [src/components/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/components/i18nContext.tsx) | 补 `assistant.needsAttention` / `assistant.tools` 等少量 key |

## 5. 错误与边界

- **dismissedInsights 状态保留在 AssistantPanel 内部**：单页不再切换，状态不会丢
- **Sheet 打开时主内容不变暗**：现有 Sheet 默认是 modal 行为（背景遮罩），符合预期
- **5 个 Sheet 同时只会有一个打开**：用单个 `activeToolSheet` state 控制
- **角色权限**：reception / cleaning 看不到 settings 但能看到 经营助手（与现在一致）

## 6. 验证

1. `npx tsc --noEmit` 通过
2. 端到端 Playwright 测试：
   - 登录 Emma
   - 顶部出现 user badge（"Emma" + "经理"）
   - sub-header 不再出现
   - 经营助手页面 3 段：4 卡 / 柱图 / 需关注 / 工具
   - 工具行 5 个 chip 可点击，弹出 Sheet 显示对应组件
3. 角色过滤：reception 登录只看到 4 tab（无设置），但 经营助手 单页布局不变
4. 浏览器手动：所有跳转按钮（Check-ins → 前台入住、空床 → 床位看板、CRM 动作）都生效
