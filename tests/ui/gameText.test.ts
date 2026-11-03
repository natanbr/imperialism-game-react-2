// FR-024: display text for the HUD's news and refusals, derived from engine data.
import { describe, it, expect } from 'vitest';
import {
  COMMODITY_GROUPS, COMMODITY_TEXT, commodityName, completedTileIds, dateText, eventText, foodWarningText, refusalText, REFUSAL_TEXT,
  workerJobLabel,
} from '@/components/gameText';
import { resolveTurn, tryApplyOrder, type Order, type RejectReason } from '@/engine';
import { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { game, locate, N1, put, T, workerId } from '../engine/fixtures';

const ALL_REASONS: RejectReason[] = [
  'unknown-nation', 'unknown-worker', 'not-owner', 'wrong-worker-type', 'worker-busy', 'worker-moved',
  'invalid-target', 'tile-occupied', 'invalid-site', 'insufficient-funds', 'insufficient-resources', 'insufficient-labour',
  'limit-reached', 'invalid-amount', 'game-over',
];

const prospect: Order = { kind: 'moveAndStartProspecting', nationId: 'nation-1', workerId: 'w', toTileId: '3-4' };

describe('FR-024 refusal text', () => {
  it('every refusal reason has plain words', () => {
    for (const reason of ALL_REASONS) expect(REFUSAL_TEXT[reason]).toMatch(/\w/);
  });

  it('names the order and the reason', () => {
    expect(refusalText({ order: prospect, reason: 'insufficient-funds' })).toBe('Move and prospect refused: not enough money.');
  });
});

describe('FR-024 turn event text', () => {
  it('says what happened where', () => {
    expect(eventText({ type: 'resource-discovered', tileId: '3-4', nationId: 'nation-1', resource: ResourceType.Coal })).toBe(
      'Prospectors found coal at 3-4.'
    );
    expect(eventText({ type: 'resource-discovered', tileId: '3-4' })).toBe('Prospectors found nothing at 3-4.');
    expect(eventText({ type: 'development-completed', tileId: '2-1', level: 2 })).toBe('Tile 2-1 developed to level 2.');
    expect(eventText({ type: 'construction-completed', tileId: '1-4', structure: 'depot' })).toBe('Depot finished at 1-4.');
    expect(eventText({ type: 'order-rejected', nationId: 'nation-1', order: prospect, reason: 'worker-moved' })).toBe(
      'Move and prospect refused: the worker already moved this turn.'
    );
  });

  it('the end of the turn is not news', () => {
    expect(eventText({ type: 'turn-ended', turn: 2, year: 1900 })).toBeNull();
  });

  it('FR-037 to FR-042 industry, food and workforce events read as news; a good meal is not news', () => {
    const N = 'nation-1';
    expect(eventText({ type: 'goods-produced', nationId: N, output: MaterialType.CannedFood, amount: 2 })).toBe('Produced 2 Canned Food.');
    expect(eventText({ type: 'freight-cars-built', nationId: N, count: 1 })).toBe('1 freight car built.');
    expect(eventText({ type: 'building-expanded', nationId: N, building: 'steelMill', capacity: 4 })).toBe('Steel mill expanded to 4.');
    expect(eventText({ type: 'workers-trained', nationId: N, to: 'expert', count: 2 })).toBe('2 workers trained to expert.');
    expect(eventText({ type: 'workers-recruited', nationId: N, count: 1 })).toBe('1 migrant joined the workforce.');
    expect(eventText({ type: 'workers-fed', nationId: N, fed: 7, sick: 0, starved: 0 })).toBeNull();
    expect(eventText({ type: 'workers-fed', nationId: N, fed: 3, sick: 2, starved: 1 })).toBe(
      '2 workers ate the wrong food and fell sick; 1 worker starved.'
    );
  });

  it('FR-072 world-market deals read as news, with the display name and the money', () => {
    const N = 'nation-1';
    expect(eventText({ type: 'goods-sold', nationId: N, commodity: GoodsType.Furniture, amount: 2, price: 900, income: 1800 })).toBe(
      'Sold 2 Furniture for $1,800.'
    );
    expect(eventText({ type: 'goods-bought', nationId: N, commodity: ResourceType.Coal, amount: 3, price: 100, cost: 300 })).toBe(
      'Bought 3 Coal for $300.'
    );
  });

  it('FR-072 a refused trade order names the sale or the purchase', () => {
    const sale: Order = { kind: 'sellCommodity', nationId: 'nation-1', commodity: GoodsType.Furniture, amount: 9 };
    const purchase: Order = { kind: 'buyCommodity', nationId: 'nation-1', commodity: ResourceType.Coal, amount: 9 };
    expect(refusalText({ order: sale, reason: 'insufficient-resources' })).toBe('Sale refused: not enough goods in the warehouse.');
    expect(refusalText({ order: purchase, reason: 'limit-reached' })).toBe('Purchase refused: over the limit.');
  });

  it('FR-072 the end of the game reads as news, and an order after it is refused in plain words', () => {
    expect(eventText({ type: 'game-over', turn: 40, year: 1824, scores: [] })).toBe('Game over at the end of Winter 1824.');
    const sale: Order = { kind: 'sellCommodity', nationId: 'nation-1', commodity: GoodsType.Furniture, amount: 1 };
    expect(refusalText({ order: sale, reason: 'game-over' })).toBe('Sale refused: the game is over.');
  });
});

describe('FR-050 commodity display names', () => {
  const ALL = [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)];

  it('FR-050 every warehouse commodity has a display name, none is the raw key', () => {
    for (const key of ALL) {
      expect({ key, name: commodityName(key) }).toEqual({ key, name: COMMODITY_TEXT[key] });
      expect(commodityName(key)).toMatch(/^[A-Z][a-z]+( [A-Z][a-z]+)?$/);
    }
    expect(commodityName(MaterialType.CannedFood)).toBe('Canned Food');
    expect(commodityName(ResourceType.IronOre)).toBe('Iron Ore');
  });

  it('FR-050 the news names goods by display name, and finds resources in plain words', () => {
    expect(eventText({ type: 'goods-produced', nationId: N1, output: GoodsType.Furniture, amount: 1 })).toBe('Produced 1 Furniture.');
    expect(eventText({ type: 'resource-discovered', tileId: '3-4', resource: ResourceType.IronOre })).toBe('Prospectors found iron ore at 3-4.');
  });

  it('FR-056 the warehouse groups: resources, materials, goods, each in a fixed order; no gold or gems', () => {
    const NEVER_STORED: string[] = [ResourceType.Gold, ResourceType.Gems];
    expect(COMMODITY_GROUPS.map(g => g.title)).toEqual(['Resources', 'Materials', 'Goods']);
    expect(COMMODITY_GROUPS.flatMap(g => g.keys).sort()).toEqual(ALL.filter(k => !NEVER_STORED.includes(k)).sort());
    expect(COMMODITY_GROUPS[1].keys).toContain(MaterialType.CannedFood);
  });
});

describe('FR-048 the date', () => {
  it.each([
    [1, 1815, 'Spring 1815'],
    [2, 1815, 'Summer 1815'],
    [3, 1815, 'Fall 1815'],
    [4, 1815, 'Winter 1815'],
    [5, 1816, 'Spring 1816'],
  ])('FR-048 turn %i of %i reads %s', (turn, year, text) => {
    expect(dateText(turn, year)).toBe(text);
  });

  it('FR-048 a new game starts in Spring 1815, and one turn later it is Summer 1815', () => {
    const g = game();
    expect(dateText(g.turn, g.year)).toBe('Spring 1815');
    const next = resolveTurn(g, {}, 1).state;
    expect(dateText(next.turn, next.year)).toBe('Summer 1815');
  });
});

describe('FR-049 food warning text', () => {
  it('FR-049 no warning when everyone is fed', () => {
    expect(foodWarningText({ mouths: 7, fed: 7, sick: 0, starved: 0, short: false })).toBeNull();
  });

  it('FR-049 says how many would fall sick and how many would starve', () => {
    expect(foodWarningText({ mouths: 7, fed: 4, sick: 3, starved: 0, short: true })).toBe(
      'Food is short: at the end of this turn 3 workers will eat the wrong food and fall sick.'
    );
    expect(foodWarningText({ mouths: 7, fed: 0, sick: 1, starved: 6, short: true })).toBe(
      'Food is short: at the end of this turn 1 worker will eat the wrong food and fall sick; 6 workers will starve.'
    );
  });
});

// The job text the engine used to store on the worker (part A asserted it in apply.test.ts and
// resolveTurn.test.ts); it is now derived for display from the tile and the worker's status.
describe('FR-024 worker job label', () => {
  const W = {
    farmer: workerId(N1, WorkerType.Farmer),
    rancher: workerId(N1, WorkerType.Rancher),
    prospector: workerId(N1, WorkerType.Prospector),
    engineer: workerId(N1, WorkerType.Engineer),
  };
  const label = (state: GameState, id: string) => {
    const { tile, worker } = locate(state, id)!;
    return workerJobLabel(tile, worker);
  };
  const order = (state: GameState, o: Order) => {
    const { state: next, result } = tryApplyOrder(state, o);
    expect(result).toEqual({ ok: true });
    return next;
  };

  it('names each job from the tile the worker works on', () => {
    expect(label(order(game(), { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }), W.engineer)).toBe('Constructing rail');
    expect(label(order(put(game(), W.prospector, T.mountains1), { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }), W.prospector)).toBe('Prospecting');
    expect(label(order(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 }), W.farmer)).toBe('Farming to level 1');
    expect(label(order(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.rancher, toTileId: T.range1 }), W.rancher)).toBe('Ranching to level 1');
    expect(label(order(put(game(), W.engineer, T.orchard1), { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.orchard1, structure: 'fort' }), W.engineer)).toBe('Constructing fort');
    expect(label(order(put(game(), W.engineer, T.orchard1), { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.orchard1, structure: 'depot' }), W.engineer)).toBe('Constructing depot');
  });

  it('a moved worker reads Moved, an idle one has no label', () => {
    expect(label(order(game(), { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }), W.farmer)).toBe('Moved');
    expect(label(game(), W.farmer)).toBeUndefined();
  });

  it('a cancelled job leaves no label, or Moved when the worker moved this turn', () => {
    const started = order(put(game(), W.farmer, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 });
    expect(label(order(started, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 }), W.farmer)).toBeUndefined();

    const movedAndStarted = order(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });
    expect(label(order(movedAndStarted, { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 }), W.farmer)).toBe('Moved');
  });

  it('after the turn: a moved worker has no label, a working one keeps its job text', () => {
    let state = order(game(), { kind: 'moveWorker', nationId: N1, workerId: W.engineer, toTileId: T.orchard1 });
    state = order(state, { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });

    const s = resolveTurn(state, {}, 1).state;

    expect(label(s, W.engineer)).toBeUndefined();
    expect(label(s, W.farmer)).toBe('Farming to level 1');
  });

  it('workers carry no stored job text', () => {
    const s = order(game(), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });
    expect(locate(s, W.farmer)!.worker).not.toHaveProperty('jobDescription');
    expect(locate(resolveTurn(s, {}, 1).state, W.farmer)!.worker).not.toHaveProperty('jobDescription');
  });
});

describe('FR-032 the map marks the tiles whose job finished last turn', () => {
  it('FR-032 reads the completion events, not job flags', () => {
    const ids = completedTileIds([
      { type: 'development-completed', tileId: '2-1', nationId: N1, level: 1 },
      { type: 'construction-completed', tileId: '3-1', nationId: N1, structure: 'depot' },
      { type: 'resource-discovered', tileId: '0-1', nationId: N1 },
      { type: 'turn-ended', turn: 2, year: 1815 },
    ]);
    expect([...ids].sort()).toEqual(['2-1', '3-1']);
  });
});
