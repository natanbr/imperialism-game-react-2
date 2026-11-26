import type { TestInfo } from '@playwright/test';
import { continueSavedGame, expect, test, type Page } from './seededGame';
import { SAVE_KEY, saveOf, type SavedGame } from '../src/app/store/persistence';
import { createGameStore } from '../src/app/store/rootStore';
import { coastalFreightTown } from '../tests/engine/townFreightFixture';
import { N1, setBuilding } from '../tests/engine/fixtures';

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const income = (page: Page) => page.getByRole('region', { name: 'Town income' });
const details = (page: Page) => page.getByRole('region', { name: 'Town development' });
const closeCapital = (page: Page) => page.getByRole('button', { name: 'Close capital' }).click();

async function inspectByKeyboard(page: Page, targetId: string) {
  const entry = page.locator('[data-tile-id][tabindex="0"]');
  const from = (await entry.getAttribute('data-tile-id'))!.split('-').map(Number);
  const [x, y] = targetId.split('-').map(Number);
  await entry.focus();
  for (let i = 0; i < Math.abs(x - from[0]); i++) await page.keyboard.press(x < from[0] ? 'ArrowLeft' : 'ArrowRight');
  for (let i = 0; i < Math.abs(y - from[1]); i++) await page.keyboard.press(y < from[1] ? 'ArrowUp' : 'ArrowDown');
  await expect(tile(page, targetId)).toBeFocused();
  await page.keyboard.press('Enter');
}

function screenshot(page: Page, info: TestInfo, name: string) {
  return page.screenshot({ path: process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}.png` : info.outputPath(`${name}.png`) });
}

async function loadTown(page: Page) {
  const { game: fixture, province, seat } = coastalFreightTown();
  const game = setBuilding(fixture, N1, 'furnitureFactory', { capacity: 4 });
  game.turn = 6;
  game.townProgress![province.id] = {
    ownerId: N1, connectedSettlements: 5, matured: { wood: 0, textile: 0, metal: 0 },
    upgradeSettlements: { wood: 0, textile: 0, metal: 0 },
  };
  const owner = game.nations[0];
  owner.transportCapacity = 1;
  owner.warehouse = { ...owner.warehouse, lumber: 20, steel: 20, furniture: 0 };
  const session = createGameStore({ game });
  session.setState({ replayBoundary: { turn: game.turn, appliedOrders: 0, checkpoint: game } });
  await continueSavedGame(page, saveOf(session.getState()));
  return { province, seat };
}

async function openIncome(page: Page) {
  await page.getByRole('button', { name: 'Open Capital' }).click();
  await page.getByRole('navigation', { name: 'Capital sections' }).getByRole('button', { name: 'Transport' }).click();
  await expect(income(page)).toBeVisible();
}

async function advance(page: Page, turn: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${turn + 1} of`);
}

function savedReceipts(page: Page) {
  return page.evaluate(key => {
    const { game, eventLog, activeNationId } = JSON.parse(localStorage.getItem(key)!) as SavedGame;
    return { turn: game.turn, furniture: game.nations.find(n => n.id === activeNationId)!.warehouse.furniture,
      receipts: eventLog.flatMap(report => report.events.filter(e => e.type === 'town-receipt' && e.nationId === activeNationId)) };
  }, SAVE_KEY);
}

test('FR-621–624 from the first lumber to furniture, one car reconciles across the five views', async ({ page }, info) => {
  const { province, seat } = await loadTown(page);
  await inspectByKeyboard(page, seat.id);
  await expect(details(page)).toContainText(province.name);
  await expect(details(page)).toContainText(/1 lumber/i);
  await openIncome(page);
  await expect(income(page)).toContainText(/1 lumber/i);
  await closeCapital(page);
  const freight = page.getByRole('button', { name: /Transportation of Commodities/ });
  await freight.click();
  const lumber = page.getByRole('slider', { name: 'Lumber', exact: true });
  const furniture = page.getByRole('slider', { name: 'Furniture', exact: true });
  await expect(lumber).toHaveAttribute('max', '1');
  await lumber.press('End');
  await page.keyboard.press('Escape');
  await advance(page, 6);
  const news = page.getByTestId('news-panel').getByRole('listitem').filter({ hasText: province.name + ' delivered' });
  await expect(news).toContainText('1 of 1 Lumber');
  await page.getByRole('button', { name: 'Open Capital' }).click();
  await page.getByRole('button', { name: 'Expand Furniture Factory' }).click();
  await expect(page.getByTestId('building-furnitureFactory').getByTestId('capacity')).toContainText('(+4 next turn)');
  await closeCapital(page);
  await advance(page, 7);
  await expect(news).toContainText('1 of 1 Lumber');
  await expect(tile(page, seat.id)).toHaveAccessibleDescription(`${province.name} town, Producing`);
  await inspectByKeyboard(page, seat.id);
  await expect(details(page)).toContainText(/1 furniture/i);
  await screenshot(page, info, 'town-map-desktop');
  await freight.click();
  await expect(lumber).toHaveAttribute('max', '2');
  await expect(furniture).toHaveAttribute('max', '1');
  await lumber.press('Home');
  await furniture.press('End');
  await expect(furniture).toHaveValue('1');
  await screenshot(page, info, 'town-transport');
  await page.keyboard.press('Escape');
  await advance(page, 8);
  await expect(news).toContainText('0 of 2 Lumber, 1 of 1 Furniture. Some town freight went unshipped.');
  await news.scrollIntoViewIfNeeded();
  await screenshot(page, info, 'town-news');
  await openIncome(page);
  await expect(income(page)).toContainText(/turn 8/i);
  await expect(income(page)).toContainText(/0 of 2 lumber/i);
  await expect(income(page)).toContainText(/1 of 1 furniture/i);
  await income(page).scrollIntoViewIfNeeded();
  await screenshot(page, info, 'town-capital');
  await page.getByRole('dialog', { name: /^Capital/ }).getByRole('button', { name: 'Warehouse' }).click();
  await expect(page.getByTestId('stock-furniture')).toHaveText(/Furniture\s*1\b/);
  const saved = await savedReceipts(page);
  expect(saved.furniture).toBe(1);
  expect(saved.receipts).toHaveLength(3);
  console.log('FR-622 matched receipts', JSON.stringify(saved));
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(news).toContainText('0 of 2 Lumber, 1 of 1 Furniture');
  expect(await savedReceipts(page)).toEqual(saved);
});

test('FR-623 FR-625 keyboard inspection at phone width shows domestic town facts and only the public foreign seat', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { province, seat } = await loadTown(page);
  await inspectByKeyboard(page, seat.id);
  await expect(details(page)).toContainText(province.name);
  await details(page).locator('summary').press('Enter');
  await expect(details(page).getByText(/^Furniture factory$/i)).toBeVisible();
  await details(page).scrollIntoViewIfNeeded();
  await screenshot(page, info, 'town-inspection-phone');
  await openIncome(page);
  await expect(income(page)).toContainText(/1 lumber/i);
  const width = await income(page).evaluate(el => ({ content: el.scrollWidth, visible: el.clientWidth }));
  expect(width.content).toBeLessThanOrEqual(width.visible + 1);
  await income(page).scrollIntoViewIfNeeded();
  await screenshot(page, info, 'town-capital-phone');
  await closeCapital(page);
  const foreign = coastalFreightTown().game.provinces.find(p => p.ownerId === 'nation-2')!;
  await inspectByKeyboard(page, foreign.seatTileId);
  await expect(page.getByTestId('tile-owner')).toContainText('Valdoria');
  await expect(tile(page, foreign.seatTileId)).toHaveAccessibleDescription(`${foreign.name} town`);
  await expect(details(page)).toHaveCount(0);
});
