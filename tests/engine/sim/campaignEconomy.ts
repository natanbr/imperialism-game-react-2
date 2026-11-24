import type { GameEvent } from '@/engine/turn/context';
import type { GameState } from '@/types/GameState';

export function campaignEconomy(state: GameState, events: readonly GameEvent[], nationId: string) {
  const nation = state.nations.find(n => n.id === nationId)!;
  let cargo = 0, payroll = 0, recruits = 0, production = 0, captures = 0;
  const produced: Record<string, number> = {};
  for (const e of events) {
    if (!('nationId' in e) || e.nationId !== nationId) continue;
    if (e.type === 'goods-sold' || e.type === 'goods-bought') cargo += e.amount;
    if (e.type === 'army-upkeep') payroll += e.amount;
    if (e.type === 'regiments-recruited') recruits += e.count;
    if (e.type === 'province-taken') captures++;
    if (e.type === 'goods-produced') {
      production += e.amount;
      produced[e.output] = (produced[e.output] ?? 0) + e.amount;
    }
  }
  return { cargo, payroll, recruits, production, produced, captures, treasury: nation.treasury ?? 0 };
}
