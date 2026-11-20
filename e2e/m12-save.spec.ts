import { test, expect, Page } from '@playwright/test';

// M12 lane L3 in the running app: the game is saved in the browser and offered back (FR-357 to FR-363), and How to play
// opens on a browser's first new game (FR-430, FR-431).
// FR-357 FR-360: a new game is written at once and End Turn writes the new turn. FR-359: a reload offers the "Saved game"
// dialog with Continue focused; Continue restores turn 2, New game starts turn 1. FR-362: a slot the game cannot load
// says why and offers New game only. FR-430: the shared storage state of playwright.config.ts sets the How to play flag;
// the describe below clears it, as a first visit has none.

test.use({ viewport: { width: 1280, height: 720 } });

const SAVE_KEY = 'imperialism-remake.save';
const HOW_TO_PLAY_KEY = 'imperialism-remake.howto-seen';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function ready(page: Page) {
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
}

/** The turn of the game in the slot, or null for an empty slot. */
const savedTurn = (page: Page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw).game?.turn ?? 'unreadable');
  }, SAVE_KEY);

const savedGame = (page: Page) => page.getByRole('dialog', { name: 'Saved game' });
const turnLine = (page: Page) => page.getByTestId('turn-indicator');

test('FR-357 FR-359 FR-360 End Turn saves; a reload offers the saved game; Continue restores turn 2, New game starts turn 1', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await page.goto('/');
  await ready(page);
  await expect(savedGame(page)).toHaveCount(0);
  await expect.poll(() => savedTurn(page)).toBe(1);

  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(turnLine(page)).toContainText('Turn: 2 of 40');
  await expect.poll(() => savedTurn(page)).toBe(2);

  // The slot is up to date, so the reload does not ask (FR-363)
  await page.reload();
  await expect(savedGame(page)).toBeVisible({ timeout: 15000 });
  await expect(savedGame(page).getByTestId('saved-game-text')).toHaveText(/^Testland, turn 2 of 40, /);
  await expect(savedGame(page).getByRole('button', { name: 'Continue' })).toBeFocused();
  await savedGame(page).getByRole('button', { name: 'Continue' }).click();
  await expect(savedGame(page)).toHaveCount(0);
  await expect(turnLine(page)).toContainText('Turn: 2 of 40');

  await page.reload();
  await savedGame(page).getByRole('button', { name: 'New game' }).click();
  await expect(savedGame(page)).toHaveCount(0);
  await expect(turnLine(page)).toContainText('Turn: 1 of 40');
  await expect.poll(() => savedTurn(page)).toBe(1);
  expect(errors).toEqual([]);
});

test('FR-362 a slot the game cannot load says why and offers New game only; New game overwrites it', async ({ page }) => {
  test.setTimeout(60000);
  const errors = collectErrors(page);
  await page.goto('/');
  await ready(page);
  await expect.poll(() => savedTurn(page)).toBe(1);
  await page.evaluate((key) => localStorage.setItem(key, '{"version":99}'), SAVE_KEY);

  await page.reload();
  await expect(savedGame(page)).toBeVisible({ timeout: 15000 });
  await expect(savedGame(page).getByTestId('saved-game-text')).toHaveText(
    'The saved game could not be loaded (it was made by another version of the game).'
  );
  await expect(savedGame(page).getByRole('button')).toHaveText(['New game']);
  await expect(savedGame(page).getByRole('button', { name: 'New game' })).toBeFocused();
  await savedGame(page).getByRole('button', { name: 'New game' }).click();
  await expect.poll(() => savedTurn(page)).toBe(1);
  expect(errors).toEqual([]);
});

test.describe('FR-430 a browser that has not seen How to play', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('FR-430 FR-431 the first new game opens How to play with Close focused; closing records the flag; About opens it again; Continue opens it only until it was closed', async ({ page }) => {
    test.setTimeout(90000);
    const errors = collectErrors(page);
    const howTo = page.getByRole('dialog', { name: 'How to play' });
    const flag = () => page.evaluate((key) => localStorage.getItem(key), HOW_TO_PLAY_KEY);

    await page.goto('/');
    await expect(howTo).toBeVisible({ timeout: 15000 });
    await expect(howTo.getByRole('button', { name: 'Close' })).toBeFocused();
    // FR-503/506: the old score-or-nine-votes goal became a seven-vote threshold and a forced last vote.
    await expect(howTo.getByTestId('howto-goal')).toHaveText(
      'The Council of Governors meets on turns 10, 20, 30 and 40. 7 of 12 votes wins at any meeting. At the last meeting (turn 40) every governor must choose, and the nominee with more votes wins (equal votes: higher standing).'
    );
    await expect(howTo.getByTestId('howto-money')).toContainText('Open a consulate with a minor nation in Diplomacy ($500).');
    await expect(howTo.getByTestId('howto-first-turn').getByRole('listitem')).toHaveCount(3);
    expect(await flag()).toBeNull();

    // M12 review (L3-03): a reload before Close offers the autosaved first game; Continue opens How to play again, as
    // this browser has still not closed it
    await page.reload();
    await savedGame(page).getByRole('button', { name: 'Continue' }).click();
    await expect(savedGame(page)).toHaveCount(0);
    await expect(howTo).toBeVisible();
    expect(await flag()).toBeNull();

    await howTo.getByRole('button', { name: 'Close' }).click();
    await expect(howTo).toHaveCount(0);
    expect(await flag()).not.toBeNull();

    // About holds a "How to play" button at any time; Escape closes it
    await page.getByRole('button', { name: /^About$/ }).click();
    await page.getByRole('dialog', { name: 'About' }).getByRole('button', { name: 'How to play' }).click();
    await expect(page.getByRole('dialog', { name: 'About' })).toHaveCount(0);
    await expect(howTo).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(howTo).toHaveCount(0);

    // Once closed, a continued game does not open it
    await page.reload();
    await savedGame(page).getByRole('button', { name: 'Continue' }).click();
    await expect(savedGame(page)).toHaveCount(0);
    await expect(howTo).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
