import { test, expect, Page } from '@playwright/test';

// FR-025: three turns played through the UI on the order API, with no console errors.
// Start of the 40x40 game: capital 20-20 with all seven workers, cash 10000. Neighbours used here:
// 21-20 farm (grain level 1), 19-20 farm (a rail site next to the capital), 21-18 desert (hidden oil).
// Set SCREENSHOT_PATH to also save a screenshot of the map with a worker selected.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const worker = (page: Page, type: string) => page.locator(`[data-worker-type="${type}"]`);
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
  await expect(tile(page, '20-20')).toBeVisible({ timeout: 15000 });
  await expect(cash(page)).toContainText('Cash: 10000');

  // Turn 1: the farmer moves to the farm east of the capital and starts farming (level 2, $1,000).
  await worker(page, 'farmer').click();
  await tile(page, '21-20').click();
  await expect(tile(page, '21-20').locator('[data-worker-type="farmer"]')).toBeVisible();
  await expect(tile(page, '21-20').getByTitle('Development in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 9000');
  await endTurn(page, 2);
  await expect(page.getByTestId('news-panel')).toContainText('News, turn 1');

  // Turn 2: the engineer steps west next to the capital and builds rail there ($100).
  await worker(page, 'engineer').click();
  await tile(page, '19-20').click();
  await expect(tile(page, '19-20').locator('[data-worker-type="engineer"]')).toBeVisible();
  await expect(tile(page, '19-20').getByTitle('Construction in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 8900');
  await endTurn(page, 3);
  await expect(page.getByTestId('news-panel')).toContainText('Rail finished at 19-20.');

  // Turn 3: the prospector moves onto the desert and prospects it ($100).
  await worker(page, 'prospector').click();
  if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });
  await tile(page, '21-18').click();
  await expect(tile(page, '21-18').locator('[data-worker-type="prospector"]')).toBeVisible();
  await expect(tile(page, '21-18').getByTitle('Prospecting in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 8800');
  await endTurn(page, 4);
  await expect(page.getByTestId('news-panel')).toContainText('Prospectors found oil at 21-18.');

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
  await expect(tile(page, '20-20')).toBeVisible({ timeout: 15000 });
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
