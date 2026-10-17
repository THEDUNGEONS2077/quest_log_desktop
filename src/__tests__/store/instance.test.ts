/**
 * __tests__/store/instance.test.ts: one window at a time holds the tasks
 * (store/instance.ts, V1 pass 2026-10-17): a second window gets no lease
 * until the first lets go, and without Web Locks every window opens them.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { holdTasks, waitForTasks } from '@/store/instance';

/** A stand-in for navigator.locks: one exclusive lock, granted in request order. */
function fakeLocks() {
  let held = false;
  const waiting: (() => void)[] = [];
  return {
    request(_name: string, opts: { ifAvailable?: boolean }, cb: (lock: object | null) => Promise<void> | undefined) {
      const grant = () => {
        held = true;
        void Promise.resolve(cb({})).then(() => {
          held = false;
          waiting.shift()?.();
        });
      };
      if (!held) grant();
      else if (opts.ifAvailable) void cb(null);
      else waiting.push(grant);
      return Promise.resolve();
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('holding the tasks', () => {
  it('the first window gets them; a second gets nothing until the first lets go', async () => {
    vi.stubGlobal('navigator', { locks: fakeLocks() });
    const first = await holdTasks();
    expect(first).not.toBeNull();
    expect(await holdTasks()).toBeNull();
    let second = false;
    const waiting = waitForTasks().then(() => (second = true));
    await Promise.resolve();
    expect(second).toBe(false);
    first!.release();
    await waiting;
    expect(second).toBe(true);
  });

  it('without Web Locks every window opens them (as before)', async () => {
    vi.stubGlobal('navigator', {});
    expect(await holdTasks()).not.toBeNull();
    expect(await holdTasks()).not.toBeNull();
  });
});
