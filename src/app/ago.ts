/**
 * src/app/ago.ts: when something happened, in words: "just now", "5m ago",
 * "3h ago", "yesterday", "on Sep 27". For the details pane's times, Settings'
 * last backup and Trash.
 *
 * Layer: UI (wording); the arithmetic is lib/dates.ts formatRelative.
 * (V1.1 pass 2026-10-17: older dates read "sep 27 ago" and "yesterday ago".)
 */
import { formatRelative } from '@/lib/dates';

/** How long ago `ts` was, at `now`: "just now", "5m ago", "3h ago", "yesterday", "on Sep 27". */
export function ago(ts: number, now: number): string {
  const r = formatRelative(ts, now);
  if (r === 'NOW') return 'just now';
  if (r === 'YESTERDAY') return 'yesterday';
  // "5m", "2h": a span of time.
  if (/^\d+[mh]$/.test(r)) return `${r} ago`;
  // A date ("SEP 27", "SEP 27 2025"): on that day, with a capital month.
  return `on ${r.charAt(0)}${r.slice(1).toLowerCase()}`;
}
