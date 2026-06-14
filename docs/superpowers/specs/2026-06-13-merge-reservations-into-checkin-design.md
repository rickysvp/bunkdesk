# 合并预定管理到前台入住 — 设计文档

## 目标

将预定管理(ReservationsView)合并到前台入住(CheckInPanel)，形成统一的「预订与入住中心」。移除预定管理独立tab。

## 当前问题

- 预定管理：只读表格，无操作能力
- 前台入住：只看 arrivals，看不到已入住/已预订
- 两个 tab 切来切去，体验割裂

## 设计

### 合并后的 CheckInPanel 结构

三个子 tab：

1. **待入住 (Pending)** — 当前 arrivals 列表 + 选床入住（现有功能保留）
2. **已入住 (Checked In)** — 当前在床上的客人表格 + 退房按钮
3. **已预订 (Reserved)** — 有预订但还没到的客人表格 + 编辑/取消

### 改动清单

1. **CheckInPanel.tsx** — 增加子 tab 切换，添加已入住/已预订视图
2. **Sidebar.tsx** — 移除 reservations tab
3. **App.tsx** — 移除 reservations 渲染
4. **StaffContext.tsx** — 移除 reservations 从角色权限
5. **i18nContext.tsx** — 添加新 i18n key，更新 tab 名称

### 不改动

- 数据模型不变
- HostelContext 不变
- 日历视图不变
