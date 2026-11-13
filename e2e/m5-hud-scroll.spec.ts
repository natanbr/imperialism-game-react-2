import { test, expect, Page } from '@playwright/test';

// FR-235 (M5 QA fix round, items 1 and 2) at 1280x720, the QA screenshots' size. The HUD's content area
// (`.hud-content`) scrolls above the pinned action buttons.
// (1) Its scrollbar is the panel's own: thin and painted in the palette (thumb --color-ink-muted, track
//     --color-surface-sunken), and scrolling reaches the end of the News and the whole Debug box while the action
//     buttons stay where they are. Playwright launches Chromium with --hide-scrollbars, which hides every scrollbar
//     (the QA screenshots showed none for that reason); this file drops that flag, as a desktop browser draws them.
// (2) While more content lies below, the last pixels above the action buttons show only the panel's surface colour,
//     so no cut box edge (the Debug box's dashed top, QA screenshot m5-qa-minor-tile.png) is drawn there, and a click
//     there still reaches the content; scrolled to the end, the Debug box is whole.

test.use({ viewport: { width: 1280, height: 720 }, launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const content = (page: Page) => page.locator('.hud-content');
const ACTIONS = [/Open Warehouse/, /Open Capital/, /Open Market/, /Transportation of Commodities/, /Center/, /Advance Turn/];

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(tile(page, '11-4')).toBeVisible({ timeout: 15000 });
}

async function selectArvelia(page: Page) {
  await tile(page, '11-4').click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('tile-info').getByTestId('tile-owner')).toHaveText('Owner: Arvelia (minor nation)');
  // Off the map's edges, so edge scrolling does not move the map under the next steps
  await page.mouse.move(640, 360);
}

/** The scroll area's visible box (scrollbar excluded) and its scroll state. */
const area = (page: Page) =>
  content(page).evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      bottom: r.top + el.clientHeight,
      width: el.clientWidth,
      scrollbar: el.offsetWidth - el.clientWidth,
      scrollTop: el.scrollTop,
      maxScroll: el.scrollHeight - el.clientHeight,
    };
  });

const boxes = (page: Page) => Promise.all(ACTIONS.map((name) => page.getByRole('button', { name }).boundingBox()));

/** Scrolls the area to its end with the mouse wheel, as a player would. */
async function scrollToEnd(page: Page) {
  const before = await area(page);
  await page.mouse.move(before.left + before.width / 2, before.top + 100);
  await page.mouse.wheel(0, 4000);
  await expect.poll(async () => { const a = await area(page); return a.scrollTop >= a.maxScroll - 1; }).toBe(true);
  await page.mouse.move(640, 360);
}

/** Every pixel of a page region as [r, g, b], decoded in the page from a screenshot of that region. */
async function pixels(page: Page, clip: { x: number; y: number; width: number; height: number }): Promise<number[][]> {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const out: number[][] = [];
    for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]);
    return out;
  }, png.toString('base64'));
}

/** A colour token's value as [r, g, b] (tokens.css holds #rrggbb values). */
const token = (page: Page, name: string) =>
  page.evaluate((n) => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }, name);
const near = (a: number[], b: number[], tolerance = 3) => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);

test('FR-235 (1) the HUD content area shows a thin scrollbar in the palette, scrolls to the end, and the action buttons stay pinned', async ({ page }) => {
  test.setTimeout(90000);
  await open(page);
  // The QA turn-4 state in short: a turn of news and Arvelia's capital selected. The About panel was open on top in
  // that state; since the M6 QA fix round (FR-236) it is a modal dialog over the page, not part of the HUD's content,
  // so it is opened and closed again here and the HUD is measured without it.
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  await selectArvelia(page);
  await page.getByRole('button', { name: /About/ }).click();
  await expect(page.getByRole('dialog', { name: 'About' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'About' })).toHaveCount(0);

  const start = await area(page);
  expect(start.maxScroll, 'the content is taller than its area').toBeGreaterThan(0);
  // Thin (1 to 10 px), and painted in the palette: some thumb pixels and some track pixels in the gutter
  const gutter = start.scrollbar > 2
    ? await pixels(page, { x: Math.ceil(start.left + start.width) + 1, y: Math.ceil(start.top), width: start.scrollbar - 2, height: Math.floor(start.bottom - start.top) })
    : [];
  const thumb = await token(page, '--color-ink-muted');
  const track = await token(page, '--color-surface-sunken');
  expect({
    thin: start.scrollbar > 0 && start.scrollbar <= 10,
    thumbPainted: gutter.some((p) => near(p, thumb)),
    trackPainted: gutter.some((p) => near(p, track)),
  }).toEqual({ thin: true, thumbPainted: true, trackPainted: true });

  const pinned = await boxes(page);
  const news = page.getByTestId('news-panel');
  const debug = page.locator('.hud-debug-section');
  await expect(page.getByTestId('turn-indicator')).toBeInViewport();
  expect((await debug.boundingBox())!.y, 'the Debug box starts below the fold').toBeGreaterThan(start.bottom);

  await scrollToEnd(page);
  const end = await area(page);
  const newsBox = (await news.boundingBox())!;
  const debugBox = (await debug.boundingBox())!;
  expect({
    newsEndInside: newsBox.y + newsBox.height <= end.bottom + 0.5 && newsBox.y + newsBox.height >= end.top,
    debugInside: debugBox.y >= end.top - 0.5 && debugBox.y + debugBox.height <= end.bottom + 0.5,
  }).toEqual({ newsEndInside: true, debugInside: true });
  await expect(news).toContainText('News, turn 1');
  expect(await boxes(page), 'the action buttons did not move').toEqual(pinned);
  const advance = pinned[pinned.length - 1]!;
  expect(advance.y + advance.height).toBeLessThanOrEqual(720);
});

test('FR-235 (2) no cut box edge is drawn above the action buttons while more lies below; at the end the Debug box is whole', async ({ page }) => {
  test.setTimeout(90000);
  await open(page);
  await selectArvelia(page);
  const surface = await token(page, '--color-surface');

  const start = await area(page);
  expect(start.maxScroll, 'more lies below').toBeGreaterThan(0);
  const band = await pixels(page, { x: Math.ceil(start.left), y: Math.floor(start.bottom) - 10, width: Math.floor(start.width) - 1, height: 10 });
  const drawn = band.filter((p) => !near(p, surface));
  expect({ pixels: band.length, notSurface: drawn.length, first: drawn[0] }).toEqual({ pixels: band.length, notSurface: 0, first: undefined });
  // The fade lets clicks through to the content under it (here the Debug box)
  const hit = await content(page).evaluate((el, y) => {
    const r = el.getBoundingClientRect();
    const target = document.elementFromPoint(r.left + 40, y);
    return { own: target === el, inside: !!target && el.contains(target) };
  }, start.bottom - 5);
  expect(hit).toEqual({ own: false, inside: true });

  await scrollToEnd(page);
  const debug = (await page.locator('.hud-debug-section').boundingBox())!;
  const end = await area(page);
  expect(debug.y + debug.height).toBeLessThanOrEqual(end.bottom);
  // The box's bottom edge is drawn, not covered by the fade (dashed and anti-aliased: some pixels clearly not surface)
  const bottomEdge = await pixels(page, { x: Math.ceil(debug.x), y: Math.floor(debug.y + debug.height) - 2, width: Math.floor(debug.width) - 1, height: 3 });
  expect(bottomEdge.filter((p) => !near(p, surface, 12)).length).toBeGreaterThan(0);
});
