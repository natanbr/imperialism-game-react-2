# Task 56 — M18h protected results

Task 52 captured the base before the first engine change. Its revision, `50a7441`, differs from merged M18d `0b98682` only in the requirements ledger and town specification. The comparisons use the original worlds, seeds, policies, turn boundaries and thresholds. [Base records](../../.gate/codex/52/base-guards.json) · [Base functional output](../../.gate/codex/52/base-unit.log)

## Changes authorised under Q103 and FR-627

**NR-038, FR-587 and FR-626.** In the seed-7 Continent game with a 400-turn limit, neither saved position has town progress or receipts. Settlement records `m18h` in `game.rulesRevision` so Continue and replay can distinguish an earlier rules boundary. Replacing that field with `m18d` reproduces each original digest. The test asserts both digests on each turn using the same serialization as the M18d pin. The turn-10 Council and replay still resolve on the original schedule. [Historical save assertions](../../tests/store/randomMapReplay.test.ts) · [T-05 focused run](../../.gate/codex/56/focused-saves.log)

| Saved turn | M18d SHA-256 | M18h SHA-256 |
|---|---|---|
| 10, before Council | `e842158982c0889a30494b72cdd0bffcc6f85c2836f2bbb9619a0339fc282b05` | `1cd5a212843f098b0fa773e108ac6977e5b5658eceb9496ae066dcb6d799219d` |
| 11, after Council | `15436a8c378d346598bda6ca9b41ac8aac1b14d9ec62981ee4638e2f63b8f847` | `78f6ae8d549f9361e8c46251b4f5e1a468a00bfc5582132936583218cf602b22` |

**FR-357, FR-587, FR-622 and FR-626.** These measurements use the browser's compact v1 serializer. T-05 repeated both historical size fixtures, measured the space used by the receipts, then removed town progress and restored the old revision in a comparison copy. Every resulting length matched M18d. The 18-character checkpoint entry removes progress when reconstructing the original saved position. All the receipts in these samples had zero delivery. [Size test and original bounds](../../tests/store/historicalSaveSize.test.ts) · [T-05 isolation results](../../.gate/codex/56/save-size.log)

| Saved position | M18d → M18h characters | Progress | Checkpoint entry | Receipts |
|---|---:|---:|---:|---:|
| Historical Continent, T11 | 111,446 → 111,446 | 0 | 0 | 0 |
| Historical Continent, T40 | 201,597 → 204,351 | 186 | 18 | 2,550 from 14 |
| Large random seed 1, before resolving T40 | 246,942 → 249,543 | 185 | 18 | 2,398 from 11 |
| Large random seed 1, after resolving T40 | 251,943 → 254,762 | 185 | 18 | 2,616 from 12 |

Historical Continent's replay overhead was 2,370 → 2,370 at T11 and 10,854 → 10,872 at T40 against a 74,591-character full checkpoint. The original tests continue to require replay overhead below half the full checkpoint and a Large save below 2,000,000 characters.

## Gameplay on the original inputs

The T-05 functional suite passed 3,579 tests. Comparing the extracted T-05 values with Task 52 matched every field in all ten gameplay sections, including all 72 complete FR-597 records and six policy/size summaries. The remaining section contains the save measurements above. The final run after the marker fix also matches Task 55 byte for byte, SHA-256 `9e1fbdb17ac1b971165f0d2ee063e4c5291f11fc8136be6ae4c2ea2b36ad704d`. [Final candidate records](../../.gate/codex/56/candidate-guards-final.json) · [Final functional output](../../.gate/codex/56/unit-final.log)

| Guard | M18d and M18h results |
|---|---|
| FR-124/125 and FR-464 | All 12 scripted/frozen score and rail checkpoints matched, including the minimum 690/450 = 1.533× at seed 3, turn 15. All four Two islands Order digests, counts, final scores and frozen dead-end locations matched. Two islands has zero provinces. |
| FR-545, FR-546 and FR-497 | 15/24 peaceful wins, including 12 with a paid grant. The computer earned a minor vote in 17/24 idle games. Removing the other player's private Orders changed 0/280 plans. |
| FR-597 | All 37,557 computer Orders were accepted over 2,810 turns. Zero invariant failures, zero unpaid losses in the 940 idle turns and zero changed plans in 940 privacy probes. The 50 unpaid disbands across the non-idle policies matched on each seed. |
| NR-038 and freight | All four serialized seed-7 fixed-start digests matched their M18d pins. The original freight assertions passed, including explicit zero targets, automatic Fish, and direct cash payments of $200 for Gold and $500 for Gems. |
| FR-339 | At 1280×720, first paint used 20 pack requests and 1,990,043 bytes on both revisions. The limits remain 20 and 2,050,000. [Base browser](../../.gate/codex/52/base-browser.log) · [T-05 browser](../../.gate/codex/56/browser-affected.log) |

Task 55 measured why the 72 generated games can match while towns produce. In 33 games, 39 towns offered 778 units across 575 receipts. Ordinary tile and fishing freight occupied all available cars on those settlements, so no town units reached a warehouse. The six-car controlled fixture gives town freight capacity and checks the actual warehouse increments. [First producing turn for each owner and seed](task-55-campaigns.md) · [Controlled freight comparison](task-55-m18h.md#the-same-shipment-in-five-views)

### Fixed Continent campaign

T-05 ran the existing FR-260 test's `play` function against a Git archive of `0b98682` and the candidate. Both used the world market, scripted nation 2, idle nation 1 and 40 turns. Each seed's two JSON records matched byte for byte. They include both nations' score components, cash, stock, resources and rail links on every turn, every submitted Order, refusals, worker health, invariant checks, army payroll, unpaid losses, Council results and final score. All 160 observed meals had zero sick and starved workers. All 2,230 Orders were accepted and unpaid losses were zero. [Base run](../../.gate/codex/56/continent-base.log) · [Candidate run](../../.gate/codex/56/continent-candidate.log)

| Seed | Orders | Final nation 2 score | SHA-256 on both revisions |
|---:|---:|---:|---|
| 1 | 577 | 1,207 | `d515271c38cbd645412a0819f37cb3816eae99b8885ad6b6f65588ad29ffce27` |
| 2 | 532 | 1,225 | `2691d676eb3245acb3917d22f861692a648bacea0395f61af4995f7fa4b2c0b9` |
| 3 | 554 | 1,317 | `0fd2e9acefd0b46dee94985ee36984f3fee42646aa5786bfcd24975deb42b2cb` |
| 4 | 567 | 1,330 | `2195b993b39d246eac3335b6dbb9e87cee65b5a6108099c2ec46dae0445f8901` |
