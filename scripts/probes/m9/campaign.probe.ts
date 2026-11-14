// FR-229 probe: why the scripted campaign on a minor does (not) start. Per turn of a 40-turn continent game (nation 1
// idle, nation 2 scripted): treasury, armaments, healthy untrained workers, free untrained workers, the recruit ordered,
// the field strength against the need, and the war events. A measurement tool, not a test.
//   SEEDS=1,2 MARKET=world npx vitest run --config scripts/probes/m9/vitest.config.ts scripts/probes/m9/campaign.probe.ts
import { it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { campaignTarget, fieldStrength } from '@/engine/ai/scriptedWar';
import { freeWorkersOf } from '@/engine/army/armies';
import { defenceOf } from '@/engine/army/combat';
import { healthyWorkers } from '@/engine/industry/labour';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { MarketMode } from '@/types/Market';

const SEEDS = (process.env.SEEDS ?? '1').split(',').map(Number);
const MARKET = (process.env.MARKET as MarketMode | undefined) ?? undefined;

it('campaign probe', () => {
  for (const seed of SEEDS) {
    let s = newGame({ seed, world: 'continent', ...(MARKET ? { market: MARKET } : {}) });
    const rows: string[] = [];
    for (let turn = 1; turn <= 40; turn++) {
      const n2 = s.nations.find(n => n.id === 'nation-2')!;
      const orders = scriptedPlayer(s, 'nation-2');
      const recruit = orders.filter(o => o.kind === 'setRecruitment').map(o => (o as { count: number }).count).join(',');
      const army = orders.filter(o => o.kind === 'moveArmy').length;
      const arms = orders.filter(o => o.kind === 'setProduction' && (o as { output?: string }).output === 'armaments').map(o => (o as { amount: number }).amount).join(',');
      const target = campaignTarget(s, 'nation-2');
      const result = resolveTurn(s, { 'nation-2': orders }, s.seed);
      const war = result.events.filter(e => ['war-declared', 'battle-resolved', 'minor-colonised', 'order-rejected'].includes(e.type)).map(e => e.type).join(',');
      rows.push(
        `t${turn} cash ${n2.treasury} arm ${(n2.warehouse as Record<string, number>).armaments ?? 0} steel ${(n2.warehouse as Record<string, number>).steel ?? 0} untr ${healthyWorkers(n2.industry, 'untrained')} free ${freeWorkersOf(n2, 'untrained')} trained ${healthyWorkers(n2.industry, 'trained')} expert ${healthyWorkers(n2.industry, 'expert')} horses ${(n2.warehouse as Record<string, number>).horses ?? 0} ` +
          `target ${target ?? '-'} field ${fieldStrength(s, 'nation-2')} need ${target ? 2 * defenceOf(s, 'province-minor-1') : '-'} recruit[${recruit}] makeArms[${arms}] moves ${army} ${war}`
      );
      s = result.state;
    }
    console.log(`seed ${seed}\n${rows.join('\n')}`);
  }
});
