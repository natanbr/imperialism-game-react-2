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
- 2026-11-14 M11 Ink-and-wash restyle (NR-032, FR-318 to FR-345, cards Q60 to Q77) built on `claude/m11-ink-restyle`
  (lanes 1 to 3, the integration step and the review fix round, entry below), not pushed: 2102 unit tests, Playwright 47
  passed and 1 skipped. Still to come: the browser QA pass, republishing the progress page, the PR.
- Open decisions (defaults in force, all on the progress page): Q22 to Q59; the most important are Q51 (Council
  threshold), Q34 and Q35, and Q57 to Q59 (new from the M10 QA round: the removed "No tile selected" hint; the news
  line names the 1st nominee first while the screen puts the player first; abstention reasons in relation points
  while the Diplomacy screen shows levels). M11's Q60 to Q77 are in roadmap.json (the page is not republished yet).
- Not verified yet: a winning Council vote on screen (unit tests only); Firefox and WebKit never run; seed 4's
  computer never campaigns. Possible flaky test: `tests/engine/lintGuard.test.ts` timed out once under load.
- Carried from M8: the FR-213 garrison threat-recruit asks for Regulars, which a real game can never raise. Next.js
  picks a lockfile two folders up as the project root (set `turbopack.root` / `outputFileTracingRoot` in `next.config`).
- Housekeeping waiting for Nathan's go-ahead: merged branches `claude/v2-plan`, `claude/m5-*` to `claude/m10-council`,
  the old `decisions` worktree.

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

### Review fix round (FR-339 to FR-345, card Q77)

One agent (Opus 5.5; no advisor call) on the milestone review's 16 findings: R1 to R6 against the requirements, F1 to F4 in
the running app, P1 to P6 in loading and plumbing (R1, F4 and P1 are one). New ids FR-339 to FR-345 in requirements.md's
"M11 review fix round"; card Q77; code and tests in d66927a. Red before the fixes (`.gate/m11rv/red-unit.txt`, `red-e2e.txt`): unit `Test Files 6
failed | 1 passed (7)`, `Tests 14 failed | 98 passed (112)`; e2e `3 failed`, `3 passed`: the middle of 2-9's picture was
`svg` (the stack's group icon), the hover requested none of the 7 figures, the 1920x1080 sea patches were equal in 10 pairs.

| Finding | What changed | Test |
|---|---|---|
| R1, F4, P1 (major): the budget counted only the map's files | FR-339: it counts the page's request log (every pack file until the network is idle, each once): at most 20 files and 2,050,000 bytes; FR-337 marked replaced | e2e/m11-map.spec.ts prints `FR-339 first paint: 19 pack files, 1937255 bytes` (the HUD's 3 buildings included) |
| R2 (major): three FR-325 clauses untested | tests only | tests/ui/mapIcons.test.tsx: another nation's lone figure, its group's GiMeepleGroup, the selected button's outline; with the clauses reverted `Tests 2 failed` (`mutant-r2.txt`) |
| F1 (major): a flat sea past the map | FR-340: the scroller's background is `GROUND_ART.water` at 512 px (inline style), `background-attachment: local` from the map's origin | tests/ui/mapGround.test.tsx; e2e at 1920x1080: five sea patches all differ (red: 10 equal pairs) |
| F2 (major): the capital's picture covered | FR-341, card Q77: a capital or town with civilians or a name tag draws its picture at 24 px at the top centre, lifted 4 px (`.iconCrowded`) | tests/ui/mapIcons.test.tsx; e2e/look.spec.ts: the topmost box at the middle of 2-9's and 11-4's pictures is the picture (red: `svg`) |
| R3: stations beside a badge not drawn through the map | FR-345 states the stacked case | tests/ui/accessibleNames.test.tsx: a level-1 farm with a depot and a port through MapView, and a level-0 tile |
| R4: older rows not marked | NR-008, NR-021, NR-024, NR-031, FR-153 marked; FR-154 names the new province colour | docs |
| R5: the Armoury's 4.9 px was an estimate | measured in Chromium (one-off Playwright run, 1280x720): Light Artillery 317.8 of 322.6 px, 4.8 px to spare; Hussars 7.5 | FR-331 status |
| R6: cards not on the page | `docs/report/roadmap.json`: cards Q60 to Q77, an M11 item and milestone ("in review"), a need | 18 cards parsed from requirements.md; Q67 carries #26362c and 20.0 |
| F3: province dots 2.76:1 on the grass | FR-344: `--color-province-border` #6a5f51 -> #5f5548 (3.51:1 on the halo, 3.23:1 on the grass) | tests/ui/palette.test.ts (red: 2.76) |
| P2: the tray's figures loaded only when it opened | FR-342 (a): `components/art/prefetch.ts`; the pointer on a tile with the player's stack (`TileBase` `onPointerEnter`) or the stack's focus loads them, once | tests/ui/pictureLoading.test.tsx (red: `[]`); e2e: the hover requests the 7 before the click, the tray none again |
| P3: five pack files unguarded | FR-343: all 159 files against `docs/art/ink-and-wash-SHA256SUMS.txt`, no other file, `git check-attr text` unset | tests/ui/inkArt.test.ts; one byte added to terrain-demo.html: `expected [ 'terrain-demo.html' ] to deeply equal []`; restored (sha 39c3dbdf...) |
| P4: isolation guarded by CSS text only | an e2e frame test | e2e/m11-map.spec.ts at 800x500: p95 16.7 ms; with `contain: none; will-change: auto` p95 83.3 ms, red (`mutant-p4.txt`) |
| P5: the cursor load ran in getSnapshot | FR-342 (b): `requestCursor` from the tile's subscribe (`useTileVisuals`), `cursorOf` only reads; a failed load is tried again | tests/ui/tileCursor.test.ts (red: `cursorOf` created 9 Images) |
| P6: city-ground written in two parts | FR-343: the scans allow it only in `INK_ART_UNUSED`, now plain text | tests/ui/inkArt.test.ts (red: `file: "city/city-ground.png"` not found) |

Decisions (defaults, nobody to ask):
1. F2: the review's option (b), the pre-M11 rule for capital and town only (card Q77). Any 24 px button in a 40 px box covers
   its middle, so option (a) would put the button and the chip over the neighbouring tiles. Lifted 4 px: capital.png's
   drawing starts 4.4 px down its 24 px box, and at top 0 the button hid its lower third.
2. FR-339's ceiling of 20 files and 2,050,000 bytes leaves room for about one picture of the pack's average size (102 KB).
3. P2: loading on the pointer's entry, not on the first render, which would add 7 files and 403 KB to FR-339's first paint.
4. Found while testing P2: End Turn requested 5 figures again. A one-off probe of four ways showed that Chromium requests a
   picture again for a later `<img>` once the detached `new Image()` that loaded it is gone; a kept Image, a link preload
   or a mounted `<img>` is reused. Both loaders now keep their Images; the End Turn check of FR-339 guards it.
5. The lanes' entries moved to `docs/journal/archive-M11.md` (FLOW: under 400 lines).

Carried:
- Nation 2 #2c5c9e is 2.97:1 on the grass (3.23:1 on its halo): changing a nation colour moves FR-097's table and every
  screen, so it waits for a card.
- FR-339 has room for about one more picture; the HUD's three buildings are 256 px PNGs shown at about 16 px (269 KB).
- Republish the progress page from `docs/report/roadmap.json`; the browser QA pass; the PR.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the fixes | the 7 changed unit files; `look` and `m11-map` e2e | `Tests 14 failed \| 98 passed (112)`; e2e `3 failed`, `3 passed` |
| Unit tests, baselines | `npm test` (`.gate/m11rv/test-final.txt`) | `Test Files 107 passed (107)`, `Tests 2102 passed (2102)` (+14); `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 ... [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (M6's three); exit 0, no output |
| Build | `npm run build` (`build.txt`) | `✓ Compiled successfully in 3.2s`, `✓ Generating static pages (4/4)` |
| e2e, all specs | `PORT=3311 npx playwright test --workers=1 --reporter=line` (`pw-final.txt`) | `47 passed (2.5m)`, `1 skipped` (cursor-icons' rail case, `fixme` before M11) |
| FR-336 | `git diff origin/main -- src/app/engine src/app/store src/app/types tests/engine tests/store` | empty |

How to see it: a new game shows the capital's domed building above its civilians' stack (and Valdoria's and the minors'
capitals likewise); on a screen wider than 1280 px the sea runs on past the map without an edge; hover the capital and open
its stack: the figures are there at once.
