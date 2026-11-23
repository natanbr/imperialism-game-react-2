import { isArmyIntent } from '@/engine/army/armies';
import { isMilitia } from '@/definisions/regiments';
import { deployedFleet, isPortClosed, pendingFleetMission, threatenedPorts } from '@/engine/navy/fleets';
import { validateOrder } from '@/engine/orders/validate';
import type { GameEvent } from '@/engine/turn/context';
import type { GameState } from '@/types/GameState';
import { campaignEconomy } from './campaignEconomy';

export function navalTurn(planned: GameState, next: GameState, events: readonly GameEvent[], nationId: string, beforeOrders: GameState) {
  const fleet = deployedFleet(planned, nationId);
  const after = deployedFleet(next, nationId);
  const destination = fleet?.approach?.provinceId;
  const mission = pendingFleetMission(planned, nationId);
  const own = next.fleets.filter(f => f.ownerNationId === nationId);
  const ordered = planned.nations.find(n => n.id === nationId)!.pendingWarships ?? {};
  const sorties = planned.intents.filter(isArmyIntent).filter(i => i.kind === 'attack').filter(i => i.nationId === nationId && i.via === 'sea');
  const attempted = new Set(sorties.map(i => i.toProvinceId));
  const embarking = new Set(sorties.flatMap(i => i.regimentIds));
  const landBattles = events.filter(e => e.type === 'battle-resolved').filter(b => attempted.has(b.provinceId)
    && b.regiments.some(r => r.ownerId === nationId && r.side === 'attacker' && embarking.has(r.id)));
  const captures = landBattles.filter(b => b.provinceTaken && b.nationId === nationId);
  const threats = beforeOrders.fleets.length === 0 ? [] : threatenedPorts(beforeOrders, nationId);
  const portsAfter = next.fleets.length === 0 ? [] : threatenedPorts(next, nationId);
  const coast = deployedFleet(beforeOrders, nationId)?.approach?.provinceId;
  const landingEligible = !!coast && beforeOrders.provinces.some(p => p.id === coast && p.ownerId !== nationId)
    && beforeOrders.armies.some(a => a.ownerId === nationId && a.regiments.some(r => !isMilitia(r.type) && validateOrder(beforeOrders, {
      kind: 'moveArmy', via: 'sea', nationId, fromProvinceId: a.provinceId, toProvinceId: coast, regimentIds: [r.id],
    }).ok));
  const built = Math.max(0, own.reduce((sum,f) => sum + f.ships.length, 0)
    - planned.fleets.filter(f => f.ownerNationId === nationId).reduce((sum,f) => sum + f.ships.length, 0));
  return { turn: planned.turn, threats: threats.length, ordered, built,
    sailOrders: Number(mission?.mission === 'sail'), arrived: Number(!!after && after.approach?.provinceId !== destination),
    stationed: Number(after?.siteSinceTurn === planned.turn),
    landingEligible: Number(landingEligible), attempts: attempted.size, landBattles: landBattles.length, captured: captures.length,
    engagements: events.filter(e => e.type === 'naval-engagement' && e.sides.some(side => side.nationId === nationId)).length,
    blockaded: portsAfter.filter(p => isPortClosed(next, nationId, p.provinceId, p.seaId)).length,
    deployedHulls: after?.ships.length ?? 0, ...campaignEconomy(next, events, nationId) };
}
