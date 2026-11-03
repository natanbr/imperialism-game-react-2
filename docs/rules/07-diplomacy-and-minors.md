# 07 - Diplomacy, treaties, Minor Nations, colonies (later phase)

> **Implementation notes**
> - Diplomacy is not v1 beyond what the world market needs: a **relationship level per (Great Power, Minor Nation)** and a **subsidy percent** decide who gets each Minor Nation's offers first (see 06). Build the data model for it, but scripted constants are enough for v1.
> - Orders are simultaneous and resolved first in the turn; all diplomatic orders can be taken back until End Turn. Minor Nations never attack, never refuse a consulate, embassy, pact or peace, and always accept a declaration of war without recourse (war cannot be refused).
> - The relationship scale has **9 colour levels**; the real step sizes are not documented (gaps.md).
> - CODE MISMATCH: `types/Diplomacy.ts` uses `attitude -100..+100` and a free-form `Treaty` list (list at the bottom).

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

## CODE MISMATCH

- CODE MISMATCH: `types/Diplomacy.ts` `Relation.attitude` is -100..+100 with booleans (`atWar`, `allied`, `tradePartner`) and `Treaty.duration`. The rules use a 9-step ordinal scale per pair, no treaty duration, and these exact treaty kinds: consulate, embassy, non-aggression pact, alliance, war/peace state, colony ownership. `TreatyType` includes `"trade"` and `"peace"` and `"colony"`; consulates/embassies and boycotts are missing.
- `TradePolicy.subsidyPercent` should be one of 5, 10, 25, 50, 100; `Grant.locked` matches locked grants.
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
