# CheckInPanel 入住流程优化 — Design Spec

**Date**: 2026-06-15
**Status**: Approved (brainstorming)
**Target**: 中小青旅（SMB hostels），Excel 时代的运营者
**Top Scenario**: 预约客人到店（OTA / direct 预约，到店办理入住）

---

## 1. Background & Goals

### 1.1 现状痛点（来自 landing-page docs 的客户调研）

- 67% 仍在用 Excel 管床位
- Excel 8 屏才能办完一单入住
- 手动更新 5 个 OTA
- Excel 崩溃导致数据丢失
- 现有酒店软件按"间"卖，不能按"床"卖
- 每天行政 6+ 小时

### 1.2 设计目标

1. **快**：单次入住从 Excel 时代的 3-5 分钟 → < 60 秒
2. **少跳转**：单次入住过程零 tab 切换，单屏完成
3. **少敲键盘**：零强制输入（被扫 / 被推荐 / 被预填）
4. **少错误**：把 Excel 时代的"找不到行 / 录错 / 算错钱"全部消灭
5. **零 AI 成本**：所有"智能"= 规则加权，零云端依赖

### 1.3 非目标（明确不做）

- ❌ AI / LLM / 机器学习特征（用户明确不要）
- ❌ 复杂多步骤向导（用户选了并行 checklist 而非线性）
- ❌ 5 卡片完全删除（用户选了内嵌折叠）
- ❌ 客人未到店信号 / iBeacon（用户没选）
- ❌ 跨设备实时同步（保持单设备 localStorage 模型）

---

## 2. Architecture — H2 混合

### 2.1 Sub-tab 结构

```
[⚡ 今日待办] [待入住] [已入住] [已预订]
       ↑ 默认首页
```

| Sub-tab | 数据源 | 排序 | 用途 |
|---|---|---|---|
| **⚡ 今日待办**（NEW） | `arrivals` ∪ {`reservations` 中 checkInDate = 今日} | 规则评分（见 §3） | 高峰时段优先处理入口 |
| **待入住** | `arrivals` | 时间升序 | 原结构不动 |
| **已入住** | `rooms[].beds[].guest` | bed 名 | 原结构不动 |
| **已预订** | `rooms[].beds[].reservations` (未来 7+ 天) | 时间升序 | 原结构不动 |

### 2.2 组件树

```
CheckInPanel
├─ SubTabBar
│  ├─ Tab: ⚡ 今日待办
│  ├─ Tab: 待入住（原）
│  ├─ Tab: 已入住（原）
│  └─ Tab: 已预订（原）
│
├─ SmartQueueView        ← NEW
│  ├─ PriorityQueue (list of GuestQueueItem)
│  └─ GuestQueueItem
│     ├─ PinButton
│     ├─ GuestHeader (姓名/国/到店时间)
│     ├─ IncompletenessBadge (缺 0-4 项)
│     └─ ChecklistPanel
│        ├─ Item: 录护照
│        ├─ Item: 收钱
│        ├─ Item: 选床
│        ├─ Item: 存备注
│        ├─ FullDetailsToggle    ← 折叠的 5 卡片
│        └─ AutoCompleteIndicator (全部勾选时显示)
│
├─ CheckedInListView     ← 原样
├─ ReservedListView      ← 原样
└─ ICalImport (modal)    ← 原样
```

---

## 3. ⚡ 今日待办 — 规则评分引擎

### 3.1 评分公式

```
score(guest) = w_T × T_norm + w_I × I_count + P_bonus × isPinned

其中：
  w_T = 30           (时间临近度权重)
  w_I = 20           (未办件数权重)
  P_bonus = 1e6      (置顶无穷大)
```

### 3.2 信号定义

**T_norm（时间临近度，0..1）**：
```ts
const minutesToArrival = (checkInDate - now) / 60_000;
if (minutesToArrival <= 60)        return 1.0;   // 1h 内
if (minutesToArrival <= 60 * 4)    return 0.7;   // 4h 内
if (minutesToArrival <= 60 * 12)   return 0.4;   // 12h 内
if (minutesToArrival <= 60 * 24)   return 0.2;   // 24h 内
return 0;                                       // 24h+ 之后
```

**I_count（未办件数，0..4）**：
```ts
const items = [
  !guest.passportScanned,           // 录护照
  guest.paymentStatus !== 'paid',   // 收钱
  !guest.assignedBedId,             // 选床（见 §6 数据模型）
  !guest.notes?.trim(),             // 存备注
];
return items.filter(Boolean).length;
```

**isPinned（人工置顶）**：见 §6 `pinned` 字段。

### 3.3 排序输出

```ts
export function sortByPriority(
  guests: Guest[],
  now: Date = new Date(),
): Guest[] {
  return [...guests]
    .map(g => ({ g, score: scoreGuest(g, now) }))
    .sort((a, b) => b.score - a.score)  // 分数高的在前
    .map(x => x.g);
}
```

### 3.4 为什么是规则不是 AI

- **可解释**：前台看到某条排在第 1，能算出原因（"还有 30 min 到 + 缺 3 项"）
- **零成本**：无云端 API、无 token 计费、无需密钥
- **零延迟**：纯本地计算，0ms
- **易调试**：单测覆盖 score 函数即可，权重调整可视化

---

## 4. Checklist — 4 项固定

### 4.1 4 个 item 定义

| # | Label | 检测函数 | 完成动作 | 失败时按钮 |
|---|---|---|---|---|
| ① | 录护照 | `!passportScanned` | `scanPassport(guestId)` | 触发"录护照"展开（见 §4.3） |
| ② | 收钱 | `paymentStatus !== 'paid'` | `settlePayment(guestId)` | 触发"收钱"展开 |
| ③ | 选床 | `!assignedBedId` | `assignArrival(guestId, bedId)` | 触发"选床"展开（用 scoreBeds） |
| ④ | 存备注 | `!notes?.trim()` | 留空也视为完成（见 §4.4） | 触发"存备注"展开 |

### 4.2 视觉规范

**收起态**（每行高度 40px）：
```
[icon] [标签]                    [状态 pill]
 🔲   ① 录护照                    [未办]
 ✅   ② 收钱                      [✓ 已收 $85]
 🔲   ③ 选床                      [缺 4 床 · 推荐 A1]
 🔲   ④ 存备注                    [空]
```

**展开态**（高度自适应）：
- item 边框变蓝（`border-blue-500`）
- 下方插入 `<item form>`（见 §4.3）
- 顶部出现"收起"按钮

### 4.3 4 个 item 的展开内容

#### ① 录护照
```tsx
<div className="grid grid-cols-2 gap-2">
  <Input label="护照号" value={passportOrId} onChange={...} />
  <Input label="出生日期" type="date" value={dob} onChange={...} />
</div>
<Button onClick={handleScan}>确认录入</Button>
// handleScan 调 scanPassport() + updateArrival({ passportOrId, dob })
```

#### ② 收钱
```tsx
<div>应收: $85 · 已付: $0</div>
<div className="grid grid-cols-3 gap-2">
  <Button onClick={() => settlePayment(guestId)}>收现金</Button>
  <Button onClick={() => settlePayment(guestId)}>收卡</Button>
  <Button onClick={() => settlePayment(guestId)}>收支付宝</Button>
</div>
```
> 注：3 个按钮都调同一 `settlePayment`，UI 层区分"方式"用于记账（M2 增强）。

#### ③ 选床
```tsx
// 复用 scoreBeds（bedAllocator.ts）取前 6 名
<ScoredBedGrid beds={scoredBeds.slice(0, 6)} onPick={...} />
// 选中后 assignArrival(guestId, bedId)
```
> 复用现有算法，零新增。

#### ④ 存备注
```tsx
<Input placeholder="例：素食 / 靠窗 / 接机" />
<Button onClick={handleSave}>保存</Button>
<Button variant="ghost" onClick={handleSkip}>跳过</Button>
```
> 备注可跳过（按 §4.4）。

### 4.4 4 项的"已完成"判定

- ① 录护照：`passportScanned === true` ✓
- ② 收钱：`paymentStatus === 'paid'` ✓
- ③ 选床：`assignedBedId` 存在 ✓
- ④ 存备注：`notes?.trim()` 非空 **或** 用户显式点"跳过" ✓

> **存备注可跳过**的原因：备注是软需求，不应卡住入住流程。跳过 = 写入 `notesSkipped = true` 标志（不污染 notes 字段），让 I_count 的 `notes` 项判定为 done。

### 4.5 全勾自动完成

```ts
useEffect(() => {
  const allDone = checkItems.every(item => item.done);
  if (allDone && !hasAutoCompletedRef.current && guest.assignedBedId) {
    completeCheckIn(guest);
    hasAutoCompletedRef.current = true;
    showSuccessBanner(guest.name);
  }
}, [checkItems]);
```

`completeCheckIn` 的副作用：
1. 触发 `assignArrival(guestId, assignedBedId)`（幂等，已分配则跳过）
2. 顶部 emerald 绿色 banner 出现
3. 5s 后自动消失
4. 客人从 ⚡ 队列移除
5. 客人出现在 已入住 tab

---

## 5. 5 卡片内嵌折叠

### 5.1 位置

Checklist 下方，独立 `<details>` 折叠区。

### 5.2 视觉

```tsx
<details className="border-t pt-3 mt-3">
  <summary className="cursor-pointer text-sm text-zinc-500">
    📋 查看完整信息（5 卡片只读）
  </summary>
  <div className="mt-3 space-y-2 opacity-75">
    <Card>Header (姓名/国/晚数/应付)</Card>
    <Card>验证 + 付款 双卡</Card>
    <Card>备注 + 房型偏好</Card>
    <Card>床位分配（只读）</Card>
  </div>
</details>
```

### 5.3 只读原因

主路径是 checklist，5 卡片作为"信息查看 / 审计"窗口。修改入口在 checklist 中（每个 item 的展开表单），避免 2 套写入路径。

---

## 6. Data Model & API 改动

### 6.1 types.ts

```ts
// src/types.ts
export interface Guest {
  // ... 现有字段
  pinned?: boolean;          // NEW — 人工置顶
  assignedBedId?: string;    // NEW — 显式记录已分配床位（避免从 assignArrival 副作用推断）
  notesSkipped?: boolean;    // NEW — 备注被显式跳过的标志
  // ... 现有字段
}
```

### 6.2 新增工具函数

**`src/utils/priorityEngine.ts`**（NEW）：
```ts
export function scoreGuest(guest: Guest, now: Date): number;
export function sortByPriority(guests: Guest[], now?: Date): Guest[];
export function computeIncompleteness(guest: Guest): {
  passport: boolean;
  payment: boolean;
  bed: boolean;
  notes: boolean;
  count: number;
};
```

**`src/utils/incompleteness.ts`**（NEW）：与 `priorityEngine` 共享逻辑，单独导出便于 UI 复用。

### 6.3 HostelContext 改动

```ts
// 新增 actions
pinGuest: (guestId: string) => void;
unpinGuest: (guestId: string) => void;
markNotesSkipped: (guestId: string) => void;
```

> `completeCheckIn` 不是新 action —— 自动完成时直接调用现有 `assignArrival(guestId, assignedBedId)` 即可。assignArrival 已是幂等（已分配则跳过）。

### 6.4 i18n 命名空间

```ts
checkin: {
  // 现有键 ...
  todayQueue: '今日待办',
  pinToTop: '📌 置顶',
  unpin: '取消置顶',
  fullDetails: '查看完整信息（5 卡片只读）',
  autoCompleteNote: '全部勾选后自动转为"已入住"',
  checklistPassport: '① 录护照',
  checklistPayment: '② 收钱',
  checklistBed: '③ 选床',
  checklistNotes: '④ 存备注',
  notesPlaceholder: '例：素食 / 靠窗 / 接机',
  scanConfirm: '确认录入',
  skipNotes: '跳过',
  collectCash: '收现金',
  collectCard: '收卡',
  collectAlipay: '收支付宝',
  collectWechat: '收微信',
  priorityRule: '排序规则：时间临近 30% + 未办件数 20% + 📌 置顶 ×∞',
  missingBed: '⚠️ 缺少床位',
  noAvailableBeds: '无可用床位',
}
```

---

## 7. State Transitions

### 7.1 状态机

```
                  录入某项
[arrival] ─────────────────────► [arrival + partial]
   │                                    │
   │ 客户到店 + 4 项全勾                  │ 某项取消
   │                                    │
   ▼                                    ▼
[checked-in] ◄──────────────────── [arrival + partial]
              auto-complete 触发
              assignArrival
```

### 7.2 错误处理

| 场景 | 行为 |
|---|---|
| 4 项全勾但 `assignedBedId` 为空（race condition） | 不触发自动完成，显示红色 "⚠️ 缺少床位" 提示，等用户选床 |
| 客人信息缺失（姓名/国/性别为空） | 红色边框，阻止任何 checklist item 操作 |
| 床位推荐为空（无空床） | 选床 item 展开后显示"无可用床位"占位，不影响其他 item |
| 收钱金额 = 0 | settlePayment 仍可调，UI 显示"$0 已收" |
| iCal 导入冲突（已存在同名客人） | 沿用现有 importArrivals 行为，不重复处理 |

### 7.3 性能

- 排序：`useMemo` 缓存 score 数组，依赖 `[arrivals, now (1 min 间隔)]`
- 评分函数：纯函数，单次 O(1) per guest，N≤50 客人场景 < 1ms
- 床位推荐：复用现有 `scoreBeds` + `useMemo`

---

## 8. Success Criteria (KPI)

| 指标 | Excel 现状 | 目标 | 测量方式 |
|---|---|---|---|
| 单次入住时间 | 3-5 min | < 60s | 用户测试 + DevTools 计时 |
| 单次入住点击数 | ~15 | ≤ 6 | 用户测试 |
| 录入字段数（不含 scan） | 5+ | ≤ 1 (备注) | 静态分析 |
| Tab 切换次数 | 3-5 | 0 | 手动验证 |
| 错误率（漏录护照 / 漏收钱） | 5-10% | < 1% | 灰度发布对比 |

---

## 9. Testing Plan

### 9.1 单元测试

- `priorityEngine.test.ts`：
  - 排序输出稳定（同分时按原顺序）
  - pinned 永远在最前
  - 时间边界（1h/4h/12h/24h 临界值）
  - 全部完成时 score 为 0，但仍显示
- `incompleteness.test.ts`：4 项独立判断 + count 正确
- `bedAllocator.test.ts`：沿用现有测试

### 9.2 集成测试（E2E）

- `checkin-flow.spec.ts`（Playwright）：
  - 打开 ⚡ 今日待办 tab
  - 验证首位是置顶客人
  - 展开 4 个 item，依次完成
  - 验证客人自动移到 已入住 tab
  - 验证 banner 弹出
  - 计时：全程 < 60s

### 9.3 视觉测试

- 桌面（1440px）、平板（768px）、手机（375px）三档断点
- 子 tab 切换无视觉抖动
- 4 项 checklist 展开不破坏布局

### 9.4 兼容性

- i18n：中英文完整翻译，无 key 缺失
- localStorage 迁移：旧版本无 `pinned` / `assignedBedId`，需 fallback 处理

---

## 10. Migration & Rollout

### 10.1 数据迁移

- `bunkdesk_state_v1` → `v2`：
  - `rooms[].beds[].guest` 存在 → 反推 `assignedBedId`
  - `arrivals[].pinned` 默认 `false`
  - 迁移脚本在 `loadPersistedState` 一次性执行

### 10.2 灰度发布

1. 阶段 1：仅在 ⚡ 今日待办 tab 上线，原 3 tab 完全不变
2. 阶段 2：观察 1 周后，原 待入住 tab 顶部加 banner "试试新的 今日待办？"
3. 阶段 3：4 周后默认行为不变，仅做 A/B 测试收集 KPI

### 10.3 回滚方案

- `pinned` 字段加 `?` 可选，删除时不影响其他逻辑
- `assignedBedId` 同上，旧数据自动从 `bed.guest` 反推
- ⚡ 今日待办 tab 可通过 feature flag `checkin.smartQueue` 关闭

---

## 11. Open Questions / Future

- 选床 item 内的 "现金/卡/支付宝" 区分记账 — M2 增强
- 备注 item 内的"快捷模板"（素食/靠窗/接机 按钮）— M2
- 人工置顶的过期时间（pinUntil）— 暂用永久置顶，按需扩展
- ⚡ 今日待办与"已入住"客人的关联（如退房后立即看到下一位）— 已通过自动移除实现
- 跨设备同步 — 保持单设备假设

---

## 12. 关键文件索引

| 关注点 | 文件 | 备注 |
|---|---|---|
| 新 sub-tab + 队列 UI | [src/components/CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | 改 |
| 评分引擎 | [src/utils/priorityEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/priorityEngine.ts) | 新建 |
| 未办检测 | [src/utils/incompleteness.ts](file:///Users/ricky/AICode/hostelite/src/utils/incompleteness.ts) | 新建 |
| 类型扩展 | [src/types.ts](file:///Users/ricky/AICode/hostelite/src/types.ts) | 加 2 字段 |
| 状态管理 | [src/HostelContext.tsx](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx) | 加 2 actions |
| 床位推荐（复用） | [src/utils/bedAllocator.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedAllocator.ts) | 不变 |
| i18n | [src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | 加命名空间 |
