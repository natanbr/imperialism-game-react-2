import { test, expect, startSeededGame, type Page } from './seededGame';

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

async function openTechnology(page: Page) {
  await page.getByRole('button', { name: /Open Capital/ }).click();
  await page.getByRole('button', { name: 'Technology', exact: true }).click();
  return page.getByRole('dialog', { name: 'Invest in Technology' });
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 800, height: 600 }]) {
  test(`FR-523 FR-526 buy Cotton Gin and unlock a farmer's cotton job at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await startSeededGame(page, game => {
      // Place the farmer on an existing undeveloped plantation so the same job can be inspected on both turns.
      const capital = game.map.tiles.flat().find(tile => tile.id === '2-9')!;
      const cotton = game.map.tiles.flat().find(tile => tile.id === '4-11')!;
      const farmer = capital.workers.find(worker => worker.type === 'farmer')!;
      capital.workers = capital.workers.filter(worker => worker.id !== farmer.id);
      farmer.assignedTileId = cotton.id;
      cotton.workers.push(farmer);
    });
    const farmer = page.locator('[data-tile-id="4-11"] button[data-worker-type="farmer"]');
    await farmer.click();
    const job = page.getByRole('button', { name: 'Develop farmer L1' });
    await expect(job).toBeDisabled();
    await expect(job).toHaveAccessibleDescription('Needs Cotton Gin (Technology, $1,000, from turn 1)');
    if (viewport.width === 1280 && process.env.SCREENSHOT_DIR) {
      await job.scrollIntoViewIfNeeded();
      await expect(job).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m16-cotton-locked.png` });
    }

    const dialog = await openTechnology(page);
    const close = dialog.getByRole('button', { name: 'Close technology' });
    await expect(close).toBeFocused();
    await expect(close).toBeInViewport({ ratio: 1 });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    const catalogue = dialog.getByRole('region', { name: 'Technology catalogue' });
    expect(await catalogue.evaluate((el: HTMLElement) => el.scrollHeight > el.clientHeight && el.offsetWidth > el.clientWidth)).toBe(true);
    expect(await catalogue.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m16-technology-${viewport.width}x${viewport.height}.png` });
    }
    await catalogue.getByText('Internal Combustion', { exact: true }).scrollIntoViewIfNeeded();
    await expect(close).toBeInViewport({ ratio: 1 });
    const buy = dialog.getByRole('button', { name: 'Buy Cotton Gin' });
    await buy.click();
    await expect(dialog.getByText('$9,000')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel Cotton Gin' }).click();
    await expect(dialog.getByText('$10,000')).toBeVisible();
    await buy.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Technology', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Close capital' }).click();
    await expect(job).toBeDisabled();
    await expect(job).toHaveAccessibleDescription('Needs Cotton Gin (Technology, $1,000, from turn 1)');
    await page.getByRole('button', { name: 'Advance Turn' }).click();
    await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
    await openTechnology(page);
    await expect(dialog.getByRole('region', { name: 'Owned' }).getByText('Cotton Gin')).toBeVisible();
    await close.click();
    await page.getByRole('button', { name: 'Close capital' }).click();
    await expect(job).toBeEnabled();
    if (viewport.width === 1280 && process.env.SCREENSHOT_DIR) {
      await job.scrollIntoViewIfNeeded();
      await expect(job).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m16-cotton-unlocked.png` });
    }
    await job.click();
    await expect(page.locator('[data-tile-id="4-11"]').getByTitle('Development in progress')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
