# Journal archive: the "Resuming here" block before M12

Moved from `docs/journal.md` on 2026-11-16 (M12 close-out), unchanged, so that the block there stays at 15 lines (FLOW). It holds the
per-milestone status lines of M0 to M11, the open decisions and notes of that time, the housekeeping record, and the "Carried forward"
review notes of M4.1 to M4.4 and M8. Some are old: the current state is in the journal's "Resuming here" block, in
`docs/requirements.md` and on the progress page.

## Resuming here (as of 2026-11-14, M11 merged)

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
- 2026-11-14 M11 Ink-and-wash restyle (NR-032, FR-318 to FR-356, cards Q60 to Q78) built on `claude/m11-ink-restyle`
  (lanes 1 to 3, the integration step, the review fix round, the QA fix round and its review, entry below), merged
  by the orchestrator after its gate on 84b2333: 2111 unit tests, lint 0 errors, tsc and build clean, Playwright 51
  passed and 1 skipped (--workers=1); engine, store and types unchanged; the only `public/` change restores
  `terrain-demo.html` to its supplied sha256 (now guarded by `.gitattributes`). Progress page republished.
  Carried: nation 2's blue is 2.97:1 on the grass; the Capital dialog's Clothing card and "Cotton or Wool" wrap were
  already cut at 1280x720 before M11.
- Open decisions (defaults in force, all on the progress page): Q22 to Q59; the most important are Q51 (Council
  threshold), Q34 and Q35, and Q57 to Q59 (new from the M10 QA round: the removed "No tile selected" hint; the news
  line names the 1st nominee first while the screen puts the player first; abstention reasons in relation points
  while the Diplomacy screen shows levels). M11's Q60 to Q78 are on the page too.
- Not verified yet: a winning Council vote on screen (unit tests only); Firefox and WebKit never run; seed 4's
  computer never campaigns. Possible flaky test: `tests/engine/lintGuard.test.ts` timed out once under load.
- Carried from M8: the FR-213 garrison threat-recruit asks for Regulars, which a real game can never raise. Next.js
  picks a lockfile two folders up as the project root (set `turbopack.root` / `outputFileTracingRoot` in `next.config`).
- 2026-11-14 housekeeping (Nathan: "Yes, clean up"): the merged branches `claude/v2-plan`, `claude/m5-world` to
  `claude/m10-council`, `claude/v2-handoff` and `claude/m11-ink-restyle` deleted locally and on GitHub, and the old
  `decisions` worktree removed (it had no uncommitted work). Then (Nathan: "Yes, check and remove") 12 of the 17
  v1-era worktrees removed: every one's commits were already in main and it had no changes. The other 5 held uncommitted source
  edits from 2026-11-02 to 11-04 (Nathan: "Back up, then remove"): each was committed to a local branch
  `backup/v1-wip/<worktree>` (not pushed; agent-a0ebafd9159ca6197 ad3e9e3, 86 files; agent-a75ac2363238a25c6
  5a06243, 28; agent-a4c9cb9416fb072cc 3146ae7, 18; agent-a8c6b9c5d3e0870d8 3d91a96, 68; agent-ab5572a63222c682f
  0b7b4ea, 58), then removed. Worktrees left: the main checkout, this session's and `play`.
  2026-11-16 (M12 review, D9): the five `backup/v1-wip/*` branches no longer exist (`git for-each-ref` lists none, and
  no ref contains the five commits). The commits themselves are still in the object store, unreferenced, so a `git gc`
  can prune them once they are older than its expiry (two weeks by default). `git branch backup/v1-wip/<worktree> <hash>`
  restores one. Who deleted the branches is not recorded; Nathan decides whether to restore them.

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
