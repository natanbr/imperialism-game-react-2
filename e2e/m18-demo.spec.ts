// FR-561: the Demo level, chosen in the running app. Continue the seeded save, ask New game in the top bar, pick Start
// Demo game: a fresh game on turn 1 (seed 1, the stubbed Math.random), saved as "demo", with the Demo cash in the HUD.
// The landing before turn 10 is proved headlessly (tests/engine/demoStart.test.ts): through the UI it takes the
// Diplomacy, Fleet and Army screens over three turns, far more than this smoke test should carry.
import { DEMO_START } from '../src/app/engine/world/demoStart';
import { START_TREASURY } from '../src/app/engine/world/startWorld';
import { SAVE_KEY } from '../src/app/store/persistence';
import { expect, expectFreshGameSeed, startSeededGame, test } from './seededGame';

test.use({ viewport: { width: 1280, height: 720 } });

test('FR-561 Start Demo game on the New game question starts a Demo game with the Demo cash in the HUD', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await startSeededGame(page);
  const cash = page.getByTestId('topbar-cash');
  await expect(cash).toContainText('$10,000');

  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('group', { name: 'Confirm new game' }).getByRole('button', { name: 'Start Demo game' }).click();

  const demoCash = (START_TREASURY * DEMO_START.cashMultiplier).toLocaleString('en-US');
  await expect(cash).toContainText(`$${demoCash}`);
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
  await expectFreshGameSeed(page);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').game?.difficulty, SAVE_KEY)).toBe('demo');
  expect(errors).toEqual([]);
});
