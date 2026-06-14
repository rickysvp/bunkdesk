# 待入住详情优化 + iCal 导入方案

## 概述

1. 概览待入住名单卡片信息不完整不专业，需补充来源、金额、偏好等关键字段
2. 办理入住时需增加备注和房间偏好编辑入口
3. 实现 iCal URL 导入功能（纯前端解析）
4. Guest 类型已有 `source` 和 `roomPreference` 字段（types.ts 已完成）

## 当前状态分析

### 已完成
- `types.ts`: `GuestSource` 类型和 `source`/`roomPreference` 字段已添加到 Guest 接口

### 待解决问题
- **Dashboard 待入住列表**：每条只显示 `genderIcon + name + countryCode` 和 `countryCode · nights · checkInDate`，信息极度简陋
- **Guest Detail Modal**：缺少来源标签、房间偏好、DOB、金额明细（totalAmount/paidAmount）
- **CheckInPanel**：选中已有客人后无法编辑备注和房间偏好；无 iCal 导入入口
- **data.ts**：ARRIVALS 客人缺少 `source` 字段，TypeScript 会报错
- **HostelContext**：缺少 `importArrivals` 批量导入方法
- **i18n**：缺少来源渠道、iCal 导入、房间偏好等相关翻译 key

## 改动计划

### 1. 初始数据更新 — `src/data.ts`

给 ARRIVALS 中的客人添加 `source` 字段：
- Lucas Silva → `walk-in`
- Nina Jensen → `booking`

同时给 INITIAL_ROOMS 中的已入住客人也添加 `source` 字段（避免 TS 报错）：
- Alex Johnson → `walk-in`
- Maria Garcia → `booking`
- Yuki Tanaka → `airbnb`
- Emma Smith → `walk-in`
- Sophie Martin → `booking`
- Clara Weber → `expedia`
- David & Lisa → `booking`
- 预留客人也添加对应 source

### 2. 待入住列表优化 — `src/components/Dashboard.tsx`

**列表卡片改为更丰富的两行布局：**
```
♂ Lucas Silva                    [散客]
🇧🇷 Brazil · 5晚 · 6/12-17  💰未付  📝下铺优先
```

具体改动：
- 第一行：性别图标 + 姓名 + 来源标签（颜色区分）
- 第二行：国籍 · 晚数 · 日期范围 + 付款状态 + 备注摘要
- 来源标签颜色：walk-in=zinc, booking=blue, airbnb=pink(#FF5A5F), expedia=orange, ical=purple, manual=zinc

**Guest Detail Modal 增加字段：**
- 来源标签（带颜色 badge）
- 房间偏好（如有）
- DOB（如有）
- 金额明细：totalAmount / paidAmount / dueAmount
- 支付状态改为更直观的金额展示

### 3. 办理入住增加备注+偏好 — `src/components/CheckInPanel.tsx`

在选中客人后的 Bed Assignment 卡片上方，增加：
- **备注输入框**：可编辑的 textarea，绑定到 `selectedGuest.notes`
- **房间偏好输入框**：可编辑的 input，绑定到 `selectedGuest.roomPreference`
- 需要在 HostelContext 中添加 `updateArrival` 方法来更新这些字段
- 在 CheckInPanel 顶部添加 "从 iCal 导入" 按钮

### 4. 新建 iCal 导入功能

#### 4a. iCal 解析工具 — `src/utils/icalParser.ts`

纯前端 .ics 解析器：
```typescript
interface ParsedEvent {
  uid: string;
  summary: string;     // 客人名
  dtStart: string;     // 入住日期
  dtEnd: string;       // 退房日期
  description?: string; // 备注
  location?: string;    // 房间偏好
}

export function parseICal(text: string): ParsedEvent[]
export function mapEventToGuest(event: ParsedEvent): Omit<Guest, 'id'>
```

解析逻辑：
- 正则提取 VEVENT 块
- 解析 SUMMARY / DTSTART / DTEND / DESCRIPTION / UID
- DTSTART/DTEND 支持 `YYYYMMDD` 和 `YYYYMMDDTHHMMSSZ` 格式
- mapEventToGuest 将事件映射为 Guest 对象，source 设为 "ical"

#### 4b. iCal 导入弹窗 — `src/components/ICalImport.tsx`

UI 流程：
1. 输入 iCal URL
2. 点击"获取"按钮
3. 通过 allorigins.win CORS 代理获取 .ics 内容
4. 解析后显示预览列表（客人名 + 日期 + 晚数）
5. 勾选要导入的客人
6. 点击"确认导入"批量添加到 arrivals

弹窗样式：复用现有 modal 模式（AnimatePresence + motion.div）

### 5. HostelContext 更新 — `src/HostelContext.tsx`

- 添加 `updateArrival(guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount'>>)` 方法
- 添加 `importArrivals(guests: Omit<Guest, 'id'>[])` 批量导入方法
- 更新 HostelState 接口和 useMemo value

### 6. i18n 更新 — `src/i18nContext.tsx`

新增 key（en + zh）：

```typescript
// dashboard section
dashboard.source: "Source" / "来源"
dashboard.roomPreference: "Room Pref" / "房间偏好"
dashboard.walkIn: "Walk-in" / "散客"
dashboard.booking: "Booking" / "Booking"
dashboard.airbnb: "Airbnb" / "Airbnb"
dashboard.expedia: "Expedia" / "Expedia"
dashboard.ical: "iCal" / "iCal"
dashboard.manual: "Manual" / "手动"
dashboard.amountDue: "Due" / "待付"

// checkin section
checkin.importICal: "Import iCal" / "导入 iCal"
checkin.icalUrl: "iCal URL" / "iCal 链接"
checkin.fetch: "Fetch" / "获取"
checkin.previewImport: "Preview" / "预览导入"
checkin.confirmImport: "Confirm Import" / "确认导入"
checkin.importSuccess: "Imported {n} guests" / "成功导入 {n} 位客人"
checkin.roomPreference: "Room Preference" / "房间偏好"
checkin.addNote: "Add Note" / "添加备注"
checkin.selectToImport: "Select guests to import" / "选择要导入的客人"
checkin.fetching: "Fetching..." / "获取中..."
checkin.parseError: "Failed to parse iCal data" / "iCal 数据解析失败"
checkin.fetchError: "Failed to fetch iCal URL" / "获取 iCal 链接失败"
checkin.noEventsFound: "No events found" / "未找到事件"
```

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/data.ts` | 修改 | ARRIVALS + INITIAL_ROOMS 客人添加 source 字段 |
| `src/components/Dashboard.tsx` | 修改 | 待入住列表丰富 + 弹窗增加来源/偏好/DOB/金额 |
| `src/components/CheckInPanel.tsx` | 修改 | 增加备注+偏好编辑 + iCal 导入入口 |
| `src/utils/icalParser.ts` | 新建 | iCal 解析工具 |
| `src/components/ICalImport.tsx` | 新建 | iCal 导入弹窗组件 |
| `src/HostelContext.tsx` | 修改 | 添加 updateArrival + importArrivals |
| `src/i18nContext.tsx` | 修改 | 新增 i18n key |

## 实施顺序

1. data.ts — 添加 source 字段（解决 TS 报错）
2. i18nContext.tsx — 新增所有 i18n key
3. HostelContext.tsx — 添加 updateArrival + importArrivals
4. icalParser.ts — 创建 iCal 解析工具
5. ICalImport.tsx — 创建导入弹窗
6. Dashboard.tsx — 待入住列表 + 弹窗优化
7. CheckInPanel.tsx — 备注编辑 + iCal 入口
8. TypeScript 检查 + 验证

## 验证步骤

1. 待入住列表每条显示来源标签、付款状态、备注摘要
2. 弹窗卡片显示完整信息：来源、DOB、金额明细、房间偏好
3. 办理入住可编辑备注和房间偏好
4. iCal 导入：输入 URL → 获取 → 预览 → 勾选 → 确认导入
5. 导入的客人 source 标记为 "ical"
6. TypeScript 0 错误
