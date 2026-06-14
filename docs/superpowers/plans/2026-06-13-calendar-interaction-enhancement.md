# CalendarView 交互增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 CalendarView 从只读甘特图升级为可交互的日历视图，支持点击空位创建预订、拖拽调整日期、悬浮操作按钮、筛选栏和导航增强。

**Architecture:** 在现有 CalendarView 组件基础上，新增交互层。所有状态变更通过 `useHostel()` context 方法完成。新增 i18n 键值对。拖拽日期调整使用 `@dnd-kit/core`（已安装）。快速预订表单使用 shadcn/ui 组件。

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS (zinc/emerald), motion/react, @dnd-kit/core, date-fns, lucide-react, shadcn/ui, cn from @/lib/utils

---

## 前置依赖：扩展 updateArrival 支持日期更新

当前 `updateArrival` 的类型签名不支持更新 `checkInDate`、`checkOutDate`、`nights`，拖拽调整日期功能需要这些字段。必须先扩展。

### Task 0: 扩展 updateArrival 类型签名

- [ ] 修改 `/Users/ricky/AICode/hostelite/src/HostelContext.tsx`

**Step 1:** 更新 `HostelState` 接口中的 `updateArrival` 签名（第 24 行）：

```typescript
// 旧
updateArrival: (guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'dob' | 'passportOrId'>>) => void;

// 新
updateArrival: (guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'dob' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights'>>) => void;
```

**Step 2:** 更新 `useCallback` 实现（第 293 行），签名同步修改：

```typescript
const updateArrival = useCallback((guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'dob' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights'>>) => {
  setArrivals((prev) => prev.map((g) => g.id === guestId ? { ...g, ...updates } : g));
  // 同时更新 rooms 中对应 guest 的日期
  setRooms((prevRooms) =>
    prevRooms.map((r) => ({
      ...r,
      beds: r.beds.map((b) =>
        b.guest?.id === guestId
          ? { ...b, guest: { ...b.guest, ...updates } }
          : b,
      ),
    })),
  );
}, []);
```

**Step 3:** 同步更新 `useMemo` 依赖数组（第 601 行），`updateArrival` 引用不变，无需额外修改。

**验证:** 在 BedBoard 中编辑客人信息后，确认 rooms 和 arrivals 数据同步更新。

---

## Task 1: 点击空位创建预订

- [ ] 1.1 添加 i18n 键值
- [ ] 1.2 创建 QuickBookingModal 组件
- [ ] 1.3 在 CalendarView 中添加空位点击交互
- [ ] 1.4 集成 addArrival + occupyBed 流程

### 1.1 添加 i18n 键值

修改 `/Users/ricky/AICode/hostelite/src/i18nContext.tsx`

在 `en.calendarview` 对象中（第 438-440 行）添加：

```typescript
calendarview: {
  today: "Today",
  quickBooking: "Quick Booking",
  guestName: "Guest Name",
  country: "Country",
  gender: "Gender",
  checkIn: "Check-in",
  checkOut: "Check-out",
  source: "Source",
  createBooking: "Create Booking",
  bookingCreated: "Booking created!",
  selectCountry: "Select country",
  selectGender: "Select gender",
  selectSource: "Select source",
  namePlaceholder: "Enter guest name",
  clickToBook: "Click to book",
},
```

在 `zh.calendarview` 对象中（第 1246-1248 行）添加：

```typescript
calendarview: {
  today: "今天",
  quickBooking: "快速预订",
  guestName: "客人姓名",
  country: "国家",
  gender: "性别",
  checkIn: "入住日期",
  checkOut: "退房日期",
  source: "来源",
  createBooking: "创建预订",
  bookingCreated: "预订已创建！",
  selectCountry: "选择国家",
  selectGender: "选择性别",
  selectSource: "选择来源",
  namePlaceholder: "输入客人姓名",
  clickToBook: "点击预订",
},
```

### 1.2 创建 QuickBookingModal 组件

新建 `/Users/ricky/AICode/hostelite/src/components/QuickBookingModal.tsx`

```tsx
import React, { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '../i18nContext';
import { useHostel } from '../HostelContext';
import { Bed, Room } from '../types';
import { getBedPrice } from './CalendarView';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bed: Bed;
  room: Room;
  initialDate: Date;
}

const COUNTRY_OPTIONS = [
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'South Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CA', name: 'Canada' },
  { code: 'SE', name: 'Sweden' },
  { code: 'IL', name: 'Israel' },
];

export function QuickBookingModal({ isOpen, onClose, bed, room, initialDate }: QuickBookingModalProps) {
  const { t } = useTranslation();
  const { occupyBed } = useHostel();

  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [checkInDate, setCheckInDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [checkOutDate, setCheckOutDate] = useState(format(addDays(initialDate, 1), 'yyyy-MM-dd'));
  const [source, setSource] = useState<'walk-in' | 'manual'>('walk-in');
  const [isSuccess, setIsSuccess] = useState(false);

  const nights = Math.max(1, Math.round((parseISO(checkOutDate).getTime() - parseISO(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
  const pricePerNight = getBedPrice(room, bed);
  const totalAmount = nights * pricePerNight;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !countryCode) return;

    occupyBed(bed.id, {
      name: name.trim(),
      country: COUNTRY_OPTIONS.find(c => c.code === countryCode)?.name || countryCode,
      countryCode,
      gender,
      checkInDate,
      checkOutDate,
      nights,
      paymentStatus: 'unpaid',
      totalAmount,
      source,
      passportScanned: false,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      setName('');
      setCountryCode('');
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-zinc-900">{t('calendarview.quickBooking')}</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-semibold text-emerald-700">{t('calendarview.bookingCreated')}</p>
                <p className="text-xs text-zinc-500">{bed.name} · {nights}N · ${totalAmount}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Bed info */}
                <div className="bg-zinc-50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">{bed.name}</span>
                  <span className="text-xs font-semibold text-emerald-600">${pricePerNight}/N</span>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.guestName')}</Label>
                  <Input
                    required
                    placeholder={t('calendarview.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 text-sm"
                    autoFocus
                  />
                </div>

                {/* Country + Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.country')}</Label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={t('calendarview.selectCountry')} />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.gender')}</Label>
                    <Select value={gender} onValueChange={(v: string) => setGender(v as 'male' | 'female' | 'other')}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={t('calendarview.selectGender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('guest.male')}</SelectItem>
                        <SelectItem value="female">{t('guest.female')}</SelectItem>
                        <SelectItem value="other">{t('guest.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.checkIn')}</Label>
                    <Input
                      type="date"
                      required
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.checkOut')}</Label>
                    <Input
                      type="date"
                      required
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="h-9 text-sm"
                      min={checkInDate}
                    />
                  </div>
                </div>

                {/* Source */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('calendarview.source')}</Label>
                  <Select value={source} onValueChange={(v: string) => setSource(v as 'walk-in' | 'manual')}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t('calendarview.selectSource')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">{t('dashboard.sourceWalkIn')}</SelectItem>
                      <SelectItem value="manual">{t('dashboard.sourceManual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary */}
                <div className="bg-zinc-50 rounded-lg p-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{nights} {t('dashboard.nights')} × ${pricePerNight}</span>
                  <span className="font-bold text-zinc-900">${totalAmount}</span>
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full h-9 text-sm" disabled={!name.trim() || !countryCode}>
                  {t('calendarview.createBooking')}
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 1.3 在 CalendarView 中添加空位点击交互

修改 `/Users/ricky/AICode/hostelite/src/components/CalendarView.tsx`

**Step 1:** 导入 QuickBookingModal：

```typescript
import { QuickBookingModal } from './QuickBookingModal';
```

**Step 2:** 导出 `getBedPrice` 函数（供 QuickBookingModal 使用），将第 15-17 行的函数添加 `export`：

```typescript
export function getBedPrice(room: Room, bed: Bed): number {
  return room.pricePerNight + (bed.bedType === 'bottom' ? (room.bottomBunkPremium || 0) : 0);
}
```

**Step 3:** 在 `CalendarView` 组件中添加状态（在 `selectedGuest` 状态之后）：

```typescript
const [quickBooking, setQuickBooking] = useState<{
  bed: Bed;
  room: Room;
  date: Date;
} | null>(null);
```

**Step 4:** 修改空位价格提示区域（第 287-297 行），将 `pointer-events-none` 改为可点击，并添加点击处理：

替换原有的空位价格提示代码块：

```tsx
{/* Empty slot — clickable for quick booking */}
{bed.status !== 'occupied' && (() => {
  const booking = getBookingForDate(bookings, date);
  return !booking;
})() && (
  <div
    key={date.toISOString()}
    className="flex-1 flex items-center justify-center cursor-pointer hover:bg-emerald-50/50 transition-colors group/empty"
    onClick={() => setQuickBooking({ bed, room, date })}
  >
    <span className="text-[10px] font-medium text-emerald-500/40 group-hover/empty:text-emerald-500 transition-colors">
      ${getBedPrice(room, bed)}
    </span>
  </div>
)}
```

**注意：** 上面的空位点击需要放在日期列循环中。需要重构空位渲染逻辑——将原来在整个 bed row 层级的空位价格提示，改为在每个日期格子中独立渲染。具体做法：

删除第 287-297 行的整个 `{/* Empty slot price hints */}` 块。

在日期列背景循环中（第 251-261 行），将每个日期格子的 `<div>` 改为可交互的：

```tsx
{/* Day column backgrounds + empty slot click targets */}
<div className="absolute inset-0 flex">
  {dates.map((date, index) => {
    const booking = getBookingForDate(bookings, date);
    const isEmptySlot = !booking && bed.status !== 'occupied';
    return (
      <div
        key={date.toISOString()}
        className={cn(
          "flex-1 border-r border-zinc-100",
          isSameDay(date, today) ? "bg-amber-50/10" : "",
          isEmptySlot && "cursor-pointer hover:bg-emerald-50/40 transition-colors"
        )}
        onClick={() => {
          if (isEmptySlot) {
            setQuickBooking({ bed, room, date });
          }
        }}
      >
        {isEmptySlot && (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px] font-medium text-emerald-500/30">${getBedPrice(room, bed)}</span>
          </div>
        )}
      </div>
    );
  })}
</div>
```

**Step 5:** 在组件底部（Guest Detail Modal 之后）添加 QuickBookingModal：

```tsx
{/* Quick Booking Modal */}
<QuickBookingModal
  isOpen={!!quickBooking}
  onClose={() => setQuickBooking(null)}
  bed={quickBooking?.bed!}
  room={quickBooking?.room!}
  initialDate={quickBooking?.date || new Date()}
/>
```

**验证:** 点击日历中的空位格子，弹出快速预订表单，填写后提交，确认客人出现在对应床位上。

---

## Task 2: 拖拽调整入住/退房日期

- [ ] 2.1 添加 i18n 键值
- [ ] 2.2 为 CalendarBookingBlock 添加边缘拖拽手柄
- [ ] 2.3 实现拖拽逻辑与日期更新

### 2.1 添加 i18n 键值

在 `en.calendarview` 中追加：

```typescript
dragCheckIn: "Drag to change check-in",
dragCheckOut: "Drag to change check-out",
minOneNight: "Minimum 1 night stay",
datesUpdated: "Dates updated",
```

在 `zh.calendarview` 中追加：

```typescript
dragCheckIn: "拖拽调整入住日期",
dragCheckOut: "拖拽调整退房日期",
minOneNight: "最少入住1晚",
datesUpdated: "日期已更新",
```

### 2.2 为 CalendarBookingBlock 添加边缘拖拽手柄

修改 `/Users/ricky/AICode/hostelite/src/components/CalendarView.tsx`

**Step 1:** 在文件顶部添加导入：

```typescript
import { differenceInDays } from 'date-fns';
```

**Step 2:** 扩展 `CalendarBookingBlock` 的 props，添加拖拽回调：

```typescript
function CalendarBookingBlock({
  booking,
  visibleDays,
  dateIndex,
  visibleNights,
  isContinuation,
  onClick,
  onDragCheckIn,
  onDragCheckOut,
}: {
  booking: Guest;
  visibleDays: number;
  dateIndex: number;
  visibleNights: number;
  isContinuation?: boolean;
  onClick: () => void;
  onDragCheckIn?: (deltaDays: number) => void;
  onDragCheckOut?: (deltaDays: number) => void;
}) {
```

**Step 3:** 在 booking block 的 div 内部，添加左右拖拽手柄。在 `<span className="text-[11px]...">` 之前添加：

```tsx
{/* Left edge handle — drag to change check-in */}
{onDragCheckIn && !isContinuation && (
  <div
    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-blue-200/50 rounded-l-lg transition-colors"
    onMouseDown={(e) => {
      e.stopPropagation();
      const startX = e.clientX;
      const dayWidth = (e.currentTarget.parentElement!.offsetWidth) / visibleNights;
      const onMouseMove = (moveEvent: MouseEvent) => {
        // Visual feedback handled by CSS
      };
      const onMouseUp = (upEvent: MouseEvent) => {
        const deltaPx = upEvent.clientX - startX;
        const deltaDays = Math.round(deltaPx / dayWidth);
        if (deltaDays !== 0) onDragCheckIn(deltaDays);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }}
  />
)}

{/* Right edge handle — drag to change check-out */}
{onDragCheckOut && (
  <div
    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-blue-200/50 rounded-r-lg transition-colors"
    onMouseDown={(e) => {
      e.stopPropagation();
      const startX = e.clientX;
      const dayWidth = (e.currentTarget.parentElement!.offsetWidth) / visibleNights;
      const onMouseMove = (moveEvent: MouseEvent) => {
        // Visual feedback handled by CSS
      };
      const onMouseUp = (upEvent: MouseEvent) => {
        const deltaPx = upEvent.clientX - startX;
        const deltaDays = Math.round(deltaPx / dayWidth);
        if (deltaDays !== 0) onDragCheckOut(deltaDays);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }}
  />
)}
```

### 2.3 实现拖拽逻辑与日期更新

在 `CalendarView` 组件中，为 `CalendarBookingBlock` 添加拖拽回调 props：

修改第 272-279 行的 `<CalendarBookingBlock>` 调用：

```tsx
<CalendarBookingBlock
  key={booking.id}
  booking={booking}
  visibleDays={visibleDays}
  dateIndex={index}
  visibleNights={visibleNights}
  isContinuation={isFirstDayVisible && !isCheckInDay}
  onClick={() => setSelectedGuest(booking)}
  onDragCheckIn={(deltaDays: number) => {
    const currentCheckIn = parseISO(booking.checkInDate);
    const currentCheckOut = parseISO(booking.checkOutDate);
    const newCheckIn = addDays(currentCheckIn, deltaDays);
    // Ensure at least 1 night: newCheckIn must be before checkOut
    if (newCheckIn.getTime() >= currentCheckOut.getTime()) return;
    const newNights = differenceInDays(currentCheckOut, newCheckIn);
    if (newNights < 1) return;
    updateArrival(booking.id, {
      checkInDate: format(newCheckIn, 'yyyy-MM-dd'),
      nights: newNights,
    });
  }}
  onDragCheckOut={(deltaDays: number) => {
    const currentCheckIn = parseISO(booking.checkInDate);
    const currentCheckOut = parseISO(booking.checkOutDate);
    const newCheckOut = addDays(currentCheckOut, deltaDays);
    // Ensure at least 1 night: checkOut must be after checkIn
    if (newCheckOut.getTime() <= currentCheckIn.getTime()) return;
    const newNights = differenceInDays(newCheckOut, currentCheckIn);
    if (newNights < 1) return;
    updateArrival(booking.id, {
      checkOutDate: format(newCheckOut, 'yyyy-MM-dd'),
      nights: newNights,
    });
  }}
/>
```

**注意：** 需要从 `useHostel()` 中解构 `updateArrival`：

```typescript
const { rooms, updateArrival } = useHostel();
```

**验证:** 悬浮在 booking block 左右边缘时出现拖拽手柄，拖拽后入住/退房日期正确更新，nights 自动重算，最少保持 1 晚。

---

## Task 3: 悬浮操作按钮

- [ ] 3.1 添加 i18n 键值
- [ ] 3.2 在 CalendarBookingBlock 上添加 hover 操作按钮

### 3.1 添加 i18n 键值

在 `en.calendarview` 中追加：

```typescript
actionCheckIn: "Check-in",
actionCheckout: "Check-out",
actionEdit: "Edit",
```

在 `zh.calendarview` 中追加：

```typescript
actionCheckIn: "入住",
actionCheckout: "退房",
actionEdit: "编辑",
```

### 3.2 在 CalendarBookingBlock 上添加 hover 操作按钮

修改 `CalendarBookingBlock` 组件，添加 `onCheckIn`、`onCheckout`、`onEdit` 回调 props：

```typescript
function CalendarBookingBlock({
  booking,
  visibleDays,
  dateIndex,
  visibleNights,
  isContinuation,
  onClick,
  onDragCheckIn,
  onDragCheckOut,
  onCheckIn,
  onCheckout,
  onEdit,
}: {
  booking: Guest;
  visibleDays: number;
  dateIndex: number;
  visibleNights: number;
  isContinuation?: boolean;
  onClick: () => void;
  onDragCheckIn?: (deltaDays: number) => void;
  onDragCheckOut?: (deltaDays: number) => void;
  onCheckIn?: () => void;
  onCheckout?: () => void;
  onEdit?: () => void;
}) {
```

在 booking block 的 div 内部（在拖拽手柄之后、文字内容之前），添加操作按钮组：

```tsx
{/* Hover action buttons */}
{(onCheckIn || onCheckout || onEdit) && widthPercent > 12 && (
  <div className="absolute top-0.5 right-1 flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity z-30">
    {onCheckIn && (
      <button
        onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
        className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
        title={t('calendarview.actionCheckIn')}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
      </button>
    )}
    {onCheckout && (
      <button
        onClick={(e) => { e.stopPropagation(); onCheckout(); }}
        className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
        title={t('calendarview.actionCheckout')}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
      </button>
    )}
    {onEdit && (
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="p-1 rounded bg-zinc-500 text-white hover:bg-zinc-600 transition-colors shadow-sm"
        title={t('calendarview.actionEdit')}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
    )}
  </div>
)}
```

**注意：** 需要在 booking block 的外层 div 上添加 `group/block` class：

```tsx
<div
  className={cn(
    "absolute top-1 bottom-1 z-10 px-2 flex flex-col justify-center overflow-hidden border shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-[0.98] group/block",
    // ... existing classes
  )}
  // ...
>
```

同时在 `CalendarView` 中为 `CalendarBookingBlock` 传入回调：

```tsx
<CalendarBookingBlock
  // ... existing props
  onCheckIn={() => {
    // Find the bed this guest is on and assign
    const targetBed = rooms.flatMap(r => r.beds).find(b =>
      b.reservations?.some(r => r.id === booking.id)
    );
    if (targetBed) assignArrival(booking.id, targetBed.id);
  }}
  onCheckout={() => {
    const targetBed = rooms.flatMap(r => r.beds).find(b =>
      b.guest?.id === booking.id
    );
    if (targetBed) checkoutGuest(targetBed.id);
  }}
  onEdit={() => setSelectedGuest(booking)}
/>
```

**注意：** 需要从 `useHostel()` 中解构 `assignArrival` 和 `checkoutGuest`：

```typescript
const { rooms, updateArrival, assignArrival, checkoutGuest } = useHostel();
```

**验证:** 悬浮在 booking block 上时，右侧出现操作按钮。点击 Check-in 按钮将预订客人分配到床位，点击 Checkout 按钮退房，点击 Edit 按钮打开详情模态框。

---

## Task 4: 筛选栏

- [ ] 4.1 添加 i18n 键值
- [ ] 4.2 在 CalendarView 头部添加筛选栏

### 4.1 添加 i18n 键值

在 `en.calendarview` 中追加：

```typescript
filter: "Filter",
roomType: "Room Type",
allRooms: "All Rooms",
mixedDorm: "Mixed Dorm",
femaleDorm: "Female Dorm",
privateRoom: "Private Room",
status: "Status",
allStatuses: "All Statuses",
occupied: "Occupied",
empty: "Empty",
reserved: "Reserved",
cleaning: "Cleaning",
```

在 `zh.calendarview` 中追加：

```typescript
filter: "筛选",
roomType: "房间类型",
allRooms: "所有房间",
mixedDorm: "混合多人间",
femaleDorm: "女生多人间",
privateRoom: "独立房间",
status: "状态",
allStatuses: "所有状态",
occupied: "已入住",
empty: "空床",
reserved: "已预留",
cleaning: "待清洁",
```

### 4.2 在 CalendarView 头部添加筛选栏

修改 `/Users/ricky/AICode/hostelite/src/components/CalendarView.tsx`

**Step 1:** 添加导入：

```typescript
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
```

**Step 2:** 在 `CalendarView` 组件中添加筛选状态（在 `quickBooking` 状态之后）：

```typescript
const [roomTypeFilter, setRoomTypeFilter] = useState('all');
const [statusFilter, setStatusFilter] = useState('all');
```

**Step 3:** 添加筛选逻辑，在 `rooms.map` 之前创建 filteredRooms：

```typescript
const filteredRooms = useMemo(() => rooms
  .filter(room => roomTypeFilter === 'all' || room.type === roomTypeFilter)
  .map(room => ({
    ...room,
    beds: room.beds.filter(bed =>
      statusFilter === 'all' || bed.status === statusFilter
    ),
  }))
  .filter(room => room.beds.length > 0),
[rooms, roomTypeFilter, statusFilter]);
```

**Step 4:** 在 header 区域（第 150-177 行），在日期导航之前添加筛选栏。在 `{/* Header */}` 的 `<div className="flex items-center gap-2 md:gap-3 ...">` 内，在图例（payment status legend）之前添加：

```tsx
{/* Filters */}
<div className="flex items-center gap-2">
  <Filter className="h-3.5 w-3.5 text-zinc-400" />
  <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
    <SelectTrigger className="h-7 w-[110px] text-[11px] bg-white border-zinc-200">
      <SelectValue placeholder={t('calendarview.roomType')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{t('calendarview.allRooms')}</SelectItem>
      <SelectItem value="dorm-mixed">{t('calendarview.mixedDorm')}</SelectItem>
      <SelectItem value="dorm-female">{t('calendarview.femaleDorm')}</SelectItem>
      <SelectItem value="private">{t('calendarview.privateRoom')}</SelectItem>
    </SelectContent>
  </Select>
  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="h-7 w-[110px] text-[11px] bg-white border-zinc-200">
      <SelectValue placeholder={t('calendarview.status')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{t('calendarview.allStatuses')}</SelectItem>
      <SelectItem value="occupied">{t('calendarview.occupied')}</SelectItem>
      <SelectItem value="empty">{t('calendarview.empty')}</SelectItem>
      <SelectItem value="reserved">{t('calendarview.reserved')}</SelectItem>
      <SelectItem value="cleaning">{t('calendarview.cleaning')}</SelectItem>
    </SelectContent>
  </Select>
</div>
<div className="h-4 w-px bg-zinc-200 hidden md:block" />
```

**Step 5:** 将 Room Rows 渲染中的 `rooms.map` 替换为 `filteredRooms.map`（第 209 行）。

**验证:** 切换房间类型和状态筛选，日历中只显示符合条件的房间和床位。

---

## Task 5: 导航增强

- [ ] 5.1 添加 i18n 键值
- [ ] 5.2 添加迷你月份选择器
- [ ] 5.3 添加入住率摘要

### 5.1 添加 i18n 键值

在 `en.calendarview` 中追加：

```typescript
avgOccupancy: "avg occupancy",
pickDate: "Pick date",
```

在 `zh.calendarview` 中追加：

```typescript
avgOccupancy: "平均入住率",
pickDate: "选择日期",
```

### 5.2 添加迷你月份选择器

修改 `/Users/ricky/AICode/hostelite/src/components/CalendarView.tsx`

**Step 1:** 添加导入：

```typescript
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isWithinInterval } from 'date-fns';
```

**Step 2:** 在 `CalendarView` 组件中添加状态：

```typescript
const [showDatePicker, setShowDatePicker] = useState(false);
```

**Step 3:** 创建迷你月份选择器组件（在 `CalendarView` 函数外部定义）：

```tsx
function MiniMonthPicker({
  currentMonth,
  onDateSelect,
  onClose,
}: {
  currentMonth: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart); // 0=Sun

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 z-50 w-[260px]"
    >
      <div className="text-center text-xs font-semibold text-zinc-700 mb-2">
        {format(currentMonth, 'MMMM yyyy')}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {weekDays.map(d => (
          <span key={d} className="text-[9px] font-medium text-zinc-400 py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDay }).map((_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {days.map(day => (
          <button
            key={day.toISOString()}
            className="text-[11px] py-1 rounded hover:bg-zinc-100 transition-colors text-zinc-700 hover:text-zinc-900"
            onClick={() => { onDateSelect(day); onClose(); }}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
```

**Step 4:** 在 header 的日期范围显示区域，将日期范围文本改为可点击，触发日期选择器：

将第 166-168 行的日期范围显示：

```tsx
<span className="text-xs font-semibold text-zinc-700 min-w-[100px] md:min-w-[120px] text-center">
  {format(dates[0], 'MMM d')} – {format(dates[dates.length - 1], 'MMM d')}
</span>
```

替换为：

```tsx
<div className="relative">
  <button
    className="text-xs font-semibold text-zinc-700 min-w-[100px] md:min-w-[120px] text-center hover:text-emerald-600 transition-colors"
    onClick={() => setShowDatePicker(prev => !prev)}
  >
    {format(dates[0], 'MMM d')} – {format(dates[dates.length - 1], 'MMM d')}
  </button>
  <AnimatePresence>
    {showDatePicker && (
      <MiniMonthPicker
        currentMonth={startDate}
        onDateSelect={(date) => setStartDate(startOfDay(date))}
        onClose={() => setShowDatePicker(false)}
      />
    )}
  </AnimatePresence>
</div>
```

**Step 5:** 点击外部关闭日期选择器——添加 useEffect：

```typescript
useEffect(() => {
  if (!showDatePicker) return;
  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) {
      setShowDatePicker(false);
    }
  };
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [showDatePicker]);
```

### 5.3 添加入住率摘要

在 header 区域的日期导航之后添加入住率摘要：

```tsx
{/* Occupancy summary */}
{(() => {
  const totalBeds = filteredRooms.reduce((acc, r) => acc + r.beds.length, 0);
  if (totalBeds === 0) return null;
  const totalBedNights = totalBeds * visibleDays;
  let occupiedBedNights = 0;
  filteredRooms.forEach(room => {
    room.beds.forEach(bed => {
      const bookings = getBookingsForBed(bed);
      dates.forEach(date => {
        if (getBookingForDate(bookings, date)) {
          occupiedBedNights++;
        }
      });
    });
  });
  const avgOccupancy = Math.round((occupiedBedNights / totalBedNights) * 100);
  return (
    <span className="text-[10px] font-medium text-zinc-400 hidden lg:inline">
      {format(dates[0], 'MMM d')}–{format(dates[dates.length - 1], 'MMM d')}: {avgOccupancy}% {t('calendarview.avgOccupancy')}
    </span>
  );
})()}
```

**验证:** 点击日期范围文本弹出迷你月份选择器，选择日期后跳转。header 右侧显示可见日期范围内的平均入住率。

---

## 完整 i18n 键值汇总

### en.calendarview（替换整个对象）

```typescript
calendarview: {
  today: "Today",
  quickBooking: "Quick Booking",
  guestName: "Guest Name",
  country: "Country",
  gender: "Gender",
  checkIn: "Check-in",
  checkOut: "Check-out",
  source: "Source",
  createBooking: "Create Booking",
  bookingCreated: "Booking created!",
  selectCountry: "Select country",
  selectGender: "Select gender",
  selectSource: "Select source",
  namePlaceholder: "Enter guest name",
  clickToBook: "Click to book",
  dragCheckIn: "Drag to change check-in",
  dragCheckOut: "Drag to change check-out",
  minOneNight: "Minimum 1 night stay",
  datesUpdated: "Dates updated",
  actionCheckIn: "Check-in",
  actionCheckout: "Check-out",
  actionEdit: "Edit",
  filter: "Filter",
  roomType: "Room Type",
  allRooms: "All Rooms",
  mixedDorm: "Mixed Dorm",
  femaleDorm: "Female Dorm",
  privateRoom: "Private Room",
  status: "Status",
  allStatuses: "All Statuses",
  occupied: "Occupied",
  empty: "Empty",
  reserved: "Reserved",
  cleaning: "Cleaning",
  avgOccupancy: "avg occupancy",
  pickDate: "Pick date",
},
```

### zh.calendarview（替换整个对象）

```typescript
calendarview: {
  today: "今天",
  quickBooking: "快速预订",
  guestName: "客人姓名",
  country: "国家",
  gender: "性别",
  checkIn: "入住日期",
  checkOut: "退房日期",
  source: "来源",
  createBooking: "创建预订",
  bookingCreated: "预订已创建！",
  selectCountry: "选择国家",
  selectGender: "选择性别",
  selectSource: "选择来源",
  namePlaceholder: "输入客人姓名",
  clickToBook: "点击预订",
  dragCheckIn: "拖拽调整入住日期",
  dragCheckOut: "拖拽调整退房日期",
  minOneNight: "最少入住1晚",
  datesUpdated: "日期已更新",
  actionCheckIn: "入住",
  actionCheckout: "退房",
  actionEdit: "编辑",
  filter: "筛选",
  roomType: "房间类型",
  allRooms: "所有房间",
  mixedDorm: "混合多人间",
  femaleDorm: "女生多人间",
  privateRoom: "独立房间",
  status: "状态",
  allStatuses: "所有状态",
  occupied: "已入住",
  empty: "空床",
  reserved: "已预留",
  cleaning: "待清洁",
  avgOccupancy: "平均入住率",
  pickDate: "选择日期",
},
```

---

## 文件变更清单

| 文件 | 操作 | Task |
|------|------|------|
| `src/HostelContext.tsx` | 修改 updateArrival 签名 | Task 0 |
| `src/i18nContext.tsx` | 添加 calendarview 键值 | Task 1-5 |
| `src/components/QuickBookingModal.tsx` | 新建 | Task 1 |
| `src/components/CalendarView.tsx` | 修改（主要变更文件） | Task 1-5 |

## 实施顺序

```
Task 0 (前置) → Task 1 (点击创建) → Task 4 (筛选栏) → Task 3 (悬浮按钮) → Task 2 (拖拽日期) → Task 5 (导航增强)
```

建议先完成 Task 0 和 Task 1，因为它们是最核心的交互功能。Task 4 筛选栏相对独立且简单。Task 3 悬浮按钮依赖 Task 1 的模态框。Task 2 拖拽日期最复杂，建议放在后面。Task 5 导航增强是锦上添花。
