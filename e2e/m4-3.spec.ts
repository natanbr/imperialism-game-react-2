import { test, expect, Page } from '@playwright/test';

// M4.3 in the running app. FR-133 FR-135: on the default 1280x720 screen the Transportation of Commodities
// popup shows every commodity with its icon, grouped by kind in three columns, without scrolling; on a
// narrow screen the groups stack in one column. FR-139: the engineer builds rail from the capital 2-9 to
// 3-9, walks back, and builds from the capital to 3-8; the three tiles are neighbours, yet the map draws
// two lines, not a triangle. Set SCREENSHOT_DIR to also save m4-3-transport.png and m4-3-rail.png there.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const worker = (page: Page, type: string) => page.locator(`button[data-nation-id="nation-1"][data-worker-type="${type}"]`);
// FR-110: the civilians on the capital are one stack button that opens a tray; one alone is its own button.
// A click on the selected civilian's own button deselects it (FR-115), so it is clicked only when not pressed;
// picking from the tray closes the tray (FR-111).
async function pickWorker(page: Page, type: string) {
  if ((await worker(page, type).count()) === 0) await tile(page, '2-9').getByTestId('worker-stack').click();
  if ((await worker(page, type).getAttribute('aria-pressed')) !== 'true') await worker(page, type).click();
}

/** The player's rail lines as tile-id pairs, read back from the overlay (42 px tiles, odd rows shifted 21 px; FR-088). */
const drawnRail = (page: Page) =>
  page.locator('[data-testid="rail-segment"][data-nation-id="nation-1"]').evaluateAll((lines) =>
    lines
      .map((l) => {
        const end = (x: number, y: number) => {
          const row = (y - 21) / 42;
          return `${(x - 21 - (row % 2 === 1 ? 21 : 0)) / 42}-${row}`;
        };
        const n = (a: string) => Number(l.getAttribute(a));
        return [end(n('x1'), n('y1')), end(n('x2'), n('y2'))].sort().join(' ');
      })
      .sort()
  );

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function start(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });
}

async function endTurn(page: Page, nextTurn: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${nextTurn} of`);
}

/** The left edges of the popup's group sections, rounded: one value per column in use. */
const columnsOf = (page: Page) =>
  page.locator('.transport-group').evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().left)))]);

test('FR-133 FR-135 the transport popup shows every commodity with its icon, by kind in three columns, without scrolling at 1280x720', async ({ page }) => {
  const errors = collectErrors(page);
  await start(page);
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });

  await page.getByRole('button', { name: /Transportation of Commodities/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Transportation of Commodities' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('region')).toHaveCount(5);
  await expect(dialog.locator('[data-testid^="transport-row-"]')).toHaveCount(23);
  await expect(dialog.getByTestId('transport-row-ironOre').getByTestId('name')).toHaveText(/Iron Ore/);
  await expect(dialog.getByTestId('transport-row-ironOre').locator('svg')).toHaveAttribute('data-icon', 'GiOre');
  await expect(dialog.getByRole('slider', { name: 'Grain' })).toHaveAttribute('max', '4');

  // The whole list is in view: the dialog does not scroll, and every row lies inside the screen
  const box = await dialog.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(box.scroll).toBeLessThanOrEqual(box.client);
  for (const row of await dialog.locator('[data-testid^="transport-row-"]').all()) await expect(row).toBeInViewport({ ratio: 1 });
  expect(await columnsOf(page)).toHaveLength(3);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m4-3-transport.png` });

  // A slider still sends the plan: one grain
  await dialog.getByRole('slider', { name: 'Grain' }).fill('1');
  await expect(dialog.getByTestId('transport-row-grain')).toContainText('1 / 4');

  // On a narrow screen the groups stack in one column
  await page.setViewportSize({ width: 480, height: 800 });
  expect(await columnsOf(page)).toHaveLength(1);
  expect(errors).toEqual([]);
});

test.describe('rendered at twice the pixel density', () => {
  test.use({ deviceScaleFactor: 2 });

  test('FR-139 rail from the capital to 3-9 and from the capital to 3-8 (three neighbours) draws two lines, not three', async ({ page }) => {
    test.setTimeout(90000);
    const errors = collectErrors(page);
    await start(page);

    // Turn 1: the engineer builds rail from the capital onto 3-9
    await pickWorker(page, 'engineer');
    await tile(page, '3-9').click();
    await expect(tile(page, '3-9').getByTitle('Construction in progress')).toBeVisible();
    await endTurn(page, 2);
    await expect(page.getByTestId('news-panel')).toContainText('Rail finished at 3-9.');

    // Turn 2: he walks back to the capital (the section 2-9/3-9 exists, so the click is a plain move)
    await pickWorker(page, 'engineer');
    await tile(page, '2-9').click({ position: { x: 6, y: 6 } });
    await expect(tile(page, '2-9').getByTestId('worker-stack')).toHaveAttribute('data-count', '7');
    await expect(page.getByTestId('news-panel')).not.toContainText('refused');
    await endTurn(page, 3);

    // Turn 3: from the capital onto 3-8, the neighbour of both 2-9 and 3-9
    await pickWorker(page, 'engineer');
    await tile(page, '3-8').click();
    await expect(tile(page, '3-8').getByTitle('Construction in progress')).toBeVisible();
    await endTurn(page, 4);
    await expect(page.getByTestId('news-panel')).toContainText('Rail finished at 3-8.');

    // Two lines from the capital; the third side 3-8/3-9 is not drawn
    await expect(page.locator('[data-testid="rail-segment"][data-nation-id="nation-1"]')).toHaveCount(2);
    expect(await drawnRail(page)).toEqual(['2-9 3-8', '2-9 3-9']);

    // The engineer walks off to 5-9, out of the picture, so it shows where the lines end
    await pickWorker(page, 'engineer');
    await tile(page, '5-9').click();
    await expect(tile(page, '5-9').locator('button[data-worker-type="engineer"]')).toHaveCount(1);
    if (process.env.SCREENSHOT_DIR) {
      const from = (await tile(page, '1-7').boundingBox())!;
      const to = (await tile(page, '4-10').boundingBox())!;
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m4-3-rail.png`, clip: { x: from.x, y: from.y, width: to.x + to.width - from.x, height: to.y + to.height - from.y } });
    }
    expect(errors).toEqual([]);
  });
});
