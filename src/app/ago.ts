/**
 * src/app/ago.ts: "5m ago", "3d ago" or "just now", for the details pane's
 * times and Settings' last backup.
 *
 * Layer: UI (wording); the arithmetic is lib/dates.ts formatRelative.
 */
import { formatRelative } from '@/lib/dates';

/** How long ago `ts` was, at `now`: "5m ago", "3d ago", or "just now". */
export function ago(ts: number, now: number): string {
  const r = formatRelative(ts, now);
  return r === 'NOW' ? 'just now' : `${r.toLowerCase()} ago`;
}
