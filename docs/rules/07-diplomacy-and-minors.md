# 07 - Diplomacy, treaties, Minor Nations, colonies (later phase)

> **Implementation notes**
> - Diplomacy is not v1 beyond what the world market needs: a **relationship level per (Great Power, Minor Nation)** and a **subsidy percent** decide who gets each Minor Nation's offers first (see 06). Build the data model for it, but scripted constants are enough for v1.
> - Orders are simultaneous and resolved first in the turn; all diplomatic orders can be taken back until End Turn. Minor Nations never attack, never refuse a consulate, embassy, pact or peace, and always accept a declaration of war without recourse (war cannot be refused).
> - The relationship scale has **9 colour levels**; the real step sizes are not documented (gaps.md).
> - CODE MISMATCH: `types/Diplomacy.ts` uses `attitude -100..+100` and a free-form `Treaty` list (list at the bottom).
> - UPDATE 2026-11-12: section 7 adds the nine colours in order, the consulate-timing evidence (F3 closed), exact grant sizes, overture and map-mode screens, AI war and alliance observations. The Council vote screen is in 01 section 4a.

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Overtures (the things a Great Power can order)

| Overture | Target | Cost | Rules | Source |
|---|---|---|---|---|
| Trade consulate | Minor Nation | $500 | always accepted; open the turn after (the Foreign Minister counts it in that turn's trading); gives the right to set subsidies; **prerequisite for an Embassy**; each completed trade then improves relations | [M p79] [W1] |
| Embassy | Minor Nation | $5,000 | needs a consulate; always accepted; allows grants, pacts, intervention, and lets your civilians enter; only embassy MNs ever join voluntarily | [M p79] |
| Non-aggression pact | Minor Nation (embassy needed) | free | always accepted; **significantly** improves relations; if the MN is later attacked it asks you for help (see section 5); breaking it worsens relations world-wide | [M p80] [W2] |
| Join the Empire | Minor Nation | free | accepted only if relations are good enough (dark green); the whole nation becomes a colony | [M p80] |
| Declaration of war | any country | none (penalties) | cannot be refused; target is notified at End Turn, war starts next turn; no hostile act without it | [M p77] |
| Peace | country at war | free | Minor Nations always accept; Great Powers accept when they got what they wanted and cannot take your capital now | [M p77] [M p78] |
| Alliance | Great Power only | free | mutual defence; AI offers one when it feels threatened | [M p80] [M p85] |
| Join the Empire | Great Power | - | the manual says possible if the power is hopeless; the v1.1 readme says it is **not possible** | [M p81] [W3] |
| Foreign aid (grant) | any country with embassy | $1,000-$10,000, once or locked per turn | raises relations; many small locked grants beat one large one | [M p81] [W2] |
| Trade subsidy | country with consulate or embassy | percent of price | see 06 | [M p83] |
| Boycott | any country | free | no trade of any kind; automatic during war | [M p83] |

- A Great Power starts with embassies (with consulates) in every other Great Power; after a war they must be re-established. [M p80]
- Overtures cancelled before End Turn refund their cost. [M p77]
- On the turn a consulate is ordered you cannot yet order grants, subsidies or an embassy there. [W2]
- Civilians may not enter a Minor Nation before an Embassy. [M p28] [M p79]

## 2. Relationship levels and how they move

| Rule | Value | Source |
|---|---|---|
| Scale | nine colour-coded levels per country pair; neutral in the middle, dark green at the top | [M p82] |
| Improves with | (1) trade deals where a consulate/embassy exists, (2) foreign aid, (3) non-aggression pact | [M p75] |
| Worsens with | war with that country, war on its friends, breaking pacts or alliances, refusing to defend an ally | [M p77] [M p80] |
| What counts as a trade | one per **commodity type** per turn with that country, any quantity (3 buys + 2 sells of 3 different goods = 3) | [W2] |
| Wiki ladder | yellow 0 -> +11 -> +20 -> +36 -> +36 -> +36 -> +14 = **153 trades** to "may join"; the page mixes in Imperialism II colours and numbers | [W4] [?] |
| One game cross-check | a level-7 Minor Nation after about 26 turns and level 8 after about 38 turns with 3-4 consulates and 2.7 trades per turn, which roughly fits the ladder | [W5] [?] |
| Start | the human starts slightly worse than neutral with every Minor Nation; Minor Nations are friendlier to AI powers by about 11 trades (15 on the top level) | [W4] [?] |
| Time to colonise | 12-13 years from embassy to colony in one game; the AI powers colonised 13 of 16 Minor Nations by 1851 in another | [W6] [?] |
| Diplomacy-screen ratings | relative to other Great Powers since v1.1; they can disagree with the charts | [W3] |

- Subsidy lead needed to overtake a rival is about 6 trades per 5%, 12 per 10%, 24 per 25%, 36 per 50% (Imperialism II values; the page says Imperialism 1 is "slightly upwards"). [W4] [?]
- Grants: three years of $1,000 locked grants moved a Great Power two levels in one game; the wiki page estimates a 10-turn $1,000 grant at about 2 trades; the two disagree. [W7] [W4] [?]
- A war on a Minor Nation lowers every other Minor Nation's attitude; they form 4 geographic "families" that move together (Issa, Idolon, Kessel, Zinlu is one). An aggressor can be boycotted outright by the victim until it joins another power. [M p77] [M p78] [W8]
- Countries that dislike the victim like you more after you declare war; countries friendly to the victim like you less. [M p77]

## 3. Minor Nations

| Rule | Value | Source |
|---|---|---|
| Number / size | 16 per random world, 4 provinces each (3 hamlets + fortified capital), 3 militia per hamlet | [M p17] [M p18] [W8] |
| Behaviour | never declare war; never refuse consulate, embassy, pact or peace; sell raw materials and buy finished goods; seem to have endless money | [M p78] [W8] |
| Exports | each lists up to 4 of coal, iron, wool, cotton, timber (hardwood only) ranked by quantity; counts follow their real tiles; plus occasional canned food | [W9] |
| Offer sizes seen (1815-17) | 1-4 of cotton/wool/coal/iron, 5-14 of timber from big exporters; sometimes nothing for turns | [W10] [?] |
| Favourite partner | by relations and subsidy together; sells to its top bidder first, then down the list | [M p66] [M p67] |
| Where Minor Nations fit in v1 | the main world-market counterparty for raw purchases and goods sales | [M p69] |
| After conquest | the capital keeps buying goods but only at the starting price, only from the conqueror | [W3] [W11] |
| Province content | MN provinces "hold the Minor Nation's land" that a Developer may buy (see 03) | [M p34] |

## 4. Colonies

- Gained by: (a) peaceful joining (relations + embassy + request), or (b) intervening when the MN is attacked. The **whole** Minor Nation joins at once. [M p18] [M p35]
- You control its regiments and may reinforce them; you cannot build forts there or use its harbour. A first colony gives two free Clippers. [M p80] [W12] [W13]
- It stays an independent market: produces and buys on its own (a guaranteed market for your goods), you have right of first refusal on its output; its resources are sold on the world market, not added to your network. [M p18] [M p80]
- Your relationship counts as maximum: you get 100% of overseas profits; its provinces vote for you in the Council. [M p35]
- A Developer must buy land in a colony; conquered land needs no purchase. [M p80]
- You may order a colony boycott of other powers (one policy for all colonies); a boycott removes a rival's developments there. [M p83] [W3]
- Nations also reach colony status by being colonised by an AI; the AI then often boycotts rivals. [W14]

## 5. Alliances, defence demands, intervention

| Rule | Value | Source |
|---|---|---|
| Alliance | Great Powers only; mutual defence | [M p80] |
| Ally attacked | you get a demand to declare war on the aggressor; refusal breaks the alliance and costs severe opinion penalties across the board | [M p80] [M p84] |
| Ally is the aggressor and asks you to join | refusal only ends the alliance, no penalty | [M p81] [M p84] |
| Core rule | if two allied Great Powers are at war with a third, the allies must be at war too; refusing breaks the alliance; separate peace breaks it too | [W3] |
| Great Power vs Minor Nation wars | do not drag allies in; allies are not asked | [W3] |
| AI alliance offers | appear when the AI feels threatened; refusing costs nothing | [M p85] |
| Repeated breakage | leads to diplomatic isolation; then only conquest can win | [M p84] |
| Intervention | when a Minor Nation with a pact is invaded you get a one-time offer; accepting is a declaration of war on the attacker (you become the aggressor) and the MN becomes your colony at once | [M p85] [M p35] |
| Alliance timing | first AI alliances seen 1820-23, many broken in the 1840s-50s | [W15] [?] |

## 6. Starting diplomatic state

| Rule | Value | Source |
|---|---|---|
| Difficulty effect | changes diplomatic attitudes, warehouse and start infrastructure; the AI is not smarter at higher levels | [M p9] [W16] |
| Introductory | human has better relations with certain Minor Nations (a head start) | [M p9] |
| Hard / Nigh-On-Impossible | AI powers receive those advantages instead | [M p9] [M p10] |
| AI consulates at start (wiki, one author) | Orange 0, Light Blue 4, Dark Blue 2, Red 4, Purple 4, Yellow 4, Green 3, each plus one random | [W4] [?] |
| Human at Normal | no consulates in Minor Nations; start by buying consulates in 2-3 nations with the exports you need | [W17] [M p112] |
| Tutorial advice | do not court nations you plan to conquer; court those not friendly with your future victims and not bordering other powers | [M p112] |

## 7. Screen-verified and research additions (2026-11-12)

Version: rows tagged [W18]-[W22] come from the Let's Play screenshots (Imp1: Spring 1815 start, 7 Great Powers, 16 Minor Nations, nine-swatch bar). Rows from the wiki pages `Trade_(Imp1)`, `Diplomacy_(Imp1)` and the 1998 guide are Imp1 pages that may carry Imp2 numbers; those carry `[?]` (F11). Screens: see `11-screens.md`.

### 7.1 Relationship scale and what moves it

| Rule | Value | Source |
|---|---|---|
| Nine swatches, Bad to Good (C1 partly) | dark brown, red, orange, yellow, beige (khaki), brown (tan), grey (light grey), light green, dark green = levels 1-9. The human starts every Minor Nation at yellow = level 4 ("slightly worse than neutral"). Names of the lowest three swatches and khaki = beige, tan = brown are inferred. | [W19] [?] |
| Ladder fits the scale | cumulative trades 0 yellow, 11 beige, 31 brown, 67 grey, 103 light green, 139 dark green, 153 may join (the 11/20/36/36/36/14 steps of section 2). LP: 12 turns of consulates, 10% subsidies and about 1 trade a turn gave only beige (Niridna, Qak, Spring 1818); a wiki game report at 2.7 trades a turn reached level 7 after about 26 turns (67) and level 8 after about 38 (103). Colours are Imp1; the numbers stay `[?]` (F11). | [W19] [W4] [W5] [?] |
| Buying more units | does not raise relations faster (players trade in ones); Developer gold and gem purchases are not trades | [W24] |
| War | victim turns red or dark brown (1837 Kova dark brown, Niatat orange; 1854 Mone, Porgindris, Napallaanga, Nojiikuq red). Wiki: about -40 trades sliding, at most -10 without a consulate (Imp2 mix, low). Forum: declaring war early cost "two reputation levels" back within a few turns and the victim's neighbour fell to orange (low). | [W19] [W4] [W24] [?] |
| Grants | exactly four sizes ($1,000, $3,000, $5,000, $10,000), each as a one-time paper or a padlock repeated every turn; effect about 1:2:3:4 (guide, Imp1); under a year of shipping about $200 of food maxed one relationship (food sales are trades); a report got a Minor Nation to join after 3 seasons of grants. Best value: small locked grants plus a 5-10% subsidy. | [W21] [W23] [W24] |
| "Too deeply under the influence" | exact Foreign Minister text: "that Minor Nation is too deeply under the influence of another Great Power for our grants to be effective" (Fall 1845). The same refusal came on a join request at maximum relations (one poster). Trigger unknown (C2). | [W21] [W24] |
| Join the Empire | dark green (level 9) + embassy + request; some posters add: be its favoured partner. Forum: "once relations are in the dark green, offer a 10K grant and annex". After dark green the wiki ladder wants about 14 more trades [?]. Acceptance can still fail when another power holds the nation. Attacked nations may ask for protection earlier. | [W24] [W4] [?] |
| Join outcomes | requests succeeded after several seasons of grants (Spring 1837) and a join in Fall 1847; AI powers colonise Minor Nations ("X submits to Y") from about 1830; the empire offer text promises "protection and development"; the guide says a colony is irreversible. | [W6] [W27] [W23] |
| Developer unlock (C3 partly) | about level 7 (grey) per the 1998 guide; reports: Summer 1821, Summer 1824 and 1827, in one report the season before the first level-7 reading; needs an embassy to buy land; land = 20 x last market price (coal $120 = $2,400); income one turn later (4 turns with a Miner), break-even about 20 turns | [W23] [W25] [?] |
| Overseas share (C3, conflict F15) | wool tile sold at $126 paid $95 (75%) after a pact; ledger sums give about 75% (partner) and 100% (colony, Qak); the 1998 guide gives royalty 30% in a partner and 12% in a colony; manual says colonies pay 100% (section 4) | [W25] [W23] [?] |
| Hidden status | a wiki editor says no list of credits or debits per action exists and the colours "may or may not reflect actual diplomatic status"; a forum poster: "a ridiculous amount of hidden information". The remake must choose its own points (C1, E1); tune from the 153-trade ladder. | [W25] [?] |

### 7.2 Overtures, timing, maps

| Rule | Value | Source |
|---|---|---|
| Consulate timing (closes F3) | first turn: board cash $9,900, first offer sheet $8,900 (two consulates at $500 paid before the offers) and the Niridna sheet already says "We have a Consulate with Niridna, thus each trade improves our relationship": a consulate ordered this turn counts in this turn's trades. Grants, subsidies and an embassy there still wait until next turn (wiki). The wiki wins over the manual's "next turn" for trades. | [W20] |
| Overture panel | "Diplomatic Overtures": seven scrolls in two rows (Peace, Trade Consulate, Embassy / War, Pact, Alliance, Empire); pick a scroll, then a nation; embassy needs $5,000 in cash, not credit (Foreign Minister: "we do not have the $5000 required") | [W21] |
| Info page | "Information: X" shows Provinces (a number), Military and Industry as words (Poor, Fair, Good, Excellent, Awesome); relative to other Great Powers since v1.1, so they can disagree with the charts | [W22] [W3] |
| Trade Policies page | selecting a Minor Nation shows "Most Favored Trading Nation: X" and up to 3 Major Exports icons (Ash Mukkun 1815: favourite Wan, cotton, coal, iron; Spring 1818 favourite Mone, so it changes in play); a Great Power shows its Major Exports. Blue round number badges (about 102, 92) beside consulate nations are not explained (gap H5). | [W19] |
| Political map colours | Peace white, War dark grey, Pact light teal, Alliance blue-purple, Empire light purple; green $ = Trade Consulate and black top hat = Embassy on this map (on the Trade Policies map a green $ marks a subsidy, conflict F16) | [W22] |
| Alliances (F5 closed) | v1.0 readme: allies of two Great Powers at war must join the war or the alliance ends; a separate peace by an ally also ends it; Great Powers cannot be asked to join the empire (against manual p78); the Empire button is meant for Minor Nations. AI offers come on an "Accept Offer" screen ("Wan seeks to enter into an alliance with our great Empire. Do you accept their offer?"; Esc rejects, Return accepts). | [W3] [W22] |
| AI refuses human alliances | no visible rule (Ordune refused while the player was military #3; Zimm declined twice). Anecdotes: an accepted alliance offer can reactivate a war at a smaller reputation cost than declaring one; an ally dropped the alliance after the player refused a third party's peace. | [W24] [?] |
| AI war declarations | Imperial Times "Mone Declares War!" plus Foreign Minister "Prepare for Battle ... Diplomacy has failed". The declaration shows on the scroll tab one turn before the attack. A 1998 guide: the AI picks a random trade market and declares war on whoever controls it; posters: Great Powers start picking off Minor Nations at some point, join wars late once the victim is worn down. No thresholds (E2). | [W22] [W26] [W24] |
| AI peace | a Great Power's hatred "never stops" and its offers serve temporary advantage or new allies (guide); LP: a beaten Mone asked for peace and got it, Kova's attempt was refused; the screen warns "Accepting will break our alliances with their enemies". How an AI answers a human peace offer is unknown. | [W22] [W26] |
| Pact and intervention | the LP text says the nation "automatically becomes our colony" after the intervention; three allies defended and colonised one victim in a game. One forum player says pacts do not raise relations by themselves (conflict F17: manual says "significantly"). | [W27] [W24] |
| Capital capture | see 08 section 7: the fallen power is at war with all Great Powers, keeps its army, its colonies are released | [W27] |
| Not usable | `imperialism-remake-definition.readthedocs.io` diplomacy page is a fan remake (trade mission $300, embassy $1,000, "DR" thresholds); it matches no Imp1 screen | [?] |

## CODE MISMATCH

- CODE MISMATCH: `types/Diplomacy.ts` `Relation.attitude` is -100..+100 with booleans (`atWar`, `allied`, `tradePartner`) and `Treaty.duration`. The rules use a 9-step ordinal scale per pair, no treaty duration, and these exact treaty kinds: consulate, embassy, non-aggression pact, alliance, war/peace state, colony ownership. `TreatyType` includes `"trade"` and `"peace"` and `"colony"`; consulates/embassies and boycotts are missing.
- `TradePolicy.subsidyPercent` should be one of 5, 10, 25, 50, 100; `Grant.locked` matches locked grants.
- CODE MISMATCH (2026-11-12): the screen shows six subsidy steps including 75% (06 section 7.3, F14); grants are four fixed sizes (1,000 / 3,000 / 5,000 / 10,000), not a free range. Nine swatches = levels 1-9, human start = level 4.
- `Nation.colonies` matches; the colony effects (100% profit, council votes, boycott list) are not modelled. Everything in this file is unimplemented stub (`diplomacySystem`, `diplomacySlice`).

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Diplomacy_(Imp1)
- [W2] https://imperialism.fandom.com/wiki/Diplomacy_(Imp1) (trades, timing of consulate)
- [W3] v1.0 and v1.1 readmes https://imperialism.fandom.com/wiki/README.TXT (section VII, VIII) and https://imperialism.fandom.com/wiki/README11.TXT
- [W4] https://imperialism.fandom.com/wiki/Trade_(Imp1) (one author, mixes Imperialism II values)
- [W5] https://imperialism.fandom.com/wiki/Brete_(Imp1)
- [W6] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple
- [W7] https://lparchive.org/Imperialism/Update%2012/ and Update 09
- [W8] https://imperialism.fandom.com/wiki/Minor_nation_(Imp1)
- [W9] https://imperialism.fandom.com/wiki/Trade_(Imp1) and https://lparchive.org/Imperialism/Update%2002/
- [W10] https://imperialism.fandom.com/wiki/Key_1815_purple, Brete_(Imp1), ZYdAimp_(Imp1)_Purple
- [W11] GameFAQs guide by Ed Randtke, Wayback copy https://web.archive.org/web/2022/https://gamefaqs.gamespot.com/pc/197614-imperialism/faqs/16042
- [W12] https://lparchive.org/Imperialism/Update%2007/ (no forts in colonies)
- [W13] https://imperialism.fandom.com/wiki/Reward
- [W14] https://lparchive.org/Imperialism/Update%2009/ and Update 11
- [W15] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple, https://lparchive.org/Imperialism/Update%2004/
- [W16] https://imperialism.fandom.com/wiki/Difficulty_(Imp1)
- [W17] https://imperialism.fandom.com/wiki/Starting_a_game_of_Imperialism
- [W18] Let's Play "Imperialism" by Kangra, https://lparchive.org/Imperialism (nation Visisik, Spring 1815 start). Imp1: retail 1997 UI, 7 Great Powers, 16 Minor Nations, nine-swatch relation bar. Screenshot sources [W19]-[W22] below.
- [W19] Relationship screens and trade policy page: https://lparchive.org/Imperialism/Update%2001/10-XljsTul.png, https://lparchive.org/Imperialism/Update%2012/27-1biATBM.png, https://lparchive.org/Imperialism/Update%2001/11-B66iBPN.png
- [W20] First offer sheets (consulate timing): https://lparchive.org/Imperialism/Update%2002/2-clspY6F.png, https://lparchive.org/Imperialism/Update%2002/3-CvEDztG.png
- [W21] Overtures, embassy refusal, grants, sway message: https://lparchive.org/Imperialism/Update%2008/7-yFe7l9K.png, https://lparchive.org/Imperialism/Update%2005/14-O8Qo6FE.png, https://lparchive.org/Imperialism/Update%2009/2-GI9NqXZ.png, https://lparchive.org/Imperialism/Update%2009/30-ooI2C92.png
- [W22] Political map, Accept Offer, Imperial Times: https://lparchive.org/Imperialism/Update%2006/6-spJog7e.png, https://lparchive.org/Imperialism/Update%2007/31-H9C6hVl.png, https://lparchive.org/Imperialism/Update%2007/34-qJ3qI0c.png, https://lparchive.org/Imperialism/Update%2010/8-QVUB12w.png
- [W23] Economics guide v1.02, Sept 1998 (Imp1; author's own calculations): https://www.grognard.com/info/imp_econ.txt
- [W24] GOG forum threads (Imp1 sections, anecdotes): https://www.gog.com/forum/imperialism_series/imperialism_1_strategy_normal, https://www.gog.com/forum/imperialism_series/imp1_late_game_economics, https://gog.com/forum/imperialism_series/imp_1economic_and_diplomacy
- [W25] https://imperialism.fandom.com/wiki/Developer, https://imperialism.fandom.com/wiki/Brete_(Imp1), https://imperialism.fandom.com/wiki/Imp3_wish_list (the wiki returned HTTP 402 to fetches; statements were read from search excerpts, so medium or low)
- [W26] AI guide for Imp1: https://archive.kontek.net/dailyimperialist.strategyplanet.gamespy.com/imp1/randtke.htm
- [W27] LP text pages: https://lparchive.org/Imperialism/Update%2007/ (pact intervention), https://lparchive.org/Imperialism/Update%2009/, https://lparchive.org/Imperialism/Update%2016/ (capital capture)
