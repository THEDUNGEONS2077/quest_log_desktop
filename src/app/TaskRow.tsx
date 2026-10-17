/**
 * src/app/TaskRow.tsx: one task in a list (the phone's TaskRow, for mouse
 * and keyboard).
 *
 *   ▸ [ ] SHIP THE Q4 REPORT                         +
 *         !! · ◔ FRI 16:00 · [▓▓░ 1/3 · +34 XP]
 *
 * Layer: UI. A click selects the task (the detail pane shows it); a double
 * click edits its title; right-click opens its menu. The checkbox
 * completes it, the caret opens and closes its objectives, and a quest's
 * `+` adds an objective. The `+` sits right after the title's last word
 * (it wraps with the text) and shows only while the pointer is over the
 * row (2026-10-15; it used to sit at the row's far right).
 *
 * Completing plays the phone's burst: the box pops, a scan line crosses
 * the row, and the XP it earned floats up. A completed quest then holds,
 * slides out and fades, and its space closes, the rows below gliding up
 * (CSS transitions on the row's wrapper, timed like the phone's LINGER_MS),
 * before it moves to COMPLETED.
 *
 * The space closes on a clip layer between the wrapper and the row
 * (`.row-clip`: no padding, border or margin of its own), so it can shrink
 * all the way to nothing. Before (fix 2026-10-15), the row itself was the
 * grid item and its padding, divider and margin (16–21 px) couldn't shrink:
 * the close stalled there and the rest snapped shut when the row was
 * removed.
 */
import { type CSSProperties, memo, type ReactNode, useEffect, useState } from 'react';

import { formatDue, isOverdue, isSameDay } from '@/lib/dates';
import type { Row } from '@/lib/flatten';
import { matchRange } from '@/lib/search';
import { findTask } from '@/lib/taskMap';
import { shownTitle } from '@/lib/title';
import { isInSubtree } from '@/lib/tree';
import type { Task } from '@/lib/types';
import { baseXp, repeatMultiplier } from '@/lib/xp';
import { ADVANCE_MS, type AppStoreInstance } from '@/store/createStore';
import { useActions, useAppStore, useSelectors, useStoreBundle } from '@/store/react';

import { cx } from './cx';
import { sameRow } from './Fold';
import { G } from './glyphs';
import { useDrag } from './drag';
import { useOpenMenu, visibleRows } from './menu';
import { TitleEditor } from './TitleEditor';
import { useMinute } from './useMinute';

/** Counts the times task `id` went from open to done while this row showed it (0 at first). */
export function useJustChecked(id: string, done: boolean): number {
  const [seen, setSeen] = useState({ id, done, count: 0 });
  if (seen.id !== id || seen.done !== done) {
    const count = seen.count + (seen.id === id && !seen.done && done ? 1 : 0);
    setSeen({ id, done, count });
    return count;
  }
  return seen.count;
}

/**
 * A click on a row: selects it (the detail pane shows it). With Ctrl / Cmd it
 * adds or removes it from a multi-selection; with Shift it selects the
 * range from the last selected row (the selection bar then acts on all).
 */
export function pickRow(id: string, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }, s: AppStoreInstance): void {
  const st = s.getState();
  if (e.shiftKey && (st.selection?.length || st.selectedId)) {
    const ids = visibleRows();
    const anchor = st.selection?.[st.selection.length - 1] ?? st.selectedId!;
    const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y);
    if (a! < 0) return st.select(id);
    const range = ids.slice(a, b! + 1);
    st.startSelection(range[0]!);
    for (const r of range.slice(1)) st.toggleSelected(r);
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    if (!st.selection) {
      st.startSelection(st.selectedId && st.selectedId !== id ? st.selectedId : id);
      if (st.selectedId && st.selectedId !== id) s.getState().toggleSelected(id);
    } else st.toggleSelected(id);
    return;
  }
  if (st.selection) st.clearSelection();
  st.select(id);
}

/** The text with the searched-for part marked. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const range = query ? matchRange(text, query) : null;
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range.start)}
      <mark>{text.slice(range.start, range.end)}</mark>
      {text.slice(range.end)}
    </>
  );
}

/** A quest's progress and the XP completing it earns: `[▓▓░ 1/3 · +34 XP]`. */
export function QuestMeter({ task, done, total }: { task: Task; done: number; total: number }) {
  const selectors = useSelectors();
  const subtasks = useAppStore((s) => selectors.subtaskCount(s, task.id));
  const now = useMinute();
  const xp = baseXp(task, subtasks, now);
  return (
    <span className="meter" title={`${done} of ${total} done. Completing it earns ${xp} XP`}>
      {/* Moved by transform (--p, 0–1), so ticking an objective glides it without layout. */}
      <span className="meter-fill" style={{ '--p': total ? done / total : 0 } as CSSProperties} />
      <span className="meter-text">
        {done}/{total} <span className="meter-xp">· +{xp} XP</span>
      </span>
    </span>
  );
}

/** The details line under a title: priority, streak, notes, due date, progress. */
export function RowMeta({ task, row }: { task: Task; row?: Row }) {
  const now = useMinute();
  const notesOpen = useAppStore((s) => s.expandedNotes.includes(task.id));
  const actions = useActions();
  const parts: ReactNode[] = [];
  if (task.priority > 0) parts.push(<span key="p" className={cx('prio', `prio-${task.priority}`)}>{G.priority.repeat(task.priority)}</span>);
  if (task.repeat && (task.streak ?? 0) > 0) parts.push(<span key="s" className="accent">×{repeatMultiplier(task.streak!).toFixed(1)}</span>);
  if (task.notes)
    parts.push(
      <button
        key="n"
        type="button"
        className="meta-btn"
        title="Show or hide notes"
        // A glyph alone says nothing to a screen reader (V1 pass 2026-10-17).
        aria-label={`Notes: ${shownTitle(task)}`}
        aria-expanded={notesOpen}
        onClick={(e) => {
          e.stopPropagation();
          actions.toggleNotes(task.id);
        }}
      >
        {G.notes}
      </button>,
    );
  if (task.dueAt !== null) {
    const late = isOverdue(task.dueAt, task.done, now);
    // Due later today (open): a step brighter than other dates; overdue is accent.
    const today = !late && !task.done && isSameDay(task.dueAt, now);
    parts.push(
      <span key="d" className={cx('due', late && 'overdue', today && 'today')}>
        {G.due}
        {task.repeat ? ` ${G.repeat}` : ''} {late ? 'OVERDUE · ' : ''}
        {formatDue(task.dueAt, now)}
      </span>,
    );
  }
  if (row?.hasChildren) parts.push(<QuestMeter key="m" task={task} done={row.progress.done} total={row.progress.total} />);
  if (!parts.length) return null;
  return <div className="meta">{parts}</div>;
}

interface Props {
  row: Row;
  /** Search text to mark in the title. */
  query?: string;
  /** Shown only as the path to a search match: dimmed. */
  context?: boolean;
  /** Has a drag handle (the quest list, not search results). */
  draggable?: boolean;
}

/** A row's on/off states, as bits of one number (see TaskRow). */
const SELECTED = 1;
const MULTI = 2;
const NOTES_OPEN = 4;
const LEAVING = 8;
const ADVANCING = 16;

export const TaskRow = memo(function TaskRow({ row, query = '', context = false, draggable = false }: Props) {
  // What this row reads from the store, in four subscriptions that each return a plain value
  // (compared at once): every store change runs them for every row, so they stay cheap. The
  // on/off states are packed into one number (speed pass 2026-10-17).
  const task = useAppStore((s) => findTask(s.tasks, row.id));
  const editing = useAppStore((s) => (s.editingId === row.id ? s.editingField : null));
  const gain = useAppStore((s) => (s.lastGain?.id === row.id ? s.lastGain.xp : 0));
  const flags = useAppStore(
    (s) =>
      (s.selectedId === row.id ? SELECTED : 0) |
      (s.selection?.includes(row.id) ? MULTI : 0) |
      (s.expandedNotes.includes(row.id) ? NOTES_OPEN : 0) |
      (s.lingering.length > 0 && s.lingering.some((l) => isInSubtree(s.tasks, row.id, l)) ? LEAVING : 0) |
      (s.advancing.includes(row.id) ? ADVANCING : 0),
  );
  const selected = (flags & SELECTED) !== 0;
  const multi = (flags & MULTI) !== 0;
  const notesOpen = (flags & NOTES_OPEN) !== 0;
  const leaving = (flags & LEAVING) !== 0;
  const advancing = (flags & ADVANCING) !== 0;
  const actions = useActions();
  const { store } = useStoreBundle();
  const openMenu = useOpenMenu();
  const fire = useJustChecked(row.id, !!task?.done || advancing);
  const drag = useDrag();
  // A repeating task just checked: struck for a moment, then back with its next date.
  useEffect(() => {
    if (!advancing) return;
    const t = setTimeout(() => actions.releaseAdvancing(row.id), ADVANCE_MS);
    return () => clearTimeout(t);
  }, [advancing, actions, row.id]);
  if (!task) return null;

  const isQuest = task.parentId === null;
  const title = shownTitle(task);
  const toggle = () => {
    actions.select(task.id);
    actions.toggleDone(task.id);
  };

  return (
    <div className={cx('row-wrap', leaving && 'leaving')}>
      <div className="row-clip">
      <div
        className={cx(
          'row',
          isQuest && 'quest',
          // Every quest has its divider, the first too (QuestList tucks the first one out of sight),
          // so when the top quest leaves its divider closes with it instead of the next one's snapping away.
          isQuest && 'quest-gap',
          selected && 'selected',
          editing && 'editing',
          (task.done || advancing) && 'done',
          context && 'context',
          drag.dragging.has(row.id) && 'dragged',
          multi && 'multi',
        )}
        style={{ paddingLeft: `calc(var(--s-lg) + ${Math.min(row.depth, 8)} * var(--indent))` }}
        data-id={task.id}
        data-depth={row.depth}
        onClick={(e) => pickRow(task.id, e, store)}
        onDoubleClick={() => actions.setEditing(task.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          actions.select(task.id);
          openMenu(task.id, e.clientX, e.clientY);
        }}
      >
        {fire > 0 && <span key={`scan-${fire}`} className="scan" aria-hidden />}
        {draggable && !editing && (
          <span className="handle" title="Drag to move (sideways to nest)" onPointerDown={(e) => drag.start(task.id, row.depth, e)} aria-hidden>
            ⋮
          </span>
        )}
        <button
          type="button"
          className={cx('caret', !task.collapsed && 'open', !row.hasChildren && 'hidden')}
          tabIndex={-1}
          disabled={!row.hasChildren}
          aria-label={`${task.collapsed ? 'Expand' : 'Collapse'} ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            actions.toggleCollapsed(task.id);
          }}
        >
          {G.caret}
        </button>
        <button
          type="button"
          className="check"
          role="checkbox"
          aria-checked={task.done}
          aria-label={`${task.done ? 'Uncheck' : 'Complete'} ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
        >
          <span key={`pop-${fire}`} className={cx(fire > 0 && 'pop')}>
            {task.done ? G.checkboxOn : G.checkboxOff}
          </span>
        </button>
        <div className="title-col">
          {editing === 'title' ? (
            <TitleEditor id={task.id} className={cx('title', isQuest && 'quest-title')} />
          ) : (
            // The title, then (a quest's) `+` right after its last word, shown on hover.
            <div className="title-line">
              <span className={cx('title', isQuest && 'quest-title')}>
                <Highlighted text={title || 'Untitled'} query={query} />
              </span>
              {isQuest && (
                <button
                  type="button"
                  className="add-sub"
                  title="Add an objective (or Alt+Enter while editing)"
                  aria-label={`Add an objective to ${title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.addSubtask(task.id);
                  }}
                >
                  {G.add}
                </button>
              )}
            </div>
          )}
          <RowMeta task={task} row={row} />
          {notesOpen && task.notes && <div className="notes">{task.notes}</div>}
        </div>
        {fire > 0 && gain > 0 && (
          <span key={`xp-${fire}`} className="xp-float" aria-hidden>
            +{gain} XP
          </span>
        )}
      </div>
      </div>
    </div>
  );
}, (a, b) => sameRow(a.row, b.row) && a.query === b.query && a.context === b.context && a.draggable === b.draggable);
