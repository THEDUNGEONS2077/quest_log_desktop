/**
 * src/lib/areaNames.ts: an area's display name from its ID.
 *
 * Layer: pure lib. Kept apart from areas.ts so plan.ts and others can name
 * an area without importing the area ops. A quest whose area was deleted
 * by an older backup (no matching area) shows its raw ID in capitals.
 */
import type { AreaId, TasksState } from './types';

/** The name shown for area `id`. */
export function areaName(state: TasksState, id: AreaId): string {
  return state.areas.find((a) => a.id === id)?.name ?? id.toUpperCase();
}
