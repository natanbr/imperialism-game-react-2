# M14 journal

## 2026-11-20 M14 review fixes (Task 06)

Size: M. Reproduce the three findings against `a1f3e74`, then correct the turn-40 test setup, Council forecast and finished-game scores.
The affected screens are the Council forecast and voting rules, Nation and Final Scores.
Test FR-507's turn-40 path with a fixed seed, FR-543 with a below-threshold election, and FR-544 with a finished save whose score differs under M14.
Verify each red and green result, then run Vitest, ESLint, TypeScript, the production build and single-worker Chromium on port 3123.
Objection: fixing the seed could hide an early election. Preserve the turn-40 assertions and the separate early-election coverage.

| Claim | Command or evidence in `.gate/codex/06/` | Quoted result |
|---|---|---|
| Random games could finish early. Six scenarios now use seed 1. | Playwright on the two turn-40 cases with seed 63174040, then all six fixed-seed cases. Commands in `e2e-seed-audit.md`. | `2 failed` expecting `Turn: 31 of 40` after `Game over after turn 30 of 40` → `6 passed (3.5m)` |
| The forecast used the ordinary threshold after the engine had elected a winner. It now reads the vote result. | Focused Vitest, `council-red.txt` and `council-green.txt` | `4 failed` → `197 passed`. The final 5–4 forecast now says `Testland wins on votes`. |
| Nation and the HUD recalculated finished scores. Both now use the recorded score table. | Finished M13 seed 1 in `3-m13-red.txt` and `3-m13-green.txt`. UI regression in `3-red.txt` and focused suite in `3-green.txt`. | `Nation: 1363` → `Nation: 1443`, matching Final Scores. `1 failed` → `104 passed`. |
| Unit suite and balance | `npm test` and baseline blob comparison in `balance.txt` | `Tests  2774 passed (2774)`. Lowest FR-125 ratio `t25 903/563 (1.60)`. Both original two-islands test blobs match `a1f3e74`. |
| Lint, types and production build | `npm run lint`, `npx tsc --noEmit`, `npm run build` | `2 problems (0 errors, 2 warnings)`, types `Exit code 0`, build `Compiled successfully in 8.7s`, `Generating static pages (4/4)`. |
| Full browser gate | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `132 passed (9.6m)`, `Exit code 0`. |
| Production browser check | `npx playwright test --config=.gate/codex/06/app-check.config.ts --workers=1` | `Final Scores — Valdoria 1443`, `Nation — Valdoria 1443`, `Testland 5, Valdoria 4, abstain 3 of 12; Testland wins on votes`. `2 passed (8.3s)`. |

The independent delta review found no blocking issues (`review.md`). The workspace sandbox denied Node execution. All gate commands ran on the approved installed Node v22.22.0.

## 2026-11-20 M14 A game that can end well

Size: L. Resolve the final Council, make a peaceful election possible, and explain the result and conquered development.
Consumers are End Turn, Council projections, HUD, Tile Info, How to play, final standings and version-1 saves.
Plan: confirm FR-501 to FR-510, capture individual red logs, implement engine, UI and simulation tasks, run the full gate, independent review and browser QA.
Verify with Vitest, lint, TypeScript, production build, single-worker Playwright on port 3123 and the roadmap check.
Objection: a passive player can now lose early, and a final tie may be decided by the same land it won in battle.

| Task | FR | Test assertion |
|---|---|---|
| T-01/02/03, Council | FR-501 | Only the last meeting removes the relation floor and breaks ties. A minor at war with both abstains. |
| T-02/03, Council | FR-502 | A final result records threshold, vote count or standing, with intent order for an exact tie. |
| T-02/03, Council | FR-503 | 7 of 12 elects with two Great Powers. Three or more require a strict two-thirds majority. |
| T-04/05, UI | FR-504 | The winner ranks first. All nations have score, provinces, strength and standing. |
| T-02/03, score | FR-505 | Only collected conquered levels count. Restoring home land restores its score. Jobs retain their points. |
| T-04/05, UI | FR-506 | HUD, Council and How to play use the current threshold and final scheduled turn. |
| T-04/05, UI | FR-507 | Continue a turn-39 save, play the final Council, then view the same result in final standings. |
| T-04/05, UI | FR-508 | On two-islands a turn-limit result names the best score. |
| T-06, simulations | FR-509 | Use 24 seeds per policy. Idle loses, a diplomat wins peacefully, and aggressor ends by conquest or Council. |
| T-02/03, baselines | FR-510 | Pin actual continent outcomes and preserve the original two-islands orders and scores. |

### Defaults taken before implementation

- Q120 (a), default taken. At the final Council each free minor votes by relations with no 50-point floor. War with both nominees forces an abstention.
  Objection: Even two weak nations now produce a final winner.
- Q121 (a), default taken. With fewer than three Great Powers a strict majority elects a nominee (7 of 12). Three or more retain the two-thirds rule.
  Objection: This departs from the original threshold and lets a computer win before turn 40.
- Q122 (a), default taken. A tied final vote uses standing, then intent order.
  Objection: Holding land helps win a tied vote through its standing bonus.
- Q123 (a), default taken. Conquered development counts only where the owner can collect the tile.
  Objection: A connected depot restores those points and the province still adds standing.
- Q124 (a), default taken. On a world without provinces the turn limit names the nation with the best score.
  Objection: Score alone decides the test world and is only one part of standing on the continent.

### Red runs before the corresponding implementation

Each log is in `.gate/codex/04/`. The per-row filters exclude tests belonging to other rows.

| FR | Log | Vitest summary |
|---|---|---|
| FR-501 | `red-FR-501.txt` | `Tests  2 failed \| 66 skipped (68)` |
| FR-502 | `red-FR-502.txt` | `Tests  4 failed \| 64 skipped (68)` |
| FR-503 | `red-FR-503.txt` | `Tests  1 failed \| 67 skipped (68)` |
| FR-504 | `red-FR-504.txt` | `Tests  2 failed \| 97 skipped (99)` |
| FR-505 | `red-FR-505.txt` | `Tests  3 failed \| 1 passed \| 16 skipped (20)` |
| FR-506 | `red-FR-506.txt` | `Tests  3 failed \| 96 skipped (99)` |
| FR-507 | `red-FR-507.txt` | `Tests  4 failed \| 95 skipped (99)` |
| FR-508 | `red-FR-508.txt` | `Tests  1 failed \| 98 skipped (99)` |
| FR-509 | `red-FR-509.txt` | `Tests  4 failed \| 1 passed (5)` |
| FR-510 | `red-FR-510.txt` | `Tests  1 failed \| 67 skipped (68)` |

### Verification and balance

All three policies played seeds 1 through 24. Every idle game elected Valdoria. Every diplomat game elected Testland with seven votes on turn 40. Each diplomat opened four consulates in four turns, kept its army on home soil, declared no war and paid one to five $1,000 grants. The human policy starts from the regular game and buys the first embassy at the scripted time and price. It favours a free minor whose support is contested, using public relations and borders. Grants require an established embassy and $3,000 left after payment. All 24 aggressor games ended at Council. The separate conquest test exercises a capital falling on a meeting turn.
The identical final diplomat policy won 0/24 on the original M13 Council. Its contract tests still passed in that comparison (`red-FR-509-final-policy.txt`, `red-FR-509-final-policy-provenance.txt`). M13's voluntary minor-vote measure still reaches 18/24 under the original 50-point rule. The simulation records these separately from compulsory ballots.
For the four world-market continent baselines, the final Testland/Valdoria votes are 6/6, 4/8, 7/5 and 4/8. The first is decided by Valdoria's standing. Excluding uncollected development changes Valdoria's final scores on seeds 1 and 3 from 1,443 to 1,363 and from 1,477 to 1,367. Each displaced pin names its old and new result. FR-125 and FR-464 keep their original test files.
The independent review checked all ten rows and the old-save paths. Its fixes cover legacy score ordering, the Development tooltip, diplomat contract checks, the HUD threshold, and the Diplomacy facts shown after the last vote. The final scroll check put the longer Nation explanation behind a keyboard-operable disclosure. Review evidence is in `.gate/codex/04/review.md`.

### App checks

- HUD and How to play (QA 1-2): at 1280 px the threshold and next meeting both fit. The last digit of the turn ends at x311 inside the edge at x345. The full rule is also readable in Nation.
- Continue and final Council (QA 3-5, 9): load turn 39, resolve turns 39 and 40, then see all governors vote, 6-6. Valdoria wins by standing (2,111 against 998). The final-scores button stays visible at 1280x720 and 800x600. The next screen says Defeat and ranks Valdoria first. Screenshot: `.gate/codex/04/m14-last-council.png`.
- Arvelia (QA 6-7): real declare, march, attack and conquest on turn 2. On turn 3 the HUD went from 239 to 238, with 11 uncollected levels and zero additional development points. Tile Info explains the missing points. See `qa-turn2-score.txt`.
- Early peaceful election (QA 8): Continue a crafted six-vote turn-10 save, pay Pellis $1,000 in Diplomacy, then End Turn. Testland wins 7/12. The 24 fresh diplomat games above all won at the last meeting.

| Claim | Command | Result quoted |
|---|---|---|
| Unit and integration gate | `npm test` | `Test Files  127 passed (127)`, `Tests  2771 passed (2771)` |
| Lint | `npm run lint` | `2 problems (0 errors, 2 warnings)`, exit 0 |
| Types | `npx tsc --noEmit` | `Exit code 0` (no diagnostics) |
| Production build | `npm run build` | `Compiled successfully in 7.5s`, `Generating static pages (4/4)`, `Exit code 0` |
| Browser gate | `PORT=3123 PLAYWRIGHT_HTML_OPEN=never npx playwright test --workers=1` | `132 passed (13.7m)` |
| Original two-islands guards | `npx vitest run tests/engine/score.test.ts tests/ui/scoreExplained.test.tsx tests/engine/provinces.test.ts tests/engine/scriptedScore.test.ts tests/engine/twoIslandsGolden.test.ts` | `Tests  87 passed (87)`, `t25 903/563 (1.60)` |
| FR-509 acceptance | `npx vitest run tests/engine/sim/m14Acceptance.test.ts --reporter=verbose` | `24/24 games (required 18), 24 with a paid grant and 0 before the last meeting`, `Tests  6 passed (6)` |
| FR-507 Continue and early election | `npx playwright test e2e/m14-endgame.spec.ts --workers=1` (port 3123; first two scenarios) | `2 passed (33.3s)` |
| FR-505 played conquest | `npx playwright test --config=.gate/codex/04/qa-score.config.ts --workers=1` (port 3123) | `FR-505 HUD before attack: Score: 239 after conquest: Score: 238 current turn: 3` |
| Roadmap | `node .gate/m12/L4-check-roadmap.cjs` and `node .gate/codex/04/check-report.cjs` | `PASS`, `M14 rendered as Built locally; five default-taken cards remain open.` |
