import { test, expect, Page } from '@playwright/test';

// FR-080 and FR-083: a new game opens on the 24x16 two-island map (2,450 x 1,600 px at 100 px tiles),
// with the camera on the capital 2-9 and never beyond the map's edges. The HUD is 250 px wide, so on
// the default 1280x720 screen the map area is 1030x720.
// Set SCREENSHOT_DIR to also save the whole map as m3-5-islands.png there.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const box = async (page: Page, id: string) => (await tile(page, id).boundingBox())!;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('FR-083 a new game opens with the capital in the middle of the map area and the map\'s left edge at the screen\'s edge', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });
  await expect(tile(page, '2-9')).toHaveAttribute('data-terrain', 'capital');

  // Row 9 is 900 to 1000 px down the map: only a scrolled camera shows it, centred at 360 px.
  const capital = await box(page, '2-9');
  expect(Math.abs(capital.y + capital.height / 2 - 360)).toBeLessThan(60);
  // The capital is 300 px from the map's left edge, so the camera stops at that edge: no space beyond
  // it. Tile 0-8 starts the map's even row 8 (odd rows are shifted 50 px); the map has a 2 px border.
  expect((await box(page, '0-8')).x).toBeGreaterThanOrEqual(0);
  expect((await box(page, '0-8')).x).toBeLessThan(10);

  // Edge scrolling to the left stops at the map's edge (the old camera kept going into empty space).
  await page.mouse.move(5, 360);
  await page.waitForTimeout(500);
  await page.mouse.move(500, 360);
  expect((await box(page, '0-8')).x).toBeLessThan(10);
  expect((await box(page, '0-8')).x).toBeGreaterThanOrEqual(0);

  expect(errors).toEqual([]);
});

test('FR-083 at the far corner the map\'s last column ends at the HUD; Center brings the capital back', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });

  await page.getByTestId('map-scroll').evaluate((el) => el.scrollTo(100000, 100000));
  await expect(tile(page, '2-9')).not.toBeInViewport();
  const corner = await box(page, '23-15');
  // 1280 - 250 (HUD) = 1030; the 2 px map border may shift it by a pixel or two.
  expect(Math.abs(corner.x + corner.width - 1030)).toBeLessThan(6);
  expect(Math.abs(corner.y + corner.height - 720)).toBeLessThan(6);

  await page.getByTitle('Center Camera').click();
  await expect(tile(page, '2-9')).toBeInViewport();
  const capital = await box(page, '2-9');
  expect(Math.abs(capital.y + capital.height / 2 - 360)).toBeLessThan(60);

  expect(errors).toEqual([]);
});

test.describe('on a screen large enough for the whole map', () => {
  test.use({ viewport: { width: 2720, height: 1620 } });

  test('FR-080 the whole map shows two islands, one capital, no coast tile', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });

    await expect(page.locator('[data-testid="tile"]')).toHaveCount(24 * 16);
    await expect(page.locator('[data-terrain="capital"]')).toHaveCount(1);
    await expect(page.locator('[data-terrain="coast"]')).toHaveCount(0);
    await expect(page.locator('[data-terrain="river"]')).toHaveCount(0);
    for (const id of ['0-0', '23-0', '0-15', '23-15', '14-9']) await expect(tile(page, id)).toBeInViewport();
    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m3-5-islands.png`, clip: { x: 0, y: 0, width: 2720, height: 1620 } });
    }

    expect(errors).toEqual([]);
  });
});
