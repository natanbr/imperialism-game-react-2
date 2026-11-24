// FR-564 (M18b) in the running app, from the seed 1 save (e2e/seededGame.ts), at 1366x768 and at 390 px wide: Diplomacy
// and the Board of Trade show each nation's flag mark beside its name, in the nation's one colour, with its pattern.
// No sideways page scroll. Screenshots go to the test's output folder (testInfo.outputPath), or SCREENSHOT_DIR when set.
import type { TestInfo } from '@playwright/test';
import { expect, startSeededGame, test, type Locator, type Page } from './seededGame';

const shotPath = (testInfo: TestInfo, name: string) => (process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name));

/** Each nation's colour as the browser computes it (styles/tokens.css) and its flag pattern (components/nationMark.ts). */
const MARKS: Record<string, { colour: string; pattern: string }> = {
  'nation-1': { colour: 'rgb(158, 42, 91)', pattern: 'solid' },
  'nation-2': { colour: 'rgb(44, 92, 158)', pattern: 'cross' },
  'minor-1': { colour: 'rgb(46, 90, 46)', pattern: 'canton' },
  'minor-2': { colour: 'rgb(122, 75, 20)', pattern: 'stripes' },
  'minor-3': { colour: 'rgb(107, 45, 107)', pattern: 'diagonal' },
  'minor-4': { colour: 'rgb(38, 54, 44)', pattern: 'triangle' },
};

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/** The flag in `where`: visible, its nation's colour on the cloth, its pattern. */
async function expectFlag(where: Locator, id: string) {
  const flag = where.getByTestId('nation-flag');
  await expect(flag).toHaveCount(1);
  await expect(flag).toBeVisible();
  await expect(flag).toHaveAttribute('data-nation-id', id);
  await expect(flag).toHaveAttribute('data-pattern', MARKS[id].pattern);
  await expect(flag).toHaveAttribute('aria-hidden', 'true');
  const cloth = await flag.locator('[data-part="cloth"]').evaluate((el) => getComputedStyle(el).fill);
  expect(cloth, id).toBe(MARKS[id].colour);
  const box = (await flag.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(8);
  expect(box.height).toBeGreaterThanOrEqual(10);
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const at = `${viewport.width}x${viewport.height}`;
  test.describe(`M18b colours at ${at}`, () => {
    test.use({ viewport });

    test(`FR-564 at ${at} Diplomacy and the Board of Trade show each nation's flag in its colour`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await startSeededGame(page);

      await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
      const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
      await expect(diplomacy).toBeVisible();
      for (const id of ['nation-2', 'minor-1', 'minor-2', 'minor-3', 'minor-4']) await expectFlag(diplomacy.getByTestId(`country-tab-${id}`), id);
      await expectNoSidewaysScroll(page);
      await page.screenshot({ path: shotPath(testInfo, `fr564-diplomacy-${at}.png`) });
      await page.keyboard.press('Escape');
      await expect(diplomacy).toBeHidden();

      await page.getByRole('button', { name: 'Open Market' }).click();
      const board = page.getByRole('dialog', { name: /^Board of Trade/ });
      await expect(board).toBeVisible();
      await expectFlag(board.locator('h2'), 'nation-1');
      const partners = board.locator('[data-testid="sellers"] li, [data-testid="buyers"] li');
      expect(await partners.count()).toBeGreaterThan(0);
      for (const li of await partners.all()) {
        const id = (await li.getByTestId('nation-flag').getAttribute('data-nation-id'))!;
        expect(id).toMatch(/^minor-\d$/);
        if (await li.isVisible()) await expectFlag(li, id);
      }
      await expectNoSidewaysScroll(page);
      await page.screenshot({ path: shotPath(testInfo, `fr564-market-${at}.png`) });
      expect(errors).toEqual([]);
    });
  });
}
