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

/** Opens storage and creates the app's store. */
export async function startStore(): Promise<StoreBundle> {
  const kv = await openIdbKV();
  const store = createAppStore({ kv, now: Date.now, newId: () => crypto.randomUUID() });
  installPersistence(store, kv);
  // Best effort: Chrome grants it to installed apps; nothing breaks if it doesn't.
  void navigator.storage?.persist?.().catch(() => false);
  return bundleStore(store);
}
