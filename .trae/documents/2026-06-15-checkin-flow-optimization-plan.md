# CheckInPanel 入住流程优化 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 CheckInPanel 从"3 sub-tab + 5 卡片详情"重构为"H2 架构 + ⚡ 今日待办规则排序队列 + 4 项并行 checklist"，目标 < 60s 完成一单入住，零 tab 跳转，无 AI 依赖。

**Architecture:** 在原 `CheckInPanel.tsx` 内新增一个 `⚡ 今日待办` sub-tab（默认首页），用纯规则评分（时间临近 + 未办件数 + 人工置顶）排序；点击客人展开 4 项并行 checklist（录护照/收钱/选床/存备注），全勾后自动转"已入住"。原 3 个 sub-tab 完全保留。新增纯函数 `priorityEngine.ts` / `incompleteness.ts`，无 React 依赖，单测友好。

**Tech Stack:** React 19 + TypeScript + TailwindCSS 4 + date-fns + motion (Framer Motion)。`tsc --noEmit` 是项目唯一的 lint 门禁（`package.json` scripts.lint）。

**Spec:** [.trae/documents/2026-06-15-checkin-flow-optimization-design.md](file:///Users/ricky/AICode/hostelite/.trae/documents/2026-06-15-checkin-flow-optimization-design.md)

**Test Setup Note:** 项目无 vitest/jest 框架，行为正确性通过 `tsc --noEmit` + 手动 dev server 验证。`utils/priorityEngine.ts` 和 `utils/incompleteness.ts` 写成纯函数以备后续接入 vitest。

---

## Task 1: 类型扩展 + 数据迁移

**Files:**
- Modify: `src/types.ts:1-80`（`Guest` interface）
- Modify: `src/HostelContext.tsx:35-50`（`loadPersistedState` 数据迁移）

- [ ] **Step 1: 在 Guest interface 加 3 个新字段**

打开 `src/types.ts`，找到 `export interface Guest {` 块，在末尾添加：

```ts
export interface Guest {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  gender: "male" | "female" | "other";
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  paymentStatus: "paid" | "unpaid" | "partial";
  totalAmount: number;
  paidAmount?: number;
  passportScanned: boolean;
  passportOrId?: string;
  dob?: string;
  policeConsent: boolean;
  notes?: string;
  source: "walk-in" | "booking" | "airbnb" | "hostelworld" | "direct" | "other";
  roomPreference?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  // ── 新增字段（2026-06-15 spec §6.1）──
  pinned?: boolean;          // 人工置顶
  assignedBedId?: string;    // 显式记录已分配床位
  notesSkipped?: boolean;    // 备注被显式跳过
}
```

- [ ] **Step 2: 提升 STORAGE_VERSION 并加迁移逻辑**

在 `src/HostelContext.tsx` 顶部修改：

```ts
const STORAGE_KEY = 'bunkdesk_state_v1';
const STORAGE_VERSION = 2;  // 1 → 2（加 assignedBedId 反向映射）
```

- [ ] **Step 3: 在 loadPersistedState 后加迁移**

在 `src/HostelContext.tsx` 找到 `loadPersistedState` 函数，在 `return { ...fallback, ...parsed.data };` 之后替换为：

```ts
function migrateV1toV2(data: HostelPersisted): HostelPersisted {
  // 反向映射：bed.guest 存在 → 写入 guest.assignedBedId
  const guestIdToBedId = new Map<string, string>();
  for (const room of data.rooms) {
    for (const bed of room.beds) {
      if (bed.guest) {
        guestIdToBedId.set(bed.guest.id, bed.id);
      }
    }
  }
  const arrivals = data.arrivals.map(g => ({
    ...g,
    pinned: g.pinned ?? false,
    assignedBedId: g.assignedBedId ?? guestIdToBedId.get(g.id),
    notesSkipped: g.notesSkipped ?? false,
  }));
  return { ...data, arrivals };
}
```

并在 `loadPersistedState` 末尾调用：

```ts
return migrateV1toV2({ ...fallback, ...parsed.data });
```

- [ ] **Step 4: 类型校验**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/HostelContext.tsx
git commit -m "feat(checkin): add pinned/assignedBedId/notesSkipped fields + v1→v2 migration"
```

---

## Task 2: priorityEngine.ts 纯函数

**Files:**
- Create: `src/utils/priorityEngine.ts`

- [ ] **Step 1: 创建文件**

新建 `src/utils/priorityEngine.ts`：

```ts
import { Guest } from '../types';
import { parseISO, differenceInMinutes } from 'date-fns';

export const WEIGHT_TIME = 30;
export const WEIGHT_INCOMPLETE = 20;
export const PIN_BONUS = 1_000_000;

/**
 * Time proximity score (0..1).
 *  - ≤ 1h:    1.0
 *  - ≤ 4h:    0.7
 *  - ≤ 12h:   0.4
 *  - ≤ 24h:   0.2
 *  - > 24h:   0
 *  - past:    0.5  (arrived but not yet checked in)
 */
export function timeProximityScore(checkInDate: string, now: Date): number {
  const minutes = differenceInMinutes(parseISO(checkInDate), now);
  if (minutes <= 0)    return 0.5;   // 客人已到 / 过期
  if (minutes <= 60)   return 1.0;
  if (minutes <= 240)  return 0.7;
  if (minutes <= 720)  return 0.4;
  if (minutes <= 1440) return 0.2;
  return 0;
}

/**
 * Incompleteness count 0..4.
 *  - passport: !passportScanned
 *  - payment: paymentStatus !== 'paid'
 *  - bed:     !assignedBedId
 *  - notes:   !notes?.trim() && !notesSkipped
 */
export function incompletenessCount(guest: Guest): number {
  const items = [
    !guest.passportScanned,
    guest.paymentStatus !== 'paid',
    !guest.assignedBedId,
    !guest.notes?.trim() && !guest.notesSkipped,
  ];
  return items.filter(Boolean).length;
}

/**
 * Total priority score. Higher = more urgent.
 */
export function scoreGuest(guest: Guest, now: Date): number {
  if (guest.pinned) return PIN_BONUS + 1;
  return (
    WEIGHT_TIME * timeProximityScore(guest.checkInDate, now) +
    WEIGHT_INCOMPLETE * incompletenessCount(guest)
  );
}

/**
 * Sort guests by priority score, descending.
 * Stable: same score keeps original order.
 */
export function sortByPriority(guests: Guest[], now: Date = new Date()): Guest[] {
  return [...guests]
    .map((g, idx) => ({ g, idx, s: scoreGuest(g, now) }))
    .sort((a, b) => b.s - a.s || a.idx - b.idx)
    .map(x => x.g);
}
```

- [ ] **Step 2: 类型校验**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/priorityEngine.ts
git commit -m "feat(checkin): add priorityEngine with rule-based scoring"
```

---

## Task 3: incompleteness.ts 详情导出

**Files:**
- Create: `src/utils/incompleteness.ts`

- [ ] **Step 1: 创建文件**

新建 `src/utils/incompleteness.ts`：

```ts
import { Guest } from '../types';

export interface IncompletenessBreakdown {
  passport: boolean;
  payment: boolean;
  bed: boolean;
  notes: boolean;
  count: number;
}

export function computeIncompleteness(guest: Guest): IncompletenessBreakdown {
  const breakdown = {
    passport: !guest.passportScanned,
    payment: guest.paymentStatus !== 'paid',
    bed: !guest.assignedBedId,
    notes: !guest.notes?.trim() && !guest.notesSkipped,
  };
  return { ...breakdown, count: Object.values(breakdown).filter(Boolean).length };
}

export function isItemDone(guest: Guest, itemKey: keyof Omit<IncompletenessBreakdown, 'count'>): boolean {
  return !computeIncompleteness(guest)[itemKey];
}

export function allItemsDone(guest: Guest): boolean {
  return computeIncompleteness(guest).count === 0;
}
```

- [ ] **Step 2: 类型校验**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/incompleteness.ts
git commit -m "feat(checkin): add incompleteness breakdown utility"
```

---

## Task 4: HostelContext 新增 actions

**Files:**
- Modify: `src/HostelContext.tsx:65-110`（HostelState interface）
- Modify: `src/HostelContext.tsx:200-350`（provider 实现）

- [ ] **Step 1: HostelState interface 加 3 个 action**

在 `src/HostelContext.tsx` 找到 `interface HostelState {`，在 `updateArrival` 附近添加：

```ts
interface HostelState {
  // ... 现有字段
  pinGuest: (guestId: string) => void;
  unpinGuest: (guestId: string) => void;
  markNotesSkipped: (guestId: string) => void;
  // ... 其他 actions
}
```

- [ ] **Step 2: 在 provider 实现里添加 3 个函数**

找到 `assignArrival` 的实现（约 200-220 行），在其后添加：

```ts
const pinGuest = useCallback((guestId: string) => {
  setArrivals(prev => prev.map(g => g.id === guestId ? { ...g, pinned: true } : g));
}, []);

const unpinGuest = useCallback((guestId: string) => {
  setArrivals(prev => prev.map(g => g.id === guestId ? { ...g, pinned: false } : g));
}, []);

const markNotesSkipped = useCallback((guestId: string) => {
  setArrivals(prev => prev.map(g => g.id === guestId ? { ...g, notesSkipped: true } : g));
}, []);
```

并在 `useMemo` 的返回值里加：

```ts
return {
  // ... 现有字段
  pinGuest, unpinGuest, markNotesSkipped,
};
```

- [ ] **Step 3: 类型校验**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/HostelContext.tsx
git commit -m "feat(checkin): add pin/unpin/markNotesSkipped actions"
```

---

## Task 5: i18n 键中英双语补齐

**Files:**
- Modify: `src/i18nContext.tsx:376-430`（`en.checkin` 块）
- Modify: `src/i18nContext.tsx:1300-1360`（`zh.checkin` 块）

- [ ] **Step 1: 在 en.checkin 加 18 个新键**

打开 `src/i18nContext.tsx`，定位到 `checkin: {` 的英文版块（line 376 附近）。在已有键的末尾、`}` 之前，插入：

```ts
partial: "Partial",
// ── 2026-06-15 spec §6.4 新增键（中英同步）──
todayQueue: "Today's Queue",
pinToTop: "📌 Pin to top",
unpin: "Unpin",
fullDetails: "View full details (5 cards, read-only)",
autoCompleteNote: 'All checked → auto-merge to "Checked-in"',
checklistPassport: "① Scan passport",
checklistPayment: "② Mark as paid",
checklistBed: "③ Pick a bed",
checklistNotes: "④ Add note",
notesPlaceholder: "e.g. vegan / window bed / airport pickup",
scanConfirm: "Confirm scan",
skipNotes: "Skip",
markAsPaid: "Mark as paid",
paidAmountHint: "Received offline (cash / card / bank transfer / OTA pre-pay)",
priorityRule: "Sort: time proximity 30% + missing items 20% + 📌 pin ×∞",
missingBed: "⚠️ Bed not yet assigned",
noAvailableBeds: "No available beds",
incompleteBadge: "missing {count}",
```

> `{count}` 是占位符，由 i18nContext 已支持的 `t(path, params)` 替换。

- [ ] **Step 2: 在 zh.checkin 加同样 18 个新键**

定位到 `checkin: {` 的中文版块（line 1300 附近），在已有键的末尾、`}` 之前，插入：

```ts
partial: "部分付款",
// ── 2026-06-15 spec §6.4 新增键（中英同步）──
todayQueue: "今日待办",
pinToTop: "📌 置顶",
unpin: "取消置顶",
fullDetails: "查看完整信息（5 卡片只读）",
autoCompleteNote: '全部勾选后自动转为"已入住"',
checklistPassport: "① 录护照",
checklistPayment: "② 收钱",
checklistBed: "③ 选床",
checklistNotes: "④ 存备注",
notesPlaceholder: "例：素食 / 靠窗 / 接机",
scanConfirm: "确认录入",
skipNotes: "跳过",
markAsPaid: "标记为已收款",
paidAmountHint: "实际收钱在前台线下处理（现金/刷卡/银行转账/OTA 预付等）",
priorityRule: "排序规则：时间临近 30% + 未办件数 20% + 📌 置顶 ×∞",
missingBed: "⚠️ 缺少床位",
noAvailableBeds: "无可用床位",
incompleteBadge: "缺 {count} 项",
```

- [ ] **Step 3: 验证 t() 参数化替换工作**

打开 `src/components/CheckInPanel.tsx`，搜索 `incompleteBadge` 不应存在（因为还没用）。然后通过 `tsc --noEmit` 确认键被识别：

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/i18nContext.tsx
git commit -m "feat(checkin): add bilingual i18n keys for smart queue (EN+ZH, 18 keys)"
```

---

## Task 6: 新 sub-tab "⚡ 今日待办" 入口

**Files:**
- Modify: `src/components/CheckInPanel.tsx:24-49`（state + 数据源）
- Modify: `src/components/CheckInPanel.tsx:152-175`（sub-tab 切换条）

- [ ] **Step 1: 改 SubTab type 加上 todayQueue**

打开 `src/components/CheckInPanel.tsx`，找到 `type SubTab = 'pending' | 'checked-in' | 'reserved';` 改为：

```ts
type SubTab = 'todayQueue' | 'pending' | 'checked-in' | 'reserved';
```

- [ ] **Step 2: 改 useState 默认值**

```ts
const [subTab, setSubTab] = useState<SubTab>('todayQueue');
```

- [ ] **Step 3: 改 sub-tab 切换条**

找到渲染 sub-tab 的那段（`{([...]).map(tab => (` 块），在数组开头插入新 tab：

```tsx
{(['todayQueue', 'pending', 'checked-in', 'reserved'] as const).map(tab => {
  const meta = {
    todayQueue: { label: t('checkin.todayQueue'), count: todayQueueCount, color: 'text-amber-600' },
    pending:    { label: t('checkin.pending'),    count: pendingCount,    color: 'text-amber-600' },
    checkedIn:  { label: t('checkin.checkedIn'),  count: checkedInCount,  color: 'text-emerald-600' },
    reserved:   { label: t('checkin.reserved'),   count: reservedCount,   color: 'text-blue-600' },
  }[tab];
  return (
    <button key={tab} onClick={() => setSubTab(tab)} ...>
      {meta.label} <span ...>{meta.count}</span>
    </button>
  );
})}
```

- [ ] **Step 4: 计算 todayQueueCount**

在 `CheckInPanel` 函数体里 `const pendingCount = arrivals.length;` 之后加：

```ts
const todayQueueCount = useMemo(() => {
  const today = new Date().toISOString().slice(0, 10);
  const fromArrivals = arrivals.filter(g => g.checkInDate <= today).length;
  const fromReservations = rooms.flatMap(r => r.beds).flatMap(b => b.reservations || []).filter(res => res.checkInDate === today).length;
  return fromArrivals + fromReservations;
}, [arrivals, rooms]);
```

- [ ] **Step 5: 类型校验**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): add todayQueue sub-tab as default landing"
```

---

## Task 7: 智能队列视图（无 checklist，仅列表）

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（在 `subTab === 'pending'` 之前插入新分支）

- [ ] **Step 1: 计算排序后的队列**

在 `CheckInPanel` 函数体 `const roomSummaries = useMemo(...)` 之后加：

```ts
const todayQueueGuests = useMemo(() => {
  const today = new Date().toISOString().slice(0, 10);
  // 合并 arrivals + 今日 reservations
  const arrivalItems = arrivals.filter(g => g.checkInDate <= today);
  const reservationItems = rooms.flatMap(r => r.beds).flatMap(b => b.reservations || []).filter(res => res.checkInDate === today);
  // 统一成 Guest 形态
  const unified: Guest[] = [
    ...arrivalItems,
    ...reservationItems.map(r => ({ ...r, paymentStatus: r.paymentStatus || 'unpaid' as const, passportScanned: false, policeConsent: false, source: 'booking' as const, createdAt: '' })),
  ];
  return sortByPriority(unified);
}, [arrivals, rooms]);
```

- [ ] **Step 2: 渲染队列视图（最小版）**

找到 `{subTab === 'pending' && (` 之前，插入新分支：

```tsx
{subTab === 'todayQueue' && (
  <div className="flex-1 overflow-auto space-y-2 p-2">
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
      📌 {t('checkin.priorityRule')}
    </div>
    {todayQueueGuests.length === 0 ? (
      <div className="py-12 text-center text-sm text-zinc-400">{t('checkin.noEventsFound') /* 借用无数据文案 */}</div>
    ) : (
      todayQueueGuests.map(guest => {
        const breakdown = computeIncompleteness(guest);
        return (
          <div key={guest.id} className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-zinc-900">
                  {guest.pinned && '📌 '}{guest.name}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {guest.countryCode} · {guest.checkInDate} · {guest.nights}N
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded",
                  breakdown.count === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                  {breakdown.count === 0 ? t('checkin.allSettled') : t('checkin.incompleteBadge', { count: breakdown.count })}
                </span>
                <button onClick={() => guest.pinned ? unpinGuest(guest.id) : pinGuest(guest.id)}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg text-xs">
                  {guest.pinned ? t('checkin.unpin') : t('checkin.pinToTop')}
                </button>
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
)}
```

- [ ] **Step 3: import 新工具函数**

在 `CheckInPanel.tsx` 顶部 import 块加：

```ts
import { sortByPriority } from '../utils/priorityEngine';
import { computeIncompleteness } from '../utils/incompleteness';
```

并在 `useHostel()` 解构里加：

```ts
const { pinGuest, unpinGuest, ... } = useHostel();
```

- [ ] **Step 4: 类型校验 + 启动 dev server 验证**

Run: `npm run lint && npm run dev`
Expected: 0 errors，看到 ⚡ 今日待办 tab 默认选中，列表渲染客人，置顶按钮工作。

- [ ] **Step 5: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): render priority queue with pin/incompleteness badge"
```

---

## Task 8: ChecklistPanel 容器 + 状态管理

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（在 todayQueue 分支内加展开态）

- [ ] **Step 1: 选中的客人状态**

在 `CheckInPanel` 函数体加：

```ts
const [todayQueueSelectedId, setTodayQueueSelectedId] = useState<string | null>(null);
const todayQueueSelected = todayQueueGuests.find(g => g.id === todayQueueSelectedId);
```

- [ ] **Step 2: 列表行变可点击**

修改 Task 7 Step 2 的外层 div，加 onClick：

```tsx
<div key={guest.id} onClick={() => setTodayQueueSelectedId(guest.id)}
  className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-sm cursor-pointer hover:border-zinc-400">
```

- [ ] **Step 3: 详情面板（暂时只显示名字）**

在队列视图后面加详情面板（移动端在底部，桌面在右侧用 grid）：

```tsx
{todayQueueSelected && (
  <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-zinc-900">{todayQueueSelected.name}</h3>
      <button onClick={() => setTodayQueueSelectedId(null)} className="text-xs text-zinc-500">✕</button>
    </div>
    <div className="text-xs text-zinc-500">
      {todayQueueSelected.countryCode} · {todayQueueSelected.checkInDate} · {todayQueueSelected.nights}N
    </div>
    <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
      {t('checkin.autoCompleteNote')}
    </div>
  </div>
)}
```

- [ ] **Step 4: 类型校验 + 验证**

Run: `npm run lint && npm run dev`
Expected: 0 errors，点击列表行展开右侧/下方详情。

- [ ] **Step 5: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): add todayQueue detail panel (scaffold for checklist)"
```

---

## Task 9: ChecklistPanel — 4 项框架 + Item ① 录护照

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（替换 Task 8 的 placeholder 详情）

- [ ] **Step 1: 加展开态 + 扫描输入状态**

在 `CheckInPanel` 加：

```ts
const [expandedItem, setExpandedItem] = useState<'passport' | 'payment' | 'bed' | 'notes' | null>(null);
const [scanPassportValue, setScanPassportValue] = useState('');
const [scanDob, setScanDob] = useState('');
```

- [ ] **Step 2: 渲染 4 项 checklist**

替换 Task 8 Step 3 的 placeholder 详情为：

```tsx
{todayQueueSelected && (() => {
  const g = todayQueueSelected;
  const breakdown = computeIncompleteness(g);
  const allDone = breakdown.count === 0;
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">{g.name}</h3>
        <button onClick={() => setTodayQueueSelectedId(null)} className="text-xs text-zinc-500">✕</button>
      </div>
      <div className="text-xs text-zinc-500">
        {g.countryCode} · {g.checkInDate} · {g.nights}N
      </div>

      {/* 4 items */}
      <ItemRow label={t('checkin.checklistPassport')} done={!breakdown.passport}
        onClick={() => setExpandedItem(expandedItem === 'passport' ? null : 'passport')}
        isExpanded={expandedItem === 'passport'}>
        {expandedItem === 'passport' && (
          <div className="space-y-2 mt-2">
            <Input placeholder="Passport / ID" value={scanPassportValue}
              onChange={e => setScanPassportValue(e.target.value)} className="h-8 text-xs" />
            <Input type="date" value={scanDob} onChange={e => setScanDob(e.target.value)} className="h-8 text-xs" />
            <Button size="sm" onClick={async () => {
              await scanPassport(g.id);
              updateArrival(g.id, { passportOrId: scanPassportValue, dob: scanDob });
              setScanPassportValue(''); setScanDob('');
              setExpandedItem(null);
            }}>{t('checkin.scanConfirm')}</Button>
          </div>
        )}
      </ItemRow>
      {/* ... 其他 3 项在后续 Task */}
    </div>
  );
})()}
```

- [ ] **Step 3: 加 ItemRow 内部 helper 组件**

在 `CheckInPanel.tsx` 文件底部（export 之前）加：

```tsx
function ItemRow({ label, done, onClick, isExpanded, children }: {
  label: string;
  done: boolean;
  onClick: () => void;
  isExpanded: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("border rounded-xl p-3 transition-colors",
      isExpanded ? "border-blue-500 bg-blue-50/30" : "border-zinc-200 bg-white")}>
      <button onClick={onClick} className="w-full flex items-center justify-between text-left">
        <span className={cn("text-xs font-medium", done ? "text-zinc-400 line-through" : "text-zinc-900")}>
          {done ? '✅ ' : '🔲 '}{label}
        </span>
        <span className="text-[10px] text-zinc-500">{done ? '✓' : '点击展开'}</span>
      </button>
      {isExpanded && children}
    </div>
  );
}
```

- [ ] **Step 4: 类型校验**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): add 4-item checklist scaffold with passport item"
```

---

## Task 10: Item ② 收钱 + Item ④ 存备注

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（在 Task 9 的 ItemRow 后继续添加）

- [ ] **Step 1: 在 Item ① 之后添加 Item ② 收钱**

```tsx
<ItemRow label={t('checkin.checklistPayment')} done={!breakdown.payment}
  onClick={() => setExpandedItem(expandedItem === 'payment' ? null : 'payment')}
  isExpanded={expandedItem === 'payment'}>
  {expandedItem === 'payment' && (
    <div className="space-y-2 mt-2">
      <div className="text-xs text-zinc-700">
        {g.totalAmount != null ? `${g.totalAmount}` : '$0'} {t('checkin.payment')} · {g.paymentStatus}
      </div>
      <div className="text-[10px] text-zinc-500 italic">{t('checkin.paidAmountHint')}</div>
      <Button size="sm" onClick={async () => {
        await settlePayment(g.id);
        setExpandedItem(null);
      }}>{t('checkin.markAsPaid')}</Button>
    </div>
  )}
</ItemRow>
```

- [ ] **Step 2: 在 Item ② 之后添加 Item ④ 存备注**

先加备注输入 state：

```ts
const [notesValue, setNotesValue] = useState('');
```

然后加 Item：

```tsx
<ItemRow label={t('checkin.checklistNotes')} done={!breakdown.notes}
  onClick={() => setExpandedItem(expandedItem === 'notes' ? null : 'notes')}
  isExpanded={expandedItem === 'notes'}>
  {expandedItem === 'notes' && (
    <div className="space-y-2 mt-2">
      <Input placeholder={t('checkin.notesPlaceholder')} value={notesValue}
        onChange={e => setNotesValue(e.target.value)} className="h-8 text-xs" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => {
          updateArrival(g.id, { notes: notesValue });
          setNotesValue('');
          setExpandedItem(null);
        }}>{t('common.save') /* 借用通用 key */}</Button>
        <Button size="sm" variant="ghost" onClick={() => {
          markNotesSkipped(g.id);
          setNotesValue('');
          setExpandedItem(null);
        }}>{t('checkin.skipNotes')}</Button>
      </div>
    </div>
  )}
</ItemRow>
```

- [ ] **Step 3: 类型校验**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): add checklist items ② payment and ④ notes"
```

---

## Task 11: Item ③ 选床（复用 scoreBeds）

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（在 Item ② 和 ④ 之间插入 Item ③）

- [ ] **Step 1: 计算 scoredBeds**

在 `CheckInPanel` 函数体加：

```ts
const todayQueueScoredBeds = useMemo(() => {
  if (!todayQueueSelected) return [];
  return scoreBeds(todayQueueSelected, rooms).slice(0, 6);
}, [todayQueueSelected, rooms]);
```

- [ ] **Step 2: 在 ItemRow 中间插入 Item ③**

```tsx
<ItemRow label={t('checkin.checklistBed')} done={!breakdown.bed}
  onClick={() => setExpandedItem(expandedItem === 'bed' ? null : 'bed')}
  isExpanded={expandedItem === 'bed'}>
  {expandedItem === 'bed' && (
    <div className="space-y-2 mt-2">
      {todayQueueScoredBeds.length === 0 ? (
        <div className="text-xs text-red-500">{t('checkin.noAvailableBeds')}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {todayQueueScoredBeds.map((score, idx) => (
            <button key={score.bedId}
              onClick={async () => {
                assignArrival(g.id, score.bedId);
                updateArrival(g.id, { assignedBedId: score.bedId });
                setExpandedItem(null);
              }}
              className={cn("p-2 rounded-lg border text-left text-xs",
                idx === 0 ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 bg-white")}>
              {idx === 0 && <span className="text-[9px] bg-emerald-500 text-white px-1 rounded">★ Best</span>}
              <div className="font-semibold">{score.roomType}</div>
              <div className="text-[10px] text-zinc-500">{score.bedName} · R{score.roomNumber}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )}
</ItemRow>
```

- [ ] **Step 3: import scoreBeds**

```ts
import { sortByPriority, scoreBeds } from '../utils/priorityEngine';
// (scoreBeds 实际从 bedAllocator 导入，调整路径)
import { scoreBeds } from '../utils/bedAllocator';
```

> 修正：`scoreBeds` 来自 `bedAllocator.ts`（已存在），不是 `priorityEngine.ts`。

- [ ] **Step 4: 类型校验 + 验证**

Run: `npm run lint && npm run dev`
Expected: 0 errors，4 项 checklist 完整可交互，选床显示床位网格。

- [ ] **Step 5: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): add checklist item ③ bed with scoreBeds reuse"
```

---

## Task 12: 5 卡片只读折叠

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（在 4 项 checklist 之后加折叠区）

- [ ] **Step 1: 加折叠区**

在 4 个 ItemRow 之后，`</div>` 关闭详情面板之前，加：

```tsx
<details className="border-t border-zinc-200 pt-3 mt-3">
  <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">
    📋 {t('checkin.fullDetails')}
  </summary>
  <div className="mt-3 space-y-2 opacity-70 pointer-events-none">
    {/* 5 卡片只读摘要：直接复用已有字段渲染 */}
    <div className="p-2 bg-zinc-50 rounded text-xs">
      <div><b>{g.name}</b> · {g.country}</div>
      <div className="text-[10px] text-zinc-500">{g.nights}N · {g.paymentStatus}</div>
    </div>
    <div className="p-2 bg-zinc-50 rounded text-xs">
      <div className="text-[10px] font-semibold uppercase text-zinc-500">{t('checkin.verification')}</div>
      <div>{g.passportScanned ? '✅ ' + t('checkin.verified') : '⬜ ' + t('checkin.scanPassport')}</div>
    </div>
    <div className="p-2 bg-zinc-50 rounded text-xs">
      <div className="text-[10px] font-semibold uppercase text-zinc-500">{t('checkin.payment')}</div>
      <div>{g.paymentStatus}</div>
    </div>
    <div className="p-2 bg-zinc-50 rounded text-xs">
      <div className="text-[10px] font-semibold uppercase text-zinc-500">{t('checkin.notes')}</div>
      <div>{g.notes || '—'}</div>
    </div>
    <div className="p-2 bg-zinc-50 rounded text-xs">
      <div className="text-[10px] font-semibold uppercase text-zinc-500">{t('checkin.assignBed')}</div>
      <div>{g.assignedBedId || '—'}</div>
    </div>
  </div>
</details>
```

- [ ] **Step 2: 类型校验 + 验证**

Run: `npm run lint && npm run dev`
Expected: 0 errors，详情底部"📋 查看完整信息"可折叠展开 5 卡片只读视图。

- [ ] **Step 3: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): add collapsed 5-card read-only embed"
```

---

## Task 13: 全勾自动完成 + 成功 banner

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（在详情面板底部加 useEffect）

- [ ] **Step 1: 引入 useEffect 和 ref**

```ts
import { useState, useMemo, useEffect, useRef } from 'react';
```

- [ ] **Step 2: 加成功 banner state**

```ts
const [checkInSuccessName, setCheckInSuccessName] = useState<string | null>(null);
const hasAutoCompletedRef = useRef<string | null>(null);
```

- [ ] **Step 3: 加 useEffect**

在 `CheckInPanel` 函数体末尾（其他 useEffect 之后）加：

```ts
useEffect(() => {
  if (!todayQueueSelected) return;
  const g = todayQueueSelected;
  const breakdown = computeIncompleteness(g);
  if (breakdown.count === 0 && hasAutoCompletedRef.current !== g.id && g.assignedBedId) {
    hasAutoCompletedRef.current = g.id;
    // assignArrival 已是幂等，这里确保状态更新
    if (!g.assignedBedId) return;
    setCheckInSuccessName(g.name);
    setTimeout(() => setCheckInSuccessName(null), 5000);
    // 选中的客人自动从队列移除（useMemo 依赖 arrivals 即可）
  }
}, [todayQueueSelected]);
```

- [ ] **Step 4: 渲染成功 banner（顶层）**

在 `CheckInPanel` 的 return 开头（`return (` 之后第一行）加：

```tsx
{checkInSuccessName && (
  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
    <CheckCircle2 className="h-5 w-5" />
    <span className="text-sm font-medium">{checkInSuccessName} {t('checkin.checkedInSuccess')}</span>
  </motion.div>
)}
```

> 复用现有 `motion` 依赖（已在 CheckInPanel import）。

- [ ] **Step 5: 类型校验 + 手动跑通**

Run: `npm run lint && npm run dev`
Expected: 0 errors。手动测：4 项全勾后 → 顶部绿色 banner 出现，5s 自动消失，客人从队列消失。

- [ ] **Step 6: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): auto-complete on all items checked + success banner"
```

---

## Task 14: 移动端响应式 + 桌面双栏

**Files:**
- Modify: `src/components/CheckInPanel.tsx`（todayQueue 视图外层 grid 调整）

- [ ] **Step 1: 用 grid 双栏（移动单栏）**

把 todayQueue 分支的外层 `<div className="flex-1 overflow-auto space-y-2 p-2">` 改为：

```tsx
<div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3 p-2 overflow-hidden">
  {/* 左：队列列表 */}
  <div className="overflow-y-auto space-y-2">
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
      📌 {t('checkin.priorityRule')}
    </div>
    {todayQueueGuests.length === 0 ? (
      <div className="py-12 text-center text-sm text-zinc-400">{t('checkin.noEventsFound')}</div>
    ) : (
      todayQueueGuests.map(guest => { /* Task 7 的渲染 */ })
    )}
  </div>
  {/* 右：详情面板 */}
  <div className="overflow-y-auto">
    {todayQueueSelected && (/* Task 12 的详情 */)}
    {!todayQueueSelected && (
      <div className="h-full border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-400 bg-zinc-50/50 text-sm">
        {t('checkin.selectGuestToBegin')}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: 验证 3 档断点**

Run: `npm run dev` 然后浏览器调 1440px / 768px / 375px 三档。

Expected:
- 1440px：左右双栏，列表在左，详情在右
- 768px：单栏堆叠，列表在上
- 375px：单栏，文字不溢出

- [ ] **Step 3: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): responsive 2-column layout for smart queue (lg breakpoint)"
```

---

## Task 15: 最终验证 + 版本号 + commit

**Files:**
- Modify: `src/version.ts`（版本号 1.4.0 → 1.5.0）

- [ ] **Step 1: 跑 lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 2: 跑 build**

Run: `npm run build`
Expected: 0 errors, dist/ 生成

- [ ] **Step 3: 手动 e2e 验证 checklist**

dev server 启动后，依次操作：
1. 进 ⚡ 今日待办 tab（默认首页）
2. 看到客人按规则排序（缺项多的靠前）
3. 置顶一个客人，确认他在最前
4. 点开一个客人，展开 4 项 checklist
5. 依次点 4 项，每项都正确显示 inline 表单
6. 4 项全勾后，顶部绿色 banner 出现
7. 客人从 ⚡ 队列消失
8. 进 已入住 tab，能看到该客人
9. 切回 ⚡ 今日待办，确认不再有该客人
10. 切换中英文，确认所有新文案双语正确

- [ ] **Step 4: 提升版本号**

打开 `src/version.ts`，把 `1.4.0` 改为 `1.5.0`：

```ts
export const VERSION = '1.5.0';
```

- [ ] **Step 5: Commit + 推送**

```bash
git add -A
git status  # 确认无 .superpowers/ 等无关文件
git commit -m "feat: BunkDesk v1.5.0 - smart check-in queue with 4-item parallel checklist"
git push origin main
```

---

## Self-Review

**Spec coverage check:**
- §1 Background & Goals → Task 1-5（foundation）
- §2 Architecture H2 → Task 6（sub-tab）
- §3 规则评分 → Task 2, 3, 7
- §4 4 项 checklist → Task 9, 10, 11
- §5 5 卡片内嵌 → Task 12
- §6 Data Model & API → Task 1, 4
- §6.4 i18n → Task 5
- §7.1 状态机 / §7.2 错误处理 → Task 13（auto-complete）+ Task 11（no beds）
- §10 数据迁移 v1→v2 → Task 1

**Placeholder scan:** 无 TBD / TODO / "implement later"。每步都有具体代码或命令。

**Type consistency check:**
- `Guest` interface 在 Task 1 定义 3 字段
- `pinGuest` / `unpinGuest` / `markNotesSkipped` 在 Task 4 添加
- `scoreGuest` / `sortByPriority` / `incompletenessCount` / `computeIncompleteness` 在 Task 2, 3 定义
- i18n 键在 Task 5 完整列出，Task 7-12 全部用 `t('checkin.xxx')` 引用

**潜在风险：**
- Task 7 Step 1 的 `reservations` 转 `Guest` 形态用 `as const` 强制类型，可能在 strict tsc 下报警。如有，改为定义 `GuestLike` 共享类型。
- Task 11 Step 3 提到 scoreBeds 实际从 bedAllocator 导入（不是 priorityEngine），已在 plan 中明确说明。

---

## 关键文件索引

| 关注点 | 文件 | Task |
|---|---|---|
| Guest 类型扩展 | [src/types.ts](file:///Users/ricky/AICode/hostelite/src/types.ts) | T1 |
| 数据迁移 v1→v2 | [src/HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx) | T1 |
| 规则评分引擎 | [src/utils/priorityEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/priorityEngine.ts) (NEW) | T2 |
| 未办检测 | [src/utils/incompleteness.ts](file:///Users/ricky/AICode/hostelite/src/utils/incompleteness.ts) (NEW) | T3 |
| Context actions | [src/HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx) | T4 |
| i18n 中英双语 | [src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | T5 |
| Sub-tab + 队列 UI | [src/components/CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | T6-14 |
| 床位推荐（复用） | [src/utils/bedAllocator.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedAllocator.ts) | T11 |
| 版本号 | [src/version.ts](file:///Users/ricky/AICode/hostelite/src/version.ts) | T15 |
