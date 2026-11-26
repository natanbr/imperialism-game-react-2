// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import TransportAllocationModal from '@/components/TransportAllocationModal';
import { NewsPanel } from '@/components/HUD/NewsPanel';
import { useGameStore } from '@/store/rootStore';
import type { GameEvent } from '@/engine/turn/context';
import { GoodsType, MaterialType } from '@/types/Resource';
import { coastalFreightTown } from '../engine/townFreightFixture';
import { N1, N2 } from '../engine/fixtures';

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
