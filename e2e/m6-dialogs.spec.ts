import { test, expect, Page } from '@playwright/test';

// FR-236 (M6 QA fix round, item 1) in the running app: every game dialog is a modal dialog built on one shared
// component. Opened from its HUD button it is aria-modal and takes the focus; Tab and Shift+Tab keep the focus inside;
// Escape closes it, as does a click on the backdrop outside it, and the focus goes back to the button that opened it.
// Only the top dialog of a stack answers (Diplomacy opened from the Capital dialog).

test.use({ viewport: { width: 1280, height: 720 } });

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

/** Whether the focus is on a control inside the dialog (not on the dialog box itself, not outside). */
const focusInside = (page: Page, name: string) =>
  page.getByRole('dialog', { name }).evaluate((el) => el.contains(document.activeElement) && document.activeElement !== el);

const DIALOGS: { opener: RegExp; name: string }[] = [
  { opener: /Open Warehouse/, name: 'Warehouse' },
  { opener: /Open Capital/, name: 'Capital' },
  { opener: /Open Market/, name: 'World market' },
  { opener: /^Diplomacy$/, name: 'Diplomacy' },
  { opener: /Transportation of Commodities/, name: 'Transportation of Commodities' },
  { opener: /^About$/, name: 'About' },
];

test('FR-236 each HUD dialog: aria-modal, the focus inside on open, Tab and Shift+Tab stay inside, Escape closes it and the focus goes back', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);

  for (const { opener, name } of DIALOGS) {
    const button = page.getByRole('button', { name: opener });
    await button.click();
    const dialog = page.getByRole('dialog', { name });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await focusInside(page, name), `${name}: the focus moved into it`).toBe(true);

    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press(key);
        expect(await focusInside(page, name), `${name}: ${key} ${i + 1} stays inside`).toBe(true);
      }
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(button, `${name}: the focus is back on its button`).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('FR-236 a click on the backdrop outside the dialog closes it; a click inside does not', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);

  for (const { opener, name } of DIALOGS) {
    const button = page.getByRole('button', { name: opener });
    await button.click();
    const dialog = page.getByRole('dialog', { name });
    await expect(dialog).toBeVisible();

    // Inside: on the dialog's title
    await dialog.getByRole('heading').first().click();
    await expect(dialog).toBeVisible();
    // Outside: the top-left corner of the window, over the map
    await page.mouse.click(20, 20);
    await expect(dialog).toHaveCount(0);
    await expect(button, `${name}: the focus is back on its button`).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('FR-236 Diplomacy over Capital: Escape closes Diplomacy only and the focus goes back to the capital\'s Diplomacy button', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  await page.getByRole('button', { name: /Open Capital/ }).click();
  const capital = page.getByRole('dialog', { name: 'Capital' });
  const fromCapital = capital.getByRole('button', { name: 'Diplomacy' });
  await fromCapital.click();
  const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
  await expect(diplomacy).toBeVisible();
  expect(await focusInside(page, 'Diplomacy')).toBe(true);

  await page.keyboard.press('Escape');
  await expect(diplomacy).toHaveCount(0);
  await expect(capital).toBeVisible();
  await expect(fromCapital).toBeFocused();

  // The backdrop of the top dialog closes it alone, too
  await fromCapital.click();
  await expect(diplomacy).toBeVisible();
  await page.mouse.click(20, 20);
  await expect(diplomacy).toHaveCount(0);
  await expect(capital).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(capital).toHaveCount(0);
  expect(errors).toEqual([]);
});
