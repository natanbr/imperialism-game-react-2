// FR-562: the debug dashboard of the Demo level, in the running app. Continue the seeded save (Normal: no Dashboard
// button), start a Demo game from New game's question, open Dashboard and read the rival's cash on its card; at 1366x768
// and at 390 px wide, with no sideways page scroll and the dialog inside the window. Each test leaves a screenshot in its
// output folder (testInfo.outputPath), or in SCREENSHOT_DIR when that is set.
import type { TestInfo } from '@playwright/test';
import { START_TREASURY } from '../src/app/engine/world/startWorld';
import { expect, startSeededGame, test, type Page } from './seededGame';

const RIVAL = 'nation-2';
const rivalCash = `$${START_TREASURY.toLocaleString('en-US')}`;

async function openDemoDashboard(page: Page) {
  await startSeededGame(page);
  // NR-037: the Normal level has no Dashboard
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('group', { name: 'Confirm new game' }).getByRole('button', { name: 'Start Demo game' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Dashboard' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The run's own output folder (no fixed path), or SCREENSHOT_DIR when the gate sets it, as the other specs do. */
const shotPath = (testInfo: TestInfo, name: string) => (process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name));

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.describe('FR-562 at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('FR-562 Start Demo game, open Dashboard: the rival card shows its cash; the sections switch with buttons', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    const dialog = await openDemoDashboard(page);
    const rival = dialog.getByTestId(`dashboard-card-${RIVAL}`);
    await expect(rival.getByTestId('dashboard-cash')).toHaveText(rivalCash);
    await dialog.getByRole('button', { name: 'Military' }).click();
    await expect(rival).toContainText('Regiments');
    await dialog.getByRole('button', { name: 'Economy' }).click();
    await expect(rival).toContainText(rivalCash);
    await expectNoSidewaysScroll(page);
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1366);
    expect(box.y + box.height).toBeLessThanOrEqual(768);
    await page.screenshot({ path: shotPath(testInfo, 'm18-dashboard.png'), animations: 'disabled' });
    expect(errors).toEqual([]);
  });
});

test.describe('FR-562 at 390 px wide', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('FR-562 the dashboard fits a phone-wide window: no sideways page scroll, the rival cash in view', async ({ page }, testInfo) => {
    const dialog = await openDemoDashboard(page);
    const rival = dialog.getByTestId(`dashboard-card-${RIVAL}`);
    await expect(rival).toContainText(rivalCash);
    await expectNoSidewaysScroll(page);
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    const sections = (await dialog.getByRole('group', { name: 'Dashboard sections' }).boundingBox())!;
    expect(sections.x + sections.width).toBeLessThanOrEqual(box.x + box.width);
    await dialog.getByRole('button', { name: 'Military' }).click();
    await expect(rival).toContainText('Regiments');
    await expectNoSidewaysScroll(page);
    await page.screenshot({ path: shotPath(testInfo, 'm18-dashboard-390.png'), animations: 'disabled' });
  });
});
