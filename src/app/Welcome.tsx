/**
 * src/app/Welcome.tsx: what a new user sees instead of an empty list (V1
 * pass 2026-10-17: the app used to open on "NOTHING DUE TODAY" with no
 * guidance, and its example tasks were unreachable).
 *
 *   > WELCOME TO QUEST_LOG.
 *   A task list for work, in a terminal's look. …
 *   [ + LOAD EXAMPLE QUESTS ]  or press N to add your first quest
 *   N new quest · T today · U upcoming · A all quests · ? guide
 *
 * Layer: UI. Shown by the lists while there are no tasks at all (`useBlank`):
 * once anything exists, even in Trash, the usual empty messages return.
 */
import { taskCount } from '@/lib/taskMap';
import { useActions, useAppStore } from '@/store/react';

import { G } from './glyphs';
import { Prompted } from './Prompted';

/** True while there are no tasks at all (nothing open, completed or in Trash). */
export function useBlank(): boolean {
  return useAppStore((s) => taskCount(s.tasks) === 0);
}

/** The first-run welcome: what the app is, the examples, and the first keys. */
export function Welcome() {
  const actions = useActions();
  return (
    <section className="welcome" aria-label="Welcome">
      <h2 className="view-title">
        <Prompted>WELCOME TO QUEST_LOG.</Prompted>
      </h2>
      <p>
        A task list for work, in a terminal’s look. A <b>quest</b> is a project and its <b>objectives</b> are the steps; <b>areas</b> group quests
        (a client, a team); <b>TODAY</b> and <b>UPCOMING</b> gather what’s due. Everything stays in this browser.
      </p>
      <div className="button-row">
        <button
          type="button"
          className="text-btn primary"
          onClick={() => {
            actions.loadExampleTasks();
            // To ALL QUESTS (as the A key does), where every example shows with its objectives.
            actions.setCategoryTab('all');
            actions.setTab('active');
            actions.setZoom(null);
          }}
        >
          {G.add} LOAD EXAMPLE QUESTS
        </button>
        <span className="dim">or press N to add your first quest</span>
      </div>
      <dl className="welcome-keys">
        <div><dt>N</dt><dd>new quest</dd></div>
        <div><dt>T · U · A</dt><dd>today · upcoming · all quests</dd></div>
        <div><dt>?</dt><dd>the guide</dd></div>
      </dl>
    </section>
  );
}
