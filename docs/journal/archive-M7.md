# Journal archive: M7 Nation-to-nation trade

Moved from `docs/journal.md` on 2026-11-13 during M7 (FLOW: the journal stays under 400 lines; the review of the QA
fix round needed room before the milestone ends). The two finished entries, the engine half and the UI half, are
unchanged; the review fix round, the QA fix round and what follows stay in the journal until M7 is merged.

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
