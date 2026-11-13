# 06 - Trade, world market, merchant marine, money

> **Implementation notes**
> - Cash comes only from: selling on the world market, transporting gold/gems ($200/$500 per unit), and overseas profits. There is no tax income. Costs: civilians/jobs, training, tech, consulates, grants, army upkeep ($25 per arms point per turn), interest.
> - Trade is a bid/offer matching run in the **trade phase** (before production): you place up to 4 buy bids and any number of sell offers; Minor Nations sell raw materials and buy goods; offers pass down each seller's ranked list of bidders; every unit moved needs one free cargo hold. Orders persist between turns.
> - Price per commodity is global, set by supply and demand, starts near $100 (raw) / $300 (materials) / $900 (goods) and drifts up over the years.
> - CODE MISMATCH: `RESOURCE_VALUES`, the `TradeRoute` model and the stubbed `tradeSystem` (list at the bottom). Open numbers: price curve, Minor Nation demand per turn, favourite-partner formula (see gaps.md).
> - UPDATE 2026-11-12: section 7 adds screen-verified rows (Board of Trade order, 15 start prices, subsidy price formula, ledger order, credit and holds series). Two older notes above are contradicted: prices do not only drift up (horses $30 in 1853-75) and there are six subsidy sizes (75% exists). Both are kept and logged in gaps.md F12-F14.

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Order of one turn (where trade sits)

1. Diplomatic offers resolved. 2. **Trade deals offered and accepted/rejected.** 3. Industrial production. 4. Military conflicts. 5. Intercepted or blockaded trades cancelled. 6. Transported commodities and delivered trades go to the warehouse for next turn. [M p16]
- Units sold leave the warehouse; units bought are usable **next turn**; cash changes at deal time. [M p16] [W1]
- Military upkeep and interest are deducted after the deals. [W1]

## 2. Bids and offers

| Rule | Value | Source |
|---|---|---|
| Buy bids per turn | at most **4** commodities | [M p69] |
| Sell offers | any number of different commodities you hold (manual); the wiki adds that you cannot bid on a commodity you also offer | [M p69] [W2] |
| Sellable stock | warehouse minus what you ordered industry to use this turn | [M p66] |
| Offer quantity cap | per commodity at most your total merchant marine holds | [M p69] |
| Default offer when opened | the maximum (stock or holds, whichever is smaller) | [W2] |
| Orders persist | yes; revisit the screen only to change them | [M p68] |
| Cannot be traded | raw food (grain, fruit, livestock, fish), gold, gems | [M p52] [W2] |
| Can be traded | all other resources, canned food, all materials, all goods, horses | [M p48] [W3] |
| Main sellers | Minor Nations sell resources; Great Powers mostly avoid selling raw material | [M p69] |
| Main buyers of goods | Minor Nations; Great Powers mostly buy armaments and rarely clothing or furniture | [M p69] [W4] |

- Matching: when all Great Powers have ended the turn, a list of potential deals is built. Each offer sheet goes to the seller's most favoured bidder first; rejected or leftover quantity passes to the next bidder on that seller's list, until sold or no bidders remain. [M p66] [M p71] [M p72]
- Bidders accept any quantity up to the offered amount (human), or are auto-resolved (AI). A bidder with no free hold cannot accept and the offer passes on. [M p70] [M p71]
- A "no more offers of X this turn" box exists (UI). [M p72]
- Offers are processed in fixed **commodity order** (Board of Trade list, clothing first); this fixed order decides who spends scarce holds first. Exact list order is not in the manual. [M p70] [M p73] [?]
- You can only view the market of a commodity you bid on. [M p72]
- Relations: each completed trade (one per commodity type per turn, any quantity) with a nation where you have a consulate or embassy raises relations a little. Buying 1 unit per type is enough for that. [M p68] [W5]

## 3. Merchant marine

| Rule | Value | Source |
|---|---|---|
| Capacity = total cargo holds of all merchant ships | each hold carries 1 unit of any traded commodity, usable **once per turn** | [M p70] |
| Trade with a Minor Nation | always uses your holds (they own no ships), buying or selling | [M p70] |
| Trade with another Great Power | the **buyer** brings the goods and uses its holds; a bidder with no holds left cannot accept | [M p70] [M p72] |
| Gold and gems | need no holds | [W6] |
| Starting capacity | 4 holds (Normal); Introductory about 16 (one player site, via research notes); AI powers 6-8 | [W7] [W8] [?] |
| Ships never appear on the map | but can be intercepted, sunk or captured at sea | [M p61] [M p71] |
| Speed matters | faster average speed makes blockade/interception harder | [M p61] |
| Escort | warships at full strength in the capital port escort merchants automatically | [M p71] |

Merchant ships (built at the Shipyard; no cash, no workers, no upkeep). Cargo and costs come from a wiki table marked "under construction"; speeds and hulls are not documented. [W9]

| Ship | Needs tech | Cargo holds | Lumber | Fabric | Steel | Coal |
|---|---|---|---|---|---|---|
| Trader | none | 2 | 4 | 2 | - | - |
| Indiaman | none | 4 | 7 | 3 | - | - |
| Clipper | Streamlined Hulls ($1,500, 1821-25) | 4 (cheaper and faster) | 6 | 2 | - | - |
| Steamship (Paddlewheeler) | Paddlewheels ($3,000, 1826-30) | 8 | 6 | - | 2 | 10 |
| Freighter | Marine Engineering ($40,000, 1871-89) | not documented ("enormous, all-steel") | ? | ? | ? | ? |

Sources for the five types: [M p61]. Player data: a Normal game starts with 4 holds; two Indiamen give 12; a third gives 16. [W7] [W10]

- The first colony awards two free Clippers. [W11]
- AI merchant fleets seen: 6-8 holds at start, 12-16 by 1817-21. [W7] [W12]

## 4. Prices

| Rule | Value | Source |
|---|---|---|
| Price shown on the Bid and Offers screen | last turn's world price, used as the starting point | [M p66] |
| Direction | demand above supply raises it, supply above demand lowers it, balance keeps it | [M p66] |
| Supplier response | MNs and sometimes GPs offer more when last turn's price was high, which later pushes the price down | [M p66] |
| Unpredictable | the final price depends on all countries' bids and offers | [M p66] |
| Start levels (rule of thumb) | resources about $100, materials $300, goods $900, horses $300 | [W3] [W13] [W14] |

Observed prices (Normal game, random map, 1815-1830; spread over several games):

| Commodity | Observed | Source |
|---|---|---|
| Clothing | 882 (1815) -> 925-1,170 (1816-19) -> 1,379 (1856) | [W10] [W15] |
| Furniture | 888 -> 929-1,123 -> 1,223 (1856) | [W10] [W15] |
| Hardware | 954 (1815) -> 1,001-1,300 (1815-19) -> 1,183 (1856) | [W10] [W15] |
| Armaments | 940 -> 1,092-1,181 | [W10] [W16] |
| Steel | 309 (1815) -> 360 (1816) | [W10] |
| Canned food | 94 (1815) -> 56-62 -> 82-121 | [W10] [W17] |
| Cotton | 99 -> 102-122 (1816-17) -> 159-179 (1823) | [W10] [W16] |
| Wool | 96-109 (1815-16) -> 257 (1829) | [W10] [W15] |
| Timber | 98 -> 105-145 -> 177-194 (1823-25) | [W10] [W16] |
| Coal, Iron | 106 -> 116-138 | [W10] |
| Oil | 110 (1857) | [W15] |
| Horses | about 300, steady (a sale at 276) | [W10] [W18] |

- Goods start at $900, often fall for the first turns because every nation sells for quick cash, then climb above $1,500. [W4]
- A Minor Nation you conquered or colonised keeps paying the starting price (about $900 for furniture) even if the market price is lower; an eliminated MN's capital still buys goods, only from its conqueror. [W2] [W19] [W20]
- Subsidies change the price per trade, not the market price: a subsidy of s% makes you pay s% more when buying from that country and charge s% less when selling to it. [M p67] [M p83]
- Between two Great Powers a subsidy only lowers the price the other pays for **your** goods; it does not change what you pay. [W19]
- Developer land purchase = 20 x last market price of the commodity. [W21]

## 5. Subsidies, favourite partner, boycotts

| Rule | Value | Source |
|---|---|---|
| Subsidy sizes | 5%, 10%, 25%, 50%, 100% | [W22] |
| Needs | a trade consulate (or Embassy) in that country | [M p79] [M p82] |
| Favoured trading partner | gets the first offer to buy/sell; decided by relations **and** subsidised price combined; may differ from the power with the best relations | [M p67] [M p76] |
| Boycott | no trade of any kind between the two countries; automatic between countries at war; colonies share one colony-boycott policy | [M p76] [M p83] |
| Foreign Minister auto-subsidy | select a subsidy, hold Ctrl, click a Minor Nation: sets the smallest subsidy that makes you favourite, or 100% if impossible | [W19] |
| Manual advice | never subsidise to earn more; use it to win scarce resources or markets | [M p83] |
| Player advice | start with 5-10%, 25% to unseat a rival; above 25% costs more than it gains | [W23] |

Relations and colonisation are in 07.

## 6. Money, credit, upkeep

| Rule | Value | Source |
|---|---|---|
| Cash sources | trade sales, gold/gems transported, overseas profits; no taxes | [M p19] [M p20] |
| Starting cash (Normal) | $10,000 (Recovery of France scenario: $1,500) | [W10] [W24] |
| Credit | you may end a trade phase in debt up to a borrowing limit; beyond it the game force-sells warehouse stock at low prices and blocks all spending orders | [M p74] |
| Limit grows with | national income; observed $200 (1815), $330-$1,100 (1816-18), $2,234 (1823) | [M p74] [W10] [W25] |
| Interest | worsens above half the limit; repaying improves the rate; 12% shown in one report | [M p74] [W10] [?] |
| Orders checked against | cash plus credit; a rail order beyond the limit is refused with a minister message | [W26] |
| Army upkeep | $25 per turn per armaments point of every land unit; ships and civilians cost nothing | [W27] |
| Typical early upkeep | $100 per turn (4 arms at start) | [W10] [?] |
| Consulate / Embassy | $500 / $5,000, paid when ordered, refunded if cancelled | [M p79] [W28] |
| Grants | $1,000 to $10,000, once or locked each turn | [M p81] [W22] |

## 7. Screen-verified additions (Let's Play screenshots, 2026-11-12)

Version: every row tagged [W29]-[W44] is **Imp1**. The Let's Play (LP, Kangra, nation Visisik) is the 1997 game: Spring 1815 start, 7 Great Powers, 16 Minor Nations, nine-swatch relation bar, $500 consulate and $5,000 embassy. Imperialism II has other eras and costs. Nation names belong to that one world. Screens: see `11-screens.md`.

### 7.1 Board of Trade

| Rule | Value | Source |
|---|---|---|
| Row order, top to bottom (closes B5) | Clothing, Furniture, Hardware, Armaments, Canned food, Fabric, Lumber, Paper, Steel, Cotton, Wool, Timber, Coal, Iron, Horses = 15 rows (1815-55). Fall 1875: 17 rows, an extra material row between Steel and Cotton (Fuel [?], icon unclear) and Oil last (Oil Trade Book tab from Fall 1860). The manual settles deals in this fixed order, clothing first, so holds are spent top-down. | [W30] [W31] [W43] |
| Columns and controls | Price (last turn's world price), Available (warehouse), Quantity to Offer slider; one Bid and one Offer button per row; a row with a bid cannot carry an offer | [W30] [W32] |
| Four bids, many offers, persistent | exactly 4 Bid buttons lit on every board (wool, timber, coal, iron in 1815-16 and 1855; cotton, wool, coal, iron 1853; cotton, coal, iron, oil 1875); up to 6 Offer buttons (Fall 1875); the same "Offer 2 horses" row sits on 3 boards; offer quantity is a player-set slider (15 of 17 clothing) | [W32] |
| Start prices, Spring 1815 | clothing, furniture, hardware, armaments $900 each; fabric, lumber, paper, steel $300 each; cotton, wool, timber, coal, iron $100 each; **canned food $100** (the 94 in section 4 is a wiki-game reading, F13); horses $300 | [W30] |
| Start state on that screen | cash $9,900 (not $10,000, conflict F12); 4 holds; warehouse: clothing 5, furniture 5, canned food 20, fabric 7, lumber 8, paper 8, steel 10, all else 0 (difficulty not stated [?]) | [W30] |

### 7.2 Price series (Board column = last turn's price)

| Commodity group | Spring 1815 | Spring 1816 | Summer 1853 | Fall 1875 |
|---|---|---|---|---|
| Clothing / Furniture / Hardware / Armaments | 900 each | 989 / 1,007 / 1,032 / 1,038 | 744 / 728 / 1,277 / 1,124 | 1,042 / 880 / 1,400 / 1,189 |
| Canned food | 100 | 82 | 78 | 69 |
| Fabric / Lumber / Paper / Steel | 300 each | 314 / 332 / 354 / 348 | 237 / 245 / 255 / 324 | 276 / 264 / 240 / 326 |
| Cotton / Wool / Timber / Coal / Iron | 100 each | 98 / 109 / 118 / 120 / 122 | 66 / 75 / 85 / 71 / 82 | 64 / 73 / 80 / 62 / 68 |
| Horses | 300 | 294 | **30** | **30** |
| Oil | - | - | - | 84 |

- Source: [W30] [W31] [W32]. Summer 1855 is close to 1853 (clothing 755, furniture 717, hardware 1,236, armaments 1,099, horses 30). Deal prices in the ledger headers: Fall 1815 wool 105, coal 116, iron 118; Fall 1824 furniture 1,369, cotton 130, wool 169, coal 120, iron 128; Spring 1829 clothing 1,320, furniture 1,117, cotton 126, wool 159, iron 138; Fall 1838 clothing 1,020, furniture 735, cotton 75, wool 105, coal 118. [W34] [W35] [W37]
- Prices do **not** only drift up: goods rose about 10-52% and raw materials about 20-69% in the first 14 years (ledger samples: furniture 1,369 and wool 169 in Fall 1824; those ledger pages were not re-opened in the spot check [?]), then fell (raw 62-85, below the $100 start; clothing and furniture below $900 in 1853-75 while this player exported heavily; hardware and armaments stayed high). LP text blames world instability and more production. No formula visible. Conflict with the "drifts up" note: F13. [W32]
- Horses stay at $30 on three boards 22 years apart, 10% of the $300 start: a lower clamp of 10% of the start price is the simplest reading; no other commodity fell below 62%, so other clamps are unknown [?]. Conflict with "about 300, steady" in section 4: F13. [W32]
- Board price is last turn's price; the deal price is this turn's clearing price (ledger header). Spring 1815: wool and timber Board $100, deal $104 (+4%) with no subsidy involved. [W34]

### 7.3 Subsidies, colonies, overseas profit

| Rule | Value | Source |
|---|---|---|
| Subsidy buttons | six: 5%, 10%, 25%, 50%, 75%, 100% (flag buttons, more red as the percent rises) plus Boycott and Colony Boycott. The list in section 5 misses 75% (conflict F14). | [W36] |
| Subsidy price formula (closes C4 for price) | with the subsidised Minor Nation: buy at floor(P x (1+s)), sell at floor(P x (1-s)), P = this turn's deal price in the ledger header, rounded **down**. Checked on 12 printed lines: wool 105 -> 115 (10%), coal 122 -> 134 (10%) and -> 128 (5%), iron 138 -> 144 (5%), coal 120 -> 150 (25%), cotton 75 -> 93 (25%); sold furniture 1,057 -> 951 (10%), 1,369 -> 1,300 (5%), clothing 1,320 -> 1,254 (5%). Ledger totals reconcile to the dollar. Unsubsidised partners trade at P. | [W35] |
| Hidden favourite effect | still unknown. Posters: a rival can take the favourite spot by raising subsidies, improving relations, selling furniture, cloth or tools to that nation, or buying its food in the same turn; the AI sets its subsidies the turn after yours, so wait one turn before the Ctrl helper; a margin above the rival works (10% when the lowest rival is at 5%). | [W45] |
| Colony prices | LP: a colony lets you buy any commodity at its base (start) price, the saving counted as overseas profit. Fall 1838 ledger: wool and coal from colonies at $100 while the market was 105 and 118; cotton (market 75, below base) shows no override; 5 furniture sold to Niridna at $900 (market 735) but 3 clothing to Qak at market 1,020. Reading: colony buy = min(base, market), sell = max(base, market). | [W37] [?] |
| Overseas Profits block | ledger lists commodity, Minor Nation, dollars. Fall 1838: cotton Qak $225 (3 units x 75, 100% of market value, colony); Spring 1829 (not colonies): cotton Niridna $95 vs unit 126, wool $121 vs 159 = about 75-76% per developed unit. Unit counts are not printed. Fan guide says royalty 30% in a partner and 12% in a colony: conflict F15, see 07. | [W37] [W35] [W44] [?] |

### 7.4 Offer sheet, Trade Book, holds

| Rule | Value | Source |
|---|---|---|
| Offer sheet | "X offers N units of Commodity @ $P / unit", editable "Purchase [n] units", box "No more offers of Commodity", REJECT and ACCEPT; treasury at the top, remaining holds under a ship icon. Accepting charges cash at once and lowers holds (cash $8,900 -> $8,796 and holds 4 -> 3 after 1 wool at $104). | [W33] |
| Minister advice | "Purchase Recommended" (consulate exists, industry does not need it: one unit gives the diplomatic benefit of a deal), "Purchase Not Recommended" (no consulate), or statistics (Industrial Need, Warehouse, Transport, Already Purchased; "X is a Minor Nation. Their favorite trade partner is Y"). A consulate ordered this turn already counts (07, F3). | [W33] |
| Great Powers also send sheets | Summer 1843 "Yakakkie offers 4 units of Steel @ $378" (Board steel 321-348), text says Embassy; 60 holds. | [W39] |
| Trade Book | left page "Offering Nations": each seller, its units and a row of flags in the order it prefers bidders; right page "Bidding Nations" and, on the first sheet, "Remaining Merchant Marine". Summer 1816 iron: Manfil Maran 4 units (Visisik first, it has a 10% subsidy and consulate), Porgindris 3 (Mone first), Niatat 3 (Mone first), Kangjung 2 (Yakakkie first). | [W38] |
| Tie-break | the bidder list always follows one fixed Great Power order (here Evace, Yakakkie, Visisik, Kova, Pfessottirg, Mone, Wan); with equal relations and no subsidy a seller's flags equal that order. Open: the sheet said Niridna's favourite was Pfessottirg while its flags put Visisik first. | [W38] [?] |
| Flag list can be shorter than bidders | Fall 1860 oil: 5 bidders, 3 flags per seller (boycott assumed) | [W38] [?] |
| Turn-1 holds | Remaining Merchant Marine: human 4, every AI bidder 0, so rivals could not take Niridna's single wool | [W38] |
| Offers seen | 1-6 units per seller per commodity (Niridna 1 wool, Niatat 6 timber, iron 4/3/3/2, oil 1-3); some commodities absent for a turn. Sold by the player: 1-5 units of a good per Minor Nation per turn (C5 open: the offered quantity is not printed). | [W33] [W37] |
| Holds over time | 4 (1815), 12 (1816, two Indiamen), 60 (1843), 104 (1853-55), 222 (Fall 1875) | [W31] [W32] [W39] |
| Ship cards (Shipyard) | Indiaman: cargo 4, hull 40, armor 5, firepower 0, cost 3 fabric + 7 lumber. Paddlewheeler: cargo 8, hull 35, armor 5, cost 6 lumber + 2 steel + 10 coal. Card "Speed" is battle speed, so merchants show 0; sea speed is not displayed. Trader, Clipper, Freighter cards not seen. | [W40] |
| Fan guide hint (low) | transport cost per unit 50 / 40 / 28 / 18 for Indiaman / Clipper / Paddlewheeler / Freighter; own calculations, not game code | [W44] [?] |
| Buy-everything tactic | buying all or most of a Minor Nation's offers keeps rivals out and speeds relations; one report found trade profit "disappointing" next to town development | [W45] |

### 7.5 Ledger, credit, boycotts

| Rule | Value | Source |
|---|---|---|
| Deal Book ledger | "Sold" page: lines "Sold N X to Nation @ $price"; "Bought" page: "Bought N X from Nation [@ $price]", and "Nation offered to sell us X" for deals not filled (rejected or no hold). Bottom Line order: Sold, Bought, Military Upkeep, Overseas Profits, Interest (only when in debt), net (red if negative), Credit Limit. | [W35] [W43] |
| Credit limit series | $200 (Spring and Fall 1815), $337 (Spring 1816), $922 (Summer 1819), $2,050 (Fall 1824). Interest line labelled "Interest (12%)" only when cash is negative; Summer 1819: -$663 after an $818 purchase, $100 upkeep and $38 interest ($38 is not 12% of any printed balance, about 6% of the $625 shortfall: rule open). | [W41] |
| Upkeep series | $100 (1815-19), $250 (Fall 1824), $1,725 (Winter 1836) = 4, 10, 69 arms points x $25 (see 08, F10) | [W41] [W35] |
| Embassy not on credit | at $4,297: "we do not have the $5000 required to establish an embassy" | [W42] |
| Total Boycott | = Boycott plus Colony Boycott on the same target (manual: the indicator shows both marks). War boycotts automatically. | [W42] [W43] |
| Boycott in play | AI colony boycotts from 1850; they "occasionally slow the trade economy to a crawl" but not a nation with colonies (LP text, qualitative) | [W42] |
| Interception | "Enemy Merchants Intercepted!": world map with skulls at the sea zone, footer names the blockader ("task force of 3 vessels, under orders to blockade") and the victim ("Kova: Trading 2 Food with Din Hang"). A deal = commodity + quantity + partner; interception cancels that deal. | [W42] |
| Ranking screens | Merchant Marine and World Exports are bars per Great Power, no numbers; the Council uses the merchant marine ranking | [W46] |
| Not usable | `imperialism-remake-definition.readthedocs.io` (fan remake: mission $300, embassy $1,000, "DR" and "BSP" units) matches no Imp1 screen; Imp2 | [?] |

## CODE MISMATCH

- CODE MISMATCH: `constants/gameConstants.ts` `RESOURCE_VALUES` (grain 10, livestock 20, fish 15, fruit 12, timber 25, cotton 30, wool 35, horses 40, coal 40, iron 50, gold 100, gems 1000, oil 75). Observed market: raw resources about $100, horses $300, materials about $300, goods about $900. Gold/gems are not market goods at all: $200 and $500 cash per unit transported.
- CODE MISMATCH: `types/TradeRoute.ts` models fixed city-to-city routes with capacity. The rules have no routes: only global bids/offers matched through ranked preference lists plus merchant holds.
- PARTLY RESOLVED in M3 (FR-060 to FR-065), was: `tradeSystem` is a stub, no bids/offers, no price model, no 4-bid limit. Now: one world market (the world as an unlimited buyer and seller at a drifting price), sell offers and up to 4 buy bids a turn, one hold per unit, no raw food, gold or gems, bought units usable next turn. Still missing: Minor Nations, matching through ranked bidder lists, the Board of Trade order, persistent orders (decision Q15), subsidies. `Nation.merchantMarine {holds, avgSpeed}` is right in shape.
- `Nation.creditLimit` / `debt` exist but have no rules behind them (limit grows with income, forced sale beyond limit).
- `types/Diplomacy.ts` `TradePolicy.subsidyPercent` should be limited to 5/10/25/50/100; boycott as a separate flag is right.
- CODE MISMATCH (2026-11-12): the Imp1 screen has **six** subsidy steps, 5/10/25/50/75/100 (7.3, F14); the price effect is floor(P x (1 +/- s)). The "total boycott" state is own plus colony boycott.

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Buy_(Imp1)
- [W2] https://imperialism.fandom.com/wiki/Sell_(Imp1)
- [W3] https://imperialism.fandom.com/wiki/Material and https://imperialism.fandom.com/wiki/Goods
- [W4] https://imperialism.fandom.com/wiki/Goods
- [W5] https://imperialism.fandom.com/wiki/Diplomacy_(Imp1)
- [W6] https://imperialism.fandom.com/wiki/Developer
- [W7] https://imperialism.fandom.com/wiki/Brete_(Imp1) and https://imperialism.fandom.com/wiki/Key_1815_purple
- [W8] https://imperialism.fandom.com/wiki/ZYdAimp_(Imp1)_Purple (merchant marine of each power at start)
- [W9] https://imperialism.fandom.com/wiki/Ship_(Imp1) (table "under construction")
- [W10] https://imperialism.fandom.com/wiki/Key_1815_purple
- [W11] https://imperialism.fandom.com/wiki/Reward
- [W12] https://imperialism.fandom.com/wiki/Key_Scotland_(Imp1)_Blue
- [W13] https://imperialism.fandom.com/wiki/Clothing and https://imperialism.fandom.com/wiki/Furniture
- [W14] https://imperialism.fandom.com/wiki/Material
- [W15] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple
- [W16] https://imperialism.fandom.com/wiki/Key_Scotland_(Imp1)_Blue
- [W17] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple
- [W18] https://imperialism.fandom.com/wiki/Brete_(Imp1)
- [W19] v1.1 readme https://imperialism.fandom.com/wiki/README11.TXT and v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (sections VIII B, C)
- [W20] GameFAQs guide by Ed Randtke (v1.1.7), Wayback copy https://web.archive.org/web/2022/https://gamefaqs.gamespot.com/pc/197614-imperialism/faqs/16042
- [W21] https://imperialism.fandom.com/wiki/Developer (prices cross-checked against the Nepal report: coal $2,220 at about $111)
- [W22] https://imperialism.fandom.com/wiki/Subsidy_(Imp1) and https://imperialism.fandom.com/wiki/Diplomacy_(Imp1)
- [W23] GOG forum thread reported by a research agent (not re-opened): https://www.gog.com/forum/imperialism_series/imperialism_1_strategy_normal
- [W24] https://imperialism.fandom.com/wiki/Recovery_of_France_1820
- [W25] https://imperialism.fandom.com/wiki/Brete_(Imp1) (credit limit $2,226 cash example) and Key_Scotland_(Imp1)_Blue (limit 2,234)
- [W26] https://imperialism.fandom.com/wiki/Railroad_(Imp1)
- [W27] https://imperialism.fandom.com/wiki/Army_(Imp1) and https://imperialism.fandom.com/wiki/Expansion_(Imp1)
- [W28] https://lparchive.org/Imperialism/Update%2002/
- [W29] Let's Play "Imperialism" by Kangra, https://lparchive.org/Imperialism (nation Visisik, random world, Spring 1815). Imp1: retail 1997 UI, 7 Great Powers, 16 Minor Nations, nine-swatch relation bar. Screenshot links below are the evidence for section 7.
- [W30] First Board of Trade, Spring 1815 (start prices, stock, cash, holds): https://lparchive.org/Imperialism/Update%2001/8-TE5s18z.png
- [W31] Board Spring 1816 (15 prices, 12 holds): https://lparchive.org/Imperialism/Update%2002/16-uvNfbaz.png
- [W32] Late boards 1853, 1855, 1875 (the date of each URL was not recorded): https://lparchive.org/Imperialism/Update%2012/14-ZZCVV7f.png, https://lparchive.org/Imperialism/Update%2013/3-7XNkDVK.png, https://lparchive.org/Imperialism/Update%2018/4-K6D2FwQ.png
- [W33] Offer sheets, first turn: https://lparchive.org/Imperialism/Update%2002/2-clspY6F.png, https://lparchive.org/Imperialism/Update%2002/3-CvEDztG.png, https://lparchive.org/Imperialism/Update%2002/6-xhqZKt2.png
- [W34] First Deal Book (wool 100 -> 104): https://lparchive.org/Imperialism/Update%2002/7-G7aS2yh.png
- [W35] Ledgers with subsidised lines and bottom line: https://lparchive.org/Imperialism/Update%2004/15-coDgoFo.png, https://lparchive.org/Imperialism/Update%2002/14-HQldM5B.png, https://lparchive.org/Imperialism/Update%2002/17-zI78zee.png, https://lparchive.org/Imperialism/Update%2007/32-MBQ5Zgo.png (Winter 1836, upkeep $1,725)
- [W36] Trade Policies tab, six subsidy buttons: https://lparchive.org/Imperialism/Update%2002/12-AGUrdMN.png, https://lparchive.org/Imperialism/Update%2001/11-B66iBPN.png
- [W37] Fall 1838 ledger (colonies, overseas profits): https://lparchive.org/Imperialism/Update%2008/19-96GTpGG.png
- [W38] Trade Book spreads: https://lparchive.org/Imperialism/Update%2002/5-LrmojSc.png, https://lparchive.org/Imperialism/Update%2002/19-07mCktM.png, https://lparchive.org/Imperialism/Update%2014/4-z0l2dUh.png
- [W39] Great Power offer sheet, Summer 1843: https://lparchive.org/Imperialism/Update%2009/14-izYmx6Q.png
- [W40] Shipyard cards: https://lparchive.org/Imperialism/Update%2002/9-bH0M4Ey.png, https://lparchive.org/Imperialism/Update%2002/10-EJVZ56D.png
- [W41] Ledger with credit limit and interest, Summer 1819: https://lparchive.org/Imperialism/Update%2003/15-ZlRQkoR.png
- [W42] Embassy refusal https://lparchive.org/Imperialism/Update%2005/14-O8Qo6FE.png; interception https://lparchive.org/Imperialism/Update%2007/11-zRRFLG3.png; boycott legend https://lparchive.org/Imperialism/Update%2018/5-gV9ae4t.png; LP text https://lparchive.org/Imperialism/Update%2011/
- [W43] Manual full text (Imp1, 1997): https://archive.org/stream/imperialism1997ssimanual/Imperialism%201997%20SSI%20Manual_djvu.txt (Deal Book, Trade Book, Board of Trade wording)
- [W44] Economics guide v1.02, Sept 1998, https://www.grognard.com/info/imp_econ.txt (Imp1: Minutemen, Quack order; author's own calculations; named Pauca in one reading and Magister in another, unverified)
- [W45] Forum play reports: https://gog.com/forum/imperialism_series/imp1_battle_for_markets and https://apolyton.net/showthread.php/149120-Imperialism-Recovery-of-France-Scenario (Imp1 threads; anecdotes)
- [W46] Ranking screens: https://lparchive.org/Imperialism/Update%2011/40-vrKQCak.png, https://lparchive.org/Imperialism/Update%2011/41-raPaUcm.png, https://lparchive.org/Imperialism/Update%2004/22-SNbbaWQ.png
