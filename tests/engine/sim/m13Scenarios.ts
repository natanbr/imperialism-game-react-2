import { MaterialType } from '@/types/Resource';
import { COMPUTER_ID, HUMAN_ID, type HumanName, type HumanPolicy } from './humans';

export const SEEDS_24: readonly number[] = Array.from({ length: 24 }, (_, i) => i + 1);

/** FR-541: offer one lumber when the Board of Trade shows Valdoria's bid from last turn. */
const follower: HumanPolicy = {
  name: 'follower',
  orders: (state, { lastTrade }) => {
    const me = state.nations.find(n => n.id === HUMAN_ID);
    const lumber = me?.warehouse[MaterialType.Lumber] ?? 0;
    if ((lastTrade[COMPUTER_ID]?.buy.lumber ?? 0) < 1 || lumber < 1) return [];
    return [{ kind: 'sellCommodity', nationId: HUMAN_ID, commodity: MaterialType.Lumber, amount: 1 }];
  },
};

export interface M13Scenario {
  human: HumanName | HumanPolicy;
  seeds: readonly number[];
}

export const M13_SCENARIOS = {
  idle: { human: 'idle', seeds: SEEDS_24 },
  aggressor: { human: 'aggressor', seeds: SEEDS_24.slice(0, 12) },
  trader: { human: 'trader', seeds: SEEDS_24 },
  follower: { human: follower, seeds: SEEDS_24 },
} satisfies Record<string, M13Scenario>;
