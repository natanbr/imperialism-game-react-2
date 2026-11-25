import type { TestInfo } from '@playwright/test';
import { pairKey } from '../src/app/engine';
import { createGameStore } from '../src/app/store/rootStore';
import { SAVE_KEY, saveOf, type SavedGame } from '../src/app/store/persistence';
import { expect, startSeededGame, test, type Locator, type Page } from './seededGame';

const viewports = [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 390, height: 844 }];

async function capture(page: Page, info: TestInfo, name: string) {
  const { width, height } = page.viewportSize()!;
  const file = `m18g-${name}-${width}x${height}.png`;
  await page.screenshot({ path: process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${file}` : info.outputPath(file) });
}

async function expectPaneFits(panel: Locator) {
  const fit = await panel.evaluate(el => {
    const dialog = el.closest<HTMLElement>('[role="dialog"]')!;
    const rect = dialog.getBoundingClientRect();
    const page = document.documentElement;
    return {
      inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      overflow: Math.max(dialog.scrollHeight - dialog.clientHeight, dialog.scrollWidth - dialog.clientWidth,
        el.scrollWidth - el.clientWidth, page.scrollWidth - innerWidth, page.scrollHeight - innerHeight),
    };
  });
  expect(fit.inside).toBe(true);
  expect(fit.overflow).toBeLessThanOrEqual(1);
}

async function snapshot(page: Page): Promise<SavedGame> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
}

for (const viewport of viewports) {
  test.describe(`M18g at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('FR-612 FR-613 NR-040 bid, read both dated markets and inspect the garrison across settlement', async ({ page }, info) => {
      await startSeededGame(page, game => { game.diplomacy[pairKey('nation-1', 'minor-1')].consulates.push('nation-1'); });
      const market = page.getByRole('button', { name: 'Open Market' });
      await market.click();
      const board = page.getByRole('dialog', { name: /^Board of Trade/ });
      await board.getByRole('button', { name: 'Buy one more Coal', exact: true }).click();
      await expect.poll(async () => (await snapshot(page)).ordersThisTurn.length).toBe(1);
      const before = await snapshot(page);
      const control = createGameStore({ seed: 1 });
      control.getState().restoreGame(before);
      control.getState().advanceTurn();

      await board.getByRole('tab', { name: 'Trade Book' }).click();
      const book = board.getByRole('tabpanel', { name: 'Trade Book' });
      const current = book.getByRole('region', { name: /Current turn 1\b/i });
      await expect(current.getByRole('combobox', { name: 'Commodity' }).locator('option:checked')).toHaveText('Coal');
      await expect(current).toContainText('Arvelia');
      await expect(current).toContainText('Seller preference');
      await expectPaneFits(book);
      await capture(page, info, 'trade-book-current');
      await page.keyboard.press('Escape');
      await expect(market).toBeFocused();

      const stats = page.getByRole('button', { name: 'Stats', exact: true });
      await stats.click();
      const dialog = page.getByRole('dialog', { name: 'Stats' });
      await dialog.getByRole('tab', { name: 'Overview' }).press('End');
      await expect(dialog.getByRole('tab', { name: 'Garrison Book' })).toBeFocused();
      const garrison = dialog.getByRole('tabpanel', { name: 'Garrison Book' });
      await garrison.getByRole('combobox', { name: 'Province' }).selectOption({ label: 'Testland South-West' });
      await expect(garrison.getByRole('row', { name: /9th Minutemen/ })).toContainText('Defending');
      await expectPaneFits(garrison);
      await capture(page, info, 'garrison-book');
      await page.keyboard.press('Escape');
      await expect(stats).toBeFocused();
      expect(await snapshot(page)).toEqual(before);

      await page.getByRole('button', { name: /Advance Turn/ }).click();
      await expect.poll(async () => (await snapshot(page)).game.turn).toBe(2);
      const after = await snapshot(page);
      expect(after).toEqual(JSON.parse(JSON.stringify(saveOf(control.getState(), new Date(after.savedAt)))));
      await market.click();
      const repeat = board.getByRole('button', { name: "Repeat last turn's trades" });
      await expect(repeat).toBeVisible();
      await board.getByRole('tab', { name: 'Trade Book' }).click();
      await expect(repeat).toHaveCount(0);
      const previous = book.getByRole('region', { name: /Settled turn 1\b/i });
      await expect(previous.getByRole('combobox', { name: 'Commodity' }).locator('option:checked')).toHaveText('Coal');
      await expect(previous).toContainText(/Bought.*Coal.*Arvelia/i);
      await expectPaneFits(book);
      await capture(page, info, 'trade-book-settled');
      await board.getByRole('tab', { name: 'Trade policies' }).click();
      const mode = board.getByRole('combobox', { name: 'Map mode' });
      await expect(repeat).toBeVisible();
      for (const label of ['Relationships', 'Political status']) {
        await mode.selectOption({ label });
        await expect(repeat).toHaveCount(0);
      }
      await mode.selectOption({ label: 'Trade policies' });
      await expect(repeat).toBeVisible();
    });

    test('FR-614 FR-615 NR-040 read both diplomatic maps and lists, then issue an existing policy order', async ({ page }, info) => {
      await startSeededGame(page, game => {
        const pair = game.diplomacy[pairKey('nation-1', 'minor-1')];
        pair.consulates.push('nation-1');
        pair.points = 74;
        pair.pact = true;
      });
      const before = await snapshot(page);
      const market = page.getByRole('button', { name: 'Open Market' });
      await market.click();
      const board = page.getByRole('dialog', { name: /^Board of Trade/ });
      await board.getByRole('tab', { name: 'Trade policies' }).click();
      const panel = board.getByRole('tabpanel', { name: 'Trade policies' });
      const mode = panel.getByRole('combobox', { name: 'Map mode' });
      for (const [name, key] of [['Relationships', 'Enter'], ['Political status', 'Space']] as const) {
        await mode.selectOption({ label: name });
        const map = panel.getByRole('group', { name: `${name} map` });
        const arvelia = map.getByRole('button', { name: /^Arvelia\b/ });
        await map.getByRole('button', { name: /^Sundmark\b/ }).click();
        await arvelia.focus();
        await arvelia.press(key);
        await expect(arvelia).toBeFocused();
        await expect(arvelia).toHaveAttribute('aria-pressed', 'true');
        const detail = panel.getByRole('region', { name: 'Selected country' });
        await expect(detail).toContainText('Arvelia');
        if (name === 'Political status') await expect(detail).toContainText(/consulate/i);
        const facts = await detail.innerText();
        await expect(panel.getByRole('checkbox', { name: 'Boycott' })).toHaveCount(0);
        await expectPaneFits(panel);
        const file = name.toLowerCase().replace(' ', '-');
        await capture(page, info, file);
        await panel.getByRole('button', { name: 'List', exact: true }).click();
        const country = panel.getByRole('button', { name: 'Arvelia', exact: true });
        await country.press('Enter');
        await expect(detail).toHaveText(facts);
        await expectPaneFits(panel);
        await capture(page, info, `${file}-list`);
        await panel.getByRole('button', { name: 'Map', exact: true }).click();
      }
      expect((await snapshot(page)).ordersThisTurn).toEqual(before.ordersThisTurn);
      await mode.selectOption({ label: 'Trade policies' });
      const arvelia = panel.getByRole('button', { name: /^Arvelia,/ });
      await arvelia.press('Space');
      await panel.getByRole('group', { name: 'Subsidy toward Arvelia' }).getByRole('button', { name: '25%', exact: true }).click();
      await expect(arvelia).toHaveAccessibleName('Arvelia, subsidy 25%');
      await page.keyboard.press('Escape');
      await expect(market).toBeFocused();
    });
  });
}
