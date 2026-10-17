/**
 * src/app/pages/WhatsNewPage.tsx: what changed in the recent versions, from
 * CHANGELOG.md (V1 pass 2026-10-17: the app updated itself silently).
 *
 *   > WHAT'S NEW
 *   1.0.0 · build 14  (this version, lit)
 *   - **Bold lead,** then text.
 *
 * Layer: UI. The changelog is bundled as text at build time and parsed by
 * lib/changelog.ts (the last few versions). Its Markdown is the small
 * subset the changelog uses: `- ` bullets (nested by two spaces), plain
 * lines, `**bold**` and `` `code` ``. Opened from the toast after an
 * update (App.tsx) and from the version line in Settings.
 */
import type { ReactNode } from 'react';

import changelog from '../../../CHANGELOG.md?raw';
import { parseChangelog } from '@/lib/changelog';

import { cx } from '../cx';
import { Page } from './Page';

declare const __APP_BUILD__: number;

const ENTRIES = parseChangelog(changelog);

/** `**bold**` and `` `code` `` inside a line. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

/** One version's lines: bullets (one level of nesting) and plain paragraphs. */
function Lines({ lines }: { lines: readonly string[] }) {
  return lines.map((line, i) => {
    const bullet = /^(\s*)- (.*)$/.exec(line);
    if (!bullet) return <p key={i}>{inline(line.trim())}</p>;
    return (
      <p key={i} className={cx('change', bullet[1]!.length >= 2 && 'nested')}>
        {inline(bullet[2]!)}
      </p>
    );
  });
}

/** The recent versions, newest (this one) first. */
export function WhatsNewPage() {
  return (
    <Page title="WHAT’S NEW">
      {ENTRIES.map((entry) => (
        <section key={entry.build} className={cx('release', entry.build === __APP_BUILD__ && 'current')}>
          <h2 className="section-title">
            {entry.version} · build {entry.build}
            {entry.build === __APP_BUILD__ && ' · this version'}
          </h2>
          <Lines lines={entry.lines} />
        </section>
      ))}
    </Page>
  );
}
