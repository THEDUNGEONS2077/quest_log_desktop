/**
 * src/lib/areas.ts: areas, the user's own groups of quests (desktop,
 * 2026-10-12: "structured for work": projects and areas).
 *
 * Layer: pure lib. An area is what the phone calls a quest category, made
 * user-defined: clients, teams, parts of the job. A quest (a project)
 * belongs to one area through `task.category`; its objectives are the
 * project's tasks. The list lives in the tree (`state.areas`), so every
 * change is an op with an exact inverse (undoable) and travels in backups.
 * The defaults are the phone's DAILY / MAIN / MISC with the same IDs, so a
 * phone backup lands in the right areas. 'daily' keeps its phone meaning:
 * a quest added there repeats daily (store quickAdd).
 */
import type { FieldChange, Op } from './ops';
import { questCategory } from './quests';
import { findTask } from './taskMap';
import { type Area, type AreaId, ROOT, type TasksState } from './types';

/** Longest area name. */
export const AREA_NAME_MAX = 32;

/** A name as stored: trimmed, inner spaces collapsed, cut to AREA_NAME_MAX. Empty if nothing's left. */
export function cleanAreaName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, AREA_NAME_MAX);
}

/** The area with `id`, if there is one. */
export function findArea(state: TasksState, id: AreaId): Area | undefined {
  return state.areas.find((a) => a.id === id);
}

/** Adds an area at the end of the list. Null for an empty name. */
export function addAreaOp(state: TasksState, id: AreaId, name: string): Op | null {
  const clean = cleanAreaName(name);
  if (!clean || findArea(state, id)) return null;
  return { type: 'areas', areas: [...state.areas, { id, name: clean }] };
}

/** Renames an area. Null when nothing changes (or the name is empty). */
export function renameAreaOp(state: TasksState, id: AreaId, name: string): Op | null {
  const clean = cleanAreaName(name);
  const area = findArea(state, id);
  if (!clean || !area || area.name === clean) return null;
  return { type: 'areas', areas: state.areas.map((a) => (a.id === id ? { ...a, name: clean } : a)) };
}

/** Moves an area to `index` in the list (counted after it's taken out). Null when nothing changes. */
export function moveAreaOp(state: TasksState, id: AreaId, index: number): Op | null {
  const from = state.areas.findIndex((a) => a.id === id);
  if (from < 0) return null;
  const rest = state.areas.filter((a) => a.id !== id);
  const to = Math.max(0, Math.min(index, rest.length));
  if (to === from) return null;
  return { type: 'areas', areas: [...rest.slice(0, to), state.areas[from]!, ...rest.slice(to)] };
}

/** How many quests (top-level tasks, open, completed or in Trash) an area holds. */
export function questsInArea(state: TasksState, id: AreaId): number {
  let n = 0;
  for (const qid of state.children[ROOT] ?? []) {
    const q = findTask(state, qid);
    if (q && questCategory(q) === id) n++;
  }
  return n;
}

/**
 * Deletes an area, moving every quest in it (open, completed or in Trash)
 * to `into`, as one undo step. Null for the last area (there's always one),
 * an unknown area, or `into` being the same or unknown.
 */
export function deleteAreaOp(state: TasksState, id: AreaId, into: AreaId): Op | null {
  if (state.areas.length <= 1 || id === into || !findArea(state, id) || !findArea(state, into)) return null;
  const changes: FieldChange[] = [];
  for (const qid of state.children[ROOT] ?? []) {
    const q = findTask(state, qid);
    // A quest with no stored category may belong here by derivation (questCategory): move it too.
    if (q && questCategory(q) === id) changes.push({ id: q.id, fields: { category: into } });
  }
  const areas: Op = { type: 'areas', areas: state.areas.filter((a) => a.id !== id) };
  return changes.length ? { type: 'batch', ops: [{ type: 'update', changes }, areas] } : areas;
}
