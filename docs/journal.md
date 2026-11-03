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
- Next: M2 part B (UI, same branch, entry "M2 part A", section "Part B must do"), then one M2
  review (Opus 5.5 high: engine-wide change) over `3cef865..HEAD`, then the PRs (M1 first).
  Read the M2 part A objections first: food rounding and who goes hungry, rail tech gates.

Carried forward:
- M2 part B: UI for production, buildings, labour, food, training, migration (list in the entry).
- M3 or later: river ports and the depot-on-port rule (rules 04 CODE MISMATCH, logic, not data);
  world prices (06); University fees; the power plant.
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
