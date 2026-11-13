import { test, expect, Page } from '@playwright/test';

// FR-078: the market and the end of the game in the running app. A new game starts with $10,000 and 4 holds, and lasts
// 40 turns (FR-068). Since M7 the app's continent trades with partners (FR-242): nobody buys lumber any more and a minor
// buys only clothing, furniture and hardware, and only from a Great Power holding a consulate there (FR-184, FR-185), so
// the sale takes two turns: a consulate with Pellis and 1 furniture made on turn 1, the furniture offered on the Board of
// Trade (FR-194) on turn 2. Pellis because the scripted Valdoria opens a consulate only with a minor whose offer or demand
// it will use, the first such in id order (FR-245): Arvelia on turn 1 and not Pellis by turn 2, so Pellis buys our furniture.
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

/** The HUD's cash as a number. */
const cashOf = async (page: Page) => Number((await cash(page).innerText()).replace(/[^\d-]/g, ''));

test('FR-078 open the market, offer one furniture for sale, end the turn, see the sale and the cash', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await start(page);
  await expect(cash(page)).toContainText('Cash: 10000');
  await expect(page.getByTestId('hud-score')).toContainText(/Score: \d+/);

  // Turn 1: a consulate with Pellis, and 1 furniture from 2 lumber in the capital
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
  await diplomacy.getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name: 'Pellis', exact: true }).click();
  await diplomacy.getByRole('tabpanel', { name: 'Pellis', exact: true }).getByRole('button', { name: 'Consulate ($500)' }).click();
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await page.getByRole('button', { name: /Open Capital/ }).click();
  const capital = page.getByRole('dialog', { name: 'Capital' });
  await capital.getByTestId('output-furniture').getByRole('button', { name: 'More Furniture' }).click();
  await expect(capital.getByTestId('order-furniture')).toHaveText(/^1 of/);
  await page.getByRole('button', { name: 'Close capital' }).click();
  await advance(page).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  await expect(cash(page)).toContainText('Cash: 9500');

  // Turn 2: offer it on the Board of Trade; Pellis buys furniture and we hold a consulate there
  await page.getByRole('button', { name: /Open Market/ }).click();
  const market = page.getByRole('dialog', { name: 'Board of Trade' });
  const furniture = market.getByTestId('trade-row-furniture');
  await expect(furniture.getByTestId('available')).toHaveText('1');
  await expect(furniture.getByRole('list', { name: 'Buyers' }).getByRole('listitem').last()).toHaveText(/^Pellis 2, favours \w+$/);
  await expect(market.getByTestId('market-holds')).toHaveText('Holds: 4 of 4 free');

  await furniture.getByRole('button', { name: 'Offer one more Furniture' }).click();
  await expect(furniture.getByTestId('offer')).toHaveText('1');
  await expect(furniture.getByTestId('available')).toHaveText('0');
  await expect(market.getByTestId('market-holds')).toHaveText('Holds: 3 of 4 free');
  await expect(market.getByTestId('market-refusal')).toHaveCount(0);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m3-market.png` });
  await page.getByRole('button', { name: 'Close Board of Trade' }).click();

  const before = await cashOf(page);
  await advance(page).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 3 of 40');
  const news = page.getByTestId('news-panel');
  await expect(news).toContainText(/Sold 1 Furniture to Pellis for \$[\d,]+\./);
  const income = Number(/Sold 1 Furniture to Pellis for \$([\d,]+)\./.exec(await news.innerText())![1].replace(/,/g, ''));
  expect(income).toBeGreaterThan(0);
  expect(await cashOf(page)).toBe(before + income);

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
