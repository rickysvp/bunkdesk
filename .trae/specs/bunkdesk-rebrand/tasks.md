# Tasks

- [x] Task 1: 品牌重命名 Bunkly→BunkDesk
  - [x] 1.1 index.html title 改为 BunkDesk
  - [x] 1.2 LoginScreen.tsx: Bunkly→BunkDesk, Bk→BD
  - [x] 1.3 Sidebar.tsx: Bunkly→BunkDesk, Bk→BD
  - [x] 1.4 i18nContext.tsx: 所有 "Bunkly" 文案改为 "BunkDesk"

- [x] Task 2: 创建 GrowPanel.tsx 合并面板
  - [x] 2.1 创建 GrowPanel.tsx，包含4个子标签：Hostel Page / Social / Referral / Pricing
  - [x] 2.2 子标签切换逻辑，分别渲染 HostelPage / SocialKit / ReferralPanel / RevenueBoost
  - [x] 2.3 i18n 所有新增文案

- [x] Task 3: Sidebar 导航调整
  - [x] 3.1 删除 My Page、Revenue 独立入口，改为 Grow 入口
  - [x] 3.2 保留 Migrate 独立入口
  - [x] 3.3 StaffContext 角色权限：Reception 不可见 Grow 和 Migrate
  - [x] 3.4 App.tsx 路由：grow→GrowPanel，删除 hostel-page 和 revenue 路由

- [x] Task 4: Dashboard 空床机会提示
  - [x] 4.1 计算今日空床数（从 rooms 数据计算）
  - [x] 4.2 首屏增加空床提示卡片："今晚X张空床"
  - [x] 4.3 附带温和建议：创建促销、WhatsApp通知、调整定价
  - [x] 4.4 满房时显示正面提示
  - [x] 4.5 i18n 所有新增文案

- [x] Task 5: BedBoard 空床行动入口
  - [x] 5.1 空床位增加"怎么填满？"按钮
  - [x] 5.2 点击弹出建议面板：降价建议、创建促销、WhatsApp分享
  - [x] 5.3 i18n 所有新增文案

- [x] Task 6: RevenueBoost 措辞降级
  - [x] 6.1 "Revenue Boost"→"Pricing Reference"/"定价参考"
  - [x] 6.2 "Smart Pricing"→"Pricing Tips"/"定价建议"
  - [x] 6.3 移除所有 "AI"/"智能" 措辞
  - [x] 6.4 i18n 更新

- [x] Task 7: SocialKit 精简
  - [x] 7.1 删除 Instagram Story 生成器相关代码和UI
  - [x] 7.2 保留 WhatsApp 模板和空床促销自动生成
  - [x] 7.3 i18n 清理无用key

- [x] Task 8: 落地页重写
  - [x] 8.1 品牌改为 BunkDesk，Slogan "别让空床白白浪费"
  - [x] 8.2 差异化叙事：不是替代OTA，是帮你在OTA之外找到更多客人
  - [x] 8.3 竞品对比加入 BananaDesk 列
  - [x] 8.4 i18n 更新

# Task Dependencies
- Task 2 依赖 Task 1（品牌名需要先更新）
- Task 3 依赖 Task 2（需要 GrowPanel 组件存在）
- Task 4-8 可并行
