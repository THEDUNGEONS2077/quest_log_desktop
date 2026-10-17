/**
 * __tests__/store/v1.test.ts: the V1 pass's store behaviour (2026-10-17):
 * the update notice after a new build, and the desktop example quests
 * (their shorthand becomes fields, in one undo step).
 */
import { describe, expect, it } from 'vitest';

import { findTask, taskCount } from '@/lib/taskMap';
import { childIds } from '@/lib/tree';
import { createAppStore } from '@/store/createStore';
import { createMemoryKV } from '@/store/kv';

const NOW = Date.UTC(2026, 9, 17, 8, 0);

function makeStore(saved: Record<string, string> = {}) {
  let n = 0;
  return createAppStore({ kv: createMemoryKV(saved), now: () => NOW, newId: () => `t${++n}` });
}

describe('the update notice', () => {
  it('a first start says nothing and remembers the build', () => {
    const store = makeStore();
    store.getState().noticeUpdate(14, '1.0.0');
    expect(store.getState().toast).toBeNull();
    expect(store.getState().onboarding.lastSeenBuild).toBe(14);
  });

  it('a newer build than last seen: UPDATED with WHAT’S NEW, once', () => {
    const store = makeStore({ 'onboarding.v1': JSON.stringify({ tipsSeen: [], lastSeenBuild: 13 }) });
    store.getState().noticeUpdate(14, '1.0.0');
    expect(store.getState().toast).toMatchObject({ message: 'UPDATED TO v1.0.0', open: 'whatsnew' });
    store.getState().dismissToast(store.getState().toast!.key);
    store.getState().noticeUpdate(14, '1.0.0');
    expect(store.getState().toast).toBeNull();
  });

  it('nothing recorded yet but tasks saved (an update from before 1.0): says so', () => {
    const store = makeStore();
    store.getState().loadExampleTasks();
    store.getState().dismissToast(store.getState().toast!.key);
    store.getState().noticeUpdate(14, '1.0.0');
    expect(store.getState().toast?.message).toBe('UPDATED TO v1.0.0');
  });
});

describe('the example quests', () => {
  it('quests get their shorthand as fields; objectives stay as written; one undo removes them', () => {
    const store = makeStore();
    store.getState().loadExampleTasks();
    const s = store.getState();
    const quests = childIds(s.tasks, null).map((id) => findTask(s.tasks, id)!);
    const welcome = quests.find((q) => q.title === 'Welcome to quest_log')!;
    expect(welcome.priority).toBe(2);
    expect(welcome.dueAt).not.toBeNull();
    expect(quests.find((q) => q.title === 'Clear the inbox')!.repeat).not.toBeNull();
    const shorthand = childIds(s.tasks, welcome.id)
      .map((id) => findTask(s.tasks, id)!.title)
      .find((t) => t.includes('@fri'));
    expect(shorthand).toContain('!! @fri 3pm');
    expect(quests.every((q) => q.category === 'main')).toBe(true);
    store.getState().undo();
    expect(taskCount(store.getState().tasks)).toBe(0);
  });
});

describe('the backup reminder', () => {
  const DAY = 86_400_000;
  /** A store whose clock can move, with the example quests made at `made`. */
  function withTasks(made: number) {
    let t = made;
    let n = 0;
    const store = createAppStore({ kv: createMemoryKV(), now: () => t, newId: () => `t${++n}` });
    store.getState().loadExampleTasks();
    store.getState().dismissToast(store.getState().toast!.key);
    return { store, at: (when: number) => (t = when) };
  }

  it('not on the first days; after two weeks without a backup, BACK UP; then not again for a week', () => {
    const { store, at } = withTasks(NOW);
    at(NOW + 3 * DAY);
    store.getState().noticeBackup();
    expect(store.getState().toast).toBeNull();
    at(NOW + 15 * DAY);
    store.getState().noticeBackup();
    expect(store.getState().toast).toMatchObject({ message: 'NO BACKUP YET', backup: true });
    store.getState().dismissToast(store.getState().toast!.key);
    at(NOW + 18 * DAY);
    store.getState().noticeBackup();
    expect(store.getState().toast).toBeNull();
  });

  it('counts from the last backup', () => {
    const { store, at } = withTasks(NOW);
    store.getState().markBackedUp(NOW + 20 * DAY);
    at(NOW + 30 * DAY);
    store.getState().noticeBackup();
    expect(store.getState().toast).toBeNull();
    at(NOW + 36 * DAY);
    store.getState().noticeBackup();
    expect(store.getState().toast?.message).toBe('LAST BACKUP 16 DAYS AGO');
  });

  it('never over another toast (the update notice comes first)', () => {
    const { store, at } = withTasks(NOW);
    at(NOW + 30 * DAY);
    store.getState().showToast('UPDATED TO v1.0.0', false, 'whatsnew');
    store.getState().noticeBackup();
    expect(store.getState().toast?.message).toBe('UPDATED TO v1.0.0');
  });
});

describe('undo and redo say what they did (V1.1 refinement)', () => {
  it('UNDONE offers REDO, REDONE offers UNDO, and an empty history says so', () => {
    const store = makeStore();
    store.getState().undoWithNotice();
    expect(store.getState().toast).toMatchObject({ message: 'NOTHING TO UNDO', undo: false });
    store.getState().addTask(null, 'A quest');
    store.getState().undoWithNotice();
    expect(store.getState().toast).toMatchObject({ message: 'UNDONE', redo: true });
    expect(taskCount(store.getState().tasks)).toBe(0);
    store.getState().redoWithNotice();
    expect(store.getState().toast).toMatchObject({ message: 'REDONE', undo: true });
    expect(taskCount(store.getState().tasks)).toBe(1);
    store.getState().redoWithNotice();
    expect(store.getState().toast?.message).toBe('NOTHING TO REDO');
  });
});
