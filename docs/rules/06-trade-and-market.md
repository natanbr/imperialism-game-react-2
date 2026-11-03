# 06 - Trade, world market, merchant marine, money

> **Implementation notes**
> - Cash comes only from: selling on the world market, transporting gold/gems ($200/$500 per unit), and overseas profits. There is no tax income. Costs: civilians/jobs, training, tech, consulates, grants, army upkeep ($25 per arms point per turn), interest.
> - Trade is a bid/offer matching run in the **trade phase** (before production): you place up to 4 buy bids and any number of sell offers; Minor Nations sell raw materials and buy goods; offers pass down each seller's ranked list of bidders; every unit moved needs one free cargo hold. Orders persist between turns.
> - Price per commodity is global, set by supply and demand, starts near $100 (raw) / $300 (materials) / $900 (goods) and drifts up over the years.
> - CODE MISMATCH: `RESOURCE_VALUES`, the `TradeRoute` model and the stubbed `tradeSystem` (list at the bottom). Open numbers: price curve, Minor Nation demand per turn, favourite-partner formula (see gaps.md).

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

## CODE MISMATCH

- CODE MISMATCH: `constants/gameConstants.ts` `RESOURCE_VALUES` (grain 10, livestock 20, fish 15, fruit 12, timber 25, cotton 30, wool 35, horses 40, coal 40, iron 50, gold 100, gems 1000, oil 75). Observed market: raw resources about $100, horses $300, materials about $300, goods about $900. Gold/gems are not market goods at all: $200 and $500 cash per unit transported.
- CODE MISMATCH: `types/TradeRoute.ts` models fixed city-to-city routes with capacity. The rules have no routes: only global bids/offers matched through ranked preference lists plus merchant holds.
- CODE MISMATCH: `Nation.merchantMarine {holds, avgSpeed}` is right in shape; `tradeSystem` is a stub, no bids/offers, no price model, no Board of Trade order, no 4-bid limit.
- `Nation.creditLimit` / `debt` exist but have no rules behind them (limit grows with income, forced sale beyond limit).
- `types/Diplomacy.ts` `TradePolicy.subsidyPercent` should be limited to 5/10/25/50/100; boycott as a separate flag is right.

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
