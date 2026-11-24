import { expect, test, type Page, startSeededGame } from './seededGame';

test.use({ viewport: { width: 1280, height: 720 }, launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const screenshot = async (page: Page, name: string) => {
  if (!process.env.SCREENSHOT_DIR) return;
  await page.locator('img:visible').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m15-${name}.png` });
};

const openCapital = async (page: Page) => {
  await page.getByRole('button', { name: /Open Capital/ }).click();
  return page.getByRole('dialog', { name: /^Capital/ });
};

/** FR-565: the Capital shows one section at a time and opens on Industry. */
const openSection = (page: Page, name: string) =>
  page.getByRole('dialog', { name: /^Capital/ }).getByRole('navigation', { name: 'Capital sections' }).getByRole('button', { name, exact: true }).click();

const advance = async (page: Page, turn: number) => {
  await page.getByRole('button', { name: 'Advance Turn' }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${turn} of 40`);
};

test('FR-513 train an Engineer and return a Prospector to industry after continuing the save', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await startSeededGame(page, game => {
    game.nations[0].warehouse.paper = 2;
  });
  const capital = await openCapital(page);
  await openSection(page, 'University');
  const university = capital.getByRole('region', { name: 'University' });
  const cash = page.getByTestId('topbar-cash');
  await expect(cash).toContainText('$10,000');
  await university.scrollIntoViewIfNeeded();
  await expect(university.getByRole('listitem')).toHaveCount(7);
  // FR-565: the University is a section of its own now; at 1280x720 its panel scrolls with a drawn scrollbar (FR-426)
  const panel = university.locator('xpath=..');
  expect(await panel.evaluate((el: HTMLElement) => el.scrollHeight > el.clientHeight && el.offsetWidth > el.clientWidth)).toBe(true);
  await university.getByRole('button', { name: 'Train one more Engineer' }).click();
  await expect(cash).toContainText('$9,000');
  await expect(university.getByTestId('university-stock')).toContainText('0 paper');
  await university.getByRole('button', { name: 'Train one less Engineer' }).click();
  await expect(cash).toContainText('$10,000');
  await expect(university.getByTestId('university-stock')).toContainText('2 paper');
  await university.getByRole('button', { name: 'Train one more Engineer' }).click();
  await screenshot(page, 'university');
  await capital.getByRole('button', { name: 'Close capital' }).click();
  await advance(page, 2);
  const home = page.locator('[data-tile-id="2-9"]');
  await home.getByTestId('worker-stack').click();
  const tray = home.getByRole('group', { name: 'Civilians on this tile' });
  await expect(tray.getByText('Engineer', { exact: true })).toHaveCount(2);
  await tray.getByText('Prospector', { exact: true }).click();
  const info = page.getByTestId('tile-info');
  const prospector = info.getByRole('listitem').filter({ hasText: /^●prospector -/ });
  await prospector.getByRole('button', { name: 'Disband', exact: true }).click();
  const question = page.getByRole('dialog', { name: 'Disband prospector?' });
  await expect(question).toHaveAccessibleDescription('The prospector becomes an expert worker next turn. The money and paper spent on it are not returned.');
  await screenshot(page, 'disband');
  await question.getByRole('button', { name: 'Disband prospector' }).click();
  await expect(prospector.getByRole('button', { name: 'Undo disband' })).toBeVisible();

  await page.reload();
  const save = page.getByRole('dialog', { name: 'Saved game' });
  await expect(save.getByTestId('saved-game-text')).toContainText('turn 2 of 40');
  await save.getByRole('button', { name: 'Continue' }).click();
  await openCapital(page);
  await expect(capital.getByTestId('grade-expert')).toContainText(/Expert\s*0/);
  await capital.getByRole('button', { name: 'Close capital' }).click();
  await advance(page, 3);
  await openCapital(page);
  await expect(capital.getByTestId('grade-expert')).toContainText(/Expert\s*1/);
  expect(errors).toEqual([]);
});

test('FR-515 FR-517 build ships, fill eight holds with purchases and collect horses', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await startSeededGame(page, game => {
    // Supply the materials up front so shipbuilding is independent of mill output and market matching.
    Object.assign(game.nations[0].warehouse, { lumber: 11, fabric: 5 });
  });
  const capital = await openCapital(page);
  await openSection(page, 'Shipyard');
  const yard = capital.getByRole('region', { name: 'Shipyard' });
  await yard.getByRole('button', { name: 'Build one more Trader' }).click();
  await expect(yard.getByTestId('shipyard-stock')).toContainText('7 lumber, 3 fabric');
  await yard.getByRole('button', { name: 'Build one less Trader' }).click();
  await expect(yard.getByTestId('shipyard-stock')).toContainText('11 lumber, 5 fabric');
  await yard.getByRole('button', { name: 'Build one more Indiaman' }).click();
  await expect(yard.getByTestId('shipyard-stock')).toContainText('4 lumber, 2 fabric');
  await screenshot(page, 'shipyard');
  await capital.getByRole('button', { name: 'Armoury' }).click();
  const hussars = page.getByRole('article', { name: 'Hussars' });
  await expect(hussars).toContainText('Horses: 4 in warehouse, +1 a turn');
  await screenshot(page, 'armoury');
  await page.keyboard.press('Escape');
  await capital.getByRole('button', { name: 'Close capital' }).click();
  // The owned ranch is identified by the tile's accessible name so the check follows the map.
  const ranch = page.locator('[data-terrain="horseRanch"][aria-label*="Testland"]').first();
  await ranch.click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('tile-collected')).toHaveText('Collected by the capital, 1 horse a turn');
  await screenshot(page, 'ranch');
  await advance(page, 2);

  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
  for (const minor of ['Arvelia', 'Sundmark', 'Lorran', 'Pellis']) {
    await diplomacy.getByRole('tab', { name: minor, exact: true }).click();
    await diplomacy.getByRole('tabpanel', { name: minor, exact: true }).getByRole('button', { name: 'Consulate ($500)' }).click();
  }
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await page.getByRole('button', { name: /Open Market/ }).click();
  const board = page.getByRole('dialog', { name: /Board of Trade/ });
  // Re-recorded by M18c FR-573: old "Holds: 8 (2 Indiamen)" and "Holds: 8 of 8 free", one figure now
  await expect(board.getByTestId('market-holds')).toHaveText('Holds: 0 of 8 used (2 Indiamen)');
  // Re-targeted by M18c FR-575: the sellers with their units are on the Details tab
  await board.getByRole('tab', { name: 'Details', exact: true }).click();
  await expect(board.getByTestId('detail-row-horses')).toContainText('Arvelia: 1 unit');
  await board.getByRole('tab', { name: 'Board', exact: true }).click();
  await screenshot(page, 'board');
  // Spread the bids over the minors' real supplies and check actual purchases in the Deal Book next turn.
  for (const [commodity, amount] of [['Timber', 4], ['Coal', 2], ['Iron Ore', 2]] as const) {
    for (let n = 0; n < amount; n++) await board.getByRole('button', { name: `Buy one more ${commodity}` }).click();
  }
  // Re-recorded by M18c FR-573: old "Holds: 0 of 8 free"
  await expect(board.getByTestId('market-holds')).toHaveText('Holds: 8 of 8 used (2 Indiamen)');
  await page.keyboard.press('Escape');
  await openCapital(page);
  await openSection(page, 'Shipyard');
  await yard.getByRole('button', { name: 'Build one more Trader' }).click();
  await capital.getByRole('button', { name: 'Close capital' }).click();
  await advance(page, 3);
  await page.getByRole('button', { name: 'Deal Book', exact: true }).click();
  const bought = page.getByRole('dialog', { name: 'Deal Book' }).getByRole('list', { name: 'Bought' });
  const purchases = await bought.getByRole('listitem').allTextContents();
  expect(purchases.reduce((total, line) => total + Number(/^Bought (\d+) /.exec(line)?.[1] ?? 0), 0)).toBe(8);
  await screenshot(page, 'eight-purchases');
  await page.keyboard.press('Escape');
  await openCapital(page);
  await capital.getByRole('button', { name: 'Armoury' }).click();
  await expect(hussars).toContainText('Horses: 6 in warehouse, +1 a turn');
  await page.keyboard.press('Escape');
  await capital.getByRole('button', { name: 'Trade', exact: true }).click();
  // Re-recorded by M18c FR-573: old "Holds: 10 (1 Trader, 2 Indiamen)"
  await expect(board.getByTestId('market-holds')).toHaveText('Holds: 0 of 10 used (1 Trader, 2 Indiamen)');
  expect(errors).toEqual([]);
});
