import { test, expect, Page, startSeededGame } from './seededGame';

// M12 lane L3 in the running app: the dialogs say what they do and fit the window.
// FR-175 FR-410 FR-411: the first browser test of Accept Offer. The scripted Great Power proposes nothing on turn 1, so the
// offer is put into the saved game (the page's own restore, FR-359): an alliance from Valdoria made on turn 1, answered on
// turn 2. FR-407 FR-416 FR-417 FR-418 FR-422: the Diplomacy screen's new lines. FR-428: the Capital at 390x844. FR-427:
// Diplomacy at 390x844. FR-425 FR-428: the Board of Trade at 800x600 and 390x844 without a sideways scroll. FR-419 (the
// Attack screen) and FR-426 (the Capital at 800x600) measure a drawn scrollbar: e2e/m12-scrollbars.spec.ts.

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

const diplomacy = (page: Page) => page.getByRole('dialog', { name: 'Diplomacy' });
const tab = (page: Page, name: string) => diplomacy(page).getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name, exact: true });
const country = (page: Page, name: string) => diplomacy(page).getByRole('tabpanel', { name, exact: true });
async function select(page: Page, name: string) {
  await tab(page, name).click();
  await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
}

test.describe('at 1280x720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // M12 review (L3-06): FR-423's own Verify, a real double click in the browser (two clicks, a React commit between them)
  test('FR-423 a double click on Advance Turn on turn 1 ends one turn: turn 2', async ({ page }) => {
    const errors = collectErrors(page);
    await open(page);
    await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
    await page.getByRole('button', { name: /Advance Turn/ }).dblclick();
    await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
    // the lock (600 ms) has passed: still turn 2, and the button works again
    await expect(page.getByRole('button', { name: /Advance Turn/ })).not.toHaveAttribute('aria-busy', 'true');
    await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
    await endTurn(page, 3);
    expect(errors).toEqual([]);
  });

  test('FR-175 FR-410 FR-411 Accept Offer: Valdoria\'s alliance offer says what accepting does; closed, it is answered in Diplomacy and holds at End Turn', async ({ page }) => {
    test.setTimeout(90000);
    const errors = collectErrors(page);
    await open(page);
    await continueEdited(page, "game.proposals = [{ id: 'proposal-1-1', fromId: 'nation-2', toId: 'nation-1', kind: 'alliance', turn: 1 }];");

    const offer = page.getByRole('dialog', { name: 'Accept Offer' });
    await expect(offer).toBeVisible();
    await expect(offer).toContainText('Valdoria seeks to enter into an alliance with our great Empire. Do you accept their offer?');
    await expect(offer.getByTestId('offer-effect')).toHaveText('We become allies at End Turn.');
    await offer.getByRole('button', { name: 'Close offer' }).click();
    await expect(offer).toHaveCount(0);

    // FR-410: the closed offer stays answerable in Diplomacy until End Turn
    await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
    await expect(tab(page, 'Valdoria').getByTestId('offer-mark')).toHaveText('Offer');
    await select(page, 'Valdoria');
    const block = country(page, 'Valdoria').getByTestId('offer');
    await expect(block.getByTestId('offer-line')).toHaveText('Valdoria offers an alliance');
    await expect(block.getByTestId('offer-effect')).toHaveText('We become allies at End Turn.');
    await block.getByRole('button', { name: 'Accept' }).click();
    await expect(country(page, 'Valdoria').getByTestId('offer')).toHaveCount(0);
    await diplomacy(page).getByRole('button', { name: 'Close diplomacy' }).click();

    await endTurn(page, 3);
    await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
    await expect(tab(page, 'Valdoria').getByTestId('treaty')).toContainText(['Alliance']);
    expect(errors).toEqual([]);
  });

  test('FR-407 FR-416 FR-417 FR-418 FR-422 Diplomacy: the unreachable war, a line per overture, strength, the Council vote, and a grant that asks first', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();

    await select(page, 'Sundmark');
    const sundmark = country(page, 'Sundmark');
    await expect(sundmark.getByRole('button', { name: 'Declare war' })).toBeDisabled();
    await expect(sundmark.getByTestId('reason')).toContainText(['Declare war: No army can reach Sundmark over land. Commission a warship at the Shipyard.']);
    await expect(sundmark.getByTestId('overture-help')).toHaveCount(5);
    await expect(sundmark.getByTestId('council-vote')).toHaveText(/^Sundmark: \d+ with us, \d+ with Valdoria; a vote needs 50 and more than the rival$/);
    await expect(sundmark.getByRole('group', { name: 'Strength' }).getByTestId('fact')).toHaveText([/^Provinces\s*\d+$/, /^Militia\s*\d+ regiments?$/]);

    // Great Powers start with an embassy in each other (FR-151), so a grant to Valdoria may be ordered: it asks first
    await select(page, 'Valdoria');
    const valdoria = country(page, 'Valdoria');
    await expect(valdoria.getByRole('group', { name: 'Strength' }).getByTestId('fact').nth(1)).toHaveText(/about equal to ours$/);
    const grant = valdoria.getByRole('group', { name: 'Grant' });
    await grant.getByRole('button', { name: 'Give', exact: true }).click();
    const ask = grant.getByRole('group', { name: 'Confirm grant to Valdoria' });
    await expect(ask).toBeFocused();
    await expect(ask.getByTestId('grant-question')).toHaveText(/^Give \$1,000 to Valdoria\? The treasury will hold \$[\d,]+ after it\.$/);
    await ask.getByRole('button', { name: 'Keep the money' }).click();
    await expect(ask).toHaveCount(0);
    await expect(valdoria.getByTestId('ordered')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('at 800x600', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('FR-425 the Board of Trade needs no sideways scroll', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: /Open Market/ }).click();
    const board = page.getByRole('dialog', { name: 'Board of Trade' });
    await expect(board).toBeVisible();
    const sideways = await board.evaluate((el) =>
      [el, ...Array.from(el.querySelectorAll('*'))].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').length
    );
    expect(sideways).toBe(0);
    const box = (await board.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(800);
    expect(errors).toEqual([]);
  });

  // M12 review (L3-04): the Council half of FR-425 in the browser, and the keyboard reaching the result line
  test('FR-425 the Council screen shows its title and picture while Close has the focus; Tab and End scroll its body to the result', async ({ page }) => {
    test.setTimeout(120000);
    const errors = collectErrors(page);
    await startSeededGame(page);
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    const council = page.getByRole('dialog', { name: 'Council of Governors' });
    for (let turn = 1; turn <= 10; turn++) await endTurn(page, turn + 1);
    await expect(council).toBeVisible();
    const close = council.getByRole('button', { name: 'Close' });
    await expect(close).toBeFocused();
    for (const part of [council.getByRole('heading', { level: 2 }), council.locator('img').first(), close]) {
      const box = (await part.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(600);
    }
    const body = council.getByTestId('council-body');
    const overflow = await body.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow, 'the body is taller than its box at 800x600').toBeGreaterThan(0);
    await page.keyboard.press('Tab');
    await expect(body).toBeFocused();
    await page.keyboard.press('End');
    await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThanOrEqual(overflow - 1);
    const result = (await council.getByTestId('council-result').boundingBox())!;
    const seen = (await body.boundingBox())!;
    expect(result.y + result.height).toBeLessThanOrEqual(seen.y + seen.height + 0.5);
    expect(errors).toEqual([]);
  });
});

test.describe('at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** The dialog lies inside the window and the page does not scroll sideways. */
  async function inside(page: Page, name: string | RegExp) {
    const box = (await page.getByRole('dialog', { name }).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  test('FR-428 the Capital stacks its columns and keeps its close button in the window', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: /Open Capital/ }).click();
    const capital = page.getByRole('dialog', { name: /^Capital/ });
    await expect(capital).toBeVisible();
    await inside(page, /^Capital/);
    await expect(capital.getByRole('button', { name: 'Close capital' })).toBeInViewport();
    const industry = (await capital.getByRole('main', { name: 'Industry' }).boundingBox())!;
    const side = (await capital.locator('aside').first().boundingBox())!;
    expect(side.y).toBeGreaterThanOrEqual(industry.y + industry.height - 1);
    expect(errors).toEqual([]);
  });

  test('FR-427 Diplomacy stacks the country list above the details, which get at least 340 px', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
    await expect(diplomacy(page)).toBeVisible();
    await inside(page, 'Diplomacy');
    const list = (await diplomacy(page).getByRole('tablist', { name: 'Countries' }).boundingBox())!;
    const details = (await diplomacy(page).getByRole('tabpanel').boundingBox())!;
    expect(details.width).toBeGreaterThanOrEqual(340);
    expect(details.y).toBeGreaterThanOrEqual(list.y + list.height - 1);
    expect(errors).toEqual([]);
  });

  test('FR-428 the Board of Trade shows each row as a block, with no sideways scroll', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectErrors(page);
    await open(page);
    await page.getByRole('button', { name: /Open Market/ }).click();
    const board = page.getByRole('dialog', { name: 'Board of Trade' });
    await expect(board).toBeVisible();
    await inside(page, 'Board of Trade');
    // Integration: below 600 px the table head is hidden from sight but kept for screen readers (a 1 px box with
    // clip-path inset(50%), Market.module.css); it overflows its 1 px but cannot be seen or scrolled, so it is not counted
    const sideways = await board.evaluate((el) =>
      [el, ...Array.from(el.querySelectorAll('*'))].filter(
        (e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && getComputedStyle(e).clipPath !== 'inset(50%)'
      ).length
    );
    expect(sideways).toBe(0);
    expect(errors).toEqual([]);
  });
});
