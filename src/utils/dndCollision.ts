import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter } from '@dnd-kit/core';

/**
 * Custom collision detection for timeline bed rows.
 *
 * Uses Y-coordinate containment: the pointer must be within a bed row's
 * vertical bounds to target that row. Falls back to closestCenter if no
 * row directly contains the pointer.
 *
 * This is more accurate than closestCenter for wide horizontal rows,
 * because closestCenter measures distance to centers, which can pick
 * the wrong row when the cursor is near row boundaries.
 */
export const timelineCollisionDetection: CollisionDetection = (args) => {
  const { droppableContainers, pointerCoordinates } = args;

  if (!pointerCoordinates) {
    return closestCenter(args);
  }

  let bestTarget: { id: string; distance: number } | null = null;

  for (const container of droppableContainers) {
    const rect = container.rect.current;
    if (!rect) continue;

    // Check if pointer Y is within this row's vertical bounds
    if (pointerCoordinates.y >= rect.top && pointerCoordinates.y <= rect.top + rect.height) {
      if (!bestTarget || rect.top < bestTarget.distance) {
        bestTarget = { id: container.id as string, distance: rect.top };
      }
    }
  }

  if (bestTarget) {
    return [{ id: bestTarget.id }];
  }

  // Fallback: closest center
  return closestCenter(args);
};

/**
 * Calculate which date column a pointer X coordinate falls on within a bed row.
 * Returns the date at that column, or null if out of range.
 */
export function getDropDateFromX(
  clientX: number,
  containerLeft: number,
  dayWidth: number,
  dates: Date[],
): Date | null {
  const relativeX = clientX - containerLeft;
  const dayIndex = Math.floor(relativeX / dayWidth);
  if (dayIndex < 0 || dayIndex >= dates.length) return null;
  return dates[dayIndex];
}
