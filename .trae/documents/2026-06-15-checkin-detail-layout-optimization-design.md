# BunkDesk v1.6.1 — 待办理详情卡信息排版优化设计

> **日期**: 2026-06-15
> **状态**: Approved (待用户复审)
> **作用域**: `CheckInPanel.tsx` 详情卡 + `bedAllocator.ts` 推荐原因展示 + Source 下拉
> **版本基线**: v1.6.0

---

## 1. 背景与目标

### 1.1 当前问题

v1.6.0 的详情卡双栏布局结构合理，但信息排版存在 4 个问题：

1. **左栏信息卡排版**：2 列 Field 网格视觉密度低，字段标签和值区分不够，分区标题（灰色小字）层级不清晰
2. **右栏操作区比例**：Verification / Payment / Notes 各占一张卡，Bed Assignment 空间被压缩
3. **字段可读性**：图标+标签+值排列紧凑，缺少视觉分隔和彩色图标背景
4. **视觉风格**：整体偏灰，缺少色彩层级和 badge 化展示

### 1.2 目标

在**保持双栏结构 + 2 列床位网格不变**的前提下，优化信息排版和视觉层级：
- 信息更易读（彩色图标背景 + 分隔线 + badge 化）
- 右栏空间更高效（3 卡压缩为 1 状态条，Bed 区域更大）
- Source 字段做成内嵌下拉菜单
- 床位推荐展示推荐原因标签（性别/偏好/填充/碎片化）

### 1.3 非目标

- 不改变双栏结构（左 60% 信息 / 右 40% 操作）
- 不改变床位选择交互（保持 2 列网格）
- 不新增字段（v1.6.0 已有 16 个字段足够）
- 不改动 Walk-in 表单

---

## 2. 改动清单

### 2.1 左栏 Header 卡

| 元素 | 当前 | 优化 |
|------|------|------|
| 姓名 | 16px / font-weight 600 | 17px / font-weight 800 |
| 国家 | 纯文本 "Germany" | badge `🇩🇪 DEU`（蓝色底） |
| 性别 | 纯文本 "Female" | badge `♀ Female`（粉色底） |
| 付款状态 | badge（已有） | 保持 |
| 抵店时段 | 无 | 新增 badge `🕒 Afternoon`（蓝色底） |

### 2.2 左栏 Contact + ID 卡

**合并为一张卡**（当前是 Contact 一张 + ID 在同一张卡内用分隔线，保持不变但优化视觉）：

| 元素 | 当前 | 优化 |
|------|------|------|
| 分区标题 | 灰色 9px 大写 | 彩色圆点 + 彩色标题（蓝=Contact / 紫=ID） |
| 字段行 | emoji 图标 + 标签 + 值（无背景） | 彩色图标背景（蓝色圆角方块） + 标签 + 值 + 行分隔线 |
| 2 列网格 | 保持 | 保持 |
| Source 字段 | 不显示 | 新增：内嵌下拉菜单（Walk-in ▾），占满一行 |
| ID 扫描状态 | 不在此区 | 在 ID Type 行末尾加 `✓ Scanned` badge |

### 2.3 右栏 Verification + Payment + Notes

**3 张卡压缩为 1 张状态条**：

```
┌─────────────────────────────┐
│ ✓ Verified                  │
│ ⚠ $255 unpaid    [Collect]  │
│ 📝 Prefers bottom bunk      │
└─────────────────────────────┘
```

- 每行一个状态项，左侧彩色图标 + 文字，右侧操作按钮
- 高度从 ~120px 压缩到 ~80px，节省空间给 Bed Assignment

### 2.4 右栏 Bed Assignment

| 元素 | 当前 | 优化 |
|------|------|------|
| 卡片边框 | 默认灰色 | 绿色边框（#10b981） |
| 推荐依据 | 无 | 新增：`For ♀ Female · prefers Mixed` |
| 床位标签 | `Fill` / `Match` | 改为：`♀ Gender` / `✓ Pref` / `Fill` / `Low frag` |
| 2 列网格 | 保持 | 保持 |

### 2.5 Source 下拉菜单

在 Contact 区新增一行，内嵌 Select 组件：

```tsx
<div className="field-row" style={{ gridColumn: '1 / -1' }}>
  <div className="f-icon" style={{ background: '#eff6ff' }}>📋</div>
  <div>
    <div className="f-label">{t('checkin.source.label')}</div>
    <Select value={selectedGuest.bookingSource ?? 'walk-in'}
            onValueChange={(val) => updateArrival(selectedGuest.id, { bookingSource: val as BookingSource })}>
      <SelectTrigger className="h-7 text-xs bg-zinc-100 border-zinc-200 w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="walk-in">{t('checkin.source.walkIn')}</SelectItem>
        <SelectItem value="phone">{t('checkin.source.phone')}</SelectItem>
        <SelectItem value="email">{t('checkin.source.email')}</SelectItem>
        <SelectItem value="referral">{t('checkin.source.referral')}</SelectItem>
        <SelectItem value="other">{t('checkin.source.other')}</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

### 2.6 床位推荐原因标签

`scoreBeds` 已返回 `reasons` 数组和 `genderMatch` / `preferenceMatch` / `fillExisting` / `fragmentationScore` 布尔字段。当前 UI 只显示 `Fill` 和 `Match` 两个标签。

优化映射：

| 字段 | 标签文本 | 样式 |
|------|---------|------|
| `genderMatch === true` | `♀ Gender` | 蓝色底 |
| `preferenceMatch === true` | `✓ Pref` | 紫色底 |
| `fillExisting === true` | `Fill` | 灰色底 |
| `fragmentationScore >= 7` | `Low frag` | 黄色底 |

---

## 3. 文件改动清单

| 文件 | 类型 | 改动 |
|------|------|------|
| `src/components/CheckInPanel.tsx` | 修改 | 左栏信息排版 + 右栏状态条 + Source 下拉 + 床位标签 |
| `src/components/EditGuestInfoModal.tsx` | 不改 | Source 下拉已在弹窗中，详情卡新增内嵌下拉不冲突 |

**注意**：`bedAllocator.ts` 不需要改动——它已返回所有推荐原因字段，只需在 UI 层展示。

---

## 4. 验收标准

### 4.1 视觉验收

- [ ] 左栏 Header：姓名加粗 + 国家/性别 badge 化
- [ ] 左栏 Contact：彩色图标背景 + 分隔线 + Source 下拉
- [ ] 左栏 ID：紫色圆点标题 + ID Type 行末扫描状态 badge
- [ ] 右栏：Verification/Payment/Notes 压缩为 1 张状态条
- [ ] 右栏 Bed：绿色边框 + 推荐依据文字 + 4 种原因标签
- [ ] 页面高度 ≤ 当前版本（3 卡→2 卡 + 状态条压缩）

### 4.2 功能验收

- [ ] Source 下拉可切换值，切换后 `updateArrival` 立即保存
- [ ] 床位标签正确反映 `scoreBeds` 返回的推荐原因
- [ ] `tsc --noEmit` 通过

---

## 5. 风险

- **风险 1**：Source 下拉在详情卡内嵌可能触发不必要的 re-render — 用 `onValueChange` 直接调用 `updateArrival`，与现有 Notes Input 模式一致
- **风险 2**：3 卡压缩为 1 状态条后，Verification 扫描护照按钮空间变小 — 扫描状态通常已完成，未扫描时在状态行内显示按钮
