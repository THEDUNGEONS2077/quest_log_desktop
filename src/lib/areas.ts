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
 *
 * Deleting an area sends it to ARCHIVES (2026-10-12) with its quests: it's
 * marked `archivedAt` and kept at the end of the list, after every live
 * area (so a live area's index in the list is its place in the sidebar).
 * From ARCHIVES it can be restored, or deleted for good: its quests go to
 * Trash, moved to the first live area so a restore from Trash has a home.
 */
import { sequence } from './bulk';
import { type FieldChange, type Op, softDelete } from './ops';
import { questCategory } from './quests';
import { findTask } from './taskMap';
import { type Area, type AreaId, ROOT, type TasksState } from './types';

/** Longest area name. */
export const AREA_NAME_MAX = 32;

/** A name as stored: trimmed, inner spaces collapsed, cut to AREA_NAME_MAX. Empty if nothing's left. */
export function cleanAreaName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, AREA_NAME_MAX);
}

/** The live (not archived) areas, in sidebar order. */
export function liveAreas(state: TasksState): Area[] {
  return state.areas.filter((a) => a.archivedAt === undefined);
}

/** The areas in ARCHIVES, in the order they were archived. */
export function archivedAreas(state: TasksState): Area[] {
  return state.areas.filter((a) => a.archivedAt !== undefined);
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

/**
 * Moves an area to `index` in the list (counted after it's taken out). A
 * live area stays among the live ones (before ARCHIVES). Null when nothing
 * changes.
 */
export function moveAreaOp(state: TasksState, id: AreaId, index: number): Op | null {
  const from = state.areas.findIndex((a) => a.id === id);
  if (from < 0) return null;
  const rest = state.areas.filter((a) => a.id !== id);
  const last = state.areas[from]!.archivedAt === undefined ? liveAreas(state).length - 1 : rest.length;
  const to = Math.max(0, Math.min(index, last));
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

/**
 * Deletes an area to ARCHIVES, with its quests, as of `at`. It moves to the
 * end of the list. Null for an unknown or already archived area, or the
 * last live one (there's always one to add quests to).
 */
export function archiveAreaOp(state: TasksState, id: AreaId, at: number): Op | null {
  const area = findArea(state, id);
  if (!area || area.archivedAt !== undefined || liveAreas(state).length <= 1) return null;
  return { type: 'areas', areas: [...state.areas.filter((a) => a.id !== id), { ...area, archivedAt: at }] };
}

/** Brings an archived area back, after the live areas. Null if it isn't archived. */
export function restoreAreaOp(state: TasksState, id: AreaId): Op | null {
  const area = findArea(state, id);
  if (!area || area.archivedAt === undefined) return null;
  const rest = state.areas.filter((a) => a.id !== id);
  const at = rest.filter((a) => a.archivedAt === undefined).length;
  const { archivedAt: _gone, ...live } = area;
  return { type: 'areas', areas: [...rest.slice(0, at), live, ...rest.slice(at)] };
}

/**
 * Deletes an archived area for good, as one undo step: its quests not
 * already in Trash go there (as of `at`), every quest of it moves to the
 * first live area (so a restore from Trash lands somewhere real), and the
 * area is removed. Null unless the area is archived.
 */
export function deleteAreaForeverOp(state: TasksState, id: AreaId, at: number): Op | null {
  const area = findArea(state, id);
  const into = liveAreas(state)[0];
  if (!area || area.archivedAt === undefined || !into) return null;
  const quests = (state.children[ROOT] ?? []).filter((qid) => {
    const q = findTask(state, qid);
    return q && q.deletedAt === null && questCategory(q) === id;
  });
  return sequence(state, [...quests.map((qid) => (s: TasksState) => softDelete(s, qid, at)), (s) => deleteAreaOp(s, id, into.id)]);
}

/**
 * Repair (desktop 0.1.0 didn't save new areas, so they were gone after a
 * reopen while their quests stayed): every area a quest belongs to but the
 * list doesn't have comes back, after the live areas, named by `nameOf`
 * (from an older copy such as a daily snapshot) or RECOVERED 1, 2… Null when
 * nothing is missing. Run at launch, outside undo history (not a user action).
 */
export function restoreMissingAreasOp(state: TasksState, nameOf: (id: AreaId) => string | undefined): Op | null {
  const known = new Set(state.areas.map((a) => a.id));
  const missing: Area[] = [];
  for (const qid of state.children[ROOT] ?? []) {
    const q = findTask(state, qid);
    if (!q) continue;
    const id = questCategory(q);
    if (known.has(id)) continue;
    known.add(id);
    missing.push({ id, name: cleanAreaName(nameOf(id) ?? '') || `RECOVERED ${missing.length + 1}` });
  }
  if (!missing.length) return null;
  const live = liveAreas(state).length;
  return { type: 'areas', areas: [...state.areas.slice(0, live), ...missing, ...state.areas.slice(live)] };
}
