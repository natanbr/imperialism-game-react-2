// M18j (FR-638, inferred): the human policies the sims run by name. The FR-509 diplomat refuses `buyLand`, as it refuses
// grants and wars in its own filter, so FR-545 keeps measuring the same diplomacy. humans.ts is frozen, so the refusal is
// made here: the diplomat plans on a view of the state without its own Developer. Its filter would let a purchase through
// after turn 4, and a Developer is not otherwise read by its plan, so the view changes nothing else. Not a test file.
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { diplomat, HUMAN_ID, HUMANS, type HumanName, type HumanPolicy } from './humans';

/** The state as the nation would see it with no Developer; the state itself when it has none. */
function withoutDeveloper(state: GameState, nationId: string): GameState {
  const isOwn = (w: { nationId: string; type: WorkerType }) => w.nationId === nationId && w.type === WorkerType.Developer;
  if (!state.map.tiles.some(row => row.some(t => t.workers.some(isOwn)))) return state;
  const tiles = state.map.tiles.map(row => (row.some(t => t.workers.some(isOwn))
    ? row.map(t => (t.workers.some(isOwn) ? { ...t, workers: t.workers.filter(w => !isOwn(w)) } : t))
    : row));
  return { ...state, map: { ...state.map, tiles } };
}

/** FR-509 / FR-545 with FR-638: the diplomat, refusing land purchases. Its Developer stays idle. */
export const frozenDiplomat: HumanPolicy = {
  name: diplomat.name,
  orders: (state, context) => diplomat.orders(withoutDeveloper(state, HUMAN_ID), context),
};

/** The policies `runGame` resolves by name: those of humans.ts, the diplomat frozen as above. */
export const POLICIES: Readonly<Record<HumanName, HumanPolicy>> = { ...HUMANS, diplomat: frozenDiplomat };
