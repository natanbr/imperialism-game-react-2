# Journal archive: M6 Diplomacy

Moved from `docs/journal.md` on 2026-11-13 during M6 (FLOW: the journal stays under 400 lines; the review of the QA
fix round needed room before the milestone ends). The two finished entries, the engine half and the UI half, are
unchanged; the review fix round, the QA fix round and what follows stay in the journal until M6 is merged.

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
| Guards bite (7 mutants; not reproducible: scratch script, not kept, review A-R11) | `node mutate.mjs` (scratch): pact 0 points; consulate step before war; stored order, not `intentOrder`; peace (c) after 5 turns; embassy without consulate; -40 per declaration; locked repeat paid twice | each `Tests 1 failed` or more (1, 1, 1, 3, 2, 1, 5) |
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
| Guards bite (7 mutants; not reproducible: scratch script, not kept, review A-R11) | `node mutate-ui.mjs` (scratch): minors listed first; no description; Enter on a button accepts; close does nothing; level counted from 0; war without asking; New game keeps Diplomacy open | each caught: `Tests 2 failed`, `4`, `1`, `1`, `2`, `1`, `1` |
| FR-180 e2e | `PORT=3160 npx playwright test e2e/m6-diplomacy.spec.ts --workers=1 --reporter=line` | `1 passed (12.4s)` |
| Smoke suite | `PORT=3160 npx playwright test --workers=1 --reporter=line` | `25 passed (1.1m)`, `1 skipped` (the old `test.fixme` in `cursor-icons.spec.ts`) |
| FR-181, FR-159 v1 baselines | `npm test` console | `FR-125 seed 1: t15 616/390 (1.58) ... t40 1493/650 (2.30)` and `FR-157 nation 2 score at turn 40: [[1,1493],[2,1496],[3,1490],[4,1476]]`, as before |
| Unit tests | `npm test` | `Test Files 74 passed (74)`, `Tests 1189 passed (1189)` (+32 on 1157); 0 "not wrapped in act" |
| Lint | `npm run lint`; `npx eslint . --ignore-pattern ".gate/**"` | `✖ 4 problems (0 errors, 4 warnings)`; `✖ 3 problems (0 errors, 3 warnings)` (as before, none new) |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Build | `npm run build` | `✓ Compiled successfully in 3.1s`, `✓ Generating static pages (4/4)` |

Not checked in the running app: the Accept Offer dialog. No proposal reaches the human in M6 play (FR-174: the scripted
Great Power proposes peace only when one of its provinces was taken or it is the weaker, which needs M9 conquest or M8 armies;
corrected by review A-R11), so it is tested with Testing Library only.

How to see it in the app: `npm run dev`, then the HUD's "Diplomacy" (or Capital, then Diplomacy). Order "Consulate ($500)"
for Arvelia, close, Advance Turn: Arvelia shows "Consulate" and the cash is $500 lower; next turn "Embassy ($5,000)"; then
"Declare war" on Lorran, confirm, Advance Turn: "At war since turn 4", dark brown, and the news line.

---

Part 2: moved from `docs/journal.md` on 2026-11-13 at the start of M7 (M6 merged as PR 24, main 2a60a3b). The
review fix round, the QA fix round and the fixes of its review follow, unchanged.

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
