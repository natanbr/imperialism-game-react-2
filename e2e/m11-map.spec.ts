import { test, expect, Page } from '@playwright/test';
import { statSync } from 'fs';
import { join } from 'path';

// M11 (NR-032) in the running app. FR-337, the loading budget: on a new continent game at 1280x720 the map's first paint
// requests at most 16 distinct art pack files, each URL once, adding up to at most 1,800,000 bytes (sizes read from
// public/ on disk); End Turn requests no pack file already loaded; the ground SVG is the same DOM node after End Turn
// (FR-321). The map's files are those its pictures and SVG images name; the HUD's own pictures (FR-334) are not the map's.
// FR-321 also: the ground fills the 1,029 x 672 px map behind the tiles at camera 0, 0, tiles have no background colour,
// and past the map the scroller shows the ground's deep water.
// Set SCREENSHOT_DIR to also save m11-map.png there.

const PACK = '/assets/ink-and-wash/';
const PUBLIC = join(__dirname, '..', 'public');

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Every pack URL the page requests, in order, as its path. */
function collectPackRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith(PACK)) requests.push(path);
  });
  return requests;
}

/** The pack files the map draws: its pictures' src and its SVG images' href, as paths. */
const mapFiles = (page: Page) =>
  page.getByTestId('map-scroll').evaluate((el, pack) => {
    const urls = [
      ...[...el.querySelectorAll('img')].map((img) => (img as HTMLImageElement).src),
      ...[...el.querySelectorAll('image')].map((image) => new URL(image.getAttribute('href') ?? '', location.href).href),
    ];
    return [...new Set(urls.map((u) => new URL(u).pathname).filter((p) => p.startsWith(pack)))].sort();
  }, PACK);

/** Waits until every picture on the map has loaded (complete, natural width above 0). */
const picturesLoaded = (page: Page) =>
  expect
    .poll(
      () =>
        page
          .getByTestId('map-scroll')
          .locator('img[data-art]')
          .evaluateAll((imgs) => imgs.filter((i) => !(i as HTMLImageElement).complete || (i as HTMLImageElement).naturalWidth === 0).length),
      { timeout: 15000 }
    )
    .toBe(0);

const sizeOnDisk = (path: string) => statSync(join(PUBLIC, ...path.split('/').filter(Boolean))).size;

test('FR-337 FR-321 the first paint loads at most 16 pack files, each once, within 1.8 MB; End Turn loads none again and keeps the ground', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  const requests = collectPackRequests(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
  await picturesLoaded(page);
  await page.waitForLoadState('networkidle');

  const files = await mapFiles(page);
  // Expected 16 on the continent: grass and open water, 7 terrain pictures, the level-1 farm, orchard, plantation,
  // forestry and mine, and the coal and iron ore marks on minor land
  expect(files.length).toBeGreaterThan(10);
  expect(files.length).toBeLessThanOrEqual(16);
  expect(files.filter((f) => !requests.includes(f))).toEqual([]);
  const bytes = files.reduce((sum, f) => sum + sizeOnDisk(f), 0);
  expect(bytes).toBeLessThanOrEqual(1_800_000);
  // Each pack URL once, the HUD's included
  const twice = requests.filter((r, i) => requests.indexOf(r) !== i);
  expect(twice).toEqual([]);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m11-map.png` });

  // The ground: one SVG behind the rows, 1,029 x 672 px at the map's origin, the map at camera 0, 0 (FR-088)
  const ground = page.getByTestId('map-ground');
  await expect(ground).toHaveCount(1);
  expect(await page.getByTestId('map-scroll').evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop }))).toEqual({ x: 0, y: 0 });
  const groundBox = (await ground.boundingBox())!;
  const corner = (await page.locator('[data-tile-id="0-0"]').boundingBox())!;
  expect([groundBox.x, groundBox.y, groundBox.width, groundBox.height]).toEqual([corner.x, corner.y, 1029, 672]);
  // Tiles have no colour of their own; past the map the scroller is the ground's deep water (#568392)
  const backgrounds = await page.locator('[data-testid="tile"]').evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).backgroundColor))]);
  expect(backgrounds).toEqual(['rgba(0, 0, 0, 0)']);
  expect(await page.getByTestId('map-scroll').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(86, 131, 146)');
  // A click on the ground's area reaches the tile above it
  const farm = page.locator('[data-tile-id="3-9"]');
  await farm.click({ position: { x: 6, y: 6 } });
  await expect(farm).toHaveAttribute('data-selected', 'true');

  // Mark the ground's node, then End Turn: the same node, and no pack file loaded again
  await ground.evaluate((el) => ((el as unknown as { m11Marker: string }).m11Marker = 'before End Turn'));
  const before = requests.length;
  const loaded = new Set(requests);
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of');
  await page.waitForLoadState('networkidle');
  expect(await ground.evaluate((el) => (el as unknown as { m11Marker?: string }).m11Marker)).toBe('before End Turn');
  expect(requests.slice(before).filter((r) => loaded.has(r))).toEqual([]);

  // Closing a dialog loads no pack file again either
  await page.getByRole('button', { name: /Open Capital/ }).click();
  await expect(page.getByRole('dialog', { name: 'Capital' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const opened = requests.length;
  const seen = new Set(requests);
  await page.getByRole('button', { name: 'Close capital' }).click();
  await expect(page.getByRole('dialog', { name: 'Capital' })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(requests.slice(opened).filter((r) => seen.has(r))).toEqual([]);

  expect(errors).toEqual([]);
});

test('FR-322 FR-323 FR-327 the map\'s pictures load, the minerals carry their marks, every border lies on its halo', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await picturesLoaded(page);

  // FR-322: one picture per land tile, none on the sea, below the border and rail overlay
  await expect(page.locator('[data-testid="tile"]:not([data-terrain="water"]) [data-testid="tile-icon"]')).toHaveCount(226);
  await expect(page.locator('[data-testid="tile"][data-terrain="water"] [data-testid="tile-icon"]')).toHaveCount(0);
  const stacking = await page.evaluate(() => {
    const z = (el: Element | null) => (el ? Number(getComputedStyle(el).zIndex) : NaN);
    return {
      picture: z(document.querySelector('[data-testid="tile-icon"]')),
      overlay: z(document.querySelector('[data-testid="territory-border"]')!.closest('svg')),
      ground: z(document.querySelector('[data-testid="map-ground"]')),
    };
  });
  expect(stacking).toEqual({ picture: 0, overlay: 1, ground: 0 });
  // FR-323: Arvelia's coal and iron ore hills show their goods marks; Testland's hidden coal none
  await expect(page.locator('[data-tile-id="12-3"] [data-testid="resource-mark"]')).toHaveAttribute('data-art', 'goods/coal.png');
  await expect(page.locator('[data-tile-id="12-4"] [data-testid="resource-mark"]')).toHaveAttribute('data-art', 'goods/iron-ore.png');
  await expect(page.locator('[data-tile-id="5-2"] [data-testid="resource-mark"]')).toHaveCount(0);
  const mark = (await page.locator('[data-tile-id="12-4"] [data-testid="resource-mark"]').boundingBox())!;
  const hills = (await page.locator('[data-tile-id="12-4"]').boundingBox())!;
  expect([mark.x - hills.x, hills.y + hills.height - (mark.y + mark.height), mark.width, mark.height]).toEqual([2, 2, 16, 16]);
  // FR-327: 8 lines, 8 halos
  await expect(page.getByTestId('border-halo')).toHaveCount(8);

  expect(errors).toEqual([]);
});
