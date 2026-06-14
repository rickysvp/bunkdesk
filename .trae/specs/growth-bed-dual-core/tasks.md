# Tasks

- [x] Task 1: 扩展数据类型和Context
  - [x] 1.1 types.ts 新增 GroupBooking、Referral、HostelPage、Promotion 等类型定义
  - [x] 1.2 GuestSource 扩展为包含 "direct" | "referral" | "group"
  - [x] 1.3 HostelContext 新增 groupBookings、referrals、hostelPage、promotions 状态和相关方法
  - [x] 1.4 data.ts 新增 demo 数据（团队预订、推荐记录、青旅主页配置）

- [x] Task 2: 青旅主页 (Hostel Page)
  - [x] 2.1 创建 HostelPage.tsx — 3套模板选择器（海滩风/城市风/自然风）
  - [x] 2.2 主页编辑器：青旅名称、描述、照片、房型列表、设施标签、联系方式
  - [x] 2.3 分享功能：生成链接 + 社交媒体分享按钮
  - [x] 2.4 主页预览：新窗口展示访客视角
  - [x] 2.5 i18n 所有新增文案

- [x] Task 3: 直订引擎 (Booking Engine)
  - [x] 3.1 创建 BookingEngine.tsx — 日期选择 → 房型/宿舍选择 → 人数选择
  - [x] 3.2 团队/多人预订流程：团队信息、统付/AA选择
  - [x] 3.3 推荐码输入框和优惠应用逻辑
  - [x] 3.4 预订确认页 + "分享给朋友"提示
  - [x] 3.5 i18n 所有新增文案

- [x] Task 4: 团队预订管理
  - [x] 4.1 创建 GroupBookingModal.tsx — 团队预订创建/编辑表单
  - [x] 4.2 床位自动分配算法：同宿舍优先相邻床位
  - [x] 4.3 团队成员独立check-in支持
  - [x] 4.4 团队付款：shared/split 模式切换
  - [x] 4.5 在 BedBoard 和 ReservationsView 中展示团队预订标识

- [x] Task 5: 推荐奖励 (Referral Program)
  - [x] 5.1 创建 ReferralPanel.tsx — 推荐码生成、统计展示
  - [x] 5.2 推荐码格式：BUNKLY-{NAME}-{CODE}
  - [x] 5.3 推荐转化数据展示：推荐人数、转化人数、节省佣金
  - [x] 5.4 i18n 所有新增文案

- [x] Task 6: 社交营销工具 (Social Kit)
  - [x] 6.1 创建 SocialKit.tsx — WhatsApp/Instagram 模板生成
  - [x] 6.2 WhatsApp 消息模板：青旅信息 + 直订链接
  - [x] 6.3 Instagram Story 模板：照片 + 预订链接
  - [x] 6.4 空床促销自动生成：检测空床率 > 50% 时生成 Last Minute 模板
  - [x] 6.5 i18n 所有新增文案

- [x] Task 7: 收益优化 (Revenue Boost)
  - [x] 7.1 创建 RevenueBoost.tsx — 空床预警、定价建议、促销模板
  - [x] 7.2 Dashboard 空床预警卡片集成
  - [x] 7.3 定价建议：基于demo数据生成旺季/淡季/周末/工作日建议
  - [x] 7.4 促销模板创建：Last Minute / Early Bird / Long Stay / Group Discount
  - [x] 7.5 i18n 所有新增文案

- [x] Task 8: 迁移中心 (Migration Hub)
  - [x] 8.1 创建 MigrationHub.tsx — CSV导入 + iCal迁移双通道
  - [x] 8.2 CSV解析器：自动识别来源（Cloudbeds/BananaDesk/Sirvoy），智能字段映射
  - [x] 8.3 iCal迁移增强：从其他PMS的iCal URL拉取未来预订
  - [x] 8.4 导入预览和确认流程
  - [x] 8.5 预置样本CSV下载
  - [x] 8.6 i18n 所有新增文案

- [x] Task 9: 性别宿舍智能分配
  - [x] 9.1 BedBoard 床位分配逻辑：女性客人优先分配女性宿舍
  - [x] 9.2 性别冲突预警：手动分配时检测性别不匹配并弹出警告

- [x] Task 10: Sidebar 导航和路由调整
  - [x] 10.1 Sidebar 新增 My Page、Revenue、Migrate 入口
  - [x] 10.2 角色权限：Reception 不可见 Revenue 和 Migrate
  - [x] 10.3 App.tsx 路由集成新模块

- [x] Task 11: 落地页重写
  - [x] 11.1 痛点叙事从"超售"转向"空床卖不完 + OTA佣金太高"
  - [x] 11.2 新增获客引擎功能展示：青旅主页、直订引擎、推荐奖励
  - [x] 11.3 竞品对比表更新：加入 BananaDesk 对比列
  - [x] 11.4 i18n 所有新增文案

# Task Dependencies
- Task 1 是所有后续任务的基础
- Task 3 依赖 Task 2（直订引擎嵌入青旅主页）
- Task 4 依赖 Task 1（需要 GroupBooking 类型）
- Task 5 依赖 Task 3（推荐码在预订流程中使用）
- Task 7 依赖 Task 1（需要 Promotion 类型和 demo 数据）
- Task 8 依赖 Task 1（需要字段映射到新数据结构）
- Task 9 依赖 Task 1（需要性别字段和宿舍类型）
- Task 10 依赖 Task 2, 7, 8（需要组件存在才能添加路由）
- Task 11 可与 Task 2-10 并行
