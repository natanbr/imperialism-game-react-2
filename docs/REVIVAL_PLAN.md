# Revival plan (2026-11-02)

Status of this document: approved by Nathan on 2026-11-02 (all four decisions in §7).
Written after a full audit of the code, docs and branches. This file replaces `ROADMAP.md`
and `TECH_DEBT.md` as the only plan document. How work runs is in `docs/FLOW.md`; live
status is on the progress page (data in `docs/report/roadmap.json`).

## 1. Goals (stated by Nathan, 2026-11-02)

- **Side project, for fun.** Progress in small, finished steps. No step may leave the build red.
- **v1: the basics.** A playable single-player loop that uses Imperialism's core ideas:
  map, civilian workers, transport network, industry, a way to earn money, a score.
- **v2: more real-world complexity.** Layers added on top of v1 (demographics, politics,
  finance, logistics realism). Not designed yet, but v1 must not block it.
- **v3: AI-driven nations.** Other countries make their own decisions. Candidate approaches:
  scripted heuristics, or an LLM given the nation's view of the game state. Not decided.
  **Consequence for v1:** the game core must be a headless, pure, serializable
  `state + orders -> state` boundary, and every nation (human or not) must act through the
  same order API. This is the single most important architectural rule in this plan.

## 2. Where the project stands (audit 2026-11-02)

Measured, not claimed. Evidence is `file:line` in the audit notes below.

| Area | Roadmap claims | Reality |
|---|---|---|
| Map, tiles, workers, worker jobs | done | Works. 40×40 test map since the perf commit. Movement has no adjacency check. Job durations are all placeholder values (20 `TODO`s in `definisions/workerDurations.ts`). |
| Transport network (rail, depot, port, BFS activation, logistics) | done | Works and is the best-tested part (15 tests). `railroadSystem.ts` mutates the input state (purity leak). |
| Industry and production | done | Recipe engine and training exist in `store/industrySlice.ts` and are tested, but the slice is commented out in `rootStore.ts` and `productionSystem` is a `return state` stub. Nothing is produced in the running game. Industry buildings do not exist. |
| Worker job costs | done | UI checks affordability; nothing is ever debited. The debit was removed in commit e6b47cf. 3 tests fail because of this. |
| Turn loop with 8 systems | described as real | 3 of 8 do something (development, transport connectivity, logistics). Diplomacy, trade, production, combat, interceptions are stubs. |
| Nations | implied multi-nation | One nation, hard-coded `nation-1`. Three unused mock nations. Loops are nation-keyed, so the shape is right, but no two-nation path was ever run. |
| Determinism | seeded RNG | Only `developmentSystem` receives the RNG, and its single draw is unreachable because the test map pre-places every hidden resource. No per-game seed in state. |
| Orders / commands | n/a | None. A click mutates state at once. `startProspecting` and `startDevelopment` scan the whole map and start every available worker of that type, for any nation. Move-and-construct drops the building `kind`. |
| UI/game state separation | tech debt item | Not done. Camera, selection and modal flags live in the same Zustand object that `runTurnPhases` receives. No save/load. |
| Refactoring phases | done | Half done. The refactored `CapitalModal/` folder is dead code; the live file is the old 284-line one with 36 inline styles. Two dead hooks are named in `CLAUDE.md` as the pattern to follow. |
| Tests | ">80% coverage" target | 57 tests, 54 green, 3 red. No tests for 5 of 8 systems, no multi-nation test, no determinism test. E2E file uses capitalised selectors against lowercase DOM values, so 4 of 7 cases self-skip. |
| Build health | | `tsc` clean, lint 0 errors / 16 warnings. |
| Branches | | 9 local and 4 remote branches. All unmerged ones are old and superseded by main. Local `main` was 1 commit ahead of `origin/main` (perf commit, not pushed). |
| Docs and tool configs | | Four docs disagree on phase numbers and on gold/gem prices (manual $200/$500, roadmap and code $100/$1000). Seven config files for tools no longer used (Junie, Zencoder, Kilo, Roo, Warp, Copilot chatmode) are committed, plus `.idea/` and `settings.local.json`. |

**Why it went "one step forward, two back":** every step was recorded as done when the UI
looked right, not when a test proved it. Refactoring was done in phases detached from
features, so half-finished refactors shipped beside the old code. Instructions for six
different AI tools drifted apart, and the roadmap became a wish list rather than a status.

## 3. Recommendation: continue, do not restart

Keep:
- The plain-data `GameState` types (JSON-serialisable, no classes).
- The `(GameState) => GameState` helper and system signatures.
- The rail, connectivity and logistics systems and their tests.
- The recipe engine (move it out of the Zustand slice into a pure system).
- The `get*Actions` legality functions as the seed of a move generator.

Delete (safe, no information lost): `WARP.md`, `.junie/`, `.zencoder/`, `.kilocodemodes`,
`.kilocode/`, `.roo/`, `.github/chatmodes/`, `src/app/page copy.tsx`,
`src/app/workers/AbstractWorker.ts`, `src/app/workers/WorkerAction.ts`,
`src/app/components/CapitalModal/` (dead refactor), `src/app/hooks/useTileInteractions.ts`,
`src/app/hooks/useWorkerActions.ts`, the five empty slices (`army`, `city`, `diplomacy`,
`navy`, `trade`), `src/app/testing/mockMap.ts`,
`tests/systems/railroadSystem.test.ts.skip`, `tests/setup.ts`. Untrack `.idea/` and
`.claude/settings.local.json`. Delete all superseded local branches.
Keep `src/app/testing/mockNation.ts`: it already defines three nations and becomes the M1
two-nation fixture.

Rewrite the three slash commands in `.claude/commands/`: `/feat` tells the agent to stop and
ask before starting and to ask whether tests are wanted; `/fix` points at a
`REFACTORING_PLAN.md` that does not exist. Both contradict section 6 (tests are mandatory,
work runs autonomously).

Docs after cleanup: `docs/rules/` (rules of the original game, one topic per file, replaces
`manual.md`), `docs/ARCHITECTURE.md` (how the code is built, paths corrected after M0),
this file (plan), `docs/FLOW.md` (how work runs), `docs/requirements.md`, `docs/journal.md`,
`docs/report/` (progress page). `CLAUDE.md` is commands and pointers only. The PDF manual
stays in the repo as the source; agents never read it.

## 4. Architecture decision for v1: the headless core

```
src/app/engine/            pure TypeScript, no React, no Zustand, no DOM
  state/GameState.ts       data only, has `seed`
  orders/Order.ts          { nationId, kind, ...params }  (discriminated union)
  orders/validate.ts       (state, order) => Ok | Rejected(reason)
  orders/apply.ts          (state, order) => state     (immediate effects: start job, pay)
  turn/resolveTurn.ts      (state, ordersByNation, seed) => { state, events[] }
  ai/                      v3. A "player" is just a function (view) => Order[]
src/app/store/             Zustand: holds one GameState + UI state, separately
src/app/components/        React: reads selectors, emits Orders
```

Rules:
1. Everything a player can do is an `Order`. The UI builds orders and calls `submit`; it
   never mutates game state directly. A nation AI in v3 produces the same `Order[]`.
2. `resolveTurn` is the only place turn, year, worker reset and all systems run. Today
   `turnSlice.advanceTurn` does part of that work outside `runTurnPhases`; that moves in.
3. Every system is `(state, ctx) => state` where `ctx` carries the RNG and the turn's orders.
   No system mutates its input (the rail-network mutation gets fixed).
4. `GameState` carries `seed`. A game replayed from `(initialState, orders[])` must produce
   identical state. One test asserts this.
5. One test runs two nations for 20 turns headlessly. It is the AI-readiness proof and the
   regression net for everything after.

This is the only "refactor" allowed in v1, and it is done as the first milestone, with
features frozen until it is green.

## 5. v1 milestones

Each milestone is one PR, one or two evenings of work, green tests, and something new
visible in the app. Order matters.

**M0, Cleanup (half a day).** Split on 2026-11-02 into two parallel parts.
Code part (session `m0-cleanup`, its own PR): delete the files in section 3, fix the 3 red
tests by restoring the treasury debit (verified: commit e6b47cf deleted the six debit blocks
during a class refactor and added nothing in their place), fix the e2e selectors, gold $200 /
gems $500, delete superseded branches, push `main`. Docs and process part (the revival
session, its own PR): rules knowledge base, `docs/FLOW.md`, new slash commands, `CLAUDE.md`,
progress page, delete `ROADMAP.md`, `TECH_DEBT.md` and `manual.md`. `ARCHITECTURE.md` paths
are corrected after the code part merges. Done when: `npm test`, `npm run lint`, `npx tsc`
green and the doc set in section 3 is in place.

**M1, Headless core (the big one).** Section 4. Move commands into `Order` +
`validate` + `apply`; fix the untargeted start bug and the dropped `kind` on the way.
Separate game state from UI state in the store. Add `seed`. Done when: the two-nation
20-turn headless test and the replay-determinism test pass, and the app plays exactly as
before through the order API.

**M2, Close the economic loop.** Wire the recipe engine into `productionSystem`. Add
industry buildings with capacity (mill, factory) and labour. Workers eat food. Real job
durations from the manual. Fix every `CODE MISMATCH:` line in `docs/rules/02` to `06` (recipes,
prices, costs, durations, starting year 1815) and close the v1 gaps in `docs/rules/gaps.md`
that M2 needs, using the documented default where a gap stays open. Done when: grain on a farm ends up as canned food in the
warehouse through transport and production, proven by a test and visible in the app.

**M3, Money and score.** A world market: sell goods at a fixed-but-drifting price, buy
resources you lack. Worker recruitment and training cost money. A score (treasury +
industrial capacity + developed tiles) shown in the HUD and a "game over after N turns"
screen. Done when: a 40-turn headless game ends with a score and the app shows it. **This is
v1 playable.**

**M3.5, Small map and a clean look (NR-007 to NR-010).** Fix the broken rail line first. Then replace the start world with two small islands with a few tile types, give tiles faint backgrounds and resource icons (an icon library is allowed), and apply a minimalist palette to the map, HUD and dialogs. Done when: a new game opens on the two islands, every tile type and resource shows an icon, and Nathan approves the look from screenshots. The second nation of M4 starts on the second island.

**M4, Second nation on the map.** A second Great Power with its own capital, workers and
territory, driven by a trivial scripted player (`(view) => Order[]`: develop nearest tile,
build rail toward it). Both nations trade on the same world market. Done when: the human can
watch the other nation grow. This is the seam v3 plugs into.

Deferred past v1: nation-to-nation trade with bids and offers, diplomacy and treaties,
minor nations and colonies, military units and combat, technology tree, the Council of Governors vote that ends the game (NR-011, decision Q12), Council of
Governors. These are v1.5 or v2, chosen once v1 is fun.

v1 (M0 to M4.4) was complete on 2026-11-12 (main e018d85).

## 5b. v2 milestones (planned 2026-11-12, NR-030)

Scope named by Nathan: nation-to-nation trade and diplomacy, wars, hidden-rule research with web
screenshots, army screens and attack screens. Rules: `docs/rules/06`, `07`, `08`, `11-screens.md`.
Follow Imperialism (1997); a number from Imperialism II is a hint only (gaps F11). Hidden formulas
get a designed default recorded as a decision card.

**Architecture decisions for v2** (from the code map of 2026-11-12, recorded in the journal):
1. **Old world kept as a fixture.** `newGame` gets a `world` option. `"two-islands"` is the v1 world
   with its v1 world market, so every v1 baseline (scriptedScore margin, start-world and e2e tests)
   stays as it is and is never loosened. The app's default becomes the v2 world. A v2 baseline is
   added by its own requirement with a recorded reason.
2. **One random stream per system** (`ctx.rngFor(name)`), so a new draw in diplomacy or combat
   never shifts the price or development draws.
3. **Minor nations are not `Nation` entries.** A separate `state.minorNations` list, so score,
   production, food, logistics and the HUD keep iterating Great Powers only.
4. **One home for diplomacy state**: `state.diplomacy` keyed by country pair (relation level
   0..8 on the rules' nine-colour scale, consulate, embassy, pact, alliance, war). The duplicate
   fields on `Nation` are removed in the same task.
5. **Simultaneous orders through intents.** An order that involves a second country (an overture,
   a bid, an army move, an attack) stores an intent in state when applied; a turn phase resolves
   all intents together, in a fixed order that does not favour nation 1. Same pattern as the v1
   `market.orders`.
6. **Provinces.** `Tile.provinceId` plus `state.provinces`; ownership moves by province through
   one helper, so the about 41 `ownerNationId` read sites stay unchanged.
7. **Combat is headless.** `combatSystem` resolves a battle with the combat stream and emits a
   `battle-resolved` event holding the full report (rounds, units, losses, result). The attack
   screen builds an order; the battle screen replays the report. No tactical control in v2.

**The v2 world (default "continent").** Same 24x16 map, so the "whole map fits 1280x720" pins
hold. The two Great Power islands each split into 4 provinces. One minor nation, Arvelia, fills
the north channel as the land bridge between the islands (land war is possible from the start);
three more minor nations, Sundmark, Lorran and Pellis, sit on small islands (trade only until ships
exist). Decision card Q22, option b, taken 2026-11-13 (FR-145); the first draft had two land
bridges and two islands. Minor nations get the remake's own names and one neutral colour token.

**M5, World and seams for v2 (L).** Decisions 1 to 6 above; the v2 world as the app default;
province borders and minor nations drawn on the map; a minor nation's tile shows its name and
capital. Done when: a new game shows 2 Great Powers and 4 minor nations with provinces, and every
v1 baseline is unchanged on `"two-islands"`.

**M6, Diplomacy (L).** Overtures as orders: consulate, embassy, non-aggression pact, alliance,
grant, subsidy, boycott, declaration of war, peace. `diplomacySystem` resolves them at End Turn;
relations move on the nine levels (trade, grants and pacts raise them; war lowers them, also for
the victim's friends). The Diplomacy screen: every country with its relation colour, treaties and
the overtures you may order with their cost. The scripted Great Power answers proposals (peace,
alliance) with a simple documented rule. Done when: a consulate, an embassy and a war declared in
the app show up the next turn, and a headless test covers every overture.

**M7, Nation-to-nation trade (L).** In the v2 world the infinite world market is replaced: minor
nations offer what their tiles produce and buy goods, a set quantity per turn; Great Powers bid
and offer; the Board of Trade gives each offer to the favourite partner (relations plus subsidy).
Trade needs at least a consulate with a minor nation, war and boycott stop it, each deal raises
relations. Trade between the two Great Powers. The Trade screen (Bids and Offers) and the Deal
Book. The scripted player bids and sells through it. Done when: a 40-turn headless v2 game shows
both nations trading with minor nations and the computer still ends with a positive treasury.

**M8, Armies (L).** The era-1 regiment table (rules 08), the Armoury in the capital and a recruit
order (cash, armaments, horses, one worker), upkeep each turn, armies stationed in provinces,
militia garrisons in minor nations, a move order to an adjacent province (one province a turn).
The map shows an army marker with its size; the Army screen lists the armies in a province with
their regiments and lets the player move, merge or disband. The scripted player keeps a garrison.
Done when: a regiment recruited in the app appears next turn in the capital province and can be
moved.

**M9, War and the attack screen (L).** Moving an army into a province of a country you are at war
with is an attack. The attack screen shows both sides and a strength estimate and builds the
order; `combatSystem` resolves the battle at End Turn; the battle screen replays the report on a
small grid (deployment, rounds, losses, who holds the field). A won battle takes the province; a
taken capital ends that nation (its provinces go to the winner); a minor nation's lost capital
makes it a colony. The scripted Great Power defends, counter-attacks, accepts peace when losing,
and may declare war on a minor nation when much stronger. Done when: in the app the human
declares war on a minor nation, attacks, sees the battle, and takes the province.

**M10, Council of Governors (M, NR-011).** Only if M5 to M9 are merged. The vote that ends the
game once one nation is strong enough; the 40-turn end stays as the fallback.

**How a milestone runs in v2 (NR-030).** One ultracode workflow per milestone: requirements rows
(spec), tests red, implementation in one worktree (Opus 5.5 xhigh), the gate, a review by three
lenses (requirements coverage, correctness, engine rules: purity, determinism, headless) on
Sonnet 5.5 xhigh with each finding verified, one fix round, a delta re-review, a browser QA pass
with one screenshot. The orchestrator then runs the full gate including Playwright on the exact
merge commit and merges (NR-012). Milestones run one after another, because each one changes the
shared files (orders, state, turn loop); inside a milestone engine and UI run in parallel once the
engine types are committed. A milestone that fails its fix round or its gate stays open and
unmerged, and the night stops there.

**Status 2026-11-13: v2 (M5 to M10) is merged.** M5 PR 23, M6 PR 24, M7 PR 25, M8 PR 26, M9 PR 27,
M10 PR 28 (main 69ed08b). Requirements FR-144 to FR-317, every one tested; the gate on the last
merge: 2001 unit tests, 38 Playwright tests passed (1 skipped, the known rail-cursor fixme). Open
decision cards and carried notes are in `docs/journal.md` ("Resuming here") and on the progress page.

## 6. Working rules for this project (replaces the old refactoring phases)

- **Done means tested.** A roadmap box is ticked only when a test exists for it. Status in
  this file is rewritten from the test list, not from memory.
- **No refactoring phases.** Refactor only inside the PR that needs it, and finish it: no
  parallel old-and-new versions of a component.
- **One source of truth per topic**: rules in `manual.md`, code in `ARCHITECTURE.md`, plan
  and status here. Any AI instruction file points to these and adds nothing else.
- **Engine first.** New mechanics land in `engine/` with a headless test before they get UI.
- **Low involvement (NR-001).** Agents run milestones unattended with `/milestone <id>` and
  test their own work. Nathan sees progress on the progress page and answers decision cards
  there; a run never blocks on a question, it takes the documented default.
- **Models (NR-002, cost first).** Table in `docs/FLOW.md`. Reasons for the choices that
  differ from Nathan's global defaults:
  - Tests on Sonnet 5.5 high instead of xhigh: the systems are small pure functions; the
    test rows are fixed by the spec, so less reasoning is needed.
  - Bounded implementation on Opus 5.5 high instead of xhigh; xhigh stays for engine, store
    and turn-loop code. Sonnet implements only UI wiring (Sonnet implementation was judged
    not good enough on 2026-10-19).
  - Scans and file moves on Haiku 5.5: no reasoning needed.
  - No ultracode workflow per task. Measured in the work repo (week of 11–16 Oct): review
    and verify agents were 32% of spend and follow-up review rounds 10%. Here one review per
    milestone replaces per-task review; it is postponed to the milestone end, never skipped.
  - Scripted checks before model checks: the gate and the Playwright smoke suite cost no
    model tokens; the browser look is one screenshot per milestone.
- **PR gate**: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` green, and
  the two-nation headless test still green (from M1).

## 7. Open decisions

All four ruled by Nathan on 2026-11-02 ("I agree with all your decisions"):

1. Continue, not restart; v1 scope M0 to M4 approved.
2. Gold $200 and gems $500 per unit (manual values). NR-005.
3. Delete the superseded branches and untrack the tool configs, including the push to origin.
4. v3 nation AI: both scripted and LLM players behind one `(view) => Order[]` interface. NR-006.

New open decisions live on the progress page, not here.
