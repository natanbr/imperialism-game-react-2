# Task 49 — M18d review fixes

Size M. On `claude/m18d-terrain`, starting from `7da8676`, the review requested a smaller migrated save, a regression for three rail dead ends, exact historical comparisons and clearer port build options.

## Plan and verification

- Keep the migrated position available for replay while storing a single full game in the autosave slot (FR-357, FR-587).
- Exercise Continue, a mid-turn order, a subsequent save, and the Large random-map storage budget. Compare the legacy technology fixture with the independent `de20eca` capture.
- Remove only the depot cash check during a mutation run, compare seeds 1, 3 and 4, and keep the original rail checks. Pin the M18d FR-546 observation beside its gameplay floor.
- Exercise both engineer build controls and the fishing-ground place name. Run the Task 48 functional, browser, isolated performance and roadmap gates.
- Objection: dropping a historical checkpoint outright would make later replays start from a different economy. Preserve the exact origin and measure its storage overhead.

## Review evidence

| Change | Observation |
|---|---|
| FR-124 / FR-125 depot mutation | With the cash check removed, all three seeds started the depot on turn 12 and had a rail dead end at 18-11 on turn 15. With the check active, they started on turn 13, had zero dead ends on turn 15 and connected the depot on turn 18. Seed 2 waited in both runs. [Turn-by-turn journal and mutation output](task-49-depot.md) |
| FR-545 / FR-546 Council | The turn-40 voluntary vote is pinned at 17/24 (previously 13/24). The 13/24 gameplay floor stays in force. The peaceful diplomat has zero wins to spare at 15/24. [Exact assertion](../../tests/engine/sim/m13Acceptance.test.ts) · [Known margins](../verify-and-tune.md#fixed-maps-and-campaigns) |
| FR-125 score margin | On seed 3, turn 15, the score was 690 to 450. This is 1.533×, or 15 points above the required 675. |
| FR-520 independent historical save | Strict comparison of the serialized production, recruitment and oil-order sequence with the independent pre-M16 fixture found two changed values. Each nation's warehouse Fish count went from 0 to 2. The test now checks both counts and compares the entire save against that adjusted capture. [Red comparison](../../.gate/codex/49/legacy-red.log) · [Five passing tests](../../.gate/codex/49/legacy-green.log) |
| FR-616 inputs | The migrant and HUD shortage fixtures stop incoming freight, and the blockade comparison allocates zero Fish. The FR-497 requirement records the ordinary world-market reserve moving from $750 to $250. |
| FR-582 / FR-583 ports | Construction Options and Tile Info warn when an inland port has no controlled river route to the sea. A legal port can still be built. Fishing grounds use the HUD's coordinates and province name for the collecting port. The three UI regressions preceded the implementation. [Tests](../../tests/ui/tileOffers.test.tsx) |

The four fixed-continent campaigns each completed 40 meals with zero sick or starved workers, unpaid disbands, refused orders or invariant violations. [Task 49 turn records](../../.gate/codex/49/task49-fixed.json)

The unreachable prospector message was removed. The `upkeepReserve` comment documents when callers should pass `"depot"` and why ordinary rail expenses use the default.

## Save measurements

The figures below are the length of the JSON actually written to the localStorage slot. The app tests this value against 2,000,000 characters. The Large measurements used Normal difficulty, random seed 1, and an idle human. Both Large saves also had the same numeric length in UTF-8 bytes. [Storage regression and measurement](../../tests/store/historicalSaveSize.test.ts)

| Position | Total characters in slot | Characters used for replay boundary | Share of app budget |
|---|---:|---:|---:|
| Migrated continent turn 11, old encoding | 183,728 | 74,652 | 9.19% |
| Same turn and mid-turn order, compact encoding | 111,446 | 2,370 | 5.57% |
| Same campaign after continuing to turn 40 | 201,597 | 10,854 | 10.08% |
| Large random map at turn 40, before settlement | 233,672 | 0 | 11.68% |
| Same Large map after final settlement | 238,671 | 0 | 11.93% |

The turn-11 regression first measured 74,652 extra characters against its limit of half the 74,591-character historical game. The slot now keeps one full current game plus edits that reconstruct the original replay position. The test checks deep equality of that position and replays all intervening orders through turn 40. The reader also accepts Task 48 full checkpoints. A second fixture covers orders on both sides of a historical mid-turn save.

Independent review found that the first compact reader checked credit before reconstructing the historical position and accepted malformed replay edits. A targeted test reproduced the credit issue and seven malformed edits were exercised. The reader now validates edit shapes, array indices, the reconstructed turn and credit on both positions. The focused save and migration run passed 33 tests.

## Browser inspection

At 1366×768, Tile Info identified the fishing port as “10-7 in Testland South-East.” Both construction controls showed the disconnected river warning and remained enabled. Clicking Build Port reached the $3,000 confirmation. The Chromium run recorded zero page errors. [Fishing ground](../../.gate/codex/49/port-fishing-1366x768.png) · [Tile Info build action](../../.gate/codex/49/port-tile-offer-1366x768.png) · [Construction Options](../../.gate/codex/49/port-build-options-1366x768.png)

## Gameplay guards

| Guard | Task 49 observation |
|---|---|
| FR-125 | All 12 score and rail checkpoints passed. The minimum was 690/450 on seed 3, turn 15. |
| FR-545 / FR-546 | 15/24 peaceful Council victories, including 12 with a paid grant, and 17/24 idle games with an earned minor vote. [Exact peaceful victory count](../../.gate/codex/49/council.log) |
| FR-497 | Removing private orders changed zero plans in 280 turns with orders present. |
| FR-260 | All 160 fixed-continent worker meals passed the health check and there were zero unpaid disbands. |
| FR-597 | Across 72 generated games and 2,810 turns, all 37,557 computer orders were accepted. There were zero invariant violations, zero unpaid disbands in 940 idle turns and zero changed plans in 940 privacy probes. The non-idle policies recorded 50 unpaid disbands in total. |

[Functional gate output and per-game records](../../.gate/codex/49/gate-unit.log) · [Four fixed-continent campaigns](../../.gate/codex/49/fixed-continent.log)

## Delivery gate

The first full browser run passed 177/180. The three failures were the same Trade Book comparison at three widths. It handed raw storage JSON to the control store, bypassing the decoder that Continue uses. The corrected control calls the production reader before settlement and the production serializer afterward. It compares every character in the slot both after read-only actions and after settlement. The three failing viewports then passed together. [First-run browser log](../../.gate/codex/49/first-pass/gate-browser.log)

| Command | Task 49 result |
|---|---|
| `npm test` | 178 files, 3,505 tests passed in 248.29 s. The run used the Task 48 limit of four Vitest forks. [Functional log](../../.gate/codex/49/gate-unit.log) |
| `npm run lint` | Exit 0. Zero errors and one existing unused-variable warning in `tests/engine/systems/logisticsSystem.test.ts`. [Lint log](../../.gate/codex/49/gate-lint.log) |
| `npx tsc --noEmit` | Exit 0. [TypeScript log](../../.gate/codex/49/gate-types.log) |
| `npm run build` | Exit 0. The production build generated all four static pages. [Build log](../../.gate/codex/49/gate-build.log) |
| `PORT=3123 npx playwright test --workers=1` | 180/180 passed in 14.6 minutes. FR-339 counted 20 pack files and 1,990,043 bytes. [Final browser log](../../.gate/codex/49/gate-browser.log) |
| `npm run test:perf` | 3/3 passed after Playwright exited. FR-497 computer planning p95 was 11.5 ms across 3,230 turns in 84 games, against a 100 ms limit. [Isolated performance log](../../.gate/codex/49/gate-perf.log) |
| `node .gate/m12/L4-check-roadmap.cjs` | PASS against the local `origin/main` at `765fcaa`. [Roadmap log](../../.gate/codex/49/gate-roadmap.log) |

## Local handoff

Branch `claude/m18d-terrain`, worktree `imperialism-game-revival-fee36d`. All six Task 49 items passed local review and verification. The final code commit was `4ac7286`, followed by the documentation checkpoint. No deployment or push was requested. The pre-existing `.claude/launch.json` was left untracked.

The save regression and fix are `71eab21` and `da61c52`. The port UI tests and fix are `f24915c` and `56f0206`. The other review commits cover the independent capture (`987f34a`), the depot mutation (`035ef60`), the exact vote and thin margins (`fa15bfb`), and the FR-616 test inputs (`6179b09`).
