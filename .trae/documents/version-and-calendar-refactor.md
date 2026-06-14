# 版本号管理 + 日历模块重构计划

## Summary

1. **版本号管理机制**：在 package.json 中设定初始版本号 `1.0.0`，创建 `src/version.ts` 集中管理版本常量，在 Sidebar 底部显示版本号，i18n 支持
2. **日历模块重构**：重写 CalendarView 布局，从固定宽度滚动表格改为撑满容器的响应式甘特图，优化交互体验

## Current State Analysis

### 版本号
- `package.json` version 为 `"0.0.0"`，name 为 `"react-example"`
- 代码中无任何版本号引用
- Sidebar 底部无版本信息

### 日历模块 (CalendarView.tsx)
- **固定列宽** `w-[88px]`，14天固定显示，需要横向滚动
- **左侧标签列** 固定 `w-36 md:w-44`，sticky 定位
- **问题**：
  1. 不撑满容器，大量空白浪费
  2. 14天窗口在小屏幕上需要滚动，大屏幕上又太窄
  3. 床位行高固定 `h-[52px]`，内容拥挤
  4. 预订块宽度用 `calc(${visibleNights * 100}% - 2px)` 相对于父容器，但父容器是固定宽度的格子
  5. 日期头和内容区域没有对齐优化

## Proposed Changes

### Change 1: 版本号管理机制

**Files:**
- Modify: `package.json` — version 改为 `"1.0.0"`，name 改为 `"bunkly"`
- Create: `src/version.ts` — 版本常量
- Modify: `src/components/Sidebar.tsx` — 底部显示版本号
- Modify: `src/i18nContext.tsx` — 版本相关 i18n

**What/Why/How:**

1. `package.json`: version `"0.0.0"` → `"1.0.0"`, name `"react-example"` → `"bunkly"`

2. `src/version.ts`: 集中管理版本号，方便多处引用
```typescript
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Bunkly';
```

3. `Sidebar.tsx`: 在桌面端 Sidebar 底部添加版本号显示
```tsx
import { APP_VERSION } from '../version';

// 在 nav 下方，sidebar 底部
<div className="mt-auto px-6 py-4 border-t border-zinc-200">
  <p className="text-[10px] text-zinc-400">Bunkly v{APP_VERSION}</p>
</div>
```

4. `i18nContext.tsx`: 添加版本显示的 i18n key（如需要）

### Change 2: 日历模块重构

**Files:**
- Modify: `src/components/CalendarView.tsx` — 完整重构布局

**重构目标：**
- 撑满容器宽度，自适应屏幕
- 日期列宽度动态计算（容器宽度 - 左侧标签列宽度）/ 可见天数
- 床位行高度更舒适
- 预订块交互更清晰
- 今天列高亮更明显
- 整体视觉更紧凑专业

**重构方案：**

1. **动态列宽**：移除固定 `w-[88px]`，改用 CSS Grid 或 flex-1 让列撑满
   - 左侧标签列保持固定宽度 `w-40`
   - 日期列使用 `flex-1` 均分剩余空间
   - 最小列宽 `min-w-[60px]` 保证可读性

2. **自适应天数**：根据容器宽度动态计算可见天数
   - 小屏 (<768px): 7天
   - 中屏 (768-1280px): 10天
   - 大屏 (>1280px): 14天
   - 使用 `useRef` + `ResizeObserver` 监听容器宽度

3. **行高优化**：
   - 床位行从 `h-[52px]` → `h-14` (56px)，更舒适
   - 日期头从 `py-2` → `py-3`，更清晰

4. **预订块优化**：
   - 使用绝对定位 + 百分比宽度，基于实际列宽
   - 预订块高度 `top-1 bottom-1`，留出间距
   - 添加入住/退房日期标记（小三角或竖线）

5. **今天列高亮**：
   - 整列背景 `bg-amber-50/50`
   - 日期数字加粗 + 圆形背景

6. **移除渐变遮罩**：因为撑满后不需要滚动遮罩

7. **导航优化**：
   - 保留左右箭头 + Today 按钮
   - 添加周视图/2周视图切换

**关键代码结构：**

```tsx
export function CalendarView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // 动态计算可见天数
  const visibleDays = useMemo(() => {
    if (containerWidth < 768) return 7;
    if (containerWidth < 1280) return 10;
    return 14;
  }, [containerWidth]);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 计算列宽
  const labelWidth = 160; // px
  const dayColumnWidth = containerWidth > 0
    ? Math.max(60, (containerWidth - labelWidth) / visibleDays)
    : 88;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      ...

      {/* Calendar grid - 使用 flex 布局撑满 */}
      <div className="flex-1 overflow-auto">
        {/* Date Header */}
        <div className="flex">
          <div className="w-40 flex-shrink-0 ...">Room/Bed</div>
          {dates.map(date => (
            <div key={...} className="flex-1 min-w-[60px] ...">
              ...
            </div>
          ))}
        </div>

        {/* Room/Bed rows */}
        {rooms.map(room => (
          <>
            <div className="flex ...">
              <div className="w-40 flex-shrink-0 ...">Room header</div>
              {dates.map(...)}
            </div>
            {room.beds.map(bed => (
              <div className="flex h-14 ...">
                <div className="w-40 flex-shrink-0 ...">Bed label</div>
                <div className="flex-1 relative">
                  {/* Booking blocks with percentage-based positioning */}
                </div>
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
```

## Assumptions & Decisions

1. **版本号格式**：使用语义化版本 (SemVer) `MAJOR.MINOR.PATCH`，初始版本 `1.0.0`
2. **版本号位置**：仅在 Sidebar 底部显示，不添加 changelog 页面（保持简洁）
3. **日历重构不改变数据逻辑**：只改布局和交互，不改动 HostelContext 或类型
4. **日历自适应策略**：用 ResizeObserver 动态计算，而非 CSS-only（更精确控制）
5. **保留键盘导航和触摸滑动**：这些交互功能在重构中保留
6. **预订块定位**：从固定像素宽度改为基于列数的百分比定位

## Verification Steps

1. `npm run build` 构建成功
2. Sidebar 底部显示 "Bunkly v1.0.0"
3. 日历模块撑满容器，无横向空白
4. 不同屏幕宽度下天数自适应（7/10/14天）
5. 预订块正确显示，点击可查看详情
6. 左右导航正常工作
7. 今天列高亮清晰
