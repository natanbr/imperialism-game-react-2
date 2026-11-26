# Verify and tune: the list of defaults taken without an answer

Started 2026-11-17 at Nathan's request: "go with your suggestions and defaults, it's important to keep the list to
verify and fine tune in the future." Every card answered by "take the default" lands here. Each row says what was
chosen, why it may be wrong, and how to check it. When the real game is available for play-testing, the last column
is the first thing to test. Cards and their text: `docs/specs/m13-m16.md` section 4 and the progress page.

Status: `default` = taken, nobody has checked; `confirmed` = Nathan agreed or the real game showed it;
`tune` = known to need a number changed.

| Card | Default taken | Why it may be wrong | How to verify | Status |
|---|---|---|---|---|
| Q114 | War on the player from turn 20 when the army gathered at the front exceeds twice the weakest eligible border defence (FR-488, FR-538). Temporary; difficulty levels later (`docs/specs/war-and-difficulty-notes.md`) | The 2× factor and turn 20 are our numbers; the 40-turn game is temporary | Real game: how early and how strong the AI attacks at each difficulty | confirmed for M13, tune |
| Q115 | One province, then peace offers every 6 turns (FR-489) | Predictable; an expert can bait it; the real AI may re-declare | Compare the original AI after a conquest, including when it accepts peace. | confirmed for M13, tune |
| Q116 | Recruit workers to replace losses, plus staffing mills on worlds with provinces only (FR-485, FR-486) | Two rule sets for the scripted player | Compare the real AI's worker counts at turn 15, 25, 40 | default |
| Q117 | Embassy plus pact with a free minor, followed by grants when affordable (FR-542). The vote target is at the turn-40 Council. | The embassy and grants use cash that could fund the army. The original turn-30 vote target remains unmet. | Check the first embassy, pact, grant and minor vote in the same game. | default |
| Q118 | Last turn's bids and offers are public; a bid toward the rival is allowed (FR-491 to FR-494) | The FR-494 short Bid line is not confirmed | Real game: what the player sees of the other powers' offers | default |
| Q119 | Recruit mix and the cash floor when invaded (FR-482, FR-483) | Numbers from the remake | Real game: the AI's army mix at war | default |
| Q136 | One standing steel bid toward a human Great Power from turn 7 while the expansion plan needs steel (FR-539). Lumber uses the existing response to public offers (FR-493, FR-541). | The standing bid uses one cargo hold and changes the race for Arvelia. | Check when the Steel row invites an offer and whether the seller receives payment. | default |
| Q137 | The minors trade first (FR-186, FR-492). | The minors can take all of Valdoria's clothing and furniture before a player's bid fills. | Compare the order of settlement in the original game. | default |
| Q138 | A second war can start 10 turns after a peace (FR-488) | Possibly too soon or too late | Real game: AI re-declaration delay | default |
| Q139 | FR-542 keeps the turn-40 vote target. The original turn-30 result is reported alongside it. | A player may expect a minor to support the computer earlier. | Review both Council results before merging M13. | default |
| Q105 | Keep FR-455's paper rule on both worlds. | The scripted player's opening orders change. | Compare its turn-1 orders and score margin on two-islands. | default |
| Q106 | Allow an open-ended rail line while it is being laid to a built depot. | A stalled rail project can look like progress. | Check whether the depot is eventually connected. | default |
| Q107 | An armed nation may spend its civilian cash reserve on training. | Its engineer may have to wait a turn. | Compare the depot connection turn and the score with and without the reserve. | default |
| Q120 | At the final Council each free minor votes by relations with no 50-point floor. War with both nominees forces an abstention. | Even two weak nations now produce a final winner. | Compare early ballots with the final meeting. | default |
| Q121 | With fewer than three Great Powers a strict majority elects a nominee (7 of 12). Three or more retain the two-thirds rule. | This departs from the original threshold and lets a computer win before turn 40. | Try three friendly minors and four home provinces at an early Council. | default |
| Q122 | A tied final vote uses standing, then intent order. | Holding land helps win a tied vote through its standing bonus. | Compare two equal vote totals with unequal standing, then with equal standing. | default |
| Q123 | Conquered development counts only where the owner can collect the tile. | A connected depot restores those points and the province still adds standing. | Compare the same tiles before conquest, after conquest and after connecting a depot. | default |
| Q124 | On a world without provinces the turn limit names the nation with the best score. | Score alone decides the test world and is only one part of standing on the continent. | End a two-islands game and compare the named nation with the score totals. | default |
| Q125 | Pay one expert, two paper and $500 for a Prospector, $1,500 for a Miner or $1,000 for each other civilian. | The five middle fees are estimates. | Compare the seven University fees in the original game. | default |
| Q126 | Start with one Indiaman. Build one after three full trade phases in four, at most once every four turns on the continent. | The ship competes with mills for lumber. | Compare the first ship turn, actual cargo and delayed expansions. | default |
| Q127 | Put a Horse Ranch in collection range of each Great Power capital and one in Arvelia. | A starting resource tile changes in each territory. | Check opening food, cargo plans and cavalry supply on both islands of the continent. | default |
| Q128 | Schedule changing minor supply, demand and prices for M15b after M16. | A larger fleet still relies on the existing buyers. | Count actual units in completed trade. | default |
| Q129 | The computer keeps its starting civilians in M15. | The human can field a second Engineer. | Compare rail completion after building a second Engineer. | default |
| Q140 | Only computer-controlled nations set materials aside for future hulls. A human using the planner can order a ship when the materials are already in stock. | The same stocks led the human to invest in industry and the computer to reserve a hull. The idle fleet qualified in 24/24 games. | Compare when the original game's computer builds its first ship and what industrial expansion it delays. | confirmed for M15, tune |
| Q141 | On 2026-11-21 Nathan accepted FR-546 in place of FR-542 (ii). A free minor must voluntarily vote for the computer at the turn-40 Council in at least 13 of 24 idle games. The extra purchase turn and all FR-245 limits apply. | Both lawful windows earned the vote in 13/24. Only the final-turn bypass produced 21/24. The former target was 18/24. | Replay an idle campaign in the original game and compare the computer's purchases, relations and earned minor votes before the final Council. | confirmed for M15, tune |
| Q142 | On 2026-11-21 Nathan accepted FR-545 in place of FR-509's diplomat threshold. The peaceful diplomat must win a Council by turn 40 in at least 15 of 24 games. | The same diplomat won 24/24 on M14 before the FR-516 computer fleet and 15/24 on M15. The former target was 18/24. | Play peacefully against a growing computer fleet in the original game and compare the Council outcomes. | confirmed for M15, tune |
| Q130 | Spread 100 technology years across the configured turn limit. TIME_CONFIG.TURN_LIMIT supplies the temporary default of 40. | The displayed season and invention year diverge, and the late prices may be unaffordable. | Try several game lengths and compare release turns and affordability. | default |
| Q131 | Keep Compound Steam Engine, Iron Railroad Bridge and Dynamite alongside the two historical starting technologies. | Dynamite is an 1871 invention available at the start. | Compare early rail routes and timber output with the original. | default |
| Q132 | Keep all seven starting civilians. Apply technology prerequisites to recruitment and development. | The starting Rancher may have no legal job before Feed Grasses. | Check the first useful Rancher and Driller actions. | default |
| Q133 | Buy at most one technology per turn: the cheapest that enables eligible development on a collected tile while preserving reserves. | This policy ignores ships and military technologies. | Check purchase turns, development, reserves and the 24-seed idle campaign. | parked. The three-purchase quota held in 11/24 at `f8470ba` and 13/24 at `95634c6`. See Q143 for the buyer-only proposal. |
| Q143 | FR-547 proposes buying for an affordable action the computer plans within three turns. This is the parked buyer-only branch, `claude/m16b-buyer` (`49406e9`). Main has no computer buyer. | Across 24 idle games it bought Streamlined Hulls on turn 3 and ordered a Clipper on turn 6. The spending left FR-546 at 10/24 earned minor votes and FR-489 at 15/24 player-province captures. The resource gates plus buyer on `claude/m16b-technology` (`95634c6`) gave FR-125 a minimum of 1.286×. | Play the original game before tuning. Record when an invention is available and affordable, when the computer buys it and when it first uses the unlock. For ships, compare the launch turn, cargo carried, treasury, payroll and minor votes with the ordinary hull. | proposed on buyer branch, parked pending original-game measurements |
| Q134 | Defer the Power Plant, oil sites, later regiments, forts and warships. Oil Drilling unlocks the Driller and refinery, and Streamlined Hulls unlocks the Clipper. | A refinery has no oil to process on the present maps. | Check the refinery when oil sites and fuel demand arrive. | default |
| Q135 | Migrate version-1 saves by copying purchased shared IDs and legacy oil ownership to each nation. | The loader must retain this migration until the old save version is retired. | Continue a historical save and round-trip a pending purchase with different national holdings. | default |
| Q144 | A reachable coast takes one sail Order, followed by a separate station turn. Domestic rail stays on the same landmass. A stationed fleet can also reinforce a friendly shore within its support limit. | Short and long voyages take the same time, and holding one approach can close several ports in that province. The original’s limit for follow-up reinforcements is uncertain. | Compare short and long voyages, site setup and first landing turns. | confirmed for M17, tune |
| Q145 | Revised by the owner 2026-11-22: enemy squadrons that meet fight a sea battle (FR-552): 3 rounds, longer range first, 50% hit chance, damage = firepower − armour (min 1), sunk at 0 hull, the side with more firepower afloat holds, repair 25% of hull a turn at berth. Allied attacks on one province go strongest first, the next only if it failed (FR-560). | Every battle number is ours (rules gap D3). | Install the original and record damage per round, losses, retreat and an allied double landing. | implemented and tested locally (navalBattle, alliedAttacks); original-game measurements pending |
| Q146 | Easy level (owner 2026-11-22): use existing hulls or fund one Frigate after a hostile squadron is seen off one of the computer's ports. Harder levels: fleet built in advance by position, attack fleet prepared before a planned war, defence prepared when a rival is flagged aggressive. | A quiet player can take an island minor without a rival naval race; a reactive build may arrive too late. | Measure visible threats and the first response; play the original at each difficulty. | confirmed as Easy, harder levels planned |
| Other | FR-494's short Bid line; Arvelia now falls 2 to 3 turns later than QA check 1 said; first recruit news comes one turn after war starts; world seeds 2 and 4: campaign regiments never march (194 and 255 score points) | Known gaps, no row yet | Fix or accept after M13 merges | tune |

Balance numbers worth comparing to the real game first: score at turns 15, 25 and 40 (FR-125's 1.5× margin is our own
yardstick), the turn Arvelia falls, workers per nation, price levels of the first five goods, and war timing.

## M18d recorded results

On 2026-11-25 the owner chose coastal and river fishing and terrain development for every game, including historical saves (Q103, FR-616). The tables compare the pre-fishing results with Task 47's measured campaigns. They include Task 44's change to depot routing and the six-payroll reserve for starting a depot with a field army during weak world-market trade. [Rail trace](journal/task-44-m18d.md) · [Payroll and campaign measurements](journal/task-47-m18d.md)

Task 48 kept both FR-339 limits. The opening map now draws Coal and Fish from separate frames of one 18,970-byte lossless atlas. Each URL was requested once. [Task 48 first-paint inventory](../.gate/codex/48/first-paint.json)

| Opening continent, 1280×720 | Before map Fish | Task 47, separate PNG | Task 48, shared atlas | Limit |
|---|---:|---:|---:|---:|
| Distinct art requests | 20 | 21 | 20 | 20 |
| Total art bytes on disk | 1,988,396 | 2,002,009 | 1,990,043 | 2,050,000 |

### Fixed maps and campaigns

Two M18d results have little room above their acceptance thresholds. FR-545 wins exactly 15 of 24 peaceful diplomat games, so losing one more game would fail the floor. For FR-125, seed 3 on turn 15 scores 690 against 450 (1.533×). The 1.5× floor requires 675 at that baseline, leaving 15 score points.

| Requirement | Measurement | Old | New | FR-616 reason |
|---|---|---|---|---|
| FR-125 | Seed 1, turns 15/25/40, scripted/M4 | 760/451, 903/550, 1643/741 | 701/445, 936/573, 1485/749 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-125 | Seed 2, turns 15/25/40, scripted/M4 | 751/442, 900/522, 1546/711 | 693/437, 896/537, 1353/723 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-125 | Seed 3, turns 15/25/40, scripted/M4 | 757/457, 903/563, 1530/756 | 690/450, 916/578, 1456/742 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-125 | Seed 4, turns 15/25/40, scripted/M4 | 759/441, 903/525, 1637/708 | 699/436, 944/532, 1511/724 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-389 | Turn 6 before/after rail, new commodity | Fish 0/0 | Fish 1/1 | Capital fishing ground. |
| FR-125 | Minimum score ratio | 903/563 = 1.604× (seed 3, turn 25) | 690/450 = 1.533× (seed 3, turn 15) | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. Every checkpoint clears 1.5×. |
| FR-546 | Voluntary Council vote, idle seeds 1–24 | 13/24 | 17/24 | Fishing changes trade, the funds available for influence and the final relations. Floor 13/24. |
| FR-545 | Peaceful Council wins with a paid grant, diplomat seeds 1–24 | 10 of 15 wins | 12 of 15 wins | Fishing changes trade receipts and the funds available for diplomacy. The diplomat won 15/24 games in each run. |
| FR-464 | Seed 1, orders, computer score, SHA-256 | 529, 1643, `27ee667b3904d673ffee765149f37fd33e24ce9f87af635cbd0638ec06fdbae5` | 562, 1485, `bf71813db1a8b3a1777d41a1f86cc667fa5e192a400cfa967af2fa41335b435e` | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-464 | Seed 1, joined depots/links/bound at turns 15, 25, 40 | 2/8/11, 4/12/27, 5/16/33 | 2/5/11, 4/10/24, 6/17/37 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-464 | Seed 2, orders, computer score, SHA-256 | 503, 1546, `eb5dcffe5198c82f8bdf1023fcaace919552fc3bd7a45f0265f8719b65ce3a55` | 559, 1353, `78f78b1ccff43268108552b1c6906b46b936e627cee686a2fbf91d51177312e0` | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-464 | Seed 2, joined depots/links/bound at turns 15, 25, 40 | 2/8/11, 4/12/27, 4/12/27 | 2/5/11, 4/10/24, 6/17/37 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-464 | Seed 3, orders, computer score, SHA-256 | 502, 1530, `047bf977b0de80a897c7bfdcba7115164e5e3d47827fdd71c45e1d41d7d6ccae` | 561, 1456, `a9c952ff6cf1840c5f84fae041f9b97d1bd0c6df7a1bc3d84c5e9ee014d8deab` | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-464 | Seed 3, joined depots/links/bound at turns 15, 25, 40 | 2/8/11, 4/12/27, 5/16/33 | 2/5/11, 4/10/24, 6/17/37 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-464 | Seed 4, orders, computer score, SHA-256 | 533, 1637, `d26fc62495eb21d0241f7e4ca676fbef470b31d4f4af9a2473f129cdcd524293` | 563, 1511, `0eee92248f049b070cd75020a715a811d46f8f3c2fbda1eb6a8049539731f64f` | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-464 | Seed 4, joined depots/links/bound at turns 15, 25, 40 | 2/8/11, 4/12/27, 5/16/33 | 2/5/11, 4/10/24, 6/17/37 | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-124 | Seed 1 turn 15 current (depots, links, yield, shipped, sold, score) | [2,8,35,200,22,760] | [3,5,30,205,23,701] | Sea Fish supplies both players. The computer builds a shorter second depot route and reserves cash for development. |
| FR-124 | Seed 1 turn 15 frozen M4 (depots, links, yield, shipped, sold, score) | [1,10,21,181,32,451] | [1,10,22,195,32,445] | The frozen policy receives Fish from the capital. Its one depot and ten rail links now deliver more freight. |
| FR-247 | Seed 1, minorDeals (Testland, Valdoria) | [81, 109] | [85, 104] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 1, minorPurchases (Testland, Valdoria) | [44, 71] | [47, 66] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 1, treasury (Testland, Valdoria) | [1555, 7909] | [3217, 12403] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 2, minorDeals (Testland, Valdoria) | [78, 118] | [78, 102] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 2, minorPurchases (Testland, Valdoria) | [43, 78] | [44, 63] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 2, treasury (Testland, Valdoria) | [4894, 1959] | [3055, 2896] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 2, capitalArms (Testland, Valdoria) | [5, 4] | [4, 5] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 3, minorDeals (Testland, Valdoria) | [91, 104] | [67, 105] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 3, minorPurchases (Testland, Valdoria) | [49, 65] | [34, 63] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 3, treasury (Testland, Valdoria) | [9641, 12437] | [5941, 19604] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 4, minorDeals (Testland, Valdoria) | [69, 76] | [68, 70] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 4, minorPurchases (Testland, Valdoria) | [41, 44] | [40, 40] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 4, treasury (Testland, Valdoria) | [1742, 2184] | [3182, 1385] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-247 | Seed 4, capitalArms (Testland, Valdoria) | [4, 5] | [4, 4] | Fishing changes production, cargo, trade and the funds available for recruitment. |
| FR-260 / FR-215 | Seed 1 upkeep [$, consecutive turns] | [[100, 11], [125, 1], [150, 8], [175, 5], [200, 7], [225, 3], [250, 5]] | [[100, 11], [125, 1], [150, 10], [175, 1], [200, 12], [225, 5]] | Fish changes the campaign income. The depot reserve preserves payroll and changes recruitment dates. |
| FR-260 / FR-215 | Seed 2 upkeep [$, consecutive turns] | [[100, 11], [125, 1], [150, 8], [175, 4], [200, 16]] | [[100, 11], [125, 1], [150, 9], [175, 19]] | Fish changes the campaign income. The depot reserve preserves payroll and changes recruitment dates. |
| FR-260 / FR-215 | Seed 3 upkeep [$, consecutive turns] | [[100, 11], [125, 1], [150, 8], [175, 4], [200, 11], [225, 5]] | [[100, 11], [125, 1], [150, 10], [175, 1], [200, 17]] | Fish changes the campaign income. The depot reserve preserves payroll and changes recruitment dates. |
| FR-260 / FR-215 | Seed 4 upkeep [$, consecutive turns] | [[100, 11], [125, 1], [150, 14], [175, 13], [200, 1]] | [[100, 11], [125, 1], [150, 9], [175, 4], [200, 12], [225, 3]] | Fish changes the campaign income. The depot reserve preserves payroll and changes recruitment dates. |
| FR-260 / FR-215 | Capital garrison arms, seeds 1–4 | 4,4,4,4 | 4,7,4,4 | Different recruiting and campaign forces. |
| FR-260 | Armed turn-40 scores, seeds 1–4 | 1159,1225,1207,1222 | 1207,1225,1317,1330 | Fish affects production, army costs and territory. |
| FR-260 / FR-215 | Army-less seed 1, treasury/capacity/development/score | 10012, 80, 53, 1430 | 6642, 88, 56, 1506 | Fishing changes factory and development investment. |
| FR-260 / FR-215 | Army-less seed 2, treasury/capacity/development/score | 9787, 76, 57, 1427 | 9463, 76, 57, 1424 | Fishing changes factory and development investment. |
| FR-260 / FR-215 | Army-less seed 3, treasury/capacity/development/score | 11835, 80, 56, 1478 | 9281, 84, 57, 1502 | Fishing changes factory and development investment. |
| FR-260 / FR-215 | Army-less seed 4, treasury/capacity/development/score | 10716, 80, 55, 1457 | 9664, 88, 56, 1536 | Fishing changes factory and development investment. |
| FR-305 / FR-510 | Final elected nation, seeds 1–4 | 2,1,2,1 | 2,2,1,1 | Conquest changes controlled provinces, colonies and free minor votes. |
| FR-305 / FR-510 | Turn 30 Arvelian colony vote instead of abstention, seeds | 1,2,3 | 1,3,4 | Changed campaign timing. All remaining free minors abstain. |
| FR-305 / FR-510 | Final ballot, Testland/Valdoria (controlled, colonies, other GPs, free minors, total), seeds 1–4 | s1/s3 [3,0,0,3,6]/[5,1,0,0,6], s2 [4,0,0,3,7]/[4,1,0,0,5], s4 [4,0,0,4,8]/[4,0,0,0,4] | s1 [3,0,0,3,6]/[5,1,0,0,6], s2 [4,0,0,0,4]/[4,0,0,4,8], s3 [4,0,0,3,7]/[4,1,0,0,5], s4 [4,0,0,3,7]/[4,1,0,0,5] | Territorial control and remaining free minors change. |
| FR-542 / FR-510 | Idle seed 1, grant turns and turn-40 free-minor votes | [29,36], 2 | [], 1 | Commerce and a pact bring Sundmark to 50 points. |
| FR-481 / FR-488 / FR-489 | Idle seed 1, second declaration/capture | 32/33 | 34/35 | Campaign spending changes when the field army is ready. |
| FR-481 / FR-485 | Idle seed 1 turn 40 workers (untrained/trained/expert), labour | 0/2/5, 24 | 1/2/4, 21 | Fishing changes the training budget. |
| FR-481 / FR-492 / FR-493 | Trader seed 1, blocked wartime bids, 14 units traded | 2 | 1 (turn 38) | Fishing changes the publicly offered cargo. |
| FR-260 | Two-islands turn-40 scores, seeds 1–4 | 1643,1546,1530,1637 | 1485,1353,1456,1511 | Fish and the shorter depot route change the final score. |
| FR-389 / FR-405 | Continent seed 1, turn 6 transport plan before and after the depot joins | Livestock 1 + Cotton 2, then Livestock 1 + Cotton 3 | Cotton 2, then Cotton 3 | Fish supplies protein. Both plans leave Livestock automatic, and the new rail still increases Cotton. |
| FR-081 | Starting capital collection with spare capacity | 4 Grain, 4 Fruit, 2 Cotton (10) | 4 Grain, 4 Fruit, 2 Cotton, 1 Fish (11) | One adjacent sea hex supplies Fish. |
| FR-389 | 15 cars with Grain, Fruit and Cotton capped at zero | 0 units | 1 Fish | An untouched Fish allocation is automatic. Capping Fish too ships zero. |
| FR-389 | 15 cars with Grain capped at 1 | 1 Grain, 4 Fruit, 2 Cotton (7) | 1 Grain, 4 Fruit, 2 Cotton, 1 Fish (8) | The capital collects one additional Fish and has a spare car. |
| FR-389 | 15 cars with Grain capped at 1 and Cotton at zero | 1 Grain, 4 Fruit (5) | 1 Grain, 4 Fruit, 1 Fish (6) | The capital collects one additional Fish and has a spare car. |
| FR-389 | 15 cars with Grain capped at 10 or every commodity automatic | 4 Grain, 4 Fruit, 2 Cotton (10) | 4 Grain, 4 Fruit, 2 Cotton, 1 Fish (11) | All accessible goods fit within the capacity. |

### Historical saves and user interface

The turn-10 and turn-11 campaign digests use the historical comparison fields. The test checks the later rank history separately. The main v1 fixture retains that history through Continue.

| FR | Measurement | Historical value | Accepted value | FR-616 reason |
|---|---|---|---|---|
| FR-135, FR-142, FR-607 | Seed 1 Food sliders, two-islands total, horse fixture total and continent total | 3, 7, 10, 10 | 4, 8, 11, 11 | The opening capital has a coastal fishing ground. Transport puts Fish after Fruit with automatic allocation 1. |
| FR-050, FR-584, FR-607 | Warehouse row in the three-Fish fixture | Fish 3 No known local source · No known supply | Fish 3 | Coastal Fish can be collected locally. |
| FR-100, FR-520 | Pre-M16 sequence of paper production, recruitment and oil orders at turn 3, SHA-256 | `e07b340d145b28e2cb02b3c5d81f34de4a1b85747959af5be6e76d21acf73883` | `ef0ac9668522d86b901b59a634d070fdf926786de2a14af622ae3ef21c45cffb` | Fishing changes the freight and stock of the reconstructed sequence. The independent captured save keeps the historical digest. |
| FR-100, FR-520 | Historical pre-M16 save and M16 resave, replay start | Turn 1 | Turn 3, one pending oil order already applied | The saved positions include pre-fishing freight and stock. Both load, continue and replay through a second save. |
| FR-558, FR-587 | Pre-M17 naval campaign, replay start | Turn 1 | Turn 2, one production order already applied | The first settlement now includes coastal Fish. The earlier saved inventory, edited order and map are preserved. |
| FR-558, FR-587 | Pre-Q145 naval campaign before combat, replay start | Turn 1 | Turn 3, zero pending orders | New fishing rules apply before the first engagement. A historical joint land battle and intact naval engagement also retain their recorded outcomes. |
| FR-558, FR-587 | Old turn-3 combat checkpoint with another pre-fishing turn in its log | Turn 3 | Turn 4, zero pending orders | A turn settled after the older checkpoint followed historical rules. The later saved position covers that turn. |
| FR-587 | Actual `765fcaa` save, seed 7 at turn 10 | Replay start 1 | Replay start 10, zero pending orders | The original map and logs survive migration. On continuation Fish stock advances from 0 to 1. |
| FR-587, NR-038 | Same seed-7 400-turn-limit campaign, turn-10 SHA-256 | `544df1968c34056c07e33246c47f5a50d2ed8206ba51d2cfa7b5215831c0aa3a` | `e842158982c0889a30494b72cdd0bffcc6f85c2836f2bbb9619a0339fc282b05` | Fishing changes freight, inventories and subsequent computer orders. Settling a modern turn records the M18d rules revision in the game. |
| FR-587, NR-038 | Same campaign after saving, restoring and resolving the Council, turn-11 SHA-256 | `27dc351a2b8b4e08222d5de3d68c11397a9d39b2b94409e771b3f1fb739fd3b2` | `15436a8c378d346598bda6ca9b41ac8aac1b14d9ec62981ee4638e2f63b8f847` | Same fishing settlement and recorded rules revision. The Council still meets on turn 10. |

### Generated maps

Under FR-616, each row records a change to FR-597. Connected ports now supply Fish. The change in freight and food supply alters later computer orders, production, captures and Council ballots. Task 47 measured both map sizes, three frozen policies and twelve seeds. Scores are computer scores on turns 15, 25 and 40. The other 45 games and every unlisted field matched the pre-fishing records.

| Size | Policy | Seed | Field and old -> new value |
|---|---|---:|---|
| standard | idle | 1 | scores [476,717,1108] -> [476,717,1068] |
| standard | idle | 2 | scores [465,680,1093] -> [465,680,1162] |
| standard | idle | 3 | firstCapture 33 -> 35, scores [444,693,971] -> [444,693,1059] |
| standard | idle | 4 | winner nation-2 -> nation-1, firstCapture 36 -> null, scores [462,672,1007] -> [462,649,1032] |
| standard | idle | 5 | scores [484,555,860] -> [484,562,820] |
| standard | idle | 6 | firstCapture null -> 37, compulsory 3 -> 0, scores [471,723,1106] -> [471,723,1122] |
| standard | idle | 7 | scores [477,595,1131] -> [477,635,1064] |
| standard | idle | 12 | scores [475,708,1265] -> [475,715,1200] |
| standard | scripted | 4 | winner nation-1 -> nation-2 |
| standard | scripted | 5 | winner nation-1 -> nation-2 |
| standard | diplomat | 2 | winner nation-2 -> nation-1, peacefulWin false -> true |
| standard | diplomat | 6 | winner nation-2 -> nation-1, peacefulWin false -> true |
| standard | diplomat | 10 | winner nation-1 -> nation-2, peacefulWin true -> false |
| large | idle | 1 | scores [472,660,1009] -> [472,660,984] |
| large | idle | 2 | scores [503,664,1238] -> [503,664,1271] |
| large | idle | 4 | firstCapture 35 -> 40, scores [503,688,1225] -> [503,688,1276] |
| large | idle | 6 | firstCapture 30 -> 38, scores [494,717,1217] -> [502,746,1138] |
| large | idle | 8 | scores [453,620,null] -> [453,615,null] |
| large | idle | 9 | firstCapture 37 -> 30, scores [500,667,1189] -> [500,657,1278] |
| large | idle | 10 | firstCapture 26 -> 25, firstPact null -> 29, compulsory 0 -> 1, scores [505,623,1302] -> [505,652,1239] |
| large | idle | 11 | scores [457,624,1218] -> [457,623,1203] |
| large | idle | 12 | firstCapture 31 -> null, compulsory 0 -> 3, scores [479,653,1235] -> [479,653,1349] |
| large | scripted | 5 | turns 30 -> 40 |
| large | scripted | 7 | winner nation-2 -> nation-1 |
| large | scripted | 12 | winner nation-2 -> nation-1 |
| large | diplomat | 5 | turns 30 -> 40 |
| large | diplomat | 10 | winner nation-2 -> nation-1, peacefulWin false -> true |

| Size | Policy | Seeds matching in every recorded field |
|---|---|---|
| standard | idle | 8,9,10,11 |
| standard | scripted | 1,2,3,6,7,8,9,10,11,12 |
| standard | diplomat | 1,3,4,5,7,8,9,11,12 |
| large | idle | 3,5,7 |
| large | scripted | 1,2,3,4,6,8,9,10,11 |
| large | diplomat | 1,2,3,4,6,7,8,9,11,12 |

Tasks 47 and 48 measured all 72 generated games in 2,810 turns. All 37,557 computer orders were accepted. There were zero invariant violations, zero unpaid disbands across 940 idle turns and zero changed plans across 940 privacy probes. The other two policies recorded 50 unpaid disbands in total. [Post-fix records](../.gate/codex/47/random-pins.md) · [Task 48 guard measurements](../.gate/codex/48/gameplay-guards-summary.txt)
