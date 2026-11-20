import { test, expect, Page } from './seededGame';

// FR-090 (M3.5 part B, NR-008, NR-009): on the default 1280x720 screen the whole 24x16 map shows left
// of the 250 px HUD at 42 px tiles (FR-088), every land tile shows a picture and the sea none (FR-085;
// since M11 the art pack's picture, FR-322), the About panel carries the Game Icons attribution (FR-089),
// and rail built through the UI from the capital 2-9 to a depot on 2-7 is drawn (with the pack's rail
// piece, FR-328) and the depot shows connected (with the pack's station mark, FR-324).
// Set SCREENSHOT_DIR to also save m3-5-look-map.png, -capital.png, -market.png and -zoom.png there.

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
// The player's civilians only: since M4 nation 2's stand on island 2 (FR-098).
const worker = (page: Page, type: string) => page.locator(`button[data-nation-id="nation-1"][data-worker-type="${type}"]`);
// FR-110: the civilians on the capital are one stack button that opens a tray; one alone is its own button
async function pickWorker(page: Page, type: string) {
  if ((await worker(page, type).count()) === 0) await tile(page, '2-9').getByTestId('worker-stack').click();
  await worker(page, type).click();
}
const shot = async (page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }) => {
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m3-5-look-${name}.png`, clip });
};

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function endTurn(page: Page, nextTurn: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${nextTurn} of`);
}

/**
 * FR-356: for each depot and port on a tile, the share of its drawing that boxes lie over: the civilians' buttons and
 * markers with their counts (`byCivilians`), and those with every other mark of any tile, the other station included
 * (`byAll`). depot.png draws in x 20 to 236, y 42 to 214 of its 256 px, port.png in x 20 to 236, y 39 to 218 (alpha above
 * 32); the picture covers its box (`object-fit: cover`), so it is drawn at the box's larger side, centred.
 */
const stationCover = (page: Page, id: string) =>
  tile(page, id).evaluate((tileEl) => {
    const DRAWN: Record<string, [number, number, number, number]> = {
      'infrastructure/depot.png': [20, 42, 236, 214],
      'infrastructure/port.png': [20, 39, 236, 218],
    };
    const boxes = (selector: string, except?: Element) =>
      [...document.querySelectorAll(selector)].filter((el) => !except || !except.contains(el)).map((el) => el.getBoundingClientRect());
    const civilians = '[data-testid="worker-stack"], [data-testid="worker-stack"] > span, [data-testid="worker-button"], [data-testid="worker-marker"], [data-testid="worker-marker"] > span';
    const others =
      '[data-testid="army-marker"], [data-testid="army-disband"], [data-testid="minor-name"], [data-testid="level-badge"], [data-testid="resource-mark"], ' +
      '[title$=" in progress"], [title="River"], [data-testid="fort-mark"], [role="img"][aria-label^="Depot: "], [role="img"][aria-label^="Port: "], [role="img"][aria-label^="Depot: "] img, [role="img"][aria-label^="Port: "] img';
    return [...tileEl.querySelectorAll('[role="img"][aria-label^="Depot: "], [role="img"][aria-label^="Port: "]')].map((station) => {
      const img = station.querySelector('img')!;
      const box = img.getBoundingClientRect();
      const [x0, y0, x1, y1] = DRAWN[img.getAttribute('data-art')!];
      const scale = Math.max(box.width, box.height) / 256;
      const dx = (256 * scale - box.width) / 2;
      const dy = (256 * scale - box.height) / 2;
      const d = {
        x0: Math.max(box.x, box.x + x0 * scale - dx),
        y0: Math.max(box.y, box.y + y0 * scale - dy),
        x1: Math.min(box.right, box.x + x1 * scale - dx),
        y1: Math.min(box.bottom, box.y + y1 * scale - dy),
      };
      const share = (covers: DOMRect[]) => {
        let all = 0;
        let covered = 0;
        for (let x = d.x0 + 0.125; x < d.x1; x += 0.25)
          for (let y = d.y0 + 0.125; y < d.y1; y += 0.25) {
            all++;
            if (covers.some((r) => x >= r.x && x < r.right && y >= r.y && y < r.bottom)) covered++;
          }
        return Math.round((covered / all) * 1000) / 1000;
      };
      const byCivilians = boxes(civilians);
      return { station: station.getAttribute('aria-label')!, byCivilians: share(byCivilians), byAll: share([...byCivilians, ...boxes(others, station)]) };
    });
  });

test('FR-090 the whole map fits 1280x720 next to the HUD, with an icon on every land tile and the attribution in About', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
  // FR-096 the tab title; FR-095 the tiles are named for assistive technology
  await expect(page).toHaveTitle('Imperialism');
  await expect(tile(page, '3-9')).toHaveAccessibleName('Farm, grain, level 1, owned by Testland');

  for (const id of ['0-0', '23-0', '0-15', '23-15']) {
    const box = (await tile(page, id).boundingBox())!;
    expect(box.width).toBe(42);
    expect(box.x).toBeGreaterThanOrEqual(0);
    // M12b (FR-465): the map is drawn from the 40 px top bar's bottom (was y >= 0); 40 + 672 = 712 <= 720 below
    expect(box.y).toBeGreaterThanOrEqual(40);
    expect(box.x + box.width).toBeLessThanOrEqual(1030);
    expect(box.y + box.height).toBeLessThanOrEqual(720);
  }
  const scroll = await page.getByTestId('map-scroll').evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop }));
  expect(scroll).toEqual({ x: 0, y: 0 });
  // The odd rows stay shifted half a tile
  expect((await tile(page, '0-1').boundingBox())!.x - (await tile(page, '0-0').boundingBox())!.x).toBe(21);

  // The app plays the continent (FR-144, FR-160): the two islands' 200 land tiles plus the minor nations'
  // 26 (Arvelia 12, Sundmark 5, Lorran 4, Pellis 5; FR-145)
  await expect(page.locator('[data-testid="tile"]:not([data-terrain="water"])')).toHaveCount(226);
  await expect(page.locator('[data-testid="tile"]:not([data-terrain="water"]) [data-testid="tile-icon"]')).toHaveCount(226);
  await expect(page.locator('[data-testid="tile"][data-terrain="water"] [data-testid="tile-icon"]')).toHaveCount(0);
  // FR-322 (M11): the pack's pictures, each loaded, filling the tile's 40 x 40 content box
  await expect(page.locator('[data-testid="tile"]:not([data-terrain="water"]) img[data-testid="tile-icon"][data-art]')).toHaveCount(226);
  await expect(tile(page, '2-9').getByTestId('tile-icon')).toHaveAttribute('data-art', 'terrain/capital.png');
  await expect(tile(page, '3-9').getByTestId('tile-icon')).toHaveAttribute('data-art', 'improvements/farm-1.png');
  await expect(tile(page, '5-2').getByTestId('tile-icon')).toHaveAttribute('data-art', 'terrain/barren-hills.png');
  await expect
    .poll(() => page.locator('img[data-testid="tile-icon"]').evaluateAll((imgs) => imgs.filter((i) => !(i as HTMLImageElement).complete || (i as HTMLImageElement).naturalWidth === 0).length))
    .toBe(0);
  const picture = (await tile(page, '3-9').getByTestId('tile-icon').boundingBox())!;
  const farm = (await tile(page, '3-9').boundingBox())!;
  expect([picture.x - farm.x, picture.y - farm.y, picture.width, picture.height]).toEqual([1, 1, 40, 40]);
  await expect(tile(page, '3-9').getByTestId('level-badge')).toHaveText('L1');
  // FR-341 (review F2), kept by FR-346: what lies on top at the middle of the capital's picture, and of Arvelia's (its
  // name tag, its army chip), is the picture itself, not the civilians' stack, its count or the army chip. The probe lets the pictures and
  // the name tag take the pointer for a moment (they have none), so the topmost box at that point answers.
  const onTop = (id: string) =>
    tile(page, id)
      .getByTestId('tile-icon')
      .evaluate((img) => {
        const probe = document.createElement('style');
        probe.textContent = '[data-testid="tile"] * { pointer-events: auto !important; }';
        document.head.append(probe);
        const box = img.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        probe.remove();
        return hit === img ? 'picture' : `${hit?.tagName} ${hit?.getAttribute('data-testid') ?? hit?.className}`;
      });
  expect([await onTop('2-9'), await onTop('11-4')]).toEqual(['picture', 'picture']);

  // FR-346 (QA; replaces FR-341's 24 px, at which only a small dome showed): on turn 1 every capital's picture is drawn
  // large (its drawing at least 36 px across) and the boxes lying over its drawing (civilians, their count, army chips,
  // name tags, badges, marks, of any tile) cover at most 30% of it; the civilians' button and the army chip stay 24 px,
  // named and clickable. capital.png draws in x 20 to 235, y 47 to 209 of its 256 px (alpha above 32).
  const capitals = await page.locator('[data-testid="tile"][data-terrain="capital"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-tile-id')!));
  expect(capitals).toHaveLength(6);
  for (const id of capitals) {
    const placement = await tile(page, id)
      .getByTestId('tile-icon')
      .evaluate((img) => {
        const box = img.getBoundingClientRect();
        const f = box.width / 256;
        const drawing = { x0: box.x + 20 * f, y0: box.y + 47 * f, x1: box.x + 235 * f, y1: box.y + 209 * f };
        const covers = [
          ...document.querySelectorAll(
            '[data-testid="worker-stack"], [data-testid="worker-stack"] > span, [data-testid="worker-button"], [data-testid="worker-marker"], ' +
              '[data-testid="army-marker"], [data-testid="army-disband"], [data-testid="minor-name"], [data-testid="level-badge"], ' +
              '[data-testid="resource-mark"], [role="img"][aria-label^="Depot: "], [role="img"][aria-label^="Port: "]'
          ),
        ]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.right > drawing.x0 && r.x < drawing.x1 && r.bottom > drawing.y0 && r.y < drawing.y1);
        let all = 0;
        let covered = 0;
        for (let x = drawing.x0 + 0.25; x < drawing.x1; x += 0.5)
          for (let y = drawing.y0 + 0.25; y < drawing.y1; y += 0.5) {
            all++;
            if (covers.some((r) => x >= r.x && x < r.right && y >= r.y && y < r.bottom)) covered++;
          }
        return { width: Math.round((drawing.x1 - drawing.x0) * 10) / 10, covered: Math.round((covered / all) * 1000) / 1000, top: Math.round(drawing.y0 * 10) / 10 };
      });
    console.log(`FR-346 capital ${id}: drawing ${placement.width} px across, ${Math.round(placement.covered * 100)}% covered, top at y ${placement.top}`);
    expect(placement.width, id).toBeGreaterThanOrEqual(36);
    // M12b (FR-465): the top bar covers no map: every capital's drawing starts below the bar's 40 px
    expect(placement.top, id).toBeGreaterThanOrEqual(40);
    expect(placement.covered, id).toBeLessThanOrEqual(0.3);
    const army = tile(page, id).getByTestId('army-marker').first();
    const armyBox = (await army.boundingBox())!;
    expect([armyBox.width, armyBox.height], id).toEqual([24, 24]);
    await expect(army, id).toHaveAccessibleName(/army|militia/);
  }
  // FR-388 (M12): each Great Power's capital shows its fort, 16 px, titled "Fort level 1"; its box overlaps no other mark
  // of any tile (civilians and their count, army chips, name tags, badges, marks, stations, job markers, the river)
  for (const id of ['2-9', '14-9']) {
    const fort = tile(page, id).getByTestId('fort-mark');
    await expect(fort).toHaveAttribute('title', 'Fort level 1');
    const fortBox = (await fort.boundingBox())!;
    expect([fortBox.width, fortBox.height], id).toEqual([16, 16]);
    const overlap = await fort.evaluate((mark) => {
      const r = mark.getBoundingClientRect();
      const others = [
        ...document.querySelectorAll(
          '[data-testid="worker-stack"], [data-testid="worker-stack"] > span, [data-testid="worker-button"], [data-testid="worker-marker"], ' +
            '[data-testid="army-marker"], [data-testid="army-disband"], [data-testid="minor-name"], [data-testid="level-badge"], ' +
            '[data-testid="resource-mark"], [role="img"][aria-label^="Depot: "], [role="img"][aria-label^="Port: "], [title$=" in progress"], [title="River"]'
        ),
      ].map((el) => el.getBoundingClientRect());
      return others.reduce((sum, o) => sum + Math.max(0, Math.min(r.right, o.right) - Math.max(r.x, o.x)) * Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(r.y, o.y)), 0);
    });
    expect(overlap, id).toBe(0);
  }

  // The player's own buttons on its capital take the pointer at their place (Playwright's trial click checks that nothing
  // lies over them)
  const stackButton = tile(page, '2-9').getByTestId('worker-stack');
  expect([(await stackButton.boundingBox())!.width, (await stackButton.boundingBox())!.height]).toEqual([24, 24]);
  await expect(stackButton).toHaveAccessibleName('7 civilians: choose one');
  await stackButton.click({ trial: true });
  await tile(page, '2-9').getByRole('button', { name: /^Testland army/ }).click({ trial: true });
  await shot(page, 'map');

  // FR-110 (a): the capital's seven civilians are one 24 px stack button; its tray holds a 24 px button each
  const stack = tile(page, '2-9').getByTestId('worker-stack');
  await expect(stack).toHaveAttribute('data-count', '7');
  const size = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!;
  expect((await size(stack)).width).toBeGreaterThanOrEqual(24);
  expect((await size(stack)).height).toBeGreaterThanOrEqual(24);
  await stack.click();
  const tray = tile(page, '2-9').getByRole('group', { name: 'Civilians on this tile' });
  await expect(tray.getByTestId('worker-button')).toHaveCount(7);
  for (const b of await tray.getByTestId('worker-button').all()) {
    const box = await size(b);
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24);
    // FR-325 (M11): the civilian's pack figure, 20 px, standing on the bottom of the 24 px target
    const figure = (await size(b.locator('img[data-art^="workers/"]')))!;
    expect([figure.width, figure.height]).toEqual([20, 20]);
    expect(Math.abs(box.y + box.height - 1 - (figure.y + figure.height))).toBeLessThanOrEqual(1);
  }
  await expect(tile(page, '2-9').getByTestId('selection-ring')).toBeVisible();
  // FR-326 (M11): the ring is the pack's corner brackets over the tile's outer 42 x 42 box
  const brackets = tile(page, '2-9').getByTestId('selection-ring').locator('img');
  await expect(brackets).toHaveAttribute('data-art', 'map-ui/tile-selection.svg');
  const ringBox = (await size(brackets))!;
  const capitalBox = (await size(tile(page, '2-9')))!;
  expect([ringBox.x, ringBox.y, ringBox.width, ringBox.height]).toEqual([capitalBox.x, capitalBox.y, 42, 42]);

  await page.getByRole('button', { name: /About/ }).click();
  const about = page.getByRole('dialog', { name: 'About' });
  await expect(about).toContainText('Icons by game-icons.net contributors, CC BY 3.0');
  await expect(about.getByRole('link', { name: /game-icons\.net/ })).toHaveAttribute('href', 'https://game-icons.net');
  await about.getByRole('button', { name: 'Close about' }).click();
  await expect(about).toHaveCount(0);

  await page.getByRole('button', { name: /Open Capital/ }).click();
  await expect(page.getByRole('dialog', { name: 'Capital' })).toBeVisible();
  await shot(page, 'capital');
  await page.getByRole('button', { name: 'Close capital' }).click();

  // FR-194: the continent's market is "partners", so the market dialog is the Board of Trade
  await page.getByRole('button', { name: /Open Market/ }).click();
  await expect(page.getByRole('dialog', { name: 'Board of Trade' })).toBeVisible();
  await shot(page, 'market');
  await page.getByRole('button', { name: 'Close Board of Trade' }).click();

  expect(errors).toEqual([]);
});

// Three device pixels per CSS pixel, so the zoom screenshot of a 300 px crop is sharp; the layout is the same 1280x720.
test.describe('rendered at three times the pixel density', () => {
  test.use({ deviceScaleFactor: 3 });

  test('FR-090 rail built from the capital to a depot is drawn, and the depot shows connected', async ({ page }) => {
    test.setTimeout(180000);
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    await expect(tile(page, '2-9')).toBeInViewport({ timeout: 15000 });

    // The engineer lays rail north from the capital, one tile a turn, then builds a depot on 2-7.
    for (const [i, id] of ['2-8', '2-7'].entries()) {
      await pickWorker(page, 'engineer');
      await tile(page, id).click();
      await expect(tile(page, id).getByTitle('Construction in progress')).toBeVisible();
      await endTurn(page, i + 2);
      // M12 FR-375: the news line names the province of the tile
      await expect(page.getByTestId('news-panel')).toContainText(`Rail finished at ${id} in Testland South-West.`);
    }
    await pickWorker(page, 'engineer');
    // The engineer's own tile, clicked in its free corner: the 24 px worker button covers the tile's
    // centre since FR-110, and a click on it only selects the worker again
    await tile(page, '2-7').click({ position: { x: 6, y: 6 } });
    await page.getByRole('button', { name: 'Build Depot' }).click();
    // FR-383: $2,000 asks once
    await page.getByRole('button', { name: 'Spend $2,000' }).click();
    await expect(tile(page, '2-7').getByTitle('Construction in progress')).toBeVisible();
    for (let turn = 4; turn <= 7 && !(await tile(page, '2-7').getByTitle(/^Depot: /).count()); turn++) await endTurn(page, turn);

    // FR-093: the depot names its state, not only its dot's colour
    const depot = tile(page, '2-7').getByRole('img', { name: 'Depot: connected' });
    await expect(depot).toHaveAttribute('title', 'Depot: connected');
    await expect(depot).toHaveAttribute('data-connected', 'true');
    // FR-347 (QA; replaces FR-324's 14 px with 8 px marks): the pack's depot at 20 px in the top-right corner, 1 px in, the
    // filled station mark at 11 px on its top-right, readable at 1x. FR-356 (review F1): its box cropped to the drawing's
    // 14 rows (the picture still at the 20 px scale)
    await expect(depot.locator('img').first()).toHaveAttribute('data-art', 'infrastructure/depot.png');
    await expect(depot.locator('img').nth(1)).toHaveAttribute('data-art', 'map-ui/station-connected.svg');
    const depotTile = (await tile(page, '2-7').boundingBox())!;
    const depotPicture = (await depot.locator('img').first().boundingBox())!;
    const stationMark = (await depot.locator('img').nth(1).boundingBox())!;
    expect([depotPicture.width, depotPicture.height, stationMark.width, stationMark.height]).toEqual([20, 14, 11, 11]);
    expect(await depot.locator('img').first().evaluate((img) => getComputedStyle(img).objectFit)).toBe('cover');
    expect(depotTile.x + depotTile.width - (depotPicture.x + depotPicture.width)).toBe(2); // 1 px grid line + 1 px in
    expect(depotPicture.y - depotTile.y).toBe(2);
    expect([stationMark.x + stationMark.width - (depotPicture.x + depotPicture.width), stationMark.y - depotPicture.y]).toEqual([1, -1]);
    // Clear of the level badge at the top-left: the widest badge on the map ends left of where a station begins (20 px)
    const badgeEnds = await page
      .getByTestId('level-badge')
      .evaluateAll((badges) => badges.map((b) => b.getBoundingClientRect().right - b.closest('[data-testid="tile"]')!.getBoundingClientRect().x));
    expect(Math.max(...badgeEnds)).toBeLessThan(depotPicture.x - depotTile.x);

    // FR-356 (review F1 of the QA fix round): the engineer stays on 2-7. Its 24 px button takes the content box's corner and
    // covers none of the depot's drawing (it covered 16 x 6 px of the depot's 20 px box, from y 15)
    const engineer = tile(page, '2-7').locator('button[data-worker-type="engineer"]');
    const engineerBox = (await engineer.boundingBox())!;
    expect([engineerBox.width, engineerBox.height]).toEqual([24, 24]);
    expect([depotTile.x + depotTile.width - (engineerBox.x + engineerBox.width), depotTile.y + depotTile.height - (engineerBox.y + engineerBox.height)]).toEqual([1, 1]);
    const lone = await stationCover(page, '2-7');
    console.log(`FR-356 depot alone: ${JSON.stringify(lone)}`);
    expect(lone).toEqual([{ station: 'Depot: connected', byCivilians: 0, byAll: 0 }]);

    // The engineer also builds a port on 2-7 (a depot may stand on a port, queries.ts isDepotSite): the two stand side by side
    // along the top, the depot rightmost; stacked, the port lay under the engineer's button (72% of its box)
    // With the engineer selected, a click on a tile that holds a depot is a move order (refused); so the tile first, then
    // the engineer: the tile panel offers the selected engineer's port
    if ((await engineer.getAttribute('aria-pressed')) === 'true') await engineer.click();
    await tile(page, '2-7').click({ position: { x: 6, y: 6 } });
    await expect(tile(page, '2-7')).toHaveAttribute('data-selected', 'true');
    await engineer.click();
    await expect(engineer).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tile-info').getByRole('button', { name: 'Construct Port' }).click();
    await page.getByRole('button', { name: 'Spend $3,000' }).click();
    await expect(tile(page, '2-7').getByTitle('Construction in progress')).toBeVisible();
    // Three turns to build (workerDurations.ts)
    for (let i = 0; i < 5 && !(await tile(page, '2-7').getByTitle(/^Port: /).count()); i++) {
      const now = Number(/Turn: (\d+)/.exec((await page.getByTestId('turn-indicator').textContent()) ?? '')?.[1]);
      await endTurn(page, now + 1);
    }
    const port = tile(page, '2-7').getByRole('img', { name: /^Port: / });
    await expect(port.locator('img').first()).toHaveAttribute('data-art', 'infrastructure/port.png');
    await expect(engineer).toBeVisible();
    const portPicture = (await port.locator('img').first().boundingBox())!;
    const depotNow = (await depot.locator('img').first().boundingBox())!;
    expect([portPicture.width, portPicture.height]).toEqual([20, 14]);
    expect([depotNow.x - portPicture.x, depotNow.y - portPicture.y]).toEqual([19, 0]);
    expect(portPicture.x - depotTile.x).toBe(1); // the content box's left edge: inside the tile
    const both = await stationCover(page, '2-7');
    console.log(`FR-356 depot and port: ${JSON.stringify(both)}`);
    expect(both.map((s) => s.byCivilians)).toEqual([0, 0]);
    for (const s of both) expect(s.byAll, s.station).toBeLessThanOrEqual(0.03);
    await shot(page, 'stations', { x: depotTile.x - 63, y: depotTile.y - 42, width: 168, height: 126 });
    // Nation 2 lays its own rail meanwhile (FR-102): count the player's lines only
    await expect(page.locator('[data-testid="rail-segment"][data-nation-id="nation-1"]')).toHaveCount(2);
    // FR-328 (M11): the pack's rail piece over each link, all of them (both nations')
    await expect(page.getByTestId('rail-art')).toHaveCount(await page.getByTestId('rail-segment').count());
    // FR-348 (QA): the link's line paints nothing of its own, so the piece's sleepers show (a 3 px line in the rail colour
    // filled the space between its rails); its ends stay (FR-136)
    expect(await page.getByTestId('rail-segment').evaluateAll((lines) => [...new Set(lines.map((l) => getComputedStyle(l).stroke))])).toEqual(['none']);

    // The zoom: the capital's corner of island 1, with the farm 3-9 selected
    await page.locator('[data-testid="tile"][data-tile-id="3-9"]').click({ position: { x: 4, y: 4 } });
    await expect(tile(page, '3-9')).toHaveAttribute('data-selected', 'true');
    const capital = (await tile(page, '2-9').boundingBox())!;
    await shot(page, 'zoom', { x: Math.max(0, capital.x - 90), y: Math.max(0, capital.y - 150), width: 300, height: 260 });

    expect(errors).toEqual([]);
  });
});
