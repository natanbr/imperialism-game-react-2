import type { TestInfo } from '@playwright/test';
import { ResourceType } from '../src/app/types/Resource';
import { TerrainType } from '../src/app/types/Tile';
import { WorkerType } from '../src/app/types/Workers';
import { expect, startFreshSeededGame, startSeededGame, test, type Page } from './seededGame';

async function ready(page: Page) {
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true');
  const narrow = page.getByTestId('narrow-window');
  if (await narrow.isVisible()) await narrow.getByRole('button', { name: 'Dismiss' }).click();
}

async function capture(page: Page, info: TestInfo, scene: string) {
  const { width, height } = page.viewportSize()!;
  const name = `m18d-${scene}-${width}x${height}.png`;
  const path = process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : info.outputPath(name);
  await page.screenshot({ path, animations: 'disabled' });
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test.describe(`M18d at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('FR-583 FR-584 FR-586 the opening capital fishes its coast and the catch is available in Transport', async ({ page }, info) => {
      await startFreshSeededGame(page);
      await ready(page);
      const grounds = page.getByRole('group', { name: /fishing ground$/ });
      const catchCount = await grounds.count();
      expect(catchCount).toBeGreaterThan(0);
      const coast = grounds.first();
      const art = coast.getByTestId('fishing-ground');
      await expect(art).toHaveAttribute('data-art', 'goods/fish.png');
      // FR-339: both map marks use one lossless sheet and display their own square frame.
      const coal = page.locator('[data-testid="resource-mark"][data-art="goods/coal.png"]').first();
      for (const [mark, position] of [[coal, '0% 50%'], [art, '100% 50%']] as const) {
        await expect(mark).toHaveAttribute('src', '/assets/map-atlases/coal-fish.webp');
        await expect(mark).toHaveCSS('object-fit', 'cover');
        await expect(mark).toHaveCSS('object-position', position);
        await expect.poll(() => mark.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(256);
      }
      await coast.click();
      await expect(page.getByTestId('tile-info')).toContainText('Fishing ground · 1 Fish a turn for the capital.');
      await capture(page, info, 'capital-fishing');

      await page.getByRole('button', { name: /Transportation of Commodities/ }).click();
      const freight = page.getByRole('dialog', { name: 'Transportation of Commodities' });
      const fish = freight.getByRole('slider', { name: 'Fish', exact: true });
      await expect(fish).toHaveAttribute('max', String(catchCount));
      await fish.scrollIntoViewIfNeeded();
      await capture(page, info, 'transport-fish');
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: /Open Warehouse/ }).click();
      const stock = page.getByRole('dialog', { name: /Warehouse/ }).getByTestId('stock-fish');
      await expect(stock).toContainText('Fish');
      await expect(stock).not.toContainText('No known local source');
    });

    test('FR-580 FR-586 a miner on a discovered mountain deposit sees the required technology', async ({ page }, info) => {
      // The fixed map has no mountain mines. Continue a saved position with a miner on a working coal mine.
      const site = '3-9';
      await startSeededGame(page, game => {
        const tiles = game.map.tiles.flat();
        const capital = tiles.find(t => t.cityId === game.nations[0].cities[0])!;
        const miner = capital.workers.find(w => w.type === WorkerType.Miner)!;
        const mountain = tiles.find(t => t.id === site)!;
        expect(mountain.ownerNationId).toBe(miner.nationId);
        capital.workers = capital.workers.filter(w => w.id !== miner.id);
        mountain.workers = [...mountain.workers, { ...miner, assignedTileId: site }];
        mountain.terrain = TerrainType.Mountains;
        mountain.resource = { type: ResourceType.Coal, level: 1, discovered: true };
      });
      await ready(page);
      await page.locator(`[data-tile-id="${site}"]`).click({ position: { x: 6, y: 6 } });
      const panel = page.getByTestId('tile-info');
      await expect(panel).toContainText('Coal (L1)');
      await panel.getByText('miner - available', { exact: true }).click();
      const improve = panel.getByRole('button', { name: 'Develop miner L2' });
      await expect(improve).toBeDisabled();
      await expect(improve).toHaveAccessibleDescription('Needs Square-Set Timbering.');
      await panel.getByText('Needs Square-Set Timbering.', { exact: true }).scrollIntoViewIfNeeded();
      await capture(page, info, 'mountain-mine-refusal');
    });
  });
}
