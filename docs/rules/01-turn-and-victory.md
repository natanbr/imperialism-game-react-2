# 01 - Turn structure, calendar, starting state, victory and score

> **Implementation notes**
> - One turn = one season (3 months), 4 turns per year, a random game starts in **Spring 1815** and ends by the last Council vote in **1915** at the latest (400 turns). All nations give orders at the same time; resolution always runs in the same fixed phase order (section 1).
> - The game is won by a Council of Governors vote: 1 vote per province, >2/3 of all votes. First meeting 1825, then every 10 years; the tenth (1915) forces every governor to choose. Only the two top powers are nominated, from three strengths (interior, diplomatic, military).
> - A score exists but its formula is unknown. v1 must define its own (see section 5); the project plan proposes treasury + industrial capacity + developed tiles.
> - CODE MISMATCH: phase list and difficulty (list at the bottom). Start year RESOLVED in M2 (FR-027).

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Turn order

Orders are entered by all rulers during the turn and can be cancelled until End Turn. When all have ended, everything resolves simultaneously in this fixed order: [M p15] [M p16]

| # | Phase | Notes |
|---|---|---|
| 1 | Diplomatic offers exchanged, accepted or rejected | status changes take effect next turn [M p16] |
| 2 | Trade deals offered, accepted or rejected | see 06; units bought arrive next turn [M p16] |
| 3 | Industrial production | everything built (units, buildings, cars) is usable next turn [M p16] |
| 4 | Military conflicts resolved | [M p16] |
| 5 | Intercepted or blockaded trades cancelled | [M p16] |
| 6 | Transported commodities and delivered trades go to the warehouse | for use next turn [M p16] |

- Worker jobs (prospect, develop, construct) are also advanced when the turn ends; the manual treats them as map orders, not a numbered phase. [M p25] [?]
- Technology purchases become final at End Turn and work next turn. [M p94]
- Between turns the player sees, in order: diplomatic offers, trade offers (accept/reject), battle reports, Deal Book (balance sheet incl. overseas profits and upkeep), newspaper, then the new turn. [M p84] [M p73] [W1]

## 2. Calendar

| Rule | Value | Source |
|---|---|---|
| Turn length | 3 months; seasons Spring, Summer, Fall, Winter | [M p15] |
| Start (random world) | Spring 1815 | [M p60] [W2] |
| Scenarios | Recovery of France 1820, Unification Movements 1848-1890, Naval Competition 1882 (needs registration), plus fan scenarios | [M p95] [M p96] |
| Turns in a game | about 400 (Spring 1815 to 1915) | [M p15] |
| Technology windows | by year, see 09 | [M p93] |
| Council meetings | start of Spring in 1825, 1835, 1845, 1855, 1865, 1875, 1885, 1895, 1905, 1915 | [M p19] [W3] |

## 3. Starting state of a random world (Normal unless noted)

| Item | Value | Source |
|---|---|---|
| Countries | 7 Great Powers (one human or all AI) + 16 Minor Nations; 120 provinces | [M p17] [M p18] |
| Cash | $10,000 | [W4] |
| Population | 4 untrained, 2 trained, 1 expert (12 labour) | [W5] [?] |
| Merchant marine | 4 holds | [W5] |
| Transport | about 15 freight cars | [W6] |
| Civilians | an Engineer, 1-2 Prospectors, sometimes a Miner or Farmer; counts not documented | [W7] [?] |
| Army / navy | a few starting regiments (about 4 arms points, $100 upkeep per turn), one warship at the capital, militia in every province | [W4] [W7] [?] |
| Industry | six mills/factories exist (capacity 2 / 1) on Introductory and Easy; Normal and above you build them | [M p61] [M p62] |
| Warehouse | limited stock of commodities (amounts not documented) | [M p9] |
| Techs | High Pressure Steam Engine, Seed Drill | [M p93] |
| Embassies | with every other Great Power; no Minor Nation consulates (a few at Introductory) | [M p80] [W8] |
| Capital site | auto-chosen on Introductory and Easy; player-chosen otherwise | [M p9] [M p22] |

Difficulty (five levels): the level changes only starting advantages, not AI cleverness. [M p9] [W9]

| Level | Briefings | Capital / factories | Advantages |
|---|---|---|---|
| Introductory | automatic | auto; factories built; military set to Defend | human: more minerals likely, bigger warehouse, better relations with some Minor Nations (the readme says these are larger than on Easy) |
| Easy | on request | auto; factories built | human: economic advantage only |
| Normal | on request | player picks, builds own | none; AI equals human |
| Hard | on request | player picks | AI powers get advantages like the human's Introductory ones (readme: like Easy) |
| Nigh-On-Impossible | on request | player picks | AI also gets a large military lead |

Sources: [M p9] [M p10] [W10] (readme V).

## 4. Winning: Council of Governors

| Rule | Value | Source |
|---|---|---|
| Votes | each province has one governor = one vote; 120 votes in a random world | [M p19] [W3] |
| Win condition | a Great Power with **more than two-thirds** of all votes wins at once (81+ of 120) | [M p19] |
| Meetings | about every 10 years: 1825 first, 1915 tenth | [M p19] [W11] |
| Nominations | only the **two** leading powers are nominated, from the Council Projection: interior strength (industry, infrastructure, labour), diplomatic strength (relations, alliances, wars), military strength (arms of men and ships; size counts, not quality) | [M p14] [M p19] [W12] |
| Large army alone | not enough: an underdeveloped economy or diplomatic pariah is not nominated | [M p19] |
| Nominee's own votes | all provinces it owns: original, conquered, colonial | [M p19] |
| Other governors | most Minor Nation governors abstain early; support grows with the nominee's diplomatic, military and economic success; Minor Nation votes follow relations; at the tenth meeting every governor must choose a nominee | [M p19] |
| Votes seen | 1825: nominees together got only 20-23 of 120 (about 10-12% for the leader); 1845: 29 vs 28 in one game, 67 (56%) in another; 1855: 63 vs 27; 1895: win in a long game | [W13] [W14] |
| Cross-voting | provinces of a non-nominated power can vote for another nominee ("nearly every province voted for GB in 1835") | [W15] |
| v1.1 changes | governors are somewhat less likely to vote in early elections; a solo player elected before 1915 may refuse and keep playing | [W16] |
| No winner by 1915 | forced vote; the nominee with more governors wins | [M p19] [W11] |
| Early wins | possible if one power is far ahead; scenarios may remove early meetings (Recovery of France: none before 1835; Naval Competition 1882: only 1915) | [W16] [W17] |
| Loss | losing your capital loses the game for a human player | [M p13] |
| Diplomatic isolation | after repeated broken alliances only conquest can win | [M p84] |

The Status screen has Council Projection charts for merchant marine, world exports, industry, labour, overseas profits, transport and the combined projection. [M p14]

Weights of the three strengths, the exact governor decision rule and the nominee noise are **not documented** (gaps.md).

## 5. Score

- The final score reflects what the player built: military size, labour force, transport network, merchant marine, diplomatic standing, number of provinces. Weights and scale are not documented. [W11] [W18]
- The high-score cabinet shows small integers (Bismarck 10, Metternich 9, Morgan 8), so the scale may be 1-10 [?]. [W11]
- Project decision (not original): v1 score = treasury + industrial capacity + developed tiles, shown in the HUD with a "game over after N turns" screen. See `docs/REVIVAL_PLAN.md` milestone M3.

## CODE MISMATCH

- RESOLVED in M2 (FR-027), was: `constants/gameConstants.ts` `TIME_CONFIG.STARTING_YEAR = 1900`; random worlds start Spring 1815. `TURNS_PER_YEAR = 4` is right.
- `types/GameState.ts` `TurnOrderSummary` has six phases (diplomacy, trade, production, combat, interceptions, logistics), matching the manual. `systems/runTurnPhases.ts` runs 8 (development, diplomacy, trade, production, combat, interceptions, transport connectivity, logistics); the two extra phases are internal and acceptable, but the manual puts transport arrival last.
- `GameState.difficulty` names match; no effect of difficulty exists in code.
- No Council or score in code. Calendar seasons, cash start ($10,000) and start population: RESOLVED in M2 (FR-027, FR-043).

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Buy_(Imp1) and v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section I tutorials)
- [W2] https://imperialism.fandom.com/wiki/Gameplay_(Imp1)
- [W3] https://lparchive.org/Imperialism/Update%2004/ (first meeting Spring 1825, one vote per province) and wiki game reports Brete_(Imp1), Ocpal_(Imp1), Key_Scotland_(Imp1)_Blue
- [W4] https://imperialism.fandom.com/wiki/Key_1815_purple (cash $10,000, upkeep $100)
- [W5] https://imperialism.fandom.com/wiki/Brete_(Imp1) (population 4/2/1, 4 holds)
- [W6] https://imperialism.fandom.com/wiki/Freight_car
- [W7] https://imperialism.fandom.com/wiki/Starting_a_game_of_Imperialism
- [W8] https://imperialism.fandom.com/wiki/Diplomacy_(Imp1)
- [W9] https://imperialism.fandom.com/wiki/Difficulty_(Imp1)
- [W10] v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section V)
- [W11] https://imperialism.fandom.com/wiki/Gameplay_(Imp1)
- [W12] https://lparchive.org/Imperialism/Update%2004/ (descriptions of the three strengths)
- [W13] https://imperialism.fandom.com/wiki/Brete_(Imp1), Ocpal_(Imp1), Key_Scotland_(Imp1)_Blue, Resurrection_of_Holland_1815 (1825 totals)
- [W14] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple and https://lparchive.org/Imperialism/Update%2021/
- [W15] https://imperialism.fandom.com/wiki/Recovery_of_France_1820
- [W16] v1.1 readme https://imperialism.fandom.com/wiki/README11.TXT and v1.0 readme (section III)
- [W17] https://imperialism.fandom.com/wiki/Scenario_(Imp1)
- [W18] https://imperialism.fandom.com/wiki/Imperialism_(video_game) page text mirrored in https://imperialism.fandom.com/wiki/Imperialism
