# M18f credit journal

## 2026-11-24 Task 39 review fixes

Size M. The Deal Book formats a zero charge as `$0` and labels the rate as inferred. News names each interest charge and forced sale. The Demo dashboard reads the open account. A rejected Auto order leaves keyboard focus on the next control the player uses. Goods source notes use the shared map yield helper.

FR-609 records the orchestrator decision that the owner may reverse. A nation with open credit uses signed cash for treasury points, rounded down after division by $100. In the final-turn regression, −$103 costs two points and the borrower finishes second, 118 to 120. Cash-only scoring retains its zero floor.

The Board and world market prepare army upkeep, standing grants and the subsidy bound once per view. When a subsidy can change a warning, the individual bid uses the existing public settlement calculation. In the well-funded subsidized Board regression, each of 17 eligible bids used to simulate a settlement and all 17 now skip it.

| Check | Evidence |
|---|---|
| Tests before fixes | `f937a2b` reproduced lost focus, stale dashboard debt and over-limit balances. `f331594` reproduced the final score tie. `a82aab2` covered ledger and news output. `9a2bb90` reproduced the repeated settlements. `7ed39c6` reproduced the simulator rejecting a legitimate −$318 balance. |
| Full unit and protected simulations | `npm test` passed 3,403 tests in 167 files. FR-125 was 903/563 = 1.604×, FR-545 was 15/24, FR-546 was 13/24 and FR-497 was 0/280. All four golden Order logs and 72 FR-597 records over 2,790 turns matched the Task 38 baseline byte for byte. The simulator now supplies the settlement events to its treasury check. |
| Build and browser | TypeScript passed. Lint found zero errors and the existing unused-variable warning in the logistics test. The production build generated 4/4 static pages. Chromium passed 32/32 tests across 11 specs on port 3123 with one worker, including the desktop and phone Deal Book. |
| Board timing | Median test-file time was 5.902 s on `origin/main` (29 tests), 7.877 s before the fix (31 tests) and 4.180 s after (31 tests). The isolated subsidized-coal view measured 1.156, 2.459 and 1.214 ms respectively. A low-cash borrower with an active subsidy took 1.780 ms before and 1.745 ms after. |
| Isolated performance gate | `npm run test:perf` passed 3/3. The computer order planner measured 12.4 ms at the 95th percentile across 3,210 turns, against the 100 ms limit. |

[Task 39 report](../../.gate/codex/39/report.md) · [Board timings](../../.gate/codex/39/board-timings.md) · [Guard comparison](../../.gate/codex/39/full-guard-summary.log) · [Phone Deal Book](../../.gate/codex/39/deal-book-390x844.png)

## Tasks 37 and 38

- Task 38 completes M18f on `claude/m18f-credit` in worktree `imperialism-game-revival-fee36d`. Open **Deal Book → Open credit line**, place a purchase on the Board, then advance and reopen the statement. The browser fixture closes at −$165 with $15 interest, $100 of forced Wool sales and $35 left to spend. Warehouse and both markets explain supply. Transport preserves saved allocations until Auto clears them. Development and independent review are complete. The branch is local and ready for merge review. [Task 38 evidence and all four screenshots](../../.gate/codex/38/verification.md) · [Progress page](../report/index.html)

| Task 38 check | Command or evidence | Result |
|---|---|---|
| Test-first | `4604be0`, `5415c48`, `aefe694`, `fb048a3` | Initial red cases, including both browser sizes, preceded implementation. Review added red coverage for saved freight/focus, interest crossing the limit, and refusal amounts. |
| Unit and compatibility | `npm test` and the NR-039 comparison | `3392 passed (3392)` in 166 files. FR-125 1.604×, FR-545 15/24, FR-546 13/24, FR-497 0/280. Four complete golden logs and 72 random-map records over 2,790 turns matched byte for byte. |
| Lint, types and production | `npm run lint`, `npx tsc --noEmit`, `npm run build` | Zero errors, one existing unused-variable warning in the logistics test. TypeScript exited 0. Build generated 4/4 static pages. |
| Browser, roadmap and performance | Port 3123, one Playwright worker, four specs. Roadmap checker. Isolated `npm run test:perf`. | `12 passed (52.6s)`, roadmap `PASS` at fetched main `21ea18b`, performance `3 passed (3)`. |

- Task 37 (M18f, L) on `claude/m18f-credit`: engine NR-039 and FR-599–603 are built. Red tests first (`86db83a`, 42 failures; review coverage `9944408`, 13 failures). Final `npm test` passed 3,370/3,370, lint passed with two existing warnings, TypeScript and the production build passed. Exact guards stayed at 1.604×, 15/24, 13/24 and 0/280; four goldens and 72 random records matched. Validator routes, save/replay results and comparison files are in [the Task 37 report](../../.gate/codex/37/report.md). Next is the Deal Book/UI task.
