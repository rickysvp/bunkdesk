# BunkDesk 品牌重塑 + PMF + MVP 设计

## Why
Bunkly 当前定位模糊，与 BananaDesk 功能重叠且缺乏差异化。需要通过品牌重塑（Bunkly→BunkDesk）、重新定义PMF、精简MVP来建立清晰的产品定位：帮青旅经营者发现空床机会的轻量管理工具。

## 品牌重塑

| | 旧 (Bunkly) | 新 (BunkDesk) |
|---|---|---|
| 名称 | Bunkly | BunkDesk |
| Logo | Bk | BD |
| Slogan | 每张床都在赚钱 | 别让空床白白浪费 |
| 定位 | 床位营收最大化器 | 帮青旅经营者发现空床机会的轻量管理工具 |
| 核心问题 | "你的每张床都在赚钱吗？" | "空床怎么办？" |

## PMF 定义

**目标用户**：20-50床的独立青旅经营者，目前用Excel/纸笔管理，在OTA上有房源但缺少工具减少空置

**核心场景**：
1. 每天早上打开BunkDesk，看到今天有几张空床
2. 获得简单建议：降价、促销、社交分享
3. 一键行动：创建促销、发WhatsApp、分享直订链接
4. 管理日常运营：入住、退房、床位分配

**留存理由**：免费 + 比Excel好用 + 空床时有人给建议
**推荐理由**：帮朋友也从OTA佣金中解脱出来

## MVP 重新定义

### 砍掉（过度承诺/非核心）
- 每周营收报告（过度承诺"赚钱"）
- 床位级收益显示（OTA不能预订到床位，无意义）
- AI/智能定价（没有AI能力）
- Instagram Story 生成器（Demo阶段无法真正发布）

### 保留（核心价值）
- 极简床位管理（BedBoard，基础能力）
- 空床机会提示（Dashboard首屏，核心差异化）
- 定价参考（简单规则，不叫AI）
- 直订引擎 + 青旅主页（0佣金，减少OTA依赖的路径）
- 推荐奖励（口碑获客）
- WhatsApp促销模板（最实用的社交工具）
- Last Minute促销创建（填空床的具体行动）
- iCal同步（和OTA共存）
- CSV/iCal迁移（降低切换门槛）
- 性别宿舍智能分配
- 团队预订

### 合并（简化信息架构）
- My Page + Social Kit + Referral + Revenue Boost → Grow（获客增长）一个入口

## 具体产品行为变化

### 1. 品牌重命名 Bunkly→BunkDesk
- 所有出现 Bunkly 的地方改为 BunkDesk
- Logo 从 Bk 改为 BD
- index.html title 改为 BunkDesk

### 2. Dashboard 空床机会提示
- 首屏增加空床提示卡片："今晚X张空床"
- 提供温和建议（不是命令）：
  - 创建Last Minute促销
  - 用WhatsApp通知附近旅客
  - 调整定价看看效果
- 不承诺结果，语气是"你可以试试"

### 3. Sidebar 合并为 Grow 入口
- 删除 My Page、Revenue、Migrate 三个独立入口
- 新增 Grow 入口，包含子标签：Hostel Page / Social / Referral / Pricing
- Migrate 保留为独立入口（迁移是一次性操作，不是增长工具）

### 4. BedBoard 空床行动入口
- 空床位增加"怎么填满？"按钮
- 点击弹出建议面板（降价/促销/分享）
- 不显示来源、佣金、收益（OTA不能预订到具体床位）

### 5. Revenue Boost → 定价参考（降级措辞）
- "智能定价"→"定价参考"
- "收益优化"→"收益建议"
- 基于简单规则，不叫AI
- OTA佣金统计在订单级别，不在床位级别

### 6. Social Kit 精简
- 砍掉 Instagram Story 生成器
- 保留 WhatsApp 模板（最实用）
- 保留空床促销自动生成

### 7. 落地页重写
- 品牌：BunkDesk，Slogan "别让空床白白浪费"
- 痛点：空床卖不完 + OTA佣金高
- 差异化：不是替代OTA，是帮你在OTA之外找到更多客人
- 竞品对比：BananaDesk管OTA订单，BunkDesk帮你减少对OTA的依赖

## 信息架构

```
BunkDesk Sidebar:
  Dashboard (今日概览) ← 首屏有空床提示
  BedBoard (床位看板) ← 空床有行动入口
  Check-In (前台入住)
  Calendar (日历视图)
  Reservations (预订管理)
  ─────────────
  Grow (获客增长) ← 合并：主页+WhatsApp+推荐+定价参考+促销
  Migrate (数据迁移)
  ─────────────
  Tasks / Shift Log / Activities / Staff
```

## 影响范围

### 需修改的文件
- src/components/Sidebar.tsx — 品牌重命名 + 合并Grow入口
- src/components/LoginScreen.tsx — Bunkly→BunkDesk, Bk→BD
- src/components/Dashboard.tsx — 空床机会提示卡片
- src/components/BedBoard.tsx — 空床行动入口
- src/components/RevenueBoost.tsx — 降级措辞
- src/components/SocialKit.tsx — 砍掉Instagram
- src/components/LandingPage.tsx — 品牌重命名 + 新定位
- src/App.tsx — 路由调整（Grow合并）
- src/i18nContext.tsx — 所有文案更新
- index.html — title改为BunkDesk

### 需新建的文件
- src/components/GrowPanel.tsx — Grow合并面板（含子标签）

### 不变的文件
- types.ts, HostelContext.tsx, data.ts — 数据结构不变
- GroupBookingModal.tsx, ReferralPanel.tsx, MigrationHub.tsx — 功能不变
- BookingEngine.tsx, HostelPage.tsx — 功能不变，被GrowPanel引用
