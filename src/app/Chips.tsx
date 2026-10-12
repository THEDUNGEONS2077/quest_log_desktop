/**
 * src/app/Chips.tsx: shorthand chips, shown just above the text being typed
 * (the phone's ParsedChips.tsx).
 *
 *   ◔ FRI 09:00   !! MED   ↻ WEEKLY
 *
 * Layer: UI. ShorthandChips previews what typed shorthand will do (quick
 * add); TaskChips, while a title is edited, also shows the task's current
 * priority, due date and repeat, each clearable. Parsing is pure
 * (lib/parser.ts), at the current minute and the user's default time.
 */
import { formatDue } from '@/lib/dates';
import { parse, type ParseResult } from '@/lib/parser';
import { repeatLabel } from '@/lib/recurrence';
import { findTask } from '@/lib/taskMap';
import { useActions, useAppStore } from '@/store/react';

import { G } from './glyphs';
import { useMinute } from './useMinute';

const PRIORITY_LABEL = ['', 'LOW', 'MED', 'HIGH'] as const;

/** Parses `text` like finishing the edit will (saved words stay literal, dates amend the existing one). */
export function useShorthand(text: string, literalFrom?: string | null, existingDue?: number | null): ParseResult {
  const now = useMinute();
  const defaultTimeMinutes = useAppStore((s) => s.settings.defaultTimeMinutes);
  const literal = literalFrom ? new Set(literalFrom.split(/\s+/).filter(Boolean)) : undefined;
  return parse(text, { now, defaultTimeMinutes, literal, existingDue });
}

function chipLabel(kind: ParseResult['chips'][number]['kind'], label: string): string {
  if (kind === 'due') return `${G.due} ${label}`;
  if (kind === 'repeat') return `${G.repeat} ${label}`;
  return label;
}

/** One chip; with `onClear`, a ✕ clears the value. */
function Chip({ label, onClear, title }: { label: string; onClear?: () => void; title: string }) {
  return (
    <span className="chip" title={title}>
      {label}
      {onClear && (
        <button
          type="button"
          className="chip-clear"
          // Keep focus in the field being typed in.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
          aria-label={`Clear ${title}`}
        >
          {G.delete}
        </button>
      )}
    </span>
  );
}

/** The live preview of the shorthand in some text. Nothing for plain text. */
export function ShorthandChips({ result }: { result: ParseResult }) {
  if (!result.chips.length) return null;
  return (
    <div className="chips" aria-label={`Shorthand: ${result.chips.map((c) => c.label).join(', ')}`}>
      {result.chips.map((c) => (
        <Chip key={c.kind} label={chipLabel(c.kind, c.label)} title={c.kind} />
      ))}
    </div>
  );
}

/** While editing task `id`: the shorthand preview, plus its current values (clearable). */
export function TaskChips({ id }: { id: string }) {
  const task = useAppStore((s) => findTask(s.tasks, id));
  const startTitle = useAppStore((s) => (s.editingId === id ? s.editingStartTitle : null));
  const actions = useActions();
  const now = useMinute();
  const parsed = useShorthand(task?.title ?? '', startTitle, task?.dueAt ?? null);
  if (!task) return null;
  const showPriority = task.priority > 0 && parsed.priority === undefined;
  const showDue = task.dueAt !== null && parsed.dueAt === undefined;
  const showRepeat = task.repeat !== null && parsed.repeat === undefined;
  if (!parsed.chips.length && !showPriority && !showDue && !showRepeat) return null;
  return (
    <div className="chips">
      {parsed.chips.map((c) => (
        <Chip key={`p-${c.kind}`} label={chipLabel(c.kind, c.label)} title={c.kind} />
      ))}
      {showPriority && (
        <Chip label={`${'!'.repeat(task.priority)} ${PRIORITY_LABEL[task.priority]}`} title="priority" onClear={() => actions.setPriority(id, 0)} />
      )}
      {showDue && <Chip label={`${G.due} ${formatDue(task.dueAt!, now)}`} title="due date" onClear={() => actions.clearDue(id)} />}
      {showRepeat && <Chip label={`${G.repeat} ${repeatLabel(task.repeat!)}`} title="repeat" onClear={() => actions.setRepeat(id, null)} />}
    </div>
  );
}
