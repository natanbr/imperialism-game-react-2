// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
import TransportAllocationModal from '@/components/TransportAllocationModal';
import { CapitalModal } from '@/components/CapitalModal';
import { NewsPanel } from '@/components/HUD/NewsPanel';
import { useGameStore } from '@/store/rootStore';
import type { GameEvent } from '@/engine/turn/context';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { newGame } from '@/engine/newGame';
import { transferProvince } from '@/engine/world/provinces';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { coastalFreightTown } from '../engine/townFreightFixture';
import { N1, N2, setBuilding, setTile } from '../engine/fixtures';

// Testing Library's accessibility engine publishes its declarations alongside its CommonJS entry.
type AccessibilityApi = typeof import('dom-accessibility-api', { with: { 'resolution-mode': 'require' } });
const { computeAccessibleDescription, computeAccessibleName }: AccessibilityApi = createRequire(import.meta.url)('dom-accessibility-api');

it('FR-621 Transport offers the maturing bundle and schedules a reserved car before automatic freight', () => {
  const { game } = coastalFreightTown();
  game.transportAllocationsByNation = { [N1]: { furniture: 1, lumber: 0 } };
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1 });
  render(<TransportAllocationModal capacity={1} onClose={() => {}} />);
  const slider = (name: string) => screen.getByRole<HTMLInputElement>('slider', { name });
  expect([slider('Furniture').max, slider('Furniture').value]).toEqual(['1', '1']);
  expect([slider('Lumber').max, slider('Lumber').value]).toEqual(['2', '0']);
  expect(useGameStore.getState().game).toBe(game);
  expect(useGameStore.getState().ordersThisTurn).toEqual([]);
});

it('FR-621 automatic and capped town freight name both the available and scheduled amounts', () => {
  const { game } = coastalFreightTown();
  game.transportAllocationsByNation = { [N1]: { furniture: 1 } };
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1 });
  render(<TransportAllocationModal capacity={1} onClose={() => {}} />);
  for (const [name, available, scheduled] of [['Lumber', 2, 0], ['Furniture', 1, 1]] as const) {
    const row = screen.getByTestId(`transport-row-${name.toLowerCase()}`);
    const slider = within(row).getByRole('slider', { name });
    const description = document.getElementById(slider.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toMatch(new RegExp(`town.*${available} available.*${scheduled} scheduled`, 'i'));
    expect(row.contains(description)).toBe(true);
  }
});

function income() {
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Capital sections' })).getByRole('button', { name: 'Transport' }));
  return screen.getByRole('region', { name: 'Town income' });
}

it('FR-624 Capital shows next-settlement output and dated warehouse deliveries from the same short shipment', () => {
  const { game, province } = coastalFreightTown();
  game.nations = game.nations.map(n => n.id === N1 ? { ...n, transportCapacity: 1 } : n);
  const turn = resolveTurn(game, { [N1]: [{ kind: 'setTransportAllocations', nationId: N1, allocations: { furniture: 1, lumber: 0 } }] });
  const session = { ...useGameStore.getInitialState(), game: turn.state, activeNationId: N1, isCapitalOpen: true,
    eventLog: [{ turn: game.turn, year: game.year, events: turn.events }] };
  const before = JSON.stringify([session.game, session.eventLog, session.ordersThisTurn]);
  useGameStore.setState(session);
  render(<CapitalModal />);
  const panel = income();
  expect(panel.textContent).toContain(province.name);
  expect(panel.textContent).toMatch(/next settlement/i);
  expect(panel.textContent).toMatch(/2 Lumber.*1 Furniture/i);
  expect(panel.textContent).toMatch(/Furniture Factory.*capacity 8/i);
  expect(panel.textContent).toMatch(/next.*capacity 12/i);
  expect(panel.textContent).toMatch(new RegExp(`deliveries.*turn ${game.turn}`, 'i'));
  expect(panel.textContent).toMatch(/0 of 2 Lumber.*1 of 1 Furniture/i);
  fireEvent.click(screen.getByRole('button', { name: 'Close capital' }));
  const { game: after, eventLog, ordersThisTurn } = useGameStore.getState();
  expect(JSON.stringify([after, eventLog, ordersThisTurn])).toBe(before);
});

it('FR-624 Capital shows an empty state on Two islands before the first settlement', () => {
  const game = newGame({ seed: 1, world: 'two-islands' });
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1, isCapitalOpen: true });
  render(<CapitalModal />);
  const panel = income();
  expect(panel.textContent).toMatch(/no town output/i);
  expect(panel.textContent).toMatch(/no (resolved turn|deliveries)/i);
});

function readingOf(panel: HTMLElement) {
  const controls = [...panel.querySelectorAll('input, button, [aria-label], [aria-labelledby], [aria-describedby]')];
  return { text: panel.textContent, controls: controls.map(el => [computeAccessibleName(el),
    computeAccessibleDescription(el), el.getAttribute('aria-valuetext'), el.getAttribute('value'), el.getAttribute('max')]) };
}

it.each(['normal', 'demo'] as const)('FR-624 FR-625 %s Capital, Transport and News keep the former owner’s receipt and hide the new owner’s finances', difficulty => {
  const { game, province, seat } = coastalFreightTown(difficulty);
  const transferred = setTile(transferProvince(game, province.id, N2), seat.id, {
    resource: { type: ResourceType.Coal, level: 0, discovered: false },
  });
  const privateChanges = setBuilding(setTile(transferred, seat.id, {
    resource: { type: ResourceType.IronOre, level: 0, discovered: false },
  }), N2, 'metalWorks', { capacity: 16, pendingCapacity: 2 });
  privateChanges.nations = privateChanges.nations.map(n => n.id === N2 ? { ...n, warehouse: { ...n.warehouse, steel: 91 } } : n);
  privateChanges.intents = [...privateChanges.intents, { id: 'private-withdrawal', nationId: N2, kind: 'grant-stop', turn: 8, targetId: 'arvelia' }];
  privateChanges.transportAllocationsByNation = { [N2]: { hardware: 3 } };
  privateChanges.townProgress = { [province.id]: { ownerId: N2, connectedSettlements: 14,
    matured: { textile: 1, wood: 2, metal: 3 }, upgradeSettlements: { textile: 0, wood: 0, metal: 1 } } };
  const own: GameEvent = { type: 'town-receipt', turn: 7, nationId: N1, provinceId: province.id, seatTileId: seat.id,
    lines: [{ commodity: MaterialType.Lumber, offered: 2, delivered: 0 }] };
  const foreign: GameEvent = { ...own, nationId: N2, lines: [{ commodity: MaterialType.Steel, offered: 3, delivered: 2 }] };
  const readings = [transferred, privateChanges].map((position, i) => {
    const report = { turn: 7, year: 1816, events: i ? [foreign, own] : [own] };
    useGameStore.setState({ ...useGameStore.getInitialState(), game: position, activeNationId: N1, isCapitalOpen: true, eventLog: [report] });
    const view = render(<CapitalModal />);
    const panel = income();
    const capital = readingOf(panel);
    expect(capital.text).toContain(province.name);
    expect(capital.text).toMatch(/0 of 2 Lumber/i);
    expect(capital.text).not.toMatch(/Steel/i);
    expect(capital.text).toMatch(/no town output/i);
    view.unmount();
    const freightView = render(<TransportAllocationModal capacity={1} onClose={() => {}} />);
    const transport = readingOf(screen.getByRole('dialog', { name: 'Transportation of Commodities' }));
    freightView.unmount();
    const newsView = render(<NewsPanel />);
    const news = readingOf(screen.getByRole('list', { name: /turn 7/ }));
    expect(news.text).toContain(province.name);
    expect(news.text).toMatch(/0 of 2 Lumber/i);
    expect(news.text).not.toMatch(/Steel/i);
    newsView.unmount();
    return { capital, transport, news };
  });
  expect(readings[1]).toEqual(readings[0]);
});

it.each(['normal', 'demo'] as const)('FR-622 FR-625 %s News addresses short shipments to the recipient even after transfer', difficulty => {
  const { game, province, seat } = coastalFreightTown(difficulty);
  const own: GameEvent = { type: 'town-receipt', turn: 7, nationId: N1, provinceId: province.id, seatTileId: seat.id,
    lines: [{ commodity: MaterialType.Lumber, offered: 2, delivered: 1 }, { commodity: GoodsType.Furniture, offered: 1, delivered: 0 }] };
  const foreign: GameEvent = { ...own, nationId: N2, lines: [{ commodity: MaterialType.Steel, offered: 3, delivered: 3 }] };
  const report = { turn: 7, year: 1816, events: [foreign, own] };
  const session = { ...useGameStore.getInitialState(), game: { ...game, turn: 8,
    provinces: game.provinces.map(p => p.id === province.id ? { ...p, ownerId: N2 } : p) },
    activeNationId: N1, eventLog: [report] };
  useGameStore.setState(session);
  for (let i = 0; i < 2; i++) {
    const view = render(<NewsPanel />);
    const list = screen.getByRole('list', { name: /turn 7/ });
    const receipt = within(list).getAllByRole('listitem').map(item => item.textContent).join(' ');
    expect(receipt).toContain(province.name);
    expect(receipt).toMatch(/1 of 2 Lumber/i);
    expect(receipt).toMatch(/0 of 1 Furniture/i);
    expect(receipt).toMatch(/freight/i);
    expect(receipt).not.toMatch(/Steel/i);
    expect(useGameStore.getState().game).toBe(session.game);
    expect(useGameStore.getState().eventLog).toBe(session.eventLog);
    view.unmount();
  }
});
