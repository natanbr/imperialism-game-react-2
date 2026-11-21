// @vitest-environment jsdom
// M12 T1 (card Q79): the game saves itself in this browser. FR-357 a resolved turn is written to one localStorage slot;
// FR-358 an accepted order or a new game within a second, one write per burst; FR-359 a usable save is offered on start
// ("Saved game": Continue, New game); FR-360 no save, no question; FR-361 a restored game plays on exactly; FR-362 an
// unusable save is refused with a message; FR-363 the leave-page question and the HUD line when a write fails.
// Trap (M12 notes 4): jsdom's localStorage is shared by the tests of this file, so every test clears it afterwards, and
// the store never loads a save by itself (only page.tsx at start).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { computerOrders, newGame, resolveTurn, type Order } from '@/engine';
import { createGameStore, useGameStore } from '@/store/rootStore';
import { HOW_TO_PLAY_SEEN_KEY, readSave, saveOf, startAutosave, SAVE_DELAY_MS, SAVE_KEY, SAVE_VERSION, type SavedGame } from '@/store/persistence';
// M12b (FR-471): the Not saved line moved from the cash block (NationStats) to the right pane's alerts
import { Alerts } from '@/components/HUD/Alerts';
import { isDialogOpen } from '@/store/controls/overlaySlice';
import Home from '@/page';
import { text } from '../ui/domText';
import { failOnActWarnings } from '../ui/actWarnings';

// The map is not part of these tests and is the slowest part of the page to render
vi.mock('@/components/MapView', () => ({ MapView: () => null }));

failOnActWarnings();

const ROOT = join(__dirname, '..', '..');
const N1 = 'nation-1';
const consulate = (targetId: string): Order => ({ kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId });

/** A Storage in memory, so a test can count writes or make them fail. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const slotOf = (storage: Storage): SavedGame => JSON.parse(storage.getItem(SAVE_KEY)!);

// FR-430: "How to play" opens on a browser's first new game; these tests are about saving, so it was seen (the How to
// play tests below remove the flag)
beforeEach(() => {
  window.localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
});

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('FR-357 autosave at End Turn', () => {
  it('FR-357 after advanceTurn the slot "imperialism-remake.save" holds the new turn as { version, savedAt, game, activeNationId, eventLog, orderLog, ordersThisTurn, turnStartTreasuries }, version 1', () => {
    const storage = memoryStorage();
    const store = createGameStore({ seed: 1 });
    const autosave = startAutosave(store, { storage });
    expect(store.getState().submitOrder(consulate('minor-1')).ok).toBe(true);

    store.getState().advanceTurn();

    expect(SAVE_KEY).toBe('imperialism-remake.save');
    expect(SAVE_VERSION).toBe(1);
    const saved = slotOf(storage);
    expect(Object.keys(saved).sort()).toEqual(['activeNationId', 'eventLog', 'game', 'orderLog', 'ordersThisTurn', 'savedAt', 'turnStartTreasuries', 'version']);
    const s = store.getState();
    expect(saved).toEqual({
      version: 1,
      savedAt: expect.any(String),
      game: json(s.game),
      activeNationId: N1,
      eventLog: json(s.eventLog),
      orderLog: json(s.orderLog),
      ordersThisTurn: [],
      turnStartTreasuries: null,
    });
    expect(saved.game.turn).toBe(2);
    expect(Number.isNaN(Date.parse(saved.savedAt))).toBe(false);
    autosave.stop();
  });

  it('FR-357 FR-018 the engine knows nothing of saving: no source under src/app/engine names localStorage or the save', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : /\.tsx?$/.test(name) ? [join(dir, name)] : []));
    const engine = files(join(ROOT, 'src/app/engine'));
    expect(engine.length).toBeGreaterThan(20);
    const offenders = engine.filter((f) => /localStorage|sessionStorage|imperialism-remake\.save|store\/persistence/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('FR-357 FR-359 the store never loads a save by itself: a new store with a save in the slot starts a new game and reads no storage', () => {
    const old = createGameStore({ seed: 1 });
    old.getState().advanceTurn();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveOf(old.getState())));
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    const store = createGameStore({ seed: 2 });

    expect(store.getState().game).toEqual(newGame({ seed: 2, world: 'continent' }));
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockRestore();
  });
});

describe('FR-358 autosave after orders', () => {
  it('FR-358 three orders within 200 ms give one write, within 1 second of the first, and the slot then holds the third order\'s state', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    const store = createGameStore({ seed: 1 });
    const autosave = startAutosave(store, { storage });

    expect(store.getState().submitOrder(consulate('minor-1')).ok).toBe(true);
    vi.advanceTimersByTime(100);
    expect(store.getState().submitOrder(consulate('minor-2')).ok).toBe(true);
    vi.advanceTimersByTime(100);
    expect(store.getState().submitOrder(consulate('minor-3')).ok).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
    expect(autosave.isPending()).toBe(true);

    vi.advanceTimersByTime(800);

    expect(SAVE_DELAY_MS).toBeLessThanOrEqual(1000);
    expect(setItem).toHaveBeenCalledTimes(1);
    const saved = slotOf(storage);
    expect(saved.ordersThisTurn).toEqual(store.getState().ordersThisTurn);
    expect(saved.ordersThisTurn).toHaveLength(3);
    expect(saved.game).toEqual(json(store.getState().game));
    expect(saved.turnStartTreasuries).toEqual(store.getState().turnStartTreasuries);
    expect(saved.turnStartTreasuries?.[N1]).toBe(10000);
    expect(autosave.isPending()).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(setItem).toHaveBeenCalledTimes(1);
    autosave.stop();
  });

  it('FR-358 a refused order writes nothing; a new game is written at once', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    const store = createGameStore({ seed: 1 });
    const autosave = startAutosave(store, { storage });

    expect(store.getState().submitOrder({ ...consulate('minor-1'), nationId: 'nation-2' }).ok).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(setItem).not.toHaveBeenCalled();

    store.getState().startNewGame({ seed: 7 });

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(slotOf(storage).game).toEqual(json(newGame({ seed: 7, world: 'continent' })));
    autosave.stop();
  });
});

describe('FR-361 a restored game plays on exactly', () => {
  it.each([1, 2, 3])('FR-361 seed %i: after a JSON round trip of the save at turns 1, 10 and 25, advanceTurn gives a deep-equal game, the same events and the same logs', (seed) => {
    const store = createGameStore({ seed });
    for (const checkpoint of [1, 10, 25]) {
      while (store.getState().game.turn < checkpoint) store.getState().advanceTurn();
      // An order of this turn, so this turn's orders and the treasuries at its start are part of the save
      expect(store.getState().submitOrder(consulate({ 1: 'minor-1', 10: 'minor-2', 25: 'minor-3' }[checkpoint]!)).ok).toBe(true);
      const restored = createGameStore({ seed: 99 });
      restored.getState().restoreGame(json(saveOf(store.getState())));

      store.getState().advanceTurn();
      restored.getState().advanceTurn();

      const [a, b] = [store.getState(), restored.getState()];
      expect(b.game).toEqual(a.game);
      expect(b.eventLog.at(-1)).toEqual(a.eventLog.at(-1));
      expect(b.orderLog).toEqual(a.orderLog);
      // The same turn the engine resolves from the original state
      expect(b.game.turn).toBe(checkpoint + 1);
    }
  });

  it('FR-357 FR-363 the save of a whole 40-turn game stays far below the browser\'s 5 MB, so a full storage is the exception', () => {
    const store = createGameStore({ seed: 1 });
    while (!store.getState().game.gameOver) store.getState().advanceTurn();
    const size = JSON.stringify(saveOf(store.getState())).length;
    expect(size).toBeLessThan(2_000_000);
  });

  it('FR-361 restoring is the engine\'s own turn: resolveTurn on the restored game equals resolveTurn on the original', () => {
    const store = createGameStore({ seed: 2 });
    for (let i = 0; i < 4; i++) store.getState().advanceTurn();
    const original = store.getState().game;
    const restored = json(saveOf(store.getState())).game;
    const a = resolveTurn(original, computerOrders(original), original.seed);
    const b = resolveTurn(restored, computerOrders(restored), restored.seed);
    expect(b.state).toEqual(a.state);
    expect(b.events).toEqual(a.events);
  });
});

describe('FR-362 an unusable save', () => {
  const broken: [string, string][] = [
    ['a slot that does not parse', '{"version":1,"game":'],
    ['a save of another version', JSON.stringify({ ...json(saveOf(createGameStore({ seed: 1 }).getState())), version: 2 })],
    ['a save without the game\'s map', JSON.stringify({ ...json(saveOf(createGameStore({ seed: 1 }).getState())), game: { turn: 3, nations: [] } })],
  ];

  it.each(broken)('FR-362 %s is not loaded', (_, raw) => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, raw);
    expect(readSave(storage)).toEqual({ kind: 'unusable' });
  });

  it('FR-360 FR-362 an empty slot is "empty", a good one "usable"; storage that throws reads as empty', () => {
    const storage = memoryStorage();
    expect(readSave(storage)).toEqual({ kind: 'empty' });
    const save = json(saveOf(createGameStore({ seed: 1 }).getState()));
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    expect(readSave(storage)).toEqual({ kind: 'usable', save });
    const blocked = { ...memoryStorage(), getItem: () => { throw new Error('SecurityError'); } } as Storage;
    expect(readSave(blocked)).toEqual({ kind: 'empty' });
    expect(readSave(undefined)).toEqual({ kind: 'empty' });
  });

  it.each(broken)('FR-362 %s: the start dialog says why and offers New game only; no exception reaches the console; the next save overwrites the slot', (_, raw) => {
    window.localStorage.setItem(SAVE_KEY, raw);
    // console.error is already a spy here (failOnActWarnings): count its calls
    const errors = () => (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.length;
    const before = errors();
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    render(React.createElement(Home));

    const dialog = screen.getByRole('dialog', { name: 'Saved game' });
    expect(text(dialog)).toContain('The saved game could not be loaded (it was made by another version of the game).');
    expect(within(dialog).getAllByRole('button').map((b) => text(b))).toEqual(['New game']);
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'New game' }));
    expect(errors()).toBe(before);

    fireEvent.click(within(dialog).getByRole('button', { name: 'New game' }));

    expect(screen.queryByRole('dialog', { name: 'Saved game' })).toBeNull();
    const saved = slotOf(window.localStorage);
    expect(saved.version).toBe(SAVE_VERSION);
    expect(saved.game).toEqual(json(useGameStore.getState().game));
    expect(saved.game.turn).toBe(1);
    expect(errors()).toBe(before);
  });
});

describe('FR-359 FR-360 the start of the page', () => {
  /** A game of seed 4 played to turn 6 with a tile selected and an order given this turn, saved in the browser's slot. */
  function savedGame() {
    const store = createGameStore({ seed: 4 });
    for (let i = 0; i < 5; i++) store.getState().advanceTurn();
    expect(store.getState().submitOrder(consulate('minor-1')).ok).toBe(true);
    const save = saveOf(store.getState());
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return store.getState();
  }

  it('FR-359 a usable save: a "Saved game" dialog names the nation, the turn of the limit and the date, with Continue focused and New game', () => {
    savedGame();
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    render(React.createElement(Home));

    const dialog = screen.getByRole('dialog', { name: 'Saved game' });
    expect(text(dialog)).toContain('Testland, turn 6 of 40, Summer 1816');
    expect(within(dialog).getAllByRole('button').map((b) => text(b))).toEqual(['Continue', 'New game']);
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Continue' }));
  });

  it('FR-359 Continue restores the game, the news, the order log and this turn\'s orders, with no tile or civilian selected, and writes nothing else over the save', () => {
    const played = savedGame();
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }), selectedTileId: '3-9', selectedWorkerId: 'worker-nation-1-1' });
    render(React.createElement(Home));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const s = useGameStore.getState();
    expect(screen.queryByRole('dialog', { name: 'Saved game' })).toBeNull();
    expect(s.game).toEqual(played.game);
    expect(s.game.seed).toBe(4);
    expect(s.eventLog).toEqual(json(played.eventLog));
    expect(s.orderLog).toEqual(played.orderLog);
    expect(s.ordersThisTurn).toEqual(played.ordersThisTurn);
    expect(s.turnStartTreasuries).toEqual(played.turnStartTreasuries);
    expect([s.selectedTileId, s.selectedWorkerId, s.isCapitalOpen, s.isDiplomacyOpen, s.battleQueue, s.councilShown]).toEqual([undefined, undefined, false, false, [], null]);
    expect(text(screen.getByTestId('turn-indicator'))).toContain('Turn: 6 of 40');
    expect(slotOf(window.localStorage).game).toEqual(json(played.game));
  });

  it('FR-359 a finished game continues on its game-over screen', () => {
    const store = createGameStore({ game: { ...newGame({ seed: 4, world: 'continent' }), turnLimit: 2 } });
    store.getState().advanceTurn();
    store.getState().advanceTurn();
    expect(store.getState().game.gameOver).toBeDefined();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveOf(store.getState())));
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    render(React.createElement(Home));

    const dialog = screen.getByRole('dialog', { name: 'Saved game' });
    expect(text(dialog)).toContain('Testland, game over after turn 2 of 2, Summer 1815');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeTruthy();
  });

  it('FR-359 New game throws the save away for a new game, written at once', () => {
    savedGame();
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    render(React.createElement(Home));

    fireEvent.click(within(screen.getByRole('dialog', { name: 'Saved game' })).getByRole('button', { name: 'New game' }));

    const s = useGameStore.getState();
    expect(s.game.turn).toBe(1);
    expect(s.eventLog).toEqual([]);
    expect(slotOf(window.localStorage).game).toEqual(json(s.game));
  });

  it('FR-360 an empty slot: the page starts the game at once, with no "Saved game" dialog, and writes it', () => {
    const fresh = newGame({ seed: 5, world: 'continent' });
    useGameStore.setState({ ...useGameStore.getInitialState(), game: fresh });
    render(React.createElement(Home));

    expect(screen.queryByRole('dialog', { name: 'Saved game' })).toBeNull();
    expect(useGameStore.getState().game).toBe(fresh);
    expect(slotOf(window.localStorage).game).toEqual(json(fresh));
  });
});

describe('FR-363 leaving the page and a failed write', () => {
  it('FR-363 a write that throws: the store says not saved, the page would ask before unloading, and the HUD says so until a write succeeds', () => {
    let full = true;
    const storage = memoryStorage();
    const failing: Storage = {
      ...storage,
      getItem: storage.getItem,
      setItem: (key, value) => {
        if (full) throw new DOMException('quota', 'QuotaExceededError');
        storage.setItem(key, value);
      },
    };
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }) });
    const autosave = startAutosave(useGameStore, { storage: failing });
    render(React.createElement(Alerts));
    expect(screen.queryByText(/Not saved/)).toBeNull();

    act(() => void expect(autosave.saveNow()).toBe(false));

    expect(useGameStore.getState().saveFailed).toBe(true);
    expect(autosave.beforeUnload()).toBe(true);
    expect(text(screen.getByRole('status'))).toBe('Not saved: the browser did not allow the game to be stored.');

    full = false;
    act(() => useGameStore.getState().advanceTurn());

    expect(useGameStore.getState().saveFailed).toBe(false);
    expect(screen.queryByText(/Not saved/)).toBeNull();
    expect(autosave.beforeUnload()).toBe(false);
    autosave.stop();
  });

  it('FR-363 a write still pending when the page unloads is written then, and the page does not ask; nothing pending, nothing failed: no question', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const store = createGameStore({ seed: 1 });
    const autosave = startAutosave(store, { storage });
    expect(autosave.beforeUnload()).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBeNull();

    store.getState().submitOrder(consulate('minor-1'));
    expect(autosave.isPending()).toBe(true);

    expect(autosave.beforeUnload()).toBe(false);
    expect(autosave.isPending()).toBe(false);
    expect(slotOf(storage).ordersThisTurn).toHaveLength(1);
    autosave.stop();
  });

  it('FR-363 the page registers beforeunload and asks only after a failed write', () => {
    const fresh = newGame({ seed: 5, world: 'continent' });
    useGameStore.setState({ ...useGameStore.getInitialState(), game: fresh });
    render(React.createElement(Home));
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().saveFailed).toBe(true);
    expect(unload()).toBe(true);
    setItem.mockRestore();
  });
});

// FR-430 (card Q98): "How to play" opens on the first new game in a browser, once; closing it records the flag
describe('FR-430 How to play on the first new game', () => {
  const howTo = () => screen.queryByRole('dialog', { name: 'How to play' });

  it('FR-430 a browser without the flag: an empty slot starts a new game and "How to play" opens, Close focused; closing it records "imperialism-remake.howto-seen"', () => {
    window.localStorage.removeItem(HOW_TO_PLAY_SEEN_KEY);
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    render(React.createElement(Home));

    expect(howTo()).toBeTruthy();
    expect(document.activeElement).toBe(within(howTo()!).getByRole('button', { name: 'Close' }));
    expect(window.localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBeNull();

    fireEvent.click(within(howTo()!).getByRole('button', { name: 'Close' }));
    expect(howTo()).toBeNull();
    expect(window.localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).not.toBeNull();
  });

  it('FR-430 once seen it does not open again on the next new game in this browser', () => {
    window.localStorage.removeItem(HOW_TO_PLAY_SEEN_KEY);
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    const first = render(React.createElement(Home));
    fireEvent.click(within(howTo()!).getByRole('button', { name: 'Close' }));
    first.unmount();

    window.localStorage.removeItem(SAVE_KEY);
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 6, world: 'continent' }) });
    render(React.createElement(Home));
    expect(howTo()).toBeNull();
  });

  it('FR-430 Escape closes it as Close does, and records the flag', () => {
    window.localStorage.removeItem(HOW_TO_PLAY_SEEN_KEY);
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    render(React.createElement(Home));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(howTo()).toBeNull();
    expect(window.localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).not.toBeNull();
  });

  // M12 review (L3-03): the first new game autosaves at once, so a reload before How to play was closed offers that game
  // to continue; Continue then opens it too, as the browser has still not closed it. Once closed, Continue does not.
  it('FR-430 a reload before How to play was closed: Continue opens it; after it was closed, Continue does not', () => {
    window.localStorage.removeItem(HOW_TO_PLAY_SEEN_KEY);
    window.localStorage.removeItem(SAVE_KEY);
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    const first = render(React.createElement(Home));
    expect(howTo()).toBeTruthy();
    expect(window.localStorage.getItem(SAVE_KEY)).not.toBeNull();
    first.unmount();

    // the reload: the slot holds the first game, the flag is not set
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 6, world: 'continent' }) });
    const second = render(React.createElement(Home));
    expect(howTo()).toBeNull();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Saved game' })).getByRole('button', { name: 'Continue' }));
    expect(howTo()).toBeTruthy();
    fireEvent.click(within(howTo()!).getByRole('button', { name: 'Close' }));
    second.unmount();

    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 6, world: 'continent' }) });
    render(React.createElement(Home));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Saved game' })).getByRole('button', { name: 'Continue' }));
    expect(howTo()).toBeNull();
  });

  it('FR-430 New game in the Saved game dialog opens it (a new game)', () => {
    const store = createGameStore({ seed: 4 });
    store.getState().advanceTurn();
    const save = JSON.stringify(saveOf(store.getState()));

    window.localStorage.removeItem(HOW_TO_PLAY_SEEN_KEY);
    window.localStorage.setItem(SAVE_KEY, save);
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 5, world: 'continent' }) });
    render(React.createElement(Home));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Saved game' })).getByRole('button', { name: 'New game' }));
    expect(howTo()).toBeTruthy();
  });

  it('FR-430 FR-409 an offer waits while How to play is open', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), isHowToPlayOpen: true });
    expect(isDialogOpen(useGameStore.getState())).toBe(true);
  });

  it('FR-430 the Playwright config sets the flag for every spec (its storage state), so the existing specs see no new dialog', () => {
    const config = readFileSync(join(ROOT, 'playwright.config.ts'), 'utf8');
    expect(config).toMatch(/storageState:/);
    expect(config).toContain(HOW_TO_PLAY_SEEN_KEY);
  });
});

it('FR-520 migrates legacy v1 purchases and oil permissions, preserving independent current ownership and pending orders', () => {
  const saved = saveOf(createGameStore({ seed: 1 }).getState());
  const legacy = {
    ...saved,
    game: {
      ...saved.game,
      nations: saved.game.nations.map(n => ({ ...n, technologies: undefined })),
      technologyState: {
        oilDrillingTechUnlocked: true,
        technologies: [{ id: 'seedDrill', purchased: true }, { id: 'cottonGin', purchased: false }],
      },
    },
  };
  const load = (value: unknown) => {
    const slot = readSave({ getItem: () => JSON.stringify(value) });
    if (slot.kind !== 'usable') throw new Error('Expected usable v1 save');
    return slot.save;
  };
  const migrated = load(legacy);
  expect(migrated.version).toBe(1);
  for (const nation of migrated.game.nations) expect(nation.technologies).toEqual(['seedDrill', 'oilDrilling']);
  const [a, b] = migrated.game.nations;
  expect(a.technologies).not.toBe(b.technologies);
  a.technologies = [];
  a.pendingTechnologies = ['cottonGin'];
  expect(load(migrated).game.nations).toEqual([a, b]);
});
