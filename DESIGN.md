# quest_log desktop: design

The same terminal look as the phone app (the phone's `DESIGN.md` is the source), laid out for a large screen, a mouse and a keyboard. Every token is a CSS custom property in `src/styles/theme.css`; components use only tokens.

## Tokens
- **Colour:** the phone's green-on-black palette.
  - Background: `--bg` #000, `--surface`, `--surface-raised`.
  - Lines: `--line`.
  - Text, quietest to loudest: `--text-dim` (meta), `--text` (body), `--accent` #39ff14 (selection, focus, checks), `--text-bright` (titles).
- **Glow:** `--glow`, `--glow-faint`, `--glow-bright` and `--glow-inset` for boxes; `--glow-text` and `--glow-text-bright` for text. Glow stays subtle and marks state:
  - the selected sidebar item;
  - the focused field;
  - the brand;
  - the XP bar.
- **Type:** JetBrains Mono (bundled TTFs in `src/assets/fonts`).
  - Sizes: `--fs-title` 22, `--fs-display` 18, `--fs-body` 14, `--fs-quest` 13, `--fs-meta` 12, `--fs-small` 11.
  - Labels and headings are UPPERCASE with letter spacing; task titles keep their case.
- **Space:** `--s-xs` 4, `--s-sm` 8, `--s-md` 12, `--s-lg` 16, `--s-xl` 24. Also `--indent` 20 per nesting level, `--radius` 2, `--hairline` 1.
- **Motion:**
  - durations: `--fast` 120 ms, `--base` 200 ms, `--slow` 320 ms;
  - curves: `--ease` (out-cubic) for entering, `--ease-exit` (in-cubic) for leaving;
  - **Reduce Motion** (the Settings switch, `data-reduce-motion`, or the system's `prefers-reduced-motion`) sets all three durations to 0.

## Layout
```
┌ sidebar 264 ─┬ list (flexible) ─────────────────┬ detail 380 ───────┐
│ <3>_quest_log│ > ALL QUESTS · MAIN    [search]  │ MAIN › Launch     │
│ ▓▓▓░ 120 XP  │ ACTIVE · COMPLETED               │ Ship the report   │
│ ◉ TODAY    3 │ > new quest_                     │ PRIORITY ! !! !!! │
│ ◔ UPCOMING 5 │ [ ] Launch            ▓▓░ 2/3    │ DUE  [date][time] │
│ ≡ ALL     12 │   [x] Ship the report  ◔ 10:00   │ REPEAT [none ▾]   │
│ AREAS        │   [ ] Hire a designer            │ NOTES …           │
│ ▸ DAILY    2 │                                  │ OBJECTIVES …      │
│ ▾ MAIN     7 │                                  │                   │
│    Launch    │                                  │ +18 XP · created… │
│ + AREA       │                                  │ OPEN  COMPLETE  … │
│ ✔ COMPLETED  │                                  │                   │
│ × TRASH  ⚙ … │                                  │                   │
└──────────────┴──────────────────────────────────┴───────────────────┘
```
- **Three columns** in a CSS grid (`--sidebar`, flexible, `--detail`), separated by hairlines.
- **The detail pane minimizes** (`»` or `D`) to a `--detail-min` (40 px) strip with `«` and a vertical DETAILS label; the columns glide (`--base`). It's remembered (`ui.detailCollapsed`).
- **Under 1100 px wide:** the detail pane slides over the list from the right while a task is selected.
- **Under 900 px:** the sidebar becomes a drawer, opened with `≡`.

## Interaction
- **Hover:** rows and sidebar items get `--surface-raised`. The drag handle `⋮` shows on hover.
- **Selection:** one selected task shows a left accent bar and drives the detail pane. Several (Ctrl/Shift+click) show the selection bar with bulk actions.
- **Editing:** double-click or `Enter` edits a title inline. Shorthand chips (`◔ TOMORROW 10:00`, `!!`, `↻ WEEKLY`) float **above** the text being typed, small and quiet, the same in quick-add and in inline editing.
- **Completion:**
  - the checkbox pops, a scan line crosses the row, and `+N XP` floats up;
  - the row then slides and fades out, and the rows below glide up (600 ms, matching the store's 1040 ms linger);
  - undo puts it back.
- **Right-click:** a menu of the phone's hold-menu actions, for a task, an area or a selection.
- **Focus:** the keyboard focus ring is the accent glow. Every control is reachable by keyboard.
