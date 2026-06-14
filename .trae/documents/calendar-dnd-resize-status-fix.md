# Calendar DnD, Resize & Status Display Fix Plan

## Summary

Fix three critical issues in the CalendarView:
1. **Drag-and-drop to specific dates/beds fails** — per-cell droppable architecture with `closestCenter` collision detection does not reliably find drop targets across rows.
2. **Edge resize for extending/shortening stays does not work** — `onPointerDown` resize handlers on booking blocks have logic bugs and visual feedback issues.
3. **Empty bed prices and cleaning status not displayed correctly** — empty slots show price faintly but cleaning status is missing from the calendar grid.

## Current State Analysis

### File: `src/components/CalendarView.tsx`

**DnD Architecture (broken):**
- Uses `DroppableDateCell` — every date cell in every bed row is an independent `useDroppable` with id `${bedId}-d${dateIndex}`.
- Collision detection is `closestCenter`. With many small cells, the pointer rarely lands exactly inside a cell's center during a fast drag, especially when crossing rows. `closestCenter` compares distances between draggable center and droppable centers; when dragging across rows, the original row's cells often remain "closer" than target row cells.
- `dropValidity` computes a Map of valid/invalid cells, but the DnD system often fails to even register an `over` target, so `handleDragEnd` never fires for cross-row drops.
- BedBoard uses a **single droppable per bed** (`id: bed.id`, whole card) with `closestCenter` — this works because each droppable is large. Calendar's per-cell droppables are too small and numerous.

**Edge Resize (broken):**
- `DraggableBookingBlock` has left/right edge divs with `onPointerDown` calling `startResize`.
- `startResize` calculates `dayWidth = blockEl.offsetWidth / visibleNights`, but `visibleNights` is the nights *visible in the current viewport*, not the total booking nights. If a booking extends beyond the viewport, `dayWidth` is wrong.
- The resize updates `blockEl.style.left/width` directly for visual feedback, but if the drag also triggers dnd-kit's drag start (because `stopPropagation` may not prevent dnd-kit's PointerSensor from activating on the same pointer sequence), the resize and drag fight each other.
- On `pointerup`, `deltaDays` is computed but if the pointer moved significantly, the snap-to-day logic may produce unexpected results.

**Status Display (incomplete):**
- Empty slots show a faint `$price` label via `priceLabel` prop — this works.
- Cleaning status: the left label column shows a purple dot for `bed.status === 'cleaning'`, but the **calendar grid cells themselves** do not show any cleaning indication. When a bed is in cleaning state, the date cells should show a purple background/cleaning icon.
- There is no visual distinction in the date grid between an empty bed and a bed that needs cleaning.

## Proposed Changes

### 1. Fix DnD: Switch from per-cell droppables to per-bed-row droppable + date inference

**Decision:** Use a hybrid approach that matches BedBoard's proven pattern:
- Each **bed row** (the entire horizontal strip) is ONE `useDroppable` with `id: bed.id` (same as BedBoard).
- When a guest is dropped on a bed row, calculate the **target date** from the pointer's X coordinate relative to the row's date grid.
- This eliminates the `closestCenter` problem with many small cells and makes cross-row dragging reliable.

**Implementation details:**

1. **Remove `DroppableDateCell` component entirely.**
2. **Create `DroppableBedRow` component:**
   ```tsx
   function DroppableBedRow({ bed, room, children, onDrop, isValidDrop }: {
     bed: Bed; room: Room; children: React.ReactNode;
     onDrop: (targetBedId: string, targetDate: Date) => void;
     isValidDrop?: boolean;
   }) {
     const { isOver, setNodeRef } = useDroppable({
       id: bed.id,
       data: { type: 'bed-row', bed },
     });
     // ...
   }
   ```
3. **In `handleDragEnd`:**
   - If `over.data.current?.type === 'bed-row'`, get `targetBedId = over.id`.
   - Compute target date from the pointer's final position:
     - Need access to the drop event's pointer coordinates. `DragEndEvent` from dnd-kit includes `active.rect.current.translated` and `delta`, but not absolute pointer. Use `active.rect.current.translated.left + active.rect.current.translated.width/2` (center of dragged item) or track pointer in `onDragMove`.
     - Better: store the pointer position in a ref during `onDragMove`, then read it in `handleDragEnd`.
   - Alternative simpler approach: since the user drags a booking block, we know the offset. Calculate target date index from the dragged item's final visual position relative to the row.
   - **Chosen approach:** In `handleDragMove`, track `pointerX` in a ref. In `handleDragEnd`, use `pointerX` minus the row's bounding rect left, divided by day width, to get `targetDateIndex`.

4. **Drop validity for bed-row:**
   - Pre-compute `dropValidity` as a Map keyed by `bedId` (boolean: can this guest be dropped on this bed at all?).
   - For same bed: always valid.
   - For different bed: valid only if the guest's entire stay (all nights) has no conflicts on that bed.
   - Date-specific validity: after computing target date from pointer, verify that the guest's stay starting at that date has no conflicts. If conflicts exist, reject the drop (show toast or silent fail).

5. **Visual feedback during drag:**
   - When dragging over a bed row, highlight the entire row (green if valid, red if invalid).
   - Show a vertical "ghost line" or highlight at the inferred target date position.

### 2. Fix Edge Resize: Separate resize from drag, fix day width calculation

**Root causes:**
- Resize handle `onPointerDown` may not reliably prevent dnd-kit drag start because dnd-kit's PointerSensor listens on the same element tree and uses its own activation constraints.
- `dayWidth` calculation uses `visibleNights` which is viewport-dependent.

**Fix:**
1. **Prevent dnd-kit from capturing resize handles:**
   - Add `data-dndkit-no-drag` attribute to resize handles (dnd-kit respects this by default if configured, but actually dnd-kit does NOT have built-in support for this attribute).
   - Better: use a **custom sensor** or simply ensure the resize handle's `onPointerDown` calls `e.stopPropagation()` AND returns early. dnd-kit's PointerSensor uses `pointerdown` on the draggable element (the booking block). The resize handles are children. If `stopPropagation` is called on the resize handle, the event does NOT bubble to the draggable's `pointerdown` listener... but dnd-kit uses a **global** `pointerdown` listener via the sensor, not bubbling. So `stopPropagation` does NOT prevent dnd-kit from seeing the event.
   - **Correct solution:** In the `PointerSensor`, use an `activationConstraint` with a custom handler, or more practically: **disable dragging when the pointer is on a resize handle** by checking the target in `onDragStart`.
   - dnd-kit's `useDraggable` applies `listeners` to the element. The listeners include `onPointerDown`. If we don't spread `listeners` onto the resize handles (we don't), but we DO spread them on the parent booking block, the parent's `onPointerDown` fires. The resize handle's `onPointerDown` fires first (capture/target phase), then bubbles. Since dnd-kit's sensor is on `window` (capture phase), `stopPropagation` on the target does NOT stop it.
   - **Workaround:** In `handleDragStart`, check `event.active.data.current` — but we need to know if the drag started on a resize handle. We can set a ref in the resize handle's `onPointerDown` (`isResizingRef.current = true`) and check it in `handleDragStart`. If true, call `event.preventDefault()` or... actually dnd-kit doesn't support preventing drag start this way easily.
   - **Better workaround:** Don't use dnd-kit listeners on the entire booking block. Instead, apply `listeners` only to a **dedicated drag handle area** (e.g., a grip icon or the center content area), NOT the entire block. The resize handles are outside this area. This is the standard dnd-kit pattern.

2. **Redesign `DraggableBookingBlock` drag activation:**
   - Move `{...listeners}` from the outer `div` (the whole block) to the **center content div only** (the area showing guest name/info).
   - The resize handles remain outside the listener area, so dragging from a resize handle never starts a dnd-kit drag.
   - The outer block is still `ref={setNodeRef}` for positioning, but only the center area is draggable.

3. **Fix `dayWidth` calculation:**
   - Use the **row's total width divided by `visibleDays`** instead of `blockEl.offsetWidth / visibleNights`.
   - `dayWidth = rowWidth / visibleDays` where `rowWidth` is the width of the date grid area (flex-1 part).
   - Pass `dayWidth` as a prop to `DraggableBookingBlock`, or compute it from `containerWidth`.

4. **Fix resize visual feedback and commit logic:**
   - On `pointermove`, update a **React state** (e.g., `resizingState`) instead of direct DOM manipulation, so React re-renders the block with new left/width.
   - Or keep direct DOM manipulation for performance, but ensure we reset styles properly.
   - On `pointerup`, compute `deltaDays` from the final pointer position (not from style changes), then call `onResizeLeft`/`onResizeRight`.
   - Ensure `onResizeLeft` adjusts `checkInDate` and `nights`; `onResizeRight` adjusts `checkOutDate` and `nights`.

### 3. Fix Empty Bed / Cleaning Status Display

**Empty bed price:**
- Already shown in `DroppableDateCell` via `priceLabel`. Keep this behavior but move it into the new row architecture.
- When a bed row is empty (no booking on a date), show `$price` in the cell.

**Cleaning status:**
- When `bed.status === 'cleaning'`, the entire bed row's date grid should have a **light purple background** (`bg-purple-50/30`).
- Add a **cleaning indicator** in the left label: a purple sparkle icon + "Cleaning" text (already partially there as a dot, but make it more prominent).
- In the date cells for a cleaning bed, show a faint "Cleaning" text or a purple dashed border pattern.
- **Cleaning action:** Add a button in the row (or in the label area) to mark the bed as clean (`markBedClean`), similar to BedBoard's cleaning button.

**Implementation:**
1. In the bed row rendering, check `bed.status`:
   - `cleaning`: row background `bg-purple-50/20`, cells show purple tint, label shows sparkle icon + "Needs Cleaning" button.
   - `empty`: cells show `$price` label, label shows green dot.
   - `occupied`: normal booking block rendering.
2. Ensure the `statusFilter` in the header still works — when filtering by "cleaning", only dirty beds show.

## File Changes

### `src/components/CalendarView.tsx` (primary changes)

1. **Remove `DroppableDateCell`** — replace with row-level droppable logic.
2. **Add `DroppableBedRow`** wrapper component.
3. **Refactor `DraggableBookingBlock`:**
   - Move `listeners` to a dedicated drag area (center content), not the whole block.
   - Fix `startResize` to use correct `dayWidth` (container-based).
   - Ensure resize does not trigger dnd-kit drag.
4. **Update `handleDragStart`/`handleDragMove`/`handleDragEnd`:**
   - `handleDragMove`: track pointer X in a ref.
   - `handleDragEnd`: compute target date from pointer X relative to row geometry; use `moveGuest` + `updateArrival` for bed swap + date shift.
5. **Update `dropValidity`:** compute per-bed validity (not per-cell).
6. **Add cleaning status rendering:** purple backgrounds, cleaning button, etc.
7. **Keep empty slot price display.**

### `src/components/BedBoard.tsx` (reference only)
- No changes needed; used as the proven DnD pattern reference.

### `src/HostelContext.tsx` (reference only)
- No changes needed; `moveGuest`, `updateArrival`, `markBedClean` already exist.

## Verification Steps

1. **DnD Test:**
   - Drag a guest from Bed A to Bed B (different row). Should succeed if Bed B has no date conflicts.
   - Drag a guest within the same bed row to a different date. Should shift the booking dates.
   - Drag to a bed with overlapping bookings. Should show red highlight and reject drop.
   - Cross-row drag should feel as smooth as BedBoard.

2. **Resize Test:**
   - Hover over a booking block's left edge; cursor changes to `ew-resize`.
   - Drag left edge left/right: check-in date should change, nights should recalculate.
   - Drag right edge left/right: check-out date should change, nights should recalculate.
   - Resize should NOT start a drag-and-drop operation.
   - Visual feedback: block should stretch/shrink smoothly during resize.

3. **Status Display Test:**
   - Empty beds: each date cell shows `$price` faintly.
   - After checkout: bed row turns purple, "Needs Cleaning" button appears, clicking it marks clean (green).
   - Cleaning filter: selecting "cleaning" from status filter shows only dirty beds.

## Assumptions & Decisions

- **Pointer tracking for date inference:** We will track the pointer X coordinate during `onDragMove` using a ref. This is the most reliable way to know where the user dropped within a row.
- **Day width for resize:** We will compute `dayWidth = (containerWidth - LABEL_WIDTH) / visibleDays` and pass it down, rather than measuring DOM elements during resize.
- **Dedicated drag area:** Only the center content of a booking block (guest name, country, nights) will activate dnd-kit drag. The resize handles and action buttons are outside this area.
- **Cleaning state display:** We will show a subtle purple background on the entire row and a "Mark as Clean" button in the left label column, matching BedBoard's pattern.
- **Same-bed date shift:** When dragging within the same bed row, we treat it as a date shift (update check-in/check-out dates). When dragging to a different bed row, we treat it as a move ( `moveGuest`) plus optional date shift if the drop position implies a different date.
- **Gender conflict:** For now, we do NOT enforce gender conflict checks in Calendar DnD (BedBoard does). This can be added later if needed; the plan focuses on making DnD work first.
