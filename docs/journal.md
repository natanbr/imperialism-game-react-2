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
- 2026-11-13 M7 Nation-to-nation trade in progress on `claude/m7-trade` (worktree `imperialism-game-revival-fee36d`):
  engine half done (FR-182 to FR-193, FR-196, FR-198 tested; its API is in the M7 entry); next the UI half (FR-194,
  FR-195, FR-197) and the e2e specs that sell on the continent. Card to add: FR-193 (b) bids nothing in "partners".

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are still emoji. Not built from M3: Q15 (c) "repeat last turn's trades".
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

## 2026-11-13 v2 plan (night shift, NR-030)

Size: L (plan). Branch `claude/v2-plan`. Ultracode workflow 1 (8 agents): code map (Sonnet 5.5 xhigh), four web
research lanes (Sonnet 5.5 xhigh: trade, diplomacy, army, combat; the combat lane stalled on a browser call and
was re-run with web pages only), rules writer (Sonnet 5.5 xhigh), spot-check (Sonnet 5.5 high), spec writer
(Opus 5.5 high: a spec others execute).

- Plan: `docs/REVIVAL_PLAN.md` section 5b (M5 to M10, seven architecture decisions).
- Rules: `docs/rules/01`, `06`, `07`, `08` extended, new `11-screens.md`; gaps updated (F12 to F19, H1 to H18).
  Main source: a Let's Play of Imperialism (1997) with screenshots (lparchive.org); every number tagged Imp1,
  Imp1 [?] or remake. Spot-check: 13 of 18 claims confirmed on the screenshots, 5 tagged [?]; the orchestrator
  opened Update 07 itself (text confirms the worker grades; costs are only on the screenshots).
- Requirements: FR-144 to FR-234 (M5 FR-144 to 160, M6 161 to 181, M7 182 to 198, M8 199 to 215, M9 216 to 234).
- Decision cards (defaults taken, nobody to ask; on the progress page): Q22 one land-bridge minor (Arvelia)
  and three island minors (option b, the spec writer's suggestion: neither capital province borders a minor);
  Q23 one province per minor; Q24 ten relation points a level, +1 a trade, +10 a pact, -40 a war; Q25 equal
  start relations; Q26 a consulate is needed to trade with a minor (plan rule; Imp1 needs none); Q27 a minor
  offers 1 unit per resource tile (at most 6) and buys 2 of each good; Q28 favourite partner = points +
  subsidy / 2, deals at the board price; Q29 the computer accepts alliance at level 7 and peace when losing;
  Q30 start army 2 Regulars, 1 Artillery, militia, fort on the capital; Q31 derived regiment costs, no
  Sappers; Q32 simple combat numbers (8 rounds, 70% hit); Q33 one army per country per province; Q34 a taken
  Great Power capital ends that nation, a taken minor capital makes a colony; Q35 the computer may attack the
  weakest minor from turn 10, never a Great Power; Q36 upkeep it cannot pay disbands the newest regiments;
  Q37 Join the Empire, rail and sea moves, generals and medals stay out of v2.
- Objection: one province per minor and one army per province make war short (one battle takes a minor);
  acceptable for a first playable war, revisit after Nathan plays.

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

## 2026-11-13 M7 Nation-to-nation trade, engine half (FR-182 to FR-193, FR-196, FR-198)

Size: L (engine-wide: the trade phase, the market state, the scripted player). One engine agent (Opus 5.5, xhigh, no
subagents, no advisor call), started by the M7 workflow. Branch `claude/m7-trade` from main 2a60a3b (worktree
`imperialism-game-revival-fee36d`), not pushed. The UI agent builds FR-194, FR-195 and FR-197 next, on the API below.

Plan-lite:
- Change: `market.mode` "partners" on the continent (`newGame({ market })` overrides); `tradeSystem` dispatches to
  `market/partnerTrade.ts` (offers, demand, ranking, barriers, holds, reserve-first payment, relation points, deal events);
  the scripted player orders consulates and caps its trade by its partner minors (`ai/partnerTrade.ts`).
- Consumers: the Board of Trade and Deal Book screens (FR-194, FR-195), the store (`startNewGame({ market })`), M8 (upkeep
  in the bottom line), M9 (war stops trade already).
- Tests: FR-182 to FR-192 `engine/partnerMarket.test.ts` (55 rows, every FR example as a row); FR-192 lines
  `ui/dealBookView.test.ts`; FR-193 `engine/scriptedTrade.test.ts`; FR-196 `engine/v2Trade40.test.ts`; FR-198 the
  FR-157/FR-158 games in `engine/continentScore.test.ts` name `market: "world"`, assertions unchanged.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Objection: decision 4 below: with FR-193 as written the computer never buys from a minor, so all deals are its goods
  sales and the minors' raw offers only push raw prices down.

API for the UI half (`@/engine` unless named): `marketModeOf(state)`; `boardOfTrade(state, nationId)` = rows in
`BOARD_ORDER` `{ commodity, price, available, bid, offer, sellers: [{ minorId, units, favouriteId?, barrier? }], buyers }`;
`tradeBarrier(state, nationId, countryId)` = "no-consulate" | "at-war" | "boycott" | "not-a-partner" | undefined (a
consulate ordered this turn counts); `favouritePartner`, `partnerRanking`, `minorOffers`, `minorDemand`; `tradeCapacityOf`
for "Holds: 3 of 4 free"; `dealBook(events, nationId)` = `{ sold, bought, bottomLine }` from the store's
`eventLog.at(-1).events`; `dealBookView(book, nameOf)` in `components/market/dealBookView.ts` = the ledger lines and
`empty`; `eventText` reads `offer-missed`, `offer-unsold` and a deal's counterparty.

Decisions (defaults, nobody to ask):
1. A "world" market has no `mode` key (`marketModeOf` reads it as "world"), so the v1 market object and FR-060's
   assertion stay as they are. Objection: FR-182's wording says `state.market.mode` is "world".
2. FR-157, FR-174 and FR-181 continent tests name `market: "world"` (setup lines only): their subject is the M5 seams or
   peace, and in "partners" the scripted player also orders consulates. Objection: FR-157 no longer runs the partners
   continent with nation 1 idle; FR-196 runs it with both nations scripted.
3. FR-192: the engine's `dealBook` returns data; the words ("Sold 1 Clothing to Arvelia @ $810") come from
   `dealBookView`, beside `commodityName`. Objection: FR-192 names `dealBook` as returning the lines.
4. FR-193 (b) kept as written: FR-128 bids lumber and steel, no minor offers either, so the computer never bids in
   "partners". Measured effect: goods prices climb about 3% a turn (24 units of minor demand unfilled each turn, clothing
   952 on turn 3 to 1,902 on turn 29) toward the 250% ceiling, raw prices fall toward the 50% floor. Card for the
   orchestrator: let the computer bid for the raw coal, iron ore and timber its mills use, or damp FR-190.
5. FR-186: an offer reaches each Great Power as one sheet (Imp1's offer sheet): it takes what its bid, holds and money
   allow, the rest passes on, and `offer-missed` counts min(units left, its bid) minus what it took.
6. FR-189: a bid's unused reserve is refunded right after its commodity settles; sales earlier in the phase pay later
   purchases. FR-191: a Great Power pair gains while either holds an embassy with the other.
7. FR-193 (c): "what those minors still demand" is their whole demand this turn (the rival's offers are not read).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red (API stubs, tests first) | `npx vitest run tests/engine/partnerMarket.test.ts tests/engine/scriptedTrade.test.ts tests/engine/v2Trade40.test.ts tests/ui/dealBookView.test.ts` | `Test Files 4 failed (4)`, `Tests 61 failed \| 15 passed (76)` (e.g. `expected undefined to be 'partners'`, `expected [ {}, {}, {}, {} ] to deeply equal ...`; the 15 are guards: v1 world trade, order-time check, frozen input, determinism) |
| FR-182 to FR-193, FR-196 green | same command | `Test Files 4 passed (4)`, `Tests 76 passed (76)` |
| First commit (0a1c613) alone | `npm test`, `npx tsc --noEmit` with the FR-193 files set aside | `Test Files 77 passed (77)`, `Tests 1342 passed (1342)`; exit 0 |
| Unit tests | `npm test` | `Test Files 79 passed (79)`, `Tests 1359 passed (1359)` (+76 on 1283), 0 act warnings |
| FR-198, FR-159 v1 baselines | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`, `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]`, as in M6 |
| FR-196 v2 trade baseline | `npm test` console | `"consulateBy":{"nation-1":1,"nation-2":1},"minorDeals":{"nation-1":21,"nation-2":21}` on every seed; treasuries `17674`, `17021`, `16607`, `19737` (both nations) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.5s`, `✓ Generating static pages (4/4)` |

Not run here: Playwright. For the UI half: `e2e/market-and-game-over.spec.ts` (FR-078) sells 1 lumber on the default
(continent) game and expects "Sold 1 Lumber for $300."; in "partners" nobody buys lumber, so that spec, and the market
dialog names in `e2e/m4-1.spec.ts`, `e2e/look.spec.ts` and `e2e/m6-dialogs.spec.ts`, change with FR-194.
