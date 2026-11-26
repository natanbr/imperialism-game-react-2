# Task 48 — M18d fishing, payroll and replay

Size M. The orchestrator kept FR-339 at 20 first-paint art requests and 2,050,000 bytes. Task 47 identified the extra request on the opening continent as the map's Fish picture. Task 48 uses the existing map atlas technique to load the Coal and Fish markers together. Each marker shows its own square frame. The builder compares decoded alpha and every visible colour channel with the approved PNGs. [Task 47 request inventory](../../.gate/codex/47/first-paint.json) · [Atlas builder](../../scripts/build-capital-farmland-atlas.mjs)

The opening continent at 1280×720 requested **20 distinct art files, each once, totaling 1,990,043 bytes**. The Fish/Coal atlas is 18,970 bytes. It replaces separate 17,323-byte Coal and 13,613-byte Fish requests. Compared with Task 47, first paint saved one request and 11,966 bytes. The result is 59,957 bytes below the budget. [Task 48 per-file inventory](../../.gate/codex/48/first-paint.json)

## Gameplay and replay

The scripted player keeps six payrolls before starting a new world-market depot when it has a field army and used at most half of its holds in the last four trade phases. It can still pay for rail to join an existing depot using the ordinary reserve. Task 47's regression reproduced the previous rail refusal. In the new test a $125 payroll prevents a $2,000 depot purchase at $2,749, permits it at $2,750 and permits the connecting rail at $750. [Task 47 red result](../../.gate/codex/47/focused-red.json) · [Depot regression](../../tests/engine/depotBudget.test.ts)

| Guard | Task 48 measurement |
|---|---|
| FR-125, score and rail | All 12 checkpoints cleared the 1.5× score floor and the existing rail check. Lowest score ratio was 690/450 = 1.533× on seed 3, turn 15. |
| FR-545 and FR-546, Council | The diplomat won peacefully in 15/24 games, including 12 with a paid grant. The computer earned a voluntary minor vote in 17/24 idle games against the 13/24 floor. |
| FR-497, private orders | Removing the other nation's private orders changed 0/280 plans. |
| FR-260, fixed continent | On each of seeds 1–4 the computer paid its army and fed its workers for all 40 turns. Zero unpaid disbands, sick workers, starvation, refused orders or invariant violations. |
| FR-597, generated maps | All 72 games finished. All 37,557 computer orders were accepted across 2,810 turns, with zero invariant violations. Zero unpaid disbands in 940 idle turns and zero changed plans in 940 privacy probes. The two non-idle policies recorded 50 unpaid disbands in total. |

The separate guard run passed 169/169 tests across four suites. The fixed-continent run recorded every turn. [Guard measurements](../../.gate/codex/48/gameplay-guards-summary.txt) · [Guard log](../../.gate/codex/48/gameplay-guards.log) · [Fixed-continent turns](../../.gate/codex/48/depot-start-fixed.json)

FR-616 records all four two-islands order hashes and the 27 changed generated games. The other 45 generated records match their prior values. A genuine version-1 save from main `765fcaa` resumes on turn 10, accepts a Fish allocation, settles Council and replays turn 11 after saving again. Each changed measurement has its old value, new value and cause in the comparison table. [FR-616 results](../verify-and-tune.md#m18d-recorded-results) · [Historical save regression](../../tests/store/randomMapReplay.test.ts)

## What to inspect in the game

Start a continent game. Select the sea hex beside Testland's capital. Tile Info identifies the fishing ground and its catch. Transportation of Commodities shows the Fish allocation and availability. The mining screenshots use a prepared save with a Miner on a discovered level-one Coal deposit. The disabled level-two action names the required technology.

| Scene | 1366×768 | 390×844 |
|---|---|---|
| Coastal fishing ground and Tile Info | [Desktop map](../../.gate/codex/48/m18d-capital-fishing-1366x768.png) | [Phone map](../../.gate/codex/48/m18d-capital-fishing-390x844.png) |
| Fish allocation and availability | [Desktop Transport](../../.gate/codex/48/m18d-transport-fish-1366x768.png) | [Phone Transport](../../.gate/codex/48/m18d-transport-fish-390x844.png) |
| Square-Set Timbering requirement | [Desktop mine](../../.gate/codex/48/m18d-mountain-mine-refusal-1366x768.png) | [Phone mine](../../.gate/codex/48/m18d-mountain-mine-refusal-390x844.png) |

## Delivery gate

| Command | Task 48 result |
|---|---|
| `npm test` | [177 files, 3,487 tests passed](../../.gate/codex/48/gate-unit.log). Functional run limited to four Vitest forks. |
| `npm run lint` | [Exit 0](../../.gate/codex/48/gate-lint.log). Zero errors and one existing unused-variable warning in `tests/engine/systems/logisticsSystem.test.ts`. |
| `npx tsc --noEmit` | [Exit 0](../../.gate/codex/48/gate-types.log). |
| `npm run build` | [Exit 0, all four static pages generated](../../.gate/codex/48/gate-build.log). |
| `PORT=3123 npx playwright test --workers=1` | [180 passed in 13.0 minutes](../../.gate/codex/48/gate-browser.log). FR-339 reported 20 pack files and 1,990,043 bytes. The FR-339 test file has the same Git blob as at `1ce6120`. All six M18d screenshots were inspected. |
| `npm run test:perf` | [3/3 passed](../../.gate/codex/48/gate-perf.log), run alone after Playwright exited. Computer planning p95 was 11.8 ms over 3,230 turns in 84 games, against a 100 ms limit. |
| `node .gate/m12/L4-check-roadmap.cjs` | [PASS](../../.gate/codex/48/gate-roadmap.log) against the local `origin/main` at `765fcaa`. |

## Local handoff

Branch `claude/m18d-terrain`, worktree `imperialism-game-revival-fee36d`. The four implementation and test commits, in order, are `11826ff` (payroll regression), `a1ccbf8` (variant 1), `d11c42f` (Fish artwork) and `e71b462` (FR-616 re-records and historical replay). The fifth commit contains these results and the updated requirements and roadmap. Local development and review are complete. The branch is unpushed. Evidence is under `.gate/codex/48/`.

## Remaining milestone work

FR-585 still needs authored terrain and rivers in both fixed starting worlds. FR-586's fixed-world art checks depend on those placements. FR-584 remains partial because FR-525 restricts refinery input to legacy Oil. [M18d requirement statuses](../specs/m18d-terrain.md)
