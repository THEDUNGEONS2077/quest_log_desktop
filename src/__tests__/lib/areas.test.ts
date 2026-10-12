/**
 * src/__tests__/lib/areas.test.ts: areas (lib/areas.ts), and how phone
 * data and backups carry them.
 */
import { addAreaOp, cleanAreaName, deleteAreaOp, moveAreaOp, questsInArea, renameAreaOp } from '@/lib/areas';
import { replaceOp } from '@/lib/backup';
import { apply } from '@/lib/ops';
import { questCategory } from '@/lib/quests';
import { createEmptyState, fromDocument, toDocument } from '@/lib/tree';
import { DEFAULT_AREAS } from '@/lib/types';

import { build, tk } from '../helpers/tree';

const daily = { freq: 'day', interval: 1, from: 'schedule' } as const;

describe('areas', () => {
  it('phone data (no areas saved) gets the phone categories as areas', () => {
    const doc = toDocument(build([['q']]));
    delete doc.areas;
    expect(fromDocument(doc).areas).toEqual(DEFAULT_AREAS);
  });

  it('add, rename and move are exact, undoable ops', () => {
    const s0 = createEmptyState();
    const added = apply(s0, addAreaOp(s0, 'acme', '  Client   ACME ')!);
    expect(added.state.areas.at(-1)).toEqual({ id: 'acme', name: 'Client ACME' });
    const renamed = apply(added.state, renameAreaOp(added.state, 'acme', 'ACME Corp')!);
    const moved = apply(renamed.state, moveAreaOp(renamed.state, 'acme', 0)!);
    expect(moved.state.areas.map((a) => a.id)).toEqual(['acme', 'daily', 'main', 'misc']);
    // Undo everything, in reverse.
    const back = apply(apply(apply(moved.state, moved.inverse).state, renamed.inverse).state, added.inverse).state;
    expect(back.areas).toEqual(s0.areas);
  });

  it('refuses empty names, unknown areas and no-op changes', () => {
    const s = createEmptyState();
    expect(addAreaOp(s, 'x', '   ')).toBeNull();
    expect(addAreaOp(s, 'main', 'Dup id')).toBeNull();
    expect(renameAreaOp(s, 'main', 'MAIN')).toBeNull();
    expect(renameAreaOp(s, 'nope', 'X')).toBeNull();
    expect(moveAreaOp(s, 'daily', 0)).toBeNull();
    expect(cleanAreaName('x'.repeat(50))).toHaveLength(32);
  });

  it('deleting an area moves all its quests (stored or derived, done or trashed) in one undo step', () => {
    const s = build([
      ['a', { category: 'misc' }],
      ['b', { category: 'misc', done: true }],
      ['c', { category: 'misc', deletedAt: 5 }],
      ['d', { repeat: daily }], // no stored category: DAILY by derivation
      ['e', { category: 'main' }],
    ]);
    expect(questsInArea(s, 'misc')).toBe(3);
    const r = apply(apply(s, deleteAreaOp(s, 'misc', 'main')!).state, deleteAreaOp(apply(s, deleteAreaOp(s, 'misc', 'main')!).state, 'daily', 'main')!);
    expect(r.state.areas.map((a) => a.id)).toEqual(['main']);
    for (const id of ['a', 'b', 'c', 'd', 'e']) expect(questCategory(tk(r.state, id)!)).toBe('main');
    expect(deleteAreaOp(r.state, 'main', 'main')).toBeNull(); // never the last one
  });

  it('a replace from a phone backup restores the default areas; one from desktop brings its own', () => {
    const s = apply(createEmptyState(), addAreaOp(createEmptyState(), 'acme', 'ACME')!).state;
    const phone = toDocument(build([['q']]));
    delete phone.areas;
    expect(apply(s, replaceOp(s, phone)!).state.areas).toEqual(DEFAULT_AREAS);
    const desktop = toDocument(s);
    expect(apply(createEmptyState(), replaceOp(createEmptyState(), desktop)!).state.areas.map((a) => a.id)).toContain('acme');
  });
});
