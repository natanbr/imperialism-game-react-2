import { expect, it } from 'vitest';
import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { capitalProvinceOf } from '@/engine/army/armies';
import { deployedFleet, homeFleet } from '@/engine/navy/fleets';
import { setWarehouse } from '../fixtures';
import { runGame } from './harness';
import { COMPUTER_ID, HUMAN_ID, type HumanPolicy } from './humans';
import { navalTurn } from './navalMeasurement';
import { SEEDS_24 } from './m13Scenarios';

const exercise = (target: 'Sundmark' | 'Valdoria' | 'neutral coast'): HumanPolicy => ({
  name: target,
  setup: s => s.turn === 1 ? setWarehouse(setWarehouse(s, HUMAN_ID, { armaments: 5, lumber: 8, fabric: 3 }),
    COMPUTER_ID, { armaments: 20, lumber: 25, fabric: 20 }) : s,
  orders(s) {
    const nationId = HUMAN_ID;
    const island = target === 'Sundmark';
    const coast = target === 'Valdoria' ? capitalProvinceOf(s, COMPUTER_ID)!.id : 'province-minor-2';
    const fleet = deployedFleet(s, nationId) ?? homeFleet(s, nationId);
    switch (s.turn) {
      case 1: return [{ kind: 'setShipyard', nationId, ship: island ? 'shipOfTheLine' : 'frigate', count: 1 }];
      case 2: return [
        { kind: 'proposeOverture', nationId, overture: 'war', targetId: island ? 'minor-2' : COMPUTER_ID },
        { kind: 'setFleetMission', nationId, fleetId: fleet!.id, mission: 'sail', provinceId: coast },
      ];
      case 3: return target === 'neutral coast' ? [] : [{ kind: 'setFleetMission', nationId, fleetId: fleet!.id, mission: 'station' }];
      case 4: return target === 'neutral coast' ? [] : [{ kind: 'moveArmy', nationId, via: 'sea',
        fromProvinceId: capitalProvinceOf(s, nationId)!.id, toProvinceId: coast,
        regimentIds: island ? ['regiment-1','regiment-2','regiment-3'] : ['regiment-1','regiment-2'] }];
      case 5: return [{ kind: 'setFleetMission', nationId, fleetId: fleet!.id, mission: 'return' }];
      default: return [];
    }
  },
});

function campaign(seed: number, human: HumanPolicy | 'idle' | 'diplomat', turns: number) {
  const observed: Record<string, ReturnType<typeof navalTurn>>[] = [];
  const game = runGame({ seed, human, turns, observe(planned, next, events, beforeOrders) {
    observed.push(Object.fromEntries(next.nations.map(n => [n.id, navalTurn(planned, next, events, n.id, beforeOrders)])));
  } });
  expect(observed.map(t => t[COMPUTER_ID].turn)).toEqual(game.turns.map(t => t.turn));
  const rows = game.turns.map((t, i) => ({ turn: t.turn, nations: observed[i], votes: t.council?.earnedMinorVotes ?? null,
    provinces: t.provincesHeld }));
  if (process.env.M17_EVIDENCE) writeFileSync(join(process.env.M17_EVIDENCE, `after-${game.human}-${seed}.json`), JSON.stringify(rows));
  return { game, rows };
}

for (const human of ['idle', 'diplomat'] as const) for (const seed of SEEDS_24) {
  it(`FR-559 measures actual naval and economic activity, ${human} seed ${seed}`, async () => {
    const { game, rows } = campaign(seed, human, 40);
    // Service Vitest worker messages between complete games, outside the measured turn.
    await yieldToRunner();
    expect(rows.length).toBeGreaterThan(0);
    const one = rows.map(r => r.nations[COMPUTER_ID]);
    const tally = (key: 'threats'|'built'|'engagements'|'blockaded'|'landingEligible'|'attempts'|'captured') => one.reduce((n,t) => n + t[key],0);
    const first = (key: 'arrived'|'built'|'stationed'|'landingEligible') => one.find(t => t[key] > 0)?.turn ?? null;
    console.log(JSON.stringify({ seed, human, nation: COMPUTER_ID, turns: rows.length, threatPortTurns: tally('threats'),
      firstBuild: first('built'), hullsBuilt: tally('built'), firstArrival: first('arrived'), firstSite: first('stationed'),
      firstLegalLanding: first('landingEligible'), eligibleTurns: tally('landingEligible'), attempted: tally('attempts'), captures: tally('captured'),
      engagements: tally('engagements'), blockadedPortTurns: tally('blockaded') }));
    expect(game.turns.flatMap(t => t.ordersRejected)).toEqual([]);
  });
}

it('FR-559 distinguishes a funded landing, a public relief sortie and the same war with no port threat', () => {
  const seed = 1;
  const island = campaign(seed, exercise('Sundmark'), 5);
  const defended = campaign(seed, exercise('Valdoria'), 5);
  const control = campaign(seed, exercise('neutral coast'), 5);
  for (const result of [island, defended, control]) {
    expect(result.game.turns.flatMap(t => t.humanRefused)).toEqual([]);
    expect(result.game.turns.flatMap(t => t.ordersRejected)).toEqual([]);
    console.log(JSON.stringify({ seed, scenario: result.game.human, turns: result.rows }));
  }
  const landing = island.rows.map(r => r.nations[HUMAN_ID]);
  // Seed 1 at turn four loses the normal land battle; the separate browser fixture wins at Sundmark.
  expect(landing[3].landBattles).toBe(1);
  expect(island.game.turns[3].battles[0]?.result).toBe('defender-held');
  expect(landing.map(t => [t.built, t.arrived, t.stationed, t.landingEligible, t.attempts, t.captured])).toEqual([
    [1,0,0,0,0,0], [0,1,0,0,0,0], [0,0,1,0,0,0], [0,0,0,1,1,0], [0,0,0,1,0,0],
  ]);
  expect(defended.rows[2].nations[COMPUTER_ID]).toMatchObject({ threats: 1, built: 1, blockaded: 1 });
  expect(defended.rows[3].nations[HUMAN_ID]).toMatchObject({ landingEligible: 1, attempts: 1, engagements: 1, landBattles: 0, captured: 0 });
  expect(defended.rows[4].nations[COMPUTER_ID].blockaded).toBe(0);
  expect(control.rows.every(r => r.nations[COMPUTER_ID].threats === 0 && r.nations[COMPUTER_ID].built === 0)).toBe(true);
});
