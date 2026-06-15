# 导航重构：烟雾测试 + 死代码清理

## 1. Summary

上一轮实现的顶部导航 + 经营助手/设置合并已经通过 `npx tsc --noEmit`，但还没有跑过端到端烟雾测试，并且 `Sidebar.tsx` 现在是死代码（没有文件引用它）。本计划只做两件事：

1. **跑端到端烟雾测试**，验证 5 个主 tab + 2 个容器 tab 的子切换都正常工作、零 JS 错误
2. **删除死代码** `Sidebar.tsx` 及其 i18n key

不引入新功能，不动业务逻辑。

## 2. Current State Analysis

### 2.1 实现已经完成
所有目标组件已存在并被 `App.tsx` 使用：
- [TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx) — 替代左侧 Sidebar
- [AssistantPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/AssistantPanel.tsx) — 合并 dashboard + grow
- [SettingsPanel.tsx](file:///Users/ricky/AICode/hostelite/src/components/SettingsPanel.tsx) — 合并 staff + migrate + general
- [GeneralSection.tsx](file:///Users/ricky/AICode/hostelite/src/components/GeneralSection.tsx) — 语言/版本/登出/重置

`App.tsx`、`StaffContext.tsx`、`i18nContext.tsx` 已经同步更新。`npx tsc --noEmit` 0 错。

### 2.2 死代码
[Sidebar.tsx](file:///Users/ricky/AICode/hostelite/src/components/Sidebar.tsx) 仍在 `src/components/` 里，但 grep 确认 `src/` 内只有 `TopBar.tsx` 和它自己在文件名中提到 `Sidebar` 字符串 —— 没有 import 引用。

### 2.3 烟雾测试脚本已存在
[.trae/diag_nav_smoke.py](file:///Users/ricky/AICode/hostelite/.trae/diag_nav_smoke.py) 已经在上一轮写好但没跑过。它会：
- 启动 headless Chromium 打开 `http://localhost:3000/`
- 清空 localStorage、走过 Landing → 登录 Emma (pin 1234)
- 验证 TopBar 5 个 tab 可见、默认选中「经营助手」
- 切到「床位看板」→ 检查 booking block 渲染
- 切到「设置」→ 验证 3 个子 tab
- 点「通用」→ 验证 4 行（语言/版本/退出登录/重置数据）
- 切到「经营助手」→ 验证 2 个子 tab
- 收集 `pageerror` + console error

dev server 当前在 3000 端口运行（`curl` 返回 200）。

## 3. Proposed Changes

### 3.1 跑烟雾测试
```bash
cd /Users/ricky/AICode/hostelite
python3 .trae/diag_nav_smoke.py
```

预期输出：
- `TopBar count: 1`
- 5 个 tab 全部 `✓`
- `Default active tab: '经营助手'`
- `BedBoard: N booking blocks rendered`（N > 0）
- 3 个设置子 tab 全部 `✓`
- 4 个通用行（语言/版本/退出登录/重置数据）全部 `✓`
- 2 个经营助手子 tab 全部 `✓`
- `=== Errors: 0 ===`

如果报错，根据 Playwright 输出的截图（`/tmp/smoke_*.png`）和错误列表定位修复。

### 3.2 删除 [Sidebar.tsx](file:///Users/ricky/AICode/hostelite/src/components/Sidebar.tsx)
- 用 `DeleteFile` 删除整个文件
- 保留 [TopBar.tsx](file:///Users/ricky/AICode/hostelite/src/components/TopBar.tsx) 顶部注释里那句 "replaces the old left Sidebar"（历史信息不影响功能）

### 3.3 不修改
- i18n key 不动：[i18nContext.tsx](file:///Users/ricky/AICode/hostelite/src/i18nContext.tsx) 里 `sidebar.*` 的所有 key（包括已经被新 TopBar 复用的）继续保留，避免连锁改动；过时的 key（`more` / `calendar` / `reservations` / `rooms` / `growth` / `intelligence` / `copilot` / `operations`）是 dead i18n 字符串但不影响功能，留到下一次 i18n 整理时再清。
- 不动 App.tsx / StaffContext.tsx / AssistantPanel.tsx / SettingsPanel.tsx / GeneralSection.tsx —— 它们都已经是目标状态。
- 不动 `package.json`，不跑 build。

## 4. Assumptions & Decisions

1. **烟雾测试用 Emma (manager) 登录**：因为只有 manager 能看到 `settings` tab，能一次验证权限过滤（reception/cleaning 看不到设置）和 5-tab 全路径。
2. **不删除过时的 i18n key**：本次只清 Sidebar.tsx 这一个明确的死代码文件；i18n 字符串清理是另一件工作。
3. **Sidebar.tsx 没有 i18n key 之外的副作用**：纯展示组件，无 provider 注入、无 context 依赖，删除安全。
4. **如果烟雾测试失败怎么办**：先看 console error 列表；常见原因是子 tab 内部报错（CrmEngine / OccupancyEngine 之类的运行时问题），按错误逐个修；不要重写已经通过的代码。

## 5. Verification Steps

1. `python3 .trae/diag_nav_smoke.py` 输出 `=== Errors: 0 ===` 且所有 `✓`
2. `npx tsc --noEmit` 仍然通过
3. `Grep` 确认 `src/` 内不再有 `Sidebar` import
4. 浏览器手动验证（可选）：`http://localhost:3000/` → 登录 → 5 tab 横排 + 子 tab 切换正常
