# Gaps - rules and numbers not established

Ranked by importance for **v1** (map, workers, transport, industry, world-market selling, score). Military, diplomacy, AI and Council come after. "Source" names the best way to close the gap. Status date: 2026-11-02.

Legend for the Source column
- **Video** = a gameplay video or Let's Play showing the UI dialog (hover texts, Deal Book, Trade Book, Status screens); NotebookLM over transcripts or frames helps only where the number is printed on screen.
- **Play log** = instrumented play of the real game (GOG release) with saves before and after a turn, reading numbers off the screen.
- **Save file** = save-game inspection with the German save editor (https://sei.bplaced.net/Spiel-Editor-Imperialismus/) or a hex diff of `SLOTx.IMP`.
- **Forum** = a specific forum thread or the SSI official strategy guide (not found online as text).

## A. Blocks v1 (decide or close before building the feature)

| # | Gap | Why it matters | Best source | Fallback for v1 |
|---|---|---|---|---|
| A1 | **Price model**: how the world price of each commodity moves each turn (formula, bounds, effect of one nation's volume); exact start prices per commodity (seen: raw about 100, materials 300, goods 900, horses 300, canned food about 94, oil about 110) | the only income in v1 is selling goods; wrong prices break the economy balance | Play log (record price series of 5 commodities for 40 turns) + Save file | start at the table in 06, drift +/-3% per turn toward supply/demand, clamp 50%-250% [?] |
| A2 | **Minor Nation demand and supply per turn**: how many units each MN offers or buys of each commodity, how that changes with year, relations and price; whether MNs ever stop buying | fixes how many goods you can sell per turn; limits profit | Play log + Video (Trade Book tabs) | each MN buys 1-3 units of each good per turn at the market price [?] |
| A3 | **Favourite-partner ordering** formula (relations vs subsidy weight) and the relation points per level | decides who gets the first offer; matters once two nations trade | Play log / Save file | rank by relations + subsidy percent with equal weight [?] |
| A4 | **Job durations** for Farmer, Rancher, Driller and for Miner/Forester at every level; prospect cost; Driller job costs | worker economy and `workerDurations.ts` are placeholders | Video (turn counter) or Play log | 3 turns for all level-ups, 1 for prospecting, costs $100/$1,000/$5,000 [?] |
| A5 | **University fee per civilian type** (known: Prospector $500, Miner $1,500; others "$500 to over $1,500"), and whether it changes with the era | cost of growing the worker pool | Video of the University dialog | $500 for Prospector, Engineer, Farmer; $1,500 for Miner, Rancher, Forester, Driller [?] |
| A6 | **Starting state by difficulty**: warehouse contents, initial civilians, initial army, initial buildings, credit limit, tech owned | the start balance of v1 | Play log (screens of turn 1) | Normal: $10,000, 4/2/1 workers, 4 holds, 15 cars, six processing buildings built [?] |
| A7 | **Score formula** and scale of the in-game score | v1 needs a score; original weights unknown | Play log (read the final score table with known chart values) | use the project score from `REVIVAL_PLAN.md` |
| A8 | **Credit rules**: credit-limit formula, interest per turn, forced-sale price, behaviour when over the limit | affects whether the player may overspend | Play log | limit = 10% of last 4 turns' trade income, interest 3% per turn above half the limit [?] |
| A9 | **Power Plant**: fuel-to-labour ratio, build cost and capacity steps; Refinery build cost | strong late labour source | Video of the Power Plant dialog | 1 fuel -> 1 labour, cap 100 [?] |

## B. Needed for a faithful v1 (can be approximated first)

| # | Gap | Why it matters | Best source |
|---|---|---|---|
| B1 | Town development: verify the factory-size thresholds, the 6-turn delay, oil/fuel step, what happens to output when transport is short | free income; large effect on balance | Play log; Wiki talk page of Town_development_(Imp1) |
| B2 | Tile counts per province and terrain mix of a random world; chance of minerals per hill/mountain tile; how many fish a port collects | map generator fidelity | Video of map screens; Save file |
| B3 | Rail cost for mountains; mine/derrick purchase; depot adjacency rule (wiki: not adjacent to another depot or port) and whether two hubs gather the same tile twice | transport planning | Play log |
| B4 | Merchant ships: cargo and speed of all five types; Freighter cost; speeds of merchants (interception) | trade capacity growth | Video of Shipyard dialog |
| B5 | Board of Trade commodity order (clothing first; rest unknown) | decides which deals consume scarce holds first | Video of Bid and Offers screen |
| B6 | Labour accounting rules: can labour be assigned in single units; what happens to leftover odd labour; is sickness applied before or after production | integer effects in industry | Play log |
| B7 | Food: how fractions of a group of four are rounded; exact order of eating inside a turn when stocks are short | starvation edge cases | Play log |
| B8 | Capitol migration: unconfirmed limit floor(provinces/4); effect of the Capitol upgrade; random event frequency | population growth speed | Play log |
| B9 | Training and Armoury/University timing: does training use the turn it starts; do new workers work the next turn | order of operations | Play log |
| B10 | Interest/forced sale effect on production orders | stability | Play log |

## C. Trade, diplomacy and colonies (v1.5)

| # | Gap | Why it matters | Best source |
|---|---|---|---|
| C1 | Nine relationship thresholds in trade points; points per trade, grant, pact, war; the four Minor Nation "families" membership | colonies, favoured trader | Play log; Save file |
| C2 | Join-empire acceptance rule (dark green plus what?), the "too far under the sway of another power" refusal | colony timing | Forum; Play log |
| C3 | Developer unlock threshold (seen at about relationship level 7); overseas profit share by level | overseas income | Play log |
| C4 | Subsidy effect numbers for Imperialism 1 (wiki values are from Imperialism II) | competition for markets | Play log |
| C5 | Whether Minor Nations' purchase power grows with the year | late-game selling | Play log |

## D. Military (later)

| # | Gap | Source |
|---|---|---|
| D1 | Cash, worker grade, horse and fuel for 16 of 27 regiments (Hussars, both artillery of era 1, Sapper, all era-3 units) | Video of Armoury dialog; the wiki army table once finished |
| D2 | Material cost of Ironclad, Advanced Ironclad, Armoured Cruiser, Battle Cruiser, Dreadnought, Paddlewheeler details | Video of Shipyard dialog |
| D3 | Damage per shot, hit chance, morale thresholds, retreat rule, heal rate per turn | Play log; Forum (SSI guide) |
| D4 | Naval combat resolution, blockade and patrol interception odds, admiral effect | Play log with save diffs |
| D5 | General and Admiral reward thresholds (wiki 6 arms / 5 Ships of the Line contradict sightings) | Play log |
| D6 | Whether ships sink when a capital falls; whether anarchy garrisons attack | Play log |
| D7 | Cuirassier cash (500 vs 250 per gun) | Video of Armoury dialog |

## E. Council of Governors and AI (later)

| # | Gap | Source |
|---|---|---|
| E1 | Weights of interior, diplomatic and military strength in the nomination; exact governor decision rule; why one player needed "90" votes | Play log over many saves; Save file |
| E2 | AI decision rules: war trigger thresholds, peace, alliance function, force sizes, tech purchase order, build order, capital choice rule, personalities by colour | Save file (AI parameters), Zetaboards "Imperilist" forum via Wayback, Apolyton threads |
| E3 | Do the AIs use town growth; when do they build hill forts | Save file |

## F. Source conflicts to resolve (pick the manual unless marked)

| # | Conflict | Where | Pick for now |
|---|---|---|---|
| F1 | Gems on mountains in terrain table vs gems only in Minor Nations | manual p23 vs p53 | gems only in Minor Nations |
| F2 | Rifle Infantry unlocked by Breech-Loading Rifles (manual) vs Rifled Artillery (wiki) | 08, 09 | manual |
| F3 | Consulate opens next turn (manual) vs counts at once (wiki) | 07 | counts in that turn's trade, other orders next turn |
| F4 | Anarchy garrisons only defend (manual) vs attack (Let's Play) | 08 | manual |
| F5 | GPs can be asked to join the empire (manual) vs not (v1.1 readme) | 07 | readme |
| F6 | Depot spacing: advised gap of two tiles (manual) vs not adjacent (wiki) | 04 | not adjacent |
| F7 | Frigate arms 3 (wiki prose) vs 2 (wiki table, readme) | 08 | 2 |
| F8 | Power Plant expands with lumber + steel (wiki) vs $5,000 flat (one player) | 05 | lumber + steel |
| F9 | Votes needed: >2/3 of 120 = 81 vs a player quoting 90 | 01 | >2/3 of all votes |
| F10 | $16,000 per turn upkeep for 48 units (wiki report) vs $25 per arms point | 08 | $25 per arms point |
| F11 | Where are the 1.0/1.1 numbers valid: some wiki pages mix Imperialism II numbers (Trade_(Imp1) subsidy leads, 153-trade ladder) | 07 | treat as hints |

## G. Which gaps would a video/NotebookLM pass close?

- **Good fit** (number or option is displayed in a dialog or table): A5 University fee, A6 starting state, A9 Power Plant, B4 merchant ships, B5 Board of Trade order, D1/D2/D7 Armoury and Shipyard costs, C3 Developer unlock level, A7 score screen, game start screens, tile counts (B2), diplomacy colour levels.
- **Partial** (needs a time series from the screen): A1 prices (read the price column each turn), A2 MN demand (Trade Book tabs), A4 job durations (count turns between order and completion), B1 town growth timing.
- **Poor fit** (hidden formula; needs many controlled experiments or save diffs): A3 favourite-partner formula, A8 credit, C1 relation steps, D3 and D4 combat, E1 council weights, E2 AI rules.
- A realistic plan: one gameplay video series (or a few Let's Plays with dialogs visible) transcribed with frames for the "good fit" group; one recorded 40-turn play session of the real game logging prices and deal books for the "partial" group.
