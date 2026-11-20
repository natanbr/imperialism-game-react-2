import { expect, type Page } from '@playwright/test';
import type { SavedGame } from '../src/app/store/persistence';

/** Start from the real autosave so the fixture takes the same Continue path as a player's saved game. */
export async function continueCouncilSave(page: Page, scenario: 'last' | 'grant') {
  await page.goto('/');
  const key = 'imperialism-remake.save';
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k) !== null, key)).toBe(true);
  await page.evaluate(({ key, scenario }) => {
    const save: SavedGame = JSON.parse(localStorage.getItem(key)!);
    const { game } = save;
    game.seed = 1;
    game.turn = scenario === 'last' ? 39 : 10;
    game.year = scenario === 'last' ? 1824 : 1817;
    if (scenario === 'last') {
      // Two free minors favour each nominee below 50. Valdoria has the higher standing.
      game.nations.find(n => n.id === 'nation-2')!.treasury = 100000;
      game.minorNations.forEach((minor, i) => {
        game.diplomacy[`${minor.id}|nation-1`].points = i < 2 ? 45 : 10;
        game.diplomacy[`${minor.id}|nation-2`].points = i < 2 ? 10 : 45;
      });
    } else {
      // Testland has six votes until the player gives Pellis its last two relation points.
      game.diplomacy['minor-2|nation-1'].points = 60;
      game.diplomacy['minor-3|nation-1'].points = 60;
      const pellis = game.diplomacy['minor-4|nation-1'];
      pellis.consulates = ['nation-1'];
      pellis.embassies = ['nation-1'];
      pellis.points = 48;
    }
    localStorage.setItem(key, JSON.stringify(save));
  }, { key, scenario });
  await page.reload();
  const saved = page.getByRole('dialog', { name: 'Saved game' });
  await expect(saved.getByTestId('saved-game-text')).toContainText(`turn ${scenario === 'last' ? 39 : 10} of 40`);
  await saved.getByRole('button', { name: 'Continue' }).click();
}
