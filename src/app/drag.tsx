/**
 * src/app/drag.tsx: drag and drop in the quest list (the phone's drag.tsx,
 * for a mouse).
 *
 * Layer: UI. A row's ⋮ handle (shown on hover) starts a drag. While it
 * moves, the rows on screen (minus the dragged task and what's inside it)
 * are measured, and the pure rules in lib/dnd.ts pick the gap and depth
 * from the pointer: up and down picks the gap, left and right the depth
 * (nest under the task above, or come out a level). A glowing line shows
 * where it lands, at that depth; the dragged rows dim. Dropping applies one
 * move (undoable); Esc, or dropping where it started, does nothing.
 */
import { createContext, type PointerEvent as ReactPointerEvent, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { type DragRow, dropOp, dropTarget, type DropTarget } from '@/lib/dnd';
import { findTask } from '@/lib/taskMap';
import { subtreeIds } from '@/lib/tree';
import { useStoreBundle } from '@/store/react';

/** The indent per level, in px (theme --indent). */
const INDENT = 20;

interface DragState {
  id: string;
  /** Depth of the dragged row when the drag began. */
  startDepth: number;
  startX: number;
  rows: DragRow[];
  target: DropTarget | null;
  hidden: ReadonlySet<string>;
  x: number;
  y: number;
  /** Where the drop line goes, inside the list (null: no target yet). */
  line: { top: number; left: number } | null;
}

/** What rows use: start a drag on this task, and whether it's being dragged. */
interface DragApi {
  start: (id: string, depth: number, e: ReactPointerEvent) => void;
  dragging: ReadonlySet<string>;
}

const DragContext = createContext<DragApi>({ start: () => {}, dragging: new Set() });

export function useDrag(): DragApi {
  return useContext(DragContext);
}

/** Measures the rows on screen (viewport coordinates), skipping `hidden`. */
function measure(container: HTMLElement, hidden: ReadonlySet<string>): DragRow[] {
  const rows: DragRow[] = [];
  for (const el of container.querySelectorAll<HTMLElement>('.row[data-id]')) {
    const id = el.dataset.id!;
    if (hidden.has(id)) continue;
    const r = el.getBoundingClientRect();
    rows.push({ id, depth: Number(el.dataset.depth ?? 0), top: r.top, height: r.height });
  }
  return rows;
}

/** Wraps the list: provides the drag to its rows and draws the drop line. */
export function DragArea({ children }: { children: ReactNode }) {
  const { store } = useStoreBundle();
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const live = useRef<DragState | null>(null);

  const update = (next: DragState | null) => {
    live.current = next;
    setDrag(next);
  };

  const start: DragApi['start'] = (id, depth, e) => {
    if (e.button !== 0 || !box.current) return;
    e.preventDefault();
    e.stopPropagation();
    const hidden = new Set(subtreeIds(store.getState().tasks, id));
    store.getState().setEditing(null);
    update({ id, startDepth: depth, startX: e.clientX, rows: measure(box.current, hidden), target: null, hidden, x: e.clientX, y: e.clientY, line: null });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = live.current;
      if (!d || !box.current) return;
      const rows = measure(box.current, d.hidden);
      const target = dropTarget(rows, e.clientY, d.startDepth, e.clientX - d.startX, INDENT);
      // The drop line: the gap's top edge, indented to the depth.
      const above = rows[target.gap - 1];
      const below = rows[target.gap];
      const y = below ? below.top : above ? above.top + above.height : 0;
      const origin = box.current.getBoundingClientRect();
      const line = { top: y - origin.top, left: 16 + 56 + target.depth * INDENT };
      update({ ...d, rows, x: e.clientX, y: e.clientY, target, line });
    };
    const up = () => {
      const d = live.current;
      update(null);
      if (!d?.target) return;
      const s = store.getState();
      if (!findTask(s.tasks, d.id)) return;
      const op = dropOp(s.tasks, d.rows, d.target, d.id, s.ui.zoomRootId, Date.now());
      if (op) s.dispatch(op);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') update(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key);
    };
    // Re-attach only when a drag starts or ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null, store]);

  const line = drag?.line ?? null;
  const title = drag ? findTask(store.getState().tasks, drag.id)?.title : '';

  return (
    <DragContext.Provider value={{ start, dragging: drag?.hidden ?? EMPTY }}>
      <div ref={box} className={drag ? 'drag-area dragging' : 'drag-area'}>
        {children}
        {line && <div className="drop-line" style={{ top: line.top, left: line.left }} aria-hidden />}
      </div>
      {drag && (
        <div className="drag-ghost" style={{ left: drag.x + 12, top: drag.y + 8 }} aria-hidden>
          {title || 'Untitled'}
          {drag.hidden.size > 1 && <span className="dim"> +{drag.hidden.size - 1}</span>}
        </div>
      )}
    </DragContext.Provider>
  );
}

const EMPTY: ReadonlySet<string> = new Set();
