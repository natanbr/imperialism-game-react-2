// Shared helpers of the M8 army tests (FR-199 to FR-213): province ids of the continent, regiment lookups by name,
// and hand-built army edits that put regiments where a test needs them. The hand-built edits write `state.armies`
// directly in the FR-204 shape ({ id, ownerId, provinceId, regiments }), one army per country per province.
import type { CountryId, ProvinceId } from '@/types/Common';
import type { GameState } from '@/types/GameState';
import type { Army, Regiment } from '@/types/Army';
import type { RegimentType } from '@/types/Unit';
import type { MarketMode } from '@/types/Market';
import { newGame } from '@/engine/newGame';
import { REGIMENTS, START_FORCES } from '@/definisions/regiments';

export const SW1 = 'province-nation-1-sw';
export const NW1 = 'province-nation-1-nw';
export const NE1 = 'province-nation-1-ne';
export const SE1 = 'province-nation-1-se';
export const SW2 = 'province-nation-2-sw';
export const NW2 = 'province-nation-2-nw';
export const NE2 = 'province-nation-2-ne';
export const SE2 = 'province-nation-2-se';
export const ARVELIA = 'minor-1';
export const ARVELIA_P = 'province-minor-1';
export const SUNDMARK = 'minor-2';

/** A new continent game (seed 1); the partners market unless another is named. */
export const continent = (market?: MarketMode): GameState => newGame({ seed: 1, world: 'continent', ...(market ? { market } : {}) });

export const armyIn = (s: GameState, ownerId: CountryId, provinceId: ProvinceId): Army | undefined =>
  s.armies.find(a => a.ownerId === ownerId && a.provinceId === provinceId);

/** The names of the owner's regiments in the province, in the army's order; [] when it has no army there. */
export const namesIn = (s: GameState, ownerId: CountryId, provinceId: ProvinceId): string[] =>
  armyIn(s, ownerId, provinceId)?.regiments.map(r => r.name) ?? [];

/** The owner's regiment of that name and the province it is in; throws when there is none. */
export function regimentNamed(s: GameState, ownerId: CountryId, name: string): Regiment & { provinceId: ProvinceId } {
  for (const army of s.armies) {
    if (army.ownerId !== ownerId) continue;
    const regiment = army.regiments.find(r => r.name === name);
    if (regiment) return { ...regiment, provinceId: army.provinceId };
  }
  throw new Error(`${ownerId} has no regiment named ${name}`);
}

export const idOf = (s: GameState, ownerId: CountryId, name: string): string => regimentNamed(s, ownerId, name).id;

/** Every regiment of the owner, over all its armies. */
export const regimentsOf = (s: GameState, ownerId: CountryId): Regiment[] => s.armies.filter(a => a.ownerId === ownerId).flatMap(a => a.regiments);

/** Hand-built: the owner's army in the province with these regiments added (created when missing); armies left empty are dropped. */
function withRegimentsIn(s: GameState, ownerId: CountryId, provinceId: ProvinceId, regiments: Regiment[]): GameState {
  const armies = s.armies.map(a => ({ ...a, regiments: [...a.regiments] }));
  let army = armies.find(a => a.ownerId === ownerId && a.provinceId === provinceId);
  if (!army) {
    army = { id: `army-${ownerId}-${provinceId}`, ownerId, provinceId, regiments: [] };
    armies.push(army);
  }
  army.regiments.push(...regiments);
  return { ...s, armies: armies.filter(a => a.regiments.length > 0) };
}

/** Hand-built: the regiments (by id) taken out of their armies and put into their owner's army in `provinceId`. */
export function relocate(s: GameState, ids: string[], provinceId: ProvinceId): GameState {
  const owner = s.armies.find(a => a.regiments.some(r => ids.includes(r.id)))!.ownerId;
  const moving = s.armies.flatMap(a => a.regiments).filter(r => ids.includes(r.id));
  const without = { ...s, armies: s.armies.map(a => ({ ...a, regiments: a.regiments.filter(r => !ids.includes(r.id)) })).filter(a => a.regiments.length > 0) };
  return withRegimentsIn(without, owner, provinceId, moving);
}

/** Hand-built: new regiments of these types for the owner in the province, ids "regiment-901" on, health 100. */
export function addRegiments(s: GameState, ownerId: CountryId, provinceId: ProvinceId, types: RegimentType[], health = 100): GameState {
  const used = s.armies.flatMap(a => a.regiments).map(r => Number(r.id.replace('regiment-', ''))).filter(n => n >= 900);
  const first = Math.max(900, ...used) + 1;
  const regiments: Regiment[] = types.map((type, i) => ({ id: `regiment-${first + i}`, type, name: `Test ${REGIMENTS[type].name} ${first + i}`, health }));
  return withRegimentsIn(s, ownerId, provinceId, regiments);
}

/** Hand-built: the regiment with these fields changed. */
export const patchRegiment = (s: GameState, id: string, patch: Partial<Regiment>): GameState => ({
  ...s,
  armies: s.armies.map(a => ({ ...a, regiments: a.regiments.map(r => (r.id === id ? { ...r, ...patch } : r)) })),
});

/**
 * A continent game without its FR-203 start forces: no army (so no upkeep), no fort, the 4 extra horses gone; what the
 * continent was before M8. The baselines that compare the continent with two-islands turn by turn use it (FR-215).
 */
export function withoutStartForces(s: GameState): GameState {
  const bare: GameState = {
    ...s,
    armies: [],
    nations: s.nations.map(n => ({ ...n, warehouse: { ...n.warehouse, horses: n.warehouse.horses - START_FORCES.extraHorses } })),
    map: {
      ...s.map,
      tiles: s.map.tiles.map(row =>
        row.map(t => {
          if (t.fortLevel === undefined) return t;
          const copy = { ...t };
          delete copy.fortLevel;
          return copy;
        })
      ),
    },
  };
  delete bare.regimentsRaised;
  return bare;
}

/** Hand-built: every regiment of the owner in the province removed (its army with it). */
export const clearArmy = (s: GameState, ownerId: CountryId, provinceId: ProvinceId): GameState => ({
  ...s,
  armies: s.armies.filter(a => !(a.ownerId === ownerId && a.provinceId === provinceId)),
});
