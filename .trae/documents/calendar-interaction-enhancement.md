# 日历交互增强实施计划

## Summary

将 CalendarView 从只读甘特图升级为可交互日历，支持：点击空位创建预订、悬浮操作按钮、拖拽调整日期、筛选栏、导航增强。

## Current State Analysis

**CalendarView 现状：**
- 甘特图布局：Y轴=房间/床位，X轴=日期（7-14天自适应）
- ResizeObserver 响应式列宽
- 点击 booking block 打开只读客人详情弹窗
- 键盘导航（左右箭头翻页、Home回今天、Esc关闭弹窗）
- 空床位显示淡色价格提示（pointer-events-none，不可交互）
- 无筛选、无操作能力

**关键依赖：**
- `useHostel()` 提供：`rooms`, `arrivals`, `addArrival`, `assignArrival`, `occupyBed`, `checkoutGuest`, `moveGuest`, `updateArrival`, `settlePayment`
- `@dnd-kit/core` 已安装（BedBoard 在用）
- `motion/react` 动画库
- shadcn/ui 组件库（Button, Input, Select, Dialog 等）
- `date-fns` 日期操作
- `cn` from `@/lib/utils`

**前置问题：**
- `updateArrival` 当前不支持 `checkInDate`/`checkOutDate`/`nights` 字段更新
- `updateArrival` 只更新 arrivals 数组，不同步 rooms 中的 guest 数据
- `checkoutGuest` 签名是 `(bedId: string)` 但 CheckInPanel 调用为 `(guestName, bedId)` — 需确认

## Proposed Changes

### Task 0: 扩展 updateArrival 支持日期字段

**文件：** `src/HostelContext.tsx`

**What:** 扩展 `updateArrival` 类型签名，支持 `checkInDate`/`checkOutDate`/`nights`，并同步更新 rooms 中的 guest 数据。

**Why:** Task 2（拖拽调整日期）必须更新这些字段，当前签名不允许。且当前实现只更新 arrivals 不同步 rooms，会导致数据不一致。

**How:**
1. `HostelState` 接口第 24 行，`updateArrival` 的 Pick 类型添加 `'checkInDate' | 'checkOutDate' | 'nights'`
2. `useCallback` 实现第 293 行，同步修改签名，并添加 `setRooms` 同步逻辑：遍历 rooms.beds，若 `b.guest?.id === guestId` 则更新 guest 对应字段

---

### Task 1: 点击空位创建预订

**文件：**
- 新建 `src/components/QuickBookingModal.tsx`
- 修改 `src/components/CalendarView.tsx`
- 修改 `src/i18nContext.tsx`

**What:** 点击日历空位格子弹出快速预订表单，预填日期和床位，提交后直接入住。

**Why:** 日历的核心交互——从"看"到"做"的关键一步。

**How:**
1. 添加 i18n 键值（`calendarview.quickBooking`, `guestName`, `country`, `gender`, `checkIn`, `checkOut`, `source`, `createBooking`, `bookingCreated` 等中英文）
2. 新建 `QuickBookingModal` 组件：接收 `bed`, `room`, `initialDate` props，表单包含姓名/国家/性别/日期/来源，调用 `occupyBed` 完成入住，成功动画后自动关闭
3. 导出 `getBedPrice` 函数供 QuickBookingModal 使用
4. CalendarView 添加 `quickBooking` 状态
5. 重构空位渲染：删除原 `pointer-events-none` 的空位价格提示块，改为在每个日期格子中独立渲染可点击的空位
6. 底部添加 `<QuickBookingModal>` 组件

---

### Task 2: 拖拽调整入住/退房日期

**文件：** `src/components/CalendarView.tsx`, `src/i18nContext.tsx`

**What:** booking block 左右边缘添加拖拽手柄，拖拽可调整 check-in/check-out 日期。

**Why:** 日历视图最自然的日期调整方式，比弹窗编辑更直观。

**How:**
1. 添加 i18n 键值（`dragCheckIn`, `dragCheckOut`, `minOneNight`, `datesUpdated`）
2. `CalendarBookingBlock` 添加 `onDragCheckIn`/`onDragCheckOut` 回调 props
3. 在 block 左右边缘各添加 2px 宽的拖拽手柄 div（`cursor-ew-resize`，hover 高亮）
4. 手柄 `onMouseDown` 记录起始 X 坐标，`onMouseUp` 计算像素位移 → 天数变化 → 调用回调
5. CalendarView 中实现回调：计算新日期，确保最少 1 晚，调用 `updateArrival` 更新

---

### Task 3: 悬浮操作按钮

**文件：** `src/components/CalendarView.tsx`, `src/i18nContext.tsx`

**What:** hover booking block 时显示 Check-in/Checkout/Edit 图标按钮。

**Why:** 让日历具备快速操作能力，不用跳转到其他模块。

**How:**
1. 添加 i18n 键值（`actionCheckIn`, `actionCheckout`, `actionEdit`）
2. `CalendarBookingBlock` 添加 `onCheckIn`/`onCheckout`/`onEdit` 回调 props
3. block 外层 div 添加 `group/block` class
4. 在 block 内添加绝对定位按钮组（`opacity-0 group-hover/block:opacity-100`）
5. Check-in 按钮：查找该预订对应的 bed，调用 `assignArrival`
6. Checkout 按钮：查找该客人对应的 bed，调用 `checkoutGuest`
7. Edit 按钮：调用 `setSelectedGuest(booking)` 打开详情弹窗
8. 从 `useHostel()` 解构 `assignArrival`, `checkoutGuest`

---

### Task 4: 筛选栏

**文件：** `src/components/CalendarView.tsx`, `src/i18nContext.tsx`

**What:** 添加房间类型和状态两个 Select 筛选器，复用 BedBoard 的筛选模式。

**Why:** 房间多时日历信息过载，筛选帮助聚焦。

**How:**
1. 添加 i18n 键值（`filter`, `roomType`, `allRooms`, `mixedDorm`, `femaleDorm`, `privateRoom`, `status`, `allStatuses`, `occupied`, `empty`, `reserved`, `cleaning`）
2. 导入 `Filter` icon 和 `Select` 组件
3. 添加 `roomTypeFilter`/`statusFilter` 状态
4. 创建 `filteredRooms` useMemo（过滤房间类型 + 床位状态，过滤后无床位的房间不显示）
5. Header 区域添加筛选 Select 组件
6. `rooms.map` 替换为 `filteredRooms.map`

---

### Task 5: 导航增强

**文件：** `src/components/CalendarView.tsx`, `src/i18nContext.tsx`

**What:** 迷你月份选择器 + 可见日期范围入住率摘要。

**Why:** 快速跳转日期、一眼看到排期密度。

**How:**
1. 添加 i18n 键值（`avgOccupancy`, `pickDate`）
2. 导入 `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `getDay` from date-fns
3. 新建 `MiniMonthPicker` 内部组件：7列日历网格，点击日期跳转
4. 日期范围文本改为可点击按钮，点击弹出 MiniMonthPicker
5. 添加 `showDatePicker` 状态和外部点击关闭逻辑
6. Header 右侧添加入住率摘要：遍历 filteredRooms × dates 计算已占用床夜数 / 总床夜数

## Assumptions & Decisions

1. **QuickBookingModal 使用 `occupyBed` 而非 `addArrival` + `assignArrival`** — 一步到位，直接入住
2. **拖拽使用原生 mousedown/mouseup 而非 @dnd-kit** — 拖拽场景简单（只调整边缘），不需要完整的 DnD 框架
3. **悬浮按钮仅在 `widthPercent > 12` 时显示** — 太窄的 block 放不下按钮
4. **筛选栏放在 header 区域** — 与 BedBoard 一致的布局模式
5. **checkoutGuest 签名** — HostelContext 中是 `(bedId: string)`，CheckInPanel 传两个参数是 bug，日历中统一用 `(bedId)`

## 实施顺序

```
Task 0 (前置) → Task 1 (点击创建) → Task 4 (筛选栏) → Task 3 (悬浮按钮) → Task 2 (拖拽日期) → Task 5 (导航增强)
```

## Verification

每个 Task 完成后：
1. `npm run build` 无报错
2. 启动 dev server 验证功能
3. 检查中英文 i18n 显示正确
4. 最终全量验证：所有交互功能正常，无白屏/报错
