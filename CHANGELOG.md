# Changelog

quest_log desktop. Each version gets one section, newest first. The heading's build number is shown in Settings and written into backups.

## 1.3.2 (build 19)

- **Sidebar headings a touch smaller:** VIEWS, AREAS and ARCHIVE, with their arrows and counts, are 10% smaller than in 1.3.1 (still 17% bigger than before it).

## 1.3.1 (build 18)

- **Bigger section headings in the sidebar:** VIEWS, AREAS and ARCHIVE, with their arrows and counts, are 30% larger.

## 1.3.0 (build 17)

- **The new quest bar is at the bottom** of the list now, where your eyes land after reading down it. What you type still previews just above it, and messages appear above the bar instead of over it.
- **A setting for the bar's hint:** Settings → *Shorthand hint in the new quest bar* hides the "(try: !! priority · @fri 3pm due · // a note)" text, leaving just "new quest".
- **Bigger sidebar:** larger text, icons, counts and carets, with taller rows and a slightly wider sidebar. It still grows with Settings → Text size.

## 1.2.0 (build 16)

A refinement pass: the app holds up with many areas, larger text and long titles, and says more about what it's doing.

- **The sidebar keeps its top and bottom.** The title, the XP bar and SYSTEM (Completed, Trash, Settings, Help) stay put; only the views and areas in between scroll, so with many areas nothing important scrolls out of reach. Long area names show in full when you point at them.
- **Undo tells you what it did.** Ctrl+Z now says UNDONE, with REDO in case you change your mind; Ctrl+Shift+Z says REDONE. With nothing left to undo, it says so instead of doing nothing silently.
- **Home and End** jump to the first and the last task in the list.
- **Moving a quest with many areas:** with more than five areas, the right-click menu has one *Move to area…* item that opens a short list (the current area already selected), instead of a menu as tall as the window.
- **Larger text fits:** at 115% and 130%, checkboxes no longer run into their titles, the date buttons wrap instead of squeezing, and an objective's box stays on its first line.
- **Numbers that explain themselves:**
  - a repeating task's ×1.4 tells you it's your on-time streak;
  - the details show it too;
  - the XP bar shows your day streak when you point at it;
  - projects in the sidebar and the area panel show how many objectives are open, and nothing when none are.
- **Clearer empty screens:** a search that finds nothing says what you searched for and that Esc clears it (on COMPLETED it used to say "nothing completed yet"). TODAY with everything done says **ALL CLEAR FOR TODAY**, with how many tasks you finished.
- **Smaller touches:**
  - the details' title and an area's name show a faint frame under the pointer, so you can tell they're editable;
  - Help's shortcut tables keep a readable width;
  - an imported backup shows its date as "17 Oct 2026, 20:12";
  - "MOVED TO" messages name the area in capitals like the rest.

## 1.1.0 (build 15)

A pass over the look and the feel: what matters stands out, and the keyboard and screen readers get everything right.

- **What's late stands out.** An overdue date is now a lit tag on its row, in the lists and on TODAY, so you can spot it at a glance. Due later today stays brighter text, and later dates are quiet.
- **A quest ready to finish lights up:** when all its objectives are done, its progress meter glows.
- **TODAY and UPCOMING show more:**
  - each section's count (OVERDUE · 2, TODAY · 3);
  - each task's priority;
  - the first upcoming day is called TOMORROW.
- **Small cues that say what a click does:**
  - pointing at an open checkbox previews its check;
  - the date preset matching a task's due day (TODAY, TOMORROW, NEXT WEEK) is lit in the details;
  - CLEAR stays in place, so the row no longer jumps.
- **Delete buttons are calmer until you mean it:** they're a step quieter than the others and light up fully when you point at them. Deleting from Trash for good opens with CANCEL selected, so a stray Enter can't destroy anything.
- **Messages behave:** a message now stays its 5 seconds however busy you are (before, it could stay up as long as you kept working), pauses while you point at it so UNDO can't slip away, and shows a thin line counting down.
- **Tab moves between controls again,** as everywhere else. To indent or outdent a selected task, use **Alt+→ / Alt+←** (next to Alt+↑ / Alt+↓ for moving it); Tab still indents while you're editing a title. After Delete, the next task is selected, so you can keep going from the keyboard.
- **The keyboard focus is a dashed ring,** so it's never mistaken for a selected item.
- **Selecting several tasks** now lists them in the details pane, with how to change them all at once.
- **Trash** lines up its buttons on the right, with EMPTY TRASH no longer a full-width bar, and shows a count in the sidebar.
- **Clearer words:** "made on Sep 27", "deleted yesterday" (it said "sep 27 ago", "yesterday ago"), and the details' footer no longer runs off the edge.
- **The new quest field hints at shorthand:** `!! priority · @fri 3pm due · // a note`.
- **The area in the details' path** (MAIN › …) now takes you to that area.
- **Screen readers:** lists are announced as lists, headings are in order, dialogs and the right-click menu are labelled, and long pages scroll from the keyboard. An automatic accessibility check now runs with every test.
- **Loads faster the first time:** the fonts are a third of their old size, with the same letters.

## 1.0.0 (build 14)

Version 1: a pass over everything, for everyday work.

- **A welcome for new users.** An empty app now explains quests, objectives and areas, lists the first keys, and offers **LOAD EXAMPLE QUESTS**: a few quests written for the desktop that walk you through clicking, editing, the right-click menu and shorthand. One undo takes them away.
- **Fast with long lists.** With hundreds of quests, selecting, adding and completing no longer re-draw the whole list, typing in search stays instant, and scrolling stays smooth even on a slower laptop.
- **One window at a time.** If quest_log is open in another window (the installed app and a browser tab, say), the new window says so and offers **USE HERE**, which moves your tasks over after the other window has saved everything. Two windows can no longer overwrite each other's changes.
- **Backups you don't forget.** Settings shows when you last backed up and whether the browser keeps your data for good. If two weeks pass without a backup, a message offers **BACK UP** (once a week at most).
- **What's new after an update.** After the app updates, a message says so, with a button to see what changed. It's also at the bottom of Settings.
- **Text size** in Settings: 90%, 100%, 115% or 130%. Only the text grows; the layout stays put.
- **Settings, Help and Trash use the full width** (the details pane isn't needed there).
- **Long titles wrap** at a comfortable length on wide screens.
- **What's due, at a glance:** the window title reads "quest_log · 3 due", and the installed app's icon shows the same number.
- **Keyboard:**
  - Shift+F10 (or the Menu key) opens the selected task's menu;
  - Enter and Space on a focused button now press that button, even while a task is selected.
- **Smaller fixes:**
  - TODAY and UPCOMING show quests in capitals, as the lists do;
  - the line under the details doesn't break mid-phrase;
  - the empty ARCHIVE note fits on one line;
  - the notes marker on a row can be read by screen readers.

## 0.8.0 (build 13)

- **Opening and closing a quest is smooth.** Click the caret (or press → and ←) and its objectives unfold like a curtain, fading in as the quests below glide down. Closing, they fade and fold away while the quests below glide back up. Nothing jumps at the start or the end, and if you change your mind halfway, it turns around from where it is. The same on COMPLETED.
- **Every fold feels the same:** the sidebar's sections and the carets now use the same soft, smooth motion as the quests.

## 0.7.0 (build 12)

A visual pass, to match the phone app's new look.

- **Every view and page opens on a lit screen.** The header above the list (ALL QUESTS, TODAY, UPCOMING, an area, Settings, Help, Trash) has the same faint green light and scanlines as the title panel, and the line under it is lit in the middle.
- **One straight line across the top.** The details pane's header is now as tall as the list's, so their dividing lines meet in one line across the window.
- **Long lists fade out** at the bottom of the window instead of being cut off mid-row. Scrolled to the end, the last quest shows in full.
- **The right-click menu** has a lit top edge.
- **Settings and Help read more clearly:** their section headings are brighter, with a lit rule after them.
- **Sidebar items** show the same faint left edge as list rows when you point at them.

## 0.6.0 (build 11)

- **Alt+Enter adds objectives as you type.** While editing a quest's title, Alt+Enter saves it and starts a new objective under it. While editing an objective, Alt+Enter starts the next one right below it, so you can list them one after another without touching the mouse. Pressing it on an empty objective does nothing, so blank ones don't pile up. If the quest was folded, it opens.
- **The `+` for adding an objective now sits right after the quest's name** instead of at the far right of the row. It still only shows while you point at the quest.

## 0.5.1 (build 10)

- **Fixed: completing a quest now ends smoothly.** After a quest slid away, the gap it left closed only partway, paused, then snapped shut. Now the quests below glide up in one continuous motion, all the way, and nothing moves when the finished quest goes to COMPLETED. This also covers quests with objectives, and the quest at the top of the list. A test now checks it frame by frame.

## 0.5.0 (build 9)

Subtle accents across the whole app.

- **Things respond when you point at them.** Buttons, fields and sidebar items brighten under the pointer, framed buttons light up softly, and pressing one gives a brief green wash. List rows show a faint edge, and menu items show the same lit edge as a selected row.
- **Focus is easier to follow.** The label of the field you're editing lights up with it.
- **The selected task stands out a little more:** its bar has a soft glow.
- **Headings read like a terminal.** Section headings (OVERDUE, OBJECTIVES, the Settings and Help sections) run on into a fading line, and the `>` prompts in titles and empty screens are lit.
- **Accents that mean something:**
  - TODAY's count in the sidebar turns bright green while anything is overdue;
  - a date due later today is a step brighter than other dates;
  - high priority (`!!!`) and overdue dates glow faintly.
- **Themed controls:** the date and time pickers' icons and the dropdown arrows are drawn in the app's green, not the browser's grey.
- **The message at the bottom** has a lit edge and a soft glow, and dialogs have a lightly lit frame.
- All of it stays within the motion budget: nothing new lays the page out again on every frame.

## 0.4.3 (build 8)

- **No blinking cursor on the XP bar.** The block gauge stays as it was.
- **Bigger ▸ / ▾ in the sidebar** for folding sections and showing an area's projects (30% larger, like the ones in the list).
- **SYSTEM has its plain border back** at the bottom of the sidebar, without the glowing green divider.

## 0.4.2 (build 7)

- **A terminal-style XP bar.** It's taller, built from 20 block cells between brackets, `[▮▮▮▮▮▯▯▯]`. The dot is gone: the last filled cell is now a bright block cursor that blinks slowly, and glows when you earn XP. With Reduce Motion on, it stays still.
- **XP totals are centred under the bar.**
- **No divider line above SYSTEM** at the bottom of the sidebar.
- **A bigger ▸ / ▾** for opening and closing a quest's objectives (30% larger).

## 0.4.1 (build 6)

Everything lines up.

- **One grid for the whole app.** Every button, field and menu row is the same height. Icons, checkboxes, titles and labels line up in shared columns, and spacing between elements is even.
- **Sidebar:** section headings, items, `+ AREA` and the archive all start on the same columns, and the title panel lines up with them.
- **The list:** the `> new quest` prompt sits over the checkboxes and its text over the titles. An objective's checkbox now sits exactly under its quest's title.
- **The details pane:** every field fills the same width, so the right edge is one straight line. Priority is four equal buttons, and OPEN / COMPLETE / DELETE are equal thirds. The checkbox is centred on the title.
- **Menus and Settings:** titles and headings line up with the items, and settings controls and backup buttons are all one width, ending exactly under the ✕.

## 0.4.0 (build 5)

A cleaner title panel and smoother motion everywhere.

- **The title panel is just `<level>_quest_log` and the XP bar.** The level and streak line is gone.
- **A new, minimal XP bar.** A thin line with a soft green fill and a small glowing tip, with your XP underneath. Earning XP swells a soft halo from the tip and makes the number glow for a moment. When you level up, the bar runs to the end, the level number pops, and the full bar fades while the new level fills in from zero.
- **Every animation is smoother.** The motion was measured on a deliberately slowed-down computer and tuned until nothing skips frames:
  - the XP bar, quest progress meters, the completion sweep and dragged tasks now move without the page laying itself out again on every frame;
  - minimizing the details pane no longer snaps: the pane fades and slides away, clipped rather than squeezed, while the strip fades in;
  - the message at the bottom slides away instead of vanishing, and closing a menu or dialog fades it out;
  - the moving scanlines in the title panel no longer keep repainting it in the background.

## 0.3.1 (build 4)

- **The title block's scanlines move.** They drift slowly down, and a soft band of light passes over now and then, like an old CRT screen. This replaces the blinking cursor. With Reduce Motion on, they stay still.

## 0.3.0 (build 3)

A sharper sidebar.

- **A new title block.** `<level>_quest_log` now has a blinking terminal cursor, inside a lit panel with corner brackets. Under the title, a status line shows your level, your day streak and the XP bonus it gives. Your level number pops when you level up.
- **The XP bar pops.** It's a segmented gauge with a glowing green fill and a bright leading edge. A sheen sweeps across it every few seconds, and it flashes whenever you earn XP. Under it you'll see how much XP you have and how much is left to the next level. With Reduce Motion on, it stays still.
- **Minimize the sidebar's sections.** Click VIEWS, AREAS, ARCHIVE or SYSTEM to fold a section away, and click again to open it. The app remembers which ones are folded. A dot on a folded section means what you're looking at is inside it. Deleting an area opens ARCHIVE so you can see where it went.
- **Dividers between the sidebar's sections.**
- **ARCHIVES is now ARCHIVE.**

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
