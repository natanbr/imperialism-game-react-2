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
  engine half, UI half, review fix round and QA fix round done (FR-183 to FR-198 and FR-242 to FR-258 tested; FR-182, 190,
  192, 193, 196 replaced); not pushed. Next: the re-review of the fix rounds' delta, then the PR. Cards Q39 to Q46 on the page.

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

## 2026-11-13 M7 Nation-to-nation trade, UI half (FR-194, FR-195, FR-197)

Size: M (screens on the engine half's API). One UI agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the
M7 workflow. Branch `claude/m7-trade` (worktree `imperialism-game-revival-fee36d`), not pushed.

Plan-lite:
- Change: in "partners" `MarketModal` renders the Board of Trade (`components/market/BoardOfTrade.tsx` on `boardView.ts`);
  a "Deal Book" HUD button opens `DealBookModal.tsx` (store flag `isDealBookOpen`, reset by New game); `Stepper.tsx` is the
  "− n +" of both market dialogs; icon `dealBook` (GiOpenBook). The v1 World market is the same component body as before.
- Consumers: the player; M8 fills Military upkeep in the Deal Book's bottom line (`dealBook` gives 0 now).
- Tests: FR-194 `tests/ui/boardOfTrade.test.tsx` (17 rows: name, order, Price/Available/Bid/Offer, Sellers and Buyers with
  favourite and marks, the FR example "Arvelia 3, favours Valdoria", a consulate ordered this turn lifts the mark, holds,
  bids, a row with a bid has no offer control, the 4-bid refusal, "world" unchanged); FR-195 `tests/ui/dealBook.test.tsx`
  (7 rows, one of them FR-197's flow in the store); FR-197 `e2e/m7-trade.spec.ts` (with the FR-194 fit at 1280x720);
  FR-236 `tests/ui/dialogs.test.tsx` lists both new dialogs; FR-022 scan covers the three screens.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `PORT=3160 npx playwright test --workers=1`.
- Objection: decision 3 (FR-078's e2e reads the sale's income from the news, no fixed price any more).

Decisions (defaults, nobody to ask):
1. Dialog names follow FR-236's title convention: "Board of Trade — Testland", "Deal Book — Testland" (Playwright matches
   "Board of Trade" as a part of the name). Objection: FR-194/195 say "named Board of Trade"; an exact match needs the suffix.
2. The FR-197 spec is `e2e/m7-trade.spec.ts`, the name FR-197 gives (the workflow task said `e2e/m7.spec.ts`).
3. FR-078's e2e (`market-and-game-over.spec.ts`): in "partners" nobody buys lumber and a minor buys only goods from a Great
   Power with a consulate there, so it now orders a consulate with Pellis and 1 furniture on turn 1 (Valdoria reaches Pellis
   only on turn 4), offers the furniture on turn 2 and checks cash = before + the income in "Sold 1 Furniture to Pellis for
   $…". The 40-turn game-over test is unchanged. `look`, `m4-1` and `m6-dialogs` only change the dialog name (and
   `m6-dialogs` adds the Deal Book to its FR-236 loop).
4. "A row with a bid has no offer": the other side's stepper is not shown (the engine refuses it anyway). The 4-bid limit and
   other refusals show as in v1, in the dialog's alert ("Purchase refused: over the limit."). Objection: M6's pattern disables
   a refused control with its reason; here a fifth bid can still be pressed.
5. Layout: a fixed frame (at most the window less 16 px); on a new game all 17 rows show at 1280x720 (rows 27 px, chips on two
   lines where 3 or 4 minors trade); when it grows (a refusal, more chips) only the board scrolls, under a sticky head. The
   margin at 720 px is about 10 px. Barrier chips are outlined (dashed) with the reason in words in the danger colour.
6. The Deal Book shows "No deals last turn." also before the first End Turn; it names the turn it shows ("Turn 1, Spring
   1815"); an empty page says "Nothing sold." / "Nothing bought."; a negative Net is red and reads "-$200".
7. The Deal Book is a full-width HUD action under Open Market; the HUD's scroll area is about 36 px shorter (FR-235 holds).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red (stubs for `boardView` and `DealBookModal`) | `npx vitest run tests/ui/boardOfTrade.test.tsx tests/ui/dealBook.test.tsx tests/ui/dialogs.test.tsx tests/ui/icons.test.tsx tests/ui/uiWritesOnlyOrders.test.ts` | `Test Files 5 failed (5)`, `Tests 36 failed \| 50 passed (86)` (`Unable to find an accessible element with the role "dialog" and name "Board of Trade — Testland"` x20, `... "Deal Book — Testland"` x5, `... name /^Deal Book$/` x5) |
| FR-194, FR-195 green | same files plus `marketDialog`, `commodityIcons` | `Test Files 7 passed (7)`, `Tests 105 passed (105)` |
| Unit tests | `npm test` | `Test Files 81 passed (81)`, `Tests 1389 passed (1389)` (+30 on 1359), no act warning |
| v1 and v2 baselines unchanged | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`, `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]`, FR-196 `"minorDeals":{"nation-1":21,"nation-2":21}`, treasuries 17674, 17021, 16607, 19737 |
| FR-197, FR-194 fit, FR-078, all e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `32 passed (1.5m)`, `1 skipped` (the old skip) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.3s`, `✓ Generating static pages (4/4)` |

In the app: New game, Open Market (the Board of Trade), Diplomacy → Arvelia → Consulate, the coal row's "Arvelia 3, favours
Testland" loses "(no consulate)"; bid 2 coal, Advance Turn, then the HUD's Deal Book: "Bought 2 Coal from Arvelia @ $100".

## 2026-11-13 M7 Nation-to-nation trade, review fix round (FR-242 to FR-250)

Size: L (the partners price rule and the scripted player are engine-wide; screens). One fix agent (Opus 5.5, xhigh, no
subagents, no advisor call), started by the M7 workflow. Branch `claude/m7-trade` (worktree `imperialism-game-revival-fee36d`),
not pushed. The review (one reviewer) gave 20 findings in two lists; the second list's F1 to F6 are written F1' to F6' here.

Plan-lite:
- Change: the partners price step counts only the Great Powers' deals; the scripted player buys raw and opens a consulate
  only where it will trade; `tradeBarrier` forecasts this turn's diplomacy phase; `bid-unfilled`; "+" disabled with its
  reason; a colony bids for nothing; rows replaced with new ids (FR-182, 190, 192, 193, 196 → FR-242 to FR-245, FR-247).
- Consumers: the Board of Trade, the Deal Book, the news, the scripted player, M9 (colonies), the v2 baseline.
- Tests: FR-242 to FR-246, FR-249 `engine/partnerMarket.test.ts` (+14 rows); FR-245 `engine/scriptedTrade.test.ts` (rewritten);
  FR-247 `engine/v2Trade40.test.ts` (baseline pinned, price bound); FR-244, FR-248 `ui/dealBookView.test.ts`,
  `ui/dealBook.test.tsx`, `ui/boardOfTrade.test.tsx`; FR-250 `ui/dialogs.test.tsx`; FR-242 `store/gameStore.test.ts`.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `PORT=3160 npx playwright test --workers=1`.
- Objection: decision 1: with no pull back toward the start price, a nation that keeps buying one commodity still moves it
  to its bound in time (timber reaches $180 by turn 40 on seed 2); the card Q39 offers the pull.

| Finding | What changed | Test |
|---|---|---|
| C1, F1 (major): the minors' fixed volume drove prices to the bounds | FR-243 replaces FR-190: units = Great Power units bought − sold (as in "world"); `settlePartnerTrade` returns `sold` and `bought` | partnerMarket "FR-243" (5 rows, one a 4-unit trade against none); v2Trade40 "no price runs to its bound" |
| C2 (major): the computer never bid and paid for unused consulates | FR-245 replaces FR-193: `rawWants` bids for timber, coal, iron ore, cotton; `planConsulate` only when the minors that favour it do not cover its holds | scriptedTrade (a) 7 rows, (b) 4 rows; v2Trade40 "… and buys from one" |
| F2 (major), C5, F3': FR-196's "2 minors" read as a union | FR-247 replaces FR-196: each nation at least 1 minor and 1 purchase, both together at least 2 minors (card Q40) | v2Trade40 "each nation deals with a minor and buys from one …" |
| F3: the v2 baseline only logged | deals, purchases and minors per nation and final treasuries of seeds 1 to 4 pinned | v2Trade40 "the measured baseline" |
| C3: Board and trade phase disagree on wars and boycotts | FR-246: `tradeBarrier` runs `diplomacySystem` on the state (cached per state) and reads `settledTradeBarrier`; the trade phase reads the record only; the Board's favourites the same way | partnerMarket "FR-246" (5 rows); boardOfTrade "FR-246 a war declared this turn …" |
| C4: a bid nobody filled said nothing | `bid-unfilled` (units not in an `offer-missed`); Deal Book "Nobody sold us 2 Coal (bid money back)"; news "Nobody sold us 2 Coal; the bid money is back." | partnerMarket "FR-244 a bid nobody fills …" (4 rows); dealBookView; dealBook "only trade is a bid nobody filled" |
| C6, F4: FR-192 said `dealBook` returns lines | FR-244 replaces FR-192: the engine returns data, `dealBookView` writes the lines; the news wording in the row | dealBookView (retagged); partnerMarket "FR-244 dealBook returns data" |
| F4, F2': FR-182's wording and Tests line | FR-242 replaces FR-182 ("partners" or absent, read through `marketModeOf`); worlds.test.ts dropped | partnerMarket "FR-242" (retagged) |
| F4: FR-236's list | FR-250: the Board of Trade and the Deal Book under FR-236 | dialogs.test.tsx rows tagged FR-250; e2e/m6-dialogs.spec.ts |
| F5: store option, news lines, Deal Book turn line, Board note without FR | a store test for `market`; the news wording in FR-244; FR-248 names the turn line and the note | gameStore "FR-242 the store passes the market mode on"; boardOfTrade "FR-248 the note …" |
| F6, F4': weaker assertions | FR-183 offers compared exactly; the 4-holds test renamed and a 3-holds row added; the $3,000 case | partnerMarket FR-183, FR-188; scriptedTrade "ordered at $3,000, none at $2,999" |
| F7: the decisions not on the page | roadmap.json: cards Q39 to Q46 (engine decisions 1, 3, 4, 7; UI decisions 3, 4; the price rule; the FR-247 reading), M7 at 90%, the "now" line | none (data) |
| C7, F6': unreachable `no-hold`, copies, three partnerTrade.ts | `no-hold` kept for M8 (said on `take`); `MISSED_TEXT` moved to gameText (news and Deal Book share it); one `levelOfPoints` in relations.ts for both phases; files renamed `definisions/partnersMarket.ts`, `engine/market/settlePartners.ts`, `engine/ai/scriptedPartners.ts` | dealBookView "a missed offer for want of money reads as in the Deal Book" |
| C8: "+" never disabled | FR-248: `boardView` asks `validateOrder` for one more unit; a refused "+" is disabled with the title "No free hold this turn", "Already 4 bids this turn, the most", "None left in the warehouse" or "Not enough money"; the v1 World market unchanged | boardOfTrade 3 rows; e2e/m7-trade.spec.ts (the fit test checks the disabled "+") |
| F5': a colony still bought goods | FR-249: `minorDemand` is empty for a colony | partnerMarket "FR-249" |

Decisions (defaults, nobody to ask):
1. FR-243: the Great Powers' deals only, no pull back toward the start price (F1 option 1; card Q39 offers a 10% pull). Deals,
   not orders: a bid nobody fills moves nothing, so a refunded bid cannot push a price for free. Objection: above.
2. FR-247: both nations together deal with at least 2 minors (card Q40). Objection: FR-196's grammar reads per nation; per
   nation the computer would pay $500 for a consulate it does not use (nation 2 is Arvelia's favourite and fills its holds there).
3. FR-245 (a) counts only the minors that favour it as covering its wants (a minor serves its favourite first); (b) raw bids are
   gated by value (a raw pair under $1,000, 4 cotton under a clothing), none in the last 2 turns. Against the same player
   without raw bids (both nations summed, turn 40): +82, +94, +25, -20 points on seeds 1 to 4. Objection: the gates are
   heuristics, and seed 4 loses 20 points.
4. FR-246 runs the diplomacy phase itself instead of reading only war and trade-policy intents (the finding's fix): exact for
   failures, peace and favourites. Objection: a query runs a turn system (cached per state object; no import cycle today).
5. The event is `bid-unfilled` (the finding said `offer-unfilled`): "offer" means a sale in this code.
6. FR-248 pre-validates every "+", not only the bid limit and the holds: the M6 pattern (FR-178) across the board.

Carried:
- F6': the relation-changed emitter is not shared between `diplomacySystem` and `settlePartners` (the diplomacy one adds war causes).
- FR-246: a peace or an alliance a human Great Power still has to answer is not forecast.
- e2e: the fit at 1280x720 with a refusal line over the board cannot be reached from the board any more; checked with every hold taken.
- FR-247: nation 2 ends with $38 on seeds 3 and 4 ("above 0" holds narrowly); it spends its cash on development, as in v1.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: the new tests on the commit before the fix (f4d6d62) | the 7 changed test files copied into `git archive f4d6d62` (one import path shimmed), `npx vitest run …` | `Test Files 6 failed \| 1 passed (7)`, `Tests 28 failed \| 125 passed (153)` (e.g. `expected { seed: 1, atBound: [ …(7) ] } to deeply equal { seed: 1, atBound: [] }`, `expected 928 to be 892`, `expected [] to deeply equal [ { type: 'bid-unfilled', …(3) } ]`, `expected undefined to be 'at-war'`, `expected '' to be 'Already 4 bids this turn, the most'`, `expected { clothing: 2, furniture: 2, …(1) } to deeply equal {}`) |
| Price path before and after (seed 1, both scripted) | `npx vitest run --config scripts/probes/m7/vitest.config.ts` | before: clothing 928 (t1), 1,493 (t20), 2,250 (t40); timber 97, 57, 50. After: clothing 901, 729, 648; timber 102, 153, 144 (v1 world on two-islands: clothing 642 at t40) |
| Unit tests | `npm test` | `Test Files 81 passed (81)`, `Tests 1419 passed (1419)` (+30 on 1389) |
| v1 baselines unchanged | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`, `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]` |
| FR-247 v2 baseline | `npm test` console | seed 1 `"minorDeals":[59,53],"minorPurchases":[31,23],"minorsDealt":[4,1],"treasury":[924,88]`; the four seeds as in FR-247's status |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.4s`, `✓ Generating static pages (4/4)` |
| All e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `32 passed (1.4m)`, `1 skipped` (the old skip) |

In the app: New game, Open Market: after 4 bids every "+" is greyed and its tooltip says "No free hold this turn". Diplomacy →
declare war on Arvelia: the Board marks Arvelia "(at war)" at once. Bid 2 coal without a consulate and End Turn: the Deal Book
reads "Nobody sold us 2 Coal (bid money back)".

### QA fix round (FR-251 to FR-258)

Size: M. One fix agent (Opus 5.5, xhigh, no subagents, no advisor call), M7 workflow; not pushed. QA shots `docs/journal/m7-qa-board.png`,
`m7-qa-deal-book.png`, `m7-qa-deal-book-unfilled.png`; after the fix `m7-qa-fix-board.png`, `m7-qa-fix-deal-book.png` (`.gate/qa-shots.mjs`).
Plan-lite: `partnerRefusal` (`engine/market/partners.ts`) in `validateTradeOrder` before the limits; `cause` on `offer-unsold` and
`bid-unfilled`; `dealBook` gives `notTraded`, `diplomacy` and the change from `TurnReport.treasuries`; one `money`. Objection: decision 1.

| QA item | What changed | Test |
|---|---|---|
| 1 "Available", counts | FR-251: "In warehouse"; "Arvelia: 2 units"; the favourites once, in the note | boardOfTrade (7 rows), e2e m7-trade |
| 2 bids nobody may fill | FR-252: `no-seller`, `sellers-barred` when ordered; "+" disabled with the reason beside it; "Arvelia favours Valdoria" | partnerOrders (7), boardOfTrade (3), e2e |
| 3 offers nobody buys | FR-253: `no-buyer`, `buyers-barred`; "Only Valdoria may buy this"; the note says what minors buy | partnerOrders (6), boardOfTrade (4) |
| 4 empty cell | FR-254: "No minor trades this" | boardOfTrade (1), e2e |
| 5 Not traded | FR-255: a third list with each cause ("no buyer", "no consulate with Lorran", "Valdoria was served first") | partnerOrders (5), partnerMarket (4, and 8 rows check a cause), dealBookView (4), dealBook (2) |
| 6 Net vs treasury | FR-256: "Trade net"; a Treasury table: diplomacy costs, Other, "Treasury change", "From $10,000 to $9,300" | partnerOrders (3), dealBookView (2), dealBook (2 and the FR-197 row), gameStore (1), e2e |
| 7 visible reasons | FR-257: every disabled "+" has its reason beside it as its description; no "−" at 0 | boardOfTrade (5; one checks all 34 of a new game), e2e |
| 8 money | FR-258: HUD "Cash: $10,000"; `money` the one formatter (also the capital and the tile panel), "-$1,369" | money (3), dealBookView (1), e2e play-turns, market-and-game-over, m7-trade |

Decisions (defaults, nobody to ask):
1. FR-252 counts only minors as sellers, as the item says: a bid for what only the rival offers (FR-186's steel example) can no
   longer be ordered; step 3 still settles what a minor sells. Objection: in a hotseat game the rival's offer would be lost.
2. FR-253 "a Great Power buys": one that bids already or may bid (FR-252 for it); the scripted rival orders at End Turn.
3. The market's reason comes before the nation's limits: with every hold taken, wool still says "No minor nation sells this".
4. Item 6, option 2: development, building, training and gold move the treasury too, so "Net" cannot equal its change.
5. Item 5: the missed offers also move to Not traded (no unit changed hands), with their cause; the news lines are unchanged.
6. Item 7: at 0 there is no "−" (its place stays), instead of 34 more lines "nothing to take back".
7. To keep the 17 rows of a new game at 1280x720 (FR-194): the reasons in 10 px, two lines at most, muted grey (34 red lines
   would shout); the favourites moved from every chip to the note. Objection: 10 px is small.
8. 18 settlement tests in partnerMarket.test.ts place orders past the check (`placed`, as after a withdrawn consulate), the
   assertions kept and 8 now also check the cause; the FR-100 log test runs on market "world"; e2e orders the consulate first.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: the 8 new or changed test files on fede4d5 | `git archive HEAD` + the files, `npx vitest run …` (`.gate/qa-red.txt`) | `Test Files 7 failed \| 1 passed (8)`, `Tests 62 failed \| 114 passed (176)` (e.g. `expected { ok: true } to deeply equal { ok: false, reason: 'no-seller' }`, `expected [ { type: 'bid-unfilled', …(3) } ] to deeply equal [ { type: 'bid-unfilled', …(4) } ]`, `expected { label: 'Net', … } to deeply equal { label: 'Trade net', … }`); the 1 passing file is the FR-100 setup change |
| Unit tests | `npm test` | `Test Files 83 passed (83)`, `Tests 1454 passed (1454)` (+35 on 1419) |
| Baselines unchanged | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`, `FR-157 ... [[1,1493],[2,1496],[3,1490],[4,1476]]`, FR-247 seed 1 `"minorDeals":[59,53],"minorPurchases":[31,23]` as pinned |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.2s`, `✓ Generating static pages (4/4)` |
| All e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `32 passed (1.5m)`, `1 skipped` (the old skip) |
| Screenshots | `node .gate/qa-shots.mjs` (dev server on 3160) | `board {"dialog":[15,705],"paneOverflow":0}` (all 17 rows, holds full); Deal Book `Nobody sold us 1 Coal (the sellers had no more; bid money back)`, `Treasury change -$800`, `From $10,000 to $9,200`; `HUD Cash: $9,200`; `errors []` |

Carried: the news lines carry no cause; "Other" lumps building, prospecting, development, training and gold; FR-246's carry
holds for FR-252. In the app: New game, Open Market: each grey "+" says why; consulate with Arvelia, bid 4 coal, End Turn: the
Deal Book's Not traded "Nobody sold us 1 Coal (the sellers had no more; bid money back)", Treasury "Consulate in Arvelia -$500".
