# Gaps - rules and numbers not established

Ranked by importance for **v1** (map, workers, transport, industry, world-market selling, score). Military, diplomacy, AI and Council come after. "Source" names the best way to close the gap. Status date: 2026-11-12 (first written 2026-11-02; the 2026-11-12 pass closed or narrowed the gaps listed in the status log below).

Legend for the Source column
- **Video** = a gameplay video or Let's Play showing the UI dialog (hover texts, Deal Book, Trade Book, Status screens); NotebookLM over transcripts or frames helps only where the number is printed on screen.
- **Play log** = instrumented play of the real game (GOG release) with saves before and after a turn, reading numbers off the screen.
- **Save file** = save-game inspection with the German save editor (https://sei.bplaced.net/Spiel-Editor-Imperialismus/) or a hex diff of `SLOTx.IMP`.
- **Forum** = a specific forum thread or the SSI official strategy guide (not found online as text).

Source tags in this file: `[06:W31]` means tag `[W31]` in the Sources list at the bottom of `06-trade-and-market.md` (same pattern for 01, 07, 08, 11). Screens are in `11-screens.md`. `[?]` = unverified. Version rule: everything here is Imperialism 1 (1997); a number from a page that mixes in Imperialism II is marked `[?]` (F11).

## Status log 2026-11-12 (Let's Play screens, readmes, guides)

| Gap | Status | What is now known | Source |
|---|---|---|---|
| B5 | **closed** | 15 Board rows in a fixed order, clothing first, horses last; 17 rows with an extra material row (Fuel [?]) and Oil last | [06:W30] [06:W31] [06:W43] |
| C4 | **closed for price** | six subsidy steps 5/10/25/50/75/100; buy at floor(P x (1+s)), sell at floor(P x (1-s)), checked on 12 ledger lines; the hidden favourite effect stays in A3 | [06:W35] [06:W36] |
| F2 | **closed** | Rifle Infantry comes from Breech-Loading Rifles (in-game technology text) | [08:W25] [08:W27] |
| F3 | **closed** | a consulate ordered this turn counts in this turn's trades (cash 9,900 -> 8,900 before the first offer; the sheet says "We have a Consulate") | [07:W20] |
| F5 | **closed** | Great Powers cannot be asked to join; the Empire overture is for Minor Nations | [07:W3] [07:W22] |
| F9 | **supported (medium)** | >2/3 stands; a 95-of-120 win is shown; "90" was one poster's guess; no screen prints a threshold | [01:W20] [01:W23] |
| F10 | **closed (medium)** | $25 per arms point per turn; ledger 100 / 250 / 1,725 = 4 / 10 / 69 arms; the $16,000 for 48 units report is an outlier | [08:W24] [08:W31] [08:W32] |
| D7 | **closed (medium, derived)** | Cuirassier $500 and 1 arm (guide value model); the wiki 250 per gun looks like 500 / 2 | [08:W24] |
| D6 | partly | capital falls: fleet is disbanded (not sunk), production stops, land units fight on | [08:W24] [08:W28] |
| F4 | leaning to "garrisons attack" | LP and guide v1.02 against the manual; play test still pending | [08:W24] [08:W28] |
| A1 | narrowed | start prices of all 15 commodities (canned food $100), series 1815-1875, horses $30 from 1853 (floor 10% of start [?]); formula still open | [06:W30] [06:W31] [06:W32] |
| A2, C5 | narrowed | offers 1-6 units per seller; player sold 1-5 units of a good per Minor Nation per turn; demand per turn not measurable | [06:W33] [06:W37] [06:W38] |
| A3 | narrowed | each seller ranks all bidders by flags; ties follow a fixed Great Power order; weights and the text-vs-flag conflict open (H4) | [06:W38] |
| A6 | narrowed | LP start board: cash 9,900, 4 holds, 9-item warehouse, credit 200, upkeep 100 (difficulty unknown) | [01:W24] |
| A7 | narrowed | score screen has 9 categories, subtotal, difficulty multiplier and total (6,982 example); weights open | [01:W21] |
| A8 | narrowed | credit limit series 200 / 337 / 922 / 2,050, "Interest (12%)" line, ledger order; the rule is open (H3) | [06:W41] |
| B4 | narrowed | Indiaman 4 holds and Paddlewheeler 8 holds verified on the Shipyard card; Trader, Clipper, Freighter and speeds open (H7) | [06:W40] |
| C1 | narrowed | nine swatches in order, human start level 4, ladder consistent with the scale; points per action open | [07:W19] |
| C2 | narrowed | exact refusal text; trigger open | [07:W21] |
| C3 | narrowed | Developer at about level 7, land 20 x price; overseas share 75% / 100% against a guide's 30% / 12% (F15) | [07:W23] [07:W25] |
| D1 | narrowed | cash now known for 15 of 27 regiments (Skirmishers confirmed; Artillery, Mobile Artillery, Armor new on screen); 8 more derived, hypotheses | [08:W20] [08:W21] [08:W22] [08:W23] [08:W24] |
| D5 | narrowed | Generals came in 1833, 1837, 1845 with 69 arms of upkeep in between; no rule found | [08:W28] |
| E1 | narrowed | four vote sources, five observed meetings; the projection is an estimate, not the vote | [01:W20] [01:W22] |
| E2 | narrowed | war declarations are visible one turn early; AI refusals show no rule | [07:W22] [07:W26] |
| F11 | narrowed | the nine colours and the 153-trade ladder fit each other (Imp1); the numbers stay unverified; the readthedocs remake page is not Imp1 | [07:W19] |

## A. Blocks v1 (decide or close before building the feature)

| # | Gap | Why it matters | Best source | Fallback for v1 |
|---|---|---|---|---|
| A1 (narrowed) | **Price model**: how the world price of each commodity moves each turn (formula, bounds, effect of one nation's volume); exact start prices per commodity (seen: raw about 100, materials 300, goods 900, horses 300, canned food about 94, oil about 110) | the only income in v1 is selling goods; wrong prices break the economy balance | Play log (record price series of 5 commodities for 40 turns) + Save file | start at the table in 06, drift +/-3% per turn toward supply/demand, clamp 50%-250% [?] |
| A2 (narrowed) | **Minor Nation demand and supply per turn**: how many units each MN offers or buys of each commodity, how that changes with year, relations and price; whether MNs ever stop buying | fixes how many goods you can sell per turn; limits profit | Play log + Video (Trade Book tabs) | each MN buys 1-3 units of each good per turn at the market price [?] |
| A3 (narrowed) | **Favourite-partner ordering** formula (relations vs subsidy weight) and the relation points per level | decides who gets the first offer; matters once two nations trade | Play log / Save file | rank by relations + subsidy percent with equal weight [?] |
| A4 | **Job durations** for Farmer, Rancher, Driller and for Miner/Forester at every level; prospect cost; Driller job costs | worker economy and `workerDurations.ts` are placeholders | Video (turn counter) or Play log | 3 turns for all level-ups, 1 for prospecting, costs $100/$1,000/$5,000 [?] |
| A5 | **University fee per civilian type** (known: Prospector $500, Miner $1,500; others "$500 to over $1,500"), and whether it changes with the era | cost of growing the worker pool | Video of the University dialog | $500 for Prospector, Engineer, Farmer; $1,500 for Miner, Rancher, Forester, Driller [?] |
| A6 (narrowed) | **Starting state by difficulty**: warehouse contents, initial civilians, initial army, initial buildings, credit limit, tech owned | the start balance of v1 | Play log (screens of turn 1) | Normal: $10,000, 4/2/1 workers, 4 holds, 15 cars, six processing buildings built [?] |
| A7 (narrowed) | **Score formula** and scale of the in-game score | v1 needs a score; original weights unknown | Play log (read the final score table with known chart values) | use the project score from `REVIVAL_PLAN.md` |
| A8 (narrowed) | **Credit rules**: credit-limit formula, interest per turn, forced-sale price, behaviour when over the limit | affects whether the player may overspend | Play log | limit = 10% of last 4 turns' trade income, interest 3% per turn above half the limit [?] |
| A9 | **Power Plant**: fuel-to-labour ratio, build cost and capacity steps; Refinery build cost | strong late labour source | Video of the Power Plant dialog | 1 fuel -> 1 labour, cap 100 [?] |

## B. Needed for a faithful v1 (can be approximated first)

| # | Gap | Why it matters | Best source |
|---|---|---|---|
| B1 | Town development: verify the factory-size thresholds, the 6-turn delay, oil/fuel step, what happens to output when transport is short | free income; large effect on balance | Play log; Wiki talk page of Town_development_(Imp1) |
| B2 | Tile counts per province and terrain mix of a random world; chance of minerals per hill/mountain tile; how many fish a port collects | map generator fidelity | Video of map screens; Save file |
| B3 | Rail cost for mountains; mine/derrick purchase; depot adjacency rule (wiki: not adjacent to another depot or port) and whether two hubs gather the same tile twice | transport planning | Play log |
| B4 (narrowed) | Merchant ships: cargo and speed of all five types; Freighter cost; speeds of merchants (interception) | trade capacity growth | Video of Shipyard dialog |
| B5 (closed) | Board of Trade commodity order (clothing first; rest unknown) | decides which deals consume scarce holds first | Video of Bid and Offers screen |
| B6 | Labour accounting rules: can labour be assigned in single units; what happens to leftover odd labour; is sickness applied before or after production | integer effects in industry | Play log |
| B7 | Food: how fractions of a group of four are rounded; exact order of eating inside a turn when stocks are short | starvation edge cases | Play log |
| B8 | Capitol migration: unconfirmed limit floor(provinces/4); effect of the Capitol upgrade; random event frequency | population growth speed | Play log |
| B9 | Training and Armoury/University timing: does training use the turn it starts; do new workers work the next turn | order of operations | Play log |
| B10 | Interest/forced sale effect on production orders | stability | Play log |

## C. Trade, diplomacy and colonies (v1.5)

| # | Gap | Why it matters | Best source |
|---|---|---|---|
| C1 (narrowed) | Nine relationship thresholds in trade points; points per trade, grant, pact, war; the four Minor Nation "families" membership | colonies, favoured trader | Play log; Save file |
| C2 (narrowed) | Join-empire acceptance rule (dark green plus what?), the "too far under the sway of another power" refusal | colony timing | Forum; Play log |
| C3 (narrowed) | Developer unlock threshold (seen at about relationship level 7); overseas profit share by level | overseas income | Play log |
| C4 (closed for price) | Subsidy effect numbers for Imperialism 1 (wiki values are from Imperialism II) | competition for markets | Play log |
| C5 (narrowed) | Whether Minor Nations' purchase power grows with the year | late-game selling | Play log |

## D. Military (later)

| # | Gap | Source |
|---|---|---|
| D1 (narrowed) | Cash, worker grade, horse and fuel for 16 of 27 regiments (Hussars, both artillery of era 1, Sapper, all era-3 units) | Video of Armoury dialog; the wiki army table once finished |
| D2 | Material cost of Ironclad, Advanced Ironclad, Armoured Cruiser, Battle Cruiser, Dreadnought, Paddlewheeler details | Video of Shipyard dialog |
| D3 | Damage per shot, hit chance, morale thresholds, retreat rule, heal rate per turn | Play log; Forum (SSI guide) |
| D4 | Naval combat resolution, blockade and patrol interception odds, admiral effect | Play log with save diffs |
| D5 (narrowed) | General and Admiral reward thresholds (wiki 6 arms / 5 Ships of the Line contradict sightings) | Play log |
| D6 (partly) | Whether ships sink when a capital falls; whether anarchy garrisons attack | Play log |
| D7 (closed) | Cuirassier cash (500 vs 250 per gun) | Video of Armoury dialog |

## E. Council of Governors and AI (later)

| # | Gap | Source |
|---|---|---|
| E1 (narrowed) | Weights of interior, diplomatic and military strength in the nomination; exact governor decision rule; why one player needed "90" votes | Play log over many saves; Save file |
| E2 (narrowed) | AI decision rules: war trigger thresholds, peace, alliance function, force sizes, tech purchase order, build order, capital choice rule, personalities by colour | Save file (AI parameters), Zetaboards "Imperilist" forum via Wayback, Apolyton threads |
| E3 | Do the AIs use town growth; when do they build hill forts | Save file |

## F. Source conflicts to resolve (pick the manual unless marked)

| # | Conflict | Where | Pick for now |
|---|---|---|---|
| F1 | Gems on mountains in terrain table vs gems only in Minor Nations | manual p23 vs p53 | gems only in Minor Nations |
| F2 | Rifle Infantry unlocked by Breech-Loading Rifles (manual) vs Rifled Artillery (wiki) | 08, 09 | manual (closed 2026-11-12: in-game tech text [08:W25]) |
| F3 | Consulate opens next turn (manual) vs counts at once (wiki) | 07 | counts in that turn's trade, other orders next turn (closed 2026-11-12: first-turn offer sheet [07:W20]) |
| F4 | Anarchy garrisons only defend (manual) vs attack (Let's Play) | 08 | was: manual. Changed 2026-11-12 to **they attack** (LP Fall 1869 and guide v1.02, both Imp1; medium); the manual reading is kept in 08; play test pending [08:W24] [08:W28] |
| F5 | GPs can be asked to join the empire (manual) vs not (v1.1 readme) | 07 | readme (closed 2026-11-12, readme section VII [07:W3]) |
| F6 | Depot spacing: advised gap of two tiles (manual) vs not adjacent (wiki) | 04 | not adjacent |
| F7 | Frigate arms 3 (wiki prose) vs 2 (wiki table, readme) | 08 | 2 |
| F8 | Power Plant expands with lumber + steel (wiki) vs $5,000 flat (one player) | 05 | lumber + steel |
| F9 | Votes needed: >2/3 of 120 = 81 vs a player quoting 90 | 01 | >2/3 of all votes (supported 2026-11-12: 95-vote win shown, 90 was a guess [01:W20] [01:W23]) |
| F10 | $16,000 per turn upkeep for 48 units (wiki report) vs $25 per arms point | 08 | $25 per arms point (closed 2026-11-12, medium: ledger 1,725 = 69 x 25 [08:W24] [08:W31]) |
| F11 | Where are the 1.0/1.1 numbers valid: some wiki pages mix Imperialism II numbers (Trade_(Imp1) subsidy leads, 153-trade ladder) | 07 | treat as hints (2026-11-12: the ladder fits the nine Imp1 swatches, the numbers stay unverified; do not use the readthedocs `imperialism-remake-definition` pages, a fan remake [07:W19]) |
| F12 | Start cash $10,000 (wiki, Normal) vs $9,900 on the first Board of Trade and $8,900 on the first offer sheet after two $500 consulates (LP; difficulty not stated) | 01, 06 | $10,000 [?]; check on a played Normal start [01:W24] |
| F13 | Price trend: "drifts up", horses "about 300, steady", canned food start 94 (wiki games) vs goods rising to about 1830 then falling below start, raw 62-85 and horses $30 from 1853, canned food start $100 (LP boards) | 06 | keep the start table with canned food $100; do not model a one-way drift; floor of 10% of start [?] [06:W30] [06:W32] |
| F14 | Subsidy steps 5/10/25/50/100 (wiki, repo types) vs six buttons including 75% (screen) | 06, 07 | six steps [06:W36] |
| F15 | Overseas profit share: colonies 100% (manual, ledger Qak) vs about 75% per developed unit in a partner (ledger sums) vs royalty 30% partner and 12% colony (1998 guide, ambiguous) | 06, 07 | manual 100% for colonies, 75% for partners [?]; share by level open (H15) [06:W37] [07:W23] |
| F16 | A green dollar icon means subsidy (Trade Policies map) vs Trade Consulate (Political map) | 07, 11 | probably map-mode specific [?] [07:W22] |
| F17 | A pact improves relations "significantly" (manual) vs not by itself (one forum poster) | 07 | manual |
| F18 | First Council meeting: 20-23 of 120 votes cast in two wiki games and 11 vs 12 in another vs 62 cast (Mone 51) in the LP; 1855 "63-27" (wiki) vs 36 + 27 = 63 cast (LP) | 01 | samples only; v1.1 made early voting less likely, LP version unknown [?] [01:W20] [01:W23] |
| F19 | Score scale: cabinet shows 10 / 9 / 8 (wiki) vs a total of 6,982 on the score screen | 01 | score screen; the cabinet may show ranks [?] [01:W21] |

## H. New open gaps found 2026-11-12

| # | Gap | Why it matters | Best source |
|---|---|---|---|
| H1 | Price clamps: is $30 (10% of the $300 start) the global floor; any ceiling; per-turn change limit | economy balance | Play log with a 40-turn price series; Save file |
| H2 | Colony price rule: buy at min(base, market), sell at max(base, market) is one ledger's reading | colony value | Play log |
| H3 | Interest: the ledger says 12% but $38 on a $625 shortfall is about 6%; when interest starts | credit | Play log |
| H4 | Trade Book flags: why a seller lists fewer flags than bidders (oil 1860: 3 of 5); the offer sheet names Pfessottirg as Niridna's favourite while the flags put Visisik first | favourite order | Play log |
| H5 | Meaning of the blue round number badges (about 102 and 92) on the Trade Policies map | UI | Video of the screen; manual |
| H6 | Is the extra Board row between Steel and Cotton Fuel; do all era-3 Armoury units take exactly 4 fuel | Board order, D1 | Video of the 1875 board; Armoury screens |
| H7 | Merchant ship speeds (sea zones per turn) and the Trader, Clipper, Freighter cards (cards show battle speed 0) | interception odds | Shipyard video |
| H8 | How the Armoury "Available" worker figure is computed (it differs from the labour list: 4 vs 6 untrained) | worker accounting | Play log |
| H9 | On-screen costs of Hussars, Light Artillery, Sapper, Rangers, Infantry, Machine-gunners, Mech. Infantry, Railroad Gun, Saboteur | D1 | Armoury screenshots of later eras |
| H10 | Tactical screen: ground dots, bracket colours, the three square buttons, the general portrait function; whether a tile holds several units | UI and rules | Video |
| H11 | Auto-resolve: button label and result screen; capture condition of a town tile; turns per battle | combat | Play log |
| H12 | Strategic map: red vs green arrows, the 4 army buttons, more than one army per province, multi-province march without rail | movement | Play log |
| H13 | Score: difficulty multiplier per level (x2 seen) and the category weights | A7 | Play log at several difficulties |
| H14 | Council: why Other Great Powers gave 40 votes in 1825 in the LP; the Minor Nation abstention rule; v1.0 vs v1.1 | E1 | Play log; readme diff |
| H15 | Overseas profit share per relation level, with unit counts (the ledger prints dollars only) | C3 | Play log |
| H16 | Source limits: fandom wiki pages returned HTTP 402 to fetchers, MobyGames and web.archive.org were blocked, so every wiki Imp1 statement of this update came from search excerpts (medium or low) | all wiki rows | A real browser pass over the wiki |
| H17 | Lead for D3: the SSI official guide has a combat damage-modifier table; the chapters were never re-uploaded | D3 | A scan of the guide |
| H18 | Capturing a colony's capital wiped a rival's investments (one report); effect on other provinces and investors | war on colonies | Play log |

## G. Which gaps would a video/NotebookLM pass close?

- **Good fit** (number or option is displayed in a dialog or table): A5 University fee, A6 starting state, A9 Power Plant, B4 merchant ships, B5 Board of Trade order, D1/D2/D7 Armoury and Shipyard costs, C3 Developer unlock level, A7 score screen, game start screens, tile counts (B2), diplomacy colour levels.
- **Partial** (needs a time series from the screen): A1 prices (read the price column each turn), A2 MN demand (Trade Book tabs), A4 job durations (count turns between order and completion), B1 town growth timing.
- **Poor fit** (hidden formula; needs many controlled experiments or save diffs): A3 favourite-partner formula, A8 credit, C1 relation steps, D3 and D4 combat, E1 council weights, E2 AI rules.
- A realistic plan: one gameplay video series (or a few Let's Plays with dialogs visible) transcribed with frames for the "good fit" group; one recorded 40-turn play session of the real game logging prices and deal books for the "partial" group.
