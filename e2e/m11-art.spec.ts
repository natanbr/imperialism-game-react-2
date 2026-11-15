import { test, expect, Page, Locator } from '@playwright/test';

// FR-338 (M11 done, NR-032; FR-090's role for the ink-and-wash look): on a new continent game at 1280x720 there is no
// console error and every pack picture (`img[data-art]`) is loaded (complete, natural width above 0) on the map, in the
// Capital dialog, the Board of Trade and the Transportation of Commodities popup; also after a rail link and a depot are
// built through the UI. Every request for a pack file (the map's SVG images included) answers without an error.
// Set SCREENSHOT_DIR to also save the five screenshots the browser QA pass reviews there: m11-art-map.png (turn 1),
// m11-art-rail-depot.png (rail and a depot built through the UI), m11-art-capital.png, m11-art-board.png and
// m11-art-transport.png.

test.use({ viewport: { width: 1280, height: 720 } });

const PACK = '/assets/ink-and-wash/';
const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
// The player's civilians only: nation 2's stand on island 2 (FR-098)
const worker = (page: Page, type: string) => page.locator(`button[data-nation-id="nation-1"][data-worker-type="${type}"]`);
// FR-110: the civilians on the capital are one stack button that opens a tray; one alone is its own button
async function pickWorker(page: Page, type: string) {
  if ((await worker(page, type).count()) === 0) await tile(page, '2-9').getByTestId('worker-stack').click();
  await worker(page, type).click();
}

/** Console errors and page errors, and every pack request that failed or answered with an error status. */
function watch(page: Page): { errors: string[]; badPack: string[] } {
  const errors: string[] = [];
  const badPack: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('response', (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith(PACK) && r.status() >= 400) badPack.push(`${r.status()} ${path}`);
  });
  page.on('requestfailed', (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith(PACK)) badPack.push(`failed ${path}`);
  });
  return { errors, badPack };
}

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
}

async function endTurn(page: Page, nextTurn: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${nextTurn} of`);
}

/** Every pack picture inside `where` is loaded (none left unloaded), and there are at least `atLeast` of them. */
async function expectLoaded(where: Locator, atLeast: number) {
  const pictures = where.locator('img[data-art]');
  await expect.poll(() => pictures.count()).toBeGreaterThanOrEqual(atLeast);
  await expect
    .poll(
      () =>
        pictures.evaluateAll((imgs) =>
          imgs.filter((img) => !((img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).map((img) => img.getAttribute('data-art'))
        ),
      { timeout: 15000 }
    )
    .toEqual([]);
}

/**
 * FR-331: a picture on a text line never pushes its label out of its box: the nearest box around each inline picture
 * (a table cell, a button, a flex line) does not overflow. The ones that do, as "file: text" (none expected). Found at
 * integration: Tailwind's preflight `img { max-width: 100% }` let a table size the Board of Trade's name column without
 * the picture, so "Canned Food" ran 14 px into its price.
 */
async function expectFit(where: Locator) {
  const overflowing = await where.locator('img[data-art-inline]').evaluateAll((imgs) =>
    imgs
      .map((img) => {
        let box = img.parentElement!;
        while (getComputedStyle(box).display === 'inline') box = box.parentElement!;
        return { art: img.getAttribute('data-art'), text: (box.textContent ?? '').trim(), over: box.scrollWidth - box.clientWidth };
      })
      .filter((b) => b.over > 0)
      .map((b) => `${b.art}: ${b.text} (${b.over} px)`)
  );
  expect(overflowing).toEqual([]);
}

const shot = async (page: Page, name: string) => {
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}` });
};

test('FR-338 a new game: every pack picture loaded on the map, in the Capital dialog, the Board of Trade and the Transport popup, no console error', async ({ page }) => {
  test.setTimeout(90000);
  const seen = watch(page);
  await open(page);

  // The map on turn 1: a picture on each of the 226 land tiles (FR-322), the marks and the civilians' figures
  const map = page.getByTestId('map-scroll');
  await expectLoaded(map, 226);
  // The HUD's buttons with a building's picture (FR-334)
  await expectFit(page.locator('body'));
  await shot(page, 'm11-art-map.png');

  await page.getByRole('button', { name: /Open Capital/ }).click();
  const capital = page.getByRole('dialog', { name: 'Capital' });
  await expect(capital).toBeVisible();
  // 7 card heads, the goods on the outputs and inputs, the Labour and Transport panels, the title and three buttons
  await expectLoaded(capital, 30);
  await expectFit(capital);
  await shot(page, 'm11-art-capital.png');
  await capital.getByRole('button', { name: 'Close capital' }).click();
  await expect(capital).toHaveCount(0);

  // FR-194: the continent's market is "partners", so the market dialog is the Board of Trade (17 rows, FR-331)
  await page.getByRole('button', { name: /Open Market/ }).click();
  const board = page.getByRole('dialog', { name: 'Board of Trade' });
  await expect(board).toBeVisible();
  await expectLoaded(board, 17);
  await expectFit(board);
  await shot(page, 'm11-art-board.png');
  await board.getByRole('button', { name: 'Close Board of Trade' }).click();
  await expect(board).toHaveCount(0);

  await page.getByRole('button', { name: /Transportation of Commodities/ }).click();
  const transport = page.getByRole('dialog', { name: 'Transportation of Commodities' });
  await expect(transport).toBeVisible();
  await expectLoaded(transport, 11);
  await expectFit(transport);
  await shot(page, 'm11-art-transport.png');
  await transport.getByRole('button', { name: 'Close transport' }).click();
  await expect(transport).toHaveCount(0);

  // The map's pictures are still loaded after the dialogs closed
  await expectLoaded(map, 226);
  expect(seen.badPack).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test('FR-338 the map after a rail link and a depot built through the UI: every pack picture loaded, no console error', async ({ page }) => {
  test.setTimeout(120000);
  const seen = watch(page);
  await open(page);

  // The engineer lays rail north from the capital, one tile a turn, then builds a depot on 2-7 (a depot may not stand next
  // to the capital, queries.ts isDepotSite), as e2e/look.spec.ts does
  for (const [i, id] of ['2-8', '2-7'].entries()) {
    await pickWorker(page, 'engineer');
    await tile(page, id).click();
    await expect(tile(page, id).getByTitle('Construction in progress')).toBeVisible();
    await endTurn(page, i + 2);
    await expect(page.getByTestId('news-panel')).toContainText(`Rail finished at ${id}.`);
  }
  await pickWorker(page, 'engineer');
  // The engineer's own tile, clicked in its free corner: the 24 px worker button covers the tile's centre (FR-110)
  await tile(page, '2-7').click({ position: { x: 6, y: 6 } });
  await page.getByRole('button', { name: 'Build Depot' }).click();
  await expect(tile(page, '2-7').getByTitle('Construction in progress')).toBeVisible();
  for (let turn = 4; turn <= 7 && !(await tile(page, '2-7').getByTitle(/^Depot: /).count()); turn++) await endTurn(page, turn);

  // The depot with its connected station mark (FR-324), the pack's rail piece over each link (FR-328)
  const depot = tile(page, '2-7').getByRole('img', { name: 'Depot: connected' });
  await expect(depot.locator('img').first()).toHaveAttribute('data-art', 'infrastructure/depot.png');
  await expect(depot.locator('img').nth(1)).toHaveAttribute('data-art', 'map-ui/station-connected.svg');
  await expect(page.locator('[data-testid="rail-segment"][data-nation-id="nation-1"]')).toHaveCount(2);
  await expect(page.getByTestId('rail-art')).toHaveCount(await page.getByTestId('rail-segment').count());

  await expectLoaded(page.getByTestId('map-scroll'), 226);
  await shot(page, 'm11-art-rail-depot.png');
  expect(seen.badPack).toEqual([]);
  expect(seen.errors).toEqual([]);
});
