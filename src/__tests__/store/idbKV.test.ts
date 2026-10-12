/**
 * src/__tests__/store/idbKV.test.ts: the IndexedDB storage keeps the phone's
 * synchronous interface and stores every change, in order (store/idbKV.ts).
 */
import 'fake-indexeddb/auto';
import { createStore } from 'idb-keyval';

import { openIdbKV } from '@/store/idbKV';

let n = 0;
const fresh = () => createStore(`test-${++n}`, 'kv');

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
