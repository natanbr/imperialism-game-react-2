// @vitest-environment jsdom
// M8 QA fix round, item 6. FR-268: the HUD's news list shows the player's own lines first (FR-107) and is its own scroll
// region, named by its heading and reachable with the keyboard, so every line can be read without the HUD's fade
// (FR-235) hiding one. The layout (whole lines, above the fade, scrolled to the last line) is checked in the running
// app: e2e/m8-qa.spec.ts.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CouncilModal } from '@/components/CouncilModal';
import { NewsPanel, TurnIndicator } from '@/components/HUD/index';
import { cameraOnTile, mapAreaOf } from '@/components/camera';
import { newsItems, type NewsItem } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { councilVote, type GameEvent } from '@/engine';
import { continent } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

// FR-376's tests below give the panel news items with a tile (`news.items`) before L1's `newsItems` fills `tileId`
// (FR-375); every other test reads the real `newsItems`.
const news = vi.hoisted(() => ({ items: undefined as unknown[] | undefined }));
vi.mock('@/components/gameText', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/gameText')>();
  return { ...real, newsItems: (...args: Parameters<typeof real.newsItems>) => (news.items as NewsItem[] | undefined) ?? real.newsItems(...args) };
});

const N1 = 'nation-1';
const N2 = 'nation-2';

function showNews(events: GameEvent[]) {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    game: continent(),
    activeNationId: N1,
    eventLog: [{ turn: 3, year: 1815, events, treasuries: {} } as never],
  });
  return render(<NewsPanel />);
}

// Valdoria's events first, as the turn resolves them; then ours; then the game over (no nation)
const EVENTS = [
  { type: 'army-upkeep', nationId: N2, amount: 100 },
  { type: 'goods-produced', nationId: N2, output: 'armaments', amount: 2 },
  { type: 'army-upkeep', nationId: N1, amount: 125 },
  { type: 'army-moved', nationId: N1, fromProvinceId: 'province-nation-1-sw', toProvinceId: 'province-nation-1-nw', count: 1 },
  { type: 'regiments-recruited', nationId: N2, regiment: 'regulars', count: 1 },
  { type: 'goods-produced', nationId: N1, output: 'armaments', amount: 1 },
] as unknown as GameEvent[];

describe('FR-268 the HUD news list', () => {
  it("FR-268 FR-107 the player's own lines come first, in event order; then the other nation's, each under its name", () => {
    showNews(EVENTS);
    const lines = within(screen.getByTestId('news-panel')).getAllByRole('listitem').map(text);
    expect(lines).toEqual([
      'Army upkeep: $125.',
      '1 regiment marched from Testland South-West to Testland North-West.',
      'Produced 1 Armaments.',
      'Valdoria: Army upkeep: $100.',
      'Valdoria: Produced 2 Armaments.',
      'Valdoria: 1 Regulars recruited.',
    ]);
  });

  it('FR-268 FR-280 the list is its own scroll region: named by the heading "News from last turn (turn 3, Fall 1815)" and reachable with Tab', () => {
    showNews(EVENTS);
    const list = screen.getByRole('list', { name: 'News from last turn (turn 3, Fall 1815)' });
    expect(list.dataset.testid).toBe('news-list');
    expect(list.tabIndex).toBe(0);
    expect(text(screen.getByRole('heading', { name: 'News from last turn (turn 3, Fall 1815)' }))).toBe('News from last turn (turn 3, Fall 1815)');
  });
});

// M9 QA fix round, item 5. FR-280: the news are those of the turn just resolved, so their heading says so, with that
// turn's number and date: on turn 3 of 40 (Fall 1815) it reads "News from last turn (turn 2, Summer 1815)", not "News,
// turn 2 (1815)", which read as a mismatch with the HUD's turn.
describe('FR-280 the news heading names the last turn', () => {
  it('FR-280 on turn 3 the HUD reads "Turn: 3 of 40" and "Fall 1815", the news heading "News from last turn (turn 2, Summer 1815)"', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...continent(), turn: 3 },
      activeNationId: N1,
      eventLog: [{ turn: 2, year: 1815, events: EVENTS, treasuries: {} } as never],
    });
    render(
      <>
        <TurnIndicator />
        <NewsPanel />
      </>
    );
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 3 of 40 Fall 1815');
    expect(text(screen.getByRole('heading', { level: 3 }))).toBe('News from last turn (turn 2, Summer 1815)');
  });

  it('FR-280 the last turn of a year names its own season and year: "News from last turn (turn 4, Winter 1815)"', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...continent(), turn: 5, year: 1816 },
      activeNationId: N1,
      eventLog: [{ turn: 4, year: 1815, events: [], treasuries: {} } as never],
    });
    render(<NewsPanel />);
    expect(text(screen.getByRole('heading', { level: 3 }))).toBe('News from last turn (turn 4, Winter 1815)');
  });
});

// M10 UI half. FR-297: the Council's news line opens the Council screen of that meeting (FR-298), as a battle's line opens
// its Battle screen (FR-232). FR-306 (review R1): it is the first line of the list, so it shows without scrolling. FR-316
// (QA fix round): the screen's date line reads "Met at the end of turn 10 (Summer 1817)".
describe('FR-297 the Council in the news', () => {
  it('FR-297 FR-306 FR-316 the line "Council of Governors: Testland 4, Valdoria 4 of 12 votes; no winner (9 needed).", first in the list, opens the Council screen of that meeting', () => {
    const council = { type: 'council-met', turn: 10, year: 1817, ...councilVote(continent())! } as GameEvent;
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...continent(), turn: 11 },
      activeNationId: N1,
      eventLog: [{ turn: 10, year: 1817, events: [EVENTS[0], { type: 'turn-ended', turn: 10, year: 1817 }, council], treasuries: {} } as never],
    });
    render(
      <>
        <NewsPanel />
        <CouncilModal />
      </>
    );
    const list = screen.getByTestId('news-list');
    expect(within(list).getAllByRole('listitem').map(text)).toEqual([
      'Council of Governors: Testland 4, Valdoria 4 of 12 votes; no winner (9 needed).',
      'Valdoria: Army upkeep: $100.',
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(within(list).getByRole('button', { name: 'Council of Governors: Testland 4, Valdoria 4 of 12 votes; no winner (9 needed).' }));
    expect(useGameStore.getState().councilShown).toEqual(council);
    const dialog = screen.getByRole('dialog', { name: 'Council of Governors' });
    expect(text(within(dialog).getByTestId('council-date'))).toBe('Met at the end of turn 10 (Summer 1817)');
    expect(text(within(dialog).getByTestId('council-result'))).toBe('No winner. The Council meets again on turn 20.');
  });
});

// M12 (NR-033), lane L2. FR-376 (UIV-08): a news line about a tile (its `tileId`, FR-375) is a button with the same text;
// it selects that tile (no civilian, so Tile Info shows the tile) and scrolls it into view, as the camera centres a tile
// (FR-083). A line with no tile stays text.
describe('FR-376 a news line leads to its place', () => {
  afterEach(() => {
    news.items = undefined;
  });

  function showLines(items: NewsItem[] | undefined, events: GameEvent[] = EVENTS) {
    news.items = items;
    const game = continent();
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game,
      activeNationId: N1,
      selectedWorkerId: 'worker-nation-1-2',
      eventLog: [{ turn: 3, year: 1815, events, treasuries: {} } as never],
    });
    render(<NewsPanel />);
    return game;
  }

  it('FR-376 "Valdoria: Rail finished at 14-9." is a button of that text: it selects 14-9, no civilian, and scrolls it to the middle; "Army upkeep: $125." stays text', () => {
    const game = showLines([{ text: 'Valdoria: Rail finished at 14-9.', tileId: '14-9' }, { text: 'Army upkeep: $125.' }]);
    const list = screen.getByTestId('news-list');
    expect(within(list).getAllByRole('listitem').map(text)).toEqual(['Valdoria: Rail finished at 14-9.', 'Army upkeep: $125.']);
    expect(within(list).getAllByRole('button').map(text)).toEqual(['Valdoria: Rail finished at 14-9.']);
    const moves = useGameStore.getState().cameraMoves;
    fireEvent.click(within(list).getByRole('button', { name: 'Valdoria: Rail finished at 14-9.' }));
    const s = useGameStore.getState();
    expect([s.selectedTileId, s.selectedWorkerId]).toEqual(['14-9', undefined]);
    const camera = cameraOnTile({ x: 14, y: 9 }, mapAreaOf(window), game.map.config, s.zoom);
    expect(camera.x).toBeGreaterThan(0);
    expect([s.cameraX, s.cameraY, s.cameraMoves]).toEqual([camera.x, camera.y, moves + 1]);
  });

  // M12 integration: L1's FR-375 has landed, so this real-path test always runs (it was `it.skipIf` until then); the
  // panel now passes `tilePlaces` too, so the line names the province of 3-9.
  const event = { type: 'construction-completed', nationId: N1, tileId: '3-9', structure: 'depot' } as unknown as GameEvent;
  it('FR-375 FR-376 with the real news: the line of a depot finished at 3-9 names its province and is a button that selects 3-9', () => {
    expect(newsItems([event], N1, (id) => id)[0]?.tileId).toBe('3-9');
    const game = showLines(undefined, [event]);
    const provinceId = game.map.tiles.flat().find((t) => t.id === '3-9')?.provinceId;
    const province = game.provinces.find((p) => p.id === provinceId)?.name;
    expect(province).toBeTruthy();
    const list = screen.getByTestId('news-list');
    const line = within(list).getByRole('button', { name: `Depot finished at 3-9 in ${province}.` });
    fireEvent.click(line);
    expect(useGameStore.getState().selectedTileId).toBe('3-9');
  });
});
