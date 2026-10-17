/**
 * src/store/index.ts: starts the store (desktop).
 *
 * Layer: store. Opens the IndexedDB storage (read into memory once), creates
 * the store on it exactly as the phone does on MMKV, starts saving, and asks
 * Chrome to keep the data persistent (an installed app's storage is then
 * never cleared to make room). Returns the bundle the React tree uses.
 */
import { createAppStore, installPersistence } from './createStore';
import { openIdbKV } from './idbKV';
import { bundleStore, type StoreBundle } from './react';

/** The running store, and how to close it (another window takes the tasks: store/instance.ts). */
export interface StartedStore {
  bundle: StoreBundle;
  /** Saves everything still pending, stops saving, and resolves once it's all in IndexedDB. */
  close(): Promise<void>;
}

/** Opens storage and creates the app's store. */
export async function startStore(): Promise<StartedStore> {
  const kv = await openIdbKV();
  const store = createAppStore({ kv, now: Date.now, newId: () => crypto.randomUUID() });
  const persistence = installPersistence(store, kv);
  // Best effort: Chrome grants it to installed apps; nothing breaks if it doesn't.
  void navigator.storage?.persist?.().catch(() => false);
  return {
    bundle: bundleStore(store),
    async close() {
      persistence.flush();
      persistence();
      await kv.flush();
    },
  };
}
