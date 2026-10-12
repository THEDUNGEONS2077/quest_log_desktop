/**
 * src/app/Toast.tsx: the message at the bottom (`COMPLETED · +18 XP  UNDO`).
 *
 * Layer: UI. Shows the store's toast for 5 s; UNDO undoes the step it
 * describes (Ctrl+Z does too). It slides in, and slides back down and
 * fades when it goes (usePresence), never vanishing in one frame.
 */
import { useEffect } from 'react';

import { usePresence } from './usePresence';

/** How long a dismissed toast takes to leave (matches --base in theme.css). */
const EXIT_MS = 200;

import { useActions, useAppStore } from '@/store/react';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const actions = useActions();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => actions.dismissToast(toast.key), 5000);
    return () => clearTimeout(t);
  }, [toast, actions]);
  const { shown, leaving } = usePresence(toast, EXIT_MS);
  if (!shown) return null;
  return (
    <div key={shown.key} className={leaving ? 'toast leaving' : 'toast'} role="status" aria-live="polite" inert={leaving}>
      <span>{shown.message}</span>
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
    </div>
  );
}
