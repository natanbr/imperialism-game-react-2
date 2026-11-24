import { test, expect, Page } from './seededGame';

// M12 lane L1 in the running app, on a new continent game (seed of the default game).
// FR-397 (card Q89; NR-018 kept): turn 1, a consulate with Arvelia and a bid of 2 coal; End Turn; on turn 2 the Board of
// Trade shows "Repeat last turn's trades", which orders the 2 coal again: the coal bid reads 2, "Bids: 1 of 4" (the
// counter counts commodities, so one commodity bid on; the FR's "Bids: 2 of 4" counted units) and the line "Repeated 2 of
// 2 units.".
// FR-394: on turn 2, with the consulate held, a 10% subsidy toward Arvelia set in Diplomacy shows under the coal's board
// price "Arvelia charges $N with our 10%", N = floor(P x 1.1) of the price on the row.
// FR-399: the note under the title starts with "Buy and sell orders last one turn; production orders in the Capital stay."

test.use({ viewport: { width: 1280, height: 720 } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

const board = (page: Page) => page.getByRole('dialog', { name: 'Board of Trade' });
const row = (page: Page, commodity: string) => board(page).getByTestId(`trade-row-${commodity}`);

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
}

async function openBoard(page: Page) {
  await page.getByRole('button', { name: /Open Market/ }).click();
  await expect(board(page)).toBeVisible();
}

async function closeBoard(page: Page) {
  await board(page).getByRole('button', { name: 'Close Board of Trade' }).click();
  await expect(board(page)).toHaveCount(0);
}

/** Opens Diplomacy on Arvelia's tab and runs `act` on its panel, then closes the dialog. */
async function inArvelia(page: Page, act: (panel: ReturnType<Page['getByRole']>) => Promise<void>) {
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
  await diplomacy.getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name: 'Arvelia', exact: true }).click();
  await act(diplomacy.getByRole('tabpanel', { name: 'Arvelia', exact: true }));
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await expect(diplomacy).toHaveCount(0);
}

test('FR-397 FR-394 FR-399 bid 2 coal, End Turn, Repeat orders them again; a 10% subsidy shows the deal price under the board price', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);

  // Turn 1: a consulate with Arvelia and 2 coal bid; no Repeat button on a new game
  await inArvelia(page, (panel) => panel.getByRole('button', { name: 'Consulate ($500)' }).click());
  await openBoard(page);
  // Re-targeted by M18c FR-575: the duration line opens the Details tab (it stood under the title)
  await board(page).getByRole('tab', { name: 'Details', exact: true }).click();
  await expect(board(page).getByTestId('board-duration')).toHaveText('Buy and sell orders last one turn; production orders in the Capital stay.');
  await board(page).getByRole('tab', { name: 'Board', exact: true }).click();
  await expect(board(page).getByRole('button', { name: "Repeat last turn's trades" })).toHaveCount(0);
  const coalPlus = row(page, 'coal').getByRole('button', { name: 'Buy one more Coal' });
  await coalPlus.click();
  await coalPlus.click();
  await expect(row(page, 'coal').getByTestId('bid')).toHaveText('2');
  await closeBoard(page);

  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');

  // Turn 2: the bid is gone (one turn's order) and Repeat brings it back, unit by unit
  await openBoard(page);
  await expect(row(page, 'coal').getByTestId('bid')).toHaveText('0');
  await board(page).getByRole('button', { name: "Repeat last turn's trades" }).click();
  await expect(row(page, 'coal').getByTestId('bid')).toHaveText('2');
  // Re-recorded by M18c FR-573: old "Buying: 1 of 4"
  await expect(board(page).getByTestId('market-bids')).toHaveText('Buying 1 of 4 commodities');
  await expect(board(page).getByTestId('repeat-result')).toHaveText('Repeated 2 of 2 units.');
  await expect(page.getByTestId('toast')).toHaveCount(0);
  await closeBoard(page);

  // A 10% subsidy toward Arvelia (the consulate is held now): the coal row shows the deal price under the board price
  await inArvelia(page, async (panel) => {
    await panel.getByRole('combobox', { name: 'Subsidy' }).selectOption('10');
    await panel.getByRole('button', { name: 'Set policy' }).click();
  });
  await openBoard(page);
  const price = Number((await row(page, 'coal').getByTestId('price').evaluate((el) => el.firstChild?.textContent ?? '')).replace(/[^\d]/g, ''));
  // Re-targeted by M18c FR-575: the deal price stood under the board price; it is in the row's Notes on Details
  await board(page).getByRole('tab', { name: 'Details', exact: true }).click();
  await expect(board(page).getByTestId('detail-row-coal').getByTestId('deal-price')).toHaveText(`Arvelia charges $${Math.floor((price * 110) / 100).toLocaleString('en-US')} with our 10%`);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m12-board-repeat-subsidy.png` });
  await closeBoard(page);
  expect(errors).toEqual([]);
});
