import { test, expect, Page } from './seededGame';

// FR-197 (M7 done) in the running app, on a new game: order a consulate with Arvelia in Diplomacy, bid 2 coal on the
// Board of Trade, end the turn and see "Bought 2 Coal from Arvelia" in the Deal Book. On turn 1 both Great Powers have
// 30 points with Arvelia; since M12 (FR-401) the tie order comes from the game's seed, but the scripted Valdoria bids
// only for 2 timber on turn 1 (FR-245; seeds 1 to 12 checked), so both coal units are ours at $100 whatever the seed.
// On the way (FR-194): the coal's sellers in units (FR-251), the "no consulate" mark and the reason of the disabled "+"
// that the consulate ordered this turn lifts (FR-185, FR-252, FR-257), "Holds: 2 of 4 used" after the bid and no offer
// control on a row with a bid; the HUD's Deal Book button (FR-195) with the Trade net and the Treasury, where the
// consulate's $500 explains the rest of the cash change (FR-256).
// FR-194 at 1280x720 (the M6 QA lesson, FR-237): the Board of Trade fits the window; neither the page nor the dialog
// scrolls, only the open tab under the header.
// Re-targeted by M18c (FR-573 to FR-577): the sellers in units, the favourites and the lines beside an open "+" are on the
// Details tab; the Board tab shows the minors as flags, a refused "+" says why in its tooltip and accessible name (it was a
// note beside it and its description); "Cash" is the treasury before this turn's purchases, "Buying power" what is left.
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
/** FR-577: opens a tab of the Board of Trade. */
const openTab = (page: Page, name: 'Board' | 'Details' | 'Trade policies') => board(page).getByRole('tab', { name, exact: true }).click();
/** FR-575: a commodity's row on the Details tab. */
const detailRow = (page: Page, commodity: string) => board(page).getByTestId(`detail-row-${commodity}`);
/** FR-575: the sellers in words with their units, on the Details tab (open it first). */
const sellers = (page: Page, commodity: string) => detailRow(page, commodity).getByRole('list', { name: 'Sellers' }).getByRole('listitem');

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
  // FR-574: on the Board tab Arvelia is a dimmed flag named with its mark
  await expect(row(page, 'coal').getByRole('img', { name: 'Arvelia (no consulate)', exact: true })).toHaveAttribute('title', 'Arvelia (no consulate)');
  const coalPlus = row(page, 'coal').getByRole('button', { name: 'Buy one more Coal', exact: true });
  // toBeDisabled reads aria-disabled too: since the M18c review round the refused "+" is aria-disabled, not disabled
  await expect(coalPlus).toBeDisabled();
  await expect(coalPlus).not.toHaveAttribute('disabled');
  // Old: the note beside the "+" and its accessible description; M18c FR-574: its tooltip and the end of its name; the
  // M18c review round: its tooltip and its accessible description, the name plain
  await expect(coalPlus).toHaveAttribute('title', 'We need a consulate with a seller');
  await expect(coalPlus).toHaveAccessibleName('Buy one more Coal');
  await expect(coalPlus).toHaveAccessibleDescription('We need a consulate with a seller');
  // Old: not in textContent; the reason is in the row now, hidden until the "+" has focus, so not drawn (innerText)
  await expect(row(page, 'coal')).not.toContainText('We need a consulate', { useInnerText: true });
  // The keyboard reaches it, and its reason shows beside it; a press sends nothing (no toast, the bid stays 0)
  await coalPlus.focus();
  await expect(row(page, 'coal').getByTestId('bid-reason')).toBeVisible();
  await expect(row(page, 'coal').getByTestId('bid-reason')).toHaveText('We need a consulate with a seller');
  await page.keyboard.press('Enter');
  await expect(row(page, 'coal').getByTestId('bid')).toHaveText('0');
  await expect(page.getByTestId('toast')).toHaveCount(0);
  // Re-recorded by M18c FR-573: old "Holds: 4 of 4 free"
  await expect(board(page).getByTestId('market-holds')).toHaveText('Holds: 0 of 4 used (1 Indiaman)');
  await openTab(page, 'Details');
  await expect(sellers(page, 'coal').first()).toHaveText('Arvelia: 3 units (no consulate)');
  // M12 FR-401: whom each minor favours at equal points depends on the game's seed (until M12: all Testland on turn 1)
  await expect(board(page).getByTestId('board-favourites')).toHaveText(/^(Arvelia|Sundmark|Lorran|Pellis)\b.* favours? (Testland|Valdoria)\.$/);
  await closeBoard(page);

  await consulateWithArvelia(page);

  // Back on the board: the consulate ordered this turn counts, so the mark and the reason are gone; bid 2 coal. The
  // dialog opens on the Board tab again (FR-577)
  await openBoard(page);
  await expect(board(page).getByRole('tab', { name: 'Board', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(row(page, 'coal').getByRole('img', { name: 'Arvelia', exact: true })).toBeVisible();
  await expect(coalPlus).toBeEnabled();
  await expect(coalPlus).toHaveAccessibleName('Buy one more Coal');
  await openTab(page, 'Details');
  await expect(sellers(page, 'coal').first()).toHaveText('Arvelia: 3 units');
  // M12 FR-401: on a seed where Arvelia favours Valdoria at equal points the bid says so (FR-252); no other note
  await expect(detailRow(page, 'coal').getByTestId('bid-note').filter({ hasNotText: 'Arvelia favours Valdoria' })).toHaveCount(0);
  await openTab(page, 'Board');
  await coalPlus.click();
  await coalPlus.click();
  await expect(row(page, 'coal').getByTestId('bid')).toHaveText('2');
  await expect(row(page, 'coal').getByRole('button', { name: /^Sell one/ })).toHaveCount(0);
  // Re-recorded by M18c FR-573: old "Holds: 2 of 4 free", "Buying: 1 of 4" and "Cash: $<start − 700>"; that last figure,
  // the treasury once the consulate and the coal are paid, is "Buying power" now, Cash the treasury before the coal
  await expect(board(page).getByTestId('market-holds')).toHaveText('Holds: 2 of 4 used (1 Indiaman)');
  await expect(board(page).getByTestId('market-bids')).toHaveText('Buying 1 of 4 commodities');
  await expect(board(page).getByTestId('market-power')).toHaveText(`Buying power: $${(start - 700).toLocaleString('en-US')}`);
  await expect(board(page).getByTestId('market-committed')).toHaveText('Committed: $200');
  // M18c review round: "Cash" -> "Cash before purchases", apart from the top bar's cash
  await expect(board(page).getByTestId('market-cash')).toHaveText(`Cash before purchases: $${(start - 500).toLocaleString('en-US')}`);
  await expect(page.getByTestId('toast')).toHaveCount(0);
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
  // M12 FR-396: the bottom line is the trade only; the army upkeep is its own Treasury line
  await expect(dealBook.getByRole('table', { name: 'Bottom line' }).getByRole('row')).toHaveText([/Sold\s*\$0/, /Bought\s*\$200/, /Trade net\s*-\$200/]);
  // FR-256: the trade net, the upkeep and the consulate make the whole change of the treasury
  await expect(dealBook.getByRole('table', { name: 'Treasury' }).getByRole('row')).toHaveText([
    /Trade net\s*-\$200/,
    /Army upkeep\s*-\$100/,
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

test('FR-194 FR-257 FR-574 at 1280x720 the Board of Trade fits the window on every tab: neither the page nor the dialog scrolls, only the open tab', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);
  await openBoard(page);
  const fits = { inside: true, dialogScrolls: false, pageScrolls: false, boardScroll: 'auto', headSticky: 'sticky' };
  expect(await fit(page)).toEqual(fits);
  // On a new game all 17 rows show at once: the board does not even scroll
  const boardOverflow = () => board(page).evaluate((el) => { const pane = el.querySelector('table')!.parentElement!; return pane.scrollHeight - pane.clientHeight; });
  expect(await boardOverflow()).toBeLessThanOrEqual(1);
  await expect(row(page, 'oil')).toBeInViewport({ ratio: 1 });
  // Re-recorded by M13 FR-494: old 'No minor nation sells this' (a refusal), new 'A purchase is refunded if Valdoria does not
  // sell.' beside an enabled "+" (a bid where no minor sells goes to Valdoria, FR-492). Re-targeted by M18c: that line is
  // on the Details tab (FR-575); the refused Sell "+" says 'No one buys this' in its tooltip (FR-574), once Sell is chosen
  await expect(row(page, 'oil').getByRole('button', { name: 'Buy one more Oil', exact: true })).toBeEnabled();
  // M18c review round: Buy and Sell are radios (were toggle buttons)
  await row(page, 'oil').getByRole('radio', { name: 'Sell Oil', exact: true }).click();
  await expect(row(page, 'oil').getByRole('button', { name: 'Sell one more Oil' })).toHaveAttribute('title', 'No one buys this');
  await expect(row(page, 'oil').getByRole('img', { name: 'No minor trades this' })).toBeVisible();
  // FR-251: our own stock, now "Available" (FR-574; in capitals on the screen, by CSS)
  await expect(board(page).locator('thead th').nth(2)).toHaveText(/^Available$/i);
  await openTab(page, 'Details');
  await expect(detailRow(page, 'oil').getByTestId('bid-note')).toHaveText('Money back if Valdoria does not sell.');
  await expect(detailRow(page, 'oil').getByTestId('no-minor')).toHaveText('No minor trades this');
  expect(await fit(page)).toEqual(fits);
  await openTab(page, 'Trade policies');
  expect(await fit(page)).toEqual(fits);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m7-board-new-game.png` });
  await closeBoard(page);

  // Four bids, after a consulate with Arvelia, take every hold: each "+" open to trade is disabled and says why in its
  // tooltip and name (FR-248, FR-257, FR-574), wool too (re-recorded by M13 FR-494: old 'No minor nation sells this', new 'No free hold this turn';
  // wool may be bid toward Valdoria, FR-492, so only the holds refuse it), and the frame still fits; the last row is
  // reachable by scrolling the board alone
  await consulateWithArvelia(page);
  await openBoard(page);
  for (const c of ['Coal', 'Timber', 'Iron Ore', 'Cotton']) {
    await board(page).getByRole('button', { name: `Buy one more ${c}` }).click();
  }
  const coal = board(page).getByRole('button', { name: 'Buy one more Coal', exact: true });
  await expect(coal).toBeDisabled();
  await expect(coal).toHaveAttribute('title', 'No free hold this turn');
  // Old: its accessible description and a note beside it (bid-note); M18c: the end of its name; the M18c review round:
  // its accessible description again, the name plain, and no note until it has focus
  await expect(coal).toHaveAccessibleName('Buy one more Coal');
  await expect(coal).toHaveAccessibleDescription('No free hold this turn');
  await expect(row(page, 'wool').getByRole('button', { name: 'Buy one more Wool' })).toHaveAttribute('title', 'No free hold this turn');
  // Re-recorded by M18c FR-573: old "Holds: 0 of 4 free"
  await expect(board(page).getByTestId('market-holds')).toHaveText('Holds: 4 of 4 used (1 Indiaman)');
  expect(await fit(page)).toEqual(fits);
  const oil = row(page, 'oil');
  await oil.scrollIntoViewIfNeeded();
  await expect(oil).toBeInViewport();
  expect(await fit(page)).toEqual(fits);
  expect(errors).toEqual([]);
});
