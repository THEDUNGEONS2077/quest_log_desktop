/**
 * src/app/App.tsx: the app's frame: sidebar, centre, detail.
 *
 *   ┌ sidebar ─┬ centre (the list) ─────────────┬ detail ──────┐
 *   │ views    │ > MAIN   [ACTIVE · 12][…]  /   │ the selected │
 *   │ areas    │ > new quest█                   │ task, in     │
 *   │ …        │ rows…                          │ full         │
 *   └──────────┴────────────────────────────────┴──────────────┘
 *
 * Layer: UI. Also hosts what floats over everything (the right-click menu,
 * dialogs, the toast), the keyboard shortcuts, and the Reduce Motion
 * setting (an attribute on <html> the CSS reads). Narrower windows: the
 * detail pane slides over the list when a task is selected (under 1100 px),
 * and the sidebar becomes a drawer (under 900 px, ≡ opens it). The detail
 * pane can be minimized to a strip (D, or its » button) to give the list
 * the room; that's remembered across launches.
 */
import { useEffect, useMemo, useState } from 'react';

import { useAppStore, useStoreBundle } from '@/store/react';

import { CenterPane } from './CenterPane';
import { ContextMenu } from './ContextMenu';
import { cx } from './cx';
import { DetailPane } from './DetailPane';
import { Dialog } from './Dialog';
import { type DialogState, type OpenMenuState, OverlayContext } from './menu';
import { Sidebar } from './Sidebar';
import { Toast } from './Toast';
import { useShortcuts } from './useShortcuts';

export function App() {
  const bundle = useStoreBundle();
  const [menu, setMenu] = useState<OpenMenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [drawer, setDrawer] = useState(false);
  const selected = useAppStore((s) => s.selectedId !== null);
  const detailCollapsed = useAppStore((s) => s.ui.detailCollapsed);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);
  // Picking something in the drawer closes it.
  const place = useAppStore((s) => `${s.ui.view}|${s.ui.category}|${s.ui.tab}|${s.ui.zoomRootId}|${s.page}`);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion;
  }, [reduceMotion]);
  const [drawerPlace, setDrawerPlace] = useState(place);
  if (drawerPlace !== place) {
    setDrawerPlace(place);
    setDrawer(false);
  }

  useShortcuts(bundle, menu !== null || dialog !== null);

  const overlays = useMemo(
    () => ({ openMenuAt: (x: number, y: number, target: OpenMenuState['target']) => setMenu({ x, y, target }), openDialog: setDialog }),
    [],
  );

  return (
    <OverlayContext.Provider value={overlays}>
      <div className={cx('app', selected && 'has-selection', drawer && 'drawer-open', detailCollapsed && 'detail-collapsed')}>
        <button type="button" className="drawer-btn icon-btn" aria-label="Views and areas" onClick={() => setDrawer((d) => !d)}>
          ≡
        </button>
        <Sidebar />
        <CenterPane />
        <DetailPane />
        <div className="drawer-scrim" onClick={() => setDrawer(false)} aria-hidden />
      </div>
      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
      {dialog && <Dialog dialog={dialog} onClose={() => setDialog(null)} />}
      <Toast />
    </OverlayContext.Provider>
  );
}
