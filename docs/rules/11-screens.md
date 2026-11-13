# 11 - Screens: what each screen shows, layout, controls, screenshots

> **Implementation notes**
> - A UI reference, not a rule file. It says which information and controls each original screen has and which numbers are printed on it. The remake does not have to copy the layouts; it must show the same information and allow the same orders.
> - Every screen below is from the **Imp1** retail game (1997, 640x480), seen in a Let's Play [W1]. Imperialism II screens differ and were not used.
> - Numbers printed on screens are the strongest evidence in the knowledge base: 06, 07, 08 and 01 quote them (sections 7 and 4a).
> - Not covered (no screenshot found): peace and pact offer screens, the Interior/Military/Merchant strength charts in detail, the Help and Information dialog, hot-key help.

Source tags: `[W#]` web source (see Sources); `[?]` unverified or inferred. Screenshot links read "Update NN/m" = `https://lparchive.org/Imperialism/Update%20NN/m-<id>.png` (the full URL is in the link).

## 1. Trade: Board of Trade ("Bid and Offers")

- **Shows:** the world price of every tradable commodity (last turn's price), your sellable stock and your standing orders. You place up to 4 bids and any number of offers for the coming trade round. The Foreign Minister is not on this screen. [W1] [W2]
- **Layout:** a wooden frame around a green blackboard titled "Board of Trade". Top strip: season and year at the left, cash next to it, four small toolbar icons, and at the top right the hover name of the commodity under the mouse. Left strip "Commodity": 15 icon rows (17 from the fuel and oil era), then "Orders" with brass-loop buttons, then blackboard columns "Price", "Available", "Quantity to Offer". Right edge: a ship icon with the merchant marine hold count. Small commodity icons on the left and right borders seem to mark shortages (cotton, wool, timber in 1816; hammer and steel in 1853) [?]. Back arrow top left, "?" top right.
- **Controls:** a loop left of the icon opens the Bid bar, a loop right of it the Offer bar (manual); one Bid button per row, at most 4 lit; Offer rows get a slider with arrow ends and a number; Price and Available are read-only; a row with a bid cannot also carry an offer. Rows are in a fixed order, clothing first (06 section 7.1). [W2]
- **Screenshots:** [Spring 1815 first board](https://lparchive.org/Imperialism/Update%2001/8-TE5s18z.png), [Spring 1816](https://lparchive.org/Imperialism/Update%2002/16-uvNfbaz.png), [Update 12/14, persistent offers](https://lparchive.org/Imperialism/Update%2012/14-ZZCVV7f.png), [horses at $30](https://lparchive.org/Imperialism/Update%2013/3-7XNkDVK.png), [Update 18/4, 17 rows, about Fall 1875](https://lparchive.org/Imperialism/Update%2018/4-K6D2FwQ.png)

### 1.1 Offer Sheet with the Foreign Minister book

- **Shows:** one purchase proposal from a seller (Minor Nation or Great Power): commodity, units, price per unit; the minister's advice or statistics on the opposite page. [W1]
- **Layout:** a desk. Left: a parchment "OFFER SHEET" with the commodity crest, the line "X offers N units of Y @ $P / unit", a "Purchase [n] units" box, a checkbox "No more offers of Y", a red REJECT seal and a blue ACCEPT seal. Right: a leather book under the minister's portrait, showing either "Purchase Recommended" / "Purchase Not Recommended" text or the statistics page (Industrial Need, Warehouse, Transport, Already Purchased, "X is a Minor Nation. Their favorite trade partner is Y", "We have a Consulate with X"). A ship icon with your remaining holds under the book, a tab strip of commodity icons down the right spine, cash at the top.
- **Controls:** edit the quantity, tick "No more offers", REJECT, ACCEPT; a spine tab jumps to that commodity's Trade Book. Accepting charges cash and holds at once.
- **Screenshots:** [Niridna wool offer](https://lparchive.org/Imperialism/Update%2002/2-clspY6F.png), [after accept](https://lparchive.org/Imperialism/Update%2002/3-CvEDztG.png), [Update 02/6](https://lparchive.org/Imperialism/Update%2002/6-xhqZKt2.png), [Great Power steel offer, 1843](https://lparchive.org/Imperialism/Update%2009/14-izYmx6Q.png)

### 1.2 Trade Book (Offering Nations / Bidding Nations)

- **Shows:** for one commodity, each seller with its unit count and a row of flags in the order it prefers bidders, and the list of bidding Great Powers. You can view only the market of a commodity you bid on. [W2]
- **Layout:** an open book. Left page: commodity title, "Offering Nations", one block per seller ("Name: N units") with 5-6 flags. Right page: season and year, "Bidding Nations", one line per bidder with its flag, and on the first sheet "Remaining Merchant Marine" with each bidder's holds. Commodity tabs on the right spine (an oil tab from Fall 1860).
- **Controls:** spine tabs and page turn only; no editing.
- **Screenshots:** [Spring 1815 wool](https://lparchive.org/Imperialism/Update%2002/5-LrmojSc.png), [Summer 1816 iron](https://lparchive.org/Imperialism/Update%2002/19-07mCktM.png), [Fall 1860 oil](https://lparchive.org/Imperialism/Update%2014/4-z0l2dUh.png)

## 2. Deal Book (Sold / Bought ledger)

- **Shows:** everything that traded this turn with unit prices and the money result, including offers that were not completed. It opens at the end of the trade phase and can also be opened from the Help and Information dialog. [W2]
- **Layout:** an open book titled "Sold" (left) and "Bought" (right). Left: per-commodity entries (icon, name, deal price, "Sold N X to Nation @ $price / unit"), an "Overseas Profits" block (commodity, nation, dollars) and the "Bottom Line" table: Sold, Bought, Military Upkeep, Overseas Profits, Interest when in debt, net (red when negative), Credit Limit. Right: entries "Bought N X from Nation [@ $price / unit]" and "Nation offered to sell us X" for missed deals. Commodity tabs on the right spine; a page curl at the bottom right when more pages exist. Cash is shown at the top after all lines.
- **Controls:** tabs and the page curl only.
- **Screenshots:** [first turn](https://lparchive.org/Imperialism/Update%2002/7-G7aS2yh.png), [Update 02/14](https://lparchive.org/Imperialism/Update%2002/14-HQldM5B.png), [Update 02/17](https://lparchive.org/Imperialism/Update%2002/17-zI78zee.png), [Summer 1819 with interest](https://lparchive.org/Imperialism/Update%2003/15-ZlRQkoR.png), [subsidised prices](https://lparchive.org/Imperialism/Update%2004/15-coDgoFo.png), [Update 05/18](https://lparchive.org/Imperialism/Update%2005/18-poS7reS.png), [Fall 1838 colonies](https://lparchive.org/Imperialism/Update%2008/19-96GTpGG.png), [Winter 1836 upkeep](https://lparchive.org/Imperialism/Update%2007/32-MBQ5Zgo.png)

## 3. Diplomacy

### 3.1 Map and modes

- **Shows:** a hex world map of 7 Great Powers (colours) and 16 Minor Nations (beige); the mode decides how provinces are tinted: Information (Provinces, Military, Industry), Relationships (the nine-swatch bar "Bad ... Good"; the selected nation's own provinces dark green), Diplomatic Status or Political Map (Peace, War, Pact, Alliance, Empire plus consulate and embassy icons). The info page rates Military and Industry in words (Poor, Fair, Good, Excellent, Awesome). [W1] [W3]
- **Layout:** the map fills the upper two thirds of a wooden frame, back arrow top left, "?" top right, season, year and treasury in the top bar ("Spring, 1842 $56,173"), mode name at the top right in political mode. The bottom third is a parchment panel: left column of two round tabs (info "i" and a ballot icon), a title line ("Information: X", "X: Relationships", "X: Diplomatic Status"), right column of three tabs: scroll with seal = Diplomatic Overtures, document = Foreign Grants, ship wheel = Trade Policies. Another reading puts the overture and info tabs left and the policy and grant tabs right [?]. Four small icons beside the legend switch the map (the wiki names two "Foreign Grants Map" and "Influence Nations"); the scroll icon lists each Great Power's declarations of war. [W3]
- **Controls:** click a nation to select it; tabs switch panels; number key 4 opens the screen; clicking a Great Power on the info map shows all its diplomatic moves this turn. A Foreign Minister dialog covers the screen for errors.
- **Screenshots:** [Information map, first turn](https://lparchive.org/Imperialism/Update%2001/9-2JASTfg.png), [Relationships, Spring 1815](https://lparchive.org/Imperialism/Update%2001/10-XljsTul.png), [Update 02/24](https://lparchive.org/Imperialism/Update%2002/24-1coKAoo.png), [Update 07/38](https://lparchive.org/Imperialism/Update%2007/38-AGRsYTv.png), [Political Map](https://lparchive.org/Imperialism/Update%2006/6-spJog7e.png), [Relationships, Fall 1854, nine-swatch legend](https://lparchive.org/Imperialism/Update%2012/27-1biATBM.png), [Update 10/4](https://lparchive.org/Imperialism/Update%2010/4-aTfL56g.png), [Update 12/9](https://lparchive.org/Imperialism/Update%2012/9-QwQTLKn.png), [Update 06/2](https://lparchive.org/Imperialism/Update%2006/2-xUWR2td.png)

### 3.2 Diplomatic Overtures

- **Shows:** seven scrolls to order against a nation: Peace, Trade Consulate, Embassy (row 1), War, Pact, Alliance, Empire (row 2). Consulate $500, embassy $5,000 (not on credit).
- **Controls:** click a scroll, then a nation; overtures can be taken back until End Turn; errors come as a Foreign Minister dialog with OK ("we do not have the $5000 required to establish an embassy").
- **Screenshots:** [overtures](https://lparchive.org/Imperialism/Update%2008/7-yFe7l9K.png), [embassy refused](https://lparchive.org/Imperialism/Update%2005/14-O8Qo6FE.png), [Update 05/13](https://lparchive.org/Imperialism/Update%2005/13-SZp1LzE.png)

### 3.3 Foreign Grants

- **Shows:** "Promised Grants: $X" (sum of locked grants), the nine-swatch relationship legend and four amounts, $1,000, $3,000, $5,000, $10,000, each with a one-time paper button and a padlock button (repeats every turn until cancelled). v1.1 made "Promised Grants" accurate at all times. [W5]
- **Controls:** pick amount and paper or padlock, then click the nation.
- **Screenshots:** [Foreign Grants](https://lparchive.org/Imperialism/Update%2009/2-GI9NqXZ.png)

### 3.4 Trade Policies (subsidies and boycotts)

- **Shows:** six round ship-flag subsidy buttons labelled 5%, 10%, 25%, 50%, 75%, 100% (green to red), then Boycott (red crossed circle) and Colony Boycott (black circle). For an inspected nation: "Most Favored Trading Nation: X" and up to 3 Major Exports icons; for a Great Power its Major Exports. Legend: Subsidy, Boycott, Colony Boycott, Total Boycott. Map overlays: green dollar tokens (subsidies), red circles (boycotts), black crosshairs (colony boycotts), blue number badges at consulate nations (meaning not found, gap H5). Changes apply at End Turn.
- **Controls:** pick a percentage, click a nation; Ctrl-click sets the smallest subsidy that makes you favourite (v1.1); Boycott and Colony Boycott toggles. [W5]
- **Screenshots:** [Spring 1815](https://lparchive.org/Imperialism/Update%2001/11-B66iBPN.png), [subsidy buttons](https://lparchive.org/Imperialism/Update%2002/12-AGUrdMN.png), [Update 05/9](https://lparchive.org/Imperialism/Update%2005/9-2CcUPYi.png), [1876 boycotts](https://lparchive.org/Imperialism/Update%2018/5-gV9ae4t.png)

### 3.5 Foreign Minister dialogs, Accept Offer, Imperial Times

- **Foreign Minister dialog:** portrait left, nation crest right, title ("Report from your Foreign Minister" or "Advice from your Foreign Minister: Consider the Competition..."), body text, OK. Examples: the $5,000 embassy refusal; "too deeply under the influence of another Great Power for our grants to be effective".
- **Accept Offer:** header "Accept Offer" top right, world map above, parchment strip with a red wreath REJECT seal, the sentence ("Wan seeks to enter into an alliance with our great Empire. Do you accept their offer?") and a blue wreath ACCEPT seal. Esc rejects, Return accepts. A peace request reads "... has come groveling for an end to their war ... Warning: Accepting will break our alliances with their enemies."
- **Imperial Times:** newspaper page with rate line and date, headlines for treaties and war ("Alliance Formed with Yakakkie", "Mone Declares War!"); a Foreign Minister dialog "Prepare for Battle" can sit on top.
- **Screenshots:** [sway message](https://lparchive.org/Imperialism/Update%2009/30-ooI2C92.png), [Accept Offer](https://lparchive.org/Imperialism/Update%2007/31-H9C6hVl.png), [peace request](https://lparchive.org/Imperialism/Update%2007/34-qJ3qI0c.png), [Prepare for Battle](https://lparchive.org/Imperialism/Update%2010/8-QVUB12w.png), [Imperial Times](https://lparchive.org/Imperialism/Update%2004/3-aTHIfMO.png), [pact headline](https://lparchive.org/Imperialism/Update%2005/16-HHNEJvg.png)

## 4. Armoury (recruit regiments)

- **Shows:** per-unit stats, cost in worker grade / arms / fuel (era 3) / dollars, current stock, a one-sentence description and a counter per unit for the number ordered this turn. [W1]
- **Layout:** a modal window "Armory" over the city screen. Top bar: season and year, cash, small icons, a context label. Left panel for the selected unit: name bar, stat block (Firepower, Move, Range, Entrench Yes/No) with portrait, "Cost" row (worker-grade icon and count, arms icon and count, third icon and count when needed, dollars), "Available" row with the same icons showing stock (red when too low or 0), description. Right: a 2x4 grid of 8 unit buttons, each with a left arrow, a counter box and a right arrow. Left column Light Infantry, Regular Infantry, Heavy Infantry, Combat Engineer; right column Light Cavalry, Heavy Cavalry, Light Artillery, Heavy Artillery [?] (the screen prints a name only for the selected unit: Skirmishers = top left, Artillery = bottom right; the other six slot names are inferred from the icons and the 9 categories). Militia are not in the grid. Only the best unit of each category shows; later eras replace the icons in the same slots. Screen edges: the labour list (three worker-grade icons with counts and a bulb icon with a total) at the left, stock icons (arms, food) at the right. Close X top right of the window.
- **Worker icon shade:** white apron = untrained, light blue = trained, dark blue = expert (same as the labour list and the University) [?] (the shade difference is not resolvable on the 640x480 Armory screenshots in a spot check; the mapping rests on the labour list and the LP text).
- **Controls:** click a unit to inspect it; the right arrow orders one (cash and stock fall at once: 12,549 -> 10,549 after 1 Artillery and 1 other unit, the third infantry slot, taken to be the Grenadier [?]; the screen does not print its name), the left arrow cancels one; units appear the turn after End Turn.
- **Screenshots:** [Spring 1834 grid](https://lparchive.org/Imperialism/Update%2007/3-uHzWkRW.png), [Skirmishers and Artillery](https://lparchive.org/Imperialism/Update%2007/4-MHurpAW.png), [Combat Engineers 1840](https://lparchive.org/Imperialism/Update%2008/27-qbwwUaX.png), [Mobile Artillery 1879](https://lparchive.org/Imperialism/Update%2018/12-0x3F8rd.png), [Armor 1885](https://lparchive.org/Imperialism/Update%2020/4-y5G54pH.png)

## 5. Strategic map with armies

### 5.1 Map and army panel

- **Shows:** the province map with city, flag and encampment tents (the army in a province; demo text: forces there defend the whole province); a zoomed-out map with one small flag per province (owner colour), ports as an anchor with the port name, fleets as flags in sea zones, a beachhead as a cannon icon on the shore. Orders are arrows between provinces: red for attacks into enemy provinces (two red arrows into Maraso, Spring 1835), green for own moves (3 green and 2 red arrows, Winter 1848) [?]. A move is not carried out until End Turn. After a declaration of war the cursor over enemy provinces becomes red crossed swords. [W1] [W4]
- **Layout:** the map fills the left 75%. Right column: 4 icon buttons (search, building, ledger, help), a minimap with a viewport square, 4 icons (transport, industry, trade, diplomacy), 4 army buttons (flag, move arrow, crossed box, fort), then the composition grid: one slot per unit category in the same 2-column order as the Armoury (ghost silhouettes for empty slots), each with unit icon, count and small arrows to send more or fewer of that category; End Turn bar at the bottom. The title bar shows the date and cash, or "Force Size: N" when a group is selected, and hover labels ("Give Transport Orders", "Show Garrison Details"). The icon-to-function mapping of the 4 army buttons is unconfirmed [?]; demo strings name Defend, next unit, sleep and Behave Cautiously or Aggressively.
- **Controls:** click tents or the army to select; arrows set the count per category; click a province to order a move or attack (attacks only into adjacent provinces); hot keys F5 civilians, F6 army units, F7 ships; a wakes armies, n navies.
- **Screenshots:** [capital with tents, Spring 1815](https://lparchive.org/Imperialism/Update%2001/3-KASJeV1.png), [Update 08/2](https://lparchive.org/Imperialism/Update%2008/2-8T3IspJ.png), [Update 07/19](https://lparchive.org/Imperialism/Update%2007/19-sg2DQvB.png), [arrows, Winter 1848](https://lparchive.org/Imperialism/Update%2010/10-0pX7yQn.png), [Update 07/10](https://lparchive.org/Imperialism/Update%2007/10-FXn2PT1.png), [Update 14/35](https://lparchive.org/Imperialism/Update%2014/35-ucBw2WT.png)

### 5.2 Garrison Book ("Show Garrison Details")

- **Shows:** every regiment in the province: ordinal name ("26th Minutemen", "1st Regulars"), status word (Defending for militia and units that stay, Available for units that may move or attack), a segmented green health bar (5% steps), a small upgrade icon on upgradable units. Title bar "Force Size: 5" and, on hover over the upgrade icon, "Upgrade cost: 2 arms, $3,000". Left page fills first, overflow to the right page.
- **Controls:** click the upgrade icon to upgrade; Ctrl-click disbands (no refund, upkeep stops); space targets the nearest unit; d = done.
- **Screenshots:** [Garrison Book](https://lparchive.org/Imperialism/Update%2009/6-UvuOs1d.png)

### 5.3 Scouting Report, defender prompt, Task Force Report

- **Scouting Report:** centred dialog "Report on the army forces of [nation] in the province of [name]", a boxed estimate ("2 Regular Infantry, 2 Heavy Artillery, 1 Demolitionist, 3 units of unknown type"), estimator line (garrison commander or General), OK. Opened by clicking a bordering province's question mark. [Update 07/17](https://lparchive.org/Imperialism/Update%2007/17-HddP26d.png), [Update 08/23](https://lparchive.org/Imperialism/Update%2008/23-mhFiaUQ.png)
- **Defender prompt:** start of a turn with an attack: dialog with two emblems, a small world map marking the province, "Our garrison in X is being attacked by the forces of Y. Do you wish me to deploy the troops for you?", Cancel and OK (OK = automatic deployment, Cancel = you deploy on the tactical map). [Update 07/13](https://lparchive.org/Imperialism/Update%2007/13-FYijbvV.png)
- **Task Force Report:** "Force currently located in [sea zone]": Composition pane (ship count and type, admiral) and Orders pane (mission text), Cancel and OK. Missions: Patrol, Blockade, Landing, Move. [Update 07/6](https://lparchive.org/Imperialism/Update%2007/6-7s2EDPQ.png)

## 6. Battle (attack) screen: tactical battlefield

- **Shows:** a turn-based fight of regiments on a painted oblique battlefield that scrolls (larger than the view). Each regiment is one figure about 35 px tall with a small nation flag at its lower left and a segmented health bar (green fit, yellow hurt or routed, red near broken). Terrain scenery (palms, fences, wrecked timber, trenches) is cosmetic; no terrain rule is displayed. The same scenery recurs in battles of different years, so a small set of fixed fields may be used [?]. [W1]
- **Layout:** wood frame, 640x480. Top left: season, year, treasury ("Summer, 1869 $696,624") [?] (not present on the open-field screenshot Update 08/4, which has no top bar; the example string comes from another battle screenshot). Right panel about 55 px wide: "?" button, own nation crest, three small square buttons, a selected-unit card (portrait, a second slot below), and the commanding general's portrait at the bottom (demo text: it hands the battle to the minister). Selected unit has black corner brackets; the tile under the mouse has white brackets; small dots on the ground are unexplained (gap H10).
- **Fort battle:** a brick or earth wall with gate gaps and trenches along one edge; defenders stand in dense columns behind it (about 7 rows by 3 columns of infantry, heavy guns and cavalry at the Yakakkie capital fort); after guns fire the wall pieces vanish. **City battle:** paved paths, a fountain plaza, hedges and low brick walls; the attacker enters from one edge and the battle ends when the defenders are driven out of the city.
- **Controls:** click a green or red pip to move; click an enemy in range to fire (cursor becomes a crosshair, or a red X out of range); d or click the unit to finish; retreat options; the general portrait hands control to the minister; "?" help.
- **Screenshots:** [open field](https://lparchive.org/Imperialism/Update%2008/4-wAMrYnh.png), [Update 08/11](https://lparchive.org/Imperialism/Update%2008/11-rybPuvE.png), [Update 07/22](https://lparchive.org/Imperialism/Update%2007/22-peQfmDh.png), [Update 07/14](https://lparchive.org/Imperialism/Update%2007/14-PcMYFnN.png), [Update 07/20](https://lparchive.org/Imperialism/Update%2007/20-Vag33OV.png), [Update 08/3](https://lparchive.org/Imperialism/Update%2008/3-2QdQr28.png), [fort wall](https://lparchive.org/Imperialism/Update%2016/27-3qOHsMP.png), [wall levelled](https://lparchive.org/Imperialism/Update%2016/31-vW8r8LJ.png), [capital city](https://lparchive.org/Imperialism/Update%2016/40-TSJlH2m.png)

## 7. Battle result (casualty book)

- **Shows:** both sides' regiments after the fight with the remaining health or KIA. Province garrison summary behind the book. Other result strings: Attack Failed!, Province Taken!, Province Lost!, Enemy Beaten Back!. [W4]
- **Layout:** an open book over the strategic map. Left page: our nation (crest at the top), right page: the enemy. Each row: unit icon, ordinal name ("6th Regulars", "1st Cuirassiers") and a health bar (green, yellow, red) or the text "KIA". Surrendered units count as lost. Example: 6th Regulars KIA, 2nd Regulars full green, 5th Cuirassiers yellow; enemy 3rd Grenadiers almost empty, 2nd Regulars KIA.
- **Controls:** a tick button at the top left closes the book; nothing else. The result screen of an auto-resolved battle was not found (gap H11).
- **Screenshots:** [casualty book](https://lparchive.org/Imperialism/Update%2007/27-XUB4uwO.png), [map after a capital fell](https://lparchive.org/Imperialism/Update%2016/46-NipXKt0.png)

## 8. Council vote

### 8.1 Vote screen

- **Shows:** the world map with a small ballot icon on every province whose governor has voted; at the bottom only the **two** nominees, each with crest, a big total and four rows: Controlled, Colonies, Other Great Powers, Other Minor Nations (left nominee's numbers left, right nominee's right). The win screen reuses the layout with the title "<Nation> Wins!". The first screenshot shows the map and crests before the numbers appear. Example 1825: Mone 51 = 8 + 0 + 40 + 3, Visisik 11 = 8 + 0 + 0 + 3 (01 section 4a). [W1] [W6]
- **Layout:** wooden frame, title "Council of Governors", map in the centre, nominee crest and total on each side at the bottom, four labelled rows between them; the nominee's colour is its map colour.
- **Controls:** none beyond the back arrow and help; it is a report, the player does not vote.
- **Screenshots:** [map and crests](https://lparchive.org/Imperialism/Update%2004/16-Per0z4i.png), [1825](https://lparchive.org/Imperialism/Update%2004/17-bC41Cof.png), [1835](https://lparchive.org/Imperialism/Update%2007/16-IW5ETBl.png), [1845](https://lparchive.org/Imperialism/Update%2009/26-y4Yd5zj.png), [1855](https://lparchive.org/Imperialism/Update%2012/29-ybYr3Cw.png), [win, 95 of 120](https://lparchive.org/Imperialism/Update%2021/22-ej4UicT.png)

### 8.2 Council Projection and strength charts, score screen

- **Charts:** a parchment page with a title ("Council Projection", "Diplomatic Strength"), "Return to Map" top right, five round tabs left (box, gears, quill, medal, ship) and five right (ship wheel, building, arm, person, train); seven coloured horizontal bars (crest and name) sorted longest first, no numbers. Charts: Council Projection, Interior, Diplomatic, Military Strength, Merchant Marine, World Exports, Industry, Labor, Transport. [Projection](https://lparchive.org/Imperialism/Update%2004/18-vhJTsb3.png), [Diplomatic Strength](https://lparchive.org/Imperialism/Update%2004/20-MItvZt7.png), [Military Strength](https://lparchive.org/Imperialism/Update%2007/2-XfYkMsz.png), [Merchant Marine](https://lparchive.org/Imperialism/Update%2011/40-vrKQCak.png), [World Exports](https://lparchive.org/Imperialism/Update%2011/41-raPaUcm.png)
- **Score screen:** parchment "Victory for <Nation>!" with two columns of icon, category and points, then Subtotal, Difficulty multiplier and Total (example total 6,982; 01 section 5). [Score](https://lparchive.org/Imperialism/Update%2021/23-qKDxqel.png)

## 9. Other screens seen

| Screen | What it shows | Screenshots |
|---|---|---|
| Shipyard | dialog over the capital: card of the selected ship (Firepower, Range, Armor, Hull, Speed, Cargo, picture, flavour text), "Cost" and "Available" icon rows, grid of ship thumbnails each with arrows and a count; card Speed is battle speed (merchants show 0) | [Indiaman](https://lparchive.org/Imperialism/Update%2002/9-bH0M4Ey.png), [Update 02/10](https://lparchive.org/Imperialism/Update%2002/10-EJVZ56D.png), [Update 06/22](https://lparchive.org/Imperialism/Update%2006/22-VIRKxZ2.png) |
| Enemy Merchants Intercepted! | world map with skulls at the sea zone; footer names the blockading task force and the victim's deal; back and forward arrows, info button | [Update 07/11](https://lparchive.org/Imperialism/Update%2007/11-zRRFLG3.png) |
| Technology purchase list | parchment table: woodcut, name and year, cost button or "Purchased in", benefits text naming unit unlocks; "View Technology Details" opens a history essay | [Update 09/16](https://lparchive.org/Imperialism/Update%2009/16-ryDmeqL.png), [Update 18/9](https://lparchive.org/Imperialism/Update%2018/9-iFq0x2Q.png) |
| Engineer Construction Options | small dialog with fort icon, "($7,500) A level two fort will increase protection of armies in this province.", Cancel; right panel lists depot, port, fort prices | [Update 14/8](https://lparchive.org/Imperialism/Update%2014/8-YT1iWbQ.png) |
| Reward and advice popups | card over the Imperial Times: minister portrait, picture (rider, statue), crest, text, OK (General reward, Armoury statue, "Strengthen the Army", "Capitol in Danger!") | [Update 08/6](https://lparchive.org/Imperialism/Update%2008/6-u0755ar.png), [Update 09/27](https://lparchive.org/Imperialism/Update%2009/27-1bq6jkO.png), [Update 10/37](https://lparchive.org/Imperialism/Update%2010/37-YtNkg6n.png), [Update 07/18](https://lparchive.org/Imperialism/Update%2007/18-qzeciwT.png) |
| Rankings | horizontal bars with crests, no numbers, side icon tabs for the other charts | [Update 04/22](https://lparchive.org/Imperialism/Update%2004/22-SNbbaWQ.png) |

## Sources

- [W1] Let's Play "Imperialism" by Kangra, https://lparchive.org/Imperialism (nation Visisik, random world, Spring 1815). Imp1: retail 1997 UI, 7 Great Powers, 16 Minor Nations, nine-swatch relation bar. Every screenshot link above is from it (opened and viewed by the research lanes). MobyGames screenshots could not be opened (Cloudflare check).
- [W2] Manual full text (Imp1, 1997): https://archive.org/stream/imperialism1997ssimanual/Imperialism%201997%20SSI%20Manual_djvu.txt (Deal Book, Trade Book, offer sheet, Bid and Offer controls; paraphrased)
- [W3] https://imperialism.fandom.com/wiki/Diplomacy_(Imp1) and https://imperialism.fandom.com/wiki/Minor_nation_(Imp1) (read through search excerpts; the wiki returned HTTP 402 to fetches)
- [W4] Imp1 demo disc string table (a demo build, may differ from retail): https://discmaster.textfiles.com/view/23908/PC%20Gamer%20IT%20CD%2022.iso/IMPDEMO/_SETUP.1/str%23enu.gob/string.txt
- [W5] v1.0 and v1.1 readmes: https://imperialism.fandom.com/wiki/README.TXT and https://imperialism.fandom.com/wiki/README11.TXT
- [W6] LP text pages: https://lparchive.org/Imperialism/Update%2004/ (Council), https://lparchive.org/Imperialism/Update%2021/ (win and score)
