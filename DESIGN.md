# quest_log desktop: design

The same terminal look as the phone app (the phone's `DESIGN.md` is the source), laid out for a large screen, a mouse and a keyboard. Every token is a CSS custom property in `src/styles/theme.css`; components use only tokens.

## Tokens
- **Colour:** the phone's green-on-black palette.
  - Background: `--bg` #000, `--surface`, `--surface-raised`.
  - Lines: `--line`, and `--line-lit` (the accent at about 35% over black, the phone's `lineLit`).
  - Text, quietest to loudest: `--text-dim` (meta), `--text` (body), `--accent` #39ff14 (selection, focus, checks), `--text-bright` (titles).
- **Glow:** `--glow`, `--glow-faint`, `--glow-bright` and `--glow-inset` for boxes; `--glow-text-faint`, `--glow-text` and `--glow-text-bright` for text. **Accent tints** `--accent-05` … `--accent-60` (and `--bright-08`, `--accent-deep`, `--flash`) are the accent at fixed strengths, for washes, hover edges and rules. Glow stays subtle and marks state:
  - the selected sidebar item;
  - the focused field;
  - the brand;
  - the XP bar.
- **Phosphor effects** (aesthetic pass 2026-10-17, shared with the phone's `theme/effects.ts`): the chrome reads as a lit terminal screen. All are static gradients, green at low strength, and never inside list rows.
  - `--phosphor`: a soft light from the top-left corner (the accent at 10%, fading out by 62%);
  - `--scanlines`: a 1 px line of the accent at 5% every 3 px;
  - `--lit-rule`: a hairline from transparent through `--line` to the accent at 35% in the middle and back;
  - `--fade-rule` / `--fade-rule-lit`: a heading's rule, fading out from `--line`, or from the accent at 35%.
  Where they go: the masthead (phosphor, drifting scanlines); every view's and page's header (phosphor, still scanlines, a lit divider); the sidebar's section dividers and the context menu's top edge (lit rules); section headings (fading rules: lit for OVERDUE and on pages).
- **Type:** JetBrains Mono (bundled TTFs in `src/assets/fonts`).
  - Sizes: `--fs-title` 22, `--fs-display` 18, `--fs-body` 14, `--fs-quest` 13, `--fs-meta` 12, `--fs-small` 11.
  - Labels and headings are UPPERCASE with letter spacing; task titles keep their case.
- **Space:** `--s-xs` 4, `--s-sm` 8, `--s-md` 12, `--s-lg` 16, `--s-xl` 24. Also `--indent` 28 per nesting level, `--radius` 2, `--hairline` 1.
- **Accents** (subtle accents pass 2026-10-12). Accents mark state or meaning, never decoration for its own sake, and always come from the tokens: the glows, `--glow-text-faint`, and the accent tints `--accent-05` … `--accent-60`. `app.css` has no raw colours.
  - **Hover:** a field's or button's frame brightens a step (`--text-dim`), or for framed icon buttons lights (`--accent-35` and `--glow-faint`). List rows and sidebar items get a faint 2 px edge (`--accent-20`); menu items get the selected row's lit edge. Sidebar items brighten and their icon glows. The date and time icons and the select arrows turn accent.
  - **Pressed:** a brief `--accent-10` wash on framed buttons.
  - **Focus:** the field's frame turns accent (as before), and its label lights up with it (`:focus-within`).
  - **Selected row:** the 2 px bar plus a soft glow spilling a few pixels into the row.
  - **Headings:** `>` prompts in titles and empty states are accent (`Prompted`); view titles and the details pane's quest title get `--glow-text-faint`; section headings run on into a hairline rule that fades out (accent for OVERDUE). On pages (Settings, Help, Trash) the headings name the sections: `--text-bright`, with the lit rule.
  - **Meaning:** TODAY's count turns accent while anything is overdue; a date due later today is one step brighter than other dates; `!!!` glows faintly.
  - **Urgency, in three steps** (V1.1 accents pass 2026-10-17): an overdue date on a row (lists and TODAY) is a **lit tag** (accent text, an `--accent-35` frame, an `--accent-10` wash, the meter's shape), so what's late stands out while scanning; due later today is brighter text; later dates are dim.
  - **Ready to complete:** a quest whose objectives are all done lights its meter (frame, text, faint glow).
  - **What a click does:** an open checkbox under the pointer previews its check (a faint `x` in the brackets).
  - **Current choice:** the date preset matching the task's due day (TODAY, TOMORROW, NEXT WEEK) is lit (`aria-pressed`); CLEAR keeps its place, dimmed, when there's no date.
  - **Destructive buttons** (`.text-btn.danger`: DELETE, EMPTY TRASH, DELETE FOREVER) are a step quieter (`--text-dim`) at rest, so the safe actions lead, and light fully (frame, wash, glow) under the pointer or the keyboard. A confirm that can't be undone has a destructive OK and opens with CANCEL focused.
  - **Counts:** planning sections show how many they hold (`OVERDUE · 2`, in the heading's colour, regular weight); TRASH shows its count in the sidebar like COMPLETED.
  - **Focus vs. selection:** the keyboard's focus ring is a dashed accent outline 2 px out (with the glow); a selected item is a solid lit frame, so the two are never confused.
  - **Overlays:** the toast has a lit left edge and a faint glow, and a hairline along its bottom that shrinks as its 5 s run out (it stops while the pointer or the keyboard holds the toast; hidden under Reduce Motion); a dialog's frame is lightly lit; the context menu's top edge is lit in the middle (drawn in the border's place, like the phone's sheets).
  - **The list's end:** a long list fades out over the last 24 px at the window's bottom edge instead of being cut off (a sticky gradient at the end of the scrolling content; it rests after the last row once you've scrolled to the end).
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
  - the few size animations left (a completed quest closing its gap, a quest's objectives or a sidebar section folding, the details column) change one track of a grid, so the browser lays out only what moved. The grid item that shrinks must have no padding, border or margin of its own (a list row sits in a plain `.row-clip`), or the track stops at that size and the rest snaps when the element is removed. A completed quest's gap closes 640–960 ms after completion and the row is removed at 1040 ms, so the removal moves nothing (checked by `npm run e2e`).
- **Motion:**
  - durations: `--fast` 120 ms, `--base` 200 ms, `--slow` 320 ms;
  - curves: `--ease` (out-cubic) for entering, `--ease-exit` (in-cubic) for leaving, and `--ease-fold` (CSS's `ease`: a soft start, a long settle) for folds and the carets that turn with them. A fold moves the furthest: out-cubic would jump 15% of the way in its first frame (27 px for five objectives), `--ease-fold` at most about 20 px a frame;
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
- **The header band:** the list's header and the detail pane's head are both `--head` (56 px) tall, so their dividers make one line across the window. The list's header (every view and page) is a lit screen like the masthead: the phosphor light under still scanlines, with its divider lit in the middle. The detail pane's head keeps a plain hairline, so the light stays on the view you're in.
- **The sidebar** opens with the masthead: a lit `--surface` panel with faint scanlines that drift slowly down (and a soft refresh band passing every 7 s), a green glow from the top-left corner and two accent corner brackets. In it:
  - `<level>_quest_log`; the level pops on a level up;
  - the XP bar: a terminal gauge `[▮▮▮▮▯▯▯]`, 10 px tall: 20 block cells between dim brackets (a fixed mask cuts the track into cells), filled to the nearest whole cell, no cursor; the totals centred beneath. A gain brightens the number; a level up runs the fill to the end, pops the level number, and the full bar fades while the new level grows in from zero.
  Below it come the sections VIEWS, AREAS, ARCHIVE and SYSTEM. The title block stays at the top and SYSTEM at the bottom; only VIEWS, AREAS and ARCHIVE scroll between them (`.sidebar-scroll`), so with many areas, or an area's projects shown, the brand, the XP bar and SYSTEM never scroll away. Long area names end in an ellipsis and show in full as a tooltip; a project shows its open objectives only when it has some (no `0` beside every simple quest). Each heading minimizes its section (the body folds; remembered in `ui.sidebarCollapsed`), with a dot when a minimized section holds what's shown. Between sections is a hairline divider that fades at both ends and is lit in the middle (above SYSTEM, at the bottom, a plain hairline border instead). The endless loops (scanlines, sheen) pause under Reduce Motion (`--loops`).
- **The detail pane minimizes** (`»` or `D`) to a `--detail-min` (40 px) strip with `«` and a vertical DETAILS label; the columns glide (`--base`). It's remembered (`ui.detailCollapsed`).
- **Pages** (Settings, Help, Trash, What's new) take the details pane's room: the third column goes to 0.
- **Text size** (Settings): `--text-scale` multiplies every `--fs-*` / `--lh-*` token and the few literal glyph sizes, plus `--setting-control`; spacing and pane widths stay. The row grid's caret and checkbox columns grow with it (`--caret` 24 px × scale; `--check` is the `[ ]` glyph's own width, 27 px × scale − 6 px), so a box never runs into its title; the indent follows (`--check` + 8), and drag (`drag.tsx rowGrid`) reads the same scale. Long titles wrap at `max-width: 96ch` (on the title's text, not its column). The date presets wrap to a second line rather than squeezing.
- **First run:** with no tasks at all, TODAY and ALL show the welcome (`Welcome.tsx`): a lit `>` heading, a short explanation at 68ch, LOAD EXAMPLE QUESTS (primary) and the first keys in two columns.
- **Under 1100 px wide:** the detail pane slides over the list from the right while a task is selected.
- **Under 900 px:** the sidebar becomes a drawer, opened with `≡`.

## Interaction
- **Hover:** rows and sidebar items get `--surface` and a faint left edge. The drag handle `⋮` shows on hover.
- **Selection:** one selected task shows a left accent bar and drives the detail pane. Several (Ctrl/Shift+click) show the selection bar with bulk actions.
- **Editing:** double-click or `Enter` edits a title inline. Shorthand chips (`◔ TOMORROW 10:00`, `!!`, `↻ WEEKLY`) float **above** the text being typed, small and quiet, the same in quick-add and in inline editing.
- **Completion:**
  - the checkbox pops, a scan line crosses the row, and `+N XP` floats up;
  - the row then slides and fades out, and the rows below glide up (600 ms, matching the store's 1040 ms linger);
  - undo puts it back.
- **Folding** (2026-10-17): the caret, or `←` / `→`, folds a task's objectives open or shut, on ACTIVE and on COMPLETED.
  - The list nests its flat rows (`RowTree`, `app/Fold.tsx`), so all of a task's objectives, nested ones too, sit in one block under it: one grid track, so the block opens like a curtain.
  - Opening: the block grows from nothing (its first style, `@starting-style`) as its rows fade in. Closing: it shrinks away as they fade out, a little ahead of it, so no row is left cut in half. The rows below glide; `--slow` (320 ms) with `--ease-fold`, and the caret turns over `--base`.
  - A folding block's rows stay listed until the fold has played (store `folding` / `unfolding`, `FOLD_MS` 400 ms), so it closes all the way and their removal moves nothing; the arrow keys skip them meanwhile. Turned around mid-way, a fold goes back from where it is.
  - While a block moves, its rows are drawn at their real size (no `content-visibility` estimate), or it would grow towards a 40 px-a-row guess and step back.
  - Checked frame by frame in `npm run e2e`; `npm run e2e:motion` measures it (no dropped frames at 4× CPU slowdown). Searching, nothing folds.
- **Right-click:** a menu of the phone's hold-menu actions, for a task, an area or a selection (Shift+F10 or the Menu key from the keyboard).
- **Focus:** the keyboard focus ring is a dashed accent outline with the glow. Every control is reachable by keyboard, and **Tab always moves the focus** (V1.1: it used to indent the selected task). A selected task indents and outdents with Alt+→ / Alt+← (next to Alt+↑ / Alt+↓ for moving it); while a title is being edited, Tab and Shift+Tab indent. Delete selects the next task.
- **Dialogs** take the keyboard as they open (their field, else OK, or CANCEL when OK can't be undone) and keep it: Tab cycles inside. Pages' scrolling bodies are focusable, so a long page scrolls from the keyboard.
- **Several selected:** the details pane lists them (up to 8, then "+N more") and says how to act on them all.
- **Undo says what it did** (V1.1 refinement): Ctrl+Z shows UNDONE with REDO, Ctrl+Shift+Z / Ctrl+Y REDONE with UNDO, and an empty history NOTHING TO UNDO; a toast's own UNDO does the same. **Home / End** select the first / last task of the list (a page scrolls with them as usual).
- **Many areas:** a quest's menu lists its areas inline up to five; with more, one item, *Move to area… (CURRENT)*, opens a short choice with the current area selected, so the menu never fills the window. A menu also never opens above the window's top (it scrolls if it's taller than the window).
- **Words for numbers:** a repeating task's `×1.4` explains itself on hover (on time N times in a row) and in the details footer (`streak 4 (×1.4 XP)`); the XP gauge's tooltip tells the day streak; the area panel says `3 open`, not `3`.
- **Empty states say where you are:** a search that finds nothing names it (`NO MATCHES FOR “X”. ESC CLEARS THE SEARCH.`), on COMPLETED too (it said "nothing completed yet"); TODAY with everything done is lit: `ALL CLEAR FOR TODAY · N TASKS DONE`.
- **Editable looks editable:** the details pane's title and an area's name show a faint frame under the pointer.
- **Accessibility is checked:** `npm run e2e` runs axe-core (WCAG 2.2 A/AA and best practice) over every view, the task menu and a dialog. Lists are lists of list items; headings run h1 → h2; the menu's choices are radio items with `aria-checked`.
