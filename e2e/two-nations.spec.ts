import { test, expect, Page } from '@playwright/test';

// M4 part B in the running app: the player watches Valdoria (nation 2, scripted, island 2, capital 14-9)
// grow. FR-106 the HUD ranks both nations, FR-107 the news names Valdoria, FR-108 Valdoria's capital is
// read-only, FR-109 New game from the HUD asks first.
// Set SCREENSHOT_DIR to also save m4-map.png and m4-valdoria-capital.png there.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const scores = (page: Page) => page.getByRole('table', { name: 'Scores' });

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

test('FR-106 FR-107 FR-108 after five End Turns the HUD ranks both nations, the news names Valdoria, its capital is read-only', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await start(page);
  await expect(scores(page).getByTestId(/^score-row-/)).toHaveCount(2);
  await expect(scores(page).getByTestId('score-row-nation-1')).toContainText('Testland (you)');
  await expect(scores(page).getByTestId('score-row-nation-2')).toContainText('Valdoria');

  for (let turn = 2; turn <= 6; turn++) await endTurn(page, turn);

  // Valdoria grows on island 2: its own rail, and its lines in the news under its name
  expect(await page.locator('[data-testid="rail-segment"][data-nation-id="nation-2"]').count()).toBeGreaterThan(0);
  await expect(page.getByTestId('news-panel')).toContainText('Valdoria: ');
  await expect(scores(page).getByTestId('score-row-nation-2').getByTestId('swatch')).toBeVisible();
  await expect(scores(page).getByTestId(/^score-row-/).first().getByTestId('rank')).toHaveText('1');
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m4-map.png` });

  // Its capital shows who owns it and what stands there, and offers no order
  await expect(tile(page, '14-9').locator('button')).toHaveCount(0);
  await tile(page, '14-9').click({ position: { x: 6, y: 6 } });
  await expect(tile(page, '14-9').getByTestId('selection-ring')).toBeVisible();
  const info = page.getByTestId('tile-info');
  await expect(info.getByTestId('tile-owner')).toHaveText('Owner: Valdoria');
  await expect(info).toContainText('Terrain: Capital');
  await expect(info.getByRole('button')).toHaveCount(0);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m4-valdoria-capital.png` });

  expect(errors).toEqual([]);
});

test('FR-109 New game in the HUD asks first; Start new game goes back to turn 1 with the news and selection cleared', async ({ page }) => {
  const errors = collectErrors(page);
  await start(page);
  await endTurn(page, 2);
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('tile-info')).toBeVisible();

  await page.getByRole('button', { name: /New game/ }).click();
  const confirm = page.getByRole('group', { name: 'Confirm new game' });
  await expect(confirm).toContainText('Start a new game? This game will be lost.');
  await confirm.getByRole('button', { name: 'Keep playing' }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');

  await page.getByRole('button', { name: /New game/ }).click();
  await confirm.getByRole('button', { name: 'Start new game' }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
  await expect(page.getByTestId('news-panel')).not.toContainText('News');
  await expect(page.getByTestId('tile-info')).toHaveCount(0);
  await expect(tile(page, '3-9')).not.toHaveAttribute('data-selected', 'true');

  expect(errors).toEqual([]);
});
