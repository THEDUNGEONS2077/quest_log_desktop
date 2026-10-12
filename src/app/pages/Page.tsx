/**
 * src/app/pages/Page.tsx: the frame of a centre page (settings, trash, help).
 *
 * Layer: UI. `> title` at the top with a close button back to the list,
 * then the page's content, scrolling.
 */
import type { ReactNode } from 'react';

import { useActions } from '@/store/react';

import { G } from '../glyphs';
import { Prompted } from '../Prompted';

export function Page({ title, children }: { title: string; children: ReactNode }) {
  const actions = useActions();
  return (
    <main className="center page">
      <header className="center-head">
        <h1 className="view-title">
          <Prompted>{title}</Prompted>
        </h1>
        <button type="button" className="icon-btn" aria-label={`Close ${title.toLowerCase()} (Esc)`} onClick={() => actions.openPage(null)}>
          {G.delete}
        </button>
      </header>
      <div className="center-body page-body">{children}</div>
    </main>
  );
}
