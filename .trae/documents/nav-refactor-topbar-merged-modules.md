# 导航重构：左侧边栏 → 顶部导航 + 经营助手/设置合并

## 1. Summary

把现在散落在左侧 `Sidebar` 上的 8 个 tab 重组为 5 个**顶部**主导航 tab，并把分散的子功能合并到两个「容器 tab」里：

| 旧 tab | 新 tab | 说明 |
|---|---|---|
| 经营助手 (dashboard) + 获客增长 (grow) | **经营助手 (assistant)** | 合并为单一 tab，内含子切换 |
| 设置 → 员工 (staff) | **设置 (settings)** | 合并到新「设置」页 |
| 设置 → 数据迁移 (migrate) | **设置 (settings)** | 同上 |
| — | **设置 → 通用** | 新增，放语言/主题/登出/版本等 |
| 床位看板 (bedboard) | 床位看板 | 不变 |
| 前台入住 (checkin) | 前台入住 | 不变 |
| 交接班日志 (shiftlog) | 交接班日志 | 不变 |

UI 上把 `Sidebar.tsx` 整体替换为水平 `TopBar.tsx`：左侧 logo，中间 5 个 tab，右侧用户菜单。

## 2. Current State Analysis

### 2.1 当前导航（基于 [App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx#L37-L42)）
```
'dashboard'  → CopilotPanel     (经营助手)
'bedboard'   → BedBoard          (床位看板)
'shiftlog'   → ShiftLogPanel     (交接班日志)
'checkin'    → QuickBookingModal-style CheckInPanel (前台入住)
'grow'       → GrowPanel         (获客增长)
'staff'      → StaffPanel        (员工管理)
'migrate'    → MigrationHub      (数据迁移)
```
外层包在 [`<Sidebar>`](file:///Users/ricky/AICode/hostelite/src/components/Sidebar.tsx#L46-L78) 内，点击左侧按钮切换 `activeTab`。

### 2.2 角色权限（[StaffContext.tsx](file:///Users/ricky/AICode/hostelite/src/StaffContext.tsx#L11-L40)）
`ROLE_TABS` 用字符串 id 控制每个角色可见 tab。合并后这些 id 要同步更新。

| Role | 旧可见 tab |
|---|---|
| manager | dashboard, bedboard, shiftlog, checkin, grow, staff, migrate |
| reception | dashboard, bedboard, shiftlog, checkin |
| cleaning | dashboard, bedboard, shiftlog |

合并后 manager 看到 5 个 tab：assistant, bedboard, shiftlog, checkin, settings。其他角色去掉 grow/staff/migrate。

### 2.3 i18n
[Sidebar](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx#L5-L22) 的 en/zh 翻译 key 已就位，要补 `assistant`、`settings`、子导航的 `tabOverview`、`tabGrow`、`tabStaff`、`tabMigrate`、`tabGeneral`、以及 `common.logout`、`common.version` 等。

### 2.4 子面板内部结构
- **`CopilotPanel.tsx`**：单一仪表盘页面，无内嵌子 tab。直接当作「经营助手 → 概览」整体渲染。
- **`GrowPanel.tsx`**：内部用 `subTab` state 切 5 个子页（hostel page / crm / occupancy / referral / pricing）。可整体搬入「经营助手 → 获客增长」并保留 5 个子 tab。
- **`StaffPanel`** / **`MigrationHub`**：单页组件，无内嵌子 tab。直接搬入「设置 → 员工 / 数据迁移」即可。

## 3. Proposed Changes

### 3.1 新增 [`src/components/TopBar.tsx`](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx)（替代 `Sidebar.tsx`）

水平 flex 布局：
- 左：`logo`（Bunkly 品牌 + 小图标）
- 中：5 个 tab 按钮（按可见性过滤），高亮当前 `activeTab`（用底部蓝色下划线 + 文本色）
- 右：用户头像下拉（显示当前角色 + 登出按钮）

要点：
- 桌面 `flex` 横排，标签之间用 `gap-1` 间隔
- 移动端：5 个 tab 缩成 `overflow-x-auto` 横向滚动（**不**引入汉堡菜单，避免增加点击次数）
- 角色过滤逻辑从 `Sidebar.tsx` 整段搬过来（`ROLE_TABS` 过滤）
- 复用 `Sidebar.tsx` 里 `t('sidebar.*')` 的 i18n 调用

### 3.2 新增 [`src/components/AssistantPanel.tsx`](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx)

新容器 tab，处理 `activeSubTab` 内部状态：
```tsx
type AssistantSubTab = 'overview' | 'grow';
```
- 顶部一行 sub-tab 切换条：「概览 | 获客增长」，当前项加底部蓝条
- `overview` → 直接渲染 `<CopilotPanel />`（不改 Copilot 内部）
- `grow` → 渲染 `<GrowPanel />`（不改 Grow 内部）
- 在 App.tsx 里把 `activeTab === 'assistant'` 的分支指向这个新容器

### 3.3 新增 [`src/components/SettingsPanel.tsx`](file:///Users/ricky/AICode/hostelite/src/components/SettingsPanel.tsx)

新容器 tab，处理 `activeSubTab`：
```tsx
type SettingsSubTab = 'staff' | 'migrate' | 'general';
```
- 顶部 sub-tab 切换条：「员工管理 | 数据迁移 | 通用」
- `staff` → `<StaffPanel />`
- `migrate` → `<MigrationHub />`
- `general` → 新建 `GeneralSection` 组件（见 3.4）
- 在 App.tsx 里把 `activeTab === 'settings'` 的分支指向这个新容器

### 3.4 新增 [`src/components/GeneralSection.tsx`](file:///Users/ricky/AICode/hostelite/src/components/GeneralSection.tsx)

新「通用」子页内容（基于当前 `App.tsx` 里散落的杂项 + `LoginScreen` 的登出按钮）：
- **语言切换**：调用 `useI18n()` 暴露的 `setLanguage('en' | 'zh')`
- **登出**：调用 `StaffContext` 的 `logout`（如果存在，否则直接清 localStorage 跳回 `LoginScreen`）
- **应用版本**：从 [`src/version.ts`](file:///Users/ricky/AICode/hostelite/src/version.ts) 读 `APP_VERSION` 展示
- **数据重置**（如有）：开发用清空 localStorage 按钮

不引入新依赖；UI 走 `Card` + 简单 `Button`（已有 shadcn 组件）。

### 3.5 修改 [`src/App.tsx`](file:///Users/ricky/AICode/hostelite/src/App.tsx)
- 删掉 `<Sidebar />` 引用
- 引入 `<TopBar />` 放到 `<div className="min-h-screen flex flex-col">` 的最外层
- 主内容区改为 `flex-1 overflow-auto`
- `activeTab` 的 switch 增加 `'assistant'` 分支（→ `<AssistantPanel />`）和 `'settings'` 分支（→ `<SettingsPanel />`）
- 删掉 `'dashboard' / 'grow' / 'staff' / 'migrate'` 4 个分支（不再独立渲染）
- 默认 `activeTab` 改为 `'assistant'`（保持「打开就是仪表盘」的行为）

### 3.6 修改 [`src/StaffContext.tsx`](file:///Users/ricky/AICode/hostelite/src/StaffContext.tsx#L11-L40)
`ROLE_TABS` 更新为新 id：
```ts
export const ROLE_TABS = {
  manager:  ['assistant', 'bedboard', 'shiftlog', 'checkin', 'settings'],
  reception:['assistant', 'bedboard', 'shiftlog', 'checkin'],
  cleaning: ['assistant', 'bedboard', 'shiftlog'],
} as const;
```
（如果其他地方还引用旧 id：`dashboard` / `grow` / `staff` / `migrate` 全部一起改。grep 确认无遗漏。）

### 3.7 修改 [`src/i18nContext.tsx`](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx#L5-L22)
- 新增 key：`sidebar.assistant` = "经营助手" / "Assistant"；`sidebar.settings` = "设置" / "Settings"
- 新增 key：`subnav.overview` / `subnav.grow` / `subnav.staff` / `subnav.migrate` / `subnav.general`
- 新增 key：`common.logout` / `common.version` / `common.language` / `common.theme` / `common.resetData`

### 3.8 不改的子组件
- `CopilotPanel.tsx`、`GrowPanel.tsx`、`StaffPanel.tsx`、`MigrationHub.tsx`、`BedBoard/*`、`CheckInPanel`、`ShiftLogPanel`：**内部完全不动**，仅在 `App.tsx` / `AssistantPanel.tsx` / `SettingsPanel.tsx` 里被包裹渲染。

## 4. Assumptions & Decisions

1. **顶部导航不做汉堡菜单**：5 个 tab 横排 + 横向滚动已经够用；引入汉堡会多一次点击。
2. **`assistant` 是默认 tab**：保持现在「打开就是 Copilot 仪表盘」的行为，减少用户感知变化。
3. **子 tab 用顶部 sub-tab 切换条**，不用左侧 sub-nav 或右侧抽屉：和顶部主导航视觉一致。
4. **`'settings'` 这个 id 同时承担权限过滤**（不向 reception/cleaning 暴露员工管理）：因为 `Settings` 内部有「员工」「迁移」等敏感项，把整个 `settings` tab 隐藏比只隐藏子 tab 更安全。
5. **「通用」内的「登出」**：调用与 `LoginScreen` 退出逻辑一致的代码（搜 `localStorage` 写入 + `useStaff` 状态清理）。
6. **`TopBar` 不引入 react-router**：保持现有用 `useState` 管 active tab 的方案，结构最小改动。
7. **桌面/移动端断点**：`md:flex` 横向布局，更小屏 fallback `overflow-x-auto`。

## 5. Verification Steps

1. **TypeScript**：`npx tsc --noEmit` 通过
2. **HMR 后浏览器验证**（[http://localhost:3000/](http://localhost:3000/)）：
   - 顶部出现 5 个 tab，顺序：经营助手 / 床位看板 / 前台入住 / 交接班日志 / 设置
   - 默认落在「经营助手 → 概览」（原 Copilot 仪表盘）
   - 切到「经营助手 → 获客增长」→ 5 个子 tab（主页/CRM/上座率/转介绍/定价）正常切换
   - 切到「设置」→ 看到「员工管理 / 数据迁移 / 通用」3 个子 tab
   - 「通用」里：语言切换生效（界面文字变化）、登出跳回登录页、版本号显示
3. **角色权限**：
   - 用 manager 账号登录 → 5 个 tab 全可见
   - 用 reception 登录 → 看到 4 个 tab（无「设置」）
   - 用 cleaning 登录 → 看到 3 个 tab（无「设置」无「前台入住」）
4. **Playwright 回归脚本**（参考 [.trae/diag_white_screen.py](file:///Users/ricky/AICode/hostelite/.trae/diag_white_screen.py)）：登录后逐个 tab 截图，确保无白屏/无 JS 报错。
5. **控制台无 React 错误**：hook 顺序、unmounted 组件更新、key 重复等。
6. **localStorage 兼容性**：旧版本的 `bunkdesk_state_v1` 数据不被破坏（这次只改 UI，不动 context/persistence 逻辑）。
