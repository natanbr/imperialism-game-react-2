// FR-199: the era-1 regiment table (Imp1 manual p91 for the stats; rules 08 sections 1 and 7.1 for the costs).
import { describe, it, expect } from 'vitest';
import { entrenches, RECRUITABLE_REGIMENTS, REGIMENT_TYPES, REGIMENTS, UPKEEP_PER_ARMS } from '@/definisions/regiments';
import { RegimentCategory, type RegimentType } from '@/types/Unit';
import type { WorkerGrade } from '@/types/Industry';

type Row = [
  type: RegimentType,
  name: string,
  category: RegimentCategory,
  fpn: number,
  fpm: number,
  rng: number,
  rngEntrenched: number | undefined,
  def: number,
  defEntrenched: number | undefined,
  mvr: number,
  arms: number,
  worker: WorkerGrade | undefined,
  horses: number,
  cash: number,
];

/** FR-199 row by row: FPN / FPM / RNG / DEF (entrenched) / MVR, ARMS, worker grade, horses and cash. */
const TABLE: Row[] = [
  ['minutemen', 'Minutemen', RegimentCategory.Militia, 5, 5, 5, undefined, 4, 5, 4, 0, undefined, 0, 0],
  ['skirmishers', 'Skirmishers', RegimentCategory.LightInfantry, 5, 5, 5, undefined, 7, 8, 6, 1, 'untrained', 0, 200],
  ['regulars', 'Regulars', RegimentCategory.RegularInfantry, 10, 10, 5, undefined, 5, 6, 4, 1, 'untrained', 0, 500],
  ['grenadiers', 'Grenadiers', RegimentCategory.HeavyInfantry, 12, 12, 5, undefined, 5, 6, 4, 1, 'trained', 0, 1000],
  ['hussars', 'Hussars', RegimentCategory.LightCavalry, 7, 10, 3, undefined, 7, undefined, 11, 1, 'untrained', 1, 100],
  ['cuirassiers', 'Cuirassiers', RegimentCategory.HeavyCavalry, 15, 19, 3, undefined, 5, undefined, 9, 1, 'trained', 1, 500],
  ['lightArtillery', 'Light Artillery', RegimentCategory.LightArtillery, 10, 3, 9, 10, 3, 4, 5, 2, 'trained', 1, 1000],
  ['artillery', 'Artillery', RegimentCategory.HeavyArtillery, 16, 4, 11, 12, 2, 3, 3, 2, 'trained', 0, 1000],
  ['sappers', 'Sappers', RegimentCategory.CombatEngineers, 0, 0, 5, undefined, 3, 4, 4, 2, 'expert', 0, 5000],
];

describe('FR-199 the era-1 regiments', () => {
  it('FR-199 the 9 era-1 types, in the Imp1 table order', () => {
    expect(REGIMENT_TYPES).toEqual(TABLE.map(r => r[0]));
    expect(Object.keys(REGIMENTS).sort()).toEqual([...REGIMENT_TYPES].sort());
  });

  it.each(TABLE.map(row => [row[0], row] as const))('FR-199 %s: display name, category, stats and costs as in the table', (_type, row) => {
    const [type, name, category, fpn, fpm, rng, rngEntrenched, def, defEntrenched, mvr, arms, worker, horses, cash] = row;
    const r = REGIMENTS[type];

    expect({ name: r.name, category: r.category }).toEqual({ name, category });
    expect(r.stats).toEqual({
      fpNormal: fpn,
      fpMelee: fpm,
      range: rng,
      ...(rngEntrenched === undefined ? {} : { rangeEntrenched: rngEntrenched }),
      defense: def,
      ...(defEntrenched === undefined ? {} : { defenseEntrenched: defEntrenched }),
      move: mvr,
      armamentsCost: arms,
    });
    expect({ worker: r.worker, horses: r.horses, cash: r.cash }).toEqual({ worker, horses, cash });
  });

  it('FR-199 a type entrenches only with an entrenched DEF and when it is not artillery: Minutemen, Skirmishers, Regulars, Grenadiers, Sappers', () => {
    expect(REGIMENT_TYPES.filter(entrenches)).toEqual(['minutemen', 'skirmishers', 'regulars', 'grenadiers', 'sappers']);
    // Artillery has an entrenched DEF in the table and still does not entrench
    expect(REGIMENTS.artillery.stats.defenseEntrenched).toBe(3);
    expect(entrenches('artillery')).toBe(false);
  });

  it('FR-199 FR-200 the recruitable types are the 7 that are neither militia nor Sappers (Q31)', () => {
    expect(RECRUITABLE_REGIMENTS).toEqual(['skirmishers', 'regulars', 'grenadiers', 'hussars', 'cuirassiers', 'lightArtillery', 'artillery']);
  });

  it('FR-199 FR-202 Minutemen are the only militia; upkeep is $25 per arms point', () => {
    expect(REGIMENT_TYPES.filter(t => REGIMENTS[t].category === RegimentCategory.Militia)).toEqual(['minutemen']);
    expect(UPKEEP_PER_ARMS).toBe(25);
  });
});
