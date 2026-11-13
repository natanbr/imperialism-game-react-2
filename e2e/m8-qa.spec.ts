import { test, expect, Page } from '@playwright/test';

// M8 QA fix round at 1280x720, the QA screenshots' size, with the scrollbars drawn as a desktop browser draws them
// (Playwright's Chromium hides them: --hide-scrollbars).
// FR-268 (item 6): the HUD's news list is its own scroll region of whole lines that ends above the HUD's fade (FR-235),
//   so no line is cut behind the fade, and scrolling it reaches every line.
// FR-269 (item 7): the low-cash upkeep warning (FR-261) seen in the running app: a $10,000 grant on turn 1 spends the
//   treasury down to $0, and the HUD warns. Set SCREENSHOT_DIR to also save m8-qa-upkeep-warning.png there; the shot is
//   always attached to the test's report.

test.use({ viewport: { width: 1280, height: 720 }, launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

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

async function endTurn(page: Page, next: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
}

/** The news list's box, its line height and scroll state, and the HUD scroll area's visible bottom. */
const newsLayout = (page: Page) =>
  page.getByTestId('news-list').evaluate((list: HTMLElement) => {
    const hud = list.closest('.hud-content') as HTMLElement;
    const box = list.getBoundingClientRect();
    const style = getComputedStyle(list);
    const line = parseFloat(style.lineHeight);
    const items = [...list.querySelectorAll('li')].map((li) => li.getBoundingClientRect());
    return {
      overflowY: style.overflowY,
      top: box.top,
      bottom: box.top + list.clientHeight,
      clientHeight: list.clientHeight,
      scrollTop: list.scrollTop,
      maxScroll: list.scrollHeight - list.clientHeight,
      line,
      items: items.map((r) => ({ top: r.top, bottom: r.bottom, height: r.height })),
      hudTop: hud.getBoundingClientRect().top,
      hudBottom: hud.getBoundingClientRect().top + hud.clientHeight,
      hudScrollTop: hud.scrollTop,
      fade: parseFloat(getComputedStyle(hud, '::after').height),
    };
  });

const whole = (value: number, line: number) => Math.abs(value / line - Math.round(value / line)) < 0.02;

test('FR-268 the news list: whole lines above the HUD fade, its own scroll reaches every line', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);
  // A few turns of the continent's news: more lines than the list shows at once
  for (let turn = 2; turn <= 4; turn++) {
    await endTurn(page, turn);
    const { maxScroll } = await newsLayout(page);
    if (maxScroll > 0) break;
  }
  const list = page.getByTestId('news-list');
  await expect(list).toBeVisible();
  const at = await newsLayout(page);
  expect(at.maxScroll, 'more news than the list shows at once').toBeGreaterThan(0);
  expect(at.overflowY).toBe('auto');
  expect(at.hudScrollTop).toBe(0);

  // Not behind the fade: the list ends above the fade at the bottom of the HUD's scroll area
  expect(at.fade).toBeGreaterThan(0);
  expect(at.bottom).toBeLessThanOrEqual(at.hudBottom - at.fade + 0.5);
  expect(at.top).toBeGreaterThanOrEqual(at.hudTop);
  // Whole lines: the box is a whole number of lines tall and every item starts on a line of it, so no line is cut
  expect(whole(at.clientHeight, at.line), `${at.clientHeight} px in lines of ${at.line} px`).toBe(true);
  expect(at.clientHeight / at.line).toBeGreaterThanOrEqual(3);
  for (const item of at.items) {
    expect(whole(item.top - at.top, at.line)).toBe(true);
    expect(whole(item.height, at.line)).toBe(true);
    expect(item.height).toBeLessThanOrEqual(at.clientHeight);
  }

  // The keyboard reaches it and scrolls it to its last line, whole, still above the fade
  await list.focus();
  await page.keyboard.press('End');
  await expect.poll(async () => { const now = await newsLayout(page); return now.scrollTop >= now.maxScroll - 1; }).toBe(true);
  const end = await newsLayout(page);
  const last = end.items[end.items.length - 1];
  expect(last.bottom).toBeLessThanOrEqual(end.bottom + 0.5);
  expect(last.top).toBeGreaterThanOrEqual(end.top - 0.5);
  expect(end.bottom).toBeLessThanOrEqual(end.hudBottom - end.fade + 0.5);
  // The mouse wheel over it scrolls it back to the first line
  const box = (await list.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -4000);
  await expect.poll(async () => (await newsLayout(page)).scrollTop).toBe(0);
  expect(errors).toEqual([]);
});

test('FR-269 FR-261 a $10,000 grant leaves less than the army upkeep: the HUD shows the warning', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors = collectErrors(page);
  await open(page);
  await expect(page.getByTestId('upkeep-warning')).toHaveCount(0);

  // Diplomacy: Valdoria is selected first; a grant of $10,000, once, spends the whole treasury at once (FR-170)
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Diplomacy' });
  await expect(dialog).toBeVisible();
  const valdoria = dialog.getByRole('tabpanel', { name: 'Valdoria', exact: true });
  const grant = valdoria.getByRole('group', { name: 'Grant' });
  await grant.getByRole('combobox', { name: 'Amount' }).selectOption({ label: '$10,000' });
  await grant.getByRole('combobox', { name: 'How often' }).selectOption('once');
  await grant.getByRole('button', { name: 'Give' }).click();
  await dialog.getByRole('button', { name: 'Close diplomacy' }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.locator('.nation-stats')).toContainText('$0');
  const warning = page.getByTestId('upkeep-warning');
  await expect(warning).toHaveText(
    "Cash is short of the army upkeep: $100 is due at End Turn and $0 will be left. Unless this turn's sales cover the rest, the newest regiments are disbanded."
  );
  await expect(warning).toHaveAttribute('role', 'status');
  await expect(warning).toBeInViewport({ ratio: 1 });

  const shot = await page.screenshot();
  await testInfo.attach('m8-qa-upkeep-warning.png', { body: shot, contentType: 'image/png' });
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m8-qa-upkeep-warning.png` });
  expect(errors).toEqual([]);
});
