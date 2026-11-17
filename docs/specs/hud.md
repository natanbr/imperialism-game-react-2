# HUD redesign spec: a top bar and a right pane with groups

Committed copy (2026-11-16, docs agent) of the research agent's spec `.gate/m12/hud-spec.md` (`.gate` is git-ignored), so future sessions have it.
Numbers replaced: the spec's HUD-1 to HUD-16 are FR-465 to FR-480 (HUD-n is FR-(464 + n)) in docs/requirements.md, section "M12b HUD";
its decision cards D1 to D7 are Q113, Q102 (it replaces that card's default), Q108, Q109, Q110, Q111 and Q112. Nathan's answers to D1 and D2
are applied in the rows and in section 7. The e2e file keeps the name the spec gave it, `e2e/m13-hud.spec.ts`, although the milestone is M12b.
The amendments to older rows (the list under the table in section 4) are made by the task that builds the rows; docs/requirements.md lists them too.

Written 2026-11-16 (research agent, read-only on the repo, Opus 5.5). Source request (Nathan): "introduce a better HUD (top
and right), similar to the original game, show the current cash, turn, etc. Remove some of the less useful debug info from
the right side, keep tile number, land info, progress of any type, anything that can be useful to understand in case of a
bug, but put it under accordions (groups by topic) to only open when needed."

Original game (docs/rules/11-screens.md, sections 1, 3.1, 5.1): every screen has a top strip with "season, year, treasury"
("Spring, 1842 $56,173"); the map screen's right column holds icon buttons for the screens (transport, industry, trade,
diplomacy), a minimap, the army panel and the End Turn bar at the bottom. Web search (2 queries) found no more detail.
So "in the spirit of the original" = date and cash always in a top strip, screen buttons as icons, a compact right column.

---

## 1. What the screen has today

Code: `src/app/components/HUD.tsx` (one 250 px column, `position: absolute; right: 0; height: 100%`, z 10), children in
this order (`.hud-content` scrolls, `ActionButtons` pinned below it):

| # | Part (file, test id / class) | Height at 1280x720 (px) |
|---|---|---|
| 1 | Header: nation name h2 `.hud-title`, New game (+ in-place confirm `#confirm-new-game`), About | 64 |
| 2 | `TurnIndicator` `turn-indicator`: "Turn: 2 of 40" + `.turn-date` "Summer 1815" | 29 |
| 3 | `PlayerStatus` (inside TurnIndicator.tsx): `at-war` one per enemy, `idle-civilians` | 16 each |
| 4 | `NationStats` `.nation-stats`: "Cash: $9,900", `not-saved` warning | 29 (+ warning) |
| 5 | `ScoreIndicator` `hud-score`: "Score: 239", parts on hover/focus `score-parts` | 29 |
| 6 | `TileInfoPanel` `tile-info` (nothing when no tile is selected, FR-315) | 0 to about 400 |
| 7 | `ScoreTable` `score-table` | 79 |
| 8 | `NextCouncil` `next-council` + `council-projection` | 16 + 32 |
| 9 | `FoodWarning` `food-warning`, `UpkeepWarning` `upkeep-warning` | about 40 each when shown |
| 10 | `NewsPanel` `news-panel`: `order-refusal`, heading (2 lines), `news-list` (3 lines minimum) | 44 + 60 |
| 11 | Debug `.hud-debug-section` (only with `?debug`): "Tile: x,y (id …)", "Seed: N" | about 60 |
| 12 | `ActionButtons` `.action-buttons-container`: Final scores (game over), Open Warehouse, Open Capital, Open Market, Deal Book, Diplomacy, Transportation of Commodities, Center + Advance Turn | about 279 |

Evidence: screenshot `.gate/m12/qa/A/c2-02-turn2-news.png` (turn 2, no tile): buttons from y 438 to 708, news list 3 lines
(y 344 to 404), the news cut off mid-line by the fade. `.gate/m12/L2-notes.md` T-04: the scroll area is y 12 to 429
(417 px), about 335 px of it above the list, so 417 - 335 - 24 (fade) = 58 px = 3 lines. FR-372's 8 lines need about
100 px more, which the pane cannot give while the buttons take 279 px. `e2e/m12-map.spec.ts` FR-372 is `test.fixme`.

Duplicated or low value:
- The score shows twice (Score line, and the "(you)" row of the score table); the nation name twice (header, table row).
- Seven full-width buttons (279 px, 39% of the window height) for actions that are icons in the original.
- The news heading wraps to 2 lines at 226 px wide; the news, the thing that changes every turn, gets the least room.
- The Council line sits far below the turn line (FR-371 moved it), so "turn" and "next Council" are read apart.
- The Debug box is hidden without `?debug` (FR-377, card Q102), so a player reporting a bug has no tile id or seed.
- No place lists work in progress (development, rail, depots, training) with turns left: today only Tile Info of one
  tile and the score's "work in progress" points tell.

---

## 2. The design

### 2a. Top bar

Full window width, at the top, 40 px high (one row) from 1024 px of width, 80 px (two rows) below that. The right pane
starts under it. The map area is the window less the top bar and the 250 px pane. The width stays 250 px: 1030 px is what
FR-088's 1029 px map needs at 1280 px. The 40 px height leaves 680 px, and the map is 672: camera 0, 0, no scroll
(48 px is the maximum the height may ever take).

Left to right, in one row at 1024 px and wider (13 px text on 16 px lines, so each block has two lines in 40 px):

| Block | Line 1 | Line 2 | Test id (kept or new) |
|---|---|---|---|
| Nation | swatch + "Testland" (h2 `.hud-title`) | none | `.hud-title` kept |
| Turn | "Turn: 1 of 40" ... "Spring 1815" (date right-aligned) | "Next Council: turn 10 (Summer 1817)" | `turn-indicator`, `.turn-date`, `next-council` kept |
| Cash | "Cash: $9,900" | "-$100 last turn" (the last report's `treasuries[id].end - start`; none on turn 1) | `.nation-stats` kept; new `cash-change` |
| Score | "Score: 239" (hover/focus parts, FR-404 unchanged) | "2nd of 2" (index in `selectScoreTable`) | `hud-score`, `score-parts` kept; new `score-rank` |
| (space) | | | |
| Dialogs | 6 icon buttons: Open Warehouse, Open Capital, Open Market (Board of Trade), Deal Book, Diplomacy, Transportation of Commodities | | `.action-buttons-container > .btn-plain` kept |
| Camera | Center | | name "Center" kept |
| Game | New game (opens the FR-109 question as a panel under the button), About (How to play stays inside About) | | names "New game", "About" kept; `#confirm-new-game` kept |
| End | Final scores (game over only), Advance Turn (primary, rightmost, FR-423 lock unchanged) | | names kept |

- Every button keeps its exact accessible name. The name is a text `<span class="topbar-label">`, hidden from sight below
  1800 px of width with the clip-path pattern FR-424 already uses (`.hud-header-label`), visible beside the icon from
  1800 px (this spec said 1600 px; the build measured 1746 px needed with the labels, task T2, 2026-11-17). So the visible label always equals the name (WCAG 2.5.3, "label in name") and FR-354's "no space between icon
  and label" still holds. `title` = the name, for the mouse tooltip.
- The icon keeps FR-349's 20 px box (the `.action-buttons-container > .btn-plain > :is(svg, img)` rule stays);
  each icon button is 32 x 32 px.
- The bar carries `data-edge-scroll` (FR-366): a pointer over it never scrolls the map.
- Below 1024 px: row 1 = the four status blocks, row 2 = the buttons. Row 2 scrolls sideways if needed (`overflow-x:
  auto`, no wrap), and Advance Turn stays pinned at its right, outside the scrolling strip. Nation name and the "Turn:",
  "Cash:", "Score:" prefixes may be hidden from sight (not from the DOM) below 700 px. The text the e2e suite reads
  ("Turn: 1 of 40", "Score: 239") stays in the DOM at every size.
- Season and year: the game has them (`dateText`, FR-048); shown as today.
- Save: there is no Save button today and none is added (autosave on every order, FR-357/358; the `not-saved` warning tells
  when it fails). Army and Council buttons: no standing screen exists behind them (Army opens per province from the map;
  the Council screen only replays a meeting from the news). See card Q108.

### 2b. Right pane (250 px, from y 40 to the bottom)

`.hud-content` stays the one scroll area with its fade (FR-235); there are no action buttons below it any more. Order:

1. **Tile Info**, first. A selected tile renders `TileInfoPanel` unchanged (`tile-info` and every child id kept: heading
   with "Close tile info", `tile-terrain`, resource, `tile-collected`, `tile-owner`, `tile-province`, the civilians with job
   offers and Cancel, `tile-fort`). With no selection: one line "No tile selected: click a tile on the map."
   (`tile-info-none`, a new id, so every `tile-info` toHaveCount(0) check stays true; `TileInfoPanel` itself still renders
   nothing, so the FR-315 unit test holds).
2. **Alerts** (`hud-alerts`, present only when there is one, never inside a group): `not-saved`, `food-warning`,
   `upkeep-warning`, each `at-war` line, `idle-civilians`. Texts and roles unchanged.
3. **News** (`news-panel`, unchanged inside): takes the free height in whole 20 px lines (FR-268's CSS), at least 3.
   At 1280x720 with no tile selected and the groups closed it gets about 400 px, which is 20 lines (budget: pane 680 - padding
   24 - placeholder 52 - idle line 24 - heading 48 - 3 group rows 108 - fade 24 = 400). This closes FR-372: 8 lines are
   required, 20 are expected.
4. **Groups** (`hud-groups`), at the pane's bottom, all closed by default:

| Group (button name) | Content (ids) |
|---|---|
| Nation | `council-projection` (the `next-council` line in the top bar keeps it as its `aria-describedby`); score parts as a visible list (`nation-score-parts`: Treasury, Industry, Development, Work in progress); `score-table` (FR-106 unchanged); new `upkeep-forecast` "Army upkeep at End Turn: $100; the treasury will then hold $9,800" (from `selectUpkeepForecast`; "No army upkeep." when `due` is 0); new `spent-this-turn` "Spent this turn: $500" (treasury minus `turnStartTreasuries[id]`, only when not 0); new `treasury-last-turn` "Last turn: $10,000 to $9,900" (the last report's `treasuries`) |
| Work in progress (N) | One row per job of the player: development ("Farmer: farm to level 2 at 3-9, 2 turns left"), construction (rail, depot, port, fort; rail names `railFrom`), prospecting ("finds out at End Turn"), training (`industry.training`, "done at End Turn"). Each row is a button that selects the tile and centres it, like the news place lines (FR-376). Turns left = `startedOnTurn + durationTurns - turn` (the `developmentSystem` rule, line 125). Empty: "Nothing in progress." Rows from a pure `workInProgressRows(game, nationId)` in a new `components/HUD/hudView.ts` |
| Details for bug reports | The class `.hud-debug-section` is kept on the panel. Lines: "Tile: 5,8 (id 5-8)" (selected tile, else "Tile: none"), "Seed: N", "Turn: 2 (Summer 1815)", "Nation: nation-1", "Selected civilian: <id> (<type>)", "Orders this turn: N", "Last refusal: <reason code>", "Zoom: 100%", "Camera: x, y", "Map: 24 x 16", "Save version: 1" (`SAVE_VERSION`). A "Copy details" button copies them as plain text (`navigator.clipboard.writeText`; says "Copied" for 2 s; no line if the browser refuses). Visibility: always, with or without `?debug` (Nathan, card Q102) |

What moves where (nothing is removed):

| Today | Goes to |
|---|---|
| Header: name, New game + confirm, About | top bar |
| Turn line, date, game-over variant | top bar, turn block |
| Next Council line | top bar, turn block line 2 |
| Council projection | Nation group |
| At-war lines, idle civilians | right-pane alerts (see Q111) |
| Cash, Not-saved line | cash in the top bar; Not-saved in the alerts |
| Score + hover parts | top bar (unchanged behaviour); parts also listed in Nation |
| Score table | Nation group |
| Tile Info | right pane, first |
| Food and upkeep warnings | alerts |
| News (refusal, heading, list, battle/council/place buttons, "Nothing to report.") | right pane, unchanged |
| Debug (tile, seed) | Details for bug reports group (with more lines) |
| Final scores, the six dialog buttons, Center, Advance Turn | top bar |

### 2c. Group behaviour and accessibility

- WAI-ARIA accordion pattern, not `<details>`: `<h3 class="hud-group-heading"><button aria-expanded aria-controls>Nation
  </button></h3>`, panel `<div role="region" aria-labelledby id hidden>`. Why not `<details>`: jsdom's summary toggling is
  uneven and the store-free state below is easier to test with a button. A closed panel is `hidden`, so its controls are
  out of the accessibility tree and Tab order. This matters: e2e uses page-wide `getByRole('button', { name: /About/ })`,
  `/Center/` and so on, so no new name may contain About, Center, Advance Turn, Open, Deal Book or Diplomacy.
- Enter and Space toggle (a native button); the focus stays on the button; the heading's button shows a chevron
  (`aria-hidden`) that turns.
- Open/closed is kept in `HUD`'s component state (`useState<Record<GroupId, boolean>>`). The HUD never unmounts in a
  session, so the state survives End Turn and New game, is never saved, and a reload closes all groups. There is no store
  key, so the computerNations KEPT list and the FR-022 scans are untouched.

---

## 3. Layout per size

| Size | Top bar | Map area | Right pane | Notes |
|---|---|---|---|---|
| 1920x1080 | 40 px, one row, button labels visible (from 1800 px; the spec said 1600) | 1670 x 1040; map centred at page (320, 224) (FR-367: offset 320, 184 + bar 40) | 250 x 1040; news about 38 lines with no tile | |
| 1280x720 | 40 px, one row, icon buttons (labels hidden from sight) | 1030 x 680; camera 0, 0, no scroll (FR-088), map from y 40 to 712 | 250 x 680; news at least 8 (about 20) lines with no tile | nothing in the bar wraps or overflows |
| 1024x768 | 40 px, one row; nation name hidden from sight if needed to fit | 774 x 728 | 250 x 728 | tightest one-row case (see Risks) |
| 800x600 | 80 px, two rows | 550 x 520 | 250 x 520 | row 2 scrolls sideways only if needed |
| 640x360 (1280x720 at 200% zoom, FR-424) | 80 px | 390 x 280 | 250 x 280 | turn, date, cash, score always in sight (top bar) |
| 390x844 | 80 px; prefixes and name hidden from sight; row 2 scrolls sideways, Advance Turn pinned | 140 x 764 | 250 x 764 | FR-429's line is drawn under the top bar (`top: var(--topbar-height)`), not over it; no page sideways scroll |

Implementation of the size rule: a token `--topbar-height` (40 px, 80 px under `@media (max-width: 1023.98px)`) and in
`styles/theme.ts` `TOPBAR_PX = 40`, `TOPBAR_NARROW_PX = 80`, `TOPBAR_BREAKPOINT = 1024`, `topBarPx(innerWidth)`.
`camera.ts mapAreaOf` returns `{ width: innerWidth - HUD_PX, height: innerHeight - topBarPx(innerWidth) }`. The map
scroller (`MapView.module.css .container`) gets `margin-top: var(--topbar-height); height: calc(100vh -
var(--topbar-height))`. `.hud-container` gets `top: var(--topbar-height); height: calc(100% - var(--topbar-height))`.
`useEdgeScroll` needs no change: it reads the container's own rect.

---

## 4. Requirement rows (paste into docs/requirements.md; the orchestrator assigns FR ids)

| Id | Requirement | Status |
|---|---|---|
| FR-465 | Top bar frame: WHEN the map screen shows THEN a top bar SHALL span the window's full width at its top, 40 px high from 1024 px of window width and 80 px (two rows) below; the right pane (250 px, FR-088) SHALL start under it; the map area SHALL be the window less the bar and the pane, and the map SHALL be drawn from the bar's bottom. At 1280x720 the 24x16 map SHALL still fit with the camera at 0, 0 (FR-088). Verify: unit tests/ui/camera.test.tsx (`mapAreaOf` 1280x720 = 1030 x 680, 800x450 = 550 x 370; `mapOffset` 1920x1080 = 320, 184), tests/ui/palette.test.ts (`--topbar-height` = `TOPBAR_PX`, the narrow value = `TOPBAR_NARROW_PX` under `max-width: 1023.98px`); e2e e2e/m12-map.spec.ts FR-367 (1920x1080: map box at 320.5, 224 within 1 px; 1280x720: scroll 0, 0), e2e/look.spec.ts FR-090 (every corner tile y >= 40 and y + 42 <= 720). | tested (status and evidence: docs/requirements.md) |
| FR-466 | Top bar content: the bar SHALL show, left to right: the nation's swatch and name; the turn block ("Turn: 2 of 40" and the date right-aligned on line 1, the next Council line FR-301 on line 2; at game over FR-075's text); the cash ("Cash: $9,900") with, from turn 2, last turn's change ("-$100 last turn", from the last report's treasuries, `money()` format); the score ("Score: 239", FR-404's parts on hover and focus) with the rank "2nd of 2"; then the buttons Open Warehouse, Open Capital, Open Market, Deal Book, Diplomacy, Transportation of Commodities, Center, New game, About, Final scores (game over only) and Advance Turn last, the one primary button (FR-086, FR-423 lock unchanged). Advance Turn SHALL be the only End Turn control on the screen: the right pane, the dialogs and the news hold no second one (Nathan's decision, card Q113). Verify: unit tests/ui/topBar.test.tsx (new): the order of the parts, the texts on turn 1 and 2, the change line absent on turn 1, "+$" for a gain, the rank after a score change, game over, and exactly one button named "Advance Turn" in the rendered page. | tested (status and evidence: docs/requirements.md) |
| FR-467 | Top bar fit: at 1024x768, 1280x720 and 1920x1080 the bar SHALL be one 40 px row whose every element lies inside the window and whose `scrollWidth` <= `clientWidth`; at 800x600, 640x360 and 390x844 it SHALL be two rows of 40 px where every button can be reached (row 2 scrolls sideways, Advance Turn stays in sight at its right) and the page has no sideways scroll; at every size the turn, date, cash and score lie inside the window (will replace FR-424's HUD part). Advance Turn, the one End Turn control (card Q113), SHALL lie inside the window with no scrolling of the page, the pane or the bar at 1280x720, 800x600 and 390x844, on turn 1 and on a turn whose news list is longer than its box. Verify: e2e e2e/m13-hud.spec.ts (new) at those six sizes, and at 1280x720, 800x600 and 390x844 on turn 1 and after enough End Turns for the news list to overflow its box: the button's box lies inside the viewport and `getByRole('button', { name: 'Advance Turn' })` has a count of 1. | tested (status and evidence: docs/requirements.md) |
| FR-468 | Icon buttons: each dialog button SHALL show its icon in FR-349's 20 px box, be 32 x 32 px below 1800 px of window width with its name as a text label hidden from sight only (clip-path pattern, so the name, the `title` and FR-354's no-space rule hold), and show the label beside the icon from 1800 px (1600 px in this spec at first; see section 2a). Verify: unit tests/ui/listArt.test.tsx (names exactly as before, icon then label, no space), tests/ui/topBar.test.tsx (the hide and show rules in globals.css); e2e e2e/m11-lists.spec.ts at 1280x720 (six icons 20 x 20, six buttons 32 x 32) and e2e/m13-hud.spec.ts at 1920x1080 (labels visible, inside the bar). | tested (status and evidence: docs/requirements.md) |
| FR-469 | Names and test ids kept: the buttons SHALL keep their accessible names (Open Warehouse, Open Capital, Open Market, Deal Book, Diplomacy, Transportation of Commodities, Center, New game, About, Final scores, Advance Turn, Close tile info) and the HUD its test ids and classes (`turn-indicator`, `.turn-date`, `.turn-indicator`, `next-council`, `council-projection`, `.nation-stats`, `hud-score`, `score-parts`, `score-table`, `score-row-*`, `at-war`, `idle-civilians`, `not-saved`, `food-warning`, `upkeep-warning`, `tile-info` and its children, `news-panel`, `news-list`, `order-refusal`, `.hud-container`, `.hud-content`, `.hud-debug-section`, `.action-buttons-container`, `#confirm-new-game`); no new control's name SHALL contain About, Center, Open, Advance Turn, Deal Book or Diplomacy. Verify: unit tests/ui/topBar.test.tsx (a list check of every name and id with all groups open); the existing e2e suite finds them unchanged. | tested (status and evidence: docs/requirements.md) |
| FR-470 | Right pane order: the pane SHALL show, in order, Tile Info (the selected tile, FR-371; with none, the line "No tile selected: click a tile on the map." `tile-info-none`), the alerts, the news, then the groups. Verify: unit tests/ui/warehouseAndHud.test.tsx (will replace the FR-371 order test: `.hud-content`'s children are tile-info or tile-info-none, hud-alerts when present, news-panel, hud-groups). | tested (status and evidence: docs/requirements.md) |
| FR-471 | Alerts in sight: the Not-saved line (FR-363), the food warning (FR-049), the upkeep warning (FR-261), one line per war (FR-412) and the idle civilians line (FR-432) SHALL be shown under Tile Info, above the news, never inside a group, with their texts and roles unchanged; with none of them the block is absent. Verify: unit tests/ui/hudStatus.test.tsx (FR-412, FR-432 cases render the HUD, not TurnIndicator). | tested (status and evidence: docs/requirements.md) |
| FR-472 | News height (closes FR-372, keeps FR-268): the news list SHALL take the pane's free height in whole 20 px lines, at least 3; at 1280x720 on turn 2 with no tile selected and the groups closed it SHALL show at least 8 whole lines. Verify: e2e e2e/m12-map.spec.ts FR-372 (the `test.fixme` made a test; it logs the measured count, expected about 20), e2e/m8-qa.spec.ts FR-268. | tested (status and evidence: docs/requirements.md) |
| FR-473 | Groups: the pane SHALL hold the groups "Nation", "Work in progress" and "Details for bug reports", each a level-3 heading holding a button with `aria-expanded` and `aria-controls`, its panel a region named by the button and `hidden` while closed; all closed on page load; Enter, Space and a click toggle one; the open state SHALL last for the page session (End Turn and New game keep it) and SHALL NOT be saved (a reload closes them). Verify: unit tests/ui/hudGroups.test.tsx (new): roles and names, toggle by click and keyboard, hidden content out of the accessible tree, kept across `advanceTurn` and `startNewGame`, closed after a remount. | tested (status and evidence: docs/requirements.md) |
| FR-474 | Nation group: it SHALL hold the Council projection (FR-314; still the next-council line's description), the score parts (treasury, industry, development, work in progress), the score table (FR-106), "Army upkeep at End Turn: $X; the treasury will then hold $Y" (or "No army upkeep."), "Spent this turn: $X" when not 0, and "Last turn: $A to $B" from turn 2. Verify: unit tests/ui/hudGroups.test.tsx. | tested (status and evidence: docs/requirements.md) |
| FR-475 | Work in progress: the group SHALL list one row per unfinished job of the player (development, rail, depot, port, fort, prospecting, worker training) with its kind, tile, province where there is one, and turns left; its heading counts them ("Work in progress (3)"); a row SHALL select its tile and scroll it into view (as FR-376); with no job it says "Nothing in progress.". A row that says "1 turn left" SHALL be finished after one `resolveTurn`. Verify: unit tests/ui/workInProgress.test.ts (new, the pure `workInProgressRows` against `resolveTurn` for each kind) and tests/ui/hudGroups.test.tsx (rows and the click). | tested (status and evidence: docs/requirements.md) |
| FR-476 | Details for bug reports: the group SHALL show the selected tile's coordinates and id ("Tile: 5,8 (id 5-8)", or "Tile: none"), the seed, the turn and date, the player's nation id, the selected civilian's id and type, the number of orders this turn, the last refusal's reason code, the zoom, the camera, the map size and the save version, and a "Copy details" button that copies those lines as text. Visibility: always, with or without `?debug` in the URL (Nathan's decision, card Q102 ruled: keep it); this will replace FR-377's `?debug` rule. Verify: unit tests/ui/warehouseAndHud.test.tsx (will replace the FR-377 text test), e2e/m12-map.spec.ts FR-377 (adapted: the group's button exists on a page without `?debug`), e2e/m5-hud-scroll.spec.ts (opens the group before measuring). | tested (status and evidence: docs/requirements.md) |
| FR-477 | Nothing lost: every line and number of the M12 HUD SHALL stay reachable: nation name, New game and its question, About, turn and date (game over too), next Council, Council projection, war lines, idle civilians, cash, Not-saved, score and its parts, score table, every Tile Info line and control, food and upkeep warnings, the refusal line, the news heading and lines with their buttons, tile coordinates and seed, Final scores, the six dialog buttons, Center and Advance Turn. Verify: unit tests/ui/topBar.test.tsx one test that renders the page's HUD (top bar and pane, all groups open, a war, idle civilians, short food and cash, a failed save, a selected tile, a refusal and a turn of news) and finds each by its id or name. | tested (status and evidence: docs/requirements.md) |
| FR-478 | 1280x720 at a glance: at 1280x720 the top bar SHALL lie whole in y 0 to 40 without any scroll; with the capital and its 7 civilians selected, Tile Info's heading, terrain line and first civilian row SHALL lie inside the pane's visible box above its fade with the pane at scrollTop 0 (FR-371 kept), also at 1024x768. Verify: e2e e2e/m12-map.spec.ts FR-371 (unchanged), e2e/m13-hud.spec.ts. | tested (status and evidence: docs/requirements.md) |
| FR-479 | Edges: the top bar SHALL carry `data-edge-scroll`, so a pointer over it never scrolls the map (FR-366); FR-429's narrow-window line SHALL be drawn under the top bar, not over it. Verify: unit tests/ui/camera.test.tsx (useEdgeScroll with the pointer on the bar), e2e e2e/m12-map.spec.ts FR-429 at 390x844 (the line's top >= 80; Diplomacy still clickable). | tested (status and evidence: docs/requirements.md) |
| FR-480 | New game in the bar: New game SHALL open FR-109's question as a panel under the button (`#confirm-new-game`, `aria-expanded`/`aria-controls` kept, the focus on the panel FR-111), above the map and the pane, below the dialogs. Verify: unit tests/ui/topBar.test.tsx; e2e/market-and-game-over.spec.ts unchanged. | tested (status and evidence: docs/requirements.md) |
Existing rows that each need a one-line amendment in the same change (status column: "replaced in part by HUD-n"):
FR-106 (layout line: "Debug section below the news", "action buttons fixed below"), FR-235 (1) ("the action buttons
stay pinned at the bottom"), FR-268 and FR-372 (by FR-472), FR-301/FR-307/FR-314/FR-317 (place of the Council lines),
FR-315 (no-tile placeholder line), FR-349 (one label x becomes icon box + 32 px buttons), FR-371 (Tile Info first in
the pane, not "under the turn, cash and score lines"), FR-377 (Q102), FR-412/FR-432 ("under the turn line" becomes the
alerts), FR-424 (by FR-467), FR-429 (the line under the bar).

---

## 5. Pins and tests this change moves (each re-recorded with its reason, none loosened)

| File, test | Today | Why it moves | New value |
|---|---|---|---|
| tests/ui/camera.test.tsx `mapAreaOf` | 1280x720 = {1030, 720}; 800x450 = SMALL {550, 450}; 200x100 = {0, 100} | the bar takes height | {1030, 680}; {550, 370} (80 px bar under 1024); {0, 20} |
| tests/ui/camera.test.tsx `mapOffset` 1920x1080 | {320, 204} | area 1670 x 1040 | {320, 184}; 1280x720 stays {0, 0} (FR-088: spare 8 px <= 64) |
| tests/ui/palette.test.ts | `--hud-width` = HUD_PX | add | + `--topbar-height` = TOPBAR_PX (and the narrow value) |
| e2e/m12-map.spec.ts FR-367 | map y 204 at 1920x1080 | the map is drawn under the bar | 224 (40 + 184); x 320.5 unchanged; FR-088 half unchanged |
| e2e/m11-map.spec.ts FR-340 (1920x1080) | ground [320, 204, 1029, 672] | same | [320, 224, 1029, 672]; the sea patches (y >= 120) still lie in the sea |
| e2e/look.spec.ts FR-090 | corner tiles y >= 0, y + h <= 720, x + w <= 1030, scroll 0, 0 | the map starts at the bar's bottom | y >= 40 (tighter), the rest unchanged (40 + 672 = 712) |
| e2e/look.spec.ts FR-341/FR-346 and FR-356 (coverage, `elementFromPoint` on each capital) | coverage 17 to 22%; depot covered 0 | the map moves down 40 px as a whole, so shares do not change | same values; add: every capital's drawing top >= 40 (the bar covers no map). Re-run, do not edit thresholds |
| e2e/islands.spec.ts FR-083 (800x450) | camera {0, 174}; capital centre at y 225 | area 550 x 370 under an 80 px bar | camera {0, 214} (399 - 185); capital centre at y 265 (80 + 185), within 25 px |
| e2e/m12-map.spec.ts FR-366 (1024x768) | pointer on Advance Turn at the HUD's right end | Advance Turn is in the bar | same check (no scroll), comment updated; add the pointer on the bar's left end (x 2, y 20) |
| e2e/m12-map.spec.ts FR-369 | HUD left = 774 | unchanged | unchanged (the pane keeps 250 px) |
| e2e/m12-map.spec.ts FR-372 | `test.fixme` | the pane has the room | a test: >= 8 whole lines; log the count |
| e2e/m12-map.spec.ts FR-377 | no `.hud-debug-section` without `?debug` | Nathan's decision (card Q102) | visible: the group's button exists, its panel hidden until opened; open it, then "Tile: 5,8 (id 5-8)" |
| e2e/m12-map.spec.ts FR-424 (640x360) | parts inside `.hud-content`; Warehouse and Capital buttons side by side | the parts are in the bar; no action grid | the four parts inside the window and inside the bar's box; New game visible; the two-column check is removed with the grid (the grid no longer exists; its row FR-424 is amended) |
| e2e/m12-map.spec.ts FR-373 | status centre at x 515 | unchanged | unchanged |
| e2e/m11-lists.spec.ts FR-334 | the three picture buttons as high as Open Market | icon buttons | all six 32 px high; pictures loaded (unchanged) |
| e2e/m11-lists.spec.ts FR-349 | six labels at one x; icons 20 x 20; buttons 33.5 px high | labels hidden from sight at 1280 | icons 20 x 20 (kept); buttons 32 x 32; the one-x label check moves to 1920x1080 (labels visible: each label starts at its icon's right + 0.28em) |
| e2e/m5-hud-scroll.spec.ts FR-235 (1), (2) | the pane overflows with Arvelia selected; the Debug box below the fold; buttons pinned | news fills the pane, Debug is in a group, buttons in the bar | open the Nation and Details groups first (so the pane overflows: assert maxScroll > 0 still); the "buttons pinned" check reads the bar's buttons (still true) |
| e2e/m8-qa.spec.ts FR-268 | "more news than the list shows" reached by turn 4 | the list is about 20 lines, so turns 2 to 4 may not fill it | select the capital 2-9 first (Tile Info shrinks the list), then the same checks (>= 3 whole lines, end reachable) |
| e2e/councilNews.ts (m10-council turn 11, m10-qa game over) | `aboveButtons`: item bottom <= `.action-buttons-container` top | no buttons in the pane | `aboveGroups`: item bottom <= `hud-groups` top; add `belowBar`: item top >= the bar's bottom |
| e2e/m10-council.spec.ts `turnLineLayout` | turn and date on one line, Council line under it inside the indicator's column | kept by design (turn block, line 2) | unchanged; if it fails, the turn block is wrong, not the test |
| e2e/m10-council.spec.ts `projectionShown` | projection visible, inside the turn column | in the Nation group | open Nation first; projection inside the group's panel box; colours check unchanged |
| tests/ui/warehouseAndHud.test.tsx FR-371 order | tile-info right after hud-score | new order | FR-470's order test |
| tests/ui/warehouseAndHud.test.tsx FR-377 | text "Debug Tile: … Seed: …" | more lines, a group | FR-476's lines; Nathan's decision on Q102 (visibility) |
| tests/ui/warehouseAndHud.test.tsx FR-424 (CSS block, header names) | `.action-buttons-container` grid, `.hud-header` nowrap, `.hud-header-label` clip | the header and grid are gone | the bar's rules: `.topbar-label` clip-path below 1800 px, visible from 1800 px (the spec said 1600 px); New game and About names from `.topbar-label` |
| tests/ui/hudStatus.test.tsx FR-412, FR-432 | render `<TurnIndicator />` | the lines moved to the alerts | render the alerts component (texts unchanged) |
| tests/ui/hudStatus.test.tsx FR-423 | `<ActionButtons />` | keep the export name `ActionButtons` for the bar's button group | unchanged |
| tests/ui/inkPicture.test.tsx (20 px box rule) | `.action-buttons-container > .btn-plain > …` | keep those class names in the bar | unchanged |
| tests/ui/listArt.test.tsx FR-334, FR-349 | names, icon then label | labels become `.topbar-label` spans | unchanged assertions |
| tests/ui/warehouseAndHud.test.tsx FR-315 | TileInfoPanel with no tile renders '' | the placeholder lives outside TileInfoPanel | unchanged |

---

## 6. Task split

Order: T1 first (small, shared code); T2 and T3 then in parallel; T4 last. Every task is test first (red quoted, then
green), uses Vitest on single files, and leaves the e2e runs to T4.

| Task | Scope | Files it owns | Must not touch | FR/HUD | Model |
|---|---|---|---|---|---|
| T1 Frame and camera | token and theme constants, `topBarPx`, `mapAreaOf`, map scroller offset, `.hud-container` top/height, FR-429 line under the bar, an empty `<TopBar />` shell (40/80 px, `data-edge-scroll`) mounted in page.tsx | styles/tokens.css, styles/theme.ts, components/camera.ts, MapView.tsx, MapView.module.css, globals.css (`.hud-container` block only), page.tsx (one line), new components/HUD/TopBar.tsx (shell), tests/ui/camera.test.tsx, tests/ui/palette.test.ts | HUD.tsx, HUD/* except the shell | FR-465, FR-479 | Opus 5.5 high (shared camera and map code: escalated per the global rule; bounded) |
| T2 Top bar | fill TopBar: nation, turn block (TurnIndicator + NextCouncil), cash + change, score + rank, ActionButtons as icon buttons with `.topbar-label`, Center, New game + ConfirmNewGame, About + AboutPanel, Final scores, Advance Turn; responsive rules | components/HUD/TopBar.tsx, HUD/ActionButtons.tsx, HUD/TurnIndicator.tsx (TurnIndicator, NextCouncil only; export `PlayerStatus` for T3), HUD/NationStats.tsx (cash only), HUD/ScoreIndicator.tsx, globals.css (new `.topbar*` section, `.action-buttons-container*`, removes the `max-height` HUD media block), tests/ui/topBar.test.tsx (new), listArt, inkPicture, warehouseAndHud FR-424 | HUD.tsx, TileInfoPanel.tsx, NewsPanel.tsx, `.hud-content`/news CSS, camera files | FR-466, 3, 4, 5, 13, 16 | Opus 5.5 xhigh |
| T3 Right pane | HUD.tsx rebuilt: placeholder, alerts (PlayerStatus, Not-saved moved out of NationStats, warnings), news, groups (HudGroup component, Nation, Work in progress with `hudView.ts`, Details for bug reports with Copy) | HUD.tsx, new HUD/Alerts.tsx, HUD/HudGroups.tsx, HUD/hudView.ts, HUD/ScoreTable.tsx (only if needed), globals.css (`.hud-content`, `.news-*`, new `.hud-group*`, `.hud-alerts`, `.hud-debug*`, `.score-table`, `.next-council`/`.council-projection` margins), tests/ui/hudGroups.test.tsx, tests/ui/workInProgress.test.ts (new), warehouseAndHud (FR-371, FR-377), hudStatus (FR-412, FR-432) | TopBar.tsx, ActionButtons.tsx, camera files, the `.topbar*` CSS | FR-470 to FR-476 | Opus 5.5 xhigh |
| T4 Integration | the e2e pins of section 5 re-recorded with a reason line each, new e2e/m13-hud.spec.ts, full `npm test`, `tsc`, lint, build, Playwright suite, screenshots at the six sizes in `.gate/m13/`, the requirement rows and amendments into docs/requirements.md | e2e/*, docs/requirements.md | src/ (fixes go back to T2/T3's owner) | all | Sonnet 5.5 xhigh for the e2e work; the review gate after it Opus 5.5 high (shared layout, every e2e pin touched) |

T2 and T3 both edit globals.css: each only in the selectors listed. Whoever merges second rebases the file by hand.
NationStats.tsx: T2 keeps the cash; T3 takes `not-saved` into Alerts. That one file is edited by both, T3 after T2.

---

## 7. Decision cards

Numbering (2026-11-16): the spec's cards D1 to D7 are Q113, Q102, Q108, Q109, Q110, Q111 and Q112 in docs/requirements.md and on the
progress page (D1 is Q113, D2 is Q102, which it replaces, D3 to D7 are Q108 to Q112).

Decided by Nathan (2026-11-16, in chat):

Q113. **Where does Advance Turn sit?**
- Suggestion: the top bar's right end, next to the pane. The pane then holds no buttons and the news gets the height.
- Objection: in the original, End Turn is a bar at the bottom of the right column, and today's players find it there.
- Other option: a full-width Advance Turn at the pane's bottom (about 40 px). The news still gets about 18 lines.
- Nathan's answer: "one STATIC end turn is enough, just do not force me to scroll to find it at the bottom". Exactly one Advance Turn button, always on screen: the top bar's right end. FR-466 and FR-467 carry it.

Q102 (the spec's D2; replaces its default "only with ?debug"). **Do the bug-report details show without `?debug`?**
- Suggestion: yes, as the closed "Details for bug reports" group. Tonight's request says to keep tile number and the like
  under groups, which replaces card Q102 / FR-377 ("only with ?debug").
- Objection: a player sees a group about bugs, and the seed tells the random draws. This is a single-player game, so the
  seed gives nothing to exploit.
- Other option: keep FR-377. The group exists only with `?debug`, and the tile id is added to Tile Info's heading for
  everyone.
- Nathan's answer: "keep the debug". The group "Details for bug reports" stays and shows without `?debug`, closed. FR-476 carries it.

Defaults taken (each on the progress page with its objection):

Q108. **Army and Council buttons in the top bar?**
- Suggestion: not now. No standing screen exists behind them: the Army screen needs a province (opened from the map), and
  the Council screen replays a past meeting. Council information sits in the turn block and the Nation group.
- Objection: the original has an army panel on the map screen.
- Other option: "Army" opens the Army screen for the capital's province, and "Council" opens the last meeting (disabled
  before turn 10). That is small, but it is new behaviour that needs its own rows.

Q109. **New game and About as two buttons, or a "Game" menu? A Save button?**
- Suggestion: two plain buttons and no Save button. Autosave runs on every order, and the Not-saved alert covers the
  failure case. A menu hides the names from the e2e suite and adds a click.
- Objection: New game sits near Advance Turn and could be clicked by mistake. The FR-109 question already guards it.

Q110. **A "Warehouse summary" group?**
- Suggestion: no. Open Warehouse is one click away, and a second copy of the stock list is more to keep in step.
- Objection: seeing coal and grain while placing civilians saves a dialog round trip. It could come later as one line
  (food, coal, iron).

Q111. **War lines: always in sight, or inside the Nation group?**
- Suggestion: always in sight, in the alerts under Tile Info (16 px per war). A war is rare and must not be missed.
- Objection: the brief put them in the Nation group to keep the pane calm.

Q112. **With no tile selected, a placeholder line or nothing?**
- Suggestion: one line "No tile selected: click a tile on the map." It tells where Tile Info appears, and the pane has the
  room now. FR-315 removed this line only to save space.
- Objection: one more line of text that says nothing new to a returning player.

---

## 8. Risks

- Fit at 1024 px: the one-row bar holds 4 two-line blocks, 9 icon buttons, Final scores at game over and Advance Turn,
  estimated 1000 to 1140 px. FR-467's e2e at 1024x768 decides. The fallback order is fixed: hide the nation name from sight
  first, then the "Cash:"/"Score:" prefixes; never drop a button.
- The CSS breakpoint and `topBarPx` in TypeScript must agree, or the camera centres wrongly. palette.test pins both
  values and the breakpoint.
- jsdom has no layout: every size claim (FR-465, 3, 4, 8, 14) is e2e only. The lane cannot run Playwright while another
  agent shares `.next`, so T4 must run in a quiet tree.
- Page-wide button names: a new control whose name contains About, Center, Open and so on breaks strict-mode e2e
  selectors. FR-469 forbids such names, and closed groups are `hidden`.
- The Council projection hidden in a closed group weakens FR-317 ("so it is not missed"). The next-council line stays in
  sight in the turn block, and the projection is its accessible description even when hidden. By eye at T4.
- Many FR rows change wording (section 4 list). Each amendment must name HUD-n so the history stays readable.
- The game-over screen and the Saved game dialog sit over the bar (z 80 and up): check that the bar's z (10) stays under
  every dialog and the FR-429 line (20).

---
## DECISIONS BY NATHAN (2026-11-16, genuine user answers; these override the defaults above)
- Q102 (the spec's D2): KEEP the debug / bug-report group, visible without ?debug (closed accordion "Details for bug reports"). Overrides the default of card Q102 and FR-377.
- Q113 (the spec's D1): exactly ONE End Turn / Advance Turn button, STATIC (always on screen, never scrolled away, never at the bottom of a scrolling pane). The top bar's right end satisfies this; remove any duplicate Advance Turn elsewhere. Test: at 1280x720 and 800x600 and 390x844 the button is inside the viewport without scrolling, on turn 1 and with a long news list. Keep the accessible name and test id.
- Q108 to Q112 (the spec's D3 to D7) stay at the suggested defaults; "default taken" on the progress page.
