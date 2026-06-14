# Bunkly 代码质量修复计划(分阶段)

> 范围:P0 + P1 全部问题
> 提交方式:分 4 个独立 PR/提交,按依赖顺序合并,任一阶段可单独回滚
> 关联检测报告:`code-quality-fix-and-calendar-scroll.md` 上文分析

---

## Summary

基于深度代码质量检测结果,把 P0(必修项:死代码、业务Bug、同步漏洞)与 P1(重要项:重复代码、性能、持久化加固)按依赖顺序拆为 4 个阶段:

| 阶段 | 主题 | 改动规模 | 风险 |
|------|------|----------|------|
| A | 死代码清理 | -4 文件 / ~1500 行 | 极低 |
| B | 业务 Bug 修复 | 2 文件 / ~20 行 | 低(需回归覆盖) |
| C | 重复代码 + 性能 | 5 文件 / ~120 行 | 低 |
| D | 持久化加固 | 2 文件 / ~30 行 | 中(影响 localStorage 行为) |

每阶段完成后执行 `npm run lint && npx vite build` 验证。

---

## Current State Analysis

### 已发现的问题清单(来自深度检测)

**P0 必修(阻断性)**
1. 4 个未引用组件:`ReservationsView.tsx`(151 行)、`Dashboard.tsx`(523 行)、`GroupBookingModal.tsx`(581 行)、`SocialKit.tsx`(248 行)
2. `occupancyEngine.ts:38` 占用判断漏 `checkInDate` —— 未入住的客人会被算成已占用
3. `checkoutGuest` 不同步 `arrivals`,ID 撞库时会留下"鬼影待入住"
4. `useEffect` 持久化无 try/catch,5MB quota 异常会冒泡到 React 调度

**P1 重要**
5. `rangesOverlap` 在 `bedRules.ts` 与 `timelineEngine.ts` 重复实现
6. `shiftNotesRef` 创建后从未读取
7. `QuickBookingModal.tsx:78-108` 同一个 `Omit<Guest,"id">` 对象字面量复制两次
8. `useMemo` value 依赖缺失 `deleteRoom`、`deleteBed`
9. `CopilotPanel.tsx:174-200` 图表每渲染都重新计算且与 `calculateAvailability` 口径不一致

### 现有约束
- `tsc --noEmit` 当前通过
- `vite build` 当前 1.75s,产物 898KB(gzip 266KB)
- 无 ESLint / Prettier 配置
- `tsconfig.json` 未开启 `strict`(本计划不开启,避免大规模报错)
- 数据全部在 `localStorage`,key 前缀 `bunkdesk_`

### 现有约定
- ID 生成:`crypto.randomUUID()` + 类型前缀(`g_`、`r_`、`b_`、`sn_`、`oa_`、`gp_` 等)
- 状态更新一律通过 `useCallback` 包装的 setter
- 持久化用 300ms debounce 合并到单个 `useEffect`

---

## Proposed Changes

### 阶段 A — 死代码清理(独立 PR,最先合并)

**目标**:删除 4 个未引用组件,降低维护成本与构建体积。

**变更**:

| 文件 | 操作 | 原因 |
|------|------|------|
| [src/components/ReservationsView.tsx](file:///Users/ricky/AICode/hostelite/src/components/ReservationsView.tsx) | 删除 | 151 行;全项目无 import;功能被 `CheckInPanel` 的 reserved 子标签覆盖 |
| [src/components/Dashboard.tsx](file:///Users/ricky/AICode/hostelite/src/components/Dashboard.tsx) | 删除 | 523 行;全项目无 import;`CopilotPanel` 已替代 |
| [src/components/GroupBookingModal.tsx](file:///Users/ricky/AICode/hostelite/src/components/GroupBookingModal.tsx) | 删除 | 581 行;全项目无 import;`HostelContext.addGroupBooking` 仍保留供未来使用 |
| [src/components/SocialKit.tsx](file:///Users/ricky/AICode/hostelite/src/components/SocialKit.tsx) | 删除 | 248 行;全项目无 import |

**验证**:
```bash
grep -rn "ReservationsView\|Dashboard\|GroupBookingModal\|SocialKit" src
# 期望:仅在自身文件内有 export,无其他 import
npm run lint && npx vite build
```

**回滚**:git revert 即可,4 个文件互不依赖。

---

### 阶段 B — 业务 Bug 修复(独立 PR)

**目标**:修复 occupancyEngine 与 checkoutGuest 的状态同步漏洞。

#### B-1 修复 occupancyEngine 的"已占用"判断

文件:[src/utils/occupancyEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/occupancyEngine.ts#L36-L40)

**当前**:
```ts
if (b.guest && b.guest.checkOutDate >= dateStr) return true;
if (b.reservations?.some(r => r.checkInDate <= dateStr && r.checkOutDate > dateStr)) return true;
```

**改为**(把第 38 行补齐 checkInDate 条件,与 reservation 口径一致):
```ts
if (b.guest && b.guest.checkInDate <= dateStr && b.guest.checkOutDate > dateStr) return true;
if (b.reservations?.some(r => r.checkInDate <= dateStr && r.checkOutDate > dateStr)) return true;
```

> 说明:reservation 的判断用的是 `r.checkOutDate > dateStr`(check-out 当日不计入),guest 这里对齐同一语义。

#### B-2 让 checkoutGuest 同步清除 arrivals 中同 ID 记录

文件:[src/HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L312-L332)

**当前**:只 `setRooms` 把 bed 清空,不动 `arrivals`。

**改为**:在 `checkoutGuest` 中先 `setArrivals` 移除匹配 ID,再 `setRooms`。
```ts
const checkoutGuest = useCallback((bedId: string) => {
  const room = rooms.find(r => r.beds.some(b => b.id === bedId));
  const bed = room?.beds.find(b => b.id === bedId);
  const guest = bed?.guest;
  if (guest) {
    setArrivals(prev => prev.filter(g => g.id !== guest.id));
  }
  setRooms(prevRooms => /* 不变 */);
  if (guest) addAutoNote(/* 不变 */);
}, [rooms, addAutoNote]);
```

**验证**:
- 单元心智模型:客人 ID `g_abc`,在 `arrivals` 与 `bed.guest` 各有一份;checkout 后 `arrivals.filter(g => g.id !== 'g_abc')` 应为空
- 端到端:在 `CheckInPanel` pending 子标签中创建待入住 → 在 bedboard 看到该 guest → checkout → 回 pending 子标签,该 guest 应已消失

**回滚**:revert 即可,只动 HostelContext 一处。

---

### 阶段 C — 重复代码 + 性能优化(独立 PR)

**目标**:消除 4 处重复/冗余,提升渲染性能。

#### C-1 合并 rangesOverlap

- 在 [src/utils/bedRules.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedRules.ts#L12-L14) 保留定义
- 删除 [src/utils/timelineEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/timelineEngine.ts#L80-L84) 中的重复
- 在 `timelineEngine.ts` 顶部加 `import { rangesOverlap } from './bedRules'`
- 检查 `src/components/BedBoard/index.tsx:17` 与 [src/components/BedBoard/BedRow.tsx:9](file:///Users/ricky/AICode/hostelite/src/components/BedBoard/BedRow.tsx#L9) 的 import —— 已从 `timelineEngine` 引入,改为从 `bedRules` 引入,行为不变

#### C-2 删除未使用的 shiftNotesRef

文件:[src/HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L82-L83)

```diff
- // Use ref for shiftNotes to avoid circular dependencies in useCallback
- const shiftNotesRef = useRef(shiftNotes);
- shiftNotesRef.current = shiftNotes;
```

`useRef` 的 import 若不再使用,从 [第 1 行](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L1) 移除。

#### C-3 QuickBookingModal 去除重复对象

文件:[src/components/QuickBookingModal.tsx](file:///Users/ricky/AICode/hostelite/src/components/QuickBookingModal.tsx#L74-L108)

把字面量提取为 `guestInput` 局部变量,只构造一次:
```ts
const guestInput = {
  name: name.trim(),
  country: COUNTRY_OPTIONS.find(c => c.code === countryCode)?.name || countryCode,
  countryCode, gender, checkInDate, checkOutDate, nights,
  paymentStatus: 'unpaid' as const, paidAmount: 0, totalAmount, source,
  passportScanned: false, roomPreference: room.name,
};
const guestId = addArrival(guestInput);
occupyBed(bed.id, guestInput, guestId);
```

#### C-4 补全 HostelContext useMemo 依赖

文件:[src/HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L579-L589)

当前 `value` 的 `useMemo` 依赖列表**缺失** `deleteRoom` 与 `deleteBed`。补上:
```diff
- addArrival, updateArrival, importArrivals, addRoom, updateRoom, addBedToRoom, updateBed,
+ addArrival, updateArrival, importArrivals, addRoom, updateRoom, deleteRoom, addBedToRoom, updateBed, deleteBed,
```

#### C-5 CopilotPanel 图表 useMemo + 复用 forecast

文件:[src/components/CopilotPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CopilotPanel.tsx#L42-L201)

两处改动:
1. 顶部加 `const dailyRates = useMemo(...)`,对 `weekForecast` 中 7 天的 `occupiedBeds / totalBeds` 计算一次
2. 渲染处把行内 `Array.from({length:7}).map` 改为 `dailyRates.map`,去掉 `rooms.reduce(...)`

> 注意:`weekForecast` 当前**不返回 daily breakdown**,只返回 `avgOccupancy / peakDay / lowDay / totalEmptyBedNights`。需先把 `generateWeekForecast` 扩为返回 `daily: { date, occupancyRate, occupiedBeds, totalBeds }[]`,然后 `CopilotPanel` 消费之。

文件:[src/utils/copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts#L49-L63)

修改 `generateWeekForecast` 返回值:
```ts
return {
  avgOccupancy: Math.round(avgOccupancy),
  peakDay: { date: peakDay.date, rate: peakDay.occupancyRate },
  lowDay: { date: lowDay.date, rate: lowDay.occupancyRate },
  totalEmptyBedNights,
  daily: availability.map(d => ({
    date: d.date, occupancyRate: d.occupancyRate,
    occupiedBeds: d.occupiedBeds, totalBeds: d.totalBeds,
  })),
};
```

**验证**:
- 视觉:7 天柱状图高度、颜色与修复前一致
- React DevTools:切换 tab 一次,CopilotPanel 的 `<div ref=...>` 节点不再重新挂载(因为 dailyRates 是 useMemo)
- 业务正确性:占用了 reservation 的床位的日期,occupancyRate 应大于 0(口径与 `occupancyEngine` 一致)

---

### 阶段 D — 持久化加固(独立 PR,最后合并)

**目标**:把 9 个 `setItem` 集中、加 try/catch、统一 key 防止部分写入。

**变更**:

#### D-1 合并 localStorage 写入到单 key

文件:[src/HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L86-L99) 与 [loadState](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L7-L12)

**改为**:
```ts
const STORAGE_KEY = 'bunkdesk_state_v1';

function loadState<T>(fallback: T): T {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    // Schema version check
    if (parsed.__v !== 1) return fallback;
    return { ...fallback, ...parsed.data };
  } catch {
    return fallback;
  }
}

useEffect(() => {
  const timer = setTimeout(() => {
    try {
      const payload = {
        __v: 1,
        data: { rooms, arrivals, shiftNotes, groupBookings, referrals,
                hostelPage, promotions, guestProfiles, occupancyActions },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // QuotaExceededError or serialization error — log + ignore
      console.warn('[bunkly] localStorage persist failed:', e);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [rooms, arrivals, /* ... */]);
```

> 同步修改 [src/StaffContext.tsx](file:///Users/ricky/AICode/hostelite/src/StaffContext.tsx#L5-L46) 的 `loadState` 与持久化 effect,合并到 `bunkdesk_state_v1.staffList` 子字段(或拆为 `bunkdesk_state_staff_v1` —— 推荐后者,保持职责单一)。
> 旧的 `bunkdesk_rooms` 等 9 个 key 一次性读取后迁移,后续可加 `__migrated__` 标志位做一次性清理。

#### D-2 增加 Schema 版本字段

- `__v: 1` 为当前 schema
- 未来 `types.ts` 字段变更时 bump 到 `v2` 并在 `loadState` 写迁移函数

**验证**:
- 手动:`localStorage.setItem('bunkdesk_rooms', JSON.stringify({__v:1, data: {rooms:[...]}}))` → 刷新页面 → 数据保留
- 异常:在 DevTools `localStorage` 中 mock 一个会失败的 setter(QuotaExceeded)→ 控制台出现 warn,但 UI 不崩
- 兼容:加载旧版 `bunkdesk_rooms` key(若存在)时,先尝试按旧 key 读,成功后回写到 `bunkdesk_state_v1`

**回滚**:revert 后旧 key 数据仍在,只是不再被读 —— 提供一次性的"读取旧 key → 回写新 key"迁移脚本即可恢复。

---

## Assumptions & Decisions

1. **不开启 `tsconfig.strict`**:本计划范围已广,开启会触发大量现有代码报错,需独立 PR 治理。
2. **不引入 ESLint/Prettier**:用户选择不分阶段添加新依赖。
3. **不做 Context 拆分**:HostelContext 单体承担多领域是已存在架构,不在本计划范围。
4. **不做 React.lazy code-split**:bundle 体积警告是 P2,本计划不处理。
5. **Schema 迁移采用"读旧 key → 回写新 key"**:比 in-place 字段迁移风险小,新 key 格式更清晰。
6. **不删除 `HostelContext.addGroupBooking` 等 setter**:虽然 `GroupBookingModal` 删除,但 HostelContext 仍对外暴露 setter,供未来 `BookingEngine` 或新 Modal 使用。
7. **阶段 A → B → C → D 顺序合并**:阶段 A 最干净先合;B 是 Bug 修复,需独立 review;C 改动面较广;D 涉及存储行为变更风险最大,放最后。
8. **每个阶段都执行 `npm run lint && npx vite build`**:C 阶段需额外用 React DevTools Profiler 验证 CopilotPanel 不再每渲染重算。

---

## Verification Steps

### 每个阶段共有的标准检查
```bash
cd /Users/ricky/AICode/hostelite
npm run lint          # tsc --noEmit,期望 0 错误
npx vite build        # 期望构建成功
grep -rn "TODO\|FIXME" src  # 不应新增
```

### 阶段 A 专项
```bash
grep -rn "ReservationsView\|from.*Dashboard\b\|GroupBookingModal\|SocialKit" src
# 期望:仅 import.meta.glob 类自引用,无外部 import
```

### 阶段 B 专项
- 手动:打开 DevTools → Application → localStorage → 创建带未来 checkInDate 的 guest → 跑 `calculateAvailability` 单元心智模型 → 该日期不应计入 occupied
- 手动:CheckInPanel 创建新 guest → 立即 checkin → 再 checkout → 回 pending 列表,该 guest 消失

### 阶段 C 专项
- React DevTools Profiler 录制切换到 dashboard tab:CopilotPanel 自身 rerender 但 child component 跳过
- 单元心智模型:`rangesOverlap` 在 `bedRules.ts` 仍存在,`timelineEngine.ts` 已 import 同一函数
- `HostelContext` value 的 useMemo 依赖数组长度由原 29 项 → 31 项

### 阶段 D 专项
```js
// 在浏览器 console 跑
Object.defineProperty(localStorage, 'setItem', { value: () => { throw new Error('quota'); }});
// 触发任意 setter,期望控制台 warn 而非白屏
localStorage.getItem('bunkdesk_state_v1')  // 应存在
```

---

## 风险矩阵

| 阶段 | 风险类型 | 缓解措施 |
|------|----------|----------|
| A | 误删未来需要组件 | 已确认 4 个文件 0 import;若有遗漏 grep 即捕获 |
| B | 业务逻辑回归 | 手动 + 单元心智模型测试;B-2 改动最小可 revert |
| C | 性能优化引入新 bug | useMemo 依赖要严格;CopilotPanel 视觉对比 |
| D | 旧数据丢失 | "读旧 key → 回写新 key"迁移逻辑必须先于 setItem |

---

## 后续可做(本计划外,留作记录)
- 开启 `tsconfig.strict` 与 `noUncheckedIndexedAccess`
- 引入 ESLint + Prettier + husky pre-commit
- 拆 `HostelContext` 为多个子 Context
- `React.lazy()` 按 tab code-split
- 单元测试覆盖 occupancyEngine 与 bedAllocator
- 单一迁移脚本将旧 9 个 key 彻底清理
