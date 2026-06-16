# 前台入住模块（CheckInPanel）设计方案

> 范围：`src/components/CheckInPanel.tsx`（552 行）+ `src/utils/bedAllocator.ts`（222 行）+ `src/components/ICalImport.tsx`（188 行）
> 关联 Plan：[bed-inventory-auto-assign-plan.md](file:///Users/ricky/AICode/hostelite/.trae/documents/bed-inventory-auto-assign-plan.md)（床位算法、推荐排序的诞生文档）
> 关联代码：[CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) · [bedAllocator.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedAllocator.ts) · [ICalImport.tsx](file:///Users/ricky/AICode/hostelite/src/components/ICalImport.tsx)

---

## 一、设计方案

前台入住模块采用 **"3 子 tab + 1 步到位"** 的结构，目标是让前台在不离开当前页面的情况下，完成"看见 → 识别 → 分配 → 入住 → 退房"的全流程。

### 1.1 整体结构

```
┌─ TopBar（顶部全局导航：assistant / bedboard / checkin / shiftlog / settings）
│
└─ CheckInPanel（前台入住模块）
   ├─ 子 tab 切换条（pending / checked-in / reserved）+ 全局搜索
   ├─ pending 子 tab：双栏（左侧 288px 客人列表 + 右侧 1fr 详情面板）
   │   ├─ 客人列表：2 个特殊入口按钮 + 所有待入住客人
   │   └─ 详情面板：3 态（新建表单 / 客人详情 / 空态）
   ├─ checked-in 子 tab：房间占用概览 + 客人列表（表格）
   └─ reserved 子 tab：未来预订列表（表格）
```

### 1.2 三个子 tab 的分工

| 子 tab | 状态对应 | 数据来源 | 核心交互 |
|---|---|---|---|
| **pending（待入住）** | `arrivals[]`（来自 HostelContext） | 客人列表 + 双栏详情 | 双栏布局，重点场景 |
| **checked-in（已入住）** | `rooms[].beds[].guest`（聚合） | 表格 | 退房按钮（checkoutGuest） |
| **reserved（已预订）** | `rooms[].beds[].reservations[]`（聚合） | 表格 + 来源 tag | 只读展示未来预订 |

子 tab 标签上同时显示状态色 + 计数（amber / emerald / blue），让前台一眼看到"今天还要办几单"。

### 1.3 pending 子 tab 的双栏布局

**左侧（288px 固定宽度，mobile 下全宽）**：
- 2 个虚线框特殊按钮：
  - `+ 新建预订 / 散客入住`（点击后右侧进入"NEW"态）
  - `+ 导入 iCal`（紫色，触发 `ICalImport` 弹窗）
- 下方是待入住客人列表，每行展示：姓名 + 国家代码 + 晚数
- 选中项用 zinc-900 黑底白字高亮

**右侧（1fr，自适应）**三态：
1. `selectedGuestId === 'NEW'` → 8 字段散客登记表（姓名/国家/性别/入住/退房/护照/出生/备注 + 公安备案勾选）
2. `selectedGuest` 存在 → 5 卡片详情（见下）
3. 否则 → 虚线框空态提示"选择一位客人开始"

### 1.4 详情面板的 5 卡片结构

```
┌─ 卡片 1：Header（姓名+国家+晚数+应付状态）────────────────────┐
│  John Doe · USA · 3 nights · Checkout 6/18 · $85 应付 / 已支付  │
└──────────────────────────────────────────────────────────────┘
┌─ 卡片 2：验证 ─┐ ┌─ 卡片 3：付款 ─┐  ← 两列网格
│  护照状态+扫描│ │  付款状态+收款│
└──────────────┘ └────────────────┘
┌─ 卡片 4：备注 + 房型偏好（两列输入）────────────────────────┐
│  Notes: [________________]  Room Pref: [________________]   │
└────────────────────────────────────────────────────────────┘
┌─ 卡片 5：床位分配（最重要）────────────────────────────────┐
│  [⚡ 一键自动分配 & 入住]  ← 蓝色大块，闪电图标                │
│  床位推荐网格（2-3 列）                                       │
│   [★ Best  Female Dorm · Bed A · R203 · $85  Fill Match]      │
│   [       Mixed Dorm · Bed B · R101 · $85  Match]            │
│   [       Private Room · Bed C · R301 · $120 ]               │
│  ⚠️ 未付款提醒（条件渲染）                                     │
│  [完成入住]（仅在护照已扫 + 已选床位时启用）                  │
└────────────────────────────────────────────────────────────┘
```

**床位推荐网格**的视觉规则（由 `scoreBeds` 排序驱动）：
- 第 1 名：emerald 绿框 + `★ Best` 角标
- 选中态：zinc-900 黑底
- 其他：zinc-200 灰边
- 每个卡片底部两个小 chip：`Fill`（已有人住的房间加分）/ `Match`（性别/偏好匹配）

### 1.5 自动分床算法（4 维加权）

参见 [bedAllocator.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedAllocator.ts) 的 `scoreBeds` 函数：

| 维度 | 权重 | 逻辑 | 原因 |
|---|---|---|---|
| **Fill existing**（填充已有人住的房间） | **40%** | 房间已有客人时 +40 | 青旅房间"半空半满"是最差的体验和成本结构 |
| **Gender match**（性别匹配） | **30%** | 男→男/混；女→女/混 | 安全 + 房型法规硬约束（女客不能进男宿） |
| **Room preference**（房型偏好） | **20%** | 客人 `roomPreference` 字段匹配房型 | 显式表达的诉求要兑现 |
| **Fragmentation**（碎片化回避） | **10%** | 看床位前后是否能容纳该客人的晚数 | 避免把"3 晚"插进 2 个"1 晚"中间 |

性别硬约束（`computeBedScore` 第 109-111 行）：男客进入 `dorm-female` 直接返回 `null`，从列表中剔除；女客可进任何房型但女宿加分最多。

Fragmentation 评分（`computeFragmentationScore` 第 164-222 行）：
- 前后都够 → 10 分
- 单边够 → 7 分
- 前后各 ≥2 天 → 5 分
- 单边 ≥1 天 → 3 分
- 紧贴 → 0 分

### 1.6 成功反馈

完成入住后：
- 顶部弹出 emerald 绿色 banner："John Doe 入住成功！"
- 附带"View on Board"按钮（点击跳转到 `bedboard` tab 看房态图）
- 5 秒后自动消失（`setTimeout` 5000ms）
- 用 Framer Motion `AnimatePresence` 做 fade + slide 动画

---

## 二、为什么这么设计

### 2.1 为什么是 3 子 tab 而不是 3 个独立页面？

青旅前台的工作流是**循环**的，不是**线性**的：
- 上午 9-11 点：集中办入住（pending 密集）
- 11 点 - 下午 5 点：散客 + 退房 + 处理未来预订（3 个 tab 都要看）
- 晚上：偶尔有延迟入住或夜客

3 个独立页面会让前台在 3 个 URL 间反复切换，丢失上下文。子 tab 切换 + 全局状态保留（`arrivals` 选中态）让前台 0 成本地在 3 个状态间跳转。

### 2.2 为什么 pending 用双栏，checked-in / reserved 用表格？

- **pending** 是"操作型"场景：要看、要选、要填、要确认。详情很多、动作很多，必须双栏。**288px 列表宽度**是基于普通屏幕（1280px+）下"能展示完整姓名 + 国家 + 晚数"的最小宽度，右侧还能保留至少 700px 给表单。
- **checked-in / reserved** 是"查看型"场景：核心问题是"谁在哪个床，什么时候来/走，付没付钱"。这些信息维度规整（5 列固定），用表格密度高、可扫读、可排序。

### 2.3 为什么"自动分配"是大蓝按钮，而"手动选床"是辅助网格？

决策点：**"分床"是高频且易错的任务**。传统 PMS 让前台在 50+ 床位里手动挑，平均耗时 30-60 秒，且容易把女客分到男宿、把人填进空房而不是填进半满房。

所以体验设计优先级是：
1. **首选路径（蓝色大按钮）**：1 秒完成分床，决策权交给算法
2. **次选路径（绿色 Best 卡片）**：算法推荐 1 个，前台点 1 下确认（适合想看看算法推了什么的人）
3. **兜底路径（其他卡片）**：算法可能漏了特殊需求，前台可手动覆盖
4. **应急路径（不渲染按钮）**：算法无解时显示"无可用床位"提示

这套"1 大按钮 + N 卡片"的模式在 7 个洞察 / 4 个 action 模板里也复用了（[optimize-assistant-occupancy-focus.md](file:///Users/ricky/AICode/hostelite/.trae/documents/optimize-assistant-occupancy-focus.md)）。

### 2.4 为什么 Fill 维度权重最高（40%）？

青旅的经济模型和酒店不同：床位是高度共享的库存。1 个 8 人间只卖 1 张床 vs 卖 4 张床，单位成本几乎一样（清洁、能耗、磨损都是按房间算）。**集中填充**能：
- 减少清洁次数（8 床满 vs 4 床空 + 4 床满 = 2 次清洁）
- 提升社交氛围（青旅的核心卖点之一）
- 简化库存管理（不用分散到 5 个房间去查房）

所以 40% 权重反映的是"这是青旅运营的金科玉律"。

### 2.5 为什么 iCal 导入要做成"先预览 + 多选"，而不是一键导入？

iCal 源（Airbnb / Booking / Hostelworld）经常有：
- 已取消的预订
- 修改过的日期（V1 和 V2 都在日历里）
- 内部测试条目

**先预览 + 多选**让前台在数据进系统前过一遍，去掉脏数据。这与 5 卡片详情中的"护照必须已扫 + 床位必须已选"是同一理念：**不要让脏数据轻易落库**。

### 2.6 为什么 5 卡片是垂直堆叠而不是 1 个大表单？

- **关注点分离**：每张卡片解决 1 个子问题（识别 / 验证 / 付款 / 偏好 / 分配）。前台能 1 眼定位"我卡在哪一步了"。
- **可变高度**：5 张卡片的内容长度差异很大（卡片 1 短，卡片 5 长），垂直堆叠让长卡片自然撑高，短卡片紧凑。
- **未来扩展**：每张卡片可独立加功能（卡片 4 可拆出"语言偏好"、卡片 5 可加"组团入住"），不影响其他卡片。

### 2.7 为什么床位推荐用 chip 标签（`Fill` / `Match`）而不是文字解释？

小标签 + 颜色编码比"这条推荐是因为填充了已有房间"更**扫读**。前台在 0.5 秒内通过 chip 颜色和数量就能判断"这条推荐质量如何"，比读一整句解释快 5-10 倍。

---

## 三、用户使用流程

### 3.1 流程 A：散客到店（最高频）

```
1. 客人走进大门，前台打开 [checkin] tab
   → 默认停留在 pending 子 tab，左侧列表显示所有预约 + 散客
2. 前台在左侧点 [+ 新建预订 / 散客入住]
   → 右侧进入"NEW"态，弹出 8 字段表单
3. 问客人姓名/国家/护照/出生日期，填表
4. 询问入住天数，设置 check-in / check-out（自动算 nights）
5. 勾选 [公安备案]（法律规定必勾）
6. 点 [Create Arrival]
   → 客人被加到 arrivals 列表，左侧自动刷新
7. 左侧点这位新客人
   → 右侧进入 5 卡片详情
8. 卡片 2：点 [Scan Passport]（绿勾代表已验证）
9. 卡片 3：收款 → 点 [Collect $85]
10. 卡片 5：直接点蓝色 [⚡ Auto Assign & Check-in]
    → 系统跑 scoreBeds → pickBestBed → assignArrival
    → 顶部弹出绿色 banner"X 入住成功"
    → 点 [View on Board] 跳到 bedboard 看房态
```

### 3.2 流程 B：预约客人到店

```
1. 客人到店报姓名，前台在 [checkin] tab 的搜索框输入
   → 左侧列表实时过滤
2. 点中客人 → 右侧进入 5 卡片
3. 卡片 1：确认晚数 + 应付状态（通常已 paid）
4. 卡片 2：扫描护照（点 [Scan Passport]）
5. 卡片 5：选床
   - 方案 A：直接 [⚡ Auto Assign] 1 秒搞定
   - 方案 B：看绿色 Best 卡片是否符合客人偏好 → 点中
   - 方案 C：手动从其他卡片选（比如客人要"靠窗的床"）
6. 点 [Complete Check-in]
7. banner 弹出
```

### 3.3 流程 C：iCal 批量导入（早晚高峰前）

```
1. 前台点 [+ 导入 iCal] 紫色按钮
   → 弹出 ICalImport 弹窗
2. 粘贴 iCal URL（来源：Airbnb / Hostelworld / Booking）
   → 点 [Fetch]
   → 弹窗显示 Loader 旋转
3. 拉取成功 → 列出所有 VEVENT
   → 默认全部勾选
4. 前台扫一眼，去掉已取消的 / 内部测试的 / 日期异常的
5. 底部 [Confirm Import (N)]
   → N 个客人被加到 arrivals[]
6. 弹窗关闭，左侧列表自动多出 N 个待办
7. 接下来进入流程 A 或 B
```

### 3.4 流程 D：退房

```
1. 客人退房，前台切到 [checked-in] 子 tab
   → 顶部 Room Status 显示每个房间占用 X/8
   → 下方表格列出所有已住客人
2. 找到要退房的那位 → 最右侧点 [LogOut Checkout]
   → checkoutGuest(bedId) → 床位状态变 'cleaning'
   → 表格自动刷新
3. 床位去 [bedboard] 处理"清洁 → empty"流程
```

### 3.5 流程 E：查看未来预订

```
1. 切到 [reserved] 子 tab
   → 表格列出所有未来预订
   → Source 列显示来源 tag（airbnb / booking / direct）
2. 可按日期搜索 / 排序（未来增强）
3. 客人到店后，预订数据自动转成"待入住"（在 HostelContext 中由 checkInDate 触发的逻辑）
```

---

## 四、用户体验

### 4.1 首屏信息层级（"3 秒钟理解"原则）

前台进入模块后，**3 秒内**应该能回答：
1. **今天还有几单没办？** → 顶部 pending 标签的 amber 数字
2. **店里现在住着几个人？** → 顶部 checked-in 标签的 emerald 数字
3. **未来几单要准备几间房？** → 顶部 reserved 标签的 blue 数字
4. **最近一位客人是谁？** → 自动选中 arrivals[0]（如果有）

### 4.2 操作距离（"1 鼠标 + 0 思考"原则）

| 任务 | 鼠标次数 | 是否需要思考 |
|---|---|---|
| 选一位客人 | 1 | 否（视觉搜索） |
| 自动分配 + 入住 | 1 | 否（点蓝色大按钮） |
| 手动选床 + 入住 | 2 | 略（看 chip） |
| 收一笔款 | 1 | 否 |
| 扫一份护照 | 1 | 否 |
| iCal 导入 N 位 | N 次勾选 + 2 次确认 | 略（去脏数据） |
| 退房 | 1 | 否 |

没有任何"3 步表单"。

### 4.3 视觉反馈

- **选中态**：zinc-900 黑底白字（对比度最高）
- **可用态**：白底灰边
- **推荐态**：emerald 绿框 + 角标（不刺眼，但能扫到）
- **完成态**：5 秒 emerald banner 自动消失
- **错误态**：红色文字 + 红色 50 背景（如"无可用床位"）
- **未付款警告**：amber 600 文字（条件渲染，不打扰已付款客人）

### 4.4 动效（节制使用）

- 子 tab 切换：背景色即时切换，无动画（追求速度感）
- 床位卡片悬停：边框颜色过渡（`transition-colors`）
- 成功 banner：fade + slide（`AnimatePresence`，150ms）
- 弹窗：scale 0.95 → 1 + fade（150ms）
- 不滥用 spring / bounce，避免前台"等动画"

### 4.5 响应式

- **桌面（≥768px）**：双栏布局，左侧 288px 列表 + 右侧详情
- **移动（<768px）**：单栏堆叠（列表在上，详情在下），底部预留 `pb-20` 留出移动端导航空间
- 搜索框在窄屏全宽，宽屏固定 256px
- 床位推荐网格：`grid-cols-2 sm:grid-cols-3` 适配

### 4.6 键盘可达性

- 所有按钮都是 `<button>` 元素，原生 Tab 导航
- 床位卡片网格是 button 列表，可键盘选
- iCal URL 输入框 Enter 触发 fetch（`onKeyDown`）
- 全局搜索框可快速定位（无需鼠标）

### 4.7 多语言

- 所有文案走 `t()` 函数，零硬编码
- 关键键：`checkin.pending` / `checkin.checkedIn` / `checkin.reserved` / `checkin.autoAssign` / `checkin.newWalkIn` / `checkin.importICal` / `checkin.completeCheckIn` / `checkin.checkedInSuccess` / `checkin.viewOnBoard` 等
- 中英文支持见 [dashboard-i18n-hardcode-fix.md](file:///Users/ricky/AICode/hostelite/.trae/documents/dashboard-i18n-hardcode-fix.md)

### 4.8 已知限制与未来增强

- **暂时无分组入住**（团体订单一次办多人）— 需扩展到 groupId
- **床位推荐网格** max-h-48，超长推荐列表需滚动 — 未来可加虚拟滚动
- **iCal 同步**是手动触发，无定时拉取 — 未来可加 webhook 或轮询
- **搜索**只搜姓名+国家，不搜护照/备注 — 未来可加多字段搜索
- **退房**直接变 cleaning，不询问确认 — 未来可加"确认退房"对话框

---

## 五、关键文件索引

| 关注点 | 文件 | 行号参考 |
|---|---|---|
| 3 子 tab 切换 | [CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | L153-175 |
| 双栏布局 | [CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | L178-217 |
| 5 卡片详情 | [CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | L295-405 |
| 自动分床按钮 | [CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | L357-368 |
| 床位推荐网格 | [CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | L370-396 |
| 评分算法 | [bedAllocator.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedAllocator.ts) | L35-160 |
| Fragmentation 计算 | [bedAllocator.ts](file:///Users/ricky/AICode/hostelite/src/utils/bedAllocator.ts) | L164-222 |
| iCal 弹窗 | [ICalImport.tsx](file:///Users/ricky/AICode/hostelite/src/components/ICalImport.tsx) | L83-187 |
| 房间占用概览 | [CheckInPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx) | L418-435 |
