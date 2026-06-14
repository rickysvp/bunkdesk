# HostelOps 产品优化方案

## 摘要

对比 HostelOps 产品愿景文档与当前代码库，当前产品是一个**床位管理+入住办理**工具，距离"青旅日常运营中枢"的定位有显著差距。核心缺失：Shift Log（交接班日志）、Task Board（任务看板）、Activity Board（活动看板），以及 Dashboard 的运营指挥能力不足。

---

## 当前状态分析

### 已实现功能

| 模块 | 当前状态 | 对标 HostelOps |
|------|----------|----------------|
| **Bed Board** | 完整：拖拽分配、筛选、添加房间/床位、清洁状态管理 | 对应 Module 2 Housekeeping Board（部分） |
| **Check-In Panel** | 完整：Walk-in 登记、护照扫描、支付、床位分配 | 不在 MVP 4 模块内，但作为基础功能保留 |
| **Calendar View** | 完整：14天甘特图、导航、触摸滑动 | 不在 MVP 4 模块内，但作为基础功能保留 |
| **Reservations View** | 完整：预订列表、搜索、状态筛选 | 不在 MVP 4 模块内，但作为基础功能保留 |
| **Dashboard** | 基础：入住率、预抵、待清洁、性别分布 | 对标 MVP Dashboard 但严重不足 |
| **i18n** | 中英双语 | 符合东南亚市场需求 |

### 关键差距

| HostelOps MVP 模块 | 当前状态 | 差距程度 |
|---------------------|----------|----------|
| **Module 1: Shift Log** | 完全缺失 | **严重** — 产品核心差异化功能 |
| **Module 2: Housekeeping Board** | Bed Board 有清洁状态，但无 Kanban 工作流、无分配清洁工、无时间戳 | **中等** — 需增强 |
| **Module 3: Task Board** | 完全缺失 | **严重** — 高频日常需求 |
| **Module 4: Activity Board** | 完全缺失 | **中等** — 青旅特色收入来源 |
| **MVP Dashboard** | 仅有4个统计卡片+预抵列表+房间状态 | **中等** — 缺少运营关键指标 |
| **User Roles** | 完全缺失 | **中等** — 多人协作基础 |
| **Mobile First** | 有底部导航，但表单和交互未针对移动优化 | **轻微** — 需细节打磨 |

---

## 优化方案

### 阶段一：补齐 MVP 4 模块（核心差异化）

#### 1. 新增 Shift Log（交接班日志）

**优先级：P0 — 产品核心差异化**

这是当前产品与 Cloudbeds/Mews 的最大差异点。没有它，产品只是又一个床位管理工具。

**新增文件：**
- `src/components/ShiftLog.tsx` — 交接班日志组件
- `src/types.ts` 新增 `ShiftNote` 类型

**数据模型：**
```typescript
interface ShiftNote {
  id: string;
  content: string;
  category: "general" | "late-arrival" | "maintenance" | "pickup" | "laundry" | "other";
  priority: "normal" | "urgent";
  author: string;         // 暂用 string，Phase 2 接入用户系统
  assignee?: string;      // 指派给谁
  createdAt: string;      // ISO datetime
  resolvedAt?: string;
  isResolved: boolean;
}
```

**UI 设计：**
- 时间线视图（类似 WhatsApp 消息流）
- 每条 note 显示：时间、作者、分类图标、内容、指派人、解决状态
- 顶部快速添加栏：输入内容 + 选择分类 + 指派
- 筛选：全部 / 未解决 / 紧急 / 按分类
- 滑动或点击标记已解决

**Sidebar 新增：**
- 新增 tab `shiftlog`，图标用 `ClipboardList`（lucide-react）

---

#### 2. 新增 Task Board（任务看板）

**优先级：P0 — 高频日常需求**

**新增文件：**
- `src/components/TaskBoard.tsx` — 任务看板组件
- `src/types.ts` 新增 `Task` 类型

**数据模型：**
```typescript
type TaskStatus = "open" | "in-progress" | "completed";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueDate?: string;
  category: "maintenance" | "pickup" | "guest-request" | "restock" | "other";
  createdAt: string;
  completedAt?: string;
  comments: TaskComment[];
}

interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}
```

**UI 设计：**
- 三列 Kanban：Open → In Progress → Completed
- 每列显示任务卡片：标题、优先级色标、指派人头像、到期日
- 拖拽切换状态（复用 @dnd-kit）
- 点击卡片展开详情：描述、评论、修改优先级/指派
- 快速添加：底部输入框 + 回车创建
- 筛选：按优先级、按指派人、按分类

**Sidebar 新增：**
- 新增 tab `tasks`，图标用 `CheckSquare`（lucide-react）

---

#### 3. 新增 Activity Board（活动看板）

**优先级：P1 — 青旅特色收入来源**

**新增文件：**
- `src/components/ActivityBoard.tsx` — 活动看板组件
- `src/types.ts` 新增 `Activity` 类型

**数据模型：**
```typescript
interface Activity {
  id: string;
  name: string;           // e.g. "Pub Crawl", "BBQ Night"
  date: string;           // ISO date
  time: string;           // e.g. "19:00"
  capacity: number;
  participants: ActivityParticipant[];
  price?: number;         // 可选收费
  location?: string;
  notes?: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
}

interface ActivityParticipant {
  id: string;
  guestName: string;
  bedName?: string;       // 关联床位方便查找
  checkedIn: boolean;     // 活动签到
}
```

**UI 设计：**
- 今日活动列表（卡片式）：活动名、时间、参与人数/容量、价格
- 点击展开：参与者名单、签到按钮、添加参与者
- 快速添加参与者：输入姓名或从当前在住客人选择
- 筛选：今日 / 本周 / 全部

**Sidebar 新增：**
- 新增 tab `activities`，图标用 `PartyPopper` 或 `CalendarDays`（lucide-react）

---

#### 4. 增强 Housekeeping Board

**优先级：P1 — 当前 Bed Board 有基础，需增强为 Kanban 工作流**

**修改文件：**
- `src/components/BedBoard.tsx` — 增强清洁工作流
- `src/types.ts` — Bed 类型增加清洁相关字段

**数据模型增强：**
```typescript
// Bed 类型新增字段
interface Bed {
  // ...existing fields
  cleaningAssignedTo?: string;   // 清洁工
  cleaningStartedAt?: string;    // 开始清洁时间
  cleaningCompletedAt?: string;  // 完成清洁时间
  lastCleanedAt?: string;        // 上次清洁时间
}
```

**功能增强：**
- 当前"清洁模式"只显示待清洁床位，增加"指派清洁工"功能
- 清洁状态流转增加时间戳：Dirty → Cleaning（记录开始时间+清洁工）→ Ready
- BedBoard 的清洁模式增加 Kanban 视图切换（列表/看板）
- 看板视图：三列 Dirty / Cleaning / Ready，可拖拽

---

### 阶段二：增强 Dashboard 为运营指挥中心

**优先级：P1 — 产品目标是"30秒内了解今日运营"**

**修改文件：**
- `src/components/Dashboard.tsx` — 重构为运营指挥中心

**当前 Dashboard 缺失的关键指标：**

| 指标 | 当前 | 需要 |
|------|------|------|
| 入住率 | 有 | 保留 |
| 今日预抵 | 有 | 保留 |
| 今日预离 | 硬编码 `value: 3` | 动态计算 |
| 待清洁 | 有 | 保留 |
| **今日活动** | 无 | 新增 |
| **未完成任务** | 无 | 新增 |
| **未解决交接班日志** | 无 | 新增 |
| **迟到的预抵** | 无 | 新增 |
| **今日签到活动参与人数** | 无 | 新增 |

**Dashboard 重构布局：**
```
┌─────────────────────────────────────────────┐
│ Today's Operations         [Search] [Walk-in]│
├──────┬──────┬──────┬──────┬──────┬──────────┤
│ 82%  │  8   │  6   │  3   │  4   │    2     │
│Occp. │Chkin│Chkout│Dirty │Tasks │Activities│
├──────┴──────┴──────┴──────┴──────┴──────────┤
│                                               │
│  ┌─ Urgent ──────────────────────────────┐   │
│  │ ⚠ Guest John arriving after midnight  │   │
│  │ ⚠ Laundry machine broken              │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌─ Pending Arrivals ─┐ ┌─ Room Status ──┐  │
│  │ Alex Johnson  AU    │ │ Available: 12  │  │
│  │ John Doe      US    │ │ Cleaning:  3   │  │
│  │ Maria Garcia  ES    │ │ Occupied: 20   │  │
│  └─────────────────────┘ └────────────────┘  │
│                                               │
│  ┌─ Today's Activities ───────────────────┐  │
│  │ 🍻 Pub Crawl  19:00  8/15 participants │  │
│  │ 🧘 Yoga Class  08:00  4/10 participants│  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

### 阶段三：基础设施增强

#### 1. HostelContext 扩展

**修改文件：** `src/HostelContext.tsx`

新增状态管理：
- `shiftNotes: ShiftNote[]` + CRUD 操作
- `tasks: Task[]` + CRUD + 状态变更操作
- `activities: Activity[]` + CRUD + 签到操作
- Bed 清洁增强字段的管理

#### 2. 导航重构

**修改文件：** `src/components/Sidebar.tsx`

当前 5 个 tab → 8 个 tab：
```
Today | Bed Board | Calendar | Reservations | Check-In | Shift Log | Tasks | Activities
```

移动端底部导航空间有限，改为：
- 底部显示 5 个高频 tab：Today / Bed Board / Tasks / Shift Log / Check-In
- 其余通过 "More" 菜单访问

#### 3. Mock 数据扩展

**修改文件：** `src/data.ts`

新增示例数据：
- 10+ 条 ShiftNote（覆盖各分类）
- 8+ 个 Task（覆盖各状态和优先级）
- 3-4 个 Activity（含参与者）

---

## 实施优先级

| 顺序 | 任务 | 优先级 | 预估复杂度 |
|------|------|--------|-----------|
| 1 | types.ts 扩展数据模型 | P0 | 低 |
| 2 | ShiftLog 组件 + Context 集成 | P0 | 中 |
| 3 | TaskBoard 组件 + Context 集成 | P0 | 中 |
| 4 | Dashboard 重构 | P1 | 中 |
| 5 | ActivityBoard 组件 + Context 集成 | P1 | 中 |
| 6 | Housekeeping Board 增强（Kanban 视图） | P1 | 中 |
| 7 | Sidebar 导航重构 | P1 | 低 |
| 8 | Mock 数据扩展 | P1 | 低 |
| 9 | i18n 新增翻译 | P1 | 低 |
| 10 | 移动端交互优化 | P2 | 低 |

---

## 假设与决策

1. **暂不实现用户系统** — author/assignee 用 string 表示，Phase 2 接入真实用户认证
2. **暂不实现后端持久化** — 继续使用 React state + mock data，Phase 2 接入 API
3. **Activity Board 定位为 MVP 验证** — 先做基础功能（创建活动、添加参与者、签到），不做支付集成
4. **Housekeeping 增强 不破坏现有 BedBoard** — 在现有清洁模式基础上增加 Kanban 视图切换，而非替换
5. **Dashboard 重构保持向后兼容** — 现有 stat cards 保留，新增指标卡片
6. **移动端底部导航限制 5 个** — 高频操作优先，其余放 "More" 菜单

---

## 验证步骤

1. Shift Log：添加日志 → 指派 → 标记解决 → 筛选
2. Task Board：创建任务 → 拖拽变更状态 → 添加评论 → 完成
3. Activity Board：创建活动 → 添加参与者 → 签到 → 查看容量
4. Dashboard：所有指标动态计算 → 紧急事项高亮 → 快速跳转
5. Housekeeping：清洁模式 Kanban 视图 → 指派清洁工 → 时间戳记录
6. 移动端：所有新组件在 390px 宽度下可用
7. i18n：中英双语完整覆盖
8. TypeScript：`npx tsc --noEmit` 0 错误
