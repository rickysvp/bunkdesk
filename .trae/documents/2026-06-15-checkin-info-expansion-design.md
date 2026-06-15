# BunkDesk v1.6.0 — 待办理入住信息扩展设计

> **日期**: 2026-06-15
> **作者**: BunkDesk Team
> **状态**: Approved (待用户复审)
> **作用域**: `CheckInPanel` 模块的 Walk-in 表单 + 详情卡 + 列表项
> **版本基线**: v1.4.0（v1.5.0 已回退，保留为设计参考）

---

## 1. 背景与目标

### 1.1 当前问题

v1.4.0 的「待办理入住」模块字段过少（Walk-in 表单仅 8 个字段，详情卡 4 张），与酒店业标准（参考 SiteMinder 类 PMS）相比信息密度不足，操作员需要多次切换面板才能完成一次完整登记。

### 1.2 目标

- **更完善**：扩展到 ~13 个字段，覆盖核心联系信息 + 证件 + 抵店时间
- **更细致**：必填分级，不阻断旧数据
- **更利于操作**：表单分 3 段、详情卡双栏，操作员一次看到关键信息

### 1.3 非目标

- **不增加客户地址信息**（用户明确排除）
- **不实现支付处理**（仅"标记已付"状态切换）
- **不引入 AI / 智能算法**（仅规则化的姓名拆分）
- **不改动床位图、报表、设置模块**

---

## 2. 范围与必填策略

### 2.1 字段清单

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `firstName` | ✅ | string | 拆分后的名 |
| `lastName` | ✅ | string | 拆分后的姓 |
| `country` / `countryCode` | ✅ | string | ISO 3166-1 alpha-3（如 USA / CHN / DEU） |
| `phone` | ✅ | string | 国际格式 E.164（带 +） |
| `email` | ✅ | string | 标准邮箱校验 |
| `checkInDate` / `checkOutDate` | ✅ | string | ISO 日期 |
| `idType` | ✅ | enum | `passport` / `idCard` / `driverLicense` |
| `idNumber`（= `passportOrId`） | ✅ | string | 证件号 |
| `policeConsent` | ✅ | boolean | 警方登记同意 |
| `gender` | ❌ | enum | `male` / `female` / `other` |
| `dob` | ❌ | string | ISO 日期 |
| `arrivalTime` | ❌ | enum | `morning` / `afternoon` / `evening` / `late` |
| `referral` | ❌ | string | 自由文本 + 智能提示（Hostelworld、Booking.com、Google、朋友、其它） |
| `notes` | ❌ | string | 自由文本 |

### 2.2 不包含字段（明确排除）

- 地址（Line 1 / Line 2 / City / State / Postcode / Country）— 用户明确不要
- Organization
- Adults / Children / Infants 人数
- Payment Card 详情（卡号末四位、过期日等）— 仍是状态切换，不涉及支付
- Booking Summary（折扣、税费、Total）— 不在 v1.6 范围

---

## 3. 数据模型变更（src/types.ts）

### 3.1 Guest 接口扩展

```ts
// 新增字段（全部 Optional，向后兼容）
export type IdDocumentType = "passport" | "idCard" | "driverLicense";
export type ArrivalSlot = "morning" | "afternoon" | "evening" | "late";

export interface Guest {
  id: string;
  name: string;                              // 全名（保留，兼容旧数据）
  firstName?: string;                        // 新增：拆分后的名
  lastName?: string;                         // 新增：拆分后的姓
  country: string;
  countryCode: string;
  gender?: "male" | "female" | "other";
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  paymentStatus: "paid" | "unpaid" | "partial";
  totalAmount?: number;
  paidAmount?: number;
  phone?: string;
  email?: string;
  notes?: string;
  passportScanned: boolean;
  passportOrId?: string;                     // = idNumber
  idType?: IdDocumentType;                   // 新增
  dob?: string;
  policeConsent?: boolean;
  arrivalTime?: ArrivalSlot;                 // 新增
  referral?: string;                         // 新增
  source: GuestSource;
  roomPreference?: string;
}
```

### 3.2 向后兼容策略

- **name 字段保留**：旧数据继续用 name，新数据由 firstName + lastName 拼接生成 name
- **所有新字段 Optional**：旧 localStorage 数据无需清空
- **优先级**：读取时 firstName + lastName > name（拼接）

---

## 4. UI 变更（src/components/CheckInPanel.tsx）

### 4.1 Walk-in 表单（方案 A · 线性增长）

保持现有 2 段结构扩展为 3 段：

```
┌─ PERSONAL INFO ──────────────┐
│ First name *  Last name *    │
│ Country *     Phone *        │
│ Email *       Gender         │
│ DOB                           │
└───────────────────────────────┘
┌─ STAY ────────────────────────┐
│ Check-in *  Check-out *  Arrival time │
└───────────────────────────────┘
┌─ ID & SOURCE ─────────────────┐
│ ID Type *  ID Number *       │
│ Referral                     │
│ Notes                        │
└───────────────────────────────┘
⚠ Police registration consent *
                       [Create Arrival]
```

**必填校验**：表单内联 `required` 标记，提交时阻止并滚动到第一个未填字段。

### 4.2 详情卡（方案 C · 左右双栏）

```
┌────────────── 60% ─────────────┬────────── 40% ──────────┐
│  John Smith                    │  ✓ VERIFICATION          │
│  🇺🇸 USA · 3N · 6/15→6/18     │     Passport scanned     │
│  ⚠ Payment Due $255            │                          │
│  ─────────────────             │  PAYMENT                 │
│  CONTACT                       │     ⚠ Unpaid $255        │
│  📧 john@mail.com              │     [Collect $255]       │
│  📞 +1-555-0100                │                          │
│  🕒 Arriving ~3pm              │  NOTES                   │
│  🔗 Booking.com                │     Prefers bottom bunk  │
│  ID                            │                          │
│  🛂 Passport · P1234567        │  BED ASSIGNMENT          │
│  🎂 1990-05-12                 │     [⚡ Auto-Assign]     │
│  👥 Male                       │     ┌──★ Best─┐ ┌Female┐│
│                  [✎ Edit Info] │     └─────────┘ └──────┘│
│                                │                          │
│                                │  [✓ Complete Check-in]   │
└────────────────────────────────┴──────────────────────────┘
```

- **左栏（信息卡）**：只读展示 + 顶部「✎ Edit Info」按钮（点击弹窗/展开行内编辑）
- **右栏（操作堆栈）**：Verification / Payment / Notes / Bed Assignment / Complete，按操作频率自上而下
- **空字段占位**：未填写时显示"未填写"+ 虚线边框，提示操作员补全

### 4.3 列表项（保持简洁）

不变：

```
John Smith ›
US · 3N
```

详情看右栏，不增加列表密度。

### 4.4 Edit Info 弹窗

点击「✎ Edit Info」后弹出 Modal，列出可编辑字段：

- First / Last name
- Phone / Email
- Arrival time
- ID Type / ID Number
- DOB / Gender
- Referral / Notes

提交后调用 `updateArrival`，UI 立即反映。

---

## 5. 迁移（src/utils/guestMigration.ts）

### 5.1 启动时调用

```ts
// HostelContext 初始化时
useEffect(() => {
  const state = loadState();
  if (state.version < '1.6.0') {
    state.arrivals = state.arrivals.map(migrateGuest);
    state.rooms = state.rooms.map(r => ({
      ...r,
      beds: r.beds.map(b => b.guest ? { ...b, guest: migrateGuest(b.guest) } : b),
    }));
    state.version = '1.6.0';
    saveState(state);
  }
}, []);
```

### 5.2 migrateGuest 函数

```ts
export function migrateGuest(g: Guest): Guest {
  const result = { ...g };

  // 1. 姓名拆分
  if (!g.firstName && !g.lastName && g.name) {
    const parts = g.name.trim().split(/\s+/);
    result.firstName = parts[0] || '';
    result.lastName = parts.slice(1).join(' ') || '';
  }

  // 2. IDType 默认
  if (!g.idType) result.idType = 'passport';

  return result;
}
```

### 5.3 旧数据占位显示

| 字段 | 空值显示 |
|------|----------|
| `phone` | "未填写"（灰色 + 虚线） |
| `email` | "未填写" |
| `arrivalTime` | "未填写" |
| `referral` | "未填写" |
| `idType` | 永远有值（默认 passport） |
| `firstName` / `lastName` | 必有值（迁移后填充） |

---

## 6. iCal 智能解析（src/components/ICalImport.tsx）

### 6.1 SUMMARY 解析

```ts
function parseSummaryToName(summary: string): { first: string; last: string } {
  const s = summary.trim();

  // 1. "Last, First" 格式
  if (s.includes(',')) {
    const [last, first] = s.split(',').map(x => x.trim());
    return { first: first || last, last: first ? last : '' };
  }

  // 2. "First Last" 格式
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}
```

### 6.2 示例

| SUMMARY | firstName | lastName | name |
|---------|-----------|----------|------|
| `John Doe` | John | Doe | John Doe |
| `Doe, John` | John | Doe | John Doe |
| `Sophie Müller` | Sophie | Müller | Sophie Müller |
| `Maria` | Maria | (空) | Maria |

---

## 7. i18n 键值（src/locales/en.json + zh.json）

| key | en | zh |
|-----|----|----|
| `checkin.firstName` | First name | 名 |
| `checkin.lastName` | Last name | 姓 |
| `checkin.phone` | Phone | 电话 |
| `checkin.email` | Email | 邮箱 |
| `checkin.idType` | ID document type | 证件类型 |
| `checkin.idType.passport` | Passport | 护照 |
| `checkin.idType.idCard` | ID Card | 身份证 |
| `checkin.idType.driverLicense` | Driver License | 驾照 |
| `checkin.arrivalTime` | Arrival time | 预计抵店时段 |
| `checkin.arrivalTime.morning` | Morning (8–12) | 上午 (8–12) |
| `checkin.arrivalTime.afternoon` | Afternoon (12–18) | 下午 (12–18) |
| `checkin.arrivalTime.evening` | Evening (18–22) | 傍晚 (18–22) |
| `checkin.arrivalTime.late` | Late (22+) | 深夜 (22 点后) |
| `checkin.referral` | Referral / How heard | 推荐来源 |
| `checkin.editInfo` | Edit info | 编辑资料 |
| `checkin.notProvided` | Not provided | 未填写 |
| `checkin.contactSection` | Contact | 联系方式 |
| `checkin.idSection` | ID | 证件 |

---

## 8. Demo 种子数据更新

补全 5–8 个 demo 客人的新字段：

- Sophie Müller（DEU）— 完整信息，referral=Hostelworld
- Carlos Silva（BRA）— 完整信息，referral=Booking.com
- Yuki Tanaka（JPN）— 完整信息，arrivalTime=evening
- Alex（GBR）— 故意留空 referral + arrivalTime（演示占位）
- 其余保留现状

---

## 9. 文件改动清单

| 文件 | 类型 | 改动 |
|------|------|------|
| `src/types.ts` | 修改 | Guest 接口 + 2 枚举 |
| `src/utils/guestMigration.ts` | **新增** | migrateGuest 函数 |
| `src/HostelContext.tsx` | 修改 | 启动迁移 + addArrival 支持新字段 |
| `src/components/CheckInPanel.tsx` | 重构 | Walk-in 表单 + 详情卡 |
| `src/components/ICalImport.tsx` | 修改 | 智能解析 SUMMARY |
| `src/components/EditGuestInfoModal.tsx` | **新增** | 编辑信息弹窗 |
| `src/locales/en.json` | 修改 | +18 keys |
| `src/locales/zh.json` | 修改 | +18 keys |
| `src/data/seed.ts` | 修改 | 补全 demo 数据 |
| `src/version.ts` | 修改 | v1.4.0 → **v1.6.0** |

---

## 10. 验收标准

### 10.1 功能验收

- [ ] Walk-in 表单可创建含全部 10 个必填字段的客人
- [ ] 详情卡左栏展示联系方式 + 证件信息，右栏展示操作堆栈
- [ ] 「✎ Edit Info」弹窗可编辑所有新字段，保存后立即反映
- [ ] iCal 导入的客人有 firstName / lastName
- [ ] 旧 localStorage 数据启动时自动迁移，详情卡正确显示
- [ ] 中英双语 i18n 完整

### 10.2 视觉验收

- [ ] Walk-in 表单 3 段分组清晰，桌面端不超过 1.5 屏
- [ ] 详情卡桌面端左右两栏，移动端单列
- [ ] 空字段统一「未填写」占位样式
- [ ] 必填字段有红点 / 星号提示

### 10.3 技术验收

- [ ] `tsc --noEmit` 通过
- [ ] localStorage 版本号 v1.6.0
- [ ] 新增组件 < 250 行
- [ ] 不引入新依赖

---

## 11. 风险与回滚

- **风险 1**：姓名拆分对中文/西班牙语复姓不完美 — 接受限制，iCal 也同样限制
- **风险 2**：旧数据迁移误改 — 启动时一次性写入 + 保留原 name 字段作为备份
- **回滚**：git revert 即可，所有改动未触及 HostelContext 核心 reducer 逻辑
