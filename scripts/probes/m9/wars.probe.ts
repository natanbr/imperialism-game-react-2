// FR-229 probe: the war events of 40-turn continent games, per seed. `BOTH=1` plays both nations scripted (FR-247's
// game); otherwise nation 1 is idle (FR-229's acceptance game). `MARKET=world` gives FR-260's market. A measurement
// tool, not a test:
//   SEEDS=1,2,3,4 BOTH=1 npx vitest run --config scripts/probes/m9/vitest.config.ts scripts/probes/m9/wars.probe.ts
import { it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { Order } from '@/engine/orders/Order';
import type { MarketMode } from '@/types/Market';

const SEEDS = (process.env.SEEDS ?? '1,2,3,4').split(',').map(Number);
const MARKET = (process.env.MARKET as MarketMode | undefined) ?? undefined;
const BOTH = process.env.BOTH === '1';

it('war events per seed', () => {
  const summary: string[] = [];
  for (const seed of SEEDS) {
    let s = newGame({ seed, world: 'continent', ...(MARKET ? { market: MARKET } : {}) });
    const lines: string[] = [];
    let lowest = Infinity;
    let refused = 0;
    for (let turn = 1; turn <= 40; turn++) {
      const orders: Record<string, Order[]> = { 'nation-2': scriptedPlayer(s, 'nation-2') };
      if (BOTH) orders['nation-1'] = scriptedPlayer(s, 'nation-1');
      const { state, events } = resolveTurn(s, orders, s.seed);
      for (const e of events) {
        if (e.type === 'order-rejected') refused++;
        if (e.type === 'regiments-recruited') lines.push(`t${turn} ${e.nationId} recruited ${e.count} ${e.regiment}`);
        if (e.type === 'war-declared') lines.push(`t${turn} ${e.nationId} declared war on ${e.targetId}`);
        if (e.type === 'battle-resolved') lines.push(`t${turn} battle at ${e.provinceId}: ${e.attackerIds.join('+')} vs ${e.defenderId}, ${e.rounds.length} rounds, ${e.result}`);
        if (e.type === 'minor-colonised') lines.push(`t${turn} ${e.minorId} colony of ${e.nationId}`);
      }
      s = state;
      lowest = Math.min(lowest, ...s.nations.map(n => n.treasury));
    }
    summary.push(`seed ${seed} (refused ${refused}, lowest treasury ${lowest}):\n  ${lines.join('\n  ')}`);
  }
  console.log(summary.join('\n'));
});
