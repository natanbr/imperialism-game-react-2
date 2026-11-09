import { test, expect, Page } from '@playwright/test';

// FR-078: the market and the end of the game in the running app. A new game starts with $10,000,
// 10 lumber at the start price of $300 and 4 cargo holds, and lasts 40 turns (FR-068).
// FR-106, FR-109: the game-over screen names both nations beside their colours and starts a new game.
// Set SCREENSHOT_DIR to also save m3-market.png and m4-game-over.png there.

const cash = (page: Page) => page.locator('.nation-stats');
const advance = (page: Page) => page.getByRole('button', { name: /Advance Turn/ });

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
  // In view once the page is live and the first view has scrolled to the capital (FR-083)
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.locator('[data-tile-id="2-9"]')).toBeInViewport({ timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
}

test('FR-078 open the market, sell one lumber, end the turn, see the sale and the cash', async ({ page }) => {
  const errors = collectErrors(page);
  await start(page);
  await expect(cash(page)).toContainText('Cash: 10000');
  await expect(page.getByTestId('hud-score')).toContainText(/Score: \d+/);

  await page.getByRole('button', { name: /Open Market/ }).click();
  const market = page.getByRole('dialog', { name: 'Market' });
  const lumber = market.getByTestId('trade-row-lumber');
  await expect(lumber.getByTestId('price')).toHaveText('$300');
  await expect(lumber.getByTestId('stock')).toHaveText('10');
  await expect(market.getByTestId('market-holds')).toHaveText(/Cargo holds:\s*0\s*used,\s*4\s*free of 4/);

  await lumber.getByRole('button', { name: 'Sell one more Lumber' }).click();
  await expect(lumber.getByTestId('sell')).toHaveText('1');
  await expect(lumber.getByTestId('stock')).toHaveText('9');
  await expect(market.getByTestId('market-holds')).toHaveText(/Cargo holds:\s*1\s*used,\s*3\s*free of 4/);
  await expect(market.getByTestId('market-refusal')).toHaveCount(0);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m3-market.png` });
  await page.getByRole('button', { name: 'Close market' }).click();

  await advance(page).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  await expect(page.getByTestId('news-panel')).toContainText('Sold 1 Lumber for $300.');
  await expect(cash(page)).toContainText('Cash: 10300');

  expect(errors).toEqual([]);
});

test('FR-078 FR-104 FR-109 end 40 turns, see the game-over screen with both nations\' final scores; Advance Turn is disabled; New game starts again', async ({ page }) => {
  test.setTimeout(240000);
  const errors = collectErrors(page);
  await start(page);

  for (let turn = 1; turn <= 40; turn++) {
    await advance(page).click();
    if (turn < 40) await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${turn + 1} of 40`);
  }

  const over = page.getByRole('dialog', { name: 'Game over' });
  await expect(over).toBeVisible();
  await expect(over.getByTestId('game-over-date')).toHaveText('The game ended after Winter 1824 (turn 40).');
  // FR-104: both nations are ranked; the scripted nation 2 grows, so the idle player need not be first
  const row = over.getByTestId('final-score-nation-1');
  const rival = over.getByTestId('final-score-nation-2');
  await expect(row.getByTestId('nation')).toContainText('(you)');
  await expect(rival.getByTestId('nation')).toHaveText('Valdoria');
  expect([await row.getByTestId('rank').textContent(), await rival.getByTestId('rank').textContent()].sort()).toEqual(['1', '2']);
  for (const part of ['treasury', 'industry', 'development', 'total']) await expect(row.getByTestId(part)).toHaveText(/^\d+$/);
  // FR-106: each nation's name beside its colour swatch
  await expect(rival.getByTestId('swatch')).toBeVisible();
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m4-game-over.png` });

  await over.getByRole('button', { name: 'Back to the map' }).click();
  await expect(over).toHaveCount(0);
  await expect(page.getByTestId('turn-indicator')).toContainText('Game over after turn 40 of 40');
  await expect(advance(page)).toBeDisabled();
  await expect(page.getByTestId('news-panel')).toContainText('Game over at the end of Winter 1824.');

  // The "n" shortcut reaches the store's advanceTurn, which does nothing after the end (FR-077).
  await page.keyboard.press('n');
  await expect(page.getByTestId('news-panel')).toContainText('News, turn 40');

  await page.getByRole('button', { name: /Final scores/ }).click();
  await expect(over).toBeVisible();

  // FR-109: New game on the game-over screen starts the next game at once
  await over.getByRole('button', { name: /New game/ }).click();
  await expect(over).toHaveCount(0);
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
  await expect(advance(page)).toBeEnabled();
  await expect(page.getByTestId('news-panel')).not.toContainText('News');
  await expect(page.getByRole('table', { name: 'Scores' }).getByTestId(/^score-row-/)).toHaveCount(2);

  expect(errors).toEqual([]);
});
