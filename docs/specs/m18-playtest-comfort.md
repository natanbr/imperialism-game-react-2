# M18 · Play-test comfort (owner feedback 2026-11-23)

Source: Nathan tried the M17 build on 2026-11-23 and gave eight points ("nothing is critical, you decide what, how and
when"). This file holds the rows (NR-037, FR-561 to FR-570), the order of work and the icon list for the art requests.
Rows are mirrored in `docs/requirements.md`.

## Order of work (orchestrator's call)

1. Finish M17 first: review findings, the reworked sea battle (FR-552) and allied attacks (FR-560). M17 is a game rule;
   M18 is UI and test comfort, so they do not share files much, but one milestone at a time keeps the gates clean.
2. M18a **testing aids first** (FR-561, FR-562): they make war testable, which M17 and every later war milestone need.
3. M18b **readability** (FR-563 to FR-570): trade wording and nation colours, Capital layout, map zoom, stats page,
   toasts. Pure UI; no engine rule changes.
4. Icons (section 3) wait for the art. Until then the UI uses the existing ink-and-wash assets and text labels.

Decision taken: points 1 and 6 ("Demo difficulty" and "Debug Difficulty") become one game mode, **Demo**, which gives
more resources and shows every nation's hidden numbers. Objection: a mode that both changes the economy and reveals
information mixes two test purposes; if that gets in the way, split it into two switches later.

## Rows

| ID | Requirement | Status |
|---|---|---|
| NR-037 | (M18) Testing aids and UI changes SHALL NOT change any rule of the other difficulty levels, saves SHALL still load (new fields optional), and the computer SHALL still see only what a human of its nation sees (FR-497) in every mode, Demo included: Demo reveals hidden numbers to the human screen only. FR-125, FR-545, FR-546 and the two-islands golden are measured on the normal level and must not move. | in progress (M18a) |
| FR-561 | **Demo difficulty.** WHEN a new game starts on the Demo level, the human nation SHALL start with more cash, stock and regiments (named constants, first guess ×3 cash, a full war chest of materials, two extra regiments and one Frigate), so a war and a landing can be tried in the first ten turns. Other nations start as on Normal.<br>Verify: new-game test for Demo vs Normal starting values; Normal unchanged byte for byte; a Demo e2e reaches a landing before turn 10. | tested (tests/engine/demoStart.test.ts; tests/ui/topBar.test.tsx; e2e/m18-demo.spec.ts; the landing before turn 10 is proved headlessly, not in e2e) |
| FR-562 | **Debug dashboard.** WHEN the game is on the Demo level, a dashboard panel SHALL show every nation's cash, stock, army, fleet, trade orders, relations and Council forecast, laid out as cards with buttons (no drop-downs). The existing "Details for bug reports" moves into it.<br>Verify: UI test shows rival cash only on Demo; FR-497 test proves the computer's view is unchanged on Demo. | tested (tests/ui/dashboard.test.tsx; e2e/m18-dashboard.spec.ts at 1366x768 and 390 px) |
| FR-563 | **Buy and Sell.** The Market and trade screens SHALL say "Buy" and "Sell" where they now say "Bid" and "Offer", in every label, button, news line and rules text. Engine names may stay.<br>Verify: grep test finds no user-visible "Bid"/"Offer"; e2e Market flow uses the new words. | not started |
| FR-564 | **One colour and flag per nation.** Every nation, Great Power and minor, SHALL have one colour and one flag used the same way on the map, Market, trade, Diplomacy, Council and news. Until flag art exists, a coloured flag shape from `map-ui/nation-flag.svg` stands in.<br>Verify: one source of nation colours (FR-097 tokens) feeds all screens; a test renders each screen and checks the same colour per nation. | not started |
| FR-565 | **Capital layout.** The Capital SHALL keep one section open at a time (opening one closes the other), so it fits without a scroll bar at 1366×768; the industry icons SHALL be larger. | not started |
| FR-566 | **City labour bar.** A permanent bar for the city's labour (workers, food, training) SHALL sit with the HUD; the Trade School, Capitol, Transport, University and Shipyard buttons SHALL move to the left side, outside the HUD.<br>Verify: e2e at 1366×768 shows the bar and the five buttons without a scroll bar. | not started |
| FR-567 | **Map size on start.** The map SHALL open filling the free screen area, with its own zoom (buttons, mouse wheel, pinch) that does not resize the HUD. The top bar text SHALL stay readable at 1366×768 and the right-hand panel SHALL be narrower.<br>Verify: e2e measures the map share of the window and the HUD size before and after map zoom. | not started |
| FR-568 | **Stats page.** Votes, score and standing SHALL move from the main screen to a Stats button and page.<br>Verify: main screen shows no vote/score line; the Stats page shows the same numbers the Council uses. | not started |
| FR-569 | **Toasts for errors.** A refused order or other error SHALL appear as a short message that slides in, stays about 6 seconds or until closed, and never pushes the page down. Screen readers get it through a live region.<br>Verify: UI test for a refused order shows a toast and no inline banner. | not started |
| FR-570 | **Rail in the art style.** Rail lines SHALL be drawn in the ink-and-wash style (section 4), with built track, track under construction and bridges looking different.<br>Verify: by eye on the progress page screenshots; a unit test for the path shape per state. | not started |

## 3. Missing icons (list for the art request)

Existing art: `public/assets/ink-and-wash/` has army units, buildings, goods, improvements, navy, terrain, forts 1 to 3,
depot, port, rail pieces, one generic flag. Missing:

| # | Icon | Where it is used | Sizes / states |
|---|---|---|---|
| 1 | Diplomacy actions: embassy, consulate, trade pact, non-aggression pact, alliance, declare war, offer peace, grant (aid), trade subsidy, boycott | Diplomacy screen buttons | 48 px, normal and disabled |
| 2 | City on the map, by size: capital, large, medium, small town | Map tile (now a fork and a number) | map tile size, one per level |
| 3 | Army stack by size: 1, 2 to 3, 4 to 6, 7+ tents | Map tile layer over a province | small, in the nation colour |
| 4 | Fort levels on the map (fort-1..3 exist as building art) | Map tile layer | map-icon versions of the three levels |
| 5 | Nation flags: each Great Power and each minor (Lorran, Arvelia, Sundmark, Pellis, Testland, Valdoria and the rest) | Map, Market, trade, Diplomacy, Council, news | 24 px and 64 px |
| 6 | Sea war: fleet at sea, landing site (beachhead), blockade, sea battle report, ship damaged / sunk | Map approach layer and news | map-icon size |
| 7 | Rail: track built, under construction, bridge, station, as a set that joins at hex edges and corners | Map | see section 4 |
| 8 | HUD and toasts: info, warning, error, success; labour, food, workers; stats page; debug dashboard | HUD bar and toasts | 20 px |
| 9 | Market: buy, sell, price up, price down | Market and trade screens | 20 px |
| 10 | Council and votes: ballot, vote for, abstain | Council screen | 32 px |
| 11 | Technology: one icon per invention | Capital, technology list | 48 px |

## 4. Rail drawing suggestion

Today the rails are flat vector lines that look like a modern map. Proposal in the ink-and-wash style:
- Two thin sepia rails with short cross ties, drawn from hex centre to hex centre, slightly uneven like a pen line.
- Curves as smooth arcs through the hex centre, not straight segments meeting at an angle.
- Under construction: pencil-grey dashed ties without rails.
- Bridges: a small wooden trestle over rivers; stations: the existing depot art scaled down.
- Thin enough that terrain and resources stay visible beneath.
