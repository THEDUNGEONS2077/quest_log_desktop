/**
 * src/__tests__/lib/areas.test.ts: areas (lib/areas.ts), ARCHIVE, the
 * repair of areas lost by 0.1.0, and how phone data and backups carry them.
 */
import {
  addAreaOp,
  archiveAreaOp,
  archivedAreas,
  cleanAreaName,
  deleteAreaForeverOp,
  deleteAreaOp,
  liveAreas,
  moveAreaOp,
  questsInArea,
  renameAreaOp,
  restoreAreaOp,
  restoreMissingAreasOp,
} from '@/lib/areas';
import { flattenActive, flattenCompleted } from '@/lib/flatten';
import { todayRows } from '@/lib/plan';
import { replaceOp } from '@/lib/backup';
import { apply } from '@/lib/ops';
import { categoryForNew, questCategory } from '@/lib/quests';
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

  describe('ARCHIVE', () => {
    const NOW = new Date(2026, 9, 12, 12).getTime();
    const setup = () =>
      build([
        ['a', { category: 'misc', dueAt: NOW - 1000 }, [['a1', { dueAt: NOW + 1000 }]]],
        ['b', { category: 'misc', done: true }],
        ['c', { category: 'misc', deletedAt: 5 }],
        ['e', { category: 'main' }],
      ]);

    it('deleting an area archives it with its quests, out of ALL / COMPLETED / TODAY, and undo brings it back', () => {
      const s = setup();
      const r = apply(s, archiveAreaOp(s, 'misc', NOW)!);
      expect(liveAreas(r.state).map((a) => a.id)).toEqual(['daily', 'main']);
      expect(archivedAreas(r.state)).toEqual([{ id: 'misc', name: 'MISC', archivedAt: NOW }]);
      expect(flattenActive(r.state, { category: 'all' }).map((x) => x.id)).toEqual(['e']);
      expect(flattenCompleted(r.state, new Set(), 'all')).toEqual([]);
      expect(todayRows(r.state, NOW)).toEqual([]);
      // Its own tab still shows it, so ARCHIVE can be looked through.
      expect(flattenActive(r.state, { category: 'misc' }).map((x) => x.id)).toContain('a');
      // A new quest under ALL never goes into an archived area.
      expect(categoryForNew('all', apply(s, archiveAreaOp(s, 'main', NOW)!).state.areas)).toBe('daily');
      expect(apply(r.state, r.inverse).state.areas).toEqual(s.areas);
    });

    it('never archives the last live area, and restore puts it back after the live ones', () => {
      let s = setup();
      s = apply(s, archiveAreaOp(s, 'daily', NOW)!).state;
      s = apply(s, archiveAreaOp(s, 'misc', NOW)!).state;
      expect(archiveAreaOp(s, 'main', NOW)).toBeNull();
      s = apply(s, restoreAreaOp(s, 'misc')!).state;
      expect(s.areas.map((a) => [a.id, a.archivedAt !== undefined])).toEqual([
        ['main', false],
        ['misc', false],
        ['daily', true],
      ]);
      // Moving a live area keeps it before the archived ones.
      expect(apply(s, moveAreaOp(s, 'main', 9)!).state.areas.map((a) => a.id)).toEqual(['misc', 'main', 'daily']);
      expect(restoreAreaOp(s, 'main')).toBeNull();
    });

    it('delete forever: quests to Trash, moved to the first live area, area gone; one undo step', () => {
      const s0 = setup();
      const s = apply(s0, archiveAreaOp(s0, 'misc', NOW)!).state;
      expect(deleteAreaForeverOp(s0, 'misc', NOW)).toBeNull(); // only from ARCHIVE
      const r = apply(s, deleteAreaForeverOp(s, 'misc', NOW)!);
      expect(r.state.areas.map((a) => a.id)).toEqual(['daily', 'main']);
      for (const id of ['a', 'b', 'c']) {
        expect(questCategory(tk(r.state, id)!)).toBe('daily');
        expect(tk(r.state, id)!.deletedAt).not.toBeNull();
      }
      expect(tk(r.state, 'c')!.deletedAt).toBe(5); // already in Trash: kept as it was
      const undone = apply(r.state, r.inverse).state;
      expect(undone.areas).toEqual(s.areas);
      for (const id of ['a', 'b', 'c']) {
        expect(tk(undone, id)!.category).toBe('misc');
        expect(tk(undone, id)!.deletedAt).toBe(tk(s, id)!.deletedAt);
      }
    });
  });

  it('repair: areas whose quests remain but the list lost come back, named from a snapshot or RECOVERED', () => {
    const s = build([
      ['a', { category: 'acme' }],
      ['b', { category: 'acme' }],
      ['c', { category: 'gone1' }],
      ['d', { category: 'main' }],
    ]);
    const r = apply(s, restoreMissingAreasOp(s, (id) => (id === 'acme' ? 'Client ACME' : undefined))!);
    expect(r.state.areas.slice(3)).toEqual([
      { id: 'acme', name: 'Client ACME' },
      { id: 'gone1', name: 'RECOVERED 2' },
    ]);
    expect(restoreMissingAreasOp(r.state, () => undefined)).toBeNull();
  });
});

