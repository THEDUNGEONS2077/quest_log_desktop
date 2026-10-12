/**
 * src/app/CenterPane.tsx: the middle column: what the sidebar picked.
 *
 *   > MAIN                       [ ACTIVE · 12 ][ COMPLETED · 34 ]  /
 *   ← MAIN / Q4 REPORT                         (inside a project)
 *   > new quest█
 *   …rows…
 *
 * Layer: UI. Shows a quest list (an area, or ALL) with its ACTIVE /
 * COMPLETED switch, a project's inside (zoom, with a breadcrumb back), a
 * planning view (TODAY, UPCOMING), or a page (settings, trash, help).
 */
import { areaName } from '@/lib/areaNames';
import { ancestors } from '@/lib/tree';
import { findTask } from '@/lib/taskMap';
import { shownTitle } from '@/lib/title';
import { useActions, useAppStore, useSelectors } from '@/store/react';
import { NO_COUNTS } from '@/store/selectors';

import { CompletedList } from './CompletedList';
import { cx } from './cx';
import { G } from './glyphs';
import { useOpenMenuAt } from './menu';
import { HelpPage } from './pages/HelpPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrashPage } from './pages/TrashPage';
import { dayLabel, TodayList, UpcomingList } from './PlanList';
import { QuestList } from './QuestList';
import { QuickAdd } from './QuickAdd';
import { SelectionBar } from './SelectionBar';
import { useMinute } from './useMinute';
import { Prompted } from './Prompted';

export function CenterPane() {
  const page = useAppStore((s) => s.page);
  const view = useAppStore((s) => s.ui.view);
  const now = useMinute();
  if (page === 'settings') return <SettingsPage />;
  if (page === 'trash') return <TrashPage />;
  if (page === 'help') return <HelpPage />;
  if (view === 'today')
    return (
      <main className="center">
        <header className="center-head">
          <h1 className="view-title">
            <Prompted>TODAY</Prompted> <span className="dim">· {dayLabel(now)}</span>
          </h1>
        </header>
        <div className="center-body">
          <TodayList />
        </div>
      </main>
    );
  if (view === 'upcoming')
    return (
      <main className="center">
        <header className="center-head">
          <h1 className="view-title"><Prompted>UPCOMING</Prompted> <span className="dim">· NEXT 14 DAYS</span></h1>
        </header>
        <div className="center-body">
          <UpcomingList />
        </div>
      </main>
    );
  return <ListPane />;
}

/** An area (or ALL): its open or completed quests, or a project's inside. */
function ListPane() {
  const category = useAppStore((s) => s.ui.category);
  const tab = useAppStore((s) => s.ui.tab);
  const zoom = useAppStore((s) => s.ui.zoomRootId);
  const name = useAppStore((s) => (category === 'all' ? 'ALL QUESTS' : areaName(s.tasks, category)));
  // An area in ARCHIVE: looked through, not added to (restore it first).
  const archived = useAppStore((s) => s.tasks.areas.some((a) => a.id === category && a.archivedAt !== undefined));
  const selectors = useSelectors();
  const counts = useAppStore((s) => selectors.tabCounts(s)[category] ?? NO_COUNTS);
  const search = useAppStore((s) => s.search[s.ui.tab]);
  const actions = useActions();
  const openMenuAt = useOpenMenuAt();
  return (
    <main className="center">
      <header className="center-head">
        <h1 className="view-title">
          <Prompted glyph={archived ? G.archives : G.prompt}>{name.toUpperCase()}</Prompted>
          {archived && <span className="dim"> · ARCHIVED</span>}
        </h1>
        <div className="switch" role="tablist">
          {(['active', 'completed'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={cx('switch-btn', tab === t && 'on')}
              onClick={() => (tab === t ? actions.toTabTop() : actions.setTab(t))}
            >
              {t.toUpperCase()} · {counts[t]}
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn" title="Search (/)" aria-label="Search" onClick={() => actions.setSearch(tab, { open: !search.open, query: '' })}>
          {G.search}
        </button>
        {tab === 'completed' && (
          <button
            type="button"
            className="text-btn"
            title="Move completed quests to Trash (all areas)"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              openMenuAt(r.left, r.bottom + 4, {
                items: [
                  { label: 'Older than 7 days', glyph: G.delete, onPick: () => actions.clearCompleted(7) },
                  { label: 'Older than 30 days', glyph: G.delete, onPick: () => actions.clearCompleted(30) },
                  { label: 'All completed', glyph: G.delete, onPick: () => actions.clearCompleted(null) },
                ],
              });
            }}
          >
            CLEAR…
          </button>
        )}
      </header>
      <SelectionBar />
      {search.open && <SearchField />}
      {tab === 'active' && zoom !== null && <Breadcrumb />}
      {tab === 'active' && !archived && <QuickAdd placeholder={zoom ? 'new objective' : 'new quest'} />}
      {archived && (
        <p className="archived-note dim small">
          <Prompted>IN ARCHIVE.</Prompted>{' '}
          <button type="button" className="link" onClick={() => actions.restoreArea(category)}>
            RESTORE
          </button>
          {' it to add quests and see them in ALL QUESTS, TODAY and UPCOMING.'}
        </p>
      )}
      <div className="center-body">{tab === 'active' ? <QuestList /> : <CompletedList />}</div>
    </main>
  );
}

/** The search box for the list shown (titles and notes; capitals and accents don't matter). */
function SearchField() {
  const tab = useAppStore((s) => s.ui.tab);
  const query = useAppStore((s) => s.search[s.ui.tab].query);
  const actions = useActions();
  return (
    <div className="search">
      <span className="prompt">{G.search}</span>
      <input
        autoFocus
        value={query}
        placeholder={tab === 'active' ? 'search tasks and notes' : 'search completed'}
        aria-label="Search"
        onChange={(e) => actions.setSearch(tab, { query: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Escape') actions.closeSearch(tab);
          e.stopPropagation();
        }}
      />
      <button type="button" className="icon-btn" aria-label="Close search" onClick={() => actions.closeSearch(tab)}>
        {G.delete}
      </button>
    </div>
  );
}

/** Inside a project: the way back (area / project / …), each part a link. */
function Breadcrumb() {
  const zoom = useAppStore((s) => s.ui.zoomRootId)!;
  const tasks = useAppStore((s) => s.tasks);
  const category = useAppStore((s) => s.ui.category);
  const actions = useActions();
  if (!findTask(tasks, zoom)) return null;
  const path = [...ancestors(tasks, zoom).reverse(), zoom];
  return (
    <nav className="breadcrumb" aria-label="Where you are">
      <button type="button" className="crumb" onClick={() => actions.setZoom(null)}>
        ← {category === 'all' ? 'ALL' : areaName(tasks, category)}
      </button>
      {path.map((id, i) => (
        <span key={id}>
          <span className="dim"> / </span>
          <button type="button" className={cx('crumb', i === path.length - 1 && 'current')} onClick={() => actions.setZoom(id)}>
            {shownTitle(findTask(tasks, id)!) || 'Untitled'}
          </button>
        </span>
      ))}
    </nav>
  );
}
