# Tasks

## P0 — 核心流程修复

- [x] Task 1: CheckInPanel 金额动态化
  - [x] 1.1: 付款区域 `${DEFAULT_PRICE}.00` → `${selectedGuest.totalAmount || calculatedPrice}`
  - [x] 1.2: Collect 按钮金额 `€${DEFAULT_PRICE}` → `$${selectedGuest.totalAmount || DEFAULT_PRICE}`
  - [x] 1.3: paid 状态金额 `$0.00` → `$${selectedGuest.totalAmount || 0}`

- [x] Task 2: CheckInPanel "Legal Consent" 国际化
  - [x] 2.1: 添加 i18n key: checkin.legalConsent (en: "Legal Consent", zh: "法律授权")
  - [x] 2.2: 替换 CheckInPanel 中硬编码 "Legal Consent" 为 t('checkin.legalConsent')

- [x] Task 3: ReservationsView partial 付款状态修复
  - [x] 3.1: 修复 payment 列的 partial 状态显示
  - [x] 3.2: 添加 i18n key checkin.partial

## P1 — i18n 补全

- [x] Task 4: i18n zh reservations 补全
  - [x] 4.1: 在 zh reservations section 添加缺失的 key

- [x] Task 5: Dashboard "+N more" 国际化
  - [x] 5.1: 添加 i18n key: dashboard.moreCount
  - [x] 5.2: 替换 Dashboard 中 2 处 `+${count} more`

- [x] Task 6: CalendarView 弹窗 footer 修复
  - [x] 6.1: 添加 i18n key: calendarview.close
  - [x] 6.2: 替换 CalendarView 弹窗 footer 的 t('staff.cancel')

## P2 — 验证

- [x] Task 7: TypeScript 检查
  - [x] 7.1: 运行 npx tsc --noEmit 确认 0 错误
