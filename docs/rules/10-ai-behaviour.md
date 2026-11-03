# 10 - AI behaviour (computer Great Powers and Minor Nations)

> **Implementation notes**
> - For the later AI phase (v3). Nothing here is a documented algorithm: the original AI is known only from the manual, the two readmes and player reports. Treat every row marked `players: n` as an observation by n independent players, not a rule.
> - Design target (project decision, not original): an AI nation is a function `view -> Order[]`; the original AI is deterministic enough to be "extremely predictable" for a watching human, so a heuristic bot (not a learned one) can imitate it.
> - Minor Nations are scripted markets, not players: they never attack, sell raw materials, buy goods, accept every consulate/embassy/pact/peace.
> - No AI code exists. Open questions (decision thresholds, tech order, build orders) are listed in gaps.md.

Source tags: `[M pN]` manual PDF page marker; `[W#]` web source (see Sources); `[?]` unverified or inferred. `players: n` = independent reporters.

## 1. Documented by the publisher (manual, readmes)

| Statement | Source |
|---|---|
| Computer Great Powers have several "personalities"; they pursue varied trade and military strategies; hard for a human to see directly | v1.1 readme [W1] |
| v1.1: the AI now picks strategies appropriate to its geography; strategic and tactical decisions improved, especially fort defence | [W1] |
| Bug fixed in v1.1: the AI could buy technology one turn before humans (so after 1.1 it does not buy earlier; later behaviour is not stated) | [W1] |
| Difficulty gives the AI advantages in cash, warehouse, relations and (Nigh-On-Impossible) army; it does not become smarter | [M p9] [M p10] [W2] |
| AI accepts peace only when it got what it wanted and cannot take your capital now; Minor Nations always accept peace | [M p78] |
| AI proposes alliances when threatened; it accepts them in a disadvantage; it wants alliances with the militarily balanced | [M p85] [M p81] |
| All fighting, including AI vs AI, uses the tactical rules | [W1] |
| Between Great Powers, a subsidy only changes the price of the subsidiser's own goods | [W3] |
| Computer players keep taking over when a human leaves a multiplayer game | [W3] |

## 2. Economy and start-up (observed)

| Behaviour | Data | Source |
|---|---|---|
| Capital site | favours food: 5-6 grain, 2 fruit, 1-3 fish; not forest-first; some poor picks (a desert capital with 6 grain) | players: 2 [W4] [W5] |
| Early builds | a fort first (several by Winter 1817), then very slow rail (1-5 sections by 1816-17), first ports on timber/scrub sites by 1817, first mines visible about 1820 | players: 1 (3 games) [W4] [W6] |
| First army units | Fall 1819 to Summer 1823; AIs keep military low until 1820-25 | players: 1 (4 games) [W6] |
| Merchant marine | 6-8 holds at start, 12-16 by 1817-21; some AIs build Traders (inefficient) | players: 1 (5 games) [W6] [W4] |
| What they sell | 1-4 clothing, furniture or hardware per turn each; sometimes canned food; occasionally steel to the human | players: 1 [W4] |
| What they bid on | cotton, wool, timber, coal, iron (all seven in 1815-17), competing for the same Minor Nation goods | players: 1 [W4] |
| Consulates at start | Orange 0, Light Blue 4, Dark Blue 2, Red 4, Purple 4, Yellow 4, Green 3, plus one random each | one author [W7] [?] |
| Subsidies | usually 5%, sometimes 10% or more; one AI placed 10% on a rival's neighbours | players: 1 [W6] |
| Port building | build many ports; AI can place ports and depots on hills and mountains from the start (humans cannot) | players: 2 [W8] [W9] |
| Town growth | the AI does not know about industrialisation but knows all minerals in its own country | [W10] |
| Finances | reports conflict: deeply negative treasuries without repossession vs "loaded with cash" at Nigh-On-Impossible | players: 2 [W11] [W7] |
| Technology | AIs buy techs and upgrade, but fall behind (old fleets scrapped, units not upgraded) | players: 1 [W12] |
| Era 3 | AI is best at military then: forts backed by artillery | players: 1 [W13] |

## 3. War (observed)

| Behaviour | Data | Source |
|---|---|---|
| Trigger | military balance is lopsided plus bad relations; more lopsided = more likely and less likely to make peace | players: 2 [W14] |
| Pile-on | a country that keeps losing gets more declarations; the weakest power is declared on by most others | players: 3 [W14] [W15] |
| Target choice | often picks a Minor Nation market at random and declares war on whoever controls it; resource-rich neighbours reachable by land preferred | players: 2 [W16] [W17] |
| Early wars | first declarations 1822-1832 in several games; Britain declares on France about 1821-22 in the 1820 scenario | players: 3 [W6] [W14] |
| Sequence | declaration visible a turn early (the AI never looks at the screen), naval movement first, then blockade, then landing | players: 1 [W18] [W19] |
| Attack force | "attacks with a minimal force" (3-9 units early, 50+ late landings) | players: 1 [W19] |
| Defence | spreads forces over provinces, moves heavy artillery into threatened provinces; reinforcements arrive as a second battle; leaves light artillery exposed; never uses Generals to move armies | players: 1 [W18] [W19] |
| Capital defence | stays in the fort rather than charging; limited by transport capacity so it cannot reinforce everywhere | players: 2 [W20] [W21] |
| Do not underbuild | do not be among the two weakest in military strength; the AI is impressed by total arms in your units; one Ship-of-the-Line (5 arms) is the first buy | players: 3 [W18] [W22] [W23] |
| Warning sign | when AIs start making alliances the weakest power is next | players: 2 [W22] [W24] |
| Grudge | a power you fought never forgives; its peace offers are tactical | [W19] |
| Navy | fleets are one or two ships; they enter your seas; they prefer an extended blockade before landing; AI sometimes sends a Ship-of-the-Line into a sea at random | players: 2 [W18] [W25] |
| After a capital falls | AIs grab the anarchy provinces; no declaration needed | players: 1 [W26] |

## 4. Peace and alliances (observed)

| Behaviour | Data | Source |
|---|---|---|
| Peace | accepts at any time but re-declares if it thinks you took too much; accepts a ceasefire and restarts the war when its victim is nearly dead; refuses while its combined navies choke you | players: 3 [W25] [W19] [W27] |
| Alliances | first ones seen 1820-23, many broken in the 1840s-50s; AIs do not honour an alliance if the military balance is lopsided "unless relations are max" | players: 3 [W28] [W29] |
| Offers to the human | alliance offers arrive from several AIs in 1820-33 | players: 2 [W28] |
| Ganging up | the weakest power and any aggressor attract wars from many sides ("the whole world is at war with Mone") | players: 2 [W15] [W30] |

## 5. Minor Nations as AI

- Sell the raw materials they have; export lists are ranked by quantity; buy finished goods at the world price; accept everything non-hostile; request help only when attacked. [M p78] [W31]
- Choose trade partners by relations and subsidy; after a colonisation they trade through the mother country. [M p67] [W32]
- AIs colonise by "buying power": 13 of 16 Minor Nations were AI colonies by 1851 in one game. [W33]
- Colonies of AIs are often boycotted to everyone else. [W30]

## 6. Personalities (anecdotes)

| Reported | Source |
|---|---|
| Britain is the strongest AI with "awesome" diplomacy | players: 1 [W5] |
| One game: weak navy / defensive infantry with strong navy / cavalry heavy / balanced across four AIs | players: 1 [W12] |
| Army composition reports conflict (artillery + cavalry; many Regulars; cheap slow infantry) | players: 3 [W13] [W22] |
| AIs build and upgrade light cavalry, almost never Skirmishers or Sharpshooters | players: 2 [W19] [W34] |

## 7. A v3 scripted-AI checklist (design, not original)

1. Pick the capital with the most food within the starting radius.
2. Early: build a fort, a few ports on timber, 6-8 holds of merchants, buy raw materials from 3-4 Minor Nations, sell 1-4 goods per turn.
3. From about 1820: raise arms to stay out of the bottom two in military strength; buy techs when cash allows.
4. Declare war when strength is lopsided and relations are low; pick Minor Nation markets near the capital; attack with 3-9 units early; ally with the strongest neighbour when weak; accept peace after winning something.
5. Colonise Minor Nations by trade volume + subsidy + grants; embassy then pact then join.
6. Never use industrialisation; do not look at others' pending war declarations.

## CODE MISMATCH

- None applicable: no AI code, no personalities. The project plan (`docs/REVIVAL_PLAN.md`) requires every nation to act only through the same `Order` interface; the rules above show that the original AI also used the same player screens (bids, offers, subsidies, overtures, unit moves).

## Sources

- [M] Imperialism manual (1997), text extracted with PDF page markers.
- Items below were collected by a research agent from the listed pages and not all re-opened by me; each is a player report.
- [W1] v1.1 readme https://imperialism.fandom.com/wiki/README11.TXT
- [W2] https://imperialism.fandom.com/wiki/Difficulty_(Imp1) and Normal
- [W3] v1.0 readme https://imperialism.fandom.com/wiki/README.TXT (section II multiplayer, VIII C)
- [W4] https://imperialism.fandom.com/wiki/Key_1815_purple
- [W5] GameFAQs guide by Ed Randtke, Wayback copy https://web.archive.org/web/2022/https://gamefaqs.gamespot.com/pc/197614-imperialism/faqs/16042
- [W6] https://imperialism.fandom.com/wiki/ZYdAimp_(Imp1)_Purple, Key_Scotland_(Imp1)_Blue, Ocpal_(Imp1), Brete_(Imp1)
- [W7] https://imperialism.fandom.com/wiki/Trade_(Imp1) (one author; mixes Imperialism II)
- [W8] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple
- [W9] geosoft.org Imperialism Game Strategy site (Introductory level), Wayback https://web.archive.org/web/20010630151102/http://www.geosoft.org/igs/1/g/ili.html
- [W10] https://imperialism.fandom.com/wiki/Town_development_(Imp1)
- [W11] https://sei.bplaced.net/Spiel-Editor-Imperialismus/ (savegame editor author)
- [W12] https://lparchive.org/Imperialism/Update%2011/ (strategies of the four AIs) and Update 16, 19
- [W13] geosoft.org hint page, Wayback https://web.archive.org/web/20010630151102/http://www.geosoft.org/igs/1/hint.html
- [W14] Apolyton thread https://apolyton.net/forum/other-games/other-games-aa/169257-imperialism-recovery-of-france-scenario
- [W15] GOG forum https://www.gog.com/forum/imperialism_series/imperialism_1_strategy_normal
- [W16] GameFAQs guide by Ed Randtke (see W5)
- [W17] https://imperialism.fandom.com/wiki/Hengtom_(Imp1)_Red
- [W18] geosoft.org Strategic Warfare, Wayback https://web.archive.org/web/20010630151102/http://www.geosoft.org/igs/1/g/sw.html
- [W19] https://imperialism.fandom.com/wiki/Military_strategy_guide
- [W20] https://lparchive.org/Imperialism/Update%2016/
- [W21] https://imperialism.fandom.com/wiki/Ottoman_Empire_1820
- [W22] GOG forum https://www.gog.com/forum/imperialism_series/imp_1economic_and_diplomacy
- [W23] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple
- [W24] see W22
- [W25] https://imperialism.fandom.com/wiki/Recovery_of_France_1820
- [W26] GOG forum https://www.gog.com/forum/imperialism_series/early_fighting_in_imp1
- [W27] https://lparchive.org/Imperialism/Update%2008/ and Update 13
- [W28] https://imperialism.fandom.com/wiki/Ocpal_(Imp1), Nepal_(Imp1)_Purple, Brete_(Imp1)
- [W29] geosoft.org John Forr page, Wayback https://web.archive.org/web/20010630151102/http://www.geosoft.org/igs/1/g/uisg.html
- [W30] https://lparchive.org/Imperialism/Update%2012/ and Update 09
- [W31] https://imperialism.fandom.com/wiki/Minor_nation_(Imp1)
- [W32] https://imperialism.fandom.com/wiki/Minor_nation_(Imp1)
- [W33] https://imperialism.fandom.com/wiki/Nepal_(Imp1)_Purple
- [W34] GOG forum https://www.gog.com/forum/imperialism_series/skirmisherstactics_in_imperialism_1
