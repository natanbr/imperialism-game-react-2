# Journal archive: M9 War and the attack screen

Moved from `docs/journal.md` on 2026-11-13, every entry unchanged: during M9 the engine half (FLOW: the journal stays
under 400 lines; the QA fix round needed room).

## 2026-11-13 M9 War and the attack screen, engine half (FR-216 to FR-229, FR-234)

Size: L (engine-wide: a new intent kind, the battle step of the combat phase, conquest, colonies, the conquest game over, the
scripted war). One engine agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M9 workflow. Branch `claude/m9-war`
(worktree `imperialism-game-revival-fee36d`), not pushed. The UI agent builds FR-230 to FR-233 and the art (NR-031) next, on the API below.

Plan-lite:
- Change: `moveArmy` into a country at war stores an `attack` intent; `combatSystem` fights one battle per attacked province after the
  marches (`army/combat.ts` `fightBattle`, `definisions/combatRules.ts`), emits `battle-resolved` and applies `army/conquest.ts`
  (`takeProvince`: FR-222, the fall FR-223, the colony FR-224); `resolveTurn` ends the game on conquest; `ai/scriptedWar.ts` (FR-228, FR-229).
- Consumers: the Army screen ("Attack Arvelia", the attacking status), the attack screen, the battle screen, the news, the map's red
  arrows, the Diplomacy screen ("Colony"), the scripted player.
- Tests: FR-216 to FR-221, FR-225 to FR-227 `engine/combat.test.ts` (FR-216 also `engine/validate.test.ts`, FR-225 also
  `store/gameStore.test.ts`); FR-222 to FR-224 `engine/conquest.test.ts` (FR-223 also `ui/scoreAndGameOver.test.tsx`, FR-224 also
  `engine/partnerMarket.test.ts`); FR-228, FR-229 `engine/scriptedWar.test.ts` (with the 4-seed acceptance); FR-234 rows in combat and
  scriptedWar, and FR-159 / FR-260 unchanged.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Objection: FR-229's documented "1 Regulars a turn" can never fire in a real game (decision 1), so the rule is tuned; a campaign that
  cannot finish (seed 4) leaves its regiments idle, paying upkeep, to the end.

Red (tests first, before any engine change): `npx vitest run` on the 3 new and 3 changed files (`.gate/m9/red.txt`): `Test Files 6 failed
(6)`, `Tests 4 failed | 333 passed (337)`; the new suites fail to load (`Cannot find module '@/engine/army/combat'`, `'@/engine/army/conquest'`,
`'@/engine/ai/scriptedWar'`); `expected { ok: false, …(1) } to deeply equal { ok: true }` (FR-216), `expected {} to deeply equal { clothing: 2,
furniture: 2, …(1) }` (FR-224), `expected [ 'unknown-nation', …(25) ] to not include 'attack-not-available'`.

Decisions (defaults, nobody to ask; cards for the progress page):
1. FR-229 tuned, the acceptance kept. With the documented Regulars no seed declared war: the economy trains every untrained worker by turn
   4 (FR-130), so from turn 10 a Regulars can never be raised (probe `scripts/probes/m9/campaign.probe.ts`). The campaign now raises
   Cuirassiers (`SCRIPTED_WAR.regiment`: a trained worker, 1 of the 4 start horses, $500, FPN 15; 3 make 45, twice Arvelia's 18.75) and
   wants arms only while it has a horse and a healthy trained worker (on the world market the economy sells its horses before turn 10;
   without this rule it made and held 2 armaments for nothing and FR-260 fell to 1416, 1421, 1407, 1441). Per seed (default partners
   continent, Testland idle), war declared / Arvelia taken / lowest treasury: Regulars: none / none / $143, $16, $312, $32 on seeds 1 to 4;
   Cuirassiers: seed 1 turn 21 / 22 / $1, seed 2 21 / 22 / $142, seed 3 21 / 22 / $2, seed 4 none (2 raised, its trained workers became
   experts) / $965: 3 of 4, as FR-229 asks. Card: "The scripted campaign raises Cuirassiers, since no untrained worker is ever free.
   Keep, or let the economy keep untrained workers for Regulars?" Suggestion: keep; revisit with migrant recruiting (Q21). Objection: the
   same holds for FR-213's threat recruit (Regulars), which therefore never fires in a real game either; not changed (M8's rule).
2. An attack is its own intent kind (`attack`, `targetId` the owner), so FR-169's peace drop (M6) works unchanged; `cancelArmyMove` takes
   back both kinds.
3. A regiment leaving a battlefield (an attacker going home, a routed defender) is placed after the last battle of the turn, so no regiment
   fights twice a turn and battles in id order do not favour the lower ids. One with no province of its owner to go to surrenders.
4. With several attacking countries only the winner's survivors stay; the others go home as from a failed attack. `battleOutcome` reads
   "attack-failed" for them.
5. The report's `damage` is the health the shot took (at most the health left), so the shots add up to the end healths without a clamp;
   the estimate's verdict is a code the screen words ("likely-victory").
6. Land changes hands now: the test fixtures' world invariants (FR-157, `worldViolations`) accept a province owner and `colonyOf`
   changed by conquest only (to a Great Power; a colony's owner holds its capital) and keep every other check; FR-249's empty colony
   demand is replaced by FR-224 (its test row rewritten to the new rule); FR-213's ten-turn peace row ends at turn 9 on the continent.
7. FR-247's measured baseline moves on purpose and is re-pinned (both nations raise Cuirassiers for Arvelia; Valdoria takes it on turn 22
   in seeds 1, 3, 4; Testland's 1 or 2 stay in its capital). FR-260 and every v1 baseline are unchanged.
8. The news lines of FR-232 (`gameText.ts`: "Battle at Arvelia: Province Taken!", "... taken from ...", "... has fallen.", "... is now
   our colony.") and FR-223's game-over line ("Testland has conquered Valdoria.") are in, as TypeScript needs a line for every event;
   FR-232's tests and the rest of its behaviour stay with the UI agent.

API for the UI half (all from `@/engine`): `attackTargets(state, nationId, provinceId)` (bordering foreign provinces, for "Attack
Arvelia"); `attackStatus(...)` "ready" / "war-starts-next-turn" / "not-at-war" / "own-province"; `battleEstimate(state, regimentIds,
provinceId)` `{ attack, defence, ratio, verdict }`; `defendersOf(state, provinceId)` `[{ regiment, ownerId, protection: { kind: "none" |
"entrenched" | "fort", level?, percent } }]`; `fortLevelOf`; `regimentStatus` kind "attacking" `{ toProvinceId, targetId }` (armyView's
default still reads "Defending" for it); `pendingArmyOrders(...).attacks` (the red arrows); events `battle-resolved` (`BattleReport` in
`types/Battle.ts`), `province-taken`, `nation-fallen`, `minor-colonised`; `battleFrames(report)` (frame 0 = start, then one per round, the
last with the fates), `battleOutcome(report, countryId)` "province-taken" / "attack-failed" / "province-lost" / "enemy-beaten-back",
`battlesFoughtBy(events, countryId)`; `MinorNation.colonyOf`; `GameOver.reason` "conquest" and `winnerId`; `COMBAT`, `ESTIMATE`.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the engine change | `npx vitest run` on the 6 files (`.gate/m9/red.txt`) | `Test Files 6 failed (6)`, `Tests 4 failed \| 333 passed (337)` |
| FR-216 to FR-221, FR-225 to FR-227 | `npx vitest run tests/engine/combat.test.ts tests/engine/conquest.test.ts` (`.gate/m9/run2.txt`) | `Test Files 2 passed (2)`, `Tests 50 passed (50)` |
| FR-228, FR-229 and the acceptance | `npx vitest run tests/engine/continentScore.test.ts tests/engine/scriptedWar.test.ts` (`.gate/m9/baselines2.txt`) | `FR-229 per seed (declared, colonised, lowest treasury): [[1,21,22,1],[2,21,22,142],[3,21,22,2],[4,null,null,965]]`; `Tests 40 passed (40)` |
| FR-229 with the documented Regulars | `npx vitest run tests/engine/scriptedWar.test.ts`, before the tuning (`.gate/m9/run3.txt`) | `[[1,null,null,143],[2,null,null,16],[3,null,null,312],[4,null,null,32]]`; `Tests 1 failed \| 14 passed (15)` |
| FR-247 re-measured | `npx vitest run tests/engine/v2Trade40.test.ts` (`.gate/m9/fr247.txt`) | `"minorDeals":[60,60] ... "capitalArms":[5,4]` (seed 1); after the re-pin `Tests 9 passed (9)` |
| Unit tests | `npm test` (`.gate/m9/gate-final-test.txt`) | `Test Files 95 passed (95)`, `Tests 1778 passed (1778)` (+69 on 1709) |
| v1 and v2 baselines unchanged (FR-234) | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as in M8; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`.gate/m9/gate-final-build.txt`) | `✓ Compiled successfully in 6.4s`, `✓ Generating static pages (4/4)` |

Carried: decision 1's card; FR-213's Regulars never raisable (objection of decision 1); idle campaign regiments keep costing upkeep.
Not run: Playwright (no screen changed beyond the game-over line; the UI half adds e2e/m9-war.spec.ts).
