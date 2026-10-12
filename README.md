# quest_log desktop

A to-do list for work that looks like a terminal: quest_log for desktop Google Chrome. You can install it as an app, and it works offline.

**Open it:** https://thedungeons2077.github.io/quest_log_desktop/

## Install
1. Open the link in Google Chrome on a computer.
2. Click the install icon at the right end of the address bar (a screen with a down arrow), or go to **⋮ → Cast, save and share → Install page as app…**.
3. quest_log then opens in its own window, from the Start menu, Dock or launcher, and works with no connection.

## What it does
- **Three panes:**
  - a sidebar: views, areas and their projects, and pages;
  - the list;
  - the selected task's details (minimize them with `»` or `D` when you want the room).
- **Areas and projects.** Areas are your own categories. DAILY, MAIN and MISC come first, and you can add, rename, reorder and delete your own. A project is a quest; its objectives are its tasks, nested as deep as you like.
- **TODAY and UPCOMING.**
  - TODAY gathers everything overdue or due today, from every area and every depth.
  - UPCOMING shows the next 14 days, day by day.
- **Shorthand while typing:**
  - `!` / `!!` / `!!!` set the priority;
  - `@fri 3pm` sets a due date and time;
  - `*weekly` sets a repeat;
  - `// note` adds notes;
  - `#Group` makes a group.
- **Mouse:** right-click menus, drag to reorder or nest, Ctrl/Shift+click to select several.
- **Keyboard:**
  - `N` new;
  - `/` search;
  - `T` / `U` / `A` switch views;
  - `Enter` edits;
  - `Space` completes;
  - `Tab` / `Shift+Tab` indent and outdent;
  - `Del` sends to Trash;
  - `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo;
  - `?` shows every shortcut.
- **XP and levels:** the same as the phone app.

## Your data
Your tasks are kept **only in this browser** (IndexedDB), on this computer. Nothing is sent anywhere. There are no accounts, no analytics and no tracking.

The desktop app and the quest_log phone app keep separate lists. To move tasks between them, use **Settings → Export backup** on one and **Settings → Import backup** (merge or replace) on the other. The desktop also keeps a daily snapshot you can restore from Settings.

Clearing Chrome's site data for this site deletes your tasks, so export a backup now and then.

## Development
Node 22+.

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run check        # types + lint + unit tests (Vitest)
npm run build && npm run e2e   # the full browser walk (Playwright, headless Chromium)
npm run deploy       # tests, then publishes to GitHub Pages (scripts/deploy.sh)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organised, [DESIGN.md](DESIGN.md) for the look, and [CHANGELOG.md](CHANGELOG.md) for what changed.
