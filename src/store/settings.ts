/**
 * store/settings.ts: user settings and their defaults (PLAN §9.17).
 *
 * Layer: store. Persisted as `settings.v1`. loadJSON fills in defaults for
 * missing fields, so adding a setting needs no migration.
 */

export interface Settings {
  // --- Behavior ---
  /** Turn on the notification when a due date is set (shorthand and picker). */
  notifyByDefault: boolean;
  /** Time used for day-only dates such as `@fri` (minutes after midnight; 540 = 09:00). */
  defaultTimeMinutes: number;
  swipeActions: boolean;
  /** Move completed tasks older than N days to Trash on launch. */
  autoClearCompleted: 'off' | 30 | 90;
  // --- Feel ---
  bootSequence: boolean;
  haptics: boolean;
  /** 'system' follows the OS Reduce Motion setting. */
  reduceMotion: 'system' | 'on' | 'off';
  /** Text size, in percent of the standard (desktop V1 pass 2026-10-17): every font grows, the layout stays. */
  textSize: TextSize;
  /** The shorthand hint in the empty new quest bar ("(try: !! priority …)"); off: just "new quest" (user request 2026-10-17). */
  quickAddHint: boolean;
}

/** The text sizes Settings offers (percent). */
export const TEXT_SIZES = [90, 100, 115, 130] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const DEFAULT_SETTINGS: Settings = {
  notifyByDefault: true,
  defaultTimeMinutes: 9 * 60,
  swipeActions: true,
  autoClearCompleted: 'off',
  bootSequence: true,
  haptics: true,
  reduceMotion: 'system',
  textSize: 100,
  quickAddHint: true,
};
