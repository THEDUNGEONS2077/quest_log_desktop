/**
 * src/app/glyphs.ts: the text glyphs used as icons (the phone's theme/glyphs.ts).
 *
 * Layer: UI. Plain characters in JetBrains Mono instead of icon images, so
 * the app stays a terminal: `[ ]` boxes, ▸ carets, ◔ for dates, and so on.
 */
export const G = {
  checkboxOff: '[ ]',
  checkboxOn: '[x]',
  caret: '▸',
  notes: '≡',
  due: '◔',
  repeat: '↻',
  priority: '!',
  add: '+',
  search: '/',
  settings: '⊛',
  delete: '✕',
  /** Minimize / bring back the detail pane. */
  hidePane: '»',
  showPane: '«',
  undo: '↩',
  redo: '↪',
  outdent: '←',
  indent: '→',
  zoom: '⊕',
  duplicate: '⊞',
  copy: '⎕',
  moveTo: '↦',
  done: '✓',
  help: '?',
  save: '↧',
  load: '↥',
  cursor: '█',
  prompt: '>',
  today: '◉',
  upcoming: '◔',
  all: '≣',
  trash: '✕',
  completed: '✓',
  area: '▪',
} as const;
