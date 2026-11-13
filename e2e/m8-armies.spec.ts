import { test, expect, Page, Locator } from '@playwright/test';

// FR-214 (M8 done) in the running app, on a new game: order 1 armaments in the capital dialog and end the turn; open the
// Armoury, recruit 1 Regulars and end the turn; see the capital province marker at force size 5 and "3rd Regulars" in the
// Army screen; march it to Testland North-West, end the turn, and see the North-West marker at force size 1.
// On the way: the Armoury's cards and the reason beside a disabled "+" (FR-212), the markers as buttons named by their
// force size and militia (FR-210), the Army screen's rows, March and its status (FR-211), the news (FR-209).
// At 1280x720 the Armoury and the Army screen fit the window: neither the page nor the dialog scrolls.
// Set SCREENSHOT_DIR to also save m8-armoury.png, m8-army.png and m8-map.png there.

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
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
}

async function endTurn(page: Page, next: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
}

const capital = (page: Page) => page.getByRole('dialog', { name: /Capital/ });

async function openCapital(page: Page) {
  await page.getByRole('button', { name: /Open Capital/ }).click();
  await expect(capital(page)).toBeVisible();
}

/** The dialog lies inside the 1280x720 window, does not scroll itself, and the page does not scroll either. */
async function fitsTheWindow(page: Page, dialog: Locator) {
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  expect(await dialog.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  const page_ = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
  }));
  expect(page_.height).toBeLessThanOrEqual(page_.innerHeight);
  expect(page_.width).toBeLessThanOrEqual(page_.innerWidth);
}

test('FR-214 FR-210 FR-211 FR-212 armaments, the Armoury, the Army screen and a march to Testland North-West', async ({ page }) => {
  test.setTimeout(120000);
  const errors = collectErrors(page);
  await open(page);

  // The start army on the map (FR-203, FR-210): our marker on the capital is a button, Valdoria's an image
  const capitalMarker = page.getByRole('button', { name: 'Testland army: force size 4, 3 regiments, 4 militia' });
  await expect(capitalMarker).toBeVisible();
  await expect(page.getByRole('img', { name: 'Valdoria army: force size 4, 3 regiments, 4 militia' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Arvelia militia: 3' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Testland militia: 4' })).toHaveCount(3);

  // Turn 1: no armaments yet, so the Armoury's "+" says why (FR-212); order 1 armaments in the metal works
  await openCapital(page);
  await capital(page).getByRole('button', { name: 'Armoury' }).click();
  const armoury = page.getByRole('dialog', { name: 'Armoury' });
  await expect(armoury).toBeVisible();
  await expect(armoury.getByRole('article')).toHaveCount(7);
  const regulars = armoury.getByRole('article', { name: 'Regulars', exact: true });
  const recruitRegulars = regulars.getByRole('button', { name: 'Recruit one more Regulars' });
  await expect(recruitRegulars).toBeDisabled();
  await expect(recruitRegulars).toHaveAccessibleDescription('Not enough armaments');
  await expect(regulars.getByRole('list', { name: 'At hand' }).getByRole('listitem')).toHaveText(['4 untrained workers', /0 armaments\s*\(short\)/, '$10,000']);
  await fitsTheWindow(page, armoury);
  await page.keyboard.press('Escape');
  await expect(armoury).toHaveCount(0);
  await expect(capital(page)).toBeVisible();

  await capital(page).getByTestId('building-metalWorks').getByRole('button', { name: 'More Armaments' }).click();
  await expect(capital(page).getByTestId('building-metalWorks').getByTestId('order-armaments')).toContainText('1');
  await page.keyboard.press('Escape');
  await expect(capital(page)).toHaveCount(0);
  await endTurn(page, 2);

  // Turn 2: 1 armament in the warehouse; recruit 1 Regulars in the Armoury
  await openCapital(page);
  await capital(page).getByRole('button', { name: 'Armoury' }).click();
  await expect(armoury).toBeVisible();
  await expect(recruitRegulars).toBeEnabled();
  await recruitRegulars.click();
  await expect(regulars.getByTestId('count')).toHaveText('1');
  await expect(armoury.getByTestId('armoury-note')).toHaveText('New regiments join the army in the capital next turn.');
  // The last armament went to the Regulars: every "+" says why now
  await expect(recruitRegulars).toBeDisabled();
  await expect(regulars.getByTestId('count-note')).toHaveText('Not enough armaments');
  await fitsTheWindow(page, armoury);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m8-armoury.png` });
  await armoury.getByRole('button', { name: 'Close Armoury' }).click();
  await page.keyboard.press('Escape');
  await expect(capital(page)).toHaveCount(0);
  await endTurn(page, 3);
  await expect(page.getByTestId('news-panel')).toContainText('1 Regulars recruited.');

  // Turn 3: the capital marker at force size 5; the Army screen lists "3rd Regulars"
  const bigger = page.getByRole('button', { name: 'Testland army: force size 5, 4 regiments, 4 militia' });
  await expect(bigger).toBeVisible();
  await bigger.click();
  const army = page.getByRole('dialog', { name: 'Army in Testland South-West' });
  await expect(army).toBeVisible();
  await expect(army.getByTestId('force-size')).toHaveText('Force Size: 5');
  const third = army.getByTestId('regiment-3rd Regulars');
  await expect(third.getByTestId('category')).toHaveText('Regular Infantry');
  await expect(third.getByTestId('health')).toHaveText('100%');
  await expect(third.getByTestId('status')).toHaveText('Available');
  await expect(army.getByTestId('march-reason')).toHaveText('Tick the regiments to march first.');
  await fitsTheWindow(page, army);

  // March it to Testland North-West
  await army.getByRole('checkbox', { name: '3rd Regulars' }).check();
  await army.getByRole('combobox', { name: 'March to' }).selectOption({ label: 'Testland North-West' });
  await army.getByRole('button', { name: 'March', exact: true }).click();
  await expect(third.getByTestId('status')).toHaveText('Marching to Testland North-West');
  await expect(third.getByRole('button', { name: 'Cancel march of 3rd Regulars' })).toBeVisible();
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m8-army.png` });
  await page.keyboard.press('Escape');
  await expect(army).toHaveCount(0);
  await expect(bigger).toBeFocused();

  await endTurn(page, 4);
  await expect(page.getByTestId('news-panel')).toContainText('1 regiment marched from Testland South-West to Testland North-West.');
  // The North-West marker at force size 1, the capital's back at 4
  await expect(page.getByRole('button', { name: 'Testland army: force size 1, 1 regiment, 4 militia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Testland army: force size 4, 3 regiments, 4 militia' })).toBeVisible();
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m8-map.png` });
  expect(errors).toEqual([]);
});
