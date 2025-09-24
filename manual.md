# Imperialism: Game Definitions & Mechanics

This document outlines the core definitions and mechanics of the game *Imperialism*, extracted from the user manual for re-implementation purposes.

---
## General Game Concepts

### **Definitions**
* **Game Type**: A turn-based strategy game set in a 19th-century world. [cite_start]Each turn represents three months. [cite: 271, 277]
* [cite_start]**Countries**: The world contains two types of countries: **Great Powers** (played by humans or AI) and **Minor Nations** (regions for exploitation and conflict). [cite: 329, 330]
* [cite_start]**Province**: A political division of a country. [cite: 342] [cite_start]All military conflict happens at the province level, and each province counts as one space for military units. [cite: 346, 347]

### **Mechanics**
* [cite_start]**Turn Structure**: All Great Powers enter their orders for a turn simultaneously. [cite: 275] [cite_start]When all players end their turn, the actions are carried out in a specific sequence: [cite: 276, 314]
    1.  [cite_start]**Diplomatic offers** are exchanged. [cite: 315]
    2.  [cite_start]**Trade deals** are offered and resolved. [cite: 316]
    3.  [cite_start]**Industrial production** takes place. [cite: 317]
    4.  [cite_start]**Military conflicts** are resolved. [cite: 318]
    5.  [cite_start]**Commodities** from transport and successful trades are placed in the warehouse for the next turn. [cite: 320]
* [cite_start]**Winning the Game**: A player wins by gaining the support of more than two-thirds of the world's provincial governors in a vote held by the **Council of Governors**. [cite: 369, 372] [cite_start]The council meets approximately every ten years. [cite: 371] [cite_start]Nominations for the top two powers are based on a combination of diplomatic, industrial, and military strength. [cite: 374]

***

## Economy & Commodities

### **Definitions**
* [cite_start]**Money Supply**: The cash available in your treasury. [cite: 387] [cite_start]There is no income from taxation; cash is generated through commerce. [cite: 395, 396]
* [cite_start]**Commodities**: All products in the game, classified into three categories: resources, materials, and goods. [cite: 398]
    * [cite_start]**Resources**: Grown or mined commodities, such as grain, livestock, cotton, wool, timber, coal, and iron ore. [cite: 400, 402]
    * [cite_start]**Materials**: Produced from resources, they are the building blocks for most units and further production. [cite: 404, 405] [cite_start]Includes fabric, paper, lumber, and steel. [cite: 406]
    * [cite_start]**Goods**: The most expensive commodities, produced from materials. [cite: 408] [cite_start]Includes consumer goods (clothing, furniture, hardware) and armaments. [cite: 409, 413]

### **Mechanics**
* **Ways to Get Cash**:
    1.  [cite_start]Selling commodities to other countries through **trade**. [cite: 389, 390]
    2.  Transporting **gold and gems** to your industrial center. [cite_start]They are converted directly to cash and cannot be traded. [cite: 391, 1269]
        * [cite_start]**Gold**: Adds **$200** cash per unit transported. [cite: 1279]
        * [cite_start]**Gems**: Adds **$500** cash per unit transported. [cite: 1282]
    3.  [cite_start]Receiving **overseas profits** from the sale of resources your civilian units developed in Minor Nations. [cite: 394]
* [cite_start]**Production Economies**: Most production follows a two-for-one conversion rate. [cite: 1372] [cite_start]For example, it takes two units of a resource (like cotton) to produce one unit of a material (fabric), and two units of a material (fabric) to produce one unit of a good (clothing). [cite: 1373, 1374]

***

## Transport Network

### **Definitions**
* [cite_start]**Transport Network**: The system of railroads, depots, and ports used to move commodities from rural collection points to your central industrial warehouse. [cite: 1143, 1153]
* [cite_start]**Transport Capacity**: The total number of commodity units your network can move each turn. [cite: 1158] [cite_start]This also limits how many military units can be moved by rail. [cite: 925]
* [cite_start]**Rail Depots and Ports**: Structures built by the Engineer that gather commodities from their own tile and all adjacent tiles. [cite: 682, 1167, 1168]

### **Mechanics**
* [cite_start]**Increasing Transport Capacity**: Built in the **Railyard** on the Industry screen. [cite: 1159, 1569] [cite_start]Construction requires lumber, steel, and available labor. [cite: 1565, 1570]
* [cite_start]**Network Connection**: For a depot or port to function, it must have a valid connection to the capital city. [cite: 1170, 1176]
    * [cite_start]**Depots** must be connected by a continuous railroad line to the capital, or to a port that has sea access to the capital. [cite: 1175, 1177, 1178]
    * [cite_start]**Ports** are almost always connected, unless a downstream province on a river is lost or a sea zone is blockaded by a hostile fleet. [cite: 1183, 1189]
* [cite_start]**Military Transport**: Moving a regiment by train requires five points of transport capacity for each armaments point the unit possesses. [cite: 928, 1162]

***

## Industry & Labor

### **Definitions**
* [cite_start]**Labor**: The workforce that powers industrial production, measured in labor points. [cite: 1378, 1380]
* [cite_start]**Worker Types**: Workers have three training levels, each providing a different amount of labor: **Untrained** (1 point), **Trained** (2 points), and **Expert** (4 points). [cite: 1349, 1350]
* [cite_start]**Industrial Capacity**: The maximum number of output units a factory or mill can produce in a single turn. [cite: 1548]
* [cite_start]**Power**: An addition to your total available labor generated by the Power Plant using fuel. [cite: 1436, 1437] [cite_start]Power is used before human labor is allocated. [cite: 1445]

### **Mechanics**
* [cite_start]**Worker Recruitment**: New untrained workers are recruited via the **Capitol Building** by expending canned food, clothing, and furniture. [cite: 1401] [cite_start]The number of migrants per turn is limited by the size of your empire. [cite: 1403]
* [cite_start]**Worker Training**: Workers are upgraded at the **Trade School**, which costs paper and cash. [cite: 1391] [cite_start]A worker being trained cannot contribute labor during that turn. [cite: 1393]
* [cite_start]**Food Consumption**: Every worker must eat one unit of food per turn to provide labor. [cite: 1409]
    * [cite_start]Workers have preferred food types (in a group of four: one eats grain, the second eats fruit, the third eats grain, the fourth eats livestock/fish). [cite: 1415]
    * [cite_start]Eating a non-preferred food makes the worker sick, and they provide no labor for that turn. [cite: 1411, 1352]
    * [cite_start]Workers will eat available **canned food** before eating a non-preferred food, which prevents sickness. [cite: 1354, 1420]
    * [cite_start]If no food is available, the worker starves and is permanently removed. [cite: 1412, 1422]
* [cite_start]**Building & Expanding Industry**: New factories and mills are constructed on their designated sites on the Industry screen. [cite: 1522] [cite_start]Expansion and initial construction costs one lumber and one steel per point of capacity. [cite: 1534]

***

## Civilian Units & Development

### **Definitions**
* [cite_start]**Civilian Units**: Non-combat units like the Prospector, Engineer, Farmer, Miner, etc., that are used to develop and improve terrain tiles. [cite: 615, 655]
* [cite_start]**Developer**: A special civilian unit, received as a diplomatic reward, that can purchase terrain tiles in Minor Nations for development. [cite: 744, 748] [cite_start]A Great Power can only have one Developer at a time. [cite: 746]

### **Mechanics**
* [cite_start]**Building Civilians**: Constructed at the **University** on the Industry screen. [cite: 618] [cite_start]Each civilian costs one expert worker (who is permanently removed from the labor pool), cash, and paper. [cite: 618, 1463, 1465]
* **Resource Development**:
    * [cite_start]The **Prospector** must first search for and find mineral resources (coal, iron, gold, gems) and oil before other units can extract them. [cite: 666]
    * [cite_start]Other civilians (Farmer, Miner, Rancher, etc.) improve the output of a specific resource on a tile. [cite: 655] [cite_start]Output is measured in levels from 0 to 3, with higher levels unlocked by purchasing new technologies. [cite: 656, 706]
* **Working in Minor Nations**:
    1.  [cite_start]An **Embassy** must first be established in the Minor Nation. [cite: 790]
    2.  [cite_start]The **Developer** is used to purchase individual terrain tiles, which are then marked with your flag. [cite: 797, 803]
    3.  [cite_start]Other civilians (Miners, Farmers, etc.) can then be sent to improve the output of these purchased tiles. [cite: 811]
    4.  [cite_start]The developed resources are sold by the Minor Nation on the world market. [cite: 759] [cite_start]Your Great Power receives a percentage of the cash from the sale as **Overseas Profits**. [cite: 763]

***

## Military & Combat

### **Definitions**
* [cite_start]**Regiments**: Your land forces, which are organized into nine categories (e.g., Light Infantry, Heavy Cavalry, Artillery). [cite: 834, 852]
* [cite_start]**Warships**: Your naval forces, organized into fleets. [cite: 998] [cite_start]Ships are broadly classed as **fast ships** (for raiding/escorting) and **battle ships** (for fleet combat). [cite: 1093, 1094, 1095]
* [cite_start]**Experience**: Units gain experience from participating in combat, which is represented by medals. [cite: 979, 980] [cite_start]Each medal improves a unit's firepower and initiative. [cite: 981]
* [cite_start]**Combat Resolution**: Land battles can be resolved in two ways, set in Preferences: **Strategic** (an automatic calculation of the outcome) or **Tactical** (a turn-based battle fought on a detailed map). [cite: 987] [cite_start]All naval battles are resolved strategically. [cite: 1122]

### **Mechanics**
* **Building Military Units**:
    * [cite_start]**Regiments** are built at the **Armoury**. [cite: 1477] [cite_start]They cost cash, armaments, and workers (who are permanently removed from the labor pool). [cite: 1478, 1481]
    * [cite_start]**Warships** are built at the **Shipyard**. [cite: 1495] [cite_start]They cost materials like lumber, steel, and armaments but do not require workers. [cite: 1496, 1498]
* [cite_start]**Technological Upgrades**: As you invest in new military technologies, superior unit types become available within each category. [cite: 836] [cite_start]The older unit type in that category can no longer be built, but existing veteran units can be upgraded. [cite: 837, 838]
* **Defensive Bonuses**:
    * [cite_start]**Entrenchments** are created automatically by garrisons and provide a 20% reduction in damage taken. [cite: 2176, 2177]
    * [cite_start]**Forts**, built by Engineers, provide an additional 10% damage reduction for each level (up to a 50% total reduction). [cite: 2179, 2180, 2181] [cite_start]Forts must be destroyed by artillery or **Combat Engineers**. [cite: 2188]
* [cite_start]**Naval Missions**: Fleets can be ordered to **Patrol** a sea zone (intercepting any hostile ships), **Blockade** a specific enemy port, or **Establish a Landing Site** to allow for an amphibious invasion. [cite: 1023, 1024, 1032]

***

## Trade & Diplomacy

### **Definitions**
* [cite_start]**Merchant Marine**: Represents the total cargo holds available in your merchant fleet. [cite: 1694] [cite_start]Each hold carries one unit of a commodity. [cite: 1695]
* [cite_start]**Favored Trading Partner**: The country that gets the first opportunity to buy from or sell to another nation. [cite: 1853, 1855] [cite_start]This status is determined by a combination of diplomatic relations and trade subsidies. [cite: 1637]
* [cite_start]**Colony**: A Minor Nation that has become part of your empire, either by voluntarily joining due to excellent relations or by you successfully defending it from another Great Power's attack. [cite: 820, 821, 823, 1952]

### **Mechanics**
* **Trade Process**:
    1.  [cite_start]Players set their buy (**Bids**) and sell (**Offers**) on the Bid and Offers screen. [cite: 1587]
    2.  [cite_start]After all turns are ended, trade deals are offered sequentially. [cite: 1605, 1742] [cite_start]The selling country offers its goods first to its most favored trading partner that has placed a bid for that item. [cite: 1609]
    3.  [cite_start]If the first bidder rejects the offer or only buys a portion, the remainder is offered to the next country on the list, and so on. [cite: 1610]
* **Merchant Marine Limits**: Your total cargo holds are a crucial constraint.
    * [cite_start]The number of holds limits how many units of a single commodity you can *offer for sale*. [cite: 1689]
    * [cite_start]Each cargo hold can only be used *once per turn* for a transaction with a Minor Nation (either buying or selling). [cite: 1697, 1707]
    * [cite_start]When trading between two Great Powers, the **buyer's** merchant marine is used to transport the goods. [cite: 1709]
* **Improving Diplomatic Relations**: Achieved through three main actions:
    1.  [cite_start]**Conducting Trade**: Each completed deal with a country where you have a consulate or an Embassy slightly improves relations. [cite: 1641]
    2.  [cite_start]**Granting Foreign Aid**: Giving cash gifts via the Diplomacy screen directly improves relations. [cite: 1983]
    3.  [cite_start]**Signing Pacts**: Offering a non-aggression pact to a Minor Nation significantly improves relations. [cite: 1943]
* [cite_start]**Trade Subsidies**: Set on the Diplomacy screen, a subsidy makes you pay more for a country's exports and charge less for your exports to them. [cite: 1629, 2025] [cite_start]This is a powerful tool for becoming a favored trading partner, giving you priority access to their goods. [cite: 1633]