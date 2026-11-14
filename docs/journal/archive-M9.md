# Journal archive: M9 War and the attack screen

Moved from `docs/journal.md` on 2026-11-13 in two steps, every entry unchanged: during M9 the engine half (FLOW: the journal
stays under 400 lines; the QA fix round needed room), and at the start of M10, once M9 was merged (PR 27, main f817da2), the UI
half, the review fix round, the QA fix round and the review of the QA fix round.

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

## 2026-11-13 M9 War and the attack screen, UI half (FR-230 to FR-233, FR-272, FR-273)

Size: L (the UI half of the milestone: two new dialogs, the Army screen, the map, the news, the store, the art pack). One UI
agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M9 workflow, on the engine half's API. Branch
`claude/m9-war` (worktree `imperialism-game-revival-fee36d`), not pushed.

Plan-lite:
- Change: the Attack screen (`AttackModal.tsx`, `army/attackView.ts`) from the Army screen's "Attack Arvelia" and from a map
  click with regiments selected; the Battle screen (`BattleModal.tsx`, `army/battleView.ts`) replaying a report, opened by
  itself after End Turn and from the news (`newsItems`); "Colony" in Diplomacy; the art pack (one table `art/inkArt.ts`)
  in the Army screen, the Armoury, both new screens; the map's red attack arrow and green marches.
- Consumers: the player; the store keeps `armySelection`, `attackPlan`, `battleQueue` (UI state only).
- Tests: FR-230 `ui/attackDialog.test.tsx` (+ `ui/armyDialog.test.tsx`); FR-231 `ui/battleReplay.test.tsx`; FR-232
  `ui/battleReplay.test.tsx`, `ui/gameText.test.ts`; FR-233 `e2e/m9-war.spec.ts` (+ `ui/diplomacyDialog.test.tsx` for the
  chip); FR-272 `ui/inkArt.test.ts` and the picture rows of the Army, Armoury, Attack and Battle tests; FR-273
  `ui/armyMarkers.test.tsx`, `ui/inkArt.test.ts`; FR-022 `ui/uiWritesOnlyOrders.test.ts` scans both new dialogs.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `PORT=3160 npx playwright test --workers=1`.
- Objection: the selection kept on the map is a little hidden (tick in the Army screen, close it, click the enemy land);
  the marker's ring and ", 3 selected" are its only signs. The Army screen's "Attack…" is the main way.

Red (tests first, before any UI change; `.gate/m9ui/red.txt`): `Test Files 9 failed (9)`, `Tests 10 failed | 185 passed
(195)`; four suites fail to load (`Cannot find module '@/components/art/inkArt'`, `AttackModal`, `BattleModal`, `attackArrows`),
`expected [ 'Consulate' ] to deeply equal [ 'Colony', 'Consulate' ]`, `expected 'Arvelia taken from Arvelia.' to be 'Arvelia
taken.'`, the Army and Armoury picture rows `expected [] to deeply equal [ [ …(2) ], …]`.

Decisions (defaults, nobody to ask; cards for the progress page):
1. FR-230's "picks Attack Arvelia" opens the dialog through the button beside the select: picking "Attack Arvelia" turns
   "March" into "Attack…", and that opens the Attack screen. A select that opens a dialog on change opens it on every
   arrow key (WCAG 3.2.2 On Input). Card: "Open the Attack screen on the pick itself?" Suggestion: keep the button.
2. "Our chosen regiments" are the ticked ones. The ticks live in the store as the army selection: kept when the Army
   screen closes, so a click on a bordering enemy province opens the Attack screen with them (FR-230's map path); the
   marker wears the accent ring and its name ends ", 3 selected"; End Turn and a click on any other tile drop it.
3. NR-031's arrows (new FR-273, replacing FR-263's nation colour and dashes): an attack is the pack's own red arrow,
   scaled and turned as one onto the two markers; a march keeps its straight measured line and head (FR-270's arrows both
   ways side by side, FR-271's browser measure unchanged) in the pack's movement green with its ink outline. The FR-263
   test's colour lines now assert FR-273's green (a changed requirement, not a looser test). The colours are 4 new tokens,
   checked against the SVG files.
4. FR-211's row "no bordering province of ours: the select is empty" no longer holds on the continent's South-West alone
   (FR-230 lists the attacks there); it is rewritten to the attack entries, and the empty select is tested on an island
   province (Sundmark given to Testland).
5. The era-1 art: the pack draws three eras per Imp1 line, so Light Artillery is `horse-artillery.png` and Artillery
   `heavy-artillery.png` (heavy line: heavy, siege, railroad gun); Minutemen are `militia.png`, Skirmishers
   `light-infantry.png`. Pictures are plain `<img>` (one `eslint-disable` in `art/ArtPicture.tsx`): Next's optimiser would
   re-encode files NR-031 keeps as supplied. Fort pictures show on the Attack screen and as the Battle screen's wall; the
   map draws no fort yet, so none there.
6. A minor's one province bears its name: "Arvelia taken." instead of "Arvelia taken from Arvelia."; a battle the player
   fought is its own news line from its side (the engine left "Province Lost!" to do).
7. The Battle screen lies above every dialog, the game-over screen included, so a conquest's last battle is seen first.
8. FR-233 names `e2e/m9-war.spec.ts` (the brief said `e2e/m9.spec.ts`); the FR's name is kept, as the engine half's notes did.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the UI change | `npx vitest run` on the 9 new and changed UI files (`.gate/m9ui/red.txt`) | `Test Files 9 failed (9)`, `Tests 10 failed \| 185 passed (195)` |
| FR-230 to FR-232, FR-272, FR-273, the colony chip | the same 9 files after (`.gate/m9ui/run2.txt`) | `Test Files 9 passed (9)`, `Tests 265 passed (265)` |
| Unit tests | `npm test` (`.gate/m9ui/gate-test.txt`) | `Test Files 98 passed (98)`, `Tests 1848 passed (1848)` (+70 on 1778) |
| v1 and v2 baselines unchanged (FR-234) | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint | `npm run lint` (`.gate/m9ui/gate-lint.txt`) | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`.gate/m9ui/gate-build.txt`) | `✓ Compiled successfully in 7.4s`, `✓ Generating static pages (4/4)` |
| FR-233 and the screens in the app | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m9ui/pw-final.txt`) | `36 passed (5.8m)`, `1 skipped` (37 tests; m9-war.spec.ts new, m8-armies.spec.ts unchanged and green with the pictures) |

Seen in the app (screenshots under `.gate/m9ui/shots/`, git-ignored; `m9-battle.png` is attached to the spec's report): the Attack
screen over the Army screen at 1280x720, the red arrow from Testland North-East into Arvelia, the Battle screen's result with
"Province Taken!", Arvelia inside Testland's border after the conquest, the Armoury cards and Army rows with their pictures.

Carried: decision 1's card (the button, not the pick); the Imp1 defender prompt and the red crossed-swords cursor over enemy
land are not built; the map draws no fort; the rest of the art pack (terrain, goods, workers, buildings) waits for NR-031's
separate decision.

### Review fix round (2026-11-13)

Size: M (one fix round over both halves: 5 major and 12 minor findings of the two M9 review passes, all fixed). One agent
(Opus 5.5, xhigh, no subagents, no advisor call), started by the M9 workflow. Branch `claude/m9-war`, not pushed.

Red (each behaviour fix's new rows run on the code before it, the fixed files put back from HEAD for the run): F1, E2, E1
`Tests 4 failed | 55 passed (59)` (`expected 'nation-2' to be 'nation-1'`, the crossing outcome, the conquest game over;
`.gate/m9fix/red-engine.txt`); R1 `Tests 3 failed | 40 passed (43)` (`expected [ [ 1, 4 ], [ 2, +0 ], [ 3, 6 ], …(1) ] to
deeply equal [ [ 1, +0 ], …`; `red-r1.txt`); F2 `Tests 2 failed | 64 passed (66)` (`red-f2.txt`). The test-only rows were
checked against a mutation instead, each failing its new row: R8 engineers first in `FIRING_ORDER`, E3 combat reading
`ctx.rng`, R2 the queue filled with every battle.

| Finding | What changed | Test |
|---|---|---|
| F1, E2 (major) | `combatSystem`: every battle is fought before any capital falls; the falls apply after the last battle in the winners' `intentOrder` (`fallCapital`), void when the capital is back with its owner; the paths that could no longer run (`entering`, a war ended mid-phase, `gone`) removed | engine/combat.test.ts: crossing strikes, turn 1 Testland wins, turn 2 Valdoria; the game ends on that turn |
| E1 (major) | `takeProvince`: a colony passes with its capital province (`makeColony`: treaties of the others end, points 89, `minor-colonised`); `fallNation` gives the fallen's colonies to the winner | engine/conquest.test.ts: 2 rows with `settledTradeBarrier` and `worldViolations` |
| R1 (major) | new FR-275: with a field army the upkeep reserve is max(2, 16 - turns left) turns before the last 8, so it no longer steps from 2 to 8 at turn 33 | engine/scriptedArmy.test.ts (turns kept); FR-274's acceptance counts no-pay disbands: [4, 0, 6, 0] before, [0, 0, 0, 0] now; FR-247 re-pinned |
| R2 (major) | none in code | ui/battleReplay.test.tsx: only Valdoria fights, nothing queued; each fights its own battle, Testland's alone queued |
| R3 (major), F3 | FR-221 status; the overclaiming title split | engine/combat.test.ts: home lost, retreat to South-West; home lost and nowhere to go, surrender; moved after ordering, no attack; a fallen nation's regiment leaving a battle surrenders |
| R4, F4 | FR-229 replaced by FR-274 (Cuirassiers, the horse and trained-worker gate, no-pay in the acceptance); FR-213's status gives the 5/6 capital arms | scriptedWar.test.ts titles cite FR-274 |
| R5 | FR-167 and FR-174 statuses | none (docs) |
| R6 | e2e takes the red arrow file's tail and tip through the image's transform onto the markers (1.5 px) and checks the SVG is served | e2e/m9-war.spec.ts |
| R7 | `data-nation-id` on the territory outline; e2e: Testland's outline (`var(--color-nation-1)`) stops west of Arvelia's capital tile on turn 1 and runs east of it after the conquest | e2e/m9-war.spec.ts |
| R8, R9 | none in code | combat.test.ts: Sappers fire after the artillery; conquest.test.ts: prospecting and construction jobs end, civilians removed with no capital tile |
| R10 | the claim narrowed to what holds: above the game-over screen (79 over 75), not above Accept Offer (85); the CSS comment fixed | ui/battleReplay.test.tsx reads both overlay rules and the page's render order |
| F2 | new refusal "colony": no overture, grant or trade policy toward a colony; the Diplomacy screen disables them with "it is a colony, ruled by its owner" | conquest.test.ts, ui/diplomacyDialog.test.tsx |
| E3 | the FR-227 test replaced: after a battle the shared and the diplomacy streams give the same next draws as after none | combat.test.ts |

Decisions (defaults, nobody to ask; cards for the progress page):
1. R1: the ramp only for a nation with a field army (regiments beyond its capital keep). Measured with a temporary hook (not
   committed; `.gate/m9fix/ramp-shapes.txt`), FR-274 no-pay per seed / FR-260 scores: no ramp [4,0,6,0] / 1419, 1451, 1441,
   1469; every nation 3 turns at turn 31 and 4 at turn 32 [0,0,0,0] / 1417, 1439, 1437, 1469; every nation 3 to 7 from turn
   28 [0,0,0,0] / 1417, 1444, 1420, 1466; field army only, 3 to 7 from turn 28 (taken) [0,0,0,0] / 1419, 1451, 1441, 1469.
   FR-234 protects FR-260, so no every-nation ramp. Card: "A nation with a field army keeps more cash from turn 28 so it
   pays its army to the end. Keep, or ramp every nation (FR-260 moves by up to 21 points)?" Suggestion: keep. Objection: a
   nation with its garrison only keeps M8's step (M8 decision 1, still open), and "a field army" stands in for "upkeep above
   the income".
2. F1: crossing strikes on both capitals go to the first in `intentOrder` (the review's suggestion; the same fairness as
   FR-222's several attackers). Card: "Both capitals taken in one turn: the first in turn order wins. Keep?" Suggestion: keep.
3. R4: FR-229 gets a new id (FR-274) by FLOW's rule although M9 is not merged; FR-275 extends FR-213 (a) rather than replace it.
4. F2: refused, not hidden: the Diplomacy screen keeps the buttons, disabled with the reason, as for every refusal (FR-237).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the fixes | the new rows on the code before each fix (`.gate/m9fix/red-*.txt`) | `Tests 4 failed \| 55 passed (59)`, `Tests 3 failed \| 40 passed (43)`, `Tests 2 failed \| 64 passed (66)` |
| FR-274, FR-275 | `npm test` console (`.gate/m9fix/gate-test.txt`) | `FR-274 per seed (declared, colonised, lowest treasury, no-pay disbands): [[1,21,22,305,0],[2,21,22,340,0],[3,21,22,276,0],[4,null,null,965,0]]` |
| Unit tests | `npm test` (`.gate/m9fix/gate-test.txt`) | `Test Files 98 passed (98)`, `Tests 1864 passed (1864)` (+16 on 1848) |
| v1 and v2 baselines (FR-234) | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)` as before; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint | `npm run lint` (`.gate/m9fix/gate-lint.txt`) | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` (`.gate/m9fix/gate-build.txt`) | `✓ Compiled successfully in 8.8s`, `✓ Generating static pages (4/4)` |
| e2e | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m9fix/pw-final.txt`) | `36 passed (6.1m)`, `1 skipped` (37 tests; m9-war.spec.ts with the arrow measure and the outline check) |

Carried: M8 decision 1 (the reserve step for a nation without a field army) and decision 1 above; the Armoury's pictures are
still not checked as loaded in the browser (e2e/m8-armies.spec.ts; FR-272's status says so); the Battle screen lies under
Accept Offer when both open at a turn's start.

### QA fix round (2026-11-13)

Size: M (two dialogs, the hand-over between the Army and Attack screens, the HUD's news heading). One fix agent (Opus 5.5, xhigh,
no subagents, no advisor call), started by the M9 workflow, on Nathan's QA of `m9-qa-attack.png`, `m9-qa-arrow.png`,
`m9-qa-battle.png` (as of 99e9f39); not pushed. Plan-lite: as in the table; consumers the player; verify the gate. Objection: the
store keeps one more UI field (`armyTargetId`, the "March to" entry the Army screen reopens on) for the hand-over back.
To make room (FLOW: under 400 lines) the engine half's entry moved unchanged to `docs/journal/archive-M9.md`.

| Item | What changed | Test |
|---|---|---|
| 1 FR-276 | the Battle screen's grid: each side a group with a visible heading ("Attackers: Testland", "Defenders: Arvelia") naming its list, the wall between the groups; one heading class (`sideHeading`) on both screens | ui/battleReplay (+3), e2e m9-war (headings above and over their columns) |
| 2 FR-277 | "Deployment" with the two forces by type ("Testland attacks: 2 Regulars, 1 Artillery", "Arvelia defends: 3 Minutemen"); "Round 1" while stepping; "Result: 7 rounds were fought" at the result, by stepping or Skip | ui/battleReplay (+4; 6 rows rewritten to FR-277/278), e2e m9-war |
| 3 FR-278 | under the estimate "Strength: each regiment's firepower times its health, added up; an entrenched defender's counts 1.25 times. Likely victory at 1.5 times theirs or more, uncertain at 0.75 or more." (from COMBAT and ESTIMATE, the cover of this province); "Entrenched: takes 20% less damage." under the defenders; "Destroyed" for "KIA"; "25 damage" | ui/attackDialog (+5), ui/battleReplay (+1), e2e m9-war |
| 4 FR-279 | `openAttack` closes the Army screen; a plan with `fromArmyScreen` gives it back on close (Cancel, Escape, backdrop, after Attack) with `armyTargetId`, so "Attack Arvelia" stays picked; the ticks are the store's selection; the focus back on "Attack…" | ui/attackDialog (+6; the plan row now has `fromArmyScreen`), e2e m9-war (one dialog, Cancel and back) |
| 5 FR-280 | "News from last turn (turn 2, Summer 1815)" (`dateText`) | ui/newsPanel (+2; FR-268's name row rewritten), e2e m9-war, play-turns, m5-hud-scroll, market-and-game-over |
| found on the shots | "Destroyed" (and already "Routed") ran past its token's right edge; `.tokenHealth` wraps the status under the bar | e2e m9-war (`statusesInsideTheirTokens`) |

Decisions (defaults, nobody to ask):
1. Item 2's "Round 1 of 7 only on the result view": the result view has no current round, so the total reads "Result: 7 rounds were
   fought" (the deployment's old words, moved to the result). Objection: not the literal "Round 7 of 7" form.
2. Item 3: the brief's example ("militia count less when not entrenched") is not what `battleEstimate` computes: militia defend at
   full strength (and never attack, FR-267); cover raises a defender's strength by 1 / (1 - R). The line says that, as "counts 1.25
   times" (1.43 behind a level-1 fort), rather than "divided by 0.8". "Entrenched" is one legend under the defenders (as FR-265's
   Arms legend), not repeated on each row.
3. Item 4: "Attack" also goes back to the Army screen (its rows read "Attacking Arvelia", as when it lay underneath); a screen
   opened from the map closes to the map; once the Army screen is closed, its next open starts at the first entry.
4. Item 1: "matching the Attack screen's headings" read as the same style; its "Our regiments" kept.
5. Rewritten rows assert the replacing requirement (FR-277, FR-278, FR-280), not a looser one; three FR-279 rows and two FR-278 rows
   held before (named in their statuses).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: unit, before the change | `npx vitest run` on the 3 files (`.gate/m9qa/red.txt`) | `Test Files 3 failed (3)`, `Tests 24 failed \| 45 passed (69)`; `expected 'Deployment: 4 rounds were fought' to be 'Deployment'`, `expected 'Round 1 of 4' to be 'Round 1'`, `expected [ …(2) ] to have a length of 1 but got 2`, `Unable to find an element by: [data-testid="estimate-explanation"]`, `expected 'News, turn 2 (1815)' to be 'News from last turn (turn 2, Summer 1…'` |
| Red: e2e, before the change | `PORT=3160 npx playwright test e2e/m9-war.spec.ts e2e/play-turns.spec.ts` (`.gate/m9qa/e2e-red.txt`) | `2 failed`, `1 passed`; m9-war `Expected: 1 Received: 2` (dialogs); play-turns `Received string: "News, turn 1 (1815)…` |
| Red: the token status | m9-war on the dev server before the wrap (`.gate/m9qa/e2e-red-status.txt`) | `+   "Routed",` `+   "Destroyed",` (4 outside); after the wrap `1 passed (12.2s)` |
| FR-276 to FR-280 | the 3 unit files and the army, store files after (`.gate/m9qa/run2.txt`) | `Test Files 5 passed (5)`, `Tests 111 passed (111)` |
| Unit tests | `npm test` (`.gate/m9qa/gate-test-final.txt`) | `Test Files 98 passed (98)`, `Tests 1885 passed (1885)` (+21 on 1864) |
| Baselines unchanged (FR-234) | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]`; FR-274 `[[1,21,22,305,0],[2,21,22,340,0],[3,21,22,276,0],[4,null,null,965,0]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); tsc exit 0, no output |
| Build | `npm run build` (`.gate/m9qa/gate-build-final.txt`) | `✓ Compiled successfully in 8.1s`, `✓ Generating static pages (4/4)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m9qa/gate-e2e.txt`) | `36 passed (4.0m)`, `1 skipped` (the old skip; 37 tests) |

In the app: shots `docs/journal/m9-qa-fix-attack.png` (the Attack screen alone, both explanations, the news heading) and
`m9-qa-fix-battle.png` (the side headings, "Round 1", "10 damage"); checked as well (`.gate/m9qa/`, git-ignored): the deployment
("Deployment", the two forces), the result ("Result: 7 rounds were fought", "Destroyed" inside the tokens), the Army screen after
Cancel (three ticks, "Attack Arvelia", "Attack…"). Script `.gate/m9qa/shots.mjs`; no page errors.

### Review of the QA fix round (2026-11-13)

Size: S (three minor findings: a CSS comment, one line's words, one test row; all fixed, none carried). One fix agent (Opus 5.5,
xhigh, no subagents, no advisor call), started by the M9 workflow; not pushed. Evidence in `.gate/m9qarev/`.

| Finding | What changed | Test |
|---|---|---|
| F1 | `War.module.css` header: the Attack screen opens in place of the Army screen (FR-279), never over it; its 78 is only a guard | none (comment) |
| F2 | new FR-281: "an entrenched defender counts 1.25 times as strong" ("behind the fort a defender counts 1.43 times as strong") | ui/attackDialog (2 rows), e2e m9-war |
| F3 | FR-278's numbers row reads the factor from the line on the screen and sets it against `battleEstimate` (entrenched, damaged, fort) | ui/attackDialog |

Decision: new words are a changed requirement, so a new id (FLOW); FR-281 replaces only FR-278's cover part, the other FR-278 rows keep it.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the change | `npx vitest run tests/ui/attackDialog.test.tsx` (`red.txt`) | `Tests 3 failed \| 30 passed (33)`; F3's row `"explained": null` against `"engine"` 1.25, 1.25, 1.43 |
| F3's row catches drift | the same, `-t "FR-278"`, the engine's divisor 1 / (1 - R/2) for one run, then put back (`mutation-f3.txt`) | `Tests 1 failed \| 4 passed \| 28 skipped (33)`: `"engine": 1.11` against `"explained": 1.25` |
| Green | the attack, battle and army UI files (`green.txt`) | `Test Files 3 passed (3)`, `Tests 95 passed (95)` |
| Unit tests, baselines | `npm test` (`gate-test.txt`) | `Test Files 98 passed (98)`, `Tests 1885 passed (1885)` (a row rewritten, none added); FR-125, FR-260, FR-274 lines as above |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); tsc exit 0, no output |
| Build | `npm run build` (`gate-build.txt`) | `✓ Compiled successfully in 20.1s`, `✓ Generating static pages (4/4)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`gate-e2e.txt`) | `36 passed (11.9m)`, `1 skipped` (the old skip; 37 tests) |

In the app: `docs/journal/m9-qa-fix-attack.png` taken again with the new words (script `.gate/m9qarev/shot-attack.mjs`): one dialog,
the dialog 760x371 at 1280x720, the page does not scroll, no page errors.
