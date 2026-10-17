/**
 * src/app/QuestList.tsx: the open quests of the area shown (or ALL), or the
 * inside of a project when one is open (zoom).
 *
 * Layer: UI. Rows come from the memoized `activeRows` selector (the phone's
 * flatten: quests by priority, then last change, holding still while you
 * work; objectives in their own order), or from search. A quest is a
 * project: its objectives are its tasks. The list tells the shortcuts which
 * rows are on screen (arrow keys move the selection). Each task's
 * objectives sit in one block that folds open and shut smoothly (RowTree).
 */
import { useCallback, useDeferredValue, useEffect } from 'react';

import type { Row } from '@/lib/flatten';
import type { FoundRow } from '@/lib/search';
import { useAppStore, useAppStoreShallow, useSelectors } from '@/store/react';

import { DragArea } from './drag';
import { RowTree, settledRows } from './Fold';
import { setVisibleRows } from './menu';
import { TaskRow } from './TaskRow';
import { Prompted } from './Prompted';
import { useBlank, Welcome } from './Welcome';

export function QuestList() {
  const selectors = useSelectors();
  const live = useAppStoreShallow((s) => ({ rows: selectors.activeRows(s), query: s.search.active.open ? s.search.active.query : '' }));
  // Searching, the results follow the typing a moment behind (React renders them between
  // keystrokes), so the field stays instant however long the list (speed pass 2026-10-17).
  // Otherwise the rows are always current: folds and exits are timed against them.
  const deferred = useDeferredValue(live);
  const { rows, query } = live.query ? deferred : live;
  const zoomed = useAppStore((s) => s.ui.zoomRootId !== null);
  const blank = useBlank();

  // The same function while the query is: unchanged rows are then skipped (RowTree).
  const render = useCallback(
    (row: Row) => <TaskRow key={row.id} row={row} query={query} context={'context' in row && (row as FoundRow).context} draggable={!query} />,
    [query],
  );

  const folding = useAppStore((s) => s.folding);
  // The arrow keys skip objectives that are folding away (still listed only to close smoothly).
  useEffect(() => setVisibleRows(settledRows(rows, folding).map((r) => r.id)), [rows, folding]);

  if (!rows.length && blank && !query && !zoomed) return <Welcome />;
  if (!rows.length) {
    return (
      <p className="empty">
        <Prompted>{query ? 'NO MATCHES.' : zoomed ? 'NOTHING HERE YET. TYPE ABOVE TO ADD AN OBJECTIVE' : 'NO OPEN QUESTS HERE. TYPE ABOVE TO BEGIN'}</Prompted>
      </p>
    );
  }
  return (
    <DragArea>
      {/* quest-list: tucks the first quest's divider out of sight (see app.css). */}
      <div className="list quest-list" role="list">
        <RowTree rows={rows} still={!!query} render={render} />
      </div>
    </DragArea>
  );
}
