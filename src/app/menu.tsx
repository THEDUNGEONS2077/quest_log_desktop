/**
 * src/app/menu.tsx: the right-click menu (what it's for and where it opens),
 * the small dialog, and the list of rows on screen.
 *
 * Layer: UI. Small shared state that isn't task data, so it stays out of
 * the store:
 *   - the menu: a task's (right-click a row), an area's (right-click it in
 *     the sidebar), or a plain list of options (e.g. CLEAR's choices);
 *   - the dialog: a question with an optional text field or choice
 *     (renaming or deleting an area);
 *   - which task IDs the centre pane shows, top to bottom (arrow keys).
 */
import { createContext, useContext } from 'react';

/** One option in a plain menu. */
export interface MenuItem {
  label: string;
  glyph?: string;
  onPick: () => void;
}

/** What a menu is for. */
export type MenuTarget = { task: string } | { area: string } | { items: MenuItem[] };

/** An open menu: its target and where it opens (window coordinates). */
export interface OpenMenuState {
  target: MenuTarget;
  x: number;
  y: number;
}

/** A dialog: a title, a line of explanation, and either a text field or a choice list. */
export interface DialogState {
  title: string;
  message?: string;
  /** A text field, prefilled; OK passes its value. */
  input?: { value: string; placeholder?: string; maxLength?: number };
  /** Choices; OK passes the chosen value. */
  choices?: { value: string; label: string }[];
  ok: string;
  onOk: (value: string) => void;
}

/** Opening menus and dialogs (App provides them). */
export interface Overlays {
  openMenuAt: (x: number, y: number, target: MenuTarget) => void;
  openDialog: (d: DialogState) => void;
}

export const OverlayContext = createContext<Overlays>({ openMenuAt: () => {}, openDialog: () => {} });

/** For rows: `openMenu(taskId, x, y)`. */
export function useOpenMenu(): (id: string, x: number, y: number) => void {
  const { openMenuAt } = useContext(OverlayContext);
  return (id, x, y) => openMenuAt(x, y, { task: id });
}

/** Any menu: `openMenuAt(x, y, target)`. */
export function useOpenMenuAt(): Overlays['openMenuAt'] {
  return useContext(OverlayContext).openMenuAt;
}

/** A dialog: `openDialog({ title, input | choices, ok, onOk })`. */
export function useOpenDialog(): Overlays['openDialog'] {
  return useContext(OverlayContext).openDialog;
}

/** The task IDs the centre pane shows, top to bottom (set by the list on screen). */
let visible: readonly string[] = [];

export function setVisibleRows(ids: readonly string[]): void {
  visible = ids;
}

export function visibleRows(): readonly string[] {
  return visible;
}

/**
 * Asks before deleting an archived area for good (its quests go to Trash;
 * UNDO still brings it all back). Shared by the menu and the details pane.
 */
export function confirmDeleteForever(
  openDialog: (d: DialogState) => void,
  actions: { deleteAreaForever(id: string): void },
  id: string,
  name: string,
): void {
  openDialog({
    title: `Delete ${name.toUpperCase()} forever`,
    message: 'The area is removed and its quests go to Trash (restored ones land in your first area). You can undo this.',
    ok: 'DELETE',
    onOk: () => actions.deleteAreaForever(id),
  });
}
