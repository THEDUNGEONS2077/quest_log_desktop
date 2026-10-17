/**
 * store/onboarding.ts: first-run tips and the "What's new" marker
 * (PLAN §9.19).
 *
 * Layer: store. Persisted as `onboarding.v1`. loadJSON fills in defaults
 * for missing fields, so adding a field needs no migration.
 *
 * Tips are one-line toasts, each shown once, in order. A tip waits until
 * the moment it's useful (its `when`), and the next one waits for it.
 */
import { childIds } from '@/lib/tree';
import { findTask } from '@/lib/taskMap';
import type { TasksState } from '@/lib/types';

export interface Onboarding {
  /** IDs of the tips already shown. */
  tipsSeen: string[];
  /**
   * The app build whose "What's new" was last shown (or skipped as a fresh
   * install). null: never recorded (a fresh install, or an update from a
   * build before 0.10.0).
   */
  lastSeenBuild: number | null;
  /** When the tasks were last exported to a backup file (desktop V1 pass 2026-10-17); null: never. */
  lastBackupAt: number | null;
  /** When the backup reminder last showed (it waits a week before showing again). */
  backupNudgedAt: number | null;
}

export const DEFAULT_ONBOARDING: Onboarding = { tipsSeen: [], lastSeenBuild: null, lastBackupAt: null, backupNudgedAt: null };

/** No backup for this long (ms), with tasks that old: the reminder shows. */
export const BACKUP_DUE_MS = 14 * 86_400_000;
/** The reminder shows at most this often (ms). */
export const BACKUP_NUDGE_EVERY_MS = 7 * 86_400_000;

/** What a tip's condition can look at. */
export interface TipContext {
  tasks: TasksState;
  editing: boolean;
  swipeActions: boolean;
}

export interface Tip {
  id: string;
  message: string;
  /** True when now is a good moment for this tip. */
  when: (c: TipContext) => boolean;
}

/** Open top-level tasks, counting at most `max` (cheap on big lists). */
function openTopLevel(tasks: TasksState, max: number): number {
  let n = 0;
  for (const id of childIds(tasks, null)) {
    const t = findTask(tasks, id);
    if (t && !t.done && t.deletedAt === null && ++n >= max) break;
  }
  return n;
}

/** The first-run tips, in the order they're shown (PLAN §9.19, adapted to the current gestures). */
export const TIPS: readonly Tip[] = [
  { id: 'tap-edit', message: 'TIP: TAP A TASK TO EDIT IT', when: (c) => !c.editing && openTopLevel(c.tasks, 1) >= 1 },
  { id: 'enter', message: 'TIP: ENTER SAVES · BACKSPACE ON AN EMPTY TASK DELETES IT', when: (c) => c.editing },
  { id: 'hold', message: 'TIP: HOLD A TASK TO DRAG IT · KEEP STILL FOR MORE', when: (c) => !c.editing && openTopLevel(c.tasks, 2) >= 2 },
  {
    id: 'swipe',
    message: 'TIP: SWIPE RIGHT TO COMPLETE · LEFT TO DELETE',
    when: (c) => !c.editing && c.swipeActions && openTopLevel(c.tasks, 1) >= 1,
  },
];

/** The next tip to show now, or null (the next unseen tip isn't due yet, or all are seen). */
export function nextTip(seen: readonly string[], c: TipContext): Tip | null {
  const tip = TIPS.find((t) => !seen.includes(t.id));
  return tip && tip.when(c) ? tip : null;
}
