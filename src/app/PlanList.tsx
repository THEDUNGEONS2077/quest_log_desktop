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
import { memo, useEffect, useId } from 'react';

import { addDays, formatDue, formatTime, isSameDay } from '@/lib/dates';
import type { PlanDay, PlanRow } from '@/lib/plan';
import { findTask, forEachTask } from '@/lib/taskMap';
import type { TasksState } from '@/lib/types';
import { shownTitle } from '@/lib/title';
import { useActions, useAppStore, useSelectors } from '@/store/react';

import { cx } from './cx';
import { G } from './glyphs';
import { setVisibleRows, useOpenMenu } from './menu';
import { useJustChecked } from './TaskRow';
import { TitleEditor } from './TitleEditor';
import { useMinute } from './useMinute';
import { Prompted } from './Prompted';
import { useBlank, Welcome } from './Welcome';

/** Tasks completed on `now`'s day, counted once per task tree and minute (a new tree after each change). */
const doneCounts = new WeakMap<TasksState, { at: number; n: number }>();
function doneOn(tasks: TasksState, now: number): number {
  const hit = doneCounts.get(tasks);
  if (hit && hit.at === now) return hit.n;
  let n = 0;
  forEachTask(tasks, (t) => {
    if (t.done && t.deletedAt === null && t.doneAt !== null && isSameDay(t.doneAt, now)) n++;
  });
  doneCounts.set(tasks, { at: now, n });
  return n;
}

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** "TUE 13 OCT"; the day after `now` reads "TOMORROW · TUE 13 OCT" (V1.1 pass 2026-10-17: the nearest day by name). */
export function dayLabel(day: number, now?: number): string {
  const label = DAY.format(day).replace(/,/g, '').toUpperCase();
  return now !== undefined && isSameDay(day, addDays(now, 1)) ? `TOMORROW · ${label}` : label;
}

export function TodayList() {
  const selectors = useSelectors();
  const now = useMinute();
  const rows = useAppStore((s) => selectors.todayRows(s, now));
  const doneToday = useAppStore((s) => doneOn(s.tasks, now));
  const blank = useBlank();
  useEffect(() => setVisibleRows(rows.map((r) => r.id)), [rows]);
  const overdue = rows.filter((r) => r.overdue);
  const today = rows.filter((r) => !r.overdue);
  if (blank) return <Welcome />;
  // Nothing left, after a day's work: say so, not "give tasks a date" (V1.1 refinement).
  if (!rows.length && doneToday > 0)
    return (
      <p className="empty all-clear">
        <Prompted>
          ALL CLEAR FOR TODAY · {doneToday} {doneToday === 1 ? 'TASK' : 'TASKS'} DONE
        </Prompted>
      </p>
    );
  if (!rows.length) return <p className="empty"><Prompted>NOTHING DUE TODAY. GIVE TASKS A DATE (@fri, @today 3pm) TO SEE THEM HERE.</Prompted></p>;
  return (
    <div className="list plan">
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
  if (!days.length) return <p className="empty"><Prompted>NOTHING DUE IN THE NEXT 14 DAYS.</Prompted></p>;
  return (
    <div className="list plan">
      {days.map((d: PlanDay) => (
        <Section key={d.key} title={dayLabel(d.day, now)} rows={d.rows} />
      ))}
    </div>
  );
}

/**
 * A day (or OVERDUE / TODAY): its heading with how many tasks it holds, then
 * its tasks, as a list named by the heading (screen readers announce both).
 */
function Section({ title, rows, late = false }: { title: string; rows: PlanRow[]; late?: boolean }) {
  const id = useId();
  return (
    <section className="plan-section" aria-labelledby={id}>
      <h2 id={id} className={cx('section-title', late && 'overdue')}>
        {title}
        <span className="section-count"> · {rows.length}</span>
      </h2>
      <div role="list">
        {rows.map((r) => (
          <PlanTaskRow key={r.id} row={r} />
        ))}
      </div>
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
      role="listitem"
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
        {/* A quest looks as it does on its own list (capitals, bold): the same thing, everywhere. */}
        {editing ? (
          <TitleEditor id={task.id} className={cx('title', task.parentId === null && 'quest-title')} />
        ) : (
          <span className={cx('title', task.parentId === null && 'quest-title')}>{shownTitle(task) || 'Untitled'}</span>
        )}
        <div className="meta path">
          {/* Priority first, as on the lists: what to do first stands out in a day's tasks too. */}
          {task.priority > 0 && <span className={cx('prio', `prio-${task.priority}`)}>{G.priority.repeat(task.priority)}</span>}
          <span>{row.path.join(' › ')}</span>
        </div>
      </div>
      <span className={cx('due', row.overdue && 'overdue', !row.overdue && isSameDay(row.dueAt, now) && 'today')}>
        {/* Today: the time is enough; overdue from an earlier day: the date too. */}
        {G.due} {row.overdue ? formatDue(row.dueAt, now) : formatTime(row.dueAt)}
      </span>
    </div>
  );
});
