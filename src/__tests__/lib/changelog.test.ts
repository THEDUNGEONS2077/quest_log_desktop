/**
 * src/__tests__/lib/changelog.test.ts: the What's new data (lib/changelog.ts).
 * Copied from the phone app; the last test is the desktop's own.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { entriesSince, parseChangelog } from '@/lib/changelog';

const MD = `# Changelog

Intro text that isn't a version.

## 0.3.0 (build 5)

Third.

- **One,** with \`code\`.
  - Nested.

## 0.2.0 (build 3)

- Two.

## 0.1.0 (build 1)

- First.
`;

describe('parseChangelog', () => {
  it('reads each version with its non-empty lines, newest first', () => {
    expect(parseChangelog(MD)).toEqual([
      { version: '0.3.0', build: 5, lines: ['Third.', '- **One,** with `code`.', '  - Nested.'] },
      { version: '0.2.0', build: 3, lines: ['- Two.'] },
      { version: '0.1.0', build: 1, lines: ['- First.'] },
    ]);
  });

  it('keeps only the latest versions', () => {
    expect(parseChangelog(MD, 2).map((e) => e.build)).toEqual([5, 3]);
  });
});

describe('entriesSince', () => {
  const all = parseChangelog(MD);
  it('lists every version after the last one seen, up to the running build', () => {
    expect(entriesSince(all, 1, 5).map((e) => e.build)).toEqual([5, 3]);
    expect(entriesSince(all, 1, 3).map((e) => e.build)).toEqual([3]);
  });
  it('shows only the running version when the last seen is unknown', () => {
    expect(entriesSince(all, null, 5).map((e) => e.build)).toEqual([5]);
  });
  it('shows nothing when nothing is new', () => {
    expect(entriesSince(all, 5, 5)).toEqual([]);
  });
});

// Desktop: What's new reads CHANGELOG.md itself (imported as text), so there's no
// bundled copy to keep in sync. Its newest entry must be this version.
it("CHANGELOG.md's newest entry is the app's version", () => {
  const root = join(__dirname, '../../..');
  const md = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const version: unknown = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  expect(parseChangelog(md)[0]?.version).toBe(version);
});
