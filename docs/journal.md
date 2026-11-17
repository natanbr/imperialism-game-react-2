# Journal

## Resuming here
- 2026-11-17: M12 Honest game is merged (pull request 34, main 91d7edc). M12b Better HUD (FR-465 to FR-480, cards Q108 to Q113),
  its review fix round (15 findings) and its by-eye QA fix round (FR-529 to FR-537) are built and committed on `claude/m12b-hud`
  (three commits, the last "M12b: QA fixes and final gate"), not pushed, no pull request yet. Gate 2 on the final tree: 2525 unit
  tests, lint 0 errors, tsc and build clean, Playwright 125 passed (first run 124 and 1 red, fixed, see the entry). FR-372 is closed; FR-357 to FR-443: 78 tested, 9 partial. Labels beside
  the icons from 1800 px, not 1600.
- Next (NR-034, in this order): push `claude/m12b-hud` and open its pull request, then M13 to M16 (FR-481 to FR-528,
  `docs/specs/m13-m16.md`, cards Q114 to Q135; planned, nothing built). Merged so far: M0 to M12 (main 91d7edc).
- Answered by Nathan 2026-11-16: Q79 to Q83 as suggested, Q102 "keep the debug", Q113 one static Advance Turn. Needed from him: Q114
  and Q115 (before M13's military lane is finished), Q121 (before M14 builds FR-503), Q130 (before M16 starts). The other open cards
  have defaults in force: Q22 to Q78, Q84 to Q135 (progress page).
- Progress page (republish after a change): https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU, data in `docs/report/roadmap.json`.
- Ideas from the M12b QA, not built: a fade that shows the 390 px bar strip scrolls; a build id in Details for bug reports (the
  app has none yet). Not changed by design, with reasons: `docs/requirements.md`, section "M12b by-eye QA fix round".
- Not verified: Firefox and WebKit, a winning Council vote on screen. Open for Nathan: the five `backup/v1-wip/*` branches no longer
  exist (their commits are unreferenced; `git gc` can prune them).
- Everything older (status lines M0 to M11, the carried-forward review notes of M4.1 to M4.4, deferred items, housekeeping):
  `docs/journal/archive-resuming-before-M12.md`. The M12 entry is archived in `docs/journal/archive-M12.md` (a summary stays below);
  the M12b entries are below. Rules of the game: `docs/rules/`. Flow: `docs/FLOW.md`.

## 2026-11-02 Revival setup

Size: L (process). Decisions: continue not restart; gold $200 / gems $500; delete superseded
branches and untrack old tool configs; v3 AI scripted and LLM behind one interface. Light
flow adopted from the work-repo SDD flow; reviews batched per milestone to cut cost.

## 2026-11-03 M1 headless core (archived)

Entries in `docs/journal/archive-M1.md`. Engine in `src/app/engine/` (Order, validate, apply,
resolveTurn, systems `(state, ctx)`, seeded RNG, scripted player); the store holds one
`GameState` plus UI state and the UI only submits orders. FR-001 to FR-026 tested; 280 unit
tests, Playwright 7 passed. Two objections went to M2: the job completion flags and the
`newGame` import of a test fixture (both settled in M2 part A).

## 2026-11-03 M2 economic loop (archived)

Entries in `docs/journal/archive-M2.md`. Production buildings with capacity and standing orders,
recipes, labour, food and sickness, training, migration, freight cars from lumber + steel + labour,
the Spring 1815 calendar, real job durations and costs; the engine owns the start world; capital
dialog, HUD date and food warning. FR-027 to FR-059 tested; 472 unit tests, Playwright 8 passed,
1 skipped. Merged as PR 13. Open: decision Q9 (freight cars count this turn; the rules say next turn).

## 2026-11-03 M3 money and score (archived)

Entries in `docs/journal/archive-M3.md`, with the decision cards Q10 to Q15. One world market
(sell, buy, cargo holds, price drift), the score (treasury + industry + development), game over after
40 turns, the market dialog, HUD score and game-over screen. FR-060 to FR-078 tested; 588 unit tests,
Playwright 10 passed, 1 skipped. Merged as PR 14 (review: merge, nothing must-fix; carried-forward list
in the archive's review entry).

## 2026-11-04 M3.5 small map and clean look (archived)

Entries in `docs/journal/archive-M3.5.md`. The rail line fix (FR-079), the 24x16 two-island start
world with island 2 kept for M4 (FR-080 to FR-083), Game Icons, faint terrain tints, the minimalist
palette and 42 px tiles (FR-084 to FR-090), and the review fix round (FR-091 to FR-096); 654 unit
tests, Playwright 15 passed, 1 skipped. Merged as PR 15; the carried-forward list is in "Resuming
here" and the archive's last entry.

## 2026-11-09 M4 second nation (archived)

Entries in `docs/journal/archive-M4.md`. Nation 2 "Valdoria" on island 2, played by the scripted player
at End Turn (FR-097 to FR-105); the score table, news per nation, Valdoria read-only, New game, 24 px
worker buttons and the tray (FR-106 to FR-111); review fix round. Merged as PR 17. Carried forward: the
list in `docs/journal/archive-resuming-before-M12.md`.

## 2026-11-10 M4.1 play-test fixes (archived)

Entries in `docs/journal/archive-M4.1.md`, with its review fix round. Civilians share tiles, one job per
tile (FR-112 to FR-115); one production plan for the phase, the labour and the capital dialog (FR-116 to
FR-120); commodity icons in the market and capital (FR-121); a scripted engineer that builds depots and
joins them by the shortest rail path (FR-122 to FR-124). Merged as PR 18 (main b4d26ee).

## 2026-11-10 M4.2 scripted player score (archived)

Entries in `docs/journal/archive-M4.2.md`, with its review fix round. `engine/ai/economy.ts`: every
lumber + steel pair becomes capacity, goods fill the holds, pairs bought under $1,000, cheapest
development level first, depots only when they pay back (FR-125 to FR-132). Against the frozen M4 player,
seeds 1 to 4: turn 15 1.60 to 1.65 times, turn 25 1.76 to 1.81, turn 40 2.39 to 2.55. Merged as PR 19 (main a267a03).
## 2026-11-12 M4.3 transport popup and rail links (archived)

Entries in `docs/journal/archive-M4.3.md`, with its review fix round. The transport popup with icons, groups by
kind and columns (FR-133 to FR-135); rail links are only the sections built, the triangle bug (FR-136 to
FR-139); the scripted engineer orders sections. Lowest FR-125 ratio 1.60 to 1.55. Merged as PR 20 (main
274ef62).

## 2026-11-12 M4.4 Recruiting AI and empty groups (archived)

Entry in `docs/journal/archive-M4.4.md`, with its probe tables and review fix round. The transport popup lists only
what the network can carry and hides empty groups (FR-141, FR-142); the furniture bound counts 2 lumber (FR-140);
recruiting measured and not built (probe in `scripts/probes/m4-4/`, card Q21 option a). Merged as PR 21 (main e018d85).

## 2026-11-13 v2 plan (night shift, NR-030; archived)

Entry in `docs/journal/archive-v2-plan.md`. Plan in `docs/REVIVAL_PLAN.md` section 5b (M5 to M10, seven architecture
decisions); rules 01, 06, 07, 08 extended and 11-screens.md new; FR-144 to FR-234; decision cards Q22 to Q37.

## 2026-11-13 M5 World and seams for v2 (archived)

Entries in `docs/journal/archive-M5.md`: engine half, UI half, review fix round (19 findings), QA fix round (FR-235).
The continent world (two Great Power islands of 4 provinces each, Arvelia as the land bridge, Sundmark, Lorran and
Pellis on islands), minor nations apart from `nations`, `state.diplomacy` by pair, intents, `ctx.rngFor`, province and
minor borders on the map, the minor tile panel. FR-144 to FR-160 and FR-235 tested; 976 unit tests, Playwright 24
passed, 1 skipped; every v1 baseline unchanged on two-islands. Merged as PR 23 (main 0bfd870).

## 2026-11-13 M6 Diplomacy (archived)

Entries in `docs/journal/archive-M6.md`: engine half, UI half, review fix round (20 findings), QA fix round (FR-236 to FR-241)
and the fixes of its review. Five diplomacy order kinds stored as intents, the diplomacy phase before trade, relation points,
trade policies, the scripted answers and peace offers; the Diplomacy screen in two panes, Accept Offer and one shared Modal.
FR-161 to FR-181 and FR-236 to FR-241 tested; 1283 unit tests, Playwright 30 passed, 1 skipped; every v1 baseline unchanged.
Merged as PR 24 (main 2a60a3b). Open: the decision card "who receives a grant" (review fix round decision 3).

## 2026-11-13 M7 Nation-to-nation trade (archived)

Entries in `docs/journal/archive-M7.md`: engine half, UI half, review fix round (20 findings), QA fix round (FR-251 to FR-258) and
the review of the QA fix round (FR-259). The partners market on the continent (minors offer and buy, favourite partners, barriers),
the Board of Trade and the Deal Book, the scripted player trading through it, one money formatter. FR-183 to FR-198 and FR-242 to
FR-259 tested; 1458 unit tests, Playwright 32 passed, 1 skipped; every v1 baseline unchanged. Merged as PR 25 (main d16afa7).
Open: card Q47 (the World market's greyed "−").

## 2026-11-13 M8 Armies (archived)

Entries in `docs/journal/archive-M8.md`: engine half, UI half, review fix round (20 findings, FR-260 to FR-262), QA fix round (FR-263 to
FR-269) and the review of the QA fix round (FR-270, FR-271). Regiments, one army per country per province, recruit / march / disband
orders, upkeep and its forecast, the scripted garrison; the map markers and march arrows, the Army screen and the Armoury. FR-199 to
FR-215 and FR-260 to FR-271 tested; 1709 unit tests, Playwright 35 passed, 1 skipped; every v1 baseline unchanged. Merged as PR 26
(main c91f2fd). Open: decision 1 of the review fix round (the reserve step at turn 33) and decision 2 (warn, do not refuse) for Nathan.

## 2026-11-13 M9 War and the attack screen (archived)

Entries in `docs/journal/archive-M9.md`: engine half, UI half, review fix round (17 findings, FR-274, FR-275), QA fix round (FR-276 to
FR-280) and the review of the QA fix round (FR-281). Attacks as `moveArmy` intents, one battle per attacked province in the combat phase,
conquest, colonies and the conquest game over, the scripted war on minors; the Attack and Battle screens, the red attack arrow, the art pack
in the war screens. FR-216 to FR-228, FR-230 to FR-234, FR-272 to FR-281 tested; 1885 unit tests, Playwright 36 passed, 1 skipped; every
v1 baseline and FR-260 unchanged. Merged as PR 27 (main f817da2). Open: the cards of the M9 decisions (Attack button, crossing strikes, ramp).

## 2026-11-13 M10 Council of Governors, engine half (archived)

Entry in `docs/journal/archive-M10.md`: `engine/council/council.ts` (meeting turns, standing, nominees, one ballot per province,
the count, the winner), the `council-met` event and the Council game over in `resolveTurn`, the API the UI half builds on, and
the decision cards Q50 to Q56. FR-290 to FR-296, FR-302 and FR-305 tested; 1940 unit tests; every baseline unchanged.

## 2026-11-13 M10 Council of Governors, UI half and fix rounds (archived)

Entries in `docs/journal/archive-M10.md`: the UI half (FR-297 to FR-301, FR-303, FR-304: the Council screen, the news line, the
game-over line, the HUD's Next Council line), the review fix round (13 minor findings; FR-306 to FR-309), the QA fix round (FR-310
to FR-317: abstention reasons, the player first, the projection, the room at game over) and its review (F1, F2). 2001 unit tests,
Playwright 38 passed, 1 skipped; every baseline unchanged. Merged as PR 28 (main 69ed08b).

## 2026-11-14 M11 Ink-and-wash restyle (NR-032; FR-318 to FR-356; archived)

Size: L. Branch `claude/m11-ink-restyle`, merged as PR 30 (main 3d819d6) after the orchestrator's gate on 84b2333: 2111 unit tests, lint
0 errors, tsc and build clean, Playwright 51 passed and 1 skipped (--workers=1); engine, store and types unchanged. The art pack now
shows across the game and 7 dialogs fit at 5 window sizes. Everything is in `docs/journal/archive-M11.md`: lanes 1 to 3, the integration
step, the review fix round (FR-339 to FR-345, card Q77), the QA fix round (FR-346 to FR-355, card Q78) and its review (FR-356).
Carried: nation 2's blue is 2.97:1 on the grass; the Capital dialog's Clothing card and "Cotton or Wool" wrap were already cut at 1280x720.

## 2026-11-14 to 2026-11-16 M12 Honest game (NR-033, NR-034; FR-357 to FR-464, cards Q79 to Q107; archived)

Size: L. Merged as pull request 34 (main 91d7edc). Everything is in `docs/journal/archive-M12.md`: the audit (160 findings, themes T1 to
T16, milestones M12 to M18), the four lanes, the integration, two review rounds, the QA fix round (FR-444 to FR-453), the AI margin hunt
(FR-454 to FR-460, cards Q105 to Q107), the close-out (FR-461 to FR-464) and gates 4 to 6 (gate 6: 2447 unit tests, Playwright 92 passed).
Parked after M12: the FR-125 margin's thin points (seed 3 at turn 25 passes by 58.5 points), cards Q103 to Q107; FR-372 was closed by M12b.

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
