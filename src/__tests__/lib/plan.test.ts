/**
 * src/__tests__/lib/plan.test.ts: the TODAY and UPCOMING views (lib/plan.ts).
 * Runs in Europe/London (the test script sets TZ).
 */
import { todayRows, upcomingDays } from '@/lib/plan';

import { build } from '../helpers/tree';

const NOW = new Date(2026, 9, 12, 12).getTime(); // Mon 12 Oct 2026, noon
const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();

const state = build([
  [
    'Launch',
    { category: 'main' },
    [
      ['late', { dueAt: at(10, 9) }],
      ['morning', { dueAt: at(12, 9) }],
      ['evening', { dueAt: at(12, 18) }],
      ['done today', { dueAt: at(12, 10), done: true }],
      ['tomorrow', { dueAt: at(13, 9) }, [['sub thursday', { dueAt: at(15, 8) }]]],
      ['trashed', { dueAt: at(12, 11), deletedAt: 1 }],
    ],
  ],
  ['Finished', { done: true }, [['inside done quest', { dueAt: at(12, 15) }]]],
  ['far away', { dueAt: at(30, 9) }],
]);

describe('TODAY', () => {
  it('lists overdue then today, soonest first, open and live only', () => {
    const rows = todayRows(state, NOW);
    expect(rows.map((r) => r.id)).toEqual(['late', 'morning', 'evening']);
    expect(rows.map((r) => r.overdue)).toEqual([true, true, false]);
  });

  it('gives each row its area and project', () => {
    expect(todayRows(state, NOW)[0]!.path).toEqual(['MAIN', 'Launch']);
  });
});

describe('UPCOMING', () => {
  it('groups the next days by day, at any depth, and stops at the horizon', () => {
    const days = upcomingDays(state, NOW, 14);
    expect(days.map((d) => d.key)).toEqual(['2026-10-13', '2026-10-15']);
    expect(days[1]!.rows[0]).toMatchObject({ id: 'sub thursday', path: ['MAIN', 'Launch', 'tomorrow'] });
    expect(upcomingDays(state, NOW, 30).at(-1)!.key).toBe('2026-10-30');
  });
});
