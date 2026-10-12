/**
 * src/app/SelectionBar.tsx: what to do with several selected tasks.
 *
 *   4 SELECTED   ✓ COMPLETE  ! PRIORITY  ◔ TODAY  ◔ TOMORROW  ⊞ GROUP  ✕ DELETE   ESC
 *
 * Layer: UI. Ctrl / Cmd + click adds tasks to the selection, Shift + click
 * a range. Each action is one undo step (the phone's bulk actions,
 * lib/bulk.ts). GROUP puts them in a new task and opens its title.
 */
import { addDays, atTimeOfDay } from '@/lib/dates';
import { useActions, useAppStore } from '@/store/react';

import { G } from './glyphs';

/** `days` from now at the default time (read on click). */
function dueInDays(days: number, defaultTime: number): number {
  return atTimeOfDay(addDays(Date.now(), days), defaultTime);
}

export function SelectionBar() {
  const selection = useAppStore((s) => s.selection);
  const defaultTime = useAppStore((s) => s.settings.defaultTimeMinutes);
  const actions = useActions();
  if (!selection) return null;
  return (
    <div className="selection-bar" role="toolbar" aria-label="Selected tasks">
      <span className="bright">{selection.length} SELECTED</span>
      <button type="button" className="text-btn primary" onClick={actions.completeSelection}>
        {G.done} COMPLETE
      </button>
      <button type="button" className="text-btn" onClick={actions.cycleSelectionPriority} title="Cycle the priority">
        {G.priority} PRIORITY
      </button>
      <button type="button" className="text-btn" onClick={() => actions.setDueMany(selection, dueInDays(0, defaultTime), false)}>
        {G.due} TODAY
      </button>
      <button type="button" className="text-btn" onClick={() => actions.setDueMany(selection, dueInDays(1, defaultTime), false)}>
        {G.due} TOMORROW
      </button>
      <button type="button" className="text-btn" onClick={actions.groupSelection} title="Put them in a new task">
        {G.duplicate} GROUP
      </button>
      <button type="button" className="text-btn danger" onClick={actions.deleteSelection}>
        {G.delete} DELETE
      </button>
      <button type="button" className="icon-btn" aria-label="Clear the selection (Esc)" onClick={actions.clearSelection}>
        {G.delete}
      </button>
    </div>
  );
}
