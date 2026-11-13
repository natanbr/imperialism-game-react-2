import { test, expect, Page } from '@playwright/test';

// FR-090 (M3.5 part B, NR-008, NR-009): on the default 1280x720 screen the whole 24x16 map shows left
// of the 250 px HUD at 42 px tiles (FR-088), every land tile shows an icon and the sea none (FR-085),
// the About panel carries the Game Icons attribution (FR-089), and rail built through the UI from the
// capital 2-9 to a depot on 2-7 is drawn and the depot shows connected.
// Set SCREENSHOT_DIR to also save m3-5-look-map.png, -capital.png, -market.png and -zoom.png there.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
// The player's civilians only: since M4 nation 2's stand on island 2 (FR-098).
const worker = (page: Page, type: string) => page.locator(`button[data-nation-id="nation-1"][data-worker-type="${type}"]`);
// FR-110: the civilians on the capital are one stack button that opens a tray; one alone is its own button
async function pickWorker(page: Page, type: string) {
  if ((await worker(page, type).count()) === 0) await tile(page, '2-9').getByTestId('worker-stack').click();
  await worker(page, type).click();
}
const shot = async (page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }) => {
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m3-5-look-${name}.png`, clip });
};

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function endTurn(page: Page, nextTurn: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${nextTurn} of`);
}

test('FR-090 the whole map fits 1280x720 next to the HUD, with an icon on every land tile and the attribution in About', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
  // FR-096 the tab title; FR-095 the tiles are named for assistive technology
  await expect(page).toHaveTitle('Imperialism');
  await expect(tile(page, '3-9')).toHaveAccessibleName('Farm, grain, level 1, owned by Testland');

  for (const id of ['0-0', '23-0', '0-15', '23-15']) {
    const box = (await tile(page, id).boundingBox())!;
    expect(box.width).toBe(42);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1030);
    expect(box.y + box.height).toBeLessThanOrEqual(720);
  }
  const scroll = await page.getByTestId('map-scroll').evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop }));
  expect(scroll).toEqual({ x: 0, y: 0 });
  // The odd rows stay shifted half a tile
  expect((await tile(page, '0-1').boundingBox())!.x - (await tile(page, '0-0').boundingBox())!.x).toBe(21);

  // The app plays the continent (FR-144, FR-160): the two islands' 200 land tiles plus the minor nations'
  // 26 (Arvelia 12, Sundmark 5, Lorran 4, Pellis 5; FR-145)
  await expect(page.locator('[data-testid="tile"]:not([data-terrain="water"])')).toHaveCount(226);
  await expect(page.locator('[data-testid="tile"]:not([data-terrain="water"]) [data-testid="tile-icon"]')).toHaveCount(226);
  await expect(page.locator('[data-testid="tile"][data-terrain="water"] [data-testid="tile-icon"]')).toHaveCount(0);
  await expect(tile(page, '2-9').getByTestId('tile-icon')).toHaveAttribute('data-icon', 'GiCapitol');
  await expect(tile(page, '3-9').getByTestId('level-badge')).toHaveText('L1');
  await shot(page, 'map');

  // FR-110 (a): the capital's seven civilians are one 24 px stack button; its tray holds a 24 px button each
  const stack = tile(page, '2-9').getByTestId('worker-stack');
  await expect(stack).toHaveAttribute('data-count', '7');
  const size = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!;
  expect((await size(stack)).width).toBeGreaterThanOrEqual(24);
  expect((await size(stack)).height).toBeGreaterThanOrEqual(24);
  await stack.click();
  const tray = tile(page, '2-9').getByRole('group', { name: 'Civilians on this tile' });
  await expect(tray.getByTestId('worker-button')).toHaveCount(7);
  for (const b of await tray.getByTestId('worker-button').all()) {
    const box = await size(b);
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24);
  }
  await expect(tile(page, '2-9').getByTestId('selection-ring')).toBeVisible();

  await page.getByRole('button', { name: /About/ }).click();
  const about = page.getByRole('dialog', { name: 'About' });
  await expect(about).toContainText('Icons by game-icons.net contributors, CC BY 3.0');
  await expect(about.getByRole('link', { name: /game-icons\.net/ })).toHaveAttribute('href', 'https://game-icons.net');
  await about.getByRole('button', { name: 'Close about' }).click();
  await expect(about).toHaveCount(0);

  await page.getByRole('button', { name: /Open Capital/ }).click();
  await expect(page.getByRole('dialog', { name: 'Capital' })).toBeVisible();
  await shot(page, 'capital');
  await page.getByRole('button', { name: 'Close capital' }).click();

  // FR-194: the continent's market is "partners", so the market dialog is the Board of Trade
  await page.getByRole('button', { name: /Open Market/ }).click();
  await expect(page.getByRole('dialog', { name: 'Board of Trade' })).toBeVisible();
  await shot(page, 'market');
  await page.getByRole('button', { name: 'Close Board of Trade' }).click();

  expect(errors).toEqual([]);
});

// Three device pixels per CSS pixel, so the zoom screenshot of a 300 px crop is sharp; the layout is the same 1280x720.
test.describe('rendered at three times the pixel density', () => {
  test.use({ deviceScaleFactor: 3 });

  test('FR-090 rail built from the capital to a depot is drawn, and the depot shows connected', async ({ page }) => {
    test.setTimeout(90000);
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });

    // The engineer lays rail north from the capital, one tile a turn, then builds a depot on 2-7.
    for (const [i, id] of ['2-8', '2-7'].entries()) {
      await pickWorker(page, 'engineer');
      await tile(page, id).click();
      await expect(tile(page, id).getByTitle('Construction in progress')).toBeVisible();
      await endTurn(page, i + 2);
      await expect(page.getByTestId('news-panel')).toContainText(`Rail finished at ${id}.`);
    }
    await pickWorker(page, 'engineer');
    // The engineer's own tile, clicked in its free corner: the 24 px worker button covers the tile's
    // centre since FR-110, and a click on it only selects the worker again
    await tile(page, '2-7').click({ position: { x: 6, y: 6 } });
    await page.getByRole('button', { name: 'Build Depot' }).click();
    await expect(tile(page, '2-7').getByTitle('Construction in progress')).toBeVisible();
    for (let turn = 4; turn <= 7 && !(await tile(page, '2-7').getByTitle(/^Depot: /).count()); turn++) await endTurn(page, turn);

    // FR-093: the depot names its state, not only its dot's colour
    const depot = tile(page, '2-7').getByRole('img', { name: 'Depot: connected' });
    await expect(depot).toHaveAttribute('title', 'Depot: connected');
    await expect(depot).toHaveAttribute('data-connected', 'true');
    // Nation 2 lays its own rail meanwhile (FR-102): count the player's lines only
    await expect(page.locator('[data-testid="rail-segment"][data-nation-id="nation-1"]')).toHaveCount(2);

    // The zoom: the capital's corner of island 1, with the farm 3-9 selected
    await page.locator('[data-testid="tile"][data-tile-id="3-9"]').click({ position: { x: 4, y: 4 } });
    await expect(tile(page, '3-9')).toHaveAttribute('data-selected', 'true');
    const capital = (await tile(page, '2-9').boundingBox())!;
    await shot(page, 'zoom', { x: Math.max(0, capital.x - 90), y: Math.max(0, capital.y - 150), width: 300, height: 260 });

    expect(errors).toEqual([]);
  });
});
