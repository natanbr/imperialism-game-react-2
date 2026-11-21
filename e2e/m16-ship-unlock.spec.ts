import { expect, startSeededGame, test } from './seededGame';

test.use({ viewport: { width: 1280, height: 720 } });

test('FR-525 FR-526 purchasing Streamlined Hulls on turn 3 offers the Clipper on turn 4', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await startSeededGame(page);
  const openCapital = page.getByRole('button', { name: /Open Capital/ });
  const capital = page.getByRole('dialog', { name: /^Capital/ });
  const closeCapital = capital.getByRole('button', { name: 'Close capital' });
  const shipyard = capital.getByRole('region', { name: 'Shipyard' });
  const clipper = shipyard.getByRole('button', { name: 'Build one more Clipper' });
  const nextTurn = page.getByRole('button', { name: 'Advance Turn' });
  const turn = page.getByTestId('turn-indicator');

  await openCapital.click();
  await expect(shipyard.getByRole('button', { name: 'Build one more Trader' })).toBeAttached();
  await expect(clipper).toHaveCount(0);
  // The starting warehouse has lumber and raw cotton. Make the sailcloth before investing in the hull.
  await capital.getByTestId('building-textileMill').getByRole('button', { name: 'More Fabric' }).click();
  await closeCapital.click();
  for (const number of [2, 3]) {
    await nextTurn.click();
    await expect(turn).toContainText(`Turn: ${number} of 40`);
  }
  await openCapital.click();
  await capital.getByRole('button', { name: 'Technology', exact: true }).click();
  const technology = page.getByRole('dialog', { name: 'Invest in Technology' });
  const available = technology.getByRole('region', { name: 'Available' });
  const offer = available.getByRole('listitem').filter({ hasText: 'Streamlined Hulls' });
  await expect(offer).toContainText('$1,500');
  await offer.getByRole('button', { name: 'Buy Streamlined Hulls' }).click();
  await expect(offer.getByRole('button', { name: 'Cancel Streamlined Hulls' })).toBeVisible();
  await expect(offer).toContainText('Ordered for next turn');
  await technology.getByRole('button', { name: 'Close technology' }).click();
  await expect(clipper).toHaveCount(0);
  await closeCapital.click();
  await nextTurn.click();
  await expect(turn).toContainText('Turn: 4 of 40');
  await openCapital.click();
  const row = shipyard.getByRole('listitem').filter({ hasText: 'Clipper' });
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeInViewport({ ratio: 1 });
  await expect(clipper).toBeEnabled();
  await expect(row).toContainText('Clipper · 4 holds');
  await expect(row).toContainText('6 lumber · 2 fabric');
  if (process.env.SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m16-clipper-unlocked.png` });
  }
  await clipper.click();
  await expect(shipyard.getByTestId('shipyard-clipper')).toHaveText('1');
  expect(errors).toEqual([]);
});
