# Journal

## Resuming here

- 2026-11-02: plan approved (continue, v1 = M0 to M4). Light flow in `docs/FLOW.md`. Rules in
  `docs/rules/` (gaps in `gaps.md`). Progress page: https://claude.ai/artifact/JHRFaWQRPk3AYGssSchPBU.
- M0 to M4 are merged into `main` (PR 9, 10, 12 to 15, 17); their entries are archived in
  `docs/journal/archive-M1.md` to `-M4.md`. Decisions Q5 to Q16 settled (NR-012 to NR-018).
- M4.1 (PR 18), M4.2 (PR 19) and M4.3 (PR 20, main 274ef62) are merged; entries archived in
  `docs/journal/archive-M4.1.md` to `-M4.3.md`. Q17, Q19 and Q20 answered as NR-029, NR-028, NR-027.
- 2026-11-12 M4.4 (NR-027, NR-028; FR-140 to FR-142) merged (PR 21, main e018d85; entry archived in
  `docs/journal/archive-M4.4.md`). Recruiting not built (probe in `scripts/probes/m4-4/`); decision card
  Q21 open, option (a) "no recruiting" taken meanwhile. v1 (M0 to M4.4) is complete.
- 2026-11-12 night shift (NR-030): v2 planning and implementation. Plan on branch `claude/v2-plan`
  (this worktree, the old docs worktree `imperialism-game-revival-fee36d`); one branch per milestone
  after it. The progress page files now live on these branches too (copied from the docs branch).
- 2026-11-13 M5 (FR-144 to FR-160, FR-235) merged (PR 23, main 0bfd870; entries archived in
  `docs/journal/archive-M5.md`). The app plays the continent. Card Q22 (the continent's tilt) still open.
- 2026-11-13 M6 Diplomacy (FR-161 to FR-181, FR-236 to FR-241) merged (PR 24, main 2a60a3b; entries archived in
  `docs/journal/archive-M6.md`). Decision card "who receives a grant" (M6 fix round decision 3) still to add.
- 2026-11-13 M7 Nation-to-nation trade (FR-183 to FR-198, FR-242 to FR-259) merged (PR 25, main d16afa7; entries archived in
  `docs/journal/archive-M7.md`). Card Q47 (the World market's greyed "−") still open.
- 2026-11-13 M8 Armies (FR-199 to FR-215, FR-260 to FR-271) merged (PR 26, main c91f2fd; entries archived in
  `docs/journal/archive-M8.md`). Nathan's art pack (NR-031) committed on top (4bd00eb).
- 2026-11-13 M9 War and the attack screen (FR-216 to FR-234, FR-272 to FR-281) merged (PR 27, main f817da2; entries archived
  in `docs/journal/archive-M9.md`).
- 2026-11-13 M10 Council of Governors (FR-290 to FR-317) merged (PR 28, main 69ed08b; engine half archived in
  `docs/journal/archive-M10.md`). **v2 (M5 to M10) is complete.** Gate on 6fad1e0: 2001 unit tests,
  lint 0 errors, tsc and build clean, Playwright 38 passed and 1 skipped.
- 2026-11-14 M11 Ink-and-wash restyle (NR-032, FR-318 to FR-338, cards Q60 to Q76) built on `claude/m11-ink-restyle`
  (lanes 1 to 3 and the integration step, entry below), not pushed: 2088 unit tests, Playwright 45 passed and 1 skipped.
  Still to come: the milestone review, the browser QA pass, the cards Q60 to Q76 on the progress page, the PR.
- Open decisions (defaults in force, all on the progress page): Q22 to Q59; the most important are Q51 (Council
  threshold), Q34 and Q35, and Q57 to Q59 (new from the M10 QA round: the removed "No tile selected" hint; the news
  line names the 1st nominee first while the screen puts the player first; abstention reasons in relation points
  while the Diplomacy screen shows levels). M11's Q60 to Q76 are in docs/requirements.md, not yet on the page.
- Not verified yet: a winning Council vote on screen (unit tests only); Firefox and WebKit never run; seed 4's
  computer never campaigns. Possible flaky test: `tests/engine/lintGuard.test.ts` timed out once under load.
- Carried from M8: the FR-213 garrison threat-recruit asks for Regulars, which a real game can never raise. Next.js
  picks a lockfile two folders up as the project root (set `turbopack.root` / `outputFileTracingRoot` in `next.config`).
- Housekeeping waiting for Nathan's go-ahead: merged branches `claude/v2-plan`, `claude/m5-*` to `claude/m10-council`,
  the old `decisions` worktree.

Carried forward:
- Deferred: river ports and the depot-on-port rule (rules 04); University fees; the power plant.
- UI: the cursors are the pack's pictures since M11 (FR-330; the rail cursor's e2e case is still `fixme`). Not built
  from M3: Q15 (c) "repeat last turn's trades".
- The NR-016 list of other same-turn effects (archive-M4, part A entry) waits for a decision.
- M5 design item (M4 review note 5): partly settled by FR-115 (with a civilian selected elsewhere, a
  click on a tile's civilians is the selected civilian's order there); with none selected, a click on
  a tile's centre still selects its civilian, not the tile.
- M4.1 review note 5: the rail path search (`railPath` in `engine/ai/railPlan.ts`) treats a tile with
  a temporary job (prospecting, development) as blocked, so the engineer takes a longer route, or finds
  none, rather than waiting the few turns until the job ends.
- M4.1 review note 7 (decision 4): Expand, freight cars, training and sales can still cut a standing
  order without a refusal (as on main, now visible in the dialog), and an older dead order whose inputs
  come back takes its labour back the next turn, cutting a newer order. Not changed in M4.1.
- M4.3 review finding 4: `isDepotSite` checks only hills; it does not call `railTerrainAllowed`. Today a
  depot needs no rail on its own tile, so it does not matter; when technologies become lockable, a
  depot site SHALL also require `railTerrainAllowed` (the section into it is built on it).
- M4.3 review finding 5: `railPath` (`engine/ai/railPlan.ts`) finds the path with the fewest tiles, not
  the fewest missing sections, so it can ignore rail already built that a slightly longer path would reuse.
- M4.3 review finding 6 (hypothesis, not run): the score drop since M4.3 may come partly from
  `bestDepotSite`'s gain counting every gathered unit equally; weighing each unit by what the economy
  actually uses (food eaten, inputs of running buildings, what sells) may pick better sites.
- M4.4 review note 7: a stale store entry (an allocation in `transportAllocationsByNation` for a commodity
  that now has nothing to ship) flashes its group once per open, until the next slider move writes the
  clamped allocations back. The popup's local state clamps it right after the first render; the store keeps it.
- M4.4 review note 10: in the lever table the "free worker" rows add a worker who eats raw food, so what they
  lose is a freight car's load of inputs every turn, not the cost of recruiting. Only the guarded rows (a
  free worker after a labour-bound turn, R1, R2) support the conclusion that recruiting does not pay; the
  rows with a free worker every turn (sick and starved workers) say little about a policy.

## 2026-11-02 Revival setup

Size: L (process). Decisions: continue not restart; gold $200 / gems $500; delete superseded
branches and untrack old tool configs; v3 AI scripted and LLM behind one interface. Light
flow adopted from the work-repo SDD flow; reviews batched per milestone to cut cost.

## 2026-11-03 M1 headless core (archived)

Entries in `docs/journal/archive-M1.md`. Engine in `src/app/engine/` (Order, validate, apply,
resolveTurn, systems `(state, ctx)`, seeded RNG, scripted player); the store holds one
`GameState` plus UI state and the UI only submits orders. FR-001 to FR-026 tested; 280 unit
tests, Playwright 7 passed. Two objections went to M2: the job completion flags and the
`newGame` import of a test fixture (both settled in M2 part A).

## 2026-11-03 M2 economic loop (archived)

Entries in `docs/journal/archive-M2.md`. Production buildings with capacity and standing orders,
recipes, labour, food and sickness, training, migration, freight cars from lumber + steel + labour,
the Spring 1815 calendar, real job durations and costs; the engine owns the start world; capital
dialog, HUD date and food warning. FR-027 to FR-059 tested; 472 unit tests, Playwright 8 passed,
1 skipped. Merged as PR 13. Open: decision Q9 (freight cars count this turn; the rules say next turn).

## 2026-11-03 M3 money and score (archived)

Entries in `docs/journal/archive-M3.md`, with the decision cards Q10 to Q15. One world market
(sell, buy, cargo holds, price drift), the score (treasury + industry + development), game over after
40 turns, the market dialog, HUD score and game-over screen. FR-060 to FR-078 tested; 588 unit tests,
Playwright 10 passed, 1 skipped. Merged as PR 14 (review: merge, nothing must-fix; carried-forward list
in the archive's review entry).

## 2026-11-04 M3.5 small map and clean look (archived)

Entries in `docs/journal/archive-M3.5.md`. The rail line fix (FR-079), the 24x16 two-island start
world with island 2 kept for M4 (FR-080 to FR-083), Game Icons, faint terrain tints, the minimalist
palette and 42 px tiles (FR-084 to FR-090), and the review fix round (FR-091 to FR-096); 654 unit
tests, Playwright 15 passed, 1 skipped. Merged as PR 15; the carried-forward list is in "Resuming
here" and the archive's last entry.

## 2026-11-09 M4 second nation (archived)

Entries in `docs/journal/archive-M4.md`. Nation 2 "Valdoria" on island 2, played by the scripted player
at End Turn (FR-097 to FR-105); the score table, news per nation, Valdoria read-only, New game, 24 px
worker buttons and the tray (FR-106 to FR-111); review fix round. Merged as PR 17. Carried forward: the
list in "Resuming here".

## 2026-11-10 M4.1 play-test fixes (archived)

Entries in `docs/journal/archive-M4.1.md`, with its review fix round. Civilians share tiles, one job per
tile (FR-112 to FR-115); one production plan for the phase, the labour and the capital dialog (FR-116 to
FR-120); commodity icons in the market and capital (FR-121); a scripted engineer that builds depots and
joins them by the shortest rail path (FR-122 to FR-124). Merged as PR 18 (main b4d26ee).

## 2026-11-10 M4.2 scripted player score (archived)

Entries in `docs/journal/archive-M4.2.md`, with its review fix round. `engine/ai/economy.ts`: every
lumber + steel pair becomes capacity, goods fill the holds, pairs bought under $1,000, cheapest
development level first, depots only when they pay back (FR-125 to FR-132). Against the frozen M4 player,
seeds 1 to 4: turn 15 1.60 to 1.65 times, turn 25 1.76 to 1.81, turn 40 2.39 to 2.55. Merged as PR 19 (main a267a03).
## 2026-11-12 M4.3 transport popup and rail links (archived)

Entries in `docs/journal/archive-M4.3.md`, with its review fix round. The transport popup with icons, groups by
kind and columns (FR-133 to FR-135); rail links are only the sections built, the triangle bug (FR-136 to
FR-139); the scripted engineer orders sections. Lowest FR-125 ratio 1.60 to 1.55. Merged as PR 20 (main
274ef62).

## 2026-11-12 M4.4 Recruiting AI and empty groups (archived)

Entry in `docs/journal/archive-M4.4.md`, with its probe tables and review fix round. The transport popup lists only
what the network can carry and hides empty groups (FR-141, FR-142); the furniture bound counts 2 lumber (FR-140);
recruiting measured and not built (probe in `scripts/probes/m4-4/`, card Q21 option a). Merged as PR 21 (main e018d85).

## 2026-11-13 v2 plan (night shift, NR-030; archived)

Entry in `docs/journal/archive-v2-plan.md`. Plan in `docs/REVIVAL_PLAN.md` section 5b (M5 to M10, seven architecture
decisions); rules 01, 06, 07, 08 extended and 11-screens.md new; FR-144 to FR-234; decision cards Q22 to Q37.

## 2026-11-13 M5 World and seams for v2 (archived)

Entries in `docs/journal/archive-M5.md`: engine half, UI half, review fix round (19 findings), QA fix round (FR-235).
The continent world (two Great Power islands of 4 provinces each, Arvelia as the land bridge, Sundmark, Lorran and
Pellis on islands), minor nations apart from `nations`, `state.diplomacy` by pair, intents, `ctx.rngFor`, province and
minor borders on the map, the minor tile panel. FR-144 to FR-160 and FR-235 tested; 976 unit tests, Playwright 24
passed, 1 skipped; every v1 baseline unchanged on two-islands. Merged as PR 23 (main 0bfd870).

## 2026-11-13 M6 Diplomacy (archived)

Entries in `docs/journal/archive-M6.md`: engine half, UI half, review fix round (20 findings), QA fix round (FR-236 to FR-241)
and the fixes of its review. Five diplomacy order kinds stored as intents, the diplomacy phase before trade, relation points,
trade policies, the scripted answers and peace offers; the Diplomacy screen in two panes, Accept Offer and one shared Modal.
FR-161 to FR-181 and FR-236 to FR-241 tested; 1283 unit tests, Playwright 30 passed, 1 skipped; every v1 baseline unchanged.
Merged as PR 24 (main 2a60a3b). Open: the decision card "who receives a grant" (review fix round decision 3).

## 2026-11-13 M7 Nation-to-nation trade (archived)

Entries in `docs/journal/archive-M7.md`: engine half, UI half, review fix round (20 findings), QA fix round (FR-251 to FR-258) and
the review of the QA fix round (FR-259). The partners market on the continent (minors offer and buy, favourite partners, barriers),
the Board of Trade and the Deal Book, the scripted player trading through it, one money formatter. FR-183 to FR-198 and FR-242 to
FR-259 tested; 1458 unit tests, Playwright 32 passed, 1 skipped; every v1 baseline unchanged. Merged as PR 25 (main d16afa7).
Open: card Q47 (the World market's greyed "−").

## 2026-11-13 M8 Armies (archived)

Entries in `docs/journal/archive-M8.md`: engine half, UI half, review fix round (20 findings, FR-260 to FR-262), QA fix round (FR-263 to
FR-269) and the review of the QA fix round (FR-270, FR-271). Regiments, one army per country per province, recruit / march / disband
orders, upkeep and its forecast, the scripted garrison; the map markers and march arrows, the Army screen and the Armoury. FR-199 to
FR-215 and FR-260 to FR-271 tested; 1709 unit tests, Playwright 35 passed, 1 skipped; every v1 baseline unchanged. Merged as PR 26
(main c91f2fd). Open: decision 1 of the review fix round (the reserve step at turn 33) and decision 2 (warn, do not refuse) for Nathan.

## 2026-11-13 M9 War and the attack screen (archived)

Entries in `docs/journal/archive-M9.md`: engine half, UI half, review fix round (17 findings, FR-274, FR-275), QA fix round (FR-276 to
FR-280) and the review of the QA fix round (FR-281). Attacks as `moveArmy` intents, one battle per attacked province in the combat phase,
conquest, colonies and the conquest game over, the scripted war on minors; the Attack and Battle screens, the red attack arrow, the art pack
in the war screens. FR-216 to FR-228, FR-230 to FR-234, FR-272 to FR-281 tested; 1885 unit tests, Playwright 36 passed, 1 skipped; every
v1 baseline and FR-260 unchanged. Merged as PR 27 (main f817da2). Open: the cards of the M9 decisions (Attack button, crossing strikes, ramp).

## 2026-11-13 M10 Council of Governors, engine half (archived)

Entry in `docs/journal/archive-M10.md`: `engine/council/council.ts` (meeting turns, standing, nominees, one ballot per province,
the count, the winner), the `council-met` event and the Council game over in `resolveTurn`, the API the UI half builds on, and
the decision cards Q50 to Q56. FR-290 to FR-296, FR-302 and FR-305 tested; 1940 unit tests; every baseline unchanged.

## 2026-11-13 M10 Council of Governors, UI half and fix rounds (archived)

Entries in `docs/journal/archive-M10.md`: the UI half (FR-297 to FR-301, FR-303, FR-304: the Council screen, the news line, the
game-over line, the HUD's Next Council line), the review fix round (13 minor findings; FR-306 to FR-309), the QA fix round (FR-310
to FR-317: abstention reasons, the player first, the projection, the room at game over) and its review (F1, F2). 2001 unit tests,
Playwright 38 passed, 1 skipped; every baseline unchanged. Merged as PR 28 (main 69ed08b).

## 2026-11-14 M11 Ink-and-wash restyle (NR-032; FR-318 to FR-338)

Size: L, plan-lite (spec fc01b05: FR-318 to FR-338, cards Q60 to Q76). Branch `claude/m11-ink-restyle`, not pushed. Lane 1
alone (the table, its guards, the picture component, the tokens), then lane 2 (map) and lane 3 (lists, dialogs, HUD) in
parallel on lane 1's commit, importing only; then the closing step.

### Lane 1: the table, its guards, InkPicture and the tokens (FR-318, FR-319, FR-320, FR-329)

One agent (Opus 5.5 xhigh: shared code every lane imports; no advisor call). Plan-lite:
- Change: `art/inkArt.ts` complete; `InkPicture` in `art/ArtPicture.tsx` (the three war and Council pictures through it); two
  `globals.css` rules; ground and halo tokens, rail, minor and province colours; `.gitattributes`; the FR-085 map tests moved
  unchanged from `icons.test.tsx` to `mapIcons.test.tsx` (lane 2 rewrites them).
- Consumers: lanes 2 and 3 (API in `docs/ARCHITECTURE.md`, Components, last paragraph).
- Tests: FR-318, FR-319 `ui/inkArt.test.ts` (each export by enum, INK_ART_FILES against the manifest, the source scan,
  `.gitattributes`, FR-322/FR-323 rules on the continent); FR-320 `ui/inkPicture.test.tsx`; FR-329 `ui/palette.test.ts`.
- Verify: the gate; Playwright on the specs the pictures and tokens can move (m5-world, m8-armies, m9-war, m10-council).
- Objection: `--color-minor` had to move far (decision 1), and it now differs from the nation colours mostly by darkness.

Red (`.gate/m11l1/red.txt`): `Test Files 3 failed | 2 passed (5)`, `Tests 33 failed | 41 passed (74)`: `(0 , terrainArt) is not
a function` (and the other new exports), `undefined --color-map-halo`, `ENOENT ... .gitattributes`, `img[data-art-inline]:
expected -1 to be greater than or equal to 0`, the scan naming `army/armyView.ts` and `styles/tokens.css` (a pack file in a
comment). The moved FR-085 tests and FR-320's one-img guard passed before (a move and a guard).

Decisions (defaults, nobody to ask):
1. `--color-minor` #5e7c90 -> #26362c (dark slate green), not a plain darkening: the slate darkened to 3:1 on the halo
   (#4b6373) falls to 10.5 from nation 1 under protanopia (FR-154 needs 20), and stays below 20 down to near black (#192127).
   An exhaustive search gives #26362c as the colour nearest the old slate (ΔE76 35.0) that passes every palette test.
   `--color-province-border` #7a6e5e -> #6a5f51 (plain darkening, 3.00:1). Objection: the minor's colour-blind margin to
   nation 1 is 20.0 and its line is close to the rail's ink (ΔE76 12.5); alternatives on the card list below.
2. `INK_ART_UNUSED` must list `city/city-ground.png` (FR-318) while FR-272's and FR-319's scans forbid the text under
   `src/app`: the entry writes the name in two parts, with a comment. Objection: a text workaround; the cleaner fix is a
   scan that skips `INK_ART_UNUSED`, which would change an existing test.
3. One comment in `components/army/armyView.ts` named `map-ui/army-attack.svg`; FR-319's scan forbids it, so it now says
   `ATTACK_ARROW_ART` (comment only; the file is outside lane 1's list and no lane owns it).
4. `git add --renormalize` changed one blob: `terrain-demo.html` back to its supplied bytes (two CRLF blank lines the
   autocrlf commit had stripped; it now equals `docs/art/ink-and-wash-SHA256SUMS.txt`). Every other pack file is unchanged.
5. Beyond the brief's API: `STATION_ART_PX` (12) and `GROUND_ART_PX` (512) as separate constants (STATION_ART and
   GROUND_ART hold URLs only), `artInfoOf(url)`, `InkArtFile` / `InkFamily` / `InkAnchor` types, and `data-art-anchor` on
   every InkPicture (the bottom-centre CSS rule keys on it). `improvementArt` gives a picture only for integer levels 1 to 3.
6. Playwright: only the four specs the change can move (the workflow's instruction); the whole suite runs at the closing step.

Measured (the palette test's WCAG formula): on the halo #c8b18a nation 1 3.44:1, nation 2 3.23:1, minor 6.14:1, province
3.00:1; rail #494539 on grass #a6b282 4.24:1. Minor vs nation 1 / nation 2 / bad: ΔE76 62.6 / 50.9 / 67.7; deuteranopia
20.0 / 49.9 / 43.6; protanopia 20.2 / 48.6 / 23.8.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the change | `npx vitest run` on the 5 files (`.gate/m11l1/red.txt`) | `Test Files 3 failed \| 2 passed (5)`, `Tests 33 failed \| 41 passed (74)` |
| FR-318, FR-319, FR-320, FR-329 | the same 5 files (`green3.txt`) | `Test Files 5 passed (5)`, `Tests 74 passed (74)` |
| Unit tests | `npm test` (`test-final.txt`) | `Test Files 102 passed (102)`, `Tests 2035 passed (2035)` (+34 on 2001: inkArt 20, inkPicture 10, palette 4) |
| v1 and v2 baselines unchanged | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`, `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (the three of M6); exit 0, no output |
| Build | `npm run build` (`build.txt`) | `✓ Compiled successfully in 3.9s`, `✓ Generating static pages (4/4)` |
| Pictures and tokens in the app | `PORT=3311 npx playwright test e2e/m5-world.spec.ts e2e/m8-armies.spec.ts e2e/m9-war.spec.ts e2e/m10-council.spec.ts --workers=1 --reporter=line` (`pw.txt`) | `4 passed (22.3s)` |
| Borders and Armoury in the browser | a one-off Playwright check at 1280x720 (`.gate/m11l1/pw/`) | `minor-border stroke rgb(38, 54, 44)`, `province-border stroke rgb(106, 95, 81)`, 7 Armoury pictures `ok:true`, `console errors []` |
| Pack bytes | `git add --renormalize public/assets/ink-and-wash`; `git diff --cached --stat` | `terrain-demo.html \| 4 ++--` (now the supplied checksum `39c3dbdf...`) |

How to see it: a new game looks as before except the minors' dashed borders and name-tag frames (now dark slate green, also
the minors' army chips) and the dotted province lines (darker warm grey); Capital > Armoury and the Army screen show the same
regiment pictures. Cards for the closing step: Q67 now carries the minor colour (keep #26362c; or the hue-kept near black
#192127; or relax FR-154's colour-blind distance for the dashed minor line). Left for the closing step: FR-154's status cell
still quotes #5e7c90 and #7a6e5e; the journal passes 400 lines (archive M10's UI half).

### Lane 3: lists, dialogs, HUD and the tile info panel (FR-331 to FR-334, FR-336's dialog share)

One agent (Opus 5.5 xhigh; no advisor call), parallel with lane 2 in the same checkout. Plan-lite:
- Change: decorative `InkPicture inline` (1.25em) in 15 components: goods before every commodity name, grade and labour
  pictures, civilians' figures, buildings on card heads, panels, titles and buttons; `ArmouryItem.grade` (a view field).
- Consumers: the player. Tests: FR-331 commodityIcons, transportPopup, dealBook, warehouseAndHud, armouryDialog; FR-332
  capitalDialog, armouryDialog, listArt; FR-333 and FR-334 listArt (new), warehouseAndHud; e2e m4-1, m4-3, m11-lists (new).
- Verify: the lane's 11 test files, `npm test`, lint, tsc; Playwright and the browser at the closing step (lane rule).
- Objection: the Armoury's widest cost line keeps only 4.9 px to spare; a longer cost text would wrap it.

Red (`.gate/m11l3/red.txt`): `Test Files 7 failed | 4 passed (11)`, `Tests 17 failed | 174 passed (191)`: `expected 'svg' to
be 'img'`, `expected [] to deeply equal [ 'buildings/railyard.png' ]` and the like for each new picture.

Decisions (defaults, nobody to ask):
1. The Transport popup's title shows the railyard (not in FR-334's list): FR-335 removes `UI_ICONS.transport`, its old
   glyph, and the railyard is the HUD button that opens it. Objection: one picture more than the FR names.
2. No list needed a smaller picture: Tailwind's preflight gives every element `line-height: 1.5` (buttons too, through
   `font: inherit`), so a 1.25em picture stays inside the line and no row, button or card head grows. Widths, measured with
   GDI+ Arial 12 px advance widths (the browser pane shows local files as static snapshots, so no script ran there): the
   Armoury's Light Artillery cost line 317.8 of 322.7 px (308.8 before), Hussars 315.1; the "At hand" lines wrap where they
   did. The Board of Trade's name column grows 4 px; its rows stay as high as their steppers.
3. The freight car's cost pictures only its labour (FR-332); Lumber and Steel stay text, as FR-331 does not list the line.
4. The tile info panel's Resource line has a picture only for a known resource: a hidden coal hill is never hinted (FR-095).
5. Not done here: the browser check and every Playwright spec (m4-1, m4-3, m11-lists written; m7-trade and m8-armies
   unchanged). While trying a static width harness I navigated an existing browser-pane tab (a `data:` page titled
   "Imperialism · Connected terrain") to it and could not go back.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the change | `npx vitest run` on the lane's 11 files (`.gate/m11l3/red.txt`) | `Test Files 7 failed \| 4 passed (11)`, `Tests 17 failed \| 174 passed (191)` |
| FR-331 to FR-334 | the same 11 files (`green2.txt`) | `Test Files 11 passed (11)`, `Tests 191 passed (191)` |
| Unit tests | `npm test` (`test-final.txt`) | `Tests 36 failed \| 2055 passed (2091)`: all 36 in lane 2's red files (about, accessibleNames, mapIcons, noEmoji, provinceMap, railLine, stacking, tileCursor, watchNation) |
| Baselines unchanged | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 4 problems (0 errors, 4 warnings)` (M6's three, lane 2's railLine); tsc errors only in lane 2's accessibleNames, mapGround and tileCursor tests |
| No engine, store or type change | `git diff fc01b05 -- src/app/engine src/app/store src/app/types` | empty |

How to see it (after the closing step's build): open Capital (building on each card head, goods on outputs and inputs,
grade and labour pictures, railyard on Transport), Board of Trade, Deal Book, Warehouse, the Transport popup, the Armoury
and an engineer's Construction options; the HUD's Warehouse, Capital and Transport buttons show their buildings.

### Lane 2: the map (FR-321 to FR-328, FR-330, FR-337; FR-336's map share)

One agent (Opus 5.5 xhigh; no advisor call), parallel with lane 3 in the same checkout. Plan-lite:
- Change: `map/MapGround.tsx` and `map/shoreline.ts` (a port of the demo's renderShoreline); in `Tile/` the tile picture,
  mineral marks, depot and port with station marks, civilians' figures, the corner brackets; in `MapView` the halos and the
  rail pieces (`railArtMatrix` in `railSegments.ts`); `hooks/tileCursor.ts` (canvas cursors); the About legend's halo.
- Consumers: the player; the closing step (FR-338's screenshots). Tests: FR-321 mapGround (new), territory; FR-322
  mapIcons, provinceMap; FR-323 mapIcons; FR-324 accessibleNames; FR-325 mapIcons, watchNation, stacking; FR-326
  watchNation, territory; FR-327 provinceMap, territory, about; FR-328 railLine; FR-330 tileCursor and noEmoji (new); e2e
  look, m5-world, cursor-icons, two-nations, islands, m11-map (new, FR-337).
- Verify: the lane's files, `npm test`, lint, tsc; the real `MapView` markup in the browser pane (no dev server: lane rule).
- Objection: FR-328's 3 px underlay fills the gap between the pack piece's two rails, so a link reads as a dark band with
  ties rather than the pack's light double rail (seen in the browser; for the QA pass and Q68).

Red (`.gate/m11l2/red.txt`): `Test Files 11 failed (11)`, `Tests 42 failed | 53 passed (95)`: `Cannot find module
'@/hooks/tileCursor'`, `Failed to resolve import "@/components/map/MapGround"`, `expected undefined to be 'goods/coal.png'`,
`expected [] to have a length of 8` (halos), `... not to match /box-shadow/` (the ring).

Decisions (defaults, nobody to ask):
1. Halos: all eight first, then the lines in FR-153's order: each halo lies before its line and no halo covers another
   border where two meet (the minor's dashes stay on top of a Great Power's line).
2. FR-324's "disjoint from the badge": two 14 px stations side by side reach 30 px from the right of the 40 px box, into
   the "L1" badge, and a port may share a depot's tile (queries.ts). Beside a level badge the two stack at the right edge
   (`.stationsStacked`). Objection: on that one kind of tile the port is not along the top edge.
3. FR-337 counts the files the map names (each `img` and SVG `image` in `map-scroll`); lane 3's three HUD pictures load on
   the first paint too and "each URL once" covers them. Counted offline: 16 files, 1,668,187 bytes on disk; the spec's
   "expected 14" left out Arvelia's level-1 forestry and mine. The budget of 16 is now met exactly: one more picture on
   the first map paint (a second improvement level, a new terrain) will break it.
4. Cursors: `useSyncExternalStore` whose snapshot is the tile's own cursor string, so a drawn cursor re-renders only the
   tiles that show it; a file starts loading the first time a tile asks (idempotent cache), no per-tile effect. jsdom
   loads no image, so the UI tests see `pointer` and print no act warning.
5. `useTileVisuals(possibleAction)` lost its unused `tile` argument and `terrainColor`; TileBase lost `backgroundColor` and
   gained `besideResourceMark` (the river marker moves to 18 px). `TERRAIN_TINT` is no longer read by any component.
6. watchNation's `--color-selected` token line went with the box-shadow check it belonged to (FR-326 replaces the accent
   ring); the token stays in tokens.css, now unused (closing step, with Q71's tints).
7. Seen in the browser: the flat ground-water colour past the map and the textured water meet at the map's bottom edge
   (a 48 px strip at 1280x720); the right edge lies under the HUD.

The browser check: `MapView` rendered in jsdom with plain CSS-module class names (rail to 2-7, a depot, 3-9 selected, a
desert and a tundra tile, 5-2's coal found), served statically with the pack and the four CSS files, at 1280x720. Not
done here: Playwright and the dev-server check (lane rule). For the closing step: run look, m5-world, cursor-icons,
two-nations, islands and m11-map; FR-338's screenshots.

| Claim | Command | Result (quoted) |
|---|---|---|
| Red before the change | `npx vitest run` on the lane's 11 files (`.gate/m11l2/red.txt`) | `Test Files 11 failed (11)`, `Tests 42 failed \| 53 passed (95)` |
| FR-321 to FR-328, FR-330 | the 11 files plus camera, inkArt, palette (`green-final.txt`) | `Test Files 14 passed (14)`, `Tests 170 passed (170)` |
| Unit tests (lanes 1 to 3) | `npm test` (`test-final.txt`) | `Test Files 106 passed (106)`, `Tests 2091 passed (2091)` |
| Baselines unchanged | `npm test` console | `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 nation 2 score at turn 40: [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (M6's three); exit 0, no output |
| No engine, store or type change | `git diff fc01b05 HEAD -- src/app/engine src/app/store src/app/types` | empty |
| The look in Chromium | the static render in the browser pane, 1280x720 | ground `1029 x 672` at `0, 0`; tile 2-9 at `105, 378`, `42 x 42`; `imgsBroken: 0` of `240` |
| A canvas cursor in Chromium | the pack's prospector and rail piece drawn into 32 px | `url("data:image/png;base64,iVBORw0KGgoAA...") 16 16, pointer` |

How to see it (after the closing step's build): a new game shows the sea, a sand rim and grass under the islands, a pack
picture on every land tile, the borders on a pale halo, coal and iron marks on Arvelia's mines; select a tile (corner
brackets), pick the prospector and hover 5-2 (its figure as the cursor), lay rail from the capital and build a depot as
e2e/look.spec.ts does (the rail piece on each link, the depot with its green station disc).

### Integration: the closing step (FR-335, FR-336, FR-338; the replaced rows)

One agent (Opus 5.5; no advisor call). Change: `icons.ts` cut to FR-335's list (`GI` 65 to 18 Game Icons), `icons.test.tsx`
rewritten; `TERRAIN_TINT`, the 19 `--terrain-*` tokens, `--color-selected` and their palette tests removed (Q71: no
component drew them); `e2e/m11-art.spec.ts` (FR-338); the replaced rows marked (FR-084, FR-085, FR-086, FR-087, FR-090,
FR-093, FR-121, FR-133, FR-154), the M11 statuses, card Q67's minor colour; ARCHITECTURE's Components; M10's UI half
archived. Objection: a new Game Icon now needs `GI` and the icons test's list changed too (deliberate: FR-335).

Red: the new icons test on the old `icons.ts`, `Tests 3 failed | 2 passed (5)` (`.gate/m11int/red-icons.txt`); the fit
check of decision 3 on the lanes' CSS, `1 failed`: `"goods/canned-food.png: Canned Food (14 px)"` (`red-fit.txt`).

Decisions (defaults, nobody to ask):
1. `GI` pruned with the tables (its other 47 icons were reached only through them); a test pins `GI` = the `UI_ICONS`
   values and `GiRiver`, and asserts the removed exports absent.
2. FR-086's tint test became "no `--terrain-*` token defined or named"; FR-154's two 3:1 tests went (FR-329's halo test
   covers both lines). No other test changed but FR-320's rule pin (decision 3).
3. Bug seen in the first screenshots: the Board of Trade's "Canned Food" ran 14 px into its price. Root cause: preflight's
   `img { max-width: 100% }` makes a picture count as 0 wide when a table sizes a column. Fix: `max-width: none` on
   `img[data-art-inline]`; regression check `expectFit` in m11-art (no inline picture's box overflows). Only that cell did.
4. FR-336's diff check is against `origin/main` (6138531, the branch's base): the local `main` is stale (dcccaa1).
5. FR-338's rail and depot follow look.spec (a depot may not stand next to the capital); it also fails on any pack
   request with an error status. Left for the orchestrator: `docs/report/roadmap.json` (Q60 to Q76), the review, QA.

| Claim | Command | Result (quoted) |
|---|---|---|
| Unit tests, baselines | `npm test` (`test-final2.txt`) | `Tests 2088 passed (2088)` (-3: icons -1, palette -2); `FR-125 seed 1: ... t40 1493/650 (2.30)`; `FR-260 ... [[1,1419],[2,1451],[3,1441],[4,1469]]` |
| Lint, types | `npm run lint`; `npx tsc --noEmit` | `✖ 3 problems (0 errors, 3 warnings)` (M6's three); exit 0, no output |
| Build | `npm run build` (`build-final.txt`) | `✓ Compiled successfully in 3.3s`, `✓ Generating static pages (4/4)` |
| e2e, all specs | `PORT=3311 npx playwright test --workers=1 --reporter=line` (`pw-final.txt`) | `45 passed (3.4m)`, `1 skipped` (cursor-icons' rail case, `fixme` before M11); before the fix also `45 passed` |
| FR-336 | `git diff origin/main -- src/app/engine src/app/store src/app/types` (and `tests/engine tests/store`) | empty, empty |

Seen in the five FR-338 screenshots: as the lanes reported, the 48 px flat-water strip under the map and the rail as a
dark band with ties (Q68); the Next.js dev badge bottom-left (dev server only).
