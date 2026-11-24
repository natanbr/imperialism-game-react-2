// FR-567 (M18b) in the running app, from the seed 1 save (e2e/seededGame.ts): at 1366x768 the map opens with its land
// filling the map area (the window less the top bar and the pane); the map's own zoom (the buttons, Ctrl and the wheel)
// leaves the top bar and the pane exactly as they were and keeps the tile under the pointer; the bar's main values are at
// least 14 px; the pane stays within 220 to 300 px. At 390 px the map still opens on the capital and zooms. Screenshots go
// to the test's output folder (testInfo.outputPath), or SCREENSHOT_DIR when set.
import type { TestInfo } from '@playwright/test';
import { expect, startSeededGame, test, type Page } from './seededGame';

const shotPath = (testInfo: TestInfo, name: string) => (process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name));

/** The land tiles' bounding box on screen against the map area (the scroller's box left of the pane). */
function landOnScreen(page: Page) {
  return page.evaluate(() => {
    const scroller = document.querySelector('[data-testid="map-scroll"]')!.getBoundingClientRect();
    const hud = document.querySelector('.hud-container')!.getBoundingClientRect();
    const area = { left: scroller.left, top: scroller.top, right: hud.left, bottom: scroller.bottom };
    const land = [...document.querySelectorAll('[data-testid="tile"]')]
      .filter((t) => !['water', 'river', 'coast'].includes(t.getAttribute('data-terrain') ?? ''))
      .map((t) => t.getBoundingClientRect());
    const box = {
      left: Math.min(...land.map((b) => b.left)),
      top: Math.min(...land.map((b) => b.top)),
      right: Math.max(...land.map((b) => b.right)),
      bottom: Math.max(...land.map((b) => b.bottom)),
    };
    const seen = Math.max(0, Math.min(box.right, area.right) - Math.max(box.left, area.left)) * Math.max(0, Math.min(box.bottom, area.bottom) - Math.max(box.top, area.top));
    return {
      share: seen / ((area.right - area.left) * (area.bottom - area.top)),
      inside: box.left >= area.left - 1 && box.top >= area.top - 1 && box.right <= area.right + 1 && box.bottom <= area.bottom + 1,
      tile: land[0].width,
    };
  });
}

/** The boxes and text sizes of the HUD: the top bar, the pane, and the bar's main values. */
function hudSizes(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      const r = el!.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10);
    };
    const font = (el: Element | null) => Number.parseFloat(getComputedStyle(el!).fontSize);
    return {
      bar: box(document.querySelector('[data-testid="topbar"]')),
      pane: box(document.querySelector('.hud-container')),
      turn: font(document.querySelector('[data-testid="turn-indicator"] > div')),
      date: font(document.querySelector('[data-testid="turn-indicator"] .turn-date')),
      cash: font(document.querySelector('.nation-stats > div')),
      paneText: font(document.querySelector('.hud-container')),
    };
  });
}

const zoomOf = async (page: Page) => Number(await page.getByTestId('map-viewport').getAttribute('data-zoom'));

test.describe('FR-567 at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('FR-567 the map opens with its land filling the map area; the map zoom leaves the top bar and the pane as they were', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await startSeededGame(page);
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('[data-tile-id="2-9"]')).toBeInViewport();

    // On open: the land is whole inside the map area and covers at least 80% of it (65% at 100%, 42 px tiles)
    const open = await landOnScreen(page);
    expect(open.inside).toBe(true);
    expect(open.share).toBeGreaterThanOrEqual(0.8);
    expect(open.tile).toBeGreaterThanOrEqual(46);
    testInfo.annotations.push({ type: 'FR-567 open', description: `land share ${open.share.toFixed(3)}, tile ${open.tile} px, zoom ${await zoomOf(page)}` });

    // The bar's main values are at least 14 px; the pane is 220 to 300 px wide
    const before = await hudSizes(page);
    testInfo.annotations.push({ type: 'FR-567 hud', description: JSON.stringify(before) });
    for (const key of ['turn', 'date', 'cash'] as const) expect(before[key], key).toBeGreaterThanOrEqual(14);
    expect(before.pane[2]).toBeGreaterThanOrEqual(220);
    expect(before.pane[2]).toBeLessThanOrEqual(300);
    await page.screenshot({ path: shotPath(testInfo, 'fr567-1366x768-open.png') });

    // Zoom in with the button: the map grows, the HUD does not move or change size
    const start = await zoomOf(page);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect.poll(() => zoomOf(page)).toBe(1.5);
    expect(await hudSizes(page)).toEqual(before);

    // Ctrl and the wheel over a tile: the map zooms about the pointer, the tile stays under it, the HUD stays as it was
    const target = page.locator('[data-tile-id="6-8"]');
    const tileBox = (await target.boundingBox())!;
    const pointer = { x: tileBox.x + tileBox.width / 2, y: tileBox.y + tileBox.height / 2 };
    await page.mouse.move(pointer.x, pointer.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -200);
    await page.keyboard.up('Control');
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(1.5);
    const under = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid="tile"]')?.getAttribute('data-tile-id'), pointer);
    expect(under).toBe('6-8');
    expect(await hudSizes(page)).toEqual(before);
    // Ctrl and the wheel over the pane (review): the map zooms (about its middle), the page and the HUD do not
    const pane = (await page.locator('.hud-container').boundingBox())!;
    const overPane = await zoomOf(page);
    await page.mouse.move(pane.x + pane.width / 2, pane.y + 200);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 200);
    await page.keyboard.up('Control');
    await expect.poll(() => zoomOf(page)).toBeLessThan(overPane);
    expect(await hudSizes(page)).toEqual(before);
    // The page itself was not zoomed: the window is still 1366 CSS px wide
    expect(await page.evaluate(() => window.innerWidth)).toBe(1366);
    await page.screenshot({ path: shotPath(testInfo, 'fr567-1366x768-zoomed.png') });

    // Zoom out with the button, down to 100% (disabled there)
    while (await page.getByRole('button', { name: 'Zoom out' }).isEnabled()) await page.getByRole('button', { name: 'Zoom out' }).click();
    expect(await zoomOf(page)).toBe(1);
    expect(start).toBeGreaterThan(1);
    expect(await hudSizes(page)).toEqual(before);
    expect(errors).toEqual([]);
  });
});

test.describe('FR-567 at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('FR-567 at 390 px the map opens at 100% on the capital and zooms with the buttons; no sideways page scroll', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await startSeededGame(page);
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true');
    expect(await zoomOf(page)).toBe(1);
    await expect(page.locator('[data-tile-id="2-9"]')).toBeInViewport();
    const before = await hudSizes(page);
    for (const key of ['turn', 'date', 'cash'] as const) expect(before[key], key).toBeGreaterThanOrEqual(14);
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect(zoomIn).toBeInViewport({ ratio: 1 });
    await zoomIn.click();
    await expect.poll(() => zoomOf(page)).toBe(1.5);
    expect(await hudSizes(page)).toEqual(before);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    await page.screenshot({ path: shotPath(testInfo, 'fr567-390x844.png') });
    expect(errors).toEqual([]);
  });
});
