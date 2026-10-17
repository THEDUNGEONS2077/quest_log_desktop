/**
 * src/app/useShortcuts.ts: the keyboard shortcuts (listed in Help).
 *
 * Layer: UI. One window listener. Keys typed into a field never reach it
 * (fields stop their own keys), and it ignores anything aimed at an input
 * in any case. Esc in a field leaves it (a capture listener), so the
 * shortcuts work straight after. Most shortcuts act on the selected task.
 */
import { useEffect } from 'react';

import { findTask } from '@/lib/taskMap';
import { liveChildIds } from '@/lib/tree';
import type { StoreBundle } from '@/store/react';

import type { Overlays } from './menu';

import { visibleRows } from './menu';

/** Is the key event aimed at somewhere you type? */
function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

/**
 * Is the key event aimed at a control outside the list (a sidebar item, a
 * button in the details or Settings)? Enter and Space then press that
 * control, as they always do, instead of acting on the selected task
 * (V1 pass 2026-10-17: Tab to SETTINGS, Enter edited the selected task).
 * Inside a list row (its checkbox or caret, focused by a click) they still
 * act on the task.
 */
function onControl(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t?.closest?.('button, a[href], [role="menuitem"], [role="radio"], [role="tab"], summary') && !t.closest('.row');
}

export function useShortcuts({ store }: StoreBundle, blocked: boolean, openMenuAt: Overlays['openMenuAt']): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (blocked || typing(e)) return;
      const s = store.getState();
      const mod = e.ctrlKey || e.metaKey;
      const sel = s.selectedId ? findTask(s.tasks, s.selectedId) : undefined;
      const handled = () => e.preventDefault();

      // Undo / redo work anywhere outside a field.
      if (mod && e.key.toLowerCase() === 'z') {
        handled();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        handled();
        s.redo();
        return;
      }
      if (mod || (e.altKey && e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;

      switch (e.key) {
        case 'n':
        case 'N':
          handled();
          if (s.ui.view !== 'list' || s.page !== null) s.setCategoryTab(s.ui.category);
          s.requestQuickAdd();
          return;
        case '/':
          handled();
          if (s.ui.view !== 'list' || s.page !== null) s.setCategoryTab(s.ui.category);
          s.setSearch(s.ui.tab, { open: true });
          return;
        case 't':
        case 'T':
          handled();
          s.setView('today');
          return;
        case 'u':
        case 'U':
          handled();
          s.setView('upcoming');
          return;
        case 'a':
        case 'A':
          handled();
          s.setCategoryTab('all');
          s.setTab('active');
          s.setZoom(null);
          return;
        case '?':
          handled();
          s.openPage('help');
          return;
        case 'd':
        case 'D':
          // Minimize or bring back the detail pane (with or without a selection).
          handled();
          s.toggleDetail();
          return;
        case 'Escape':
          handled();
          if (s.page !== null) s.openPage(null);
          else if (s.selection) s.clearSelection();
          else if (s.selectedId) s.select(null);
          else s.backStep();
          return;
        case 'ArrowDown':
        case 'ArrowUp': {
          handled();
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          if (e.altKey) {
            if (sel && sel.parentId !== null) s.moveTaskBy(sel.id, dir);
            return;
          }
          const ids = visibleRows();
          if (!ids.length) return;
          const at = sel ? ids.indexOf(sel.id) : -1;
          const next = at < 0 ? (dir > 0 ? 0 : ids.length - 1) : Math.max(0, Math.min(ids.length - 1, at + dir));
          s.select(ids[next]!);
          document.querySelector(`[data-id="${CSS.escape(ids[next]!)}"]`)?.scrollIntoView({ block: 'nearest' });
          return;
        }
      }

      if (!sel) return;
      if ((e.key === 'Enter' || e.key === ' ') && onControl(e)) return;
      // The selected task's menu from the keyboard (V1 pass 2026-10-17): Shift+F10 or the Menu
      // key, the system's keys for a context menu. It opens under the task's title.
      if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
        handled();
        const at = document.querySelector(`[data-id="${CSS.escape(sel.id)}"] .title`)?.getBoundingClientRect();
        openMenuAt(at ? at.left : innerWidth / 2, at ? at.bottom + 4 : innerHeight / 3, { task: sel.id });
        return;
      }
      switch (e.key) {
        case 'Enter':
          handled();
          s.setEditing(sel.id);
          return;
        case ' ':
          handled();
          if (sel.done) s.restoreTask(sel.id);
          else s.toggleDone(sel.id);
          return;
        case 'Delete':
        case 'Backspace':
          handled();
          s.deleteTask(sel.id);
          s.select(null);
          return;
        case 'Tab':
          handled();
          if (e.shiftKey) s.outdentTask(sel.id);
          else s.indentTask(sel.id);
          return;
        case 'ArrowRight':
        case 'ArrowLeft': {
          handled();
          const open = e.key === 'ArrowRight';
          if (liveChildIds(s.tasks, sel.id).length && sel.collapsed === open) s.toggleCollapsed(sel.id);
          return;
        }
        case 'o':
        case 'O':
          handled();
          s.openProject(sel.id);
          return;
      }
    };
    // Esc in any field leaves it (first, before the field's own handling), so the
    // shortcuts work right after: type, Esc, T.
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && typing(e)) (e.target as HTMLElement).blur();
    };
    window.addEventListener('keydown', onEscape, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onEscape, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [store, blocked, openMenuAt]);
}
