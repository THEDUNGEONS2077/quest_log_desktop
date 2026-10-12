/**
 * src/app/Sidebar.tsx: the left column: who you are, views, areas and their
 * projects, the archive, and the app's pages.
 *
 *   ┌───────────────────────────┐
 *   │ <7>_quest_log▌            │  ← the title block: level, name, cursor
 *   │ LVL 07 · STREAK 4D · ×1.15│
 *   │ [▰▰▰▰▰▰▰▱▱▱▱▱] 34/125 XP   │  ← the XP gauge (sheen, pulse on a gain)
 *   └───────────────────────────┘
 *   ▾ VIEWS                         ← each section minimizes to its heading
 *     ◉ TODAY            5
 *     ◔ UPCOMING        12
 *     ≣ ALL QUESTS      40
 *   ──────────────────────          ← a divider between sections
 *   ▾ AREAS              4
 *     ▾ ACME           6     ← an area, opened to its projects
 *         Q4 report    3
 *     ▸ MAIN          18
 *     + AREA
 *   ──────────────────────
 *   ▸ ARCHIVE            1     ← deleted areas, with their quests
 *   ──────────────────────
 *   ▾ SYSTEM
 *     ✓ COMPLETED  ✕ TRASH  ⊛ SETTINGS  ? HELP
 *
 * Layer: UI. An area is the user's own group of quests (a client, a team,
 * a part of the job); its quests are projects. Clicking an area shows its
 * quests (and the details pane shows the area: rename or delete it there);
 * its caret lists its projects, and a project opens inside (zoom).
 * Right-click an area for the same actions. A deleted area goes into the
 * ARCHIVE section, where it can still be opened, restored or deleted for
 * good. Sections minimize to their heading (remembered, ui.sidebarCollapsed);
 * a minimized section that holds what's shown marks its heading with a dot.
 * The selected entry has the faint glow (DESIGN.md: the glow marks what's
 * selected).
 */
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

import { currentDayStreak, dayMultiplier, levelInfo } from '@/lib/xp';
import type { SidebarSection } from '@/store/uiState';
import { useActions, useAppStore, useSelectors } from '@/store/react';

import { cx } from './cx';
import { G } from './glyphs';
import { useOpenMenuAt } from './menu';
import { useMinute } from './useMinute';

export function Sidebar() {
  const view = useAppStore((s) => s.ui.view);
  const category = useAppStore((s) => s.ui.category);
  const tab = useAppStore((s) => s.ui.tab);
  const zoom = useAppStore((s) => s.ui.zoomRootId);
  const page = useAppStore((s) => s.page);
  const collapsed = useAppStore((s) => s.ui.sidebarCollapsed);
  const allAreas = useAppStore((s) => s.tasks.areas);
  const areas = useMemo(() => allAreas.filter((a) => a.archivedAt === undefined), [allAreas]);
  const archived = useMemo(() => allAreas.filter((a) => a.archivedAt !== undefined), [allAreas]);
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
  const showingIn = (list: readonly { id: string }[]) => inList && list.some((a) => a.id === category);

  /**
   * An area (or ALL) from the sidebar: its open quests, top level. No task
   * stays selected, so the details pane shows the area itself (to rename or
   * delete it).
   */
  const showArea = (id: string) => {
    actions.select(null);
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

  /** Props shared by every section: whether it's minimized, and its toggle. */
  const section = (id: SidebarSection) => ({ id, collapsed: collapsed.includes(id), onToggle: () => actions.toggleSidebarSection(id) });

  return (
    <nav className="sidebar" aria-label="Views and areas">
      <Masthead />

      <Section {...section('views')} title="VIEWS" active={page === null && (view !== 'list' || isOn('all'))}>
        <NavItem glyph={G.today} label="TODAY" count={today} on={page === null && view === 'today'} onClick={() => actions.setView('today')} shortcut="T" />
        <NavItem glyph={G.upcoming} label="UPCOMING" count={upcoming} on={page === null && view === 'upcoming'} onClick={() => actions.setView('upcoming')} shortcut="U" />
        <NavItem glyph={G.all} label="ALL QUESTS" count={counts.all?.active ?? 0} on={isOn('all')} onClick={() => showArea('all')} shortcut="A" />
      </Section>

      <Section {...section('areas')} title="AREAS" count={areas.length} active={showingIn(areas)}>
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
        {adding ? (
          <NewArea onDone={() => setAdding(false)} />
        ) : (
          <button type="button" className="nav-item add-area" onClick={() => setAdding(true)}>
            {G.add} AREA
          </button>
        )}
      </Section>

      <Section {...section('archive')} title="ARCHIVE" glyph={G.archives} count={archived.length} active={showingIn(archived)} className="archive">
        {archived.length ? (
          archived.map((a) => (
            <div
              key={a.id}
              className={cx('nav-item', 'archived-area', isOn(a.id) && 'on')}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenuAt(e.clientX, e.clientY, { area: a.id });
              }}
            >
              <button type="button" className="nav-label" onClick={() => showArea(a.id)}>
                {a.name.toUpperCase()}
              </button>
              <span className="count">{counts[a.id]?.active ?? 0}</span>
            </div>
          ))
        ) : (
          <p className="nav-empty dim">EMPTY · DELETED AREAS LAND HERE</p>
        )}
      </Section>

      <Section
        {...section('system')}
        title="SYSTEM"
        active={page !== null || (inList && category === 'all' && tab === 'completed')}
        className="bottom"
      >
        <NavItem
          glyph={G.completed}
          label="COMPLETED"
          count={counts.all?.completed ?? 0}
          on={inList && category === 'all' && tab === 'completed'}
          onClick={() => {
            actions.setCategoryTab('all');
            actions.setTab('completed');
          }}
        />
        <NavItem glyph={G.trash} label="TRASH" on={page === 'trash'} onClick={() => actions.openPage('trash')} />
        <NavItem glyph={G.settings} label="SETTINGS" on={page === 'settings'} onClick={() => actions.openPage('settings')} />
        <NavItem glyph={G.help} label="HELP" on={page === 'help'} onClick={() => actions.openPage('help')} shortcut="?" />
      </Section>
    </nav>
  );
}

/**
 * The title block: `<level>_quest_log` with a blinking cursor, a status line
 * (level, day streak and its XP multiplier), and the XP gauge. The gauge is
 * segmented, its fill a green gradient with a bright leading edge and a
 * sheen that sweeps across now and then; an XP gain flashes it, and a level
 * up pops the level number. (Reduce Motion: no sweep, blink or flash.)
 * Clicking the title shows TODAY.
 */
function Masthead() {
  const progress = useAppStore((s) => s.tasks.progress);
  const actions = useActions();
  const now = useMinute();
  const { level, into, needed, fraction } = levelInfo(progress.xp);
  const streak = currentDayStreak(progress, now);
  // Count gains and level-ups as they happen (the previous-props pattern), so
  // their animations replay each time but never on the first render.
  const [seen, setSeen] = useState({ xp: progress.xp, level });
  const [gains, setGains] = useState(0);
  const [levelUps, setLevelUps] = useState(0);
  if (seen.xp !== progress.xp) {
    if (progress.xp > seen.xp) setGains(gains + 1);
    if (level > seen.level) setLevelUps(levelUps + 1);
    setSeen({ xp: progress.xp, level });
  }

  return (
    <header className="masthead">
      <button type="button" className="brand" title="Today (T)" onClick={() => actions.setView('today')}>
        <span className="brand-bracket">{'<'}</span>
        <span key={levelUps} className={cx('brand-level', levelUps > 0 && 'level-up')}>
          {level}
        </span>
        <span className="brand-bracket">{'>'}</span>
        <span className="brand-name">_quest_log</span>
        <span className="brand-cursor" aria-hidden />
      </button>
      <p className="brand-status">
        <span>LVL {String(level).padStart(2, '0')}</span>
        <span className="sep">·</span>
        {streak > 0 ? (
          <span title={`${streak}-day streak: completions earn ×${dayMultiplier(streak).toFixed(2)} XP`}>
            STREAK <b>{streak}D</b> <span className="accent">×{dayMultiplier(streak).toFixed(2)}</span>
          </span>
        ) : (
          <span title="Complete something today to start a streak">NO STREAK</span>
        )}
      </p>
      <div className="xp" title={`Level ${level}: ${into} of ${needed} XP to level ${level + 1}`}>
        <div className="xp-track" role="progressbar" aria-label="XP to the next level" aria-valuemin={0} aria-valuemax={needed} aria-valuenow={into}>
          <div className="xp-fill" style={{ width: `${Math.max(fraction * 100, into > 0 ? 2 : 0)}%` }} />
          {gains > 0 && <span key={gains} className="xp-flash" aria-hidden />}
        </div>
        <div className="xp-numbers">
          <span>
            <b>{into}</b>
            <span className="dim">/{needed} XP</span>
          </span>
          <span className="dim">
            {needed - into} TO LVL {level + 1}
          </span>
        </div>
      </div>
    </header>
  );
}

/**
 * One sidebar section: a heading (click to minimize or open; the count and,
 * while minimized, a dot when it holds what's shown) over its items, which
 * fold away smoothly. Sections are separated by a divider (CSS).
 */
function Section(props: {
  id: SidebarSection;
  title: string;
  glyph?: string;
  count?: number;
  active: boolean;
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
  children: ReactNode;
}) {
  const bodyId = `nav-section-${props.id}`;
  return (
    <section className={cx('nav-section', props.className, props.collapsed && 'collapsed')}>
      <button type="button" className="nav-section-head" aria-expanded={!props.collapsed} aria-controls={bodyId} onClick={props.onToggle}>
        <span className={cx('caret', !props.collapsed && 'open')} aria-hidden>
          {G.caret}
        </span>
        {props.glyph && <span className="nav-glyph">{props.glyph}</span>}
        <span className="nav-section-title">{props.title}</span>
        {props.collapsed && props.active && <span className="nav-section-dot" title="What's shown is in here" />}
        {props.count !== undefined && <span className="count">{props.count}</span>}
      </button>
      {/* `inert` while folded: nothing hidden can be tabbed to. */}
      <div className="nav-section-body" id={bodyId} inert={props.collapsed}>
        <div className="nav-section-inner">{props.children}</div>
      </div>
    </section>
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
