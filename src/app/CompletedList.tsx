/**
 * src/app/CompletedList.tsx: finished quests of the area shown (or ALL),
 * newest first (the phone's COMPLETED tab).
 *
 * Layer: UI. A quest's objectives stay folded unless opened (the caret).
 * The checkbox restores a task to where it was; right-click offers Restore,
 * Run again and Delete. Each row shows when it was finished and the XP it
 * earned.
 */
import { memo, useEffect } from 'react';

import { formatRelative } from '@/lib/dates';
import type { Row } from '@/lib/flatten';
import { findTask } from '@/lib/taskMap';
import { shownTitle } from '@/lib/title';
import { useActions, useAppStore, useSelectors } from '@/store/react';

import { cx } from './cx';
import { G } from './glyphs';
import { setVisibleRows, useOpenMenu } from './menu';
import { useMinute } from './useMinute';
import { Prompted } from './Prompted';

export function CompletedList() {
  const selectors = useSelectors();
  const rows = useAppStore((s) => selectors.completedRows(s));
  useEffect(() => setVisibleRows(rows.map((r) => r.id)), [rows]);
  if (!rows.length) return <p className="empty"><Prompted>NOTHING COMPLETED YET.</Prompted></p>;
  return (
    <div className="list" role="list">
      {rows.map((row, i) => (
        <CompletedRow key={row.id} row={row} first={i === 0} />
      ))}
    </div>
  );
}

const CompletedRow = memo(function CompletedRow({ row, first }: { row: Row; first: boolean }) {
  const task = useAppStore((s) => findTask(s.tasks, row.id));
  const expanded = useAppStore((s) => s.ui.completedExpanded.includes(row.id));
  const selected = useAppStore((s) => s.selectedId === row.id);
  const actions = useActions();
  const openMenu = useOpenMenu();
  const now = useMinute();
  if (!task) return null;
  const isQuest = task.parentId === null;
  const title = shownTitle(task);
  return (
    <div
      className={cx('row', 'done', isQuest && 'quest', isQuest && !first && 'quest-gap', selected && 'selected')}
      style={{ paddingLeft: `calc(var(--s-lg) + ${Math.min(row.depth, 8)} * var(--indent))` }}
      data-id={task.id}
      onClick={() => actions.select(task.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        actions.select(task.id);
        openMenu(task.id, e.clientX, e.clientY);
      }}
    >
      <button
        type="button"
        className={cx('caret', expanded && 'open', !row.hasChildren && 'hidden')}
        tabIndex={-1}
        disabled={!row.hasChildren}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          actions.toggleCompletedExpanded(task.id);
        }}
      >
        {G.caret}
      </button>
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked
        aria-label={`Restore ${title}`}
        title="Restore"
        onClick={(e) => {
          e.stopPropagation();
          actions.restoreTask(task.id);
        }}
      >
        {G.checkboxOn}
      </button>
      <div className="title-col">
        <span className={cx('title', isQuest && 'quest-title')}>{title || 'Untitled'}</span>
        <div className="meta">
          {task.repeatSourceId !== null && <span>{G.repeat}</span>}
          {task.doneAt !== null && <span>{formatRelative(task.doneAt, now)}</span>}
          {!!task.xp && <span className="accent">+{task.xp} XP</span>}
        </div>
      </div>
    </div>
  );
});
