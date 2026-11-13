# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M4 are merged into `main` (PR 9, 10, 12 to 15, 17); their entries are archived in
  `docs/journal/archive-M1.md` to `-M4.md`. Decisions Q5 to Q16 settled (NR-012 to NR-018).
- M4.1 (PR 18), M4.2 (PR 19) and M4.3 (PR 20, main 274ef62) are merged; entries archived in
  `docs/journal/archive-M4.1.md` to `-M4.3.md`. Q17, Q19 and Q20 answered as NR-029, NR-028, NR-027.
- 2026-11-12 M4.4 (NR-027, NR-028; FR-140 to FR-142) merged (PR 21, main e018d85; entry archived in
  `docs/journal/archive-M4.4.md`). Recruiting not built (probe in `scripts/probes/m4-4/`); decision card
  Q21 open, option (a) "no recruiting" taken meanwhile. v1 (M0 to M4.4) is complete.
- 2026-11-12 night shift (NR-030): v2 planning and implementation. Plan on branch `claude/v2-plan`
  (this worktree, the old docs worktree `imperialism-game-revival-fee36d`); one branch per milestone
  after it. The progress page files now live on these branches too (copied from the docs branch).
- 2026-11-13 M5 (FR-144 to FR-160, FR-235) merged (PR 23, main 0bfd870; entries archived in
  `docs/journal/archive-M5.md`). The app plays the continent. Card Q22 (the continent's tilt) still open.
- 2026-11-13 M6 Diplomacy on `claude/m6-diplomacy` (worktree `imperialism-game-revival-fee36d`): engine, UI, review fix
  round, QA fix round and the fixes of its review (QA review F1 to F4) done, FR-161 to FR-181 and FR-236 to FR-241 tested;
  not pushed. Next: the PR; add the decision card "who receives a grant" (fix round decision 3) at the checkpoint.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are still emoji. Not built from M3: Q15 (c) "repeat last turn's trades".
- The NR-016 list of other same-turn effects (archive-M4, part A entry) waits for a decision.
- M5 design item (M4 review note 5): partly settled by FR-115 (with a civilian selected elsewhere, a
  click on a tile's civilians is the selected civilian's order there); with none selected, a click on
  a tile's centre still selects its civilian, not the tile.
- M4.1 review note 5: the rail path search (`railPath` in `engine/ai/railPlan.ts`) treats a tile with
  a temporary job (prospecting, development) as blocked, so the engineer takes a longer route, or finds
  none, rather than waiting the few turns until the job ends.
- M4.1 review note 7 (decision 4): Expand, freight cars, training and sales can still cut a standing
  order without a refusal (as on main, now visible in the dialog), and an older dead order whose inputs
  come back takes its labour back the next turn, cutting a newer order. Not changed in M4.1.
- M4.3 review finding 4: `isDepotSite` checks only hills; it does not call `railTerrainAllowed`. Today a
  depot needs no rail on its own tile, so it does not matter; when technologies become lockable, a
  depot site SHALL also require `railTerrainAllowed` (the section into it is built on it).
- M4.3 review finding 5: `railPath` (`engine/ai/railPlan.ts`) finds the path with the fewest tiles, not
  the fewest missing sections, so it can ignore rail already built that a slightly longer path would reuse.
- M4.3 review finding 6 (hypothesis, not run): the score drop since M4.3 may come partly from
  `bestDepotSite`'s gain counting every gathered unit equally; weighing each unit by what the economy
  actually uses (food eaten, inputs of running buildings, what sells) may pick better sites.
- M4.4 review note 7: a stale store entry (an allocation in `transportAllocationsByNation` for a commodity
  that now has nothing to ship) flashes its group once per open, until the next slider move writes the
  clamped allocations back. The popup's local state clamps it right after the first render; the store keeps it.
- M4.4 review note 10: in the lever table the "free worker" rows add a worker who eats raw food, so what they
  lose is a freight car's load of inputs every turn, not the cost of recruiting. Only the guarded rows (a
  free worker after a labour-bound turn, R1, R2) support the conclusion that recruiting does not pay; the
  rows with a free worker every turn (sick and starved workers) say little about a policy.

## 2026-11-02 Revival setup

Size: L (process). Decisions: continue not restart; gold $200 / gems $500; delete superseded
branches and untrack old tool configs; v3 AI scripted and LLM behind one interface. Light
flow adopted from the work-repo SDD flow; reviews batched per milestone to cut cost.

## 2026-11-03 M1 headless core (archived)

Entries in `docs/journal/archive-M1.md`. Engine in `src/app/engine/` (Order, validate, apply,
resolveTurn, systems `(state, ctx)`, seeded RNG, scripted player); the store holds one
`GameState` plus UI state and the UI only submits orders. FR-001 to FR-026 tested; 280 unit
tests, Playwright 7 passed. Two objections went to M2: the job completion flags and the
`newGame` import of a test fixture (both settled in M2 part A).

## 2026-11-03 M2 economic loop (archived)

Entries in `docs/journal/archive-M2.md`. Production buildings with capacity and standing orders,
recipes, labour, food and sickness, training, migration, freight cars from lumber + steel + labour,
the Spring 1815 calendar, real job durations and costs; the engine owns the start world; capital
dialog, HUD date and food warning. FR-027 to FR-059 tested; 472 unit tests, Playwright 8 passed,
1 skipped. Merged as PR 13. Open: decision Q9 (freight cars count this turn; the rules say next turn).

## 2026-11-03 M3 money and score (archived)

Entries in `docs/journal/archive-M3.md`, with the decision cards Q10 to Q15. One world market
(sell, buy, cargo holds, price drift), the score (treasury + industry + development), game over after
40 turns, the market dialog, HUD score and game-over screen. FR-060 to FR-078 tested; 588 unit tests,
Playwright 10 passed, 1 skipped. Merged as PR 14 (review: merge, nothing must-fix; carried-forward list
in the archive's review entry).

## 2026-11-04 M3.5 small map and clean look (archived)

Entries in `docs/journal/archive-M3.5.md`. The rail line fix (FR-079), the 24x16 two-island start
world with island 2 kept for M4 (FR-080 to FR-083), Game Icons, faint terrain tints, the minimalist
palette and 42 px tiles (FR-084 to FR-090), and the review fix round (FR-091 to FR-096); 654 unit
tests, Playwright 15 passed, 1 skipped. Merged as PR 15; the carried-forward list is in "Resuming
here" and the archive's last entry.

## 2026-11-09 M4 second nation (archived)

Entries in `docs/journal/archive-M4.md`. Nation 2 "Valdoria" on island 2, played by the scripted player
at End Turn (FR-097 to FR-105); the score table, news per nation, Valdoria read-only, New game, 24 px
worker buttons and the tray (FR-106 to FR-111); review fix round. Merged as PR 17. Carried forward: the
list in "Resuming here".

## 2026-11-10 M4.1 play-test fixes (archived)

Entries in `docs/journal/archive-M4.1.md`, with its review fix round. Civilians share tiles, one job per
tile (FR-112 to FR-115); one production plan for the phase, the labour and the capital dialog (FR-116 to
FR-120); commodity icons in the market and capital (FR-121); a scripted engineer that builds depots and
joins them by the shortest rail path (FR-122 to FR-124). Merged as PR 18 (main b4d26ee).

## 2026-11-10 M4.2 scripted player score (archived)

Entries in `docs/journal/archive-M4.2.md`, with its review fix round. `engine/ai/economy.ts`: every
lumber + steel pair becomes capacity, goods fill the holds, pairs bought under $1,000, cheapest
development level first, depots only when they pay back (FR-125 to FR-132). Against the frozen M4 player,
seeds 1 to 4: turn 15 1.60 to 1.65 times, turn 25 1.76 to 1.81, turn 40 2.39 to 2.55. Merged as PR 19 (main a267a03).
## 2026-11-12 M4.3 transport popup and rail links (archived)

Entries in `docs/journal/archive-M4.3.md`, with its review fix round. The transport popup with icons, groups by
kind and columns (FR-133 to FR-135); rail links are only the sections built, the triangle bug (FR-136 to
FR-139); the scripted engineer orders sections. Lowest FR-125 ratio 1.60 to 1.55. Merged as PR 20 (main
274ef62).

## 2026-11-12 M4.4 Recruiting AI and empty groups (archived)

Entry in `docs/journal/archive-M4.4.md`, with its probe tables and review fix round. The transport popup lists only
what the network can carry and hides empty groups (FR-141, FR-142); the furniture bound counts 2 lumber (FR-140);
recruiting measured and not built (probe in `scripts/probes/m4-4/`, card Q21 option a). Merged as PR 21 (main e018d85).

## 2026-11-13 v2 plan (night shift, NR-030)

Size: L (plan). Branch `claude/v2-plan`. Ultracode workflow 1 (8 agents): code map (Sonnet 5.5 xhigh), four web
research lanes (Sonnet 5.5 xhigh: trade, diplomacy, army, combat; the combat lane stalled on a browser call and
was re-run with web pages only), rules writer (Sonnet 5.5 xhigh), spot-check (Sonnet 5.5 high), spec writer
(Opus 5.5 high: a spec others execute).

- Plan: `docs/REVIVAL_PLAN.md` section 5b (M5 to M10, seven architecture decisions).
- Rules: `docs/rules/01`, `06`, `07`, `08` extended, new `11-screens.md`; gaps updated (F12 to F19, H1 to H18).
  Main source: a Let's Play of Imperialism (1997) with screenshots (lparchive.org); every number tagged Imp1,
  Imp1 [?] or remake. Spot-check: 13 of 18 claims confirmed on the screenshots, 5 tagged [?]; the orchestrator
  opened Update 07 itself (text confirms the worker grades; costs are only on the screenshots).
- Requirements: FR-144 to FR-234 (M5 FR-144 to 160, M6 161 to 181, M7 182 to 198, M8 199 to 215, M9 216 to 234).
- Decision cards (defaults taken, nobody to ask; on the progress page): Q22 one land-bridge minor (Arvelia)
  and three island minors (option b, the spec writer's suggestion: neither capital province borders a minor);
  Q23 one province per minor; Q24 ten relation points a level, +1 a trade, +10 a pact, -40 a war; Q25 equal
  start relations; Q26 a consulate is needed to trade with a minor (plan rule; Imp1 needs none); Q27 a minor
  offers 1 unit per resource tile (at most 6) and buys 2 of each good; Q28 favourite partner = points +
  subsidy / 2, deals at the board price; Q29 the computer accepts alliance at level 7 and peace when losing;
  Q30 start army 2 Regulars, 1 Artillery, militia, fort on the capital; Q31 derived regiment costs, no
  Sappers; Q32 simple combat numbers (8 rounds, 70% hit); Q33 one army per country per province; Q34 a taken
  Great Power capital ends that nation, a taken minor capital makes a colony; Q35 the computer may attack the
  weakest minor from turn 10, never a Great Power; Q36 upkeep it cannot pay disbands the newest regiments;
  Q37 Join the Empire, rail and sea moves, generals and medals stay out of v2.
- Objection: one province per minor and one army per province make war short (one battle takes a minor);
  acceptable for a first playable war, revisit after Nathan plays.

## 2026-11-13 M5 World and seams for v2 (archived)

Entries in `docs/journal/archive-M5.md`: engine half, UI half, review fix round (19 findings), QA fix round (FR-235).
The continent world (two Great Power islands of 4 provinces each, Arvelia as the land bridge, Sundmark, Lorran and
Pellis on islands), minor nations apart from `nations`, `state.diplomacy` by pair, intents, `ctx.rngFor`, province and
minor borders on the map, the minor tile panel. FR-144 to FR-160 and FR-235 tested; 976 unit tests, Playwright 24
passed, 1 skipped; every v1 baseline unchanged on two-islands. Merged as PR 23 (main 0bfd870).

## 2026-11-13 M6 Diplomacy, engine half and UI half (archived)

Entries in `docs/journal/archive-M6.md`, with their plan-lite, red runs, decisions and evidence tables. Engine half (FR-161
to FR-174, FR-176, FR-180 and FR-181 engine parts): five diplomacy order kinds stored as intents, the diplomacy phase,
`state.proposals`, the scripted answers and peace offers, nine events; the engine API the UI uses is listed there; 1157
unit tests. UI half (FR-175, FR-177 to FR-179, the FR-180 e2e): the Diplomacy screen, Accept Offer, the relation colours;
1189 unit tests, Playwright 25 passed, 1 skipped.

## 2026-11-13 M6 Diplomacy, review fix round

Size: M (one fix round on three milestone reviews: 1 blocker, 2 major, 17 minor; three overlap). One fix agent (Opus 5.5,
xhigh, no subagents, no advisor call), started by the M6 workflow; same branch and worktree, not pushed. Review ids: A =
the first review (R1 to R11), B = the second (R1 to R5), F = the third (F1 to F4). The M6 rows were amended in place (not
merged yet, so no new ids; the M5 precedent). A behaviour fix has a test that failed on the code before it; a guard test
shows its check failing on a mutant (`scripts/probes/m6/review-mutants.mjs`, committed so the result can be re-run).

| Finding | What changed | Test |
|---|---|---|
| B-R1 (blocker) "n" on the Subsidy select ended the turn | `useKeyboardShortcuts`: "n" ignored in an input, select, text area or editable text, and while any `role="dialog"` is in the page; FR-178 states it | diplomacyDialog.test.tsx "the End Turn key", 4 rows (Home with Diplomacy or Accept Offer open; the hook alone with each field kind) |
| A-R1 (major), B-R2, F1 "Stop grant" took back this turn's grant | "Stop grant" disabled with "withdraw this turn's grant first" while a grant is ordered this turn (`stopGrantOf` in diplomacyView.ts); FR-178 | diplomacyDialog.test.tsx: lock + once grant: disabled, no order; withdraw, stop, give: End Turn stops the lock and pays the once grant only |
| A-R2 (major) the page's Accept Offer untested | test renders Home with a proposal | diplomacyDialog.test.tsx "the page itself (Home)" (mutant: `<AcceptOfferModal />` removed from page.tsx, caught) |
| F2 withdrawal fall-through queued a grant stop | `applyDiplomacyOrder`: only "grant" builds a stop; otherwise the state is returned unchanged | diplomacyOrders.test.ts "only "grant" can queue a grant stop" |
| B-R5 war on a treaty partner said nothing of the cost | the question adds "This breaks our pact with Arvelia: relations with every other country get worse." (row field `brokenByWar`), also in the group's description | diplomacyDialog.test.tsx "war on a pact partner or an ally" |
| B-R4 × titled "Decide later" | title "Close: an offer not answered by End Turn is refused"; FR-175 | diplomacyDialog.test.tsx closing row |
| B-R3 a grant's money goes to nobody | kept (decision 3); FR-170 and the screen's note say so | diplomacy.test.ts "a grant buys relations only"; diplomacyDialog.test.tsx note row |
| B-R2 (rest) once grant + lock pays both | FR-170 states it (engine decision 8) | diplomacy.test.ts "a once grant in a turn with a standing locked grant" |
| A-R3 `proposal-received` against FR-176 | FR-176 and FR-166 name the exception (receiver in `nationId`, proposer in `fromId`) | diplomacy.test.ts: the "every event" row now has a proposal and pins its ids |
| A-R4 minor bystander unguarded | 4 rows: either Great Power declares on the other, Arvelia at level 8 (30 to 20) or 0 (30 to 35) | diplomacy.test.ts (mutant: Great Powers only, caught) |
| A-R5 failure paths untested | rows: policy fails whole at war; subsidy without consulate at resolution; accept an alliance in the war's turn; 5 news lines (pact, war, peace, trade policy x2); FR-171 states "fails whole" | diplomacy.test.ts, gameText.test.ts (mutants caught) |
| A-R6 mutual proposals had no FR | kept and specified in FR-166 and FR-169 | diplomacy.test.ts: both propose peace (turn 2, Valdoria's first), both propose alliance at level 4 (mutants caught) |
| A-R7 three behaviours with no FR row | FR-162 (already-in-place for embassy, pact, alliance, peace), FR-177 (capital button), FR-178 (Stop grant) | docs |
| A-R8 FR-167 status | M7 (no trade at war, FR-185) and M9 (attacks, `warActive`) named as not built | docs |
| A-R9 unused helpers | `isAtWar`, `holdsConsulate`, `holdsEmbassy` deleted (and their `@/engine` exports) | tsc, the gate |
| A-R10 strength on the old Army shape | `regimentsOf` is the one read of the army shape; `militaryStrength` sums over it; FR-174 status says the (b) tests are provisional until FR-204 | scriptedDiplomacy.test.ts unchanged and green |
| A-R11 journal errors | FR-174 sentence corrected; the two scratch mutation rows marked not reproducible | docs |
| F3 frozen input missed paths | 3 frozen scenarios: answer accepted + new proposal + grant stop + unpaid lock; peace by answer + attacks dropped + unanswered refused; accept in the war's turn | diplomacy.test.ts (mutants: push into the input's proposals, delete from the input's grants, caught) |
| F4 pair key rebuilt by hand | `acceptsPeace` uses `pairKey` | scriptedDiplomacy.test.ts unchanged and green |

Decisions (defaults taken, nobody to ask):
1. A-R1: "Stop grant" waits (disabled, with the reason) rather than a new order kind for the stop. Objection: stopping a lock
   and giving a once grant in one turn takes three clicks (withdraw, stop, give); a `stopGrant` order would take one but
   changes FR-161's five order kinds.
2. B-R1: "n" is off while any dialog is open, not only on the Diplomacy screen (capital, market, warehouse, transport, About,
   game over). Objection: a player who ended turns with "n" while the capital dialog was open must close it first.
3. B-R3: a grant buys relations and no country receives the money (option 2: no baseline can move; the scripted player gives
   no grants, FR-181). Objection: rules 07 says only "raises relations" for Imp1; if Imp1 pays a Great Power recipient,
   option 1 (credit it) is a small change in `resolveGrants`. A decision card for the orchestrator to add at the checkpoint.
4. A-R6: the mutual agreement stays (removing it would make two nations that both offer peace refuse each other).
5. A-R9: deleted rather than tested without a caller; M7 adds a consulate read with its first caller (FR-185).
6. The mutation probe found that the select check was not pinned on its own (the Diplomacy dialog already blocks "n"), so the
   hook row covers a select with no dialog open.

Carried: B-R4's better fix (list a dismissed offer with Accept and Reject in the proposer's card, or reopen it from the HUD);
dormant until a proposal can reach the human (M8, M9). Found, not changed: holding "n" down ends one turn per key repeat (v1).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red, behaviour fixes | the four changed test files with the source as at 55c0aad | `Test Files 2 failed \| 2 passed (4)`, `Tests 9 failed \| 172 passed (181)`: the select presses (`expected 6 to be 1`), dialog open, Accept Offer open, the hook alone, Stop grant (`expected false to be true`), `war-cost` not found, the × title, the grant note, the F2 row |
| Guards bite (11 mutants) | `node scripts/probes/m6/review-mutants.mjs` | exit 0, each `caught`: A-R2 page `Tests 2 failed \| 34 passed (36)`; B-R1 select `1 failed`, dialog `2 failed`; A-R4 `4 failed \| 66 passed (70)`; A-R5 subsidy at war `1 failed`, news text `2 failed \| 53 passed (55)`; A-R6 peace `1 failed`, alliance `1 failed`; F3 push `1 failed`, delete `2 failed`; B-R3 `1 failed`. First run: B-R1 select `SURVIVED` (`36 passed`), fixed by the no-dialog hook row |
| Unit tests | `npm test` | `Test Files 74 passed (74)`, `Tests 1217 passed (1217)` (+28 on 1189); 0 "not wrapped in act" |
| FR-181, FR-159 v1 baselines | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` and `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]`, as before |
| Lint | `npm run lint`; `npx eslint . --ignore-pattern ".gate/**"` | `✖ 4 problems (0 errors, 4 warnings)`; `✖ 3 problems (0 errors, 3 warnings)` (as before, none new) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 2.9s`, `✓ Generating static pages (4/4)` |
| e2e smoke | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `25 passed (1.1m)`, `1 skipped` (the old `test.fixme` in `cursor-icons.spec.ts`); the "n" key row of `market-and-game-over.spec.ts` still passes |
| App check | a scratch Playwright spec (`.gate`, not kept, `PORT=3161`): consulate, embassy, pact + locked grant, then a once grant, "n" on Subsidy and on Give, Declare war | `1 passed (11.6s)`, turn stayed 4, no console error; `docs/journal/m6-fix-round-arvelia.png` (Stop grant greyed with its reason, the pact line) |

How to see it in the app: `npm run dev`, Diplomacy: with Arvelia's Subsidy select focused, "n" picks "none" and the turn
stays; with the dialog open "n" does nothing, closed it ends the turn. With an embassy and a locked grant, Give a once grant:
"Stop grant" is greyed with "withdraw this turn's grant first". With a pact, "Declare war" shows the second, red line.

## 2026-11-13 M6 Diplomacy, QA fix round (FR-236 to FR-241)

Size: M (Nathan's five QA items). One agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M6 workflow;
same branch and worktree, not pushed. FR-151 and FR-176 to FR-178 point to the new rows; FR-236 closes M4.3 finding 7.

| Item | What changed | Test |
|---|---|---|
| 1 FR-236 | `components/Modal.tsx` for all nine dialogs (Construction Options too): aria-modal, named by its title, focus in and back to the opener, Tab trap, Escape, backdrop click; a stack, so only the top dialog answers; About is a modal over the page | dialogs.test.tsx (37 rows), m6-dialogs.spec.ts (3) |
| 2 FR-237 | Diplomacy in two panes: a tab per country (chips, "1 ordered") and the selected one's panel; each refusal once under its group (`reasonLines`); a 640 px frame, only the panes scroll | diplomacyDialog.test.tsx (5 rows; helpers select a tab), m6-diplomacy.spec.ts fit test |
| 3 FR-238, FR-239 | war question: "A war on a minor nation also lowers our relations with every other minor nation, by half a level each."; `relation-changed.wars` and "(our war on Lorran)" | diplomacyDialog.test.tsx; diplomacy.test.ts (4 rows), gameText.test.ts (4), e2e news line |
| 4, 5 FR-240, FR-241 | `startTreaties` on a Great Power pair from newGame, removed by a war between the two; chips "Consulate since the start" + tooltip. "Declare war" at war: "we are already at war with them" | diplomacyState, diplomacy.test.ts (3), diplomacyDialog.test.tsx (3) |

Decisions (defaults, nobody to ask): (1) a dialog's name is its whole title ("Diplomacy — Testland"); exact names updated in
three unit test files, Playwright matches substrings. (2) Game over has no close; Accept Offer focuses the dialog itself
(Enter accepts), Escape rejects, the backdrop acts as ×; Escape in the war question answers "Keep the peace" first. (3) The
selected country outlives a close (component state; FR-160's guard unaffected). (4) "Since the start" needs history the state
lacked (a war ends the start treaties; one reopened after peace is not from the start), hence the optional engine mark;
Objection: one more field on FR-151's entry, read by no v1 baseline. (5) FR-241 is view wording; the engine keeps
`already-in-place`. (6) e2e/m5-hud-scroll (1) closes About (Escape) before measuring: About is no longer HUD content.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red | the 7 new or changed unit test files, then the 3 e2e specs, on the source of 41e1e54 | `Test Files 5 failed | 2 passed (7)`, `Tests 83 failed | 170 passed (253)` (passing: the market and icons name guards); e2e `6 failed`, `1 passed`; old dialog `{"scrollHeight":1369,"clientHeight":648,"dialogScrolls":true}` |
| Guards bite (14 mutants) | `node scripts/probes/m6/qa-mutants.mjs` | exit 0, each `caught` (e.g. no stack `1 failed`, no Tab trap `7 failed`, war keeps the mark `1 failed`) |
| Unit tests, baselines | `npm test` | `Test Files 75 passed (75)`, `Tests 1275 passed (1275)` (+58 on 1217), 0 act warnings; FR-125 and FR-157 lines as before |
| Lint, types, build | `npm run lint`; without `.gate`; `npx tsc --noEmit`; `npm run build` | `✖ 5 problems (0 errors, 5 warnings)` (2 in older .gate scripts); `✖ 3 problems` as before; exit 0; `✓ Compiled successfully in 3.0s` |
| e2e smoke | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `29 passed (1.3m)`, `1 skipped` (the old `test.fixme`) |
| App check, 1280x720 | `.gate/m6-qa/shots.mjs` (dev server 3160, scrollbars on) | `{"box":[180,40,920,640],"dialogScrolls":false,"details":"524/524"}`, no console error; `m6-qa-war-question.png`, `m6-qa-diplomacy-turn4.png` |

How to see it: `npm run dev`, HUD "Diplomacy": pick a country on the left; Tab stays inside, Escape or a click outside closes it.

## 2026-11-13 M6 Diplomacy, fixes of the QA fix round's review (QA review F1 to F4)

Size: M (4 minor findings; called "QA review F1" to F4 here, since the review fix round used F1 to F4 for its third
review). One fix agent (Opus 5.5, xhigh, no subagents, no advisor call), started by the M6 workflow; same branch and
worktree, not pushed. FR-236 amended in place (M6 not merged). To keep this file under 400 lines, the M6 engine half and
UI half entries moved unchanged to `docs/journal/archive-M6.md` before the milestone ends.

| Finding | What changed | Test |
|---|---|---|
| F1 Tab from a focused spot that is not a control: untested | no code change; FR-236 states it | diplomacyDialog.test.tsx: Tab from the war question to its "Declare war", "Keep the peace", Shift+Tab to the overture; Tab from a disabled control that keeps the focus; e2e m6-dialogs (4th test) |
| F2 `focusKey` and the focus return of Accept Offer, Game over, Construction Options: untested | no code change; FR-236 states the next offer's focus | dialogs.test.tsx, 4 rows: after a click left the focus on Reject the next offer has the focus on the dialog and Enter accepts it; Accept Offer, Game over and Construction Options give the focus back; Construction Options' Tab cycle |
| F3 Escape answered the war question only with the focus inside it | `useEscapeFirst` in `Modal.tsx`: a part shown in a dialog takes Escape first, wherever the focus is; the war question uses it instead of its own `onKeyDown` | diplomacyDialog.test.tsx: Escape on the Amount select, the country tab, the close button; e2e (Escape on Amount) |
| F4 after an order disabled or removed the focused control, Tab restarted at the top | `Modal.tsx` remembers on `focusin` what last took the focus and its place among the controls; with the focus on the page, Tab and Shift+Tab go on from there (disabled: the control after or before it; removed: the one now in its place) | diplomacyDialog.test.tsx: Consulate and Withdraw, both directions; e2e in Chrome: Enter on Consulate, Tab to "Declare war"; Enter on Withdraw, Tab to "Consulate ($500)" |

Decisions (defaults, nobody to ask): (1) F3: a context of the shared dialog, not a capture listener in the war question,
so the dialog stack still decides which dialog answers. Objection: one more export of `Modal.tsx` with one user. (2) F4:
the focus is mended when Tab is pressed, not moved right after the order, so a second Enter never acts on a control the
player did not pick. Objection: a screen reader hears nothing between the order and the next Tab. (3) A removed control's
place is its index when it took the focus; a list that changed before the removal could shift it by one (no screen does
that today), so no refresh on each key. (4) The unit tests imitate Chrome's focus fix-up by moving the focus off a
disabled button through a scratch button outside the dialog (jsdom's `blur()` ignores a disabled button).

Carried: Construction Options has no mutant of its own for the new rows (they run on the shared `Modal.tsx`, whose
focus-return and Tab-trap mutants are caught by the HUD rows).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red, F3 and F4 | `npx vitest run tests/ui/dialogs.test.tsx tests/ui/diplomacyDialog.test.tsx` with the tests first | `Test Files 1 failed \| 1 passed (2)`, `Tests 2 failed \| 89 passed (91)`: F3 `Unable to find ... "Diplomacy — Testland"` (Escape on Amount closed the dialog), F4 Tab landed on `aria-label="Close diplomacy"`, not "Declare war". F1, F2 rows are guards (green at red) |
| Guards bite (21 mutants) | `node scripts/probes/m6/qa-mutants.mjs` | each `caught`; the 7 new: F1 `3 failed \| 47 passed (50)`, F2 focusKey `1 failed \| 40 passed (41)`, F2 return (Accept Offer, Game over) `1 failed` each, F3 `2 failed`, F4 disabled `1 failed`, F4 removed `1 failed`; the no-trap mutant, re-pointed to the new `moveFocus` line, `8 failed \| 33 passed (41)` |
| Unit tests, baselines | `npm test` | `Test Files 75 passed (75)`, `Tests 1283 passed (1283)` (+8 on 1275), 0 act warnings; `FR-125 seed 1: ... t40 1493/650 (2.30)`, `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]` as before |
| Lint, types, build | `npm run lint`; without `.gate`; `npx tsc --noEmit`; `npm run build` | `✖ 5 problems (0 errors, 5 warnings)`; `✖ 3 problems (0 errors, 3 warnings)` as before; exit 0, no output; `✓ Compiled successfully in 3.3s`, `✓ Generating static pages (4/4)` |
| e2e red in Chrome | the new m6-dialogs test with `Modal.tsx` and `CountryDetails.tsx` as at 3128a62 (`-g "keyboard on the Diplomacy"`), then restored (`cmp` equal) | `1 failed`: `m6-dialogs.spec.ts:132` `expect(locator).toBeFocused() failed`, "Declare war" `Received: inactive` after Enter on Consulate and Tab |
| e2e smoke | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `30 passed (1.3m)`, `1 skipped` (the old `test.fixme`) |

How to see it: `npm run dev`, HUD "Diplomacy", pick Arvelia, Tab to "Consulate ($500)", Enter, Tab: the focus is on
"Declare war". Click "Declare war", Tab three times to "Amount", Escape: the question closes, the dialog stays.
