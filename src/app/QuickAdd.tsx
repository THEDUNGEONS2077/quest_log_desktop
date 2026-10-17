/**
 * src/app/QuickAdd.tsx: the `> new quest` field at the top of the list.
 *
 * Layer: UI. Enter adds a quest to the area shown (or into the project
 * you're inside), with shorthand applied (`!!`, `@fri 9am`, `*weekly`,
 * `// note`, `#Group`), and keeps the focus, so several can be typed in a
 * row (unlike the phone, which closes its keyboard after each). Pasting
 * several lines adds one task per line, nested by indent. Chips just above
 * the text preview the shorthand. `N` anywhere focuses it (store
 * quickAddFocus).
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { TITLE_MAX } from '@/lib/paste';
import { findTask } from '@/lib/taskMap';
import { shownTitle } from '@/lib/title';
import { useActions, useAppStore } from '@/store/react';

import { ShorthandChips, useShorthand } from './Chips';
import { cx } from './cx';
import { G } from './glyphs';

export function QuickAdd({ placeholder }: { placeholder: string }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const actions = useActions();
  const parsed = useShorthand(text);
  const target = useAppStore((s) => {
    const p = s.quickAddParent ? findTask(s.tasks, s.quickAddParent) : undefined;
    return p ? shownTitle(p) : null;
  });

  // Focus when asked (the N shortcut, an empty list's prompt).
  const focusRequest = useAppStore((s) => s.quickAddFocus);
  useEffect(() => {
    if (focusRequest > 0) field.current?.focus();
  }, [focusRequest]);

  const submit = () => {
    if (text.trim()) actions.quickAdd(text.trim());
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      field.current?.blur();
    }
    e.stopPropagation();
  };

  return (
    <div className={cx('quick-add', focused && 'focused')}>
      <div className="float-chips">
        {target !== null && (
          <span className="chip target">
            IN: {target.toUpperCase()}
            <button type="button" className="chip-clear" onMouseDown={(e) => e.preventDefault()} onClick={actions.clearQuickAddParent} aria-label="Stop adding into this group">
              {G.delete}
            </button>
          </span>
        )}
        <ShorthandChips result={parsed} />
      </div>
      <span className="prompt">{G.prompt}</span>
      <textarea
        ref={field}
        rows={1}
        value={text}
        maxLength={TITLE_MAX}
        placeholder={placeholder}
        aria-label="New quest"
        onChange={(e) => {
          const next = e.target.value;
          // Several lines (a paste): one task per line.
          if (next.includes('\n')) {
            actions.quickPaste(next);
            setText('');
          } else setText(next);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => {
          setFocused(true);
          actions.setEditing(null);
        }}
        onBlur={() => setFocused(false)}
      />
      {/* The idle cursor sits after the placeholder's first phrase ("new quest", "new objective"),
          like a prompt waiting, with any hint after it reading as a comment (it was at a fixed
          9.5ch, on top of "new objective"'s letters). */}
      {!focused && !text && (
        <span className="cursor" style={{ marginLeft: `${placeholder.split('   ')[0]!.length + 0.5}ch` }} aria-hidden>
          {G.cursor}
        </span>
      )}
    </div>
  );
}
