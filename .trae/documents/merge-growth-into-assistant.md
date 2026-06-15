# 获客工具合并进经营助手：统一获客收入指导

## 1. Summary

把"获客"5 工具从 `Settings → 获客` 子模块**搬进** `经营助手` 模块，作为经营助手的第二层 sub-tab（`今日` / `获客`），形成"看今日 → 看机会 → 直接行动"的信息流闭环。**同步删除** `Settings → 获客` 子 tab（避免双入口），并把 `navigateToGrow` 深链重新指向 `经营助手 → 获客` 子 tab 而非 `设置 → 获客`。

设计目标：**让用户从"今天发生了什么" → "能赚多少 / 少赚多少" → "直接行动"** 不离开经营助手页。

## 2. Current State Analysis

### 2.1 现有两个模块的痛点
| 位置 | 内容 | 痛点 |
|---|---|---|
| `经营助手` (CopilotPanel) | 4 stat cards + 周预测柱图 + 需关注（risks + opportunities） | insight 跳到"设置"模块做行动，路径长（`CopilotPanel → setActiveTab('settings') → setSettingsSubTab('growth') → setGrowthSubTab('pricing')`） |
| `Settings → 获客` (GrowthToolsSection) | 5 内嵌子 tab：主页 / CRM / 空床动作 / 推荐奖励 / 定价 | 隐藏路径，需 2 步（进设置 → 切到获客）才能看到收入工具；与"今日洞察"完全割裂 |
| 顶栏 [AssistantPanel.tsx#L26-L44](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx#L26-L44) | "工具已迁至 [获客] 子 tab" 提示 | 既然已经合并，这个提示就过时了，需要删除 |

### 2.2 数据流（真实存在的）
- [copilotEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/copilotEngine.ts) — `generateTodaySummary` (4 cards) / `generateWeekForecast` (柱图) / `generateOpportunities` (3 个 opps) / `generateRisks` (4 个 risks)
- [occupancyEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/occupancyEngine.ts) — `generateOccupancyActions` → `OccupancyAction.estimatedRevenue` / `estimatedBedNights`（**已有潜在营收字段**）
- [guestCrmEngine.ts](file:///Users/ricky/AICode/hostelite/src/utils/guestCrmEngine.ts) — `findRecallCandidates` → 6 个月未回访客人数
- [RevenueBoost.tsx](file:///Users/ricky/AICode/hostelite/src/components/RevenueBoost.tsx#L22-L27) — 4 档硬编码价格建议（peak / off / weekend / weekday）

### 2.3 现有 app 状态提升（[App.tsx#L26-L82](file:///Users/ricky/AICode/hostelite/src/App.tsx#L26-L82)）
```ts
const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('staff');
const [growthSubTab, setGrowthSubTab] = useState<string | null>(null);
const [autoOpenPromo, setAutoOpenPromo] = useState(false);
const navigateToGrow = (subTab, options?) => {
  setActiveTab('settings');
  setSettingsSubTab('growth');
  setGrowthSubTab(subTab);
  if (options?.autoOpenPromo) setAutoOpenPromo(true);
};
```
**本次需要改**：把 `settingsSubTab` 中的 `'growth'` 改为 `'assistant'` 维度下的 sub-tab state，不再走 settings 路径。

## 3. Proposed Changes

### 3.1 架构改动（信息架构）

**改后**（经营助手 2 层 sub-tab）：
```
TopBar: 经营助手 | 床位看板 | 入住 | 班次 | 设置
                   ↓
       [经营助手] 
       ┌────────────────────────────────────────────┐
       │ sub-tab bar: [今日] [获客]                  │ ← 新增
       ├────────────────────────────────────────────┤
       │ [今日]  (现有 CopilotPanel 内容)            │
       │   Row 1: 4 stat cards + 本周预测柱图        │
       │   Row 2: 需关注 (risks + opportunities)     │
       │   新增 5th card: 今日潜在营收 $X            │ ← 新增
       │                                            │
       │ [获客]                                     │
       │   顶部 overview card:                       │ ← 新增
       │     "5 tools · 7天潜在 $X · N 待回访"      │
       │   sub-sub-tab: 主页 | CRM | 空床 | 推荐 | 定价
       │   content: 5 个工具内嵌 (复用现有组件)      │
       └────────────────────────────────────────────┘

设置模块 (改后): 员工 | 迁移 | 房间 | 通用 (4 个子 tab) ← 删"获客"
```

### 3.2 文件改动清单

| 文件 | 改动 |
|---|---|
| [src/components/AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) | **重写**为 2 层 sub-tab 容器。持有 `assistantSubTab: 'today' \| 'growth'` 和 `growthSubTab: GrowthSubTabId` 内部 state。删掉顶部 "tools moved" hint 行。 |
| [src/components/AssistantPanelToday.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelToday.tsx) | **新建**：把现有 CopilotPanel 拆出来（4 cards + 周预测 + 需关注 + 新增 "今日潜在" 5th card），接收 navigateToGrow 仍然有效。 |
| [src/components/AssistantPanelGrowth.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanelGrowth.tsx) | **新建**：内嵌 5 个工具组件（HostelPage / GuestCRM / OccupancyActions / ReferralPanel / RevenueBoost），加 1 个顶部 overview 卡（"5 工具 · 7天潜在 $X · N 待回访"），保留 5 sub-sub-tab 切换。 |
| [src/components/CopilotPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/CopilotPanel.tsx) | **保留但拆解** `StatCard` / `InsightRow` 子组件导出（被 AssistantPanelToday 复用）。`ToolId` 类型保留作为 dead-code 兼容导出（不动）。 |
| [src/components/SettingsPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/SettingsPanel.tsx) | `SettingsSubTab` 改 type 为 `'staff' \| 'migrate' \| 'rooms' \| 'general'`（**删 `'growth'`**）。子 tab 渲染从 5 变 4，删除 `growthSubTab` / `autoOpenPromo` / `onAutoOpenPromoConsumed` props 和对应的 `GrowthToolsSection` 引用。 |
| [src/components/GrowthToolsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowthToolsSection.tsx) | **删除**（已被 AssistantPanelGrowth 完全取代，不留 dead code）。 |
| [src/App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) | 删 `growthSubTab` / `autoOpenPromo` 状态；`navigateToGrow` 改为**新签名** `(subTab, options?) => void`，内部：`setActiveTab('assistant')` 并通过 prop 把 subTab 推到 AssistantPanel → AssistantPanelGrowth。如果当前已在 经营助手，App 直接 setActiveTab 即可（AssistantPanel 不卸载）。 |
| [src/i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | 新增 `assistant.subTabs.today` / `assistant.subTabs.growth` / `assistant.growthOverview.title` / `assistant.growthOverview.tools` / `assistant.growthOverview.potentialRevenue` / `assistant.growthOverview.recallCount` / `assistant.growthOverview.estimate`（中英）。删 `assistant.toolsMovedHint` / `assistant.toolsMovedHintSuffix` / `subnav.growth` 不再需要。 |
| [.trae/diag_bunkdesk_rebrand.py](file:///Users/ricky/AICode/hostelite/.trae/diag_bunkdesk_rebrand.py) | **新增断言**：经营助手页有 2 sub-tab（今日 + 获客），获客 sub-tab 切到后看到 5 sub-sub-tab + overview 卡片。 |

### 3.3 关键 API 重新设计

**新的 `navigateToGrow`（不变名以最小化改动）**：
```ts
// App.tsx
const navigateToGrow = (
  subTab: string,
  options?: { autoOpenPromo?: boolean },
) => {
  // 1. 切到 经营助手 tab
  setActiveTab('assistant');
  // 2. 透传 subTab 给 AssistantPanel，它内部决定怎么切换
  setGrowHint({ subTab, autoOpenPromo: options?.autoOpenPromo ?? false });
};
```

**AssistantPanel 接收 grow hint**：
```tsx
interface AssistantPanelProps {
  setActiveTab?: (tab: string) => void;
  growHint?: { subTab: string; autoOpenPromo: boolean } | null;
  onGrowHintConsumed?: () => void;
}
```

**Copilot insight actionTarget 仍然用 `'grow:pricing'` 等** — AssistantPanel 解析 `actionTarget` 时**直接本地切换 subTab**（不再走 `navigateToGrow` 跳到 settings）。这样 insight 点击是 0 延迟切换。

### 3.4 AssistantPanelToday 的"今日潜在"卡片

```tsx
// 从 useHostel + useMemo 算 totalPotentialRevenue
import { generateOccupancyActions, calculateAvailability } from '../utils/occupancyEngine';
const actions = useMemo(() => generateOccupancyActions(rooms, guestProfiles, 7), [rooms, guestProfiles]);
const totalPotentialRevenue = actions.reduce((s, a) => s + a.estimatedRevenue, 0);
const totalBedNights = actions.reduce((s, a) => s + a.estimatedBedNights, 0);

// 渲染为第 5 个 StatCard
<StatCard
  label={t('assistant.potentialRevenue') || '今日潜在'}
  value={`$${totalPotentialRevenue}`}
  icon={<DollarSign className="h-4 w-4" />}
  color="emerald"
  onClick={() => switchToAssistantSubTab('growth')}
/>
```

颜色 emerald 表示"机会"语义；点击 → 切到"获客"子 tab 的 `occupancy` sub-sub-tab（直接打开空床动作工具）。

### 3.5 AssistantPanelGrowth 的 overview 卡片

```tsx
// 顶部 sticky bar
<Card>
  <CardContent className="p-4 flex items-center justify-between">
    <div>
      <p className="text-xs text-zinc-500">{t('assistant.growthOverview.title') || 'Growth overview'}</p>
      <p className="text-lg font-semibold mt-0.5">
        {t('assistant.growthOverview.estimate') || 'Potential 7-day revenue'}: <span className="text-emerald-600">${totalPotentialRevenue}</span>
      </p>
    </div>
    <div className="flex gap-4 text-xs text-zinc-500">
      <span><span className="font-semibold text-zinc-900">5</span> {t('assistant.growthOverview.tools') || 'tools'}</span>
      <span><span className="font-semibold text-zinc-900">{recallCount}</span> {t('assistant.growthOverview.recallCount') || 'recallable'}</span>
    </div>
  </CardContent>
</Card>
```

### 3.6 行为细节
- **保留 TopBar 5 tab**：经营助手 / 床位看板 / 入住 / 班次 / 设置（不动）
- **保留 5 工具组件本身**：HostelPage / GuestCRM / OccupancyActions / ReferralPanel / RevenueBoost 完全不动，只重新组装位置
- **保留 deep-link 行为**：从 `今日` 卡上的"今日潜在"点击 → 切到 `获客 → 空床动作`；从 `需关注` insight 点击 → 切到对应 sub-sub-tab；这一切**不**跳转到 settings
- **保留 Settings → 房间管理**（房间还在设置里，不动）
- **i18n `subnav.growth` key 是否删？** — 检查 i18n 现状；如果只被 AssistantPanel hint 用了，可删；如果其他地方有引用，留（最小修改原则）

## 4. 验证

1. `npx tsc --noEmit` → 退出 0
2. 烟雾测试 [diag_bunkdesk_rebrand.py](file:///Users/ricky/AICode/hostelite/.trae/diag_bunkdesk_rebrand.py) **加新断言**：
   - 经营助手页有 2 sub-tab（今日 + 获客）
   - 切到"获客"后看到 5 sub-sub-tab（主页/CRM/空床/推荐/定价）
   - 切到"获客"后看到 overview 卡片含 "Potential 7-day revenue"
   - 切到"今日"后看到 4 + 1 = 5 stat cards（含"今日潜在 $X"）
   - 经营助手 5 sub-tab 中已无 "获客" 入口
   - 设置模块只 4 子 tab（员工/迁移/房间/通用），无 "获客"
   - insight click "grow:xxx" 仍在 经营助手 模块内切换（不跳到 settings）
   - 0 console errors
3. 浏览器手动：登录 → 经营助手 → 切 获客 → 5 工具能切 → 点 insight 跳工具
4. 提供 [http://localhost:3000/](http://localhost:3000/) 链接

## 5. 不做（明确范围）
- **不改** 5 个工具组件（HostelPage / GuestCRM / OccupancyActions / ReferralPanel / RevenueBoost）内部代码
- **不改** 经营助手 Tab 名称
- **不改** 床位看板 / 入住 / 班次 模块
- **不改** 落地页（上一轮已重做）
- **不删除** CopilotPanel.tsx — 保留作为 backward-compat 入口，StatCard / InsightRow 子组件被 AssistantPanelToday 复用

## 6. 假设
- 用户接受 经营助手 顶部加 sub-tab 切换器（不直接做一个独立 "Growth" 顶层 tab）
- 用户接受从 settings 删除"获客"子 tab（避免双入口混乱）
- 用户接受"今日潜在"卡片用 OccupancyActions 的 totalPotentialRevenue（数据真实存在）
- 用户接受不删除 CopilotPanel.tsx（保留 backward-compat 入口，让 ToolsRow.tsx 死代码仍能 import StatCard/InsightRow 模式）
