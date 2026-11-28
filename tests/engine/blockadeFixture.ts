// Codex task 67 (FR-646, FR-517): the continent, seed 1, with Testland (nation-1) at war with Valdoria (nation-2) and a
// Frigate on a sea approach. The engine and UI forecast tests share these positions. Not a test file.
import { WARSHIPS } from '@/definisions/ships';
import { newGame } from '@/engine/newGame';
import { homeApproach, portApproach, withFleets } from '@/engine/navy/fleets';
import { addPort } from '@/engine/systems/railroadSystem';
import { logisticsSystem } from '@/engine/systems/logisticsSystem';
import { createTurnContext } from '@/engine/turn/context';
import { TURN_PHASES } from '@/engine/turn/phases';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import type { Approach, Fleet } from '@/types/Navy';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { N1, N2, setPair, setTile, tileAt } from './fixtures';

export const fleetOf = (nationId: string) => `fleet-${nationId}`;
export const SOUTH_EAST = 'province-nation-1-se';

/** One Frigate of the nation on the approach, contesting it with the fleets named. */
export function frigate(nationId: string, approach: Approach, contestedWith?: string[]): Fleet {
  return {
    id: fleetOf(nationId), ownerNationId: nationId, name: 'Frigates', location: approach.seaId, approach, aggression: 'normal',
    ships: [{ ...WARSHIPS.frigate, id: `ship-${nationId}`, experience: 0 }],
    ...(contestedWith && { contested: true, contestedWith }),
  };
}

const atWar = () => setPair(newGame({ seed: 1, world: 'continent' }), N1, N2, { war: { since: 1, aggressors: [N2] } });

/** Turn 1: our Frigate and Valdoria's tied on our home approach and contest it, so the capital's Fish still ships. */
export function contestedHome(): GameState {
  const s = atWar();
  const home = homeApproach(s, N1)!;
  return withFleets(s, [frigate(N1, home, [fleetOf(N2)]), frigate(N2, home, [fleetOf(N1)])]);
}

/** Turn 1: our port on 10-7 (Testland South-East, at the river mouth) collects a Horse Ranch on 9-7; Valdoria's Frigate blockades it. */
export function blockadedPort(): GameState {
  let s = setTile(atWar(), '9-7', { terrain: TerrainType.HorseRanch, resource: { type: ResourceType.Horses, level: 0 } });
  s = addPort(setTile(s, '10-7', { port: true }), N1, tileAt(s, '10-7'));
  return withFleets(s, [frigate(N2, portApproach(s, tileAt(s, '10-7'))!)]);
}

/**
 * Codex task 68: turn 1 of `blockadedPort` with a fresh Valdorian Ship-of-the-Line (firepower 6, hull 65) blockading
 * 10-7 instead, and our fresh Frigate (firepower 3, hull 35) at its home berth, free to sail to Testland South-East.
 */
export function blockadeOfTheLine(): GameState {
  const s = blockadedPort();
  const line: Fleet = { ...frigate(N2, portApproach(s, tileAt(s, '10-7'))!), name: 'Ships-of-the-Line',
    ships: [{ ...WARSHIPS.shipOfTheLine, id: `ship-${N2}`, experience: 0 }] };
  const berth: Fleet = { ...frigate(N1, homeApproach(s, N1)!), location: 'berth' };
  delete berth.approach;
  return withFleets(s, [berth, line]);
}

/** Turn 2 of `blockadedPort`: Valdoria proposed peace on turn 1 ("proposal-1-1"), so we may answer it now. */
export function blockadedPortOfferedPeace(): GameState {
  const turn1 = resolveTurn(blockadedPort(), { [N2]: [{ kind: 'proposeOverture', nationId: N2, overture: 'peace', targetId: N1 }] });
  const rejected = turn1.events.filter(e => e.type === 'order-rejected' || e.type === 'overture-failed');
  if (rejected.length) throw new Error(`the peace proposal failed: ${JSON.stringify(rejected)}`);
  return turn1.state;
}

/** What this turn's logistics phase delivers to the nation: its warehouse just before and just after it. */
export function deliveredAtLogistics(game: GameState, nationId = N1): Record<string, number> {
  const ctx = createTurnContext({ turn: game.turn, seed: game.seed });
  const before = TURN_PHASES.slice(0, TURN_PHASES.indexOf(logisticsSystem)).reduce((s, system) => system(s, ctx), game);
  const stock = (s: GameState) => s.nations.find(n => n.id === nationId)!.warehouse as Record<string, number>;
  const after = stock(logisticsSystem(before, ctx));
  return Object.fromEntries(Object.keys(after).map(key => [key, after[key] - (stock(before)[key] ?? 0)] as const).filter(([, n]) => n !== 0));
}
