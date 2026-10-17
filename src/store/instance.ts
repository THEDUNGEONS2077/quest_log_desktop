/**
 * src/store/instance.ts: one window at a time holds the tasks (V1 pass
 * 2026-10-17). The installed app and a browser tab on the same site share
 * one IndexedDB; both writing to it, the last write won and the other
 * window's changes were lost.
 *
 * Layer: store (browser coordination, no React). How:
 *   - the window that opens first holds a Web Lock for as long as it has
 *     the tasks open (`holdTasks`);
 *   - a second window gets no lock: it loads nothing and writes nothing,
 *     and offers USE HERE (src/main.tsx);
 *   - USE HERE asks the holder over a BroadcastChannel to step aside
 *     (`askToStepAside`); the holder saves everything, closes its store and
 *     lets the lock go (`onStepAside`); the asker, waiting for the lock
 *     (`waitForTasks`), then opens the tasks as they were just saved.
 * The lock goes by itself when its window closes or crashes. Without Web
 * Locks (old browsers, tests) every window opens the tasks, as before.
 */

/** The lock's and the channel's names (this app only). */
const LOCK = 'quest_log_desktop:tasks';
const CHANNEL = 'quest_log_desktop:windows';

/** The tasks held by this window: `release` lets them go to another window. */
export interface Lease {
  release(): void;
}

/** Requests the lock; resolves with the lease once held, or null when `ifAvailable` and another window has it. */
function request(ifAvailable: boolean): Promise<Lease | null> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return Promise.resolve({ release: () => {} });
  return new Promise((resolve) => {
    void locks.request(LOCK, { ifAvailable }, (lock) => {
      if (!lock) {
        resolve(null);
        return undefined;
      }
      // Held until released: the callback's promise is the lock's lifetime.
      return new Promise<void>((done) => resolve({ release: () => done() }));
    });
  });
}

/** The lease on the tasks if no other window holds them, else null (at once, without waiting). */
export function holdTasks(): Promise<Lease | null> {
  return request(true);
}

/** Waits until this window can hold the tasks (another window has stepped aside or closed). */
export function waitForTasks(): Promise<Lease> {
  return request(false) as Promise<Lease>;
}

/** Asks the window holding the tasks to save and step aside (USE HERE). */
export function askToStepAside(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage({ type: 'step-aside' });
  channel.close();
}

/**
 * For the window holding the tasks: runs `stepAside` when another window
 * asks for them (it should save everything, close the store, and release
 * the lease). Returns a function that stops listening.
 */
export function onStepAside(stepAside: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (e: MessageEvent<{ type?: string }>) => {
    if (e.data?.type === 'step-aside') stepAside();
  };
  return () => channel.close();
}
