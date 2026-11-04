import { test, expect, Page } from '@playwright/test';

// FR-080 and FR-083: a new game opens on the 24x16 two-island map with the camera on the capital 2-9
// and never beyond the map's edges. At 42 px tiles (FR-088) the map is 1,029 x 672 px and fits the
// default 1280x720 screen (e2e/look.spec.ts), so the camera rules are checked on an 800x450 screen:
// the map area left of the 250 px HUD is 550x450.
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

test.describe('on a screen too small for the whole map', () => {
  test.use({ viewport: { width: 800, height: 450 } });

  test('FR-083 a new game opens with the capital in the middle of the map area and the map\'s left edge at the screen\'s edge', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    // FR-091: ready means scrolled, read at once with no waiting
    expect(await page.getByTestId('map-scroll').evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop }))).toEqual({ x: 0, y: 174 });
    await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });
    await expect(tile(page, '2-9')).toHaveAttribute('data-terrain', 'capital');

    // Row 9 is 378 to 420 px down the map: centred at 225 px, the camera scrolled 174 px.
    const capital = await box(page, '2-9');
    expect(Math.abs(capital.y + capital.height / 2 - 225)).toBeLessThan(25);
    // The capital is 126 px from the map's left edge, so the camera stops at that edge: no space beyond
    // it. Tile 0-8 starts the map's even row 8 (odd rows are shifted 21 px).
    expect((await box(page, '0-8')).x).toBeGreaterThanOrEqual(0);
    expect((await box(page, '0-8')).x).toBeLessThan(4);

    // Edge scrolling to the left stops at the map's edge (the old camera kept going into empty space).
    await page.mouse.move(5, 225);
    await page.waitForTimeout(500);
    await page.mouse.move(300, 225);
    expect((await box(page, '0-8')).x).toBeLessThan(4);
    expect((await box(page, '0-8')).x).toBeGreaterThanOrEqual(0);

    expect(errors).toEqual([]);
  });

  test('FR-083 at the far corner the map\'s last column ends at the HUD; Center brings the capital back', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });

    await page.getByTestId('map-scroll').evaluate((el) => el.scrollTo(100000, 100000));
    await expect(tile(page, '2-9')).not.toBeInViewport();
    const corner = await box(page, '23-15');
    // 800 - 250 (HUD) = 550
    expect(Math.abs(corner.x + corner.width - 550)).toBeLessThan(4);
    expect(Math.abs(corner.y + corner.height - 450)).toBeLessThan(4);

    await page.getByTitle('Center Camera').click();
    await expect(tile(page, '2-9')).toBeInViewport();
    const capital = await box(page, '2-9');
    expect(Math.abs(capital.y + capital.height / 2 - 225)).toBeLessThan(25);

    expect(errors).toEqual([]);
  });
});

test('FR-080 the whole map shows two islands, one capital, no coast tile', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });

  await expect(page.locator('[data-testid="tile"]')).toHaveCount(24 * 16);
  await expect(page.locator('[data-terrain="capital"]')).toHaveCount(1);
  await expect(page.locator('[data-terrain="coast"]')).toHaveCount(0);
  await expect(page.locator('[data-terrain="river"]')).toHaveCount(0);
  for (const id of ['0-0', '23-0', '0-15', '23-15', '14-9']) await expect(tile(page, id)).toBeInViewport();
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m3-5-islands.png` });

  expect(errors).toEqual([]);
});
