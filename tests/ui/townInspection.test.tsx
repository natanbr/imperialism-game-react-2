// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { TownIncome } from '@/components/capital/TownIncome';
import { MapView } from '@/components/MapView';
import { TileInfoPanel } from '@/components/TileInfoPanel';
import { capitalProvinceOf } from '@/engine/army/armies';
import { addPort } from '@/engine/systems/railroadSystem';
import { transportConnectivitySystem } from '@/engine/systems/transportConnectivitySystem';
import { createTurnContext } from '@/engine/turn/context';
import { townsOf } from '@/engine/world/towns';
import { useGameStore } from '@/store/rootStore';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { N1, N2, setBuilding, setTile, tileAt } from '../engine/fixtures';
import { coastalFreightTown } from '../engine/townFreightFixture';

function show(game: GameState, viewer = N1) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: viewer });
}

it('FR-623 shows the same town facts when inspecting its seat or a neighbouring province tile', () => {
  const { game, province, seat } = coastalFreightTown();
  const knownTimber = townsOf(game, N1).find(t => t.provinceId === province.id)!.resources.timber;
  show(game);
  for (const id of [seat.id, province.tileIds.find(id => id !== seat.id)!]) {
    const pane = render(<TileInfoPanel selectedTile={tileAt(game, id)} />);
    const region = screen.getByRole('region', { name: 'Town development' });
    expect(region.textContent).toContain(province.name);
    expect(region.textContent).toContain(seat.id);
    expect(region.textContent).toMatch(/producing/i);
    expect(region.textContent).toMatch(/port/i);
    expect(region.textContent).toMatch(new RegExp(knownTimber + ' timber', 'i'));
    expect(region.textContent).toMatch(/Furniture factory[^.]*capacity 8/i);
    expect(region.textContent).toMatch(/1 of 2 qualifying settlements/i);
    expect(region.textContent).toMatch(/2 Lumber, 1 Furniture/i);
    pane.unmount();
  }
  expect(useGameStore.getState().ordersThisTurn).toEqual([]);
  expect(useGameStore.getState().game.townProgress?.[province.id].connectedSettlements).toBe(7);
});

it('FR-623 explains a closed port, retained progress and zero estimated output', () => {
  const { game, seat } = coastalFreightTown();
  game.transportNetwork.railroadNetworks![N1].closedFishingPorts = [seat.id];
  show(game);
  render(<TileInfoPanel selectedTile={tileAt(game, seat.id)} />);
  const text = screen.getByRole('region', { name: 'Town development' }).textContent;
  expect(text).toMatch(/disconnected/i);
  expect(text).toMatch(/port.*closed|closed.*port/i);
  expect(text).toMatch(/1 of 2 qualifying settlements/i);
  expect(text).toMatch(/before freight[^.]*none/i);
});

it('FR-623 gives rail advice for an inactive port with open water', () => {
  const { game, seat } = coastalFreightTown();
  const network = game.transportNetwork.railroadNetworks![N1];
  delete network.graph[`${seat.x},${seat.y}`];
  const position = transportConnectivitySystem(game, createTurnContext({ turn: game.turn }));
  show(position);
  render(<TileInfoPanel selectedTile={tileAt(position, seat.id)} />);
  const info = screen.getByRole('region', { name: 'Town development' }).textContent;
  expect(info).toMatch(/disconnected/i);
  expect(info).toMatch(/port[^.]*rail|rail[^.]*port/i);
  expect(info).not.toMatch(/port route closed|reopen.*water/i);
});

it('FR-623 explains lost water access for an inactive river port with no rail link', () => {
  const { game } = coastalFreightTown();
  const seat = tileAt(game, '7-6');
  const province = game.provinces.find(p => p.id === seat.provinceId)!;
  game.provinces = game.provinces.map(p => p === province ? { ...p, seatTileId: seat.id } : p);
  const built = addPort(setTile(game, seat.id, { port: true, hasRiver: true }), N1, seat);
  const position = transportConnectivitySystem(built, createTurnContext({ turn: game.turn }));
  show(position);
  render(<TileInfoPanel selectedTile={tileAt(position, seat.id)} />);
  const info = screen.getByRole('region', { name: 'Town development' }).textContent;
  expect(info).toMatch(/port route closed/i);
  expect(info).toMatch(/reopen.*water/i);
});

it('FR-623 FR-624 shows the growth counter in both views when timber and capacity already support the next tier', () => {
  const { game: fixture, province, seat } = coastalFreightTown();
  let game = setBuilding(fixture, N1, 'furnitureFactory', { capacity: 16 });
  for (const id of province.tileIds.slice(0, 8)) {
    game = setTile(game, id, { resource: { type: ResourceType.Timber, level: 1 } });
  }
  game.townProgress![province.id].upgradeSettlements.wood = 0;
  show(game);
  render(<><TileInfoPanel selectedTile={tileAt(game, seat.id)} /><TownIncome /></>);
  const inspection = screen.getByRole('region', { name: 'Town development' });
  const income = screen.getByRole('region', { name: 'Town income' });
  const wood = within(inspection).getByText(/^Furniture factory$/i).closest('li')!;
  for (const row of [wood, within(income).getByText('1 Lumber').closest('p')!]) {
    expect(row.textContent).toMatch(/growth toward tier 2: 0 of 2 qualifying settlements/i);
    expect(row.textContent).not.toMatch(/next tier.*(?:needs|requires)/i);
  }
});

it('FR-623 distinguishes an idle seat awaiting its first connection from a town whose connection was lost', () => {
  const { game, province, seat } = coastalFreightTown();
  game.transportNetwork.railroadNetworks![N1] = { graph: {}, ports: [], depots: [] };
  const neverServed = { ...game, townProgress: undefined };
  for (const [position, status] of [[neverServed, 'Idle'], [game, 'Disconnected']] as const) {
    show(position);
    const { container, unmount } = render(<><MapView /><TileInfoPanel selectedTile={tileAt(position, seat.id)} /></>);
    const marker = within(container.querySelector<HTMLElement>(`[data-tile-id="${seat.id}"]`)!).getByTestId('town-marker');
    expect(marker.title).toBe(`${province.name} town, ${status}`);
    const info = screen.getByRole('region', { name: 'Town development' });
    expect(info.textContent).toContain(status);
    expect(info.textContent).toMatch(/connect a depot or open port/i);
    unmount();
  }
});

it('FR-623 identifies first-tier resource and installed factory gaps when the route works but no chain qualifies', () => {
  const { game, province, seat } = coastalFreightTown();
  let position = setBuilding(game, N1, 'furnitureFactory', { capacity: 2 });
  for (const id of province.tileIds) {
    position = setTile(position, id, { resource: province.tileIds.indexOf(id) < 2
      ? { type: ResourceType.Timber, level: 0 } : undefined });
  }
  show(position);
  render(<TileInfoPanel selectedTile={tileAt(position, seat.id)} />);
  const info = screen.getByRole('region', { name: 'Town development' });
  expect(info.textContent).toMatch(/Idle.*Connected through the port/i);
  const gaps = within(info).getByRole('list', { name: 'Missing requirements for first output' });
  const lumber = within(gaps).getByText(/Lumber needs/i).textContent;
  expect(lumber).toMatch(/Furniture factory capacity 4 \(2 installed\)/i);
  expect(lumber).not.toMatch(/timber/i);
  expect(within(gaps).getByText(/Fabric needs/i).textContent).toMatch(/2 cotton or wool tiles/i);
  expect(within(gaps).getByText(/Steel needs/i).textContent).toMatch(/2 coal.*2 iron ore tiles/i);
});

it.each([
  { matured: 4, capacity: 4, expected: /Matured tier 4.*support tier 1/i },
  { matured: 3, capacity: 16, expected: /Growth toward tier 4: 1 of 2 qualifying settlements.*next settlement reaches the highest tier/i },
])('FR-623 distinguishes earned tier $matured from the capacity-$capacity projection', ({ matured, capacity, expected }) => {
  const { game: fixture, province, seat } = coastalFreightTown();
  let game = setBuilding(fixture, N1, 'furnitureFactory', { capacity });
  for (const id of province.tileIds.slice(0, 8)) {
    game = setTile(game, id, { resource: { type: ResourceType.Timber, level: 1 } });
  }
  game.townProgress![province.id].matured.wood = matured;
  show(game);
  render(<TileInfoPanel selectedTile={tileAt(game, seat.id)} />);
  const wood = screen.getByText(/^Furniture factory$/i).closest('li')!.textContent;
  expect(wood).toMatch(expected);
  expect(wood).not.toMatch(/tier 5/i);
});

it('FR-623 identifies the capital exception and ordinary startup on map seats without changing the underlying terrain label', () => {
  const { game, province, seat } = coastalFreightTown();
  delete game.townProgress;
  const capital = capitalProvinceOf(game, N1)!;
  show(game);
  const { container } = render(<><MapView /><TileInfoPanel selectedTile={tileAt(game, capital.seatTileId)} /></>);
  const marker = (id: string) => within(container.querySelector<HTMLElement>(`[data-tile-id="${id}"]`)!);
  const capitalMarker = marker(capital.seatTileId).getByTestId('town-marker');
  expect(capitalMarker.title).toMatch(/idle/i);
  expect(marker(seat.id).getByTestId('town-marker').title).toMatch(/developing/i);
  expect(marker(province.tileIds.find(id => id !== seat.id)!).queryByTestId('town-marker')).toBeNull();
  expect(screen.getByRole('region', { name: 'Town development' }).textContent).toMatch(/own capital/i);
  expect(container.querySelector(`[data-tile-id="${capital.seatTileId}"]`)?.getAttribute('aria-label')).toMatch(/capital.*owned by/i);
});

it.each(['normal', 'demo'] as const)('FR-625 %s shows only public seat information for a rival in the map and Tile Info', difficulty => {
  const { game, province, seat } = coastalFreightTown(difficulty);
  const hidden = province.tileIds.find(id => id !== seat.id)!;
  const changed = setBuilding(setTile(game, hidden, { resource: { type: ResourceType.Coal, discovered: false, level: 0 } }),
    N1, 'furnitureFactory', { capacity: 16, pendingCapacity: 4 });
  delete changed.townProgress;
  function inspect(position: GameState) {
    show(position, N2);
    const view = render(<><MapView /><TileInfoPanel selectedTile={tileAt(position, seat.id)} /></>);
    const group = view.container.querySelector<HTMLElement>(`[data-tile-id="${seat.id}"]`)!;
    const marker = within(group).getByTestId('town-marker');
    expect(marker.title).toContain(province.name);
    expect(marker.title).not.toMatch(/idle|developing|producing|disconnected/i);
    const panel = screen.getByTestId('tile-info');
    expect(panel.textContent).toContain(seat.id);
    expect(panel.textContent).not.toMatch(/furniture|factory|settlements/i);
    const result = [group.outerHTML, panel.textContent];
    view.unmount();
    return result;
  }
  expect(inspect(changed)).toEqual(inspect(game));
});
