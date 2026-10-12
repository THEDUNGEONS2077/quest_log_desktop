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
 * `+` adds an objective.
 *
 * Completing plays the phone's burst: the box pops, a scan line crosses
 * the row, and the XP it earned floats up. A completed quest then holds,
 * slides out and fades, and its space closes, the rows below gliding up
 * (CSS transitions on the row's wrapper, timed like the phone's LINGER_MS),
 * before it moves to COMPLETED.
 */
import { type CSSProperties, memo, type ReactNode, useEffect, useState } from 'react';

import { formatDue, isOverdue } from '@/lib/dates';
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
    parts.push(
      <span key="d" className={cx('due', late && 'overdue')}>
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
  first?: boolean;
  /** Search text to mark in the title. */
  query?: string;
  /** Shown only as the path to a search match: dimmed. */
  context?: boolean;
  /** Has a drag handle (the quest list, not search results). */
  draggable?: boolean;
}

export const TaskRow = memo(function TaskRow({ row, first = false, query = '', context = false, draggable = false }: Props) {
  const task = useAppStore((s) => findTask(s.tasks, row.id));
  const editing = useAppStore((s) => (s.editingId === row.id ? s.editingField : null));
  const selected = useAppStore((s) => s.selectedId === row.id);
  const multi = useAppStore((s) => !!s.selection?.includes(row.id));
  const notesOpen = useAppStore((s) => s.expandedNotes.includes(row.id));
  const leaving = useAppStore((s) => s.lingering.some((l) => isInSubtree(s.tasks, row.id, l)));
  const advancing = useAppStore((s) => s.advancing.includes(row.id));
  const gain = useAppStore((s) => (s.lastGain?.id === row.id ? s.lastGain.xp : 0));
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
      <div
        className={cx(
          'row',
          isQuest && 'quest',
          isQuest && !first && 'quest-gap',
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
            <span className={cx('title', isQuest && 'quest-title')}>
              <Highlighted text={title || 'Untitled'} query={query} />
            </span>
          )}
          <RowMeta task={task} row={row} />
          {notesOpen && task.notes && <div className="notes">{task.notes}</div>}
        </div>
        {isQuest && (
          <button
            type="button"
            className="add-sub"
            title="Add an objective"
            aria-label={`Add an objective to ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              actions.addSubtask(task.id);
            }}
          >
            {G.add}
          </button>
        )}
        {fire > 0 && gain > 0 && (
          <span key={`xp-${fire}`} className="xp-float" aria-hidden>
            +{gain} XP
          </span>
        )}
      </div>
    </div>
  );
});
