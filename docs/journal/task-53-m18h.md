# Task 53 — M18h town settlement and saved games

T-02 on `claude/m18h-towns` covers FR-619, FR-620 and FR-626. The five defaults retain the status **inferred, owner to confirm**. [Town specification](../specs/m18h-towns.md#open-questions-and-inferred-defaults)

The turn engine advances one clock per connected eligible province after factory completion, combat and the connectivity check. A chain offers its first material on connected settlement six and takes two further qualifying settlements per upgrade. Closing the route pauses growth and offers. Losing support clears the unfinished upgrade for that chain. An eligible captured Great Power capital can start at tier one immediately. T-03 can read each owner's mature bundles for freight and receipts.

The existing v1 revision field records `m18h` on the first settlement of a province world. An imported M18d save can already contain a fishing-era replay checkpoint. If settlements occurred after that checkpoint, the reader anchors replay at the imported position with its paid Orders. In the M18d fixture, the old checkpoint was turn 10 and the imported position was turn 15, after a $500 consulate. Both the live continuation and replay retain the payment.

| Check | Observed result |
|---|---|
| Tests-first commit `901c8c5` | The growth suite could not load the missing system. Four integration cases exposed absent clocks and stale ownership. Three save cases failed, including the M18d loader picking turn 10 and offset 0 in place of turn 15 and offset 1. [Engine red](../../.gate/codex/53/red-engine.log) · [Save red](../../.gate/codex/53/red-save.log) |
| Town settlement and historical continuation | 41/41 focused tests passed across growth, conquest, river transport and v1 replay. The store cases compare successive live and restored game states and event logs. [Final focused run](../../.gate/codex/53/focused-final.log) |
| Full functional suite | 3,550/3,551 passed. The sole failure was the protected NR-038 serialized save hash at turn 10. The table below gives both affected hashes for T-05. [Final npm test](../../.gate/codex/53/unit-final.log) |
| Protected gameplay results | All 72 FR-597 records matched Task 52, with 37,557 Orders accepted in 2,810 turns, zero invariant or privacy changes and zero unpaid losses in idle runs. All four Two islands digests and twelve score/rail checkpoints matched. The minimum FR-125 ratio was 690/450 (1.533×), FR-545 had 15/24 peaceful wins, FR-546 had 17/24 earned-vote games, and FR-497 had 0/280 changed plans. FR-260 recorded zero unpaid losses and 160 healthy meals. [Task 52 base](../../.gate/codex/52/base-guards.json) · [T-02 candidate](../../.gate/codex/53/candidate-guards.json) |
| Compact v1 saves | The historical continent save occupied 111,446 characters at turn 11 and 201,801 at turn 40. The finished Large seed-1 random campaign used 252,146 of the 2,000,000-character budget. [Save compatibility run](../../.gate/codex/53/targeted-save-final.log) |
| TypeScript, production build and lint | `npx tsc --noEmit` exited 0. The build generated four static pages. ESLint found zero errors and the existing unused `capital` variable in the logistics test. [Types](../../.gate/codex/53/types.log) · [Build](../../.gate/codex/53/build.log) · [Lint](../../.gate/codex/53/lint.log) |
| Affected browser specs | 25/25 Chromium tests passed on port 3123 with one worker across `m12-save`, `m18e-new-game`, `m17-sea-war`, `m9-war`, `m11-map`, `m18d-terrain` and `m18-capital`. FR-339 first paint matched Task 52 at 20 pack files and 1,990,043 bytes. [Browser run](../../.gate/codex/53/browser.log) |

### Protected historical save comparison for T-05

The NR-038 test hashes two complete v1 saves from a seed-7 continent campaign with a 400-turn limit. Its first assertion stops execution on the turn-10 mismatch. A separate probe ran through the turn-10 Council and the turn-11 save, and replayed both. Neither position contained town progress. Replacing only the saved rules revision with `m18d` reproduced both prior digests. The protected assertions remain at their M18d values pending T-05 under FR-626 and FR-627. [Candidate measurements](../../.gate/codex/53/save-digests.log)

| Saved turn | M18d SHA-256 | T-02 SHA-256 |
|---|---|---|
| 10 | `e842158982c0889a30494b72cdd0bffcc6f85c2836f2bbb9619a0339fc282b05` | `1cd5a212843f098b0fa773e108ac6977e5b5658eceb9496ae066dcb6d799219d` |
| 11 | `15436a8c378d346598bda6ca9b41ac8aac1b14d9ec62981ee4638e2f63b8f847` | `78f6ae8d549f9361e8c46251b4f5e1a468a00bfc5582132936583218cf602b22` |
