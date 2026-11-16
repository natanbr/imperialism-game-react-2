import { test, expect, Page } from '@playwright/test';

// FR-330 (M11, NR-032): the map's cursors are drawn from the art pack's pictures (the prospector, the developing civilian,
// the fort, the rail piece, the engineer) into a 32 px canvas and used as a PNG data URL with its hotspot in the middle;
// until a picture is drawn the cursor is `pointer`, and a tile with no action keeps `auto`. The emoji cursors are gone.

/** The tray of the player's civilians on the capital 2-9 (FR-110); picking one closes it. */
const openCapitalTray = (page: Page) => page.locator('[data-tile-id="2-9"] [data-testid="worker-stack"]').click();

const cursorOf = (page: Page, id: string) =>
  page.locator(`[data-testid="tile"][data-tile-id="${id}"]`).evaluate((el) => window.getComputedStyle(el).cursor);

/** Number of tiles whose computed cursor is a drawn pack picture. */
const countTilesWithPictureCursor = (page: Page) =>
  page.locator('[data-testid="tile"]').evaluateAll((els) => els.filter((el) => window.getComputedStyle(el).cursor.includes('data:image/png')).length);

/** Number of tiles whose computed cursor is one of the old emoji cursors (an SVG data URL with a text emoji). */
const countTilesWithEmojiCursor = (page: Page) =>
  page.locator('[data-testid="tile"]').evaluateAll((els) => els.filter((el) => window.getComputedStyle(el).cursor.includes('data:image/svg+xml')).length);

test.describe('Cursor Icon Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the game to load: the first view scrolls to the capital once the page is live (FR-083);
    // a click before that lands where the scroll moves the map
    await page.waitForSelector('[data-testid="tile"]', { timeout: 15000 });
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    // The player's capital: since M4 nation 2 has one on island 2 too (FR-098)
    await expect(page.locator('[data-testid="tile"][data-tile-id="2-9"]')).toBeInViewport({ timeout: 15000 });
    // FR-110: the capital's civilians are one stack button; open its tray so each has a button
    await openCapitalTray(page);
  });

  test('FR-330 a tile with no action keeps the default cursor when no worker is selected', async ({ page }) => {
    const tile = page.locator('[data-testid="tile"]').first();
    await expect(tile).toBeVisible();
    expect(await tile.evaluate((el) => window.getComputedStyle(el).cursor)).toBe('auto');
  });

  test('FR-330 the prospector over barren hills shows the prospector picture as a 32 px PNG cursor, hotspot in the middle', async ({ page }) => {
    const prospectorWorker = page.locator('[data-worker-type="prospector"]').first();
    expect(await prospectorWorker.count(), 'worker must exist in the initial game state').toBeGreaterThan(0);
    await prospectorWorker.click();

    // A tile that can be prospected: the player's barren hills 5-2 hide coal (FR-080: the islands have no
    // mountains or swamp). By id since M5 (FR-160): on the continent the first barren hills in page order
    // is Lorran's 13-1, minor land with its iron already found, where no civilian works (FR-149).
    const validTile = page.locator('[data-testid="tile"][data-tile-id="5-2"]');
    await expect(validTile).toHaveAttribute('data-terrain', 'barrenHills');
    await validTile.hover();

    // `pointer` until the picture is drawn, then the drawn picture
    await expect.poll(() => cursorOf(page, '5-2'), { timeout: 10000 }).toContain('data:image/png');
    const cursor = await cursorOf(page, '5-2');
    expect(cursor).toMatch(/^url\("?data:image\/png;base64,[A-Za-z0-9+/=]+"?\) 16 16, pointer$/);
    // The drawn PNG is 32 x 32
    const size = await page.evaluate(async (value) => {
      const url = /url\("?([^")]+)"?\)/.exec(value)![1];
      const img = new Image();
      img.src = url;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, cursor);
    expect(size).toEqual([32, 32]);
  });

  test('FR-330 a farmer selected: the farms it can develop show its own figure as the cursor', async ({ page }) => {
    const devWorker = page.locator('[data-worker-type="farmer"]').first();
    expect(await devWorker.count(), 'worker must exist in the initial game state').toBeGreaterThan(0);
    await devWorker.click();

    // Cursor depends on app state, so check all tiles: own developable tiles show the farmer once drawn
    await expect.poll(() => countTilesWithPictureCursor(page), { timeout: 10000 }).toBeGreaterThan(0);
    expect(await countTilesWithEmojiCursor(page)).toBe(0);
  });

  // FR-380 (FR-TRUTH-08): the engineer in the capital 2-9 over its neighbour 3-9, where a click lays rail (rail-on-move):
  // the rail piece. Any picture on 3-9 is the rail piece: Construction Options' cursor shows only on the engineer's own tile.
  test('FR-380 the engineer selected: a neighbour where the click lays rail shows the rail piece cursor', async ({ page }) => {
    const engineer = page.locator('[data-worker-type="engineer"]').first();
    expect(await engineer.count(), 'worker must exist in the initial game state').toBeGreaterThan(0);
    await engineer.click();
    await page.locator('[data-testid="tile"][data-tile-id="3-9"]').hover();
    await expect.poll(() => cursorOf(page, '3-9'), { timeout: 10000 }).toContain('data:image/png');
    expect(await cursorOf(page, '3-9')).toMatch(/ 16 16, pointer$/);
  });

  // FR-378, FR-379 (ECONOMY-03): the capital holds its level-1 fort, so the engineer standing there is offered no fort and
  // a click on its own tile does nothing: the default cursor, not the fort picture
  test('FR-378 FR-379 the engineer in the capital: no fort cursor on its own tile (the capital has its fort)', async ({ page }) => {
    const engineer = page.locator('[data-worker-type="engineer"]').first();
    expect(await engineer.count(), 'worker must exist in the initial game state').toBeGreaterThan(0);
    await engineer.click();

    // The tile the engineer is on: the capital, where the tray was (picking the engineer closed the tray,
    // so the tile is found by its id)
    const engineerTile = page.locator('[data-testid="tile"][data-tile-id="2-9"]');
    await engineerTile.hover();
    await expect.poll(() => cursorOf(page, '3-9'), { timeout: 10000 }).toContain('data:image/png');
    expect(await cursorOf(page, '2-9')).toBe('auto');
  });

  test('FR-330 switching between worker types keeps every cursor a drawn picture, the pointer or auto', async ({ page }) => {
    const workers = page.locator('[data-worker-type]');
    expect(await workers.count()).toBeGreaterThanOrEqual(2);

    await workers.first().click();
    const testTile = page.locator('[data-testid="tile"]').nth(5);
    await testTile.hover();
    const cursor1 = await testTile.evaluate((el) => window.getComputedStyle(el).cursor);

    // Select second worker: picking the first closed the tray, so open it again
    await openCapitalTray(page);
    await workers.nth(1).click();
    await testTile.hover();
    const cursor2 = await testTile.evaluate((el) => window.getComputedStyle(el).cursor);

    const known = (c: string) => c.includes('data:image/png') || c === 'auto' || c === 'pointer';
    expect(known(cursor1)).toBe(true);
    expect(known(cursor2)).toBe(true);
    expect(await countTilesWithEmojiCursor(page)).toBe(0);
  });

  test('FR-330 a tile where the action is not valid shows the default or pointer cursor', async ({ page }) => {
    const worker = page.locator('[data-worker-type]').first();
    expect(await worker.count(), 'worker must exist in the initial game state').toBeGreaterThan(0);
    await worker.click();

    // A tile too far away, or already occupied
    const farTile = page.locator('[data-testid="tile"]').last();
    // force: the HUD action bar overlays the last map tile (Playwright reports it intercepts pointer events);
    // the assertion reads the tile's computed cursor, which does not depend on the pointer position
    await farTile.hover({ force: true });
    const cursor = await farTile.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(['auto', 'pointer']).toContain(cursor);
  });
});
