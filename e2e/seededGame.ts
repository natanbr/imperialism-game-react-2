import { expect, test as base, type Page } from '@playwright/test';
import { createGameStore } from '../src/app/store/rootStore';
import { SAVE_KEY, saveOf, type SavedGame } from '../src/app/store/persistence';
import type { GameState } from '../src/app/types/GameState';

export { expect, type Locator, type Page } from '@playwright/test';

/** The store draws a new game's seed from Math.random (0 gives seed 1), then the engine uses its own seeded RNG.
 * Install before the app loads. It also covers a later New Game click and every reload of this test page. */
export const test = base.extend({
  page: async ({ page }, runWithPage) => {
    await page.addInitScript(() => { Math.random = () => 0; });
    await runWithPage(page);
  },
});

/** Read what the browser actually saved after creating a game or starting over. */
export async function expectFreshGameSeed(page: Page) {
  await expect.poll(() => page.evaluate(key => {
    const raw = localStorage.getItem(key);
    const game = raw && JSON.parse(raw).game;
    return game && { seed: game.seed, turn: game.turn };
  }, SAVE_KEY)).toEqual({ seed: 1, turn: 1 });
}

/** A true empty-slot startup for first-paint measurements. */
export async function startFreshSeededGame(page: Page) {
  await page.goto('/');
  await expectFreshGameSeed(page);
}

/** On seed 1 an idle continent game reaches the last Council, which elects Valdoria on turn 40. */
export async function startSeededGame(page: Page, prepare?: (game: GameState) => void) {
  const save = saveOf(createGameStore({ seed: 1 }).getState());
  prepare?.(save.game);
  await continueSavedGame(page, save);
}

export async function continueSavedGame(page: Page, save: SavedGame) {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, { key: SAVE_KEY, value: JSON.stringify(save) });
  await page.goto('/');
  await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
}
