# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M4 are merged into `main` (PR 9, 10, 12 to 15, 17); their entries are archived in
  `docs/journal/archive-M1.md` to `-M4.md`. Decisions Q5 to Q16 settled (NR-012 to NR-018).
- M4.1 (PR 18), M4.2 (PR 19) and M4.3 (PR 20, main 274ef62) are merged; entries archived in
  `docs/journal/archive-M4.1.md` to `-M4.3.md`. Q17, Q19 and Q20 answered as NR-029, NR-028, NR-027.
- 2026-11-12 M4.4 (NR-027, NR-028; FR-140 to FR-142) merged (PR 21, main e018d85; entry archived in
  `docs/journal/archive-M4.4.md`). Recruiting not built (probe in `scripts/probes/m4-4/`); decision card
  Q21 open, option (a) "no recruiting" taken meanwhile. v1 (M0 to M4.4) is complete.
- 2026-11-12 night shift (NR-030): v2 planning and implementation. Plan on branch `claude/v2-plan`
  (this worktree, the old docs worktree `imperialism-game-revival-fee36d`); one branch per milestone
  after it. The progress page files now live on these branches too (copied from the docs branch).
- 2026-11-13 M5 (FR-144 to FR-160, FR-235) merged (PR 23, main 0bfd870; entries archived in
  `docs/journal/archive-M5.md`). The app plays the continent. Card Q22 (the continent's tilt) still open.
- 2026-11-13 M6 Diplomacy (FR-161 to FR-181, FR-236 to FR-241) merged (PR 24, main 2a60a3b; entries archived in
  `docs/journal/archive-M6.md`). Decision card "who receives a grant" (M6 fix round decision 3) still to add.
- 2026-11-13 M7 Nation-to-nation trade (FR-183 to FR-198, FR-242 to FR-259) merged (PR 25, main d16afa7; entries archived in
  `docs/journal/archive-M7.md`). Card Q47 (the World market's greyed "−") still open.
- 2026-11-13 M8 Armies (FR-199 to FR-215, FR-260 to FR-271) merged (PR 26, main c91f2fd; entries archived in
  `docs/journal/archive-M8.md`). Nathan's art pack (NR-031) committed on top (4bd00eb).
- 2026-11-13 M9 War and the attack screen (FR-216 to FR-234, FR-272 to FR-281) merged (PR 27, main f817da2; entries archived
  in `docs/journal/archive-M9.md`).
- 2026-11-13 M10 Council of Governors (FR-290 to FR-317) merged (PR 28, main 69ed08b; engine half archived in
  `docs/journal/archive-M10.md`). **v2 (M5 to M10) is complete.** Gate on 6fad1e0: 2001 unit tests,
  lint 0 errors, tsc and build clean, Playwright 38 passed and 1 skipped.
- 2026-11-14 M11 Ink-and-wash restyle (NR-032, FR-318 to FR-356, cards Q60 to Q78) built on `claude/m11-ink-restyle`
  (lanes 1 to 3, the integration step, the review fix round, the QA fix round and its review, entry below), merged
  by the orchestrator after its gate on 84b2333: 2111 unit tests, lint 0 errors, tsc and build clean, Playwright 51
  passed and 1 skipped (--workers=1); engine, store and types unchanged; the only `public/` change restores
  `terrain-demo.html` to its supplied sha256 (now guarded by `.gitattributes`). Progress page republished.
  Carried: nation 2's blue is 2.97:1 on the grass; the Capital dialog's Clothing card and "Cotton or Wool" wrap were
  already cut at 1280x720 before M11.
- Open decisions (defaults in force, all on the progress page): Q22 to Q59; the most important are Q51 (Council
  threshold), Q34 and Q35, and Q57 to Q59 (new from the M10 QA round: the removed "No tile selected" hint; the news
  line names the 1st nominee first while the screen puts the player first; abstention reasons in relation points
  while the Diplomacy screen shows levels). M11's Q60 to Q78 are on the page too.
- Not verified yet: a winning Council vote on screen (unit tests only); Firefox and WebKit never run; seed 4's
  computer never campaigns. Possible flaky test: `tests/engine/lintGuard.test.ts` timed out once under load.
- Carried from M8: the FR-213 garrison threat-recruit asks for Regulars, which a real game can never raise. Next.js
  picks a lockfile two folders up as the project root (set `turbopack.root` / `outputFileTracingRoot` in `next.config`).
- 2026-11-14 housekeeping (Nathan: "Yes, clean up"): the merged branches `claude/v2-plan`, `claude/m5-world` to
  `claude/m10-council`, `claude/v2-handoff` and `claude/m11-ink-restyle` deleted locally and on GitHub, and the old
  `decisions` worktree removed (it had no uncommitted work). Then (Nathan: "Yes, check and remove") 12 of the 17
  v1-era worktrees removed: every one's commits were already in main and it had no changes. Kept, waiting for Nathan:
  5 agent worktrees with uncommitted source edits from 2026-11-02 to 11-04 (`agent-a0ebafd9159ca6197` on m1, 86
  files; `agent-a75ac2363238a25c6` on m3, 28; `agent-a4c9cb9416fb072cc`, `-a8c6b9c5d3e0870d8`, `-ab5572a63222c682f` on
  m3.5, 18, 68 and 58), all on branches already merged into main.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are the pack's pictures since M11 (FR-330; the rail cursor's e2e case is still `fixme`). Not built
  from M3: Q15 (c) "repeat last turn's trades".
- The NR-016 list of other same-turn effects (archive-M4, part A entry) waits for a decision.
- M5 design item (M4 review note 5): partly settled by FR-115 (with a civilian selected elsewhere, a
  click on a tile's civilians is the selected civilian's order there); with none selected, a click on
  a tile's centre still selects its civilian, not the tile.
- M4.1 review note 5: the rail path search (`railPath` in `engine/ai/railPlan.ts`) treats a tile with
  a temporary job (prospecting, development) as blocked, so the engineer takes a longer route, or finds
  none, rather than waiting the few turns until the job ends.
- M4.1 review note 7 (decision 4): Expand, freight cars, training and sales can still cut a standing
  order without a refusal (as on main, now visible in the dialog), and an older dead order whose inputs
  come back takes its labour back the next turn, cutting a newer order. Not changed in M4.1.
- M4.3 review finding 4: `isDepotSite` checks only hills; it does not call `railTerrainAllowed`. Today a
  depot needs no rail on its own tile, so it does not matter; when technologies become lockable, a
  depot site SHALL also require `railTerrainAllowed` (the section into it is built on it).
- M4.3 review finding 5: `railPath` (`engine/ai/railPlan.ts`) finds the path with the fewest tiles, not
  the fewest missing sections, so it can ignore rail already built that a slightly longer path would reuse.
- M4.3 review finding 6 (hypothesis, not run): the score drop since M4.3 may come partly from
  `bestDepotSite`'s gain counting every gathered unit equally; weighing each unit by what the economy
  actually uses (food eaten, inputs of running buildings, what sells) may pick better sites.
- M4.4 review note 7: a stale store entry (an allocation in `transportAllocationsByNation` for a commodity
  that now has nothing to ship) flashes its group once per open, until the next slider move writes the
  clamped allocations back. The popup's local state clamps it right after the first render; the store keeps it.
- M4.4 review note 10: in the lever table the "free worker" rows add a worker who eats raw food, so what they
  lose is a freight car's load of inputs every turn, not the cost of recruiting. Only the guarded rows (a
  free worker after a labour-bound turn, R1, R2) support the conclusion that recruiting does not pay; the
  rows with a free worker every turn (sick and starved workers) say little about a policy.

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
list in "Resuming here".

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

## 2026-11-14 M11 Ink-and-wash restyle (NR-032; FR-318 to FR-338)

Size: L, plan-lite (spec fc01b05: FR-318 to FR-338, cards Q60 to Q76). Branch `claude/m11-ink-restyle`, not pushed. Lane 1
alone (the table, its guards, the picture component, the tokens), then lane 2 (map) and lane 3 (lists, dialogs, HUD) in
parallel on lane 1's commit, importing only; then the closing step.

### Lanes 1 to 3 (archived)

Moved to `docs/journal/archive-M11.md`, unchanged: lane 1 (the art table `inkArt.ts`, its guards, `InkPicture`, the pack's
tokens; FR-318 to FR-320, FR-329), lane 3 (goods, grades, civilians and buildings in the lists, dialogs, HUD and tile panel;
FR-331 to FR-334) and lane 2 (the map: ground, tile pictures, marks, civilians, selection, borders on halos, rail pieces,
cursors; FR-321 to FR-328, FR-330, FR-337), each with its plan-lite, red run, decisions and evidence table.

### Integration: the closing step (FR-335, FR-336, FR-338; the replaced rows)

One agent (Opus 5.5; no advisor call). Change: `icons.ts` cut to FR-335's list (`GI` 65 to 18 Game Icons), `icons.test.tsx`
rewritten; `TERRAIN_TINT`, the 19 `--terrain-*` tokens, `--color-selected` and their palette tests removed (Q71: no
component drew them); `e2e/m11-art.spec.ts` (FR-338); the replaced rows marked (FR-084, FR-085, FR-086, FR-087, FR-090,
FR-093, FR-121, FR-133, FR-154), the M11 statuses, card Q67's minor colour; ARCHITECTURE's Components; M10's UI half
archived. Objection: a new Game Icon now needs `GI` and the icons test's list changed too (deliberate: FR-335).

Red: the new icons test on the old `icons.ts`, `Tests 3 failed | 2 passed (5)` (`.gate/m11int/red-icons.txt`); the fit
check of decision 3 on the lanes' CSS, `1 failed`: `"goods/canned-food.png: Canned Food (14 px)"` (`red-fit.txt`).

Decisions (defaults, nobody to ask):
1. `GI` pruned with the tables (its other 47 icons were reached only through them); a test pins `GI` = the `UI_ICONS`
   values and `GiRiver`, and asserts the removed exports absent.
2. FR-086's tint test became "no `--terrain-*` token defined or named"; FR-154's two 3:1 tests went (FR-329's halo test
   covers both lines). No other test changed but FR-320's rule pin (decision 3).
3. Bug seen in the first screenshots: the Board of Trade's "Canned Food" ran 14 px into its price. Root cause: preflight's
   `img { max-width: 100% }` makes a picture count as 0 wide when a table sizes a column. Fix: `max-width: none` on
   `img[data-art-inline]`; regression check `expectFit` in m11-art (no inline picture's box overflows). Only that cell did.
4. FR-336's diff check is against `origin/main` (6138531, the branch's base): the local `main` is stale (dcccaa1).
5. FR-338's rail and depot follow look.spec (a depot may not stand next to the capital); it also fails on any pack
   request with an error status. Left for the orchestrator: `docs/report/roadmap.json` (Q60 to Q76), the review, QA.

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests, baselines | `npm test` (`test-final2.txt`) | `Tests 2088 passed (2088)` (-3: icons -1, palette -2); `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 ... [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (M6's three); exit 0, no output |
| Build | `npm run build` (`build-final.txt`) | `✓ Compiled successfully in 3.3s`, `✓ Generating static pages (4/4)` |
| e2e, all specs | `PORT=3311 npx playwright test --workers=1 --reporter=line` (`pw-final.txt`) | `45 passed (3.4m)`, `1 skipped` (cursor-icons' rail case, `fixme` before M11); before the fix also `45 passed` |
| FR-336 | `git diff origin/main -- src/app/engine src/app/store src/app/types` (and `tests/engine tests/store`) | empty, empty |

Seen in the five FR-338 screenshots: as the lanes reported, the 48 px flat-water strip under the map and the rail as a
dark band with ties (Q68); the Next.js dev badge bottom-left (dev server only).

### Review fix round (FR-339 to FR-345, card Q77; archived)

Moved to `docs/journal/archive-M11.md`, unchanged: the milestone review's 16 findings (R1 to R6, F1 to F4, P1 to P6), FR-339
to FR-345, card Q77, the loading budget of the page's request log, the sea past the map, the prefetch of the tray's figures.

### QA fix round (FR-346 to FR-355, card Q78)

Size M. One agent (Opus 5.5; no advisor call) on the browser QA pass's ten items (`docs/journal/m11-art-*.png`) and the
re-review's D1. New ids FR-346 to FR-355 in requirements.md's "M11 QA fix round"; card Q65's and Q77's defaults updated,
Q78 new (also in `docs/report/roadmap.json`). Red: the new tests on a worktree of 8864598 (`.gate/m11qa/red-*.txt`): unit
`Tests 16 failed | 99 passed (115)`; e2e `6 failed`, `5 passed`, and after splitting two tests `3 failed`. Each e2e test
stops at its first failed check; the later checks of one test (the one-line names, the sea's borders) are red in unit tests.

| Item | What changed | Test |
|---|---|---|
| D1 (major): the frame test failed in the default 6-worker run (p95 33.4 ms) | FR-321's test judges the median scroll frame, under 60 ms (it also logs idle frames, measured in alternating blocks) | e2e/m11-map.spec.ts: median 16.7 ms alone; six copies at once 16.7 to 49.9 ms (idle 16.7); with `contain: none; will-change: auto` 150.1 to 233.3 ms, red (`d1-mutant*.txt`) |
| 2 the capital hard to recognise | FR-346: a crowded capital's picture at 48 px, lifted 18 px into the gap between the row above's pictures; its civilians in the corner, its army chip low (armyView's arrow ends follow) | e2e/look.spec.ts: the six capitals' drawings 40.3 px across, 17% to 22% covered (limit 30%), buttons 24 px, named, trial clicks; red: 20.2 px |
| 3 the depot a speck | FR-347: depot and port 20 px in the top-right corner, 11 px marks on their top-right, always stacked; Q65 | tests/ui/accessibleNames.test.tsx, e2e/look.spec.ts (20/11 px, clear of the widest badge) |
| 4 rail a dark cable | FR-348: the link's line paints nothing; the pack's piece shows its sleepers | tests/ui/railLine.test.tsx; e2e computed stroke `none` |
| 5 HUD labels, militia | FR-349: one 20 px icon box in the six full-width HUD buttons, 1.25em for title Game Icons; FR-350: the pitchfork outlined in ink | e2e/m11-lists.spec.ts (labels at one x, buttons 33.5 px); e2e/m11-map.spec.ts (a quarter of the glyph's pixels at 3:1; red 1%) |
| 6 the railyard a blob | FR-351, card Q78: railyard kept, 20 px in the HUD, 30 px in the Transport heading (the depot is no clearer at 16 px) | with FR-349 and FR-352 |
| 7 capital dialog | FR-352: buildings at 30 px in card heads and headings (heads still 24 px), output names on one line, the labour lines 14 px | tests/ui/listArt.test.tsx; e2e/m11-lists.spec.ts (red: the Trade School's picture 15 px) |
| 8 pale goods | FR-353: `--color-art-backing` #d9ccb0 behind every goods picture on a text line (1.47, 1.55, 1.30:1 on the surfaces) | tests/ui/palette.test.ts; e2e computed backgrounds |
| 9 "Armaments" 2 px left | FR-354: the gap is the picture's `margin-right: 0.28em`, no space character before the label | tests/ui/listArt.test.tsx; e2e: the 17 names at one x (red: Armaments 95.56, Timber 96.16, others 96.45 px) |
| 10 sea seams | FR-355: water, river and coast tiles draw a transparent 1 px border | tests/ui/mapGround.test.tsx, territory.test.tsx; e2e computed borders |

Decisions (defaults, nobody to ask):
1. Item 9's cause was not the picture: every inline picture already had the same 1.25em box. Arial kerns a space before
   "A" (and less before "T"), so the fix is the gap as a margin with the space characters removed (30 lines, texts unchanged).
2. Item 2: the 48 px picture was capped at 40 px by Tailwind's `img { max-width: 100% }` (found by the new e2e test:
   Lorran's drawing 33.6 px); `.iconCrowded` sets `max-width: none`. The chip moves only on a Great Power's crowded capital;
   a minor's stays high above its name tag (22% covered).
3. Item 5: the HUD's box is 20 px, not the inline 1.25em (16.25 px), so the railyard is drawn larger (Q78); Center is left
   out of it (its icon in a 20 px box wrapped "Center" to a second line in its half-width button).
4. Item 5, militia: its colour was already the ink (computed rgb(59, 59, 59)); drawn bare at 8 px the tines came out grey,
   so it gets a 40-unit outline in the same ink.
5. Item 7, checked on origin/main in a worktree (`.gate/m11qa/main-capital.png`): the Clothing factory card already ran
   86 px below the industry column's end, and "+ Freight car" 3 px below the side column's, so both were there before M11.
   M11 made the second worse with classic scrollbars only: the Labour line's picture wrapped it (+24 px). The labour lines at
   14 px keep it one line, and "+ Freight car" now lies inside its column.
6. Trap: the Turbopack dev server did not pick up edits of `globals.css` until it restarted (CSS modules reloaded); and it
   turned `margin-inline-end` into `:lang()` rules of higher specificity, so the CSS uses `margin-right`.
7. D1's limit: the brief's "median under 25 ms" failed in five of six copies of the test run at once on this machine
   (scroll medians 33 to 50 ms), so it is 60 ms: above anything load gave with the isolation, below anything the regression
   gave (150 to 233 ms here, 79 to 89 ms on the review's production build). Objection: on a much faster machine the
   regression might fall under 60 ms; the review's 79 ms is the lowest seen.

Carried:
- The Clothing factory card below the industry column's end at 1280x720 (before M11; the column scrolls). "2 Cotton or Wool
  (20)" wraps in the Textile mill card (before M11 too).
- `tests/engine/lintGuard.test.ts` timed out again once at 30 s while two dev servers ran; alone `Tests 17 passed (17)`.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the fixes | the 9 changed unit files, then look, m11-lists, m11-map on a worktree of 8864598 | `Tests 16 failed \| 99 passed (115)`; `6 failed`, `5 passed`; split tests `3 failed` |
| D1 limit vs. the regression | FR-321's test, `--repeat-each=6` (6 at once), and `--workers=1` with the isolation removed | 6 at once: scroll medians 16.7 to 49.9 ms; removed: `166.7` and `233.3` ms, `2 failed` |
| Unit tests, baselines | `npm test` (`.gate/m11qa/test-final.txt`) | `Test Files 107 passed (107)`, `Tests 2107 passed (2107)` (+5); `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 ... [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (M6's three); exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 16.7s`, `✓ Generating static pages (4/4)` |
| e2e, one worker (gate, final tests) | `PORT=3311 npx playwright test --workers=1 --reporter=line` (`pw-w1-final.txt`) | `51 passed (7.5m)`, `1 skipped` (cursor-icons' rail case, `fixme` before M11); `FR-321 scroll frames: median 33.4 ms ... idle frames: median 16.7 ms` |
| e2e, default config, 3 runs (fa06069, frame limit 25 ms) | `PORT=3312`, `3313`, `3314` `npx playwright test --reporter=line` | `22 failed`, `29 passed (7.2m)`; `21 failed`, `30 passed (9.3m)`; `18 failed`, `33 passed (7.1m)`; each `1 skipped`. Every failure a timeout (`page.goto`, `data-ready`, clicks), no assertion on what the page shows |
| e2e, default config, final tests (9d76f3e) | `PORT=3318 npx playwright test --reporter=line` (`pw-default-4-final.txt`) | `14 failed`, `37 passed (5.8m)`, `1 skipped`, all timeouts; FR-321 passed: `median 25.0 ms, mean 32.5 ms, p95 66.8 ms; idle frames: median 16.7 ms` (both old limits would have failed it) |
| The same on 8864598 (control) | `PORT=3315 npx playwright test --reporter=line` on the untouched branch tip | `18 failed`, `29 passed (8.0m)`, all timeouts: the machine ran at 100% CPU with other sessions' work (another repo's e2e and CI checks) |
| FR-336, the pack | `git diff origin/main -- src/app/engine src/app/store src/app/types tests/engine tests/store`; `git diff -- public/` | empty, empty |
| Screenshots | `node .gate/m11qa/qa-shots.cjs 3311` | `docs/journal/m11-qa-map.png` (turn 6, rail and depot), `m11-qa-capital.png`; `"errors":[]` |

How to see it: a new game shows the capitals as domed palaces at 1x, the sea without a grid, the HUD's labels in one column;
build rail and a depot north of the capital: the rail shows its sleepers, the depot its green mark; the Capital dialog's
buildings are readable, "Canned Food" is one line, the goods sit on parchment squares (`docs/journal/m11-qa-map.png`,
`m11-qa-capital.png`).

### Review of the QA fix round (F1 to F4; FR-356)

One agent (Opus 5.5; no advisor call) on the re-review's four findings. FR-356 in requirements.md's "Review of the M11 QA
fix round"; card Q65's default updated (also in `docs/report/roadmap.json`); the review fix round's entry archived. Red on
the old code (`.gate/m11qarv/red-unit.txt`): `Tests 7 failed | 21 passed (28)`: the corner button over 29 px² of the
depot's drawing, the classes absent, 17 spaces after pictures in the Armoury.

| Finding | What changed | Test |
|---|---|---|
| F1 (major): the civilians' button over the depot (24% of its box) and a stacked port (72%) | FR-356: each station's box cropped to its drawing's 14 rows (`object-fit: cover`, still drawn 20 px wide; ends at y 15); civilians on a tile with a station in the corner (from y 16); a depot and a port side by side (x 0 to 39), the level badge (y 16) and job markers (y 27) below them | tests/ui/accessibleNames.test.tsx (geometry from the CSS, the wiring through the map); e2e/look.spec.ts: the reviewer's flow, then a port on 2-7 (`docs/journal/m11-qarv-stations.png`) |
| F2: a constant assertion | the row computed from the CSS: inside the content box, the drawings apart | tests/ui/accessibleNames.test.tsx |
| F3: the Armoury's "At hand" kept its space | the space removed; FR-354's no-space test covers the Armoury | tests/ui/listArt.test.tsx (red: 17 spaces) |
| F4: default-config evidence incomplete | three default-config runs and one with one worker on the final tests, quoted below | none |

Decisions (defaults, nobody to ask):
1. F1: a 20 px station and the 24 px button cannot sit side by side or one above the other in the 40 px box (44 px). The
   pictures' top and bottom 3 px are empty, so the boxes lose them (1 + 14 = 15 px) and the button moves 1 px down, to the
   corner (from y 16). Shrinking the stations while civilians stand there was the other way; it brings the speck back.
2. Two stations: stacked, the port lies under the button at any size; side by side they take the top band, where the badge
   stood, so the badge and the job markers move below them (fixed places, badge or not). The layout is the same with or
   without civilians, so nothing jumps when one arrives.
3. A stack's count still lies over 9% of the rightmost station's drawing, and a selected button's 2 px outline reaches
   0.7 px into it. Moving the count would put it over the port or the moved badge instead.
4. The e2e flow: on a tile that holds a depot, a click with the engineer selected is a move order ("Move refused: not
   possible on that tile."); the port is ordered from the tile panel (the tile first, then the engineer).

Carried:
- With a depot, a port, a river and a running job on one tile, the job marker (y 27 to 37) meets the river marker (as two
  jobs already did); a stack's count reaches 5 px into the right neighbour (as on a crowded capital).
- From the review fix round: nation 2 #2c5c9e is 2.97:1 on the grass (waits for a card); FR-339 has room for about one more
  picture; republish the progress page; the PR.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the fixes | the two changed unit files on the old code (`red-unit.txt`) | `Tests 7 failed \| 21 passed (28)` |
| Unit tests, baselines | `npm test` (`.gate/m11qarv/test-final.txt`) | `Test Files 107 passed (107)`, `Tests 2111 passed (2111)` (+4); `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 ... [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (M6's three); exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 11.8s`, `✓ Generating static pages (4/4)` |
| e2e, one worker (gate) | `PORT=3311 npx playwright test --workers=1 --reporter=line` (`pw-w1-final.txt`) | `51 passed (3.8m)`, `1 skipped` (cursor-icons' rail case, `fixme` before M11); `FR-356 depot alone: [{"station":"Depot: connected","byCivilians":0,"byAll":0}]`; `depot and port: ... "byCivilians":0,"byAll":0.022}, ... "byCivilians":0,"byAll":0}]`; `FR-321 scroll frames: median 16.7 ms, mean 20.7 ms, p95 33.3 ms` |
| e2e, default config, 3 runs (F4; 1f9b15f, CPU at 13% before) | `PORT=3321`, `3322`, `3323` `npx playwright test --reporter=line` (`pw-default-*.txt`) | `51 passed (2.6m)`, `51 passed (2.9m)`, `51 passed (3.1m)`, each `1 skipped`; FR-321 `median 16.7 ms` in all three (p95 50.0, 50.0, 66.6 ms) |
| F3 in a browser | `node armoury-gap.cjs 3330` (one-off, 1280x720; `armoury-gap.txt`) | every picture-to-name gap in Cost and At hand `3.36` px (the review: At hand 6.03 to 6.70) |
| FR-336, the pack | `git diff origin/main -- src/app/engine src/app/store src/app/types tests/engine tests/store`; `git diff -- public/` | empty, empty |

How to see it: in a new game, the engineer lays rail north from the capital and builds a depot on 2-7, staying there: the
depot shows whole above the engineer's button in the corner; a port built there too stands left of the depot along the top
(`docs/journal/m11-qarv-stations.png`, at three times the pixel density).
