/**
 * __tests__/app/wording.test.ts: how times read (V1.1 pass 2026-10-17):
 * "on Sep 27", never "sep 27 ago"; "yesterday", never "yesterday ago"; and
 * UPCOMING's nearest day is TOMORROW.
 */
import { describe, expect, it } from 'vitest';

import { ago } from '@/app/ago';
import { dayLabel } from '@/app/PlanList';

const NOW = new Date(2026, 9, 17, 15, 0).getTime();
const MIN = 60_000;
const DAY = 86_400_000;

describe('ago', () => {
  it('reads as words at every distance', () => {
    expect(ago(NOW - 10_000, NOW)).toBe('just now');
    expect(ago(NOW - 5 * MIN, NOW)).toBe('5m ago');
    expect(ago(NOW - 3 * 60 * MIN, NOW)).toBe('3h ago');
    expect(ago(NOW - DAY, NOW)).toBe('yesterday');
    expect(ago(NOW - 20 * DAY, NOW)).toBe('on Sep 27');
    expect(ago(new Date(2025, 2, 14).getTime(), NOW)).toBe('on Mar 14 2025');
  });
});

describe('dayLabel', () => {
  it('names the day after today TOMORROW, other days by their date', () => {
    expect(dayLabel(new Date(2026, 9, 18).getTime(), NOW)).toBe('TOMORROW · SUN 18 OCT');
    expect(dayLabel(new Date(2026, 9, 20).getTime(), NOW)).toBe('TUE 20 OCT');
    expect(dayLabel(new Date(2026, 9, 20).getTime())).toBe('TUE 20 OCT');
  });
});
