// @vitest-environment jsdom
// M12b by-eye QA fix round (2026-11-17, FR-529 to FR-536). jsdom draws no layout: the boxes are given here where a
// component places something, and the rules are read from the CSS; the sizes themselves are measured in
// e2e/m12b-qa.spec.ts. FR-529 How to play fits a short window; FR-530 the score's parts stay inside the window; FR-531 a
// focused strip button is scrolled whole into the strip; FR-532 the narrow-window line lies beside the pane, not over it;
// FR-533 the news text keeps a gutter before its scrollbar; FR-534 the war and idle lines look like alerts; FR-535 the
// page's order (and so Tab's) is the bar, the map, the pane; FR-536 Details for bug reports tells the window's size.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HowToPlay } from '@/components/HowToPlay';
import { ScoreIndicator } from '@/components/HUD/ScoreIndicator';
import { ActionButtons } from '@/components/HUD/ActionButtons';
import { HUD } from '@/components/HUD';
import { leftInWindow } from '@/components/HUD/hudView';
import Home from '@/page';
import { useGameStore } from '@/store/rootStore';
import { HOW_TO_PLAY_SEEN_KEY } from '@/store/persistence';
import { newGame } from '@/engine';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

// The page test (FR-535) needs the map's place in the page, not the map itself
vi.mock('@/components/MapView', async () => {
  const React = await import('react');
  return { MapView: () => React.createElement('div', { 'data-testid': 'map-stub' }, React.createElement('button', { type: 'button' }, 'A map marker')) };
});

failOnActWarnings();

beforeEach(() => {
  window.localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
  useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }), activeNationId: 'nation-1' });
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ROOT = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');
/** The declarations of the first `<selector> {` rule in `css`. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
}
const box = (left: number, width: number, top = 0, height = 32) => ({ left, right: left + width, width, top, bottom: top + height, height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

// QA B12b-how-to-play-640x360 (extra E2): at 640x360 the dialog was 419 px high, centred from y -29 to 389 with no scroll
// area: the title above the window, Close half below it.
describe('FR-529 How to play fits a short window', () => {
  it('FR-529 FR-430 the text between the title and Close is one scrolling region, a Tab stop; Close keeps the focus on open', () => {
    render(<HowToPlay onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'How to play' });
    const body = within(dialog).getByRole('region', { name: 'How to play text' });
    expect(body.tabIndex).toBe(0);
    for (const id of ['howto-goal', 'howto-money', 'howto-first-turn']) expect(body.contains(within(dialog).getByTestId(id)), id).toBe(true);
    // The title before the region, Close after it: both stay outside what scrolls
    const title = within(dialog).getByRole('heading', { level: 2, name: 'How to play' });
    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(body.contains(title) || body.contains(close)).toBe(false);
    expect(title.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.activeElement).toBe(close);
  });

  it('FR-529 CSS: the dialog is at most the window less 32 px high; only its text scrolls; About never exceeds the window either', () => {
    const css = read('src/app/globals.css');
    expect(rule(css, '.about-panel')).toMatch(/max-height: calc\(100vh - 32px\);/);
    expect(rule(css, '.about-panel')).toMatch(/overflow-y: auto;/);
    const panel = rule(css, '.howto-panel');
    expect(panel).toMatch(/display: flex;/);
    expect(panel).toMatch(/flex-direction: column;/);
    expect(panel).toMatch(/overflow: hidden;/);
    const body = rule(css, '.howto-body');
    expect(body).toMatch(/overflow-y: auto;/);
    expect(body).toMatch(/min-height: 0;/);
  });
});

// QA B15-score-parts-popover (extra E1): at 390x844 the list opened at x 302, 290 px wide, and ran to x 592.
describe('FR-530 the score parts stay inside the window', () => {
  it('FR-530 leftInWindow: the left edge at the anchor\'s, moved left as far as the window\'s right edge needs, 8 px inside', () => {
    expect(leftInWindow(302, 290, 390)).toBe(390 - 8 - 290);
    expect(leftInWindow(439, 290, 800)).toBe(439);
    expect(leftInWindow(269, 290, 320)).toBe(320 - 8 - 290);
    expect(leftInWindow(-20, 272, 390)).toBe(8);
    // Narrower than the panel: the left margin wins
    expect(leftInWindow(100, 400, 300)).toBe(8);
  });

  function hoverWith(scoreLeft: number, windowWidth: number) {
    vi.stubGlobal('innerWidth', windowWidth);
    render(<ScoreIndicator />);
    const score = screen.getByTestId('hud-score');
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this === score ? box(scoreLeft, 60) : box(0, 290, 24, 94);
    });
    fireEvent.mouseEnter(score);
    return screen.getByTestId('score-parts');
  }

  it('FR-530 at 390 px the list opening under the score at x 302 is moved 210 px left, so it ends 8 px inside the window', () => {
    expect(hoverWith(302, 390).style.left).toBe('-210px');
  });

  it('FR-530 FR-404 where it fits (800 px, the score at x 439) the list keeps its left edge at the score\'s', () => {
    expect(hoverWith(439, 800).style.left).toBe('0px');
  });
});

// QA B16-keyboard-strip-390 (extra E4): Tab onto Center at 390x844 left it at x 228 to 260 in a strip that ends at 251,
// unscrolled (Chromium's focus scroll treats a partly shown element as shown).
describe('FR-531 a focused strip button is scrolled whole into the strip', () => {
  it('FR-531 a focus on a strip button scrolls it into the strip by the least amount (nearest), both ways', () => {
    const scrolled: [string | null, ScrollIntoViewOptions | boolean | undefined][] = [];
    const scrollIntoView = vi.fn(function (this: HTMLElement, options?: ScrollIntoViewOptions | boolean) {
      scrolled.push([this.getAttribute('title'), options]);
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
    try {
      render(<ActionButtons />);
      act(() => screen.getByRole('button', { name: 'Center' }).focus());
      expect(scrolled).toEqual([['Center Camera', { block: 'nearest', inline: 'nearest' }]]);
      // Advance Turn is outside the strip and never scrolls (card Q113)
      act(() => screen.getByRole('button', { name: 'Advance Turn' }).focus());
      expect(scrolled).toHaveLength(1);
    } finally {
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('FR-531 in a browser without scrollIntoView (jsdom) a focus does not throw', () => {
    expect(HTMLElement.prototype.scrollIntoView).toBeUndefined();
    render(<ActionButtons />);
    expect(() => act(() => screen.getByRole('button', { name: 'Diplomacy' }).focus())).not.toThrow();
  });
});

// QA extra E3: below 700 px the line spanned the window under the bar, over the pane's first 37 px: Tile Info's heading
// and its "Close tile info" button lay under it (a click there hit the line).
describe('FR-532 the narrow-window line lies beside the pane', () => {
  it('FR-532 CSS: from the window\'s left edge to the pane\'s (right: the pane\'s width), under the bar', () => {
    const note = rule(read('src/app/components/MapView.module.css'), '.narrowWindow');
    expect(note).toMatch(/right: var\(--hud-width\);/);
    expect(note).not.toMatch(/right: 0;/);
    expect(note).toMatch(/top: var\(--topbar-height\);/);
  });
});

// QA extra "News text touches the news scrollbar (0 px gap)": the widest line ended at the scrollbar's left edge.
describe('FR-533 the news keeps a gutter before its scrollbar', () => {
  it('FR-533 CSS: the news list has 4 px of padding on the right (the scrollbar sits outside it), 16 px on the left as before', () => {
    expect(rule(read('src/app/globals.css'), '.news-list')).toMatch(/padding: 0 4px 0 16px;/);
  });
});

// QA extra "Alert lines (war, idle civilians) look like body text": 13 px regular ink, the same as Tile Info's lines; card
// Q111 says a war must not be missed.
describe('FR-534 the war and idle lines look like alerts', () => {
  it('FR-534 CSS: an alert line carries a 3 px rule in the warn colour at its left, the food and upkeep warnings\' colour', () => {
    const css = read('src/app/globals.css');
    const line = rule(css, '.hud-alert-line');
    expect(line).toMatch(/border-left: 3px solid var\(--color-warn\);/);
    expect(line).toMatch(/padding-left: 5px;/);
    // The food warning's own rule (not `.hud-alerts > .food-warning`)
    expect(rule(css, '\n.food-warning')).toMatch(/var\(--color-warn\)/);
  });

  it('FR-534 FR-471 the idle line is an alert line in the alerts block, its text unchanged', () => {
    render(<HUD />);
    const idle = screen.getByTestId('idle-civilians');
    expect(idle.classList.contains('hud-alert-line')).toBe(true);
    expect(idle.closest('[data-testid="hud-alerts"]')).not.toBeNull();
    expect(text(idle)).toBe('7 civilians without orders');
  });
});

// QA extra "Tab order is map, then top bar, then pane": the page held the map first, so a keyboard user met about eight
// map stops before the bar's score and Advance Turn, while the bar is what the eye meets first.
describe('FR-535 the page order is the bar, the map, the pane', () => {
  it('FR-535 Home holds the top bar before the map and the map before the pane, so Tab runs bar, map, pane', () => {
    render(<Home />);
    const bar = screen.getByTestId('topbar');
    const map = screen.getByTestId('map-stub');
    const pane = document.querySelector('.hud-container')!;
    expect(bar.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING, 'map after the bar').toBeTruthy();
    expect(map.compareDocumentPosition(pane) & Node.DOCUMENT_POSITION_FOLLOWING, 'pane after the map').toBeTruthy();
    // The first focusable thing of the page is the bar's first button (FR-568: the score moved to Stats), Advance Turn the bar's last
    const focusable = [...document.querySelectorAll<HTMLElement>('button, [tabindex="0"]')].filter((el) => !el.closest('[hidden]'));
    expect(focusable[0]).toBe(screen.getByRole('button', { name: 'Open Warehouse' }));
    expect(focusable.indexOf(screen.getByRole('button', { name: 'Advance Turn' }))).toBeLessThan(focusable.indexOf(within(map).getByRole('button')));
  });
});

// QA extra E7: most layout findings depend on the window's size, which the copied details did not hold.
describe('FR-536 Details for bug reports tells the window size', () => {
  it('FR-536 a "Window: W x H" line after the camera, kept current when the window is resized', () => {
    render(<HUD />);
    fireEvent.click(screen.getByRole('button', { name: 'Details for bug reports' }));
    const lines = () => screen.getAllByTestId('hud-debug-line').map(text);
    expect(lines()).toContain(`Window: ${window.innerWidth} x ${window.innerHeight}`);
    expect(lines().indexOf(`Window: ${window.innerWidth} x ${window.innerHeight}`)).toBe(lines().findIndex((l) => l.startsWith('Camera:')) + 1);
    vi.stubGlobal('innerWidth', 800);
    vi.stubGlobal('innerHeight', 600);
    act(() => void window.dispatchEvent(new Event('resize')));
    expect(lines()).toContain('Window: 800 x 600');
  });

  it('FR-536 CSS: the lines sit on the pane\'s 16 px rhythm, so the added line costs no height (12 x 16 < 11 x 18 inherited)', () => {
    // Trap: `.hud-group-panel` (18 px) comes after `.hud-debug-section` and wins, so the rule names both classes and
    // comes after it
    const css = read('src/app/globals.css');
    expect(rule(css, '.hud-group-panel.hud-debug-section')).toMatch(/line-height: 16px;/);
    expect(css.indexOf('.hud-group-panel.hud-debug-section {')).toBeGreaterThan(css.indexOf('\n.hud-group-panel {'));
  });
});
