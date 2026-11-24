# War, peace and difficulty: notes for the full game (NR-035)

Written 2026-11-17 from Nathan's answers to cards Q114 and Q115. These are notes and a plan, not rows to build now.
Nothing here changes M13. The rows FR-488 and FR-489 stay as the temporary rule set.

## What Nathan decided

- **Q114 (war on the player): default (b) stands.** From turn 20 the scripted Great Power may target the player.
  Under FR-538 it declares when the army gathered at its front exceeds twice the weakest eligible border province's defence. Nathan: the 40-turn game and this single rule set are
  **temporary**. The full game needs several difficulty levels, and each level has its own rules for when to start a war.
- **Q115 (what the computer wants from a war): default (a) stands.** One province, then a peace offer every 6 turns.
  Nathan wants to go deeper into when and why to go to war, when to stop and what to weigh. This also depends on the
  difficulty. In the far future he wants to delegate the war decision to an AI.
- **Standing instruction:** take my suggestions and defaults, and keep the list of defaults so they can be verified
  and tuned later. That list is `docs/verify-and-tune.md`.

## Where the temporary rules live (the one place to change)

Everything below is a constant or one function, so a difficulty level can replace it without touching the engine:

| What | Where today | Value today |
|---|---|---|
| First turn a war on the other Great Power may start | `SCRIPTED_WAR.greatPowerFromTurn` in `definisions/combatRules.ts` | 20 |
| Strength needed before declaring | `SCRIPTED_WAR.strengthFactor` and FR-538's front-province check in `scriptedWar.ts` | More than 2 × the target province's defence, gathered at the front |
| Aim of the war | FR-489 in `scriptedWar.ts` | one province, then stop attacking |
| Peace offers | `SCRIPTED_DIPLOMACY.offerAgainTurns` | every 6 turns |
| Pause before a second war | FR-488 | no new war for 10 turns after a peace |
| Border warning | FR-495, FR-538 | warning in the news before the declaration |

## Plan for difficulty levels (future; needs its own spec and cards)

A difficulty level becomes one object, `DifficultyProfile`, chosen at game start and saved with the game
(optional field, so old saves still load). The AI reads it, the engine does not. First candidate fields:

1. **War timing:** earliest turn, and whether the computer attacks an idle player at all (easy: never; normal: from
   turn 20; hard: earlier, or when it sees a weak border).
2. **War trigger:** the reasons it may start a war. Candidates from the rules research (rules 10 sections 1, 3 and 4):
   lopsided military balance, a target that holds land it wants (resources, a harbour, the capital's neighbour), a
   rival that is about to win a Council vote, revenge for a lost province, a minor it wants to colonise first.
3. **War aim:** one province, a named list of provinces, everything except the capital, or conquest.
4. **When to stop:** it got what it wanted; it cannot take the capital now; its losses passed a limit; its treasury
   fell below a floor; the other side offers peace and its estimate says the war is not winnable.
5. **What it weighs:** field strength against defence, supply and transport at the front, relation points with the
   other nations, whether the other Great Power can be allied against it, the score gap, the turns left.
6. **Bluff and memory:** whether it re-declares when it thinks the player took too much (the Imp1 AI does); whether
   an expert can bait it by leaving a province weak (the Q115 objection).
7. **Other levels of the same profile:** Council vote buying (Q117), recruiting to staff mills (Q116), trade with the
   rival (Q118), how fast it learns technologies (Q133). One profile, one place.
8. **Navy (Q146, owner 2026-11-22):** Easy = M17's rule (defend a visibly threatened port with existing ships or one Frigate). Harder levels: build a fleet in advance according to position (island colonies, exposed coasts, a rival across water); prepare the attack fleet a few turns before a planned war; prepare the defence when another power is flagged aggressive (public signs only, FR-497: a declared war, a hostile fleet seen near its coast, falling relations).

Levels to offer, as a first guess: Peaceful (never attacks an idle player), Standard (today's rules), Hard (earlier,
more provinces, re-declares), Conquest (fights on, may take the capital). The 40-turn game then becomes the shortest of
several lengths, and war timing is measured in a share of the game length, not in fixed turn numbers.

## Plan to go deeper (research, then rows)

1. Read what the rules files and the original game say about each trigger and stop reason, one scenario per line
   (a table: scenario, what the AI sees, what it does, source). Mark each line "confirmed by the real game",
   "from the manual" or "our guess". The play-testing offer in the answer to Nathan would confirm the first kind.
2. Turn the table into a pure function `warDecision(view, profile) => { declare?, target?, aim, stopWhen }` that reads
   only what a human of that nation can see (FR-497). Today's rules become the Standard profile of that function.
3. Add a scripted test per scenario and a sim row per level (idle player, aggressor, trader), as FR-488 and FR-489 do.

## The far future: an AI that decides

The `warDecision` function in step 2 is the seam. It takes a view and a profile and returns an order, with no hidden
state, so a model-based decision can replace it. Requirements for that day: the same inputs as a human sees (FR-497),
a time limit, a fallback to the scripted rule when the model fails, and a log of each decision with its reason so
Nathan can review why a war started.
