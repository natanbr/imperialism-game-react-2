import { test, expect, Page } from '@playwright/test';

// M12b (NR-034) "better HUD" in the running app (docs/specs/hud.md; the file keeps the name the spec gave it although the
// milestone is M12b). A new game; nation 1 (Testland) has its capital at 2-9.
// FR-465, FR-467: the top bar spans the window's top, one 40 px row from 1024 px of width, two rows (80 px) below; every
// part lies inside the window, the bar and the page never scroll sideways, every button can be reached. FR-466, FR-467
// (Nathan, card Q113): exactly one Advance Turn, always inside the window with no scrolling of the page, the pane or the
// bar, on turn 1 and once the news list holds more than its box. FR-468: from 1800 px (T2's measured breakpoint, see
// docs/requirements.md FR-468) the labels show beside the icons inside the bar. FR-473: the groups open and close by
// mouse and keyboard, stay open across End Turn, and a reload closes them. FR-465, FR-088: at 1280x720 the map sits at
// camera 0, 0 under the bar and cannot scroll. FR-480: New game's question opens under the bar, above the map and pane.
// Set SCREENSHOT_DIR to also save m13-hud-<width>x<height>.png there; each shot is attached to the test's report.

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

const advance = (page: Page) => page.getByRole('button', { name: 'Advance Turn' });

async function endTurn(page: Page, next: number) {
  await advance(page).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
}

type Box = { x: number; y: number; width: number; height: number };
const inside = (box: Box, outer: Box, slack = 0.5) =>
  box.x >= outer.x - slack && box.y >= outer.y - slack && box.x + box.width <= outer.x + outer.width + slack && box.y + box.height <= outer.y + outer.height + slack;

/** Every scroll position a player could have moved: the page, the right pane, the bar's button strip. */
const scrolls = (page: Page) =>
  page.evaluate(() => {
    const el = (selector: string) => document.querySelector(selector) as HTMLElement;
    const root = document.scrollingElement as HTMLElement;
    return {
      pageX: root.scrollLeft,
      pageY: root.scrollTop,
      pageWide: root.scrollWidth - window.innerWidth,
      pane: el('.hud-content').scrollTop,
      strip: el('[data-testid="topbar-strip"]').scrollLeft,
    };
  });

/** Advance Turn: the only one on the page, its whole box inside the window and the bar, the page, pane and bar unscrolled. */
async function advanceInSight(page: Page, viewport: { width: number; height: number }, when: string) {
  await expect(advance(page), when).toHaveCount(1);
  const box = (await advance(page).boundingBox())!;
  const bar = (await page.getByTestId('topbar').boundingBox())!;
  expect(inside(box, { x: 0, y: 0, ...viewport }), `${when}: Advance Turn ${JSON.stringify(box)} inside the window`).toBe(true);
  expect(inside(box, bar), `${when}: inside the top bar`).toBe(true);
  expect(await scrolls(page), when).toEqual({ pageX: 0, pageY: 0, pageWide: 0, pane: 0, strip: 0 });
}

const ONE_ROW = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
];
const TWO_ROWS = [
  { width: 800, height: 600 },
  { width: 640, height: 360 },
  { width: 390, height: 844 },
];

for (const viewport of [...ONE_ROW, ...TWO_ROWS]) {
  const rows = viewport.width >= 1024 ? 1 : 2;
  test(`FR-465 FR-466 FR-467 at ${viewport.width}x${viewport.height} the top bar is ${rows === 1 ? 'one 40 px row' : 'two 40 px rows'} inside the window, the turn, date, cash and score in sight, one Advance Turn, no sideways scroll`, async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await open(page);
    const window_ = { x: 0, y: 0, ...viewport };
    const bar = page.getByTestId('topbar');
    const barBox = (await bar.boundingBox())!;
    expect([barBox.x, barBox.y, barBox.width, barBox.height]).toEqual([0, 0, viewport.width, 40 * rows]);
    // The pane starts under the bar (FR-465)
    const pane = (await page.locator('.hud-container').boundingBox())!;
    expect([pane.x, pane.y, pane.width, pane.height]).toEqual([viewport.width - 250, 40 * rows, 250, viewport.height - 40 * rows]);

    for (const part of [page.getByTestId('turn-indicator'), page.locator('.turn-date'), page.locator('.nation-stats'), page.getByTestId('hud-score')]) {
      const box = (await part.boundingBox())!;
      expect(inside(box, window_), `${await part.innerText()} inside the window`).toBe(true);
      expect(inside(box, barBox), 'inside the bar').toBe(true);
    }
    await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
    await expect(page.getByTestId('hud-score')).toContainText(/Score: \d+/);
    await advanceInSight(page, viewport, 'turn 1');

    if (rows === 1) {
      // One row: nothing in the bar overflows it or the window
      expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const outside = await bar.evaluate((el, w) => {
        const out: string[] = [];
        for (const child of el.querySelectorAll('*')) {
          const r = child.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (r.left < -0.5 || r.right > w + 0.5 || r.top < -0.5 || r.bottom > 40.5) out.push(`${child.tagName}.${child.className} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        return out;
      }, viewport.width);
      expect(outside).toEqual([]);
    } else {
      // Two rows: the status blocks, then the buttons; every button of the strip can be scrolled to and lies inside the
      // window there, and Advance Turn stays in sight at the right whatever the strip's scroll
      const status = (await page.getByTestId('topbar-status').boundingBox())!;
      const actions = (await page.getByTestId('topbar-actions').boundingBox())!;
      expect([status.y, status.height, actions.y, actions.height]).toEqual([0, 40, 40, 40]);
      const strip = page.getByTestId('topbar-strip');
      const stripBox = (await strip.boundingBox())!;
      const buttons = strip.getByRole('button');
      const names = await buttons.evaluateAll((els) => els.map((el) => el.getAttribute('title')));
      expect(names.length).toBeGreaterThanOrEqual(9);
      for (let i = 0; i < names.length; i++) {
        const button = buttons.nth(i);
        await button.scrollIntoViewIfNeeded();
        const box = (await button.boundingBox())!;
        expect(inside(box, stripBox), `${names[i]} reached inside the strip`).toBe(true);
        expect(inside(box, window_), `${names[i]} inside the window`).toBe(true);
        expect(inside((await advance(page).boundingBox())!, window_), `Advance Turn in sight with ${names[i]} scrolled to`).toBe(true);
      }
      await strip.evaluate((el) => el.scrollTo(0, 0));
    }

    if (viewport.width >= 1800) {
      // FR-468: the labels show beside the icons, inside the bar
      const labels = await bar.locator('.topbar-label').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as Box));
      expect(labels.length).toBeGreaterThanOrEqual(9);
      for (const label of labels) {
        expect(label.width).toBeGreaterThan(1);
        expect(inside(label, barBox)).toBe(true);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    const shot = await page.screenshot();
    await testInfo.attach(`m13-hud-${viewport.width}x${viewport.height}.png`, { body: shot, contentType: 'image/png' });
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m13-hud-${viewport.width}x${viewport.height}.png` });
    expect(errors).toEqual([]);
  });
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 800, height: 600 }, { width: 390, height: 844 }]) {
  test(`FR-467 at ${viewport.width}x${viewport.height} the one Advance Turn stays inside the window, unscrolled, on turn 1 and once the news list is longer than its box`, async ({ page }) => {
    test.setTimeout(90000);
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await open(page);
    await advanceInSight(page, viewport, 'turn 1');
    // Read at once (a locator would wait for a list that turn 1 does not have yet)
    const overflows = () =>
      page.evaluate(() => {
        const list = document.querySelector('[data-testid="news-list"]');
        return !!list && list.scrollHeight > list.clientHeight;
      });
    let turn = 1;
    while (!(await overflows()) && turn < 8) await endTurn(page, ++turn);
    expect(await overflows(), `the news list is longer than its box by turn ${turn}`).toBe(true);
    await advanceInSight(page, viewport, `turn ${turn}, a long news list`);
    expect(errors).toEqual([]);
  });
}

test('FR-473 the groups: closed on load, a click and Enter and Space toggle one, the focus stays, open across End Turn, closed after a reload', async ({ page }) => {
  test.setTimeout(60000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  const nation = page.getByRole('button', { name: 'Nation', exact: true });
  const work = page.getByRole('button', { name: /^Work in progress \(\d+\)$/ });
  const details = page.getByRole('button', { name: 'Details for bug reports', exact: true });
  for (const button of [nation, work, details]) {
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    const panel = page.locator(`[id="${await button.getAttribute('aria-controls')}"]`);
    await expect(panel).toBeHidden();
    await expect(panel).toHaveAttribute('role', 'region');
  }
  // Each is a level-3 heading's button (WAI-ARIA accordion)
  await expect(page.getByRole('heading', { level: 3, name: 'Nation' })).toBeVisible();

  // Mouse: open and close Nation
  await nation.click();
  await expect(nation).toHaveAttribute('aria-expanded', 'true');
  const nationPanel = page.getByRole('region', { name: 'Nation' });
  await expect(nationPanel).toBeVisible();
  await expect(nationPanel.getByRole('table', { name: 'Scores' })).toBeVisible();
  await nation.click();
  await expect(nation).toHaveAttribute('aria-expanded', 'false');
  await expect(nationPanel).toBeHidden();

  // Keyboard: Tab from Nation skips its closed panel and reaches Work in progress; Enter opens it, Space closes it, and
  // the focus stays on the button
  await nation.focus();
  await page.keyboard.press('Tab');
  await expect(work).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(work).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: /^Work in progress/ })).toBeVisible();
  await expect(work).toBeFocused();
  await page.keyboard.press('Space');
  await expect(work).toHaveAttribute('aria-expanded', 'false');
  await expect(work).toBeFocused();
  await details.focus();
  await page.keyboard.press('Space');
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Details for bug reports' })).toContainText(/Seed: \d+/);

  // The open state lasts for the page session: End Turn keeps Details open
  await endTurn(page, 2);
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Details for bug reports' })).toContainText('Turn: 2');

  // It is never saved: a reload closes every group (the saved game is offered first, FR-359)
  await page.reload();
  await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  for (const button of [nation, work, details]) await expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});

test('FR-465 FR-088 at 1280x720 the whole map lies under the bar at camera 0, 0, and the wheel cannot scroll it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  const scroll = () => page.getByTestId('map-scroll').evaluate((el: HTMLElement) => ({ x: el.scrollLeft, y: el.scrollTop }));
  expect(await scroll()).toEqual({ x: 0, y: 0 });
  // The ground is the map's own 1,029 x 672 box (the viewport element spans the scroller's width)
  const map = (await page.getByTestId('map-ground').boundingBox())!;
  expect([map.x, map.y, map.width, map.height]).toEqual([0, 40, 1029, 672]);
  expect(map.y + map.height).toBeLessThanOrEqual(720);
  expect(map.x + map.width).toBeLessThanOrEqual(1030);
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 400);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, 400);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(300);
  expect(await scroll()).toEqual({ x: 0, y: 0 });
  expect(errors).toEqual([]);
});

test('FR-480 New game opens its question under the bar, above the map and the pane, with the focus on it; Keep playing gives the focus back', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  const newGame = page.getByRole('button', { name: 'New game', exact: true });
  await newGame.click();
  await expect(newGame).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('#confirm-new-game');
  await expect(panel).toBeVisible();
  await expect(panel).toBeFocused();
  await expect(newGame).toHaveAttribute('aria-controls', 'confirm-new-game');
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(40 - 0.5);
  expect(inside(box, { x: 0, y: 0, width: 1280, height: 720 })).toBe(true);
  // Nothing lies over it: the topmost element at its middle and near its corners is the panel or inside it
  const onTop = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + 4, r.top + 4],
      [r.right - 4, r.bottom - 4],
    ].map(([x, y]) => el.contains(document.elementFromPoint(x, y)));
  });
  expect(onTop).toEqual([true, true, true]);
  await panel.getByRole('button', { name: 'Keep playing' }).click();
  await expect(panel).toHaveCount(0);
  await expect(newGame).toBeFocused();
  await expect(newGame).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});
