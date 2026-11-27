// M18j T-06 in the running app (FR-639, FR-640). Continent seed 1, prepared: Testland holds an embassy with Arvelia at 60
// points (level 6, a 75% share), holds Arvelia's timber at 11-3 at level 0 and has a Developer on its capital; Valdoria
// holds the timber at 13-4. The map draws both flags and names the holders; Tile Info prices a tile for sale and offers
// Buy land with the Developer selected; End Turn settles the purchase and pays the overseas profit, which the Deal Book
// lists and counts in the treasury. At 1280 x 720 and 390 x 844, by the keyboard too, with screenshots.
import { expect, startSeededGame, test, type Page } from './seededGame';
import { pairKey } from '../src/app/engine/diplomacy/relations';
import type { GameState } from '../src/app/types/GameState';
import { WorkerStatus, WorkerType } from '../src/app/types/Workers';

const N1 = 'nation-1';
const N2 = 'nation-2';
const ARVELIA = 'minor-1';
/** Testland's capital tile, found by `prepare`. */
let capitalId = '';

function prepare(game: GameState) {
  const pair = game.diplomacy[pairKey(N1, ARVELIA)];
  game.diplomacy[pairKey(N1, ARVELIA)] = { ...pair, points: 60, consulates: [N1], embassies: [N1] };
  const tiles = game.map.tiles.flat();
  for (const [tileId, holderId] of [['11-3', N1], ['13-4', N2]]) {
    const tile = tiles.find(t => t.id === tileId)!;
    tile.resource = { ...tile.resource!, level: 0 };
    game.overseasLand = { ...game.overseasLand, [tileId]: { tileId, holderId, minorId: ARVELIA, turn: 1, price: 2000 } };
  }
  const testland = game.nations.find(n => n.id === N1)!;
  const capital = tiles.find(t => t.cityId === testland.cities[0] && t.ownerNationId === N1)!;
  capitalId = capital.id;
  capital.workers.push({ id: 'developer-nation-1-1', type: WorkerType.Developer, nationId: N1, assignedTileId: capital.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false });
}

const tile = (page: Page, id: string) => page.locator(`[data-tile-id="${id}"]`);
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('FR-639 FR-640 flags, Tile Info, Buy land, News and the Deal Book\'s Overseas Profits at desktop and phone widths', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startSeededGame(page, prepare);

  // The flags and their text equivalent, for every viewer who sees the tile
  await expect(tile(page, '13-4')).toHaveAttribute('aria-label', 'Hardwood forest, timber, level 0, owned by Arvelia, held by Valdoria');
  await expect(tile(page, '11-3')).toHaveAttribute('aria-label', 'Hardwood forest, timber, level 0, owned by Arvelia, held by Testland');
  await expect(tile(page, '13-4').getByTestId('holding-flag')).toBeVisible();

  // Keyboard (FR-369): from the selected 12-4, the arrow key to the rival's tile, which names its holder, then Enter;
  // its Tile Info shows only the holder
  await tile(page, '12-4').click();
  await tile(page, '12-4').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /held by Valdoria$/);
  await page.keyboard.press('Enter');
  const tileInfo = page.getByTestId('tile-info');
  await expect(tileInfo.getByTestId('tile-holding')).toHaveText('Held by: Valdoria');
  await page.screenshot({ path: info.outputPath('m18j-held-tile-1280.png') });

  // A tile for sale: the price with its formula, the units and the profit at the share
  await tile(page, '10-3').click();
  await expect(tileInfo.getByTestId('tile-for-sale')).toHaveText(/^For sale: \$[\d,]+ \(20 × \$\d+\)1 Timber a turn: \$\d+ at a 75% share$/);

  // Buy land with the Developer: picked in the capital's Tile Info, then the tile, then Spend
  await tile(page, capitalId).click({ position: { x: 4, y: 4 } });
  await tileInfo.getByText('developer - available').click();
  await tile(page, '10-3').click();
  const spend = page.getByRole('dialog', { name: /^Spend \$[\d,]+\?$/ });
  await expect(spend).toContainText('Buy 10-3 from Arvelia');
  await page.screenshot({ path: info.outputPath('m18j-buy-land-1280.png') });
  await spend.getByRole('button', { name: /^Spend/ }).click();
  await tile(page, '10-3').click();
  await expect(tileInfo).toContainText('developer - Buying land');

  // End Turn settles the purchase right after the development phase (FR-633), so its trade phase pays both timber tiles
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('news-list')).toContainText(/Our Developer bought 10-3 in Arvelia for \$[\d,]+\./);
  await expect(tile(page, '10-3')).toHaveAttribute('aria-label', 'Hardwood forest, timber, level 0, owned by Arvelia, held by Testland');
  await page.getByRole('button', { name: 'Deal Book', exact: true }).click();
  const book = page.getByRole('dialog', { name: /Deal Book/ });
  await expect(book.getByTestId('overseas-profits')).toHaveText(/^Overseas Profits2 Timber from Arvelia @ \$\d+ × 75%: \$\d+$/);
  await expect(book.getByTestId('treasury')).toContainText('Overseas profits');
  await page.screenshot({ path: info.outputPath('m18j-deal-book-1280.png') });
  await page.keyboard.press('Escape');

  // Phone width: the same views, no horizontal page scroll
  await page.setViewportSize({ width: 390, height: 844 });
  await tile(page, '11-3').click();
  await expect(tileInfo.getByTestId('tile-holding')).toContainText(/Held by: you, since turn 1.*Last turn's profit: \$\d+ from 2 Timber on all your land in Arvelia/);
  expect(await noSideScroll(page)).toBe(true);
  await page.screenshot({ path: info.outputPath('m18j-holding-390.png') });
  await page.getByRole('button', { name: 'Deal Book', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /Deal Book/ }).getByTestId('overseas-profits')).toBeVisible();
  expect(await noSideScroll(page)).toBe(true);
  await page.screenshot({ path: info.outputPath('m18j-deal-book-390.png') });
});
