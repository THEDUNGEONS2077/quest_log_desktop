/**
 * src/app/OtherWindow.tsx: the screen of a window that doesn't hold the
 * tasks, because another window does (V1 pass 2026-10-17; store/instance.ts).
 *
 *   > QUEST_LOG IS OPEN IN ANOTHER WINDOW.
 *   Your tasks are open in one window at a time, so two never overwrite …
 *   [ USE HERE ]
 *
 * Layer: UI, shown without the store (src/main.tsx). `moved`: this window
 * had the tasks and handed them to another one, after saving everything.
 */
import { useState } from 'react';

import { Prompted } from './Prompted';

interface Props {
  /** This window had the tasks and gave them to another window. */
  moved?: boolean;
  /** USE HERE: takes the tasks over (the other window saves and steps aside). */
  onUseHere: () => void;
}

/** The tasks are open in another window: says so, and offers USE HERE. */
export function OtherWindow({ moved = false, onUseHere }: Props) {
  // Pressed: waiting for the other window to save and step aside (a moment).
  const [asking, setAsking] = useState(false);
  return (
    <main className="crash" role="alert">
      <h1 className="view-title">
        <Prompted>{moved ? 'QUEST_LOG MOVED TO ANOTHER WINDOW.' : 'QUEST_LOG IS OPEN IN ANOTHER WINDOW.'}</Prompted>
      </h1>
      <p>
        {moved
          ? 'Everything here was saved first. Your tasks are open in one window at a time, so two windows never overwrite each other.'
          : 'Your tasks are open in one window at a time, so two windows never overwrite each other. Use them here and the other window saves everything and steps aside.'}
      </p>
      <div className="detail-actions">
        <button
          type="button"
          className="text-btn primary"
          disabled={asking}
          onClick={() => {
            setAsking(true);
            onUseHere();
          }}
        >
          {asking ? 'OPENING…' : '⇥ USE HERE'}
        </button>
      </div>
    </main>
  );
}
