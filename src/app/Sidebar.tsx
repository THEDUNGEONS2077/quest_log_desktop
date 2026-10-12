/**
 * src/app/Sidebar.tsx: the left column: views, areas and their projects.
 *
 *   <7>_quest_log
 *   [■■■■□□□□□□] 34/125 XP
 *   ◉ TODAY            5
 *   ◔ UPCOMING        12
 *   ≣ ALL QUESTS      40
 *   AREAS
 *   ▾ ACME           6     ← an area, opened to its projects
 *       Q4 report    3
 *   ▸ MAIN          18
 *   + AREA
 *   ✓ COMPLETED  ✕ TRASH  ⊛ SETTINGS  ? HELP
 *
 * Layer: UI. An area is the user's own group of quests (a client, a team,
 * a part of the job); its quests are projects. Clicking an area shows its
 * quests; its caret lists its projects, and a project opens inside (zoom).
 * Right-click an area to rename or delete it. The selected entry has the
 * faint glow (DESIGN.md: the glow marks what's selected).
 */
import { type FormEvent, useState } from 'react';

import { levelInfo } from '@/lib/xp';
import { useActions, useAppStore, useSelectors } from '@/store/react';

import { cx } from './cx';
import { G } from './glyphs';
import { useOpenMenuAt } from './menu';
import { useMinute } from './useMinute';

export function Sidebar() {
  const xp = useAppStore((s) => s.tasks.progress.xp);
  const { level, into, needed, fraction } = levelInfo(xp);
  const view = useAppStore((s) => s.ui.view);
  const category = useAppStore((s) => s.ui.category);
  const tab = useAppStore((s) => s.ui.tab);
  const zoom = useAppStore((s) => s.ui.zoomRootId);
  const page = useAppStore((s) => s.page);
  const areas = useAppStore((s) => s.tasks.areas);
  const selectors = useSelectors();
  const now = useMinute();
  const counts = useAppStore((s) => selectors.tabCounts(s));
  const today = useAppStore((s) => selectors.todayRows(s, now).length);
  const upcoming = useAppStore((s) => selectors.upcomingDays(s, now).reduce((n, d) => n + d.rows.length, 0));
  const projects = useAppStore((s) => selectors.projectsByArea(s));
  const actions = useActions();
  const openMenuAt = useOpenMenuAt();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [adding, setAdding] = useState(false);

  const inList = page === null && view === 'list';
  const isOn = (cat: string) => inList && category === cat && tab === 'active' && zoom === null;

  /** An area (or ALL) from the sidebar: its open quests, top level. */
  const showArea = (id: string) => {
    actions.setCategoryTab(id);
    actions.setTab('active');
    actions.setZoom(null);
  };

  const toggleOpen = (id: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav className="sidebar" aria-label="Views and areas">
      <button type="button" className="brand" title="Today (T)" onClick={() => actions.setView('today')}>
        <span className="dim">{'<'}</span>
        <span className="bright">{level}</span>
        <span className="dim">{'>'}</span>
        <span className="accent glow-text">_quest_log</span>
      </button>
      <div className="xp" title={`Level ${level}: ${into} of ${needed} XP to level ${level + 1}`}>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
        <span className="dim">
          {into}/{needed} XP
        </span>
      </div>

      <div className="nav-group">
        <NavItem glyph={G.today} label="TODAY" count={today} on={page === null && view === 'today'} onClick={() => actions.setView('today')} shortcut="T" />
        <NavItem glyph={G.upcoming} label="UPCOMING" count={upcoming} on={page === null && view === 'upcoming'} onClick={() => actions.setView('upcoming')} shortcut="U" />
        <NavItem glyph={G.all} label="ALL QUESTS" count={counts.all?.active ?? 0} on={isOn('all')} onClick={() => showArea('all')} shortcut="A" />
      </div>

      <div className="nav-heading">AREAS</div>
      <div className="nav-group areas">
        {areas.map((a) => {
          const list = projects[a.id] ?? [];
          const expanded = open.has(a.id);
          return (
            <div key={a.id}>
              <div
                className={cx('nav-item', 'area', isOn(a.id) && 'on')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMenuAt(e.clientX, e.clientY, { area: a.id });
                }}
              >
                <button
                  type="button"
                  className={cx('caret', expanded && 'open', !list.length && 'hidden')}
                  aria-label={`${expanded ? 'Hide' : 'Show'} the projects in ${a.name}`}
                  onClick={() => toggleOpen(a.id)}
                  disabled={!list.length}
                >
                  {G.caret}
                </button>
                <button type="button" className="nav-label" onClick={() => showArea(a.id)}>
                  {a.name.toUpperCase()}
                </button>
                <span className="count">{counts[a.id]?.active ?? 0}</span>
              </div>
              {expanded &&
                list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cx('nav-item', 'project', inList && zoom === p.id && 'on')}
                    title="Open this project"
                    onClick={() => {
                      showArea(a.id);
                      actions.setZoom(p.id);
                      actions.select(p.id);
                    }}
                  >
                    <span className="nav-label">{p.title || 'Untitled'}</span>
                    <span className="count">{p.open}</span>
                  </button>
                ))}
            </div>
          );
        })}
        {adding ? <NewArea onDone={() => setAdding(false)} /> : (
          <button type="button" className="nav-item add-area" onClick={() => setAdding(true)}>
            {G.add} AREA
          </button>
        )}
      </div>

      <div className="nav-group bottom">
        <NavItem glyph={G.completed} label="COMPLETED" count={counts.all?.completed ?? 0} on={inList && category === 'all' && tab === 'completed'} onClick={() => {
          actions.setCategoryTab('all');
          actions.setTab('completed');
        }} />
        <NavItem glyph={G.trash} label="TRASH" on={page === 'trash'} onClick={() => actions.openPage('trash')} />
        <NavItem glyph={G.settings} label="SETTINGS" on={page === 'settings'} onClick={() => actions.openPage('settings')} />
        <NavItem glyph={G.help} label="HELP" on={page === 'help'} onClick={() => actions.openPage('help')} shortcut="?" />
      </div>
    </nav>
  );
}

function NavItem(props: { glyph: string; label: string; count?: number; on: boolean; onClick: () => void; shortcut?: string }) {
  return (
    <button type="button" className={cx('nav-item', props.on && 'on')} onClick={props.onClick} title={props.shortcut ? `${props.label} (${props.shortcut})` : props.label} aria-current={props.on ? 'page' : undefined}>
      <span className="nav-glyph">{props.glyph}</span>
      <span className="nav-label">{props.label}</span>
      {props.count !== undefined && <span className="count">{props.count}</span>}
    </button>
  );
}

/** The inline field for a new area's name (Enter adds it, Esc cancels). */
function NewArea({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const actions = useActions();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) actions.addArea(name);
    onDone();
  };
  return (
    <form className="nav-item new-area" onSubmit={submit}>
      <span className="prompt">{G.prompt}</span>
      <input
        autoFocus
        value={name}
        maxLength={32}
        placeholder="area name"
        aria-label="New area name"
        onChange={(e) => setName(e.target.value)}
        onBlur={onDone}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone();
          e.stopPropagation();
        }}
      />
    </form>
  );
}
