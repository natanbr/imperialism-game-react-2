import { test, expect, Page, startFreshSeededGame } from './seededGame';
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
    if (path.startsWith('/assets/')) requests.push(path);
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
  }, '/assets/');

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
  await startFreshSeededGame(page);
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
  // The M15 map packs the two capital farm pictures into one measured request. Both have the original square crop.
  const atlas = '/assets/map-atlases/capital-farmland.webp';
  expect(distinct).toContain(atlas);
  const frames = await page.locator('[data-tile-id="2-10"] [data-testid="tile-icon"], [data-tile-id="3-8"] [data-testid="tile-icon"]').evaluateAll(images =>
    images.map(el => {
      const img = el as HTMLImageElement;
      return [img.dataset.art, new URL(img.currentSrc).pathname, img.naturalWidth, img.naturalHeight, getComputedStyle(img).objectFit, getComputedStyle(img).objectPosition];
    })
  );
  expect(frames).toEqual([
    ['improvements/orchard-2.png', atlas, 512, 256, 'cover', '100% 50%'],
    ['terrain/horse-ranch.png', atlas, 512, 256, 'cover', '0% 50%'],
  ]);
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

// QA fix round. FR-350: the militia's pitchfork on the army chip was a light grey smudge at 8 px (one pixel reaching 3:1
// on the chip); at least a quarter of its box's pixels SHALL reach 3:1 against the chip's surface. FR-355: the sea showed
// a brick-like grid of tile lines over the water texture; water tiles SHALL draw none, land tiles keep it (FR-087).
test("FR-350 the militia's pitchfork reads on the army chip: a quarter of its pixels at 3:1", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await picturesLoaded(page);

  // The glyph as drawn at 1x: its share of pixels at 3:1 against the chip's surface (WCAG relative luminance), read back
  // from a screenshot of it through a canvas
  const inked = async (id: string) => {
    const glyph = page.locator(`[data-tile-id="${id}"] [data-testid="army-militia"] svg`);
    const png = (await glyph.screenshot()).toString('base64');
    const surface = await page.locator(`[data-tile-id="${id}"] [data-testid="army-marker"]`).first().evaluate((el) => getComputedStyle(el).backgroundColor);
    return page.evaluate(
      async ([data, back]) => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        [canvas.width, canvas.height] = [img.width, img.height];
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, img.width, img.height).data;
        const lum = (r: number, g: number, b: number) =>
          [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const [br, bg, bb] = back.match(/\d+/g)!.map(Number);
        const backL = lum(br, bg, bb);
        let at3 = 0;
        for (let i = 0; i < px.length; i += 4) if ((backL + 0.05) / (lum(px[i], px[i + 1], px[i + 2]) + 0.05) >= 3) at3++;
        return Math.round((at3 / (px.length / 4)) * 100) / 100;
      },
      [png, surface] as const
    );
  };
  // Testland's two-line chip (8 px glyph) and Arvelia's militia-only chip (10 px)
  expect(await inked('2-9')).toBeGreaterThanOrEqual(0.25);
  expect(await inked('11-4')).toBeGreaterThanOrEqual(0.25);
  expect(errors).toEqual([]);
});

test('FR-355 the sea shows no grid line over the water texture, the land keeps it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });

  // FR-355: the same 1 px border on every tile (42 px each, FR-088), transparent on the sea
  const borders = await page.locator('[data-testid="tile"]').evaluateAll((els) => {
    const seen: Record<string, string[]> = {};
    for (const el of els) {
      const sea = ['water', 'river', 'coast'].includes(el.getAttribute('data-terrain') ?? '') ? 'sea' : 'land';
      const style = getComputedStyle(el);
      const key = `${style.borderTopWidth} ${style.borderTopColor} ${style.borderLeftColor}`;
      seen[sea] = [...new Set([...(seen[sea] ?? []), key])];
    }
    return seen;
  });
  expect(borders).toEqual({ land: ['1px rgba(59, 59, 59, 0.12) rgba(59, 59, 59, 0.12)'], sea: ['1px rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)'] });
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
    // M12 FR-367: a map smaller than its area is centred, half the spare space on each side rounded down (camera.ts
    // mapOffset): (1920 - 250 HUD - 1029) / 2 = 320 and (1080 - 672) / 2 = 204 (it was drawn at 0, 0). M12b (FR-465): the
    // area is 1040 px high under the 40 px top bar, so (1040 - 672) / 2 = 184, drawn at 40 + 184 = 224 (was 204). Every
    // patch below still lies in the sea past the map (the map spans y 224 to 896, x 320 to 1349).
    expect([ground.x, ground.y, ground.width, ground.height]).toEqual([320, 224, 1029, 672]);
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
  // Re-review D1: the first form of this test asked for a 95th percentile frame under 33 ms, which one dropped frame
  // (33.3 ms) breaks, and the default parallel run (6 workers) dropped one: p95 33.4 ms. The regression slows every frame
  // (without `contain` and `will-change`: mean 79 to 89 ms on the production build, median 150 to 167 ms here on a busy
  // machine), while load drops frames: six copies of this test at once, on a machine busy with other work, measured scroll
  // medians of 16.7 to 49.9 ms (idle frames 16.7 ms). So the median scroll frame is judged, under 60 ms.
  test('FR-321 scrolling the map for 60 frames keeps the median frame under 60 ms (the ground is a layer of its own)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
    await picturesLoaded(page);
    await page.waitForLoadState('networkidle');
    // Frames in four blocks of 30, idle (nothing changes) and scrolling (back and forth over the whole scroll range, 8 px a
    // frame), alternating, so both see the same load
    const frames = await page.getByTestId('map-scroll').evaluate(
      (el) =>
        new Promise<{ idle: number[]; scroll: number[] }>((resolve) => {
          const out = { idle: [] as number[], scroll: [] as number[] };
          const blocks: ('idle' | 'scroll')[] = ['idle', 'scroll', 'idle', 'scroll'];
          let last = 0;
          let n = 0;
          let block = 0;
          let inBlock = 0;
          const step = (now: number) => {
            const kind = blocks[block];
            if (last) out[kind].push(now - last);
            last = now;
            if (kind === 'scroll') {
              el.scrollLeft = (n * 8) % 400;
              el.scrollTop = (n * 6) % 300;
              n++;
            }
            if (++inBlock === 30) {
              block++;
              inBlock = 0;
              last = 0;
            }
            if (block < blocks.length) requestAnimationFrame(step);
            else resolve(out);
          };
          // Warm up a few frames first, so the measured ones are steady state
          let warm = 0;
          const warmUp = () => (++warm < 10 ? requestAnimationFrame(warmUp) : requestAnimationFrame(step));
          requestAnimationFrame(warmUp);
        })
    );
    const stats = (deltas: number[]) => {
      const sorted = [...deltas].sort((a, b) => a - b);
      const half = Math.floor(sorted.length / 2);
      return {
        median: sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2,
        mean: deltas.reduce((s, d) => s + d, 0) / deltas.length,
        p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
      };
    };
    const [idle, scroll] = [stats(frames.idle), stats(frames.scroll)];
    const f = (s: ReturnType<typeof stats>) => `median ${s.median.toFixed(1)} ms, mean ${s.mean.toFixed(1)} ms, p95 ${s.p95.toFixed(1)} ms`;
    console.log(`FR-321 scroll frames: ${f(scroll)}; idle frames: ${f(idle)}`);
    expect(scroll.median).toBeLessThan(60);
  });
});
