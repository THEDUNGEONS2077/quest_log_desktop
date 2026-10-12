/**
 * src/app/usePresence.ts: keeps something on screen a moment after it's
 * gone, so it can animate out instead of vanishing in one frame (the toast,
 * the right-click menu, dialogs; animation pass 2026-10-12).
 *
 * Layer: UI. Pure React state, no timers outside the one exit timer.
 */
import { type RefObject, useEffect, useLayoutEffect, useState } from 'react';

/**
 * For `value` (null = gone): returns what to render (`shown`, which outlives
 * `value` by `exitMs`) and whether it's on its way out (`leaving`: give it
 * the exit class). A new value replaces the old one at once. With Reduce
 * Motion the CSS exit takes 0 ms, so the brief hold is invisible.
 */
export function usePresence<T>(value: T | null, exitMs: number): { shown: T | null; leaving: boolean } {
  const [shown, setShown] = useState<T | null>(value);
  const [leaving, setLeaving] = useState(false);
  // Follow `value` during render (the previous-props pattern): a new value
  // shows now; a cleared one starts leaving.
  if (value !== null && value !== shown) {
    setShown(value);
    setLeaving(false);
  } else if (value === null && shown !== null && !leaving) {
    setLeaving(true);
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, exitMs);
    return () => clearTimeout(t);
  }, [leaving, exitMs]);
  return { shown: value ?? shown, leaving: value === null && leaving };
}

/**
 * While `leaving`, the element under `ref` gives up the keyboard: whatever
 * inside it has focus is blurred at once, so the keys typed during its
 * fade-out reach the app's shortcuts, not the closing menu or dialog.
 */
export function useReleaseFocus(ref: RefObject<HTMLElement | null>, leaving: boolean): void {
  // Layout effect: blurred in the same commit, before the next key can arrive.
  useLayoutEffect(() => {
    if (!leaving) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && ref.current?.contains(active)) active.blur();
  }, [ref, leaving]);
}
