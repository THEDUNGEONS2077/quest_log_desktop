/**
 * src/app/DetailPane.tsx: the right column, the selected task in full.
 *
 *   MAIN › Q4 REPORT                                   ✕
 *   [ ] Draft the summary
 *   AREA      [ MAIN ▾ ]                  (quests)
 *   PRIORITY  [ — ][ ! ][ !! ][ !!! ]
 *   DUE       [ 2026-10-16 ][ 16:00 ]  TODAY · TOMORROW · NEXT WEEK · CLEAR
 *   REPEAT    [ none ▾ ]
 *   NOTES     …
 *   OBJECTIVES 1/3
 *     [x] Pull the numbers
 *     [ ] Write it up
 *     > add objective
 *   +34 XP on completion · made 3d · changed 2h
 *   [ OPEN ]  [ COMPLETE ]  [ DELETE ]
 *
 * Layer: UI. Everything about a task in one place, editable in place: what
 * the phone spreads over the row, the hold menu and the date and repeat
 * sheets. Typing in the title or notes is one undo step per visit.
 * Clicking an objective selects it (its own details); `↑` goes back up.
 */
import { type ReactNode, useState } from 'react';

import { areaName } from '@/lib/areaNames';
import { atTimeOfDay, addDays, formatRelative, minutesOfDay, startOfDay } from '@/lib/dates';
import { questCategory } from '@/lib/quests';
import { PRESETS, repeatLabel } from '@/lib/recurrence';
import { findTask } from '@/lib/taskMap';
import { shownTitle } from '@/lib/title';
import { ancestors, liveChildIds } from '@/lib/tree';
import type { Priority, RepeatRule, Task } from '@/lib/types';
import { previewXp } from '@/lib/xp';
import { useActions, useAppStore } from '@/store/react';

import { cx } from './cx';
import { G } from './glyphs';
import { useMinute } from './useMinute';

/** The repeat choices offered (the phone's presets), by key. */
const REPEATS: { key: keyof typeof PRESETS | 'none'; label: string }[] = [
  { key: 'none', label: 'Does not repeat' },
  { key: 'daily', label: 'Every day' },
  { key: 'weekdays', label: 'Every weekday' },
  { key: 'weekly', label: 'Every week' },
  { key: 'monthly', label: 'Every month' },
  { key: 'yearly', label: 'Every year' },
];

/** Which preset a rule is (or null for a custom rule made on the phone). */
function presetOf(rule: RepeatRule | null): string | null {
  if (!rule) return 'none';
  for (const [k, p] of Object.entries(PRESETS)) {
    if (p.freq === rule.freq && p.interval === rule.interval && JSON.stringify(('weekdays' in p && p.weekdays) || null) === JSON.stringify(rule.weekdays ?? null)) return k;
  }
  return null;
}

/** "5m ago", "3d ago", or "just now". */
function ago(ts: number, now: number): string {
  const r = formatRelative(ts, now);
  return r === 'NOW' ? 'just now' : `${r.toLowerCase()} ago`;
}

/** "2026-10-16" for a date input. */
function isoDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "16:00" for a time input. */
function isoTime(ts: number): string {
  const m = minutesOfDay(ts);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function DetailPane() {
  const id = useAppStore((s) => s.selectedId);
  const task = useAppStore((s) => (id ? findTask(s.tasks, id) : undefined));
  const actions = useActions();
  if (!id || !task || task.deletedAt !== null) {
    return (
      <aside className="detail empty-detail" aria-label="Task details">
        <p className="dim">{'> SELECT A TASK TO SEE ITS DETAILS.'}</p>
        <p className="dim small">Click a task. Double-click (or Enter) edits its title. Right-click for more.</p>
      </aside>
    );
  }
  return (
    <aside className="detail" aria-label="Task details">
      <Details key={task.id} task={task} onClose={() => actions.select(null)} />
    </aside>
  );
}

function Details({ task, onClose }: { task: Task; onClose: () => void }) {
  const tasks = useAppStore((s) => s.tasks);
  const defaultTime = useAppStore((s) => s.settings.defaultTimeMinutes);
  const actions = useActions();
  const now = useMinute();
  const [newObjective, setNewObjective] = useState('');
  const isQuest = task.parentId === null;
  const chain = ancestors(tasks, task.id).reverse();
  const quest = chain.length ? findTask(tasks, chain[0]!)! : task;
  const kids = liveChildIds(tasks, task.id).map((c) => findTask(tasks, c)!);
  const done = kids.filter((k) => k.done).length;
  const repeat = presetOf(task.repeat);

  /** Sets the date part, keeping the time (or the default time if there's no date yet). */
  const setDay = (iso: string) => {
    if (!iso) return actions.clearDue(task.id);
    const [y, m, d] = iso.split('-').map(Number);
    const day = new Date(y!, m! - 1, d!).getTime();
    actions.setDue(task.id, atTimeOfDay(day, task.dueAt !== null ? minutesOfDay(task.dueAt) : defaultTime), false);
  };
  /** Sets the time part, on the date set (or today). */
  const setTime = (hhmm: string) => {
    if (!hhmm) return;
    const [h, mm] = hhmm.split(':').map(Number);
    actions.setDue(task.id, atTimeOfDay(startOfDay(task.dueAt ?? now), h! * 60 + mm!), false);
  };

  return (
    <div className="details">
      <div className="detail-head">
        <nav className="detail-path" aria-label="Where it is">
          <span className="dim">{areaName(tasks, questCategory(quest)).toUpperCase()}</span>
          {chain.map((a) => (
            <span key={a}>
              <span className="dim"> › </span>
              <button type="button" className="link" onClick={() => actions.select(a)}>
                {shownTitle(findTask(tasks, a)!) || 'Untitled'}
              </button>
            </span>
          ))}
        </nav>
        <button type="button" className="icon-btn" aria-label="Close details (Esc)" onClick={onClose}>
          {G.delete}
        </button>
      </div>

      <div className="detail-title-row">
        <button
          type="button"
          className="check"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? 'Restore' : 'Complete'}
          onClick={() => (task.done ? actions.restoreTask(task.id) : void actions.toggleDone(task.id))}
        >
          {task.done ? G.checkboxOn : G.checkboxOff}
        </button>
        <textarea
          className={cx('detail-title', isQuest && 'quest-title')}
          rows={1}
          value={task.title}
          placeholder="Untitled"
          aria-label="Title"
          onChange={(e) => actions.updateTitle(task.id, e.target.value.replace(/\n/g, ' '))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
            e.stopPropagation();
          }}
        />
      </div>

      <dl className="fields">
        {isQuest && (
          <Field label="AREA">
            <select value={questCategory(task)} onChange={(e) => actions.setQuestCategory(task.id, e.target.value)} aria-label="Area">
              {tasks.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="PRIORITY">
          <div className="seg" role="radiogroup" aria-label="Priority">
            {([0, 1, 2, 3] as Priority[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={task.priority === p} className={cx('seg-btn', task.priority === p && 'on', p === 3 && 'high')} onClick={() => actions.setPriority(task.id, p)}>
                {p === 0 ? '—' : '!'.repeat(p)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="DUE">
          <div className="due-inputs">
            <input type="date" value={task.dueAt !== null ? isoDay(task.dueAt) : ''} onChange={(e) => setDay(e.target.value)} aria-label="Due date" />
            <input type="time" value={task.dueAt !== null ? isoTime(task.dueAt) : ''} onChange={(e) => setTime(e.target.value)} aria-label="Due time" disabled={task.dueAt === null} />
          </div>
          <div className="presets">
            <button type="button" className="link" onClick={() => actions.setDue(task.id, atTimeOfDay(now, defaultTime) > now ? atTimeOfDay(now, defaultTime) : atTimeOfDay(now, 17 * 60), false)}>
              TODAY
            </button>
            <button type="button" className="link" onClick={() => actions.setDue(task.id, atTimeOfDay(addDays(now, 1), defaultTime), false)}>
              TOMORROW
            </button>
            <button type="button" className="link" onClick={() => actions.setDue(task.id, atTimeOfDay(addDays(now, 7), defaultTime), false)}>
              NEXT WEEK
            </button>
            {task.dueAt !== null && (
              <button type="button" className="link" onClick={() => actions.clearDue(task.id)}>
                CLEAR
              </button>
            )}
          </div>
        </Field>
        <Field label="REPEAT">
          <select
            value={repeat ?? 'custom'}
            onChange={(e) => actions.setRepeat(task.id, e.target.value === 'none' ? null : PRESETS[e.target.value as keyof typeof PRESETS])}
            aria-label="Repeat"
          >
            {repeat === null && <option value="custom">{repeatLabel(task.repeat!)}</option>}
            {REPEATS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="NOTES">
          <textarea
            className="notes-field"
            value={task.notes}
            placeholder="notes…"
            aria-label="Notes"
            onChange={(e) => actions.updateNotes(task.id, e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </Field>
      </dl>

      <section className="objectives" aria-label="Objectives">
        <h3 className="section-title">
          OBJECTIVES {kids.length > 0 && <span className="dim">{done}/{kids.length}</span>}
        </h3>
        {kids.map((k) => (
          <div key={k.id} className={cx('objective', k.done && 'done')}>
            <button type="button" className="check" role="checkbox" aria-checked={k.done} aria-label={`${k.done ? 'Uncheck' : 'Complete'} ${k.title}`} onClick={() => void actions.toggleDone(k.id)}>
              {k.done ? G.checkboxOn : G.checkboxOff}
            </button>
            <button type="button" className="link objective-title" onClick={() => actions.select(k.id)} title="Open its details">
              {shownTitle(k) || 'Untitled'}
            </button>
          </div>
        ))}
        {!task.done && (
          <form
            className="add-objective"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newObjective.trim()) return;
              actions.addTask(task.id, newObjective.trim().charAt(0).toUpperCase() + newObjective.trim().slice(1));
              setNewObjective('');
            }}
          >
            <span className="prompt">{G.prompt}</span>
            <input value={newObjective} placeholder="add objective" aria-label="Add objective" onChange={(e) => setNewObjective(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </form>
        )}
      </section>

      <footer className="detail-foot">
        <p className="dim small">
          {!task.done && isQuest && <span className="accent">+{previewXp(tasks, task.id, now)} XP on completion · </span>}
          {task.done && !!task.xp && <span className="accent">earned +{task.xp} XP · </span>}
          made {ago(task.createdAt, now)} · changed {ago(task.updatedAt, now)}
        </p>
        <div className="detail-actions">
          {(isQuest || kids.length > 0) && !task.done && (
            <button type="button" className="text-btn" onClick={() => actions.openProject(task.id)}>
              {G.zoom} OPEN
            </button>
          )}
          {task.done ? (
            <button type="button" className="text-btn" onClick={() => actions.restoreTask(task.id)}>
              {G.undo} RESTORE
            </button>
          ) : (
            <button type="button" className="text-btn primary" onClick={() => void actions.toggleDone(task.id)}>
              {G.done} COMPLETE
            </button>
          )}
          <button type="button" className="text-btn danger" onClick={() => actions.deleteTask(task.id)}>
            {G.delete} DELETE
          </button>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
