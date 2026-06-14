# 概览页面优化方案

## 概述

修复 Dashboard 页面 4 个体验问题：性别分布"其他"不合理、房间入住率颜色无图例、待入住名单来源不清、今日预离排版混乱。

## 问题分析

### 1. 性别分布"其他"
- **现状**：`genderStats.other` 把 `gender === 'other'` 和 `!gender`（未填写）合并显示
- **问题**：青旅场景中 "其他" 性别极少出现，实际显示的是未填 gender 的客人，用户困惑
- **方案**：移除"其他"行，改为只显示 ♂/♀ 两条 + 总人数。未填 gender 的客人不计入男女，仅在总数中体现

### 2. 房间入住率颜色无图例
- **现状**：进度条三色（黑色=已入住、紫色=待清洁、绿色=空闲），无任何说明
- **方案**：在"房间入住率"标题下方添加颜色图例（小圆点+文字），与进度条对齐

### 3. 待入住名单来源不清
- **现状**：直接显示 `arrivals` 列表，用户不知道这些人从哪来
- **方案**：标题改为"待入住（预抵客人）"，副标题说明来源；每条记录显示入住日期和预住晚数

### 4. 今日预离排版混乱
- **现状**：`{roomName || roomNumber}-{bedName}` 如 "Mixed Dorm-A (Bottom)"，挤在右侧，信息密度低
- **方案**：改为两行布局——第一行客人名+国籍+性别，第二行房间号+床位名+退房日期，更清晰

## 具体改动

### 文件：`src/components/Dashboard.tsx`

#### 改动 1：性别分布 — 移除"其他"，简化为 ♂/♀ + 总数

```diff
- other: guests.filter(g => g.gender === 'other' || !g.gender).length,
+ unspecified: guests.filter(g => g.gender !== 'male' && g.gender !== 'female').length,
```

移除"其他"行（第210-221行），底部总数行改为：
```jsx
<div className="pt-2 border-t border-zinc-100 text-xs text-zinc-500 flex items-center justify-between">
  <span>{occupiedBeds} {t('dashboard.totalGuests') || 'total guests'}</span>
  {genderStats.unspecified > 0 && (
    <span>{genderStats.unspecified} {t('dashboard.unspecified') || 'not specified'}</span>
  )}
</div>
```

#### 改动 2：房间入住率 — 添加颜色图例

在 Card 内 roomStats 列表前添加图例行：
```jsx
<div className="flex items-center gap-4 text-[10px] text-zinc-500 mb-2">
  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-700" /> {t('dashboard.occupied') || 'Occupied'}</span>
  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> {t('dashboard.cleaning') || 'Cleaning'}</span>
  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {t('dashboard.availableBeds') || 'Available'}</span>
</div>
```

#### 改动 3：待入住名单 — 优化标题和内容

标题改为：
```jsx
<h2>... {t('dashboard.pendingArrivals') || 'Pending Arrivals'} <span className="text-xs font-normal text-zinc-400">({t('dashboard.arrivalsSource') || 'unassigned guests'})</span></h2>
```

每条记录增加入住日期：
```jsx
<span className="text-xs text-zinc-500">{guest.countryCode} · {guest.nights}N · {format(parseISO(guest.checkInDate), 'MMM d')}</span>
```

#### 改动 4：今日预离 — 改为两行清晰布局

```jsx
<div className="p-3 flex items-center justify-between hover:bg-zinc-50 transition-colors">
  <div className="flex flex-col gap-0.5">
    <span className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
      {genderIcon(guest.gender)}
      {guest.name}
      <span className="text-xs text-zinc-400">{guest.countryCode}</span>
    </span>
    <span className="text-xs text-zinc-500">
      {roomName || roomNumber} · {bedName}
    </span>
  </div>
  <div className="flex flex-col items-end gap-0.5">
    <span className="text-xs text-zinc-500">{format(parseISO(guest.checkOutDate), 'MMM d')}</span>
    <span className="text-[10px] text-zinc-400">{guest.nights}N</span>
  </div>
</div>
```

### 文件：`src/i18nContext.tsx`

新增 key：
- `dashboard.unspecified` — "Not specified" / "未指定"
- `dashboard.arrivalsSource` — "Unassigned guests" / "待分配床位"

## 验证步骤

1. 性别分布：只显示 ♂/♀ 两行，底部总数行显示未指定人数（如有）
2. 房间入住率：图例清晰标注三色含义
3. 待入住名单：标题带来源说明，每条显示入住日期
4. 今日预离：两行布局，客人名+国籍一行，房间+床位一行，右侧退房日期
