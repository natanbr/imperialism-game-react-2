# Journal archive: M4.3 transport popup and rail links

Moved from `docs/journal.md` on 2026-11-12 at the start of M4.4 (FLOW: the journal stays under
400 lines; a milestone's entries are archived when it ends). The entries are unchanged.

## 2026-11-12 M4.3 Transport popup and rail links (FR-133 to FR-139)

Size: M (one dialog; one engine fix in the rail network, its orders and the scripted engineer). One agent
(Opus 5.5), no subagents, no advisor calls; ultracode was not on. Branch `claude/m4-3-transport-ui` from main
a267a03, worktree `.claude/worktrees/decisions`. FR rows first (`docs/requirements.md`, "M4.3").

Plan-lite:
- Change: the transport popup shows icons and display names, grouped by kind in up to three columns
  (NR-024, NR-025); the rail graph holds only the sections built (NR-026).
- Consumers: the popup (HUD and capital), the map's rail lines, `transportConnectivitySystem` (depot
  lights), logistics, the rail orders' validate and apply, the scripted engineer (`ai/railPlan.ts`).
- Tests: `railSections.test.ts` (FR-136 to FR-139), `ui/railLine.test.tsx` (FR-079, FR-139),
  `ui/transportPopup.test.tsx` (FR-133 to FR-135), `e2e/m4-3.spec.ts` (FR-133, FR-135, FR-139).
- Verify: the gate below.
- Objection: a depot next to the line is no longer joined by itself; it needs one more section (one
  engineer turn, $100 to $300), so the scripted player scores a little less (decision 1).

Checked first, at 1280x720 on a952cbc: the popup scrolled (918 px of content in 576 px) and showed the
keys ("IronOre", "CannedFood") with no icon; the warehouse fitted (553 of 553 px, already in two
columns per group); the market scrolled 138 px. Group header rows in the market would add three rows,
so the warehouse and the market keep their layout (FR-135).

NR-026 root cause. A rail job recorded only its tile, not the tile it was built from. When it finished,
`addRailroad` (`systems/railroadSystem.ts`, helper `linkNode`) linked the new tile to every neighbouring
node of the nation's graph (rail, capital, depot, port); `addDepot` and `addPort` did the same. Rail on
A, then B from A, then C from A, with C next to B too, therefore also linked B-C (and capital-C when C
touches the capital). The map draws exactly the graph (FR-079) and the depot lights read it, so the
two agreed, but both held links nobody built. Rules 04 section 1: a rail section "joins two adjacent
tiles; built by an Engineer standing in one of them", and a connected depot "has a rail line to the
capital"; nothing says neighbouring rail tiles join by themselves. So no STOP: connectivity changed too
(the NR-026 default), not only the drawing.

Fix: the job records `railFrom` (FR-136): rail-on-move from the engineer's tile when it is a rail node,
else the target's first rail neighbour; a construction order may name `fromTileId`, which also allows a
section between two rail tiles (a deliberate loop, or joining two networks; FR-137). A finished rail
job links to `railFrom` only; a finished depot or port joins with no link. The drawing, the lights,
logistics and the scripted engineer all read the one graph. Unchanged: `newGame()` (each capital alone,
no link), the map click policy, and `initializeRailroadNetworks` for a map that already holds rail (test
maps only: a map stores no sections, so such rail stays linked to its neighbours).

Red first (the new tests on a952cbc, before the fix): FR-139 (a) `expected [ '2-7 2-8', '2-7 3-8', …(3) ]
to deeply equal [ '2-7 2-8', '2-8 2-9', '2-8 3-8' ]` (the extra links `2-7 3-8` = B-C and `2-9 3-8` =
capital-C); the four files `Tests 22 failed | 18 passed (40)`; the straight line (FR-139 (b)) passed, as
it should. After the fix: `Tests 45 passed (45)` (the four files and the purity test). The popup tests
against the old popup: `Tests 4 failed | 2 passed (6)` (the two FR-134 mapping tests pass on their own).

Scripted player (FR-138): it plans the missing sections of the shortest path and orders them with
`fromTileId`, the capital's end first. Scores, nation 2 vs the frozen M4 player (both on today's engine):

| Seed | Turn 15 before / after | Turn 25 before / after | Turn 40 before / after |
|---|---|---|---|
| 1 | 625/390 (1.60) / 616/390 (1.58) | 851/469 (1.81) / 786/468 (1.68) | 1679/659 (2.55) / 1475/650 (2.27) |
| 2 | 625/381 (1.64) / 624/381 (1.64) | 863/488 (1.77) / 785/471 (1.67) | 1685/674 (2.50) / 1481/668 (2.22) |
| 3 | 638/396 (1.61) / 614/396 (1.55) | 850/477 (1.78) / 786/471 (1.67) | 1619/676 (2.39) / 1437/663 (2.17) |
| 4 | 626/380 (1.65) / 617/380 (1.62) | 850/482 (1.76) / 817/473 (1.73) | 1663/674 (2.47) / 1532/665 (2.30) |

FR-125 (at least 1.5 times) still passes; the ratios are lower. Why, from a turn-by-turn probe of seeds 1
and 4 on both engines (not committed): each depot now takes one more engineer turn and one more rail
job, so each joins a turn later, and in the first 25 turns the engineer is never idle, so every later
depot shifts too; the shifted cash and development change which sites win (seed 1 builds 18-6 at turn
20 instead of 16-2 at turn 17, and 6 depots by turn 40 instead of 4), and the cash goes to depots instead
of lumber + steel pairs (seed 1 turn 40: capacity 88 against 108). A stricter depot pay-back (x1.5, x2)
was tried and dropped: turn 40 moved by 0 to +48, turns 15 and 25 not at all. The M4 player moved
little (seed 1 turn 40: 659 to 650). See decision 1.

Tests changed because an FR changed (FR-136, FR-137): `railLinks.test.ts` (the chain now has 2 links,
not the 3 of a triangle), `ui/railLine.test.tsx` (the spur 3-2, 4-2, 3-1 draws 2 sides, not 3),
`systems/transportConnectivitySystem.test.ts` (a depot finished next to new rail is red until a section
reaches it), `systems/logisticsSystem.test.ts` (the depot gets its section), `apply.test.ts` (the job
records `railFrom`), `scriptedRail.test.ts` (FR-124: the M4 player's rail no longer breaks the bound, 10
links of 11, as its mesh of unbuilt links is gone; it still lays more than its depots need). None skipped
or deleted.

Screenshots, looked at: `docs/journal/m4-3-transport.png` (1280x720: three columns, Food and Raw
materials, Other resources and Materials, Goods; icons before the names; no scroll bar).
`docs/journal/m4-3-rail.png` (tiles 1-7 to 4-10: lines from the capital to 3-9 and to 3-8, none between
3-8 and 3-9). Fixed after looking: the first rail picture had the engineer's button and the selection
ring on 3-8, hiding where the line ends; the test now walks him to 5-9, out of the picture. The gold
frame on 3-8 is the "job finished this turn" mark.

Decisions for Nathan (cards):
1. The scripted player's margin over the M4 player fell (lowest 1.60 to 1.55; turn 40 from 2.39-2.55 to
   2.17-2.30). Suggestion: accept (it follows the rules); retune the AI only together with the open
   score-formula decision.
2. ~~The map offers no click that builds a section between two rail tiles (closing a loop, or joining two
   networks that meet head on).~~ Fixed in the review fix round (below): with the engineer on a rail
   node, a click on a neighbouring rail node not linked to it builds the section between the two
   (`moveAndStartConstruction` with `fromTileId`; FR-023, FR-137), so the head-on case and a loop are
   one click. No dialog choice needed.
3. The popup lists materials and goods, which are always 0 / 0 in v1 (no town production). Suggestion:
   hide those groups until towns produce.

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests | `npm test` | `Test Files 58 passed (58)` / `Tests 828 passed (828)` (+28 on 800) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 as on main) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 8.3s`, `✓ Generating static pages (4/4)` |
| Smoke (at 83a23f3) | `PORT=3183 npx playwright test --workers=1` | `1 skipped` / `21 passed (2.6m)` (+2: `e2e/m4-3.spec.ts`); the skip is the old `test.fixme` rail cursor |
| Screenshots | `SCREENSHOT_DIR=docs/journal PORT=3183 npx playwright test e2e/m4-3.spec.ts --workers=1` | `2 passed (1.3m)` |

How to see it in the app: `npm run dev`; (1) press "Transportation of Commodities": five groups in three
columns, an icon before each name, no scrolling; (2) select the engineer on the capital, click 3-9, End
Turn; click the capital, End Turn; click 3-8, End Turn: two lines from the capital and none between 3-8
and 3-9; (3) build a depot on a tile next to rail: it stays red until the engineer, standing on the rail
next to it, clicks the depot tile.

### 2026-11-12 M4.3 review fix round

One agent (Opus 5.5, xhigh), no subagents, no advisor calls. Review findings 1, 2, 3 and 9 fixed; 4 to 8
under "Carried forward".

- Finding 1, a human dead end (FR-023, FR-137): rail line capital 2-9 to 2-5, a depot on 4-5; the engineer
  on the depot clicks 3-5 (section 4-5 to 3-5), then on 3-5 clicks 2-5. Red first: the click offered
  `expected [ { kind: 'moveWorker', …(3) } ] to deeply equal [ { …(6) }, …(1) ]`, and the unaffordable
  case moved the engineer (`expected { ok: true } to deeply equal { ok: false, …(1) }`): `Tests 2 failed |
  23 passed (25)`. Fix in `hooks/tileClickOrders.ts` `moveOrders`: from a rail node onto a neighbouring
  rail node with no section between them, `moveAndStartConstruction` (rail, `fromTileId` = his tile), then
  the plain move. After: `Tests 25 passed (25)`; the depot turns green; a click on a linked or
  non-adjacent rail tile still only moves; short of money: "Move and build refused: not enough money."
  and no move. Not changed: a click on a capital or town offers the fort first (`getEngineerActions`),
  so that join is made from the other side (standing on the capital or town, click the rail tile).
- Finding 2 (FR-124, FR-125): no rail dead end (a one-link node that is not a depot, a port or the
  capital) at turns 15, 25 and 40. A per-turn check would fail for both players: a path being laid has a
  dead-end tip for a few turns (current player, seed 1: turns 4, 5, 10 to 12, 17, 18, 23, 30, 35, 36). The
  current player: none at any checkpoint, seeds 1 to 4. The frozen M4 player: `[{"seed":1,"turn":40,
  "deadEnds":["20,4"]},{"seed":2,"turn":25,"deadEnds":["19,3"]},{"seed":2,"turn":40,"deadEnds":["21,3"]},
  {"seed":3,"turn":40,"deadEnds":["20,4"]},{"seed":4,"turn":25,"deadEnds":["19,3"]},{"seed":4,"turn":40,
  "deadEnds":["20,5"]}]`; none at turn 15 (one line to its depot), so the failing proof is in FR-125, not
  FR-124. Trap: the checkpoints pass by timing; if a change moves a build so a tip falls on turn 15, 25 or
  40, the check needs a "tip of the path under construction" exception, not a weaker invariant.
- Finding 3 (FR-132): the horizon for the smallest case is now 14 turns (2 + 1 + 21 / 2 = 13.5, a gain of
  2 and one flat section), in the spec and the `depotPaysBack` comment; the code did not change.
- Finding 9 (FR-137, FR-139): a depot built on a railed tile keeps its section and is active;
  `fromTileId` with a depot, port or fort is `invalid-target`, for start and move-and-start.

Acceptance numbers unchanged (before = after, `FR-125 the numbers`): seed 1 t15 616/390 (1.58), t25
786/468 (1.68), t40 1475/650 (2.27); seed 2 t40 1481/668; seed 3 t15 614/396 (1.55, the lowest), t40
1437/663; seed 4 t40 1532/665. FR-124: `{"depots":2,"links":7,"yieldPerTurn":33,"shipped":200,"sold":29,
"score":616,"bound":10,"refused":0}`.

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests | `npm test` | `Test Files 58 passed (58)` / `Tests 836 passed (836)` (+8 on 828) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same 3 as on main) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 9.2s`, `✓ Generating static pages (4/4)` |
| Smoke | `PORT=3185 npx playwright test --workers=1` | `1 skipped` / `21 passed (2.8m)` |

How to see it in the app: `npm run dev`; lay rail from the capital up to 2-5 and build a depot on 4-5;
put the engineer on the depot, click 3-5, End Turn; click 2-5, End Turn: a line 4-5 to 3-5 to 2-5 and the
depot green.
