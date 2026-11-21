import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { relationOf } from '@/engine/diplomacy/relations';
import { setPair, setTreasury } from '../fixtures';
import { runGame, type GameRecord } from './harness';
import { COMPUTER_ID, diplomat, HUMAN_ID, type HumanName, type HumanPolicy } from './humans';

const seeds = Array.from({ length: 24 }, (_, index) => index + 1);
async function games(human: HumanName | HumanPolicy) {
  const records: GameRecord[] = [];
  for (const seed of seeds) {
    records.push(runGame({ seed, human }));
    await yieldToRunner();
  }
  return records;
}

function councilBy40(game: GameRecord) {
  const result = game.final.gameOver;
  return result?.reason === 'council' && result.turn <= 40;
}

const idle = await games('idle');
const violations: string[] = [];
const diplomaticGames = await games({
  name: diplomat.name,
  orders(state, ctx) {
    const orders = diplomat.orders(state, ctx);
    if (ctx.turn <= 5) {
      const consulates = orders.filter(o => o.kind === 'proposeOverture' && o.overture === 'consulate');
      const open = state.minorNations.filter(m => relationOf(state, HUMAN_ID, m.id)?.consulates.includes(HUMAN_ID));
      if (consulates.length !== Number(ctx.turn <= 4) || open.length !== ctx.turn - 1) {
        violations.push(`turn ${ctx.turn}: ${open.length} open and ${consulates.length} ordered`);
      }
    }
    for (const order of orders) {
      if (order.kind === 'moveArmy' && !state.provinces.some(p => p.id === order.toProvinceId && p.ownerId === HUMAN_ID)) {
        violations.push(`turn ${ctx.turn}: army ordered across the border into ${order.toProvinceId}`);
      }
    }
    return orders;
  },
});
const aggressor = await games('aggressor');

describe('FR-509 a passive Testland loses to the rival on the continent', () => {
  const council = idle.filter(councilBy40).length;
  const losses = idle.filter(g => g.final.gameOver?.winnerId === COMPUTER_ID).length;

  it(`idle ends by Council by turn 40 in ${council}/24 games (required 23)`, () => {
    expect(council).toBeGreaterThanOrEqual(23);
  });
  it(`Valdoria wins ${losses}/24 idle games (required 20)`, () => {
    expect(losses).toBeGreaterThanOrEqual(20);
  });
});

describe('FR-509 a diplomat can win peacefully using normal orders', () => {
  const requiredPeacefulWins = 15;
  const peacefulWinTarget = `FR-545 requires ${requiredPeacefulWins}/24; FR-509 (ii) required 18/24 and measured 24/24 on M14 before the FR-516 computer fleet`;
  const wars = diplomaticGames.flatMap(g => g.turns.flatMap(t => t.warsDeclared.filter(w => w.byId === HUMAN_ID)));
  const winners = diplomaticGames.filter(g => councilBy40(g) && g.final.gameOver?.winnerId === HUMAN_ID);
  const fundedWins = winners.filter(g => g.turns.some(t => t.grants.some(p => p.fromId === HUMAN_ID && p.amount === 1000))).length;
  const earlyWins = winners.filter(g => g.final.gameOver!.turn < 40).length;
  it('opens one consulate every turn on turns 1–4, makes only domestic marches, and receives no order refusal', () => {
    expect(diplomat.setup).toBeUndefined();
    expect(violations).toEqual([]);
    expect(wars).toEqual([]);
    expect(diplomaticGames.flatMap(g => g.turns.flatMap(t => t.humanRefused))).toEqual([]);
  });
  it(`Testland wins by Council by turn 40 in ${winners.length}/24 games (${peacefulWinTarget}), ${fundedWins} with a paid grant and ${earlyWins} before the last meeting`, () => {
    expect(winners.length, peacefulWinTarget).toBeGreaterThanOrEqual(requiredPeacefulWins);
    expect(fundedWins).toBeGreaterThan(0);
  });
  it('gives one $1,000 grant to the free eligible minor closest below 50 when $3,000 will remain', () => {
    let state = { ...newGame({ seed: 1, world: 'continent' }), turn: 8 };
    const [alreadyWon, runnerUp, closest, noEmbassy] = state.minorNations.map(m => m.id);
    for (const [target, points] of [[alreadyWon, 50], [runnerUp, 40], [closest, 48], [noEmbassy, 49]] as const) {
      state = setPair(state, HUMAN_ID, target, { points, consulates: [HUMAN_ID], embassies: target === noEmbassy ? [] : [HUMAN_ID] });
    }
    const grants = (cash: number) => diplomat.orders(setTreasury(state, HUMAN_ID, cash), { turn: state.turn, lastTrade: {} }).filter(o => o.kind === 'giveGrant');
    expect(grants(4000)).toEqual([{ kind: 'giveGrant', nationId: HUMAN_ID, targetId: closest, amount: 1000, locked: false }]);
    expect(grants(3999)).toEqual([]);
  });
});

describe('FR-509 conquest takes precedence in aggressor games', () => {
  const conquests = aggressor.filter(g => g.final.gameOver?.reason === 'conquest').length;
  const councils = aggressor.filter(councilBy40).length;
  it(`${conquests} conquests and ${councils} Council decisions account for all 24 endings`, () => {
    expect(conquests + councils).toBe(24);
    for (const g of aggressor) {
      const fall = g.turns.find(t => t.nationsFallen.length > 0);
      if (fall) expect(g.final.gameOver).toMatchObject({ turn: fall.turn, reason: 'conquest', winnerId: fall.nationsFallen[0].nationId });
    }
  });
});
