/**
 * src/app/useDueSignal.ts: what's due, outside the app (V1 pass 2026-10-17):
 * the window's title reads "quest_log · 3 due" (the tab, the taskbar,
 * Alt+Tab), and the installed app's icon carries the same count as a badge.
 *
 * Layer: UI (document and navigator side effects). The count is TODAY's:
 * overdue plus due today, open tasks at any depth. Nothing due: the plain
 * title, no badge. The badge needs the installed app (Chrome); elsewhere
 * it's skipped.
 */
import { useEffect } from 'react';

import { useAppStore, useSelectors } from '@/store/react';

import { useMinute } from './useMinute';

/** Keeps the window title and the app badge on TODAY's count. */
export function useDueSignal(): void {
  const selectors = useSelectors();
  const now = useMinute();
  const due = useAppStore((s) => selectors.todayRows(s, now).length);
  useEffect(() => {
    document.title = due > 0 ? `quest_log · ${due} due` : 'quest_log';
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    // Best effort: unsupported or not installed, nothing shows and nothing breaks.
    void (due > 0 ? nav.setAppBadge?.(due) : nav.clearAppBadge?.())?.catch(() => undefined);
  }, [due]);
}
