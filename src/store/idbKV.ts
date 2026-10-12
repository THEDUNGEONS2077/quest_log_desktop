/**
 * src/store/idbKV.ts: the app's storage, IndexedDB behind the phone's small
 * synchronous key-value interface (store/kv.ts).
 *
 * Layer: store. The phone app saves through a synchronous key-value store
 * (MMKV), and its persistence (store/persist.ts: incremental saves, daily
 * snapshots, recovery) and the store itself were written for that. In the
 * browser, IndexedDB is the durable storage (localStorage is small and
 * blocking), but it's asynchronous. So:
 *   - opening reads every saved key into memory once (a few ms; the app
 *     waits for it before its first render: src/main.tsx);
 *   - reads come from memory, synchronously, exactly as on the phone;
 *   - writes and removals update memory at once and are queued to
 *     IndexedDB in order, written together on the next tick (`flush()`
 *     waits for them, e.g. before the page is hidden).
 * Everything lives in its own database (`quest_log_desktop`), so it can't
 * collide with anything else on the same site. Nothing leaves the browser.
 */
import { clear, createStore, delMany, entries, setMany, type UseStore } from 'idb-keyval';

import type { KV } from './kv';

/** The database and object store names. */
const DB_NAME = 'quest_log_desktop';
const STORE_NAME = 'kv';

/** A KV backed by IndexedDB; `flush()` resolves once every queued write is stored. */
export interface PersistentKV extends KV {
  flush(): Promise<void>;
}

/** Opens the storage: reads everything into memory, then returns the synchronous KV. */
export async function openIdbKV(idb: UseStore = createStore(DB_NAME, STORE_NAME)): Promise<PersistentKV> {
  const memory = new Map<string, string>();
  for (const [k, v] of await entries<string, string>(idb)) memory.set(k, v);

  // Changes waiting to be written: the latest value per key (undefined = remove).
  let pending = new Map<string, string | undefined>();
  let writing: Promise<void> = Promise.resolve();
  let scheduled = false;

  /** Writes the queued changes, after any write already in progress (order is kept). */
  const write = (): Promise<void> => {
    scheduled = false;
    if (pending.size === 0) return writing;
    const batch = pending;
    pending = new Map();
    const sets = [...batch].filter((e): e is [string, string] => e[1] !== undefined);
    const dels = [...batch].filter(([, v]) => v === undefined).map(([k]) => k);
    writing = writing.then(async () => {
      if (sets.length) await setMany(sets, idb);
      if (dels.length) await delMany(dels, idb);
    });
    return writing;
  };

  const queue = (key: string, value: string | undefined) => {
    pending.set(key, value);
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => void write(), 0);
    }
  };

  return {
    getString: (k) => memory.get(k),
    set(k, v) {
      memory.set(k, v);
      queue(k, v);
    },
    remove(k) {
      memory.delete(k);
      queue(k, undefined);
    },
    getAllKeys: () => [...memory.keys()],
    flush: write,
  };
}

/** Deletes everything stored (developer tools only). */
export async function wipeIdb(idb: UseStore = createStore(DB_NAME, STORE_NAME)): Promise<void> {
  await clear(idb);
}
