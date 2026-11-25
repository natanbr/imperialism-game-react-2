import type { TestInfo } from '@playwright/test';
import { SAVE_KEY, type SavedGame } from '../src/app/store/persistence';
import { expect, startSeededGame, test, type Locator, type Page } from './seededGame';

async function expectFits(surface: Locator) {
  expect(await surface.evaluate(el => {
    const box = el.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth
      && document.documentElement.scrollWidth <= innerWidth;
  })).toBe(true);
}

async function capture(page: Page, info: TestInfo, name: string) {
  const path = process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}.png` : info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const size = `${viewport.width}x${viewport.height}`;
  test.describe(size, () => {
    test.use({ viewport });

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
      await expect(wool).toContainText(/another power may offer/i);
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
      await expect(board.getByTestId('trade-row-wool')).toContainText(/another power may offer/i);
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
      await expectFits(page.getByTestId('topbar'));
      await capture(page, info, `top-bar-${size}`);

      await bookButton.click();
      await expect(book.getByTestId('deal-book-turn')).toHaveText('Turn 1, Spring 1815');
      await expect(book.getByRole('list', { name: 'Bought' })).toContainText('Bought 2 Coal from Arvelia @ $100');
      const treasury = book.getByRole('table', { name: 'Treasury', exact: true });
      await expect(treasury.getByRole('row', { name: /interest.*6% per turn/i })).toContainText('-$15');
      await expect(treasury.getByRole('row', { name: /forced sale/i })).toContainText(`$${proceeds}`);
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
