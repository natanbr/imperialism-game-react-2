import { test, expect, Page } from './seededGame';

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

/**
 * Every scroll position a player could have moved: the page, the app's frame, the right pane, the bar's button strip.
 * M12b review LP-4 (a): the frame is the page's outer box (page.tsx, `overflow: hidden`, the bar's parent). Its hidden
 * overflow never reaches the document, so `document.documentElement.scrollWidth` stayed at the window's width whatever stuck
 * out (that check could not fail); a part past the window's right edge shows in the frame's own scroll width, and a
 * frame scrolled by script or by the focus shows in its scroll position.
 */
const scrolls = (page: Page) =>
  page.evaluate(() => {
    const el = (selector: string) => document.querySelector(selector) as HTMLElement;
    const root = document.scrollingElement as HTMLElement;
    const app = el('[data-testid="topbar"]').parentElement!;
    return {
      pageX: root.scrollLeft,
      pageY: root.scrollTop,
      pageWide: root.scrollWidth - window.innerWidth,
      appX: app.scrollLeft,
      appY: app.scrollTop,
      appWide: Math.max(0, app.scrollWidth - app.clientWidth),
      pane: el('.hud-content').scrollTop,
      strip: el('[data-testid="topbar-strip"]').scrollLeft,
    };
  });
const UNSCROLLED = { pageX: 0, pageY: 0, pageWide: 0, appX: 0, appY: 0, appWide: 0, pane: 0, strip: 0 };

/** Advance Turn: the only one on the page, its whole box inside the window and the bar, the page, pane and bar unscrolled. */
async function advanceInSight(page: Page, viewport: { width: number; height: number }, when: string) {
  await expect(advance(page), when).toHaveCount(1);
  const box = (await advance(page).boundingBox())!;
  const bar = (await page.getByTestId('topbar').boundingBox())!;
  expect(inside(box, { x: 0, y: 0, ...viewport }), `${when}: Advance Turn ${JSON.stringify(box)} inside the window`).toBe(true);
  expect(inside(box, bar), `${when}: inside the top bar`).toBe(true);
  expect(await scrolls(page), when).toEqual(UNSCROLLED);
}

/**
 * FR-467 at any turn (M12b review LP-4, ST-4): the bar's status line holds every part whole inside the window and its row
 * (turn and date, the Council line, the cash and its change, the score and its rank), no block runs into the next one or
 * (one row) into the buttons, nothing in a one-row bar lies outside it, and the frame is no wider than the window.
 */
async function barFits(page: Page, viewport: { width: number; height: number }, when: string) {
  const rows = viewport.width >= 1024 ? 1 : 2;
  const found = await page.evaluate(
    ({ w, rows }) => {
      const box = (el: Element) => el.getBoundingClientRect();
      const bar = document.querySelector('[data-testid="topbar"]') as HTMLElement;
      const problems: string[] = [];
      const parts = ['[data-testid="turn-indicator"]', '.turn-date', '[data-testid="next-council"]', '.nation-stats', '[data-testid="cash-change"]', '[data-testid="hud-score"]', '[data-testid="score-rank"]'];
      for (const selector of parts) {
        const el = bar.querySelector(selector);
        if (!el) continue;
        const r = box(el);
        if (r.width < 1 || r.left < -0.5 || r.right > w + 0.5 || r.top < -0.5 || r.bottom > 40.5) problems.push(`${selector} at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      // The blocks in order, none into the next; in one row, none into the buttons
      const blocks = [...bar.querySelectorAll('[data-testid="topbar-status"] > *')].map(box).filter((r) => r.width > 1);
      for (let i = 1; i < blocks.length; i++) if (blocks[i].left < blocks[i - 1].right - 0.5) problems.push(`block ${i} starts at ${blocks[i].left}, before the end of block ${i - 1} at ${blocks[i - 1].right}`);
      const actions = box(bar.querySelector('[data-testid="topbar-actions"]')!);
      if (rows === 1 && blocks.at(-1)!.right > actions.left + 0.5) problems.push(`the score block ends at ${blocks.at(-1)!.right}, past the buttons' start at ${actions.left}`);
      if (rows === 1) {
        if (bar.scrollWidth > bar.clientWidth) problems.push(`bar scrollWidth ${bar.scrollWidth} > ${bar.clientWidth}`);
        for (const child of bar.querySelectorAll('*')) {
          const r = box(child);
          if (r.width === 0 && r.height === 0) continue;
          if (r.left < -0.5 || r.right > w + 0.5 || r.top < -0.5 || r.bottom > 40.5) problems.push(`${child.tagName}.${child.className} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return problems;
    },
    { w: viewport.width, rows }
  );
  expect(found, `${when} at ${viewport.width}x${viewport.height}`).toEqual([]);
  const { appWide, appX } = await scrolls(page);
  expect({ appWide, appX }, `${when} at ${viewport.width}x${viewport.height}: the frame no wider than the window`).toEqual({ appWide: 0, appX: 0 });
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
    // M12b review LP-4 (a), old -> new: "document.documentElement.scrollWidth <= the window's width" (it could not fail:
    // the page's frame hides its overflow) -> barFits, the frame's own scroll width and every status part, Council line
    // and rank included (LP-4 (c))
    await barFits(page, viewport, 'turn 1');

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

// ---------------------------------------------------------------------------------------------------------------------
// M12b review fixes (2026-11-17). Each test below names the review finding it answers.

const SAVE_KEY = 'imperialism-remake.save';
const ALL_SIZES = [{ width: 1920, height: 1080 }, { width: 1800, height: 1000 }, ...ONE_ROW.slice(1), ...TWO_ROWS];

// LP-4 (b), ST-4: the fit tests above run on turn 1, where the cash block has no change line. The widest states the bar
// holds: turn 2 (the change line), a late turn with cash in millions and the longest Council line (two-digit turns), and
// game over (Final scores, a labelled button from 1800 px). The save of turn 2 is edited to turn 39 with $1,234,567.
test('FR-467 the bar fits its widest states at every size: turn 2, a late turn with cash in millions, and game over with Final scores', async ({ page }) => {
  test.setTimeout(180000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await endTurn(page, 2);
  await expect(page.getByTestId('cash-change')).toContainText('last turn');
  for (const viewport of ALL_SIZES) {
    await page.setViewportSize(viewport);
    await barFits(page, viewport, 'turn 2');
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.game?.turn, SAVE_KEY)).toBe(2);
  await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.game.turn = 39;
    save.game.year = 1824;
    save.game.nations[0].treasury = 1234567;
    localStorage.setItem(key, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload();
  await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 39 of 40');
  // FR-506 preserves the date and leads with the winning threshold. FR-502 elects a winner at turn 40.
  await expect(page.getByTestId('next-council')).toHaveText('7 of 12 votes wins · Council: turn 40 (Winter 1824). This threshold applies at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');
  await expect(page.locator('.nation-stats')).toHaveText('Cash: $1,234,567');
  await expect(page.getByTestId('cash-change')).toContainText('last turn');
  for (const viewport of ALL_SIZES) {
    await page.setViewportSize(viewport);
    await barFits(page, viewport, 'turn 39, $1,234,567');
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await endTurn(page, 40);
  await advance(page).click();
  const council = page.getByRole('dialog', { name: 'Council of Governors' });
  await expect(council).toBeVisible();
  await council.getByRole('button', { name: 'See the final scores' }).click();
  const over = page.getByRole('dialog', { name: 'Game over' });
  await expect(over).toBeVisible();
  await over.getByRole('button', { name: 'Back to the map' }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Game over after turn 40 of 40');
  await expect(page.getByRole('button', { name: 'Final scores' })).toHaveCount(1);
  for (const viewport of ALL_SIZES) {
    await page.setViewportSize(viewport);
    await barFits(page, viewport, 'game over');
    await advanceInSight(page, viewport, 'game over');
  }
  expect(errors).toEqual([]);
});

/** Each point given is inside `selector`'s element as the topmost thing drawn there: nothing (the pane) lies over it. */
const onTopAt = (page: Page, selector: string, points: 'corners-and-lines' | 'corners') =>
  page.evaluate(
    ({ selector, points }) => {
      const el = document.querySelector(selector) as HTMLElement;
      const r = el.getBoundingClientRect();
      const at: [string, number, number][] = [
        ['top left', r.left + 3, r.top + 3],
        ['top right', r.right - 3, r.top + 3],
        ['bottom left', r.left + 3, r.bottom - 3],
        ['bottom right', r.right - 3, r.bottom - 3],
      ];
      if (points === 'corners-and-lines')
        for (const line of el.children) {
          const l = line.getBoundingClientRect();
          at.push([`end of "${line.textContent}"`, l.right - 2, l.top + l.height / 2]);
        }
      return at.filter(([, x, y]) => !el.contains(document.elementFromPoint(x, y))).map(([name]) => name);
    },
    { selector, points }
  );

// LP-1, NL-2: the bar (z 10) came before the pane (z 10) in the page, so the pane was drawn over what hangs from the bar;
// below 1024 px the pane starts at y 80, under the score's parts (measured at 800x600: their bottom right under the pane)
for (const viewport of [{ width: 800, height: 600 }, { width: 640, height: 360 }, { width: 1280, height: 720 }]) {
  test(`FR-404 at ${viewport.width}x${viewport.height} the score's parts lie whole over the map and the pane, inside the window`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await open(page);
    await page.getByTestId('hud-score').hover();
    const parts = page.getByTestId('score-parts');
    await expect(parts).toBeVisible();
    const box = (await parts.boundingBox())!;
    expect(inside(box, { x: 0, y: 0, ...viewport }), `${JSON.stringify(box)} inside the window`).toBe(true);
    expect(await onTopAt(page, '[data-testid="score-parts"]', 'corners-and-lines'), 'covered points').toEqual([]);
    expect(errors).toEqual([]);
  });
}

// A11Y-1: the question was portaled to the end of the body, so Shift+Tab from it went to the pane's last control and Tab
// from Keep playing left the page. Now it sits right after New game: New game, the question, About. Escape closes it.
test('FR-480 FR-111 the question sits in the Tab order right after New game (Shift+Tab back to it, Tab on to About), and Escape closes it, the focus back on New game', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  const newGame = page.getByRole('button', { name: 'New game', exact: true });
  const panel = page.locator('#confirm-new-game');
  await newGame.click();
  await expect(panel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(newGame).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Start new game' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'About', exact: true })).toBeFocused();
  await panel.getByRole('button', { name: 'Keep playing' }).click();
  await expect(panel).toHaveCount(0);

  // Escape from inside the question: closed, the focus back on New game, the game and the tile selection untouched (the
  // map's own Escape would have dropped the selection, FR-370)
  const plain = page.locator('[data-tile-id="4-9"]');
  await plain.click({ position: { x: 6, y: 6 } });
  await expect(plain).toHaveAttribute('data-selected', 'true');
  await newGame.click();
  await expect(panel).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Start new game' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(newGame).toBeFocused();
  await expect(newGame).toHaveAttribute('aria-expanded', 'false');
  await expect(plain).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
  expect(errors).toEqual([]);
});

// LP-3: FR-480 says "a panel under the button"; it was pinned to the window's right edge (at 800x600 New game is at x 268
// and the panel opened at x 520 to 792). Now its left edge is the button's, kept 8 px inside the window.
for (const viewport of [{ width: 800, height: 600 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  test(`FR-480 at ${viewport.width}x${viewport.height} New game's question opens under the button, inside the window, over the map and the pane`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize(viewport);
    await open(page);
    const newGame = page.getByRole('button', { name: 'New game', exact: true });
    await newGame.scrollIntoViewIfNeeded();
    await newGame.click();
    const panel = page.locator('#confirm-new-game');
    await expect(panel).toBeVisible();
    const button = (await newGame.boundingBox())!;
    const box = (await panel.boundingBox())!;
    const bar = (await page.getByTestId('topbar').boundingBox())!;
    expect(inside(box, { x: 0, y: 0, ...viewport }), `${JSON.stringify(box)} inside the window`).toBe(true);
    // Under the bar, and under the button: its left edge at the button's unless the window's right edge pushes it left
    expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height - 0.5);
    expect(box.y).toBeLessThanOrEqual(bar.y + bar.height + 8);
    expect(Math.abs(box.x - Math.max(8, Math.min(button.x, viewport.width - 8 - box.width))), `panel left ${box.x}, button left ${button.x}`).toBeLessThanOrEqual(1);
    const middle = button.x + button.width / 2;
    expect(middle >= box.x && middle <= box.x + box.width, `the button's middle ${middle} over the panel ${box.x} to ${box.x + box.width}`).toBe(true);
    expect(await onTopAt(page, '#confirm-new-game', 'corners'), 'covered corners').toEqual([]);
    expect(errors).toEqual([]);
  });
}

/** Tab from the score (the last stop before the buttons) to the bar's first button, Open Warehouse. */
async function tabIntoTheButtons(page: Page) {
  await page.getByTestId('hud-score').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Open Warehouse' })).toBeFocused();
}

// LP-2, A11Y-2: below 1024 px the strip scrolls sideways (overflow-x: auto, so overflow-y is auto too) and is as high as
// its buttons, so the browser's ring, drawn outside a button, was cut off. The ring is now drawn inside each button.
test('FR-467 at 800x600 a keyboard focus ring on each strip button lies inside the button, and the button inside the strip', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 800, height: 600 });
  await open(page);
  await tabIntoTheButtons(page);
  const strip = (await page.getByTestId('topbar-strip').boundingBox())!;
  const count = await page.getByTestId('topbar-strip').getByRole('button').count();
  expect(count).toBe(9);
  for (let i = 0; i < count; i++) {
    if (i > 0) await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { name: el.getAttribute('title'), visible: el.matches(':focus-visible'), style: style.outlineStyle, outside: parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth), box: el.getBoundingClientRect().toJSON() as Box };
    });
    expect(ring.visible, `${ring.name}: focus-visible`).toBe(true);
    expect(ring.style, `${ring.name}: a ring`).not.toBe('none');
    expect(ring.outside, `${ring.name}: the ring reaches ${ring.outside} px outside the button`).toBeLessThanOrEqual(0);
    expect(inside(ring.box, strip), `${ring.name} inside the strip`).toBe(true);
  }
  expect(errors).toEqual([]);
});

// A11Y-4: from 1024 to 1799 px the buttons are icons only and the name was only a mouse tooltip (title). A keyboard focus
// now shows the name under the button, over the map and the pane.
test('FR-468 at 1280x720 a keyboard focus on an icon button shows its name under it, whole and inside the window', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  await tabIntoTheButtons(page);
  const count = await page.getByTestId('topbar-strip').getByRole('button').count();
  expect(count).toBe(9);
  for (let i = 0; i < count; i++) {
    if (i > 0) await page.keyboard.press('Tab');
    const shown = await page.evaluate(() => {
      const button = document.activeElement as HTMLElement;
      const label = button.querySelector('.topbar-label') as HTMLElement;
      const r = label.getBoundingClientRect();
      const b = button.getBoundingClientRect();
      // The label lets the pointer through (pointer-events: none), so hit testing skips it: for this one read it may be
      // hit, and the topmost thing drawn at its middle is then the label or what lies over it
      label.style.pointerEvents = 'auto';
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      label.style.pointerEvents = '';
      return { name: label.textContent, width: r.width, below: r.top >= b.bottom, inside: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight, onTop: label.contains(hit) };
    });
    expect(shown, `${shown.name}`).toMatchObject({ below: true, inside: true, onTop: true });
    expect(shown.width, `${shown.name}: shown`).toBeGreaterThan(20);
  }
  // A mouse user keeps the title only: no label once the focus has left
  await page.mouse.click(5, 300);
  const width = await page.getByRole('button', { name: 'Open Warehouse' }).locator('.topbar-label').evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
