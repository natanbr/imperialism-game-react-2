// @vitest-environment jsdom
// M12 (NR-033), lane L2. FR-373 (UIV-05, ARMY-WAR-15, card Q81): a refused order from a map click, Tile Info or a map
// dialog shows its refusal in a status line (role="status", polite) at the bottom centre of the map area, for 6 seconds
// or until the next map click; the HUD keeps its own refusal line. With regiments selected, a click on another country's
// province they do not border says "Not next to <province>: the selected regiments are in <their province>." and keeps
// the selection. FR-374 (ECONOMY-24, card Q86): a click whose job is refused and whose plain move is accepted says both.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { useGameStore } from '@/store/rootStore';
import { adjacentProvinces, newGame, provinceById, type Order } from '@/engine';
import { submitAndSay } from '@/hooks/tileClickOrders';
import type { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { continent } from '../engine/armyFixtures';
import { locate, put, setTile } from '../engine/fixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const N1 = 'nation-1';

function show(state: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1 });
}
const workerOf = (state: GameState, type: WorkerType) =>
  state.map.tiles.flat().flatMap((t) => t.workers).find((w) => w.nationId === N1 && w.type === type)!.id;
const tile = (id: string) => document.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const status = () => screen.getByTestId('map-status');
const seaOf = (state: GameState) => state.map.tiles.flat().find((t) => t.terrain === TerrainType.Water)!;

describe('FR-373 the map status line', () => {
  afterEach(() => vi.useRealTimers());

  it('FR-373 a prospector sent onto the sea: "Move refused: not possible on that tile." in a polite status line', () => {
    const state = newGame({ seed: 1 });
    show(state);
    render(<MapView />);
    expect(status().getAttribute('role')).toBe('status');
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(text(status())).toBe('');
    act(() => useGameStore.getState().selectWorker(workerOf(state, WorkerType.Prospector)));
    fireEvent.click(tile(seaOf(state).id));
    expect(text(status())).toBe('Move refused: not possible on that tile.');
    // The HUD keeps its own line
    expect(useGameStore.getState().lastRejection?.reason).toBe('invalid-target');
  });

  it('FR-373 the line goes after 6 seconds', () => {
    vi.useFakeTimers();
    const state = newGame({ seed: 1 });
    show(state);
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(workerOf(state, WorkerType.Prospector)));
    fireEvent.click(tile(seaOf(state).id));
    act(() => void vi.advanceTimersByTime(5999));
    expect(text(status())).toBe('Move refused: not possible on that tile.');
    act(() => void vi.advanceTimersByTime(1));
    expect(text(status())).toBe('');
  });

  it('FR-373 the next map click takes the line away', () => {
    const state = newGame({ seed: 1 });
    show(state);
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(workerOf(state, WorkerType.Prospector)));
    fireEvent.click(tile(seaOf(state).id));
    expect(text(status())).not.toBe('');
    act(() => useGameStore.getState().selectWorker(undefined));
    fireEvent.click(tile('5-8'));
    expect(text(status())).toBe('');
  });

  it('FR-373 an order from Tile Info or Construction Options that is refused says so in the same line', () => {
    const state = newGame({ seed: 1 });
    show(state);
    render(<MapView />);
    const order: Order = { kind: 'startProspecting', nationId: N1, workerId: workerOf(state, WorkerType.Prospector), tileId: '0-0' };
    let result: ReturnType<typeof submitAndSay> | undefined;
    act(() => {
      result = submitAndSay(order);
    });
    expect(result).toEqual({ ok: false, reason: 'invalid-target' });
    expect(text(status())).toBe('Prospect refused: not possible on that tile.');
  });

  it("FR-373 FR-381 a refused job also says the tile's own reason: \"Develop refused: that tile is not a valid site. A farmer cannot work barren hills.\"", () => {
    const state = newGame({ seed: 1 });
    const farmer = workerOf(state, WorkerType.Farmer);
    // 5-2: barren hills with hidden coal
    show(put(state, farmer, '5-2'));
    render(<MapView />);
    act(() => void submitAndSay({ kind: 'startDevelopment', nationId: N1, workerId: farmer, tileId: '5-2' }));
    expect(text(status())).toBe('Develop refused: that tile is not a valid site. A farmer cannot work barren hills.');
  });

  it.each([
    { startTile: '3-9', action: 'Develop', fallback: '' },
    { startTile: '2-9', action: 'Move and develop', fallback: ' The farmer moved there instead (Cancel brings it back).' },
  ])('FR-373 FR-374 FR-523 a farmer on $startTile clicking the locked farm sees its technology requirement', ({ startTile, action, fallback }) => {
    const state = newGame({ seed: 1 });
    const farmer = workerOf(state, WorkerType.Farmer);
    show(startTile === '2-9' ? state : put(state, farmer, startTile));
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(farmer));
    fireEvent.click(tile('3-9'));
    expect(text(status())).toBe(
      `${action} refused: the required technology is missing. Needs Steel and Iron Plows (Technology, $3,000, from turn 7).${fallback}`
    );
    expect(locate(useGameStore.getState().game, farmer)?.tile.id).toBe('3-9');
  });

  it('FR-373 the line sits at the bottom centre of the map area (left of the HUD), over the map and under the HUD', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'src/app/components/MapView.module.css'), 'utf8');
    const at = css.indexOf('.mapStatus {');
    expect(at).toBeGreaterThanOrEqual(0);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toMatch(/bottom: 12px;/);
    expect(rule).toMatch(/left: 0;/);
    expect(rule).toMatch(/right: var\(--hud-width\);/);
    expect(rule).toMatch(/justify-content: center;/);
    expect(rule).toMatch(/pointer-events: none;/);
  });
});

describe('FR-373 regiments selected and a province they do not border', () => {
  beforeEach(() => show(continent()));

  it('FR-373 the line says "Not next to <province>: the selected regiments are in <their province>." and the selection stays', () => {
    const state = useGameStore.getState().game;
    const army = state.armies.find((a) => a.ownerId === N1 && a.regiments.length > 0)!;
    const near = new Set(adjacentProvinces(state, army.provinceId).map((p) => p.id));
    const far = state.provinces.find((p) => p.ownerId !== N1 && !near.has(p.id))!;
    const target = state.map.tiles.flat().find((t) => t.provinceId === far.id)!;
    render(<MapView />);
    const selection = { provinceId: army.provinceId, regimentIds: army.regiments.map((r) => r.id) };
    act(() => useGameStore.getState().selectRegiments(selection.provinceId, selection.regimentIds));
    fireEvent.click(tile(target.id));
    expect(text(status())).toBe(`Not next to ${far.name}: the selected regiments are in ${provinceById(state, army.provinceId)!.name}.`);
    expect(useGameStore.getState().armySelection).toEqual(selection);
    expect(useGameStore.getState().attackPlan).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('FR-374 a fallback move is said on the map', () => {
  it('FR-374 the engineer clicks 3-9, where a farmer works: the rail is refused, the move is made, the line names both', () => {
    const state = setTile(newGame({ seed: 1 }), '3-9', {
      developmentJob: { workerId: 'someone', workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 3 },
    });
    show(state);
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(workerOf(state, WorkerType.Engineer)));
    fireEvent.click(tile('3-9'));
    expect(text(status())).toBe(
      'Rail refused: another civilian is already working that tile. The engineer moved there instead (Cancel brings it back).'
    );
  });
});
