# Journal archive: M12b Better HUD

Moved from `docs/journal.md` on 2026-11-17, unchanged, in the M13 final round (FLOW: the journal stays under 400 lines;
M12b is merged as pull request 35, main 74f595c).

## 2026-11-17 M12b Better HUD (NR-034; FR-465 to FR-480, cards Q108 to Q113)

Size: L, UI only (engine, store and types untouched; no selector was missing). Branch `claude/m12b-hud` from main 91d7edc (M12 merged
as pull request 34), one commit, not pushed. Spec `docs/specs/hud.md`. One workflow, red tests first, four tasks, each Opus 5.5 with no
advisor call; notes and logs in `.gate/hud/` (git-ignored):
- T1, the frame (FR-465, FR-479): `--topbar-height` 40 px (80 px below 1024 px), `mapAreaOf` is the window less the bar and the pane, the
  map and the narrow-window line start under the bar, the bar stops edge scrolling.
- T2, the top bar (FR-466 to FR-469, FR-477, FR-480): `HUD/TopBar.tsx`: the nation, the turn block with the next Council line, cash with
  last turn's change, score with its rank and parts, the dialog buttons as 32 x 32 icons (the name kept as a hidden label) and the one
  Advance Turn (card Q113); New game's question is a panel under the bar.
- T3, the right pane (FR-470 to FR-477): Tile Info or "No tile selected", the alerts (`HUD/Alerts.tsx`), the news in the pane's free
  height, three closed groups (`HUD/HudGroups.tsx`, `HUD/hudView.ts`): Nation, Work in progress (N), Details for bug reports, shown
  without `?debug` (card Q102). The pane's interim Advance Turn is gone.
- T4, the gate (Opus 5.5, this entry): the old-layout pins retargeted, the e2e suite moved to the new layout, `e2e/m13-hud.spec.ts`
  written, FR-372's `test.fixme` made a test, the rows flipped and the 16 older rows amended (`replaced by FR-4xx in part`).

Decision taken (T2): labels beside the icons from 1800 px of window width, not the spec's 1600 (FR-468, spec amended). At 1600 px with
labels the row needs 1746 px: the nation name was squeezed to 0 px and the score ran 6 px into the buttons. Objection: from 1024 to
1799 px a player sees the icons only (the name is the tooltip and the accessible name).

Pins moved (old -> new; each reason is written in the test):
- Unit, 46 red in 5 files after T1 to T3 (all pins of the old layout, no defect in src): dialogs (37) and about (4) render
  `<TopBar />` (the dialog buttons left the pane); watchNation (3) opens the Nation group for the score table and renders `<TopBar />`
  for New game; persistence (1) renders `Alerts` for Not-saved; camera FR-366 (1) stubs the pane with a group button (the bar now
  renders Advance Turn).
- E2E: at 1920x1080 the map lies at 320.5, 224 (was 184; the bar takes 40 px) in m12-map FR-367 and m11-map FR-340; islands at 800x450
  scroll to 0, 214 (map area 550 x 370); look FR-090 needs every tile at y >= 40; the score table and the Council projection are read
  after opening the Nation group (m5-world, two-nations, market-and-game-over, m10-council); m5-hud-scroll opens Nation and Details
  so the pane overflows; councilNews checks below the bar and above the groups; m11-lists FR-334 and FR-349 measure 32 x 32 buttons,
  20 x 20 icons and labels from 1800 px; m12-map FR-424 checks the bar at 640x360, FR-429 the line's top >= 80, FR-377 the group
  without `?debug`; m8-qa FR-268 selects tile 2-9 when no tile is selected (Tile Info is no longer always shown).
- Measured: FR-372 (eight whole news lines at 1280x720 on turn 2) now shows 20.

| Claim | Command | Quoted result |
|---|---|---|
| The old-layout pins were red after T1 to T3 | `npm test` (T4-unit-0.txt) | `Tests  46 failed \| 2456 passed (2502)`, in 5 files |
| The retargeted files pass | `npx vitest run` on the 5 files (T4-fix-neighbours.txt) | `Tests  154 passed (154)` |
| The new FR-477 page test can fail | mutation: the next-Council line removed (T4-red-fr477-page.txt), restored (T4-fr477-page.txt) | `Unable to find an element by: [data-testid="next-council"]`, `Tests  1 failed`; restored `Tests  1 passed` |
| The one-Advance-Turn e2e check can fail | mutation: a second Advance Turn (T4-red-e2e-two-advance.txt) | `Expected: 1`, `Received: 2` |
| Every unit test passes | `npm test` (gate1-unit.txt) | `Test Files  121 passed (121)`, `Tests  2503 passed (2503)`, `EXIT 0` |
| Lint has no error | `npm run lint` (gate1-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)`, `EXIT 0`; the same two warnings as M12's gates |
| Types are clean | `npx tsc --noEmit` (gate1-tsc.txt) | no output, `EXIT 0` |
| The build works | `npm run build` (gate1-build.txt) | `✓ Compiled successfully in 3.6s`, `✓ Generating static pages (4/4)`, `EXIT 0` |
| The browser suite passes | `npx playwright test --workers=1` (gate1-e2e.txt) | `105 passed (7.4m)`, `EXIT 0`, first run; none skipped (FR-372's `test.fixme` is a test now) |
| FR-372 is closed | the same run | `FR-372 news list 400 px, 20 lines of 20 px` |
| The documents agree with themselves | `node .gate/m12/L4-check-req.cjs`, `L4-check-roadmap.cjs` | `PASS` each; `FR-357..443 status words: {"tested":78,"partial":9,"parked":0}` |

Not verified: Firefox and WebKit; game over at 1800 px wide (Final scores adds about 116 px; T2 estimated 1752 px needed). Seen in the
gate's screenshots (`.gate/hud/shots/m13-hud-*.png`): at 390x844 the narrow-window line still covers the pane's first line until it is
closed (FR-429 as before), and the nation's name gives way first in the narrow bar (spec section 8).

## 2026-11-17 M12b review fix round (15 findings: ST-1 to ST-4, LP-1 to LP-4, A11Y-1 to A11Y-5, NL-2, NL-3)

Size: M, UI only (engine, store and types untouched). Same branch, one commit "M12b: review fixes", not pushed. One task, Opus 5.5
xhigh, no advisor call; red before green for every row; logs `.gate/hud/R-*.txt`.
- What hangs from the bar (score parts, New game's question, the focus label) is drawn in the bar's stacking context, so the bar now
  lies above the pane: `.bar` z-index 10 -> 30 (pane 10, FR-429 line 20, dialogs 60 and up) (LP-1, NL-2).
- New game's question renders right after New game in the bar, no portal: Tab order New game, question, About; its left edge under
  the button, kept 8 px inside the window; Escape closes it and gives the focus back (A11Y-1 major, LP-3).
- Keyboard: an inset focus ring on the bar buttons (A11Y-2, LP-2); from 1024 to 1799 px a focus shows the button's name under it
  (A11Y-4); the nation name and the Council line carry their full text as a title (A11Y-5); a news place line or a Work row moves
  the focus to Tile Info's heading (A11Y-3), both through one `HUD/showTile.ts`; the score parts come from one `scoreParts` (NL-3).
- Tests and docs: FR-473's Enter/Space unit test presses the keys (ST-3); the bar's fit is measured at its widest states (turn 2,
  turn 39 with $1,234,567, game over with Final scores) at seven sizes, and the sideways check reads the frame that holds the bar,
  not the document (ST-4, LP-4); NR-034, Q102, FR-466, FR-480 and the spec's section 4 statuses corrected (ST-1, ST-2).

Pins moved (old -> new; each reason is written in the test): camera FR-465 bar z 10 -> 30; topBar FR-468 CSS one `.topbar-label {`
rule -> two (still one clip-path); FR-480 panel "rendered into the body" -> "right after New game, inside the bar"; FR-480 CSS
"right: 8px, own z 30 in the body" -> "left set by the component, the bar's z between 20 and 60"; warehouseAndHud FR-301 (2) "no
title" -> "title = the line's own text"; m13-hud `document.documentElement.scrollWidth` (could not fail) -> the frame's scroll width.

| Claim | Command | Quoted result |
|---|---|---|
| The new tests were red | `npx vitest run` on 4 files; `npx playwright test e2e/m13-hud.spec.ts` (R-red-unit.txt, R-red-e2e-m13.clean.txt) | `Tests  12 failed \| 74 passed (86)`; `7 failed`, `16 passed (56.9s)` |
| The old Enter/Space test could not fail | a key handler added to HudGroup (R-red-st3-mutation.txt) | old check passed; new: `Nation after Enter: expected 'true' to be 'false'` |
| The widest-states e2e can fail; the old sideways check could not | a longer cash line (R-red-e2e-mutation-lp4.txt, R-red-e2e-mutation-lp4a.txt) | `the score block ends at 842.59375, past the buttons' start at 680.59375`; `docScrollWidth":1024,"appScrollWidth":1120`, old check `true`, new `false` |
| The affected unit files pass | `npx vitest run` on 31 files (R-green-unit-affected-2.txt) | `Test Files  31 passed (31)`, `Tests  592 passed (592)` |
| m13-hud passes | `npx playwright test e2e/m13-hud.spec.ts` (R-green-e2e-m13-2.txt) | `23 passed (52.7s)` |
| The neighbour specs pass | m12-map, two-nations, m5-hud-scroll, look (R-green-e2e-neighbours.txt) | `27 passed (1.3m)`, `exit 0` |
| Types and lint | `npx tsc --noEmit`, `npm run lint` (R-tsc.txt, R-lint.txt) | `tsc exit 0`; `✖ 2 problems (0 errors, 2 warnings)` (the gate 1 two) |

Not run: the whole unit suite, the build, the whole Playwright suite (the next gate's). Not fixed: below 1024 px a focused button's
name is not shown (the strip clips it; it would need a label placed by script); a title reaches a mouse only, so a keyboard user
still cannot read a cut Council line; `useCouncil` computes `councilVote` twice (one function, no drift risk; speed only).

## 2026-11-17 M12b by-eye QA fix round and final gate (FR-529 to FR-537)

Size: M, UI only (engine, store and types untouched). Same branch, one commit "M12b: QA fixes and final gate", not pushed. One task,
Opus 5.5 xhigh, no advisor call; every finding reproduced on the running app first (`.gate/hud/final/repro.mjs`,
`repro-before.txt`), red before green for every row; logs `.gate/hud/final/F-*.txt` and `.gate/hud/gate2-*.txt` (git-ignored).
Plan-lite: the change, one small UI fix per real finding, at its cause (CSS, placement, focus, page order), no engine or store
file; who consumes it: the player at every window size, and keyboard users; the test rows: FR-529 to FR-537 (each row names its
tests); verify: `npx vitest run tests/ui/hudQa.test.tsx`, `npx playwright test e2e/m12b-qa.spec.ts`, then the whole gate.
Objection: FR-535 puts the bar before the map in the page, so a screen reader reads the bar first too, and a test that counted
Tab stops from the map would break; only the page-order pin did (moved, below).
The QA failed three checks and listed 15 extras (tracks A and B, `.gate/hud/qa/`). Outcome per finding:
- B12b How to play at 640x360 (419 px high, Close out of view): fixed, FR-529. The dialog is at most the window less 32 px, only the
  text between the title and Close scrolls (a region "How to play text", a Tab stop), Close keeps the focus; About's panel scrolls too.
- B15 the score's parts at 390 px (ran to x 592): fixed, FR-530. One `leftInWindow` helper in `HUD/hudView.ts` places the list and
  New game's question (FR-480's `confirmPanelLeft` became it, same values).
- B16 a focused strip button clipped (Center Camera at 390 px; Diplomacy and New game at 320 px): fixed, FR-531. The strip scrolls the
  focused button into view by the least amount (`scrollIntoView` with `nearest`).
- E3 the narrow-window line over "Close tile info": fixed, FR-532. The line ends at the pane's left edge (`right: var(--hud-width)`).
- The news text touching its scrollbar: fixed, FR-533 (4 px gutter). War and idle lines that read as body text: fixed, FR-534 (a
  3 px warn-colour rule at the left). Tab order map, bar, pane: fixed, FR-535 (`page.tsx` renders the bar first). E7 window size in
  Copy details: fixed, FR-536 ("Window: W x H"; the group's lines now on the pane's 16 px rhythm).
- Not changed, each with its reason in `docs/requirements.md` (section "M12b by-eye QA fix round"): icon-only buttons from 1024 to
  1799 px (the 1800 px breakpoint, FR-468); the pane scrolling with a civilian selected and the 800x600 overflow, E5 (by design,
  FR-472 and FR-235); the chevron mid-turn (a 0.3 s transition); the parts over Advance Turn at 800x600, E1 (WCAG 1.4.13, hoverable);
  "-$1,100 last turn" (not reproduced: with no order the bar reads "-$100 last turn", `.gate/hud/final/a7.txt`); tile 11-4 (not
  reproduced: "11-4 clicked", Tile Info shown); E4's scroll-hint fade and the Council ellipsis at 390 px (not built, an idea); E7's
  build id (not built: no build-time id exists); E6 the stale `.next` (a process point: the gate rebuilds, e2e runs on `.next-e2e`).

Pins moved (old -> new; each reason is written in the test): camera FR-465 "the top bar after the map, before the HUD" -> "the top
bar before the map, the map before the HUD" (FR-535); camera FR-429 name "over the HUD" -> "over the map beside the HUD" (FR-532);
hudGroups FR-476 eleven Details lines -> twelve (`Window: 1024 x 768`, FR-536), the Copy test passes the window size; topBar FR-480
`confirmPanelLeft` -> `leftInWindow` (same inputs, same values); m10-council FR-314 "the Council line has no title" -> "its title is
the line's own text, never the projection" (FR-537, which changes FR-314 in part; found by gate 2's first run: the review fix
round's A11Y-5 gave the line a title and did not run the whole suite; the M10 pin guarded against the projection living only in a
tooltip, which still holds). One neighbour went red on the way and was fixed at the cause, not
re-pinned: m5-hud-scroll FR-235 (1), the news end 1 px out of view at the scroll's end, because the twelfth Details line was 18 px
(`.hud-group-panel` sets 18 px after `.hud-debug-section`); the group's lines are 16 px now (measured `newsOverBy -25`).

| Claim | Command | Quoted result |
|---|---|---|
| The new unit tests were red | `npx vitest run tests/ui/hudQa.test.tsx` (F-red-unit.txt) | `Tests  11 failed \| 2 passed (13)` |
| The new e2e checks were red | `npx playwright test e2e/m12b-qa.spec.ts` (F-red-e2e.txt) | `9 failed`, `EXIT 1`; `the dialog {"x":140,"y":-29.25,"width":360,"height":418.5} inside the window`; `hover: {"x":302.3125,"y":24,"width":290.15625,"height":94} inside the window`; `Center Camera at 228 to 260, the strip 8 to 251`; `Diplomacy at 152 to 184, the strip 8 to 181`; `the line ends at 390, the pane starts at 140`; `the widest line ends 0 px before the scrollbar`; FR-535 `toBeFocused() failed` |
| The affected unit files pass | `npx vitest run` on 11 files, then 2 (F-green-unit-2.txt, F-green-unit-3.txt) | `Tests  216 passed (216)`; `Tests  30 passed (30)` |
| The QA spec and the neighbour that went red pass | `npx playwright test e2e/m12b-qa.spec.ts e2e/m5-hud-scroll.spec.ts` (F-green-e2e-3.txt) | `11 passed (24.8s)`, `EXIT 0` (before: F-green-e2e-2.txt `1 failed`, `61 passed (4.0m)`, m5-hud-scroll FR-235 (1)) |
| Gate 2's first full run found one red, from the review fix round | the whole gate (gate2-run1-*.txt) | unit, lint, tsc, build `EXIT 0`; e2e `1 failed`, `124 passed (8.5m)`, `EXIT 1`: m10-council FR-303, `expect(locator).not.toHaveAttribute() failed`, `Received: have attribute` (the Council line's A11Y-5 title) |
| The re-recorded FR-537 pin can fail | mutation: the projection as the line's title (F-red-fr537-mutation.txt), then reverted | `Expected: "Next Council: turn 10 (Summer 1817)"`, `Received: "If it met now: Testland 4, Valdoria 4, abstain 4 of 12; 9 needed"`, `1 failed`, `EXIT 1` |
| Every unit test passes | `npm test` (gate2-unit.txt) | `Test Files  122 passed (122)`, `Tests  2525 passed (2525)`, `EXIT 0` |
| Lint has no error | `npm run lint` (gate2-lint.txt) | `✖ 2 problems (0 errors, 2 warnings)`, `EXIT 0`; the same two warnings as gate 1 |
| Types are clean | `npx tsc --noEmit` (gate2-tsc.txt) | no output, `EXIT 0` |
| The build works | `npm run build` (gate2-build.txt) | `✓ Compiled successfully in 3.7s`, `✓ Generating static pages (4/4)`, `EXIT 0` |
| The browser suite passes | `PORT=3199 npx playwright test --workers=1` (gate2-e2e.txt), the rerun on the final tree | `125 passed (8.8m)`, `EXIT 0`; none failed, none flaky, none skipped; `FR-372 news list 400 px, 20 lines of 20 px` |
| The documents agree with themselves | `node .gate/m12/L4-check-req.cjs`, `L4-check-roadmap.cjs` | `PASS` each; `rows 563 \| replaced-by pairs checked 67`; `FR-357..443 status words: {"tested":78,"partial":9,"parked":0}` |

Seen by eye (`.gate/hud/final/fix-*.png`): How to play at 640x360 with Close in view; the score's parts inside the window at 390x844;
Center Camera whole when focused at 390x844; the narrow-window line beside the pane with "Close tile info" free; the Details group
with the Window line at 1280x720 on turn 2. Not verified: Firefox and WebKit.

