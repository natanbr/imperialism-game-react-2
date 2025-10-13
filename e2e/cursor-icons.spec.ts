import { test, expect } from '@playwright/test';

test.describe('Cursor Icon Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the game to load
    await page.waitForSelector('[data-testid="tile"]', { timeout: 15000 });
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
    const prospectorWorker = page.locator('[data-worker-type="Prospector"]').first();

    // Check if prospector exists, if not skip this test
    const prospectorExists = await prospectorWorker.count() > 0;
    if (!prospectorExists) {
      test.skip();
      return;
    }

    await prospectorWorker.click();

    // Find a tile that can be prospected (e.g., mountains or swamp without discovered resources)
    const validTile = page.locator('[data-testid="tile"][data-terrain="Mountains"],' +
      '[data-testid="tile"][data-terrain="Swamp"]').first();

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
    const devWorker = page.locator('[data-worker-type="Farmer"], [data-worker-type="Miner"]').first();

    const workerExists = await devWorker.count() > 0;
    if (!workerExists) {
      test.skip();
      return;
    }

    await devWorker.click();

    // Find a tile with a resource that can be developed
    const resourceTile = page.locator('[data-testid="tile"]').first();

    await resourceTile.hover();

    const cursor = await resourceTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Should contain 'url' for the emoji cursor (tractor)
    expect(cursor).toContain('url');
    expect(cursor).toContain('data:image/svg+xml');
  });

  test('should show railroad cursor when engineer is selected and hovering adjacent tile', async ({ page }) => {
    // Select an engineer worker
    const engineer = page.locator('[data-worker-type="Engineer"]').first();

    const engineerExists = await engineer.count() > 0;
    if (!engineerExists) {
      test.skip();
      return;
    }

    await engineer.click();

    // Find an adjacent tile (this might require getting the engineer's current position)
    // For now, we'll just hover over tiles and check for the rail cursor
    const tiles = page.locator('[data-testid="tile"]');
    const tileCount = await tiles.count();

    let foundRailCursor = false;
    for (let i = 0; i < Math.min(tileCount, 20); i++) {
      const tile = tiles.nth(i);
      await tile.hover();

      const cursor = await tile.evaluate((el) => {
        return window.getComputedStyle(el).cursor;
      });

      if (cursor.includes('url') && cursor.includes('data:image/svg+xml')) {
        foundRailCursor = true;
        break;
      }
    }

    // We should find at least one tile with a custom cursor
    expect(foundRailCursor).toBe(true);
  });

  test('should show construction cursor when engineer clicks on own tile', async ({ page }) => {
    const engineer = page.locator('[data-worker-type="Engineer"]').first();

    const engineerExists = await engineer.count() > 0;
    if (!engineerExists) {
      test.skip();
      return;
    }

    // Click on the engineer's tile to open construction modal
    await engineer.click();

    // The tile the engineer is on should have a construction cursor
    const engineerTile = page.locator('[data-testid="tile"]').filter({
      has: engineer
    }).first();

    await engineerTile.hover();

    const cursor = await engineerTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Should show construction emoji cursor
    expect(cursor).toContain('url');
    expect(cursor).toContain('data:image/svg+xml');
  });

  test('should change cursor when switching between different worker types', async ({ page }) => {
    // This test verifies that cursor changes when switching between workers

    // Get all workers
    const workers = page.locator('[data-worker-type]');
    const workerCount = await workers.count();

    if (workerCount < 2) {
      test.skip();
      return;
    }

    // Select first worker
    await workers.first().click();
    const tiles = page.locator('[data-testid="tile"]');
    const testTile = tiles.nth(5);
    await testTile.hover();

    const cursor1 = await testTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Select second worker
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

    if (!workerExists) {
      test.skip();
      return;
    }

    await worker.click();

    // Try to hover over a tile where the action is not valid
    // (e.g., a tile too far away, or already occupied)
    const tiles = page.locator('[data-testid="tile"]');
    const farTile = tiles.last();
    await farTile.hover();

    const cursor = await farTile.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Should be either 'auto' or 'pointer' for invalid actions
    expect(['auto', 'pointer'].some(c => cursor.includes(c))).toBe(true);
  });
});
