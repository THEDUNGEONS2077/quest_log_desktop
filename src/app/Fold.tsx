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
import { memo, type ReactNode, useMemo, useState } from 'react';

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
 * Whether two rows draw the same: the lists rebuild every row object on any
 * change to them (a quest added, a search letter typed), and most rows stay
 * as they were. Compared by value (speed pass 2026-10-17: with 1,500 rows,
 * every change re-rendered them all).
 */
export function sameRow(a: Row, b: Row): boolean {
  return (
    a.id === b.id &&
    a.depth === b.depth &&
    a.hasChildren === b.hasChildren &&
    a.progress.done === b.progress.done &&
    a.progress.total === b.progress.total &&
    ('context' in a ? a.context : false) === ('context' in b ? b.context : false)
  );
}

/**
 * A tree builder that hands back last time's node for a branch that hasn't
 * changed (the same row, the same objectives, all unchanged themselves), so
 * React skips that whole branch: adding or completing a quest then renders
 * that quest and the list, not every row.
 */
export function stableTrees() {
  let last = new Map<string, Node>();
  const keep = (node: Node, seen: Map<string, Node>): Node => {
    const kids = node.kids.map((k) => keep(k, seen));
    const before = last.get(node.row.id);
    const same = before && sameRow(before.row, node.row) && before.kids.length === kids.length && before.kids.every((k, i) => k === kids[i]);
    const out = same ? before : { row: node.row, kids };
    seen.set(node.row.id, out);
    return out;
  };
  return (rows: readonly Row[]): Node[] => {
    const seen = new Map<string, Node>();
    const roots = rowTree(rows).map((n) => keep(n, seen));
    last = seen;
    return roots;
  };
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
  /** Draws one row (its TaskRow). Keep it the same function while what it draws is the same (useCallback): rows are skipped only then. */
  render: (row: Row) => ReactNode;
  /** Never fold (search results). */
  still?: boolean;
}

/** The rows, each followed by its folding block of objectives. */
export function RowTree({ rows, render, still = false }: Props) {
  // One builder per list, remembering its last tree (see stableTrees).
  const [build] = useState(stableTrees);
  const tree = useMemo(() => build(rows), [build, rows]);
  return tree.map((node) => <Branch key={node.row.id} node={node} render={render} still={still} />);
}

/** A row and its fold; skipped when its node is last time's (stableTrees) and `render` is the same. */
const Branch = memo(function Branch({ node, render, still }: { node: Node; render: Props['render']; still: boolean }) {
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
});

/**
 * Task `id`'s objectives, folding open (`unfolding`: from nothing, its first
 * style) or shut (`folding`), or at rest. Turned around mid-way, it goes back
 * from where it is.
 */
function Fold({ id, still, children }: { id: string; still: boolean; children: ReactNode }) {
  const unfolding = useAppStore((s) => !still && s.unfolding.includes(id));
  const folding = useAppStore((s) => !still && s.folding.includes(id));
  // Drawn open from the start (the list's first render, a view opened): such a block may skip
  // rendering while off screen (app.css `.fold.rest`). One that unfolded never does: its first
  // frames would be sized by an estimate, and the rows below would step.
  const [rest] = useState(!unfolding);
  return (
    <div className={cx('fold', rest && 'rest', unfolding && 'unfolding', folding && 'folding')}>
      <div className="fold-clip">{children}</div>
    </div>
  );
}
