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
 *
 * With no task selected while an area is shown, the pane shows the area
 * (2026-10-12: "edit and delete areas on the right hand tab"):
 *
 *   AREA                                               »
 *   CLIENT WORK                    ← its name, edited in place
 *   6 open quests · 2 completed
 *   PROJECTS  Q4 report 3 · Website 5 …
 *   [ DELETE ]   ← to ARCHIVE (or RESTORE / DELETE FOREVER there)
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
import { useActions, useAppStore, useSelectors } from '@/store/react';
import { NO_COUNTS } from '@/store/selectors';

import { cx } from './cx';
import { G } from './glyphs';
import { confirmDeleteForever, useOpenDialog } from './menu';
import { useMinute } from './useMinute';
import { Prompted } from './Prompted';

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
  const collapsed = useAppStore((s) => s.ui.detailCollapsed);
  // The area shown in the list (not ALL, a planning view or a page), for the area view.
  const areaShown = useAppStore((s) =>
    s.page === null && s.ui.view === 'list' && s.ui.category !== 'all' && s.tasks.areas.some((a) => a.id === s.ui.category) ? s.ui.category : null,
  );
  const actions = useActions();
  const live = !!id && !!task && task.deletedAt === null;
  let content: ReactNode;
  let label = 'Task details';
  if (live) {
    content = <Details key={task.id} task={task} onClose={() => actions.select(null)} />;
  } else if (areaShown) {
    content = <AreaDetails key={areaShown} id={areaShown} />;
    label = 'Area details';
  } else {
    content = (
      <div className="empty-detail">
        <div className="detail-head detail-head-empty">
          <MinimizeButton />
        </div>
        <p className="dim"><Prompted>SELECT A TASK TO SEE ITS DETAILS.</Prompted></p>
        <p className="dim small">Click a task. Double-click (or Enter) edits its title. Right-click for more.</p>
      </div>
    );
  }
  // Both the full pane and the minimized strip stay rendered and cross-fade.
  // The full pane keeps its width while the column narrows, so it's clipped,
  // never squeezed: nothing reflows or snaps mid-animation. The hidden one is
  // inert (nothing in it can be focused or clicked).
  return (
    <aside className={cx('detail', collapsed && 'minimized')} aria-label={collapsed ? `${label} (minimized)` : label}>
      <div className="detail-full" inert={collapsed}>
        {content}
      </div>
      {/* The strip: the whole of it is the button, an easy target at the window's edge. A dot shows a task is selected. */}
      <button type="button" className="detail-min-btn" aria-label="Show details (D)" title="Show details (D)" onClick={actions.toggleDetail} inert={!collapsed}>
        <span className="icon-btn" aria-hidden>
          {G.showPane}
        </span>
        <span className="detail-min-label">DETAILS{live ? ' •' : ''}</span>
      </button>
    </aside>
  );
}

/** » : minimizes the detail pane to a strip (D does the same). */
function MinimizeButton() {
  const actions = useActions();
  return (
    <button type="button" className="icon-btn" aria-label="Minimize details (D)" title="Minimize details (D)" onClick={actions.toggleDetail}>
      {G.hidePane}
    </button>
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
        <MinimizeButton />
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
              {/* Live areas, plus its own if that's archived (so the select shows it). */}
              {tasks.areas.filter((a) => a.archivedAt === undefined || a.id === questCategory(task)).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name.toUpperCase()}
                  {a.archivedAt !== undefined ? ' (ARCHIVED)' : ''}
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

/**
 * The area shown in the list: its name (edited in place: Enter or leaving
 * the field saves, Esc puts it back), its counts and open projects, and
 * DELETE (to ARCHIVE), or for an archived one RESTORE / DELETE FOREVER.
 */
function AreaDetails({ id }: { id: string }) {
  const area = useAppStore((s) => s.tasks.areas.find((a) => a.id === id))!;
  const liveCount = useAppStore((s) => s.tasks.areas.filter((a) => a.archivedAt === undefined).length);
  const selectors = useSelectors();
  const counts = useAppStore((s) => selectors.tabCounts(s)[id] ?? NO_COUNTS);
  const projects = useAppStore((s) => selectors.projectsByArea(s)[id]);
  const actions = useActions();
  const openDialog = useOpenDialog();
  const now = useMinute();
  const [draft, setDraft] = useState(area.name);
  const archived = area.archivedAt !== undefined;
  const save = () => {
    // An empty name isn't kept (renameArea ignores it): show the real one again.
    if (draft.trim()) actions.renameArea(id, draft);
    setDraft(area.name);
  };
  // The stored name changed elsewhere (menu rename, undo): show it.
  const [seen, setSeen] = useState(area.name);
  if (seen !== area.name) {
    setSeen(area.name);
    setDraft(area.name);
  }

  return (
    <div className="details">
      <div className="detail-head">
        <span className="detail-path dim">{archived ? `${G.archives} ARCHIVE` : 'AREA'}</span>
        <MinimizeButton />
      </div>
      <input
        className="detail-title quest-title area-name"
        value={draft}
        maxLength={32}
        aria-label="Area name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setDraft(area.name);
          e.stopPropagation();
        }}
      />
      <p className="dim small">
        {counts.active} open {counts.active === 1 ? 'quest' : 'quests'} · {counts.completed} completed
        {archived && ` · archived ${ago(area.archivedAt!, now)}`}
      </p>
      {archived && <p className="dim small">Its quests are kept, but left out of ALL QUESTS, TODAY and UPCOMING until you restore it.</p>}

      {!!projects?.length && (
        <section className="area-projects">
          <h3 className="section-title">PROJECTS</h3>
          {projects.map((p) => (
            <button key={p.id} type="button" className="area-project" onClick={() => actions.openProject(p.id)}>
              <span className="nav-label">{p.title || 'Untitled'}</span>
              <span className="dim">{p.open}</span>
            </button>
          ))}
        </section>
      )}

      <footer className="detail-foot">
        <div className="detail-actions">
          {archived ? (
            <>
              <button type="button" className="text-btn primary" onClick={() => actions.restoreArea(id)}>
                {G.undo} RESTORE
              </button>
              <button type="button" className="text-btn danger" onClick={() => confirmDeleteForever(openDialog, actions, id, area.name)}>
                {G.delete} DELETE FOREVER…
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-btn danger"
              disabled={liveCount <= 1}
              title={liveCount <= 1 ? 'Your only area can’t be deleted' : 'Moves it to ARCHIVE, with its quests'}
              onClick={() => actions.archiveArea(id)}
            >
              {G.archives} DELETE
            </button>
          )}
        </div>
        {!archived && <p className="dim small">Deleting moves it to ARCHIVE with its quests. You can restore it there.</p>}
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
