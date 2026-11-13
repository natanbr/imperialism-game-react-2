import { test, expect, Page } from '@playwright/test';

// FR-180 (M6 done) in the running app, on a new game: open Diplomacy, order a consulate with Arvelia, end the turn and
// see "Consulate" and a treasury $500 lower; order an embassy, end the turn and see "Embassy"; declare war on Lorran
// (asked in place first, FR-178), end the turn and see "At war since turn 4" and the news line (FR-176). On the way:
// the HUD button opens the dialog (FR-177), an ordered overture is listed with its cost and a Withdraw button, and a
// refused control is disabled with its reason (FR-178).
// Set SCREENSHOT_DIR to also save m6-diplomacy.png (the Diplomacy screen on turn 4) there.

test.use({ viewport: { width: 1280, height: 720 } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** The HUD's "Cash: 10000" as a number. */
const cash = async (page: Page) => Number((await page.locator('.nation-stats').innerText()).replace(/[^\d-]/g, ''));
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Diplomacy' });
const country = (page: Page, name: string) => dialog(page).getByRole('region', { name });
const treaties = (page: Page, name: string) => country(page, name).getByTestId('treaty');

async function openDiplomacy(page: Page) {
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
}

/** Closes the dialog and ends the turn; waits for the next turn. */
async function endTurn(page: Page, next: number) {
  await dialog(page).getByRole('button', { name: 'Close diplomacy' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
}

test('FR-180 FR-177 FR-178 a consulate, an embassy and a war ordered in Diplomacy show up the next turn', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  const start = await cash(page);

  // Turn 1: the five countries, Valdoria first; a consulate with Arvelia, paid at once and listed with Withdraw
  await openDiplomacy(page);
  await expect(dialog(page).getByRole('region')).toHaveCount(5);
  await expect(dialog(page).getByRole('region').first()).toHaveAccessibleName('Valdoria');
  await expect(country(page, 'Arvelia').getByTestId('relation')).toHaveText('Yellow, level 4 of 9');
  await expect(treaties(page, 'Arvelia')).toHaveText(['No treaties']);
  const embassy = country(page, 'Arvelia').getByRole('button', { name: 'Embassy ($5,000)' });
  await expect(embassy).toBeDisabled();
  await expect(embassy).toHaveAccessibleDescription('we need a consulate there first');

  await country(page, 'Arvelia').getByRole('button', { name: 'Consulate ($500)' }).click();
  // toHaveText reads textContent, which has no space between the item's parts
  await expect(country(page, 'Arvelia').getByTestId('ordered')).toHaveText([/^Consulate\s*\$500\s*Withdraw$/]);
  await expect(country(page, 'Arvelia').getByRole('button', { name: 'Withdraw consulate' })).toBeEnabled();
  await expect(dialog(page).getByTestId('diplomacy-cash')).toHaveText(`Cash: $${(start - 500).toLocaleString('en-US')}`);

  await endTurn(page, 2);
  expect(await cash(page)).toBe(start - 500);
  await expect(page.getByTestId('news-panel')).toContainText('Consulate opened in Arvelia.');
  await openDiplomacy(page);
  await expect(treaties(page, 'Arvelia')).toHaveText(['Consulate']);
  await expect(country(page, 'Arvelia').getByTestId('ordered')).toHaveCount(0);

  // Turn 2: the embassy, now allowed
  await expect(embassy).toBeEnabled();
  await embassy.click();
  await endTurn(page, 3);
  await expect(page.getByTestId('news-panel')).toContainText('Embassy opened in Arvelia.');
  await openDiplomacy(page);
  await expect(treaties(page, 'Arvelia')).toHaveText(['Consulate', 'Embassy']);

  // Turn 3: war on Lorran, asked in place first
  const lorran = country(page, 'Lorran');
  await lorran.getByRole('button', { name: 'Declare war' }).click();
  const ask = lorran.getByRole('group', { name: 'Confirm war on Lorran' });
  await expect(ask.getByTestId('war-question')).toHaveText('Declare war on Lorran? The war starts next turn.');
  await ask.getByRole('button', { name: 'Declare war' }).click();
  await expect(lorran.getByTestId('ordered')).toHaveText([/^Declaration of war\s*free\s*Withdraw$/]);
  await endTurn(page, 4);
  await expect(page.getByTestId('news-panel')).toContainText('War declared on Lorran! The war starts next turn.');
  await expect(page.getByTestId('news-panel')).not.toContainText('refused');

  await openDiplomacy(page);
  await expect(treaties(page, 'Lorran')).toHaveText(['At war since turn 4']);
  await expect(country(page, 'Lorran').getByTestId('relation')).toHaveText('Dark brown, level 1 of 9');
  await expect(country(page, 'Lorran').getByRole('button', { name: 'Propose peace' })).toBeEnabled();
  await expect(treaties(page, 'Arvelia')).toHaveText(['Consulate', 'Embassy']);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m6-diplomacy.png` });

  expect(errors).toEqual([]);
});
