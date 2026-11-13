// The M7 trade probe: 40 turns on the continent ("partners" market), both Great Powers scripted, seeds 1 to 4.
// Prints per seed the price path of the traded commodities, each nation's deals by kind and counterparty, its
// consulates and its treasury. A measurement tool, not a test: nothing is asserted.
//   npx vitest run --config scripts/probes/m7/vitest.config.ts
import { it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { pairKey } from '@/engine/diplomacy/relations';
import { scoreOf } from '@/engine/score/score';
import type { GameState } from '@/types/GameState';

const SEEDS = (process.env.SEEDS ?? '1,2,3,4').split(',').map(Number);
const TURNS = 40;
const NATIONS = ['nation-1', 'nation-2'];
const WATCH = ['clothing', 'furniture', 'hardware', 'lumber', 'steel', 'timber', 'coal', 'ironOre', 'cotton'];
const CHECKPOINTS = [1, 5, 10, 20, 30, 40];

it('M7 trade probe', () => {
  for (const seed of SEEDS) {
    let s: GameState = newGame({ seed, world: (process.env.WORLD ?? 'continent') as 'continent', ...(process.env.MARKET ? { market: process.env.MARKET as 'world' } : {}) });
    const minors = s.minorNations.map(m => m.id);
    const deals: Record<string, Record<string, number>> = Object.fromEntries(NATIONS.map(id => [id, {}]));
    const units: Record<string, Record<string, number>> = Object.fromEntries(NATIONS.map(id => [id, {}]));
    const prices: Record<number, Record<string, number>> = {};
    let refused = 0;
    for (let turn = 1; turn <= TURNS; turn++) {
      const orders = Object.fromEntries(NATIONS.map(id => [id, scriptedPlayer(s, id)]));
      const result = resolveTurn(s, orders, s.seed);
      refused += result.events.filter(e => e.type === 'order-rejected').length;
      for (const e of result.events) {
        if (e.type !== 'goods-sold' && e.type !== 'goods-bought' && e.type !== 'offer-missed' && e.type !== 'offer-unsold' && e.type !== 'bid-unfilled') continue;
        const ev = e as { type: string; nationId: string; counterpartyId?: string; commodity: string; amount: number };
        const key = `${ev.type.replace('goods-', '')} ${ev.commodity}${ev.counterpartyId ? ` ${ev.counterpartyId}` : ''}`;
        deals[ev.nationId][key] = (deals[ev.nationId][key] ?? 0) + 1;
        units[ev.nationId][key] = (units[ev.nationId][key] ?? 0) + ev.amount;
      }
      s = result.state;
      if (CHECKPOINTS.includes(turn)) prices[turn] = Object.fromEntries(WATCH.map(c => [c, s.market!.prices[c as 'coal']]));
    }
    console.log(`\n=== seed ${seed}: refused ${refused}`);
    console.log('prices', JSON.stringify(prices));
    for (const id of NATIONS) {
      const n = s.nations.find(x => x.id === id)!;
      const rel = minors.map(m => `${m}:${s.diplomacy[pairKey(id, m)].points}${s.diplomacy[pairKey(id, m)].consulates.includes(id) ? 'C' : ''}`).join(' ');
      console.log(`${id} treasury ${n.treasury} score ${JSON.stringify(scoreOf(s, id))} | ${rel}`);
      console.log(`  events (count/units): ${Object.keys(deals[id]).sort().map(k => `${k}=${deals[id][k]}/${units[id][k]}`).join(', ')}`);
    }
  }
});
