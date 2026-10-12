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
 *     waits for them, e.g. before the page is hidden);
 *   - a write still on its way when the tab is reloaded or closed can be
 *     cut off (IndexedDB is asynchronous; the page may be gone before it
 *     commits). So `flush()` first copies every change not yet confirmed
 *     stored into a small journal in localStorage, which is synchronous and
 *     finished before the page goes. The next open replays the journal into
 *     IndexedDB; the journal is removed once IndexedDB has everything.
 * Everything lives in its own database (`quest_log_desktop`), so it can't
 * collide with anything else on the same site. Nothing leaves the browser.
 */
import { clear, createStore, delMany, entries, setMany, type UseStore } from 'idb-keyval';

import type { KV } from './kv';

/** The database and object store names. */
const DB_NAME = 'quest_log_desktop';
const STORE_NAME = 'kv';
/** The localStorage key of the journal of unconfirmed changes. */
export const JOURNAL_KEY = 'quest_log_desktop:journal';

/** Where the journal is kept: localStorage, or a stand-in in tests. */
export type JournalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** localStorage if the browser allows it (blocked site data throws on access). */
function defaultJournal(): JournalStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** A KV backed by IndexedDB. */
export interface PersistentKV extends KV {
  /** Journals unconfirmed changes at once, then resolves once every queued write is stored. */
  flush(): Promise<void>;
}

/**
 * Opens the storage: reads everything into memory, replays any journal left
 * by a page that closed mid-write, then returns the synchronous KV.
 * `journal` is where unconfirmed changes are copied on `flush()` (default:
 * localStorage; undefined = no journal).
 */
export async function openIdbKV(
  idb: UseStore = createStore(DB_NAME, STORE_NAME),
  journal: JournalStorage | undefined = defaultJournal(),
): Promise<PersistentKV> {
  const memory = new Map<string, string>();
  for (const [k, v] of await entries<string, string>(idb)) memory.set(k, v);

  // Changes waiting to be written: the latest value per key (undefined = remove).
  let pending = new Map<string, string | undefined>();
  // Every change not yet confirmed stored (queued or being written): what the journal holds.
  const unsaved = new Map<string, string | undefined>();
  // A journal exists in storage and should go once everything is stored.
  let journaled = false;
  let writing: Promise<void> = Promise.resolve();
  let scheduled = false;

  /** Copies the unconfirmed changes into the journal, synchronously (null = remove). */
  const writeJournal = () => {
    if (!journal || unsaved.size === 0) return;
    try {
      journal.setItem(JOURNAL_KEY, JSON.stringify([...unsaved].map(([k, v]) => [k, v ?? null])));
      journaled = true;
    } catch {
      // Full or blocked: the IndexedDB write is still on its way, as without a journal.
    }
  };

  /** A batch is stored: forget its changes (unless changed again since), and the journal once all are. */
  const confirm = (batch: Map<string, string | undefined>) => {
    for (const [k, v] of batch) if (unsaved.has(k) && unsaved.get(k) === v) unsaved.delete(k);
    if (journaled && unsaved.size === 0) {
      try {
        journal?.removeItem(JOURNAL_KEY);
      } catch {
        // Left behind, it only replays values IndexedDB already has.
      }
      journaled = false;
    }
  };

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
      confirm(batch);
    });
    return writing;
  };

  const queue = (key: string, value: string | undefined) => {
    pending.set(key, value);
    unsaved.set(key, value);
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => void write(), 0);
    }
  };

  // A journal left by a page that closed before its writes landed: newer than
  // what IndexedDB has, so it's applied on top and written again.
  let raw: string | null = null;
  let left: unknown = null;
  try {
    raw = journal?.getItem(JOURNAL_KEY) ?? null;
    left = JSON.parse(raw ?? 'null');
  } catch {
    // Unreadable (or storage blocked): treated as no usable journal below.
  }
  if (raw !== null && !Array.isArray(left)) {
    // Unreadable: nothing to replay, so it goes now.
    try {
      journal?.removeItem(JOURNAL_KEY);
    } catch {
      // Blocked storage: ignored on every open anyway.
    }
  } else if (Array.isArray(left)) {
    journaled = true;
    for (const entry of left as unknown[]) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
      const [k, v] = entry as [string, unknown];
      if (typeof v === 'string') {
        memory.set(k, v);
        queue(k, v);
      } else {
        memory.delete(k);
        queue(k, undefined);
      }
    }
    // An empty journal goes at once (nothing to wait for).
    if (unsaved.size === 0) confirm(new Map());
  }

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
    // Journal first (synchronous, survives the page closing), then write.
    flush() {
      writeJournal();
      return write();
    },
  };
}

/** Deletes everything stored (developer tools only). */
export async function wipeIdb(idb: UseStore = createStore(DB_NAME, STORE_NAME)): Promise<void> {
  await clear(idb);
}
