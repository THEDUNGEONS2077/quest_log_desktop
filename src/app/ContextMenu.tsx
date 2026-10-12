/**
 * src/app/ContextMenu.tsx: the right-click menu (the phone's hold menu).
 *
 * Layer: UI. A task's menu: open, edit, add an objective, priority, quick
 * dates, its area (quests), indent / outdent, move up / down, duplicate,
 * copy as text, complete or restore, and delete. An area's menu: rename,
 * move up / down, delete (its quests move to an area you pick). Or a plain
 * list of options. It opens at the pointer, kept inside the window; the
 * arrow keys move through it, Enter picks, Esc or a click outside closes.
 */
import { type KeyboardEvent, type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { areaName } from '@/lib/areaNames';
import { atTimeOfDay, addDays } from '@/lib/dates';
import { findTask } from '@/lib/taskMap';
import { liveChildIds } from '@/lib/tree';
import type { Priority } from '@/lib/types';
import { useActions, useAppStore } from '@/store/react';

import { cx } from './cx';
import { G } from './glyphs';
import { confirmDeleteForever, type MenuItem, type OpenMenuState, useOpenDialog } from './menu';
import { useReleaseFocus } from './usePresence';

interface Props {
  menu: OpenMenuState;
  onClose: () => void;
  /** Closing: it fades out and ignores the pointer (app/usePresence.ts). */
  leaving?: boolean;
}

export function ContextMenu({ menu, onClose, leaving = false }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });

  // Keep it inside the window, and put the keyboard in it.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({ left: Math.min(menu.x, window.innerWidth - width - 8), top: Math.min(menu.y, window.innerHeight - height - 8) });
    el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [menu]);

  useReleaseFocus(box, leaving);

  const onKeyDown = (e: KeyboardEvent) => {
    if (leaving) return; // closing: keys belong to the app again
    e.stopPropagation();
    if (e.key === 'Escape') onClose();
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(box.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <div className={cx('menu-layer', leaving && 'leaving')} onMouseDown={onClose} onContextMenu={(e) => e.preventDefault()} inert={leaving}>
      <div ref={box} className="menu" role="menu" style={pos} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        {'task' in menu.target && <TaskItems id={menu.target.task} close={onClose} />}
        {'area' in menu.target && <AreaItems id={menu.target.area} close={onClose} />}
        {'items' in menu.target && <PlainItems items={menu.target.items} close={onClose} />}
      </div>
    </div>
  );
}

function Item({ glyph, label, onPick, disabled }: { glyph?: string; label: ReactNode; onPick: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" className="menu-item" disabled={disabled} onClick={onPick}>
      <span className="menu-glyph">{glyph}</span>
      <span>{label}</span>
    </button>
  );
}

function PlainItems({ items, close }: { items: MenuItem[]; close: () => void }) {
  return (
    <>
      {items.map((i) => (
        <Item key={i.label} glyph={i.glyph} label={i.label} onPick={() => (close(), i.onPick())} />
      ))}
    </>
  );
}

/** `days` from now at the default time. Read when an item is picked, not while the menu draws. */
function dueInDays(days: number, defaultTime: number): number {
  return atTimeOfDay(addDays(Date.now(), days), defaultTime);
}

function TaskItems({ id, close }: { id: string; close: () => void }) {
  const task = useAppStore((s) => findTask(s.tasks, id));
  const areas = useAppStore((s) => s.tasks.areas);
  const hasChildren = useAppStore((s) => liveChildIds(s.tasks, id).length > 0);
  const defaultTime = useAppStore((s) => s.settings.defaultTimeMinutes);
  const actions = useActions();
  if (!task) return null;
  const run = (f: () => void) => () => {
    close();
    f();
  };
  const isQuest = task.parentId === null;
  const dueAt = (days: number) => dueInDays(days, defaultTime);
  return (
    <>
      <div className="menu-title">{G.prompt} {task.title || 'Untitled'}</div>
      {(isQuest || hasChildren) && !task.done && <Item glyph={G.zoom} label="Open" onPick={run(() => actions.openProject(id))} />}
      <Item glyph={G.prompt} label="Edit title  (Enter)" onPick={run(() => actions.setEditing(id))} />
      {!task.done && <Item glyph={G.add} label="Add objective" onPick={run(() => actions.addSubtask(id))} />}
      <div className="menu-row" role="group" aria-label="Priority">
        <span className="menu-glyph">{G.priority}</span>
        {([0, 1, 2, 3] as Priority[]).map((p) => (
          <button key={p} type="button" className={cx('prio-btn', task.priority === p && 'on')} onClick={run(() => actions.setPriority(id, p))}>
            {p === 0 ? '—' : '!'.repeat(p)}
          </button>
        ))}
      </div>
      <div className="menu-sep" />
      <Item glyph={G.due} label="Due today" onPick={run(() => actions.setDue(id, dueAt(0), false))} />
      <Item glyph={G.due} label="Due tomorrow" onPick={run(() => actions.setDue(id, dueAt(1), false))} />
      <Item glyph={G.due} label="Due in a week" onPick={run(() => actions.setDue(id, dueAt(7), false))} />
      {task.dueAt !== null && <Item glyph={G.delete} label="Clear due date" onPick={run(() => actions.clearDue(id))} />}
      {isQuest && (
        <>
          <div className="menu-sep" />
          <div className="menu-heading">AREA</div>
          {/* Live areas only: a quest moves out of ARCHIVE, not into it (delete its area for that). */}
          {areas.filter((a) => a.archivedAt === undefined).map((a) => (
            <Item key={a.id} glyph={task.category === a.id ? G.done : ''} label={a.name.toUpperCase()} onPick={run(() => actions.setQuestCategory(id, a.id))} />
          ))}
        </>
      )}
      <div className="menu-sep" />
      {!task.done && <Item glyph={G.indent} label="Indent  (Tab)" onPick={run(() => actions.indentTask(id))} />}
      {!task.done && !isQuest && <Item glyph={G.outdent} label="Outdent  (Shift+Tab)" onPick={run(() => actions.outdentTask(id))} />}
      {!isQuest && <Item glyph="↑" label="Move up  (Alt+↑)" onPick={run(() => actions.moveTaskBy(id, -1))} />}
      {!isQuest && <Item glyph="↓" label="Move down  (Alt+↓)" onPick={run(() => actions.moveTaskBy(id, 1))} />}
      <Item glyph={G.duplicate} label="Duplicate" onPick={run(() => actions.duplicateTask(id))} />
      <Item
        glyph={G.copy}
        label="Copy as text"
        onPick={run(() => {
          void navigator.clipboard.writeText(actions.outlineText(id)).then(() => actions.showToast('COPIED', false));
        })}
      />
      <div className="menu-sep" />
      {task.done ? (
        <Item glyph={G.undo} label="Restore" onPick={run(() => actions.restoreTask(id))} />
      ) : (
        <Item glyph={G.done} label="Complete  (Space)" onPick={run(() => void actions.toggleDone(id))} />
      )}
      {task.done && isQuest && <Item glyph={G.duplicate} label="Run again" onPick={run(() => actions.runAgain(id))} />}
      <Item glyph={G.delete} label="Delete  (Del)" onPick={run(() => actions.deleteTask(id))} />
    </>
  );
}

/** The menu for an area: rename, reorder, delete to ARCHIVE; for an archived one, restore or delete for good. */
function AreaItems({ id, close }: { id: string; close: () => void }) {
  const allAreas = useAppStore((s) => s.tasks.areas);
  const name = useAppStore((s) => areaName(s.tasks, id));
  const actions = useActions();
  const openDialog = useOpenDialog();
  const areas = allAreas.filter((a) => a.archivedAt === undefined);
  const isArchived = !areas.some((a) => a.id === id);
  const index = areas.findIndex((a) => a.id === id);
  const rename = (
    <Item
      glyph={G.prompt}
      label="Rename…"
      onPick={() => {
        close();
        openDialog({ title: 'Rename area', input: { value: name, maxLength: 32 }, ok: 'RENAME', onOk: (v) => actions.renameArea(id, v) });
      }}
    />
  );
  if (isArchived)
    return (
      <>
        <div className="menu-title">
          {G.archives} {name.toUpperCase()}
        </div>
        {rename}
        <Item glyph={G.undo} label="Restore" onPick={() => (close(), actions.restoreArea(id))} />
        <Item glyph={G.delete} label="Delete forever…" onPick={() => (close(), confirmDeleteForever(openDialog, actions, id, name))} />
      </>
    );
  return (
    <>
      <div className="menu-title">{G.prompt} {name.toUpperCase()}</div>
      {rename}
      <Item glyph="↑" label="Move up" disabled={index <= 0} onPick={() => (close(), actions.moveArea(id, index - 1))} />
      <Item glyph="↓" label="Move down" disabled={index >= areas.length - 1} onPick={() => (close(), actions.moveArea(id, index + 1))} />
      <Item glyph={G.archives} label="Delete (to ARCHIVE)" disabled={areas.length <= 1} onPick={() => (close(), actions.archiveArea(id))} />
    </>
  );
}
