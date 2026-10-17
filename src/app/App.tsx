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
import { TEXT_SIZES } from '@/store/settings';

import { CenterPane } from './CenterPane';
import { ContextMenu } from './ContextMenu';
import { cx } from './cx';
import { DetailPane } from './DetailPane';
import { Dialog } from './Dialog';
import { type DialogState, type OpenMenuState, OverlayContext } from './menu';
import { Sidebar } from './Sidebar';
import { Toast } from './Toast';
import { usePresence } from './usePresence';
import { useShortcuts } from './useShortcuts';

/** How long a closed menu or dialog stays to fade out (matches --fast in theme.css). */
const EXIT_MS = 120;

export function App() {
  const bundle = useStoreBundle();
  const [menu, setMenu] = useState<OpenMenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [drawer, setDrawer] = useState(false);
  const selected = useAppStore((s) => s.selectedId !== null);
  const detailCollapsed = useAppStore((s) => s.ui.detailCollapsed);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);
  const textSize = useAppStore((s) => s.settings.textSize);
  const onPage = useAppStore((s) => s.page !== null);
  // Picking something in the drawer closes it.
  const place = useAppStore((s) => `${s.ui.view}|${s.ui.category}|${s.ui.tab}|${s.ui.zoomRootId}|${s.page}`);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion;
  }, [reduceMotion]);
  // Text size: every font token is times --text-scale (theme.css). A value saved before the
  // setting existed, or not one of the sizes offered, counts as standard.
  useEffect(() => {
    const scale = (TEXT_SIZES as readonly number[]).includes(textSize) ? textSize / 100 : 1;
    document.documentElement.style.setProperty('--text-scale', String(scale));
  }, [textSize]);
  const [drawerPlace, setDrawerPlace] = useState(place);
  if (drawerPlace !== place) {
    setDrawerPlace(place);
    setDrawer(false);
  }

  // Menus and dialogs fade out briefly after closing instead of vanishing.
  const shownMenu = usePresence(menu, EXIT_MS);
  const shownDialog = usePresence(dialog, EXIT_MS);

  const overlays = useMemo(
    () => ({ openMenuAt: (x: number, y: number, target: OpenMenuState['target']) => setMenu({ x, y, target }), openDialog: setDialog }),
    [],
  );
  useShortcuts(bundle, menu !== null || dialog !== null, overlays.openMenuAt);

  return (
    <OverlayContext.Provider value={overlays}>
      <div className={cx('app', selected && 'has-selection', onPage && 'on-page', drawer && 'drawer-open', detailCollapsed && 'detail-collapsed')}>
        <button type="button" className="drawer-btn icon-btn" aria-label="Views and areas" onClick={() => setDrawer((d) => !d)}>
          ≡
        </button>
        <Sidebar />
        <CenterPane />
        <DetailPane />
        <div className="drawer-scrim" onClick={() => setDrawer(false)} aria-hidden />
      </div>
      {shownMenu.shown && <ContextMenu menu={shownMenu.shown} leaving={shownMenu.leaving} onClose={() => setMenu(null)} />}
      {shownDialog.shown && <Dialog dialog={shownDialog.shown} leaving={shownDialog.leaving} onClose={() => setDialog(null)} />}
      <Toast />
    </OverlayContext.Provider>
  );
}
