# Journal archive: M6 Diplomacy (part 1)

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
