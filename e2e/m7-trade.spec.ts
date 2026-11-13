import { test, expect, Page } from '@playwright/test';

// FR-197 (M7 done) in the running app, on a new game: order a consulate with Arvelia in Diplomacy, bid 2 coal on the
// Board of Trade, end the turn and see "Bought 2 Coal from Arvelia" in the Deal Book. On turn 1 both Great Powers have
// 30 points with Arvelia and intentOrder puts Testland first, so Arvelia serves Testland's bid before any bid of the
// scripted Valdoria (which bids for raw too, FR-245): both units are ours at the board price, $100, whatever the seed.
// On the way (FR-194): the coal's sellers in units (FR-251), the "no consulate" mark and the reason beside the disabled
// "+" that the consulate ordered this turn lifts (FR-185, FR-252, FR-257), "Holds: 2 of 4 free" after the bid and no
// offer control on a row with a bid; the HUD's Deal Book button (FR-195) with the Trade net and the Treasury, where the
// consulate's $500 explains the rest of the cash change (FR-256).
// FR-194 at 1280x720 (the M6 QA lesson, FR-237): the Board of Trade fits the window; neither the page nor the dialog
// scrolls, only the board under its header; with the reasons beside the controls (FR-257) too.
// Set SCREENSHOT_DIR to also save m7-board.png and m7-deal-book.png there.

test.use({ viewport: { width: 1280, height: 720 } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** The HUD's "Cash: $10,000" as a number. */
const cash = async (page: Page) => Number((await page.locator('.nation-stats').innerText()).replace(/[^\d-]/g, ''));
const board = (page: Page) => page.getByRole('dialog', { name: 'Board of Trade' });
const row = (page: Page, commodity: string) => board(page).getByTestId(`trade-row-${commodity}`);
const sellers = (page: Page, commodity: string) => row(page, commodity).getByRole('list', { name: 'Sellers' }).getByRole('listitem');

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

/** Orders a consulate with Arvelia in Diplomacy (M6). */
async function consulateWithArvelia(page: Page) {
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
  await diplomacy.getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name: 'Arvelia', exact: true }).click();
  await diplomacy.getByRole('tabpanel', { name: 'Arvelia', exact: true }).getByRole('button', { name: 'Consulate ($500)' }).click();
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await expect(diplomacy).toHaveCount(0);
}

test('FR-197 FR-194 FR-195 a consulate with Arvelia and 2 coal bid on the Board of Trade: the Deal Book reads "Bought 2 Coal from Arvelia"', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);
  const start = await cash(page);
  await expect(page.locator('.nation-stats')).toHaveText('Cash: $10,000');

  // Turn 1, before the consulate: Arvelia offers 3 coal and is marked "no consulate"; the coal bid is refused, and says why
  await openBoard(page);
  await expect(board(page).getByRole('heading', { level: 2 })).toHaveText(/Board of Trade — Testland/);
  await expect(sellers(page, 'coal').first()).toHaveText('Arvelia: 3 units (no consulate)');
  await expect(board(page).getByTestId('board-favourites')).toHaveText('Arvelia, Sundmark, Lorran and Pellis favour Testland.');
  const coalPlus = row(page, 'coal').getByRole('button', { name: 'Bid one more Coal' });
  await expect(coalPlus).toBeDisabled();
  await expect(row(page, 'coal').getByTestId('bid-note')).toHaveText('We need a consulate with a seller');
  await expect(coalPlus).toHaveAccessibleDescription('We need a consulate with a seller');
  await expect(board(page).getByTestId('market-holds')).toHaveText('Holds: 4 of 4 free');
  await closeBoard(page);

  await consulateWithArvelia(page);

  // Back on the board: the consulate ordered this turn counts, so the mark and the reason are gone; bid 2 coal
  await openBoard(page);
  await expect(sellers(page, 'coal').first()).toHaveText('Arvelia: 3 units');
  await expect(row(page, 'coal').getByTestId('bid-note')).toHaveCount(0);
  await coalPlus.click();
  await coalPlus.click();
  await expect(row(page, 'coal').getByTestId('bid')).toHaveText('2');
  await expect(row(page, 'coal').getByRole('button', { name: /^Offer one/ })).toHaveCount(0);
  await expect(board(page).getByTestId('market-holds')).toHaveText('Holds: 2 of 4 free');
  await expect(board(page).getByTestId('market-bids')).toHaveText('Bids: 1 of 4');
  await expect(board(page).getByTestId('market-cash')).toHaveText(`Cash: $${(start - 700).toLocaleString('en-US')}`);
  await expect(board(page).getByTestId('market-refusal')).toHaveCount(0);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m7-board.png` });
  await closeBoard(page);

  // End Turn: the news and the cash, then the Deal Book
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  await expect(page.getByTestId('news-panel')).toContainText('Bought 2 Coal from Arvelia for $200.');
  // and the start army's $100 upkeep (FR-202)
  expect(await cash(page)).toBe(start - 500 - 200 - 100);
  await expect(page.locator('.nation-stats')).toHaveText('Cash: $9,200');

  const dealBookButton = page.getByRole('button', { name: 'Deal Book', exact: true });
  await dealBookButton.click();
  const dealBook = page.getByRole('dialog', { name: 'Deal Book' });
  await expect(dealBook).toBeVisible();
  await expect(dealBook.getByTestId('deal-book-turn')).toHaveText('Turn 1, Spring 1815');
  await expect(dealBook.getByRole('list', { name: 'Bought' }).getByRole('listitem')).toHaveText(['Bought 2 Coal from Arvelia @ $100']);
  await expect(dealBook.getByTestId('sold-none')).toHaveText('Nothing sold.');
  await expect(dealBook.getByRole('table', { name: 'Bottom line' }).getByRole('row')).toHaveText([/Sold\s*\$0/, /Bought\s*\$200/, /Military upkeep\s*\$100/, /Trade net\s*-\$300/]);
  // FR-256: the trade net and the consulate make the whole change of the treasury
  await expect(dealBook.getByRole('table', { name: 'Treasury' }).getByRole('row')).toHaveText([
    /Trade net\s*-\$300/,
    /Consulate in Arvelia\s*-\$500/,
    /Treasury change\s*-\$800/,
  ]);
  await expect(dealBook.getByTestId('treasury')).toContainText('From $10,000 to $9,200');
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m7-deal-book.png` });
  await page.keyboard.press('Escape');
  await expect(dealBook).toHaveCount(0);
  await expect(dealBookButton).toBeFocused();

  expect(errors).toEqual([]);
});

/** Where the dialog lies and what scrolls: the dialog's box, whether it or the page overflows, and the board pane's overflow. */
const fit = (page: Page) =>
  board(page).evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const doc = document.scrollingElement!;
    const pane = el.querySelector('table')?.parentElement ?? null;
    return {
      inside: r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
      dialogScrolls: el.scrollHeight > el.clientHeight + 1,
      pageScrolls: doc.scrollHeight > window.innerHeight + 1,
      boardScroll: pane ? getComputedStyle(pane).overflowY : 'none',
      // The column heads stay in view while the board scrolls
      headSticky: getComputedStyle(el.querySelector('th')!).position,
    };
  });

test('FR-194 FR-257 at 1280x720 the Board of Trade fits the window with the reasons beside the controls: neither the page nor the dialog scrolls, only the board', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);
  await openBoard(page);
  const fits = { inside: true, dialogScrolls: false, pageScrolls: false, boardScroll: 'auto', headSticky: 'sticky' };
  expect(await fit(page)).toEqual(fits);
  // On a new game all 17 rows show at once, each refused "+" with its reason beside it: the board does not even scroll
  const boardOverflow = () => board(page).evaluate((el) => { const pane = el.querySelector('table')!.parentElement!; return pane.scrollHeight - pane.clientHeight; });
  expect(await boardOverflow()).toBeLessThanOrEqual(1);
  await expect(row(page, 'oil')).toBeInViewport({ ratio: 1 });
  await expect(row(page, 'oil').getByTestId('bid-note')).toHaveText('No minor nation sells this');
  await expect(row(page, 'oil').getByTestId('offer-note')).toHaveText('No one buys this');
  await expect(row(page, 'oil').getByTestId('no-minor')).toHaveText('No minor trades this');
  // FR-251: our own stock is "In warehouse" (in capitals on the screen, by CSS)
  await expect(board(page).locator('thead th').nth(2)).toHaveText(/^In warehouse$/i);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m7-board-new-game.png` });
  await closeBoard(page);

  // Four bids, after a consulate with Arvelia, take every hold: each "+" open to trade is disabled and says why beside it
  // (FR-248, FR-257), wool still says no minor sells it (FR-252), and the frame still fits; the last row is reachable by
  // scrolling the board alone
  await consulateWithArvelia(page);
  await openBoard(page);
  for (const c of ['Coal', 'Timber', 'Iron Ore', 'Cotton']) {
    await board(page).getByRole('button', { name: `Bid one more ${c}` }).click();
  }
  const coal = board(page).getByRole('button', { name: 'Bid one more Coal' });
  await expect(coal).toBeDisabled();
  await expect(coal).toHaveAttribute('title', 'No free hold this turn');
  await expect(coal).toHaveAccessibleDescription('No free hold this turn');
  await expect(row(page, 'coal').getByTestId('bid-note')).toHaveText('No free hold this turn');
  await expect(row(page, 'wool').getByTestId('bid-note')).toHaveText('No minor nation sells this');
  await expect(board(page).getByTestId('market-holds')).toHaveText('Holds: 0 of 4 free');
  expect(await fit(page)).toEqual(fits);
  const oil = row(page, 'oil');
  await oil.scrollIntoViewIfNeeded();
  await expect(oil).toBeInViewport();
  expect(await fit(page)).toEqual(fits);
  expect(errors).toEqual([]);
});
