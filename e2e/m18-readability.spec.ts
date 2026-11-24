// M18b readability in the running app, from the seed 1 save (e2e/seededGame.ts), at 1366x768 and at 390 px wide:
// FR-563 the Board of Trade says Buy and Sell; FR-568 the top bar has no score or Council line and Stats opens them;
// FR-569 a refused order (Expand Steel mill with no lumber or steel) is a toast over the page, not a line in the dialog.
// No sideways page scroll. Screenshots go to the test's output folder (testInfo.outputPath), or SCREENSHOT_DIR when set.
import type { TestInfo } from '@playwright/test';
import { expect, startSeededGame, test, type Page } from './seededGame';

const shotPath = (testInfo: TestInfo, name: string) => (process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name));

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

async function expectInsideWindow(page: Page, box: { x: number; y: number; width: number; height: number }) {
  const size = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height + 0.5);
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const at = `${viewport.width}x${viewport.height}`;
  test.describe(`M18b at ${at}`, () => {
    test.use({ viewport });

    test(`FR-563 at ${at} the Board of Trade says Buy and Sell, never Bid or Offer`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await startSeededGame(page);
      await page.getByRole('button', { name: 'Open Market' }).click();
      const board = page.getByRole('dialog', { name: /^Board of Trade/ });
      await expect(board).toBeVisible();
      await expect(board.getByRole('button', { name: 'Buy one more Coal' })).toBeAttached();
      await expect(board.getByRole('button', { name: 'Sell one more Clothing' })).toBeAttached();
      await expect(board.getByTestId('board-duration')).toHaveText('Buy and sell orders last one turn; production orders in the Capital stay.');
      const words = await board.evaluate((el) => {
        const names = [...el.querySelectorAll('[aria-label], [title]')].map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`);
        return [el.textContent ?? '', ...names].join(' ');
      });
      expect(words).not.toMatch(/\b(bid|bids|bidder|offer|offers|offered)\b/i);
      await expectNoSidewaysScroll(page);
      expect(errors).toEqual([]);
    });

    test(`FR-568 at ${at} the top bar shows no score or Council line; Stats shows the score, standing and votes`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await startSeededGame(page);
      const bar = page.getByTestId('topbar');
      await expect(bar.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
      await expect(bar.locator('.nation-stats')).toContainText('$');
      for (const id of ['hud-score', 'score-rank', 'next-council']) await expect(page.getByTestId(id), id).toHaveCount(0);
      await page.getByRole('button', { name: 'Stats', exact: true }).click();
      const stats = page.getByRole('dialog', { name: 'Stats' });
      await expect(stats.getByTestId('hud-score')).toHaveText(/^Score: \d+$/);
      await expect(stats.getByTestId('score-rank')).toHaveText(/^(1st|2nd) of 2$/);
      await expect(stats.getByTestId(/^score-row-/)).toHaveCount(2);
      await expect(stats.getByTestId('next-council')).toContainText('7 of 12 votes wins · Council: turn 10 (Summer 1817)');
      await expect(stats.getByTestId('council-projection')).toHaveText(/^If it met now: Testland \d+, Valdoria \d+, abstain \d+ of 12; 7 needed$/);
      await expectInsideWindow(page, (await stats.boundingBox())!);
      await expectNoSidewaysScroll(page);
      await page.screenshot({ path: shotPath(testInfo, `m18b-stats-${at}.png`) });
      await stats.getByRole('button', { name: 'Close stats' }).click();
      await expect(stats).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test(`FR-569 at ${at} a refused order is a toast over the page, not a line in the dialog; Close takes it away`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await startSeededGame(page, (game) => {
        const warehouse = game.nations.find((n) => n.id === 'nation-1')!.warehouse as unknown as Record<string, number>;
        warehouse.lumber = 0;
        warehouse.steel = 0;
      });
      await page.getByRole('button', { name: 'Open Capital' }).click();
      const capital = page.getByRole('dialog', { name: /Capital/ });
      await expect(capital).toBeVisible();
      const top = (await capital.boundingBox())!.y;
      await capital.getByRole('button', { name: 'Expand Steel mill' }).click();
      const toast = page.getByTestId('toast');
      await expect(toast).toHaveCount(1);
      await expect(toast.getByTestId('toast-text')).toHaveText(/refused: not enough goods in the warehouse\.$/);
      await expect(page.getByTestId('toast-alerts')).toHaveAttribute('aria-live', 'assertive');
      await expect(page.getByTestId('capital-refusal')).toHaveCount(0);
      // Over the page: fixed, inside the window, and the dialog did not move down
      expect(await page.getByTestId('toasts').evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
      await expectInsideWindow(page, (await toast.boundingBox())!);
      expect((await capital.boundingBox())!.y).toBe(top);
      await expectNoSidewaysScroll(page);
      await page.screenshot({ path: shotPath(testInfo, `m18b-toast-${at}.png`) });
      await toast.getByRole('button', { name: 'Close message' }).click();
      await expect(toast).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}
