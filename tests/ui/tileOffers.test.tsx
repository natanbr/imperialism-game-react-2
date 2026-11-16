// @vitest-environment jsdom
// M12 (NR-033), lane L2. FR-381 (ECONOMY-05, FR-TRUTH-07, ECONOMY-04): a Tile Info job button is enabled only where the
// engine would accept its order; a disabled one shows its reason in a visible line under it, from the engine's own
// queries; each job shows its price, and the turns of a job that lasts several, beside the button ("$5,000, 3 turns");
// the button names stay. FR-382 (ECONOMY-06): Construction Options shows the price and the turns under Build Depot and
// Build Port and disables a button the engine would refuse, with FR-381's reason line; the names stay.
// Real newGame(): nation 1 "Testland", capital 2-9 with its seven civilians; 3-9 a farm next to the capital (no coast),
// 5-2 barren hills with hidden coal, 7-8 a farm two tiles from the capital (a depot site), 3-1 a coastal forest.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HUD } from '@/components/HUD';
import { ConstructionOptionsModal } from '@/components/ConstructionOptionsModal';
import { useGameStore } from '@/store/rootStore';
import { newGame, validateOrder, type Order } from '@/engine';
import { getAdjacentTiles } from '@/engine/map/mapHelpers';
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { ResourceType } from '@/types/Resource';
import { put, setTile, setTreasury, tileAt } from '../engine/fixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const N1 = 'nation-1';
const CAPITAL = '2-9';
const civilian = (state: GameState, type: WorkerType) =>
  state.map.tiles.flat().flatMap((t) => t.workers).find((w) => w.nationId === N1 && w.type === type)!.id;

let submitted: Order[] = [];

/** The game with `type` standing on `tileId`, the tile and the civilian selected, and the HUD on the page. */
function showOffers(state: GameState, type: WorkerType, tileId: string) {
  const id = civilian(state, type);
  const placed = tileId === CAPITAL ? state : put(state, id, tileId);
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: placed, activeNationId: N1, selectedTileId: tileId, selectedWorkerId: id });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({ submitOrder: (order: Order) => (submitted.push(order), submitOrder(order)) });
  render(<HUD />);
  return { state: placed, id };
}

const tileInfo = () => screen.getByTestId('tile-info');
const offerOf = (button: HTMLElement) => button.closest('[data-testid="job-offer"]') as HTMLElement;
/** A job button, its price line and its reason line (empty when the engine would accept it). */
function offer(name: string, root: HTMLElement = tileInfo()) {
  const button = within(root).getByRole('button', { name });
  const row = offerOf(button);
  const price = row.querySelector('[data-testid="job-price"]');
  const reason = row.querySelector('[data-testid="job-reason"]');
  return { button, price: price ? text(price) : '', reason: reason ? text(reason) : '' };
}
const isOff = (button: HTMLElement) => (button as HTMLButtonElement).disabled || button.getAttribute('aria-disabled') === 'true';

describe('FR-381 Tile Info offers only what can work, with its price', () => {
  beforeEach(() => useGameStore.setState(useGameStore.getInitialState()));

  it('FR-381 the capital: the engineer\'s four jobs are named as before, each priced; fort, depot and port are disabled with their reasons', () => {
    showOffers(newGame({ seed: 1 }), WorkerType.Engineer, CAPITAL);
    const fort = offer('Construct Fort');
    expect([isOff(fort.button), fort.price, fort.reason]).toEqual([true, '$5,000, 3 turns', 'This tile already has a fort.']);
    const depot = offer('Construct Depot');
    expect([isOff(depot.button), depot.price, depot.reason]).toEqual([true, '$2,000, 3 turns', 'The capital already gathers goods like a depot.']);
    const port = offer('Construct Port');
    expect([isOff(port.button), port.price, port.reason]).toEqual([true, '$3,000, 3 turns', 'The capital is already a port.']);
    // Rail takes one turn: the price alone
    expect(offer('Construct Rail').price).toBe('$100');
    // A disabled button points at its reason
    expect(document.getElementById(fort.button.getAttribute('aria-describedby') ?? '')?.textContent).toBe('This tile already has a fort.');
  });

  it('FR-381 a coal hill: the farmer\'s Develop is disabled ("A farmer cannot work barren hills."), priced "$100, 3 turns"', () => {
    const start = newGame({ seed: 1 });
    showOffers(start, WorkerType.Farmer, '5-2');
    const farmer = offer('Develop farmer L1');
    expect([isOff(farmer.button), farmer.price, farmer.reason]).toEqual([true, '$100, 3 turns', 'A farmer cannot work barren hills.']);
  });

  it('FR-381 the miner on hidden coal: Develop disabled, he is told to wait for the prospector', () => {
    const start = newGame({ seed: 1 });
    showOffers(start, WorkerType.Miner, '5-2');
    const hidden = offer('Develop miner L1');
    expect([isOff(hidden.button), hidden.reason]).toEqual([true, 'No resource found here yet: a prospector must find it first.']);
  });

  it('FR-381 the miner on found coal: Develop enabled, "$100, 3 turns", no reason line; a click sends startDevelopment', () => {
    const found = setTile(newGame({ seed: 1 }), '5-2', { resource: { ...tileAt(newGame({ seed: 1 }), '5-2').resource!, discovered: true } });
    const { id } = showOffers(found, WorkerType.Miner, '5-2');
    const miner = offer('Develop miner L1');
    expect([isOff(miner.button), miner.price, miner.reason]).toEqual([false, '$100, 3 turns', '']);
    fireEvent.click(miner.button);
    expect(submitted).toEqual([{ kind: 'startDevelopment', nationId: N1, workerId: id, tileId: '5-2' }]);
  });

  it('FR-381 the prospector on the coal hill: Prospect enabled at "$100" (one turn), no reason line', () => {
    const start = newGame({ seed: 1 });
    showOffers(start, WorkerType.Prospector, '5-2');
    const hills = offer('Prospect');
    expect([isOff(hills.button), hills.price, hills.reason]).toEqual([false, '$100', '']);
  });

  it('FR-381 the prospector on a farm: Prospect disabled, the reason names the terrains prospectors search', () => {
    showOffers(newGame({ seed: 1 }), WorkerType.Prospector, '3-9');
    const farm = offer('Prospect');
    expect([isOff(farm.button), farm.reason]).toEqual([true, 'Prospectors search only barren hills, mountains, swamp, desert and tundra.']);
  });

  it('FR-381 an inland tile next to the capital: no port ("A port needs the sea or a river next to it.") and no depot ("Too close to the capital or another depot.")', () => {
    showOffers(newGame({ seed: 1 }), WorkerType.Engineer, '3-9');
    expect(offer('Construct Port').reason).toBe('A port needs the sea or a river next to it.');
    expect(offer('Construct Depot').reason).toBe('Too close to the capital or another depot.');
    expect(isOff(offer('Construct Port').button)).toBe(true);
    expect(isOff(offer('Construct Depot').button)).toBe(true);
  });

  it('FR-381 a depot site two tiles from the capital: Construct Depot enabled, priced "$2,000, 3 turns", no reason line', () => {
    const start = newGame({ seed: 1 });
    showOffers(start, WorkerType.Engineer, '7-8');
    const free = offer('Construct Depot');
    expect([isOff(free.button), free.price, free.reason]).toEqual([false, '$2,000, 3 turns', '']);
  });

  it('FR-381 a tile next to a depot: Construct Depot disabled with "Too close to the capital or another depot."', () => {
    const start = newGame({ seed: 1 });
    const t = tileAt(start, '7-8');
    const neighbour = getAdjacentTiles(start.map, t.x, t.y).find((n) => n.ownerNationId === N1)!;
    showOffers(setTile(start, neighbour.id, { depot: true }), WorkerType.Engineer, '7-8');
    const next = offer('Construct Depot');
    expect([isOff(next.button), next.reason]).toEqual([true, 'Too close to the capital or another depot.']);
  });

  it('FR-381 not enough money: "Not enough money (needs $2,000)."; the enabled state follows the engine\'s validateOrder', () => {
    const { state, id } = showOffers(setTreasury(newGame({ seed: 1 }), N1, 1500), WorkerType.Engineer, '7-8');
    const depot = offer('Construct Depot');
    expect([isOff(depot.button), depot.reason]).toEqual([true, 'Not enough money (needs $2,000).']);
    for (const structure of ['depot', 'port', 'fort', 'rail'] as const) {
      const name = `Construct ${structure[0].toUpperCase()}${structure.slice(1)}`;
      const accepted = validateOrder(state, { kind: 'startConstruction', nationId: N1, workerId: id, tileId: '7-8', structure }).ok;
      expect({ name, off: isOff(offer(name).button) }).toEqual({ name, off: !accepted });
    }
  });

  it('FR-381 a disabled button sends nothing', () => {
    showOffers(newGame({ seed: 1 }), WorkerType.Engineer, CAPITAL);
    fireEvent.click(offer('Construct Fort').button);
    expect(submitted).toEqual([]);
  });
});

describe('FR-382 Construction Options tells price, time and reason', () => {
  beforeEach(() => useGameStore.setState(useGameStore.getInitialState()));

  function showOptions(state: GameState, tileId: string) {
    const id = civilian(state, WorkerType.Engineer);
    const placed = put(state, id, tileId);
    submitted = [];
    useGameStore.setState({ ...useGameStore.getInitialState(), game: placed, activeNationId: N1 });
    const submitOrder = useGameStore.getState().submitOrder;
    useGameStore.setState({ submitOrder: (order: Order) => (submitted.push(order), submitOrder(order)) });
    render(<ConstructionOptionsModal />);
    act(() => useGameStore.getState().openConstructionModal(tileId, id));
    return screen.getByRole('dialog', { name: 'Construction Options' });
  }

  it('FR-382 a coastal forest: Build Depot "$2,000, 3 turns" and Build Port "$3,000, 3 turns", both enabled, no reason line', () => {
    const dialog = showOptions(newGame({ seed: 1 }), '3-1');
    const depot = offer('Build Depot', dialog);
    const port = offer('Build Port', dialog);
    expect([isOff(depot.button), depot.price, depot.reason]).toEqual([false, '$2,000, 3 turns', '']);
    expect([isOff(port.button), port.price, port.reason]).toEqual([false, '$3,000, 3 turns', '']);
  });

  it('FR-382 next to the capital: Build Depot disabled with "Too close to the capital or another depot." and sends nothing; the port line gives its reason', () => {
    const dialog = showOptions(newGame({ seed: 1 }), '3-9');
    const depot = offer('Build Depot', dialog);
    expect([isOff(depot.button), depot.price, depot.reason]).toEqual([true, '$2,000, 3 turns', 'Too close to the capital or another depot.']);
    fireEvent.click(depot.button);
    expect(submitted).toEqual([]);
    expect(screen.getByRole('dialog', { name: 'Construction Options' })).toBeTruthy();
    // No port can stand here: no Build Port control, but its line says why
    expect(within(dialog).queryByRole('button', { name: 'Build Port' })).toBeNull();
    expect(text(within(dialog).getByTestId('port-offer'))).toBe('Build Port $3,000, 3 turns A port needs the sea or a river next to it.');
  });

  it('FR-382 not enough money: Build Port disabled with "Not enough money (needs $3,000)."', () => {
    const dialog = showOptions(setTreasury(newGame({ seed: 1 }), N1, 2500), '3-1');
    expect(isOff(offer('Build Depot', dialog).button)).toBe(false);
    const port = offer('Build Port', dialog);
    expect([isOff(port.button), port.reason]).toEqual([true, 'Not enough money (needs $3,000).']);
  });
});

// FR-386 (ECONOMY-09; FR-031 kept): Tile Info's Cancel asks in a game dialog, not window.confirm: "Cancel the farmer's job?
// The $1,000 comes back." for a job ordered this turn, "Stop the farmer's job? The $1,000 paid is lost." for one ordered
// earlier. FR-387 (ECONOMY-09): a civilian that moved and started a job with one click this turn: one confirmed Cancel
// sends the job's cancelWorkerAction, then the move's, so it stands where it stood with its money back.
describe('FR-386 FR-387 Cancel says what comes back', () => {
  beforeEach(() => useGameStore.setState(useGameStore.getInitialState()));

  const FARMER = 'worker-nation-1-2';
  /**
   * The game after `orders` (from `start`), `turnsLater` turns on, 3-9 selected, the HUD on the page; window.confirm is
   * watched.
   */
  function showAfter(orders: Order[], turnsLater = 0, start: GameState = newGame({ seed: 1 })) {
    submitted = [];
    useGameStore.setState({ ...useGameStore.getInitialState(), game: start, activeNationId: N1 });
    for (const order of orders) expect(useGameStore.getState().submitOrder(order)).toEqual({ ok: true });
    if (turnsLater) useGameStore.setState((s) => ({ game: { ...s.game, turn: s.game.turn + turnsLater } }));
    useGameStore.setState({ selectedTileId: '3-9' });
    const submitOrder = useGameStore.getState().submitOrder;
    useGameStore.setState({ submitOrder: (order: Order) => (submitted.push(order), submitOrder(order)) });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<HUD />);
    return confirm;
  }
  const cancelButton = () => within(screen.getByTestId('tile-info')).getByRole('button', { name: 'Cancel' });
  const question = () => screen.queryByRole('dialog', { name: /job\?$|move\?$/ });
  const cash = () => useGameStore.getState().game.nations.find((n) => n.id === N1)!.treasury;
  const farmerTile = () => useGameStore.getState().game.map.tiles.flat().find((t) => t.workers.some((w) => w.id === FARMER))!.id;

  afterEach(() => vi.restoreAllMocks());

  it('FR-386 a job ordered this turn: "Cancel the farmer\'s job? The $1,000 comes back." in a game dialog; confirmed, the money is back', () => {
    // The farmer already stands on 3-9 (no move this turn) and starts level 2 there
    const confirm = showAfter([{ kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: '3-9' }], 0, put(newGame({ seed: 1 }), FARMER, '3-9'));
    expect(cash()).toBe(9000);
    fireEvent.click(cancelButton());
    const dialog = question()!;
    expect(dialog).toBeTruthy();
    expect(text(dialog)).toContain("Cancel the farmer's job? The $1,000 comes back.");
    expect(confirm).not.toHaveBeenCalled();
    expect(submitted).toEqual([]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel the job' }));
    expect(question()).toBeNull();
    expect(submitted).toEqual([{ kind: 'cancelWorkerAction', nationId: N1, workerId: FARMER, tileId: '3-9' }]);
    expect(cash()).toBe(10000);
  });

  it('FR-386 a job ordered on an earlier turn: "Stop the farmer\'s job? The $1,000 paid is lost."; "Keep working" sends nothing', () => {
    showAfter([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: FARMER, toTileId: '3-9' }], 1);
    fireEvent.click(cancelButton());
    const dialog = question()!;
    expect(text(dialog)).toContain("Stop the farmer's job? The $1,000 paid is lost.");
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep working' }));
    expect(question()).toBeNull();
    expect(submitted).toEqual([]);
    fireEvent.click(cancelButton());
    fireEvent.click(within(question()!).getByRole('button', { name: 'Stop the job' }));
    expect(submitted.map((o) => o.kind)).toEqual(['cancelWorkerAction']);
    expect(cash()).toBe(9000);
  });

  it('FR-387 moved and started with one click this turn: one confirmed Cancel undoes both, the job then the move; the farmer is back on 2-9 with his money', () => {
    const confirm = showAfter([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: FARMER, toTileId: '3-9' }]);
    expect(cash()).toBe(9000);
    fireEvent.click(cancelButton());
    const dialog = question()!;
    expect(text(dialog)).toContain("Cancel the farmer's job? The $1,000 comes back. The farmer goes back to 2-9.");
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel the job' }));
    expect(submitted).toEqual([
      { kind: 'cancelWorkerAction', nationId: N1, workerId: FARMER, tileId: '3-9' },
      { kind: 'cancelWorkerAction', nationId: N1, workerId: FARMER, tileId: '3-9' },
    ]);
    expect(farmerTile()).toBe('2-9');
    expect(cash()).toBe(10000);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('FR-386 a plain move this turn: "Cancel the farmer\'s move? It goes back to 2-9."', () => {
    showAfter([{ kind: 'moveWorker', nationId: N1, workerId: FARMER, toTileId: '3-9' }]);
    fireEvent.click(cancelButton());
    const dialog = question()!;
    expect(text(dialog)).toContain("Cancel the farmer's move? It goes back to 2-9.");
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel the move' }));
    expect(submitted.map((o) => o.kind)).toEqual(['cancelWorkerAction']);
    expect(farmerTile()).toBe('2-9');
  });
});

/** The HUD with `tileId` selected, no civilian. */
function showTile(state: GameState, tileId: string) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, selectedTileId: tileId });
  return render(<HUD />);
}

/** The game with a connected depot or port of nation 1 on `tileId`, as the logistics phase reads it. */
function withHub(state: GameState, tileId: string, kind: 'depot' | 'port'): GameState {
  const [x, y] = tileId.split('-').map(Number);
  const networks = state.transportNetwork.railroadNetworks ?? {};
  const network = networks[N1];
  const node = [{ x, y, isActive: true }];
  return {
    ...setTile(state, tileId, { [kind]: true }),
    transportNetwork: { ...state.transportNetwork, railroadNetworks: { ...networks, [N1]: { ...network, ...(kind === 'depot' ? { depots: node } : { ports: node }) } } },
  };
}

// M12 (NR-033), lane L2. FR-391 (ECONOMY-15): Tile Info of the player's tile with a known resource says who collects it,
// by the logistics phase's own rule (`collectingHub`, L1): the capital, a depot or a port on the tile or next to it, with
// its units a turn (the development table); or that nothing does.
describe('FR-391 Tile Info says who collects the tile', () => {
  const collected = () => within(screen.getByTestId('tile-info')).queryByTestId('tile-collected');

  it('FR-391 the farm 3-9 next to the capital (grain level 1): "Collected by the capital: 2 grain a turn", under the resource', () => {
    showTile(newGame({ seed: 1 }), '3-9');
    expect(text(collected()!)).toBe('Collected by the capital: 2 grain a turn');
    const resource = within(screen.getByTestId('tile-info')).getByText('Resource:').closest('p')!;
    expect(resource.nextElementSibling).toBe(collected());
  });

  it('FR-391 the farm 4-8, two tiles from the capital with no depot: "Not collected: no connected depot, port or capital next to it"', () => {
    showTile(newGame({ seed: 1 }), '4-8');
    expect(text(collected()!)).toBe('Not collected: no connected depot, port or capital next to it');
  });

  it('FR-391 a connected depot on the farm 7-8 (grain level 0): "Collected by the depot at 7-8: 1 grain a turn"; a port there "the port at 7-8"', () => {
    showTile(withHub(newGame({ seed: 1 }), '7-8', 'depot'), '7-8');
    expect(text(collected()!)).toBe('Collected by the depot at 7-8: 1 grain a turn');
    cleanup();
    showTile(withHub(newGame({ seed: 1 }), '7-8', 'port'), '7-8');
    expect(text(collected()!)).toBe('Collected by the port at 7-8: 1 grain a turn');
  });

  it('FR-391 found coal at level 0 by the capital: "Collected by the capital: no coal until it is developed"', () => {
    showTile(setTile(newGame({ seed: 1 }), '3-9', { resource: { type: ResourceType.Coal, level: 0, discovered: true } }), '3-9');
    expect(text(collected()!)).toBe('Collected by the capital: no coal until it is developed');
  });

  it('FR-391 no line for the capital (no resource), hidden coal on 5-2 or the other nation\'s farm', () => {
    const start = newGame({ seed: 1 });
    const theirs = start.map.tiles.flat().find((t) => t.ownerNationId === 'nation-2' && t.resource && t.resource.discovered !== false)!;
    for (const id of [CAPITAL, '5-2', theirs.id]) {
      showTile(start, id);
      expect(collected(), id).toBeNull();
      cleanup();
    }
  });
});

// FR-388 (card Q88): Tile Info shows a fort's level, after the civilians, so the first civilian row stays where FR-371
// put it.
describe('FR-388 Tile Info shows the fort', () => {
  const fortLine = () => within(screen.getByTestId('tile-info')).queryByTestId('tile-fort');

  it('FR-388 the capital on turn 1 (continent world): "Fort: level 1", after the civilians\' list; the farm 3-9 none', () => {
    const start = newGame({ seed: 1, world: 'continent' });
    showTile(start, CAPITAL);
    expect(text(fortLine()!)).toBe('Fort: level 1');
    const civilians = within(screen.getByTestId('tile-info')).getByRole('list');
    expect(civilians.compareDocumentPosition(fortLine()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();
    showTile(start, '3-9');
    expect(fortLine()).toBeNull();
  });

  it('FR-388 a fort of level 2 on the farm 3-9: "Fort: level 2"', () => {
    showTile(setTile(newGame({ seed: 1 }), '3-9', { fortLevel: 2 }), '3-9');
    expect(text(fortLine()!)).toBe('Fort: level 2');
  });
});
