import { test, expect, Page, Locator } from '@playwright/test';

// FR-303 (M10 done) in the running app, on a new game (any seed) at 1280x720: on turn 1 the HUD reads "Next Council: turn 10
// (Summer 1817)" (FR-301); after 10 End Turns, on turn 11, the Council screen opens by itself (FR-299) with both nominees,
// Testland and Valdoria: Controlled 4 and 4, Colonies 0 and 0, Other Great Powers 0 and 0 (no province can change hands by
// then: the player is idle and Valdoria's first war on a minor, FR-274, begins on turn 11 at the earliest), each Total the
// sum of its four rows, "Abstained:" 12 minus both Totals, the votes needed and "No winner. The Council meets again on turn
// 20." (FR-298); the capitol picture loaded; the dialog inside the window, neither it nor the page scrolling. Then Close
// (the focus goes back to Advance Turn), "Next Council: turn 20 (Winter 1819)", the news line "Council of Governors: ...
// no winner (9 needed)." reopens the screen (FR-297), and turn 11 ends to turn 12 with no Council screen. Review fix round:
// that line is the news list's first line, seen without scrolling (FR-306); the turn and the date share one line with the
// Council line under it, on turns 1 and 11 (FR-307).
// A winning meeting is not reachable by the UI in a short spec: tests/ui/councilDialog.test.tsx and
// tests/ui/scoreAndGameOver.test.tsx test it on a hand-built state. Set SCREENSHOT_DIR to also save m10-council.png there;
// the Council screen's shot is always attached to the test's report.

test.use({ viewport: { width: 1280, height: 720 } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

const advance = (page: Page) => page.getByRole('button', { name: /Advance Turn/ });

async function endTurn(page: Page, next: number) {
  await advance(page).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
}

/** The dialog lies inside the 1280x720 window, does not scroll itself, and the page does not scroll either. */
async function fitsTheWindow(page: Page, dialog: Locator) {
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  expect(await dialog.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  const page_ = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
  }));
  expect(page_.height).toBeLessThanOrEqual(page_.innerHeight);
  expect(page_.width).toBeLessThanOrEqual(page_.innerWidth);
}

const ROWS = ['controlled', 'colonies', 'otherGreatPowers', 'otherMinorNations'] as const;

/**
 * FR-307: the turn ("Turn: 1 of 40") and the date share one line, the date right of the turn and right-aligned in the
 * HUD's column; the Council line sits under that line, inside the same column.
 */
async function turnLineLayout(page: Page) {
  const indicator = page.getByTestId('turn-indicator');
  const turn = (await indicator.locator(':scope > div').first().boundingBox())!;
  const date = (await indicator.locator('.turn-date').boundingBox())!;
  const box = (await indicator.boundingBox())!;
  const council = (await page.getByTestId('next-council').boundingBox())!;
  expect(Math.abs(turn.y - date.y), 'the turn and the date on one line').toBeLessThanOrEqual(2);
  expect(date.x).toBeGreaterThan(turn.x + turn.width);
  expect(Math.abs(date.x + date.width - (box.x + box.width)), 'the date right-aligned').toBeLessThanOrEqual(1);
  expect(council.y, 'the Council line under the turn line').toBeGreaterThanOrEqual(Math.max(turn.y + turn.height, date.y + date.height) - 0.5);
  expect(council.x).toBeGreaterThanOrEqual(box.x - 0.5);
  expect(council.x + council.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
}

test('FR-303 the Council meets on turn 10: its screen opens by itself on turn 11, closes, and reopens from the news', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');

  // FR-301: the next meeting, and the vote it would give now as its tooltip
  const next = page.getByTestId('next-council');
  await expect(next).toHaveText('Next Council: turn 10 (Summer 1817)');
  await expect(next).toHaveAttribute('title', /^If the Council met now: (Testland|Valdoria) \d+, (Testland|Valdoria) \d+ of 12 votes; a winner needs 9\.$/);
  await turnLineLayout(page);

  const council = page.getByRole('dialog', { name: 'Council of Governors' });
  for (let turn = 1; turn <= 9; turn++) {
    await endTurn(page, turn + 1);
    await expect(council).toHaveCount(0);
  }
  await expect(next).toHaveText('Council: this turn');

  // Turn 10 resolves: the Council meets and its screen opens by itself on turn 11 (FR-299)
  await endTurn(page, 11);
  await expect(council).toBeVisible();
  await expect(council.getByTestId('council-date')).toHaveText('Turn 10, Summer 1817');
  const table = council.getByRole('table', { name: 'Votes' });
  const heads = (await table.getByRole('columnheader').allInnerTexts()).map((s) => s.trim());
  expect([...heads].sort()).toEqual(['Testland', 'Valdoria']);

  let totals = 0;
  for (const nationId of ['nation-1', 'nation-2']) {
    const cell = async (row: string) => Number(await table.getByTestId(`council-cell-${nationId}-${row}`).innerText());
    expect(await cell('controlled')).toBe(4);
    expect(await cell('colonies')).toBe(0);
    expect(await cell('otherGreatPowers')).toBe(0);
    const rows = await Promise.all(ROWS.map(cell));
    const total = await cell('total');
    expect(total).toBe(rows.reduce((a, b) => a + b, 0));
    totals += total;
    // FR-298: the number names its provinces on hover
    await expect(table.getByTestId(`council-cell-${nationId}-controlled`)).toHaveAttribute('title', /^(Testland|Valdoria) North-West, \1 North-East, \1 South-West, \1 South-East$/);
  }
  const abstained = 12 - totals;
  await expect(council.getByTestId('council-abstained')).toHaveText(abstained === 0 ? 'Abstained: none' : new RegExp(`^Abstained: ${abstained} \\(.+\\)$`));
  await expect(council.getByTestId('council-needed')).toHaveText('A winner needs more than two thirds of the 12 votes: 9.');
  await expect(council.getByTestId('council-result')).toHaveText('No winner. The Council meets again on turn 20.');

  // The capitol picture has loaded and stays at most 96 px high; the dialog fits the window
  const picture = council.locator('img[src="/assets/ink-and-wash/buildings/capitol.png"]');
  await expect(picture).toHaveAttribute('alt', '');
  await expect.poll(() => picture.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
  expect((await picture.boundingBox())!.height).toBeLessThanOrEqual(96);
  await fitsTheWindow(page, council);

  const shot = await page.screenshot();
  await testInfo.attach('m10-council.png', { body: shot, contentType: 'image/png' });
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m10-council.png` });

  // Close: the focus goes back to Advance Turn; the HUD names the next meeting
  await council.getByRole('button', { name: 'Close' }).click();
  await expect(council).toHaveCount(0);
  await expect(advance(page)).toBeFocused();
  await expect(next).toHaveText('Next Council: turn 20 (Winter 1819)');

  await turnLineLayout(page);

  // FR-297: the meeting's news line opens its screen again. FR-306 (review R1): it is the list's first line, so the player
  // sees it without scrolling: the list and the HUD are at the top, and the line lies inside the list's visible box
  const newsList = page.getByTestId('news-list');
  const line = newsList.getByRole('button', { name: /^Council of Governors: (Testland|Valdoria) \d+, (Testland|Valdoria) \d+ of 12 votes; no winner \(9 needed\)\.$/ });
  await expect(line).toHaveCount(1);
  await expect(newsList.getByRole('listitem').first()).toContainText(/^Council of Governors: /);
  const seen = await newsList.evaluate((list: HTMLElement) => {
    const hud = list.closest('.hud-content') as HTMLElement;
    const box = list.getBoundingClientRect();
    const item = list.querySelector('li')!.getBoundingClientRect();
    const fadeTop = hud.getBoundingClientRect().top + hud.clientHeight - parseFloat(getComputedStyle(hud, '::after').height);
    return { scrollTop: list.scrollTop, hudScrollTop: hud.scrollTop, lines: list.querySelectorAll('li').length, inside: item.top >= box.top - 0.5 && item.bottom <= box.top + list.clientHeight + 0.5 && item.bottom <= fadeTop + 0.5 };
  });
  expect(seen).toMatchObject({ scrollTop: 0, hudScrollTop: 0, inside: true });
  expect(seen.lines, 'more news than the Council line').toBeGreaterThan(1);
  await line.click();
  await expect(council).toBeVisible();
  await expect(council.getByTestId('council-date')).toHaveText('Turn 10, Summer 1817');
  await expect(council.getByTestId('council-result')).toHaveText('No winner. The Council meets again on turn 20.');
  await page.keyboard.press('Escape');
  await expect(council).toHaveCount(0);

  // Turn 11 holds no meeting: nothing opens
  await endTurn(page, 12);
  await expect(council).toHaveCount(0);
  await expect(next).toHaveText('Next Council: turn 20 (Winter 1819)');
  expect(errors).toEqual([]);
});
