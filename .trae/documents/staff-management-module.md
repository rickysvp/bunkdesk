# 人员管理与登录认证方案

## 概述

将硬编码的 `STAFF_LIST` 升级为完整的人员管理系统：员工 CRUD + 三角色（前台/保洁/经理）+ 选名字+PIN 码登录 + 角色控制可见模块。简化业务逻辑和交互流程。

## 当前状态分析

- `ShiftStaffContext.tsx`：硬编码 `STAFF_LIST = ["Emma", "Maria", "Jake", "Tony"]`，仅切换值班人
- `App.tsx`：header 中 `<select>` 遍历 STAFF_LIST，无认证
- `HostelContext.tsx`：`addAutoNote` 用 `currentStaff` 作作者
- 无角色概念，无登录，无权限控制

## 核心设计

### 登录流程
1. 应用启动 → 显示登录页（选名字 + 输入 PIN）
2. PIN 码验证通过 → 进入主界面，根据角色显示模块
3. header 显示当前登录人 + 角色标签 + 退出按钮
4. 退出 → 回到登录页

### 角色权限矩阵

| 模块 | 经理 | 前台 | 保洁 |
|------|:----:|:----:|:----:|
| 今日概览 | ✓ | ✓ | ✓ |
| 床位看板 | ✓ | ✓ | ✓(仅清洁模式) |
| 任务看板 | ✓ | ✓ | ✓ |
| 交接班日志 | ✓ | ✓ | ✓ |
| 前台入住 | ✓ | ✓ | ✗ |
| 日历视图 | ✓ | ✓ | ✗ |
| 预定管理 | ✓ | ✓ | ✗ |
| 活动看板 | ✓ | ✓ | ✗ |
| 员工管理 | ✓ | ✗ | ✗ |

> 简化原则：保洁看不到的模块直接隐藏，不是灰掉。前台看不到员工管理。

### PIN 码设计
- 每位员工 4 位数字 PIN，初始 PIN 为 `0000`
- 首次登录后可修改 PIN（可选，本次不实现修改 PIN）
- PIN 存储在 localStorage，纯前端验证

## 改动计划

### 1. 类型定义 — `src/types.ts`

新增：

```typescript
export type StaffRole = "reception" | "cleaning" | "manager";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;           // 4 位数字 PIN
  phone?: string;
  isActive: boolean;
  createdAt: string;
}
```

### 2. 初始数据 — `src/data.ts`

新增 `INITIAL_STAFF`：

| 姓名 | 角色 | PIN |
|------|------|-----|
| Emma | manager | 1234 |
| Maria | reception | 1234 |
| Jake | cleaning | 1234 |
| Tony | reception | 1234 |

### 3. 重写 ShiftStaffContext → StaffContext — `src/StaffContext.tsx`

**新文件**，替代 `ShiftStaffContext.tsx`

```typescript
interface StaffState {
  staffList: Staff[];
  currentStaff: Staff | null;     // null = 未登录
  isAuthenticated: boolean;
  login: (staffId: string, pin: string) => boolean;
  logout: () => void;
  addStaff: (staff: Omit<Staff, "id" | "createdAt">) => void;
  updateStaff: (id: string, updates: Partial<Pick<Staff, "name" | "role" | "phone" | "isActive" | "pin">>) => void;
  removeStaff: (id: string) => void;
  activeStaffList: Staff[];       // useMemo: isActive 的员工
  staffByRole: (role: StaffRole) => Staff[];
  visibleTabs: string[];          // useMemo: 根据当前角色返回可见 tab 列表
}
```

角色可见 tab 映射：

```typescript
const ROLE_TABS: Record<StaffRole, string[]> = {
  manager: ["dashboard", "bedboard", "tasks", "shiftlog", "checkin", "calendar", "reservations", "activities", "staff"],
  reception: ["dashboard", "bedboard", "tasks", "shiftlog", "checkin", "calendar", "reservations", "activities"],
  cleaning: ["dashboard", "bedboard", "tasks", "shiftlog"],
};
```

### 4. 新建登录页 — `src/components/LoginScreen.tsx`

简洁登录界面：
- 居中卡片，HostelOps logo
- 员工名字按钮列表（仅 `isActive` 的员工）
- 点击名字 → 弹出 PIN 输入框（4 位数字）
- PIN 正确 → 登录；错误 → 抖动提示
- 底部小字 "HostelOps v1.0"

### 5. 更新 App.tsx

- 导入 `StaffProvider`, `useStaff`
- Provider 顺序：`I18nProvider > StaffProvider > HostelProvider`
- `AppContent` 中：
  - 未登录 → 渲染 `<LoginScreen />`
  - 已登录 → 渲染现有布局
- header：
  - 移除值班选择器（已由登录替代）
  - 显示当前用户名 + 角色标签
  - 添加退出按钮

### 6. 更新 Sidebar — `src/components/Sidebar.tsx`

- 从 `useStaff` 获取 `visibleTabs`
- 仅渲染 `visibleTabs` 中的 tab
- 新增 `staff` tab（图标 `Users`）
- 移动端底部导航同样按 `visibleTabs` 过滤

### 7. 新建 StaffPanel — `src/components/StaffPanel.tsx`

仅经理可见的员工管理页面：
- **员工卡片列表**：姓名、角色标签（颜色区分）、在职状态、PIN（遮掩显示）
- **添加员工**：姓名 + 角色选择 + PIN + 手机号
- **编辑**：修改角色、手机号、重置 PIN
- **标记离职**：`isActive = false`，该员工不再出现在登录页
- **角色颜色**：前台=蓝色、保洁=紫色、经理=琥珀色

### 8. 更新 HostelContext — `src/HostelContext.tsx`

- 导入改为 `useStaff`
- `addAutoNote` 中 `author` 改为 `${currentStaff.name} (System)`
- 其余不变

### 9. 更新 ShiftLog — `src/components/ShiftLog.tsx`

- 移除手动输入作者字段（已由登录确定）
- 手动日志的 `author` 自动取 `currentStaff.name`
- 日志显示中作者名旁显示角色标签

### 10. 更新 TaskBoard — `src/components/TaskBoard.tsx`

- `assignee` 改为从 `activeStaffList` 下拉选择

### 11. 更新 BedBoard — `src/components/BedBoard.tsx`

- 保洁角色登录时，床位看板默认进入清洁模式
- 清洁指派从 `cleaning` 角色员工中选择

### 12. i18n — `src/i18nContext.tsx`

新增 `staff` + `login` section：

```typescript
login: {
  title: "HostelOps",
  selectUser: "Select your name",
  enterPin: "Enter your PIN",
  wrongPin: "Incorrect PIN",
  login: "Sign In",
},
staff: {
  title: "Staff",
  addStaff: "Add Staff",
  name: "Name",
  role: "Role",
  phone: "Phone",
  pin: "PIN",
  resetPin: "Reset PIN",
  reception: "Reception",
  cleaning: "Cleaning",
  manager: "Manager",
  active: "Active",
  inactive: "Inactive",
  setInactive: "Set Inactive",
  setActive: "Set Active",
  editStaff: "Edit Staff",
  noStaff: "No staff members.",
  logout: "Sign Out",
}
```

中文：
```typescript
login: {
  title: "HostelOps",
  selectUser: "选择你的名字",
  enterPin: "输入 PIN 码",
  wrongPin: "PIN 码错误",
  login: "登录",
},
staff: {
  title: "员工管理",
  addStaff: "添加员工",
  name: "姓名",
  role: "角色",
  phone: "电话",
  pin: "PIN 码",
  resetPin: "重置 PIN",
  reception: "前台",
  cleaning: "保洁",
  manager: "经理",
  active: "在职",
  inactive: "离职",
  setInactive: "标记离职",
  setActive: "恢复在职",
  editStaff: "编辑员工",
  noStaff: "暂无员工。",
  logout: "退出登录",
}
```

### 13. 删除旧文件

- 删除 `src/ShiftStaffContext.tsx`

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/types.ts` | 修改：新增 StaffRole, Staff |
| `src/data.ts` | 修改：新增 INITIAL_STAFF |
| `src/StaffContext.tsx` | 新建：替代 ShiftStaffContext |
| `src/ShiftStaffContext.tsx` | 删除 |
| `src/components/LoginScreen.tsx` | 新建：登录页 |
| `src/components/StaffPanel.tsx` | 新建：员工管理页 |
| `src/App.tsx` | 修改：登录判断 + 角色显示 + 退出 |
| `src/components/Sidebar.tsx` | 修改：按角色过滤 tab + 新增 staff |
| `src/HostelContext.tsx` | 修改：导入 useStaff |
| `src/components/ShiftLog.tsx` | 修改：作者自动取登录人 |
| `src/components/TaskBoard.tsx` | 修改：指派人下拉选择 |
| `src/components/BedBoard.tsx` | 修改：保洁默认清洁模式 |
| `src/i18nContext.tsx` | 修改：新增 login + staff section |

## 验证步骤

1. `npx tsc --noEmit` 通过
2. 登录页：选择名字 + 输入 PIN，错误 PIN 抖动提示
3. 经理登录：可见全部 9 个 tab，含员工管理
4. 前台登录：可见 8 个 tab，无员工管理
5. 保洁登录：可见 4 个 tab（概览/床位/任务/日志），床位默认清洁模式
6. 退出登录：回到登录页
7. 员工管理：添加/编辑/标记离职正常
8. 自动日志作者格式为 "Emma (System)"
9. 中英文切换正常
