// @vitest-environment jsdom
// FR-564 (M18b, NR-037): one colour and one flag mark per nation, Great Power and minor, the same on every screen. The
// colours are design tokens (FR-097: styles/tokens.css); `nationMark` looks a nation's colour and flag pattern up by id
// (a Great Power by its colour slot, a minor by its founding order), and `NationFlag` draws the pack's flag shape
// (map-ui/nation-flag.svg) in that colour with that pattern, decorative, beside the nation's name.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { DiplomacyModal } from '@/components/DiplomacyModal';
import { MarketModal } from '@/components/MarketModal';
import { DealBookModal } from '@/components/DealBookModal';
import { CouncilModal } from '@/components/CouncilModal';
import { StatsDialog } from '@/components/HUD/StatsDialog';
import { DebugDashboard } from '@/components/HUD/DebugDashboard';
import { NewsPanel } from '@/components/HUD/index';
import { FLAG_PATTERNS, nationMark } from '@/components/nationMark';
import { FLAG_CLOTH_PATH, FLAG_POLE_PATH } from '@/components/NationFlag';
import { useGameStore, type TurnReport } from '@/store/rootStore';
import { councilVote, newGame, type GameEvent } from '@/engine';
import { MINOR_COLORS, NATION_COLORS, THEME } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import type { WorldId } from '@/types/World';
import { GoodsType } from '@/types/Resource';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const ROOT = join(__dirname, '..', '..');
const TOKENS = readFileSync(join(ROOT, 'src/app/styles/tokens.css'), 'utf8');
const defined = new Map([...TOKENS.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
/** The #rrggbb value of `var(--x)`, following var() chains. */
const hex = (cssVar: string): string => {
  const name = /^var\((--[\w-]+)\)$/.exec(cssVar)?.[1];
  if (!name) return cssVar;
  const value = defined.get(name);
  if (value === undefined) throw new Error(`undefined ${name}`);
  return hex(value);
};
const linear = (h: string): [number, number, number] => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h);
  if (!m) throw new Error(`not a #rrggbb colour: ${h}`);
  return m.slice(1).map((v) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
};
const luminance = (h: string) => {
  const [r, g, b] = linear(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG 2.2 contrast ratio. */
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
};
/** Linear sRGB to CIE Lab (D65). */
const labOf = ([r, g, bl]: [number, number, number]) => {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};
/** Colour vision deficiency on linear RGB (Machado, Oliveira and Fernandes 2009, severity 1), as tests/ui/palette.test.ts. */
const VIEWS: Record<string, number[][] | null> = {
  normal: null,
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
/** CIE76 distance of two colours as an eye with that vision sees them. */
const deltaE = (a: string, b: string, view = 'normal') => {
  const seen = (h: string) => {
    const c = linear(h);
    const m = VIEWS[view];
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return labOf(m ? ([0, 1, 2].map((i) => clamp(m[i][0] * c[0] + m[i][1] * c[1] + m[i][2] * c[2])) as [number, number, number]) : c);
  };
  const [p, q] = [seen(a), seen(b)];
  return Math.round(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * 10) / 10;
};

const N1 = 'nation-1';
const N2 = 'nation-2';
const MINORS = ['minor-1', 'minor-2', 'minor-3', 'minor-4'];
const game = (world: WorldId = 'continent'): GameState => newGame({ seed: 1, world });
const idsOf = (g: GameState) => [...g.nations.map((n) => n.id), ...g.minorNations.map((m) => m.id)];

function show(g: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: g, activeNationId: N1, ...ui });
}

/** Every flag mark in `root`: the nation it marks, its colour and pattern, and whether it is hidden from assistive technology. */
const flagsIn = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>('[data-testid="nation-flag"]')].map((el) => ({
    id: el.getAttribute('data-nation-id') ?? '',
    colour: el.style.color,
    pattern: el.getAttribute('data-pattern') ?? '',
    hidden: el.getAttribute('aria-hidden'),
    large: el.classList.contains('nation-flag-large'),
  }));

describe('FR-564 one colour and one flag pattern per nation', () => {
  it.each<WorldId>(['continent', 'two-islands'])('FR-564 on %s every nation id has a token colour and a pattern, all distinct', (world) => {
    const g = game(world);
    const ids = idsOf(g);
    expect(ids).toEqual(world === 'continent' ? [N1, N2, ...MINORS] : [N1, N2]);
    const marks = ids.map((id) => nationMark(g, id));
    for (const { colour, pattern } of marks) {
      expect(colour).toMatch(/^var\(--color-(nation|minor)-\d\)$/);
      expect(hex(colour)).toMatch(/^#[0-9a-f]{6}$/i);
      expect(FLAG_PATTERNS).toContain(pattern);
    }
    expect(new Set(marks.map((m) => hex(m.colour))).size).toBe(ids.length);
    expect(new Set(marks.map((m) => m.pattern)).size).toBe(ids.length);
  });

  it('FR-564 FR-097 the Great Powers keep their colours: crimson #9e2a5b and blue #2c5c9e, by colour slot', () => {
    const g = game();
    expect(nationMark(g, N1).colour).toBe('var(--color-nation-1)');
    expect(nationMark(g, N2).colour).toBe('var(--color-nation-2)');
    expect([hex(NATION_COLORS[0]), hex(NATION_COLORS[1])]).toEqual(['#9e2a5b', '#2c5c9e']);
    // The slot decides, not the place in the list (FR-097)
    const reordered = { ...g, nations: [...g.nations].reverse() };
    expect(nationMark(reordered, N1)).toEqual(nationMark(g, N1));
    expect(nationMark(reordered, N2)).toEqual(nationMark(g, N2));
  });

  it('FR-564 the minors take --color-minor-1 to --color-minor-4 in founding order; an unknown id gets the one minor colour', () => {
    const g = game();
    expect(MINORS.map((id) => nationMark(g, id).colour)).toEqual(MINOR_COLORS);
    expect(MINOR_COLORS).toEqual(['var(--color-minor-1)', 'var(--color-minor-2)', 'var(--color-minor-3)', 'var(--color-minor-4)']);
    expect(nationMark(g, 'nobody').colour).toBe(THEME.minor);
  });

  it("FR-564 the flag is the pack's: NationFlag's pole and cloth paths are the ones in map-ui/nation-flag.svg", () => {
    const file = readFileSync(join(ROOT, 'public/assets/ink-and-wash/map-ui/nation-flag.svg'), 'utf8');
    expect(file).toContain(`d="${FLAG_POLE_PATH}"`);
    expect(file).toContain(`d="${FLAG_CLOTH_PATH}"`);
  });

  it('FR-564 the six colours are told apart: ΔE76 20 or more between any two, in normal vision and under deuteranopia and protanopia', () => {
    const colours = [...NATION_COLORS, ...MINOR_COLORS].map(hex);
    const pairs = colours.flatMap((a, i) => colours.slice(i + 1).map((b) => [a, b] as const));
    const close = Object.keys(VIEWS)
      .flatMap((view) => pairs.map(([a, b]) => ({ pair: `${view}: ${a} vs ${b}`, dE: deltaE(a, b, view) })))
      .filter(({ dE }) => dE < 20);
    expect(close).toEqual([]);
    expect(deltaE('#a8322d', '#c9483a')).toBeCloseTo(11.0, 0);
  });

  it('FR-564 a third Great Power or a fifth minor still gets a mark of its own: past the last colour the pattern moves on', () => {
    const g = game();
    const more: GameState = {
      ...g,
      nations: [...g.nations, { ...g.nations[1], id: 'nation-3', colorSlot: 3 }, { ...g.nations[1], id: 'nation-4', colorSlot: 4 }],
      minorNations: [...g.minorNations, ...[5, 6, 7, 8, 9].map((n) => ({ ...g.minorNations[0], id: `minor-${n}` }))],
    };
    const marks = idsOf(more).map((id) => nationMark(more, id));
    expect(new Set(marks.map((m) => `${m.colour} ${m.pattern}`)).size).toBe(marks.length);
    // The stock nations keep their marks
    for (const id of idsOf(g)) expect(nationMark(more, id)).toEqual(nationMark(g, id));
    expect(nationMark(more, 'nation-3')).toEqual({ colour: NATION_COLORS[0], pattern: 'cross' });
    expect(nationMark(more, 'minor-5')).toEqual({ colour: MINOR_COLORS[0], pattern: 'stripes' });
  });

  it('FR-564 the mark reaches 3:1 on every surface a name lies on; the pattern 3:1 on every colour; a minor 3:1 on the map halo and grass', () => {
    const surfaces = ['--color-surface', '--color-surface-sunken', '--color-surface-raised', '--color-bg-you'].map((s) => [s, hex(`var(${s})`)] as const);
    const colours = [...NATION_COLORS, ...MINOR_COLORS];
    const low = [
      ...colours.flatMap((c) => surfaces.map(([s, bg]) => ({ pair: `${c} on ${s}`, ratio: contrast(hex(c), bg) }))),
      ...colours.map((c) => ({ pair: `pattern on ${c}`, ratio: contrast(hex(THEME.flagPattern), hex(c)) })),
      // A minor's dashed border lies on the halo over the grass (FR-329, FR-344)
      ...MINOR_COLORS.flatMap((c) => [THEME.mapHalo, THEME.groundGrass].map((g) => ({ pair: `${c} on ${g}`, ratio: contrast(hex(c), hex(g)) }))),
    ].filter(({ ratio }) => ratio < 3);
    expect(low).toEqual([]);
  });
});

describe('FR-564 every screen shows the same flag for the same nation', () => {
  /** Renders a screen on `g` and returns its flags, after checking each one against the lookup. */
  function flagsOf(screen: string, root: ParentNode, g: GameState) {
    const flags = flagsIn(root);
    expect(flags.length, screen).toBeGreaterThan(0);
    for (const flag of flags) {
      const mark = nationMark(g, flag.id);
      expect({ screen, ...flag }).toEqual({ screen, id: flag.id, colour: mark.colour, pattern: mark.pattern, hidden: 'true', large: flag.large });
    }
    return flags;
  }

  it('FR-564 the map: each minor border in its colour, its name tag with its flag (small) and its border in that colour', () => {
    const g = game();
    show(g);
    const { container } = render(<MapView />);
    const borders = [...container.querySelectorAll('[data-testid="minor-border"]')].map((p) => [p.getAttribute('data-minor-id'), p.getAttribute('stroke')]);
    expect(borders).toEqual(MINORS.map((id) => [id, nationMark(g, id).colour]));
    for (const minor of g.minorNations) {
      const tag = container.querySelector(`[data-tile-id="${minor.capitalTileId}"] [data-testid="minor-name"]`)!;
      expect(flagsOf('map', tag, g).map((f) => f.id)).toEqual([minor.id]);
      expect(tag.textContent).toBe(minor.name);
      expect((tag as HTMLElement).style.borderColor).toBe(nationMark(g, minor.id).colour);
      expect(tag.querySelector('.nation-flag-large')).toBeNull();
    }
  });

  it("FR-564 Diplomacy: every country card has its large flag and a left edge in its colour; the chosen country's heading its flag", () => {
    const g = game();
    show(g, { isDiplomacyOpen: true });
    const { container } = render(<DiplomacyModal />);
    for (const id of [N2, ...MINORS]) {
      const tab = container.querySelector(`[data-testid="country-tab-${id}"]`) as HTMLElement;
      expect(flagsOf('diplomacy', tab, g).map((f) => f.id)).toEqual([id]);
      expect(tab.querySelector('[data-testid="nation-flag"]')!.classList.contains('nation-flag-large')).toBe(true);
      expect(tab.style.borderLeftColor).toBe(nationMark(g, id).colour);
    }
    const headed = [...container.querySelectorAll('h3')].filter((h) => flagsIn(h).length > 0);
    expect(headed).toHaveLength(1);
    expect(flagsOf('diplomacy heading', headed[0], g)).toHaveLength(1);
  });

  it('FR-564 the Board of Trade: our flag in the title, each seller and buyer with its flag', () => {
    const g = game();
    show(g, { isMarketOpen: true });
    const { container } = render(<MarketModal />);
    expect(flagsOf('market title', container.querySelector('h2')!, g).map((f) => f.id)).toEqual([N1]);
    const partners = [...container.querySelectorAll('[data-testid="sellers"] li, [data-testid="buyers"] li')];
    expect(partners.length).toBeGreaterThan(0);
    for (const li of partners) expect(flagsOf('market partner', li, g).map((f) => MINORS.includes(f.id))).toEqual([true]);
  });

  it('FR-564 the Deal Book: a deal with a country carries its flag', () => {
    const g = game();
    const events: GameEvent[] = [
      { type: 'goods-sold', nationId: N1, commodity: GoodsType.Clothing, amount: 1, price: 810, income: 810, counterpartyId: 'minor-1' },
      { type: 'turn-ended', turn: 1, year: 1815 },
    ];
    show(g, { eventLog: [{ turn: 1, year: 1815, events } as TurnReport], isDealBookOpen: true });
    const { container } = render(<DealBookModal />);
    const ids = flagsOf('deal book', container.querySelector('ul')!, g).map((f) => f.id);
    expect(ids).toEqual(['minor-1']);
  });

  it('FR-564 the Council, the Stats dialog, the Demo dashboard and the news: each Great Power with its flag', () => {
    const seen: { screen: string; id: string; colour: string; large: boolean }[] = [];
    const note = (screen: string, flags: ReturnType<typeof flagsIn>) => seen.push(...flags.map(({ id, colour, large }) => ({ screen, id, colour, large })));

    const g = game();
    const vote = councilVote({ ...g, turn: 10, year: 1817 });
    expect(vote).not.toBeNull();
    show(g, { councilShown: { type: 'council-met', turn: 10, year: 1817, ...vote! } });
    const council = render(<CouncilModal />);
    note('council', flagsOf('council', document.body, g));
    council.unmount();

    show(g);
    const stats = render(<StatsDialog onClose={() => {}} />);
    note('stats', flagsOf('stats', document.body, g));
    stats.unmount();

    const demo = newGame({ seed: 1, world: 'continent', difficulty: 'demo' });
    show(demo);
    const dashboard = render(<DebugDashboard onClose={() => {}} />);
    note('dashboard', flagsOf('dashboard', document.body, demo));
    dashboard.unmount();

    const news = [{ type: 'army-upkeep', nationId: N2, amount: 100 }] as unknown as GameEvent[];
    show(g, { eventLog: [{ turn: 3, year: 1815, events: news, treasuries: {} } as never] });
    const panel = render(<NewsPanel />);
    note('news', flagsOf('news', panel.container, g));
    panel.unmount();

    for (const screen of ['council', 'stats', 'dashboard']) {
      expect(seen.filter((s) => s.screen === screen).map((s) => s.id).sort(), screen).toEqual([N1, N2]);
      expect(seen.filter((s) => s.screen === screen).every((s) => s.large), screen).toBe(true);
    }
    // The dashboard card's left edge is in its nation's colour (--nation-colour, set per card)
    expect(readFileSync(join(ROOT, 'src/app/components/HUD/Dashboard.module.css'), 'utf8')).toContain('border-left: 6px solid var(--nation-colour);');
    expect(seen.filter((s) => s.screen === 'news').map((s) => s.id)).toEqual([N2]);
    // One colour per nation across the screens
    const coloursOf = (id: string) => [...new Set(seen.filter((s) => s.id === id).map((s) => s.colour))];
    expect([coloursOf(N1), coloursOf(N2)]).toEqual([[NATION_COLORS[0]], [NATION_COLORS[1]]]);
  });
});
