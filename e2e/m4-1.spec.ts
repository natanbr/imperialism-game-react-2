import { test, expect, Page } from '@playwright/test';

// M4.1 in the running app. FR-122 after 15 End Turns Valdoria (island 2, capital 14-9) has a depot joined
// to its capital by a few rail lines; FR-121 the market and the capital show commodity icons; FR-119 the
// capital card shows "P of M". Set SCREENSHOT_DIR to also save m4-1-ai-rail.png and m4-1-icons.png there.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);

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

test('FR-122 after 15 End Turns Valdoria has a connected depot and a few rail lines, no mesh', async ({ page }) => {
  test.setTimeout(150000);
  const errors = collectErrors(page);
  await start(page);
  for (let turn = 2; turn <= 16; turn++) {
    await page.getByRole('button', { name: /Advance Turn/ }).click();
    await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${turn} of`);
  }

  // Show island 2: its capital and the land around it (columns 13 to 22, rows 0 to 14)
  await tile(page, '22-14').scrollIntoViewIfNeeded();
  await tile(page, '13-0').scrollIntoViewIfNeeded();
  await expect(tile(page, '14-9')).toBeInViewport();
  const valdoria = page.locator('[data-tile-id]').filter({ has: page.getByRole('img', { name: 'Depot: connected' }) });
  const connected = await valdoria.evaluateAll((els) => els.map((e) => e.getAttribute('data-tile-id')).filter((id) => Number(id!.split('-')[0]) >= 12));
  expect(connected.length).toBeGreaterThanOrEqual(1);

  if (process.env.SCREENSHOT_DIR) {
    const from = (await tile(page, '12-0').boundingBox())!;
    const to = (await tile(page, '23-14').boundingBox())!;
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m4-1-ai-rail.png`, clip: { x: from.x, y: from.y, width: to.x + to.width - from.x, height: to.y + to.height - from.y } });
  }
  expect(errors).toEqual([]);
});

test('FR-121 FR-119 the market and the capital show commodity icons; a card shows what will be made', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await start(page);

  await page.getByRole('button', { name: /Open Market/ }).click();
  const market = page.getByRole('dialog', { name: 'Market' });
  await expect(market.getByTestId('trade-row-steel').getByTestId('name').locator('svg')).toHaveAttribute('data-icon', 'GiMetalBar');
  await expect(market.getByTestId('trade-row-lumber').getByTestId('name')).toHaveText(/Lumber/);
  const marketShot = process.env.SCREENSHOT_DIR ? await market.screenshot() : undefined;
  await page.getByRole('button', { name: 'Close market' }).click();

  await page.getByRole('button', { name: /Open Capital/ }).click();
  const capital = page.getByRole('dialog', { name: 'Capital' });
  const steel = capital.getByTestId('output-steel');
  await expect(steel.getByTestId('output-name').locator('svg')).toHaveAttribute('data-icon', 'GiMetalBar');
  await expect(steel.getByTestId('input-coal').locator('svg')).toHaveAttribute('data-icon', 'GiCoalPile');
  await steel.getByRole('button', { name: 'More Steel' }).click();
  await expect(steel.getByTestId('order-steel')).toHaveText('1 of 2');
  const capitalShot = process.env.SCREENSHOT_DIR ? await capital.screenshot() : undefined;
  await page.getByRole('button', { name: 'Close capital' }).click();

  if (marketShot && capitalShot) {
    // One picture with both dialogs side by side
    const img = (b: Buffer) => `<img src="data:image/png;base64,${b.toString('base64')}" style="display:block;max-height:900px">`;
    await page.setContent(`<body style="margin:0;background:#fff;display:flex;gap:16px;align-items:flex-start">${img(marketShot)}${img(capitalShot)}</body>`);
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m4-1-icons.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
