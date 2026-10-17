/**
 * src/app/Toast.tsx: the message at the bottom (`COMPLETED · +18 XP  UNDO`).
 *
 * Layer: UI. Shows the store's toast for 5 s; UNDO undoes the step it
 * describes (Ctrl+Z does too). It slides in, and slides back down and
 * fades when it goes (usePresence), never vanishing in one frame.
 *
 * Its clock (V1.1 pass 2026-10-17):
 *   - runs 5 s from when the toast appears, whatever else re-renders (it
 *     used to restart on every store change, so a toast stayed up as long
 *     as you kept working);
 *   - stops while the pointer is over the toast or the keyboard is in it,
 *     so UNDO can't vanish under your hand (WCAG 2.2.1), and runs on from
 *     where it was after;
 *   - shows as a thin line along the bottom that shrinks as time runs out
 *     (it stops with the clock; hidden under Reduce Motion).
 */
import { useEffect, useRef, useState } from 'react';

import { useActions, useAppStore, useStoreBundle } from '@/store/react';
import type { Page } from '@/store/uiState';

import { downloadBackup } from './backupFile';
import { cx } from './cx';
import { usePresence } from './usePresence';

/** How long a toast stays (ms), unless the pointer or the keyboard holds it. */
export const TOAST_MS = 5000;

/** A toast's button for each page it can open. */
const PAGE_BUTTON: Record<Page, string> = { whatsnew: 'WHAT’S NEW', settings: 'SETTINGS', help: 'HELP', trash: 'TRASH' };

/** How long a dismissed toast takes to leave (matches --base in theme.css). */
const EXIT_MS = 200;

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const actions = useActions();
  const { store } = useStoreBundle();
  // Held by the pointer or by the keyboard focus (either stops the clock).
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;
  // A new toast starts unheld (the previous-props pattern).
  const [toastKey, setToastKey] = useState(toast?.key);
  if (toastKey !== toast?.key) {
    setToastKey(toast?.key);
    setHovered(false);
    setFocused(false);
  }

  // The time this toast has left: a full clock for each new one, less what ran before a hold.
  const left = useRef(TOAST_MS);
  useEffect(() => {
    left.current = TOAST_MS;
  }, [toast?.key]);
  useEffect(() => {
    if (!toast || held) return;
    const started = performance.now();
    const t = setTimeout(() => store.getState().dismissToast(toast.key), left.current);
    return () => {
      clearTimeout(t);
      left.current = Math.max(0, left.current - (performance.now() - started));
    };
  }, [toast, held, store]);

  const { shown, leaving } = usePresence(toast, EXIT_MS);
  if (!shown) return null;
  return (
    <div
      key={shown.key}
      className={cx('toast', leaving && 'leaving', held && 'held')}
      role="status"
      aria-live="polite"
      inert={leaving}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <span>{shown.message}</span>
      {shown.open && (
        <button
          type="button"
          className="text-btn primary"
          onClick={() => {
            actions.openPage(shown.open!);
            actions.dismissToast(shown.key);
          }}
        >
          {PAGE_BUTTON[shown.open]}
        </button>
      )}
      {shown.backup && (
        <button
          type="button"
          className="text-btn primary"
          onClick={() => {
            actions.dismissToast(shown.key);
            downloadBackup(actions);
          }}
        >
          BACK UP
        </button>
      )}
      {shown.undo && (
        <button
          type="button"
          className="text-btn primary"
          onClick={() => {
            actions.undo();
            actions.dismissToast(shown.key);
          }}
        >
          UNDO
        </button>
      )}
      {/* The clock: shrinks over TOAST_MS, stops while held (app.css .toast-clock). */}
      <span className="toast-clock" style={{ animationDuration: `${TOAST_MS}ms` }} aria-hidden />
    </div>
  );
}
