/**
 * src/__tests__/store/idbKV.test.ts: the IndexedDB storage keeps the phone's
 * synchronous interface and stores every change, in order, and a journal
 * covers writes cut off by the page closing (store/idbKV.ts).
 */
import 'fake-indexeddb/auto';
import { createStore } from 'idb-keyval';

import { JOURNAL_KEY, type JournalStorage, openIdbKV } from '@/store/idbKV';

let n = 0;
const fresh = () => createStore(`test-${++n}`, 'kv');

/** A stand-in for localStorage. */
function memoryJournal(): JournalStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
    removeItem: (k) => void items.delete(k),
  };
}

it('reads come from memory at once; flushed writes are there after reopening', async () => {
  const idb = fresh();
  const kv = await openIdbKV(idb);
  kv.set('a', '1');
  kv.set('b', '2');
  kv.set('a', '3'); // the latest value wins
  kv.remove('b');
  expect(kv.getString('a')).toBe('3');
  expect(kv.getAllKeys()).toEqual(['a']);
  await kv.flush();
  const again = await openIdbKV(idb);
  expect(again.getString('a')).toBe('3');
  expect(again.getString('b')).toBeUndefined();
});

it('writes on its own soon after a change, without a flush', async () => {
  const idb = fresh();
  const kv = await openIdbKV(idb);
  kv.set('x', 'y');
  await new Promise((r) => setTimeout(r, 20));
  await kv.flush(); // waits for the write already started
  expect((await openIdbKV(idb)).getString('x')).toBe('y');
});

it('flush journals unconfirmed changes at once, and drops the journal once stored', async () => {
  const idb = fresh();
  const journal = memoryJournal();
  const kv = await openIdbKV(idb, journal);
  kv.set('a', '1');
  kv.remove('gone');
  const done = kv.flush();
  // Synchronously, before IndexedDB has it: what the page closing must not lose.
  expect(JSON.parse(journal.items.get(JOURNAL_KEY)!)).toEqual([
    ['a', '1'],
    ['gone', null],
  ]);
  await done;
  expect(journal.items.has(JOURNAL_KEY)).toBe(false);
});

it('a journal left by a page that closed mid-write is replayed on open', async () => {
  const idb = fresh();
  const first = await openIdbKV(idb, undefined);
  first.set('old', 'x');
  first.set('a', 'stale');
  await first.flush();
  // The page wrote its journal, then closed before IndexedDB stored the changes.
  const journal = memoryJournal();
  journal.setItem(JOURNAL_KEY, JSON.stringify([['a', 'new'], ['old', null], ['b', '2']]));
  const kv = await openIdbKV(idb, journal);
  expect(kv.getString('a')).toBe('new');
  expect(kv.getString('old')).toBeUndefined();
  expect(kv.getString('b')).toBe('2');
  await kv.flush();
  expect(journal.items.has(JOURNAL_KEY)).toBe(false);
  const again = await openIdbKV(idb, undefined);
  expect(again.getString('a')).toBe('new');
  expect(again.getString('old')).toBeUndefined();
});

it('a change made after the journal keeps it until that change is stored too', async () => {
  const idb = fresh();
  const journal = memoryJournal();
  const kv = await openIdbKV(idb, journal);
  kv.set('a', '1');
  const first = kv.flush();
  kv.set('a', '2'); // the page lived on (back from the back/forward cache) and changed it again
  await first;
  expect(journal.items.has(JOURNAL_KEY)).toBe(true);
  await kv.flush();
  expect(journal.items.has(JOURNAL_KEY)).toBe(false);
  expect((await openIdbKV(idb, undefined)).getString('a')).toBe('2');
});

it('an unreadable journal is ignored and removed', async () => {
  const journal = memoryJournal();
  journal.setItem(JOURNAL_KEY, '{not json');
  const kv = await openIdbKV(fresh(), journal);
  expect(kv.getAllKeys()).toEqual([]);
  expect(journal.items.has(JOURNAL_KEY)).toBe(false);
});
