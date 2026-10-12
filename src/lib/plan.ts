/**
 * src/lib/plan.ts: the planning views, TODAY and UPCOMING (desktop,
 * 2026-10-12: "structured for work").
 *
 * Layer: pure lib. Both views gather tasks from every area and every
 * depth (a project's tasks, their subtasks) by due date, so the day's work
 * reads as one list whatever project it belongs to:
 *   - TODAY: everything overdue, then everything due today, by time;
 *   - UPCOMING: the next `days` days after today, grouped by day, by time.
 * Only open, live tasks count: not done, not in Trash, and not inside a
 * completed quest (that one is on COMPLETED), nor in an archived area. Each row carries its path
 * (area › project › parent…) so it can be read out of context.
 */
import { areaName } from './areaNames';
import { addDays, dayKey, startOfDay } from './dates';
import { archivedAreaIds, questCategory } from './quests';
import { forEachTask, findTask } from './taskMap';
import { ancestors } from './tree';
import type { ID, Task, TasksState } from './types';

/** One task in a planning view. */
export interface PlanRow {
  id: ID;
  dueAt: number;
  /** Due before now. */
  overdue: boolean;
  /** Where it sits: the area's name, then the titles of its project and parents (outermost first). */
  path: string[];
}

/** One day of UPCOMING. */
export interface PlanDay {
  /** Local midnight of the day. */
  day: number;
  /** YYYY-MM-DD (a stable key). */
  key: string;
  rows: PlanRow[];
}

/** Is `t` open and live: not done, not trashed, and not inside something done or trashed? */
function isOpen(state: TasksState, t: Task): boolean {
  if (t.done || t.deletedAt !== null) return false;
  return ancestors(state, t.id).every((a) => {
    const p = findTask(state, a)!;
    return !p.done && p.deletedAt === null;
  });
}

/** A task's path: its area, then its ancestors' titles, outermost first. */
function pathOf(state: TasksState, t: Task): string[] {
  const chain = ancestors(state, t.id).reverse();
  const quest = chain.length ? findTask(state, chain[0]!)! : t;
  return [areaName(state, questCategory(quest)), ...chain.map((id) => findTask(state, id)!.title || 'Untitled')];
}

/** Is `t` in a quest of an archived area? */
function inArchive(state: TasksState, t: Task, archived: ReadonlySet<string>): boolean {
  if (!archived.size) return false;
  const chain = ancestors(state, t.id);
  const quest = chain.length ? findTask(state, chain[chain.length - 1]!)! : t;
  return archived.has(questCategory(quest));
}

/** Every open, dated task due before `until`, soonest first. */
function dueBefore(state: TasksState, until: number, now: number): PlanRow[] {
  const rows: PlanRow[] = [];
  const archived = archivedAreaIds(state);
  forEachTask(state, (t) => {
    if (t.dueAt === null || t.dueAt >= until || !isOpen(state, t) || inArchive(state, t, archived)) return;
    rows.push({ id: t.id, dueAt: t.dueAt, overdue: t.dueAt < now, path: pathOf(state, t) });
  });
  return rows.sort((a, b) => a.dueAt - b.dueAt);
}

/** TODAY: overdue (any day) and due today, soonest first (overdue comes first by nature). */
export function todayRows(state: TasksState, now: number): PlanRow[] {
  return dueBefore(state, addDays(startOfDay(now), 1), now);
}

/** UPCOMING: the `days` days after today, one group per day that has something due. */
export function upcomingDays(state: TasksState, now: number, days = 14): PlanDay[] {
  const tomorrow = addDays(startOfDay(now), 1);
  const end = addDays(tomorrow, days);
  const out: PlanDay[] = [];
  for (const row of dueBefore(state, end, now)) {
    if (row.dueAt < tomorrow) continue;
    const day = startOfDay(row.dueAt);
    const last = out[out.length - 1];
    if (last && last.day === day) last.rows.push(row);
    else out.push({ day, key: dayKey(day), rows: [row] });
  }
  return out;
}
