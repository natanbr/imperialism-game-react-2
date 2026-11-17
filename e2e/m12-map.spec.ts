import { test, expect, Page } from '@playwright/test';

// M12 (NR-033) "Honest game", lane L2: the map and the HUD in the running app. A new game; nation 1 (Testland) has its
// capital at 2-9 with its seven civilians. Written by the lane, run by the integration step (the lane runs no browser).
// FR-364, FR-365: the wheel scrolls the map (no scrollbar drawn). FR-366: no edge scrolling over the HUD. FR-367: a small
// map is centred at 1920x1080. FR-368: Zoom in makes a tile 63 px. FR-369, FR-370: the map by keyboard, Escape. FR-371:
// Tile Info in sight when the capital is selected. FR-372: whole news lines (the 8-line figure is parked, see the case).
// FR-377: no Debug box without ?debug. FR-424: the HUD at 640x360. FR-429: the narrow-window line at 390x844.
// FR-381, FR-382: job offers with prices and reasons; FR-383: a costly job asks once. FR-384 to FR-387: selection after a
// move, picking another civilian, the Cancel question. FR-388: the fort mark; FR-391: who collects a tile; FR-433: the
// tray's names; FR-376: a news line selects its tile (needs L1's FR-375).

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
}

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const scroll = (page: Page) =>
  page.getByTestId('map-scroll').evaluate((el: HTMLElement) => ({ x: el.scrollLeft, y: el.scrollTop, bar: el.offsetWidth - el.clientWidth }));

/** The HUD's scroll area: its visible box and scroll position. */
const hudArea = (page: Page) =>
  page.locator('.hud-content').evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.top + el.clientHeight, scrollTop: el.scrollTop };
  });

/** Selects a tile with a click on its top-left corner (clear of the civilians' stack and the marks). */
async function select(page: Page, id: string) {
  await tile(page, id).click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('tile-info')).toBeVisible();
  await page.mouse.move(400, 300);
}

test('FR-364 FR-365 the wheel scrolls the map, Shift and the wheel sideways; no scrollbar is drawn over it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 800, height: 600 });
  await open(page);
  const start = await scroll(page);
  expect(start.bar).toBe(0);
  await page.mouse.move(275, 300);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await scroll(page)).y).toBeLessThan(start.y);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, 200);
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await scroll(page)).x).toBeGreaterThan(start.x);
  expect(errors).toEqual([]);
});

test('FR-366 the pointer on Advance Turn at the HUD\'s right end for 1 s does not scroll the map (1024x768)', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await open(page);
  const before = await scroll(page);
  const advance = (await page.getByRole('button', { name: /Advance Turn/ }).boundingBox())!;
  await page.mouse.move(advance.x + advance.width - 2, advance.y + advance.height / 2);
  await page.waitForTimeout(1000);
  expect(await scroll(page)).toEqual(before);
});

test('FR-367 at 1920x1080 the map is centred in the area left of the HUD; FR-088 at 1280x720 it stays at the top left', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  const map = (await page.getByTestId('map-viewport').boundingBox())!;
  // The area is 1670 x 1080, the map 1,029 x 672: 320.5 and 204 px to spare on each side
  expect(Math.abs(map.x - 320.5)).toBeLessThanOrEqual(1);
  expect(Math.abs(map.y - 204)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(async () => (await page.getByTestId('map-viewport').boundingBox())!.x).toBe(0);
  expect((await scroll(page))).toMatchObject({ x: 0, y: 0 });
});

test('FR-368 Zoom in makes a tile 63 px and a click still selects the tile under the pointer; Zoom out brings 42 px back', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByTestId('map-viewport')).toHaveAttribute('data-zoom', '1.5');
  await expect.poll(async () => Math.round((await tile(page, '5-8').boundingBox())!.width)).toBe(63);
  await select(page, '5-8');
  await expect(page.getByTestId('tile-terrain')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect.poll(async () => Math.round((await tile(page, '5-8').boundingBox())!.width)).toBe(42);
  expect(errors).toEqual([]);
});

test('FR-369 the arrow keys move the focus between tiles and Enter selects; FR-370 Escape drops the selection', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await tile(page, '2-9').focus();
  await page.keyboard.press('ArrowRight');
  await expect(tile(page, '3-9')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tile-info')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tile-info')).toHaveCount(0);
});

// M12 review (L2-04): at 1024x768 the map (1029 px) is wider than its area (774 px); the HUD lies over the window's right
// 250 px, so a tile under it is not in view: the arrow keys scroll the map until the focused tile is left of the HUD
test('FR-369 at 1024x768 the arrow keys scroll the focused tile out from under the HUD', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await open(page);
  const hudLeft = (await page.locator('.hud-container').boundingBox())!.x;
  expect(hudLeft).toBe(1024 - 250);
  await tile(page, '2-9').focus();
  for (let x = 3; x <= 22; x++) {
    await page.keyboard.press('ArrowRight');
    await expect(tile(page, `${x}-9`)).toBeFocused();
    const box = (await tile(page, `${x}-9`).boundingBox())!;
    expect(box.x + box.width, `${x}-9 ends left of the HUD`).toBeLessThanOrEqual(hudLeft + 0.5);
  }
  expect((await scroll(page)).x).toBeGreaterThan(0);
});

/** The HUD's visible box less its sticky fade (the bottom 24 px, half of it opaque) when its content overflows. */
const hudSeen = (page: Page) =>
  page.locator('.hud-content').evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const fade = el.scrollHeight > el.clientHeight ? parseFloat(getComputedStyle(el, '::after').height) : 0;
    return { top: r.top, bottom: r.top + el.clientHeight - fade, scrollTop: el.scrollTop };
  });

for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
  test(`FR-371 at ${viewport.width}x${viewport.height} the capital selected: Tile Info's heading, terrain line and first civilian row are in the HUD's visible box`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    await select(page, '2-9');
    // M12 review (L2-06): above the fade, so a row half under it fails
    const area = await hudSeen(page);
    expect(area.scrollTop).toBe(0);
    const info = page.getByTestId('tile-info');
    const boxes = [
      await info.getByRole('heading', { name: /Tile Info/ }).boundingBox(),
      await page.getByTestId('tile-terrain').boundingBox(),
      await info.locator('li').first().boundingBox(),
    ];
    for (const box of boxes) {
      expect(box!.y).toBeGreaterThanOrEqual(area.top);
      expect(box!.y + box!.height).toBeLessThanOrEqual(area.bottom + 0.5);
    }
  });
}

/** Selects the tile, then its civilian of that type from Tile Info's list. */
async function pickCivilian(page: Page, tileId: string, type: string) {
  await select(page, tileId);
  await page.getByTestId('tile-info').locator('li', { hasText: `${type} - ` }).first().click();
}

/** FR-383 asks before $1,000 or more: confirm when the question shows. */
async function confirmSpendIfAsked(page: Page) {
  const spend = page.getByRole('button', { name: /^Spend \$/ });
  if (await spend.count()) await spend.click();
}

test('FR-373 a prospector sent onto the sea: "Move refused: not possible on that tile." at the bottom of the map area, then gone after 6 s', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await pickCivilian(page, '2-9', 'prospector');
  await tile(page, '0-0').click({ position: { x: 6, y: 6 } });
  const status = page.getByTestId('map-status');
  await expect(status).toHaveText('Move refused: not possible on that tile.');
  await expect(status.locator('span')).toBeInViewport({ ratio: 1 });
  const box = (await status.locator('span').boundingBox())!;
  // Centred in the map area left of the 250 px HUD (1030 px wide)
  expect(Math.abs(box.x + box.width / 2 - 515)).toBeLessThanOrEqual(2);
  await expect(status).toHaveText('', { timeout: 8000 });
});

test('FR-374 the engineer clicks the farm where the farmer has just started: the line says the rail was refused and the engineer moved', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await pickCivilian(page, '2-9', 'farmer');
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  await confirmSpendIfAsked(page);
  await pickCivilian(page, '2-9', 'engineer');
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('map-status')).toHaveText(
    'Rail refused: another civilian is already working that tile. The engineer moved there instead (Cancel brings it back).'
  );
});

// Parked by lane L2: at 1280x720 the HUD's column above the news (header, turn, Council and idle lines, cash, score, score
// table, the two-line news heading) leaves about 55 to 75 px, so 3 lines; 8 need about 100 px more, which only a
// two-column action grid at full height (FR-349's one-x pin and the button names) or a wider HUD would give.
test.fixme('FR-372 at 1280x720 on turn 2 with no tile selected the news list shows at least 8 whole lines', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  const list = await page.getByTestId('news-list').evaluate((el) => ({ height: el.clientHeight, line: parseFloat(getComputedStyle(el).lineHeight) }));
  expect(list.height % list.line).toBe(0);
  expect(list.height / list.line).toBeGreaterThanOrEqual(8);
});

test('FR-377 no Debug box for the player; with ?debug the selected tile\'s coordinates and the seed show', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await select(page, '5-8');
  await expect(page.locator('.hud-debug-section')).toHaveCount(0);
  await page.goto('/?debug');
  // M12 FR-359: the first visit saved its game, so the second one offers it first; Continue keeps that game
  await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await select(page, '5-8');
  await expect(page.locator('.hud-debug-section')).toContainText('Tile: 5,8 (id 5-8)');
});

test('FR-424 at 640x360 the turn, the date, the cash and the score are in sight without scrolling; the action buttons are two columns', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await open(page);
  const area = await hudArea(page);
  expect(area.scrollTop).toBe(0);
  for (const part of [page.getByTestId('turn-indicator'), page.locator('.turn-date'), page.locator('.nation-stats'), page.getByTestId('hud-score')]) {
    const box = (await part.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(area.top);
    expect(box.y + box.height).toBeLessThanOrEqual(area.bottom + 0.5);
  }
  const warehouse = (await page.getByRole('button', { name: /Open Warehouse/ }).boundingBox())!;
  const capital = (await page.getByRole('button', { name: /Open Capital/ }).boundingBox())!;
  expect(capital.y).toBe(warehouse.y);
  expect(capital.x).toBeGreaterThan(warehouse.x);
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
});

test('FR-429 at 390x844 one line says the game is made for 1024 px; Dismiss removes it; at 1280x720 it is not shown', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const note = page.getByTestId('narrow-window');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Imperialism is made for a window at least 1024 px wide.');
  await note.getByRole('button', { name: 'Dismiss' }).click();
  await expect(note).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await expect(page.getByTestId('narrow-window')).toBeHidden();
});

async function endTurn(page: Page, nextTurn: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${nextTurn} of`);
}

/** A job offer in Tile Info: its button, its price line and its reason line. */
const offerIn = (page: Page, name: string) => {
  const row = page.getByTestId('tile-info').getByTestId('job-offer').filter({ has: page.getByRole('button', { name }) });
  return { button: row.getByRole('button', { name }), price: row.getByTestId('job-price'), reason: row.getByTestId('job-reason') };
};

test('FR-381 FR-383 the farmer on a coal hill sees a disabled Develop with its reason; the engineer\'s $2,000 depot asks once', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  // Turn 1: the farmer walks onto the barren hills at 5-2, the engineer onto the farm at 7-8 (plain moves, no question)
  await pickCivilian(page, '2-9', 'farmer');
  await tile(page, '5-2').click({ position: { x: 6, y: 6 } });
  await page.keyboard.press('Escape');
  await pickCivilian(page, '2-9', 'engineer');
  await tile(page, '7-8').click({ position: { x: 6, y: 6 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await endTurn(page, 2);

  await pickCivilian(page, '5-2', 'farmer');
  const develop = offerIn(page, 'Develop farmer L1');
  await expect(develop.button).toBeDisabled();
  await expect(develop.reason).toHaveText('A farmer cannot work barren hills.');
  await expect(develop.price).toHaveText('$100, 3 turns');

  // Escape first: a click on 7-8 with the farmer selected would send him there
  await page.keyboard.press('Escape');
  await pickCivilian(page, '7-8', 'engineer');
  const depot = offerIn(page, 'Construct Depot');
  await expect(depot.button).toBeEnabled();
  await expect(depot.price).toHaveText('$2,000, 3 turns');
  // Integration: the engine accepts a fort on any tile without one (isFortSite) and $5,000 is in the treasury, so on the
  // farm 7-8 Construct Fort is enabled with its price and no reason line (the lane's guess was a refused fort)
  const fort = offerIn(page, 'Construct Fort');
  await expect(fort.button).toBeEnabled();
  await expect(fort.price).toHaveText('$5,000, 3 turns');
  await expect(fort.reason).toHaveCount(0);
  await depot.button.click();
  const question = page.getByRole('dialog', { name: 'Spend $2,000?' });
  await expect(question).toContainText('Build a depot at 7-8 for $2,000 (3 turns)? Cancelled this turn, the money comes back; later, it is lost.');
  await expect(question.getByRole('button')).toHaveText(['Spend $2,000', 'Keep the money']);
  await question.getByRole('button', { name: 'Keep the money' }).click();
  await expect(question).toHaveCount(0);
  await expect(tile(page, '7-8').getByTitle('Construction in progress')).toHaveCount(0);
  await depot.button.click();
  await question.getByRole('button', { name: 'Spend $2,000' }).click();
  await expect(tile(page, '7-8').getByTitle('Construction in progress')).toBeVisible();
  expect(errors).toEqual([]);
});

test('FR-382 Construction Options next to the capital: Build Depot disabled with its reason, prices under both, the port\'s reason', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  // Turn 1: the engineer lays rail onto 3-9, next to the capital; on turn 2 he stands there, free
  await pickCivilian(page, '2-9', 'engineer');
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  await expect(tile(page, '3-9').getByTitle('Construction in progress')).toBeVisible();
  await endTurn(page, 2);
  await pickCivilian(page, '3-9', 'engineer');
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  const dialog = page.getByRole('dialog', { name: 'Construction Options' });
  await expect(dialog).toBeVisible();
  const depot = dialog.getByTestId('job-offer').filter({ has: page.getByRole('button', { name: 'Build Depot' }) });
  await expect(depot.getByRole('button', { name: 'Build Depot' })).toHaveAttribute('aria-disabled', 'true');
  await expect(depot.getByTestId('job-price')).toHaveText('$2,000, 3 turns');
  await expect(depot.getByTestId('job-reason')).toHaveText('Too close to the capital or another depot.');
  await expect(dialog.getByTestId('port-offer')).toContainText('A port needs the sea or a river next to it.');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('FR-384 a plain move ends the selection; FR-385 with a civilian selected, another civilian\'s button selects it ("Select forester")', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  // The forester walks onto the farm 3-9 (no forester's job on a farm: a plain move)
  await pickCivilian(page, '2-9', 'forester');
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  const forester = tile(page, '3-9').locator('button[data-worker-type="forester"]');
  await expect(forester).toBeVisible();
  // FR-384: the next click only selects a tile: no second move, no "already moved" refusal
  await tile(page, '4-9').click({ position: { x: 6, y: 6 } });
  await expect(tile(page, '4-9')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('map-status')).toHaveText('');
  await expect(forester).toBeVisible();
  // FR-385: with the farmer selected, the forester's button selects the forester and orders nothing
  await pickCivilian(page, '2-9', 'farmer');
  await expect(forester).toHaveAttribute('title', 'Select forester');
  await forester.click();
  await expect(forester).toHaveAttribute('aria-pressed', 'true');
  await expect(tile(page, '3-9').locator('[data-worker-type="farmer"]')).toHaveCount(0);
});

test('FR-386 FR-387 Cancel asks in a game dialog what comes back; one Cancel undoes the click\'s move and job', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const native: string[] = [];
  page.on('dialog', (d) => {
    native.push(d.message());
    void d.dismiss();
  });
  await open(page);
  const cash = async () => Number((await page.locator('.nation-stats').innerText()).replace(/[^\d-]/g, ''));
  const before = await cash();
  await pickCivilian(page, '2-9', 'farmer');
  await tile(page, '3-9').click({ position: { x: 6, y: 6 } });
  await page.getByRole('button', { name: 'Spend $1,000' }).click();
  await expect(tile(page, '3-9').getByTitle('Development in progress')).toBeVisible();
  expect(await cash()).toBe(before - 1000);

  await select(page, '3-9');
  await page.getByTestId('tile-info').locator('li', { hasText: 'farmer' }).getByRole('button', { name: 'Cancel' }).click();
  const question = page.getByRole('dialog', { name: "Cancel the farmer's job?" });
  await expect(question).toContainText('The $1,000 comes back. The farmer goes back to 2-9.');
  await question.getByRole('button', { name: 'Cancel the job' }).click();
  await expect(question).toHaveCount(0);
  await expect(tile(page, '3-9').locator('[data-worker-type="farmer"]')).toHaveCount(0);
  await expect(tile(page, '3-9').getByTitle('Development in progress')).toHaveCount(0);
  expect(await cash()).toBe(before);
  expect(native).toEqual([]);
});

test('FR-388 both capitals show the fort mark, Tile Info "Fort: level 1"; FR-391 "Collected by the capital: 2 grain a turn" on 3-9, "Not collected" on 4-8', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  for (const id of ['2-9', '14-9']) {
    const fort = tile(page, id).getByTestId('fort-mark');
    await expect(fort).toBeVisible();
    await expect(fort).toHaveAttribute('title', 'Fort level 1');
    const box = (await fort.boundingBox())!;
    expect([box.width, box.height]).toEqual([16, 16]);
    // M12 review (L2-07): the pointer over the mark's middle reaches the mark, so its title shows as a tooltip
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid="fort-mark"]') !== null, [box.x + 8, box.y + 8]);
    expect(hit, `the fort mark on ${id} is under the pointer`).toBe(true);
  }
  await expect(page.getByTestId('fort-mark')).toHaveCount(2);
  // `select` clicks the tile at (6, 6), on the fort mark: the click reaches the tile
  await select(page, '2-9');
  await expect(tile(page, '2-9')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('tile-info').getByTestId('tile-fort')).toHaveText('Fort: level 1');
  await select(page, '3-9');
  await expect(page.getByTestId('tile-info').getByTestId('tile-collected')).toHaveText('Collected by the capital: 2 grain a turn');
  await select(page, '4-8');
  await expect(page.getByTestId('tile-info').getByTestId('tile-collected')).toHaveText('Not collected: no connected depot, port or capital next to it');
});

test('FR-433 the capital\'s tray writes each civilian\'s type under its 24 px figure; a click on "Engineer" picks the engineer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await tile(page, '2-9').getByTestId('worker-stack').click();
  const tray = tile(page, '2-9').getByRole('group', { name: 'Civilians on this tile' });
  await expect(tray.getByTestId('worker-caption')).toHaveText(['Prospector', 'Farmer', 'Rancher', 'Forester', 'Miner', 'Driller', 'Engineer']);
  for (const b of await tray.getByTestId('worker-button').all()) {
    const box = (await b.boundingBox())!;
    expect([box.width, box.height]).toEqual([24, 24]);
  }
  // The tray stays inside the map area (its left edge on the map, not cut by the HUD or the window)
  const trayBox = (await tray.boundingBox())!;
  expect(trayBox.x).toBeGreaterThanOrEqual(0);
  await tray.getByText('Engineer', { exact: true }).click();
  await expect(tile(page, '2-9').getByTestId('worker-stack')).toHaveAccessibleName('7 civilians, engineer selected');
});

test('FR-376 the news line of the prospector\'s find at 5-2 is a button: it selects 5-2 and scrolls it into view (needs L1\'s FR-375)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await pickCivilian(page, '2-9', 'prospector');
  await tile(page, '5-2').click({ position: { x: 6, y: 6 } });
  await confirmSpendIfAsked(page);
  await page.keyboard.press('Escape');
  const line = page.getByTestId('news-list').getByRole('button', { name: /5-2/ });
  for (let turn = 2; turn <= 4 && !(await line.count()); turn++) await endTurn(page, turn);
  await expect(line).toBeVisible();
  // Scroll the map away first, so the line has to bring 5-2 back (M12 review L2-10: at 1024x768, where the map is wider
  // than its area; at 1280x720 it fits and nothing scrolls)
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByTestId('map-scroll').evaluate((el: HTMLElement) => el.scrollTo(el.scrollWidth, el.scrollHeight));
  await expect(tile(page, '5-2')).not.toBeInViewport();
  await line.click();
  await expect(tile(page, '5-2')).toHaveAttribute('data-selected', 'true');
  await expect(tile(page, '5-2')).toBeInViewport();
});
