/**
 * lib/sample.ts: the example quests behind the welcome screen's LOAD
 * EXAMPLE QUESTS (desktop V1 pass 2026-10-17; the phone's examples spoke of
 * taps and swipes).
 *
 * Layer: pure lib. Written as an outline (the format paste accepts,
 * lib/paste.ts), so the tree is built by the tested paste code and lands
 * as one undoable step. A quest's line (top level) may carry shorthand
 * (`!!`, `@today`, `*weekly`), which the store applies as fields; an
 * objective's line is taken as written, so it can teach the shorthand. The
 * objectives teach the main mouse and keyboard moves; `//` lines are notes.
 */

/** The example tree, as outline text. */
export const SAMPLE_OUTLINE = `Welcome to quest_log !! @today
  // A quest is a project; its objectives are the steps. Everything stays in this browser: back it up from Settings now and then.
  [x] Open quest_log
  Click a task: its details open on the right
  Double-click a title (or press Enter) to edit it
  Right-click a task (or Shift+F10) for its menu
  Press N for a new quest, then try typing: report !! @fri 3pm
  Drag a task by its handle; drag sideways to nest it
  Press ? for every shortcut
Plan the week @mon 9am
  Review last week
  Pick three priorities
  Block time for the biggest one
Clear the inbox *weekly`;

/** Whether an outline line (top level) is read for shorthand when the examples load. */
export const SAMPLE_SHORTHAND_DEPTH = 0;
