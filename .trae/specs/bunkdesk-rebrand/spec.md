# BunkDesk 品牌重塑 + 产品定位精炼 Spec

## Why
Bunkly 当前定位模糊，与 BananaDesk 功能重叠且缺乏差异化。需要品牌重塑（Bunkly→BunkDesk）、重新定义PMF、精简MVP，建立清晰定位：帮青旅经营者发现空床机会的轻量管理工具。核心差异化不是替代OTA，而是帮经营者在OTA之外找到更多客人。

## What Changes
- 品牌重命名：Bunkly→BunkDesk，Logo Bk→BD，所有文案更新
- **BREAKING** Sidebar 合并：My Page + Revenue → Grow（获客增长）单一入口
- Dashboard 首屏增加空床机会提示卡片
- BedBoard 空床位增加"怎么填满？"行动入口
- RevenueBoost 措辞降级："智能定价"→"定价参考"，"收益优化"→"收益建议"
- SocialKit 精简：砍掉 Instagram Story 生成器，保留 WhatsApp
- 落地页重写：新品牌 + 新定位 + 新竞品对比
- 新建 GrowPanel.tsx 合并获客相关子模块

## Impact
- Affected specs: growth-bed-dual-core
- Affected code: Sidebar.tsx, LoginScreen.tsx, Dashboard.tsx, BedBoard.tsx, RevenueBoost.tsx, SocialKit.tsx, LandingPage.tsx, App.tsx, i18nContext.tsx, index.html, StaffContext.tsx
- New files: GrowPanel.tsx

---

## ADDED Requirements

### Requirement: Grow 获客增长面板
系统应提供 Grow 面板作为获客相关功能的统一入口，包含4个子标签。

#### Scenario: 进入Grow面板
- **WHEN** 经营者点击Sidebar的"Grow"标签
- **THEN** 系统展示Grow面板，包含4个子标签：Hostel Page / Social / Referral / Pricing

#### Scenario: 子标签切换
- **WHEN** 经营者点击不同子标签
- **THEN** 分别展示：HostelPage组件 / SocialKit组件(精简版) / ReferralPanel组件 / RevenueBoost组件(降级措辞版)

---

### Requirement: 空床机会提示
系统应在Dashboard首屏展示空床机会提示卡片。

#### Scenario: 有空床时
- **WHEN** 今日有空床位
- **THEN** Dashboard首屏显示提示卡片："今晚X张空床"，附带温和建议：创建促销、WhatsApp通知、调整定价

#### Scenario: 满房时
- **WHEN** 今日无空床位
- **THEN** 显示"今日满房"正面提示，不显示空床建议

---

### Requirement: 空床行动入口
系统应在BedBoard的空床位上提供行动入口。

#### Scenario: 点击空床行动按钮
- **WHEN** 经营者点击空床位的"怎么填满？"按钮
- **THEN** 弹出建议面板：降价建议、创建促销、WhatsApp分享

---

## MODIFIED Requirements

### Requirement: 品牌名称
所有出现 Bunkly 的地方改为 BunkDesk，Logo 从 Bk 改为 BD。包括但不限于：Sidebar、LoginScreen、LandingPage、index.html title。

### Requirement: Sidebar 导航
Sidebar 从 My Page / Revenue / Migrate 三个入口改为 Grow / Migrate 两个入口。Grow 包含 Hostel Page / Social / Referral / Pricing 子标签。Migrate 保持独立。角色权限：Manager 可见 Grow 和 Migrate，Reception 不可见 Grow 和 Migrate。

### Requirement: RevenueBoost 措辞
- "Revenue Boost" 标题改为 "Pricing Reference" / "定价参考"
- "Smart Pricing" 改为 "Pricing Tips" / "定价建议"
- "Revenue Optimization" 改为 "Revenue Suggestions" / "收益建议"
- 不使用 "AI" 或 "智能" 措辞
- OTA佣金统计在订单级别，不在床位级别

### Requirement: SocialKit 精简
砍掉 Instagram Story 生成器功能，只保留 WhatsApp 模板和空床促销自动生成。

### Requirement: 落地页
落地页品牌改为 BunkDesk，Slogan 改为"别让空床白白浪费"。竞品对比加入 BananaDesk 列。差异化叙事：不是替代OTA，是帮你在OTA之外找到更多客人。

## REMOVED Requirements

### Requirement: Instagram Story 生成器
**Reason**: Demo阶段无法真正发布到Instagram，且不是最实用的社交工具
**Migration**: 保留WhatsApp模板作为核心社交工具

### Requirement: My Page / Revenue 独立Sidebar入口
**Reason**: 功能分散，合并为Grow统一入口更清晰
**Migration**: 通过Grow面板的子标签访问

### Requirement: 每周营收报告
**Reason**: 过度承诺"赚钱"，与诚实定位不符
**Migration**: 保留简单的定价参考和OTA佣金概览
