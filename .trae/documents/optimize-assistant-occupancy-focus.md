# 经营助手优化 — 聚焦「今日 + 接下来几天入住率 + 解决方案」

> 背景：用户反馈 需关注 信息中 清洁、交接班 等对经营者没意义；经营助手的主用途是让经营者"一目了然看清今日和接下来几天的入住情况，以及解决方案"。
>
> 用户已确认两点：
> 1. 删除「待清洁」stat card（同 需关注 一起删）
> 2. 布局采用 Hero + 3 天 strip + 两列 需关注

---

## 1. 当前状态

### 1.1 现有 经营助手 → 今日 布局
- **第 1 行**：4 张 stat card（入住 / 退房 / 空床 / 待清洁）+ 1 张 emerald「今日潜在 $X」+ 右侧 7 天 forecast 卡
- **第 2 行**：单列 需关注（risks 在前 + opportunities 在后，混排）

### 1.2 7 个 insight 模板
| ID | 类型 | 标题 | 经营者价值 | 处置 |
|---|---|---|---|---|
| opp-female | opportunity | 女宿空置 → 改混宿 | ⭐ 入住率优化 | **保留** |
| opp-empty-3d | opportunity | 未来 3 天空床 | ⭐ 收入机会 | **保留** |
| opp-recall-6m | opportunity | 6 月未回访 | ⭐ 回头客 | **保留** |
| risk-overbook | risk | 明天超售 | ⭐ 硬性风险 | **保留** |
| risk-unconfirmed | risk | 未确认预订 | ⭐ 现金流 | **保留** |
| risk-urgent-notes | warning | 紧急交接班 | ❌ 员工执行项 | **删除** |
| risk-cleaning | warning | 待清洁床位 | ❌ 员工执行项 | **删除** |

### 1.3 5 张 stat card
| Card | 经营者价值 | 处置 |
|---|---|---|
| 入住 | 今日到客数 | **保留** |
| 退房 | 今日离店 | **保留** |
| 空床 | 待售机会 | **保留** |
| 待清洁 | 员工执行 | **删除** |
| 今日潜在 $X | 7 天潜在收入 | **保留** |

---

## 2. 目标

1. **删除经营者无关信息**：清洁（stat card）+ 交接班 / 待清洁（insight）
2. **新增 Hero 入住率**：顶部大字「今日入住率 %」+ 1 句话描述（vs 7 天均值）
3. **新增 3 天 strip**：tonight / tomorrow / day-after-tomorrow 3 张卡，每张「X% 占用 · 可填 N 张 → 动作」
4. **需关注 改为两列**：左「需要立刻处理」（risks）、右「抓住机会」（opportunities）
5. **保留 7 天 forecast** 但视觉降级为 3 天 strip 下方的细节条

---

## 3. 实施步骤

### Step 1 · copilotEngine.ts 删 2 个 insight 模板
- 删 `generateRisks` 中的 `risk-urgent-notes` 和 `risk-cleaning` 两个 push
- 删 `generateRisks` 的 `shiftNotes: ShiftNote[]` 参数（不再需要）
- 调整 import 移除 `ShiftNote`（若仅此一处使用）
- 文件：[/Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts)

### Step 2 · i18n 清理 + 新增
- **删除** `insights.cleaning.*`（3 字段 × 2 语言 = 6 条）
- **删除** `insights.urgentNotes.*`（3 字段 × 2 语言 = 6 条）
- **新增**：
  - `assistant.hero.occupancy` "今日入住率" / "Today's Occupancy"
  - `assistant.hero.bedsFmt` "{occupied}/{total} 已住 · {empty} 张空床" / "{occupied}/{total} occupied · {empty} empty"
  - `assistant.hero.comparisonUp` "高于 7 天均值 {pct}%" / "{pct}% above 7-day average"
  - `assistant.hero.comparisonDown` "低于 7 天均值 {pct}%" / "{pct}% below 7-day average"
  - `assistant.hero.comparisonEqual` "与 7 天均值持平" / "Same as 7-day average"
  - `assistant.threeDay.title` "接下来 3 天" / "Next 3 Days"
  - `assistant.threeDay.tonight` "今晚" / "Tonight"
  - `assistant.threeDay.tomorrow` "明天" / "Tomorrow"
  - `assistant.threeDay.dayAfter` "后天" / "Day After"
  - `assistant.threeDay.occupancyFmt` "{pct}% 占用" / "{pct}% occupied"
  - `assistant.threeDay.canFill` "可填 {n} 张" / "{n} beds to fill"
  - `assistant.threeDay.fullHouse` "满房" / "Full"
  - `assistant.threeDay.action` "查看对策" / "See action"
  - `assistant.week.7days` "接下来 7 天" / "Next 7 Days"
  - `assistant.needsAttention.risks` "需要立刻处理" / "Needs Action"
  - `assistant.needsAttention.opportunities` "抓住机会" / "Opportunities"
  - `assistant.needsAttention.go` "处理" / "Go"
  - `assistant.empty` "空" / "Empty"
  - `assistant.occupied` "已住" / "Occupied"

### Step 3 · copilotEngine.ts 新增 3 天预测
- 在 `generateWeekForecast` 已有 daily 数组上，新增 `generateThreeDayForecast` 或直接在 `generateWeekForecast` 中返回 `threeDay` 字段（取前 3 个）
- 返回结构：`{ daily: [...7], threeDay: [{ date, occupancyRate, emptyBeds, canFill }] }`
- `canFill` 估算：空床数 = totalBeds × (1 - occupancy/100)

### Step 4 · AssistantPanelToday.tsx 重构布局
**新布局**（4 行）：
1. **Hero 入住率**（满宽）
   - 大字 "今日入住率 73%" + 副文 "{occupied}/{total} 已住 · {empty} 张空床" + "高于 7 天均值 X%"（颜色编码 emerald/amber/red）
2. **3 天 strip**（满宽 3 列）
   - 每张卡：日期标签 + 入住率大数字 + "可填 N 张" + 1 个"查看对策"按钮（点击跳到对应天 BedBoard 视图或 Promotion 工具）
3. **接下来 7 天 forecast**（满宽单行）
   - 7 个细条形图 + 平均 % 数字 + 高峰日
4. **两列 需关注**
   - 左列（risks）：overbook、unconfirmed
   - 右列（opportunities）：femaleRoom、empty3d、recall6m
   - 每张 insight 卡片：左 icon + 中 title/description + 右"GO"按钮（替代原来的 "View XXX →"）
   - 列头：左红/橙 "需要立刻处理" / 右 emerald "抓住机会"

**删除**：
- 「待清洁」stat card（4 → 4 张卡，但删 1 张变 3 张 + 1 张 潜在 = 4 张，逻辑不变）
- 单列 需关注 布局

### Step 5 · 调整 4 张 stat card
- 保留：checkIns / checkOuts / emptyBeds / potentialRevenue
- 删除 cleaningBeds（但 `generateTodaySummary` 仍可返回该字段，未来用）
- 位置：放在 Hero 下方一行（4 张卡占满宽度），3 天 strip 在其下方

### Step 6 · i18n 验证 + 类型检查
- `npm run lint` 通过
- Dashboard 中所有 t() 都能查到 key
- 切 zh/en 全部正确

### Step 7 · 烟测 + 预览
- 启动 dev server，访问 `http://localhost:3000/`（或实际端口）
- 登录 → 经营助手 → 今日
- 验证 Hero 显示正确
- 验证 3 天 strip 卡片显示
- 验证 7 天 forecast 还在
- 验证两列 需关注（左边风险、右边机会）
- 验证点击 "GO" 按钮跳到对应目标
- 验证无 清洁 / 交接班 信息
- 切语言 EN/中 全部正确

---

## 4. 文件改动清单

| 文件 | 类型 |
|---|---|
| [src/utils/copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts) | 改：删 2 个 insight 模板；`generateWeekForecast` 返回 `threeDay` 字段；`generateRisks` 删 `shiftNotes` 参数 |
| [src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | 改：删 `insights.cleaning.*` `insights.urgentNotes.*`；增 `assistant.hero.*` `assistant.threeDay.*` `assistant.week.7days` `assistant.needsAttention.{risks,opportunities,go}` `assistant.{empty,occupied}` |
| [src/components/AssistantPanelToday.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelToday.tsx) | 大改：4 行新布局（Hero + 4 stat + 3-day strip + 7-day + 两列 需关注）；删 Cleaning stat card；拆 InsightRow 为 RiskRow/OpportunityRow 或加 `kind` 字段 |

预计 **3 个文件**改动。

---

## 5. 范围之外（不做）

- 获客 sub-tab 布局（用户没提，保留现状）
- 顶部 TopBar 导航（不动）
- i18n 架构（上一轮已做完）
- 删除「交接班」/「待清洁」相关独立模块（用户只说 经营助手 不应出现，不动对应模块）
- BedBoard 的清洁模式（不动）
- 统计计算逻辑优化（如更准的 7 天预测算法）—— 用现有 daily 数组的前 3 个即可

---

## 6. 风险与对策

- **布局变化大**：原来 1 块 stat cards + 1 块 week forecast，改为 4 行结构。需保持 1 屏能看完（lg: 整块控制在 ~1000px 高内）。
- **3 天 strip 高度**：每张卡要紧凑，70-80px 高即可。
- **GO 按钮跳转目标**：3 天 strip 的「查看对策」目前没有现成的"按天 BedBoard" 视图，统一跳到 `bedboard` 顶层；后续若加 BedBoard 日期筛选再优化。
- **空床为 0 时 3 天 strip 显示**：满房时显示 "满房" 灰底，不显示「可填」也不显示「查看对策」按钮。
- **Hero 颜色编码**：≥70% emerald, 40-70% amber, <40% red；对比文字中 "高于/低于 7 天均值" 也按差值加颜色。
- **Hero 数字字号**：text-5xl（48px），副文 text-sm。
- **两列 需关注 空状态**：左列空时显示"一切顺利"（绿盾），右列空时显示"暂无机会"（灰）。

---

## 7. 验证清单

- [ ] 经营助手 → 今日 顶部出现 Hero「今日入住率 X%」
- [ ] 副文显示 "{occupied}/{total} 已住 · N 张空床"
- [ ] "高于 / 低于 7 天均值 X%" 文案出现且颜色与 Hero 一致
- [ ] 3 天 strip 显示 3 张卡（今晚/明天/后天）
- [ ] 每张卡显示日期 + 占用率 + "可填 N 张"（或"满房"）
- [ ] 满房日不显示「查看对策」按钮
- [ ] 点击「查看对策」跳到对应天
- [ ] 「待清洁」stat card 已删除
- [ ] 「交接班」/「待清洁」insight 已删除
- [ ] 7 天 forecast 仍显示
- [ ] 需关注 改为两列：左 "需要立刻处理" / 右 "抓住机会"
- [ ] 每条 insight 右侧「GO」按钮可跳转
- [ ] 左/右列各自有"全空"占位文案
- [ ] 切换 EN/中 全部正确
- [ ] 类型检查 + lint 通过
- [ ] 没有任何「清洁」「交接班」字样出现在 经营助手 界面
