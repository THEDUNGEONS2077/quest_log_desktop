/**
 * src/app/pages/HelpPage.tsx: the user guide, with every shortcut.
 *
 * Layer: UI. How the desktop app is organised (areas, projects, objectives,
 * the planning views), the shorthand, and the keyboard.
 */
import { G } from '../glyphs';
import { Page } from './Page';

const SHORTCUTS: [string, string][] = [
  ['N', 'New quest (the field at the top of the list)'],
  ['/', 'Search the list shown'],
  ['T · U · A', 'TODAY · UPCOMING · ALL QUESTS'],
  ['↑ ↓', 'Move the selection'],
  ['Enter', 'Edit the selected task’s title'],
  ['Alt+Enter', 'While editing: save, then start a new objective (in a quest) or the next one below (in an objective)'],
  ['Space', 'Complete (or restore) the selected task'],
  ['→ ← ', 'Open / close its objectives'],
  ['O', 'Open the selected project (show only its tasks)'],
  ['D', 'Minimize the details pane, or bring it back'],
  ['Tab · Shift+Tab', 'Indent / outdent (make it an objective of the task above, or not)'],
  ['Alt+↑ · Alt+↓', 'Move it up / down among its siblings'],
  ['Del', 'Delete (to Trash; Ctrl+Z brings it back)'],
  ['Ctrl+Z · Ctrl+Shift+Z', 'Undo · Redo'],
  ['Esc', 'Back out: stop editing, clear the selection, close search, leave a project'],
  ['?', 'This guide'],
];

const SHORTHAND: [string, string][] = [
  ['!  !!  !!!', 'Priority: low, medium, high (high quests stay on top)'],
  ['@fri  @tomorrow 3pm  @12/10', 'Due date and time'],
  ['*daily  *weekly  *weekdays', 'Repeat'],
  ['// a note', 'Notes'],
  ['#Name', 'Make a group; what you add next goes inside it'],
];

export function HelpPage() {
  return (
    <Page title="HELP">
      <section className="help">
        <h2 className="section-title">HOW IT'S ORGANISED</h2>
        <p>
          The sidebar's sections (VIEWS, AREAS, ARCHIVE, SYSTEM) minimize to their heading with a click, and stay that way; a dot on a minimized one means
          what's shown is inside. <b>Areas</b> are your groups of work (a client, a team, a part of the job). Make them with <b>{G.add} AREA</b> in the sidebar. Click one and the pane on the right
          shows it: rename it there, or delete it (right-click works too, and can reorder). A deleted area goes into <b>{G.archives} ARCHIVE</b> with its
          quests, out of ALL QUESTS, TODAY and UPCOMING; open it there to <b>RESTORE</b> it or <b>DELETE FOREVER</b> (its quests go to Trash). DAILY, MAIN
          and MISC come with the app, and DAILY quests repeat every day.
        </p>
        <p>
          A <b>quest</b> is a project: its <b>objectives</b> are its tasks, and they can have their own, as deep as you need. Click a quest's caret to see them,
          or open the project (<b>O</b>, or its name under the area in the sidebar) to show nothing else.
        </p>
        <p>
          <b>TODAY</b> lists what's overdue and due today, <b>UPCOMING</b> the next 14 days, from every area and every depth, each with where it lives. Give a
          task a date (shorthand, or the details on the right) and it shows up there.
        </p>
        <p>
          Completing things earns <b>XP</b>, and your level is in the corner. A bigger quest earns more, and finishing on time and keeping streaks add to it.
          Finished quests go to <b>COMPLETED</b>; deleted tasks wait 7 days in <b>TRASH</b>.
        </p>
        <h2 className="section-title">SHORTHAND (type it in any title)</h2>
        <dl className="keys">
          {SHORTHAND.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h2 className="section-title">KEYBOARD</h2>
        <dl className="keys">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h2 className="section-title">YOUR DATA</h2>
        <p>
          Everything stays in this browser: no account, no server, no analytics. It works offline, and Chrome can install it as an app (the install icon in
          the address bar). Back up from SETTINGS; the backup file also moves tasks to and from the phone app.
        </p>
      </section>
    </Page>
  );
}
