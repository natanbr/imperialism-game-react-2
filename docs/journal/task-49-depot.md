# Task 49 — Depot budget and the turn-15 rail checkpoint

Size S. Three new FR-125 / FR-454 cases replay the two-islands campaigns for seeds 1, 3 and 4 with the human idle. Each case checks when the computer orders the depot at 20-10 and which rail tiles have a single link at the end of turn 15. A one-link tile counts as a dead end unless it is a capital, depot or port. [Regression test](../../tests/engine/scriptedScore.test.ts)

## Before and after the depot cash check

Both runs had coastal fishing enabled. On all three seeds the computer started the depot at 18-12 on turn 7 and joined it on turn 11. Its next depot at 20-10 cost $2,000. The five developers needed $100 each, bringing the cash required to start construction to $2,500. The table gives treasury balances after the economy orders and before the civilians acted.

| Seed | Turn 12 cash, both runs | Gate removed | Gate enabled |
|---|---:|---|---|
| 1 | $2,490 | Start 20-10 on turn 12 | Wait, then start with $3,601 on turn 13 |
| 3 | $2,297 | Start 20-10 on turn 12 | Wait, then start with $2,645 on turn 13 |
| 4 | $2,449 | Start 20-10 on turn 12 | Wait, then start with $3,514 on turn 13 |
| 2 (control) | $1,964 | Wait, then start with $2,896 on turn 13 | Same |

The three affected seeds followed the same path. Link counts are for the computer's whole railway after settlement.

| Turn | Gate removed | Gate enabled |
|---|---|---|
| 12 | Start the depot at 20-10 | Wait |
| 13 | Continue construction | Start the depot at 20-10 |
| 14 | Finish the depot | Continue construction |
| **15** | **Lay 18-12 → 18-11. Six links, one dead end at 18-11.** | **Finish the depot. Five links, zero dead ends.** |
| 16 | Extend to 19-10. Seven links, one tip at 19-10. | Lay 18-12 → 18-11. Six links, one tip at 18-11. |
| 17 | Join the depot at 20-10. Eight links, zero dead ends. | Extend to 19-10. Seven links, one tip at 19-10. |
| 18 | The depot stays joined. Eight links, zero dead ends. | Join the depot at 20-10. Eight links, zero dead ends. |

Seed 2 joined on turn 18 in both runs. Every order was accepted in all eight 18-turn runs. The existing FR-125 check permits temporary rail tips between its turn-15, 25 and 40 checkpoints. [All turns with the gate removed](../../.gate/codex/49/depot-trace-removed.json) · [All turns with the gate enabled](../../.gate/codex/49/depot-trace-enabled.json)

## Mutation evidence

The Vitest transform removed only the early return comparing the treasury with `CONSTRUCTION_COST.depot + reserve` in `engineerOrders`. Both variants used the same game and test files. The three new cases failed with `startTurn: 12` and `deadEnds: ["18,11"]`. With the gate enabled all three passed with `startTurn: 13` and `deadEnds: []`. The separate trace probe passed in both runs. [Mutation config](../../.gate/codex/49/depot-trace.config.ts) · [Red result](../../.gate/codex/49/depot-mutation-red-focused.log) · [Green result](../../.gate/codex/49/depot-mutation-green.log)

Under the ordinary Vitest config, `npm test -- tests/engine/scriptedScore.test.ts tests/engine/depotBudget.test.ts` reported **55 passed (55)**. [Production-config result](../../.gate/codex/49/depot-production.log)
