/**
 * src/app/Dialog.tsx: a small modal question (renaming or deleting an area,
 * deleting from Trash, replacing everything from a backup).
 *
 * Layer: UI. A title, a line of explanation, then a text field or a list
 * of choices, and CANCEL / OK. Enter confirms, Esc cancels, a click on the
 * dimmed backdrop cancels.
 *
 * The keyboard (V1.1 pass 2026-10-17):
 *   - focus moves into the dialog as it opens: its field or first choice,
 *     else OK, or CANCEL when OK can't be undone (`danger`), so a stray
 *     Enter never destroys anything; it went nowhere before, and Enter
 *     could press the button behind the dialog again;
 *   - Tab and Shift+Tab cycle inside the dialog (it's modal);
 *   - `danger` also styles OK as destructive (app.css `.text-btn.danger`).
 */
import { type FormEvent, type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from 'react';

import { cx } from './cx';
import type { DialogState } from './menu';
import { useReleaseFocus } from './usePresence';
import { Prompted } from './Prompted';

/** What can take the keyboard inside the dialog, in order. */
const FOCUSABLE = 'input:not(:disabled), button:not(:disabled)';

/** The dialog; `leaving` while it fades out after closing (app/usePresence.ts). */
export function Dialog({ dialog, onClose, leaving = false }: { dialog: DialogState; onClose: () => void; leaving?: boolean }) {
  const [value, setValue] = useState(dialog.input?.value ?? dialog.choices?.[0]?.value ?? '');
  const layer = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const ok = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  useReleaseFocus(layer, leaving);
  // Into the dialog as it opens (a field or a choice focuses itself: autoFocus).
  useLayoutEffect(() => {
    if (dialog.input || dialog.choices) return;
    (dialog.danger ? cancel : ok).current?.focus();
  }, [dialog]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (dialog.input && !value.trim()) return;
    onClose();
    dialog.onOk(value);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (leaving) return; // closing: keys belong to the app again
    if (e.key === 'Escape') onClose();
    // Modal: Tab cycles through the dialog's own controls.
    if (e.key === 'Tab') {
      const items = [...e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    }
    e.stopPropagation();
  };
  return (
    <div ref={layer} className={leaving ? 'dialog-layer leaving' : 'dialog-layer'} onMouseDown={onClose} inert={leaving}>
      <div
        className="dialog"
        role={dialog.danger ? 'alertdialog' : 'dialog'}
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={dialog.message ? messageId : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <form className="dialog-form" onSubmit={submit}>
          <h2 id={titleId} className="dialog-title">
            <Prompted>{dialog.title}</Prompted>
          </h2>
          {dialog.message && (
            <p id={messageId} className="dialog-message">
              {dialog.message}
            </p>
          )}
          {dialog.input && (
            <input autoFocus value={value} maxLength={dialog.input.maxLength} placeholder={dialog.input.placeholder} onChange={(e) => setValue(e.target.value)} aria-label={dialog.title} />
          )}
          {dialog.choices && (
            <div className="dialog-choices" role="radiogroup" aria-label={dialog.title}>
              {dialog.choices.map((c, i) => (
                <label key={c.value} className="dialog-choice">
                  <input type="radio" name="choice" value={c.value} checked={value === c.value} autoFocus={i === 0} onChange={() => setValue(c.value)} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
          <div className="dialog-buttons">
            <button ref={cancel} type="button" className="text-btn" onClick={onClose}>
              CANCEL
            </button>
            <button ref={ok} type="submit" className={cx('text-btn', dialog.danger ? 'danger' : 'primary')}>
              {dialog.ok}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
