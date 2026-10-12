/**
 * src/app/Prompted.tsx: a line that starts with the terminal prompt,
 * `> NOTHING DUE TODAY.`, with the `>` in accent (subtle accents pass
 * 2026-10-12: empty states, titles).
 *
 * Layer: UI.
 */
import type { ReactNode } from 'react';

import { G } from './glyphs';

/** `children` after an accent `>` (or another `glyph`). */
export function Prompted({ children, glyph = G.prompt }: { children: ReactNode; glyph?: string }) {
  return (
    <>
      <span className="prompt">{glyph}</span> {children}
    </>
  );
}
