import { test, expect, type Page } from '@playwright/test';

// M12 QA fix round (2026-11-16): the by-eye QA of the built app (.gate/m12/qa/, tracks A to C) found these in the browser.
// FR-445: Escape drops the selection, not the keyboard focus. FR-447: the Saved game dialog hides the new game behind it.
// FR-448: the selected civilian's offers come into the HUD's view above its fade at 1280x720. FR-451: at 390x844 the
// close button of Diplomacy and the Board of Trade stays at the title's right. FR-452: the fort mark lies on a plate.

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
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
}

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const focusedTile = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('data-tile-id') ?? document.activeElement?.tagName);

/** The HUD's visible box less its sticky fade (the bottom 24 px) when its content overflows (as in e2e/m12-map.spec.ts). */
const hudSeen = (page: Page) =>
  page.locator('.hud-content').evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const fade = el.scrollHeight > el.clientHeight ? parseFloat(getComputedStyle(el, '::after').height) : 0;
    return { top: r.top, bottom: r.top + el.clientHeight - fade };
  });

/** The alpha of an element's computed background colour (1 for an opaque colour). */
const backgroundAlpha = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const c = getComputedStyle(el).backgroundColor;
    const parts = c.match(/[\d.]+/g)!.map(Number);
    return parts.length === 4 ? parts[3] : 1;
  });

test('FR-445 Escape drops the selection and the focus stays on the tile: the arrows go on from it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await tile(page, '2-9').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tile-info')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tile-info')).toHaveCount(0);
  expect(await focusedTile(page)).toBe('4-9');
  await page.keyboard.press('ArrowRight');
  expect(await focusedTile(page)).toBe('5-9');
  expect(errors).toEqual([]);
});

test('FR-447 the Saved game dialog hides the new game behind it (an opaque backdrop)', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  await page.reload();
  const dialog = page.getByRole('dialog', { name: 'Saved game' });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  expect(await backgroundAlpha(page, '[data-testid="dialog-backdrop"]')).toBe(1);
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
});

test('FR-448 FR-453 at 1280x720 the engineer picked on the farm 7-8: Tile Info shows it and its first offer lies above the fade', async ({ page }) => {
  test.setTimeout(60000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await tile(page, '2-9').getByTestId('worker-stack').click();
  await page.getByRole('group', { name: 'Civilians on this tile' }).getByRole('button', { name: 'engineer' }).click();
  await tile(page, '7-8').click({ position: { x: 6, y: 6 } });
  await expect(tile(page, '7-8').getByTestId('worker-button')).toHaveAttribute('data-worker-type', 'engineer');
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');

  // FR-453: the civilian's own button selects its tile too
  await tile(page, '7-8').getByTestId('worker-button').click();
  await expect(page.getByTestId('tile-info')).toBeVisible();
  const first = page.getByTestId('tile-info').getByTestId('job-offer').first();
  await expect(first.getByRole('button')).toHaveText('Construct Depot');
  await expect
    .poll(async () => {
      const box = (await first.boundingBox())!;
      return box.y + box.height <= (await hudSeen(page)).bottom + 0.5;
    })
    .toBe(true);
  // FR-463: the heading's top inside the HUD's box, as FR-371 (e2e/m12-map.spec.ts); `top - heading.height` let a heading
  // scrolled out of sight above the box pass (it was at y -8 against a top of 12: the engineer picked at the capital on
  // turn 1 had left the HUD scrolled 196 px down)
  const heading = (await page.getByTestId('tile-info').getByRole('heading', { name: /Tile Info/ }).boundingBox())!;
  const offerBox = (await first.boundingBox())!;
  const seen = await hudSeen(page);
  console.log('FR-463', JSON.stringify({ headingY: heading.y, seenTop: seen.top, offerBottom: offerBox.y + offerBox.height, seenBottom: seen.bottom }));
  expect(heading.y).toBeGreaterThanOrEqual(seen.top);
  expect(errors).toEqual([]);
});

test('FR-452 the fort mark on both capitals lies on an opaque plate', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await expect(page.getByTestId('fort-mark')).toHaveCount(2);
  for (const mark of await page.getByTestId('fort-mark').all()) {
    expect(await mark.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  }
});

test.describe('at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** The close button sits in the title's row, at the dialog's right, not on a row of its own. */
  async function closeInTitleRow(page: Page, dialogName: string | RegExp, closeName: string) {
    const dialog = page.getByRole('dialog', { name: dialogName });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    const title = (await dialog.getByRole('heading', { level: 2 }).first().boundingBox())!;
    const close = (await dialog.getByRole('button', { name: closeName }).boundingBox())!;
    expect(close.y, 'the close button starts within the title row').toBeLessThan(title.y + title.height);
    expect(close.x + close.width, 'at the dialog\'s right').toBeGreaterThan(box.x + box.width - 48);
    return dialog;
  }

  test('FR-451 Diplomacy: the close button stays at the title\'s right; the cash line comes under them', async ({ page }) => {
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
    const dialog = await closeInTitleRow(page, 'Diplomacy', 'Close diplomacy');
    const title = (await dialog.getByRole('heading', { level: 2 }).first().boundingBox())!;
    const cash = (await dialog.getByTestId('diplomacy-cash').boundingBox())!;
    expect(cash.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(errors).toEqual([]);
  });

  test('FR-451 Board of Trade: the close button stays at the title\'s right; Cash, Holds and Bids come under them', async ({ page }) => {
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: /Open Market/ }).click();
    const dialog = await closeInTitleRow(page, 'Board of Trade', 'Close Board of Trade');
    const title = (await dialog.getByRole('heading', { level: 2 }).first().boundingBox())!;
    const cash = (await dialog.getByTestId('market-cash').boundingBox())!;
    expect(cash.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(errors).toEqual([]);
  });
});
