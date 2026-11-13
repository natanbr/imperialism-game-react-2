# Imperialism (1997) rules knowledge base

Compact, topic-split rules of the original game (Frog City / SSI, version 1.1) for coding agents. It replaces the PDF manual and the older `docs/manual.md`. Built on 2026-11-02 from the manual plus fan-wiki pages, both official readmes, a Let's Play, player game reports and forum threads. Updated 2026-11-12 with Let's Play screenshots (prices, ledgers, Armoury costs, Council votes), the in-game tech texts, a 1998 economics guide and a new screens file.

## How to use (agents)

1. Read **only the topic file you need**. Each is about 100-180 lines and starts with a 4-line "Implementation notes" block telling what the code must model and where the code disagrees (`CODE MISMATCH:`).
2. Never open the PDF. If a number you need is missing, it is listed in `gaps.md` with the best way to close it; do not guess silently: mark your assumption `[?]` in the code comment or the spec.
3. Rules are for **Imperialism 1 only**. Imperialism II and Trade Empires pages exist on the same wiki and have different numbers; they are not used. Every Source entry of the 2026-11-12 additions says which game it belongs to and why (Let's Play screenshots, the 1997 manual and the readmes are Imp1; wiki pages that mix in Imperialism II values and fan remake pages such as `imperialism-remake-definition.readthedocs.io` are marked `[?]` or not used, see gaps.md F11).
4. Decision NR-005: gold = $200 per unit, gems = $500 per unit (manual values).
5. For v1 (map, workers, transport, industry, world-market selling, score) read 02, 03, 04, 05, 06, and 01 for the turn order. 07, 08, 10 are later phases; 09 is read when a tech gates a feature.
6. When you build or review a screen (Board of Trade, Deal Book, Diplomacy, Armoury, army map, battle, battle result, Council vote), read `11-screens.md`: it lists what the original screen shows, its layout and controls, and links screenshots.

## Index

| File | Contents |
|---|---|
| `01-turn-and-victory.md` | turn order and phases, calendar (Spring 1815, 4 turns a year), starting state and difficulty levels, Council of Governors (votes, nominees, meeting years), score |
| `02-map-terrain-resources.md` | world layout (7+16 nations, 120 provinces), terrain and resource table, hidden minerals, yield per development level (0-3), tech that unlocks each level |
| `03-civilian-units.md` | the eight civilian units: what they do, cost to build, cost per job, durations, Developer rules, forts |
| `04-transport.md` | rail, depots, ports, connection rules, freight-car capacity, what can be shipped, town development (free materials and goods) |
| `05-industry-and-labour.md` | buildings, recipes with exact input/output and labour, capacity steps and expansion cost, workers, training, migration, food and canned food, power |
| `06-trade-and-market.md` | bids and offers, merchant marine and ships, price levels and observed prices, subsidies, boycotts, money, credit, upkeep |
| `07-diplomacy-and-minors.md` | overtures (consulate, embassy, pact, alliance), relationship levels, Minor Nation behaviour, colonies, intervention |
| `08-military.md` | all 27 regiments and 8 warships with stats, costs known, fort and entrenchment rules, combat rules, landings, rail deployment |
| `09-technology.md` | the 28 technologies with prerequisites, price, years and effects |
| `10-ai-behaviour.md` | what is known about how computer powers decide (observations, not algorithms) and a checklist for a scripted AI |
| `11-screens.md` | one section per original screen: what it shows, layout, controls, screenshot links (Board of Trade, Offer Sheet, Trade Book, Deal Book, Diplomacy, Armoury, army map, battle, battle result, Council vote, others) |
| `gaps.md` | every rule or number still unknown, ranked for v1, with the best source to close it and source conflicts |

## Citation legend

| Tag | Meaning |
|---|---|
| `[M pN]` | the 1997 manual, PDF page marker N of the text extract (`===== PAGE N =====`). The printed page number is N minus 4 (marker 49 = printed page 45). |
| `[W1]`, `[W2]` ... | a web source; the URL is in the "Sources" list at the bottom of the same file (numbers restart in every file). Wiki = imperialism.fandom.com; readmes = the v1.0 and v1.1 readme pages on that wiki; LP = lparchive.org Imperialism by Kangra (Imp1, Spring 1815 start; screenshot URLs are in the Sources lists of 01, 06, 07, 08 and 11). |
| `[06:W31]` | used only in `gaps.md`: tag `[W31]` in the Sources list of file 06 (same pattern for 01, 07, 08, 11). |
| `[?]` | unverified or inferred; the row says what it was inferred from. Treat as a default that a later source may change. |
| `CODE MISMATCH:` | the rule differs from a value or model in `src/app/` (types, `definisions/`, `constants/`, systems). |

Source quality, best to worst: manual and readmes > fan-wiki rule pages > player game reports > forum posts. Where manual and web disagree both are shown and `gaps.md` section F lists the pick. Some wiki pages (for example `Trade_(Imp1)`) mix in Imperialism II numbers; those rows carry `[?]`.

## Not in this knowledge base

Installation, copy protection, tutorial scripts, historical-scenario prose, credits, full hot-key lists (a few keys are in 11-screens.md and 08). Screen layouts are in `11-screens.md`. Paraphrased throughout; no manual paragraph is copied. Screenshots are linked, never stored in the repo.
