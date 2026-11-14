import { test, expect, Page } from '@playwright/test';
import { statSync } from 'fs';
import { join } from 'path';

// M11 (NR-032) in the running app. FR-339 (review R1, F4, P1; replaces FR-337's numbers), the loading budget, counted on
// the page's request log: on a new continent game at 1280x720 the first paint (until the network is idle) requests at
// most 20 distinct art pack files, each URL once, adding up to at most 2,050,000 bytes (sizes read from public/ on
// disk); the map's own files and the HUD's three building pictures are among them. End Turn and closing a dialog
// request no pack file already loaded; the ground SVG is the same DOM node after End Turn (FR-321). FR-342: the pointer
// on the capital loads its civilians' figures before the tray opens, each once.
// FR-321 also: the ground fills the 1,029 x 672 px map behind the tiles at camera 0, 0, tiles have no background colour;
// FR-340 (review F1): past the map the scroller shows the ground's open-water texture, not a flat colour, at 1920x1080.
// FR-321's isolated layer (review P4): scrolling the map keeps frames near 60 a second.
// Set SCREENSHOT_DIR to also save m11-map.png and m11-map-1920.png there.

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

test('FR-339 FR-321 the first paint requests at most 20 pack files, each once, within 2.05 MB; End Turn loads none again and keeps the ground', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  const requests = collectPackRequests(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
  await picturesLoaded(page);
  await page.waitForLoadState('networkidle');

  // The budget counts every pack file the page asked for, not only the map's (review R1): a new HUD picture counts too
  const firstPaint = [...requests];
  const distinct = [...new Set(firstPaint)].sort();
  expect(firstPaint.filter((r, i) => firstPaint.indexOf(r) !== i)).toEqual([]);
  const bytes = distinct.reduce((sum, f) => sum + sizeOnDisk(f), 0);
  console.log(`FR-339 first paint: ${distinct.length} pack files, ${bytes} bytes`);
  expect(distinct.length).toBeLessThanOrEqual(20);
  expect(bytes).toBeLessThanOrEqual(2_050_000);
  // Among them the map's own files (16 on the continent: grass and open water, 7 terrain pictures, the level-1 farm,
  // orchard, plantation, forestry and mine, the coal and iron ore marks on minor land) and the HUD's three buildings
  const files = await mapFiles(page);
  expect(files.length).toBeGreaterThan(10);
  expect(files.filter((f) => !distinct.includes(f))).toEqual([]);
  expect(distinct).toEqual(expect.arrayContaining(['warehouse', 'capitol', 'railyard'].map((b) => `${PACK}buildings/${b}.png`)));
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m11-map.png` });

  // FR-342 (review P2): the pointer on the capital starts loading its seven civilians' figures before the tray opens, so
  // its buttons are not empty; opening it then asks for none of them again
  const hovered = requests.length;
  const capital = page.locator('[data-tile-id="2-9"]');
  await capital.hover({ position: { x: 6, y: 6 } });
  const figures = ['prospector', 'engineer', 'farmer', 'rancher', 'forester', 'miner', 'driller'].map((t) => `${PACK}workers/${t}.png`);
  await expect.poll(() => figures.filter((f) => requests.slice(hovered).includes(f)).sort()).toEqual([...figures].sort());
  await capital.getByTestId('worker-stack').click();
  const tray = capital.getByRole('group', { name: 'Civilians on this tile' });
  await expect(tray.locator('img[data-art^="workers/"]')).toHaveCount(7);
  await page.waitForLoadState('networkidle');
  const interaction = requests.slice(hovered);
  expect(interaction.filter((r, i) => interaction.indexOf(r) !== i)).toEqual([]);
  expect(interaction.filter((r) => distinct.includes(r))).toEqual([]);
  await page.keyboard.press('Escape');

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

test.describe('on a 1920x1080 screen', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  // Review F1: the flat colour past the map met the textured sea in a hard edge at x 1,029 and y 672
  test('FR-340 past the map the sea is the textured open water, continuing the ground\'s, not a flat colour', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    await picturesLoaded(page);
    await page.waitForLoadState('networkidle');
    const ground = (await page.getByTestId('map-ground').boundingBox())!;
    expect([ground.x, ground.y, ground.width, ground.height]).toEqual([0, 0, 1029, 672]);
    // Equal-sized patches of a flat colour are the same picture; of the texture (512 px repeat, these offsets differ
    // modulo 512) they are not. Below the map, right of it (left of the HUD), and across its bottom edge.
    const patch = (x: number, y: number) => page.screenshot({ clip: { x, y, width: 48, height: 48 } });
    const below = [await patch(300, 760), await patch(820, 905), await patch(1300, 990)];
    const right = [await patch(1100, 120), await patch(1400, 420)];
    const all = [...below, ...right];
    const same = all.flatMap((a, i) => all.slice(i + 1).filter((b) => a.equals(b)).map(() => i));
    expect(same).toEqual([]);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m11-map-1920.png` });
    expect(errors).toEqual([]);
  });
});

test.describe('on a small 800x500 screen, where the map scrolls', () => {
  test.use({ viewport: { width: 800, height: 500 } });

  // Review P4: the ground's isolation (FR-321: contain strict, will-change transform) was guarded only by its CSS text.
  // This test on the dev server, 2026-11-14: p95 16.8 ms with it, 83.3 ms with `contain: none; will-change: auto`
  // (the review measured 16.7 ms and 79 to 89 ms on average on the production build).
  test('FR-321 scrolling the map for 60 frames keeps the 95th percentile frame under 33 ms (the ground is a layer of its own)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    await picturesLoaded(page);
    await page.waitForLoadState('networkidle');
    const frames = await page.getByTestId('map-scroll').evaluate(
      (el) =>
        new Promise<number[]>((resolve) => {
          const deltas: number[] = [];
          let last = 0;
          let n = 0;
          const step = (now: number) => {
            if (last) deltas.push(now - last);
            last = now;
            // Back and forth over the whole scroll range, 8 px a frame each way
            el.scrollLeft = (n * 8) % 400;
            el.scrollTop = (n * 6) % 300;
            n++;
            if (deltas.length < 60) requestAnimationFrame(step);
            else resolve(deltas);
          };
          // Warm up a few frames first, so the measured ones are steady state
          let warm = 0;
          const warmUp = () => (++warm < 10 ? requestAnimationFrame(warmUp) : requestAnimationFrame(step));
          requestAnimationFrame(warmUp);
        })
    );
    const sorted = [...frames].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95) - 1];
    const mean = frames.reduce((s, d) => s + d, 0) / frames.length;
    console.log(`FR-321 scroll frames: mean ${mean.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms`);
    expect(p95).toBeLessThan(33);
  });
});
