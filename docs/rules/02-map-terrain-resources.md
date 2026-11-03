# 02 - Map, terrain, resources, development levels

> **Implementation notes**
> - Map is a hex grid (6 neighbours). A province is a group of tiles (a dozen or more) with one town or the capital; military treats a province as one space, civilians work per tile. A tile holds one terrain and at most one resource.
> - Coal, iron, gold, gems and oil are hidden until a Prospector searches the tile. Everything else is visible from the terrain type. Yields per development level (section 3) are the same for every nation.
> - Gold = $200 per unit and gems = $500 per unit when transported (canonical, decision NR-005). Neither enters the warehouse nor the world market.
> - CODE MISMATCH: see the list at the bottom (start year, gold/gems prices, job costs and durations are placeholders in code).

Source tags: `[M pN]` manual PDF page marker N; `[W#]` web source listed under Sources; `[?]` unverified or inferred.

## 1. World layout

| Rule | Value | Source |
|---|---|---|
| Random world | 7 Great Powers + 16 Minor Nations, 120 provinces | [M p17] [M p18] |
| Provinces per country | Great Power 8, Minor Nation 4 (3 normal + 1 fortified capital); scenarios vary | [M p18] [W1] |
| Every province has | one town (hamlet, village, town) or, in one province per country, the capital | [M p18] [M p23] |
| Province border | fixed; a province has one owner at end of turn; military fights over whole provinces | [M p18] [W2] |
| Map wrap | random worlds wrap east-west and are blocked at the poles; scenarios are rectangles | [M p22] |
| Tiles per province | "a dozen or more"; exact count and total tile count are in no source | [W2] [?] |
| Map generation | seeded by a key word; same key gives the same world | [W3] |
| Capital site (Normal and harder) | player picks; must be flat terrain with water access (coast or river) | [M p22] |
| Capital site (Introductory, Easy) | chosen by the game | [M p9] |
| Capital food check | dialog shows how many workers the local food sustains; more is better | [M p22] |
| Ideal capital (player advice) | 3-4 grain, 2 fruit, 2 meat (cattle or fish); a river mouth adds fish from every river tile | [W4] |
| Capital collects | its own tile + 6 neighbours automatically, at the highest level the technology allows; only an Engineer may work a capital or town tile | [M p23] [M p24] [W4] |
| Capital is | always a connected port and a connected depot; starts with a level 1 fort | [M p49] [W5] [W6] |
| Farms and orchards next to the capital | start at Level 1 (before any Farmer exists) | [M p31] |

## 2. Terrain -> resource -> worker

| Terrain | Resource | Improved by | Improvable | Hidden until prospected | Source |
|---|---|---|---|---|---|
| Dry Plains | Grain | none | no | no | [M p23] |
| Farm | Grain | Farmer | yes | no | [M p23] |
| Orchard | Fruit | Farmer | yes | no | [M p23] |
| Plantation | Cotton | Farmer | yes | no | [M p23] |
| Open Range | Livestock | Rancher | yes | no | [M p23] |
| Fertile Hills | Wool | Rancher | yes | no | [M p23] |
| Horse Ranch | Horses | none | no (1 horse per turn observed) | no | [M p23] [W7] |
| Hardwood Forest | Timber | Forester | yes | no | [M p23] |
| Scrub Forest | Timber (1 unit, forever) | none | no | no; not offered to other nations | [M p23] [W8] [W9] |
| Barren Hills | Coal or Iron | Prospector, Miner | yes | **yes** | [M p23] |
| Mountains | Coal, Iron, Gold, Gems | Prospector, Miner | yes | **yes** | [M p23] |
| Swamp | Oil | Prospector, Driller | yes (needs Oil Drilling) | **yes** | [M p23] |
| Desert | Oil | Prospector, Driller | yes (needs Oil Drilling) | **yes** | [M p23] |
| Tundra | Oil | Prospector, Driller | yes (needs Oil Drilling) | **yes** | [M p23] |
| River (overlay on any tile) | + 1 Fish per turn for adjacent ports; river tiles can hold a port | - | no | no | [M p24] |
| Coast / sea next to a port | Fish, 1 per turn | none | no | no | [M p24] [M p29] |
| Town / Capital | industrial output (see 04) | Engineer only | - | - | [M p23] [M p24] |

- A tile that cannot be improved still produces its level 0 amount once connected. [M p23]
- A mineral tile can hold two minerals (for example coal and iron); a prospected empty tile is marked and never needs searching again. [W10]
- Gems: the terrain table lists them on mountains, but the transport chapter says gems exist only in Minor Nations, so a Great Power must conquer one to get gems. [M p23] vs [M p53]. The manual disagrees with itself; use "gems only in Minor Nations" [?].
- Prospecting can find nothing: hills and mountains "may yield nothing". [W9]
- Cotton, wool and hardwood tiles are visible on the map in Minor Nations; minerals outside your empire stay invisible until you prospect there (needs an Embassy), but built mines and wells are visible to everyone. [W9] [M p34]
- The AI knows the position of all minerals in its own country. [W11]

## 3. Production per tile by development level

Level 0 is the starting state. Units per turn once the tile is connected to the network.

| Resource | Improved by | L0 | L1 | L2 | L3 |
|---|---|---|---|---|---|
| Grain | Farmer | 1 | 2 | 3 | 4 |
| Fruit | Farmer | 1 | 2 | 3 | 4 |
| Cotton | Farmer | 1 | 2 | 3 | 4 |
| Livestock | Rancher | 1 | 2 | 3 | 4 |
| Wool | Rancher | 1 | 2 | 3 | 4 |
| Timber (hardwood) | Forester | 1 | 2 | 3 | 4 |
| Fish | none | 1 | - | - | - |
| Coal | Miner | 0 | 2 | 4 | 6 |
| Iron | Miner | 0 | 2 | 4 | 6 |
| Gold | Miner | 0 | 1 | 2 | 3 |
| Gems | Miner | 0 | 1 | 2 | 3 |
| Oil | Driller | 0 | 2 | 4 | 6 |

Source for the table: [M p29]; text rules [M p31] [M p32]. Horses 1 per turn [W7]; scrub forest 1 timber [M p23].

Which technology unlocks which level (full list with years in 09):

| Level | Grain, Orchard | Cotton | Wool | Livestock | Timber | Mines (coal, iron, gold, gems) | Oil |
|---|---|---|---|---|---|---|---|
| L1 | Seed Drill (known at start) | Cotton Gin | Feed Grasses | Feed Grasses | Iron Railroad Bridge | open a mine (no tech) | Oil Drilling |
| L2 | Steel and Iron Plows | Spinning Jenny | Spinning Jenny | Barbed Wire | Compound Steam Engine | Square-Set Timbering | Chemistry |
| L3 | Mechanical Reaper (grain), Commercial Fertiliser (orchard) | Power Loom | Power Loom | Chemistry | Dynamite | Dynamite | Internal Combustion |

Source: [M p93] [M p94]. Feed Grasses is also what makes the Rancher unit buildable; Iron Railroad Bridge makes the Forester buildable; Oil Drilling makes the Driller buildable. [M p31] [M p32] [M p59]

## 4. Prospecting and extraction rules

- Prospecting takes one turn; the result is a mineral icon (visible only to you) or an empty mark. [W10] [M p30] [M p100]
- Oil prospecting in swamp, desert and tundra is possible only after the Oil Drilling technology. [M p30] [M p32]
- A Miner or Driller can only work a tile already found to hold the mineral; until a mine or derrick is built the tile produces nothing. A new mine or derrick starts at Level 1. [M p31] [M p32]
- A mined or farmed tile only counts if it is on, or within one tile of, a connected port or rail depot (or next to the capital). [M p31]
- A tile can be worked by one civilian at a time (civilians cannot share a tile). [W4]
- Minor Nations produce 1 coal and 1 iron per tile at level 0 by primitive mining, no mine needed; buying the tile with a Developer drops that to 0 until you open a mine. [M p34]

## 5. Hex adjacency used by the rules

- Depots and ports gather from their own tile and the six adjoining tiles, water excluded. [M p49] [M p99] [W12]
- Forts are built "throughout the province", not on one tile. [M p30]

## CODE MISMATCH

- CODE MISMATCH: `src/app/constants/gameConstants.ts` `TIME_CONFIG.STARTING_YEAR = 1900`; a random world starts in spring 1815 and each turn is one quarter. [M p15] [M p60] [W13]
- CODE MISMATCH: `gameConstants.ts` `RESOURCE_VALUES` gives gold 100 and gems 1000, and `systems/logisticsSystem.ts` pays gold $100 and gems $1000 per unit. Canonical: gold $200, gems $500. `definisions/ResourceConversions.ts` `CashPerTransport` already says 200/500.
- CODE MISMATCH: `RESOURCE_VALUES` (grain 10 ... oil 75) are far below observed world prices (raw resources about $60-$180, see 06).
- CODE MISMATCH: `DEVELOPMENT_CONFIG.PROSPECT_TURNS = 2` in `gameConstants.ts` vs `definisions/workerDurations.ts` 1; sources say 1 turn. [W10]
- `definisions/ResourceDevelopment.ts` matches the manual table (Fish L0 only, Horses 1). No mismatch.
- `types/Tile.ts` has `Water`, `River`, `Coast`, `Town`, `Capital` as terrain types; in the rules a river is an overlay on a normal tile (`hasRiver` exists) and the sea is not a land tile. Fish and river-port rules need the overlay.

## Sources

- [M] Imperialism manual (SSI / Frog City, 1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Minor_nation_(Imp1)
- [W2] https://imperialism.fandom.com/wiki/Province_(Imp1)
- [W3] https://imperialism.fandom.com/wiki/Map_key_(Imp1) and v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section IV)
- [W4] https://imperialism.fandom.com/wiki/Starting_a_game_of_Imperialism
- [W5] https://imperialism.fandom.com/wiki/Capital
- [W6] v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section XII B)
- [W7] https://imperialism.fandom.com/wiki/Brete_(Imp1) (horse production 1 per turn, price about 300)
- [W8] https://imperialism.fandom.com/wiki/Terrain
- [W9] https://imperialism.fandom.com/wiki/Terrain_(Imp1)
- [W10] https://imperialism.fandom.com/wiki/Prospector
- [W11] https://imperialism.fandom.com/wiki/Town_development_(Imp1)
- [W12] https://imperialism.fandom.com/wiki/Depot_(Imp1)
- [W13] https://imperialism.fandom.com/wiki/Gameplay_(Imp1)
