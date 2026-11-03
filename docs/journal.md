# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0, M1 and M2 are merged into `main` (PR 9, 10, 12, 13). Their entries are archived in
  `docs/journal/archive-M1.md` and `docs/journal/archive-M2.md`.
- M3 part A (engine) done 2026-11-03 on `claude/m3-money-and-score` from `origin/main` 1b0923f,
  pushed, no PR: world market (sell, buy, cargo holds, drifting prices), score, game over after 40
  turns, scripted player trades. FR-060 to FR-072 tested, `npx vitest run` 559 green. Not run:
  Playwright, review. Next: part B (UI: market dialog, HUD score, game-over screen; list below).
- Open decisions: Q9 (freight-car timing, from M2) and Q10 to Q15 (M3, below); each runs on its default.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- M4: an order log in the store, UI orders queued into `resolveTurn` (replay of a played game); the
  second nation trades on the same world market (the market already keeps orders per nation).
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
`newGame` import of a test fixture (both settled in M2 part A).

## 2026-11-03 M2 economic loop (archived)

Entries in `docs/journal/archive-M2.md`. Production buildings with capacity and standing orders,
recipes, labour, food and sickness, training, migration, freight cars from lumber + steel + labour,
the Spring 1815 calendar, real job durations and costs; the engine owns the start world; capital
dialog, HUD date and food warning. FR-027 to FR-059 tested; 472 unit tests, Playwright 8 passed,
1 skipped. Merged as PR 13. Open: decision Q9 (freight cars count this turn; the rules say next turn).

## 2026-11-03 M3 part A: money and score, engine only

Size: L (milestone part). Night shift, one agent (Opus 5.5), no subagents, no advisor calls.
Branch `claude/m3-money-and-score` from `origin/main` 1b0923f. `npm ci` clean. Baseline
`npx vitest run`: `Test Files 31 passed (31)` / `Tests 472 passed (472)`. Ultracode was not on.

### Decision cards for Nathan

Each card runs on its default (marked 💡) until Nathan decides. The rows that use it say
`[NEEDS CLARIFICATION] decision Q…` in `docs/requirements.md`.

**Q10** 🧠 **Should recruiting a migrant also cost cash?**
- Found: rules 05 section 4 price a migrant at 1 canned food + 1 clothing + 1 furniture and no cash
  (FR-042). The plan says "recruitment and training cost money"; training already costs cash (FR-058).
- Options: (a) goods only, as the rules; the three goods are tradeable, so a migrant costs about
  $1,900 at start prices when bought (100 + 900 + 900). (b) A cash fee per migrant on top (for
  example $100), not in the rules. (c) The Capitol buys missing goods by itself at the market price
  (skips the holds and the next-turn delivery).
- 💡 (a): faithful, and the market already turns the goods into money (FR-066).

**Q11** 🧠 **Which weights should the score use?**
- Found: the original formula is unknown (gaps A7); the plan says treasury + industrial capacity +
  developed tiles, which need weights to be comparable ($10,000 against 9 capacity points).
- Default: 1 point per $100 of cash + 10 per capacity point of the mills, factories and refinery +
  10 per resource level on the nation's tiles. A fixture nation at the start: 100 + 90 + 30 = 220.
- Options: (a) the default. (b) Money-equivalent weights: a level counts its development cost
  ($100, $1,000, $5,000 = 1, 10, 50 points), a capacity point its lumber + steel at market price
  (about 6 points). (c) Add the warehouse stock at market price.
- What it means: with (a) a level-3 job ($5,000 = 50 cash points for 10 level points) lowers the
  score unless its output pays back before game over; with (b) no job lowers it; with (c) hoarding
  counts as much as selling.
- 💡 (a) for v1: easy to read in the HUD. Switch to (b) if level 3 feels punished in play.

**Q12** 🧠 **How long should a v1 game last?**
- Found: rules 01: a full game is about 400 turns (Spring 1815 to 1915) with Council votes from
  1825; v1 has no Council.
- Options: (a) 40 turns: Spring 1815 to Winter 1824, ends just before the first Council meeting.
  (b) 80 turns, to Winter 1834. (c) 400 turns. Any length is one `newGame({ seed, turnLimit })`
  option.
- 💡 (a) 40.

**Q13** 🧠 **Is this price model good enough for v1?**
- Found: rules 06: prices follow world supply and demand and start near $100 (resources), $300
  (materials) and $900 (goods); the formula is unknown (gaps A1). There are no Minor Nations in v1,
  so the market is an unlimited buyer and seller.
- Default: start prices resources $100 (horses $300), materials $300 (canned food $100), goods $900;
  each turn a seeded random drift of up to 3% either way, plus 0.5% per unit bought and minus 0.5%
  per unit sold by all nations (at most 3% either way); bounds 50% to 250% of the start price; no
  climb over the years.
- Options: (a) the default. (b) Add the slow climb of goods prices the original shows (goods above
  $1,500 later). (c) Fixed prices.
- 💡 (a) now; (b) once Minor Nations exist.

**Q14** 🧠 **Should cargo holds limit trade in v1?**
- Found: rules 06 section 3: each unit bought or sold takes one cargo hold for the turn; a Normal
  game starts with 4 holds and ships from the Shipyard add more. v1 has no Shipyard.
- Options: (a) yes: at most `holds` units a turn (4 in a new game; the test fixtures have 5 and 3),
  never growing in v1; trade is a side income of at most about $3,600 a turn from goods. (b) No
  limit: a nation could sell its whole warehouse every turn. (c) A larger fixed number (for example
  12) until a Shipyard exists.
- 💡 (a); (c) if part B's play feels slow.

**Q15** 🧠 **Should trade orders repeat every turn?**
- Found: rules 06: offers and bids persist between turns until changed.
- Default: they last one turn. Goods and cash are taken when ordered, as for every other order, so
  a standing offer would have to take them again next turn and could fail without the player
  seeing it.
- Options: (a) one turn. (b) Standing orders that re-apply each turn as far as stock, cash and
  holds allow (needs a "sold less because" report). (c) (a) plus a "repeat last turn's trades"
  button in part B (no engine change).
- 💡 (a), with (c) in part B.

### Plan

Plan-lite:
- Change: a world market in the state (prices, this turn's orders and the purchases on their way
  by nation), two orders (`sellCommodity`, `buyCommodity`), the trade phase filled in (deals, then
  price drift) and a delivery step after logistics; a pure score query; a turn limit with a
  game-over record, a `game-over` refusal and a no-op `resolveTurn` after the end; the scripted
  player sells surplus and buys missing inputs.
- Consumers: part B (market dialog, HUD score, game-over screen) through `submitOrder` and the
  engine queries; M4's second nation trades on the same market; v3 AI players through the orders.
- Test rows: below. Verify: `npx vitest run tests/engine/market.test.ts tests/engine/score.test.ts
  tests/engine/gameOver.test.ts tests/engine/twoNations.test.ts`, then the full gate.
- Objection: with no Minor Nations the market is an unlimited counterparty with a random-walk
  price, so prices hardly answer a player's strategy; and the 4-hold limit (Q14) keeps trade small.
  Both are cheap to change later because the deals and the price step are one system each.

Tasks (all by this agent, Opus 5.5; the FLOW table would give engine work to Opus xhigh and tests
to Sonnet high, but this run has no subagents):
- T-01 [test+impl] [FR-060, FR-061, FR-062, FR-063, FR-064, FR-065, FR-072] world market: types,
  price table, orders, trade phase, delivery, drift, news lines.
- T-02 [test] [FR-066] recruitment through the market (no engine change expected).
- T-03 [test+impl] [FR-067, FR-068, FR-069, FR-072] score, turn limit, game over.
- T-04 [test+impl] [FR-070, FR-071] scripted player trades; the 40-turn two-nation game.
- T-05 [docs] ARCHITECTURE, rules notes, evidence table.

| FR | Test file | What the test asserts |
|---|---|---|
| FR-060 | `tests/engine/market.test.ts` | the tradeable list (no raw food, gold, gems), start prices by class, `marketOf` on a state without a market, newGame and the fixture start with the start market |
| FR-061 | `tests/engine/market.test.ts`, `validate.test.ts` | every refusal reason, goods leave when ordered, lowering returns them, offer + cancel equals the start state |
| FR-062 | `tests/engine/market.test.ts`, `validate.test.ts` | every refusal reason incl. the 4-bid limit, paid at the world price, refund on lowering |
| FR-063 | `tests/engine/market.test.ts` | holds shared by sales and bids, `tradeCapacityOf` |
| FR-064 | `tests/engine/market.test.ts` | cash after the turn, events, bought timber not used by this turn's production but in stock after, bought canned food feeds the meal, orders cleared |
| FR-065 | `tests/engine/market.test.ts` | drift within 3%, push of 0.5% per unit capped at 3% (same seed with and without trade), bounds, same seed same prices, another seed other prices, one draw per commodity |
| FR-066 | `tests/engine/market.test.ts` | buy canned food, clothing, furniture with an empty warehouse; recruit refused before, accepted after the turn; no cash in the migrant cost; training still costs $100 |
| FR-067 | `tests/engine/score.test.ts` | the fixture score 220, each part, pending capacity, refinery, food processing, levels, other nations' tiles, ranking and ties |
| FR-068 | `tests/engine/gameOver.test.ts` | turnLimit default and option, game over exactly after turn 40, record and event order, turn limit 1 |
| FR-069 | `tests/engine/gameOver.test.ts` | every order refused with `game-over`, `resolveTurn` returns the same object and reports the orders |
| FR-070 | `tests/engine/twoNations.test.ts` | the scripted player's turn-1 trade orders (bids for missing inputs, no canned food offered) and FR-016 still holds |
| FR-071 | `tests/engine/twoNations.test.ts` | 40 turns: sales and bids for both nations, invariants, game over with two scores, 41st resolve no-op, replay deep-equal |
| FR-072 | `tests/ui/gameText.test.ts` | the news lines and the refusal text |

### Tasks, red summaries, commits

The run was paused once by Nathan between T-01's code and its gate and resumed in the same
worktree; nothing was lost. T-02 (FR-066) needed no engine code: its rows are in
`market.test.ts` and went red and green with T-01.

| Task | FR | Red summary (tests written and run before the code) | Commit |
|---|---|---|---|
| T-01 world market | FR-060 to FR-066, FR-072 | `Test Files 3 failed (3)` / `Tests 52 failed \| 118 passed (170)`: unknown order kinds refused (`expected { ok: false, reason: 'invalid-target' } to deeply equal { ok: true }`), stubs `Error: not implemented (M3 T-01)`, `expected undefined to be 'Sold 2 Furniture for $1,800.'`. The price-table rows passed at once (data written with the stubs). | 7942faa |
| T-03 score, game over | FR-067 to FR-069, FR-072 | `Test Files 3 failed (3)` / `Tests 16 failed \| 26 passed (42)`: `Error: not implemented (M3 T-03)`, `expected undefined to be 40`, `expected undefined to be 'Game over at the end of Winter 1824.'`. One expectation of mine was wrong (the fixture's 50 timber make the lumber order valid before the end) and was corrected before the code. | b9eb801 |
| T-04 scripted player trades, 40 turns | FR-070, FR-071 | `Test Files 1 failed (1)` / `Tests 3 failed \| 9 passed (12)`: `expected [] to deeply equal [ Array(2) ]` (no trade orders). The game-over, 41st-resolve and replay rows passed at once (T-03 made them true). Then the new trading broke FR-054: `Tests 1 failed \| 15 passed (16)`, nation-1 made no canned food in 20 turns (a probe showed kept mill orders, 10 labour, plus the freight car took all 12 labour). Fixed by planning production afresh each turn (FR-070 row updated). | b0c32ce |
| T-05 docs | none | ARCHITECTURE (orders, turn flow, randomness, new market/score/game-over section), rules 01 and 06 notes, requirement statuses, this entry | this commit |

### Evidence

| Claim | Command | Result (quoted) |
|---|---|---|
| Baseline before M3 | `npx vitest run` | `Test Files 31 passed (31)` / `Tests 472 passed (472)` |
| FR-060 to FR-066 covered | `npx vitest run tests/engine/market.test.ts tests/engine/validate.test.ts tests/ui/gameText.test.ts tests/engine/purity.test.ts` | `Test Files 4 passed (4)` / `Tests 175 passed (175)`; `market.test.ts (59 tests)` |
| FR-067 to FR-069 covered | `npx vitest run` (T-03 gate) | `Test Files 34 passed (34)` / `Tests 553 passed (553)`; `gameOver.test.ts (9 tests)`, `score.test.ts (8 tests)` |
| FR-070, FR-071 covered; FR-014, FR-054 still hold | `npx vitest run tests/engine/twoNations.test.ts tests/engine/determinism.test.ts` | `Tests 17 passed (17)` (with the probe below); `twoNations.test.ts (12 tests)` |
| 40-turn game result | a probe test (removed after use) on `play(newGame(11), 40)` | game over turn 40, 1824; state turn 41, 1825. nation-2 476 (cash $3,680 = 36, capacity 9 = 90, 35 levels = 350), nation-1 453 ($1,392 = 13, 90, 350). nation-1 sold 74 units for $21,210 (lumber 38, steel 18, fabric 15, ...) and bought 123 (coal 62, iron ore 61) for $16,768; nation-2 sold 37 for $13,614 (fabric 27, hardware 7, ...) and bought 83 for $11,234. Final prices: iron ore 190, coal 145 (bought), lumber 233, fabric 227 (sold). `replayIdentical: true` |
| All unit tests | `npx vitest run` | `Test Files 34 passed (34)` / `Tests 559 passed (559)` (+87) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the same three as M2) |
| Build | `npm run build` | `✓ Compiled successfully in 3.8s`, `✓ Generating static pages (4/4)` |
| Smoke suite | not run | part A changes no UI beyond three news lines and two refusal words; part B runs it |

### Decisions taken alone (safest default), each open to review

- Objection: the market lives in `GameState.market` as an optional field (with `marketOf` giving
  the start market), as do `turnLimit` and `gameOver`. Required fields would have meant editing
  about twenty hand-built test states outside this task. `newGame` and the fixture always set them.
- Objection: trade orders take goods and cash when ordered and last one turn (Q15). This keeps the
  engine's one rule "an order's effects happen when it is applied" and makes the deal price exact,
  because prices only change in the trade phase.
- Objection: bought units go through `market.deliveries` and a delivery step after logistics, not
  straight into the warehouse in phase 2, so production cannot use them in the turn they are bought
  (rules 06) and phase 5 (interceptions) has a place to cancel deliveries later.
- Objection: after game over `resolveTurn` returns the very same object rather than throwing, so
  the store's End Turn cannot crash; the given orders are reported as refused so nothing is silent.
  The clock still advances on the last turn (state turn 41, Spring 1825); `gameOver.turn` is 40.
- Objection: the scripted player now re-plans its production every turn (FR-070). It was the
  smallest change that keeps FR-054 true with trading; its standing orders no longer carry over.

### Hand-off to part B (UI)

Engine API (all from `@/engine` unless noted):
- Orders: `{ kind: "sellCommodity", nationId, commodity, amount }` and
  `{ kind: "buyCommodity", nationId, commodity, amount }`; `amount` is this turn's total for that
  commodity (0 cancels). Refusals: `invalid-target`, `invalid-amount`, `insufficient-resources`,
  `insufficient-funds`, `limit-reached`, and `game-over` for every order after the end.
- Queries: `marketOf(state)` → `{ prices, orders, deliveries }`; `priceOf(market, commodity)`;
  `tradeOrdersOf(state, nationId)` → `{ sell, buy }`; `tradeCapacityOf(state, nationId)` →
  `{ holds, used, free }`; `isTradeCommodity(key)`; `scoreOf(state, nationId)` → `{ nationId,
  treasury, capacity, developedLevels, points: { treasury, industry, development }, total }`;
  `scoreTable(state)` (ranked); `turnLimitOf(state)`; `isGameOver(state)`; `state.gameOver` →
  `{ turn, year, scores }`. Lists: `TRADE_COMMODITIES`, `START_PRICES`, `MAX_BUY_BIDS` in
  `@/definisions/marketPrices`; weights `SCORE_WEIGHTS` in `@/definisions/scoreWeights`.
- Events: `goods-sold { nationId, commodity, amount, price, income }`, `goods-bought { nationId,
  commodity, amount, price, cost }`, `game-over { turn, year, scores }` (after `turn-ended`). News
  lines exist in `components/gameText.ts` (FR-072).
- To build: a market dialog (prices, stock, this turn's offer and bid per commodity, holds used and
  free, the most the engine accepts, refusals in plain words); the HUD score (`scoreOf` for the
  active nation, maybe "turn N of 40"); a game-over screen from `state.gameOver` (ranked scores
  with their three parts), with End Turn disabled after the end (the store's `advanceTurn` would
  otherwise log an empty report).
