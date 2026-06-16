# v1.8.0 — 移动优先适配 (Mobile-First Redesign)

## 1. Summary

将 BunkDesk 全面重构为**移动优先**产品：

1. **新增移动端底部 Tab Bar**（仅 < md 屏显示，桌面端隐藏）
2. **TopBar 桌面专属**（≥ md 屏显示，移动端隐藏）—— 解决 5 个 tab 在 375px 屏横向滚动发现性差的问题
3. **PWA 支持**（manifest + service worker，可安装到主屏）
4. **App 全模块响应式优化**（CheckIn / BedBoard / CRM / Assistant / Settings / ShiftLog / Landing）
5. **角色权限同步**（底部 Tab Bar 复用 `StaffContext.visibleTabs`，经理 5、前台 4、保洁 3）

预期成果：在 iPhone SE (375px) / iPhone 14 (390px) / iPad Mini (768px) 三个目标断点上达到**单手可操作**的体验。

## 2. Current State Analysis

### 2.1 现有响应式盘点

| 文件 | 现状 | 问题 |
|------|------|------|
| `App.tsx` (line 92-126) | `<div class="flex flex-col h-screen">` + TopBar + main | 主布局没问题，但 TopBar 在移动端挤 |
| `TopBar.tsx` (line 79) | `nav` 用 `overflow-x-auto` | 5 个 tab 在 375px 全靠横滑，发现性差 |
| `LandingPage.tsx` | 大部分 section 已有 `grid-cols-1 sm:...` | Hero mockup `hidden lg:block` 在 1024px 以下完全不可见；CTA 按钮 `flex-wrap` 在 320px 会断行 |
| `CheckInPanel.tsx` (line 485, 514) | `grid-cols-2` | **客人详情联系/证件区未做响应式** —— 375px 屏挤 |
| `CheckInPanel.tsx` (line 230) | `w-full md:w-72` | OK 但内部按钮文字可能溢出 |
| `CheckInPanel.tsx` (line 621) | 床位卡 `min-h-[150px]` + 多个 tag | 移动端太挤，需要更紧凑的卡片 |
| `CheckInPanel.tsx` (line 187) | 成功提示 `fixed top-4 left-1/2 -translate-x-1/2` | 宽度未指定，移动端可能贴边 |
| `BookingEngine.tsx` (line 293, 452) | `grid-cols-2 gap-4` | 日期/电话区在 320px 偏紧 |
| `BookingEngine.tsx` (line 257) | 4 步骤指示器 | 9px 圆 + 横线在 320px 容易溢出 |
| `GuestCRM.tsx` (line 64) | `grid-cols-3 gap-3` | **统计卡未做响应式** —— 3 张卡在 375px 严重挤压（icon + 2 行文字）|
| `GuestCRM.tsx` (line 197) | `flex flex-wrap gap-1 max-w-[200px]` | tag 区固定 200px 在移动端可能挤压头像 |
| `AssistantPanel.tsx` (line 61) | `overflow-x-auto` | OK，但 `mb-4 md:mb-6` 可优化 |
| `RoomsSection.tsx` (line 59) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | OK 已适配 |
| `index.html` (line 5) | `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` | 缺 theme-color / apple-touch-icon / manifest link |
| `vite.config.ts` | 无 PWA plugin | 缺 |
| `StaffContext.tsx` (line 12-23) | `ROLE_TABS` 已按角色过滤 | ✅ 可直接复用 |

### 2.2 触摸/字体规范违反

- `text-[10px]` / `text-[11px]` 出现在 CheckInPanel / GuestCRM 大量位置 —— < 12px 不符合 Apple HIG (建议 11px 最小) 和 Material Design (建议 12sp 最小)
- `h-7` / `h-5` 按钮（如 CheckInPanel line 546, 563, 666）—— 远低于 44x44 iOS 触摸目标
- `gap-1.5` / `gap-1` 在表单上间距过窄

### 2.3 关键决策（用户已确认）

1. **移动导航**：底部 Tab Bar (iOS 风格) + 顶部 TopBar 仅桌面
2. **PWA**：需要
3. **范围**：App 全部 + Landing
4. **角色权限**：经理 5 / 前台 4 / 保洁 3（与现有 `ROLE_TABS` 一致）

## 3. Proposed Changes

### 3.1 新增：移动端底部 Tab Bar

**新文件**：`src/components/BottomTabBar.tsx`

**职责**：
- 仅在 `< md` 屏（< 768px）显示，使用 `md:hidden` Tailwind 类
- 复用 `useStaff().visibleTabs` 过滤 tab 列表（与 TopBar 一致）
- 5 个 tab 固定布局：图标 + 标签，垂直堆叠
- 高 56-64px，吸底 (`fixed bottom-0 left-0 right-0`)，iOS safe area 适配
- 激活态：蓝色图标 + 蓝色文字，顶部 2px 蓝色指示线
- 包含底部 safe-area padding (`pb-[env(safe-area-inset-bottom)]`)

**复用模式**：
```ts
// 与 TopBar.tsx 第 31-37 行 TAB_CONFIG 共享（建议提取到 types.ts）
// 但在 BottomTabBar 中只取 icon + i18nKey，不含任何桌面专属逻辑
```

**关键代码骨架**：
```tsx
import { useStaff } from '../StaffContext';
import { LayoutDashboard, Grid, KeyRound, ClipboardList, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18nContext';
import { cn } from '@/lib/utils';

// 与 TopBar 的 TAB_CONFIG 完全一致，但只取 5 个核心 tab
const TAB_CONFIG = [
  { id: 'assistant', icon: LayoutDashboard, i18nKey: 'sidebar.assistant' },
  { id: 'bedboard',  icon: Grid,            i18nKey: 'sidebar.bedBoard' },
  { id: 'checkin',   icon: KeyRound,        i18nKey: 'sidebar.checkIn' },
  { id: 'shiftlog',  icon: ClipboardList,   i18nKey: 'sidebar.shiftLog' },
  { id: 'settings',  icon: Sparkles,        i18nKey: 'sidebar.settings' },
];

export function BottomTabBar({ activeTab, setActiveTab }: TopBarProps) {
  const { visibleTabs } = useStaff();
  const { t } = useTranslation();
  const tabs = TAB_CONFIG.filter(t => visibleTabs.includes(t.id));
  
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-zinc-200 pb-[env(safe-area-inset-bottom)]"
      role="tablist"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 gap-0.5 min-h-[56px] transition-colors",
                isActive ? "text-blue-600" : "text-zinc-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold tracking-tight">{t(tab.i18nKey)}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 bg-blue-600 rounded-full" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

**App.tsx 集成**（line 91-127）：
- 在 `<TopBar>` 后面添加 `<BottomTabBar>`
- `TopBar` 加 `hidden md:flex`（桌面显示）
- `BottomTabBar` 加 `md:hidden`（移动显示）
- main 内容区底部加 `pb-16 md:pb-0` 防止被 Tab Bar 遮挡
- CheckInPanel 已经有 `pb-20 md:pb-0` ，需要统一为 `pb-16` 与 Tab Bar 高度匹配

### 3.2 TopBar 桌面专属化

**修改**：`src/components/TopBar.tsx`
- 第 62-63 行 `<header>` 加 `hidden md:flex` 隐藏整个 TopBar 在移动端
- 不需要删除任何内部响应式代码（`hidden sm:inline` 保留给桌面端小屏兜底）
- 验证：375px 屏完全隐藏，≥ 768px 显示

### 3.3 PWA 支持

**新增文件**：
- `public/manifest.json`（Web App Manifest）
- `public/icon-192.png`、`public/icon-512.png`（PWA 图标，使用占位 / 品牌字母 "B"）
- `index.html` head 增加：theme-color、apple-touch-icon、manifest link

**修改**：
- `package.json`：增加 `vite-plugin-pwa` 依赖
- `vite.config.ts`：注册 `VitePWA` 插件（`registerType: 'autoUpdate'`、workbox 配置最小化）
- `index.html` (line 5)：在 viewport meta 后增加：
  ```html
  <meta name="theme-color" content="#18181b" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="BunkDesk" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  ```

**manifest.json 内容**：
```json
{
  "name": "BunkDesk — Bed-level Hostel Management",
  "short_name": "BunkDesk",
  "description": "Visual bed board, direct booking page, and built-in CRM for small hostels",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#18181b",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

**图标生成**：
- 不引入额外工具，直接在 `public/icon-192.png` 等位置放置 192x192 / 512x512 的 PNG
- 可用 ImageMagick / sips / 在线工具生成一个带 "B" 字样的简单图标（深色背景 + 白色 B）
- 不引入资源：使用最简方式（或者从 [hero mockup 渐变] 复用 logo 颜色）

### 3.4 落地页 (LandingPage) 移动端优化

**修改**：`src/components/LandingPage.tsx`

**Hero 区 (line 110-184)**：
- 调整 H1 字号：`text-4xl md:text-6xl` → `text-3xl sm:text-4xl md:text-6xl`
- 副标题 `text-lg` → `text-base sm:text-lg` (line 137)
- HeroMockup 移动端策略：可考虑保留 `hidden lg:block`（避免移动端首屏太重），或新增一个简化版移动端 mockup
  - **决策**：保持 `hidden lg:block`，让移动端首屏聚焦 CTA + 文案
- CTA 按钮 `flex-wrap gap-3` (line 142) 改为 `flex-col sm:flex-row` 全宽更友好
  - 实际上 `flex-wrap` 也能用，但移动端两个按钮左右各一看起来 OK；先保持现状
- "Social proof" 区域 `mt-10` (line 162) 移动端改 `mt-6`

**Reality Check (line 187-247)**：
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` 已 OK
- CardContent `p-6` → `p-4 sm:p-6` 让小屏更紧凑

**BunkDesk Way (line 249-313)**：
- `grid md:grid-cols-2` OK 移动端单列
- 卡片内 `p-7` → `p-5 sm:p-7`

**Features (line 315-382)**：
- `grid md:grid-cols-2` OK
- `grid-cols-2 sm:grid-cols-4` 8 个 feature chip 已 OK

**Bed-Level Gap (line 384-454)**：
- `grid md:grid-cols-2` OK
- 内部 BedGridOccupied 已有 `grid-cols-3` 在 320-375 OK

**How BunkDesk works (line 456-512)**：
- `grid sm:grid-cols-2 lg:grid-cols-4` 已 OK
- CardContent `p-6` → `p-4 sm:p-6`

**Pricing (line 514-605)**：
- `grid md:grid-cols-2` OK
- 卡片 `p-7` → `p-5 sm:p-7`

**Footer (line 645-656)**：
- `flex flex-col sm:flex-row` OK

### 3.5 CheckInPanel 移动端优化

**修改**：`src/components/CheckInPanel.tsx`

**关键修复**：
1. **line 485** `<div className="grid grid-cols-2 gap-x-5">` → `<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">`（联系区）
2. **line 514** `<div className="grid grid-cols-2 gap-x-5">` → `<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">`（证件区）
3. **line 422-423** 提交按钮 `w-full sm:w-auto` 已 OK，加 `min-h-[44px]` 触摸标准
4. **line 546, 563** `h-5 text-[9px] px-2` 按钮改为 `h-9 text-xs px-3 min-w-[80px]`（44px 触摸）
5. **line 621** 床位卡 `min-h-[150px]` → 移动端 `min-h-[140px]`，内部 padding 紧凑
6. **line 187-198** 成功提示：增加 `max-w-[calc(100vw-2rem)]` 和 `text-sm` 限制
7. **line 230** `w-full md:w-72` 客人列表：移动端最大高度限制 `max-h-[280px] md:max-h-none` 防止过长

**Header bar 移动端**：
- line 202 `flex flex-col sm:flex-row` 已 OK
- line 203 子 tab 容器：在小屏可能 3 个 tab 挤，`flex` 加 `overflow-x-auto` + `scrollbar-hide`
- line 219 搜索框 `w-full sm:w-64` 已 OK

**Walk-in 表单（line 271-426）**：
- `p-5` → `p-4 sm:p-5` 
- 按钮 `h-11 px-6` 保持（44px+）
- form `space-y-4` 保持
- `grid-cols-1 sm:grid-cols-3` 已 OK

### 3.6 GuestCRM 移动端优化

**修改**：`src/components/GuestCRM.tsx`

**关键修复**：
1. **line 64** `<div className="grid grid-cols-3 gap-3">` → `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">` （**最高优先级**）
2. **line 65-97** 统计卡内部 `p-4` → `p-3 sm:p-4` 
3. **line 101** `flex flex-col sm:flex-row gap-3` 已 OK
4. **line 197** `max-w-[200px]` → `max-w-[140px] sm:max-w-[200px]`
5. **line 207-214** tag 和 icon 区：移动端可考虑隐藏 icon 列，只显示 tag（节省空间）
6. **line 262** `<div className="p-5 grid grid-cols-3 gap-3">` (modal 内统计) → modal 内 OK 不用改（modal 在小屏也是 max-w-md w-full）

### 3.7 AssistantPanel 移动端优化

**修改**：`src/components/AssistantPanel.tsx`
- line 61 `mb-4 md:mb-6` 已 OK
- sub-tab bar `overflow-x-auto` 已 OK
- 内部 `AssistantPanelToday` / `AssistantPanelGrowth` 需要检查是否有固定 `grid-cols-X` 未响应式 —— 需单独检查

**Action**：在主修改时同步检查这两个子组件（`AssistantPanelToday.tsx`、`AssistantPanelGrowth.tsx`）是否有移动端问题，列入 Todo。

### 3.8 BookingEngine 移动端优化

**修改**：`src/components/BookingEngine.tsx`
- 整个页面 `max-w-xl px-4 py-6` 已 OK
- 步骤指示器 (line 257-281)：在 < 360px 可能挤，缩小 `h-9 w-9` → `h-8 w-8`，连接线 `w-8` → `w-4 sm:w-8`
- `grid-cols-2` (line 293, 452) 已 OK 但可改为 `grid-cols-1 sm:grid-cols-2` 更安全

### 3.9 SettingsPanel / ShiftLog / BedBoard 快速审计

**Action**：本次主改 BottomTabBar + PWA + LandingPage + CheckIn + GuestCRM，**其他模块只做最小 touch**：
- BedBoard 已在 calendar 模式有响应式（需快速验证 320px 不破）
- ShiftLog / SettingsPanel 只验证在 BottomTabBar 下能正常显示，不做深度修改

### 3.10 触摸目标 & 字体全局审计

- 全局 `Button` (shadcn) 已是 `min-h-[40px]`，OK
- 关键页面（CheckIn）所有 `h-5/h-7` 按钮升到 `h-9 min-w-[44px]`
- 全局 `text-[10px]` → `text-xs`（11px → 12px）的位置逐个评估

## 4. Assumptions & Decisions

1. **不重新设计整体视觉风格**，只做响应式 + 底部 Tab Bar + PWA。视觉风格保持 iOS 风格的 blue-600 + zinc 中性色。
2. **角色权限不动**，BottomTabBar 直接复用 `useStaff().visibleTabs`，与 TopBar 行为完全一致。
3. **iOS safe area**：底部 Tab Bar 加 `pb-[env(safe-area-inset-bottom)]` 适配 iPhone X+ 底部 home indicator。
4. **图标资源**：使用纯 CSS/字符生成的占位图标（不引入额外工具链）。如需正式图标可后续优化。
5. **PWA 图标**：先生成 192x192 + 512x512 简单 PNG（深色背景 + 白色 "B" 字符），后续替换为正式品牌图标。
6. **service worker 策略**：`registerType: 'autoUpdate'`，最小 cache（HTML/JS/CSS），不缓存 API 数据（localStorage 已有离线持久化）。
7. **断点策略**：沿用 Tailwind 默认断点，`md` (768px) 作为"移动/桌面"分水岭。
8. **不在本版本做**：iOS/Android 原生封装、HAM 菜单 Drawer、底部 Sheet、Swipe 手势（这些是 v1.8.x 后续迭代）。
9. **BottomTabBar 与 TopBar 的同步**：两个组件的 `TAB_CONFIG` 暂时各自定义（解耦），但要求 ID 和 i18n key 完全一致。后续可抽取到 `types.ts`。

## 5. Files to Create / Modify

### 新建
1. `src/components/BottomTabBar.tsx` —— 移动端底部导航
2. `public/manifest.json` —— PWA manifest
3. `public/icon-192.png` —— PWA 图标 192x192
4. `public/icon-512.png` —— PWA 图标 512x512
5. `.trae/documents/2026-06-16-mobile-first-redesign-plan.md` —— 本计划文件

### 修改
1. `src/App.tsx` —— 集成 BottomTabBar，调整 main 容器 padding
2. `src/components/TopBar.tsx` —— 加 `hidden md:flex`
3. `index.html` —— 增加 PWA meta 标签
4. `vite.config.ts` —— 注册 vite-plugin-pwa
5. `package.json` —— 增加 vite-plugin-pwa 依赖
6. `src/components/LandingPage.tsx` —— Hero H1 字号、CTA 按钮、Card padding 微调
7. `src/components/CheckInPanel.tsx` —— 联系/证件区 `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`、按钮 h-5/h-7 → h-9、成功提示 max-width
8. `src/components/GuestCRM.tsx` —— `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`、tag max-w 缩小
9. `src/components/AssistantPanel.tsx` —— 微调
10. `src/components/AssistantPanelToday.tsx` —— 检查并修复
11. `src/components/AssistantPanelGrowth.tsx` —— 检查并修复
12. `src/components/BookingEngine.tsx` —— 步骤指示器 + grid-cols-2 移动端加固
13. `src/version.ts` —— v1.7.5 → v1.8.0

## 6. Implementation Order (Todo List)

```
1. 安装 vite-plugin-pwa 依赖
2. 创建 public/manifest.json + 占位 PWA 图标
3. 配置 vite.config.ts 启用 PWA
4. 修改 index.html 增加 PWA meta + viewport 完善
5. 创建 src/components/BottomTabBar.tsx
6. 修改 src/App.tsx 集成 BottomTabBar + 调整 main padding
7. 修改 TopBar.tsx 加 hidden md:flex
8. 修复 GuestCRM grid-cols-3
9. 修复 CheckInPanel 内部 grid-cols-2 + 按钮 h-5/h-7
10. 修复 LandingPage Hero + 卡片 padding
11. 修复 BookingEngine 步骤指示器 + grid-cols-2
12. 审计 AssistantPanel 子组件
13. 更新 version.ts → v1.8.0
14. 运行 npm run lint (tsc --noEmit) 验证
15. 启动 dev server，提供访问链接
16. 验证 3 个断点：375px / 768px / 1280px
17. 提交到 git + 推送 + 打 tag v1.8.0
```

## 7. Verification

### 编译验证
- `npm run lint` (`tsc --noEmit`) 必须通过
- 无新增 console error / warning

### 视觉验证（手动 / Playwright）
启动 `npm run dev` 后在浏览器 DevTools 切换设备模式验证：
- **iPhone SE (375 × 667)**：所有页面无横向滚动、底部 Tab Bar 显示且高 56px、所有按钮可点击
- **iPhone 14 (390 × 844)**：同上
- **iPad Mini (768 × 1024)**：底部 Tab Bar 隐藏、TopBar 显示
- **Desktop (1280 × 800)**：TopBar 显示，5 个 tab 全部可见

### 功能验证
- 切换 3 个角色（经理 / 前台 / 保洁），底部 Tab Bar 数量正确（5 / 4 / 3）
- 各个 tab 间切换无白屏、无延迟
- 客人详情在 375px 屏联系区/证件区纵向排列不挤
- GuestCRM 统计卡在 375px 屏纵向堆叠 3 张
- PWA：Chrome DevTools → Application → Manifest 显示正常，Lighthouse PWA 检查通过

### 回归验证
- 桌面端（≥ 768px）原有所有功能（v1.7.0~v1.7.5）正常
- 床位看板、日历拖拽、价格同步等核心功能不受影响
- localStorage 持久化 + i18n EN/中切换正常
