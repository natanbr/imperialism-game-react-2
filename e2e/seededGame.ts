import type { Page } from '@playwright/test';
import { createGameStore } from '../src/app/store/rootStore';
import { SAVE_KEY, saveOf } from '../src/app/store/persistence';

/** On seed 1 an idle continent game reaches the last Council, which elects Valdoria on turn 40. */
export async function startSeededGame(page: Page) {
  const save = saveOf(createGameStore({ seed: 1 }).getState());
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, { key: SAVE_KEY, value: JSON.stringify(save) });
  await page.goto('/');
  await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
}
