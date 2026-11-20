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
| Q130 to Q135 | M16: game length and technology years, free technologies, start civilians, computer technology, power plant, old saves | Game length drives every other number | Real game: tech years and costs | planned |
| Other | FR-494's short Bid line; Arvelia now falls 2 to 3 turns later than QA check 1 said; first recruit news comes one turn after war starts; world seeds 2 and 4: campaign regiments never march (194 and 255 score points) | Known gaps, no row yet | Fix or accept after M13 merges | tune |

Balance numbers worth comparing to the real game first: score at turns 15, 25 and 40 (FR-125's 1.5× margin is our own
yardstick), the turn Arvelia falls, workers per nation, price levels of the first five goods, and war timing.
