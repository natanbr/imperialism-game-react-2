// M4.4 helper probe (a tool, not a test): what each nation's start tiles gather and its start transport plan.
import { it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { computeLogisticsTransport } from '@/engine/systems/logisticsSystem';

it('start gathered', () => {
  for (const seed of [1, 2, 3]) {
    const s = newGame({ seed });
    for (const n of s.nations) console.log(seed, n.id, JSON.stringify(computeLogisticsTransport(s.map, n.id, s.transportNetwork.railroadNetworks?.[n.id])), JSON.stringify(s.transportAllocationsByNation?.[n.id] ?? {}));
  }
});
