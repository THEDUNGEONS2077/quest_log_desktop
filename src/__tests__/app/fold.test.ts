/**
 * src/__tests__/app/fold.test.ts: the list's rows as a tree, so each task's
 * objectives fold in one block, and the rows the arrow keys move through
 * while folds play (app/Fold.tsx, 2026-10-17).
 */
import { rowTree, settledRows } from '@/app/Fold';
import type { Row } from '@/lib/flatten';

/** Rows from `[id, depth]` pairs. */
const rows = (...list: [string, number][]): Row[] => list.map(([id, depth]) => ({ id, depth, hasChildren: false, progress: { done: 0, total: 0 } }));
/** The tree as nested ids, for comparing. */
type Shape = (string | Shape)[];
const shape = (nodes: ReturnType<typeof rowTree>): Shape => nodes.flatMap((n) => (n.kids.length ? [n.row.id, shape(n.kids)] : [n.row.id]));

describe('rowTree', () => {
  it("nests each row's objectives under it, at any depth", () => {
    const list = rows(['q', 0], ['a', 1], ['a1', 2], ['b', 1], ['r', 0], ['s', 0], ['s1', 1]);
    expect(shape(rowTree(list))).toEqual(['q', ['a', ['a1'], 'b'], 'r', 's', ['s1']]);
  });

  it('places a row that skips a level (a search match) under the nearest shallower row', () => {
    expect(shape(rowTree(rows(['q', 0], ['deep', 2], ['r', 0])))).toEqual(['q', ['deep'], 'r']);
  });
});

describe('settledRows', () => {
  const list = rows(['q', 0], ['a', 1], ['a1', 2], ['b', 1], ['r', 0], ['r1', 1]);

  it("leaves out the objectives of tasks folding shut, keeping the tasks themselves", () => {
    expect(settledRows(list, ['q']).map((r) => r.id)).toEqual(['q', 'r', 'r1']);
    expect(settledRows(list, ['a', 'r']).map((r) => r.id)).toEqual(['q', 'a', 'b', 'r']);
  });

  it('keeps every row when nothing folds', () => {
    expect(settledRows(list, []).map((r) => r.id)).toEqual(['q', 'a', 'a1', 'b', 'r', 'r1']);
  });
});
