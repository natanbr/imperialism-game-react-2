# M9 scripted-war probes

Measurement tools, not tests: they produce the FR-229 decision card in the M9 engine entry of `docs/journal.md`.
Nothing here asserts anything. `npm test` does not run them (the root `vitest.config.ts` includes `tests/**` only);
`npx tsc --noEmit` and `npm run lint` check that they compile and lint.

## Run (from the repo root)

```bash
# per turn of nation 2's game (nation 1 idle): cash, armaments, workers by grade, horses, the campaign's target,
# field strength against the need, recruits, armaments ordered, moves and war events
SEEDS=1,2,3,4 npx vitest run --config scripts/probes/m9/vitest.config.ts scripts/probes/m9/campaign.probe.ts
# the war events only; BOTH=1 plays both nations scripted (FR-247's game); MARKET=world gives FR-260's market
SEEDS=1,2,3,4 BOTH=1 npx vitest run --config scripts/probes/m9/vitest.config.ts scripts/probes/m9/wars.probe.ts
# M9 review R1 (FR-275): per turn of nation 2's game in FR-274's acceptance (nation 1 idle): treasury before and after,
# upkeep, the upkeep reserve, regiments, the kinds of order it gives and its no-pay disbands; FROM=28 starts the print there
SEEDS=1,2,3,4 FROM=28 npx vitest run --config scripts/probes/m9/vitest.config.ts scripts/probes/m9/upkeep.probe.ts
```
