# 05 - Industry, labour, food, training, expansion

> **Implementation notes**
> - All industry happens in the capital. Mills and factories turn inputs into the next level: **2 labour + 2 input units -> 1 output unit** everywhere, except the steel mill (1 coal + 1 iron + 2 labour -> 1 steel) and food processing (4 raw food + 2 labour -> 2 canned food). Output is capped by the building's capacity per turn.
> - Labour = sum over workers: untrained 1, trained 2, expert 4 (+ power). Every worker eats 1 food per turn; wrong food = sick = no labour; no food = starves.
> - Growth loop: lumber + steel expand buildings and freight cars; paper trains workers and builds civilians; canned food + clothing + furniture recruit migrants.
> - CODE MISMATCH: steel mill, food processing and migrant recipes in `definisions/ResourceConversions.ts` do not match the rules (list at the bottom). Production is a stub (`productionSystem`) and no industry buildings exist yet.

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Buildings in the capital

| Building | Job | Capacity limit | Orders saved between turns | Source |
|---|---|---|---|---|
| Warehouse | shows stock; stock is what you can offer for sale | - | - | [M p55] |
| Textile Mill | fabric from cotton/wool | yes | yes | [M p56] [M p64] |
| Clothing Factory | clothing from fabric | yes | yes | [M p64] |
| Lumber Mill | lumber or paper from timber | yes, shared by both outputs | yes | [M p56] [M p63] |
| Furniture Factory | furniture from lumber | yes | yes | [M p56] |
| Steel Mill | steel from coal + iron | yes | yes | [M p56] |
| Metal Works | hardware or armaments from steel | yes, shared by both outputs | yes | [M p56] [M p64] |
| Food Processing | canned food from raw food | **none** | **no** | [M p58] |
| Railyard | freight cars (transport capacity) | **none** | **no** | [M p64] |
| University | civilian units | - | - | [M p59] |
| Armoury | land regiments | - | - | [M p60] |
| Shipyard | merchant ships and warships | - | - | [M p61] |
| Trade School | trains workers | - | - | [M p57] |
| Capitol | recruits migrants | - | - | [M p57] |
| Oil Refinery | fuel from oil | yes | yes | [M p58] [M p64] |
| Power Plant | turns fuel into labour | yes (fuel limit; one player saw 100) | - | [M p58] [W1] |

- Introductory and Easy: the six mills/factories (textile, clothing, lumber, furniture, steel, metal works) are pre-built. Normal and harder: you build them with your first turn's lumber and steel; build lumber mill and steel mill first. [M p61] [M p62]
- Refinery and Power Plant appear only after Oil Drilling. [M p58] [M p94]
- All production dialogs may stay open; orders are executed at End Turn in the production phase; output is in the warehouse **next turn**. [M p16] [M p54]

## 2. Production economies and recipes

Manual rule: all production is two-for-one. [M p56]

| Economy | Resources | Materials | Goods |
|---|---|---|---|
| Textile | wool, cotton | Fabric: 2 cotton or wool -> 1 | Clothing: 2 fabric -> 1 |
| Wood | timber | Lumber and/or Paper: 2 timber -> 1 each | Furniture: 2 lumber -> 1 |
| Metal | iron, coal | Steel: 1 iron + 1 coal -> 1 | Hardware and/or Armaments: 2 steel -> 1 each |
| Oil | oil | Fuel: 2 oil -> 1 | - |
| Food | grain, fruit, livestock, fish | Canned food: 4 raw -> 2 | - |
| Horse | horses | - | - |

Source: [M p56]. Cotton and wool mix freely in the textile mill. [W2]

Per unit of output (labour from the wiki formula "2 labour + 2 input = 1 product"; the tutorial confirms it for clothing):

| Building | Inputs | Labour | Output | Source |
|---|---|---|---|---|
| Textile Mill | 2 cotton or wool (any mix) | 2 | 1 fabric | [M p56] [W2] [W3] |
| Clothing Factory | 2 fabric | 2 | 1 clothing | [M p56] [M p107] |
| Lumber Mill | 2 timber | 2 | 1 lumber **or** 1 paper | [M p56] [W4] |
| Furniture Factory | 2 lumber | 2 | 1 furniture | [M p56] [W3] |
| Steel Mill | 1 coal + 1 iron | 2 | 1 steel | [M p56] [W5] |
| Metal Works | 2 steel | 2 | 1 hardware **or** 1 armaments | [M p56] [W3] |
| Oil Refinery | 2 oil | 2 | 1 fuel | [M p56] [W6] |
| Food Processing | 2 grain + 1 fruit + 1 livestock-or-fish (4 raw) | 2 for 2 cans (1 per can) | 2 canned food | [M p58] [W7] |
| Railyard | 1 lumber + 1 steel | 2 | 1 freight car | [M p64] [W8] |

- Cross-check by a player: 2 clothing need 12 labour and 8 cotton (4 fabric = 8 cotton, 8 labour; 2 clothing = 4 labour); the whole growth bill for +2 trained workers is 42 labour units and 32 resource units. [W9] [?]
- Labour is pooled and spent in whole units; with an odd leftover (for example 1) only canned food (1 labour per can) can use it. A lone untrained worker cannot do mill work. [W10] [?]
- You cannot order more than the stock and labour allow; the dialog marks the missing input with a red X. [M p63]
- Gold and gems never enter the warehouse. [M p52]

## 3. Capacity and expansion

| Building | Start capacity | Steps | Source |
|---|---|---|---|
| Mills (textile, lumber, steel) and Refinery | 2 | 2 -> 4 -> 8 -> 16 -> 24 -> then +8 | [M p62] [M p63] |
| Factories (clothing, furniture, metal works); Power Plant start size not documented [?] | 1 | 1 -> 2 -> 4 -> 8 -> 12 -> then +4 | [M p62] [M p63] [W11] |
| Cost | 1 lumber + 1 steel **per capacity point added**, deducted when ordered; same for first construction | | [M p62] [M p107] |
| Labour for expansion | none | | [M p107] |
| Takes effect | next turn (scaffolding shown; "completed next turn") | | [M p107] |

- Wiki wording differs slightly: mills "2, 4, 8, then +8"; same numbers. [W5]
- A Power Plant was reported to cost $5,000 and no lumber or steel; the wiki says Power Plants expand with lumber and steel like factories. [W12] [W11] [?]
- Capacity is the maximum output in one turn; the building keeps the last order until the player opens its dialog again. [M p63]

## 4. Labour, workers, training

| Worker | Labour per turn | Source |
|---|---|---|
| Untrained | 1 | [M p55] [M p57] |
| Trained | 2 | [M p57] |
| Expert | 4 | [M p57] |

Training (Trade School). Training takes one turn; the worker is out of the labour pool that turn, so at least 1 labour must be free to start. [M p57] [M p108]

| Step | Cash | Paper | Source |
|---|---|---|---|
| Untrained -> trained | $100 | 1 | [W13] |
| Trained -> expert | $1,000 | 2 | [W13] |

- Experts are used for civilians (University), Sappers and Combat Engineers; they cannot be trained further. [W13] [W14]
- The manual says training costs "paper and cash" without amounts. [M p57]
- Starting workforce, usual Normal game: 4 untrained, 2 trained, 1 expert (12 labour). [W15] [?]
- Paper is made only in the Lumber Mill; one lumber mill capacity point is shared between lumber and paper. [M p56]

Migration (Capitol). [M p57]
- Recruit untrained workers each turn; needs **canned food + clothing + furniture** per worker. [M p57] [W16]
- Limit per turn: floor(provinces / 4); after conquering a Great Power capital (Capitol upgrade): floor(provinces / 3). [M p57] [W17]
- New workers appear next turn and must be fed every turn from then on. [W16]
- Random event: two peasants join the labour force for free. [W18]

## 5. Food

| Rule | Value | Source |
|---|---|---|
| Consumption | every worker eats 1 food per turn | [M p57] |
| Preferred food by worker slot (groups of four) | 1st grain, 2nd fruit, 3rd grain, 4th livestock **or** fish; repeat | [M p58] |
| Share of workforce | grain 1/2, fruit 1/4, livestock-or-fish 1/4 | [M p52] [M p58] |
| Preference independent of | worker training level | [M p58] |
| Eating order | 1) food shipped this turn (deducted at End Turn), 2) warehouse stock of the preferred type, 3) canned food from the warehouse (no sickness), 4) any other raw food from the warehouse -> sick (no labour), 5) nothing -> starves and is removed | [M p58] |
| Canned food | 2 cans per 4 raw food; feeds any worker; also needed for migration; tradeable | [M p52] [M p58] |
| Raw food | cannot be bought or sold on the world market (canned food can) | [M p52] [W19] |
| Warning icons | canned food icon in the trade screen border = sickness or starvation threatened | [M p68] |

- Examples: 8 workers need 4 grain, 2 fruit, 2 meat. Capital advice: 3-4 grain, 2 fruit, 2 meat for good starts. [W15]
- One raw food unit per worker is the real cost of population growth: more workers need more transport capacity (cars). [W20]

## 6. Power

- Power is not a commodity: no storage, no sale, no labour needed to make it. It is created in the Power Plant from fuel in the same turn and **adds directly to the labour total**; it is spent before human labour. [M p58]
- Fuel comes from the Oil Refinery (2 oil + 2 labour -> 1 fuel). [M p56] [W6]
- Conversion rate of fuel to labour: **not documented**. A player says refining fuel costs only 2 labour so the labour pool "shoots up" as fast as fuel is burned. [W6] [?]
- Cut power back when labour is in surplus: unused fuel serves regiments and ships. [W21]
- A late-game player could set labour by managing the oil stock alone. [W6]

## 7. Unit-building centres (cost summary)

| Centre | Needs | Result | Source |
|---|---|---|---|
| University | 1 expert worker + cash + 2 paper | civilian, next turn in the capital province | [M p59] [W22] |
| Armoury | worker (grade per unit), cash, armaments; horses for cavalry and field artillery; fuel for late units | regiment, next turn in the capital province | [M p60] [W23] |
| Shipyard | lumber, fabric/steel, coal/fuel, armaments for warships; **no workers, no cash** | ship, next turn in the capital port | [M p61] [W24] |

- Details: civilians in 03, regiments and warships in 08, merchant ships in 06.
- Regiment workers are lost to industry for good, but a regiment upgrade costs only the new cost minus the person (and horse). [M p60] [W23]

## CODE MISMATCH

- CODE MISMATCH: `definisions/ResourceConversions.ts` `SteelMill`: 2 coal + 2 iron + 2 labour -> 1 steel. Rule: 1 coal + 1 iron + 2 labour -> 1 steel. [M p56] [W5]
- CODE MISMATCH: `FoodProcessing`: 1 grain + 1 fruit + 1 fish-or-livestock + 2 labour -> 1 canned food. Rule: 2 grain + 1 fruit + 1 fish-or-livestock + 2 labour -> 2 canned food. [M p58] [W7]
- CODE MISMATCH: `ProduceUntrainedWorker` inputs are canned food + hardware + clothing (its own note says hardware + paper + $100). Rule: canned food + clothing + furniture, no cash, no labour. [M p57] [W16]
- CODE MISMATCH: `ProduceUntrainedWorker` and the training recipes output Labour in the same turn (`+1`, `+2`, `+4`). Rules: migrants arrive next turn; a trainee gives no labour in the training turn. Training costs ($100 + 1 paper, $1,000 + 2 paper) match; the note strings say 500 cash for the first step.
- `LumberMillLumber`, `LumberMillPaper`, `FurnitureFactory`, `TextileMillFabric`, `ClothingFactory`, `Hardware`, `FuelProcessing` match the rule 2 input + 2 labour -> 1 output. Missing: Armaments recipe (Metal Works), Railyard, University, Armoury, Shipyard, power plant conversion (`ElectricityProduction` is declared but has no recipe).
- CODE MISMATCH: no capacity per building (`IndustryBuilding.capacity` exists, nothing sets it), no mill/factory start sizes (2 / 1), no expansion steps or lumber + steel cost.
- Not implemented: food consumption and sickness, migration cap floor(provinces/4), Trade School step limits, production-phase timing (output next turn).

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://lparchive.org/Imperialism/Update%2015/ (power plant fuel limit 100)
- [W2] https://imperialism.fandom.com/wiki/Textile_Mill
- [W3] https://imperialism.fandom.com/wiki/Factory (production formula "2 labour plus 2 input produces one product", exception food processing) and https://imperialism.fandom.com/wiki/Goods
- [W4] https://imperialism.fandom.com/wiki/Lumber_Mill
- [W5] https://imperialism.fandom.com/wiki/Steel_Mill
- [W6] https://lparchive.org/Imperialism/Update%2014/
- [W7] https://imperialism.fandom.com/wiki/Food_Processing
- [W8] https://imperialism.fandom.com/wiki/Freight_car and https://imperialism.fandom.com/wiki/Transport_(Imp1)
- [W9] https://imperialism.fandom.com/wiki/Expansion_(Imp1)
- [W10] https://imperialism.fandom.com/wiki/Untrained_Worker
- [W11] https://imperialism.fandom.com/wiki/Building_(Imp1)
- [W12] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple (Winter 1857 entry)
- [W13] https://imperialism.fandom.com/wiki/Trade_School, https://imperialism.fandom.com/wiki/Trained_worker, https://imperialism.fandom.com/wiki/Expert_worker
- [W14] https://imperialism.fandom.com/wiki/Worker
- [W15] https://imperialism.fandom.com/wiki/Brete_(Imp1) and https://imperialism.fandom.com/wiki/Starting_a_game_of_Imperialism
- [W16] https://imperialism.fandom.com/wiki/Capitol
- [W17] https://imperialism.fandom.com/wiki/Reward
- [W18] https://imperialism.fandom.com/wiki/Random_event
- [W19] https://imperialism.fandom.com/wiki/Meat
- [W20] https://imperialism.fandom.com/wiki/Expansion_(Imp1)
- [W21] v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section XII A)
- [W22] https://imperialism.fandom.com/wiki/Prospector and https://imperialism.fandom.com/wiki/Miner
- [W23] https://imperialism.fandom.com/wiki/Army_(Imp1)
- [W24] https://imperialism.fandom.com/wiki/Ship_(Imp1)
