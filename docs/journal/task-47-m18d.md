# Task 47 — payroll passed, package stopped on the map loading budget

The new depot rule passed every payroll acceptance gate. The package stopped on FR-339 in the full browser suite. A fresh 1280 × 720 continent game requested **21 distinct art files against a maximum of 20**. The new map Fish accounts for the extra request. FR-616 authorizes gameplay, freight and replay re-records. It gives no exception to the first-paint budget. Production and pin changes remain local drafts for owner review.

| FR-339 first paint | Earlier measured run | Task 47 | Limit |
|---|---:|---:|---:|
| Distinct art files | 20 | **21** | 20 |
| Total bytes on disk | 1,988,396 | 2,002,009 | 2,050,000 |

The independent request inventory shows one request for `goods/fish.png`, 13,613 bytes, exactly the observed byte increase. Every URL was requested once. The unchanged browser case stops at the file-count assertion. [Earlier browser measurement](../../.gate/codex/43/e2e.log) · [All 21 requested assets](../../.gate/codex/47/first-paint.json) · [Full browser log](../../.gate/codex/47/gate-browser.log)

## Payroll experiment

The first variant passed all five acceptance gates. On the world market, the scripted player keeps six payrolls before starting a depot if it has a field army and used at most half its cargo holds over four settled trade phases. A railway already under construction uses the original spending rule. The existing partners-market rules still apply. The decision uses the same public state on every seed.

| Fixed continent, 40 turns | Meals | Sick | Starved | Unpaid regiments | Payroll paid | Orders refused | Invariant violations |
|---|---:|---:|---:|---:|---:|---:|---:|
| Seed 1 | 40 | 0 | 0 | 0 | $6,425 | 0 | 0 |
| Seed 2 | 40 | 0 | 0 | 0 | $5,900 | 0 | 0 |
| Seed 3 | 40 | 0 | 0 | 0 | $6,300 | 0 | 0 |
| Seed 4 | 40 | 0 | 0 | 0 | $6,350 | 0 | 0 |

On seed 2 the engineer started the $100 section to 16-6 on turn 18 with $783 in cash and a $300 ordinary reserve. The last section reached 17-4 on turn 20 and all seven workers ate. Task 46 had applied a $900 floor to the first section, delaying delivery by one turn. On seed 3 the new rule deferred the turn-22 depot. On turn 31 Valdoria paid its $200 army bill and closed with $2,622. Before either payroll change it had $73 available for a $175 bill and lost four regiments. [All 160 turns](../../.gate/codex/47/depot-start-fixed.json) · [Task 46 historical controls](../../.gate/codex/46/payroll.md)

| Acceptance measure | Required | Variant 1 |
|---|---|---|
| FR-260 on the fixed continent | All four seeds together, zero unpaid regiments, sick workers and starved workers | Passed all four |
| FR-125 scripted score / frozen M4 score | At least 1.5× at all 12 checkpoints, with the rail check intact | Lowest 690/450 = 1.533× on seed 3 at turn 15. All 12 rail checks passed |
| FR-545 peaceful Council wins | 15/24 | 15/24, including 12 with a paid grant |
| FR-497 privacy | Zero changed plans in 280 probes | 0/280 |
| FR-597 generated worlds | All games finish with legal computer orders, valid states, funded idle payroll and private player orders | 72/72 games, 2,810 turns, 37,557 orders, zero rejected and zero violations. Zero unpaid on 940 idle turns and zero changed plans in 940 privacy probes |

The generated-world cohort also recorded 50 unpaid regiments under the two non-idle policies. FR-597’s zero-unpaid check applies to the idle policy. FR-546 measured 17/24 voluntary minor votes against the 13/24 floor. The initial four-suite run recorded one further freight difference on seed 1, turn 6, covered by FR-616. [Guard measurements](../../.gate/codex/47/variant-1-guards-summary.txt) · [Original test output](../../.gate/codex/47/variant-1-guards.log)

The focused test first reproduced the $750 ordinary reserve and deferred rail on the Task 46 head. After the change all 84 trade, military and depot checks passed. [Before](../../.gate/codex/47/focused-red.json) · [After](../../.gate/codex/47/focused-variant-1.json)

## What to inspect in the game

Start a continent game and select the sea tile next to Testland’s capital. Tile Info reports one Fish a turn for the capital. Open Transportation of Commodities to see the Fish allocation set to Auto, with one unit available. In Warehouse, Fish has a local source. The mining check used a saved position with a Miner on a discovered level-one coal deposit. Tile Info disables the second level and names Square-Set Timbering as the missing technology.

| Scene | Desktop, 1366 × 768 | Phone, 390 × 844 |
|---|---|---|
| Coastal fishing ground and Tile Info | [Desktop map](../../.gate/codex/47/m18d-capital-fishing-1366x768.png) | [Phone map](../../.gate/codex/47/m18d-capital-fishing-390x844.png) |
| Transport availability | [Desktop Transport](../../.gate/codex/47/m18d-transport-fish-1366x768.png) | [Phone Transport](../../.gate/codex/47/m18d-transport-fish-390x844.png) |
| Mining refusal on prepared save | [Desktop refusal](../../.gate/codex/47/m18d-mountain-mine-refusal-1366x768.png) | [Phone refusal](../../.gate/codex/47/m18d-mountain-mine-refusal-390x844.png) |

The two hand-made starting worlds still await FR-585’s authored terrain and rivers. FR-584’s refinery still rejects ordinary stored Oil under FR-525. These are open milestone items. [M18d specification](../specs/m18d-terrain.md)

## Re-records and historical saves

The nine original fixed-world suites passed 200 tests after remeasurement. All four two-islands order hashes changed. Of the 72 generated-world records, 27 changed and 45 matched in every recorded field. The frozen human policies and the 1.5× score floor remained intact. The working-tree table gives the old and new values, reasons, order hashes, checkpoints, allocations, campaign outcomes and historical save digests. [Draft FR-616 re-records](../verify-and-tune.md#m18d-recorded-results) · [Fixed-world measurements](../../.gate/codex/47/fixed-pins.md) · [Generated-world measurements](../../.gate/codex/47/random-pins.md)

The eight focused save and UI suites passed 112 tests. The v1 save produced by main at `765fcaa` loaded on turn 10, accepted a Fish allocation, advanced, resaved and replayed turn 11. Review found that settling turns under the new rules just to compare against a pre-fishing save could only discard the result. Reading the historical fixture now resolves zero turns, down from nine. The loader retains any pending orders already applied at the saved position. The same-turn checkpoint and fishing-only combat-marker cases also passed. [Measured save comparisons](../../.gate/codex/47/ui-save-pins.md) · [Final focused results](../../.gate/codex/47/ui-save-final.json)


## Delivery gate

| Command | Observed result |
|---|---|
| `npm test` | 177 files, 3,487 tests passed. The functional run used at most four Vitest forks. [Unit log](../../.gate/codex/47/gate-unit.log) |
| `npm run lint` | Exit 0, zero errors and one existing unused-variable warning at line 333 of logisticsSystem.test.ts. [Lint log](../../.gate/codex/47/gate-lint.log) |
| `npx tsc --noEmit` | Exit 0 after correcting the two Fish picture calls to use ResourceType.Fish. [Initial diagnostics](../../.gate/codex/47/gate-types-first.log) |
| `npm run build` | Exit 0, four static pages generated. [Build log](../../.gate/codex/47/gate-build.log) |
| `PORT=3123 npx playwright test --workers=1` | 179 passed, one failed in 11.5 minutes. The failed FR-339 request-count check blocks the package. [Browser log](../../.gate/codex/47/gate-browser.log) |
| `npm run test:perf`, alone after the browser exited | Three of three passed. Computer planning p95 was 13.0 ms over 3,230 turns, with a 100 ms limit. [Performance log](../../.gate/codex/47/gate-perf.log) |
| `node .gate/m12/L4-check-roadmap.cjs` | PASS against origin/main `765fcaa`. [Roadmap log](../../.gate/codex/47/gate-roadmap.log) |

## Owner decision

**Should the map keep the 20-file budget or allow a separate request for Fish?** I recommend keeping the budget and authorizing a small art-pack change so the first paint can draw Fish within it. The alternative would raise FR-339 to 21 files and accept the measured 2,002,009-byte first paint. Both options preserve the passing depot rule.

The worktree is `imperialism-game-revival-fee36d` on `claude/m18d-terrain`. The payroll candidate, save and UI changes, and numerical re-records are available there. The stop record is documentation only. No production or pin commit, push or deployment occurred in Task 47.
