# M7 trade probe

A measurement tool, not a test: it produces the price paths and deal counts in the M7 review fix round entry of
`docs/journal.md` (FR-243, FR-245, FR-247). Nothing here asserts anything. `npm test` does not run it (the root
`vitest.config.ts` includes `tests/**` only); `npx tsc --noEmit` and `npm run lint` check that it compiles and lints.

## Run (from the repo root)

```bash
# 40 turns on the continent ("partners"), both nations scripted, seeds 1 to 4
npx vitest run --config scripts/probes/m7/vitest.config.ts
# one seed, or another world or market
SEEDS=1 WORLD=two-islands npx vitest run --config scripts/probes/m7/vitest.config.ts
SEEDS=1,2 MARKET=world npx vitest run --config scripts/probes/m7/vitest.config.ts
```

Per seed it prints the prices of clothing, furniture, hardware, lumber, steel, timber, coal, iron ore and cotton after
turns 1, 5, 10, 20, 30 and 40; then per nation its treasury, score, relation points with each minor (`C` marks a
consulate) and its trade events by kind, commodity and counterparty as `count/units`.
