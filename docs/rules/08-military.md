# 08 - Military: regiments, ships, combat, war rules (later phase)

> **Implementation notes**
> - Military is **not v1**. Model it as a later layer: provinces are single combat spaces; regiments are garrison members; fleets hold ships in sea zones. Costs are mostly arms (a commodity made in the Metal Works) plus workers lost for good, plus upkeep $25 per arms point per turn.
> - One combat engine only: the readme says "all fighting is the same"; auto-resolved and AI-vs-AI fights run the tactical rules without drawing them. A strategic formula does not exist separately.
> - Many numbers are known (stat tables, forts, entrenchment, landing size, rail deploy size); damage per shot, naval odds and heal rate are not documented (see gaps.md).
> - CODE MISMATCH: `types/Unit.ts`, `types/Navy.ts` match the stat table fields; `Army.morale/supply` have no rule; no combat code exists.

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Regiments

Three eras: about 1815-45 (first 9 types), 1845-80, 1880-end. Each of the 9 categories holds the best available type only; older types cannot be built once the upgrading tech is owned, but existing regiments may be upgraded at the price of a new unit minus the person (and horse); medals are kept. [M p36] [M p60] [W1]

Stat columns (manual): FPN normal firepower, FPM melee firepower (adjacent only), RNG range in tiles (defending range in brackets), DEF defence (entrenched in brackets), MVR tiles moved per initiative turn on the battlefield, ARMS armaments points to build; ARMS also set the rail transport size (see section 5). [M p91]

| Cat. | Era | Regiment | FPN | FPM | RNG | DEF | MVR | ARMS | Worker | Horse | Cash $ | Unlocked by | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Militia | 1 | Minutemen | 5 | 5 | 5 | 4(5) | 4 | NA | - | - | free, immobile | start | [M p91] |
| Light Inf. | 1 | Skirmishers | 5 | 5 | 5 | 7(8) | 6 | 1 | untrained | no | 200 [?] | start | [M p91] [W2] |
| Regular Inf. | 1 | Regulars | 10 | 10 | 5 | 5(6) | 4 | 1 | untrained | no | 500 | start | [M p91] [W1] |
| Heavy Inf. | 1 | Grenadiers | 12 | 12 | 5 | 5(6) | 4 | 1 | trained | no | 1,000 | start | [M p91] [W1] |
| Light Cav. | 1 | Hussars | 7 | 10 | 3 | 7 | 11 | 1 | untrained | 1 | ? | start | [M p91] [W3] |
| Heavy Cav. | 1 | Cuirassiers | 15 | 19 | 3 | 5 | 9 | 1 | trained | 1 | 500 | start | [M p91] [W1] |
| Light Art. | 1 | L. Artillery (Horse Art.) | 10 | 3 | 9(10) | 3(4) | 5 | 2 | ? | 1 | ? | start | [M p91] |
| Heavy Art. | 1 | Artillery | 16 | 4 | 11(12) | 2(3) | 3 | 2 | ? | ? | ? | start | [M p91] |
| Comb. Eng. | 1 | Sapper | 0 | 0 | 5 | 3(4) | 4 | 2 | expert | no | ? | start | [M p91] [W4] |
| Militia | 2 | Militia | 7 | 7 | 8 | 4(5) | 4 | NA | - | - | free | Breech-Loading Rifles | [M p91] [M p37] |
| Light Inf. | 2 | Sharpshooters | 10 | 10 | 8 | 7(8) | 6 | 2 | untrained | no | 3,000 | Bessemer | [M p91] [W1] |
| Regular Inf. | 2 | Rifle Infantry | 15 | 15 | 8 | 7(8) | 4 | 2 | untrained | no | 3,000 | Breech-Loading Rifles | [M p91] [W1] |
| Heavy Inf. | 2 | Guards | 17 | 17 | 8 | 7(8) | 4 | 2 | trained | no | 4,000 | Breech-Loading Rifles | [M p91] [W1] |
| Light Cav. | 2 | Scouts | 10 | 13 | 5 | 7 | 11 | 2 | untrained | 1 | 2,000 | Bessemer | [M p91] [W1] |
| Heavy Cav. | 2 | Carbineers | 20 | 26 | 5 | 5 | 9 | 2 | trained | 1 | 3,500 | Breech-Loading Rifles | [M p91] [W1] |
| Light Art. | 2 | Field Artillery | 17 | 5 | 12(13) | 3(4) | 6 | 4 | trained | 1 | 5,000 | Rifled Artillery | [M p91] [W1] |
| Heavy Art. | 2 | Siege Artillery | 30 | 8 | 14(15) | 3(4) | 3 | 4 | trained | no | 5,000 | Rifled Artillery | [M p91] [W1] |
| Comb. Eng. | 2 | Combat Engineer | 0 | 0 | 8 | 4(5) | 4 | 2 | expert | no | 7,000 | Bessemer | [M p91] [W1] |
| Militia | 3 | Conscript | 10 | 10 | 10 | 10(12) | 5 | NA | - | - | free | Machine Guns | [M p91] [M p37] |
| Light Inf. | 3 | Rangers | 15 | 15 | 10 | 20(25) | 7 | 4 | ? | ? | ? | Machine Guns | [M p91] |
| Regular Inf. | 3 | Infantry (Modern) | 22 | 22 | 10 | 20(25) | 5 | 4 | ? | ? | ? | Machine Guns | [M p91] |
| Heavy Inf. | 3 | Machine-gunners | 25 | 25 | 10 | 20(25) | 4 | 4 | ? | ? | ? | Machine Guns | [M p91] |
| Light Cav. | 3 | Mechanised | 22 | 28 | 10 | 10(12) | 11 | 4 | ? | ? | ? | Internal Combustion | [M p91] |
| Heavy Cav. | 3 | Armour | 45 | 60 | 12 | 20(25) | 9 | 10 | ? | ? | ? | Internal Combustion | [M p91] |
| Light Art. | 3 | Mobile Artillery | 25 | 8 | 15(16) | 20(25) | 8 | 6 | ? | ? | ? | Large Artillery | [M p91] |
| Heavy Art. | 3 | Railroad Guns | 50 | 12 | 17(18) | 20(25) | 3 | 8 | ? | ? | ? | Large Artillery | [M p91] |
| Comb. Eng. | 3 | Saboteur | 0 | 0 | 10 | 10(12) | 5 | 3 | ? | ? | ? | Dynamite | [M p91] [M p37] |

- Unlock technologies: [M p37]. Rifle Infantry needs Breech-Loading Rifles (one wiki page says Rifled Artillery; use the manual). [M p93]
- Armoury inputs: cash + armaments + worker (grade per unit) + horse (cavalry, field artillery) + fuel (some late units). Shortages show in red. [M p60] [W1]
- Upkeep: $25 per turn per ARMS point of each land unit; no food. [W5]
- Cash costs known for 11 of 27 regiments (wiki, "table under construction"); the Cuirassier is $500 for 1 arm, while the wiki "dollars per gun" table prints 250; treat as unverified. [W1] [?]
- Era-3 defence values change sharply: Conscripts and Mechanised 10, all other era-3 units 20 (artillery was 3 before). [W6]
- Light infantry take less damage and move well in rough terrain; light cavalry/artillery are fast; heavy cavalry cannot entrench; artillery **cannot entrench** (v1.0 readme overrides the manual). [M p37] [M p38] [W7]
- Regiments of Minutemen, Militia and Conscripts cannot be moved or deployed by rail. [M p91]
- Army size limit on a battlefield: 42 regiments (3 columns of 14). [W7]

## 2. Militia and garrisons

- Every province starts with free local militia-category regiments: normally 4 in a Great Power province, 3 in a Minor Nation province (capital fortified and stronger). They cannot leave the province, cost nothing, fight only when it is invaded, and upgrade for free with the matching tech. More are added as a province develops; destroyed or after a conquest they regrow over years. [M p37] [W8] [W9]
- Units that stay behind at End Turn defend automatically; units ordered to move are chosen by category via arrows or one by one in the Garrison Book. [M p39]
- Observed fortified Minor Nation capital: 3 Minutemen + 4 Regulars + 1 Artillery; AI capital garrisons of 17-48 units were seen. [W10] [?]
- Colonies come with their own garrison (5 heavy artillery + 4 Regulars each seen at Nigh-On-Impossible). [W11] [?]
- You may disband a regiment (no refund, upkeep ends). [W7]

## 3. Experience, generals, rewards

| Rule | Value | Source |
|---|---|---|
| Medals | one per 3 victories or 5 defeats, max 4; each raises initiative and firepower; 4 medals about 2x power | [M p41] |
| Upgrades | keep medals | [W12] |
| General | commands an army, restores morale, assesses enemy strength; reward for army expansion | [M p39] [M p90] |
| General threshold | wiki: 6 arms of units; first General seen about 1831 in three games, so the real threshold is higher [?] | [W13] [W10] |
| Admiral + flagship | wiki: 5 Ships of the Line give an Admiral and a free SoL; the flagship is the best ship available | [M p47] [W13] |
| New recruits with 1 medal | after taking a Minor Nation capital | [W13] |
| Capitol: migrants per 3 provinces instead of 4 | after taking a Great Power capital | [W13] |
| Armoury rewards | better Armoury gives medal-starting troops | [M p60] |

## 4. Combat rules

| Rule | Value | Source |
|---|---|---|
| Declare war first | needed for any hostile act; cannot be refused; war starts next turn; attack only from adjacent provinces | [M p77] [M p39] |
| Battles happen between turns | orders are simultaneous; clashes in the same province are resolved in order of **army initiative** (army makeup + leader experience) | [M p86] |
| Reinforcements | later arrivals fight a second battle and count as already moved | [W6] |
| Auto resolution | no separate formula: the tactical engine runs without display; firepower is the attack value for both | [M p41] [W7] |
| Tactical order | units act by individual initiative; cavalry before infantry before artillery; medals and leaders modify; defenders move first | [M p87] [W14] |
| Fire and move | cavalry may move and fire until done; infantry and light artillery move then fire; heavy artillery moves **or** fires; unspent fire is held as opportunity fire | [M p87] [M p89] |
| Health bar | green = fit, red = hurt, yellow = morale broken; an all red/yellow unit flees, may surrender if enemies are near | [M p88] |
| Entrenchment | garrisons entrench automatically: 20% less damage taken | [M p89] |
| Forts | each level adds 10 points: levels 1/2/3 = 30/40/50% reduction; units behind the wall (not on it) can only be hit by artillery | [M p89] |
| Fort details | one free immobile heavy artillery per level; three gates (v1.1); cannot be built in colonies; level 2 needs Bessemer, level 3 Large Artillery | [W6] [W15] [W16] |
| Wall destruction | artillery fire (slow) or Combat Engineers: one tunnel tile per turn, then a dynamite attack on one wall tile; v1.1 sappers that stand still dig 2 tiles per turn | [M p90] [W15] |
| Morale | a General next to a damaged unit restores morale (by his medals); over-use can get a unit killed | [M p90] |
| Retreat | all units may retreat; militia cannot (they fight on) | [M p88] [W7] |
| Healing | units that do not move heal each turn; rate not documented; ships heal only in port | [M p103] [M p48] |
| Capital loss | a Great Power that loses its capital is out: remaining provinces go into anarchy (no production; garrisons only defend, per manual; a player saw them attack), no declaration of war needed to attack them; colonies become independent | [M p18] [M p13] [W17] |
| Conquered land | works like home land; resources enter your network; you must rebuild rail, depots, ports | [M p18] [M p35] |
| Capital rush | the capital falls = game over for that power; the rest grabbed by others | [M p13] [W17] |

## 5. Moving armies

- Between own provinces: march to an adjacent province, or by rail to a distant own province. The rail limit is **1 arms point of units per 5 points of transport capacity** per turn; moving does not consume the capacity already allocated to commodities. [M p39] [M p48] [W7]
- A moved force's size = sum of ARMS of its regiments. [W7]
- Landing across water: a fleet sets a **beachhead** in a sea zone next to the enemy coast (land units cannot move that turn); from the next turn units in any own port province can attack that province as long as the fleet stays; force size allowed = total ARMS of the ships that hold the beachhead (frigate 2 -> 4 frigates = size 8). [M p43] [W7] [W18]
- An enemy fleet entering or patrolling the zone intercepts the landing; if the fleet loses, land units may drown. [M p40] [M p43]
- Declaring war on the turn you move is not allowed for hostile moves; hostile acts begin the turn after. [M p77]

## 6. Warships

Stat columns: FRP firepower, RNG range, ARM armour, HULL hull points, BATT MV battle speed, Speed sea zones per turn. Range is the most important ability, then speed. All naval battles and interceptions are resolved automatically. [M p45] [M p47]

| Ship | Class | FRP | RNG | ARM | HULL | BATT MV | Speed | Arms | Lumber | Fabric | Steel | Coal | Tech | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Frigate | fast | 3 | 5 | 10 | 35 | 4 | 3 | 2 | 5 | 2 | - | - | start; scrapped at Armoured Cruiser | [M p45] [W19] |
| Ship-of-the-Line | battle | 6 | 6 | 20 | 65 | 3 | 2 | 5 | 8 | 3 | - | - | start; scrapped at Advanced Ironclad | [M p45] [W19] |
| Raider | fast | 3 | 7 | 20 | 30 | 7 | 5 | 3 | 6 | - | - | 10 | Paddlewheels; scrapped at Battle Cruiser | [M p45] [W19] |
| Ironclad | battle | 5 | 8 | 55 | 50 | 5 | 3 | ? | ? | ? | ? | ? | Advanced Iron Working; scrapped at Dreadnought | [M p45] |
| Armoured Cruiser | fast | 6 | 9 | 50 | 40 | 8 | 6 | ? | ? | ? | ? | ? | Marine Engineering | [M p45] |
| Advanced Ironclad | battle | 10 | 10 | 60 | 70 | 6 | 4 | ? | ? | ? | ? | ? | Steel Armour Plate; never scrapped | [M p45] |
| Battle Cruiser | fast | 18 | 13 | 55 | 90 | 9 | 6 | ? | ? | ? | ? | ? | Improved Range-Finding | [M p45] |
| Dreadnought | battle | 20 | 13 | 70 | 115 | 7 | 5 | ? | ? | ? | ? | ? | Improved Range-Finding | [M p45] |

- Warships cost materials and armaments but **no workers, no cash, no upkeep**. [M p61] [W19]
- Fast ships (Frigate, Raider, Armoured Cruiser, Battle Cruiser) escort, intercept, blockade; battleships dominate sea zones. [M p46] [M p61]
- Obsolete ships are broken up when the replacing tech arrives; crews go to other ships. [M p48] [M p46]
- Ships are repaired only in port; repairing ships cannot escort. [M p48]
- Missions in the zone where the fleet is: Patrol (intercept all hostile ships), Blockade (a named port; better odds against ships using it), Landing site; or Move (cannot combine). Aggression low/normal/high decides whether the commander accepts battle. A fleet with the Defend command is removed from the unit cycle. [M p42] [M p43] [M p44]
- Interception: merchants caught can be sunk, captured with cargo, or just forced back; results in the battle report. [M p43] [M p86]
- Home-port warships at full health escort merchants automatically. [M p47] [M p71]
- A sea zone has no owner; several fleets, even hostile, can share it; undisputed command (you have no ship there) cuts adjacent ports from the network. [M p24] [M p49]
- Ships gain medals like regiments; 4 medals about 2x. [M p47]

## CODE MISMATCH

- `types/Unit.ts` `UnitStats` fields (fpNormal, fpMelee, range, defense, defenseEntrenched, move, armamentsCost) match the manual table; `RegimentCategory` has the 9 categories. No unit data, costs, workers or unlock techs exist yet.
- `types/Navy.ts` `ShipType` has all 8 ships and the right stat fields; no values loaded.
- CODE MISMATCH: `types/Army.ts` `morale` and `supply` (0-100) and `Army.leader.moraleBonus` have no rule in the manual (morale is per regiment inside a battle).
- Garrison model: the rules use one garrison per province (militia + regiments); code uses `Army` with `locationProvinceId` and `City.garrison: string[]`. Either works if "units in a province defend together".
- `types/GameState.ts` `TurnOrderSummary` lists 6 phases (diplomacy, trade, production, combat, interceptions, logistics); the manual lists the same six with transport arrival as the last. Matches. `runTurnPhases` adds development/transport connectivity phases that the manual does not have (worker jobs are resolved at End Turn too).

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Army_(Imp1) (table "under construction")
- [W2] GOG forum thread reported by a research agent (not re-opened): https://www.gog.com/forum/imperialism_series/skirmisherstactics_in_imperialism_1
- [W3] https://imperialism.fandom.com/wiki/Untrained_Worker (Hussar and Regular named as untrained positions)
- [W4] https://imperialism.fandom.com/wiki/Sapper and https://imperialism.fandom.com/wiki/Expert_worker
- [W5] https://imperialism.fandom.com/wiki/Army_(Imp1) and https://imperialism.fandom.com/wiki/Expansion_(Imp1)
- [W6] https://imperialism.fandom.com/wiki/Military_strategy_guide
- [W7] v1.0 and v1.1 readmes https://imperialism.fandom.com/wiki/README.TXT and https://imperialism.fandom.com/wiki/README11.TXT
- [W8] https://imperialism.fandom.com/wiki/Minor_nation_(Imp1)
- [W9] https://imperialism.fandom.com/wiki/Province_(Imp1)
- [W10] https://imperialism.fandom.com/wiki/Ocpal_(Imp1), https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple, https://imperialism.fandom.com/wiki/Brete_(Imp1)
- [W11] https://imperialism.fandom.com/wiki/Trade_(Imp1)
- [W12] https://imperialism.fandom.com/wiki/Medal
- [W13] https://imperialism.fandom.com/wiki/Reward
- [W14] https://lparchive.org/Imperialism/Update%2008/ and GameFAQs guide by Ed Randtke, Wayback copy https://web.archive.org/web/2022/https://gamefaqs.gamespot.com/pc/197614-imperialism/faqs/16042
- [W15] https://imperialism.fandom.com/wiki/Army_(Imp1) (forts hold free heavy artillery) and v1.1 readme
- [W16] https://imperialism.fandom.com/wiki/Engineer_(Imp1)
- [W17] https://lparchive.org/Imperialism/Update%2016/ and https://imperialism.fandom.com/wiki/Capital
- [W18] https://imperialism.fandom.com/wiki/Ship_(Imp1)
- [W19] https://imperialism.fandom.com/wiki/Ship_(Imp1) (table "under construction")
