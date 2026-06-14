# Bunkly 获客+床位双核升级 Spec

## Why
Bunkly 当前是一个纯运营管理Demo，缺少获客能力。海外青旅经营者最大痛点是空床卖不完（非超售），且现有PMS（BananaDesk $35-155/月+4%佣金、Cloudbeds $100-300+/月）要么太贵要么不理解床位。Bunkly需要从"管床工具"升级为"卖床+管床"双核平台，以免费+0佣金+极致床位体验降维打击竞品。

## What Changes
- 新增获客引擎模块：青旅主页、直订引擎（0佣金）、团队/多人预订、推荐奖励、社交营销工具、收益优化
- 强化床位管理：性别宿舍智能分配、团队预订床位分配、iCal多源同步增强
- 新增迁移中心：CSV导入、iCal迁移、智能字段映射
- 新增数据结构：GroupBooking、Referral、HostelPage 等
- Sidebar导航调整：新增 My Page、Revenue、Migrate 入口
- 落地页重写：痛点叙事从"超售"转向"空床卖不完"
- **BREAKING** GuestSource 新增 "direct"（直订）和 "referral"（推荐）来源类型

## Impact
- Affected specs: fix-demo-completeness, audit-product-quality
- Affected code: types.ts, HostelContext.tsx, Sidebar.tsx, LandingPage.tsx, i18nContext.tsx, App.tsx, BedBoard.tsx, ReservationsView.tsx, Dashboard.tsx, ICalImport.tsx
- New files: HostelPage.tsx, BookingEngine.tsx, ReferralPanel.tsx, SocialKit.tsx, RevenueBoost.tsx, MigrationHub.tsx, GroupBookingModal.tsx

---

## ADDED Requirements

### Requirement: 青旅主页 (Hostel Page)
系统应提供个性化青旅主页功能，让经营者可以生成可分享的青旅介绍页面。

#### Scenario: 生成青旅主页
- **WHEN** 经营者点击"My Page"标签
- **THEN** 系统展示青旅主页编辑器，包含3套预置模板（海滩风/城市风/自然风）

#### Scenario: 主页内容编辑
- **WHEN** 经营者选择模板并编辑内容
- **THEN** 可修改青旅名称、描述、照片、房型列表、设施标签、联系方式、地图位置

#### Scenario: 主页分享
- **WHEN** 经营者点击"Share"按钮
- **THEN** 系统生成可分享链接（如 bunk.ly/p/sunset-hostel）和社交媒体分享按钮

#### Scenario: 主页预览
- **WHEN** 经营者点击"Preview"
- **THEN** 系统在新窗口展示主页的访客视角

---

### Requirement: 直订引擎 (Booking Engine)
系统应提供0佣金直订预订流程，嵌入青旅主页中。

#### Scenario: 访客发起预订
- **WHEN** 访客在青旅主页选择日期和房型
- **THEN** 系统显示可用房型/宿舍类型（不显示具体床位号），访客选择人数

#### Scenario: 团队/多人预订
- **WHEN** 访客选择2人以上预订
- **THEN** 系统进入团队预订流程：填写团队信息、选择统付/AA、系统自动分配相邻床位

#### Scenario: 预订确认
- **WHEN** 访客完成预订信息填写
- **THEN** 系统显示预订确认页，包含推荐码输入框和"分享给朋友"提示

#### Scenario: 推荐码使用
- **WHEN** 访客在预订时输入推荐码
- **THEN** 系统应用对应优惠（如9折/免费早餐），双方各得奖励

---

### Requirement: 团队/多人预订 (Group Booking)
系统应支持一个预订关联多个客人和多张床位。

#### Scenario: 创建团队预订
- **WHEN** 经营者在Check-In或Reservations中点击"Group Booking"
- **THEN** 系统打开团队预订表单，可添加多个成员

#### Scenario: 团队床位分配
- **WHEN** 团队预订创建后
- **THEN** 系统自动分配相邻床位（同宿舍优先相邻床位），经营者可手动调整

#### Scenario: 团队成员独立操作
- **WHEN** 团队中部分成员先到
- **THEN** 可独立check-in，无需等待全部成员到达

#### Scenario: 团队付款
- **WHEN** 团队预订设置为"shared"付款
- **THEN** 账单合并显示，可一次性结算；设置为"split"则每人独立账单

---

### Requirement: 推荐奖励 (Referral Program)
系统应提供老客带新客的推荐奖励机制。

#### Scenario: 生成推荐码
- **WHEN** 客人完成入住
- **THEN** 系统自动生成唯一推荐码（如 BUNKLY-MARCO-7X2），显示在确认页

#### Scenario: 推荐码使用
- **WHEN** 新客在直订时输入推荐码
- **THEN** 新客获得优惠（如9折），推荐人也获得等值奖励

#### Scenario: 推荐统计
- **WHEN** 经营者查看Revenue面板
- **THEN** 可看到推荐转化数据：推荐人数、转化人数、节省佣金金额

---

### Requirement: 社交营销工具 (Social Kit)
系统应提供社交媒体推广模板，帮助经营者快速生成营销内容。

#### Scenario: 生成WhatsApp推广
- **WHEN** 经营者点击"WhatsApp"模板
- **THEN** 系统生成包含青旅信息+直订链接的WhatsApp消息模板，一键复制

#### Scenario: 生成Instagram Story
- **WHEN** 经营者点击"Instagram"模板
- **THEN** 系统生成带青旅照片+预订链接的Story模板

#### Scenario: 空床促销推送
- **WHEN** 系统检测到未来3天空床率>50%
- **THEN** 自动生成促销模板（如"Last minute! 今晚空床8折"），经营者一键发布

---

### Requirement: 收益优化 (Revenue Boost)
系统应提供基于数据的收益优化建议。

#### Scenario: 空床预警
- **WHEN** 系统检测到某日期空床率超过阈值
- **THEN** 在Dashboard显示预警卡片："周三空床率62%，建议降价15%"

#### Scenario: 定价建议
- **WHEN** 经营者查看Revenue面板
- **THEN** 系统基于历史数据展示定价建议：旺季/淡季/周末/工作日的建议价格

#### Scenario: 促销模板
- **WHEN** 经营者点击"Create Promotion"
- **THEN** 可选择促销类型（Last Minute / Early Bird / Long Stay / Group Discount），设置折扣和日期范围

---

### Requirement: 迁移中心 (Migration Hub)
系统应提供从其他PMS平台便捷迁移的工具。

#### Scenario: CSV导入
- **WHEN** 经营者在Migration Hub上传CSV文件
- **THEN** 系统自动识别来源（Cloudbeds/BananaDesk/Sirvoy等），智能映射字段，预览数据，确认导入

#### Scenario: iCal迁移
- **WHEN** 经营者输入其他PMS的iCal URL
- **THEN** 系统拉取未来预订数据，预览后导入

#### Scenario: 迁移进度
- **WHEN** 导入进行中
- **THEN** 系统显示进度条和导入结果摘要（成功N条、失败N条、跳过N条）

#### Scenario: 预置样本
- **WHEN** 经营者没有CSV文件
- **THEN** 可下载预置的Cloudbeds/BananaDesk样本CSV，了解格式要求

---

### Requirement: 性别宿舍智能分配
系统应在分配床位时考虑性别约束。

#### Scenario: 女性宿舍自动分配
- **WHEN** 女性客人入住且有空的女性宿舍床位
- **THEN** 系统自动分配到女性宿舍，不分配到混合宿舍

#### Scenario: 性别冲突预警
- **WHEN** 经营者手动将男性客人分配到女性宿舍床位
- **THEN** 系统显示警告提示

---

## MODIFIED Requirements

### Requirement: GuestSource 类型扩展
GuestSource 从 `"walk-in" | "booking" | "airbnb" | "expedia" | "ical" | "manual"` 扩展为 `"walk-in" | "booking" | "airbnb" | "expedia" | "ical" | "manual" | "direct" | "referral" | "group"`

### Requirement: Sidebar 导航
Sidebar 新增3个入口：My Page（青旅主页）、Revenue（收益优化）、Migrate（迁移中心）。Manager角色可见全部，Reception角色不可见Revenue和Migrate。

### Requirement: 落地页痛点叙事
落地页主痛点从"超售/OTA同步"调整为"空床卖不完/OTA佣金太高"。核心数据从"67%用Excel"调整为"空床=纯亏损，OTA=15-25%佣金"。

## REMOVED Requirements

### Requirement: 床位级渠道追踪
**Reason**: OTA渠道只能预订到房型/宿舍类型，不能预订到具体床位，追踪到床位无意义
**Migration**: 渠道追踪保留在预订/房型级别，不深入到床位级别
