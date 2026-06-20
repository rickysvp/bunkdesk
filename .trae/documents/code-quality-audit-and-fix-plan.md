# BunkDesk 代码质量深度检测报告与分批修复计划

## Summary

基于 4 个并行探索代理对 BunkDesk v1.8.2 代码库的全面审查，覆盖**数据安全与完整性、交互体验与场景覆盖、UI 视觉一致性、可访问性 a11y** 四个维度。共发现 **42 个问题**（Critical 9 / High 13 / Medium 14 / Low 6）。

本计划采用**分批修复策略**，按主题划分为 4 个批次，每批可独立执行和发布：
- **Batch 1（v1.8.3）**：数据安全止血 — 修复 9 个 Critical
- **Batch 2（v1.9.0）**：交互体验与场景补全 — 修复 13 个 High
- **Batch 3（v2.0.0）**：UI 视觉重设计（旅行/住宿行业风格）— 修复 14 个 Medium
- **Batch 4（v2.1.0）**：a11y 与架构优化 — 修复 6 个 Low

---

## Part A: 检测报告

### 维度一：数据安全与完整性（9 Critical + 3 High）

#### Critical 问题

**[C1] localStorage 写入失败静默吞错**
- 位置：`src/HostelContext.tsx:177-181`
- 问题：`QuotaExceededError` 仅 `console.warn`，无用户可见提示。配额满后所有后续操作不保存，刷新后丢失，用户完全无感知。
- 影响：数据丢失

**[C2] JSON parse 失败静默回退到演示数据**
- 位置：`src/HostelContext.tsx:13-16, 48-58`
- 问题：`catch { return fallback }` 静默回退到 `INITIAL_*` 演示数据。若存储损坏，真实业务数据被演示数据覆盖，用户不会被告知。
- 影响：数据丢失

**[C3] 多标签页并发写入丢数据**
- 位置：`src/HostelContext.tsx`（主 state 无 `storage` 事件监听）
- 问题：仅 `i18nContext.tsx:2201` 有 storage 事件监听，主 state 无同步。两个标签页同时编辑，后保存的覆盖先保存的，last-write-wins 丢数据。
- 影响：数据丢失

**[C4] 员工 PIN 明文存储 + 默认弱密码 + 无锁定**
- 位置：`src/StaffContext.tsx:50`（明文）、`src/data.ts:493-496`（默认 "1234"）、`src/StaffContext.tsx:55-62`（无尝试限制）
- 问题：PIN 以明文 JSON 存储，4 个初始员工 PIN 全是 "1234"，登录无尝试次数限制/锁定，可暴力破解（仅 10000 种组合）。
- 影响：安全漏洞

**[C5] `migrateGuestsDeep` 死代码 — 旧版客人数据不迁移**
- 位置：`src/utils/guestMigration.ts`（定义）、`src/HostelContext.tsx:7`（import 但未调用）
- 问题：迁移函数已编写但从未调用，pre-v1.7.0 客人数据（含 `name` 未拆分、废弃字段 `dob/policeConsent`）不会被迁移。
- 影响：数据不一致

**[C6] `dob` 字段类型不一致 — UI 存在但保存静默失败**
- 位置：`src/types.ts:16-41`（Guest 无 `dob`）、`src/HostelContext.tsx:135`（接口含 `'dob'`）、`src/HostelContext.tsx:706`（实现不含 `'dob'`）、`src/components/BedBoard/Dialogs.tsx:289-290`（UI 调用）
- 问题：客人详情有生日编辑 UI，blur 后调用 `updateGuestField(id, 'dob', value)`，但实现不匹配 `'dob'`，静默失败。用户以为已保存，实际未保存。
- 影响：功能失效 + 用户困惑

**[C7] `@google/genai` 死代码依赖**
- 位置：`package.json:19`（声明 `^2.4.0`，实际安装 2.8.0）、`src/` 无任何 import
- 问题：AI 依赖完全未使用，增加包体积（genai + 依赖链），`CLAUDE.md` 文档误导声称有 Gemini 集成。`copilotEngine.ts` 实为纯规则启发式。
- 影响：包体积膨胀 + 文档误导

**[C8] 删除房间/床位不检查 reservations — 预订数据丢失**
- 位置：`src/components/RoomsSection.tsx:133-137`（删房间仅检查 occupied）、`src/components/BedBoard/Dialogs.tsx:617`（删床位无任何检查）
- 问题：有未来预订的房间可被删除，有 guest 或 reservations 的床位可被直接删除，关联数据丢失。
- 影响：数据丢失

**[C9] 无数据备份/导出 — 重置即永久丢失**
- 位置：`src/components/GeneralSection.tsx:39-57`
- 问题：无 "导出 JSON"、"下载备份" 功能。"重置数据" 仅 `window.confirm` 确认，无二次验证，永久删除所有数据且无备份可恢复。
- 影响：数据不可恢复

#### High 问题

**[H1] `copilotEngine` 的 `TODAY` 过期**
- 位置：`src/utils/copilotEngine.ts:30`（模块级 `const TODAY = new Date()`）
- 问题：应用开着过夜，第二天 "今日入住率" 仍显示昨天数据，所有 insight 失效。
- 影响：数据错误

**[H2] `assignArrival` 闭包陈旧**
- 位置：`src/HostelContext.tsx:360-362`
- 问题：用 `prevRooms` 查找 guest 但 fallback 到外部 `guest` 变量，可能用到陈旧数据。
- 影响：数据不一致

**[H3] `addPartialPayment` 不拦截超额支付**
- 位置：`src/HostelContext.tsx:669-688`
- 问题：仅检查 `amount > 0`，不拦截超额支付，可能导致 `paidAmount > totalAmount`。
- 影响：数据错误

---

### 维度二：交互体验与场景覆盖（5 High + 4 Medium）

#### High 问题

**[H4] 3 种确认弹窗风格不统一**
- 位置：`src/components/CheckInPanel.tsx:567,768`（`window.confirm`）、`src/components/GeneralSection.tsx:41`（`window.confirm`）、`src/components/BedBoard/Dialogs.tsx`（shadcn Dialog）、`src/components/AutoAssignConfirmDialog.tsx`（自建 motion）
- 问题：同一产品内 3 种确认方式（原生、shadcn、自建），用户认知负担大，移动端体验差，不可 i18n。

**[H5] 无 toast 系统 — 反馈散落且缺失**
- 位置：全项目 grep `toast|Toast|notification|notify` 零结果
- 问题：无统一 toast。`settlePayment`、`scanPassport`、`EditGuestInfoModal` 保存、`extendStay`、`addCharge` 均无成功提示。错误反馈方式分散（inline error、banner、console）。

**[H6] 无 loading 状态 — 大部分操作无反馈**
- 位置：仅 `src/components/ICalImport.tsx:123` 和 `src/components/MigrationHub.tsx` 有 loading
- 问题：`addArrival`、`assignArrival`、`autoAssignBed`、`settlePayment`、`checkoutGuest`、`BookingEngine.handleConfirm` 均无 loading，用户可能重复点击。

**[H7] 退房/删除/拖拽不可撤销**
- 位置：`src/HostelContext.tsx:491-522`（退房）、`src/components/BedBoard/Dialogs.tsx:617`（删床位）、`src/HostelContext.tsx`（moveGuest）
- 问题：退房后客人从 arrivals 移除、床位变 cleaning，无 undo。误点需重新走 walk-in 流程。删除床位/房间、拖拽换房均无 undo。

**[H8] 无删除 arrivals 功能 — no-show 客人永久滞留**
- 位置：`src/HostelContext.tsx`（搜索 `deleteArrival|removeArrival` 无匹配）
- 问题：Pending 列表中的客人无法删除（no-show、误录），只能等待入住或退房，列表越来越乱。

**[H9] QuickBookingModal 绕过护照校验**
- 位置：`src/components/QuickBookingModal.tsx:93`（`passportScanned: false`）→ `occupyBed` 直接入住
- 问题：绕过 `CheckInPanel` 的 `!selectedGuest.passportScanned` 校验，安全合规风险。

**[H10] BookingEngine 团队入住绕过评分**
- 位置：`src/components/BookingEngine.tsx:164-188`（直接 `occupyBed(emptyBeds[i].id, ...)`）
- 问题：不调用 `scoreBeds`，无法智能排房，团队可能被分散到不同房间。

**[H11] `FilterBar` 日期范围显示 bug**
- 位置：`src/components/BedBoard/FilterBar.tsx:49`
- 问题：`format(startDate, 'MMM d')} – {format(startDate, 'MMM d')}` 起止日期相同，应为 `startDate` 到 `endDate`。

#### Medium 问题

**[M1] Checked In 表格移动端未响应式**
- 位置：`src/components/CheckInPanel.tsx:729-775`
- 问题：`whitespace-nowrap` 导致移动端水平溢出，表格不可用。

**[M2] Notes 输入无防抖**
- 位置：`src/components/CheckInPanel.tsx:573-574`
- 问题：每次按键都调 `updateArrival`，频繁触发 state 更新 + localStorage 写入（虽有 300ms 防抖但仍频繁）。

**[M3] BedBoard 时间轴移动端拥挤**
- 位置：`src/components/BedBoard/index.tsx:51-61`（`MIN_DAY_WIDTH = 56`）
- 问题：375px 屏仅能显示约 3-4 天，需横滑，无 pinch-zoom。

**[M4] AutoAssignConfirmDialog 有 drag handle 视觉但未实现拖拽关闭**
- 位置：`src/components/AutoAssignConfirmDialog.tsx`
- 问题：顶部 drag handle 仅装饰，未实现实际拖拽关闭手势。

---

### 维度三：UI 视觉一致性（8 Medium + 2 Low）

#### Medium 问题

**[M5] 弹窗风格三重不统一**
- 位置：`AutoAssignConfirmDialog`（`rounded-t-3xl`/`rounded-2xl`）、`EditGuestInfoModal`（`rounded-2xl`）、`QuickBookingModal`（`rounded-2xl`）、shadcn Dialog（`rounded-xl`）
- 问题：圆角、背景遮罩（`bg-black/40`/`bg-black/30`/`bg-black/10`）、关闭按钮位置（`top-2 right-2`/`top-3 right-3`/`p-4 border-b`）三种风格混用。

**[M6] 颜色硬编码未走 token**
- 位置：`src/App.tsx:93`（`bg-[#F7F7F7]`）、`src/components/TopBar.tsx:63`（`bg-[#EBEBEB]`）、多处 `text-blue-600`/`bg-emerald-600`/`bg-amber-50`
- 问题：业务层大量硬编码颜色，未走 `--primary`/`--destructive` token，深色模式无法适配。

**[M7] 深色模式 token 定义但未启用**
- 位置：`src/index.css:87-119`（完整 `.dark` 变量）、全项目无 `.dark` class 应用
- 问题：深色模式 token 闲置，无主题切换 UI。

**[M8] 字体配置不一致 — Geist 安装未用，Inter 走 CDN**
- 位置：`package.json:18`（`@fontsource-variable/geist ^5.2.9`）、`src/index.css:1`（Google Fonts CDN 加载 Inter）
- 问题：Geist 字体包已安装但从未引用，Inter 走 Google Fonts CDN，PWA 离线时字体失效。

**[M9] 触摸目标不达标**
- 位置：`src/components/CheckInPanel.tsx:550`（扫描按钮 `h-5`）、`src/components/CheckInPanel.tsx:567`（收款按钮 `h-8 sm:h-7`）、`src/components/BedBoard/Dialogs.tsx:616`（删除按钮 `p-1`）、`src/components/BedBoard/FilterBar.tsx:41,51`（日期导航 `h-7 w-7`）
- 问题：低于 Apple HIG 44px / Material 48dp 触摸标准。

**[M10] 字号过小**
- 位置：多处 `text-[9px]`、`text-[10px]`、`text-[11px]`（CheckInPanel、Dialogs、TimelineGrid）
- 问题：低于 Apple HIG 11px / Material 12sp 最小值，可读性差。

**[M11] 圆角/阴影/padding 混乱**
- 问题：`rounded-xl`/`rounded-2xl`/`rounded-lg`/`rounded-3xl`/`rounded-[16px]` 混用；`shadow-sm`/`shadow-md`/`shadow-lg`/`shadow-2xl` 混用；卡片 `p-3`/`p-4`/`p-5`/`p-6`/`p-7`/`p-8` 无规律。

**[M12] 空状态简陋**
- 位置：19 处空状态（如 `CheckInPanel.tsx:267`、`BedBoard/index.tsx:461`）
- 问题：全部为单行灰色文字，无图标、无插画、无 CTA 按钮，体验单调。

#### Low 问题

**[L1] ErrorBoundary 纯英文 + 深色风格断裂**
- 位置：`src/components/ErrorBoundary.tsx`
- 问题：使用 `bg-zinc-950` 深色 + 纯英文文案，与主应用浅色 + i18n 不一致；错误信息直接展示 `error.message`（可能泄露技术细节）。

**[L2] Sheet/Avatar/HoverCard 组件已安装但未使用**
- 位置：`components/ui/sheet.tsx`、`components/ui/avatar.tsx`、`components/ui/hover-card.tsx`
- 问题：增加包体积却无收益，或应移除或应替换自建弹窗以统一风格。

---

### 维度四：可访问性 a11y（4 Medium + 2 Low）

#### Medium 问题

**[M13] aria 缺失 — 弹窗无 role/aria-modal**
- 位置：`src/components/EditGuestInfoModal.tsx`、`src/components/QuickBookingModal.tsx`（无 `role="dialog"`、无 `aria-modal`、无 `aria-labelledby`）
- 问题：仅 `AutoAssignConfirmDialog` 有合规 aria，其他自建弹窗屏幕阅读器无法识别。图标按钮（关闭 X、删除）多数无 `aria-label`。

**[M14] 无焦点陷阱 — Tab 键可跳出弹窗**
- 位置：`EditGuestInfoModal`、`QuickBookingModal`（自建 `motion.div`）
- 问题：弹窗打开后 Tab 键可跳到背景元素，弹窗关闭后焦点未恢复到触发元素。

**[M15] 无键盘拖拽 — KeyboardSensor 未启用**
- 位置：`src/components/BedBoard/index.tsx:107`（仅 `PointerSensor` + `TouchSensor`）
- 问题：运动障碍用户无法拖拽床位，违反 WCAG 2.1 SC 2.5.7。

**[M16] 颜色对比度风险**
- 位置：多处 `text-[9px] text-zinc-400`（对比度约 2.5:1）、`text-blue-500 on bg-blue-50`（约 3.9:1）
- 问题：低于 WCAG AA 4.5:1 标准。

#### Low 问题

**[L3] 无 autoComplete/inputMode**
- 位置：所有表单均未声明 `autoComplete="name|email|tel|off"`、电话/数字输入未声明 `inputMode="numeric|tel"`
- 问题：浏览器自动填充可能填错字段，移动端键盘不优化。

**[L4] 表单无实时验证**
- 位置：`CheckInPanel.tsx:136`（仅检查非空）、`EditGuestInfoModal.tsx`（无任何验证）
- 问题：无邮箱/电话格式校验，无实时错误信息展示。

---

### 维度五：架构问题（2 Low，记录在案）

**[L5] HostelContext 过大（928 行 God Context）**
- 问题：10 个 state 切片 + 40 个 action 塞在一个 `useMemo` value，任何 slice 变化触发所有 consumer 重渲染。
- 建议：按领域拆分为 `BedBoardContext`、`GuestCrmContext`、`ShiftLogContext` 等。

**[L6] i18nContext 过大（2260 行）+ 无 React Router**
- 问题：en + zh 字典内联；tab 切换用 `useState` + window 自定义事件，无法浏览器前进/后退、无法 URL 深链。
- 建议：按命名空间拆分字典文件；引入 React Router。

---

## Part B: 分批修复计划

### Batch 1（v1.8.3）— 数据安全止血

**目标**：消除 9 个 Critical 数据安全/完整性问题，防止数据丢失和未授权访问。
**范围**：9 个 Critical 修复，不涉及 UI 重设计。

#### 1.1 localStorage 写入失败反馈 [C1]
- 文件：`src/HostelContext.tsx:177-181`
- 改动：捕获 `QuotaExceededError` 后，设置全局 `storageError` state，通过自定义事件 `bunkdesk:storage-error` 通知 UI 层显示 toast/banner。
- 新增：`src/components/StorageErrorBanner.tsx`（顶部固定红色 banner，提示 "存储空间不足，数据无法保存"）

#### 1.2 JSON parse 失败保护 [C2]
- 文件：`src/HostelContext.tsx:13-16, 48-58`
- 改动：parse 失败时不静默回退，而是：1) 保留损坏数据到 `bunkdesk_state_v1_corrupted_backup`；2) 显示错误提示 "数据损坏，已回退到备份"；3) 仅在完全无数据时才用演示数据。

#### 1.3 多标签页并发同步 [C3]
- 文件：`src/HostelContext.tsx`
- 改动：添加 `storage` 事件监听，当检测到其他标签页修改了 `bunkdesk_state_v1` 时，弹 toast "数据已在其他标签页更新，点击刷新"，避免静默覆盖。

#### 1.4 PIN 安全加固 [C4]
- 文件：`src/StaffContext.tsx`、`src/data.ts:493-496`、`src/components/LoginScreen.tsx`
- 改动：
  - PIN 存储：用 `btoa(pin + salt)` 简单编码（非加密级，但防明文直读），salt 为固定值
  - 默认 PIN：改为随机生成并显示在首次启动引导中（或保持 "1234" 但首次登录强制改 PIN）
  - 登录锁定：5 次错误后锁定 30 秒，UI 显示倒计时
  - PIN 长度校验：`minLength={4}`

#### 1.5 启用 migrateGuestsDeep [C5]
- 文件：`src/HostelContext.tsx`（loadPersistedState 中调用）
- 改动：在加载 state 后，对 `arrivals` 和 `rooms[].beds[].guest` 调用 `migrateGuestsDeep`，迁移旧 schema 客人。

#### 1.6 修复 dob 字段 [C6]
- 文件：`src/types.ts`（Guest 添加 `dob?: string`）、`src/HostelContext.tsx:706`（实现添加 `'dob'` 分支）、`src/HostelContext.tsx:135`（接口已含，无需改）
- 改动：让 UI 的生日编辑功能真正生效。

#### 1.7 移除 @google/genai 死代码 [C7]
- 文件：`package.json`（移除依赖）、`CLAUDE.md`（更新文档）
- 改动：`npm uninstall @google/genai`，删除 `.env.example` 中的 `GEMINI_API_KEY`。

#### 1.8 删除房间/床位保护 [C8]
- 文件：`src/components/RoomsSection.tsx:133-137`、`src/components/BedBoard/Dialogs.tsx:617`
- 改动：
  - 删房间：检查 `rooms[roomId].beds` 是否有 `reservations`，有则弹确认 "该房间有 N 个未来预订，删除后预订数据将丢失，确认？"
  - 删床位：检查 `bed.guest` 和 `bed.reservations`，有则弹确认。

#### 1.9 数据备份/导出 [C9]
- 文件：新增 `src/components/DataManagementSection.tsx`（设置面板新 sub-tab）
- 改动：
  - "导出备份"：下载 `bunkdesk-backup-{date}.json`（含所有 state + staffList + language）
  - "导入备份"：上传 JSON 文件，校验 schema 后覆盖当前 state
  - "重置数据"：增加二次确认（输入 "DELETE" 文本），导出备份后再重置

#### 1.10 copilotEngine TODAY 过期 [H1]
- 文件：`src/utils/copilotEngine.ts:30`
- 改动：将 `const TODAY = new Date()` 改为函数 `getToday()` 每次调用时获取，或用 `useMemo` + 定时器刷新。

#### 1.11 addPartialPayment 超额校验 [H3]
- 文件：`src/HostelContext.tsx:669-688`
- 改动：`newPaidAmount = Math.min(currentPaid + amount, totalAmount)`，超额部分忽略并提示。

**验证**：
- `tsc --noEmit` 0 错误
- 手动测试：填满 localStorage 验证提示、多标签页编辑验证同步、PIN 错误 5 次验证锁定、导出/导入备份验证

---

### Batch 2（v1.9.0）— 交互体验与场景补全

**目标**：修复 13 个 High 交互问题，建立统一的反馈系统和撤销机制，补全缺失场景。
**范围**：交互体验，不涉及视觉重设计（视觉留到 Batch 3）。

#### 2.1 引入 toast 系统 [H5]
- 新增：`src/components/ui/sonner.tsx`（基于 sonner 库，轻量）或自建 `src/components/Toast.tsx`
- 改动：`npm install sonner`，在 `App.tsx` 添加 `<Toaster />`，所有操作反馈改用 toast：
  - `settlePayment` 成功 → toast "收款成功 $X"
  - `scanPassport` 成功 → toast "护照已扫描"
  - `EditGuestInfoModal` 保存 → toast "信息已更新"
  - `extendStay`/`addCharge` → toast 确认

#### 2.2 引入 loading 状态 [H6]
- 改动：为 `addArrival`、`assignArrival`、`autoAssignBed`、`settlePayment`、`checkoutGuest`、`BookingEngine.handleConfirm` 添加 `isProcessing` state，按钮显示 spinner + disabled。

#### 2.3 统一确认弹窗 [H4]
- 改动：移除所有 `window.confirm`，改用 shadcn `AlertDialog`（新增 `components/ui/alert-dialog.tsx`）：
  - `CheckInPanel.tsx:567` 收款确认
  - `CheckInPanel.tsx:768` 退房确认
  - `GeneralSection.tsx:41` 重置确认
- 统一自建弹窗：`EditGuestInfoModal`、`QuickBookingModal` 改用 shadcn `Dialog` 或 `Sheet`（移动端底部抽屉）。

#### 2.4 撤销机制 [H7]
- 新增：`src/hooks/useUndo.ts`
- 改动：
  - 退房：退房后 toast "已退房 {name}" + "撤销" 按钮（5 秒内可点），撤销恢复 guest + bed 状态
  - 删除床位/房间：同上
  - 拖拽换房：同上

#### 2.5 删除 arrivals 功能 [H8]
- 文件：`src/HostelContext.tsx`（新增 `cancelArrival(guestId)`）、`src/components/CheckInPanel.tsx`
- 改动：Pending 列表客人卡添加 "取消" 按钮（滑动或长按），调用 `cancelArrival`，写审计日志 `type: 'cancelled'`。

#### 2.6 QuickBookingModal 护照校验 [H9]
- 文件：`src/components/QuickBookingModal.tsx:93`
- 改动：创建后标记为 "待扫描护照"，或在 occupyBed 前弹提示 "未扫描护照，确认入住？"。

#### 2.7 BookingEngine 团队智能排房 [H10]
- 文件：`src/components/BookingEngine.tsx:164-188`
- 改动：团队入住时，对每个客人调用 `scoreBeds`，按分数降序分配，集中排房。

#### 2.8 FilterBar 日期 bug [H11]
- 文件：`src/components/BedBoard/FilterBar.tsx:49`
- 改动：`format(startDate, 'MMM d')} – {format(endDate, 'MMM d')}`。

#### 2.9 assignArrival 闭包修复 [H2]
- 文件：`src/HostelContext.tsx:360-362`
- 改动：移除外部 `guest` fallback，仅用 `prevRooms` 内查找，找不到则 return。

#### 2.10 移动端表格响应式 [M1]
- 文件：`src/components/CheckInPanel.tsx:729-775`
- 改动：移动端表格改为卡片列表（`flex-col sm:table`），每行一张卡片。

#### 2.11 Notes 防抖 [M2]
- 文件：`src/components/CheckInPanel.tsx:573-574`
- 改动：用 `useDeferredValue` 或 `lodash.debounce`（300ms）后再调 `updateArrival`。

#### 2.12 AutoAssignConfirmDialog 拖拽关闭 [M4]
- 文件：`src/components/AutoAssignConfirmDialog.tsx`
- 改动：用 `motion` 的 drag 功能实现下拉关闭（drag y > 100px 则 onClose）。

**验证**：
- `tsc --noEmit` 0 错误
- 手动测试：toast 显示/消失、loading 状态、撤销退房、删除 arrival、团队排房

---

### Batch 3（v2.0.0）— UI 视觉重设计（旅行/住宿行业风格）

**目标**：参考 Airbnb/Hostelworld 风格，重新设计 UI 视觉系统，统一设计 token，提升专业感和情感化。
**设计方向**：温暖色调、大图驱动、圆角柔和、情感化插画、移动优先卡片流。

#### 3.1 建立设计 token 系统 [M6, M7, M11]
- 文件：`src/index.css`（重写 design tokens）
- 改动：
  - **色彩**：从 zinc 纯灰改为温暖中性色（stone 色系）+ 品牌主色（建议 `#FF5A5F` Airbnb 珊瑚红 或 `#0B9D8F` Hostelworld 青绿，二选一，需用户确认）
  - **语义色**：`--primary`（品牌色）、`--success`（emerald）、`--warning`（amber）、`--destructive`（red）
  - **圆角**：统一 `--radius: 0.75rem`，派生 sm(0.375)/md(0.5)/lg(0.75)/xl(1)/2xl(1.25)
  - **阴影**：定义 `--shadow-card`/`--shadow-pop`/`--shadow-modal` 三档
  - **间距**：定义 4/8/12/16/20/24/32/48 的间距节奏
  - **深色模式**：启用 `.dark` 变量，添加主题切换 UI（设置面板）

#### 3.2 字体配置修复 [M8]
- 文件：`src/index.css:1`、`package.json`
- 改动：
  - 移除 Google Fonts CDN，改用已安装的 `@fontsource-variable/geist`（或安装 `@fontsource/inter`）
  - `--font-sans: "Geist Variable", system-ui, sans-serif`
  - PWA 离线时字体可用

#### 3.3 弹窗风格收敛 [M5, L2]
- 改动：
  - 所有自建 `motion.div` 弹窗改用 shadcn `Dialog`（桌面居中）或 `Sheet`（移动端底部抽屉）
  - 移除 `EditGuestInfoModal`、`QuickBookingModal` 的自建实现，改用 `Dialog`/`Sheet`
  - 统一圆角 `rounded-2xl`、遮罩 `bg-black/40`、关闭按钮位置
  - 移除未使用的 `Avatar`、`HoverCard` 组件

#### 3.4 触摸目标与字号达标 [M9, M10]
- 改动：
  - 所有可点击元素最小 `h-11`（44px）
  - 最小字号 `text-xs`（12px），移除所有 `text-[9px]`/`text-[10px]`/`text-[11px]`
  - 次要信息用 `text-xs text-muted-foreground`

#### 3.5 空状态重设计 [M12]
- 新增：`src/components/EmptyState.tsx`（可复用空状态组件）
- 改动：19 处空状态改为：图标/插画 + 标题 + 描述 + CTA 按钮（如 "No pending arrivals" + "新建入住" 按钮）

#### 3.6 ErrorBoundary 风格统一 [L1]
- 文件：`src/components/ErrorBoundary.tsx`
- 改动：改用主应用浅色风格 + i18n 文案，错误信息默认折叠（点击展开），不直接展示 `error.message`。

#### 3.7 情感化设计元素
- 改动：
  - 登录页：添加青旅背景图（`text_to_image` 生成）
  - 空状态：使用情感化插画（`text_to_image` 生成或 lucide 图标 + 温暖配色）
  - 成功反馈：添加微动画（confetti 或 checkmark 动画）
  - 卡片：添加 hover 微交互（`hover:shadow-pop hover:-translate-y-0.5 transition`）

**验证**：
- `tsc --noEmit` 0 错误
- 视觉走查：所有页面风格统一、深色模式可用、触摸目标达标、字号达标
- 移动端走查：375px 屏所有页面可用

---

### Batch 4（v2.1.0）— a11y 与架构优化

**目标**：修复 a11y 问题，优化架构，为长期维护打基础。
**范围**：a11y + 架构重构，不影响用户可见功能。

#### 4.1 aria 补全 [M13]
- 改动：所有弹窗添加 `role="dialog"` `aria-modal="true"` `aria-labelledby`；所有图标按钮添加 `aria-label`。

#### 4.2 焦点陷阱 [M14]
- 新增：`src/hooks/useFocusTrap.ts`
- 改动：弹窗打开时锁定焦点在弹窗内，关闭后恢复到触发元素。

#### 4.3 键盘拖拽 [M15]
- 文件：`src/components/BedBoard/index.tsx:107`
- 改动：启用 `@dnd-kit` 的 `KeyboardSensor`，添加 `useDraggable` 的键盘监听。

#### 4.4 对比度修复 [M16]
- 改动：`text-zinc-400` → `text-muted-foreground`（token 化后自动达标）；`text-blue-500 on bg-blue-50` → `text-primary on bg-primary/10`。

#### 4.5 表单增强 [L3, L4]
- 改动：添加 `autoComplete`/`inputMode`；引入 `react-hook-form` + `zod` 做实时验证。

#### 4.6 HostelContext 拆分 [L5]
- 改动：按领域拆分为 `BedBoardContext`、`GuestCrmContext`、`ShiftLogContext`、`PromotionContext`，减少重渲染。

#### 4.7 i18n 拆分 [L6]
- 改动：按命名空间拆分为 `locales/en/bedboard.json` 等，运行时按需加载。

#### 4.8 引入 React Router [L6]
- 改动：tab/subTab 映射到 URL，支持浏览器前进/后退、URL 深链。

**验证**：
- `tsc --noEmit` 0 错误
- axe-core 扫描 0 critical a11y 问题
- Lighthouse a11y 评分 ≥ 90

---

## Assumptions & Decisions

1. **分批发布**：每批独立版本号（v1.8.3 / v1.9.0 / v2.0.0 / v2.1.0），可独立执行和验证。
2. **Batch 1 优先**：数据安全止血最紧急，不依赖 UI 重设计，可立即执行。
3. **Batch 3 需确认品牌色**：Airbnb 珊瑚红 `#FF5A5F` vs Hostelworld 青绿 `#0B9D8F`，在执行 Batch 3 前需用户确认。
4. **PIN 加密用 btoa 而非 bcrypt**：纯客户端无法安全存储密钥，btoa 仅防明文直读，非真正加密。真正安全需后端，记录在案。
5. **toast 用 sonner**：轻量（3KB）、React 19 兼容、动画流畅，优于自建。
6. **不在此计划引入后端**：所有修复在纯客户端完成，后端化作为未来方向记录。
7. **UI 重设计不改变信息架构**：保持现有 5 tab + sub-tab 结构，仅视觉层重设计。
8. **架构拆分放最后**：HostelContext/i18n 拆分风险高（影响全项目），放在 Batch 4 且需充分测试。

## Verification

每个批次完成后执行：
1. `npm run lint`（tsc --noEmit）— 0 错误
2. `npm run build` — 构建通过
3. 手动测试 — 按各批次验证项
4. 版本号更新 + git commit + tag + push
5. dev server 启动 + 用户验证

---

## 执行顺序建议

**立即执行**：Batch 1（v1.8.3 数据安全止血）— 9 个 Critical + 2 个 High，风险最高，不涉及 UI。

**后续批次**：Batch 2 → Batch 3 → Batch 4，每批完成后用户验证再启动下一批。
