# M18h journal archive

## 2026-11-26 Task 56 — Town development, compatibility and milestone gate

Size L. T-05 covers FR-626, FR-627 and the acceptance checks for FR-617–625 on `claude/m18h-towns`. T-01 through T-04 introduced the gameplay and views. T-05 fixes a town marker that covered the capital picture, adds regression checks and records the measured changes under Q103. The five gameplay defaults are **inferred, owner to confirm**. [Town specification](../specs/m18h-towns.md#open-questions-and-inferred-defaults)

The M18d fixture was saved on turn 15 after a $500 consulate Order. Its replay checkpoint was still on turn 10. The new browser case opens the saved game through Continue, advances to turn 16, reads the actual autosave and replays it. It checks that the imported turn-15 map and treasury form the checkpoint, that the one paid Order is accounted for, and that the historical reports survive. A second Continue must reopen turn 16. [Browser regression](../../e2e/m12-save.spec.ts)

| Check | Observed result |
|---|---|
| Historical hashes before re-recording | The original assertion failed on turn 10 with the M18h digest. Changing only the saved revision to `m18d` recovers both original hashes on turns 10 and 11. The tests-only commit `d03ddd3` checks all four digests and the measured save sizes. [Red run](../../.gate/codex/56/red-save.log) · [31 focused save tests](../../.gate/codex/56/focused-saves.log) |
| Functional suite and guard comparison | `npm test -- --reporter=verbose` passed 3,579/3,579 tests in 185 files. The four Two islands Order digests, twelve score and rail checkpoints and all 72 generated campaign records matched the M18d base. The save comparison accounts for every additional character. [Final functional log](../../.gate/codex/56/unit-final.log) · [Exact changes, causes and guard measurements](task-56-guards.md) |
| Static checks | TypeScript exited 0. The production build generated 4/4 static pages. ESLint reported zero errors and one existing unused variable in the logistics test. [Types](../../.gate/codex/56/types-final.log) · [Build](../../.gate/codex/56/build-final.log) · [Lint](../../.gate/codex/56/lint-final.log) |
| Affected browser specs | On port 3123 with one worker, `look`, `m11-map`, `m12-save`, `m14-endgame` and `m18h-towns` passed 17/17 on the fixed build. All six capital pictures measured 40.3 px across with 22–27% covered (limit 30%). The Council reload passed at its original timeout. The M18d save continued to turn 16, replayed exactly and reopened. A one-car town delivered 0 of 2 lumber and 1 of 1 furniture on turn 8. The phone Capital showed 1 lumber before freight at factory capacity 4. First paint fetched 20 pack assets and 1,990,043 bytes. [Final affected Chromium run](../../.gate/codex/56/browser-affected-final.log) · [Corrected capital markers](../../.gate/codex/56/m3-5-look-map.png) · [Phone Capital](../../.gate/codex/56/town-capital-phone.png) |
| Full browser and performance gate | On port 3123, Chromium passed 183/183 in 18.4 minutes with one worker. After Playwright exited, `npm run test:perf` ran alone and passed 3/3. FR-497 planning p95 was 11.3 ms across 3,230 turns in 84 games, below the 100 ms limit. [Full Chromium output](../../.gate/codex/56/browser-full-final.log) · [Isolated performance output](../../.gate/codex/56/perf.log) |
| Roadmap and journal | The checker reported the previous audit reference `765fcaa` against the merged M18d base `0b98682`. After updating the roadmap reference and milestone text, `node .gate/m12/L4-check-roadmap.cjs` printed `PASS`. The active journal contains 389 lines. [Roadmap output](../../.gate/codex/56/roadmap.log) |

The first full Chromium run passed 181 of 183 checks. The map test found that the town gable covered the centre of two raised capital pictures. The final Council test timed out during fixture reload. A focused map reproduction confirmed the obstruction. The strengthened test measures all six capitals, including nearby unit controls, forts and minor names. The CSS places the gable at the top of the raised picture. [First full run](../../.gate/codex/56/browser-full.log) · [Map reproduction](../../.gate/codex/56/look-red.log)

A separate FR-620 probe resolved a capture Order on turn 2. Valdoria had already received 1 lumber on turn 1. It retained all 21 units after capture. Testland stayed at 10 through turn 6, then reached 11 on turn 7 with an independent port. Without that port Testland stayed at 10 and received no receipt. [Turn-by-turn warehouse and receipt comparison](../../.gate/codex/56/transfer-credit.log)

An independent source review covered phase order, information parity in Normal and Demo, freight allocation and receipt ownership, transfers, and replay. The source review found no engine or information-parity defect. A second independent review verified the marker fix, its new six-capital assertions and the FR-620 warehouse evidence. Comparing the branch against `0b98682` also confirmed that the human simulation policies and protected floors were preserved. [Protected results](task-56-guards.md)

## 2026-11-25–26 Task 55 — M18h town views (T-04)

Size M. FR-621–625. Map and Tile Info explain growth. Capital and News reconcile actual town receipts with Transport and Warehouse. Across 72 random games, 39 towns offered 778 units and delivered zero. [Checks and screenshots](task-55-m18h.md) · [Both players and first producing turns](task-55-campaigns.md)

## 2026-11-25 Tasks 52–54 — M18h queries, growth and freight (T-01–03)

T-01 established seat, resource and capacity queries. T-02 added settlement, transfers and v1 continuation. T-03 shipped town output and recorded private receipts, including zero deliveries. [Task 52 baseline](task-52-m18h.md) · [Task 53 save hashes](task-53-m18h.md) · [Task 54 freight checks](task-54-m18h.md)
