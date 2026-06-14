# BunkDesk Demo 闭环修复 Spec

## Why
审查发现 Demo 核心叙事"发现空床→采取行动→看到结果"存在闭环断裂：BookingEngine 预订后不分配床位、促销创建后不生效、推荐码格式不一致。这些断点让 Demo 演示时无法展示完整的价值链。

## What Changes
- BookingEngine 预订确认后自动分配空床位
- BookingEngine 预订时应用活跃促销折扣
- Dashboard "创建促销"建议跳转到 Grow→Pricing 并自动展开促销表单
- HostelPage 预览封面图叠加浮动 Book Now 按钮
- GrowPanel 子标签切换添加过渡动画
- ReferralPanel 推荐码生成后自动复制到剪贴板

## Impact
- Affected code: BookingEngine.tsx, GrowPanel.tsx, RevenueBoost.tsx, Dashboard.tsx, HostelPage.tsx, ReferralPanel.tsx, App.tsx

---

## ADDED Requirements

### Requirement: BookingEngine 预订后自动分配床位
BookingEngine 确认预订后 SHALL 自动将客人分配到选定房间的空床位。

#### Scenario: 单人预订自动分配
- **WHEN** 访客完成1人预订并选择了一个房间
- **THEN** 系统在对应房间找到第一个空床位，将客人分配到该床位，状态变为 occupied

#### Scenario: 多人预订自动分配
- **WHEN** 访客完成多人预订
- **THEN** 系统在选定房间分配对应数量的相邻空床位

---

### Requirement: BookingEngine 应用活跃促销
BookingEngine 在预订确认页 SHALL 自动应用匹配的活跃促销折扣。

#### Scenario: 有活跃促销时自动折扣
- **WHEN** 访客预订时存在匹配的活跃促销（同房型、日期范围内）
- **THEN** 预订确认页显示促销折扣金额，总价相应减少

---

### Requirement: Dashboard "创建促销"跳转自动展开表单
Dashboard 空床建议中的"创建促销"点击后 SHALL 跳转到 Grow→Pricing 并自动展开促销创建表单。

#### Scenario: 点击创建促销建议
- **WHEN** 经营者点击 Dashboard 空床提示中的"创建促销"
- **THEN** 导航到 Grow→Pricing 子标签，且促销创建表单自动展开

---

### Requirement: HostelPage 浮动 Book Now 按钮
HostelPage 预览面板的封面图上 SHALL 叠加一个浮动的 Book Now 按钮。

#### Scenario: 封面图上的 Book Now
- **WHEN** 预览面板显示封面图
- **THEN** 封面图右下角有一个半透明的 Book Now 浮动按钮

---

### Requirement: GrowPanel 子标签切换动画
GrowPanel 子标签切换时 SHALL 有淡入淡出过渡动画。

#### Scenario: 切换子标签
- **WHEN** 经营者点击不同子标签
- **THEN** 内容区域有平滑的淡入淡出过渡

---

### Requirement: ReferralPanel 推荐码生成后自动复制
ReferralPanel 生成推荐码后 SHALL 自动复制到剪贴板并显示提示。

#### Scenario: 生成推荐码
- **WHEN** 经营者点击"生成推荐码"按钮
- **THEN** 推荐码自动复制到剪贴板，显示"已复制！"提示

## MODIFIED Requirements

（无修改项）

## REMOVED Requirements

（无移除项）
