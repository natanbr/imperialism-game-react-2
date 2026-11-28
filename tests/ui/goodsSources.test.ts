// M18k play-test F2. FR-644 (refines FR-606 and FR-608): when every possible seller of a good is barred, the source note
// names the barrier instead of "Trade with potential suppliers is blocked". A missing consulate comes first, with its cost,
// because an order removes it; then war, a boycott or both, in the "+" tooltip's words (barredText). Only the viewer's
// own diplomacy forecast is read (FR-246, FR-497).
// Continent seed 1: Testland (nation-1) has Horses at home, and Arvelia alone sells them, with no consulate of ours.
// Wool has no local source and no minor seller, so a bid would go to Valdoria (nation-2).
import { describe, it, expect } from 'vitest';
import { barredText, goodsSourceNotes } from '@/components/goodsSources';
import { newGame, pairKey } from '@/engine';
import { bidSellersOf, tradeBarrier } from '@/engine/market/partners';
import type { GameState } from '@/types/GameState';
import type { Intent } from '@/types/Intent';
import { ResourceType, type WarehouseCommodities } from '@/types/Resource';
import { setPair, setTile } from '../engine/fixtures';

const N1 = 'nation-1';
const N2 = 'nation-2';
const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';
const LORRAN = 'minor-3';
const PELLIS = 'minor-4';

const start = (): GameState => newGame({ seed: 1, world: 'continent' });
const note = (s: GameState, good: WarehouseCommodities, screen: 'market' | 'warehouse' = 'market') =>
  goodsSourceNotes(s, s.nations.find((n) => n.id === N1)!, screen).get(good);
const withConsulate = (s: GameState, minorId: string): GameState =>
  setPair(s, N1, minorId, { consulates: [...s.diplomacy[pairKey(N1, minorId)].consulates, N1].sort() });
const atWar = (s: GameState, countryId: string): GameState =>
  setPair(s, N1, countryId, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [], pact: false, alliance: false });
const boycotted = (s: GameState, countryId: string): GameState => setPair(s, N1, countryId, { boycotts: [N1] });
/** Our diplomatic record with the country is missing (the Relationships map's "No relations"): no trade (FR-185). */
const withoutRecord = (s: GameState, countryId: string): GameState => {
  const diplomacy = { ...s.diplomacy };
  delete diplomacy[pairKey(N1, countryId)];
  return { ...s, diplomacy };
};
/** Sundmark sells Horses too: one of its land tiles holds them. */
const sundmarkHorses = (s: GameState): GameState => {
  const ids = new Set(s.provinces.filter((p) => p.ownerId === SUNDMARK).flatMap((p) => p.tileIds));
  const site = s.map.tiles.flat().find((t) => ids.has(t.id) && !t.resource)!;
  return setTile(s, site.id, { resource: { type: ResourceType.Horses, level: 0, discovered: true } });
};
/** Sundmark is Valdoria's colony (FR-224) and Valdoria holds its horse tile (FR-635): Sundmark sells Horses to Valdoria alone. */
const valdoriaColonyHorses = (s: GameState): GameState => {
  const two = sundmarkHorses(s);
  const ids = new Set(two.provinces.filter((p) => p.ownerId === SUNDMARK).flatMap((p) => p.tileIds));
  const site = two.map.tiles.flat().find((t) => ids.has(t.id) && t.resource?.type === ResourceType.Horses)!;
  return {
    ...two,
    minorNations: two.minorNations.map((m) => (m.id === SUNDMARK ? { ...m, colonyOf: N2 } : m)),
    overseasLand: { ...two.overseasLand, [site.id]: { tileId: site.id, holderId: N2, minorId: SUNDMARK, turn: 1, price: 2000 } },
  };
};
/** Every source note on both screens, as the viewer Testland reads them. */
const allNotes = (s: GameState) =>
  (['market', 'warehouse'] as const).map((screen) => [...goodsSourceNotes(s, s.nations.find((n) => n.id === N1)!, screen)]);
const withIntents = (s: GameState, ...intents: Intent[]): GameState => ({ ...s, intents: [...s.intents, ...intents] });
const war = (nationId: string, targetId: string): Intent => ({ id: `war-${nationId}-${targetId}`, turn: 1, kind: 'war', nationId, targetId, cost: 0 } as Intent);
const boycott = (nationId: string, targetId: string): Intent =>
  ({ id: `boycott-${nationId}-${targetId}`, turn: 1, kind: 'trade-policy', nationId, targetId, boycott: true, subsidyPercent: 0 } as Intent);

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

  // M18k review: a colony is listed among the sellers (FR-635) but trades only with its owner ("not-a-partner", FR-224),
  // so "every seller" alone would be false while Arvelia is at war with us and Valdoria's colony Sundmark sells Horses.
  it('FR-644 a rival\'s colony that sells Horses is named apart: "We are at war with every seller but colonies, which trade only with their owner"', () => {
    const colony = valdoriaColonyHorses(start());
    expect(bidSellersOf(colony, N1, ResourceType.Horses)).toEqual([ARVELIA, SUNDMARK]);
    expect(tradeBarrier(colony, N1, SUNDMARK)).toBe('not-a-partner');
    expect(note(atWar(colony, ARVELIA), ResourceType.Horses)).toBe('We are at war with every seller but colonies, which trade only with their owner');
    expect(note(boycotted(withConsulate(colony, ARVELIA), ARVELIA), ResourceType.Horses)).toBe('A boycott bars every seller but colonies, which trade only with their owner');
    expect(note(colony, ResourceType.Horses)).toBe('Open a consulate ($500) to buy this');
  });

  // Codex task 65: the colony words were used for any "not-a-partner" seller, also an independent minor whose diplomatic
  // record with us is missing (settledTradeBarrier; the Relationships map's "No relations"). Both sellers were independent.
  it('FR-644 an independent seller with no relations with us is named, not called a colony: "We are at war with every seller but Sundmark, which has no relations with us"', () => {
    const unrelated = withoutRecord(sundmarkHorses(atWar(start(), ARVELIA)), SUNDMARK);
    expect(bidSellersOf(unrelated, N1, ResourceType.Horses)).toEqual([ARVELIA, SUNDMARK]);
    expect(tradeBarrier(unrelated, N1, SUNDMARK)).toBe('not-a-partner');
    expect(unrelated.minorNations.find((m) => m.id === SUNDMARK)?.colonyOf).toBeUndefined();
    expect(note(unrelated, ResourceType.Horses)).toBe('We are at war with every seller but Sundmark, which has no relations with us');
    const boycott = withoutRecord(sundmarkHorses(boycotted(withConsulate(start(), ARVELIA), ARVELIA)), SUNDMARK);
    expect(note(boycott, ResourceType.Horses)).toBe('A boycott bars every seller but Sundmark, which has no relations with us');
  });

  it('FR-644 FR-252 FR-253 barredText names colonies and countries with no relations apart only beside war or a boycott; the consulate and the fallback stay', () => {
    const colony = valdoriaColonyHorses(start());
    const both = withoutRecord(colony, LORRAN);
    expect(barredText(atWar(colony, ARVELIA), N1, [ARVELIA, SUNDMARK], 'seller')).toBe('We are at war with every seller but colonies, which trade only with their owner');
    expect(barredText(boycotted(both, ARVELIA), N1, [ARVELIA, SUNDMARK, LORRAN], 'buyer'))
      .toBe('A boycott bars every buyer but colonies, which trade only with their owner, and Lorran, which has no relations with us');
    expect(barredText(atWar(withoutRecord(both, PELLIS), ARVELIA), N1, [ARVELIA, LORRAN, PELLIS], 'seller'))
      .toBe('We are at war with every seller but Lorran and Pellis, which have no relations with us');
    expect(barredText(boycotted(atWar(colony, ARVELIA), N2), N1, [ARVELIA, N2, SUNDMARK], 'seller'))
      .toBe('War or a boycott bars every seller but colonies, which trade only with their owner');
    expect(barredText(atWar(colony, ARVELIA), N1, [SUNDMARK, LORRAN], 'seller')).toBe('We need a consulate with a seller');
    expect(barredText(both, N1, [SUNDMARK, LORRAN], 'buyer')).toBe('We may not trade with any buyer');
    expect(barredText(atWar(atWar(start(), ARVELIA), N2), N1, [ARVELIA, N2], 'seller')).toBe('We are at war with every seller');
  });

  // M18k review: FR-608's verify line, "Changing a rival's private Orders cannot change the labels", for FR-644's notes.
  it('FR-644 FR-497 Valdoria\'s pending war or boycott against Testland or Arvelia leaves every note as it was', () => {
    const before = allNotes(start());
    expect(new Map(before[0]).get(ResourceType.Horses)).toBe('Open a consulate ($500) to buy this');
    expect(new Map(before[1]).get(ResourceType.Wool)).toBe('No known local source · Another power may sell this');
    for (const intent of [war(N2, N1), war(N2, ARVELIA), boycott(N2, N1), boycott(N2, ARVELIA)]) {
      expect(allNotes(withIntents(start(), intent)), intent.id).toEqual(before);
    }
    expect(allNotes(withIntents(start(), war(N2, N1), war(N2, ARVELIA), boycott(N2, ARVELIA)))).toEqual(before);
    // The same intents of our own do reach the forecast, so the checks above can see a leak
    expect(note(withIntents(start(), war(N1, ARVELIA)), ResourceType.Horses)).toBe('We are at war with every seller');
    expect(note(withIntents(start(), war(N1, N2)), ResourceType.Wool, 'warehouse')).toBe('No known local source · We are at war with every seller');
  });

  it('FR-644 no note says "potential suppliers" any more', () => {
    for (const s of [start(), atWar(start(), ARVELIA), atWar(start(), N2), sundmarkHorses(start())]) {
      for (const screen of ['market', 'warehouse'] as const) {
        for (const text of goodsSourceNotes(s, s.nations.find((n) => n.id === N1)!, screen).values()) expect(text).not.toContain('potential suppliers');
      }
    }
  });
});
