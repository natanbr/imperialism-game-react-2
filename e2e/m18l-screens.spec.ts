import type { TestInfo } from '@playwright/test';
import { createGameStore } from '../src/app/store/rootStore';
import { SAVE_KEY, saveOf, type SavedGame } from '../src/app/store/persistence';
import { continueSavedGame, expect, startSeededGame, test, type Locator, type Page } from './seededGame';

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

/** Seed 1 after its first settlement (our nation idle), so the FR-610 placings of turn 1 exist. */
function settledSave(): SavedGame {
  const store = createGameStore({ seed: 1 });
  store.getState().advanceTurn();
  return saveOf(store.getState());
}

const WORD = '(Poor|Fair|Good|Excellent|Awesome)';

/** The Market's Trade policies tab in Information mode; the panel. */
async function openInformation(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Open Market' }).click();
  const board = page.getByRole('dialog', { name: /^Board of Trade/ });
  await board.getByRole('tab', { name: 'Trade policies' }).click();
  const panel = board.getByRole('tabpanel', { name: 'Trade policies' });
  await panel.getByRole('combobox', { name: 'Map mode' }).selectOption({ label: 'Information' });
  return panel;
}

/** The dialog holding the panel lies inside the window, and neither scrolls sideways nor overflows the page. */
async function expectPaneFits(panel: Locator) {
  const fit = await panel.evaluate(el => {
    const dialog = el.closest<HTMLElement>('[role="dialog"]')!;
    const rect = dialog.getBoundingClientRect();
    const page = document.documentElement;
    return {
      inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      overflow: Math.max(dialog.scrollWidth - dialog.clientWidth, el.scrollWidth - el.clientWidth, page.scrollWidth - innerWidth),
    };
  });
  expect(fit.inside).toBe(true);
  expect(fit.overflow).toBeLessThanOrEqual(1);
}

/**
 * A box can be read in full where it stands, with no scrolling: inside the panel that scrolls it, the dialog and the
 * window. M18l browser QA: on turn 1 at 390x844 the List's detail box ran from y 726 to 820, under the dialog's bottom at
 * 802 and the panel's at 794, cut off, and only a 26 px scroll of the panel, which shows no scroll bar, reached it.
 */
async function expectInView(box: Locator) {
  const fit = await box.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const frames = [el.closest('[role="tabpanel"]')!, el.closest('[role="dialog"]')!].map(frame => frame.getBoundingClientRect());
    return {
      box: { top: Math.round(rect.top), bottom: Math.round(rect.bottom) },
      frames: frames.map(frame => ({ top: Math.round(frame.top), bottom: Math.round(frame.bottom) })),
      inside: rect.bottom <= innerHeight && frames.every(frame => rect.top >= frame.top - 1 && rect.bottom <= frame.bottom + 1),
    };
  });
  expect(fit, JSON.stringify(fit)).toMatchObject({ inside: true });
}

/**
 * Select a tile with a click, which is what Enter on a focused tile does (MapView). The arrow-key walk to a tile costs one
 * re-render of the map per key press: FR-650 asserts that walk to Arvelia at both widths, NR-041 only reads what follows.
 */
async function inspectByClick(page: Page, targetId: string) {
  await tile(page, targetId).click({ position: { x: 6, y: 6 } });
  await expect(tile(page, targetId)).toHaveAttribute('data-selected', 'true');
}

/** What our nation reads of Arvelia: its Scouting report, then the Information List, as text. */
async function readViews(page: Page): Promise<string[]> {
  await inspectByClick(page, '10-3');
  await page.getByTestId('tile-info').getByRole('button', { name: 'Scouting report' }).click();
  const report = page.getByRole('dialog', { name: /^Report on the army forces of Arvelia/ });
  const scouted = await report.innerText();
  await report.getByRole('button', { name: 'OK' }).click();
  const panel = await openInformation(page);
  await panel.getByRole('button', { name: 'List', exact: true }).click();
  const list = await panel.getByRole('table', { name: 'Information by country' }).innerText();
  await page.keyboard.press('Escape');
  return [scouted, list];
}

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

    test('FR-651 read Information on the map and in the List; the other modes and the policy order still work', async ({ page }, info) => {
      await continueSavedGame(page, settledSave());
      const before = await rawSlot(page);
      const panel = await openInformation(page);
      const map = panel.getByRole('group', { name: 'Information map' });
      await expect(map.getByRole('img', { name: /^Testland, Home, Our forces, 4 provinces, Industry \d(st|nd) of 2$/ })).toHaveCount(1);
      const valdoria = map.getByRole('button', { name: new RegExp(`^Valdoria, Military ${WORD}, \\d+ provinces?, Industry \\d(st|nd) of 2$`) });
      const arvelia = map.getByRole('button', { name: new RegExp(`^Arvelia, Military ${WORD}, 1 province$`) });
      await arvelia.click();
      await valdoria.focus();
      await valdoria.press('Enter');
      await expect(valdoria).toBeFocused();
      await expect(valdoria).toHaveAttribute('aria-pressed', 'true');
      const word = /Military (\w+)/.exec((await valdoria.getAttribute('aria-label'))!)![1];
      const detail = panel.getByRole('region', { name: 'Selected country' });
      await expect(detail).toContainText('Information: Valdoria');
      await expect(detail).toContainText(`Military ${word}`);
      const key = panel.getByRole('group', { name: 'Information key' });
      for (const name of ['Poor', 'Fair', 'Good', 'Excellent', 'Awesome', 'Home']) await expect(key).toContainText(name);
      await expect(panel.getByRole('checkbox', { name: 'Boycott' })).toHaveCount(0);
      await expectPaneFits(panel);
      await capture(page, info, 'information-map');
      const facts = await detail.innerText();

      await panel.getByRole('button', { name: 'List', exact: true }).click();
      const table = panel.getByRole('table', { name: 'Information by country' });
      const row = table.getByRole('row').filter({ has: page.getByRole('button', { name: 'Valdoria', exact: true }) });
      await expect(row).toContainText(word);
      await expect(table.getByRole('row').nth(1)).toContainText('Our forces');
      await row.getByRole('button', { name: 'Valdoria', exact: true }).press('Enter');
      await expect(detail).toHaveText(facts, { useInnerText: true });
      await expectPaneFits(panel);
      await capture(page, info, 'information-list');
      // NR-041: reading Information changes no saved field and queues no Order
      expect(await rawSlot(page)).toBe(before);

      await panel.getByRole('button', { name: 'Map', exact: true }).click();
      const mode = panel.getByRole('combobox', { name: 'Map mode' });
      await mode.selectOption({ label: 'Relationships' });
      await expect(panel.getByRole('group', { name: 'Relationships key' })).toBeVisible();
      await mode.selectOption({ label: 'Trade policies' });
      const policy = panel.getByRole('button', { name: /^Valdoria,/ });
      await policy.press('Space');
      await panel.getByRole('checkbox', { name: 'Boycott' }).check();
      await expect(policy).toHaveAccessibleName('Valdoria, boycott');
    });

    test('FR-651 turn 1: the List\'s detail box of Valdoria, "ranked after the first turn", is in view in full', async ({ page }, info) => {
      await startSeededGame(page);
      const panel = await openInformation(page);
      await panel.getByRole('button', { name: 'List', exact: true }).click();
      const detail = panel.getByRole('region', { name: 'Selected country' });
      await expect(detail).toContainText('Information: Valdoria');
      await expect(detail).toContainText('Industry ranked after the first turn');
      await expectInView(detail);
      await expectPaneFits(panel);
      await capture(page, info, 'information-list-turn-1');
      // Choosing another row shows its facts in the same place; the last row can still be scrolled clear of the box
      const table = panel.getByRole('table', { name: 'Information by country' });
      await table.getByRole('button', { name: 'Arvelia', exact: true }).click();
      await expect(detail).toContainText('Information: Arvelia');
      await expectInView(detail);
      await panel.evaluate(el => { el.scrollTop = el.scrollHeight; });
      const last = table.getByRole('row').last();
      const clear = await last.evaluate((row, box) => row.getBoundingClientRect().bottom <= box!.getBoundingClientRect().top + 1,
        await detail.elementHandle());
      expect(clear).toBe(true);
    });

    // Two reads in one test ran into the 30 s limit of a full run, so each read is its own test; the Demo test compares
    // with what the Normal test read. Serial: they run in order in one worker, and a failed Normal read skips the comparison.
    test.describe('NR-041 Normal and Demo read the same Scouting report and Information', () => {
      test.describe.configure({ mode: 'serial' });
      let normalViews: string[] | undefined;

      test('NR-041 Normal reads the Scouting report and Information; reading saves nothing', async ({ page }) => {
        await continueSavedGame(page, settledSave());
        const before = await rawSlot(page);
        const views = await readViews(page);
        expect(await rawSlot(page)).toBe(before);
        expect(views[0]).toContain('Estimated by our garrison in Testland North-East');
        expect(views[1]).toMatch(new RegExp(`Arvelia\\s+1\\s+${WORD}`));
        normalViews = views;
      });

      test('NR-041 Demo reads the same Scouting report and Information as Normal; reading saves nothing', async ({ page }) => {
        expect(normalViews, 'the Normal test before this one records the texts to compare with').toBeDefined();
        const normal = settledSave();
        const demo: SavedGame = { ...normal, game: { ...normal.game, difficulty: 'demo' } };
        await continueSavedGame(page, demo);
        const demoBefore = await rawSlot(page);
        expect(JSON.parse(demoBefore!).game.difficulty).toBe('demo');
        expect(await readViews(page)).toEqual(normalViews);
        expect(await rawSlot(page)).toBe(demoBefore);
      });
    });
  });
}
