/**
 * src/app/Toast.tsx: the message at the bottom (`COMPLETED · +18 XP  UNDO`).
 *
 * Layer: UI. Shows the store's toast for 5 s; UNDO undoes the step it
 * describes (Ctrl+Z does too).
 */
import { useEffect } from 'react';

import { useActions, useAppStore } from '@/store/react';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const actions = useActions();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => actions.dismissToast(toast.key), 5000);
    return () => clearTimeout(t);
  }, [toast, actions]);
  if (!toast) return null;
  return (
    <div key={toast.key} className="toast" role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          className="text-btn primary"
          onClick={() => {
            actions.undo();
            actions.dismissToast(toast.key);
          }}
        >
          UNDO
        </button>
      )}
    </div>
  );
}
