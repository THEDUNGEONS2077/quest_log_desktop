/**
 * src/app/Fold.tsx: a list's rows as a tree, each task's objectives in one
 * block under it that folds open and shut smoothly (2026-10-17: "a smooth
 * animation for when a quest is expanded and collapsed").
 *
 *   ▾ [ ] SHIP THE REPORT
 *   ┌──────────────────────────┐  ← the fold: grows from nothing as it
 *   │   [ ] Pull the numbers   │    opens, its rows fading in; shrinks away
 *   │   [ ] Write it up        │    as it closes, its rows fading out. The
 *   └──────────────────────────┘    rows below glide to their place.
 *     [ ] HIRE A DESIGNER
 *
 * Layer: UI. The rows still come flat from the selectors (depth-first, with
 * depths); RowTree nests them, so one block (one grid track, app.css
 * `.fold`) carries all of a task's objectives, nested ones included, and
 * the whole block opens like a curtain. The store marks what's moving
 * (`unfolding`, `folding`, for FOLD_MS) and keeps a folding task's rows
 * listed until its fold has played, so the close runs all the way.
 * Searching, nothing folds: the results show every match's path.
 */
import { type ReactNode, useMemo } from 'react';

import type { Row } from '@/lib/flatten';
import { useAppStore } from '@/store/react';

import { cx } from './cx';

/** A row and the rows nested under it. */
interface Node {
  row: Row;
  kids: Node[];
}

/** Nests flat depth-first rows: each row's objectives are the deeper rows that follow it. */
export function rowTree(rows: readonly Row[]): Node[] {
  const roots: Node[] = [];
  // The open branch: the last row at each depth so far.
  const path: Node[] = [];
  for (const row of rows) {
    const node: Node = { row, kids: [] };
    while (path.length && path[path.length - 1]!.row.depth >= row.depth) path.pop();
    (path.length ? path[path.length - 1]!.kids : roots).push(node);
    path.push(node);
  }
  return roots;
}

/**
 * The rows that stay once every fold now playing is over: without the
 * objectives of tasks folding shut (`folding`), which are still listed only
 * so they can close smoothly. The arrow keys move through these.
 */
export function settledRows(rows: readonly Row[], folding: readonly string[]): Row[] {
  if (!folding.length) return [...rows];
  const out: Row[] = [];
  // Depth of the folding task whose objectives are being skipped (-1: none).
  let skipBelow = -1;
  for (const row of rows) {
    if (skipBelow >= 0 && row.depth > skipBelow) continue;
    skipBelow = folding.includes(row.id) ? row.depth : -1;
    out.push(row);
  }
  return out;
}

interface Props {
  rows: readonly Row[];
  /** Draws one row (its TaskRow). */
  render: (row: Row) => ReactNode;
  /** Never fold (search results). */
  still?: boolean;
}

/** The rows, each followed by its folding block of objectives. */
export function RowTree({ rows, render, still = false }: Props) {
  const tree = useMemo(() => rowTree(rows), [rows]);
  return tree.map((node) => <Branch key={node.row.id} node={node} render={render} still={still} />);
}

function Branch({ node, render, still }: { node: Node; render: Props['render']; still: boolean }) {
  return (
    <>
      {render(node.row)}
      {node.kids.length > 0 && (
        <Fold id={node.row.id} still={still}>
          {node.kids.map((kid) => (
            <Branch key={kid.row.id} node={kid} render={render} still={still} />
          ))}
        </Fold>
      )}
    </>
  );
}

/**
 * Task `id`'s objectives, folding open (`unfolding`: from nothing, its first
 * style) or shut (`folding`), or at rest. Turned around mid-way, it goes back
 * from where it is.
 */
function Fold({ id, still, children }: { id: string; still: boolean; children: ReactNode }) {
  const unfolding = useAppStore((s) => !still && s.unfolding.includes(id));
  const folding = useAppStore((s) => !still && s.folding.includes(id));
  return (
    <div className={cx('fold', unfolding && 'unfolding', folding && 'folding')}>
      <div className="fold-clip">{children}</div>
    </div>
  );
}
