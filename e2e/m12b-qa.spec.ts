import { test, expect, Page } from './seededGame';

// M12b by-eye QA fix round (2026-11-17, docs/requirements.md FR-529 to FR-536), in the running app. Each test is the QA
// finding's own repro: the window size and the steps it names. A new game; nation 1 (Testland) has its capital at 2-9.
// FR-529 How to play fits a 640x360 window (1280x720 at 200% zoom); FR-530 the score's parts stay inside a 390 or 320 px
// window; FR-531 a keyboard focus scrolls a strip button whole into the strip; FR-532 the narrow-window line leaves the
// pane's controls free; FR-533 the news text keeps a gutter before its scrollbar; FR-535 Tab meets the bar first.
// The scrollbars are drawn, as a player sees them (Playwright's Chromium hides them by default: --hide-scrollbars), so
// FR-533 measures the gap to a real scrollbar and the pane's column is as narrow as on a player's screen.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

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
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
}

type Box = { x: number; y: number; width: number; height: number };
const inside = (box: Box, outer: Box, slack = 0.5) =>
  box.x >= outer.x - slack && box.y >= outer.y - slack && box.x + box.width <= outer.x + outer.width + slack && box.y + box.height <= outer.y + outer.height + slack;

/** The topmost element drawn at the middle of `selector`'s element lies inside it (nothing covers it). */
const onTop = (page: Page, selector: string) =>
  page.evaluate((selector) => {
    const el = document.querySelector(selector) as HTMLElement;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el.contains(hit) ? 'on top' : `covered by ${hit?.getAttribute('data-testid') ?? hit?.className ?? hit?.tagName}`;
  }, selector);

test.describe('FR-529 a browser that has not seen How to play', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // QA B12b-how-to-play-640x360: the dialog was 419 px high, from y -29 to 389, with no scroll area inside
  test('FR-529 FR-430 at 640x360 How to play lies inside the window, its title and Close in sight, Close focused; its text scrolls inside it', async ({ page }) => {
    const errors = collectErrors(page);
    const viewport = { width: 640, height: 360 };
    await page.setViewportSize(viewport);
    await page.goto('/');
    const howTo = page.getByRole('dialog', { name: 'How to play' });
    await expect(howTo).toBeVisible({ timeout: 15000 });
    const close = howTo.getByRole('button', { name: 'Close' });
    await expect(close).toBeFocused();
    const window = { x: 0, y: 0, ...viewport };
    const dialog = (await howTo.boundingBox())!;
    expect(inside(dialog, window), `the dialog ${JSON.stringify(dialog)} inside the window`).toBe(true);
    const title = howTo.getByRole('heading', { level: 2, name: 'How to play' });
    expect(inside((await title.boundingBox())!, dialog), 'the title inside the dialog').toBe(true);
    expect(inside((await close.boundingBox())!, dialog), 'Close inside the dialog').toBe(true);
    // The text scrolls: its last line can be brought into the dialog, the title and Close staying where they are
    const body = howTo.getByRole('region', { name: 'How to play text' });
    const sizes = await body.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(sizes.scroll, `the text is taller than its box at 640x360 ${JSON.stringify(sizes)}`).toBeGreaterThan(sizes.client);
    const titleBefore = (await title.boundingBox())!;
    await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const last = howTo.getByTestId('howto-first-turn').getByRole('listitem').last();
    expect(inside((await last.boundingBox())!, (await body.boundingBox())!), 'the last line inside the scrolled text').toBe(true);
    expect((await title.boundingBox())!.y).toBeCloseTo(titleBefore.y, 0);
    expect(inside((await close.boundingBox())!, window), 'Close still inside the window').toBe(true);
    await close.click();
    await expect(howTo).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

// QA B15-score-parts-popover (extra E1): at 390x844 the list opened at x 302 and ran to x 592; at 320 px it runs off too
for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  test(`FR-530 FR-404 at ${viewport.width}x${viewport.height} the score's parts lie whole inside the window, on hover and on focus`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await open(page);
    const parts = page.getByTestId('score-parts');
    await page.getByRole('button', { name: 'Stats', exact: true }).click();
    await page.getByTestId('hud-score').hover();
    await expect(parts).toBeVisible();
    const hovered = (await parts.boundingBox())!;
    expect(inside(hovered, { x: 0, y: 0, ...viewport }), `hover: ${JSON.stringify(hovered)} inside the window`).toBe(true);
    expect(hovered.x + hovered.width).toBeLessThanOrEqual(viewport.width - 8 + 0.5);
    expect(await onTop(page, '[data-testid="score-parts"]')).toBe('on top');
    await page.mouse.move(5, viewport.height - 5);
    await expect(parts).toHaveCount(0);
    await page.getByTestId('hud-score').focus();
    const focused = (await parts.boundingBox())!;
    expect(inside(focused, { x: 0, y: 0, ...viewport }), `focus: ${JSON.stringify(focused)} inside the window`).toBe(true);
    expect(errors).toEqual([]);
  });
}

// QA B16-keyboard-strip-390 (extra E4): Tab onto Center at 390x844 left it at x 228 to 260 in a strip ending at 251, the
// strip unscrolled; at 320 px Diplomacy and New game stayed cut the same way
for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  test(`FR-531 at ${viewport.width}x${viewport.height} Tab through the bar's strip: each focused button lies whole inside the strip`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await open(page);
    await page.getByRole('button', { name: 'Open Warehouse' }).focus();
    const strip = page.getByTestId('topbar-strip');
    const count = await strip.getByRole('button').count();
    expect(count).toBe(10);
    const stripBox = (await strip.boundingBox())!;
    const seen: string[] = [];
    for (let i = 0; i < count; i++) {
      if (i > 0) await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return { name: el.getAttribute('title'), box: el.getBoundingClientRect().toJSON() as Box };
      });
      seen.push(focused.name ?? '');
      expect(inside(focused.box, stripBox), `${focused.name} at ${Math.round(focused.box.x)} to ${Math.round(focused.box.x + focused.box.width)}, the strip ${Math.round(stripBox.x)} to ${Math.round(stripBox.x + stripBox.width)}`).toBe(true);
    }
    // The strip's last button is About (its title "About and credits")
    expect(seen.at(-1)).toBe('About and credits');
    // Then Advance Turn, outside the strip (card Q113), whole inside the window
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Advance Turn' })).toBeFocused();
    expect(inside((await page.getByRole('button', { name: 'Advance Turn' }).boundingBox())!, { x: 0, y: 0, ...viewport })).toBe(true);
    expect(errors).toEqual([]);
  });
}

// QA extra E3: the line (y 80 to 117, full width, z 20) lay over the pane's top: "Close tile info" was under it and a click
// there timed out at 390x844
for (const viewport of [{ width: 390, height: 844 }, { width: 640, height: 360 }]) {
  test(`FR-532 FR-429 at ${viewport.width}x${viewport.height} the narrow-window line lies beside the pane: Tile Info's heading and Close tile info stay free`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await open(page);
    const note = page.getByTestId('narrow-window');
    await expect(note).toBeVisible();
    await page.locator('[data-tile-id="2-9"]').click({ position: { x: 6, y: 6 } });
    const info = page.getByTestId('tile-info');
    await expect(info).toBeVisible();
    const noteBox = (await note.boundingBox())!;
    const pane = (await page.locator('.hud-container').boundingBox())!;
    expect(noteBox.x + noteBox.width, `the line ends at ${noteBox.x + noteBox.width}, the pane starts at ${pane.x}`).toBeLessThanOrEqual(pane.x + 0.5);
    expect(noteBox.y).toBeGreaterThanOrEqual(80 - 0.5);
    expect(await onTop(page, '[data-testid="tile-info"] .tile-info-heading')).toBe('on top');
    const close = info.getByRole('button', { name: 'Close tile info' });
    expect(await close.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    })).toBe(true);
    await close.click({ timeout: 5000 });
    await expect(info).toHaveCount(0);
    // The line is still there and still dismissable; its text whole
    await expect(note).toContainText('Imperialism is made for a window at least 1024 px wide.');
    await note.getByRole('button', { name: 'Dismiss' }).click();
    await expect(note).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

// QA extra "News text touches the news scrollbar": at 1280x720 on turn 2 the widest line ended at the scrollbar (0 px)
test('FR-533 at 1280x720 on turn 2 the news text ends at least 4 px before the news list\'s scrollbar', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await page.getByRole('button', { name: 'Advance Turn' }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 2 of 40');
  // Tile Info shrinks the list so it overflows and shows its scrollbar (as FR-268's e2e)
  await page.locator('[data-tile-id="2-9"]').click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('tile-info')).toBeVisible();
  const gap = await page.getByTestId('news-list').evaluate((list) => {
    const r = list.getBoundingClientRect();
    const scrollbarLeft = r.left + list.clientLeft + list.clientWidth;
    let widest = 0;
    for (const li of list.querySelectorAll('li')) {
      const range = document.createRange();
      range.selectNodeContents(li);
      for (const rect of range.getClientRects()) widest = Math.max(widest, rect.right);
    }
    return { overflows: list.scrollHeight > list.clientHeight, gap: scrollbarLeft - widest };
  });
  expect(gap.overflows, 'the list overflows (it has a scrollbar)').toBe(true);
  expect(gap.gap, `the widest line ends ${gap.gap} px before the scrollbar`).toBeGreaterThanOrEqual(4 - 0.5);
  expect(errors).toEqual([]);
});

// QA extra "Tab order is map, then top bar, then pane": the first Tab stops were the map's markers
test('FR-535 at 1280x720 the first Tab stop is the bar\'s first button, Advance Turn follows the bar\'s buttons, and the map comes after the bar', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  const where = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el.closest('[data-testid="topbar"]') ? 'bar' : el.closest('.hud-container') ? 'pane' : el.closest('[data-testid="map-scroll"]') || el.closest('[aria-label="Map zoom"]') ? 'map' : el.tagName;
    });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Open Warehouse' })).toBeFocused();
  // FR-568: the ten strip buttons (Stats added, the score gone), then Advance Turn: the eleventh stop
  for (let i = 0; i < 10; i++) await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Advance Turn' })).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await where()).toBe('map');
  expect(errors).toEqual([]);
});
