// @vitest-environment jsdom
// M9 UI half. FR-231 (decision 7; Imp1 battlefield and casualty book, rules 11 sections 6 and 7): a dialog named "Battle
// at Arvelia" replays one `battle-resolved` report on a small grid: attackers in the two left columns, defenders in the
// two right ones, a wall column in front of the defenders when there is a fort; each regiment a token with its name, its
// owner's colour swatch and a health bar with its number. Controls "Next round", "Play" (one round a second; with reduced
// motion it steps without animation) and "Skip to result". Each round lists its shots as text ("1st Regulars hits 1st
// Minutemen: 25", "2nd Minutemen misses"); the end shows the Imp1 result line for the player's side ("Province Taken!",
// "Attack Failed!", "Province Lost!", "Enemy Beaten Back!") and a casualty list (each regiment with its health or
// "Routed", "Surrendered", "KIA"). The replay reads only the report. FR-232: each battle gives a news line that opens its
// Battle screen; at the start of the player's next turn the Battle screen opens by itself for each battle the player
// fought, one after another. FR-272: the tokens show the regiment pictures (decorative) and a fort its picture.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { BattleModal } from '@/components/BattleModal';
import { NewsPanel } from '@/components/HUD/NewsPanel';
import { battleView, shotText } from '@/components/army/battleView';
import { useGameStore, type TurnReport } from '@/store/rootStore';
import type { BattleReport, GameEvent, Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { setPair } from '../engine/fixtures';
import { ARVELIA, ARVELIA_P, continent, NE1, relocate, SE1 } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ROOT = join(__dirname, '..', '..');
const N1 = 'nation-1';
const N2 = 'nation-2';
const FIELD = ['regiment-1', 'regiment-2', 'regiment-3'];

/**
 * A hand-built 4-round battle at Arvelia (FR-219 damages: Regulars on entrenched Minutemen 25, Artillery 44, Minutemen
 * on attacking Regulars 10): Testland's 1st Regulars and 1st Artillery take it from two Minutemen.
 */
const TAKEN: BattleReport = {
  nationId: N1,
  provinceId: ARVELIA_P,
  attackerIds: [N1],
  defenderId: ARVELIA,
  fortLevel: 0,
  regiments: [
    { id: 'regiment-1', ownerId: N1, type: 'regulars', name: '1st Regulars', side: 'attacker', startHealth: 100, endHealth: 60, fate: 'standing' },
    { id: 'regiment-3', ownerId: N1, type: 'artillery', name: '1st Artillery', side: 'attacker', startHealth: 100, endHealth: 100, fate: 'standing' },
    { id: 'regiment-39', ownerId: ARVELIA, type: 'minutemen', name: '1st Minutemen', side: 'defender', startHealth: 100, endHealth: 0, fate: 'destroyed' },
    { id: 'regiment-40', ownerId: ARVELIA, type: 'minutemen', name: '2nd Minutemen', side: 'defender', startHealth: 100, endHealth: 0, fate: 'destroyed' },
  ],
  rounds: [
    {
      shots: [
        { shooterId: 'regiment-39', targetId: 'regiment-1', hit: true, damage: 10 },
        { shooterId: 'regiment-40', targetId: 'regiment-1', hit: false, damage: 0 },
        { shooterId: 'regiment-1', targetId: 'regiment-39', hit: true, damage: 25 },
        { shooterId: 'regiment-3', targetId: 'regiment-39', hit: true, damage: 44 },
      ],
    },
    {
      shots: [
        { shooterId: 'regiment-39', targetId: 'regiment-1', hit: true, damage: 10 },
        { shooterId: 'regiment-40', targetId: 'regiment-1', hit: true, damage: 10 },
        { shooterId: 'regiment-1', targetId: 'regiment-39', hit: true, damage: 25 },
        { shooterId: 'regiment-3', targetId: 'regiment-39', hit: true, damage: 6 },
      ],
    },
    {
      shots: [
        { shooterId: 'regiment-40', targetId: 'regiment-1', hit: false, damage: 0 },
        { shooterId: 'regiment-1', targetId: 'regiment-40', hit: true, damage: 25 },
        { shooterId: 'regiment-3', targetId: 'regiment-40', hit: true, damage: 44 },
      ],
    },
    {
      shots: [
        { shooterId: 'regiment-40', targetId: 'regiment-1', hit: true, damage: 10 },
        { shooterId: 'regiment-1', targetId: 'regiment-40', hit: true, damage: 25 },
        { shooterId: 'regiment-3', targetId: 'regiment-40', hit: true, damage: 6 },
      ],
    },
  ],
  result: 'attacker-won',
  provinceTaken: true,
};

/**
 * Hand-built: Valdoria attacks Testland North-East behind a level-2 fort and is beaten back in one round; its Regulars
 * route, its Hussars surrender (cut off), Testland's Minutemen hold.
 */
const BEATEN_BACK: BattleReport = {
  nationId: N2,
  provinceId: NE1,
  attackerIds: [N2],
  defenderId: N1,
  fortLevel: 2,
  regiments: [
    { id: 'regiment-20', ownerId: N2, type: 'regulars', name: '1st Regulars', side: 'attacker', startHealth: 30, endHealth: 20, fate: 'routed' },
    { id: 'regiment-21', ownerId: N2, type: 'hussars', name: '1st Hussars', side: 'attacker', startHealth: 20, endHealth: 14, fate: 'surrendered' },
    { id: 'regiment-8', ownerId: N1, type: 'minutemen', name: '5th Minutemen', side: 'defender', startHealth: 100, endHealth: 100, fate: 'standing' },
  ],
  rounds: [
    {
      shots: [
        { shooterId: 'regiment-8', targetId: 'regiment-21', hit: true, damage: 6 },
        { shooterId: 'regiment-20', targetId: 'regiment-8', hit: false, damage: 0 },
      ],
    },
  ],
  result: 'defender-held',
  provinceTaken: false,
};

const battleEvent = (report: BattleReport): GameEvent => ({ type: 'battle-resolved', ...report });

/** Puts `state` in the store for the player (nation 1), with these UI fields. */
function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

function replay(report: BattleReport, state: GameState = continent()) {
  show(state, { battleQueue: [report] });
  return render(<BattleModal />);
}

const dialog = (name = 'Battle at Arvelia') => screen.getByRole('dialog', { name });
const button = (name: string) => within(dialog()).getByRole('button', { name }) as HTMLButtonElement;
const tokens = (side: 'Attackers' | 'Defenders', d = dialog()) => within(within(d).getByRole('list', { name: new RegExp(`^${side}`) })).getAllByRole('listitem');
const healths = (d = dialog()) => [...tokens('Attackers', d), ...tokens('Defenders', d)].map((t) => text(within(t).getByTestId('token-health')));

afterEach(() => {
  vi.useRealTimers();
});

describe('FR-231 the Battle screen: the grid', () => {
  it('FR-231 a dialog named "Battle at Arvelia" (the shared Modal), at deployment before the first round', () => {
    replay(TAKEN);
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(text(within(dialog()).getByRole('heading', { level: 2 }))).toBe('Battle at Arvelia');
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Deployment: 4 rounds were fought');
    expect(healths()).toEqual(['100%', '100%', '100%', '100%']);
  });

  it("FR-231 attackers in the two left columns (artillery behind), defenders in the two right ones; each list named by its side and owner", () => {
    replay(TAKEN);
    expect(within(dialog()).getByRole('list', { name: 'Attackers: Testland' })).toBeTruthy();
    expect(within(dialog()).getByRole('list', { name: 'Defenders: Arvelia' })).toBeTruthy();
    const place = (t: HTMLElement) => [text(within(t).getByTestId('token-name')), t.dataset.column];
    expect(tokens('Attackers').map(place)).toEqual([
      ['1st Regulars', '2'],
      ['1st Artillery', '1'],
    ]);
    expect(tokens('Defenders').map(place)).toEqual([
      ['1st Minutemen', '3'],
      ['2nd Minutemen', '3'],
    ]);
    // No fort: no wall column
    expect(within(dialog()).queryByTestId('battle-wall')).toBeNull();
  });

  it("FR-231 each token: its name, its owner's colour swatch, a health bar with its number; FR-272 its picture, decorative", () => {
    replay(TAKEN);
    const [regulars] = tokens('Attackers');
    expect(text(within(regulars).getByTestId('token-name'))).toBe('1st Regulars');
    expect((within(regulars).getByTestId('token-swatch') as HTMLElement).style.background).toBe('var(--color-nation-1)');
    expect(within(regulars).getByTestId('token-swatch').getAttribute('aria-hidden')).toBe('true');
    expect((within(regulars).getByTestId('token-bar') as HTMLElement).style.width).toBe('100%');
    const img = regulars.querySelector('img')!;
    expect([img.getAttribute('src'), img.getAttribute('alt')]).toEqual(['/assets/ink-and-wash/army/regulars.png', '']);
    const [minutemen] = tokens('Defenders');
    expect((within(minutemen).getByTestId('token-swatch') as HTMLElement).style.background).toBe('var(--color-minor)');
    expect(minutemen.querySelector('img')!.getAttribute('src')).toBe('/assets/ink-and-wash/army/militia.png');
  });

  it('FR-231 FR-272 with a fort, a wall column stands in front of the defenders, with the fort picture named by its level', () => {
    replay(BEATEN_BACK, continent(), );
    const d = dialog('Battle at Testland North-East');
    const wall = within(d).getByTestId('battle-wall');
    const img = within(wall).getByRole('img', { name: 'Fort level 2' });
    expect(img.getAttribute('src')).toBe('/assets/ink-and-wash/infrastructure/fort-2.png');
    expect(tokens('Defenders', d).map((t) => t.dataset.column)).toEqual(['4']);
    expect(tokens('Attackers', d).map((t) => t.dataset.column)).toEqual(['2', '2']);
  });
});

describe('FR-231 the Battle screen: the controls', () => {
  it('FR-231 "Next round" plays one round: its shots as text and the healths after it', () => {
    replay(TAKEN);
    fireEvent.click(button('Next round'));
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Round 1 of 4');
    expect(within(within(dialog()).getByRole('list', { name: 'Shots of round 1' })).getAllByRole('listitem').map((li) => text(li))).toEqual([
      '1st Minutemen hits 1st Regulars: 10',
      '2nd Minutemen misses',
      '1st Regulars hits 1st Minutemen: 25',
      '1st Artillery hits 1st Minutemen: 44',
    ]);
    expect(healths()).toEqual(['90%', '100%', '31%', '100%']);
    expect((within(tokens('Defenders')[0]).getByTestId('token-bar') as HTMLElement).style.width).toBe('31%');

    fireEvent.click(button('Next round'));
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Round 2 of 4');
    expect(healths()).toEqual(['70%', '100%', '0%', '100%']);
    // A regiment at 0 health is destroyed: "KIA" on its token
    expect(text(within(tokens('Defenders')[0]).getByTestId('token-status'))).toBe('KIA');
  });

  it('FR-231 "Skip to result": the result line for our side and the casualty list; Next round and Skip are then disabled', () => {
    replay(TAKEN);
    fireEvent.click(button('Skip to result'));
    expect(text(within(dialog()).getByTestId('battle-result'))).toBe('Province Taken!');
    const casualties = within(dialog()).getByRole('list', { name: 'Casualties' });
    expect(within(casualties).getAllByRole('listitem').map((li) => text(li))).toEqual([
      '1st Regulars 60%',
      '1st Artillery 100%',
      '1st Minutemen KIA',
      '2nd Minutemen KIA',
    ]);
    expect(healths()).toEqual(['60%', '100%', '0%', '0%']);
    expect(button('Next round').disabled).toBe(true);
    expect(button('Skip to result').disabled).toBe(true);
  });

  it('FR-231 after the last round "Next round" shows the result', () => {
    replay(TAKEN);
    for (let i = 0; i < 4; i++) fireEvent.click(button('Next round'));
    expect(within(dialog()).queryByTestId('battle-result')).toBeNull();
    fireEvent.click(button('Next round'));
    expect(text(within(dialog()).getByTestId('battle-result'))).toBe('Province Taken!');
  });

  it('FR-231 "Play" plays one round a second until the result; "Pause" stops it', () => {
    vi.useFakeTimers();
    replay(TAKEN);
    fireEvent.click(button('Play'));
    expect(button('Pause')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Round 1 of 4');
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Round 1 of 4');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Round 2 of 4');
    fireEvent.click(button('Pause'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Round 2 of 4');
    fireEvent.click(button('Play'));
    // One round a second: each second is its own step (React draws the round before the next second starts)
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(text(within(dialog()).getByTestId('battle-result'))).toBe('Province Taken!');
    // At the result Play stops by itself
    expect(button('Play').disabled).toBe(true);
  });

  it('FR-231 with reduced motion the bars step without animation: the transition is off under prefers-reduced-motion', () => {
    const css = readFileSync(join(ROOT, 'src/app/components/army/War.module.css'), 'utf8');
    expect(css).toMatch(/\.tokenBar\s*\{[^}]*transition:\s*width/);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(reduced).toMatch(/\.tokenBar\s*\{[^}]*transition:\s*none/);
  });

  it('FR-231 the result line for each side: Province Lost! for the defender of a taken province, Attack Failed! and Enemy Beaten Back! for a held one', () => {
    expect(battleView(TAKEN, continent(), N1).resultText).toBe('Province Taken!');
    expect(battleView(TAKEN, continent(), ARVELIA).resultText).toBe('Province Lost!');
    expect(battleView(BEATEN_BACK, continent(), N2).resultText).toBe('Attack Failed!');
    expect(battleView(BEATEN_BACK, continent(), N1).resultText).toBe('Enemy Beaten Back!');
    // A battle the player did not fight reads from the attacker's side
    expect(battleView(BEATEN_BACK, continent(), 'nation-9').resultText).toBe('Attack Failed!');
  });

  it('FR-231 the casualty list says "Routed" and "Surrendered"', () => {
    replay(BEATEN_BACK);
    const d = dialog('Battle at Testland North-East');
    fireEvent.click(within(d).getByRole('button', { name: 'Skip to result' }));
    expect(text(within(d).getByTestId('battle-result'))).toBe('Enemy Beaten Back!');
    expect(within(within(d).getByRole('list', { name: 'Casualties' })).getAllByRole('listitem').map((li) => text(li))).toEqual([
      '1st Regulars Routed',
      '1st Hussars Surrendered',
      '5th Minutemen 100%',
    ]);
  });

  it('FR-231 a shot reads "X hits Y: 25" or "X misses"; two regiments of one name are told apart by their owner', () => {
    const names = new Map([
      ['a', 'Testland 1st Regulars'],
      ['b', 'Valdoria 1st Regulars'],
    ]);
    expect(shotText({ shooterId: 'a', targetId: 'b', hit: true, damage: 25 }, names)).toBe('Testland 1st Regulars hits Valdoria 1st Regulars: 25');
    expect(shotText({ shooterId: 'b', targetId: 'a', hit: false, damage: 0 }, names)).toBe('Valdoria 1st Regulars misses');
    const clash: BattleReport = {
      ...BEATEN_BACK,
      regiments: [
        { ...BEATEN_BACK.regiments[0] },
        { ...BEATEN_BACK.regiments[2], name: '1st Regulars', type: 'regulars' },
      ],
      rounds: [{ shots: [{ shooterId: 'regiment-8', targetId: 'regiment-20', hit: true, damage: 10 }] }],
    };
    expect(battleView(clash, continent(), N1).rounds[0]).toEqual(['Testland 1st Regulars hits Valdoria 1st Regulars: 10']);
  });

  it('FR-231 FR-217 an undefended province: no round; the deployment shows the attackers and "Next round" goes to the result', () => {
    const empty: BattleReport = { ...TAKEN, regiments: TAKEN.regiments.slice(0, 2).map((r) => ({ ...r, endHealth: 100 })), rounds: [] };
    replay(empty);
    expect(text(within(dialog()).getByTestId('battle-step'))).toBe('Deployment: no defender, no round was fought');
    expect(within(dialog()).queryByRole('list', { name: /^Defenders/ })).toBeTruthy();
    fireEvent.click(button('Next round'));
    expect(text(within(dialog()).getByTestId('battle-result'))).toBe('Province Taken!');
  });

  it('FR-231 the replay reads only the report: the regiments need not exist any more', () => {
    const s = continent();
    replay(TAKEN, { ...s, armies: [] });
    expect(tokens('Attackers').map((t) => text(within(t).getByTestId('token-name')))).toEqual(['1st Regulars', '1st Artillery']);
    fireEvent.click(button('Skip to result'));
    expect(text(within(dialog()).getByTestId('battle-result'))).toBe('Province Taken!');
  });

  it('FR-231 "Close" and Escape close it', () => {
    const first = replay(TAKEN);
    fireEvent.click(button('Close'));
    expect(useGameStore.getState().battleQueue).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
    first.unmount();
    replay(TAKEN);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('FR-232 battles in the news and at the start of the next turn', () => {
  const report = (events: GameEvent[]): TurnReport => ({ turn: 2, year: 1815, events });

  it('FR-232 the battle\'s news line opens its Battle screen', () => {
    show(continent(), { eventLog: [report([battleEvent(TAKEN), { type: 'province-taken', nationId: N1, provinceId: ARVELIA_P, fromId: ARVELIA }, { type: 'minor-colonised', nationId: N1, minorId: ARVELIA }])] });
    render(
      <>
        <NewsPanel />
        <BattleModal />
      </>
    );
    const list = screen.getByTestId('news-list');
    expect(within(list).getAllByRole('listitem').map((li) => text(li))).toEqual(['Battle at Arvelia: Province Taken!', 'Arvelia taken.', 'Arvelia is now our colony.']);
    fireEvent.click(within(list).getByRole('button', { name: 'Battle at Arvelia: Province Taken!' }));
    expect(useGameStore.getState().battleQueue).toEqual([battleEvent(TAKEN)]);
    expect(dialog()).toBeTruthy();
  });

  it("FR-232 FR-107 a battle we defended is our line, from our side; another nation's battle starts with its name and opens too", () => {
    const valdoriaTakes: BattleReport = { ...TAKEN, nationId: N2, attackerIds: [N2], regiments: TAKEN.regiments.map((r) => (r.side === 'attacker' ? { ...r, ownerId: N2 } : r)) };
    show(continent(), { eventLog: [report([battleEvent(valdoriaTakes), battleEvent(BEATEN_BACK)])] });
    render(
      <>
        <NewsPanel />
        <BattleModal />
      </>
    );
    const list = screen.getByTestId('news-list');
    expect(within(list).getAllByRole('listitem').map((li) => text(li))).toEqual([
      'Battle at Testland North-East: Enemy Beaten Back!',
      'Valdoria: Battle at Arvelia: Province Taken!',
    ]);
    fireEvent.click(within(list).getByRole('button', { name: 'Valdoria: Battle at Arvelia: Province Taken!' }));
    expect(dialog()).toBeTruthy();
  });

  it('FR-232 End Turn with an attack ordered: the Battle screen of that battle opens by itself', () => {
    let s = relocate(continent('world'), FIELD, NE1);
    s = setPair(s, N1, ARVELIA, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [], pact: false, alliance: false });
    show(s);
    render(<BattleModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const attack: Order = { kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: FIELD, toProvinceId: ARVELIA_P };
    act(() => {
      expect(useGameStore.getState().submitOrder(attack)).toEqual({ ok: true });
    });
    act(() => useGameStore.getState().advanceTurn());

    const queue = useGameStore.getState().battleQueue;
    expect(queue.map((b) => [b.nationId, b.provinceId])).toEqual([[N1, ARVELIA_P]]);
    expect(dialog()).toBeTruthy();
    fireEvent.click(button('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-232 several battles open one after another; another nation\'s battles do not open by themselves', () => {
    show(continent(), { battleQueue: [TAKEN, BEATEN_BACK] });
    render(<BattleModal />);
    fireEvent.click(button('Close'));
    expect(dialog('Battle at Testland North-East')).toBeTruthy();
    fireEvent.click(within(dialog('Battle at Testland North-East')).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-232 End Turn queues only the battles the player fought', () => {
    // A turn where only Valdoria fights: nothing opens (the store reads the turn's events with battlesFoughtBy)
    show(continent());
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().battleQueue).toEqual([]);
  });

  it('FR-232 a new game drops the battles still to see', () => {
    show(continent(), { battleQueue: [TAKEN] });
    act(() => useGameStore.getState().startNewGame({ seed: 2 }));
    expect(useGameStore.getState().battleQueue).toEqual([]);
  });
});

describe('FR-232 the war news lines', () => {
  it('FR-232 "Testland South-East taken from Testland." for a province of a Great Power', () => {
    show(continent(), { eventLog: [{ turn: 3, year: 1816, events: [{ type: 'province-taken', nationId: N2, provinceId: SE1, fromId: N1 }, { type: 'nation-fallen', nationId: N2, fallenId: N1 }] }] });
    render(<NewsPanel />);
    expect(within(screen.getByTestId('news-list')).getAllByRole('listitem').map((li) => text(li))).toEqual([
      'Valdoria: Testland South-East taken from Testland.',
      'Valdoria: Testland has fallen.',
    ]);
  });
});
