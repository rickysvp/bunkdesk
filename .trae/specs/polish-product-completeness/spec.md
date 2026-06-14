# BunkDesk 产品完善与打磨 Spec

## Why
BunkDesk 品牌重塑和核心功能已就位，但存在三类影响 Demo 演示质量的问题：(1) i18n 键缺失导致空床提示和行动入口显示键名而非文案；(2) 品牌残留（Bunkly 链接/推荐码前缀未更新）；(3) 核心功能间缺少联动——空床建议只是文字，不能跳转到 Grow 面板对应功能。这些断点让 Demo 的核心叙事"发现空床机会→采取行动"无法连贯演示。

## What Changes
- 修复 i18n 缺失：补全 EN/ZH 的 `dashboard.emptyBeds*`、`bedboard.howToFill*`、`grow.*` 键
- 清理品牌残留：SocialKit 链接 `bunkly.app` → `bunkdesk.app`，ReferralPanel 推荐码前缀 `BUNKLY-` → `BUNKDESK-`
- 清理废弃 i18n 键：删除 Instagram Story 相关键（EN/ZH）
- 空床建议可行动化：Dashboard 空床建议和 BedBoard "怎么填满" 弹出菜单增加跳转到 Grow 对应子面板的链接
- HostelPage "Book Now" 按钮嵌入 BookingEngine：让青旅主页的预订按钮打开直订流程
- Landing Page "Watch Demo" 按钮增加滚动到 Showcase 区域的行为

## Impact
- Affected specs: bunkdesk-rebrand（i18n 完整性是最后一个未通过项）
- Affected code: i18nContext.tsx, Dashboard.tsx, BedBoard.tsx, SocialKit.tsx, ReferralPanel.tsx, HostelPage.tsx, LandingPage.tsx

---

## ADDED Requirements

### Requirement: 空床建议可行动化
Dashboard 空床提示卡片和 BedBoard 空床弹出菜单中的建议 SHALL 提供跳转到 Grow 面板对应子功能的链接。

#### Scenario: Dashboard 空床建议跳转
- **WHEN** 经营者点击 Dashboard 空床提示中的"创建促销"建议
- **THEN** 导航到 Grow 面板的 Pricing 子标签

#### Scenario: Dashboard WhatsApp 建议跳转
- **WHEN** 经营者点击 Dashboard 空床提示中的"WhatsApp 通知"建议
- **THEN** 导航到 Grow 面板的 Social 子标签

#### Scenario: Dashboard 定价建议跳转
- **WHEN** 经营者点击 Dashboard 空床提示中的"调整定价"建议
- **THEN** 导航到 Grow 面板的 Pricing 子标签

#### Scenario: BedBoard 空床弹出菜单跳转
- **WHEN** 经营者点击 BedBoard 空床弹出菜单中的建议项
- **THEN** 导航到 Grow 面板对应子标签（降价→Pricing，促销→Pricing，分享→Social）

---

### Requirement: HostelPage 预订按钮联动
HostelPage 的 "Book Now" 按钮 SHALL 打开 BookingEngine 直订流程，而非仅显示占位提示。

#### Scenario: 点击 Book Now 打开预订
- **WHEN** 访客在 HostelPage 预览中点击 "Book Now"
- **THEN** 在 HostelPage 内展示 BookingEngine 组件的预订流程

---

### Requirement: Landing Page Watch Demo 可交互
Landing Page 的 "Watch Demo" 按钮 SHALL 滚动到功能展示区域，而非无响应。

#### Scenario: 点击 Watch Demo
- **WHEN** 访客点击 "Watch Demo" 按钮
- **THEN** 页面平滑滚动到 Showcase 功能展示区域

---

## MODIFIED Requirements

### Requirement: i18n 完整性
i18nContext.tsx SHALL 补全以下缺失键：
- EN `dashboard.emptyBedsTitle`（含 `{n}` 占位符）、`emptyBedsDesc`、`suggestPromo`、`suggestWhatsApp`、`suggestPricing`、`fullHouseTitle`、`fullHouseDesc`
- EN `bedboard.howToFill`、`suggestLowerPrice`、`suggestPromo`、`suggestShare`
- ZH `grow.hostelPage`、`grow.social`、`grow.referral`、`grow.pricing`
- ZH `dashboard.emptyBedsTitle`（含 `{n}` 占位符）、`emptyBedsDesc`、`suggestPromo`、`suggestWhatsApp`、`suggestPricing`、`fullHouseTitle`、`fullHouseDesc`
- ZH `bedboard.howToFill`、`suggestLowerPrice`、`suggestPromo`、`suggestShare`

### Requirement: 品牌一致性
所有用户可见的品牌引用 SHALL 使用 BunkDesk：
- SocialKit 中 `bunkly.app` 链接改为 `bunkdesk.app`
- ReferralPanel 推荐码前缀从 `BUNKLY-` 改为 `BUNKDESK-`

### Requirement: 废弃 i18n 键清理
i18nContext.tsx SHALL 删除以下不再使用的键（EN 和 ZH）：
- `socialKit.instagramTitle` 及所有 `socialKit.story*` / `socialKit.download` / `socialKit.saved` 相关键

## REMOVED Requirements

（无移除项）
