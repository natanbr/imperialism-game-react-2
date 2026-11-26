# Task 55 — Town development in the map and Capital

Size M. Branch `claude/m18h-towns`. T-04 covers FR-621–625. Open a province seat or another tile in that province to see its town. In Capital → Transport, **Town income** shows next settlement's offers before freight and the previous turn's warehouse deliveries. The five build defaults are **inferred, owner to confirm**. [Town specification](../specs/m18h-towns.md)

## The same shipment in five views

The desktop fixture starts on turn 6 with five completed connected settlements, a size-four Furniture factory, one car and zero furniture in stock. The browser uses the map's arrow keys and Enter, orders an expansion in Industry and assigns the car through the Transport sliders.

| Resolved turn | Testland South-East offered | Transport and News | Capital and Warehouse |
|---|---|---|---|
| 6 | 1 lumber from the first mature tier | The car was assigned to lumber. News recorded 1 of 1 lumber. | The Capital had forecast 1 lumber. Furniture stock was 0. |
| 7 | 1 lumber | The car delivered 1 of 1 lumber. | The factory expansion from 4 to 8 completed. The town earned the first of two qualifying settlements for the next tier. |
| 8 | 2 lumber and 1 furniture | The car was reassigned to furniture. News recorded 0 of 2 lumber and 1 of 1 furniture. | Capital showed the same turn-8 receipt. Warehouse furniture rose to 1. Continue restored all three dated receipts and the same stock. |

A second browser fixture checked two towns sharing six cars on the same turn. Grain and Fish took one car each. The Transport sliders showed 1 of 1 fabric, 2 of 4 lumber and 1 of 2 furniture scheduled. West delivered 1 fabric, 2 lumber and 1 furniture. East delivered 0 of 2 lumber and 0 of 1 furniture. News and Capital displayed both receipts, including East's shortfall. Warehouse stock rose by the three scheduled amounts. [Browser receipts](task-55/receipts.json) · [Two-town browser check](../../.gate/codex/55/competing-browser.log)

Map stages describe the current town. Tile Info also shows the next settlement's output, connected route, known tiles, installed capacities, earned tier and unfinished growth. A never-served seat is idle. A previously served seat with a closed route is disconnected and retains progress. The map keeps one keyboard tab stop. Its seat description supplements the terrain and owner name. Foreign seats expose only public geography in Normal and Demo.

Desktop evidence covers the producing seat, the one-car allocation and the resulting receipt. Phone evidence shows the developing town with its requirements expanded and the first material in Capital. [Desktop map](task-55/town-map-desktop.png) · [Transport](task-55/town-transport.png) · [Capital receipt](task-55/town-capital.png) · [Phone inspection](task-55/town-inspection-phone.png) · [Phone Capital](task-55/town-capital-phone.png)

## Protected campaigns

Neither fixed suite produced a town for either player. Both use the same four Two islands seeds, which have zero provinces. Of the 72 random games, 33 produced from 39 towns. The first producing turns ranged from 11 to 38. The computer had 25 producing towns across policies. Its opponent had seven under the scripted policy, seven under the diplomat policy and none under the idle policy.

All 575 receipts recorded zero deliveries from 778 units offered. The actual allocations gave every available car to ordinary freight. The idle player's three final-goods factories remained at capacity 1, below the first threshold of 4. [Both players' first producing turns in every game](task-55-campaigns.md)

## Verification and handoff

| Check | Observed evidence |
|---|---|
| Tests first | Local commit `5a64064` contains three test files. Against T-03, the final component cases produced 14 failures and three passes. Both browser cases selected the seat with the keyboard and failed on its missing town region. The isolated red browser run used Webpack because Turbopack exceeded Windows' path limit in the nested snapshot. [Component failures](../../.gate/codex/55/red-final-unit.log) · [Keyboard browser failures](../../.gate/codex/55/red-keyboard-browser.log) |
| Functional suite | `npm test -- --reporter=verbose` passed 3,578/3,579 tests. All 17 town view cases passed. The sole failure was the inherited NR-038 turn-10 save digest, identical to the T-02/T-03 result. [Functional log](../../.gate/codex/55/unit-final.log) |
| Static checks | `npm run lint` exited 0 with one existing unused-variable warning in the logistics test. `npx tsc --noEmit` and `npm run build` exited 0. The production build generated four static pages. [Lint](../../.gate/codex/55/lint-final.log) · [Types](../../.gate/codex/55/types.log) · [Build](../../.gate/codex/55/build.log) |
| Layout regression | The first affected browser run placed News at 728.1875 px with the capital's seven workers selected. Its existing limit was 684.5 px. The founding-capital exception now fits on one line and expands to show details. The original News spec passed both cases. [First measurement](../../.gate/codex/55/browser.log) · [Focused rerun](../../.gate/codex/55/capital-news-browser.log) |
| Final affected browser suite | 70/70 passed across 18 Chromium specs, on port 3123 with one worker. FR-339 first paint used 20 pack requests and 1,990,043 bytes. Desktop and 390 px keyboard inspection, competing map controls, Capital, Transport, News and Continue passed. The separate two-town browser case passed 1/1 on the same port. [Final browser run](../../.gate/codex/55/browser-final.log) · [Two-town run](../../.gate/codex/55/competing-browser.log) |
| Information parity and read-only inspection | Paired Normal and Demo positions vary rival resources under survey, expansion, allocation, stock, progress, unresolved Orders and receipt. Tests compare displayed and accessible content, including range values. Capital retains a receipt addressed to its viewer after a transfer. Opening and closing it preserves the game, Order queue and report. [Map and Tile Info cases](../../tests/ui/townInspection.test.tsx) · [Capital, Transport and News cases](../../tests/ui/townFreight.test.tsx) |
| Protected comparisons | Four Two islands digests, 12 score/rail checkpoints, FR-260, Council, privacy, save measurements and all 72 FR-597 records match Task 54. Minimum FR-125 was 690/450 (1.533×). FR-545 had 15/24 peaceful wins, 12 with a paid grant. FR-546 had 17/24 earned-vote games. FR-497 had 0/280 changed plans. FR-260 had 160 healthy meals and zero unpaid losses. FR-597 accepted all 37,557 Orders over 2,810 turns, with zero invariant violations, zero idle unpaid losses and zero changed plans in 940 probes. [Task 54 comparison](../../.gate/codex/54/candidate-guards.json) · [Task 55 comparison](../../.gate/codex/55/candidate-guards.json) |

T-05 owns the full single-worker Playwright suite, the isolated performance run, the roadmap check and the historical save-hash re-record under FR-626/627. The historical-save test still expects the M18d digest. T-02 isolated its change to the rules-revision marker. [Turn-10 and turn-11 hashes](task-53-m18h.md#protected-historical-save-comparison-for-t-05)
