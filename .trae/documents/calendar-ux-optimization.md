# Calendar UX & Bug Fix Plan

## Summary

修复日历视图的3类问题：
1. **拉伸延住覆盖已占用床位 → 数据损坏**：缺少冲突检测，需要阻止拉伸并显示红色提示
2. **字段显示不全/看不清**：窄入住块隐藏了关键信息，需要自适应显示策略
3. **关联底层 bug**：`getBookingsForBed` 可能重复客人、`updateArrival` 不同步 reservations

## Current State Analysis

### 问题 1：拉伸覆盖冲突 — 数据损坏根因

**现象描述**：用户拉伸右侧边缘延长入住时间，如果新日期范围与同床下一个客人的入住日期重叠，没有冲突提示，`updateArrival` 直接写入新日期，导致两个 booking 在日历上重叠渲染，数据混乱。

**代码链路**：

| 步骤 | 文件:行号 | 说明 |
|------|----------|------|
| 1 | `CalendarView.tsx:169` | 右边缘 `onPointerDown` → `startResize(e, 'right')` |
| 2 | `CalendarView.tsx:87-138` | `startResize` 用 DOM 操作实时调整块宽度 |
| 3 | `CalendarView.tsx:118-127` | `onUp` → `onResizeRight?.(deltaDays)` |
| 4 | `CalendarView.tsx:840-848` | `onResizeRight` 直接调用 `updateArrival` |

**根因**：第4步 `onResizeRight` 完全没有校验新日期是否与其他 booking 冲突：
```tsx
// CalendarView.tsx:840-848 — 没有冲突检查
onResizeRight={(deltaDays: number) => {
  const cIn = parseISO(booking.checkInDate);
  const cOut = parseISO(booking.checkOutDate);
  const newOut = addDays(cOut, deltaDays);
  if (newOut.getTime() <= cIn.getTime()) return;   // 只检查不少于1天
  const newNights = differenceInDays(newOut, cIn);
  if (newNights < 1) return;
  updateArrival(booking.id, {                        // ❌ 没有冲突检查
    checkOutDate: format(newOut, 'yyyy-MM-dd'),
    nights: newNights,
  });
}}
```

**关联根因 — `updateArrival` 不同步 `b.reservations`**：
- `HostelContext.tsx:293-306`：`updateArrival` 只更新 `arrivals` 和 `rooms[].beds[].guest`，不更新 `rooms[].beds[].reservations`
- 如果 guest 同时存在于 `b.guest` 和 `b.reservations`（`assignArrival` 未清理 reservations），两个数据源不一致
- 日历渲染时 `getBookingsForBed` 返回两个同名 guest，产生重叠入住块

**关联根因 — `getBookingsForBed` 可能重复**：
```tsx
// CalendarView.tsx:341-345
const getBookingsForBed = (bed) => {
  const bookings = [];
  if (bed.guest) bookings.push(bed.guest);            // 已入住客人
  if (bed.reservations) bookings.push(...bed.reservations); // 预订客人
  return bookings;                                    // ❌ 同一客人可能出现两次
};
```

### 问题 2：字段显示不全/看不清

**现状**：入住块内显示两行信息：
```
Line 1: booking.name          (name)
Line 2: booking.countryCode · {nights}N   (仅当 widthPercent > 8 时显示)
```

**问题**：
- 当 `widthPercent <= 8`（窄块，约 <1.5天宽度），第二行完全消失，看不到国籍和天数
- `countryCode` 显示的是国家代码（如 "AU"）而非国家名（"Australia"），语义不够清晰
- 没有显示入住/离店日期范围，用户需要点击才能查看
- 窄块缺少 tooltip / hover 提示

### 问题 3：其他显示细节

| # | 问题 | 位置 |
|---|------|------|
| 3a | `bed.status === 'cleaning'` 的 `bg-purple-50/20` 与 `isSameDay(date, today)` 的 `bg-amber-50/10` 在当天列冲突 | `CalendarView.tsx:784-786` |
| 3b | "reserved" 状态筛选不生效 — 筛选的是 `bed.status === 'reserved'`，但预订数据在 `b.reservations[]` 中 | `CalendarView.tsx:531` |
| 3c | 拉伸视觉反馈使用 DOM 直接操作 + `addEventListener`，与 React 渲染竞争 | `CalendarView.tsx:99-115` |
| 3d | 拉伸时 `visibleNights` 是视口内的夜数而非总夜数，视觉宽度计算可能不准 | `CalendarView.tsx:101-115` |

---

## Proposed Changes

### 改动 1：为拉伸增加冲突检测（核心修复）

**修改文件**：`src/components/CalendarView.tsx`

**1a. 在 `BedRow` 中传入同床所有 booking 信息**

在 `BedRow` 组件中，`onResizeLeft`/`onResizeRight` 回调现在只接收 `deltaDays`，无法访问同床其他 booking。需要改为传入冲突检测函数。

修改 `BedRow` 的 `onResizeLeft`/`onResizeRight` 签名：先在同床 booking 列表中查找**下一个/上一个** booking，计算最大可扩展天数。

具体方案：
- `onResizeLeft`：向左扩展时，检查更早日期是否有 booking。从当前 checkIn 往前找，找到第一个有 booking 的日期，计算可扩展天数上限。
- `onResizeRight`：向右扩展时，检查更晚日期是否有 booking。从当前 checkOut 往后找，找到第一个有 booking 的日期，计算可扩展天数上限。

**实现**：
```tsx
// 在 BedRow 的 onResizeRight 回调中增加冲突检查
onResizeRight={(deltaDays: number) => {
  // ...计算 newOut, newNights...
  
  // 检查同床冲突：扫描 newOut 日期范围是否有其他 booking
  for (let i = 0; i < deltaDays; i++) {
    const checkDate = addDays(cOut, i);
    const conflict = bookings.find(b => {
      if (b.id === booking.id) return false; // 跳过自己
      const bIn = parseISO(b.checkInDate);
      const bOut = parseISO(b.checkOutDate);
      return checkDate >= bIn && checkDate < bOut;
    });
    if (conflict) {
      // 有冲突：只扩展到冲突前一天
      const safeDelta = i;
      if (safeDelta > 0) {
        // 使用 safeDelta 提交
      }
      return; // 不提交冲突的扩展
    }
  }
  updateArrival(booking.id, { ... });
}}
```

更好的方式：在 `startResize` 中预计算 `maxDelta`，拖动时如果超过限制，显示红色：

```tsx
// maxRightDelta: 最大可向右扩展天数（到下一个 booking 的 checkIn 前一天）
const maxRightDelta = useMemo(() => {
  // 找到当前 booking 之后的下一个 booking
  const nextBooking = bookings
    .filter(b => b.id !== booking.id)
    .sort((a, b) => parseISO(a.checkInDate).getTime() - parseISO(b.checkInDate).getTime())
    .find(b => parseISO(b.checkInDate) >= parseISO(booking.checkOutDate));
  if (nextBooking) {
    return differenceInDays(parseISO(nextBooking.checkInDate), parseISO(booking.checkOutDate));
  }
  return Infinity;
}, [bookings, booking]);
```

然后在 `onMove` 中检查 `deltaDays > maxRightDelta`，如果超过则显示红色边缘并阻止视觉扩展。

**1b. 视觉反馈**

- 正常扩展：蓝色边缘高亮（与现有的 `hover:bg-blue-300/50` 一致）
- 冲突时：红色边缘高亮 + 拖动停止在冲突边界

### 改动 2：自适应信息显示策略

**修改文件**：`src/components/CalendarView.tsx` — `DraggableBookingBlock` 组件

**策略**：根据 `widthPercent`（块宽度占可视天数百分比）分三档：

| 宽度 | 显示内容 | 对应的 `widthPercent` 阈值 |
|------|---------|--------------------------|
| 极窄 | 仅 name 缩写（首字母）或单字符 | `<= 3`（约半天宽度） |
| 窄 | name + nights badge（如 "Alex · 4N"） | `3 ~ 8`（约1天宽度） |
| 正常 | name + countryCode + nights + 迷你日期 | `> 8` |

**实现**：
```tsx
// DraggableBookingBlock 内部
{widthPercent <= 3 ? (
  // 极窄模式：仅名字首字母
  <span className="text-[10px] font-bold truncate">{booking.name.charAt(0)}</span>
) : widthPercent <= 8 ? (
  // 窄模式：名字 + nights badge
  <>
    <span className="text-[10px] font-semibold truncate leading-tight">{booking.name}</span>
    <span className="text-[9px] font-bold opacity-80">{booking.nights}N</span>
  </>
) : (
  // 正常模式：名字 + 国籍&天数，hover 显示完整日期
  <>
    <span className="text-[11px] font-semibold truncate leading-tight">{booking.name}</span>
    <span className="text-[10px] opacity-70 truncate">
      {booking.countryCode} · {format(parseISO(booking.checkInDate), 'M/d')}→{format(parseISO(booking.checkOutDate), 'M/d')} · {booking.nights}N
    </span>
  </>
)}
```

**额外增加 tooltip**：整块 hover 时显示卡片式提示：
```
Alex Johnson
🇦🇺 Australia
Jun 12 → Jun 16 (4 nights)
Paid $340
```

使用 `title` 属性或简单的绝对定位 tooltip。

### 改动 3：修复重复 guest 问题

**修改文件**：`src/components/CalendarView.tsx`、`src/HostelContext.tsx`

**3a. `getBookingsForBed` 去重**

```tsx
// CalendarView.tsx — getBookingsForBed
const getBookingsForBed = useCallback((bed: Bed) => {
  const seen = new Set<string>();
  const bookings: Guest[] = [];
  if (bed.guest && !seen.has(bed.guest.id)) {
    bookings.push(bed.guest);
    seen.add(bed.guest.id);
  }
  if (bed.reservations) {
    for (const r of bed.reservations) {
      if (!seen.has(r.id)) {
        bookings.push(r);
        seen.add(r.id);
      }
    }
  }
  return bookings;
}, []);
```

**3b. `updateArrival` 同步更新 `b.reservations`**

```tsx
// HostelContext.tsx — updateArrival
const updateArrival = useCallback((guestId: string, updates: ...) => {
  setArrivals((prev) => prev.map((g) => g.id === guestId ? { ...g, ...updates } : g));
  setRooms((prevRooms) =>
    prevRooms.map((r) => ({
      ...r,
      beds: r.beds.map((b) => {
        const updated = { ...b };
        // 更新 b.guest
        if (b.guest?.id === guestId) {
          updated.guest = { ...b.guest, ...updates };
        }
        // 更新 b.reservations 中的同名 guest
        if (b.reservations?.some(r => r.id === guestId)) {
          updated.reservations = b.reservations.map(r =>
            r.id === guestId ? { ...r, ...updates } : r
          );
        }
        return updated;
      }),
    )),
  );
}, []);
```

### 改动 4：修复 cleaning 状态与 today 列背景冲突

**修改文件**：`src/components/CalendarView.tsx` — BedRow 日期格子

当前逻辑：
```tsx
className={cn(
  "flex-1 border-r border-zinc-100 transition-colors",
  isSameDay(date, today) && "bg-amber-50/10",        // today 背景
  bed.status === 'cleaning' && "bg-purple-50/20",    // cleaning 背景 ← 与上面冲突
  ...
)}
```

修复：使用更精确的优先级逻辑，cleaning 状态优先于 today 高亮：
```tsx
className={cn(
  "flex-1 border-r border-zinc-100 transition-colors",
  bed.status === 'cleaning'
    ? "bg-purple-50/30"
    : isSameDay(date, today) && "bg-amber-50/10",
  ...
)}
```

### 改动 5：修复 "reserved" 状态筛选

**修改文件**：`src/components/CalendarView.tsx` — 筛选逻辑

当前 `statusFilter === 'reserved'` 筛选的是 `bed.status === 'reserved'`，但预订数据在 `bed.reservations` 中。

修复：在 `filteredRooms` 中增加对 "reserved" 的特殊处理：
```tsx
const filteredRooms = useMemo(() => rooms
  .filter(room => roomTypeFilter === 'all' || room.type === roomTypeFilter)
  .map(room => ({
    ...room,
    beds: room.beds.filter(bed => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'reserved') {
        // reserved 状态：筛选有 reservation 但没有 guest 的床位
        return !bed.guest && (bed.reservations?.length ?? 0) > 0;
      }
      return bed.status === statusFilter;
    }),
  }))
  .filter(room => room.beds.length > 0),
[rooms, roomTypeFilter, statusFilter]);
```

---

## File Changes Summary

| 文件 | 改动 |
|------|------|
| `src/components/CalendarView.tsx` | 主改动：冲突检测、自适应显示、getBookingsForBed 去重、cleaning/today 背景修复、reserved 筛选修复 |
| `src/HostelContext.tsx` | updateArrival 同步更新 b.reservations |

## Verification Steps

1. **拉伸冲突测试**：
   - 找一个有上下两个 booking 的床位（如 b_101_1 Alex 4天 → b_101_2 John 预订从+2天开始）
   - 拖动 Alex 的右边缘向右超过 John 的 checkIn → 应停止在 John 前一天 + 显示红色
   - 拖动 Alex 的左边缘向左 → 应正常缩小
   - 确认数据未被损坏

2. **字段显示测试**：
   - 缩放浏览器宽度，观察入住块在 14天/10天/7天 不同视口下的信息显示
   - 极窄块（半天宽）：显示首字母
   - 窄块（1天宽）：显示 name + nights badge
   - 正常块：显示完整信息

3. **重复 guest 测试**：
   - 确认 assignArrival 后不会出现同一客人的两个重叠块
   - 确认 updateArrival 后 reservations 中的日期也同步更新

4. **Cleaning 背景测试**：
   - 有清洁中床位的日期格子在今天列上也应显示紫色，而不是被 today 黄色覆盖

5. **Reserved 筛选测试**：
   - 选择 "reserved" 筛选 → 只显示有预订但未入住的床位

## Assumptions & Decisions

- **冲突阻止 > 冲突提示**：用户明确选择了"阻止拉伸，显示红色提示"
- **自适应显示策略**：三档策略（极窄/窄/正常），阈值基于视觉效果估算
- **在 CalendarView 层做冲突检测**：传入 `bookings` 列表给 resize 回调，在回调中检测，保持 DraggableBookingBlock 为纯展示组件
- **去重放在 CalendarView 层**：修改 `getBookingsForBed` 而非改数据源，避免副作用波及 BedBoard
- **保留 DOM 直接操作拉伸视觉**：不做 state 驱动（避免频繁 re-render），但增加冲突检测逻辑