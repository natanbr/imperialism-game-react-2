import { test, expect, Page } from './seededGame';

// M13 FR-494 in the running app (card Q118 (a)): the Great Powers' bids and offers of last turn are public (FR-491). A
// saved game, crafted in the slot `imperialism-remake.save`, where Valdoria bid for 2 steel last turn (`market.lastOrders`)
// and Testland holds 3 steel: the Board's steel row says "Valdoria wanted to buy 2 last turn" and its Offer "+" is enabled
// ("Only Valdoria may buy this", FR-492); offer 1 steel, End Turn, and the Deal Book shows the sale to Valdoria.
// Valdoria's own warehouse is set to 20 lumber and no steel, so the scripted Valdoria bids for 2 steel this turn as well
// (FR-493 (a): the side that pairs its lumber first). On the way, a new game's steel Bid "+" is open with FR-494's line,
// "Money back if Valdoria does not sell."
// Re-targeted by M18c (FR-574, FR-575): the last-turn line and the lines beside an open "+" are on the Details tab; the
// steel row opens on Sell once a sale is open (FR-574's default side).
// Run alone: PORT=3197 PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/m13-trade.spec.ts

test.use({ viewport: { width: 1280, height: 720 } });

const SAVE_KEY = 'imperialism-remake.save';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function ready(page: Page) {
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
}

/** The turn of the game in the slot, or null for an empty slot. */
const savedTurn = (page: Page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw).game?.turn ?? 'unreadable');
  }, SAVE_KEY);

const board = (page: Page) => page.getByRole('dialog', { name: 'Board of Trade' });
const steelRow = (page: Page) => board(page).getByTestId('trade-row-steel');
/** FR-575: the steel row of the Details tab (open it first). */
const steelDetails = (page: Page) => board(page).getByTestId('detail-row-steel');
const openTab = (page: Page, name: 'Board' | 'Details') => board(page).getByRole('tab', { name, exact: true }).click();

async function openBoard(page: Page) {
  await page.getByRole('button', { name: /Open Market/ }).click();
  await expect(board(page)).toBeVisible();
}

async function closeBoard(page: Page) {
  await board(page).getByRole('button', { name: 'Close Board of Trade' }).click();
  await expect(board(page)).toHaveCount(0);
}

test('FR-494 FR-491 FR-492 a saved game where Valdoria bid for 2 steel last turn: offer 1 steel, End Turn, and the Deal Book shows the sale to Valdoria', async ({ page }) => {
  test.setTimeout(120000);
  const errors = collectErrors(page);
  await page.goto('/');
  await ready(page);
  await expect.poll(() => savedTurn(page)).toBe(1);

  // A new game: no line from last turn; the steel bid goes toward Valdoria and says so (FR-494)
  await openBoard(page);
  const bidPlus = steelRow(page).getByRole('button', { name: 'Buy one more Steel' });
  await expect(bidPlus).toBeEnabled();
  // Old: the line was beside the "+" and its accessible description; M18c FR-575: on the Details tab, the "+" plain
  await expect(bidPlus).toHaveAccessibleName('Buy one more Steel');
  await openTab(page, 'Details');
  await expect(steelDetails(page).getByTestId('rival-last-turn')).toHaveCount(0);
  // FR-494's line without its first clause (in full it broke FR-257's fit at 1280x720 by 109 px; boardView.ts)
  const rivalBid = 'Money back if Valdoria does not sell.';
  await expect(steelDetails(page).getByTestId('bid-note')).toHaveText(rivalBid);
  await closeBoard(page);

  // The crafted save: the slot's game with Valdoria's bid of last turn, our steel and Valdoria's lumber
  await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.game.market.lastOrders = { 'nation-2': { sell: {}, buy: { steel: 2 } } };
    for (const nation of save.game.nations) {
      if (nation.id === 'nation-1') nation.warehouse.steel = 3;
      if (nation.id === 'nation-2') nation.warehouse = { ...nation.warehouse, lumber: 20, steel: 0 };
    }
    localStorage.setItem(key, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload();
  const savedGame = page.getByRole('dialog', { name: 'Saved game' });
  await expect(savedGame).toBeVisible({ timeout: 15000 });
  await savedGame.getByRole('button', { name: 'Continue' }).click();
  await expect(savedGame).toHaveCount(0);
  await ready(page);

  await openBoard(page);
  await expect(steelRow(page).getByTestId('available')).toHaveText('3');
  // FR-574: the row opens on Sell, the sale being open (M18c review round: a radio, aria-checked; was aria-pressed)
  await expect(steelRow(page).getByRole('radio', { name: 'Sell Steel', exact: true })).toHaveAttribute('aria-checked', 'true');
  const offerPlus = steelRow(page).getByRole('button', { name: 'Sell one more Steel' });
  await expect(offerPlus).toBeEnabled();
  await openTab(page, 'Details');
  await expect(steelDetails(page).getByTestId('rival-last-turn')).toHaveText('Valdoria wanted to buy 2 last turn');
  await expect(steelDetails(page).getByTestId('offer-note')).toHaveText('Only Valdoria may buy this');
  await openTab(page, 'Board');
  await offerPlus.click();
  await expect(steelRow(page).getByTestId('offer')).toHaveText('1');
  await expect(steelRow(page).getByTestId('available')).toHaveText('2');
  await expect(page.getByTestId('toast')).toHaveCount(0);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m13-board-steel.png` });
  await closeBoard(page);

  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  await expect(page.getByTestId('news-panel')).toContainText(/Sold 1 Steel to Valdoria for \$[\d,]+\./);

  await page.getByRole('button', { name: 'Deal Book', exact: true }).click();
  const dealBook = page.getByRole('dialog', { name: 'Deal Book' });
  await expect(dealBook).toBeVisible();
  await expect(dealBook.getByRole('list', { name: 'Sold' }).getByRole('listitem')).toHaveText([/^Sold 1 Steel to Valdoria @ \$[\d,]+$/]);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m13-deal-book.png` });
  await page.keyboard.press('Escape');

  // Valdoria's bid of this turn is public on the next: the Board's steel row names it
  await openBoard(page);
  await openTab(page, 'Details');
  await expect(steelDetails(page).getByTestId('rival-last-turn')).toHaveText(/^Valdoria wanted to buy \d+ last turn$/);
  expect(errors).toEqual([]);
});

// M13 FR-495 in the running app: a saved game, crafted in the slot, where Valdoria's army of 52 (3 Cuirassiers and
// Regulars at 70 health) stands in Arvelia, which borders Testland North-East (defence 25). The alerts hold the line
// "Valdoria's army at our border: Testland North-East (52 against our 25)", and the one Advance Turn stays whole inside
// the window and the top bar with nothing scrolled (FR-466, FR-467), at 1280x720, 800x600 and 390x844, also with the line
// scrolled into view in the pane. Set SCREENSHOT_DIR to also save m13-border-<width>x<height>.png there.
type Box = { x: number; y: number; width: number; height: number };
const inside = (box: Box, outer: Box, slack = 0.5) =>
  box.x >= outer.x - slack && box.y >= outer.y - slack && box.x + box.width <= outer.x + outer.width + slack && box.y + box.height <= outer.y + outer.height + slack;

for (const viewport of [{ width: 1280, height: 720 }, { width: 800, height: 600 }, { width: 390, height: 844 }]) {
  test(`FR-495 at ${viewport.width}x${viewport.height} the border line is in the alerts and Advance Turn stays inside the window`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    const errors = collectErrors(page);
    await page.goto('/');
    await ready(page);
    await expect.poll(() => savedTurn(page)).toBe(1);
    await page.evaluate((key) => {
      const save = JSON.parse(localStorage.getItem(key)!);
      const regiment = (n: number, type: string, health: number) => ({ id: `regiment-${n}`, type, name: `Test ${type} ${n}`, health });
      save.game.armies.push({
        id: 'army-nation-2-province-minor-1',
        ownerId: 'nation-2',
        provinceId: 'province-minor-1',
        regiments: [regiment(901, 'cuirassiers', 100), regiment(902, 'cuirassiers', 100), regiment(903, 'cuirassiers', 100), regiment(904, 'regulars', 70)],
      });
      localStorage.setItem(key, JSON.stringify(save));
    }, SAVE_KEY);
    await page.reload();
    const savedGame = page.getByRole('dialog', { name: 'Saved game' });
    await expect(savedGame).toBeVisible({ timeout: 15000 });
    await savedGame.getByRole('button', { name: 'Continue' }).click();
    await expect(savedGame).toHaveCount(0);
    await ready(page);

    const line = page.getByTestId('hud-alerts').getByTestId('border-threat');
    await expect(line).toHaveText("Valdoria's army at our border: Testland North-East (52 against our 25)");
    const advance = page.getByRole('button', { name: 'Advance Turn' });
    const advanceInSight = async (when: string) => {
      await expect(advance, when).toHaveCount(1);
      const box = (await advance.boundingBox())!;
      expect(inside(box, { x: 0, y: 0, ...viewport }), `${when}: Advance Turn ${JSON.stringify(box)} inside the window`).toBe(true);
      expect(inside(box, (await page.getByTestId('topbar').boundingBox())!), `${when}: inside the top bar`).toBe(true);
      const page_ = await page.evaluate(() => ({ x: document.scrollingElement!.scrollLeft, y: document.scrollingElement!.scrollTop }));
      expect(page_, `${when}: the page is not scrolled`).toEqual({ x: 0, y: 0 });
    };
    await advanceInSight('with the line');
    await line.scrollIntoViewIfNeeded();
    await expect(line).toBeInViewport();
    await advanceInSight('with the line scrolled into view');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m13-border-${viewport.width}x${viewport.height}.png` });
    expect(errors).toEqual([]);
  });
}
