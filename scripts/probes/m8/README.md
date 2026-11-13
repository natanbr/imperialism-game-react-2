# M8 upkeep-reserve probe

A measurement tool, not a test: it produces the reserve table in the M8 review fix round entry of `docs/journal.md`
(review E1, FR-213 (a)). Nothing here asserts anything. `npm test` does not run it (the root `vitest.config.ts`
includes `tests/**` only); `npx tsc --noEmit` and `npm run lint` check that it compiles and lints.

## Run (from the repo root)

```bash
# the default rules on seeds 1 to 4: 2:1 (before the review), 2:8 (after it), flat reserves of 4, 5, 6 and 8 turns
# (4:4 ... 8:8: fewer when fewer turns are left) and 4:10
npx vitest run --config scripts/probes/m8/vitest.config.ts
# other rules or seeds
RULES=2:1,2:8,5:5 SEEDS=5,6,7,8,9,10 npx vitest run --config scripts/probes/m8/vitest.config.ts
```

A rule is "upkeepTurns:endgameTurns" (`SCRIPTED_GARRISON` in `definisions/regiments.ts`): the reserve is the upkeep of
every turn left (this one included) in the last `endgameTurns` turns, else `upkeepTurns` turns of it.

Per rule, market and seed it prints each scripted nation's turn-40 score, its treasury, the regiments it lost for want
of money (`regiments-disbanded`, reason "no-pay") and the force size of its army in its capital province. "partners"
is FR-247's game (both nations scripted, the partners market); "world" is FR-260's (nation 2 scripted, nation 1 idle,
the world market).
