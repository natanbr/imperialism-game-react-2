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
- 2026-11-13 M6 Diplomacy in progress on `claude/m6-diplomacy` (worktree `imperialism-game-revival-fee36d`):
  engine half and UI half done (FR-161 to FR-181 tested; the Diplomacy screen, Accept Offer, relation colours,
  `e2e/m6-diplomacy.spec.ts`); not pushed. Next: the milestone review, then the PR.

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
- M4.3 review finding 7: the transport popup's dialog uses `aria-label` where `aria-labelledby` (its
  visible title) fits; no `aria-modal`, no focus moved into it on open or back on close, and Escape
  does not close it. Accessibility pass in M5.
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

## 2026-11-13 M6 Diplomacy, engine half (FR-161 to FR-174, FR-176, FR-180 and FR-181 engine parts)

Size: L (engine-wide: new order kinds, a turn phase, new state, the scripted player). One engine agent (Opus 5.5, xhigh,
no subagents, no advisor call), started by the M6 workflow. Branch `claude/m6-diplomacy` from main 0bfd870 (worktree
`imperialism-game-revival-fee36d`). The UI agent builds FR-175 (the dialog), FR-177 to FR-179 and the FR-180 e2e next.

Plan-lite:
- Change: five order kinds that store diplomacy intents (`orders/diplomacyOrders.ts`); the diplomacy phase that resolves
  them by kind in `intentOrder` (`systems/diplomacySystem.ts`); `state.proposals` for a human's answer next turn; the
  FR-174 answers and peace offers (`diplomacy/scriptedAnswers.ts`, `ai/diplomacy.ts`); nine events and their news text.
- Consumers: the UI half (Diplomacy screen, Accept Offer, e2e); M7 (trade reads consulates, subsidies, boycotts and war,
  and adds +1 a deal); M8 (`militaryStrength` reads the armies); M9 (attacks read `warActive`, conquest writes
  `War.captures`, peace already drops `attack` intents).
- Tests: FR-161 `orders/diplomacyOrders.test.ts`, `validate.test.ts`, `apply.test.ts`; FR-162 `validate.test.ts` (43 rows)
  and `ui/gameText.test.ts`; FR-163 to FR-173 and FR-180 `diplomacy.test.ts` and `store/diplomacyStore.test.ts`; FR-174,
  FR-181 `scriptedDiplomacy.test.ts` with `scriptedScore` and `continentScore` unchanged; FR-176 `ui/gameText.test.ts`,
  `ui/diplomacyNews.test.tsx`.
- Verify: the gate (`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`).
- Objection: the relation sizes (Q24) and the scripted thresholds (Q29) are remake guesses, and in M6 only grants, pacts
  and wars move relations; whether the nine levels feel right can only be judged once M7 adds +1 a trade.

Red before green (the six engine and text files written first, run on main's code): `Test Files 6 failed (6)`,
`Tests 67 failed | 149 passed (216)`. Three files failed to load (`Cannot find module '@/engine/diplomacy/queries'`:
`diplomacy.test.ts`, `scriptedDiplomacy.test.ts`, `orders/diplomacyOrders.test.ts`); `validate.test.ts` 38 of 143 (the five
FR-161 accepted rows, every FR-162 row expecting a new reason or "ok"); `apply.test.ts` 4 of 23; `gameText.test.ts` 25 of
50. Passing at red (guards): the FR-162 rows expecting `invalid-target` and the apply "refused, same object" row, since an
unknown order kind already fell to `invalid-target`. Written after the engine: `diplomacyNews.test.tsx` failed on the
old news panel (`Tests 1 failed (1)`, the line read "Consulate opened in minor-1."); `store/diplomacyStore.test.ts`.

Decisions (defaults taken, nobody to ask):
1. `proposal-received` carries the receiving human as `nationId` (and `fromId`), so "Valdoria offers us an alliance." is
   in the player's own news, not under "Valdoria:". FR-176 says "the acting Great Power". Objection: one event type reads
   the other way round; the alternative puts the player's own offer under another nation's name.
2. An accepted alliance or peace between two Great Powers emits `overture-done` for each of them (proposer first).
3. Both sides proposing peace (or an alliance) to each other in the same turn agree at once, whoever answers by rule.
4. `already-in-place` also for an embassy, pact, alliance or peace already ordered this turn (FR-162 names consulate and
   war only); answers and grants replace instead (FR-161).
5. A war's relation effects use the levels at the start of the war step, are summed per pair and clamped once; the pair
   loses 40 once per war even with two declarers. So the declarations' order changes nothing (FR-173). `relation-changed`
   compares each pair's level at the start and the end of the phase (one event per Great Power, none if it went back).
6. FR-174 (c): "no province changed hands in the last 3 turns" = no capture on turns T-3 to T-1 at the phase of turn T
   (combat runs after diplomacy). `War.captures` (M9 writes them) and `War.lastPeaceOffer` (the 3-turn wait) are new.
7. `militaryStrength(state, countryId)` sums FPN x health / 100 over `state.armies` units that are not militia, so it is
   0 until M8 and condition (b) never fires in M6 (both 0, not "below"); M8 may change the Army shape it reads.
8. A once-grant to a target with a standing locked grant pays both; a new locked grant replaces the standing one and is
   paid once that turn. "grant" withdrawn twice (stop already queued) is refused; give a new locked grant to resume.
9. A trade policy that fails at resolution (a subsidy at war or without a consulate) fails whole, boycott part too.
10. `GameState.proposals` is optional (newGame sets `[]`; a hand-built state reads `[]` via `proposalsOf`, as `market?`),
    so the 21 hand-built test states needed no setup line. `Intent.kind` stays a string; M6 narrows its own kinds as
    `DiplomacyIntent`, so the M5 intents test with kind "test" is unchanged. `addIntent` is generic to keep the fields.
11. `eventText(event, nameOf?)` names countries (ids by default); `newsLines` passes its `nameOf`. The HUD's NewsPanel
    (a UI file, one line) now also names minor nations.
12. ORDER_TEXT names: "Overture", "Grant", "Trade policy", "Withdrawal", "Answer".

Engine API for the UI half (all from `@/engine`): orders `proposeOverture { nationId, overture, targetId }`, `giveGrant
{ nationId, targetId, amount, locked }`, `setTradePolicy { nationId, targetId, subsidyPercent, boycott }`,
`withdrawOverture { nationId, overture | "grant" | "trade-policy", targetId }`, `answerProposal { nationId, proposalId,
accept }`; `OVERTURES`, `OVERTURE_COST`, `GRANT_AMOUNTS`, `GRANT_POINTS`, `SUBSIDY_PERCENTS`; `relationOf`,
`relationLevel`, `RELATION_SWATCHES`, `countryName`; `isAtWar`, `warBetween` (`since` for "At war since turn 5"),
`warActive`, `holdsConsulate`, `holdsEmbassy`; `diplomacyIntentsOf(state, nationId, targetId?)` (this turn's intents with
`cost`; kinds consulate to peace, "grant" with `amount`/`locked`, "grant-stop", "trade-policy" with
`subsidyPercent`/`boycott`, "answer"); `pendingProposalsFor(state, nationId)` (FR-175: open, unanswered, oldest first),
`proposalAnswer`, `proposalsOf`; `validateOrder` + `REFUSAL_TEXT` for the disabled controls (FR-178); `eventText(event,
nameOf)`, `newsLines`. Types `Overture`, `WithdrawableOverture`, `Proposal`, `ProposalKind`, `GrantAmount`,
`SubsidyPercent`, `War`, `DiplomacyIntent`, `DiplomacyOrder`. Not added: the `isDiplomacyOpen` store flag (FR-177; the
FR-160 reset guard in `store/computerNations.test.ts` will ask `startNewGame` to reset it).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red run, 6 files | `npx vitest run` of the six engine and text files | `Test Files 6 failed (6)`, `Tests 67 failed \| 149 passed (216)` |
| FR-161 to FR-174, FR-176, FR-180 engine | `npx vitest run` of the eight M6 files | `Test Files 8 passed (8)`, `Tests 317 passed (317)` |
| Guards bite (7 mutants) | `node mutate.mjs` (scratch): pact 0 points; consulate step before war; stored order, not `intentOrder`; peace (c) after 5 turns; embassy without consulate; -40 per declaration; locked repeat paid twice | each `Tests 1 failed` or more (1, 1, 1, 3, 2, 1, 5) |
| FR-181, FR-159 v1 baselines | `npm test` console; `git diff --stat 0bfd870 HEAD -- <the eight v1 files> m4ScriptedPlayer.ts continentScore.test.ts` | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` as in M5; `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]`; no diff |
| Engine commit alone (50a4b17) | the phase files set aside, `npx tsc --noEmit`, `npm test` | exit 0; `Test Files 69 passed (69)`, `Tests 1075 passed (1075)` |
| Unit tests | `npm test` | `Test Files 73 passed (73)`, `Tests 1157 passed (1157)` (+181 on 976); 0 "not wrapped in act" |
| Lint | `npm run lint`; `npx eslint . --ignore-pattern ".gate/**"` | `✖ 4 problems (0 errors, 4 warnings)`; without `.gate`: `✖ 3 problems (0 errors, 3 warnings)` (as in M5) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.2s`, `✓ Generating static pages (4/4)` |

Not run here: Playwright (not in this agent's gate; the UI half adds `e2e/m6-diplomacy.spec.ts`).

How to see it in the app: not yet; no control builds a diplomacy order until the UI half. Headless:
`npx vitest run tests/store/diplomacyStore.test.ts` plays a consulate, an embassy and a war on Lorran through the store.

## 2026-11-13 M6 Diplomacy, UI half (FR-175, FR-177 to FR-179, the FR-180 e2e)

Size: L (part of the milestone: two new dialogs, store flags, tokens). One UI agent (Opus 5.5, xhigh, no subagents, no
advisor call), started by the M6 workflow after the engine half. Same branch and worktree; not pushed.

Plan-lite:
- Change: `components/diplomacy/diplomacyView.ts` (rows, controls with their refusal text, the Accept Offer sentence; no
  React), `diplomacy/CountryCard.tsx`, `DiplomacyModal.tsx`, `AcceptOfferModal.tsx`, `Diplomacy.module.css`; store
  `isDiplomacyOpen` and `dismissedProposalIds` (both reset by New game); HUD and capital "Diplomacy" buttons;
  `--color-relation-0..8` in `tokens.css`, `RELATION_COLORS` and `relationColor` in `styles/theme.ts`; icon `GiScrollUnfurled`.
- Consumers: the player; M7 (the Board of Trade will reuse the consulate and policy controls' data), M9 ("Colony" in a row).
- Tests: FR-175, FR-177, FR-178 `tests/ui/diplomacyDialog.test.tsx` (28 rows); FR-178 `uiWritesOnlyOrders.test.ts` (+1);
  FR-179 `palette.test.ts` (+3); FR-160 guard `store/computerNations.test.ts` names the two new keys; FR-084 `icons.test.tsx`
  lists `diplomacy`; FR-180 `e2e/m6-diplomacy.spec.ts`.
- Verify: the gate plus `PORT=3160 npx playwright test --workers=1 --reporter=line`.
- Objection: every control of every country is on one scrolling screen (5 cards of about 220 px at 1280x720); Imp1 picks a
  country on a map first. With 4 minors it reads well; with more countries (v3) a selected-country layout may be better.

Red before green (the five test files written first): `Test Files 5 failed (5)`, `Tests 6 failed | 42 passed (48)`;
`diplomacyDialog.test.tsx` failed to load (`Failed to resolve import "@/components/DiplomacyModal"`), the FR-179 rows on
the missing tokens, the FR-160 guard on the missing keys, the icon list and the FR-178 scan row on the missing files.

Decisions (defaults taken, nobody to ask):
1. The spec is `e2e/m6-diplomacy.spec.ts` as FR-180 and the engine entry name it (the workflow brief said `e2e/m6.spec.ts`).
2. The capital dialog's Diplomacy button (disabled, "Coming in a later milestone") now opens the screen, like its Trade
   button opens the market. Objection: no FR row names it; tested under FR-177.
3. "Stop grant" (withdrawOverture "grant" with no grant this turn, FR-161) shows beside the grant control while a locked
   grant stands; otherwise the player could never end one. Once queued it lists as "Grant stops at End Turn" without
   Withdraw (the engine refuses a second stop, engine decision 8).
4. Every overture of the country's kind is shown, a refused one disabled with its reason under it and as its
   `aria-describedby` (FR-178 literal), rather than hiding the ones that do not apply.
5. Accept Offer: Escape always rejects; Enter accepts unless the focus is on a button or a form field (Enter on a focused
   Reject is that button's click). Closing it (×, "Close offer") puts the id in `dismissedProposalIds`, so it does not
   reopen this turn and End Turn refuses it. The global "n" key still ends the turn while it is open.
6. Words: ordered items read "Consulate $500", "Declaration of war free", "Peace proposal", "Grant $3,000, each turn",
   "Trade policy: subsidy 10%, boycott"; the Withdraw button's name is "Withdraw consulate" and so on (visible "Withdraw").
   A pair without an entry would read "No relations" (none in a real game).
7. The trade policy form starts at the policy in force (this turn's order, else the standing one) and resets each turn;
   "Set policy" stays enabled when the choice equals it (a valid order that changes nothing).
8. Relation colours #5b3a1e, #c0392b, #e07b2a, #e8c547, #e6d5ac, #9c6b3c, #8f8f8a, #8fc27a, #2f6b2f: neighbours 31.9 to
   47.6 apart (ΔE76), the closest pair overall dark brown and brown at 24.4; the swatch has a border so beige shows.
9. No map change: no M6 row asks for one (the Imp1 relationship map mode is not in FR-161 to FR-181).

| Claim | Command | Result (quoted) |
|---|---|---|
| Red run, 5 files | `npx vitest run` of the five UI test files | `Test Files 5 failed (5)`, `Tests 6 failed \| 42 passed (48)` |
| FR-175, FR-177 to FR-179 | `npx vitest run` of the same five files | `Test Files 5 passed (5)`, `Tests 76 passed (76)` |
| Guards bite (7 mutants) | `node mutate-ui.mjs` (scratch): minors listed first; no description; Enter on a button accepts; close does nothing; level counted from 0; war without asking; New game keeps Diplomacy open | each caught: `Tests 2 failed`, `4`, `1`, `1`, `2`, `1`, `1` |
| FR-180 e2e | `PORT=3160 npx playwright test e2e/m6-diplomacy.spec.ts --workers=1 --reporter=line` | `1 passed (12.4s)` |
| Smoke suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `25 passed (1.1m)`, `1 skipped` (the old `test.fixme` in `cursor-icons.spec.ts`) |
| FR-181, FR-159 v1 baselines | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` and `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]`, as before |
| Unit tests | `npm test` | `Test Files 74 passed (74)`, `Tests 1189 passed (1189)` (+32 on 1157); 0 "not wrapped in act" |
| Lint | `npm run lint`; `npx eslint . --ignore-pattern ".gate/**"` | `✖ 4 problems (0 errors, 4 warnings)`; `✖ 3 problems (0 errors, 3 warnings)` (as before, none new) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.1s`, `✓ Generating static pages (4/4)` |

Not checked in the running app: the Accept Offer dialog. No proposal reaches the human in M6 play (FR-174: the scripted
Great Power proposes peace only when it took a province or is stronger, and both are 0 until M8 and M9), so it is tested
with Testing Library only.

How to see it in the app: `npm run dev`, then the HUD's "Diplomacy" (or Capital, then Diplomacy). Order "Consulate ($500)"
for Arvelia, close, Advance Turn: Arvelia shows "Consulate" and the cash is $500 lower; next turn "Embassy ($5,000)"; then
"Declare war" on Lorran, confirm, Advance Turn: "At war since turn 4", dark brown, and the news line.
