// M9 review R1 probe (FR-275): where nation 2's cash goes in the FR-274 acceptance game (continent, nation 1 idle, nation 2
// scripted) and when its regiments are disbanded for want of pay. Per turn: treasury before the turn, the upkeep due,
// the upkeep reserve, regiments, the kinds of order it gives, and the no-pay disbands. A measurement tool, not a test.
//   SEEDS=1,3 FROM=28 npx vitest run --config scripts/probes/m9/vitest.config.ts scripts/probes/m9/upkeep.probe.ts
import { it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer, upkeepReserve } from '@/engine/ai/scriptedPlayer';
import { campaignTarget } from '@/engine/ai/scriptedWar';
import { upkeepOf } from '@/engine/army/armies';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { MarketMode } from '@/types/Market';

const SEEDS = (process.env.SEEDS ?? '1').split(',').map(Number);
const FROM = Number(process.env.FROM ?? '1');
const MARKET = (process.env.MARKET as MarketMode | undefined) ?? undefined;

it('upkeep probe', () => {
  for (const seed of SEEDS) {
    let s = newGame({ seed, world: 'continent', ...(MARKET ? { market: MARKET } : {}) });
    const rows: string[] = [];
    for (let turn = 1; turn <= 40; turn++) {
      const n2 = s.nations.find(n => n.id === 'nation-2')!;
      const orders = scriptedPlayer(s, 'nation-2');
      const kinds = new Map<string, number>();
      for (const o of orders) kinds.set(o.kind, (kinds.get(o.kind) ?? 0) + 1);
      const regiments = s.armies.filter(a => a.ownerId === 'nation-2').flatMap(a => a.regiments).length;
      const result = resolveTurn(s, { 'nation-2': orders }, s.seed);
      const noPay = result.events.filter(e => e.type === 'regiments-disbanded' && (e as { nationId?: string }).nationId === 'nation-2');
      const after = result.state.nations.find(n => n.id === 'nation-2')!.treasury;
      if (turn >= FROM) {
        rows.push(
          `t${turn} cash ${n2.treasury} -> ${after} upkeep ${upkeepOf(s, 'nation-2')} reserve ${upkeepReserve(s, 'nation-2')} regiments ${regiments} target ${campaignTarget(s, 'nation-2') ?? '-'} ` +
            `orders ${[...kinds].map(([k, n]) => `${k}x${n}`).join(' ')} ${noPay.map(e => JSON.stringify(e)).join(' ')}`
        );
      }
      s = result.state;
    }
    console.log(`seed ${seed}\n${rows.join('\n')}`);
  }
});
