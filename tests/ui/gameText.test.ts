// FR-024: display text for the HUD's news and refusals, derived from engine data.
import { beforeAll, describe, it, expect } from 'vitest';
import {
  COMMODITY_GROUPS, COMMODITY_TEXT, commodityName, completedTileIds, dateText, eventText, foodWarningText, newsItems, newsLines, refusalText, REFUSAL_TEXT,
  tilePlaces, upkeepDueText, upkeepWarningText, workerJobLabel,
} from '@/components/gameText';
import { countryName, newGame, resolveTurn, tryApplyOrder, upkeepForecast, type GameEvent, type Order, type RejectReason } from '@/engine';
import { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { game, locate, N1, N2, put, setPair, setTreasury, setWarehouse, T, workerId } from '../engine/fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, continent, NW2, SUNDMARK } from '../engine/armyFixtures';

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

  it('FR-216 (M9) replaces the M8 refusal of review R7, F5: a march into a country at war is an attack, so "attacks are not possible yet" is gone', () => {
    const march: Order = { kind: 'moveArmy', nationId: N, fromProvinceId: SW, regimentIds: ['regiment-1'], toProvinceId: NE };

    expect(Object.keys(REFUSAL_TEXT)).not.toContain('attack-not-available');
    expect(Object.values(REFUSAL_TEXT)).not.toContain('attacks are not possible yet');
    expect(refusalText({ order: march, reason: 'not-at-war' })).toBe('March refused: we are not at war with them.');
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
    expect(upkeepWarningText({ due: 100, cash: 100, short: false, shortBy: 0, regimentsLost: [] })).toBeNull();
  });

  // M12 FR-393 (replaces FR-261's "... and $40 will be left. Unless this turn's sales cover the rest, the newest regiments
  // are disbanded.", audit ECONOMY-21, ARMY-WAR-13, MKT-07): the cash, the gap and exactly who goes
  describe('FR-393 the upkeep warning tells the truth', () => {
    const regiment = (n: number, type: 'regulars' | 'hussars' | 'artillery', name: string) => ({ id: `regiment-${n}`, type, name, health: 100 });
    const continentAt = (cash: number) => setTreasury(newGame({ seed: 1, world: 'continent' }), N1, cash);

    it('FR-393 the spec example: $50 due, $16 held, $34 short, 1 regiment named', () => {
      expect(upkeepWarningText({ due: 50, cash: 16, short: true, shortBy: 34, regimentsLost: [regiment(7, 'hussars', '2nd Hussars')] })).toBe(
        "Army upkeep of $50 is due at End Turn and the treasury will hold $16: $34 short. Unless this turn's sales bring in $34, 1 regiment is disbanded (2nd Hussars)."
      );
    });

    it('FR-393 two of three regiments go: both named, newest first', () => {
      const lost = [regiment(3, 'artillery', '1st Artillery'), regiment(2, 'regulars', '2nd Regulars')];
      expect(upkeepWarningText({ due: 100, cash: 49, short: true, shortBy: 51, regimentsLost: lost })).toBe(
        "Army upkeep of $100 is due at End Turn and the treasury will hold $49: $51 short. Unless this turn's sales bring in $51, 2 regiments are disbanded (1st Artillery, 2nd Regulars)."
      );
    });

    it('FR-393 every regiment goes: "all 3 regiments are disbanded"', () => {
      const lost = [regiment(3, 'artillery', '1st Artillery'), regiment(2, 'regulars', '2nd Regulars'), regiment(1, 'regulars', '1st Regulars')];
      expect(upkeepWarningText({ due: 100, cash: 0, short: true, shortBy: 100, regimentsLost: lost })).toBe(
        "Army upkeep of $100 is due at End Turn and the treasury will hold $0: $100 short. Unless this turn's sales bring in $100, all 3 regiments are disbanded."
      );
    });

    it('FR-393 read from the engine\'s forecast: $20 for the start army\'s $100', () => {
      const s = continentAt(20);
      expect(upkeepWarningText(upkeepForecast(s, N1))).toBe(
        "Army upkeep of $100 is due at End Turn and the treasury will hold $20: $80 short. Unless this turn's sales bring in $80, all 3 regiments are disbanded."
      );
      expect(upkeepWarningText(upkeepForecast(continentAt(60), N1))).toBe(
        "Army upkeep of $100 is due at End Turn and the treasury will hold $60: $40 short. Unless this turn's sales bring in $40, 1 regiment is disbanded (1st Artillery)."
      );
    });
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

// M9 UI half. FR-232: the war news. A battle reads "Battle at Arvelia: Province Taken!" from the attacker's side
// ("Attack Failed!" when held); `newsItems` words a battle the player fought from the player's side ("Province Lost!",
// "Enemy Beaten Back!") as the player's own line and carries the report so the line opens its Battle screen. A taken
// province reads "Testland South-East taken from Testland." ("Arvelia taken." when the province bears its country's
// name), a fallen Great Power "Valdoria has fallen.", a colony "Arvelia is now our colony."
describe('FR-232 the war news', () => {
  const names: Record<string, string> = {
    'nation-1': 'Testland',
    'nation-2': 'Valdoria',
    'minor-1': 'Arvelia',
    'province-minor-1': 'Arvelia',
    'province-nation-1-se': 'Testland South-East',
  };
  const name = (id: string) => names[id] ?? id;
  const battle = (over: Partial<Extract<GameEvent, { type: 'battle-resolved' }>> = {}): Extract<GameEvent, { type: 'battle-resolved' }> => ({
    type: 'battle-resolved',
    nationId: 'nation-1',
    provinceId: 'province-minor-1',
    attackerIds: ['nation-1'],
    defenderId: 'minor-1',
    fortLevel: 0,
    regiments: [],
    rounds: [],
    result: 'attacker-won',
    provinceTaken: true,
    ...over,
  });

  it.each<[GameEvent, string]>([
    [battle(), 'Battle at Arvelia: Province Taken!'],
    [battle({ result: 'defender-held', provinceTaken: false }), 'Battle at Arvelia: Attack Failed!'],
    [{ type: 'province-taken', nationId: 'nation-2', provinceId: 'province-nation-1-se', fromId: 'nation-1' }, 'Testland South-East taken from Testland.'],
    [{ type: 'province-taken', nationId: 'nation-1', provinceId: 'province-minor-1', fromId: 'minor-1' }, 'Arvelia taken.'],
    [{ type: 'nation-fallen', nationId: 'nation-1', fallenId: 'nation-2' }, 'Valdoria has fallen.'],
    [{ type: 'minor-colonised', nationId: 'nation-1', minorId: 'minor-1' }, 'Arvelia is now our colony.'],
  ])('FR-232 %j reads as its line', (event, line) => {
    expect(eventText(event, name)).toBe(line);
  });

  it('FR-232 a battle we defended is our own line, from our side; it carries its report', () => {
    const lost = battle({ nationId: 'nation-2', attackerIds: ['nation-2'], defenderId: 'nation-1', provinceId: 'province-nation-1-se' });
    const held = battle({ nationId: 'nation-2', attackerIds: ['nation-2'], defenderId: 'nation-1', provinceId: 'province-nation-1-se', result: 'defender-held', provinceTaken: false });
    const items = newsItems([lost, held], 'nation-1', name);
    expect(items.map((i) => i.text)).toEqual(['Battle at Testland South-East: Province Lost!', 'Battle at Testland South-East: Enemy Beaten Back!']);
    expect(items.map((i) => i.battle)).toEqual([lost, held]);
    // newsLines is the text of the items
    expect(newsLines([lost, held], 'nation-1', name)).toEqual(items.map((i) => i.text));
  });

  it("FR-232 FR-107 another nation's battle starts with its name and opens too; other lines carry no report", () => {
    const theirs = battle({ nationId: 'nation-2', attackerIds: ['nation-2'] });
    const items = newsItems([theirs, { type: 'minor-colonised', nationId: 'nation-2', minorId: 'minor-1' }], 'nation-1', name);
    expect(items).toEqual([
      { text: 'Valdoria: Battle at Arvelia: Province Taken!', battle: theirs },
      { text: 'Valdoria: Arvelia is now our colony.' },
    ]);
  });

  it('FR-232 with several attackers, a country whose attack failed reads "Attack Failed!" though the province was taken', () => {
    const shared = battle({ nationId: 'nation-2', attackerIds: ['nation-2', 'nation-1'] });
    expect(newsItems([shared], 'nation-1', name).map((i) => i.text)).toEqual(['Battle at Arvelia: Attack Failed!']);
  });
});

// M13 FR-496 (FR-107's order kept): the news names the computer's moves, one line each: the other Great Power's war
// declarations, peace offers and peace made, regiments recruited (type and count), grants (to whom and how much) and
// battles, from the events the engine itself emits. A peace or alliance between two Great Powers is emitted for each of
// them; the player reads it once, as its own line.
describe('FR-496 the news names the other Great Power\'s moves', () => {
  /** Countries and provinces by name, as the news panel names them. */
  const nameOf = (s: GameState) => (id: string) => countryName(s, id) ?? s.provinces.find((p) => p.id === id)?.name ?? id;
  /** Each order accepted, as the computer's would be. */
  const apply = (s: GameState, ...orders: Order[]): GameState =>
    orders.reduce((state, o) => {
      const result = tryApplyOrder(state, o);
      expect(result.result, JSON.stringify(o)).toEqual({ ok: true });
      return result.state;
    }, s);
  const once = (lines: string[], line: string) => expect(lines.filter((l) => l === line), line).toEqual([line]);

  it('FR-496 Valdoria declares war on Arvelia, pays a grant to Sundmark and recruits 1 Regulars: one line each under its name', () => {
    let s = setWarehouse(continent(), N2, { armaments: 1 });
    // A grant needs an embassy (FR-170)
    s = setPair(s, N2, SUNDMARK, { consulates: [N2], embassies: [N2] });
    s = apply(
      s,
      { kind: 'proposeOverture', nationId: N2, overture: 'war', targetId: ARVELIA },
      { kind: 'giveGrant', nationId: N2, targetId: SUNDMARK, amount: 1000, locked: false },
      { kind: 'setRecruitment', nationId: N2, regiment: 'regulars', count: 1 }
    );
    const { events } = resolveTurn(s, {}, s.seed);
    const lines = newsLines(events, N1, nameOf(s));
    once(lines, 'Valdoria: War declared on Arvelia! The war starts next turn.');
    once(lines, 'Valdoria: Grant of $1,000 paid to Sundmark.');
    once(lines, 'Valdoria: 1 Regulars recruited.');
  });

  it('FR-496 Valdoria asks for peace: "Valdoria asks for an end to our war."; accepted, "Peace made with Valdoria." once, not again under its name', () => {
    let s = setPair({ ...continent(), turn: 5 }, N1, N2, { war: { aggressors: [N2], since: 3 } });
    s = apply(s, { kind: 'proposeOverture', nationId: N2, overture: 'peace', targetId: N1 });
    const asked = resolveTurn(s, {}, s.seed);
    once(newsLines(asked.events, N1, nameOf(s)), 'Valdoria asks for an end to our war.');
    const proposal = asked.events.find((e) => e.type === 'proposal-received');
    expect(proposal).toMatchObject({ nationId: N1, fromId: N2, kind: 'peace' });

    const next = apply(asked.state, { kind: 'answerProposal', nationId: N1, proposalId: (proposal as Extract<GameEvent, { type: 'proposal-received' }>).proposalId, accept: true });
    const made = resolveTurn(next, {}, next.seed);
    // The engine tells both Great Powers (diplomacySystem `done`); the news says it once
    expect(made.events.filter((e) => e.type === 'overture-done' && e.overture === 'peace').map((e) => (e as { nationId: string }).nationId)).toEqual([N2, N1]);
    const lines = newsLines(made.events, N1, nameOf(next));
    expect(lines.filter((l) => /Peace made/.test(l))).toEqual(['Peace made with Valdoria.']);
  });

  it('FR-496 a battle Valdoria fought against Arvelia reads from its side and opens its report', () => {
    let s = setPair({ ...continent(), turn: 5 }, N2, ARVELIA, { war: { aggressors: [N2], since: 3 } });
    s = addRegiments(s, N2, NW2, ['cuirassiers', 'cuirassiers', 'cuirassiers', 'cuirassiers', 'cuirassiers', 'cuirassiers']);
    const ids = s.armies.find((a) => a.ownerId === N2 && a.provinceId === NW2)!.regiments.filter((r) => r.type === 'cuirassiers').map((r) => r.id);
    s = apply(s, { kind: 'moveArmy', nationId: N2, fromProvinceId: NW2, regimentIds: ids, toProvinceId: ARVELIA_P });
    const { events } = resolveTurn(s, {}, s.seed);
    const battle = events.find((e) => e.type === 'battle-resolved');
    expect(battle).toMatchObject({ nationId: N2, provinceId: ARVELIA_P, defenderId: ARVELIA });
    const items = newsItems(events, N1, nameOf(s)).filter((i) => i.battle);
    expect(items).toEqual([{ text: 'Valdoria: Battle at Arvelia: Province Taken!', battle }]);
  });

  // M13 review UTH-3: before M13 the computer never offered the player peace nor declared war on it, so Valdoria's own
  // first-person lines about the player ("Valdoria: Testland refused our peace offer.") first reached a player in M13
  it('FR-496 (M13 review UTH-3) Valdoria\'s peace offer the player did not answer reads from the player\'s side, as its own line: "We did not accept Valdoria\'s peace offer.", not "Valdoria: Testland refused our peace offer."', () => {
    let s = setPair({ ...continent(), turn: 5 }, N1, N2, { war: { aggressors: [N2], since: 3 } });
    s = apply(s, { kind: 'proposeOverture', nationId: N2, overture: 'peace', targetId: N1 });
    const asked = resolveTurn(s, {}, s.seed);
    const closed = resolveTurn(asked.state, {}, asked.state.seed);
    expect(closed.events.filter((e) => e.type === 'overture-refused')).toEqual([{ type: 'overture-refused', nationId: N2, overture: 'peace', targetId: N1 }]);
    const lines = newsLines(closed.events, N1, nameOf(s));
    once(lines, 'We did not accept Valdoria\'s peace offer.');
    expect(lines.filter((l) => /refused/.test(l))).toEqual([]);
    // Valdoria's own news is unchanged
    once(newsLines(closed.events, N2, nameOf(s)), 'Testland refused our peace offer.');
    // An alliance offer reads the same way
    expect(newsLines([{ type: 'overture-refused', nationId: N2, overture: 'alliance', targetId: N1 }], N1, nameOf(s))).toEqual(['We did not accept Valdoria\'s alliance.']);
  });

  it('FR-496 FR-239 (M13 review UTH-3) Valdoria\'s war on the player changes their relations once in the news, the player\'s own line ("Valdoria\'s war on us"), not again under Valdoria\'s name ("our war on Testland")', () => {
    const s = apply(continent(), { kind: 'proposeOverture', nationId: N2, overture: 'war', targetId: N1 });
    const { events } = resolveTurn(s, {}, s.seed);
    const between = events.filter((e) => e.type === 'relation-changed' && [N1, N2].includes(e.nationId) && [N1, N2].includes(e.otherId));
    expect(between.map((e) => (e as { nationId: string }).nationId)).toEqual([N1, N2]);
    const relations = (viewer: string) => newsLines(events, viewer, nameOf(s)).filter((l) => /Relations with (Testland|Valdoria)/.test(l));
    expect(relations(N1)).toHaveLength(1);
    expect(relations(N1)[0]).toMatch(/^Relations with Valdoria: .* \(Valdoria's war on us\)\.$/);
    expect(relations(N2)).toHaveLength(1);
    expect(relations(N2)[0]).toMatch(/^Relations with Testland: .* \(our war on Testland\)\.$/);
  });

  it('FR-496 an alliance between the two is said once too; a peace Valdoria made with a minor stays its own line', () => {
    const name = nameOf(continent());
    const events: GameEvent[] = [
      { type: 'overture-done', nationId: N2, overture: 'alliance', targetId: N1 },
      { type: 'overture-done', nationId: N1, overture: 'alliance', targetId: N2 },
      { type: 'overture-done', nationId: N2, overture: 'peace', targetId: ARVELIA },
    ];
    expect(newsLines(events, N1, name)).toEqual(['Alliance signed with Valdoria.', 'Valdoria: Peace made with Arvelia.']);
    // Seen from Valdoria, the same events read once as well
    expect(newsLines(events, N2, name)).toEqual(['Alliance signed with Testland.', 'Peace made with Arvelia.']);
  });
});

// M10 UI half. FR-297 (Imp1 Imperial Times): a Council meeting reads "Council of Governors: Testland 5, Valdoria 4 of 12
// votes; no winner (9 needed)." or "Council of Governors: Testland wins with 9 of 12 votes." (the first nominee first); the
// line carries its event, so it opens the Council screen of that meeting as a battle's line opens its Battle screen
// (FR-232). FR-306 (review R1, replaces FR-297's place "after the nations' lines"): it is the first line of the news.
describe('FR-297 the Council in the news', () => {
  const names: Record<string, string> = { 'nation-1': 'Testland', 'nation-2': 'Valdoria' };
  const name = (id: string) => names[id] ?? id;
  const nominee = (nationId: string, controlled: number, colonies = 0, otherMinorNations = 0) => ({
    nationId,
    standing: 1000,
    controlled,
    colonies,
    otherGreatPowers: 0,
    otherMinorNations,
    total: controlled + colonies + otherMinorNations,
  });
  type Met = Extract<GameEvent, { type: 'council-met' }>;
  const met = (first: Met['nominees'][0], second: Met['nominees'][1], winnerId?: string): Met => ({
    type: 'council-met',
    turn: 10,
    year: 1817,
    totalVotes: 12,
    needed: 9,
    nominees: [first, second],
    ballots: [],
    ...(winnerId ? { winnerId } : {}),
  });

  it('FR-297 no winner: "Council of Governors: Testland 5, Valdoria 4 of 12 votes; no winner (9 needed)."', () => {
    expect(eventText(met(nominee('nation-1', 4, 0, 1), nominee('nation-2', 4)), name)).toBe(
      'Council of Governors: Testland 5, Valdoria 4 of 12 votes; no winner (9 needed).'
    );
  });

  it('FR-297 the first nominee first: Valdoria first when it is the first nominee', () => {
    expect(eventText(met(nominee('nation-2', 5), nominee('nation-1', 3)), name)).toBe(
      'Council of Governors: Valdoria 5, Testland 3 of 12 votes; no winner (9 needed).'
    );
  });

  it('FR-297 a winner: "Council of Governors: Testland wins with 9 of 12 votes."', () => {
    expect(eventText(met(nominee('nation-1', 5, 1, 3), nominee('nation-2', 3), 'nation-1'), name)).toBe(
      'Council of Governors: Testland wins with 9 of 12 votes.'
    );
  });

  it("FR-306 FR-297 FR-107 the first line of the news, before the player's own lines; the game over stays last; it carries its event", () => {
    const council = met(nominee('nation-1', 4), nominee('nation-2', 4));
    const over: GameEvent = { type: 'game-over', turn: 40, year: 1824, scores: [] };
    const events: GameEvent[] = [
      { type: 'army-upkeep', nationId: 'nation-2', amount: 100 },
      { type: 'turn-ended', turn: 40, year: 1824 },
      council,
      over,
      { type: 'army-upkeep', nationId: 'nation-1', amount: 125 },
    ];
    const items = newsItems(events, 'nation-1', name);
    expect(items.map((i) => i.text)).toEqual([
      'Council of Governors: Testland 4, Valdoria 4 of 12 votes; no winner (9 needed).',
      'Army upkeep: $125.',
      'Valdoria: Army upkeep: $100.',
      'Game over at the end of Winter 1824.',
    ]);
    expect(items.map((i) => i.council)).toEqual([council, undefined, undefined, undefined]);
    expect(items[0].battle).toBeUndefined();
  });

  it('M12 FR-414 the news line names the nominees by votes, most first: "Testland 8, Valdoria 4 of 12 votes"', () => {
    // Valdoria is the first nominee (the higher standing), Testland has more votes
    expect(eventText(met(nominee('nation-2', 4), nominee('nation-1', 7, 0, 1)), name)).toBe(
      'Council of Governors: Testland 8, Valdoria 4 of 12 votes; no winner (9 needed).'
    );
    expect(newsLines([met(nominee('nation-2', 2), nominee('nation-1', 5))], 'nation-2', name)).toEqual([
      'Council of Governors: Testland 5, Valdoria 2 of 12 votes; no winner (9 needed).',
    ]);
  });

  it('M12 FR-414 equal votes keep the standing order (the first nominee first)', () => {
    expect(eventText(met(nominee('nation-2', 4), nominee('nation-1', 4)), name)).toBe(
      'Council of Governors: Valdoria 4, Testland 4 of 12 votes; no winner (9 needed).'
    );
  });

  it('M12 FR-414 the event keeps its standing order (the Council screen reads it, FR-313)', () => {
    const event = met(nominee('nation-2', 4), nominee('nation-1', 8));
    eventText(event, name);
    expect(event.nominees.map((n) => n.nationId)).toEqual(['nation-2', 'nation-1']);
  });
});

// M12 FR-375: a news line about a tile names it by its id and its province ("coal at 5-2 in Testland North-West"; on a
// minor's land "in Lorran"), and its news item carries the `tileId` (FR-376 makes the line lead to the tile).
describe('M12 FR-375 the news names the place', () => {
  let world: GameState;
  let placeOf: (tileId: string) => string | undefined;
  const nameOf = (id: string) =>
    world.nations.find((n) => n.id === id)?.name ?? world.minorNations.find((m) => m.id === id)?.name ?? world.provinces.find((p) => p.id === id)?.name ?? id;
  const V = 'nation-2';
  beforeAll(() => {
    world = newGame({ seed: 1, world: 'continent' });
    placeOf = tilePlaces(world, nameOf);
  });

  it('FR-375 `tilePlaces` names a tile\'s province: 5-2 is in Testland North-West, 10-1 in Lorran; two-islands has none', () => {
    expect(placeOf('5-2')).toBe('Testland North-West');
    expect(placeOf('10-1')).toBe('Lorran');
    expect(placeOf('99-99')).toBeUndefined();
    const islands = newGame({ seed: 1 });
    expect(tilePlaces(islands, nameOf)('5-2')).toBeUndefined();
  });

  it('FR-375 resource found, development finished and construction finished name the tile and its province', () => {
    expect(eventText({ type: 'resource-discovered', tileId: '5-2', nationId: N1, resource: ResourceType.Coal }, nameOf, placeOf)).toBe(
      'Prospectors found coal at 5-2 in Testland North-West.'
    );
    expect(eventText({ type: 'resource-discovered', tileId: '5-2', nationId: N1 }, nameOf, placeOf)).toBe('Prospectors found nothing at 5-2 in Testland North-West.');
    expect(eventText({ type: 'development-completed', tileId: '5-2', nationId: N1, level: 2 }, nameOf, placeOf)).toBe(
      'Tile 5-2 in Testland North-West developed to level 2.'
    );
    expect(eventText({ type: 'construction-completed', tileId: '10-1', nationId: N1, structure: 'rail' }, nameOf, placeOf)).toBe('Rail finished at 10-1 in Lorran.');
  });

  it('FR-375 `newsItems` gives each tile line its tileId, the computer\'s lines too; other lines have none', () => {
    const events: GameEvent[] = [
      { type: 'resource-discovered', tileId: '5-2', nationId: N1, resource: ResourceType.Coal },
      { type: 'construction-completed', tileId: '10-1', nationId: V, structure: 'rail' },
      { type: 'army-upkeep', nationId: N1, amount: 100 },
    ];
    expect(newsItems(events, N1, nameOf, placeOf)).toEqual([
      { text: 'Prospectors found coal at 5-2 in Testland North-West.', tileId: '5-2' },
      { text: 'Army upkeep: $100.' },
      { text: 'Valdoria: Rail finished at 10-1 in Lorran.', tileId: '10-1' },
    ]);
  });

  it('FR-375 without a place lookup (or on a tile with no province) the line keeps its old words and still carries the tileId', () => {
    const found: GameEvent = { type: 'development-completed', tileId: '2-1', nationId: N1, level: 1 };
    expect(newsItems([found], N1, nameOf)).toEqual([{ text: 'Tile 2-1 developed to level 1.', tileId: '2-1' }]);
    expect(newsItems([found], N1, nameOf, () => undefined)).toEqual([{ text: 'Tile 2-1 developed to level 1.', tileId: '2-1' }]);
  });
});

it('FR-521 formats a public invention without attributing it to a buyer', () => {
  expect(newsLines([{ type: 'new-invention', techId: 'cottonGin' }], N1, id => id)).toEqual(['New Invention: Cotton Gin']);
});
