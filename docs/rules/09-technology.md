# 09 - Technology

> **Implementation notes**
> - 28 technologies, bought with cash from the Invest in Technology screen; a purchase is final at End Turn and usable the next turn. A tech is world-wide available ("cannot be kept secret") but each nation pays for it; available techs stay available.
> - Every nation starts with High Pressure Steam Engine and Seed Drill. Others appear in a year window (about 5 years of jitter per game), only if all prerequisites are owned do they show a price.
> - Effects: build permissions (rail terrain, units, ships, buildings), civilian level-ups (see 02), and military upgrades (see 08).
> - CODE MISMATCH: only `oilDrillingTechUnlocked` exists in code; `technologies` is an empty list.

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred.

## 1. Rules

| Rule | Value | Source |
|---|---|---|
| Start owned | High Pressure Steam Engine, Seed Drill | [M p93] |
| Appearance | newspaper story "New Invention" when first available; a technology button lights up | [M p92] [M p24] |
| Price | shown only when all prerequisites are owned, otherwise the missing prerequisites are listed | [W1] |
| Purchase | click to buy (cash deducted at once); click again to cancel; final when End Turn is pressed | [M p92] |
| Effect from | the next turn | [M p94] |
| Not secret | all nations may buy any available technology | [M p92] |
| Cannot afford yet | you may buy later; "technology, once available, does not vanish" | [M p92] |
| Timing windows | approximate; observed dates differ by several years per game and the later techs come later than the manual says | [M p93] [W1] [W2] |
| Recommended early buys | Iron Railroad Bridge (doubles timber) and Square-Set Timbering (doubles mineral output) | [M p116] |
| Scenarios | start with some techs already owned (for example Miner L2 "in scenarios even in 1815") | [W3] |

## 2. Technology table

Cost, observed year and effect from the wiki; manual window and prerequisites from the manual. `*` = prerequisite differs between sources, use the manual column. Costs are cash; observed years are what players saw in standard games.

| # | Technology | Manual window | Observed year | Cost $ | Prerequisites | Effect | Source |
|---|---|---|---|---|---|---|---|
| 1 | High Pressure Steam Engine | start (1814) | start | 0 | - | Engineers build rail through farms, plains, deserts, forests, tundra | [M p93] [W1] |
| 2 | Seed Drill | start (1814) | start | 0 | - | Farmers raise grain farms and orchards to L1 | [M p93] [W1] |
| 3 | Cotton Gin | 1816-20 | 1816-20 | 1,000 | - | Farmers raise cotton to L1 | [M p93] [W1] |
| 4 | Streamlined Hulls | 1821-25 | 1821-25 | 1,500 | - | Clipper ship | [M p93] [W1] |
| 5 | Square-Set Timbering | 1821-25 | 1821-25 | 1,500 | High Pressure Steam Engine * (wiki: none) | Miners raise coal, iron, gold, gems to L2 | [M p93] [W1] |
| 6 | Iron Railroad Bridge | 1821-25 | 1821-24 | 1,500 | High Pressure Steam Engine * | Rail through swamps; Forester unit; timber L1 | [M p93] [W1] |
| 7 | Feed Grasses | 1821-25 | 1821-24 | 1,500 | - | Rancher unit; wool and livestock L1 | [M p93] [W1] |
| 8 | Spinning Jenny | 1826-30 | 1826-29 | 3,000 | Feed Grasses, Cotton Gin | cotton L2 (Farmer), wool L2 (Rancher) | [M p93] [W1] |
| 9 | Paddlewheels | 1826-30 | 1826-30 | 3,000 | - | Raider (fast raiding/escort ship) and large merchant steamship | [M p93] [W1] |
| 10 | Steel and Iron Plows | 1831-35 | 1831-35 | 3,000 | Seed Drill | grain and orchard L2 | [M p93] [W1] |
| 11 | Bessemer Converter | 1836-40 | 1836-39 | 6,000 | - | Sharpshooters, Scouts, Engineers (era-2 Combat Engineers, upgrade of Sappers); fort level 2 | [M p93] [M p37] [W1] [W4] |
| 12 | Compound Steam Engine | 1836-40 | 1836-38 | 7,000 | Iron Railroad Bridge | rail through hills (depots allowed, ports not); timber L2 | [M p93] [W1] |
| 13 | Rifled Artillery | 1841-45 | 1841-44 | 10,000 | - | Field Artillery, Siege Artillery; upgrades older artillery | [M p93] [W1] |
| 14 | Breech-Loading Rifles | 1841-45 | 1841-45 | 12,000 | Bessemer Converter | Rifle Infantry, Guards, Carbine Cavalry; upgrades | [M p93] [W1] |
| 15 | Advanced Iron Working | 1846-50 | 1846-50 | 12,000 | - | Ironclad | [M p93] [W1] |
| 16 | Power Loom | 1846-50 | 1846-51 | 12,000 | Spinning Jenny | cotton L3, wool L3 | [M p93] [W1] |
| 17 | Mechanical Reaper | 1851-55 | 1851-55 | 12,000 | Steel and Iron Plows | grain L3 | [M p94] [W1] |
| 18 | Commercial Fertiliser | 1856-60 | 1856-60 | 12,000 | Steel and Iron Plows | orchard L3 | [M p94] [W1] |
| 19 | Oil Drilling | 1856-60 | 1856-58 | 25,000 | - | Driller unit; oil L1; prospect oil in swamp, desert, tundra; Oil Refinery and Power Plant | [M p94] [W1] |
| 20 | Barbed Wire | 1861-65 | about 1862 | 20,000 | Feed Grasses | livestock L2 | [M p94] [W1] |
| 21 | Steel Armour Plate | 1866-70 | 1866-68 | 40,000 | Advanced Iron Working | Advanced Ironclad (makes Ship-of-the-Line obsolete) | [M p94] [W1] |
| 22 | Large Artillery | 1871-75 | 1872-86 | 40,000 | Rifled Artillery | Railroad Gun, Mobile Artillery; fort level 3 | [M p94] [W1] [W4] |
| 23 | Dynamite | 1871-75 | 1874-87 | 40,000 | Compound Steam Engine, Square-Set Timbering | rail through mountains; timber L3; all mines L3; Saboteurs (era-3 Combat Engineers) | [M p94] [M p37] [W1] |
| 24 | Marine Engineering | 1871-75 | 1873-89 | 40,000 | Steel Armour Plate | Armoured Cruiser, Freighter (makes Frigate obsolete) | [M p94] [W1] |
| 25 | Machine Guns | 1876-80 | 1879-93 | 100,000 | Breech-Loading Rifles | Modern Infantry, Machine-gunners, Rangers; upgrades | [M p94] [W1] |
| 26 | Chemistry | 1876-80 | 1875-94 | 120,000 | Oil Drilling, Barbed Wire | oil L2; livestock L3 | [M p94] [W1] |
| 27 | Improved Range-Finding | 1881-85 | 1881-97 | 150,000 | Marine Engineering | Dreadnought, Battle Cruiser (makes Ironclad obsolete) | [M p94] [W1] |
| 28 | Internal Combustion | 1881-85 | 1884-98 | 150,000 | Chemistry | Armour and Mechanised regiments; oil L3 | [M p94] [W1] |

Notes
- Where the manual prerequisite column reads "Iron and Steel" (Mechanical Reaper, Commercial Fertiliser) it means Steel and Iron Plows; "Oil Wells and Barbed Wire" means Oil Drilling and Barbed Wire. [M p94]
- The wiki says Square-Set Timbering has no prerequisite; the manual lists High Pressure Steam Engine, which every player owns at start, so both agree in practice. [M p93] [W1]
- Breech-Loading Rifles was seen in Spring 1841. [W5]
- Scenario variants differ (for example Recovery of Spain 1820 starts unit upgrades around 1831). [W6]
- Newspaper hint text per technology exists but is flavour. [M p92]

## 3. Quick reference by function

| Need | Technology |
|---|---|
| Rail into swamp / hills / mountains | Iron Railroad Bridge / Compound Steam Engine / Dynamite |
| New civilian unit | Feed Grasses (Rancher), Iron Railroad Bridge (Forester), Oil Drilling (Driller) |
| Level 1 | Seed Drill (grain, orchard), Cotton Gin, Feed Grasses (wool, livestock), Iron Railroad Bridge (timber), Oil Drilling (oil) |
| Level 2 | Steel and Iron Plows, Spinning Jenny, Barbed Wire, Compound Steam Engine, Square-Set Timbering, Chemistry |
| Level 3 | Mechanical Reaper, Commercial Fertiliser, Power Loom, Chemistry (livestock), Dynamite (timber, mines), Internal Combustion (oil) |
| Ships | Streamlined Hulls (Clipper), Paddlewheels (Steamship, Raider), Advanced Iron Working (Ironclad), Steel Armour Plate (Advanced Ironclad), Marine Engineering (Armoured Cruiser, Freighter), Improved Range-Finding (Dreadnought, Battle Cruiser) |
| Regiments | Bessemer (era 2 light units, engineers), Breech-Loading Rifles, Rifled Artillery, Large Artillery, Machine Guns, Internal Combustion (era 3) |
| Buildings | Oil Drilling (Refinery, Power Plant) |
| Forts | level 2 Bessemer Converter, level 3 Large Artillery |

## CODE MISMATCH

- CODE MISMATCH: `types/Technology.ts` has the right shape (`approximateArrival`, `prerequisites`, `benefits`, `cost`) but `technologySlice.ts` ships `technologies: []` and one hard-coded flag `oilDrillingTechUnlocked`. No catalogue, no purchase order, no per-nation tech state (the state is global in `GameState.technologyState`, rules say per nation).
- Rail terrain limits, unit and level unlocks are not gated by technology anywhere in code (`startFarmerWork` etc. do not check levels against owned techs).

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- [W1] https://imperialism.fandom.com/wiki/Technology_(Imp1) (costs, observed years; the page notes that the last manual years are earlier than seen in play)
- [W2] https://lparchive.org/Imperialism/Update%2004/ ("roughly 5-year window")
- [W3] https://imperialism.fandom.com/wiki/Cheats_(Imp1)
- [W4] v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section XII B) and https://imperialism.fandom.com/wiki/Engineer_(Imp1)
- [W5] https://imperialism.fandom.com/wiki/Brete_(Imp1)
- [W6] https://imperialism.fandom.com/wiki/Army_(Imp1)
