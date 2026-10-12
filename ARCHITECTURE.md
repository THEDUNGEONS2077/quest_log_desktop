# quest_log desktop: architecture

A static web app: Vite, React 19, TypeScript (strict) and Zustand, rendered with plain DOM and CSS. There is no server; everything runs and is stored in the browser.

## Relationship to the phone app
- The phone app is a separate repo, `~/projects/quest_log` (THEDUNGEONS2077/quest_log): Expo / React Native, released as an Android APK. **This repo never changes it, builds it or deploys it.**
- `src/lib/` started as a **copy** of the phone's pure `lib/` at phone commit **`1164e84`**, with its tests. The store (`src/store/`) was ported from the phone's `store/`. Since then the two copies have evolved independently: a fix in one isn't automatically in the other.
- **What they share is the backup file format** (`TasksDocument`, `lib/backup.ts`). The desktop adds an optional `areas` field, which the phone ignores. Phone backups import into the desktop unchanged, because their quest categories are the default area ids.

## Layers
Imports only go down this list.

| Layer | Where | What |
| --- | --- | --- |
| UI | `src/app/`, `src/styles/` | React components, CSS, keyboard shortcuts, drag. Reads the store through selectors and calls its actions. |
| Store | `src/store/` | Zustand (vanilla) state and actions, undo/redo history, persistence, repair, migrations, backup import/export. |
| Lib | `src/lib/` | Pure logic with no React and no browser APIs: the task tree, ops and their inverses, shorthand parser, dates, recurrence, XP, search, paste, drag targets, areas and planning views. |

## Data model
- **Task tree** (`lib/types.ts`, `lib/tree.ts`):
  - a top-level task is a **quest** (shown as a **project** in the sidebar);
  - its children, nested to any depth, are its **objectives**.
- **Areas** (`lib/areas.ts`):
  - `TasksState.areas: Area[]` (`{id, name}`, in sidebar order); a quest's `category` is an area id;
  - the defaults are `daily` / `main` / `misc`, the phone's categories;
  - add, rename, reorder and delete are ops with exact inverses, so they undo;
  - deleting an area archives it (`archivedAt`; archived areas sit after the live ones in the list): its quests stay, out of ALL, COMPLETED, search, TODAY and UPCOMING (`onTab` with `archivedAreaIds`, `lib/plan.ts`). From ARCHIVE it's restored, or deleted for good (its quests go to Trash, moved to the first live area);
  - the area list is saved in the tasks meta key. 0.1.0 didn't save it; a launch repair (`restoreMissingAreasOp`) brings back any area a quest belongs to, named from the daily snapshots or RECOVERED n.
- **Ops** (`lib/ops.ts`): every change is an op with an inverse. History (`store/history.ts`) stores the inverses for undo and redo.
- **Planning views** (`lib/plan.ts`):
  - `todayRows`: open, live tasks at any depth that are overdue or due today;
  - `upcomingDays`: the next 14 days, grouped by day;
  - each row carries its path (area › project › parent).
  The store memoizes both per minute (`store/selectors.ts`).

## Storage (`src/store/idbKV.ts`, `src/store/persist.ts`)
- **IndexedDB**, database `quest_log_desktop`, object store `kv`, behind the phone's **synchronous** key-value interface (`store/kv.ts`):
  - opening reads every key into a memory `Map` before the first render (`src/main.tsx` awaits `startStore()`);
  - reads come from memory;
  - writes update memory and queue an ordered IndexedDB write on the next tick.
- **The journal:** IndexedDB is asynchronous, so a write still in flight when the tab closes or reloads can be lost. On `pagehide` or hide, the store flushes its throttled writers, and `flush()` then copies every change not yet confirmed stored into localStorage (`quest_log_desktop:journal`) **synchronously**. The next open replays the journal, and it is removed once IndexedDB has everything. Tests: `__tests__/store/idbKV.test.ts`; the immediate-reload check is in `e2e/pages.mjs`.
- **Persistence**, the phone's incremental bucketed saver, unchanged:
  - throttled to 300 ms;
  - the tree is split into buckets so a change rewrites only its bucket;
  - a daily snapshot is kept;
  - repair and schema migrations run on load.
- `navigator.storage.persist()` is requested so Chrome doesn't evict the data under storage pressure.

## UI shell (`src/app/`)
- **`App.tsx`:**
  - a CSS grid of sidebar, centre and detail;
  - overlays (menu, dialog, toast), the narrow-window drawer, and the Reduce Motion attribute.
- **`Sidebar.tsx`:**
  - the brand and XP bar;
  - TODAY / UPCOMING / ALL QUESTS with counts;
  - areas, each with a caret listing its projects;
  - `+ AREA`;
  - COMPLETED / TRASH / SETTINGS / HELP.
- **`CenterPane.tsx`:** for the current view or page:
  - the list (`QuestList`, `CompletedList`);
  - the planning views (`PlanList`);
  - the pages (`pages/`): Settings, Trash, Help.
  - For the list, also the quick-add bar, search, breadcrumb and selection bar.
- **`TaskRow.tsx`:**
  - checkbox, caret, title or inline `TitleEditor`, meta and quest meter;
  - completion burst and exit (`.row-wrap.leaving`, timed to the store's linger);
  - drag handle (`drag.tsx` with `lib/dnd.ts`);
  - Ctrl/Shift multi-select (`pickRow`).
- **`DetailPane.tsx`:**
  - the selected task's title, area, priority, due date, time and repeat, notes and objectives;
  - its XP and timestamps.
- **`ContextMenu.tsx` / `menu.tsx`:** right-click menus for tasks, areas and selections.
- **`useShortcuts.ts`:** one window `keydown` listener (listed in Help). A capture listener makes Esc leave any field first.

## Offline and install
- **Service worker:** `vite.config.ts` generates `dist/sw.js` at build time.
  - It caches every built file under `quest_log_desktop-<hash of the build>`.
  - Navigations try the network first, then fall back to the cached index.
  - Everything else comes from the cache first.
  - Old caches are deleted on activate.
- **Manifest:** `public/manifest.webmanifest`, with relative `start_url` / `scope` (`./`), so the same files work at `/` locally and at `/quest_log_desktop/` on GitHub Pages.
- **Base path:** `QUESTLOG_BASE` sets Vite's `base` (default `/`).

## Version
- `package.json`'s `version`, plus the build number from the newest `## x.y.z (build N)` heading in `CHANGELOG.md`.
- Both are injected as `__APP_VERSION__` / `__APP_BUILD__`, and shown in Settings and written into backups.
- A test checks that the newest CHANGELOG entry matches `package.json`.

## Tests
- **`npm run check`:** `tsc -b`, ESLint (with the React Compiler rules from `eslint-plugin-react-hooks`), and Vitest (Node environment, `TZ=Europe/London`; IndexedDB through `fake-indexeddb`).
- **`npm run e2e`** (after `npm run build`):
  - Playwright walks the whole app at 1440×900 against `dist/` (14 paths);
  - screenshots go to `e2e/screenshots/` (git-ignored).
- **`npm run e2e:motion`** (after `npm run build`): runs each animation at 4× CPU slowdown and prints dropped frames and layout/style work per scenario (no assertions: for comparing before and after; `MOTION_DIST` measures another build).
- **`npm run e2e:pages`** (after a build with `QUESTLOG_BASE=/quest_log_desktop/`): checks the Pages build at its sub-path (asset URLs, manifest scope, service worker scope, offline reload).
- **Servers:** both scripts start `serve` themselves on 127.0.0.1 (ports 8141 / 8142) and always stop it.

## Deploy (`scripts/deploy.sh`)
1. Refuses to run with uncommitted changes.
2. Runs `npm run check`, then the root build and the full walk.
3. Builds and checks the `/quest_log_desktop/` build.
4. Force-pushes it as a fresh one-commit `gh-pages` branch of **this** repo.
5. Enables GitHub Pages on that branch the first time.

The site is https://thedungeons2077.github.io/quest_log_desktop/. The phone's site (`/quest_log/`) shares the origin but not the service-worker scope or the IndexedDB database name, so the two never interfere.
