# HostelOps Demo 完整性审计与修复 Spec

## Why
HostelOps 定位为**高质量交互 demo**，需精简 MVP 满足青旅经理/前台核心场景。当前功能模块已成型但存在影响 demo 演示效果的问题：核心流程断点、硬编码残留、数据不一致、交互细节缺失。

## What Changes
- 修复核心流程断点：CheckInPanel 金额显示硬编码 $85、Legal Consent 硬编码英文、payment 金额不读 totalAmount
- 修复 i18n 残留：CheckInPanel "Legal Consent"、Dashboard "+N more"、ReservationsView partial 付款状态翻译缺失
- 修复数据一致性：zh reservations 缺少 pendingArrival/checkedIn/reserved 等 key
- 修复交互细节：Dashboard Search 按钮无功能、BedBoard 退房确认弹窗缺失、CalendarView 弹窗 footer 用 cancel 而非 close
- 修复 ReservationsView partial 付款状态显示错误（显示 unpaid 而非 partial）

## Impact
- Affected code: CheckInPanel, Dashboard, ReservationsView, CalendarView, BedBoard, i18nContext

---

## ADDED Requirements

### Requirement: CheckInPanel 金额动态计算
CheckInPanel 的付款金额 SHALL 读取客人的 totalAmount 字段，而非硬编码 $85。

#### Scenario: 客人入住显示正确金额
- **WHEN** 选中一个 totalAmount=425 的客人
- **THEN** 付款区域显示 $425 而非 $85

### Requirement: CheckInPanel Legal Consent 国际化
CheckInPanel 的 "Legal Consent" 文本 SHALL 使用 i18n key。

#### Scenario: 中文模式下显示中文
- **WHEN** 切换到中文
- **THEN** "Legal Consent" 显示为 "法律授权" 或对应翻译

### Requirement: ReservationsView partial 付款状态正确显示
ReservationsView 的 partial 付款状态 SHALL 显示 "Partial"/"部分支付" 而非 "Unpaid"/"未付"。

#### Scenario: partial 状态客人显示
- **WHEN** 客人 paymentStatus 为 partial
- **THEN** 表格中显示 "Partial" 标签（黄色）而非 "Unpaid"

---

## MODIFIED Requirements

### Requirement: Dashboard "+N more" 国际化
Dashboard 中 "+N more" 链接 SHALL 使用 i18n key（如 dashboard.moreCount），中文显示 "+N 条更多"。

### Requirement: CalendarView 弹窗 footer 按钮
CalendarView 弹窗 footer 的 "Cancel" 按钮 SHALL 改为 "Close" 语义，使用 i18n key calendarview.close。

### Requirement: i18n zh reservations 补全
zh 的 reservations section SHALL 包含 pendingArrival、checkedIn、reserved、unassigned、noReservations、reviewAndClean、bedsNeedCleaning、bedsNeedCleaningDesc 等 key。

---

## REMOVED Requirements

（无移除项）
