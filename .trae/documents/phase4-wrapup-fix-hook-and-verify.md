# 收尾计划：修复 React Hook 错误 + 验证落地页/设置/获客重构

## 1. Summary

Phase 4 的三件重构（落地页 7 段重做、设置增 2 个子 tab、获客工具迁出经营助手）已经全部实现完毕：
- [LandingPage.tsx](file:///Users/ricky/AICode/hostelite/src/components/LandingPage.tsx) 整体重写为 7 段 + blue-600 主题
- [SettingsPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/SettingsPanel.tsx) 从 3 子 tab 扩到 5 个（员工/迁移/房间/获客/通用）
- [RoomsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/RoomsSection.tsx) + [RoomsDialogs.tsx](file:///Users/ricky/AICode/hostelite/src/components/RoomsDialogs.tsx) + [GrowthToolsSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowthToolsSection.tsx) 三个新组件已建好
- [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) 已净化（去掉 ToolsRow）
- [i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) 已加完所有新 key
- [App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) 已实现 settingsSubTab + growthSubTab 状态提升 + navigateToGrow 深链

**唯一阻塞的生产问题**：[App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) 里有 React Hook order 违规（`useStaff()` 在 `if (showLanding) return` 早返回之后被再次调用），导致浏览器报 "change in the order of Hooks called"。这是必须修的。

## 2. Current State Analysis

### 2.1 已完成（无需改动）
| 范围 | 状态 |
|---|---|
| 落地页 7 段 + blue-600 主题 | ✅ |
| Hero / Reality Check / Bunkly Way / Features / Bed-Level Gap / AI / Pricing + CTA / Footer | ✅ |
| 设置 5 子 tab（员工/迁移/房间/获客/通用） | ✅ |
| 房间管理（RoomsSection + RoomsDialogs） | ✅ |
| 获客工具（GrowthToolsSection，5 子 tab 内嵌） | ✅ |
| 经营助手净化（无 ToolsRow，无 Sheet 弹窗） | ✅ |
| Copilot 洞察 → Settings/获客/工具 深链 | ✅ |
| i18n 中英文完整 | ✅ |
| `tsc --noEmit` 退出码 0 | ✅ |

### 2.2 待修：[App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) Hook order 违规

当前代码结构（[App.tsx#L20-L88](file:///Users/ricky/AICode/hostelite/src/App.tsx#L20-L88)）：

```tsx
function AppContent() {
  // 1-5: 5 个 useState
  const [activeTab, setActiveTab] = useState('assistant');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('staff');
  const [growthSubTab, setGrowthSubTab] = useState<string | null>(null);
  const [autoOpenPromo, setAutoOpenPromo] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // 6: useContext（第一次）
  const { logout, visibleTabs } = useStaff();

  // 7: useEffect
  useEffect(() => { ... }, [logout]);

  // ... event handlers
  const navigateToGrow = (...) => { ... };
  const handleSettingsSubTabChange = (...) => { ... };

  // ⚠️ 早返回
  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  // ⚠️ 8: useContext（第二次，违规！）
  const { isAuthenticated } = useStaff();
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  // ...
}
```

**问题**：第一次渲染时 `showLanding=true`，在第 6 个 hook 之后就早返回，根本没到第 8 个 `useContext`；第二次渲染时 `showLanding=false`，这时 React 看到第 8 个 hook 被调用 → 抛 "change in the order of Hooks called"。

烟雾测试日志（[.trae/diag_landing_rooms_growth.py](file:///Users/ricky/AICode/hostelite/.trae/diag_landing_rooms_growth.py) 报）：

```
=== Errors: 1 ===
  [error] React has detected a change in the order of Hooks called by AppContent.
   1. useState, 2. useState, 3. useState, 4. useState, 5. useState,
   6. useContext, 7. useEffect, 8. undefined useContext
```

### 2.3 次要项
- [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx#L30-L44) 的 "tools moved" 提示行里写了 "获客工具已迁至" 字样 → 烟雾测试把它误报为「工具行未删」假阳性。可优化为更中性的 "工具已迁至" 措辞。
- [ToolsRow.tsx](file:///Users/ricky/AICode/hostelite/src/components/ToolsRow.tsx) 和 [GrowPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowthToolsSection.tsx) 是死代码（无人 import），用户之前明确说保留，**不动**。
- BedBoard 内联房间编辑入口移除是 plan 里标"低优先级"的事项，**不动**。

## 3. Proposed Changes

### 3.1 修 [App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) Hook 顺序违规

**思路**：把第二次 `useStaff()` 调用的字段 `isAuthenticated` 一并提到顶部解构，然后让两个 `if` 检查都发生在所有 hooks 调用之后。

**改动 [App.tsx#L34](file:///Users/ricky/AICode/hostelite/src/App.tsx#L34)**：把

```tsx
const { logout, visibleTabs } = useStaff();
```

改成

```tsx
const { logout, visibleTabs, isAuthenticated } = useStaff();
```

**删除 [App.tsx#L85](file:///Users/ricky/AICode/hostelite/src/App.tsx#L85)** 处的 `const { isAuthenticated } = useStaff();` 重复调用。

**调整 [App.tsx#L79-L88](file:///Users/ricky/AICode/hostelite/src/App.tsx#L79-L88) 的早返回顺序**：因为现在所有 hook 都在顶部，渲染分支可以是任意顺序。建议调整为：

```tsx
// Auth gate first: if not logged in, always show LoginScreen
// (whether on landing or not doesn't matter if you can't log in)
if (!isAuthenticated) {
  return <LoginScreen />;
}

// Authenticated: decide landing vs. app shell
if (showLanding) {
  return <LandingPage onEnterApp={() => setShowLanding(false)} />;
}

// Authenticated & in-app: render main shell
const effectiveTab = ...;
return ( <div>...</div> );
```

这样所有 7 个 hook（5 useState + 1 useContext + 1 useEffect）每次渲染都按相同顺序调用，React 就不会报错。

### 3.2 优化 [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) hint 措辞

为了让烟雾测试不再误报 + 文案更克制，把 [AssistantPanel.tsx#L30-L42](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx#L30-L42) 的：

```
获客工具已迁至 [获客] 子 tab
```

改为：

```
工具已迁至 [获客] 子 tab
```

具体：把 `t('assistant.toolsMovedHint')` 的值从 "获客工具已迁至" 改成 "工具已迁至" 即可（zh + en 都改）。

### 3.3 验证

1. **`npx tsc --noEmit`**：应继续退出 0
2. **重新跑 [.trae/diag_landing_rooms_growth.py](file:///Users/ricky/AICode/hostelite/.trae/diag_landing_rooms_growth.py)**：应报告 `=== Errors: 0 ===`
3. **手动浏览器走查**（开发服务器 `http://localhost:3000/`）：
   - 落地页 7 段正常滚动
   - 点 "免费开始" → 登录 → 看到 TopBar 5 tabs
   - 点 "经营助手" → 4 卡 + 柱图 + 需关注（无底部工具行）
   - 点 "设置" → 5 子 tab
   - 切到 "房间" → 看到房间卡片 + 添加按钮
   - 切到 "获客" → 5 子 tab（主页/CRM/上座率/转介绍/定价）能切换
   - 切到 "通用" → 4 行（语言/版本/退出/重置）
4. **提供预览链接**：[http://localhost:3000/](http://localhost:3000/) 给用户

## 4. 关键文件清单

| 文件 | 变更 |
|---|---|
| [App.tsx](file:///Users/ricky/AICode/hostelite/src/App.tsx) | 合并两次 `useStaff()` 调用；调整 `isAuthenticated` 检查到 `showLanding` 之前 |
| [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) | hint 文案 "获客工具已迁至" → "工具已迁至"（zh + en） |
| [i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) | `assistant.toolsMovedHint` 中英值小幅调整 |

## 5. Assumptions & Decisions

1. **不删除 BedBoard 内联房间编辑入口**：plan 里标低优先级，且有功能风险（可能影响拖拽），保持现状。
2. **不删除 [ToolsRow.tsx](file:///Users/ricky/AICode/hostelite/src/components/ToolsRow.tsx) / [GrowPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/GrowPanel.tsx)**：用户明确说保留，遵守。
3. **hook 修复策略 = 顶部一次性解构 + 渲染分支**：比"加 `useState` 哨兵变量"或"把 `showLanding` 改 `useMemo`"更直接，符合 React 官方推荐。
4. **hint 文案调整是锦上添花**：可选项，主要为消除烟雾测试假阳性 + 文案更克制。
5. **服务在跑**：开发服务器 `http://localhost:3000/` 假定已启动（之前对话里在跑）。如果没跑，验证时启动 `npm run dev`。

## 6. 验证清单

- [ ] `npx tsc --noEmit` 退出 0
- [ ] 烟雾测试报告 `=== Errors: 0 ===`
- [ ] 烟雾测试报告 "tools moved" hint 出现
- [ ] 烟雾测试报告 "获客工具" 计数为 0
- [ ] 浏览器手动：5 步流程全过
- [ ] 把 [http://localhost:3000/](http://localhost:3000/) 链接发给用户
