# Tasks 65–68 — M18k play-test fixes and M18l screens (night shift 2026-11-27)

Branch `claude/m18k-qa-fixes`, base main `fcb1553`.

## What was built
- **M18k (FR-643 to FR-647), from a Sonnet play-test of the running app:** Tile Info names a depot or port on your tile and whether it is connected; the Board of Trade note names why every seller is barred (consulate, war, boycott, colony, no relations); the Garrison Book explains Force Size; the transport header counts every row that ships, from a forecast of your own known work (`knownFreightPlan`, `src/app/engine/systems/freightForecast.ts`); the Armoury note wording. The Armoury Horses forecast uses the same forecast.
- **M18l (FR-650, FR-651, NR-041, spec `docs/specs/m18l-screens.md`):** the Foreign Scouting Report in Tile Info (exact counts under Q32) and the Information mode on the diplomatic map (Provinces, Military word, Industry placing).
- Play-test findings judged intended, no change: F3 (Trade Book opens only on a bid, FR-612) and F6 (no upkeep warning in the Spend dialog).

## Reviews
| Round | Reviewer | Result |
|---|---|---|
| M18k | 2 × Sonnet 5.5 xhigh | no blocker, findings fixed |
| Codex 65 | Codex | 1 blocker (header used the old farm yield) + 3, fixed |
| M18l | 2 × Sonnet 5.5 xhigh, browser QA | no blocker; 390 px clipping found, fixed |
| Codex 66 | Codex | 2 should-fix + 1 nit, fixed |
| Codex 67 | Codex | 1 blocker (port change from our peace or fleet departure), fixed |
| Codex 68 | Codex | 1 blocker (losing sortie counted as open), fixed cautiously |
| Sonnet check | Sonnet 5.5 xhigh | cautious rule under-forecasts a winning sortie; settling the battle (d6c416e) read enemy ship types the player cannot see (FR-497), reverted in 2d5716b. Known limit recorded in FR-646 for the owner. |

Every Codex round confirmed the computer's Orders unchanged (533 Orders, 714 phase comparisons in task 68; `freightAtLogistics` byte-identical).

## Gate 72 (`3c0d679`) plus `d797550`
- `npm test`: 198 files passed. Lint (1 existing warning), tsc, build: exit 0.
- Playwright single worker: 191 passed, 1 failed (the NR-041 e2e check over the 30 s limit). `d797550` split it without raising a timeout: 10/10 in three runs of `e2e/m18l-screens.spec.ts`.
- `npm run test:perf`: 3 passed, FR-497 p95 24.1 ms over 3,230 turns (limit 100 ms).
- Roadmap check: PASS. The sim suites with the pinned FR-597, FR-545, FR-546 and FR-489 records passed, so no protected result moved.
