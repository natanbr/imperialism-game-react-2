# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`.
- M0 merged (PR 9). Docs/process merged (PR 10). Rules knowledge base in `docs/rules/` (gaps in
  `docs/rules/gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M1 done 2026-11-03 on `claude/m1-headless-core` (pushed, no PR yet; entries archived in
  `docs/journal/archive-M1.md`). Its review fix round is done.
- M2 part A (engine) done 2026-11-03 on `claude/m2-economic-loop`, stacked on M1, pushed, no PR:
  production buildings, recipes, labour, food, training, migration, freight cars from lumber +
  steel + labour, Spring 1815 calendar, real durations and costs, site rules, same-turn refunds,
  finished jobs leave the tile, the engine owns the start world. FR-027 to FR-045 tested,
  `npx vitest run` 414 green, Playwright 7 passed 1 skipped on port 3127.
- M2 part B (UI) done 2026-11-03 on the same branch, pushed, no PR: capital dialog rebuilt
  (production cards, Expand, labour panel, Trade School, Capitol, freight cars, refusals), HUD
  date and food warning (`foodForecast`), display names, warehouse groups, start technologies
  (decision Q8 default), fruit next to every capital. FR-046 to FR-053 tested, 458 unit tests,
  Playwright 8 passed 1 skipped on port 3131. Screenshots `docs/journal/m2-capital.png`, `m2-warehouse.png`.
- M2 review done; its fix round done 2026-11-03 on the same branch (FR-054 to FR-059, 472 unit
  tests, Playwright 8 passed 1 skipped on port 3133). Next: re-review of the fix-round delta only,
  then the PRs (M1 first).
- Open decision Q9: freight-car timing. Cars ordered in a turn count for that turn's shipping
  (FR-039); rules 01 and 04 say "usable next turn". Not changed; Nathan decides.

Carried forward:
- Deferred to a later milestone: river ports and the depot-on-port rule (rules 04 CODE MISMATCH,
  logic, not data). Also later: world prices (06); University fees; the power plant.
- M4: an order log in the store, UI orders queued into `resolveTurn` (replay of a played game).
- UI: the selected tile and owned tiles are both drawn red.

## 2026-11-02 Revival setup

Size: L (process). Decisions: continue not restart; gold $200 / gems $500; delete superseded
branches and untrack old tool configs; v3 AI scripted and LLM behind one interface. Light
flow adopted from the work-repo SDD flow; reviews batched per milestone to cut cost.

## 2026-11-03 M1 headless core (archived)

Entries in `docs/journal/archive-M1.md`. Engine in `src/app/engine/` (Order, validate, apply,
resolveTurn, systems `(state, ctx)`, seeded RNG, scripted player); the store holds one
`GameState` plus UI state and the UI only submits orders. FR-001 to FR-026 tested; 280 unit
tests, Playwright 7 passed. Two objections went to M2: the job completion flags and the
`newGame` import of a test fixture (both settled in M2 part A below).

## 2026-11-03 M2 part A: economic loop, engine only

Size: L (milestone part). Night shift, one agent (Opus 5.5), no subagents, no advisor calls.
Branch `claude/m2-economic-loop` from `origin/claude/m1-headless-core` 3cef865. `npm ci` clean.

Plan-lite:
- Change: production buildings with capacity and standing orders, a labour pool, a production
  system (recipe engine out of `store/industrySlice.ts`, deleted), a food system, four new
  orders (`setProduction`, `expandBuilding`, `trainWorkers`, `recruitWorkers`), freight cars from
  lumber + steel + labour, and the rules data of `docs/rules/01` to `05` (calendar, durations,
  costs, sites). The engine owns the start world.
- Consumers: the store and UI through `submitOrder` (part B builds the dialogs); AI players
  through the same orders; the scripted player now sets production.
- Test rows: FR-027 to FR-029 `rulesData`; FR-030 to FR-032 `constructionRules`, `gameText`;
  FR-033 to FR-036, FR-038, FR-039, FR-041, FR-042 `industry`; FR-037 to FR-039, FR-041
  `productionSystem`; FR-040, FR-042 `foodSystem`; FR-043 `newGame`, `lintGuard`; FR-044
  `economicLoop`; FR-045 `twoNations` (with `economyViolations` in every headless invariant
  check); FR-013 purity inside the system and order tests (deep-frozen inputs).
- Verify: `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`,
  `PORT=3127 npx playwright test`.
- Objection: production orders are checked against stock and labour when given, but standing
  orders run later against whatever is there; a nation can hold orders it cannot fill. The
  production phase clamps them (tested), and lowering an order is always accepted.

Tasks:

| Task | FRs | Commit |
|---|---|---|
| T-01 [docs] M2 rows, FR-010 replaced | FR-027 to FR-045 | a2686b5 |
| T-02 [test+impl] calendar, one duration table, job costs | FR-027 to FR-029 | 33bd3d1 |
| T-03 [test+impl] construction sites, same-turn refund, finished jobs leave the tile | FR-030 to FR-032 | ef28e44 |
| T-04 [test+impl] buildings, recipes, labour, production, food, industry orders, slice deleted | FR-033 to FR-042 | 71c6177 |
| T-05 [test] grain to canned food; two nations produce and eat | FR-044, FR-045 | 58b0d3a |
| T-06 [test+impl] the engine owns the start world | FR-043 | 7dcb394 |
| T-07 [docs] journal, M1 archive, architecture, requirement status, news text tests | all | this commit |

Red summaries (tests written and run before the code):
- T-02: `Tests 9 failed | 1 passed (10)`; for example
  `expected { depot: 2, port: 4, fort: 4, rail: 1 } to deeply equal { rail: 1, depot: 3, port: 3, fort: 3 }`
  and `expected 100 to be 150` (rail into a forest). The farmer level 2 test passed at once
  (that duration was already 3). Then 20 older tests failed on the new prices (fixture treasury
  1,000 below a $2,000 depot); the fixtures now hold the rules' start cash (10,000 / 8,000).
- T-03: `Tests 23 failed | 11 passed (34)`; site rows
  `expected { ok: true } to deeply equal { ok: false, reason: 'invalid-site' }`, refunds
  `expected 9900 to be 10000`, finished jobs still on the tile.
- T-04 to T-06 (written together, stubs for `labourOf`, `nextCapacity`, `foodSystem`):
  `Test Files 6 failed | 23 passed (29)` / `Tests 76 failed | 337 passed (413)`;
  `TypeError: Cannot read properties of undefined (reading 'untrained')` (24),
  `Error: not implemented nation-1`, `expected {} to deeply equal { textileMill: 2, ... }`,
  `expected { ok: false, reason: 'invalid-target' } to deeply equal { ok: false, reason: 'limit-reached' }`.
- T-06: the FR-043 source scan failed on `engine/newGame.ts` until the move. The ESLint rule for
  `@/testing` was written before its two lint-guard rows, which passed at once.
- T-07: the news-text rows for the new events passed at once (written after the code).

Green summary: `npx vitest run` `Test Files 28 passed (28)` / `Tests 414 passed (414)` (280
before M2: +134; the 7 `industrySlice` store tests were deleted with the slice, their recipes
are now covered by `industry` and `productionSystem`). `npm run test:engine`
`Test Files 22 passed (22)` / `Tests 345 passed (345)`.

Evidence:

| Claim | Command | Result (quoted) |
|---|---|---|
| Baseline at M1 | `npx vitest run`, `npm run lint`, `npx tsc --noEmit` | `Tests 280 passed (280)`; `✖ 4 problems (0 errors, 4 warnings)`; exit 0 |
| FR-027 to FR-029 rules data | `npx vitest run tests/engine/rulesData.test.ts` | `rulesData.test.ts (10 tests)` passed |
| FR-030 to FR-032 sites, refunds, finished jobs | `npx vitest run tests/engine/constructionRules.test.ts` | `(34 tests)` passed |
| FR-033 to FR-042 orders and labour | `npx vitest run tests/engine/industry.test.ts` | `(57 tests)` passed |
| FR-037 to FR-041 production phase | `npx vitest run tests/engine/systems/productionSystem.test.ts` | `(15 tests)` passed |
| FR-040, FR-042 food | `npx vitest run tests/engine/systems/foodSystem.test.ts` | `(8 tests)` passed |
| FR-043 start world | `tests/engine/newGame.test.ts`, `lintGuard.test.ts` | `(3 tests)`, `(17 tests)` passed |
| FR-044 grain to canned food | `npx vitest run tests/engine/economicLoop.test.ts` | `(2 tests)` passed: 4 grain shipped, 1 eaten, 2 cans next turn; without the farm the order is refused |
| FR-045 two nations, 20 turns | `npx vitest run tests/engine/twoNations.test.ts` | `(4 tests)` passed; nation-1 made 32 lumber, 16 furniture, 2 fabric, 1 clothing; nation-2 19 fabric, 8 clothing, 6 lumber; 100 good meals and 40 sick meals each (no fruit on either fixture map), 0 starved, 0 rejected orders |
| All unit tests | `npx vitest run` | `Test Files 28 passed (28)` / `Tests 414 passed (414)` |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the `industrySlice` warning left with the file) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 2.1s`, `✓ Generating static pages (4/4)` |
| Smoke suite | `PORT=3127 npx playwright test --reporter=list` (3127 free) | `1 skipped` / `7 passed (23.1s)`, including `play-turns.spec.ts` with the new cash (10000, 9000, 8900, 8800) |

Rules gaps, defaults used (each `[NEEDS CLARIFICATION]` in `docs/requirements.md`):
- A4: every level-up 3 turns; prospecting $100. A6: the six mills and factories built; start
  warehouse grain 20, fruit, livestock, timber, cotton, wool, coal, iron ore, lumber, steel and
  canned food 10 each; 4 merchant holds. B3: rail on mountains $300. B6: canned food in batches
  of 2 (no single can for an odd labour unit); the production order when labour is short is
  steel, lumber, textile, food, refinery, metal works, furniture, clothing. B7: the untrained
  take the sick and starved places first; sickness lasts one turn. B8: migrants per turn
  max(1, floor(provinces / 4)). F6: depots not next to a depot, a port or the capital.

Decisions taken alone (safest default), each open to review:
- Objection: rail into hills, swamp and mountains needs a purchased technology (rules 04
  section 2), and v1 has no way to buy one, so in the app rail and depots now stop at hills.
  Faithful to an 1815 start; if v1 should allow it, drop the gate in `railTerrainAllowed`.
- Objection: `completed` / `completedOnTurn` are gone (FR-032). The rules do not block a tile
  for a turn after a job; the "done" mark now reads the last turn's events. A finished
  development no longer blocks a new one on that tile for a turn.
- Objection: cancelling refunds only a job ordered this turn (rules 03: "can be cancelled until
  End Turn"); a job from an earlier turn stops for nothing. Expansions have no cancel order yet.
- Objection: freight cars keep the M1 timing: ordered in a turn, built in that turn's
  production phase, and they already count for that turn's shipping (the rules say "next
  turn"; the player sees them next turn either way). Their materials are paid when ordered; a
  car the labour no longer covers is refunded.
- Objection: one `workers-fed` event replaces the planned `workers-sick` / `workers-starved`
  events (FR-040 row amended before its code); a good meal is not news.
- Objection: the fixture nations have no fruit on their maps, so 2 of 7 workers fall sick every
  turn in the 20-turn test. Kept: it exercises the sick path; the scripted player cans at most
  2 food a turn so workers keep raw food.
- Objection: `Worker.efficiency` stays, unused (rules 03 allow "remove or leave unused";
  removing it touches every fixture).
- Objection: the start nation's merchant marine is 4 holds (rules 01), was 5. The test nation of
  `testing/worldInit` keeps its old values (10 cars, grain/coal/iron stock).
- Objection: transport logic mismatches of rules 04 (river ports, depot on port, blockades, town
  development) are logic, not engine data, and stay for a later milestone.

Part B must do (UI, same branch):
- Capital dialog: a production card per building (`BUILDINGS`, `BUILDING_TEXT`) with sliders that
  send `setProduction` (show capacity, the other output's share, the red X for missing inputs;
  lowering always works), an Expand button (`expandBuilding`, cost = next step minus size, in
  lumber and steel), the refinery only after Oil Drilling. Today the cards are placeholders.
- Labour panel: `labourOf(nation)` total / committed / free (wired minimally now), workers by
  grade, sick workers, trainees; Trade School buttons (`trainWorkers`, cost $100 + 1 paper,
  $1,000 + 2 paper) and Capitol buttons (`recruitWorkers`, limit `migrantCap`).
- Freight cars: the capital's slider already sends `changeTransportCapacity`; its maximum now
  reads lumber, steel and free labour. Show the cost in lumber and steel.
- Food: a warning when the warehouse cannot feed the workforce; the news already shows sick and
  starved workers (`eventText` for `workers-fed`). Show the season and year (`seasonOf`).
- News text: `Produced 2 cannedFood.` shows the raw key; give commodities display names.
- Store call sites: none bypass orders; `CapitalModal` was changed only to compile (labour line,
  car maximum, electricity box removed). The e2e play test needs a production step.

How to see it in the app today (not checked by eye in this run; the Playwright smoke suite ran
against this checkout): `npm run dev`; the HUD starts at cash 10000 and year 1815; the capital
dialog shows "Labour (free / total): 12 / 12" and the freight-car slider (each car takes 1
lumber, 1 steel and 2 free labour, so at most 6 at the start). The news shows a food line only
when workers fall sick or starve. Production has no UI yet (part B).

## 2026-11-03 M2 part B: the economy in the UI

Size: L (milestone part). Night shift, one agent (Opus 5.5), no subagents, no advisor calls.
Detached on `origin/claude/m2-economic-loop` 33940df, pushed to that branch. `npm ci` clean.
Ultracode was not on for this session; it ran as one agent (build, tests, gate), no separate
review agent: the M2 review covers it.

Plan-lite:
- Change: capital dialog rebuilt as `CapitalModal` + `components/capital/` (view model, production
  card, labour panel, freight cars, CSS module; `IndustryCard` deleted); HUD date and food warning;
  commodity display names in news and the warehouse; `foodForecast` engine query; start
  technologies (Q8 default); an orchard next to every capital; the scripted player ships food first.
- Consumers: the player through the dialogs and HUD; the store selector `selectFoodForecast`;
  AI players through `foodForecast` and the same orders.
- Test rows: FR-046, FR-047 `tests/ui/capitalDialog.test.tsx` (every button's exact order, the
  state after it, refusals, no inline styles); FR-048, FR-050 `gameText`, `warehouseAndHud`;
  FR-049 `foodForecast` (forecast equals the meal resolveTurn serves, six worlds), `gameText`,
  `warehouseAndHud`; FR-051 `newGame`; FR-052 `twoNations`, `newGame`; FR-053 `e2e/play-turns`.
- Verify: `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`,
  `PORT=3131 SCREENSHOT_DIR=docs/journal npx playwright test --reporter=list`.
- Objection: `foodForecast` runs the whole turn's phases on a copy to read one number. It is exact
  and has no second copy of the rules, but it costs a full turn per game change in the HUD
  (memoized on `game`, a few ms on 40x40) and will grow with combat and trade.

Red summaries (tests written and run before the code):
- All new rows: `Test Files 5 failed | 26 passed (31)` / `Tests 39 failed | 414 passed (453)`;
  `TypeError: (0 , foodForecast) is not a function` (5), `(0 , dateText) is not a function`,
  `(0 , commodityName) is not a function`, `(0 , foodWarningText) is not a function`,
  `expected 'Produced 2 cannedFood.' to be 'Produced 2 Canned Food.'`,
  `Unable to find an element by: [data-testid="building-steelMill"]` (and labour-panel,
  freight-cars), `ENOENT ... scandir '...src\app\components\capital'`,
  `expected { id: 'compoundSteamEngine', …(1) } to deeply equal { Object (id, has) }`, and
  `expected 10 to be greater than 10` (the new game's fruit: the second "orchard" of the default
  map was under the river, so only one orchard fed the capital).
- FR-052 on the old fixture: `"sick": 2` at turn 10 (expected 0). With the orchard alone and the
  old scripted player it was still `"sick": 2` from turn 5: the greedy transport fill crowded the
  fruit out, so the scripted player now ships its workers' fruit and meat first (`mealNeeds`).
- Two older tests needed the orchard out of the way, not changed in meaning: FR-030 hills now set
  hills on that tile in the case setup; FR-044 removes the orchard's fruit as it removes the
  plains' grain.

Green summary: `npx vitest run` `Test Files 31 passed (31)` / `Tests 458 passed (458)` (+44).

Evidence:

| Claim | Command | Result (quoted) |
|---|---|---|
| Baseline at part A | `npx vitest run` | `Test Files 28 passed (28)` / `Tests 414 passed (414)` |
| FR-046, FR-047 capital dialog dispatch | `npx vitest run tests/ui/capitalDialog.test.tsx` | part of `tests/ui` `Tests 64 passed (64)`; 13 rows, each asserts the exact order sent and the game after it |
| FR-048 to FR-050 HUD, warehouse, names | `npx vitest run tests/ui` | `Test Files 5 passed (5)` / `Tests 64 passed (64)` |
| FR-049 food forecast | `npx vitest run tests/engine` | `Test Files 23 passed (23)` / `Tests 360 passed (360)` |
| FR-051, FR-052 start world, food balanced | same | included above (`newGame`, `twoNations`) |
| All unit tests | `npx vitest run` | `Test Files 31 passed (31)` / `Tests 458 passed (458)` |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same three as part A) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 4.6s`, `✓ Generating static pages (4/4)` |
| FR-053 and the smoke suite | `PORT=3131 SCREENSHOT_DIR=docs/journal npx playwright test --reporter=list` (3131 free) | `1 skipped` / `8 passed (29.5s)`, including `FR-053 order canned food in the capital, end turns until it is made, see it in the warehouse (7.0s)` |
| Screenshots | the same run | `docs/journal/m2-capital.png` (production cards, canned food 2 of 12), `docs/journal/m2-warehouse.png` (Canned Food 12, Summer 1815, "Produced 2 Canned Food.") |

Decisions taken alone (safest default), each open to review:
- Objection: decision Q8 default applied. A new game holds Compound Steam Engine, Iron Railroad
  Bridge and Dynamite as purchased (`START_TECHNOLOGIES`, start-state data; FR-051
  `[NEEDS CLARIFICATION]`). The technology state is one per game in v1, not per nation, so "each
  nation" is every nation of the game. The test fixtures keep no technology, so FR-030 still
  tests the gates.
- Objection: Testing Library and jsdom are new dev dependencies (`@testing-library/react`,
  `@testing-library/dom`, `jsdom`), so the dialog tests click real buttons. Component tests are
  `*.test.tsx` with a `@vitest-environment jsdom` line; Vitest skips the app's Tailwind PostCSS.
- Objection: the scripted player now ships fruit and meat before grain. Without it the fixture
  orchard's fruit lost the greedy transport fill from turn 5 on. This changes the headless
  games (FR-015, FR-045, FR-052 all green on the new runs).
- Objection: the fixture's fertile hills next to each capital became an orchard (fruit level 1),
  and every fixture orchard is now level 1. The default map's second capital orchard moved from
  under the river (it never existed on screen) to the south-west neighbour (19-21, was coast).
- Objection: the new game still has no livestock next to the capital: the meat eater lives on the
  start stock (10) and then on canned food; the food warning shows when that runs out. Kept, since
  it is the player's job to develop a ranch; say if v1 should start balanced on meat too.
- Objection: amount controls are − and + buttons, one batch per click, with "order of max" (max
  probed with `validateOrder`), not sliders: one click is one order and one refusal. A slider can
  come back later on top of the same view.
- Objection: news names a found resource in lower case ("Prospectors found iron ore") and a
  product in title case ("Produced 2 Canned Food."), as asked; both come from `COMMODITY_TEXT`.
- Objection: commits were split by topic after the gate passed on the whole tree; the
  intermediate commits were not gated one by one.

How to see it in the app: `npm run dev`; the HUD shows "Turn: 1" and "Spring 1815". Open Capital:
seven production cards (steel, lumber, textile, food processing, metal works, furniture,
clothing), each with inputs, "0 of N" and − / +, and Expand; the Labour panel and Transport on
the right. Press + on Canned Food (2 of 12), close, Advance Turn: the news says "Produced 2 Canned
Food." and the warehouse shows Canned Food 12 under Materials, Summer 1815 in the HUD.

## 2026-11-03 M2 review fix round

Size: M (one fix round over the M2 review findings). Night shift, one agent (Opus 5.5), no
subagents, no advisor calls. Detached on `origin/claude/m2-economic-loop` 539bb01, pushed to that
branch. `npm ci` clean. Baseline `npx vitest run`: `Test Files 31 passed (31)` / `Tests 458 passed (458)`.
Ultracode was not on; no separate review agent ran (the re-review of this delta is still due).

New rows FR-054 to FR-059 (`docs/requirements.md`, "M2 review fix round"); FR-041, FR-050, FR-051
and FR-052 are marked `replaced by` the rows that change them.

| Fix | FR | Red summary (test written and run before the code) | Commit |
|---|---|---|---|
| 1 Scripted player makes canned food | FR-054 | `Tests 1 failed \| 5 passed (6)`: `expected { nationId: 'nation-1', …(1) } to deeply equal …` (`cannedFood: false`). The "no sick worker from turn 1" row passed at once: it already held. | 7ca6703 |
| 2 Stale refusal in the capital | FR-055 | `Tests 1 failed \| 18 passed (19)`: `expected { order: { …(4) }, …(1) } to be null` | 3f7a56b |
| 3 No gold or gems in the warehouse | FR-056 | `Tests 2 failed \| 25 passed (27)`: `expected [ 'armaments', 'cannedFood', …(21) ] to deeply equal [ …(19) ]`, `expected [ … ] to have a length of 21 but got 23` | 7e48080 |
| 4 Cancel an expansion | FR-057 | engine `Tests 8 failed \| 58 passed (66)` (`expected { ok: true } to deeply equal { ok: false, reason: 'invalid-amount' }`, cancel-and-re-order state not equal); dialog `Tests 1 failed \| 13 passed (14)`: `Unable to find an accessible element with the role "button" and name "Cancel expansion of Steel mill"`. The food-processing cancel row passed at once (`invalid-target` already). | edb8f66 |
| 5 Training needs 1 free labour | FR-058 | `Tests 1 failed \| 66 passed (67)`: `expected { ok: false, …(1) } to deeply equal { ok: true }` (1 free labour, trainee of 2) | 661e299 |
| 6 Rules start technologies | FR-059 | `Tests 2 failed \| 5 passed (7)`: `expected { id: 'highPressureSteamEngine', …(1) } to deeply equal …`, `expected [ 'compoundSteamEngine', …(2) ] to deeply equal [ …(4) ]` | 36d5096 |
| 7 Rules files: stale mismatch notes | none (docs) | not a behaviour change | 5d75d32 |

Evidence:

| Claim | Command | Result (quoted) |
|---|---|---|
| FR-054 canned food, food balanced from turn 1 | `npx vitest run tests/engine/twoNations.test.ts` | `tests/engine/twoNations.test.ts (6 tests)` passed. A 20-turn probe (removed after use): nation-1 28 lumber, 14 furniture, 22 canned food; nation-2 15 fabric, 6 clothing, 20 canned food; 140 good meals each, 0 sick, 0 starved. The old scripted player on the same probe: no canned food, nation-2 6 fabric, 2 clothing. |
| FR-055 stale refusal | `npx vitest run tests/store/gameStore.test.ts` | `(19 tests)` passed |
| FR-056 warehouse list | `npx vitest run tests/ui` | `gameText.test.ts (22 tests)`, `warehouseAndHud.test.tsx (5 tests)` passed |
| FR-057 cancel expansion | `npx vitest run tests/engine/industry.test.ts tests/ui/capitalDialog.test.tsx` | `industry.test.ts (67 tests)`, `capitalDialog.test.tsx (14 tests)` passed; expand + cancel equals the start state, cancel 4 -> 8 refunds 4 lumber + 4 steel, re-order costs the same 4 |
| FR-058 training labour | `npx vitest run tests/engine/industry.test.ts` | included above |
| FR-059 start technologies | `npx vitest run tests/engine/newGame.test.ts` | `(7 tests)` passed |
| All unit tests | `npx vitest run` | `Test Files 31 passed (31)` / `Tests 472 passed (472)` (+14) |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same three as part A) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 1978ms`, `✓ Generating static pages (4/4)` |
| Smoke suite | `PORT=3133 npx playwright test --reporter=list` (3133 free, `PW_REUSE_SERVER` unset) | `1 skipped` / `8 passed (24.4s)` |

Decisions taken alone (safest default), each open to review:
- Objection: cancelling an expansion extends `expandBuilding` with an optional `delta` (default 1),
  as `trainWorkers` and `recruitWorkers` cancel with a negative delta, instead of a new
  `cancelExpansion` order. A negative delta removes this turn's steps, the last first; a positive
  delta above 1 orders several steps all or nothing. Pending capacity is always this turn's (the
  production phase applies it), so a cancel never touches an earlier turn's expansion.
- Objection: the scripted player now ships only the grain the warehouse lacks for one meal plus one
  canned-food batch, not half its capacity. With the extra fruit and meat on top of half the
  capacity as grain, nation-2's cotton lost the greedy fill and it made no fabric or clothing.
- Objection: training needs at least 1 free labour whatever the number of trainees (rules 05
  section 4: "at least 1 labour must be free to start"). A trainee whose labour was committed
  leaves production short; the production phase clamps the orders, as it does for sick workers.
- Objection: High Pressure Steam Engine and Seed Drill gate nothing in the code yet (flat rail and
  level-1 farms need no technology check); they are start-state data only.
- Objection: rules files 02 and 04 still list the gold and gems price mismatch and 02 the
  `RESOURCE_VALUES` mismatch. Both were fixed before M2 (commit bce7a95, M1), so this M2-only
  pass left those lines as they are.
- Not changed, decision Q9 for Nathan: freight cars count for this turn's shipping (FR-039); the
  rules say next turn.

How to see it in the app: `npm run dev`; Open Capital: each capped card has Expand and Cancel;
Cancel is greyed out until Expand is pressed, and after Cancel the card shows "Capacity 2" and the
lumber and steel are back. A refusal from the map (for example a prospect without cash) no longer
shows at the top of the capital dialog. The warehouse has no Gold or Gems rows.
