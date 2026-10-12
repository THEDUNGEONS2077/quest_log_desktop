# Changelog

quest_log desktop. Each version gets one section, newest first. The heading's build number is shown in Settings and written into backups.

## 0.2.0 (build 2)

- **Fixed: a black screen after closing and reopening the app.** New areas weren't being saved, so after a reopen the app tried to show an area that no longer existed and got stuck. Areas are saved now. Areas that were lost come back by themselves, with their quests: by name where the daily snapshot remembers it, otherwise as **RECOVERED 1, 2…**, which you can rename. If anything ever goes wrong again, you'll see what happened, with **RELOAD** and **DOWNLOAD BACKUP**, instead of a black page.
- **Edit and delete areas in the right-hand pane.** Click an area in the sidebar and the pane shows it: rename it in place, see its open projects, or delete it.
- **ARCHIVES.** A deleted area goes into the **ARCHIVES** folder, below a line under your areas, with all its quests. They're kept out of ALL QUESTS, TODAY and UPCOMING, but you can still open the area to look through it. From there, **RESTORE** brings it back, or **DELETE FOREVER** removes it and puts its quests in Trash. Every step can be undone.
- **Minimize the details pane** with `»` at its top or the `D` key, and the list takes the room. It stays as a thin strip on the right: click it (or press `D`) to bring the details back. A `•` on the strip means a task is selected. It stays minimized until you bring it back, even after closing the app.

## 0.1.0 (build 1)

The first desktop version of quest_log, for Google Chrome: the same terminal look, laid out for work.

- **Three panes:** a sidebar for views, areas and projects; the list; and the selected task's details (priority, due date and time, repeat, notes, objectives, XP).
- **Areas and projects.** Areas are your own categories (DAILY, MAIN and MISC to start). Add, rename, reorder and delete them; deleting one moves its quests to another. Each area lists its projects (its quests) in the sidebar; open one to see only its tasks.
- **TODAY and UPCOMING.** TODAY gathers everything overdue or due today, from every area and every depth. UPCOMING shows the next 14 days, day by day. Each task shows where it lives (area › project).
- **Built for a keyboard and mouse.** The same shorthand while typing (`!!`, `@fri 3pm`, `*weekly`, `// note`), with its chips just above the text. Right-click menus. Drag to reorder or nest. Ctrl/Shift+click to change several at once. Shortcuts for everything: press `?` for the list.
- **Installable and offline.** Install it from Chrome's address bar and it opens in its own window and works with no connection.
- **Your data stays in this browser.** No accounts, no analytics, nothing sent anywhere. **Export / Import backup** in Settings moves tasks to and from the phone app (merge or replace, with a preview first). A daily snapshot can be restored too.
- **Nothing is lost when you close the tab,** even straight after a change.
