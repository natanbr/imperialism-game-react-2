import type { TestInfo } from '@playwright/test';
import { SAVE_KEY } from '../src/app/store/persistence';
import { expect, startSeededGame, test, type Locator, type Page } from './seededGame';

const viewports = [{ width: 1280, height: 720 }, { width: 390, height: 844 }];
const REFUSAL = 'We cannot scout this province without a nearby ship or neighboring armies.';

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);

/** Select a tile with the map's arrow keys and Enter (FR-241), as at any width. */
async function inspectByKeyboard(page: Page, targetId: string) {
  const entry = page.locator('[data-tile-id][tabindex="0"]');
  const from = (await entry.getAttribute('data-tile-id'))!.split('-').map(Number);
  const [x, y] = targetId.split('-').map(Number);
  await entry.focus();
  for (let i = 0; i < Math.abs(x - from[0]); i++) await page.keyboard.press(x < from[0] ? 'ArrowLeft' : 'ArrowRight');
  for (let i = 0; i < Math.abs(y - from[1]); i++) await page.keyboard.press(y < from[1] ? 'ArrowUp' : 'ArrowDown');
  await expect(tile(page, targetId)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(tile(page, targetId)).toHaveAttribute('data-selected', 'true');
}

async function capture(page: Page, info: TestInfo, name: string) {
  const { width, height } = page.viewportSize()!;
  const file = `m18l-${name}-${width}x${height}.png`;
  await page.screenshot({ path: process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${file}` : info.outputPath(file) });
}

async function expectInsideViewport(dialog: Locator) {
  const fit = await dialog.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const page = document.documentElement;
    return {
      inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      overflow: Math.max(el.scrollWidth - el.clientWidth, page.scrollWidth - innerWidth),
    };
  });
  expect(fit.inside).toBe(true);
  expect(fit.overflow).toBeLessThanOrEqual(1);
}

const rawSlot = (page: Page) => page.evaluate(key => localStorage.getItem(key), SAVE_KEY);

for (const viewport of viewports) {
  test.describe(`M18l at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('FR-650 scout Arvelia from our garrison, read the report and close it; a far province says why it cannot be scouted', async ({ page }, info) => {
      await startSeededGame(page);
      await inspectByKeyboard(page, '10-3');
      const panel = page.getByTestId('tile-info');
      await expect(panel.getByTestId('tile-owner')).toHaveText('Owner: Arvelia (minor nation)');
      const scout = panel.getByRole('button', { name: 'Scouting report' });
      await scout.scrollIntoViewIfNeeded();
      await expect(scout).toBeEnabled();
      const before = await rawSlot(page);

      await scout.click();
      const dialog = page.getByRole('dialog', { name: 'Report on the army forces of Arvelia in the province of Arvelia' });
      await expect(dialog.getByRole('list', { name: 'Army forces seen' }).getByRole('listitem')).toHaveText(['3 Minutemen']);
      await expect(dialog).toContainText('Estimated by our garrison in Testland North-East');
      const ok = dialog.getByRole('button', { name: 'OK' });
      await expect(ok).toBeFocused();
      await expectInsideViewport(dialog);
      await capture(page, info, 'scouting-report');
      await page.keyboard.press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(scout).toBeFocused();
      // NR-041: reading the report changes no saved game field and queues no Order
      expect(await rawSlot(page)).toBe(before);

      await inspectByKeyboard(page, '14-9');
      await expect(panel.getByTestId('tile-owner')).toHaveText('Owner: Valdoria');
      const far = panel.getByRole('button', { name: 'Scouting report' });
      await far.scrollIntoViewIfNeeded();
      await expect(far).toBeDisabled();
      await expect(far).toHaveAccessibleDescription(REFUSAL);
      await expect(panel).toContainText(REFUSAL);
      const width = await panel.evaluate(el => ({ content: el.scrollWidth, visible: el.clientWidth }));
      expect(width.content).toBeLessThanOrEqual(width.visible + 1);
      await capture(page, info, 'scouting-unavailable');
      expect(await rawSlot(page)).toBe(before);
    });
  });
}
