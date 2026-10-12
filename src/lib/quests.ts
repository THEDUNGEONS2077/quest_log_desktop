/**
 * lib/quests.ts: quest categories, the tabs of the ACTIVE list (user
 * request 2026-10-09).
 *
 *   [ ALL ][ DAILY ][ MAIN ][ MISC ]
 *
 * Layer: pure lib. Every quest (top-level task) belongs to one category:
 *   - daily: things done every day. A quest added on the DAILY tab repeats
 *            daily by default (store quickAdd), so it resets each day and
 *            earns the day and repeat streaks (lib/xp.ts).
 *   - main:  the bigger goals (the default).
 *   - misc:  everything else.
 * The category is stored on the quest (`task.category`). Quests from
 * before categories existed get one derived here: repeating daily → daily,
 * anything else → main.
 */
import type { FieldChange, Op } from './ops';
import { findTask } from './taskMap';
import { type Area, DEFAULT_AREAS, type QuestCategory, ROOT, type Task, type TasksState } from './types';

/** The category tabs in display order, with their labels. */
export const CATEGORIES: readonly { key: QuestCategory; label: string }[] = [
  { key: 'daily', label: 'DAILY' },
  { key: 'main', label: 'MAIN' },
  { key: 'misc', label: 'MISC' },
];

/** A tab of the list: one category, or all of them. */
export type CategoryTab = 'all' | QuestCategory;

/** The quest tabs in screen order, left to right. */
export const CATEGORY_TABS: readonly CategoryTab[] = ['all', ...CATEGORIES.map((c) => c.key)];

/** The category a quest belongs to (stored, or derived for older data). */
export function questCategory(task: Pick<Task, 'category' | 'repeat'>): QuestCategory {
  if (task.category) return task.category;
  return task.repeat && task.repeat.freq === 'day' ? 'daily' : 'main';
}

/** The category a quest added while `tab` is shown gets (ALL adds to MAIN). */
export function categoryForNew(tab: CategoryTab, areas: readonly Area[] = DEFAULT_AREAS): QuestCategory {
  if (tab !== 'all') return tab;
  // Desktop: areas are the user's, so MAIN may be gone or archived; then the first live area.
  const live = areas.filter((a) => a.archivedAt === undefined);
  return live.some((a) => a.id === 'main') ? 'main' : (live[0]?.id ?? 'main');
}

const NO_AREAS: ReadonlySet<string> = new Set();
// One set per areas list (the list is replaced, never mutated, on every change).
const archivedCache = new WeakMap<readonly Area[], ReadonlySet<string>>();

/** The IDs of the areas in ARCHIVES (desktop; lib/areas.ts). */
export function archivedAreaIds(state: Pick<TasksState, 'areas'>): ReadonlySet<string> {
  let ids = archivedCache.get(state.areas);
  if (!ids) {
    const list = state.areas.filter((a) => a.archivedAt !== undefined).map((a) => a.id);
    ids = list.length ? new Set(list) : NO_AREAS;
    archivedCache.set(state.areas, ids);
  }
  return ids;
}

/**
 * Does a quest show on `tab`? ALL leaves out the quests of archived areas
 * (`archived`, from archivedAreaIds); an area's own tab always shows its
 * quests, so an archived area can still be looked through.
 */
export function onTab(task: Pick<Task, 'category' | 'repeat'>, tab: CategoryTab, archived: ReadonlySet<string> = NO_AREAS): boolean {
  if (tab === 'all') return !archived.has(questCategory(task));
  return questCategory(task) === tab;
}

/**
 * Repair for completed copies of repeating quests saved before v1.5.2
 * (bug 2026-10-09). A copy is archived without its repeat rule, so a copy
 * whose quest was DAILY only through its daily repeat (no stored category)
 * fell to MAIN. Each such copy gets its quest's category stored, looked up
 * through `repeatSourceId`; a copy whose quest is gone is left as it is.
 * Returns null when there's nothing to do. Run at launch and after an
 * import, outside undo history (it isn't a user action).
 */
export function pinArchivedCategories(state: TasksState): Op | null {
  const changes: FieldChange[] = [];
  for (const id of state.children[ROOT] ?? []) {
    const copy = findTask(state, id);
    if (!copy || copy.category || copy.repeatSourceId === null) continue;
    const source = findTask(state, copy.repeatSourceId);
    if (source) changes.push({ id, fields: { category: questCategory(source) } });
  }
  return changes.length ? { type: 'update', changes } : null;
}
