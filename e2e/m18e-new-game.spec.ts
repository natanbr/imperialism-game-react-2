import type { TestInfo } from '@playwright/test';
import { SAVE_KEY, type SavedGame } from '../src/app/store/persistence';
import { expect, startFreshSeededGame, test, type Locator, type Page } from './seededGame';

async function stageLargeMap(page: Page, seed: string) {
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  const panel = page.getByRole('group', { name: 'Confirm new game' });
  await expect(panel).toBeFocused();
  await panel.getByLabel('Map', { exact: true }).selectOption({ label: 'Random' });
  await panel.getByLabel('Random size', { exact: true }).selectOption({ label: 'Large' });
  await panel.getByLabel('Seed', { exact: true }).fill(seed);
  return panel;
}

async function expectPanelFits(panel: Locator) {
  const fit = await panel.evaluate(el => {
    const box = el.getBoundingClientRect();
    return {
      left: box.left, right: window.innerWidth - box.right, top: box.top, bottom: window.innerHeight - box.bottom,
      panelOverflow: el.scrollWidth - el.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  for (const edge of [fit.left, fit.right, fit.top, fit.bottom]) expect(edge).toBeGreaterThanOrEqual(0);
  expect(fit.panelOverflow).toBeLessThanOrEqual(0);
  expect(fit.pageOverflow).toBeLessThanOrEqual(0);
}

async function readSettingsSeed(page: Page) {
  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  const stats = page.getByRole('dialog', { name: 'Stats' });
  const text = await stats.innerText();
  expect(text).toMatch(/\bRandom\b/);
  expect(text).toMatch(/\bLarge\b/);
  expect(text).toMatch(/\bNormal\b/);
  const decimal = text.match(/\bSeed\s*:?\s*(\d+)\b/i)?.[1];
  expect(decimal).toBe('2813929771'); // FR-588's pinned hash of Brete.
  await stats.getByRole('button', { name: 'Close stats' }).click();
  return decimal!;
}

// Read the persisted game and events, including deposits and province seats that the map does not display.
async function savedPosition(page: Page) {
  return page.evaluate(key => {
    const { game, eventLog, orderLog } = JSON.parse(localStorage.getItem(key)!) as SavedGame;
    return { game, eventLog, orderLog };
  }, SAVE_KEY);
}

async function openConsulateAndAdvance(page: Page) {
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
  await diplomacy.getByRole('tab', { name: 'Arvelia', exact: true }).click();
  await diplomacy.getByRole('tabpanel', { name: 'Arvelia', exact: true }).getByRole('button', { name: 'Consulate ($500)' }).click();
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await page.getByRole('button', { name: 'Advance Turn', exact: true }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  return savedPosition(page);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name);
  await page.screenshot({ path, animations: 'disabled' });
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const size = `${viewport.width}x${viewport.height}`;
  test.describe(size, () => {
    test.use({ viewport });

    test('FR-595 FR-596 Continue a Random/Large game and recreate it from the decimal seed in Stats', async ({ page }, testInfo) => {
      await startFreshSeededGame(page);
      const panel = await stageLargeMap(page, 'Brete');
      await expectPanelFits(panel);
      await capture(page, testInfo, `new-game-panel-${size}.png`);
      const start = panel.getByRole('button', { name: 'Start new game', exact: true });
      await start.click();
      const tiles = page.getByTestId('tile');
      const capitalTiles = tiles.and(page.locator('[data-terrain="capital"]'));
      const capitalIds = () => capitalTiles.evaluateAll(elements => elements.map(el => el.getAttribute('data-tile-id')));
      await expect(tiles).toHaveCount(32 * 20);
      await expect(capitalTiles).toHaveCount(6);
      const capitals = await capitalIds();
      const original = await savedPosition(page);
      expect(original.game).toMatchObject({ worldId: 'random', randomMapSize: 'large', difficulty: 'normal', turn: 1 });
      await capture(page, testInfo, `random-map-${size}.png`);
      const seed = await readSettingsSeed(page);

      const nextTurn = await openConsulateAndAdvance(page);
      expect(nextTurn.game.turn).toBe(2);
      await page.reload();
      await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
      expect(await readSettingsSeed(page)).toBe(seed);

      await stageLargeMap(page, seed);
      await start.click();
      await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
      expect(await capitalIds()).toEqual(capitals);
      expect(await savedPosition(page)).toEqual(original);
      expect(await openConsulateAndAdvance(page)).toEqual(nextTurn);
    });

    test('FR-595 stage by keyboard, keep or cancel invalid settings, start the defaults, then start Two islands on Demo', async ({ page }) => {
      await startFreshSeededGame(page);
      await page.getByRole('button', { name: 'Advance Turn', exact: true }).click();
      await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
      const readSlot = () => page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
      const before = await readSlot();
      const newGame = page.getByRole('button', { name: 'New game', exact: true });
      const panel = page.getByRole('group', { name: 'Confirm new game' });
      const map = panel.getByLabel('Map', { exact: true });
      const randomSize = panel.getByLabel('Random size', { exact: true });
      const seed = panel.getByLabel('Seed', { exact: true });
      const difficulty = panel.getByLabel('Difficulty', { exact: true });
      const start = panel.getByRole('button', { name: 'Start new game', exact: true });
      const keep = panel.getByRole('button', { name: 'Keep playing' });
      const demo = panel.getByRole('button', { name: 'Start Demo game' });

      await newGame.press('Enter');
      await expect(panel).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(map).toBeFocused();
      await page.keyboard.press('End');
      await expect(map.locator('option:checked')).toHaveText('Random');
      for (const control of [randomSize, seed, difficulty, start, keep, demo]) {
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
      }
      await seed.fill('4294967296');
      await expect(seed).toHaveAttribute('aria-invalid', 'true');
      await expect(seed).toHaveAttribute('aria-describedby', /\S/);
      await expect(seed).toHaveAccessibleDescription(/4294967295|0.to.4,294,967,295|unsigned|number|integer|seed/i);
      await expect(start).toBeDisabled();
      await expect(demo).toBeDisabled();
      await keep.click();
      await expect(panel).toHaveCount(0);
      await expect(newGame).toBeFocused();
      expect(await readSlot()).toBe(before);
      await newGame.press('Enter');
      await map.selectOption({ label: 'Two islands' });
      await map.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(newGame).toBeFocused();
      expect(await readSlot()).toBe(before);

      await newGame.press('Enter');
      await expect(map.locator('option:checked')).toHaveText('Continent');
      await expect(difficulty.locator('option:checked')).toHaveText('Normal');
      await start.press('Enter');
      await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
      expect((await savedPosition(page)).game).toMatchObject({ worldId: 'continent', seed: 1, difficulty: 'normal' });

      await newGame.click();
      await map.selectOption({ label: 'Two islands' });
      await panel.getByText('Set replay seed', { exact: true }).click();
      await seed.fill('0000');
      await difficulty.selectOption({ label: 'Demo' });
      await start.click();
      await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
      const islands = (await savedPosition(page)).game;
      expect(islands).toMatchObject({ worldId: 'two-islands', seed: 0, difficulty: 'demo' });
      expect(islands).not.toHaveProperty('randomMapSize');
    });
  });
}
