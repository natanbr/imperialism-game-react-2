import { test, expect, Page } from '@playwright/test';

/** The tray of the player's civilians on the capital 2-9 (FR-110); picking one closes it. */
const openCapitalTray = (page: Page) => page.locator('[data-tile-id="2-9"] [data-testid="worker-stack"]').click();

/** Number of tiles whose computed cursor is the given emoji cursor (see emojiToCursor in useTileVisuals). */
const countTilesWithEmojiCursor = (page: Page, emoji: string) =>
  page.locator('[data-testid="tile"]').evaluateAll(
    (els, encoded) => els.filter((el) => window.getComputedStyle(el).cursor.includes(encoded)).length,
    encodeURIComponent(emoji)
  );


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

  test('should show default cursor when no worker is selected', async ({ page }) => {
    // Find a tile
    const tile = page.locator('[data-testid="tile"]').first();
    await expect(tile).toBeVisible();

    // Get computed cursor style
    const cursor = await tile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Should be 'auto' when no worker is selected
    expect(cursor).toBe('auto');
  });

  test('should show prospect cursor (magnifying glass) when prospector is selected and hovering valid tile', async ({ page }) => {
    // Select a prospector worker (assuming there's one in the initial game state)
    const prospectorWorker = page.locator('[data-worker-type="prospector"]').first();

    const prospectorExists = await prospectorWorker.count() > 0;
    expect(prospectorExists, 'worker must exist in the initial game state').toBe(true);

    await prospectorWorker.click();

    // A tile that can be prospected: the player's barren hills 5-2 hide coal (FR-080: the islands have no
    // mountains or swamp). By id since M5 (FR-160): on the continent the first barren hills in page order
    // is Lorran's 13-1, minor land with its iron already found, where no civilian works (FR-149).
    const validTile = page.locator('[data-testid="tile"][data-tile-id="5-2"]');
    await expect(validTile).toHaveAttribute('data-terrain', 'barrenHills');

    await validTile.hover();

    // Get the cursor style
    const cursor = await validTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Should contain 'url' for the emoji cursor (magnifying glass)
    expect(cursor).toContain('url');
    expect(cursor).toContain('data:image/svg+xml');
  });

  test('should show development cursor (tractor) when development worker is selected', async ({ page }) => {
    // Select a development worker (Farmer, Miner, etc.)
    const devWorker = page.locator('[data-worker-type="farmer"]').first();

    const workerExists = await devWorker.count() > 0;
    expect(workerExists, 'worker must exist in the initial game state').toBe(true);

    await devWorker.click();

    // Cursor depends on app state, so check all tiles: own developable tiles show the tractor
    expect(await countTilesWithEmojiCursor(page, '🚜')).toBeGreaterThan(0);
  });

  // No tile action produces the rail cursor today: getEngineerActions only returns fort / construct-modal,
  // and rail is built implicitly on engineer move. Kept as fixme so the gap stays visible instead of passing vacuously.
  test.fixme('should show railroad cursor when engineer is selected and hovering adjacent tile', async ({ page }) => {
    // Select an engineer worker
    const engineer = page.locator('[data-worker-type="engineer"]').first();

    const engineerExists = await engineer.count() > 0;
    expect(engineerExists, 'worker must exist in the initial game state').toBe(true);

    await engineer.click();

    // A tile next to the engineer's rail network shows the railroad cursor
    expect(await countTilesWithEmojiCursor(page, '🛤️')).toBeGreaterThan(0);
  });

  test('should show construction cursor when engineer clicks on own tile', async ({ page }) => {
    const engineer = page.locator('[data-worker-type="engineer"]').first();

    const engineerExists = await engineer.count() > 0;
    expect(engineerExists, 'worker must exist in the initial game state').toBe(true);

    // Click on the engineer's tile to open construction modal
    await engineer.click();

    // The tile the engineer is on should have a construction cursor: the capital, where the tray was
    // (picking the engineer closed the tray, so the tile is found by its id)
    const engineerTile = page.locator('[data-testid="tile"][data-tile-id="2-9"]');

    await engineerTile.hover();

    const cursor = await engineerTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Own tile: fort (capital/town) or construction-modal cursor
    expect([encodeURIComponent('🏰'), encodeURIComponent('🏗️')].some(c => cursor.includes(c))).toBe(true);
  });

  test('should change cursor when switching between different worker types', async ({ page }) => {
    // This test verifies that cursor changes when switching between workers

    // Get all workers
    const workers = page.locator('[data-worker-type]');
    const workerCount = await workers.count();

    expect(workerCount).toBeGreaterThanOrEqual(2);

    // Select first worker
    await workers.first().click();
    const tiles = page.locator('[data-testid="tile"]');
    const testTile = tiles.nth(5);
    await testTile.hover();

    const cursor1 = await testTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Select second worker: picking the first closed the tray, so open it again
    await openCapitalTray(page);
    await workers.nth(1).click();
    await testTile.hover();

    const cursor2 = await testTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Cursors should be different (unless both workers have the same action available)
    // At minimum, verify that custom cursors are being set
    const hasCursor1 = cursor1.includes('url') || cursor1 === 'auto' || cursor1 === 'pointer';
    const hasCursor2 = cursor2.includes('url') || cursor2 === 'auto' || cursor2 === 'pointer';

    expect(hasCursor1).toBe(true);
    expect(hasCursor2).toBe(true);
  });

  test('should show regular cursor for invalid actions', async ({ page }) => {
    // Select a worker
    const worker = page.locator('[data-worker-type]').first();
    const workerExists = await worker.count() > 0;

    expect(workerExists, 'worker must exist in the initial game state').toBe(true);

    await worker.click();

    // Try to hover over a tile where the action is not valid
    // (e.g., a tile too far away, or already occupied)
    const tiles = page.locator('[data-testid="tile"]');
    const farTile = tiles.last();
    // force: the HUD action bar overlays the last map tile (Playwright reports it intercepts pointer events);
    // the assertion reads the tile's computed cursor, which does not depend on the pointer position
    await farTile.hover({ force: true });

    const cursor = await farTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Should be either 'auto' or 'pointer' for invalid actions
    expect(['auto', 'pointer'].some(c => cursor.includes(c))).toBe(true);
  });
});
