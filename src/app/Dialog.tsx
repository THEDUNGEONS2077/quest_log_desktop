/**
 * src/app/Dialog.tsx: a small modal question (renaming or deleting an area).
 *
 * Layer: UI. A title, a line of explanation, then a text field or a list
 * of choices, and CANCEL / OK. Enter confirms, Esc cancels, a click on the
 * dimmed backdrop cancels.
 */
import { type FormEvent, useState } from 'react';

import type { DialogState } from './menu';

export function Dialog({ dialog, onClose }: { dialog: DialogState; onClose: () => void }) {
  const [value, setValue] = useState(dialog.input?.value ?? dialog.choices?.[0]?.value ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (dialog.input && !value.trim()) return;
    onClose();
    dialog.onOk(value);
  };
  return (
    <div className="dialog-layer" onMouseDown={onClose}>
      <form
        className="dialog"
        role="dialog"
        aria-modal
        aria-label={dialog.title}
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          e.stopPropagation();
        }}
      >
        <h2 className="dialog-title">{'>'} {dialog.title}</h2>
        {dialog.message && <p className="dialog-message">{dialog.message}</p>}
        {dialog.input && (
          <input autoFocus value={value} maxLength={dialog.input.maxLength} placeholder={dialog.input.placeholder} onChange={(e) => setValue(e.target.value)} aria-label={dialog.title} />
        )}
        {dialog.choices && (
          <div className="dialog-choices" role="radiogroup">
            {dialog.choices.map((c, i) => (
              <label key={c.value} className="dialog-choice">
                <input type="radio" name="choice" value={c.value} checked={value === c.value} autoFocus={i === 0} onChange={() => setValue(c.value)} />
                {c.label}
              </label>
            ))}
          </div>
        )}
        <div className="dialog-buttons">
          <button type="button" className="text-btn" onClick={onClose}>
            CANCEL
          </button>
          <button type="submit" className="text-btn primary">
            {dialog.ok}
          </button>
        </div>
      </form>
    </div>
  );
}
