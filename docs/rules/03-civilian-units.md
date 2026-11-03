# 03 - Civilian units (workers on the map)

> **Implementation notes**
> - Eight civilian types: Prospector, Engineer, Miner, Farmer, Rancher, Forester, Driller (built at the University) and Developer (a diplomatic reward, never built). Civilians have no combat value, no upkeep, no food need, and die if their province falls.
> - Every build costs one **expert worker** (4 labour) + cash + 2 paper; every job costs cash when ordered. No civilian build exists in code yet; job prices are charged when ordered (RESOLVED in M2, FR-029).
> - Job durations are known only partly: prospect 1 turn, rail 1 turn, depot/port/fort 3 turns, level-up probably 3 turns [?]. `workerDurations.ts` holds these numbers, 3 for every level-up (RESOLVED in M2, FR-028).
> - CODE MISMATCH list at the bottom. Costs and durations RESOLVED in M2 (FR-028, FR-029).

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` inferred.

## 1. The units

| Unit | Does | Works where | Available | Source |
|---|---|---|---|---|
| Prospector | searches one tile for coal, iron, gold, gems; oil after Oil Drilling | hills, mountains; swamp, desert, tundra (oil tech); own empire and Minor Nations with an Embassy | start | [M p30] [W1] |
| Engineer | builds rail (between adjacent tiles), depot, port, fort | own nation only (not colonies, not Minor Nations); depots and ports gather commodities | start | [M p30] [W2] |
| Miner | opens a mine (L1) and raises mines to L2, L3 | barren hills, mountains that a Prospector found minerals in | start | [M p31] |
| Farmer | raises grain farms, orchards, cotton plantations | farm, orchard, plantation (not dry plains) | start | [M p31] |
| Rancher | raises livestock (open range) and wool (fertile hills) | open range, fertile hills | Feed Grasses tech | [M p31] [M p59] |
| Forester | raises timber in hardwood forest | hardwood forest (not scrub) | Iron Railroad Bridge tech | [M p32] [M p59] |
| Driller | builds derricks and raises oil | swamp, desert, tundra with oil found | Oil Drilling tech | [M p32] [M p59] |
| Developer | buys land tiles in Minor Nations for development | Minor Nations only, Embassy needed; cannot work at home | reward, max 1 at a time | [M p32] [M p33] |

General rules
- Civilians may move any distance per turn within own land, colonies and conquered land. They cannot enter another Great Power's land and cannot enter a Minor Nation before an Embassy exists there. [M p28]
- Each unit works one tile per job; civilians cannot share a tile. [W3]
- Orders can be cancelled until End Turn; cancelling refunds the cash. [M p16] [W4]
- Disband returns the unit to industry as an expert worker (+4 labour per turn); the cash and paper spent are lost; cannot be undone. [M p28]
- A civilian that finishes a job returns to the unit cycle; units that are working are skipped. [M p25]
- An Engineer must rest the turn after moving (cannot work on the turn he deploys); other civilians can move and start work in the same turn. [W2] [M p100]
- Moving costs nothing. [W5]

## 2. Cost to build (University)

| Item | Value | Source |
|---|---|---|
| Inputs per civilian | 1 expert worker + cash + paper | [M p59] |
| Paper per civilian | 2 | [W1] [W6] |
| Cash fee | Prospector $500; Miner $1,500; others in range $500-$1,500+ (exact fee per type unknown) | [W1] [W7] [W5] |
| Appears | at the start of next turn, in the capital province | [M p27] [M p59] |
| Expert worker lost | permanently from industry (4 labour per turn) until disbanded | [M p28] [M p59] |
| Player estimate, all-in cost of an immigrant turned into a specialist | about $3,900 at game start, about $5,400 mid-game (includes migration goods, training, paper) | [W8] |

- Cost of reaching "expert": untrained -> trained $100 + 1 paper; trained -> expert $1,000 + 2 paper (details in 05). [W9]
- Build only what is needed; each civilian removes a worker that gives 4 labour. [M p59]

## 3. Job costs (paid when the job is ordered)

| Job | Cost | Source |
|---|---|---|
| Improve a tile to Level 1 (Farmer, Rancher, Forester, Miner; first mine) | $100 | [W10] [W1] |
| Improve to Level 2 | $1,000 | [W10] [W11] |
| Improve to Level 3 | $5,000 | [W10] |
| Driller derrick L1/L2/L3 | assumed same ladder $100 / $1,000 / $5,000 | [?] |
| Prospecting a tile | not documented | [?] |
| Rail section | $100 on farm, plain, desert; $150 on tundra and either forest; $200 on hills; $300 on swamp; mountain not documented | [W11] [W12] |
| Depot | $2,000 | [W2] [W13] |
| Port | $3,000 | [W2] |
| Fort level 1 / 2 / 3 | $5,000 / $7,500 / $10,000 | [W2] |
| Developer land purchase | 20 x the commodity's last market price (coal at $111 -> $2,220) | [W14] |

- Payment rule: costs are deducted from the treasury at order time and returned if the order is cancelled; an order that would push debt over the credit limit is refused with a minister message. [W4] [W15] (see 06 for credit)
- Trick (not intended): with two same-type civilians, level 2 and level 3 can be ordered in the same turn before the technology exists. [W10] Do not model.

## 4. Job durations

| Job | Turns | Source |
|---|---|---|
| Prospect one tile | 1 | [M p98] [W1] |
| Rail section | 1 ("laying track takes just one season") | [W2] [W16] |
| Depot | 3 | [W2] [W16] [W13] |
| Port | 3 | [W2] |
| Fort | 3 | [W2] |
| Level-up (Miner at an existing mine, Forester first improvement) | 3 (ordered turn 1, finished when turn 4 begins) | [M p99] [M p100] [?] |
| Farmer, Rancher, Driller level-ups | not documented, assume 3 like the Miner and Forester | [?] |
| Overseas profit appears | 1 turn after land purchase, at least 4 turns when a Miner is needed | [W14] |

## 5. Developer

| Rule | Value | Source |
|---|---|---|
| Unlock | relations with at least one Minor Nation improve enough: Embassy, then non-aggression pact, then trade for a few years; bribes speed it up | [M p33] |
| Seen in play | Summer 1821 (Brete game), Spring 1827 (Nepal game); relationship with the best Minor Nation had reached roughly "level 7 of 9" | [W17] [W18] [?] |
| Limit | one per Great Power at a time | [M p32] |
| Tiles it may buy | forests, fertile or barren hills, mountains, cotton plantations, deserts, tundra, swamps (gold, gems, coal, iron, cotton, wool, timber, oil); never food tiles | [M p34] |
| Ownership | a flag in your colour; no other Great Power can use the tile | [M p34] |
| Output after purchase | non-minerals produce at level 0 at once; minerals and oil need a Miner or Driller (level 0 = 0) | [M p35] |
| Profit | Minor Nation sells the output on the world market; you get a share (up to 100% as relations improve; colonies always 100%); shown as Overseas Profits in the Deal Book; gold and gems profits need no merchant ships | [M p33] [M p35] [W14] |
| If you buy your own output | you pay full price and receive the share back as profit | [M p34] |
| Buying one tile of a resource | the Minor Nation then offers its whole output of that resource each turn | [W14] [?] (one author) |
| Break-even | roughly 18-20 turns per tile in Imperialism 1 (one author) | [W14] [?] |
| Conquest | tiles developed by others remain, but the conqueror owns them; you then need rail, depots, ports | [M p35] |
| Colonisation | said to wipe other powers' land investments; a colony boycott of that power removes them | [W19] [W20] |

## 6. Forts and defence (Engineer)

- Fort levels 1-3 built by the Engineer throughout a province (not on one tile); level 1 right away, level 2 needs Bessemer Converter, level 3 needs Large Artillery. [M p30] [W21]
- Each level gives one free immobile defender (heavy artillery one grade above what you can build) and +10 percentage points damage reduction (see 08). [W22] [M p89]
- Forts cannot be built in colonies. [W2] [W23]

## CODE MISMATCH

- RESOLVED in M2 (FR-029), was: `definisions/workPrices.ts` `DEVELOPMENT_COST` = {1: 100, 2: 500, 3: 5000}; wiki says level 2 costs $1,000. [W10] [W11]
- RESOLVED in M2 (FR-029), was: `workPrices.ts` `CONSTRUCTION_COST` depot 500, port 1000, fort 1000 vs depot $2,000, port $3,000, fort $5,000 (L1), $7,500 (L2), $10,000 (L3). Rail $100 matches the cheapest terrain; real rail cost depends on terrain.
- `PROSPECT_COST = 100` is undocumented (gaps.md A4 default).
- RESOLVED in M2 (FR-028), was: `definisions/workerDurations.ts` (all marked TODO): Farmer/Rancher L1-3 = 2/3/4, Forester/Miner/Driller L1-3 = 3/4/5, depot 2, port 4, fort 4, rail 1. Sources: prospect 1, rail 1, depot/port/fort 3, level-up probably 3 for every level.
- RESOLVED in M2 (FR-028), was: `constants/gameConstants.ts` `CONSTRUCTION_CONFIG` depot 4, port 6, fort 5, rail 3 and `DEVELOPMENT_CONFIG.DEVELOP_TURNS_BASE = 3`, `PROSPECT_TURNS = 2` (a second, conflicting set of durations).
- CODE MISMATCH: `types/Workers.ts` `Worker.efficiency` (0-100) has no counterpart in the rules; remove or leave unused.
- No University build cost (expert worker + cash + 2 paper) exists in code. `industrySlice.ts` was deleted in M2; training is the `trainWorkers` order (FR-058).
- The Developer rules (embassy gate, 20x price, profit share) are not implemented.

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Prospector
- [W2] https://imperialism.fandom.com/wiki/Engineer_(Imp1)
- [W3] https://imperialism.fandom.com/wiki/Starting_a_game_of_Imperialism
- [W4] https://lparchive.org/Imperialism/Update%2002/ (cost of a consulate is deducted at once and rolled back if cancelled)
- [W5] https://imperialism.fandom.com/wiki/Civilian
- [W6] https://imperialism.fandom.com/wiki/Forester
- [W7] https://imperialism.fandom.com/wiki/Miner
- [W8] https://imperialism.fandom.com/wiki/Key_Scotland_(Imp1)_Blue (player estimate)
- [W9] https://imperialism.fandom.com/wiki/Trade_School and https://imperialism.fandom.com/wiki/Expert_worker
- [W10] https://imperialism.fandom.com/wiki/Cheats_(Imp1) (cost per level $100 / $1,000 / $5,000)
- [W11] https://imperialism.fandom.com/wiki/Technology_(Imp1)
- [W12] https://imperialism.fandom.com/wiki/Railroad_(Imp1)
- [W13] https://imperialism.fandom.com/wiki/Depot_(Imp1) and https://imperialism.fandom.com/wiki/Rail_Depot
- [W14] https://imperialism.fandom.com/wiki/Developer
- [W15] https://imperialism.fandom.com/wiki/Railroad_(Imp1) (minister message when credit limit would be exceeded)
- [W16] https://lparchive.org/Imperialism/Update%2003/
- [W17] https://imperialism.fandom.com/wiki/Brete_(Imp1)
- [W18] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple
- [W19] https://imperialism.fandom.com/wiki/Minor_nation_(Imp1)
- [W20] v1.1 readme https://imperialism.fandom.com/wiki/README11.TXT
- [W21] v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section XII B)
- [W22] https://imperialism.fandom.com/wiki/Army_(Imp1)
- [W23] https://lparchive.org/Imperialism/Update%2007/ and a GOG forum thread reported by a research agent (not re-opened)
