import { test, expect, Page } from '@playwright/test';

// M5 in the running app (FR-160): a new game is the continent. The map shows the 4 minor nations' names
// on their capitals (FR-153 d), the dotted province lines and the dashed minor borders (FR-153 b, c); the
// tile panel names a tile's province (FR-155: "Province: Testland South-West" for 3-9) and shows a minor's
// tile read-only; the score table lists the 2 Great Powers only (FR-156). An End Turn plays as before.
// Set SCREENSHOT_DIR to also save m5-world.png (the whole map) and m5-arvelia.png (Arvelia selected) there.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const worker = (page: Page, type: string) => page.locator(`button[data-nation-id="nation-1"][data-worker-type="${type}"]`);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

const MINOR_CAPITALS: [string, string][] = [
  ['11-1', 'Lorran'],
  ['11-4', 'Arvelia'],
  ['12-9', 'Sundmark'],
  ['12-13', 'Pellis'],
];

test('FR-160 FR-153 FR-155 FR-156 a new game shows the 4 minor nations, the provinces and 2 Great Powers in the score table', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });

  // FR-153 (d): the four names on the map, each on its minor's capital, beside the capital icon
  await expect(page.getByTestId('minor-name')).toHaveText(MINOR_CAPITALS.map(([, name]) => name));
  for (const [id, name] of MINOR_CAPITALS) {
    await expect(tile(page, id).getByTestId('minor-name')).toHaveText(name);
    await expect(tile(page, id).getByTestId('minor-name')).toBeVisible();
    await expect(tile(page, id).getByTestId('tile-icon')).toHaveAttribute('data-icon', 'GiCapitol');
    await expect(tile(page, id)).toHaveAccessibleName(`Capital, owned by ${name}`);
  }
  // FR-153 (a) to (c): 2 Great Power borders, a dotted province path per Great Power, a dashed border per minor
  await expect(page.getByTestId('territory-border')).toHaveCount(2);
  await expect(page.getByTestId('province-border')).toHaveCount(2);
  await expect(page.getByTestId('minor-border')).toHaveCount(4);
  const dashes = await page.getByTestId('minor-border').first().evaluate((el) => getComputedStyle(el).strokeDasharray);
  const dots = await page.getByTestId('province-border').first().evaluate((el) => getComputedStyle(el).strokeDasharray);
  const solid = await page.getByTestId('territory-border').first().evaluate((el) => getComputedStyle(el).strokeDasharray);
  expect(dashes).toMatch(/^5(px)?,? 3(px)?$/);
  expect(dots).toMatch(/^0(px)?,? 4(px)?$/);
  expect(solid).toBe('none');
  // FR-156: the score table holds the 2 Great Powers, no minor
  const scores = page.getByRole('table', { name: 'Scores' });
  await expect(scores.getByTestId(/^score-row-/)).toHaveCount(2);
  await expect(scores).not.toContainText(/Arvelia|Sundmark|Lorran|Pellis/);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m5-world.png` });

  // FR-155: the province of the player's farm
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  const info = page.getByTestId('tile-info');
  await expect(info.getByTestId('tile-province')).toHaveText('Province: Testland South-West');
  await expect(info.getByTestId('tile-owner')).toHaveText('Owner: Testland (you)');

  // FR-155 FR-149: with the engineer selected, a click on Arvelia's forest only selects it for viewing
  await tile(page, '2-9').getByTestId('worker-stack').click();
  await worker(page, 'engineer').click();
  await tile(page, '10-3').click({ position: { x: 6, y: 6 } });
  await expect(tile(page, '10-3')).toHaveAttribute('data-selected', 'true');
  await expect(info.getByTestId('tile-owner')).toHaveText('Owner: Arvelia (minor nation)');
  await expect(info.getByTestId('tile-province')).toHaveText('Province: Arvelia');
  await expect(info).toContainText('Terrain: Hardwood forest');
  await expect(info).toContainText('Resource: Timber (L1)');
  await expect(info.getByRole('button')).toHaveCount(0);
  await expect(tile(page, '10-3').locator('[data-worker-type]')).toHaveCount(0);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m5-arvelia.png` });

  // An End Turn plays on the continent: no refusal in the news, still 2 rows
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  await expect(page.getByTestId('news-panel')).not.toContainText('refused');
  await expect(scores.getByTestId(/^score-row-/)).toHaveCount(2);

  expect(errors).toEqual([]);
});
