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

test('FR-236 the keyboard on the Diplomacy screen: Tab goes on after an order, Tab from the war question, Escape answers the question from anywhere (QA review F4, F1, F3)', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  await page.getByRole('button', { name: /^Diplomacy$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Diplomacy' });
  await dialog.getByRole('tab', { name: 'Arvelia' }).click();
  const pane = dialog.getByRole('tabpanel', { name: 'Arvelia' });
  const consulate = pane.getByRole('button', { name: 'Consulate ($500)' });
  const withdraw = pane.getByRole('button', { name: 'Withdraw consulate' });
  // The overtures' own "Declare war" opens the question, so it is the one with aria-expanded
  const warOverture = pane.locator('button[aria-expanded]', { hasText: 'Declare war' });

  // F4: Enter on Consulate disables it and Chrome drops the focus to the page; Tab goes on to the next enabled control
  await page.keyboard.press('Tab');
  await expect(consulate).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(consulate).toBeDisabled();
  await page.keyboard.press('Tab');
  await expect(warOverture).toBeFocused();
  // Shift+Tab reaches Withdraw consulate above; Enter removes it; Tab goes on to Consulate, enabled again
  await page.keyboard.press('Shift+Tab');
  await expect(withdraw).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(withdraw).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(consulate).toBeFocused();

  // F1: from the war question (a focused group), Tab goes to its "Declare war", then "Keep the peace"
  await warOverture.click();
  const ask = pane.getByRole('group', { name: 'Confirm war on Arvelia' });
  await expect(ask).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(ask.getByRole('button', { name: 'Declare war' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(ask.getByRole('button', { name: 'Keep the peace' })).toBeFocused();
  // F3: on the Grant's Amount, outside the question, Escape keeps the peace and the dialog stays
  await page.keyboard.press('Tab');
  await expect(pane.getByRole('combobox', { name: 'Amount' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(ask).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(warOverture).toBeFocused();
  expect(errors).toEqual([]);
});
