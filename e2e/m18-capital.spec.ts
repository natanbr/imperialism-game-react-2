// M18b Capital layout in the running app, from the seed 1 save (e2e/seededGame.ts), at 1366x768 and at 390 px wide.
// FR-565: one section open at a time, Industry first, with no vertical scroll bar in the dialog at 1366x768; the industry
// cards' buildings drawn at 40 to 48 px. FR-566: the city's labour bar stays in view above the sections; the Trade
// School trains a worker through the real buttons and the bar counts the trainee. No sideways page scroll at 390 px.
// Screenshots go to the test's output folder (testInfo.outputPath), or SCREENSHOT_DIR when set.
import type { TestInfo } from '@playwright/test';
import { expect, startSeededGame, test, type Locator, type Page } from './seededGame';

const shotPath = (testInfo: TestInfo, name: string) => (process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name));
const SECTIONS = ['Industry', 'Trade School', 'Capitol', 'Transport', 'University', 'Shipyard'];

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/** The element and every scrolling box inside it that has more content than room: none expected. */
async function scrollingBoxes(where: Locator) {
  return where.evaluate((root) =>
    [root, ...root.querySelectorAll('*')]
      .filter((el) => {
        const style = getComputedStyle(el);
        return ['auto', 'scroll'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}: ${el.scrollHeight} > ${el.clientHeight}`)
  );
}

async function openCapital(page: Page) {
  // The Trade School takes $100 and 1 paper per untrained worker
  await startSeededGame(page, (game) => {
    game.nations[0].warehouse.paper = 2;
  });
  await page.getByRole('button', { name: 'Open Capital' }).click();
  const capital = page.getByRole('dialog', { name: /^Capital/ });
  await expect(capital).toBeVisible();
  return capital;
}

const sectionButton = (capital: Locator, name: string) => capital.getByRole('navigation', { name: 'Capital sections' }).getByRole('button', { name, exact: true });

async function trainInTradeSchool(page: Page, capital: Locator) {
  const bar = capital.getByTestId('labour-panel');
  await expect(bar.getByTestId('grade-untrained')).not.toContainText('in training');
  await sectionButton(capital, 'Trade School').click();
  await expect(sectionButton(capital, 'Trade School')).toHaveAttribute('aria-expanded', 'true');
  await expect(sectionButton(capital, 'Industry')).toHaveAttribute('aria-expanded', 'false');
  await expect(capital.getByRole('main', { name: 'Industry' })).toBeHidden();
  const cash = page.getByTestId('topbar-cash');
  await expect(cash).toContainText('$10,000');
  await capital.getByRole('button', { name: 'Train an untrained worker' }).click();
  await expect(bar.getByTestId('grade-untrained')).toContainText('1 in training');
  await expect(cash).toContainText('$9,900');
  await expect(bar).toBeInViewport();
}

test.describe('M18b Capital at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('FR-565 FR-566 at 1366x768 Industry opens first and fits; the labour bar and the section buttons are in view; the Trade School trains a worker', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const capital = await openCapital(page);
    const nav = capital.getByRole('navigation', { name: 'Capital sections' });
    await expect(nav.getByRole('button')).toHaveText(SECTIONS);
    for (const name of SECTIONS) {
      await expect(sectionButton(capital, name), name).toBeInViewport({ ratio: 1 });
      await expect(sectionButton(capital, name), name).toHaveAttribute('aria-expanded', name === 'Industry' ? 'true' : 'false');
    }
    const industry = capital.getByRole('main', { name: 'Industry' });
    await expect(industry).toBeVisible();
    await expect(capital.getByTestId(/^building-/)).toHaveCount(7);
    // FR-565: no vertical scroll bar anywhere in the dialog with Industry open; the last card wholly in view
    expect(await scrollingBoxes(capital)).toEqual([]);
    await expect(capital.getByTestId('building-clothingFactory')).toBeInViewport({ ratio: 1 });
    // FR-565: the cards' buildings drawn larger, 40 to 48 px
    const pictures = await capital.locator('section[data-testid^="building-"] > header img').evaluateAll((imgs) => imgs.map((img) => img.getBoundingClientRect().height));
    expect(pictures).toHaveLength(7);
    for (const size of pictures) {
      expect(size).toBeGreaterThanOrEqual(40);
      expect(size).toBeLessThanOrEqual(48);
    }
    // FR-566: the bar above the sections, the city's HUD, wholly in view
    const bar = capital.getByTestId('labour-panel');
    await expect(bar).toBeInViewport({ ratio: 1 });
    await expect(bar.getByTestId('labour')).toHaveText(/^Labour\s*\d+ total, \d+ committed, \d+ free$/);
    await expect(bar.getByTestId('food')).toHaveText(/^Food\s*\d+ of \d+ fed/);
    for (const grade of ['untrained', 'trained', 'expert']) await expect(bar.getByTestId(`grade-${grade}`)).toBeVisible();
    const below = async (upper: Locator, lower: Locator) => (await upper.boundingBox())!.y + (await upper.boundingBox())!.height <= (await lower.boundingBox())!.y + 0.5;
    expect(await below(bar, nav)).toBe(true);
    await page.screenshot({ path: shotPath(testInfo, 'm18b-capital-1366x768.png') });

    // Every section opens alone, below the bar, with no scroll bar
    for (const name of SECTIONS) {
      await sectionButton(capital, name).click();
      const panel = capital.locator(`[id="${await sectionButton(capital, name).getAttribute('aria-controls')}"]`);
      await expect(panel, name).toBeVisible();
      await expect(nav.locator('[aria-expanded="true"]'), name).toHaveText([name]);
      await expect(bar, name).toBeInViewport({ ratio: 1 });
      expect(await below(bar, panel), name).toBe(true);
      expect(await scrollingBoxes(capital), name).toEqual([]);
    }
    await sectionButton(capital, 'Industry').click();
    await trainInTradeSchool(page, capital);
    expect(await scrollingBoxes(capital)).toEqual([]);
    await page.screenshot({ path: shotPath(testInfo, 'm18b-capital-trade-school-1366x768.png') });
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });
});

test.describe('M18b Capital at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('FR-565 FR-566 at 390 px the section buttons wrap inside the window and the Trade School trains a worker', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const capital = await openCapital(page);
    await expect(capital.getByRole('button', { name: 'Close capital' })).toBeInViewport();
    for (const name of SECTIONS) {
      const box = (await sectionButton(capital, name).boundingBox())!;
      expect(box.x, name).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, name).toBeLessThanOrEqual(390);
    }
    await expectNoSidewaysScroll(page);
    await trainInTradeSchool(page, capital);
    await expectNoSidewaysScroll(page);
    await page.screenshot({ path: shotPath(testInfo, 'm18b-capital-390x844.png') });
    expect(errors).toEqual([]);
  });
});
