# M4.4 measurement probes

Measurement tools, not tests. They produce the numbers in the M4.4 entry of `docs/journal.md` ("What limits the
scripted player"): how labour limits the scripted player and what recruiting would give. Nothing here asserts
anything. `npm test` does not run them (the root `vitest.config.ts` includes `tests/**` only); `npx tsc --noEmit`,
`npm run lint` and `npm run build` do check that they compile and lint.

## Run (from the repo root)

```bash
# the probe: FR-140 player on the real newGame(), seeds 1 to 4, turns 1 to 40, nation 2 scripted, nation 1 idle
PROBE_OUT=out.json npx vitest run --config scripts/probes/m4-4/vitest.config.ts scripts/probes/m4-4/m44.probe.ts
node scripts/probes/m4-4/sum.mjs out.json          # score at turns 15 / 25 / 40, ratio to the frozen M4 player, workers
node scripts/probes/m4-4/show.mjs out.json 1,2     # one line a turn: labour, capacity, units made, gathered, stock
```

`PROBE_OUT` defaults to `m44-probe-out.json` in the OS temp folder. The unchanged player gives sums
2471 / 3205 / 5955 (turns 15 / 25 / 40) and lowest ratio 1.551, the "FR-140 furniture bound" row of the journal's
lever table (reproduced 2026-11-12). `start.probe.ts` (same command with that file name) prints what each nation's
start tiles gather. Without a file name the command runs both probes.

## The free-worker injection (an upper bound for any recruiting policy)

Inside `m44.probe.ts`: after the turn's resolution one untrained worker is added with no goods paid, the timing
of a recruit ordered that turn. Controlled by environment variables:

| Variable | Meaning | Journal row |
|---|---|---|
| `FREE_UNTIL=n` | a free worker after every turn up to n | "every turn 1 to 10" (`=10`), "1 to 20" (`=20`) |
| `FREE_WHEN_BOUND=n` | only after a labour-bound turn (less than 2 labour idle) up to turn n | "after each labour-bound turn 1 to 32" (`=32`) |
| `FREE_FROM=m` | with `FREE_WHEN_BOUND`, start at turn m | "turns 6 to 32" (`FREE_WHEN_BOUND=32 FREE_FROM=6`) |
| `FREE_CAR=1` | also add one freight car with each free worker | "with a free freight car" |

Re-run on 2026-11-12: `FREE_UNTIL=10` gives 2266 / 2464 / 2972 (lowest ratio 1.01) and
`FREE_WHEN_BOUND=32 FREE_FROM=6 FREE_CAR=1` gives 2471 / 3235 / 5791 (1.55), as in the journal.

## The recruiting policies R1 and R2

`recruiting-policies.txt` defines them. They were applied by hand to `src/app/engine/ai/economy.ts` (with
`PROBE_R=1`, `PROBE_R=2`, `PROBE_ALWAYS=1` read from the environment) and reverted; the game never contained them.
The file is a definition, not an applicable diff, and the R1 and R2 rows of the lever table were not re-run when
it was committed. The journal's "more freight cars" rows (the car rule raised from one to two or three a turn)
came from a hand edit of the same file that is not kept.
