import { test, expect, Page } from '@playwright/test';

// FR-025: three turns played through the UI on the order API, with no console errors.
// Start of the 40x40 game: capital 20-20 with all seven workers, cash 1000. Neighbours used here:
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
  await expect(cash(page)).toContainText('Cash: 1000');

  // Turn 1: the farmer moves to the farm east of the capital and starts farming (level 2, $500).
  await worker(page, 'farmer').click();
  await tile(page, '21-20').click();
  await expect(tile(page, '21-20').locator('[data-worker-type="farmer"]')).toBeVisible();
  await expect(tile(page, '21-20').getByTitle('Development in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 500');
  await endTurn(page, 2);
  await expect(page.getByTestId('news-panel')).toContainText('News, turn 1');

  // Turn 2: the engineer steps west next to the capital and builds rail there ($100).
  await worker(page, 'engineer').click();
  await tile(page, '19-20').click();
  await expect(tile(page, '19-20').locator('[data-worker-type="engineer"]')).toBeVisible();
  await expect(tile(page, '19-20').getByTitle('Construction in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 400');
  await endTurn(page, 3);
  await expect(page.getByTestId('news-panel')).toContainText('Rail finished at 19-20.');

  // Turn 3: the prospector moves onto the desert and prospects it ($100).
  await worker(page, 'prospector').click();
  if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });
  await tile(page, '21-18').click();
  await expect(tile(page, '21-18').locator('[data-worker-type="prospector"]')).toBeVisible();
  await expect(tile(page, '21-18').getByTitle('Prospecting in progress')).toBeVisible();
  await expect(cash(page)).toContainText('Cash: 300');
  await endTurn(page, 4);
  await expect(page.getByTestId('news-panel')).toContainText('Prospectors found oil at 21-18.');

  expect(errors).toEqual([]);
});
