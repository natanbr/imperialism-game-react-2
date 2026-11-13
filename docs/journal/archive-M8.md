# Journal archive: M8 Armies

Moved from `docs/journal.md` on 2026-11-13 during M8 (FLOW: the journal stays under 400 lines; the review of the QA
fix round needed room before the milestone ends). The two finished entries, the engine half and the UI half, are
unchanged. The review fix round, the QA fix round and the review of the QA fix round stay in the journal.

## 2026-11-13 M8 Armies, engine half (FR-199 to FR-209, FR-213, FR-215)

Size: L (engine-wide: new state, four order kinds, three turn steps, the scripted player). One engine agent (Opus 5.5, xhigh, no
subagents, no advisor call), started by the M8 workflow. Branch `claude/m8-armies` from main d16afa7 (worktree
`imperialism-game-revival-fee36d`), not pushed. The UI agent builds FR-210 to FR-212 and FR-214 next, on the API below.

Plan-lite:
- Change: `state.armies` in the FR-204 shape (one army per country per province) with `state.regimentsRaised`; the regiment table
  `definisions/regiments.ts`; `engine/army/` (reads, edits, start forces); `orders/armyOrders.ts` (`setRecruitment`, `moveArmy`,
  `cancelArmyMove`, `disbandRegiments`, reason `not-adjacent`); `systems/armySystem.ts` (disbands and upkeep after trade, recruits
  after combat) and the combat phase (marches, healing); `ai/scriptedArmy.ts`; `militaryStrength` on the new armies.
- Consumers: the map markers, the Army screen and the Armoury (UI half), the news, the Deal Book's bottom line, the scripted player, M9.
- Tests: FR-199 `engine/regiments.test.ts` (13); FR-200, 201, 203 to 208 `engine/armies.test.ts` (51) and `engine/validate.test.ts` (4
  accepted, 35 refusal rows); FR-202 `engine/upkeep.test.ts` (9); FR-205 text and FR-209 `ui/gameText.test.ts` (13; "14" until the review fix round, R10); FR-213
  `engine/scriptedArmy.test.ts` (13); FR-174 `engine/scriptedDiplomacy.test.ts` (builders rewritten); FR-215 `engine/continentScore.test.ts`,
  `engine/v2Trade40.test.ts`.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `PORT=3168 npx playwright test --workers=1`.
- Objection: decision 2 adds a scripted-player rule no FR states (keep two turns of upkeep); without it nation 2 lost 2 of its 3 field
  regiments for want of money on seed 2 (continent, world market).

Decisions (defaults, nobody to ask):
1. A march into another country's province is refused in M8: `not-at-war` without an active war (FR-205), `not-owner` with one, until M9
   builds the attack (FR-216). The "March to" choices (`marchTargets`) are the nation's own bordering provinces only.
2. FR-213 "keeps a garrison": the scripted player drops any order that would take its treasury below two turns of upkeep (one on the last
   turn). FR-157's games then pay $100 every turn with nothing disbanded. Objection: in the partners games a nation whose income stops
   in the last turns still loses its field army (seed 2 nation 1 on turn 39, seed 4 nation 2 on turn 40); a full reserve would cost
   development. Suggested card for the page: keep it, revisit with M9's war AI.
3. One pending order per regiment: a march replaces its disband and a disband its march; `cancelArmyMove` cancels marches only, so a
   disband is undone only by ordering a march (the Army screen shows no control for it, FR-211).
4. Ids `regiment-<n>`, n counting every regiment ever raised (higher = newer, FR-202); names from a per-owner, per-type counter, so the
   recruit after a disbanded "3rd Regulars" is "4th Regulars". Armies are kept sorted by province then owner, regiments by id.
5. FR-203 numbering: the field army first (ids 1 to 3 for Testland), then the Minutemen province by province in state order (NW 1st to
   4th, NE 5th to 8th, SW 9th to 12th, SE 13th to 16th); each minor 1st to 3rd.
6. Recruiting is `Nation.recruiting` (it involves no second country, so no intent); the workers leave `industry.workers` when ordered
   and neither work nor eat that turn. A nation that no longer holds its capital province raises no recruit (M9 edge).
7. FR-213 under a threat: the run's armaments come first, their steel is kept from expansion, and the 2 armaments are kept from the
   world market. Healing (FR-208) applies to minors' militia too.
8. Baselines: the FR-157 conditions run on the real continent (with the upkeep); every turn-by-turn equality with two-islands (FR-157's
   score, FR-215's 40-turn M4 comparison, FR-245's "world" test) runs on the continent without the start forces (`withoutStartForces`,
   tests/engine/armyFixtures.ts). In "world" the current scripted player sells the 4 start horses on turn 1 (partners: goods only).
9. The M6 and M7 tests that read a continent treasury after End Turn count the $100 upkeep (`UPKEEP` in diplomacy.test.ts), and four e2e
   specs too (play-turns, market-and-game-over, m6-diplomacy, m7-trade). The Deal Book's `militaryUpkeep` reads `army-upkeep`.

API for the UI half (all from `@/engine`):
- Data: `REGIMENTS[type]` (`name`, `category`, `arm`, `stats` with FPN, move, range, `armamentsCost`; `worker`, `horses`, `cash`),
  `RECRUITABLE_REGIMENTS` (the 7 Armoury types), `entrenches(type)`, `isMilitia(type)`, `UPKEEP_PER_ARMS`.
- Map markers (FR-210): `armyMarkers(state)` gives `{ provinceId, seatTileId, ownerId, forceSize, regiments, militia }`, the province's
  owner first. Army screen (FR-211): `armyAt(state, ownerId, provinceId)`, `forceSize(army)`, `regimentStatus(state, id)` (`defending`,
  `available`, `marching` with `toProvinceId`, `disband-ordered`), `marchTargets(state, nationId, provinceId)`. Armoury (FR-212):
  `recruitingOf(nation, type)`, `freeWorkersOf(nation, grade)`, `capitalProvinceOf(state, id)`.
- Orders: `setRecruitment { regiment, count }`, `moveArmy { fromProvinceId, regimentIds, toProvinceId }`, `cancelArmyMove { regimentIds }`,
  `disbandRegiments { provinceId, regimentIds }`; `validateOrder` gives each refusal, `REFUSAL_TEXT["not-adjacent"]` its words.
- The news panel already names provinces in "3 regiments marched from ... to ...".

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: the new and changed tests before the implementation | `npx vitest run` on the 7 files (`.gate/m8/red.txt`) | `Test Files 7 failed (7)`, `Tests 17 failed \| 77 passed (94)`; 5 files fail to load (`Cannot find module '@/engine/army/armies'`, `'@/definisions/regiments'`, `'@/engine/ai/scriptedArmy'`, `'@/engine/systems/armySystem'`); e.g. `expected [ +0, +0 ] to deeply equal [ 36, 36 ]`, `expected undefined to be '2 Regulars recruited.'` |
| Red: decision 2 (the guard switched off) | `npx vitest run tests/engine/scriptedArmy.test.ts tests/engine/continentScore.test.ts` | `Test Files 2 failed (2)`: `expected 50 to be greater than or equal to 100`; FR-157 seed 2 `"noPay": 2` |
| Unit tests | `npm test` | `Test Files 87 passed (87)`, `Tests 1603 passed (1603)` (+145 on 1458) |
| v1 baselines unchanged (FR-159) | `npm test` console; `git diff --stat d16afa7 --` the eight FR-159 files | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as on main; the diff is empty |
| FR-157, FR-215 | `npm test` console | `continent with the start army / without / two-islands: [[1,1419,1493,1493],[2,1451,1496,1496],[3,1441,1490,1490],[4,1469,1476,1476]]` |
| FR-247 measured again | `npm test` console | seed 1 `"minorDeals":[54,50],"minorPurchases":[24,17],"minorsDealt":[4,1],"treasury":[805,3177]`; all four in FR-247's status |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 5.9s`, `✓ Generating static pages (4/4)` |
| e2e, before the four specs counted the upkeep | `PORT=3168 npx playwright test --workers=1 --reporter=line` | `30 passed (2.8m)`, `2 failed` (`Expected: 9500 Received: 9400`, `Expected: 10297 Received: 10197`), `1 skipped` |
| e2e, after | same | `32 passed (3.0m)`, `1 skipped` (the old skip) |

In the app (once the UI half is in): New game; End Turn: the news reads "Army upkeep: $100." and the Deal Book's bottom line
"Military upkeep $100".

## 2026-11-13 M8 Armies, UI half (FR-210 to FR-212, FR-214)

Size: L (milestone UI half: map markers, two new dialogs, one e2e spec). One UI agent (Opus 5.5, xhigh, no subagents, no
advisor call), started by the M8 workflow on the engine half's API. Branch `claude/m8-armies`, not pushed.

Plan-lite:
- Change: `components/army/armyView.ts` (markers by seat tile, the Army screen's rows and controls) and `armouryView.ts` (the
  cards), no React; `Tile/TileArmy.tsx` (the markers), `ArmyModal.tsx`, `ArmouryModal.tsx`, `army/Army.module.css`; store flags
  `armyProvinceId` (`openArmy`, `closeArmy`) and `isArmouryOpen` (`openArmoury`, `closeArmoury`), both reset by New game;
  `selectArmyMarkersBySeat`; the capital's "Armoury" button on a world with provinces; three Game Icons (tent, pitchfork, sabres).
- Consumers: the player; M9 adds "Attack Arvelia" to "March to" and the Attack screen (FR-230) on the same view module.
- Tests: FR-210 `ui/armyMarkers.test.tsx` (9); FR-211 `ui/armyDialog.test.tsx` (19); FR-212 `ui/armouryDialog.test.tsx` (15);
  FR-022 `ui/uiWritesOnlyOrders.test.ts` (+1: the new screens are scanned and send through submitOrder); FR-084 `ui/icons.test.tsx`
  and FR-160 `store/computerNations.test.ts` (the new icon names and store keys added to their lists); FR-214 `e2e/m8-armies.spec.ts`.
- Verify: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `PORT=3160 npx playwright test --workers=1 --reporter=line`.
- Objection: a 24 px marker cannot share a 42 px seat tile with the civilians' 24 px button without overlapping something; the
  markers lie half over the seat's left edge and cover the right edge of the tile to the left (decision 2).

Decisions (defaults, nobody to ask):
1. The spec file is `e2e/m8-armies.spec.ts`, as FR-214 names it (the task brief said `e2e/m8.spec.ts`; the requirement row wins).
2. Marker place: from 11 px left of the seat tile to 13 px inside it, 9 px from its top, so it clears the civilians' button in the
   bottom right, the tile's icon and the level badge's text; on a minor's capital 1 px from the top, clear of its name tag. One
   24 x 24 chip per country, the owner's colour as its border; the force size (tent) on that colour above, the militia
   (pitchfork) below; a chip with one line shows it larger. Objection: on a developed Great Power seat the job markers under the
   level badge are hidden behind the chip while a job runs (the tile panel still lists them).
3. A marker without militia reads "Testland army: force size 2, 1 regiment" (no "0 militia"); "1 regiment" in the singular.
4. The Army screen lists the regiments that may march first, then the militia; "Cancel march" is a button on each marching row;
   nothing ticked reads "Tick the regiments to march first." (or "to disband"), no bordering province of ours "No province of ours
   borders this one."; other refusals are the engine's words as a sentence ("The game is over."). The disband question's buttons
   are "Yes, disband" and "Keep them"; Escape keeps them. A disband ordered has no control (engine decision 3, card kept).
5. The Armoury shows horses in the cost and at hand only for the types that need them; "+" reasons: "Not enough money",
   "Not enough armaments", "Not enough horses", "No free trained worker". A "This turn:" label stands before the count.
6. Both dialogs lie at z-index 76 (as Diplomacy), over the capital; the Army screen is 860 px wide, the Armoury 1180 px with 4 cards
   a row; at 1280x720 neither the page nor the dialog scrolls (checked in the e2e spec).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red: the new and changed UI tests before the implementation | `npx vitest run` on the 6 files (`.gate/m8ui/red.txt`) | `Test Files 6 failed (6)`, `Tests 3 failed \| 26 passed (29)`; 3 files fail to load (`Failed to resolve import "@/components/ArmyModal"`, `"@/components/ArmouryModal"`); `expected [ 'about', 'advanceTurn', …(16) ] to deeply equal [ …(19) ]` |
| FR-210 to FR-212 covered | `npx vitest run` on the 6 files (`.gate/m8ui/green2.txt` and the full run) | `Tests 34 passed (34)` for the two dialog files; armyMarkers `9 tests` passed |
| Unit tests | `npm test` (`.gate/m8ui/gate-test.txt`) | `Test Files 90 passed (90)`, `Tests 1647 passed (1647)` (+44 on 1603) |
| v1 baselines and FR-215 unchanged | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as on main; `[[1,1419,1493,1493],[2,1451,1496,1496],[3,1441,1490,1490],[4,1469,1476,1476]]` as in the engine half |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 7.1s`, `✓ Generating static pages (4/4)` |
| FR-214 | `PORT=3160 npx playwright test e2e/m8-armies.spec.ts --workers=1 --reporter=line` | `1 passed (13.7s)` |
| e2e suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` (`.gate/m8ui/e2e-final.txt`) | `33 passed (2.0m)`, `1 skipped` (the old skip) |

In the app: New game; every province's seat shows its army marker (Testland's capital: a crimson chip "4" over "4", named
"Testland army: force size 4, 3 regiments, 4 militia"). Click it: the Army screen; tick a regiment, "March to", March. Open Capital,
Armoury: 7 cards, "+" disabled with "Not enough armaments" until the metal works make one. Screenshots: `.gate/m8ui/shots/`
(m8-armoury.png, m8-army.png, m8-map.png).
