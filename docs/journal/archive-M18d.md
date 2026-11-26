# M18d journal archive

## 2026-11-24 Task 31 — M18d stopped at the engine balance guard

Size L. Spec-first commit `bf49f87`, baseline `e285459`, engine and test candidate `d6f928f`. See `docs/specs/m18d-terrain.md` for FR-580–587, inference notes and row status. The next owner decision is Q147.

| Claim | Command or comparison | Recorded result |
|---|---|---|
| Red then green | Vitest terrainResources, fishing | Terrain and survey cases: 15 failed and 14 passed before implementation, then 29 passed. Fishing: 3 failed, then 3 passed. River port and bridge cases remain at 4 failed and 1 passed. |
| Protected candidate | Vitest scriptedScore, twoIslandsGolden, sim/m13Acceptance, sim/m14Acceptance | 98/98 before. After: 95 passed, 3 failed. FR-125 minimum 903/563 (1.604×) → 878/578 (1.519×). Seeds 1, 3 and 4 have a new turn-15 rail dead end. |
| Council and information | Same suites, verbose m14Acceptance confirmation | FR-545 15/24 → 15/24 peaceful wins (10 → 12 with a paid grant), FR-546 13/24 → 17/24. FR-497 private orders changed 0/280 plans in both runs, including orders present on all 280 turns. |
| Four golden games | Orders and computer score at turn 40, seeds 1–4 | Orders 529/503/502/533 → 555/558/558/550. Scores 1643/1546/1530/1637 → 1473/1466/1536/1480. All four order-log hashes moved. The human scored 240 throughout. |
| Cause | Candidate with only baseline logistics loaded by an isolated Vitest configuration | 50/50 passed. All four goldens and the original FR-125 minimum returned. Seed 4 first diverges on turn 7, order 7: Food Processing requests 4 → 6 Canned Food. |
| Functional and build gates | npm test, npm run lint, npx tsc --noEmit, npm run build | 3,135 passed, 38 failed (143 passing files, 18 failing). Lint 0 errors, 2 warnings. TypeScript exit 0. Production build exit 0, 4/4 static pages. |
| Browser and performance | Playwright m12-save and m18-rail on port 3123 with one worker, then npm run test:perf alone | 4 browser checks passed in 42.8 s. Two FR-570 fixture screenshots, no M18d new-world acceptance image. Performance 3/3 passed, FR-497 p95 12.5 ms (limit 100 ms). |

Independent review found that a port can still fish under blockade when it has an independent rail route. Historical saves also need a new replay boundary. The full test run reproduced failures in the legacy technology and naval replay suites. The first guard stopped the world, refinery, UI and save work.

Objection: suppressing a capital’s fish would depart from rules 02 and 04, which treat the capital as a port. Updating the golden alone would also accept a new rail dead end. Keep the candidate parked for Q147. The specific defaults for survey odds, gem territory, river mouths and fishing rights are in the spec. No deployment or push.

## 2026-11-24 night shift 2 — M18d terrains and resources, M18e maps and options

- Environment: worktree `.claude/worktrees/imperialism-game-revival-fee36d`; branches from origin/main a52d6b4; deploy: none (merge to main by pull request); gate `.gate/claude/NN/gate.sh` (test, lint, tsc, build, e2e on port 3123 with one worker, perf, roadmap check). Protected: `tests/engine/sim/humans.ts`, `.claude/launch.json` uncommitted.
- Allowance 6 points (source: default; the owner's prompt named none). Weekly gauge 27% at start (resets 2026-11-29).
- Plan (orchestrator's call, from the roadmap's M18 "World variety and depth", worst items first):
  1. M18d: the missing terrains and resources with rivers (RULES-GAP-06), prospecting that can find nothing (RULES-GAP-25), the dead goods rows becoming live (RULES-GAP-26). Forecast 2.5 points with its review.
  2. M18e: a seeded random map and game options, game length (RULES-GAP-07, RULES-GAP-24). Forecast 2 points. It was listed as depending on M18d; it does not: it builds maps from the six existing terrains, so it goes ahead while M18d is parked.
- M18d parked (Codex stopped as briefed): fishing moves the protected guards; table and options in `docs/verify-and-tune.md` ("M18d parked"). Branch `claude/m18d-terrain` kept, not merged. Rejected tonight: a per-game rules version (hard to undo, it would set new thresholds the build then passes; the owner's call) and merging a fishing-free subset (no map uses it yet, unreviewed).
  Deferred: town development, credit, diplomacy leftovers, land war eras, original screens.
- Decision: Codex builds (gpt-6.2-astra xhigh; its quota is back), Claude Sonnet 5.5 xhigh reviews. Rejected: Claude Opus builds, which spend the weekly gauge three times faster for the same work. The play-test pieces M18a to M18c already live under M18, so these are M18d and M18e, and no new milestone number is needed.
## 2026-11-24 Task 35 — M18e review fixes

Size M. FR-598 fits the whole grid on opening and adds a final zoom-out step for maps wider than 24 columns or taller than 20 rows.
The opening camera, buttons, keyboard, wheel and pinch share the limit. New game takes its initial map from `APP_WORLD`. Random generation and version-1 replay use Standard for an unrecognized size.
Check a 32×20 grid at 1366×768 and 1280×720, the 50% floor, the fixed-map boundary and a hand-edited save.
Verify the functional, lint, type, build and map browser gates, and compare the original seven NR-038 suites against the Task 32 baseline.
Objection: using the land bounds could cut off the coast's outer water tiles. Measure the outer edges of all 640 tiles against the space beside the HUD.

| Claim | Command or evidence | Observed result |
|---|---|---|
| Reproduced before the fixes | Test commit `6087632` and `.gate/codex/35/playwright-red.log` | Large opened at 100% and clipped 249 px at the left edge. Four cases using `unknown` and `constructor` failed during generation or save replay. |
| FR-598 whole-grid fit | Both camera suites and seven Playwright specs on port 3123, one worker | “58 passed” and “43 passed”. Large opened with 34 px tiles at 1366×768 and 31 px at 1280×720. Chromium verified all 640 tiles clear the HUD. Screenshot in `.gate/codex/35/fr598-large-map-1366x768.png`. |
| NR-038 compatibility | Original seven suites and task 33's comparison script against `.gate/codex/32/fixed-baseline.log` | “139 passed”. “All 247 deterministic output and assertion lines match.” FR-125 903/563, FR-545 15/24, FR-546 13/24, FR-497 0/280 changed plans, zero rejections, invariant breaks or idle no-pay disbands, and four identical FR-464 hashes. |
| Verification at implementation `e1a12f3` | `npm test`, lint, TypeScript, production build, roadmap, isolated performance | “3313 passed”, “0 errors, 2 warnings” (both existing), type check and build exit 0, roadmap “PASS”, performance “3 passed” with p95 13.1 ms over 3,210 turns. Independent review found one stale camera comment, corrected in `1419f3c`. |

## 2026-11-24 Task 34 — New game options and Stats (M18e T-02)

Size M. Stage the map, Random size, replay seed and difficulty in the top bar. Read the founding settings from the current game in Stats.
FR-595 uses the existing seed parser, store start and opening camera. FR-596 covers Random and version-1 saves, including a 400-turn Council game.
Verify the keyboard and pointer paths, Continue and replay at 1366×768 and 390×844, then compare the original NR-038 guards and run the repository gates.
Objection: a hidden seed or size could override a fixed-map start. Only visible seed input and Random size may contribute settings.

| Claim | Command or evidence | Observed result |
|---|---|---|
| Tests first | `3f2ad16`, `ui-red.log`, `red-keyboard.log` | 15 failed and 53 passed across four UI suites. The old browser panel had no Map field at the first Tab stop. |
| Options, Stats and cancellation | New game, Stats and the two existing HUD unit suites | 68/68 passed, including an actual pre-M16 save, omitted settings and a custom 400-turn game. Review strengthened the check that the inline error itself supplies the seed's accessible description. |
| Replay and fit | Five Playwright specs on port 3123 with one worker, then the final `e2e/m18e-new-game.spec.ts` | 33/33 passed, then 4/4. At 1366×768 and 390×844 the panel stayed within the viewport. Selecting the decimal seed reproduced six capitals, the full founding state, and events and Orders after a consulate order. Continue restored the saved settings. |
| NR-038 | Original seven suites, then task 33's comparison script against `.gate/codex/32/fixed-baseline.log` | 139/139 passed. All 247 deterministic lines matched. FR-125 minimum 903/563 (1.604×), FR-464 four identical Order hashes, FR-545 15/24, FR-546 13/24, FR-497 0/280 changed plans and zero rejected computer Orders, invariant violations or idle no-pay disbands. |
| Roadmap | `node .gate/m12/L4-check-roadmap.cjs` | `PASS` after recording M18d and M18e and aligning the two main references with the local `origin/main` merge of PR 50 (`a52d6b4`). |
| Repository gates at implementation `27593ff` | `npm test`, lint, TypeScript, production build, then `npm run test:perf` alone | 3,305/3,305 tests in 162 files (160.22 s), zero lint errors and two existing warnings, TypeScript and build passed. Performance 3/3 with computer planning p95 12.8 ms across 3,210 turns (100 ms limit). |

## 2026-11-25 Task 46 — payroll fixed on seed 3, blocked on seed 2 food

Size L. Local commits `a0dc8e0` (red payroll test), `c695760` (reserve candidate) and `9bbb255` (save migration tests). The health assertion reproduced on the normal test entry point. Task 45's partial re-records remain uncommitted. No deployment or push. [Report and next experiment](task-46-m18d.md)

## 2026-11-25 Task 45 — stopped on four unpaid regiments

Size L. Night shift 3 started on 2026-11-25 with the default allowance of 6 points and a weekly gauge of 34%. Branch `claude/m18d-terrain` started at Task 44 commit `8f277ca`.

Task 44 left 55 failing tests. Q103 authorized exact re-records for fishing and terrain development in every game. The FR-125 margin, rail dead-end, FR-597 correctness and privacy checks remain acceptance conditions. [Recorded results](../verify-and-tune.md#m18d-recorded-results) · [Earlier dated entries](archive-M18d.md)
The fixed continent uses the world market, starting army, scripted nation 2 and idle nation 1. On seed 3 the `regiments-disbanded` events with reason `no-pay` total **4**, against the FR-260 requirement of **0**. Task 44’s full output already showed the difference inside the same assertion as the changed upkeep schedule. The cause of the missed payroll is unverified. Keep the zero-loss test and trace spending before accepting any dependent campaign results.

| Evidence | Result |
|---|---|
| [Task 45 fixed-world suite](../../.gate/codex/45/fixed-targeted.log) and [Task 44 unit log](../../.gate/codex/44/final-unit.log) | Both show seed 3, expected `noPay: 0`, received `noPay: 4`. The targeted run passed 164/166. Its other failure is an authorized turn-6 freight plan. |
| [Random maps](../../.gate/codex/45/random-test.log) | 72/72 passed. No unpaid disbands across 940 idle turns, zero rejected computer orders, invariant violations or private-order plan changes. |
| Save and UI drafts | A genuine v1 save from main `765fcaa` was captured. The final replay suite, browser checks and screenshots are pending. Review the cost of replaying every modern save on load and the combat revision on fishing checkpoints. |
| Branch handoff | Development and review incomplete. No Task 45 commit, deployment or push. Full gate pending. The fixed-world draft records in [.gate/codex/45/fixed.md](../../.gate/codex/45/fixed.md) need remeasurement after a fix. |
