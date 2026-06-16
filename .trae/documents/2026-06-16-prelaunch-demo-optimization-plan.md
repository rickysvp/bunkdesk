# BunkDesk 上线 Demo 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 BunkDesk 从当前开发状态优化至可正式上线演示的 Demo 标准，修复关键 bug、补齐 i18n、完善交互细节、增强数据健壮性。

**Architecture:** 在现有 React 19 + TypeScript + TailwindCSS 4 + shadcn/ui 架构上，逐模块修复和优化。不引入新依赖，不改变整体架构，只做质量提升。

**Tech Stack:** React 19 + Vite 6 + TypeScript + TailwindCSS 4 + shadcn/ui + date-fns + motion/react + @dnd-kit

**Verification gate:** `npx tsc --noEmit` 必须在每个 Task 后通过。运行目录：`/Users/ricky/AICode/hostelite`

---

## 当前产品状态总览

### 已完成的核心功能
| 模块 | 状态 | 说明 |
|------|------|------|
| 登录 | ✅ 可用 | 员工选择 + PIN 码 |
| 落地页 | ✅ 可用 | 完整营销页 |
| 前台入住 | ✅ 可用 | Walk-in 表单 + iCal 导入 + 床位分配 + v1.6.1 排版优化 |
| 床位看板 | ✅ 可用 | 时间线 + 拖拽 + 筛选 + 清洁模式 |
| 房间管理 | ✅ 可用 | 房间/床位 CRUD |
| 交接班日志 | ✅ 可用 | 添加/解决/指派 |
| 日历视图 | ✅ 可用 | 时间线 + 快速预订 |
| 预定管理 | ✅ 可用 | 列表 + 状态 |
| 直订引擎 | ✅ 可用 | 4 步预订流程 |
| 青旅主页 | ✅ 可用 | 模板 + 编辑 + 发布 |
| 客人 CRM | ✅ 可用 | 搜索 + 标签 + 召回 |
| 经营助手 | ✅ 可用 | 今日概览 + 获客工具 |
| 推荐计划 | ✅ 可用 | 生成码 + 使用 |
| 收益优化 | ✅ 可用 | 定价建议 + 促销 |
| 空床动作 | ✅ 可用 | 长住折扣 + 尾房 + 召回 |
| 员工管理 | ✅ 可用 | CRUD + 角色分配 |
| 数据迁移 | ✅ 可用 | CSV + iCal |
| i18n | ✅ 可用 | 中英双语 |
| 数据持久化 | ✅ 可用 | localStorage + 版本迁移 |

### 需要优化的问题（按优先级分类）

---

## P0 — 关键 Bug（必须修复，否则 Demo 不可用）

### 1. 硬编码价格 `DEFAULT_PRICE = 85`
- **文件**: `src/components/CheckInPanel.tsx:23`
- **问题**: Walk-in 创建客人时 `totalAmount = calculatedNights * DEFAULT_PRICE`，但实际房间价格可能是 $90、$100 等。价格应从选定的房间/床位获取。
- **影响**: 所有 Walk-in 客人的金额计算错误
- **修复**: 从 rooms 数据中获取实际价格，或使用房间均价

### 2. 状态栏 "unpaid" 硬编码英文
- **文件**: `src/components/CheckInPanel.tsx:543`
- **问题**: `$${selectedGuest.totalAmount ?? (selectedGuest.nights * DEFAULT_PRICE)} unpaid` — "unpaid" 未走 i18n
- **影响**: 中文界面下显示英文 "unpaid"
- **修复**: 使用 `t('checkin.unpaid')` 替换

### 3. 团订金额计算硬编码 ¥85
- **文件**: `src/i18nContext.tsx:592, 1554`
- **问题**: `autoCalc: "Auto: members × nights × $85"` / `"自动计算: 人数 × 晚数 × ¥85"` — 价格硬编码在 i18n 字符串中
- **影响**: 价格变动时文案不会自动更新
- **修复**: 使用参数化 i18n：`"Auto: members × nights × {price}"`

### 4. 床位分配 Dialog 默认价格硬编码 85
- **文件**: `src/components/BedBoard/Dialogs.tsx:686, 692`
- **问题**: `const [price, setPrice] = React.useState(85)` 和 `setPrice(85)`
- **影响**: 新建预订时价格不正确
- **修复**: 从房间数据获取实际价格

### 5. 收益优化定价建议硬编码
- **文件**: `src/components/RevenueBoost.tsx:25`
- **问题**: `{ key: "weekend", current: 85, suggested: 90, change: 6 }` — 全部硬编码
- **影响**: 定价建议与实际价格脱节
- **修复**: 从 rooms 数据动态计算

---

## P1 — i18n 遗漏（中文界面下出现英文）

### 6. CheckInPanel 状态栏金额格式
- **文件**: `src/components/CheckInPanel.tsx:543`
- **问题**: `$${...} unpaid` 应使用 `formatCurrency` + `t('checkin.unpaid')`
- **修复**: 替换为 i18n + formatCurrency

### 7. BedBoard Dialogs 中的硬编码文本
- **文件**: `src/components/BedBoard/Dialogs.tsx`
- **问题**: 部分确认对话框文本可能未走 t()
- **修复**: 逐一检查并替换

### 8. BookingEngine 推荐码占位符
- **文件**: `src/components/BookingEngine.tsx:499`
- **问题**: `placeholder="BUNKDESK-XXXX-XXX"` 硬编码
- **修复**: 使用 t() 或从配置获取

### 9. LandingPage 硬编码字符串
- **文件**: `src/components/LandingPage.tsx`
- **问题**: 落地页内容虽已大量 i18n 化，但可能存在遗漏
- **修复**: 逐一排查

---

## P2 — 交互与体验优化

### 10. Walk-in 表单缺少房间偏好选择
- **文件**: `src/components/CheckInPanel.tsx`
- **问题**: Walk-in 表单没有 roomPreference 选择，导致床位推荐无法基于偏好
- **修复**: 在 Stay 区域添加房间偏好 Select（Mixed/Female/Private）

### 11. 支付流程缺少确认
- **文件**: `src/components/CheckInPanel.tsx:548`
- **问题**: 点击"收取"按钮直接标记为已付，无确认对话框
- **影响**: 误触可能导致财务数据错误
- **修复**: 添加确认对话框

### 12. 退房缺少确认
- **文件**: `src/components/CheckInPanel.tsx` (Checked In tab)
- **问题**: 退房按钮直接执行，无确认
- **修复**: 添加确认对话框（GuestDetailModal 中已有，但 Checked In 列表中没有）

### 13. 编辑客人信息后无保存确认
- **文件**: `src/components/EditGuestInfoModal.tsx`
- **问题**: 修改后直接保存，无"保存成功"反馈
- **修复**: 添加 toast 或短暂提示

### 14. iCal 导入缺少错误提示优化
- **文件**: `src/components/ICalImport.tsx`
- **问题**: 网络错误或解析失败时的提示不够友好
- **修复**: 优化错误提示文案

### 15. 空状态优化
- **文件**: 多个组件
- **问题**: 部分列表为空时缺少引导性提示（如"点击上方按钮添加"）
- **修复**: 为关键空状态添加操作引导

---

## P3 — 数据健壮性

### 16. 日期边界处理
- **文件**: `src/utils/timelineEngine.ts`, `src/utils/bedRules.ts`
- **问题**: 日期解析未做防御性处理，非法格式可能导致崩溃
- **修复**: 添加 try-catch + 默认值

### 17. iCal 解析容错
- **文件**: `src/utils/icalParser.ts`
- **问题**: UID/SUMMARY 等属性未做空值处理
- **修复**: 添加空值检查和默认值

### 18. bedAllocator 空值防护
- **文件**: `src/utils/bedAllocator.ts`
- **问题**: reservation 数据结构未做类型检查
- **修复**: 添加空值检查

### 19. Guest 迁移空值防护
- **文件**: `src/utils/guestMigration.ts`
- **问题**: guest.name 为 null/undefined 时拼接会出错
- **修复**: 添加空值检查

### 20. bedPricing 空值防护
- **文件**: `src/utils/bedPricing.ts`
- **问题**: bed.bedType 为 null/undefined 时可能 NaN
- **修复**: 添加默认值

---

## P4 — Demo 数据与展示

### 21. Demo 数据日期动态化
- **文件**: `src/data.ts`
- **问题**: 已使用 `addDays(today, N)` 做相对日期，但部分客人入住日期可能已过期
- **修复**: 确保所有 demo 数据的日期相对于当前日期合理

### 22. Demo 数据缺少 v1.6.0 新字段回填
- **文件**: `src/data.ts`
- **问题**: 部分 demo 客人可能缺少 firstName/lastName/email/phone/idType 等新字段
- **修复**: 为所有 demo 客人补全新字段

### 23. 落地页截图/图片
- **文件**: `src/components/LandingPage.tsx`
- **问题**: 可能使用 placeholder 图片
- **修复**: 使用项目自带的图片生成 API

---

## P5 — 代码质量

### 24. 移除 console.warn
- **文件**: `src/HostelContext.tsx:171`
- **问题**: `console.warn('[bunkly] localStorage persist failed:', e)` — 项目名应为 BunkDesk
- **修复**: 修正为 BunkDesk 或移除

### 25. 统一货币符号
- **文件**: 多处
- **问题**: 部分地方用 `$`，部分用 `formatCurrency`，中文环境下应显示 `¥`
- **修复**: 全部统一使用 `formatCurrency`

### 26. 清理未使用的 import
- **文件**: 多个组件
- **问题**: 可能存在未使用的 import
- **修复**: 运行 lint 清理

---

## 实施任务分解

基于以上分析，将优化工作分为以下可独立执行的任务：

### Task 1: 修复硬编码价格（P0 #1 #4 #5）
替换 CheckInPanel、BedBoard/Dialogs、RevenueBoost 中的硬编码价格 85，改为从 rooms 数据动态获取。

### Task 2: 修复 i18n 遗漏（P0 #2 #3 + P1 #6 #7 #8）
修复 CheckInPanel 状态栏 "unpaid" 硬编码、团订金额文案参数化、BookingEngine 占位符等 i18n 问题。

### Task 3: 统一货币格式（P5 #25）
将所有 `$` 硬编码替换为 `formatCurrency` 调用，确保中文环境显示 ¥。

### Task 4: Walk-in 表单添加房间偏好（P2 #10）
在 Walk-in 表单 Stay 区域添加 roomPreference Select。

### Task 5: 关键操作添加确认对话框（P2 #11 #12）
为支付收取和退房操作添加确认对话框。

### Task 6: 数据健壮性加固（P3 #16-20）
为 timelineEngine、icalParser、bedAllocator、guestMigration、bedPricing 添加空值防护。

### Task 7: Demo 数据完善（P4 #21 #22）
确保所有 demo 数据日期合理、新字段完整回填。

### Task 8: 代码质量清理（P5 #24 #26）
修正 console.warn 项目名、清理未使用 import、运行 lint。

### Task 9: 版本升级至 v1.7.0 + 最终验证
Bump version、全量 tsc 验证、浏览器冒烟测试。
