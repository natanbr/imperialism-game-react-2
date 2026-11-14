import { test, expect, Page } from '@playwright/test';
import { councilLineSeen } from './councilNews';

// M10 QA fix round at 1280x720, with the scrollbars drawn as a desktop browser draws them (Playwright's Chromium hides
// them: --hide-scrollbars; the HUD's column is then 8 px narrower and its lines wrap sooner).
// FR-315 (QA item 5), FR-306 at game over: the Final scores button joins the action buttons and leaves the news less
// height; the turn-40 meeting's Council line must still be whole, the news list's first line, above that button.
// FR-316 (QA item 6): every meeting's screen reads "Met at the end of turn 10 (Summer 1817)".
// Set SCREENSHOT_DIR to also save m10-council-game-over.png there; the shot is always attached to the test's report.

test.use({ viewport: { width: 1280, height: 720 }, launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

const MEETING_DATES = ['Summer 1817', 'Winter 1819', 'Summer 1822', 'Winter 1824'];

test('FR-315 FR-306 FR-316 after the turn-40 meeting and Back to the map, the Council line is whole above the Final scores button', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');

  const advance = page.getByRole('button', { name: /Advance Turn/ });
  const council = page.getByRole('dialog', { name: 'Council of Governors' });
  for (let turn = 1; turn <= 40; turn++) {
    await advance.click();
    if (turn < 40) await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${turn + 1} of 40`);
    if (turn % 10 === 0) {
      await expect(council).toBeVisible();
      // FR-316 on every meeting; soft, so the game-over check below runs whatever this reads
      await expect.soft(council.getByTestId('council-date')).toHaveText(`Met at the end of turn ${turn} (${MEETING_DATES[turn / 10 - 1]})`);
      await council.getByRole('button', { name: 'Close' }).click();
      await expect(council).toHaveCount(0);
    }
  }
  const over = page.getByRole('dialog', { name: 'Game over' });
  await expect(over).toBeVisible();
  await over.getByRole('button', { name: 'Back to the map' }).click();
  await expect(over).toHaveCount(0);
  await expect(page.getByTestId('turn-indicator')).toContainText('Game over after turn 40 of 40');
  await expect(page.getByRole('button', { name: /Final scores/ })).toBeVisible();
  await expect(page.getByTestId('next-council')).toHaveCount(0);

  const shot = await page.screenshot();
  await testInfo.attach('m10-council-game-over.png', { body: shot, contentType: 'image/png' });
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m10-council-game-over.png` });
  await councilLineSeen(page);
  expect(errors).toEqual([]);
});
