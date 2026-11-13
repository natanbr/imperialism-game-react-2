// The M8 upkeep-reserve probe (review E1): for each reserve rule, 40 turns on the continent with both Great Powers
// scripted ("partners", FR-247's games) and with nation 2 scripted and nation 1 idle ("world", FR-260's games). Prints
// per nation its turn-40 score, its treasury, the regiments it lost for want of money and its capital province's force
// size. A measurement tool, not a test: nothing is asserted.
//   npx vitest run --config scripts/probes/m8/vitest.config.ts
//   RULES=2:1,2:8,5:5 SEEDS=1,2,3,4,5,6,7,8,9,10 npx vitest run --config scripts/probes/m8/vitest.config.ts
// A rule is "upkeepTurns:endgameTurns" (FR-213 (a)): the reserve is the upkeep of every turn left in the last
// `endgameTurns` turns, else `upkeepTurns` turns of it. 2:1 is the M8 rule before the review (two turns, one on the
// last), 2:8 the rule after it, 5:5 a flat reserve of 5 turns (fewer when fewer are left).
import { it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { computerOrders } from '@/engine/ai/players';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { scoreOf } from '@/engine/score/score';
import { forceSize } from '@/engine/army/armies';
import { SCRIPTED_GARRISON } from '@/definisions/regiments';
import type { GameState } from '@/types/GameState';

const NATIONS = ['nation-1', 'nation-2'];
const RULES = (process.env.RULES ?? '2:1,2:8,4:4,5:5,6:6,8:8,4:10').split(',');
const SEEDS = (process.env.SEEDS ?? '1,2,3,4').split(',').map(Number);

function play(seed: number, market: 'partners' | 'world'): string {
  let s: GameState = newGame({ seed, world: 'continent', ...(market === 'world' ? { market } : {}) });
  const noPay: Record<string, number> = { 'nation-1': 0, 'nation-2': 0 };
  for (let turn = 1; turn <= 40; turn++) {
    const orders = market === 'world' ? computerOrders(s) : Object.fromEntries(NATIONS.map(id => [id, scriptedPlayer(s, id)]));
    const result = resolveTurn(s, orders, s.seed);
    for (const e of result.events) if (e.type === 'regiments-disbanded' && e.reason === 'no-pay') noPay[e.nationId] += e.count;
    s = result.state;
  }
  const capital = (id: string) => forceSize(s.armies.find(a => a.ownerId === id && a.provinceId === `province-${id}-sw`) ?? { regiments: [] });
  return (market === 'world' ? ['nation-2'] : NATIONS)
    .map(id => `${id}: score ${scoreOf(s, id).total} cash ${s.nations.find(n => n.id === id)!.treasury} no-pay ${noPay[id]} capital arms ${capital(id)}`)
    .join(' | ');
}

it('M8 upkeep-reserve probe', () => {
  // The probe changes the rule numbers in place; the game reads them on every order it plans.
  const rule = SCRIPTED_GARRISON as unknown as { upkeepTurns: number; endgameTurns: number };
  const kept = { ...rule };
  for (const text of RULES) {
    const [upkeepTurns, endgameTurns] = text.split(':').map(Number);
    rule.upkeepTurns = upkeepTurns;
    rule.endgameTurns = endgameTurns;
    for (const market of ['partners', 'world'] as const) {
      for (const seed of SEEDS) console.log(`rule ${text} ${market} seed ${seed}: ${play(seed, market)}`);
    }
  }
  Object.assign(rule, kept);
});
