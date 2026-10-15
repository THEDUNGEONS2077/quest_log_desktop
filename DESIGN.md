# quest_log desktop: design

The same terminal look as the phone app (the phone's `DESIGN.md` is the source), laid out for a large screen, a mouse and a keyboard. Every token is a CSS custom property in `src/styles/theme.css`; components use only tokens.

## Tokens
- **Colour:** the phone's green-on-black palette.
  - Background: `--bg` #000, `--surface`, `--surface-raised`.
  - Lines: `--line`.
  - Text, quietest to loudest: `--text-dim` (meta), `--text` (body), `--accent` #39ff14 (selection, focus, checks), `--text-bright` (titles).
- **Glow:** `--glow`, `--glow-faint`, `--glow-bright` and `--glow-inset` for boxes; `--glow-text-faint`, `--glow-text` and `--glow-text-bright` for text. **Accent tints** `--accent-05` … `--accent-60` (and `--bright-08`, `--accent-deep`, `--flash`) are the accent at fixed strengths, for washes, hover edges and rules. Glow stays subtle and marks state:
  - the selected sidebar item;
  - the focused field;
  - the brand;
  - the XP bar.
- **Type:** JetBrains Mono (bundled TTFs in `src/assets/fonts`).
  - Sizes: `--fs-title` 22, `--fs-display` 18, `--fs-body` 14, `--fs-quest` 13, `--fs-meta` 12, `--fs-small` 11.
  - Labels and headings are UPPERCASE with letter spacing; task titles keep their case.
- **Space:** `--s-xs` 4, `--s-sm` 8, `--s-md` 12, `--s-lg` 16, `--s-xl` 24. Also `--indent` 28 per nesting level, `--radius` 2, `--hairline` 1.
- **Accents** (subtle accents pass 2026-10-12). Accents mark state or meaning, never decoration for its own sake, and always come from the tokens: the glows, `--glow-text-faint`, and the accent tints `--accent-05` … `--accent-60`. `app.css` has no raw colours.
  - **Hover:** a field's or button's frame brightens a step (`--text-dim`), or for framed icon buttons lights (`--accent-35` and `--glow-faint`). List rows get a faint 2 px edge (`--accent-20`); menu items get the selected row's lit edge. Sidebar items brighten and their icon glows. The date and time icons and the select arrows turn accent.
  - **Pressed:** a brief `--accent-10` wash on framed buttons.
  - **Focus:** the field's frame turns accent (as before), and its label lights up with it (`:focus-within`).
  - **Selected row:** the 2 px bar plus a soft glow spilling a few pixels into the row.
  - **Headings:** `>` prompts in titles and empty states are accent (`Prompted`); view titles and the details pane's quest title get `--glow-text-faint`; section headings run on into a hairline rule that fades out (accent for OVERDUE).
  - **Meaning:** TODAY's count turns accent while anything is overdue; a date due later today is one step brighter than other dates (overdue stays accent); `!!!` and overdue dates glow faintly.
  - **Overlays:** the toast has a lit left edge and a faint glow; a dialog's frame is lightly lit.
  - **Themed controls:** select arrows are the theme's own `▼` (CSS gradients from tokens), and the date and time picker icons are redrawn in the theme colour with a mask.
  - **Motion:** colours, borders and box glows ease in over `--fast`. Text glows change at once, because an animated `text-shadow` relays text every frame. List rows and menu items switch at once too: they change on clicks that also render other things.
- **Alignment grid** (alignment pass 2026-10-12; tokens in `theme.css`):
  - every button, input and select is `--control` (32 px) tall; sidebar rows and headings are `--row` (32 px), so the rhythm is even;
  - sidebar: every row's content starts `--nav-x` (12 px) into its box, with an icon column of `--nav-icon` (16 px) and the label after `--s-sm`. Icons, carets, section headings, `+ AREA` and archived areas share those two columns. The title panel's content uses the same edges, and the counts end where the XP bar ends;
  - list rows: `[caret 24][8][checkbox 20][8][title]`. One indent is a checkbox plus its gap (`--indent` 28 px), so a child's checkbox sits under its parent's title. Quick-add's `>` sits on the checkbox column and its text on the title column;
  - details pane: an 88 px label column, each label centred on its first control. Every control fills the control column (one straight right edge). Priority is four equal cells, the date presets span edge to edge, and the pane's actions are equal columns;
  - menus: a glyph column and a label column, which titles and headings share; menu priority buttons run to the edge;
  - pages run full width on the header's gutters, so rows end under the header's ✕. Settings controls and page buttons are one width (`--setting-control`);
  - spacing comes from the scale only (`--s-xs` 4 … `--s-xl` 24).
- **Motion rules** (animation pass 2026-10-12, measured with `npm run e2e:motion`):
  - animate only `transform` and `opacity`; the GPU runs them without laying anything out. Widths are moved by `translateX` inside a clipping box (the XP bar, the quest meter), and glows that must change get an overlay whose opacity changes (an animated `text-shadow` lays the text out every frame);
  - nothing appears or disappears in one frame: the toast, menus and dialogs animate out (`usePresence`), the details pane cross-fades with its strip, and its content is clipped, never squeezed, while the column changes;
  - the few size animations left (a completed quest closing its gap, a sidebar section folding, the details column) change one track of a grid, so the browser lays out only what moved. The grid item that shrinks must have no padding, border or margin of its own (a list row sits in a plain `.row-clip`), or the track stops at that size and the rest snaps when the element is removed. A completed quest's gap closes 640–960 ms after completion and the row is removed at 1040 ms, so the removal moves nothing (checked by `npm run e2e`).
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
- **The sidebar** opens with the masthead: a lit `--surface` panel with faint scanlines that drift slowly down (and a soft refresh band passing every 7 s), a green glow from the top-left corner and two accent corner brackets. In it:
  - `<level>_quest_log`; the level pops on a level up;
  - the XP bar: a terminal gauge `[▮▮▮▮▯▯▯]`, 10 px tall: 20 block cells between dim brackets (a fixed mask cuts the track into cells), filled to the nearest whole cell, no cursor; the totals centred beneath. A gain brightens the number; a level up runs the fill to the end, pops the level number, and the full bar fades while the new level grows in from zero.
  Below it come the sections VIEWS, AREAS, ARCHIVE and SYSTEM. Each heading minimizes its section (the body folds; remembered in `ui.sidebarCollapsed`), with a dot when a minimized section holds what's shown. Between sections is a hairline divider that fades at both ends and is lit in the middle (above SYSTEM, at the bottom, a plain hairline border instead). The endless loops (scanlines, sheen) pause under Reduce Motion (`--loops`).
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
