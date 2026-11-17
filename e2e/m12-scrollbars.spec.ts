import { test, expect, Page } from '@playwright/test';

// M12 lane L3: the scrollbars the dialogs draw (moved here from e2e/m12-dialogs.spec.ts at integration). Playwright starts
// Chromium with --hide-scrollbars, so no scrollbar takes width there; this file draws them as a desktop browser does, as
// e2e/m5-hud-scroll.spec.ts and m10-qa.spec.ts do (the launch option forces its own worker, so it must be top-level).
// FR-419: the Attack screen's list at 1280x720 (twelve regiments put into the save). FR-426: the Capital's industry
// column at 800x600.

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const SAVE_KEY = 'imperialism-remake.save';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
}

async function endTurn(page: Page, next: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
}

const savedTurn = (page: Page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw).game.turn;
  }, SAVE_KEY);

/**
 * Ends turn 1, edits the saved game of turn 2 with `edit` (run in the page, on the parsed save's game) and continues it
 * through the "Saved game" dialog.
 */
async function continueEdited(page: Page, edit: string) {
  await endTurn(page, 2);
  await expect.poll(() => savedTurn(page)).toBe(2);
  await page.evaluate(
    ({ key, body }) => {
      const save = JSON.parse(localStorage.getItem(key)!);
      new Function('game', body)(save.game);
      localStorage.setItem(key, JSON.stringify(save));
    },
    { key: SAVE_KEY, body: edit }
  );
  await page.reload();
  const saved = page.getByRole('dialog', { name: 'Saved game' });
  await saved.getByRole('button', { name: 'Continue' }).click();
  await expect(saved).toHaveCount(0);
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
}


test.describe('at 1280x720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('FR-419 the Attack screen says how many of our regiments lie below the list; scrolled to its end, none', async ({ page }) => {
    test.setTimeout(90000);
    const errors = collectErrors(page);
    await open(page);
    // Twelve regulars in Testland North-East (it borders Arvelia) and a war with Arvelia begun on turn 1
    await continueEdited(
      page,
      `const NE = 'province-nation-1-ne';
       let army = game.armies.find((a) => a.ownerId === 'nation-1' && a.provinceId === NE);
       if (!army) { army = { id: 'army-e2e-ne', ownerId: 'nation-1', provinceId: NE, regiments: [] }; game.armies.push(army); }
       for (let i = 0; i < 12; i++) army.regiments.push({ id: 'regiment-' + (901 + i), type: 'regulars', name: 'E2E Regulars ' + (i + 1), health: 100 });
       game.diplomacy['minor-1|nation-1'] = { ...game.diplomacy['minor-1|nation-1'], war: { aggressors: ['nation-1'], since: 1 } };`
    );

    await page.locator('[data-tile-id="7-3"]').getByTestId('army-marker').first().click();
    const army = page.getByRole('dialog', { name: 'Army in Testland North-East' });
    await expect(army).toBeVisible();
    const boxes = army.getByRole('checkbox');
    const count = await boxes.count();
    expect(count).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < count; i++) await boxes.nth(i).check();
    await army.getByRole('combobox', { name: 'March to' }).selectOption({ label: 'Attack Arvelia' });
    await army.getByRole('button', { name: 'Attack…' }).click();

    const attack = page.getByRole('dialog', { name: 'Attack Arvelia' });
    await expect(attack).toBeVisible();
    const ours = attack.getByRole('list', { name: 'Our regiments' });
    await expect(attack.getByTestId('ours-more-below')).toHaveText(/^\d+ more below$/);
    // The list draws a scrollbar that is always there (not the overlay one): it takes width
    expect(await ours.evaluate((el: HTMLElement) => el.offsetWidth - el.clientWidth)).toBeGreaterThan(0);
    await ours.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(attack.getByTestId('ours-more-below')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('at 800x600', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('FR-426 the Capital\'s industry column, cut at its bottom, shows a fade there and a scrollbar; at its end, no fade', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: /Open Capital/ }).click();
    const capital = page.getByRole('dialog', { name: /^Capital/ });
    await expect(capital).toBeVisible();
    const industry = capital.getByRole('main', { name: 'Industry' });
    await expect(capital.getByTestId('industry-fade')).toBeVisible();
    expect(await industry.evaluate((el: HTMLElement) => el.offsetWidth - el.clientWidth)).toBeGreaterThan(0);
    await industry.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(capital.getByTestId('industry-fade')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
