// M18k play-test F2. FR-644 (refines FR-606 and FR-608): when every possible seller of a good is barred, the source note
// names the barrier instead of "Trade with potential suppliers is blocked". A missing consulate comes first, with its cost,
// because an order removes it; then war, a boycott or both, in the "+" tooltip's words (barredText). Only the viewer's
// own diplomacy forecast is read (FR-246, FR-497).
// Continent seed 1: Testland (nation-1) has Horses at home, and Arvelia alone sells them, with no consulate of ours.
// Wool has no local source and no minor seller, so a bid would go to Valdoria (nation-2).
import { describe, it, expect } from 'vitest';
import { goodsSourceNotes } from '@/components/goodsSources';
import { newGame, pairKey } from '@/engine';
import type { GameState } from '@/types/GameState';
import { ResourceType, type WarehouseCommodities } from '@/types/Resource';
import { setPair, setTile } from '../engine/fixtures';

const N1 = 'nation-1';
const N2 = 'nation-2';
const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';

const start = (): GameState => newGame({ seed: 1, world: 'continent' });
const note = (s: GameState, good: WarehouseCommodities, screen: 'market' | 'warehouse' = 'market') =>
  goodsSourceNotes(s, s.nations.find((n) => n.id === N1)!, screen).get(good);
const withConsulate = (s: GameState, minorId: string): GameState =>
  setPair(s, N1, minorId, { consulates: [...s.diplomacy[pairKey(N1, minorId)].consulates, N1].sort() });
const atWar = (s: GameState, countryId: string): GameState =>
  setPair(s, N1, countryId, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [], pact: false, alliance: false });
const boycotted = (s: GameState, countryId: string): GameState => setPair(s, N1, countryId, { boycotts: [N1] });
/** Sundmark sells Horses too: one of its land tiles holds them. */
const sundmarkHorses = (s: GameState): GameState => {
  const ids = new Set(s.provinces.filter((p) => p.ownerId === SUNDMARK).flatMap((p) => p.tileIds));
  const site = s.map.tiles.flat().find((t) => ids.has(t.id) && !t.resource)!;
  return setTile(s, site.id, { resource: { type: ResourceType.Horses, level: 0, discovered: true } });
};

describe('FR-644 the blocked source note names the barrier', () => {
  it('FR-644 turn 1: no consulate with Arvelia, the only horse seller: "Open a consulate ($500) to buy this"', () => {
    expect(note(start(), ResourceType.Horses)).toBe('Open a consulate ($500) to buy this');
  });

  it('FR-644 a consulate in Arvelia opens the seller: the local Horses have no note', () => {
    expect(note(withConsulate(start(), ARVELIA), ResourceType.Horses)).toBeUndefined();
  });

  it('FR-644 war or a boycott with Arvelia, despite the consulate: the note says which', () => {
    expect(note(atWar(start(), ARVELIA), ResourceType.Horses)).toBe('We are at war with every seller');
    expect(note(boycotted(withConsulate(start(), ARVELIA), ARVELIA), ResourceType.Horses)).toBe('A boycott bars every seller');
  });

  it('FR-644 two horse sellers, one at war and one boycotted: "War or a boycott bars every seller"; the consulate comes first', () => {
    const two = sundmarkHorses(start());
    const both = boycotted(withConsulate(atWar(two, ARVELIA), SUNDMARK), SUNDMARK);
    expect(note(both, ResourceType.Horses)).toBe('War or a boycott bars every seller');
    expect(note(atWar(two, ARVELIA), ResourceType.Horses)).toBe('Open a consulate ($500) to buy this');
    expect(note(withConsulate(two, SUNDMARK), ResourceType.Horses)).toBeUndefined();
  });

  it('FR-644 the Warehouse keeps its prefix: at war with Valdoria, Wool reads "No known local source · We are at war with every seller"', () => {
    expect(note(start(), ResourceType.Wool, 'warehouse')).toBe('No known local source · Another power may sell this');
    expect(note(atWar(start(), N2), ResourceType.Wool, 'warehouse')).toBe('No known local source · We are at war with every seller');
  });

  it('FR-644 no note says "potential suppliers" any more', () => {
    for (const s of [start(), atWar(start(), ARVELIA), atWar(start(), N2), sundmarkHorses(start())]) {
      for (const screen of ['market', 'warehouse'] as const) {
        for (const text of goodsSourceNotes(s, s.nations.find((n) => n.id === N1)!, screen).values()) expect(text).not.toContain('potential suppliers');
      }
    }
  });
});
