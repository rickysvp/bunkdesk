# Tasks

- [x] Task 1: 修复 i18n 缺失键
  - [x] 1.1 EN `dashboard` 块补全：emptyBedsTitle、emptyBedsDesc、suggestPromo、suggestWhatsApp、suggestPricing、fullHouseTitle、fullHouseDesc
  - [x] 1.2 EN `bedboard` 块补全：howToFill、suggestLowerPrice、suggestPromo、suggestShare
  - [x] 1.3 ZH 新增 `grow` 块：hostelPage、social、referral、pricing
  - [x] 1.4 ZH `dashboard` 块补全：emptyBedsTitle、emptyBedsDesc、suggestPromo、suggestWhatsApp、suggestPricing、fullHouseTitle、fullHouseDesc
  - [x] 1.5 ZH `bedboard` 块补全：howToFill、suggestLowerPrice、suggestPromo、suggestShare

- [x] Task 2: 清理废弃 i18n 键和品牌残留
  - [x] 2.1 删除 EN/ZH `socialKit.instagramTitle` 及所有 `socialKit.story*` / `socialKit.download` / `socialKit.saved` 相关键
  - [x] 2.2 SocialKit.tsx 中 `bunkly.app` → `bunkdesk.app`
  - [x] 2.3 ReferralPanel.tsx 推荐码前缀 `BUNKLY-` → `BUNKDESK-`

- [x] Task 3: Dashboard 空床建议可行动化
  - [x] 3.1 Dashboard 接收 `navigateToGrow` prop，通过 App.tsx 传递 Grow 子标签导航
  - [x] 3.2 空床提示卡片的3条建议改为可点击链接，点击后导航到 Grow 面板对应子标签
  - [x] 3.3 满房提示卡片保持纯展示（无需跳转）

- [x] Task 4: BedBoard 空床弹出菜单可行动化
  - [x] 4.1 BedBoard 接收 `navigateToGrow` prop，弹出菜单建议项点击后导航到 Grow 对应子标签
  - [x] 4.2 降价→Pricing，促销→Pricing，分享→Social

- [x] Task 5: HostelPage Book Now 联动 BookingEngine
  - [x] 5.1 HostelPage 新增 `showBooking` 状态控制是否显示 BookingEngine
  - [x] 5.2 "Book Now" 按钮点击后切换显示 BookingEngine 组件
  - [x] 5.3 BookingEngine 在可滚动容器中展示，带返回按钮回到主页编辑视图

- [x] Task 6: Landing Page Watch Demo 滚动到 Showcase
  - [x] 6.1 给 Showcase 区域添加 `id="showcase"`
  - [x] 6.2 "Watch Demo" 按钮点击时平滑滚动到 Showcase 区域

# Task Dependencies
- Task 1 是所有后续任务的基础（i18n 键缺失会导致组件显示键名）
- Task 3 和 Task 4 可并行，但都需要 Task 1 完成
- Task 5 和 Task 6 独立，可与 Task 3/4 并行
- Task 2 独立，可与其他任务并行
