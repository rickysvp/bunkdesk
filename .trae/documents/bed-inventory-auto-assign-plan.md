# Bed-Level Inventory + 自动分床 + 动态排房 优化方案

## Summary

围绕产品三大核心价值做系统性优化：
1. **Bed-level inventory**：每张床作为独立库存单元，日历上显示每日可用床位数量、价格、状态
2. **自动分床**：Check-in 时系统自动匹配最优床位（全自动分配，无需人工选择）
3. **动态排房**：排房优先级：集中填充已入住房间 > 性别匹配 > 房型偏好

同时修复日历视图 i18n 翻译 key 缺失导致显示原始 key 文案的问题。

---

## Current State Analysis

### 问题 0：i18n Key 缺失（日历显示 "bedboard.beds" 等原始字符串）

**根因**：`CalendarView.tsx` 使用了 5 个不存在的 i18n key：
- `t('bedboard.beds')` — 不存在 → 显示 "bedboard.beds"
- `t('bedboard.roomType')` — 存在，但 CalendarView 用它在日期表头，语义不同
- `t('bedboard.clean')` — 不存在 → 显示 "bedboard.clean"
- `t('bedboard.cleaning')` — 不存在 → 显示 "bedboard.cleaning"
- `t('bedboard.needsCleaning')` — 存在

**数据流**：`t()` 函数先在目标语言中查 → 失败则 fallback 到英语 → 两个都失败则返回原始 path 字符串。

对比英语 `bedboard` 段与实际使用：

| CalendarView 使用的 key | en.bedboard 是否存在 | zh.bedboard 是否存在 |
|---|---|---|
| `bedboard.beds` | ❌ 不存在 | ❌ 不存在 |
| `bedboard.clean` | ❌ 不存在 | ❌ 不存在 |
| `bedboard.cleaning` | ❌ 不存在 | ❌ 不存在 |
| `bedboard.roomType` | ✅ `"Room Type"` | ✅ `"房间类型"` |
| `bedboard.needsCleaning` | ✅ `"Mark as Cleaned"` | ✅ `"标记为已打扫"` |
| `bedboard.mixedDorm` | ✅ `"Mixed Dorm"` | ✅ `"混合多人间"` |
| `bedboard.femaleDorm` | ✅ `"Female Dorm"` | ✅ `"女生多人间"` |
| `bedboard.private` | ✅ `"Private Room"` | ✅ `"独立房间"` |

**修复**：在 `i18nContext.tsx` 的 `en.bedboard` 和 `zh.bedboard` 中添加缺失的 key。

### 问题 1：无自动分床算法

**现状**：
- [CheckInPanel.tsx:347-373](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx#L347-L373) 展示空床列表供人工点选
- [HostelContext.tsx:146-194](file:///Users/ricky/AICode/hostelite/src/HostelContext.tsx#L146-L194) `assignArrival(guestId, bedId)` 需要显式传入 bedId
- 没有任何排序、推荐、或自动选择的逻辑

**缺失**：
- 没有评分函数来评估哪个床是"最优"的
- 没有在 CheckInPanel 中触发自动分配
- 用户想要的"全自动分配"完全没有实现

### 问题 2：排房策略未实现

**用户期望的优先级**：集中填充 > 性别匹配 > 房型偏好

**现状**：
- `assignArrival` 不检查性别匹配
- 不检查目标房间是否已有其他人入住（集中填充策略）
- Guest 有 `gender` 字段，Room 有 `type` 字段（dorm-mixed/dorm-female/private），但两者之间没有关联校验

### 问题 3：日历不显示床位库存状态

**现状**：
- 日历每行显示一个床位 + 该床位上的 booking blocks
- 没有"每日可用床位数"的汇总
- 没有房间级别的库存概览
- 空床日期格子只显示 `$价格`，没有状态标识

**缺失**：
- 每日可用床位数 counter
- 房间行头部没有库存状态条
- 无法快速判断哪天满房、哪天有空床

### 问题 4：Check-In 流程缺少智能推荐

**现状**：
- [CheckInPanel.tsx:285-380](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx#L285-L380) 将空床平铺展示，无排序
- 没有突出推荐床位的视觉标识
- 办理入住需要前台手动翻看、选择床位

**缺失**：
- 最优床位高亮（绿色边框/星星）
- 自动填充第一个最优床位
- 一键"确认入住"（不需手动选床）

### 问题 5：无碎片化避免逻辑

**现状**：
- 不考虑客人入住时长对排房的影响
- 1 晚和 7 晚的客人同等对待
- 可能导致：1 晚客人占了 7 天空床的中间一天，制造碎片

**缺失**：
- 床位评分中考虑"占用连续性"因子
- 长住客优先放在空隙大的床位

---

## Proposed Changes

### 改动 1：修复 i18n 缺失 Key（立即修复）

**修改文件**：`src/i18nContext.tsx`

在 `en.bedboard` 中添加：
```ts
beds: "Beds",
clean: "Clean",
cleaning: "Cleaning",
```

在 `zh.bedboard` 中添加：
```ts
beds: "床位",
clean: "清洁",
cleaning: "待清洁",
```

同时修复 CalendarView 中 `t('bedboard.needsCleaning')` 的使用 — 当前有 `|| 'Mark as clean'` 硬编码 fallback，去掉 fallback 直接用翻译值。

### 改动 2：自动分床引擎（核心新增）

**新增文件**：`src/utils/bedAllocator.ts`

纯函数模块，不依赖 React：

```ts
// 床位评分维度
interface BedScore {
  bedId: string;
  roomId: string;
  score: number;          // 总分（越高越优先）
  reasons: string[];      // 推荐理由
  fillExisting: boolean;  // 是否在已入住房间
  genderMatch: boolean;   // 性别是否匹配
  preferenceMatch: boolean; // 房型偏好是否匹配
  fragmentationScore: number; // 碎片化评分
}

// 核心函数
function autoAssignBed(
  guest: Guest,
  rooms: Room[],
  allBookings: Map<string, Guest[]>
): BedScore[] {
  // 返回排序后的床位推荐列表
}

// 评分规则：
// 1. 集中填充（权重 40%）：目标房间已有客人 → +40
// 2. 性别匹配（权重 30%）：男→混住房或男房，女→女房或混住房 → +30
// 3. 房型偏好（权重 20%）：房型匹配 guest.roomPreference → +20
// 4. 碎片化避免（权重 10%）：避免制造日历碎片 → +10
// 5. 排除约束：已占用床位、清洁中床位
```

**修改文件**：`src/HostelContext.tsx`

新增 `autoAssignBed(guestId: string): BedScore | null` 方法：
1. 从 `arrivals` 找到 guest
2. 调用 `bedAllocator.autoAssignBed(guest, rooms, ...)`
3. 取最高分床位，调用 `assignArrival(guestId, bestBedId)`
4. 返回选中的床位信息

**修改文件**：`src/components/CheckInPanel.tsx`

- 在 guest 卡片的 "Complete Check-in" 按钮旁增加 "Auto Assign & Check-in" 按钮（蓝色高亮）
- 点击后调用 `autoAssignBed` 并完成入住
- 如果自动分配失败（无合适床位），展示"无可用床位"提示

### 改动 3：Check-In 面板显示推荐床位排序

**修改文件**：`src/components/CheckInPanel.tsx`

空床列表改为排序展示：
- 调用 `autoAssignBed` 对空床评分
- 首行显示 "Recommended: Bed X (Room Y)" 绿色高亮
- 其余按评分降序排列
- 首选床位自动 pre-select

**新增**：在 CheckInPanel 的 "Checked In" 子 tab 中显示排房摘要：
```
Room 101: 2/4 occupied · 2 beds free
Room 102: 3/4 occupied · 1 bed free  ← 推荐新客人放这里
```

### 改动 4：日历库存状态增强

**修改文件**：`src/components/CalendarView.tsx`

**4a. 房间行增加每日可用床位 counter**

在房间头部行的日期格子下方添加：
```
Room 101 (Mixed Dorm) $85-90
  Bed 1: [===Booking===]
  Bed 2: [===Booking===]
  Bed 3: $90 (empty)
  Bed 4: $85 (empty)
  Free: 0  0  1  2  2  1  0  ← 每日空床数
```

**4b. 空床格子状态标识**

空床格子中已有 `$价格`，增加语义化标签：
- 绿色圆点 + "可用"（空床且已清洁）
- 紫色圆点 + "清洁中"（cleaning 状态）
- 灰色 "+" 图标表示可快速预订

**4c. 房间行视觉密度**

- 某天满房：格子显示深色背景 `bg-zinc-100`
- 某天有 1 张空床：格子显示淡黄色 `bg-amber-50/20`
- 某天有 2+ 张空床：格子显示淡红色 `bg-red-50/10`（警告）

### 改动 5：排房策略引擎

**修改文件**：`src/utils/bedAllocator.ts`（同上文件）

实现完整的评分算法：

```
score = 0

// 1. 集中填充（权重 40，最高优先）
if (roomHasExistingGuests) score += 40

// 2. 性别匹配（权重 30）
if (guest.gender === 'female' && room.type === 'dorm-female') score += 30
if (guest.gender === 'male' && room.type === 'dorm-mixed') score += 30
if (guest.gender === 'male' && room.type === 'dorm-female') return 0  // 禁止

// 3. 房型偏好（权重 20）
if (room.type matches guest.roomPreference) score += 20

// 4. 碎片化避免（权重 10）
// 检查床位前后的空闲连续性，选择不会制造碎片的床位
const fragmentationScore = calculateFragmentation(guest, bed, allBookings)
score += fragmentationScore * 10
```

**性别强约束**：男生不能分到 `dorm-female` 房间，评分直接返回 0。

---

## File Changes Summary

| 文件 | 改动 |
|------|------|
| `src/i18nContext.tsx` | 添加 `bedboard.beds`、`bedboard.clean`、`bedboard.cleaning` 到 en/zh |
| `src/utils/bedAllocator.ts` | **新增**：自动分床评分引擎（纯函数） |
| `src/HostelContext.tsx` | 新增 `autoAssignBed(guestId)` 方法 |
| `src/components/CheckInPanel.tsx` | 自动分床按钮、推荐排序、排房摘要 |
| `src/components/CalendarView.tsx` | 每日空床 counter、库存状态色条、语义化空床标识 |

## Implementation Order

1. **Fix i18n keys**（10 分钟）— 先修复显示问题，用户可见
2. **Create bedAllocator.ts**（20 分钟）— 纯函数，可独立测试
3. **Add autoAssignBed to HostelContext**（10 分钟）— 对接引擎
4. **Update CheckInPanel**（15 分钟）— 自动分床按钮 + 推荐排序
5. **Update CalendarView**（20 分钟）— 库存状态显示

## Assumptions & Decisions

- **全自动分配**：用户确认优先"全自动分配"，Check-in UI 提供一键操作而非手动选床
- **排房优先级**：集中填充已入住房间 > 性别匹配 > 房型偏好
- **性别硬约束**：男性不能被分配到 `dorm-female` 房间，这是 safety/legal 要求
- **bedAllocator 为纯函数**：不依赖 React，可独立单元测试
- **评分系统为可调参数**：后续可通过设置面板调整各维度权重
- **日历库存 counter 性能**：仅计算可见日期范围（14天以内），避免全量计算