# Bunkly 落地页重设计 — 参考 BunkFlow 布局

## 概述
参考 BunkFlow 的设计布局和排版，重写 Bunkly 落地页。保持轻量级降维的竞争策略，但采用 BunkFlow 的视觉叙事手法。

## BunkFlow 布局分析（需借鉴的元素）

| BunkFlow 元素 | 当前 Bunkly | 改进方向 |
|---|---|---|
| **深色 Hero**（黑底+粉色强调） | 白底+zinc | 改为深色 Hero（zinc-900 底+emerald 强调色） |
| **数据化痛点**（67%/3hrs/₹2.4L/45+ 大数字+描述） | 纯文字痛点卡片 | 痛点改为大数字+标题+描述的三行布局 |
| **Before/After 双列对比**（✗/✓ 清单） | 无 | 新增 Before/After section |
| **床位级可视化对比**（6 床宿舍图） | 无 | 新增床位级对比可视化 |
| **Waitlist 社会证明**（50+ hostels, 头像） | 无 | 新增社会证明（demo 用户数） |
| **定价卡片** | 无 | 新增定价区域（Free/Pro 两档） |
| **功能详细展开**（标题+描述+图示） | 6 个小卡片 | 改为 2 个核心功能详细展开 + 4 个次要功能列表 |

## 页面结构（从上到下）

1. **Nav** — Logo + CTA 按钮（保持）
2. **Hero** — 深色背景，大标题+副标题+双CTA+产品截图
3. **社会证明** — "100+ hostels tried the demo" + 头像
4. **痛点区域** — 4 个数据化痛点（大数字+标题+描述）
5. **Before/After** — 双列对比（✗ 你的现在 / ✓ 用 Bunkly 后）
6. **核心功能** — 2 个详细展开（床位看板+快速入住）+ 4 个次要功能列表
7. **床位级对比可视化** — 6 床宿舍：传统 PMS vs Bunkly
8. **How It Works** — 3 步（保持）
9. **竞品对比表** — Bunkly vs Other PMS（保持）
10. **定价** — Free / Pro 两档
11. **CTA** — 深色背景行动号召（保持）
12. **Footer**（保持）

## 改动文件

| 文件 | 操作 |
|---|---|
| `src/components/LandingPage.tsx` | 重写 |
| `src/i18nContext.tsx` | 新增/修改 landing i18n key |

## 详细设计

### Hero（深色背景）
```
背景: bg-zinc-950
标题: 白色，"一键入住，一步到位" / "Check in a guest. In one tap."
强调色: emerald-400（CTA 按钮、关键词高亮）
副标题: zinc-400
Badge: emerald 边框 "BUILT FOR 20-50 BED HOSTELS"
CTA: emerald-500 填充按钮 + 透明边框按钮
截图: 保持现有 mockup 但适配深色
```

### 社会证明
```
"100+ hostels tried the demo" + 5 个随机头像圆圈
来源: Lisbon, Bali, Barcelona, Shanghai & more
```

### 数据化痛点（4 列网格）
```
67%          3hrs         ¥700+        0
仍在用Excel   每天手动更新   每月PMS费用    已上线可用的轻量PMS
```

### Before/After（双列）
```
左列（红色边框）：✗ 你的现在
- 8 个屏幕才能入住
- 手动更新 5 个 OTA
- 12 条 WhatsApp 逐条回复
- Excel 崩溃，数据丢了
- 酒店软件按房间卖，床位卖不了
- 每天行政 6+ 小时

右列（绿色边框）：✓ 用 Bunkly 后
- 1 次点击完成入住
- iCal 一键导入所有渠道
- 自动记录交接班
- 云端数据，永不丢失
- 床位级库存，想卖哪张卖哪张
- 每天行政 30 分钟
```

### 核心功能详细展开
**功能 1：床位级库存**
- 标题 + 描述 + 床位可视化图（6 床宿舍，每床独立状态）

**功能 2：60 秒入住**
- 标题 + 描述 + 流程步骤图

**4 个次要功能**（列表形式）：
- 交接班日志 / 日历与 iCal / 任务看板 / 活动管理

### 床位级对比可视化
```
传统 PMS:  6 床宿舍显示 "Room Full"（无法单独卖 Bed #4）
Bunkly:    6 床宿舍，Bed #4 显示 "Available"（每张床独立追踪）
```

### 定价
```
Free 档: 0/月，≤30 床，2 OTA，基础功能
Pro 档: ¥99/月，无限床位，全部 OTA，高级分析，优先支持
```

## 实施步骤

1. 重写 i18nContext.tsx 的 landing section（EN + ZH）
2. 重写 LandingPage.tsx 组件
3. TypeScript 检查 + 构建验证
