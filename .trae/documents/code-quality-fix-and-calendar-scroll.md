# 代码质量修复 & 日历滑动优化计划

## 摘要
修复已知代码质量问题（P0-P2），并优化日历视图支持左右上下滑动查看更多日期和房间。

## 当前状态分析

### 已知问题
1. **P0: Context value 未 memoize** — `HostelContext.Provider` 的 value 每次渲染创建新对象，导致所有消费者不必要重渲染
2. **P0: ID 生成冲突风险** — `addArrival`/`addRoom`/`addBedToRoom` 使用 `Date.now()` 生成 ID，快速连续操作可能冲突
3. **P1: 派生状态未 memoize** — `filteredRooms`/`dirtyBedsCount`(BedBoard)、`emptyBeds`(CheckInPanel)、`allReservations`(ReservationsView) 每次渲染重新计算
4. **P1: `any` 类型** — CheckInPanel 中 Select 的 `onValueChange` 回调参数类型为 `any`
5. **P2: 硬编码价格** — CheckInPanel 中 `$85.00` 和 `€85` 硬编码
6. **P2: 硬编码国家映射** — CheckInPanel 中 countryMap 硬编码在组件内

### 日历问题
- `CalendarView.tsx` 固定显示 14 天（`Array.from({ length: 14 })`），无法查看更远日期
- 没有左右导航按钮来切换日期范围
- 没有触摸滑动手势支持
- 上下滚动已有（`overflow-auto`），但左右方向受限于固定 14 天

## 修改计划

### 1. HostelContext.tsx — memoize value + 修复 ID 生成

**文件**: `/Users/ricky/AICode/hostelite/src/HostelContext.tsx`

**1a. 导入 useMemo 和 useCallback**
```tsx
import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";
```

**1b. 用 useCallback 包裹所有函数**（moveGuest, assignArrival, markBedClean, checkoutGuest, settlePayment, scanPassport, addArrival, addRoom, updateRoom, addBedToRoom, updateBed）

**1c. 用 useMemo 包裹 provider value**
```tsx
const value = useMemo(() => ({
  rooms, arrivals, moveGuest, assignArrival, markBedClean,
  checkoutGuest, settlePayment, scanPassport, addArrival,
  addRoom, updateRoom, addBedToRoom, updateBed,
}), [rooms, arrivals, moveGuest, assignArrival, ...]);
```

**1d. 修复 ID 生成** — 使用 `crypto.randomUUID()` 替代 `Date.now()`
```tsx
// addArrival
const newGuest: Guest = { ...guest, id: `g_${crypto.randomUUID()}` };
// addRoom
const newRoom: Room = { ...room, id: `r_${crypto.randomUUID()}`, beds: [] };
// addBedToRoom
const newBed: Bed = { ...bed, id: `b_${crypto.randomUUID()}`, roomId, status: "empty" };
```

### 2. BedBoard.tsx — memoize 派生状态

**文件**: `/Users/ricky/AICode/hostelite/src/components/BedBoard.tsx`

**2a. 导入 useMemo**
```tsx
import React, { useState, useMemo } from "react";
```

**2b. 用 useMemo 包裹 filteredRooms 和 dirtyBedsCount**
```tsx
const filteredRooms = useMemo(() => rooms
  .filter((room) => roomTypeFilter === "all" || room.type === roomTypeFilter)
  .map((room) => {
    const filteredBeds = room.beds.filter(
      (bed) => statusFilter === "all" || bed.status === statusFilter,
    );
    return { ...room, beds: filteredBeds, totalBeds: room.beds.length };
  })
  .filter((room) => room.beds.length > 0), [rooms, roomTypeFilter, statusFilter]);

const dirtyBedsCount = useMemo(() => rooms.reduce(
  (acc, room) => acc + room.beds.filter((b) => b.status === "cleaning").length, 0,
), [rooms]);
```

### 3. CheckInPanel.tsx — memoize + 修复 any + 提取常量

**文件**: `/Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx`

**3a. 导入 useMemo**
```tsx
import React, { useState, useMemo } from 'react';
```

**3b. 提取常量到文件顶部**
```tsx
const COUNTRY_MAP: Record<string, string> = {
  US: 'USA', GBR: 'United Kingdom', AU: 'Australia',
  ESP: 'Spain', CN: 'China', FR: 'France', DE: 'Germany'
};
const DEFAULT_PRICE = 85;
```

**3c. 用 useMemo 包裹 emptyBeds**
```tsx
const emptyBeds = useMemo(() => rooms.flatMap(r =>
  r.beds.filter(b => b.status === 'empty').map(b => ({ ...b, roomType: r.type, roomNumber: r.number }))
), [rooms]);
```

**3d. 修复 any 类型**
```tsx
onValueChange={(val: string) => setNewGuestRef({...newGuestRef, gender: val as "male" | "female" | "other"})}
```

**3e. 替换硬编码价格**
- `$85.00` → `$${DEFAULT_PRICE}.00`
- `€85` → `€${DEFAULT_PRICE}`

### 4. ReservationsView.tsx — memoize 派生状态

**文件**: `/Users/ricky/AICode/hostelite/src/components/ReservationsView.tsx`

**4a. 导入 useMemo**
```tsx
import React, { useState, useMemo } from 'react';
```

**4b. 用 useMemo 包裹 allReservations 和 filteredReservations**
```tsx
const allReservations = useMemo(() => [...], [arrivals, rooms]);
const filteredReservations = useMemo(() => ..., [allReservations, searchQuery, statusFilter]);
```

### 5. CalendarView.tsx — 日历滑动优化

**文件**: `/Users/ricky/AICode/hostelite/src/components/CalendarView.tsx`

**5a. 新增状态管理日期范围**
```tsx
const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
const visibleDays = 14;

const dates = useMemo(
  () => Array.from({ length: visibleDays }).map((_, i) => addDays(startDate, i)),
  [startDate, visibleDays]
);
```

**5b. 添加左右导航按钮**
在 header 区域添加 `<` 和 `>` 按钮，每次移动 7 天：
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, -7))}>
    <ChevronLeft />
  </Button>
  <span className="text-sm font-medium">{format(dates[0], 'MMM d')} - {format(dates[dates.length-1], 'MMM d')}</span>
  <Button variant="outline" size="sm" onClick={() => setStartDate(d => addDays(d, 7))}>
    <ChevronRight />
  </Button>
  <Button variant="ghost" size="sm" onClick={() => setStartDate(startOfDay(new Date()))}>Today</Button>
</div>
```

**5c. 添加触摸滑动手势支持**
使用 touch 事件监听实现左右滑动切换日期范围：
- 在滚动容器上添加 `onTouchStart`/`onTouchEnd` 事件
- 检测水平滑动距离 > 50px 时触发前后翻页
- 注意：需要区分用户是想在日历网格内滚动还是想翻页——当滚动到边界时才触发翻页

**5d. 添加键盘导航支持**
- 左右方向键切换日期范围
- Home 键回到今天

**5e. 优化滚动体验**
- 当前 `overflow-auto` + `hide-scrollbar` 隐藏了滚动条，用户不知道可以滚动
- 改为在内容溢出时显示淡化的滚动提示（左右渐变遮罩）
- 保持上下滚动（房间多时），增强左右滚动视觉提示

**5f. 添加 useMemo 优化 getBookingsForBed**
```tsx
const getBookingsForBed = useCallback((bed: Bed) => {
  const bookings: Guest[] = [];
  if (bed.guest) bookings.push(bed.guest);
  if (bed.reservations) bookings.push(...bed.reservations);
  return bookings;
}, []);
```

## 假设与决策
- 使用 `crypto.randomUUID()` 而非第三方库生成 ID，浏览器原生支持
- 日历滑动采用"按钮导航 + 触摸滑动"双模式，兼容桌面和移动端
- 日历每次翻页 7 天（一周），符合日历操作习惯
- 不引入额外依赖（如 react-swipeable），用原生 touch 事件实现
- 价格常量提取为组件级常量，不做全局配置（当前项目无后端定价 API）

## 验证步骤
1. `npx tsc --noEmit` — 0 错误
2. 启动开发服务器，验证所有页面功能正常
3. 日历视图：点击左右箭头切换日期范围
4. 日历视图：触摸滑动切换日期范围
5. 日历视图：点击 "Today" 回到当前日期
6. 日历视图：键盘左右方向键切换
7. 检查 Context 重渲染：在 BedBoard/CheckInPanel 中操作不应导致无关组件闪烁
8. 快速连续添加多个房间/床位，验证 ID 不冲突
