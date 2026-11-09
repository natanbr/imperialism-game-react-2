import { test, expect, Page } from '@playwright/test';

// FR-025: three turns played through the UI on the order API, with no console errors.
// Start of the two-island game (FR-080, FR-081): capital 2-9 on island 1's west shore with all seven
// workers, cash 10000. Tiles used here: 3-9 farm (grain level 1, next to the capital), 2-8 farm (a
// rail site next to the capital), 5-2 barren hills (hidden coal, in the island's north).
// Set SCREENSHOT_PATH to also save a screenshot of the map with a worker selected.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
// The player's civilians only: since M4 nation 2's stand on island 2 (FR-098).
const worker = (page: Page, type: string) => page.locator(`[data-nation-id="nation-1"][data-worker-type="${type}"]`);
const cash = (page: Page) => page.locator('.nation-stats');

async function endTurn(page: Page, nextTurn: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.locator('.turn-indicator')).toContainText(`Turn: ${nextTurn}`);
}

test('FR-025 move a worker, start a job and end the turn, three times', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  // In view once the page is live and the first view has scrolled to the capital (FR-083)
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });
  await expect(cash(page)).toContainText('Cash: 10000');

  // Turn 1: the farmer moves to the farm east of the capital and starts farming (level 2, $1,000).
  await worker(page, 'farmer').click();
  await tile(page, '3-9').click();
  await expect(tile(page, '3-9').locator('[data-worker-type="farmer"]')).toBeVisible();
  await expect(tile(page, '3-9').getByTitle('Development in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 9000');
  await endTurn(page, 2);
  await expect(page.getByTestId('news-panel')).toContainText('News, turn 1');

  // Turn 2: the engineer steps north next to the capital and builds rail there ($100).
  await worker(page, 'engineer').click();
  await tile(page, '2-8').click();
  await expect(tile(page, '2-8').locator('[data-worker-type="engineer"]')).toBeVisible();
  await expect(tile(page, '2-8').getByTitle('Construction in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 8900');
  await endTurn(page, 3);
  await expect(page.getByTestId('news-panel')).toContainText('Rail finished at 2-8.');

  // Turn 3: the prospector moves onto the hills in the north and prospects them ($100).
  await worker(page, 'prospector').click();
  if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });
  await tile(page, '5-2').click();
  await expect(tile(page, '5-2').locator('[data-worker-type="prospector"]')).toBeVisible();
  await expect(tile(page, '5-2').getByTitle('Prospecting in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 8800');
  await endTurn(page, 4);
  await expect(page.getByTestId('news-panel')).toContainText('Prospectors found coal at 5-2.');

  expect(errors).toEqual([]);
});

// FR-053: the economic loop in the app. The new game starts with 10 canned food and the grain, fruit
// and livestock for a batch; ordering 2 cans in the capital and ending the turn makes 12.
test('FR-053 order canned food in the capital, end turns until it is made, see it in the warehouse', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  const cannedFood = page.getByTestId('stock-cannedFood');

  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Spring 1815');

  await page.getByRole('button', { name: /Open Warehouse/ }).click();
  await expect(cannedFood).toHaveText(/Canned Food\s*10/);
  await page.getByRole('button', { name: 'Close warehouse' }).click();

  await page.getByRole('button', { name: /Open Capital/ }).click();
  const food = page.getByTestId('building-foodProcessing');
  await expect(food).toBeVisible();
  await food.getByRole('button', { name: 'More Canned Food' }).click();
  await expect(food.getByTestId('order-cannedFood')).toHaveText(/^2 of \d+$/);
  await expect(page.getByTestId('capital-refusal')).toHaveCount(0);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m2-capital.png` });
  await page.getByRole('button', { name: 'Close capital' }).click();

  // Food processing forgets its order after each production phase, so one turn makes one batch.
  for (let turn = 2; turn <= 4; turn++) {
    await endTurn(page, turn);
    if (turn === 2) await expect(page.getByTestId('turn-indicator')).toContainText('Summer 1815');
    if (await page.getByTestId('news-panel').getByText('Produced 2 Canned Food.').count()) break;
  }
  await expect(page.getByTestId('news-panel')).toContainText('Produced 2 Canned Food.');

  await page.getByRole('button', { name: /Open Warehouse/ }).click();
  await expect(cannedFood).toHaveText(/Canned Food\s*12/);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m2-warehouse.png` });

  expect(errors).toEqual([]);
});
