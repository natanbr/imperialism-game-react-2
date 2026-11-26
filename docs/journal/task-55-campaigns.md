# Task 55 — When the protected campaigns produced town goods

The four FR-125 games and four FR-464 goldens produced **zero towns for either player**. Both suites play Two islands with seeds 1–4. Each game had zero provinces at every one of its 40 settlements. The four additional frozen-M4 comparison runs also had zero provinces and zero receipts. [Shared fixed-world driver](../../tests/engine/scriptedGame.ts)

In the **72 generated games**, **39 towns** first offered goods in **33 games**. The computer produced from 25 towns. On the other side the scripted human policy produced from seven, the diplomat policy from seven, and the idle player from zero. The earliest first offer came on turn 11 and the latest on turn 38.

**Why the protected results held.** The 575 receipts offered 778 units in total. They delivered **zero**. On every receipt, the owner's ordinary tile and fishing shipments already used all available cars under that turn's allocations. Unshipped goods expired, so town production added nothing to warehouse stock. The idle player's installed Clothing Factory, Furniture Factory and Metal Works each stayed at capacity 1 in all 24 idle games. Every non-idle player reached at least the first threshold of 4 in one or more of these factories. For these players capacity alone cannot explain the unchanged results. Each generated game's winner, length and available turn-15, -25 and -40 computer scores matched Task 54. [Task 54 protected comparisons](task-54-m18h.md)

| Generated world and nation 1 policy | Nation 1 producing towns | Nation 2 computer producing towns | Receipts from both | Units offered | Units delivered |
|---|---:|---:|---:|---:|---:|
| Standard, idle | 0 | 4 | 50 | 79 | 0 |
| Standard, scripted | 4 | 3 | 102 | 118 | 0 |
| Standard, diplomat | 5 | 3 | 134 | 152 | 0 |
| Large, idle | 0 | 5 | 63 | 75 | 0 |
| Large, scripted | 3 | 5 | 123 | 169 | 0 |
| Large, diplomat | 2 | 5 | 103 | 185 | 0 |
| **Total** | **14** | **25** | **575** | **778** | **0** |

## First producing settlement for each seed and player

Each number is the first resolved turn with a positive offer for one distinct province. Two numbers in a cell identify two towns under that owner. A dash means zero towns through game end. Testland follows the named human policy and Valdoria always uses the computer planner.

### Standard random

| Seed | Idle Testland | Its Valdoria opponent | Scripted Testland | Its Valdoria opponent | Diplomat Testland | Its Valdoria opponent |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | — | — | 36 | — | 36 | — |
| 2 | — | 27 | — | — | — | — |
| 3 | — | 35 | 15 | 36 | 11 | 36 |
| 4 | — | 26 | — | 25 | — | 22 |
| 5 | — | — | — | — | — | — |
| 6 | — | — | 23 | — | 32 | — |
| 7 | — | — | — | — | — | — |
| 8 | — | 26 | — | 35 | 18 | 22 |
| 9 | — | — | — | — | — | — |
| 10 | — | — | — | — | — | — |
| 11 | — | — | 15 | — | 17 | — |
| 12 | — | — | — | — | — | — |

### Large random

| Seed | Idle Testland | Its Valdoria opponent | Scripted Testland | Its Valdoria opponent | Diplomat Testland | Its Valdoria opponent |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | — | 29 | 16 | 32 | — | — |
| 2 | — | — | — | — | — | — |
| 3 | — | 15 | — | 15 | — | 15 |
| 4 | — | — | — | 27 | — | 27 |
| 5 | — | — | 34 | — | — | — |
| 6 | — | 38 | — | — | — | 31 |
| 7 | — | 25 | 32 | 21 | — | 29 |
| 8 | — | — | — | — | 26, 31 | — |
| 9 | — | — | — | — | — | — |
| 10 | — | 25 | — | 25 | — | 25 |
| 11 | — | — | — | — | — | — |
| 12 | — | — | — | — | — | — |

The observer ran the protected suites’ own drivers and players. At logistics it forwarded every event and retained the real result. For each receipt it recorded owner, province, first resolved turn, offered and delivered amounts. It also scheduled ordinary tile and fishing supply alone against the actual car count and allocations at the same settlement. Across 2,810 generated-map turns and 480 fixed-world turns the probe passed **84/84**. Rerun locally with `npx vitest run --config .gate/codex/55/activation.config.ts`. [Campaign probe](../../.gate/codex/55/activation.test.ts) · [Per-game measurements](../../.gate/codex/55/activation.json) · [Observed test run](../../.gate/codex/55/activation.log)
