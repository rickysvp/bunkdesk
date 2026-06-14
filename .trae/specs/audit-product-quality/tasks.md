# Tasks

## P0 — Demo 体验关键问题

- [ ] Task 1: 数据持久化 — localStorage 持久化核心状态
  - [ ] 1.1: HostelContext 添加 localStorage 读写逻辑（rooms, arrivals, shiftNotes, tasks, activities），初始化时优先从 localStorage 读取，状态变更时自动写入
  - [ ] 1.2: StaffContext 添加 localStorage 持久化（staffList）
  - [ ] 1.3: 添加 debounce 防止高频写入

- [ ] Task 2: CheckInPanel 入住逻辑修复
  - [ ] 2.1: 移除 completeCheckIn 按钮的 `paymentStatus === 'unpaid'` 禁用条件
  - [ ] 2.2: 未付款时显示警告提示但不阻止入住

## P1 — i18n 完整性（影响中文演示效果）

- [ ] Task 3: ReservationsView i18n 补全
  - [ ] 3.1: 添加 i18n key: reservations.pendingArrival, reservations.checkedIn, reservations.reserved, reservations.unassigned, reservations.noReservations, reservations.reviewAndClean, reservations.bedsNeedCleaning, reservations.bedsNeedCleaningDesc
  - [ ] 3.2: 替换所有硬编码英文文本为 t() 调用
  - [ ] 3.3: paymentStatus 显示使用 i18n 而非原始枚举值

- [ ] Task 4: BedBoard 清洁提示 i18n
  - [ ] 4.1: 添加 i18n key: bedboard.bedsNeedCleaning, bedboard.bedsNeedCleaningDesc, bedboard.reviewAndClean
  - [ ] 4.2: 替换硬编码 "bed needs/beds need cleaning"、"Prioritize preparing..."、"Review & Clean"

- [ ] Task 5: CalendarView i18n + 弹窗信息补全
  - [ ] 5.1: 添加 calendarview.today i18n key（en: "Today", zh: "今天"）
  - [ ] 5.2: CalendarView 弹窗同步 Dashboard 弹窗的来源标签、房间偏好、DOB、金额明细
  - [ ] 5.3: 提取 sourceBadge 等为共享工具函数避免重复

- [ ] Task 6: 全局硬编码字符串扫描与修复
  - [ ] 6.1: 扫描所有组件中的硬编码英文（"Room", "Legal Consent", "PIN" 等）
  - [ ] 6.2: 添加对应 i18n key 并替换

## P2 — 代码质量清理

- [ ] Task 7: 删除废弃文件 + 修复 TS 问题
  - [ ] 7.1: 删除 src/ShiftStaffContext.tsx
  - [ ] 7.2: BedBoard 中 `onValueChange={(val: any) => ...}` 改为正确类型
  - [ ] 7.3: BedBoard handleCreateRoom 中 addRoom 调用补充 name 参数

# Task Dependencies
- Task 5.2 依赖 Task 5.3（先提取共享函数再复用）
- Task 3, 4, 6 可并行
- Task 1, 2 可并行
