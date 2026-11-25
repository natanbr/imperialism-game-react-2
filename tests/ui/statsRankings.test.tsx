// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatsDialog } from '@/components/HUD/StatsDialog';
import { newGame, tryApplyOrder } from '@/engine';
import { createGameStore, useGameStore } from '@/store/rootStore';
import { saveOf } from '@/store/persistence';
import type { RankRecord } from '@/store/rankHistory';
import type { GameState } from '@/types/GameState';
import { MaterialType } from '@/types/Resource';

const nationA = 'nation-1';
const nationB = 'nation-2';
const tied = [{ nationId: nationA, place: 1 }, { nationId: nationB, place: 1 }];
const aLeads = [{ nationId: nationA, place: 1 }, { nationId: nationB, place: 2 }];
const bLeads = [{ nationId: nationB, place: 1 }, { nationId: nationA, place: 2 }];
const records: RankRecord[] = [
  { turn: 2, places: { industry: aLeads, exports: tied } },
  { turn: 3, places: { industry: bLeads, exports: tied } },
  { turn: 5, places: { industry: tied, exports: bLeads } },
];

function open(game: GameState, rankHistory?: RankRecord[]) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, rankHistory });
  const rendered = render(<StatsDialog onClose={() => {}} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Rankings' }));
  return { panel: within(screen.getByRole('tabpanel', { name: 'Rankings' })), ...rendered };
}

describe('FR-610 FR-611 Stats rankings', () => {
  it('distinguishes the first turn from unavailable earlier turns in a v1 save', () => {
    const game = newGame({ seed: 1 });
    const { panel } = open(game);
    expect(panel.getByText(/after the first turn settles/i)).toBeTruthy();
    act(() => useGameStore.setState({ game: { ...game, turn: 6 } }));
    expect(panel.getByText(/turns 1[–-]5.*unavailable/i)).toBeTruthy();
    expect(panel.queryByRole('list')).toBeNull();
  });

  it('shows earlier leaders, ties and explicit gaps in the readable history, without altering the session or next settlement', () => {
    const game = { ...newGame({ seed: 1 }), turn: 6 };
    const closed = createGameStore({ game });
    closed.setState({ rankHistory: structuredClone(records) });
    const { panel, unmount } = open(game, records);
    const history = panel.getByRole('table', { name: 'Industry (installed capacity) by turn' });
    const rows = within(history).getAllByRole('row').slice(1);
    expect(rows.map(row => row.textContent)).toEqual(['1Unavailable', '21st2nd', '32nd1st', '4Unavailable', '51st1st']);
    const turn = panel.getByLabelText('Resolved turn');
    for (const [value, expected] of [['2', ['1stTestland', '2ndValdoria']], ['3', ['1stValdoria', '2ndTestland']], ['5', ['1stTestland', '1stValdoria']]] as const) {
      fireEvent.change(turn, { target: { value } });
      const placings = panel.getByRole('list', { name: `Placings on turn ${value}` });
      expect(within(placings).getAllByRole('listitem').map(li => li.textContent?.replace(/\s/g, ''))).toEqual(expected);
    }
    unmount();
    const timestamp = new Date(0);
    const saved = () => saveOf(useGameStore.getState(), timestamp);
    expect(saved()).toEqual(saveOf(closed.getState(), timestamp));
    useGameStore.getState().advanceTurn();
    closed.getState().advanceTurn();
    expect(saved()).toEqual(saveOf(closed.getState(), timestamp));
  });

  it('NR-040 FR-497 rankings including accessible names, attributes and chart geometry agree across private orders and Normal/Demo', () => {
    const store = createGameStore({ seed: 1 });
    store.getState().advanceTurn();
    const { game, rankHistory } = store.getState();
    const { panel } = open(game, rankHistory);
    const bid = tryApplyOrder(game, { kind: 'buyCommodity', nationId: nationB, commodity: MaterialType.Steel, amount: 1 });
    expect(bid.result.ok).toBe(true);
    expect(bid.state.nations[1].treasury).toBeLessThan(game.nations[1].treasury!);
    const pending = [
      { kind: 'army-move', fromProvinceId: 'province-a', toProvinceId: 'province-b', regimentIds: ['regiment-1'] },
      { kind: 'grant', targetId: 'minor-1', amount: 1000, cost: 1000, locked: false },
      { kind: 'trade-policy', targetId: nationA, boycott: true, subsidyPercent: 0 },
    ].map((intent, i) => ({ ...intent, nationId: nationB, turn: game.turn, id: `intent-2-${i + 1}` }));
    const secret: GameState = { ...bid.state, intents: pending, nations: bid.state.nations.map(n => n.id === nationB
      ? { ...n, treasury: n.treasury! - 1000, recruiting: { regulars: 1 } } : n) };
    const measure = panel.getByLabelText('Measure') as HTMLSelectElement;
    for (const option of Array.from(measure.options)) {
      act(() => useGameStore.setState({ game }));
      fireEvent.change(measure, { target: { value: option.value } });
      const content = () => screen.getByRole('tabpanel', { name: 'Rankings' }).innerHTML;
      const normal = content();
      for (const variant of [bid.state, secret, { ...game, difficulty: 'demo' as const }, { ...secret, difficulty: 'demo' as const }]) {
        act(() => useGameStore.setState({ game: variant }));
        expect(content(), option.text).toBe(normal);
      }
    }
  });
});
