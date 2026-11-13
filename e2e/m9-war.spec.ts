import { test, expect, Page, Locator } from '@playwright/test';

// FR-233 (M9 done) in the running app, on a new game: on turn 1 declare war on Arvelia and march the capital army from
// Testland South-West to Testland North-East (which borders Arvelia); on turn 2 open the Attack screen for Arvelia ("Attack
// Arvelia" in the Army screen's "March to", then "Attack…"), see the estimate and attack; on turn 3 see the Battle screen
// open by itself and, after "Skip to result", "Province Taken!" (the spec attacks again on the next turns, at most 3
// times, until it does); then see Arvelia's land as Testland's and "Colony" for Arvelia in Diplomacy.
// On the way: the red attack arrow on the map (FR-273), the Attack screen and the Battle screen fit 1280x720 without
// scrolling (FR-230, FR-231), the art pack's pictures load (FR-272), the battle's news line opens its Battle screen again
// (FR-232). Set SCREENSHOT_DIR to also save m9-attack.png, m9-arrow.png, m9-battle.png and m9-colony.png there; the
// Battle screen's shot is always attached to the test's report.

test.use({ viewport: { width: 1280, height: 720 } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function endTurn(page: Page, next: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
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

/** Every picture of the art pack in the locator has loaded (a missing file has no natural width). */
async function picturesLoaded(where: Locator) {
  const pictures = where.locator('img[src^="/assets/ink-and-wash/"]');
  expect(await pictures.count()).toBeGreaterThan(0);
  await expect
    .poll(() => pictures.evaluateAll((imgs) => imgs.filter((img) => !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalWidth === 0).length))
    .toBe(0);
}

const shot = async (page: Page, name: string) => {
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}` });
};

/** The Army screen of Testland North-East: our marker on its seat (7-3), the province's owner first. */
async function openNorthEast(page: Page) {
  await page.locator('[data-tile-id="7-3"]').getByTestId('army-marker').first().click();
  const army = page.getByRole('dialog', { name: 'Army in Testland North-East' });
  await expect(army).toBeVisible();
  return army;
}

/** Ticks every regiment that may go, picks "Attack Arvelia", opens the Attack screen, checks it and attacks. */
async function attackArvelia(page: Page, attempt: number) {
  const army = await openNorthEast(page);
  const boxes = army.getByRole('checkbox');
  const count = await boxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await boxes.nth(i).check();
  await army.getByRole('combobox', { name: 'March to' }).selectOption({ label: 'Attack Arvelia' });
  await army.getByRole('button', { name: 'Attack…' }).click();

  const attack = page.getByRole('dialog', { name: 'Attack Arvelia' });
  await expect(attack).toBeVisible();
  await expect(attack.getByRole('list', { name: 'Our regiments' }).getByRole('listitem')).toHaveCount(count);
  await expect(attack.getByRole('list', { name: 'Defenders' }).getByRole('listitem').first()).toContainText('Minutemen');
  await expect(attack.getByTestId('attack-estimate')).toHaveText(/^Our strength [\d.]+, theirs [\d.]+: (Likely victory|Uncertain|Likely defeat)$/);
  if (attempt === 1) {
    // The start army against Arvelia's three entrenched Minutemen (FR-226's example)
    await expect(attack.getByTestId('attack-estimate')).toHaveText('Our strength 36, theirs 18.8: Likely victory');
    await expect(attack.getByRole('list', { name: 'Defenders' }).getByTestId('protection')).toHaveText(['entrenched', 'entrenched', 'entrenched']);
    await picturesLoaded(attack);
    await fitsTheWindow(page, attack);
    await shot(page, 'm9-attack.png');
  }
  await attack.getByRole('button', { name: 'Attack', exact: true }).click();
  await expect(attack).toHaveCount(0);
  await expect(army.getByTestId('status').first()).toHaveText('Attacking Arvelia');
  await page.keyboard.press('Escape');
  await expect(army).toHaveCount(0);

  // FR-273: the red attack arrow on the map, named and counted
  const arrow = page.getByRole('img', { name: `Arvelia: ${count} regiment${count === 1 ? '' : 's'} attacking from Testland North-East` });
  await expect(arrow).toBeVisible();
  await expect(arrow.getByTestId('attack-count')).toHaveText(String(count));
  if (attempt === 1) await shot(page, 'm9-arrow.png');
}

test('FR-233 FR-230 FR-231 FR-232 FR-273 declare war on Arvelia, attack it, see the battle and take it as a colony', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');

  // Turn 1: declare war on Arvelia in Diplomacy (asked in place first)
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: /^Diplomacy/ });
  await expect(diplomacy).toBeVisible();
  await diplomacy.getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name: 'Arvelia', exact: true }).click();
  const arvelia = diplomacy.getByRole('tabpanel', { name: 'Arvelia', exact: true });
  await arvelia.getByRole('button', { name: 'Declare war' }).click();
  await arvelia.getByRole('group', { name: 'Confirm war on Arvelia' }).getByRole('button', { name: 'Declare war' }).click();
  await expect(arvelia.getByTestId('ordered')).toHaveText([/^Declaration of war/]);
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await expect(diplomacy).toHaveCount(0);

  // March the capital army (1st and 2nd Regulars, 1st Artillery) from South-West to North-East
  await page.getByRole('button', { name: 'Testland army: force size 4, 3 regiments, 4 militia', exact: true }).click();
  const capitalArmy = page.getByRole('dialog', { name: 'Army in Testland South-West' });
  await expect(capitalArmy).toBeVisible();
  await picturesLoaded(capitalArmy);
  for (const name of ['1st Regulars', '2nd Regulars', '1st Artillery']) await capitalArmy.getByRole('checkbox', { name }).check();
  await capitalArmy.getByRole('combobox', { name: 'March to' }).selectOption({ label: 'Testland North-East' });
  await capitalArmy.getByRole('button', { name: 'March', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(capitalArmy).toHaveCount(0);
  // GREEN means movement (FR-273): the march arrow is drawn in the pack's movement colour
  const march = page.getByRole('img', { name: 'Testland North-East: 3 regiments marching in from Testland South-West' });
  await expect(march).toBeVisible();
  await expect(march.getByTestId('march-line')).toHaveAttribute('stroke', 'var(--color-army-move)');
  await endTurn(page, 2);

  // Turn 2 on: attack Arvelia from North-East; the Battle screen opens by itself the next turn
  let taken = false;
  for (let attempt = 1; attempt <= 3 && !taken; attempt++) {
    await attackArvelia(page, attempt);
    await endTurn(page, 2 + attempt);

    const battle = page.getByRole('dialog', { name: 'Battle at Arvelia' });
    await expect(battle).toBeVisible();
    await expect(battle.getByTestId('battle-step')).toHaveText(/^Deployment: /);
    await expect(battle.getByRole('list', { name: 'Attackers: Testland' }).getByRole('listitem')).not.toHaveCount(0);
    if (attempt === 1) {
      await picturesLoaded(battle);
      await fitsTheWindow(page, battle);
    }
    // One round, then the result
    if (await battle.getByRole('button', { name: 'Next round' }).isEnabled()) {
      await battle.getByRole('button', { name: 'Next round' }).click();
      await expect(battle.getByTestId('battle-step')).toHaveText(/^(Round 1 of \d+|Result)$/);
    }
    await battle.getByRole('button', { name: 'Skip to result' }).click();
    const result = battle.getByTestId('battle-result');
    await expect(result).toHaveText(/^(Province Taken!|Attack Failed!)$/);
    await expect(battle.getByRole('list', { name: 'Casualties' }).getByRole('listitem')).not.toHaveCount(0);
    taken = (await result.innerText()) === 'Province Taken!';
    if (taken) {
      await fitsTheWindow(page, battle);
      const picture = await page.screenshot();
      await testInfo.attach('m9-battle.png', { body: picture, contentType: 'image/png' });
      await shot(page, 'm9-battle.png');
    }
    await battle.getByRole('button', { name: 'Close' }).click();
    await expect(battle).toHaveCount(0);
  }
  expect(taken, 'Arvelia taken within 3 attacks').toBe(true);

  // FR-232: the battle's news line opens its Battle screen again
  const news = page.getByTestId('news-list');
  await news.getByRole('button', { name: 'Battle at Arvelia: Province Taken!' }).click();
  const again = page.getByRole('dialog', { name: 'Battle at Arvelia' });
  await expect(again).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(again).toHaveCount(0);
  await expect(news).toContainText('Arvelia taken.');
  await expect(news).toContainText('Arvelia is now our colony.');

  // Arvelia's land is Testland's now: its capital tile names its owner, and its dashed minor border is gone
  await expect(page.locator('[data-tile-id="11-4"]')).toHaveAttribute('aria-label', /owned by Testland$/);
  await expect(page.locator('[data-testid="minor-border"][data-minor-id="minor-1"]')).toHaveCount(0);
  await shot(page, 'm9-colony.png');

  // "Colony" for Arvelia in Diplomacy
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await expect(diplomacy).toBeVisible();
  await expect(diplomacy.getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name: 'Arvelia', exact: true }).getByTestId('treaty').first()).toHaveText('Colony');
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();

  expect(errors).toEqual([]);
});
