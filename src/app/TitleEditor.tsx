/**
 * src/app/TitleEditor.tsx: the in-place editor for a task's title (the
 * phone's InlineEditor, for a keyboard).
 *
 *   typing             → updateTitle (one undo step per editing session)
 *   Enter              → finishEditing (save; shorthand becomes fields)
 *   Alt+Enter          → save, then a new objective (in a quest) or the
 *                        next one below (in an objective): addNextSubtask
 *   Esc                → finishEditing
 *   Tab / Shift+Tab    → indent / outdent, still editing
 *   Backspace on empty → delete the task (backspaceOnEmpty)
 *   paste with lines   → one task per line (pasteIntoTask)
 *   leaving the field  → finishEditing
 * The field grows with its text (CSS `field-sizing: content`, Chrome).
 * Above it float the task's chips: what typed shorthand will do, and its
 * current values (TaskChips), as on the phone.
 */
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import { TITLE_MAX } from '@/lib/paste';
import { findTask } from '@/lib/taskMap';
import { useActions, useAppStore } from '@/store/react';

import { TaskChips } from './Chips';

export function TitleEditor({ id, className }: { id: string; className?: string }) {
  const title = useAppStore((s) => findTask(s.tasks, id)?.title ?? '');
  const caret = useAppStore((s) => s.editingCaret);
  const actions = useActions();
  const field = useRef<HTMLTextAreaElement>(null);

  // Focus on opening, with the caret where the action asked (default: the end).
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.focus();
    const at = caret === null ? el.value.length : Math.min(caret, el.value.length);
    el.setSelectionRange(at, at);
    // Only when the editor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      actions.addNextSubtask(id);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      actions.finishEditing(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      actions.finishEditing(id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) actions.outdentTask(id);
      else actions.indentTask(id);
    } else if (e.key === 'Backspace' && title === '') {
      e.preventDefault();
      actions.backspaceOnEmpty(id);
    }
    // Keys typed here never reach the app's shortcuts.
    e.stopPropagation();
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n')) return;
    e.preventDefault();
    const el = e.currentTarget;
    const merged = el.value.slice(0, el.selectionStart) + text + el.value.slice(el.selectionEnd);
    actions.pasteIntoTask(id, merged);
  };

  return (
    <div className="title-editor">
      <div className="float-chips">
        <TaskChips id={id} />
      </div>
      <textarea
        ref={field}
        className={className}
        value={title}
        rows={1}
        maxLength={TITLE_MAX}
        spellCheck
        aria-label="Task title"
        onChange={(e) => actions.updateTitle(id, e.target.value.replace(/\n/g, ' '))}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => actions.finishEditing(id)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
