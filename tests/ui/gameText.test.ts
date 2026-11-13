// FR-024: display text for the HUD's news and refusals, derived from engine data.
import { describe, it, expect } from 'vitest';
import {
  COMMODITY_GROUPS, COMMODITY_TEXT, commodityName, completedTileIds, dateText, eventText, foodWarningText, newsLines, refusalText, REFUSAL_TEXT,
  upkeepDueText, upkeepWarningText, workerJobLabel,
} from '@/components/gameText';
import { newGame, resolveTurn, tryApplyOrder, type GameEvent, type Order, type RejectReason } from '@/engine';
import { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { game, locate, N1, put, T, workerId } from '../engine/fixtures';

const ALL_REASONS: RejectReason[] = [
  'unknown-nation', 'unknown-worker', 'not-owner', 'wrong-worker-type', 'worker-busy', 'worker-moved',
  'invalid-target', 'tile-has-job', 'invalid-site', 'insufficient-funds', 'insufficient-resources', 'insufficient-labour',
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

describe('FR-161 FR-162 diplomacy orders and refusals in plain words', () => {
  const consulate: Order = { kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: 'minor-1' };

  it('FR-162 the five new refusal reasons read as the requirement words them', () => {
    expect([REFUSAL_TEXT['needs-consulate'], REFUSAL_TEXT['needs-embassy'], REFUSAL_TEXT['already-in-place'], REFUSAL_TEXT['at-war'], REFUSAL_TEXT['not-at-war']]).toEqual([
      'we need a consulate there first',
      'we need an embassy there first',
      'that is already in place',
      'we are at war with them',
      'we are not at war with them',
    ]);
  });

  it('FR-161 each diplomacy order has a name in a refusal', () => {
    const orders: Order[] = [
      consulate,
      { kind: 'giveGrant', nationId: N1, targetId: 'minor-1', amount: 1000, locked: false },
      { kind: 'setTradePolicy', nationId: N1, targetId: 'minor-1', subsidyPercent: 5, boycott: false },
      { kind: 'withdrawOverture', nationId: N1, overture: 'grant', targetId: 'minor-1' },
      { kind: 'answerProposal', nationId: N1, proposalId: 'p', accept: true },
    ];
    expect(orders.map(order => refusalText({ order, reason: 'invalid-target' }))).toEqual([
      'Overture refused: not possible on that tile.',
      'Grant refused: not possible on that tile.',
      'Trade policy refused: not possible on that tile.',
      'Withdrawal refused: not possible on that tile.',
      'Answer refused: not possible on that tile.',
    ]);
    expect(refusalText({ order: consulate, reason: 'needs-consulate' })).toBe('Overture refused: we need a consulate there first.');
  });
});

describe('FR-176 diplomacy news', () => {
  const NAMES: Record<string, string> = { 'nation-1': 'Testland', 'nation-2': 'Valdoria', 'minor-1': 'Arvelia', 'minor-3': 'Lorran' };
  const nameOf = (id: string) => NAMES[id] ?? id;
  const N = 'nation-1';
  const A = 'minor-1';
  const V = 'nation-2';

  it.each<[GameEvent, string]>([
    [{ type: 'overture-done', nationId: N, overture: 'consulate', targetId: A }, 'Consulate opened in Arvelia.'],
    [{ type: 'overture-done', nationId: N, overture: 'embassy', targetId: A }, 'Embassy opened in Arvelia.'],
    [{ type: 'overture-done', nationId: N, overture: 'pact', targetId: A }, 'Pact signed with Arvelia.'],
    [{ type: 'overture-done', nationId: N, overture: 'alliance', targetId: V }, 'Alliance signed with Valdoria.'],
    [{ type: 'overture-done', nationId: N, overture: 'peace', targetId: A }, 'Peace made with Arvelia.'],
    [{ type: 'overture-refused', nationId: N, overture: 'alliance', targetId: V }, 'Valdoria refused our alliance.'],
    [{ type: 'overture-refused', nationId: N, overture: 'peace', targetId: V }, 'Valdoria refused our peace offer.'],
    [{ type: 'overture-failed', nationId: N, overture: 'embassy', targetId: A, reason: 'needs-consulate', refund: 5000 }, 'Embassy in Arvelia failed: we need a consulate there first.'],
    [{ type: 'overture-failed', nationId: N, overture: 'consulate', targetId: A, reason: 'at-war', refund: 500 }, 'Consulate in Arvelia failed: we are at war with them.'],
    [{ type: 'overture-failed', nationId: N, overture: 'alliance', targetId: V, reason: 'at-war', refund: 0 }, 'Alliance with Valdoria failed: we are at war with them.'],
    [{ type: 'overture-failed', nationId: N, overture: 'grant', targetId: A, reason: 'at-war', refund: 1000 }, 'Grant to Arvelia failed: we are at war with them.'],
    [{ type: 'overture-failed', nationId: N, overture: 'pact', targetId: A, reason: 'needs-embassy', refund: 0 }, 'Pact with Arvelia failed: we need an embassy there first.'],
    [{ type: 'overture-failed', nationId: N, overture: 'war', targetId: V, reason: 'already-in-place', refund: 0 }, 'War on Valdoria failed: that is already in place.'],
    [{ type: 'overture-failed', nationId: N, overture: 'peace', targetId: V, reason: 'not-at-war', refund: 0 }, 'Peace with Valdoria failed: we are not at war with them.'],
    [{ type: 'overture-failed', nationId: N, overture: 'trade-policy', targetId: A, reason: 'at-war', refund: 0 }, 'Trade policy for Arvelia failed: we are at war with them.'],
    [{ type: 'overture-failed', nationId: N, overture: 'trade-policy', targetId: A, reason: 'needs-consulate', refund: 0 }, 'Trade policy for Arvelia failed: we need a consulate there first.'],
    [{ type: 'war-declared', nationId: N, targetId: A, startsTurn: 2 }, 'War declared on Arvelia! The war starts next turn.'],
    [{ type: 'attacks-cancelled', nationId: N, targetId: A, count: 2 }, 'Attacks on Arvelia called off: peace was made.'],
    [{ type: 'relation-changed', nationId: N, otherId: A, from: 3, to: 4 }, 'Relations with Arvelia: yellow to beige.'],
    [{ type: 'relation-changed', nationId: N, otherId: V, from: 4, to: 0 }, 'Relations with Valdoria: beige to dark brown.'],
    // FR-239 (M6 QA fix round): a change a war caused names that war, seen from the event's nation
    [{ type: 'relation-changed', nationId: N, otherId: A, from: 3, to: 2, wars: [{ aggressorId: N, targetId: 'minor-3' }] }, 'Relations with Arvelia: yellow to orange (our war on Lorran).'],
    [{ type: 'relation-changed', nationId: N, otherId: V, from: 4, to: 0, wars: [{ aggressorId: V, targetId: N }] }, "Relations with Valdoria: beige to dark brown (Valdoria's war on us)."],
    [{ type: 'relation-changed', nationId: N, otherId: V, from: 4, to: 3, wars: [{ aggressorId: V, targetId: A }] }, "Relations with Valdoria: beige to yellow (Valdoria's war on Arvelia)."],
    [
      { type: 'relation-changed', nationId: N, otherId: V, from: 4, to: 0, wars: [{ aggressorId: N, targetId: V }, { aggressorId: V, targetId: N }] },
      "Relations with Valdoria: beige to dark brown (our war on Valdoria and Valdoria's war on us).",
    ],
    [{ type: 'grant-paid', nationId: N, targetId: A, amount: 1000 }, 'Grant of $1,000 paid to Arvelia.'],
    [{ type: 'grant-stopped', nationId: N, targetId: A, amount: 1000, reason: 'insufficient-funds' }, 'Grant to Arvelia stopped: not enough money.'],
    [{ type: 'grant-stopped', nationId: N, targetId: A, amount: 1000, reason: 'withdrawn' }, 'Grant to Arvelia stopped: we withdrew it.'],
    [{ type: 'grant-stopped', nationId: N, targetId: A, amount: 1000, reason: 'war' }, 'Grant to Arvelia stopped: we are at war with them.'],
    [{ type: 'proposal-received', nationId: N, fromId: V, proposalId: 'proposal-1-1', kind: 'alliance' }, 'Valdoria offers us an alliance.'],
    [{ type: 'proposal-received', nationId: N, fromId: V, proposalId: 'proposal-1-1', kind: 'peace' }, 'Valdoria asks for an end to our war.'],
  ])('FR-176 %j has its sentence', (event, text) => {
    expect(eventText(event, nameOf)).toBe(text);
  });

  it('FR-176 FR-107 another nation\'s diplomacy line starts with its name; the countries are named, not their ids', () => {
    const events: GameEvent[] = [
      { type: 'war-declared', nationId: V, targetId: N, startsTurn: 5 },
      { type: 'overture-done', nationId: N, overture: 'consulate', targetId: A },
    ];
    expect(newsLines(events, N, nameOf)).toEqual(['Consulate opened in Arvelia.', 'Valdoria: War declared on Testland! The war starts next turn.']);
  });

  it('FR-176 without a name lookup the ids stand in (the old one-argument call still works)', () => {
    expect(eventText({ type: 'grant-paid', nationId: N, targetId: A, amount: 3000 })).toBe('Grant of $3,000 paid to minor-1.');
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

describe('FR-205 FR-209 army orders, refusals and news in plain words', () => {
  const NAMES: Record<string, string> = {
    'nation-1': 'Testland',
    'nation-2': 'Valdoria',
    'province-nation-1-sw': 'Testland South-West',
    'province-nation-1-ne': 'Testland North-East',
  };
  const nameOf = (id: string) => NAMES[id] ?? id;
  const N = 'nation-1';
  const V = 'nation-2';
  const SW = 'province-nation-1-sw';
  const NE = 'province-nation-1-ne';

  it('FR-205 the new reason not-adjacent reads as the requirement words it', () => {
    expect(REFUSAL_TEXT['not-adjacent']).toBe("that province does not border the army's province");
  });

  it('FR-205 review R7, F5: a march into a country at war reads that attacks are not possible yet, not "that is not yours"', () => {
    const march: Order = { kind: 'moveArmy', nationId: N, fromProvinceId: SW, regimentIds: ['regiment-1'], toProvinceId: NE };

    expect(refusalText({ order: march, reason: 'attack-not-available' })).toBe('March refused: attacks are not possible yet.');
    expect(REFUSAL_TEXT['attack-not-available']).not.toBe(REFUSAL_TEXT['not-owner']);
  });

  it('FR-205 FR-207 each army order has a name in a refusal', () => {
    const orders: Order[] = [
      { kind: 'setRecruitment', nationId: N, regiment: 'regulars', count: 1 },
      { kind: 'moveArmy', nationId: N, fromProvinceId: SW, regimentIds: ['regiment-1'], toProvinceId: NE },
      { kind: 'cancelArmyMove', nationId: N, regimentIds: ['regiment-1'] },
      { kind: 'disbandRegiments', nationId: N, provinceId: SW, regimentIds: ['regiment-1'] },
      { kind: 'cancelDisband', nationId: N, regimentIds: ['regiment-1'] },
    ];
    expect(orders.map(order => refusalText({ order, reason: 'invalid-target' }))).toEqual([
      'Recruiting refused: not possible on that tile.',
      'March refused: not possible on that tile.',
      'Cancel march refused: not possible on that tile.',
      'Disband refused: not possible on that tile.',
      'Cancel disband refused: not possible on that tile.',
    ]);
    expect(refusalText({ order: orders[1], reason: 'not-adjacent' })).toBe("March refused: that province does not border the army's province.");
  });

  it('FR-261 the upkeep line and the warning: none while the cash covers the upkeep', () => {
    expect(upkeepDueText({ due: 125 })).toBe('Army upkeep at End Turn: $125');
    expect(upkeepWarningText({ due: 100, cash: 100, short: false })).toBeNull();
    expect(upkeepWarningText({ due: 100, cash: 40, short: true })).toBe(
      'Cash is short of the army upkeep: $100 is due at End Turn and $40 will be left. Unless this turn\'s sales cover the rest, the newest regiments are disbanded.'
    );
  });

  it.each<[GameEvent, string]>([
    [{ type: 'regiments-recruited', nationId: N, regiment: 'regulars', count: 2 }, '2 Regulars recruited.'],
    [{ type: 'regiments-recruited', nationId: N, regiment: 'lightArtillery', count: 1 }, '1 Light Artillery recruited.'],
    [{ type: 'army-upkeep', nationId: N, amount: 100 }, 'Army upkeep: $100.'],
    [{ type: 'army-upkeep', nationId: N, amount: 1725 }, 'Army upkeep: $1,725.'],
    [{ type: 'army-moved', nationId: N, fromProvinceId: SW, toProvinceId: NE, count: 3 }, '3 regiments marched from Testland South-West to Testland North-East.'],
    [{ type: 'army-moved', nationId: N, fromProvinceId: SW, toProvinceId: NE, count: 1 }, '1 regiment marched from Testland South-West to Testland North-East.'],
    [{ type: 'regiments-disbanded', nationId: N, reason: 'order', count: 2 }, '2 regiments disbanded.'],
    [{ type: 'regiments-disbanded', nationId: N, reason: 'order', count: 1 }, '1 regiment disbanded.'],
    [{ type: 'regiments-disbanded', nationId: N, reason: 'no-pay', count: 2 }, '2 regiments disbanded: no money for their upkeep.'],
    [{ type: 'recruits-refunded', nationId: N, regiment: 'regulars', count: 2 }, '2 Regulars not raised: our capital province is lost. Their cost is refunded.'],
  ])('FR-209 %j has its sentence', (event, text) => {
    expect(eventText(event, nameOf)).toBe(text);
  });

  it("FR-209 FR-107 another nation's army line starts with its name", () => {
    expect(newsLines([{ type: 'army-upkeep', nationId: V, amount: 100 }], N, nameOf)).toEqual(['Valdoria: Army upkeep: $100.']);
  });

  it('FR-209 each army event of a resolved turn carries a Great Power as nationId', () => {
    let s = newGame({ seed: 1, world: 'continent' });
    s = { ...s, nations: s.nations.map(n => ({ ...n, warehouse: { ...n.warehouse, armaments: 1 } })) };
    const capital = s.armies.find(a => a.ownerId === N && a.provinceId === SW)!;
    const [regulars1, regulars2] = capital.regiments.filter(r => r.type === 'regulars').map(r => r.id);
    const orders: Order[] = [
      { kind: 'setRecruitment', nationId: N, regiment: 'regulars', count: 1 },
      { kind: 'moveArmy', nationId: N, fromProvinceId: SW, regimentIds: [regulars1], toProvinceId: NE },
      { kind: 'disbandRegiments', nationId: N, provinceId: SW, regimentIds: [regulars2] },
    ];
    for (const order of orders) s = tryApplyOrder(s, order).state;

    const { events } = resolveTurn(s, {}, s.seed);

    const army = events.filter(e => ['regiments-recruited', 'army-upkeep', 'army-moved', 'regiments-disbanded'].includes(e.type));
    expect([...new Set(army.map(e => e.type))].sort()).toEqual(['army-moved', 'army-upkeep', 'regiments-disbanded', 'regiments-recruited']);
    for (const e of army) expect(['nation-1', 'nation-2']).toContain((e as { nationId: string }).nationId);
  });
});
