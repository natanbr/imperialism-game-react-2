import type { TestInfo } from '@playwright/test';
import { SAVE_KEY, saveOf, type SavedGame } from '../src/app/store/persistence';
import { createGameStore } from '../src/app/store/rootStore';
import { continueSavedGame, expect, startSeededGame, test, type Locator, type Page } from './seededGame';

async function expectFits(surface: Locator) {
  const overflow = await surface.evaluate(el => {
    const box = el.getBoundingClientRect();
    const panes = Array.from(el.querySelectorAll<HTMLElement>('*')).filter(child =>
      ['auto', 'scroll'].includes(getComputedStyle(child).overflowX) && child.scrollWidth > child.clientWidth);
    return { withinWindow: box.left >= 0 && box.right <= innerWidth, surface: el.scrollWidth - el.clientWidth,
      page: document.documentElement.scrollWidth - innerWidth, panes: panes.map(child => child.className) };
  });
  expect(overflow).toEqual({ withinWindow: true, surface: 0, page: 0, panes: [] });
}

async function capture(page: Page, info: TestInfo, name: string) {
  const path = process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}.png` : info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const size = `${viewport.width}x${viewport.height}`;
  test.describe(size, () => {
    test.use({ viewport });

    test('FR-607 FR-608 clear saved freight and buy world Fuel without horizontal scrolling', async ({ page }) => {
      const save = saveOf(createGameStore({ seed: 1, world: 'two-islands' }).getState());
      save.game.transportAllocationsByNation = { [save.activeNationId]: { oil: 0 } };
      await continueSavedGame(page, save);
      await page.getByRole('button', { name: /Transportation of Commodities/ }).click();
      const freight = page.getByRole('dialog', { name: 'Transportation of Commodities' });
      await expect(freight.getByRole('slider', { name: 'Oil' })).toHaveValue('0');
      await expectFits(freight);
      await freight.getByRole('button', { name: 'Auto Oil' }).press('Enter');
      await expect(freight.getByRole('slider', { name: 'Oil' })).toHaveCount(0);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: /Open Market/ }).click();
      const market = page.getByRole('dialog', { name: /World market/ });
      const fuel = market.getByTestId('trade-row-fuel');
      await expect(fuel).toContainText(/world market sells this/i);
      await expect(market.getByRole('button', { name: 'Buy one more Oil' })).toBeDisabled();
      await fuel.getByRole('button', { name: 'Buy one more Fuel' }).press('Enter');
      await expect(fuel.getByTestId('buy')).toHaveText('1');
      await expectFits(market);
    });

    test('FR-604–608 open credit, buy past cash, settle and Continue with the dated statement', async ({ page }, info) => {
      // A low-cash continent start. Wool is the first available stock for liquidation.
      await startSeededGame(page, game => {
        const nation = game.nations.find(n => n.controller === 'human')!;
        nation.treasury = 550;
        for (const key of Object.keys(nation.warehouse) as (keyof typeof nation.warehouse)[]) {
          nation.warehouse[key] = key === 'wool' ? 10 : 0;
        }
      });
      await page.getByRole('button', { name: /Open Warehouse/ }).click();
      const warehouse = page.getByRole('dialog', { name: /Warehouse/ });
      const wool = warehouse.getByTestId('stock-wool');
      await expect(wool).toContainText('10');
      await expect(wool).toContainText(/no known local source/i);
      // FR-563: “may offer” → “may sell” for a possible Great Power supplier.
      await expect(wool).toContainText(/another power may sell/i);
      await expectFits(warehouse);
      await page.keyboard.press('Escape');

      const bookButton = page.getByRole('button', { name: 'Deal Book', exact: true });
      const book = page.getByRole('dialog', { name: /Deal Book/ });
      await bookButton.press('Enter');
      await book.getByRole('button', { name: 'Open credit line' }).press('Enter');
      const account = book.getByRole('region', { name: 'Current credit line' });
      await expect(account).toContainText(/buying power\D*750/i);
      await page.keyboard.press('Escape');
      await expect(bookButton).toBeFocused();

      await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
      const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
      await diplomacy.getByRole('tab', { name: 'Arvelia', exact: true }).click();
      await diplomacy.getByRole('button', { name: 'Consulate ($500)' }).click();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /Open Market/ }).click();
      const board = page.getByRole('dialog', { name: 'Board of Trade' });
      await expect(board.getByTestId('trade-row-wool')).toContainText(/another power may sell/i);
      await expect(board.getByTestId('trade-row-fish')).toHaveCount(0);
      await expect(board.getByTestId('market-power')).toContainText('$250');
      const buy = board.getByRole('button', { name: 'Buy one more Coal', exact: true });
      await buy.press('Enter');
      await buy.press('Enter');
      await expect(board.getByTestId('market-cash')).toContainText('$50');
      await expect(board.getByTestId('market-committed')).toContainText('$200');
      await expect(board.getByTestId('market-power')).toContainText('$50');
      await expectFits(board);
      await page.keyboard.press('Escape');
      const cash = page.getByTestId('topbar-cash');
      await expect(cash).toContainText('-$150');
      await page.getByRole('button', { name: 'Advance Turn', exact: true }).click();
      await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2');
      await expect.poll(() => page.evaluate(key =>
        (JSON.parse(localStorage.getItem(key)!) as SavedGame).game.turn, SAVE_KEY)).toBe(2);
      const woolPrice = await page.evaluate(key =>
        (JSON.parse(localStorage.getItem(key)!) as SavedGame).game.market!.prices.wool, SAVE_KEY);
      const unitPrice = Math.floor(woolPrice / 2);
      const proceeds = 2 * unitPrice;
      // $550 - $500 consulate - $200 purchase - $100 upkeep - $15 interest + forced sales.
      const debt = 265 - proceeds;
      await expect(cash.locator('.nation-stats')).toContainText(`-$${debt}`);
      await expect(cash.getByTestId('cash-change')).toHaveText(`-$${550 + debt} last turn`);
      // FR-467 gives the phone action strip its own scroll. The credit flow and cash require no horizontal movement.
      await expectFits(page.getByTestId('topbar-status'));
      expect(await page.getByTestId('topbar-strip').evaluate(strip => strip.scrollLeft)).toBe(0);
      await expect(cash).toBeInViewport({ ratio: 1 });
      await capture(page, info, `top-bar-${size}`);

      await bookButton.click();
      await expect(book.getByTestId('deal-book-turn')).toHaveText('Turn 1, Spring 1815');
      await expect(book.getByRole('list', { name: 'Bought' })).toContainText('Bought 2 Coal from Arvelia @ $100');
      const treasury = book.getByRole('table', { name: 'Treasury', exact: true });
      await expect(treasury.getByRole('row', { name: /interest.*6% per turn/i })).toContainText('-$15');
      await expect(treasury.getByRole('row', { name: /forced sale/i }).getByRole('rowheader'))
        .toHaveText(`Forced sale of 2 Wool @ $${unitPrice}`);
      await expect(treasury.getByRole('row', { name: /forced sale/i }).getByRole('cell')).toHaveText(`$${proceeds}`);
      await expect(treasury.getByRole('row', { name: /closing debt/i })).toContainText(`$${debt}`);
      await expect(treasury.getByRole('row', { name: /credit limit/i })).toContainText('$200');
      await expectFits(book);
      const statement = await treasury.innerText();
      await treasury.scrollIntoViewIfNeeded();
      await capture(page, info, `deal-book-${size}`);

      await page.reload();
      await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
      await expect(cash.locator('.nation-stats')).toContainText(`-$${debt}`);
      await bookButton.click();
      await expect(treasury).toHaveText(statement, { useInnerText: true });
    });
  });
}
