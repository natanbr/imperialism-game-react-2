# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0, M1 and M2 are merged into `main` (PR 9, 10, 12, 13). Their entries are archived in
  `docs/journal/archive-M1.md` and `docs/journal/archive-M2.md`.
- M3 part A (engine) in progress 2026-11-03 on `claude/m3-money-and-score` from `origin/main`
  1b0923f: world market (sell, buy, cargo holds, drifting prices), score, game over after 40 turns.
  FR-060 to FR-072. Part B (UI: market dialog, HUD score, game-over screen) follows on this branch.
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
