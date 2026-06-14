# HostelOps 原型 Demo 质量审计与修复 Spec

## Why
HostelOps 定位为**高质量原型 demo**，用于验证产品设计和用户流程。当前存在影响 demo 演示效果的问题：i18n 不完整导致中文切换后显示英文、功能逻辑缺陷（未付款阻止入住）、弹窗信息不一致、代码质量问题。需要修复这些问题确保 demo 展示效果专业完整。

## What Changes
- 修复 i18n 不完整：ReservationsView 大量硬编码英文、BedBoard 清洁提示未翻译、CalendarView Today 按钮未翻译
- 修复功能逻辑缺陷：CheckInPanel 付款状态不应阻止入住
- 修复弹窗信息不一致：CalendarView 弹窗缺少来源/偏好/DOB/金额，与 Dashboard 不一致
- 修复代码质量：废弃文件残留、any 类型、addRoom 缺少 name 字段
- 添加 localStorage 持久化：demo 演示时刷新不丢数据（demo 必要体验）

## Impact
- Affected specs: i18n 完整性、用户体验、代码质量
- Affected code: ReservationsView, BedBoard, CalendarView, CheckInPanel, HostelContext, StaffContext, i18nContext

---

## ADDED Requirements

### Requirement: 数据持久化（demo 体验保障）
系统 SHALL 将核心业务数据持久化到 localStorage，确保 demo 演示过程中刷新页面不丢失数据。

#### Scenario: 页面刷新后数据恢复
- **WHEN** 用户刷新浏览器
- **THEN** 所有业务数据保持不变，包括房间状态、客人信息、任务进度

### Requirement: i18n 完整性
系统 SHALL 所有用户可见文本均通过 i18n key 获取，无硬编码英文字符串。

#### Scenario: 切换到中文时所有文本正确显示
- **WHEN** 用户切换到中文
- **THEN** ReservationsView 状态标签、BedBoard 清洁提示、CalendarView Today 按钮等均显示中文

### Requirement: CheckIn 逻辑修复
系统 SHALL 允许未付款客人先办理入住（床位分配），付款状态不阻止入住流程。

#### Scenario: 未付款客人入住
- **WHEN** 客人未付款但已完成护照扫描
- **THEN** 入住按钮可用，可分配床位完成入住

---

## MODIFIED Requirements

### Requirement: CalendarView 弹窗信息完整性
CalendarView 的客人详情弹窗 SHALL 与 Dashboard 弹窗保持一致，显示来源标签、房间偏好、DOB、金额明细。

### Requirement: ReservationsView 国际化
ReservationsView 的所有硬编码英文 SHALL 替换为 i18n key，包括：
- "Pending Arrival" / "Checked In" / "Reserved" 状态标签
- "Unassigned" 床位标签
- "No reservations found." 空状态提示
- "Review & Clean" 清洁按钮
- "bed needs/beds need cleaning" 清洁提示

### Requirement: BedBoard 清洁提示国际化
BedBoard 的清洁提示 banner 中 "bed needs/beds need cleaning"、"Prioritize preparing beds for incoming guests."、"Review & Clean" SHALL 使用 i18n key。

---

## REMOVED Requirements

### Requirement: 废弃文件 ShiftStaffContext.tsx
**Reason**: 已被 StaffContext.tsx 完全替代，但文件仍残留
**Migration**: 删除 src/ShiftStaffContext.tsx
