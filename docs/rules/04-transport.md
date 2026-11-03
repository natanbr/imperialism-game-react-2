# 04 - Transport network (rail, depots, ports, capacity, town growth)

> **Implementation notes**
> - Commodities reach the industry warehouse only through the network: each connected depot or port gathers its own tile + the 6 neighbours; the capital counts as a connected depot and port. Total units moved per turn are capped by transport capacity (freight cars, 1 unit per car); the player chooses what share each commodity gets.
> - Capacity is bought in the Railyard: 1 lumber + 1 steel + 2 labour per car, no maintenance, available next turn. Standard game starts with about 15 cars [W1].
> - Connected towns grow by themselves and ship free materials and goods (section 6). This is a large free income and is easy to forget.
> - CODE MISMATCH: river ports, depot-on-port rule, gold/gems values, start capacity (list at the bottom).

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Pieces of the network

| Piece | Rule | Cost / time | Source |
|---|---|---|---|
| Capital | always a connected port **and** depot; gathers its tile + 6 neighbours | - | [M p24] [M p49] |
| Rail section | joins two adjacent tiles; built by an Engineer standing in one of them; what terrain it may enter depends on technology (section 2) | $100 up (terrain), 1 turn | [M p30] [W2] [W3] |
| Depot | gathers commodities from its own tile and the 6 adjoining tiles (water excluded) when connected | $2,000, 3 turns | [M p49] [W4] |
| Port | on a coast tile or a river tile; gathers like a depot; also collects fish from adjacent sea or river tiles | $3,000, 3 turns | [M p24] [M p49] [W2] |
| Connected depot | has a rail line to the capital, or to a tile that holds both a port and a depot | - | [M p49] |
| Connected port | normally always connected (no rail needed) | - | [M p49] |
| Unconnected depot or port | gathers nothing | - | [M p49] |

- Depot lights show red (unconnected) or green (connected). [M p49]
- Build a depot in the same tile as a distant port, otherwise depots further inland cannot reach the port. [M p49]
- Spacing: the manual advises two tiles between depots/ports so no tile is collected twice; the wiki says a depot cannot be built on a tile that adjoins another depot or port. Treat "not adjacent" as the rule [W4] [M p49] [?].
- Ports cannot be built on hills or mountains by a human (AI nations can). Depots on hills need Compound Steam Engine. [W5] [W2]
- Civilians cannot share a tile, so a depot tile blocks other workers there. [W6]
- A resource in a tile is lost to the network if it is not on or within one tile of a connected depot/port (exception: tiles next to the capital). [M p31]

## 2. Rail by terrain (technology gates)

| Terrain | First possible with | Approx. year | Cost per section | Source |
|---|---|---|---|---|
| Farm, plains, desert, hardwood/scrub forest, tundra | High Pressure Steam Engine (known at start) | 1814 | $100 (tundra and forests $150) | [M p93] [W3] |
| Swamp | Iron Railroad Bridge | 1821-24 | $300 | [M p93] [W3] |
| Hills | Compound Steam Engine | 1836-39 | $200 | [M p93] [W3] |
| Mountains | Dynamite | 1871-87 | not documented | [M p94] [W3] |

## 3. How connections are lost

- A province on the line to the capital is conquered: the line is cut. [M p49]
- A river port loses access if a province downstream is lost. [M p49]
- A sea port is cut only by blockade: an enemy fleet in **undisputed** command of the adjacent sea zone (you have no warship there). Any of your warships present keeps all ports on that zone connected. [M p49]
- Conquered Minor Nation: depots must link to the former capital; a conquered ex-Great-Power province links to any port. [W7]
- Colony or Minor Nation land does not use the network; its resources are sold on the world market. [M p18] [M p34]

## 4. Transport capacity and freight cars

| Rule | Value | Source |
|---|---|---|
| Capacity = total commodity units the network can move per turn | 1 freight car = 1 unit per turn | [M p48] [W1] |
| Build in Railyard | 1 lumber + 1 steel + 2 labour per car (manual names lumber, steel, labour; the quantities come from the wiki) | [M p64] [W1] [W8] |
| Capacity limit of the railyard | none; limited only by materials and labour; orders are not saved from turn to turn | [M p64] |
| Maintenance | none; cars last forever | [W8] |
| New cars usable | next turn (anything built is available the following turn) | [M p16] |
| Starting capacity | about 15 cars in a standard game; the tutorial scenario shows 24 | [W1] [M p105] |
| Capacity also limits | rail moves of regiments (see 08) | [M p39] [M p48] |
| Allocation | slider per commodity; the bar shows used / total | [M p50] |
| Wool and cotton | share one slider (interchangeable in the textile mill) | [M p51] |
| Coal and iron | needed in equal amounts by the steel mill | [M p51] |
| Unspent resources | not stored; a tile's output above what you allocate is wasted | [W9] |
| Food shipped beyond need | goes to the warehouse | [M p52] |
| Gold and gems | count against capacity but never reach the warehouse; each unit becomes cash at once ($200 gold, $500 gems); that they use capacity is implied by "transported" | [M p52] [M p53] [?] |

Demand lines on the transport screen (UI hint that shows what a rule model needs):
- Green: current transport of that commodity covers current demand, warehouse stock included. Red: industry or workers want more. Trade deliveries are not counted. [M p51]
- Industrial demand shown is "relative to maximum capacity", not to what labour can actually run. [W10]

Food split shipped to the capital (workers, groups of four): 2 grain, 1 fruit, 1 livestock-or-fish. [M p52] [M p58] (details in 05)

## 5. What can be shipped

| Class | Items | Notes | Source |
|---|---|---|---|
| Resources | grain, fruit, livestock, fish, cotton, wool, timber, coal, iron ore, oil (after tech), horses, gold, gems | the only class at game start | [M p48] [M p51] |
| Materials | steel, lumber, fabric | produced free by connected towns (section 6) | [M p53] [M p54] |
| Goods | clothing, furniture, hardware | free from towns, at most half the materials; **never armaments** | [M p53] |
| Not shippable | paper, canned food, fuel, armaments (made only in the capital or bought) | | [M p53] |

- Horses are only needed for cavalry and artillery; stockpile a few. [M p53]
- Random event "transport accident": 1 less of each resource received that turn. [W11]

## 6. Town development (free materials and goods)

Rule from the manual: a province's town stays idle until a connected depot (or port) is on or next to it; then it produces materials from the resources of its province, and later goods equal to at most half the materials. [M p53] [M p54]

Detailed behaviour (wiki, derived by players): [W12]

| Province resources (count the whole province, connected or not) | Needs factory capacity in the capital | Free output per turn |
|---|---|---|
| 2 cotton and/or wool | 4 (textile mill) | 1 fabric |
| 4 cotton/wool | 8 | 2 fabric + 1 clothing |
| 6 cotton/wool | 12 | 3 fabric + 1 clothing |
| 8 cotton/wool | 16 | 4 fabric + 2 clothing |
| 2 timber | 4 (lumber mill) | 1 lumber |
| 4 timber | 8 | 2 lumber + 1 furniture |
| 6 timber | 12 | 3 lumber + 1 furniture |
| 8 timber | 16 | 4 lumber + 2 furniture |
| 2 coal + 2 iron | 4 (steel mill) | 1 steel |
| 4 coal + 4 iron | 8 | 2 steel + 1 hardware |
| 6 + 6 | 12 | 3 steel + 1 hardware |
| 8 + 8 | 16 | 4 steel + 2 hardware |

Notes
- Factory capacity in the table is the expanded size of the matching mill or factory in the capital (the wiki lists the factory that makes the final product; the wiki text states "factory size four" for the first step). Pattern continues for larger sizes. [W12] [?]
- First material appears 6 turns after the town is connected; later steps appear about 2 turns after the capital building is enlarged. [W12]
- Output needs no labour and no input, only transport capacity to bring it in. It is added to, not taken from, the province's own resource output. [M p54] [W12]
- Towns make only steel, lumber, fabric (never paper) and consumer goods, no armaments. [M p53] The wiki and one player report that villages also make **fuel** from oil once the refinery is big enough (first fuel seen when the refinery was expanded to 4); the manual does not list fuel. [W14] [W15] [?]
- Your own capital never industrialises. Captured Great Power capitals industrialise at once; captured Minor Nation capitals never; other captured Minor Nation provinces industrialise like home provinces. [W12]
- The AI does not use industrialisation. [W12]
- Reward "Improved Railyard": a connected depot in or next to a village plus a factory (not a mill) of capacity 4. [W13]
- Manual example: a forest province with 8 forest tiles and a depot; when the furniture factory reaches capacity four the town makes 1 lumber per turn, climbing to 4 lumber, then furniture up to 2. [M p54]

## CODE MISMATCH

- CODE MISMATCH: `systems/logisticsSystem.ts` pays gold $100 and gems $1000 per transported unit; canonical $200 and $500. [M p53]
- CODE MISMATCH: `systems/transportConnectivitySystem.ts` treats every ocean-adjacent port as a BFS start and uses `isAdjacentToOcean`, so a **river port** can never be active; the manual allows river ports, connected as long as the downstream provinces are owned. [M p49]
- CODE MISMATCH: the same system activates any depot reachable by rail from any port tile; the manual requires the port tile to hold a depot as well. [M p49]
- CODE MISMATCH: no blockade logic (sea port cut by undisputed enemy fleet), no province-loss logic, no Railyard build costs (1 lumber + 1 steel + 2 labour per car), no town development. Nation `transportCapacity` starts at 8-10 in mocks/`worldInit.ts`; a standard game starts near 15.
- `logisticsSystem.ts` collects from hub tile + 6 neighbours with odd-row offset hex adjacency: matches the manual. Capital is a hub: matches. Fish from sea/river tiles is not modelled.
- CODE MISMATCH: `store/nationSlice.ts` `purchaseTransportCapacityIncrease` charges 1 coal + 1 iron per capacity point; the rule is 1 lumber + 1 steel + 2 labour per car. [W1] [W8]
- Rail cost by terrain and technology gating (`High Pressure` etc.) are not in `workPrices.ts` (flat 100).

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Freight_car
- [W2] https://imperialism.fandom.com/wiki/Engineer_(Imp1)
- [W3] https://imperialism.fandom.com/wiki/Technology_(Imp1)
- [W4] https://imperialism.fandom.com/wiki/Depot_(Imp1) and https://imperialism.fandom.com/wiki/Rail_Depot
- [W5] https://imperialism.fandom.com/wiki/Port and https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple (AI can build ports on mountains)
- [W6] https://imperialism.fandom.com/wiki/Starting_a_game_of_Imperialism
- [W7] https://imperialism.fandom.com/wiki/Railroad_(Imp1)
- [W8] https://imperialism.fandom.com/wiki/Transport_(Imp1)
- [W9] https://imperialism.fandom.com/wiki/Key_1815_purple (a player wasting grain and fish above capacity)
- [W10] https://lparchive.org/Imperialism/Update%2002/
- [W11] https://imperialism.fandom.com/wiki/Random_event
- [W12] https://imperialism.fandom.com/wiki/Town_development_(Imp1)
- [W13] https://imperialism.fandom.com/wiki/Reward
- [W14] https://imperialism.fandom.com/wiki/Village
- [W15] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple (Winter 1858 entry)
