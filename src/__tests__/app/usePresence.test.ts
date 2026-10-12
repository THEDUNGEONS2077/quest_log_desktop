// @vitest-environment jsdom
/**
 * src/__tests__/app/usePresence.test.ts: things leave the screen with a brief
 * hold (for their exit animation), and new ones replace them at once
 * (app/usePresence.ts).
 */
import { act, renderHook } from '@testing-library/react';

import { usePresence } from '@/app/usePresence';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('shows a value, keeps it while leaving, then drops it', () => {
  const { result, rerender } = renderHook(({ v }) => usePresence(v, 200), { initialProps: { v: 'a' as string | null } });
  expect(result.current).toEqual({ shown: 'a', leaving: false });
  rerender({ v: null });
  expect(result.current).toEqual({ shown: 'a', leaving: true });
  act(() => void vi.advanceTimersByTime(199));
  expect(result.current.shown).toBe('a');
  act(() => void vi.advanceTimersByTime(1));
  expect(result.current).toEqual({ shown: null, leaving: false });
});

it('a new value while the old one leaves replaces it at once, not leaving', () => {
  const { result, rerender } = renderHook(({ v }) => usePresence(v, 200), { initialProps: { v: 'a' as string | null } });
  rerender({ v: null });
  rerender({ v: 'b' });
  expect(result.current).toEqual({ shown: 'b', leaving: false });
  act(() => void vi.advanceTimersByTime(500));
  expect(result.current).toEqual({ shown: 'b', leaving: false });
});

it('nothing to show stays nothing', () => {
  const { result } = renderHook(() => usePresence<string>(null, 200));
  expect(result.current).toEqual({ shown: null, leaving: false });
});
