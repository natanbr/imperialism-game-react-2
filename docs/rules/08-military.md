# 08 - Military: regiments, ships, combat, war rules (later phase)

> **Implementation notes**
> - Military is **not v1**. Model it as a later layer: provinces are single combat spaces; regiments are garrison members; fleets hold ships in sea zones. Costs are mostly arms (a commodity made in the Metal Works) plus workers lost for good, plus upkeep $25 per arms point per turn.
> - One combat engine only: the readme says "all fighting is the same"; auto-resolved and AI-vs-AI fights run the tactical rules without drawing them. A strategic formula does not exist separately.
> - Many numbers are known (stat tables, forts, entrenchment, landing size, rail deploy size); damage per shot, naval odds and heal rate are not documented (see gaps.md).
> - CODE MISMATCH: `types/Unit.ts`, `types/Navy.ts` match the stat table fields; `Army.morale/supply` have no rule; no combat code exists.
> - UPDATE 2026-11-12: section 7 adds six Armoury costs read off screens (four table rows filled), derived costs for eight more regiments, Force Size, the upkeep check (F10 closed), the in-game tech texts (F2 closed) and capital-loss evidence (F4 now leans to "garrisons attack").

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Regiments

Three eras: about 1815-45 (first 9 types), 1845-80, 1880-end. Each of the 9 categories holds the best available type only; older types cannot be built once the upgrading tech is owned, but existing regiments may be upgraded at the price of a new unit minus the person (and horse); medals are kept. [M p36] [M p60] [W1]

Stat columns (manual): FPN normal firepower, FPM melee firepower (adjacent only), RNG range in tiles (defending range in brackets), DEF defence (entrenched in brackets), MVR tiles moved per initiative turn on the battlefield, ARMS armaments points to build; ARMS also set the rail transport size (see section 5). [M p91]

| Cat. | Era | Regiment | FPN | FPM | RNG | DEF | MVR | ARMS | Worker | Horse | Cash $ | Unlocked by | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Militia | 1 | Minutemen | 5 | 5 | 5 | 4(5) | 4 | NA | - | - | free, immobile | start | [M p91] |
| Light Inf. | 1 | Skirmishers | 5 | 5 | 5 | 7(8) | 6 | 1 | untrained | no | 200 (screen) | start | [M p91] [W2] [W20] |
| Regular Inf. | 1 | Regulars | 10 | 10 | 5 | 5(6) | 4 | 1 | untrained | no | 500 | start | [M p91] [W1] |
| Heavy Inf. | 1 | Grenadiers | 12 | 12 | 5 | 5(6) | 4 | 1 | trained | no | 1,000 | start | [M p91] [W1] |
| Light Cav. | 1 | Hussars | 7 | 10 | 3 | 7 | 11 | 1 | untrained | 1 | ? | start | [M p91] [W3] |
| Heavy Cav. | 1 | Cuirassiers | 15 | 19 | 3 | 5 | 9 | 1 | trained | 1 | 500 | start | [M p91] [W1] |
| Light Art. | 1 | L. Artillery (Horse Art.) | 10 | 3 | 9(10) | 3(4) | 5 | 2 | ? | 1 | ? | start | [M p91] |
| Heavy Art. | 1 | Artillery | 16 | 4 | 11(12) | 2(3) | 3 | 2 | trained (screen) | no (screen) | 1,000 (screen) | start | [M p91] [W20] |
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
| Heavy Cav. | 3 | Armour | 45 | 60 | 12 | 20(25) | 9 | 10 | trained (screen) | no (screen) | 9,000 + 4 fuel [?] (screen) | Internal Combustion | [M p91] [W23] |
| Light Art. | 3 | Mobile Artillery | 25 | 8 | 15(16) | 20(25) | 8 | 6 | trained (screen) | no (screen) | 5,000 + 4 fuel [?] (screen) | Large Artillery | [M p91] [W22] |
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

## 7. Screen-verified and research additions (2026-11-12)

Version: all rows are **Imp1**. Screen rows come from the Let's Play (LP, Spring 1815 start, 1997 retail UI) [W20]-[W26]; text strings from the Imp1 demo disc [W27] (a demo build, checked against retail screens where possible); the guide [W24] is a 1998 Imp1 fan guide with its own value model, not game code. Screens: see `11-screens.md`.

### 7.1 Armoury costs

Screen-verified (Armoury card: cost row and stat block). Worker grade is shown only by icon shade: white = untrained, light blue = trained, dark blue = expert [?] (shade not resolvable on the Spring 1834 screenshots in a spot check; Skirmishers untrained and Artillery trained rest on the LP text and the guide).

| Regiment | Cash | Arms | Worker | Third input | Stats on the card | Source |
|---|---|---|---|---|---|---|
| Skirmishers | $200 | 1 | untrained | - | FP 5, Move 6, Range 5, Entrench yes | [W20] |
| Artillery (heavy, era 1) | $1,000 | 2 | trained | no horse | FP 16, Move 3, Range 11, Entrench no | [W20] |
| Grenadiers | $1,000 [?] | 1 [?] | trained (table) | - | cash 12,549 -> 10,549 and arms 9 -> 6 after 1 Grenadier + 1 Artillery; the screen does not print the second unit's name (third infantry slot, taken to be the Grenadier), so this row is derived by subtraction | [W20] |
| Combat Engineers (Summer 1840) | $7,000 | 2 | expert | - | FP 0, Move 4, Range 8, Entrench yes | [W21] |
| Mobile Artillery (Winter 1879) | $5,000 | 6 | trained | 4 of a red barrel icon (Fuel [?]) | FP 25, Move 8, Range 15, Entrench no | [W22] |
| Armor (Fall 1885) | $9,000 | 10 | trained | 4 of the same icon (Fuel [?]) | FP 45, Move 9, Range 12, Entrench no | [W23] |

- All 5 stat blocks seen equal the manual table; "Entrench" on the card is a yes/no flag, not the DEF in brackets. [W20]-[W23]
- Cash is now known for 15 of 27 regiments: the 11 wiki values plus Skirmishers (confirmed), Artillery, Mobile Artillery and Armor read off screens (D1 narrowed). Derived, not on a screen: the guide prices a unit as cash + arms x 1,875 + worker (untrained 2,600, trained 3,304, expert 5,436) + horse about 321 + fuel 500 each. The model reproduces five screens (Artillery 8,054 vs 8,100; Grenadier 6,179 vs 6,200; Armor 33,054 vs 33,000; Mobile Artillery 21,554 vs 21,600; Siege Artillery 15,804 vs 15,800). [W24] [?]

| Regiment | Derived values | Basis | Confidence |
|---|---|---|---|
| Sapper | $5,000, 2 arms, expert, no horse | guide 14,200; the wiki per-gun table 2,500 x 2 agrees | medium |
| Cuirassiers (closes D7) | $500, 1 arm, trained, 1 horse | guide 6,000 leaves cash + horse = 821 (500 + 321); $250 would need a horse of 571; the wiki 250 per gun looks like 500 / 2 | medium |
| Light Artillery (era 1) | about $1,000, 2 arms, trained, 1 horse | guide 8,400 | low |
| Hussars | about $100 (+/- 50), 1 arm, untrained, 1 horse | guide 4,900 | low |
| Rangers, Infantry (Modern) | $3,000, 4 arms, trained, 4 fuel | guide 15,800 | low [?] |
| Machine-gunners, Mech. Infantry | $5,000, 4 arms, trained, 4 fuel | guide 17,800 | low [?] |
| Railroad Gun | $7,000, 8 arms, trained, 4 fuel | guide 27,300 | low [?] |
| Saboteur | unknown | not priced in the guide | - |

- Fuel as the era-3 third input: both era-3 screens show 4 of it; the v1.0 readme says the fuel saved by cutting power "will come in handy for the construction of regiments and naval vessels". The rows above assume 4 fuel for every era-3 unit (hypothesis). [W7] [W22] [W23] [?]
- Units ordered with the right arrow appear the turn after End Turn; regiments and civilians both take workers from the labour force. The card's Available worker count differs from the labour list (4 vs 6 untrained, Spring 1834), probably free workers after pending orders. [W20] [?]
- Technology texts (closes F2): Breech-Loading Rifles "Allows recruiting of Rifle Infantry, Guards, and Carbine Cavalry and upgrading of older regiments"; Rifled Artillery: Field and Siege Artillery; Bessemer Converter: level 2 forts, Sharpshooters and Scouts, upgrading Light Infantry and Hussars. Machine Guns -> Modern Infantry, Machine Gunners, Rangers; Large Artillery -> Railroad Gun, Mobile Artillery; Internal Combustion -> armoured and mechanised units (demo strings). [W25] [W27]
- In-game names (28 with the General): Minutemen, Skirmishers, Regulars, Grenadiers, Hussars, Cuirassiers, Light Artillery, Artillery, Militia, Sharpshooters, Rifle Infantry, Guards, Scouts, Carbine Cavalry, Field Artillery, Siege Artillery, Conscripts, Rangers, Infantry, Machine Gunners, Mech. Infantry, Armor, Mech. Artillery (retail card: Mobile Artillery), Railroad Guns, Sappers, Combat Engineers, Saboteurs, General. Use these as display names. [W27]
- Forts: $5,000 / $7,500 / $10,000 for levels 1 / 2 / 3 (retail Engineer dialog Fall 1861 shows "($7,500) A level two fort will increase protection of armies in this province"; demo strings give all three); all capitals start with a level 1 fort (v1.0 readme). [W25] [W27] [W7]

### 7.2 Size, upkeep, upgrades, moving

| Rule | Value | Source |
|---|---|---|
| Upkeep (closes F10) | $25 per turn per arms point. The guide's formula 1,250 + 25 / 0.04 = 1,875 prices one arm with its upkeep; ledger Military Upkeep $100 (1815-19, Force Size 4), $250 (Fall 1824), $1,725 (Winter 1836) = 4, 10, 69 arms x $25. The wiki's $16,000 for 48 units would be 640 arms: an outlier. | [W24] [W31] [W32] |
| Force Size | the title bar shows "Force Size: N" for a selected group = sum of ARMS of its Available (mobile) regiments: Garrison Book with 4 Minutemen (Defending, not counted), 1st Regulars (1), 6th and 7th Scouts (2 + 2) = 5; start army 4; field army 18-20 in 1837-40. A General may count as 1 [?]. | [W25] [W24] |
| Upgrade | price of the new unit without worker and horse, the person keeps medals; Garrison Book hover "Upgrade cost: 2 arms, $3,000" for Regulars -> Rifle Infantry (equals the table price); strings: "We do not have the required resources to perform this upgrade." | [W25] |
| Rail move | march or attack only into adjacent provinces; any own province by transport up to force size = transport capacity / 5; no rail line needed, only capacity ("Our internal transport network can only handle a force of size N"); title bar hint "Give Transport Orders" | [W26] [W27] |
| Landing | strings: "The ships in the landing zone will support a force of size N"; armies attack overseas only from a province with a port ("No Port"); "Blockaded Port" stops them leaving. After the first province the limit is the internal transport rating (one guide, [?]). | [W27] |
| Scouting Report | a bordering province gives a report such as "2 Regular Infantry, 2 Heavy Artillery, 1 Demolitionist, 3 units of unknown type", with the estimator named (garrison commander or General); a General nearby improves accuracy; "We cannot scout this province without a nearby ship or neighboring armies" | [W26] [W27] |
| Defender prompt | at the start of a turn with an attack: "Our garrison in X is being attacked by the forces of Y. Do you wish me to deploy the troops for you?" OK = the Defense Minister deploys, Cancel = you deploy. Strings: Attack Failed!, Province Taken!, Province Lost!, Enemy Beaten Back! | [W26] [W27] |
| Defense Minister advice | "Strengthen the Army" when a rival army is more than twice yours (Spring 1835 Mone); "Capitol in Danger!" when hostile forces stronger than the capital garrison border it | [W26] |
| Generals (D5 open) | rewards "due to the growth of our army" in one LP game: Spring 1833, Summer 1837, Spring 1845; Winter 1836 upkeep was 69 arms, so the second threshold is above 69 arms or not an arms count (wiki: 6 arms for the first). A General adds initiative and rallies routed units, can be wounded. | [W28] [W31] [?] |

### 7.3 Battle and capital loss

| Rule | Value | Source |
|---|---|---|
| Auto-resolve | the player may fight a land battle personally or leave it to the AI; naval battles are always automatic. Button label and result screen unknown. | [W30] |
| Capital falls (D6, F4) | guide: "fall into anarchy: the fleet is disbanded, production will cease, but existing land units will continue to fight until destroyed" (ships do not sink; they are disbanded). LP, Yakakkie Fall 1869: at war with every Great Power, keeps its army and attacks as a Minor Nation, colonies released, leftover provinces show as War. Two Imp1 sources against the manual (F4). | [W24] [W28] |
| Aftermath | the capturing army "will take months to recover its strength"; a governor is installed; a remnant state ("Republic of Yakakkie") may persist in one province; the new land ships goods only after the port link is rebuilt. Capturing a colony's capital wiped a rival's investments in one report (low). | [W28] [W29] [?] |
| Routs and surrender | yellow units rout; trapped or surrounded units with low morale surrender (a packed fort that cannot retreat surrenders once artillery pushes it into yellow and red); surrendered units show as lost in the casualty book. Cavalry routs infantry; late guns nearly one-shot: 2 Railroad Guns and an upgraded field gun made the enemy lose 5 regiments and drop 5 more below half (1873-74). Damage per shot stays open (D3). | [W28] |
| Outcome rating | the LP calls a lost fight "nearly a draw" after heavy enemy casualties, so a win, loss or draw may follow the casualty balance (low); link to medals unknown | [W28] [?] |
| Walls (1997 player claims, v1.0) | a Sapper moves all but its last point, then digs one square; a breach takes about 5 turns; walls can be shelled from just outside the defenders' red zone and "usually take three good hits to knock one down". The v1.1 readme later made standing sappers dig 2 tiles per turn. | [W29] [W7] [?] |
| AI in battle | sends units forward in single file, charges when it cannot hold or its artillery is gone, never builds Skirmishers and rarely light cavalry; it does not attack a province with much heavy artillery unless it greatly outnumbers it | [W29] |
| Breaking a capital (players) | general on the first attackable tile with heavy artillery stacked behind; or 8-10 Mobile Artillery at the back and pick off the single-file front; retreat, heal and repeat over turns; one player lost 11 units to 3 at a capital | [W29] |
| Force-ratio rules of thumb | attack at 1.75-2.5x the enemy (below 1.5x "excessive losses"); multipliers: heavy infantry 1.2, militia 0.6, general 1.1-1.3, defenders' fort 1.1-1.4, experience up to 1.5; keep a third in the rear; about 80% infantry and 20% artillery. Cost to conquer one province in guide units 2,772 (era 1) : 5,280 : 8,964 = 1 : 1.9 : 3.2. Balance check only, not engine values. | [W24] [?] |
| Hotkeys | F5 civilians, F6 army units by location, F7 ships; w wakes civilians, a armies, n navies; Garrison Book: Ctrl-click disbands, space targets the nearest unit, d = done; v1.1: S skips to the next sapper | [W33] |

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
- [W20] Let's Play "Imperialism" by Kangra (https://lparchive.org/Imperialism, nation Visisik, Spring 1815 start; Imp1: retail 1997 UI, 7 Great Powers, 16 Minor Nations). Armoury, Skirmishers and Artillery: https://lparchive.org/Imperialism/Update%2007/3-uHzWkRW.png, https://lparchive.org/Imperialism/Update%2007/4-MHurpAW.png
- [W21] Armoury, Combat Engineers (Summer 1840): https://lparchive.org/Imperialism/Update%2008/27-qbwwUaX.png
- [W22] Armoury, Mobile Artillery (Winter 1879): https://lparchive.org/Imperialism/Update%2018/12-0x3F8rd.png
- [W23] Armoury, Armor (Fall 1885): https://lparchive.org/Imperialism/Update%2020/4-y5G54pH.png
- [W24] Economics guide v1.02, Sept 1998 (Imp1: Minutemen, Quack order; author's own value model; named Pauca in one reading and Magister in another, unverified): https://www.grognard.com/info/imp_econ.txt
- [W25] Garrison Book and upgrade cost https://lparchive.org/Imperialism/Update%2009/6-UvuOs1d.png; technology list texts https://lparchive.org/Imperialism/Update%2009/16-ryDmeqL.png; Engineer fort dialog https://lparchive.org/Imperialism/Update%2014/8-YT1iWbQ.png
- [W26] Strategic map, scouting, defender prompt, task force, advice: https://lparchive.org/Imperialism/Update%2001/3-KASJeV1.png, https://lparchive.org/Imperialism/Update%2008/23-mhFiaUQ.png, https://lparchive.org/Imperialism/Update%2007/13-FYijbvV.png, https://lparchive.org/Imperialism/Update%2007/6-7s2EDPQ.png, https://lparchive.org/Imperialism/Update%2007/18-qzeciwT.png, https://lparchive.org/Imperialism/Update%2010/10-0pX7yQn.png
- [W27] Imp1 demo disc string table (a demo build; may differ from retail): https://discmaster.textfiles.com/view/23908/PC%20Gamer%20IT%20CD%2022.iso/IMPDEMO/_SETUP.1/str%23enu.gob/string.txt
- [W28] LP text and screens: https://lparchive.org/Imperialism/Update%2007/, https://lparchive.org/Imperialism/Update%2008/, https://lparchive.org/Imperialism/Update%2016/, https://lparchive.org/Imperialism/Update%2017/, General reward https://lparchive.org/Imperialism/Update%2008/6-u0755ar.png, map after a capital falls https://lparchive.org/Imperialism/Update%2016/46-NipXKt0.png
- [W29] Player posts (Imp1; anecdotes): https://groups.google.com/g/comp.sys.ibm.pc.games.strategic/c/sPFZbpYihhY (Sept 1997, v1.0), https://gog.com/forum/imperialism_series/vens_playbyplay_notes_on_nigh_on_impossible, https://www.gog.com/forum/imperialism_series/skirmisherstactics_in_imperialism_1, https://gog.com/forum/imperialism_series/imp1_eliminate_the_capital_from_a_colony
- [W30] https://en.wikipedia.org/wiki/Imperialism_(video_game) (auto-resolve option)
- [W31] Ledger Winter 1836, Military Upkeep $1,725: https://lparchive.org/Imperialism/Update%2007/32-MBQ5Zgo.png
- [W32] Ledgers with upkeep $100 and $250 (1815-1824): https://lparchive.org/Imperialism/Update%2003/15-ZlRQkoR.png, https://lparchive.org/Imperialism/Update%2004/15-coDgoFo.png
- [W33] https://imperialism.fandom.com/wiki/Unit_(Imp1) (hotkeys; read from a search excerpt)
