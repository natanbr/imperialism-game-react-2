# Task 46 stopped on seed 2 worker health

- 👤 Task 46 called for tracing and fixing the four unpaid regiments on fixed continent seed 3, then finishing Task 45 under FR-616.
- 🤖 The payroll candidate at `c695760` pays the army on every turn of seeds 1–4. It also delays a food railway on seed 2. On turn 20 Valdoria feeds six of seven workers and one falls sick. FR-260 requires zero sick workers.
- ⚠️ The original health assertion reproduces the failure. The re-records are on hold. The production candidate and the inherited working tree are not ready to merge. [Confirmation from the original tests](../../.gate/codex/46/guard-confirm.log)

## What caused the unpaid regiments

All runs used the fixed continent, world market, starting army, scripted Valdoria and idle Testland. Swapping only the logistics implementation between main and the pre-Task-44 engine reproduced the loss in one direction and removed it in the other. Fishing first changes a production order on turn 4, from six cans requested to eight. Valdoria's later mix of production, cargo and sales changes. Main receives sales revenue throughout turns 28–31. The fishing run receives none. [Every turn, order cost and source revision](../../.gate/codex/46/payroll.md)

| Seed 3 engine | Turn 31 cash before payroll | Due | Paid | Unpaid regiments lost |
|---|---:|---:|---:|---:|
| Main `765fcaa` | $4,115 | $200 | $200 | 0 |
| Before Task 44, `607fc25` | $73 | $175 | $50 | 4 |
| Immediately before `08c0412`, at `9a40365` | $73 | $175 | $50 | 4 |
| Task 44 head `8f277ca`, also with Task 45's partial edits | $73 | $175 | $50 | 4 |
| Main with only `607fc25` logistics | $73 | $175 | $50 | 4 |
| `607fc25` with only main logistics | $4,115 | $200 | $200 | 0 |
| Task 46 payroll candidate `c695760` | $3,581 | $200 | $200 | 0 |

Valdoria had used 13 of its last 32 cargo holds. The weak-trade rule reserved six payrolls only in the partners market. At turn 28, the world-market reserve was three payrolls, or $525. Valdoria could spend $2,000 on a depot and $100 on development from its $2,698 treasury and still satisfy that rule.

| Seed 3 turn before the fix | Opening | Order spending | Sales | Payroll due | Payroll paid | Closing |
|---:|---:|---:|---:|---:|---:|---:|
| 28 | $2,698 | $2,100 | $0 | $175 | $175 | $423 |
| 29 | $423 | $0 | $0 | $175 | $175 | $248 |
| 30 | $248 | $0 | $0 | $175 | $175 | $73 |
| 31 | $73 | $0 | $0 | $175 | $50 | $23 |

## Why the candidate stops here

`a0dc8e0` committed the regression before the implementation. Its world-market case expected a $750 reserve and observed $250. `c695760` applied the existing six-payroll rule to a field army with four phases of weak trade in either market. All 83 focused military, trade and depot tests passed. The broader rule affects small purchases and projects already under construction. [Red test](../../.gate/codex/46/payroll-red.log) · [Focused verification](../../.gate/codex/46/payroll-green.log)

| Fixed continent seed 2 | Before the change, `8f277ca` | With the change, `c695760` |
|---|---|---|
| Turn 18, opening cash $783 | A $300 reserve allows the $100 rail section from 15-7 to 16-6. | The $900 reserve defers the same section to turn 19. |
| Turn 20, no livestock, Fish or cans in opening stock | The last section reaches 17-4 in time for freight. Seven workers eat. | The railway is one section short. Six workers eat, one falls sick. |
| Full 40 turns | Zero sick workers. | One sick worker, zero starved, zero invariant violations. |

The original FR-260 assertion expects 40 meal events, zero sickness, zero starvation and an empty violation list for each seed. Task 46 stopped on the sickness result. One possible next experiment is to apply the extra reserve only when starting a new depot, then run both payroll and food guards before considering any new pins. [Seed 2 before](../../.gate/codex/46/seed-2-8f277ca.json) · [Seed 2 candidate](../../.gate/codex/46/seed-2-c695760.json)

## Why Task 45 changed production files

| Inherited file | Decision and reason |
|---|---|
| `engine/systems/logisticsSystem.ts` | Keep the read-only query for the nation's fishing grounds. Map, Tile Info and Warehouse need the engine's choice of collecting hub, including overlapping grounds and blockades. |
| `components/MapView.tsx` | Keep the bulk lookup so map tiles share one calculation per map and network change. |
| `components/Tile.tsx` | Keep the fishing flag and accessible tile name. An ordinary sea tile can supply Fish without an authored Fish resource. |
| `components/Tile/TileBase.tsx` | Keep the Fish artwork that identifies a collecting ground on the map. |
| `components/Tile/Tile.module.css` | Keep the placement rules that center a catch on water and leave the river symbol visible on land. Desktop and phone inspection are pending. |
| `components/TileInfoPanel.tsx` | Keep the catch, receiving hub and yield, and the distinct descriptions of unsearched, surveyed-empty and discovered geology required by FR-586. |
| `components/goodsSources.ts` | Keep the fishing-ground lookup. Without it, Warehouse can report no local source while Transport collects Fish at the same capital. |
| `components/tileSiteText.ts` | Keep the specific technology name for a refused mine, the surveyed-empty explanation and the correction to Fish collection text. A depot can collect ordinary land goods, while fishing requires a capital or port. |
| `store/persistence.ts` | Keep migration for divergent historical v1 saves. The inherited draft also replayed every current campaign on load. A scoped alternative is uncommitted and needs verification. |
| `store/sessionReplay.ts` | Keep the check for divergence after an older combat checkpoint and preserve already-applied orders. A fishing-only checkpoint must not mark the game as having used M17 combat. |

The six inherited save and UI suites passed 72 tests before the payroll fix, including load, continue, resave and replay of the genuine main v1 fixture. `9bbb255` adds separate regressions for the redundant current-save replay and the false M17 marker. A trial change to the outer save format failed FR-357 and was removed. The unverified alternative in the worktree uses the existing rules revision at turn settlement and also touches `types/GameState.ts` and `engine/systems/turnHousekeeping.ts`. [Per-file audit and save evidence](../../.gate/codex/46/production-audit.md)

## Measured guards and remaining work

| Post-fix measurement | Result |
|---|---|
| FR-125, score and rail | Lowest 690/450 = 1.533× on seed 3 at turn 15. Floor 1.5×. All twelve rail checkpoints passed. |
| FR-545, FR-546 and FR-497 | 15/24 peaceful wins, 17/24 voluntary votes and 0/280 plans changed when private orders were removed. |
| FR-597, generated worlds | 72 games and 2,810 turns. Of 37,557 computer orders, zero were rejected. Zero invariant violations, zero unpaid losses over the 940 idle turns, and zero plans changed in 940 privacy probes. The non-idle games counted 47 unpaid human and 3 unpaid computer regiments. FR-597 inherits FR-497's idle-only payroll guard. |
| FR-389, remaining freight difference | On seed 1, turn 6, the opening allocation changed from livestock 1 and cotton 2 to cotton 2. The final allocation changed from livestock 1 and cotton 3 to cotton 3. The change is already present at `607fc25` with one Fish available. The last rail section and cotton increase still occur. |
| Verification and delivery | The 12-file measurement run passed 314/320 cases. The focused run of the original tests independently reproduced sickness and the freight difference. No post-fix re-records were accepted or committed. The full unit, lint, type, build, port-3123 browser, screenshot and isolated performance gates are pending. The [roadmap checker](../../.gate/codex/46/roadmap.log) printed `PASS` against `765fcaa`. Nothing was pushed or deployed. |

The hand-made worlds still lack FR-585's new terrain and rivers. FR-584's refinery still refuses ordinary stored Oil under FR-525. New-game art and the browser mining refusal remain pending under FR-586. [Measurement run](../../.gate/codex/46/simulation-postfix.log) · [Freight comparison](../../.gate/codex/46/freight-control.log)
