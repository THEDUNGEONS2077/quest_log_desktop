/**
 * src/app/PlanList.tsx: the planning views, TODAY and UPCOMING (lib/plan.ts).
 *
 *   > TODAY · MON 12 OCT
 *   OVERDUE
 *   [ ] Send invoice                 MAIN › Q4 billing        ◔ FRI 16:00
 *   TODAY
 *   [ ] Review the deck              ACME › Pitch             ◔ 14:00
 *
 * Layer: UI. Every task with a due date, at any depth and in every area,
 * as one list: what to work on, wherever it lives. Each row shows its path
 * (area › project › parent), so it reads on its own. A click selects it
 * (the detail pane opens it), a double click edits its title, and the
 * checkbox completes it, right here.
 */
import { memo, useEffect } from 'react';

import { formatDue, formatTime } from '@/lib/dates';
import type { PlanDay, PlanRow } from '@/lib/plan';
import { findTask } from '@/lib/taskMap';
import { shownTitle } from '@/lib/title';
import { useActions, useAppStore, useSelectors } from '@/store/react';

import { cx } from './cx';
import { G } from './glyphs';
import { setVisibleRows, useOpenMenu } from './menu';
import { useJustChecked } from './TaskRow';
import { TitleEditor } from './TitleEditor';
import { useMinute } from './useMinute';

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** "TUE 13 OCT". */
export function dayLabel(day: number): string {
  return DAY.format(day).replace(/,/g, '').toUpperCase();
}

export function TodayList() {
  const selectors = useSelectors();
  const now = useMinute();
  const rows = useAppStore((s) => selectors.todayRows(s, now));
  useEffect(() => setVisibleRows(rows.map((r) => r.id)), [rows]);
  const overdue = rows.filter((r) => r.overdue);
  const today = rows.filter((r) => !r.overdue);
  if (!rows.length) return <p className="empty">{'> NOTHING DUE TODAY. GIVE TASKS A DATE (@fri, @today 3pm) TO SEE THEM HERE.'}</p>;
  return (
    <div className="list plan" role="list">
      {overdue.length > 0 && <Section title="OVERDUE" rows={overdue} late />}
      {today.length > 0 && <Section title="TODAY" rows={today} />}
    </div>
  );
}

export function UpcomingList() {
  const selectors = useSelectors();
  const now = useMinute();
  const days = useAppStore((s) => selectors.upcomingDays(s, now));
  useEffect(() => setVisibleRows(days.flatMap((d) => d.rows.map((r) => r.id))), [days]);
  if (!days.length) return <p className="empty">{'> NOTHING DUE IN THE NEXT 14 DAYS.'}</p>;
  return (
    <div className="list plan" role="list">
      {days.map((d: PlanDay) => (
        <Section key={d.key} title={dayLabel(d.day)} rows={d.rows} />
      ))}
    </div>
  );
}

function Section({ title, rows, late = false }: { title: string; rows: PlanRow[]; late?: boolean }) {
  return (
    <section className="plan-section">
      <h3 className={cx('section-title', late && 'overdue')}>{title}</h3>
      {rows.map((r) => (
        <PlanTaskRow key={r.id} row={r} />
      ))}
    </section>
  );
}

const PlanTaskRow = memo(function PlanTaskRow({ row }: { row: PlanRow }) {
  const task = useAppStore((s) => findTask(s.tasks, row.id));
  const selected = useAppStore((s) => s.selectedId === row.id);
  const editing = useAppStore((s) => s.editingId === row.id && s.editingField === 'title');
  const actions = useActions();
  const openMenu = useOpenMenu();
  const fire = useJustChecked(row.id, !!task?.done);
  const now = useMinute();
  if (!task) return null;
  return (
    <div
      className={cx('row', 'plan-row', selected && 'selected', task.done && 'done')}
      data-id={task.id}
      onClick={() => actions.select(task.id)}
      onDoubleClick={() => actions.setEditing(task.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        actions.select(task.id);
        openMenu(task.id, e.clientX, e.clientY);
      }}
    >
      {fire > 0 && <span key={`scan-${fire}`} className="scan" aria-hidden />}
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`Complete ${task.title}`}
        onClick={(e) => {
          e.stopPropagation();
          actions.select(task.id);
          actions.toggleDone(task.id);
        }}
      >
        <span key={`pop-${fire}`} className={cx(fire > 0 && 'pop')}>
          {task.done ? G.checkboxOn : G.checkboxOff}
        </span>
      </button>
      <div className="title-col">
        {editing ? <TitleEditor id={task.id} className="title" /> : <span className="title">{shownTitle(task) || 'Untitled'}</span>}
        <div className="meta path">{row.path.join(' › ')}</div>
      </div>
      <span className={cx('due', row.overdue && 'overdue')}>
        {/* Today: the time is enough; overdue from an earlier day: the date too. */}
        {G.due} {row.overdue ? formatDue(row.dueAt, now) : formatTime(row.dueAt)}
      </span>
    </div>
  );
});
