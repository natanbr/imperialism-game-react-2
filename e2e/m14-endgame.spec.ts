import { expect, test } from './seededGame';
import { continueCouncilSave } from './councilSave';

test('FR-506 the entire winning threshold is visible in the 1280px HUD before opening Nation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  const line = page.getByTestId('next-council');
  const width = await line.evaluate(el => {
    const text = el.firstChild!;
    const target = '7 of 12 votes wins · Council: turn 10';
    const index = text.textContent!.indexOf(target);
    if (index < 0) throw new Error('HUD is missing the vote threshold and next Council turn');
    const range = document.createRange();
    range.setStart(text, index);
    range.setEnd(text, index + target.length);
    return { leadRight: range.getBoundingClientRect().right, lineRight: el.getBoundingClientRect().right };
  });
  // Leave a full ellipsis after the threshold. An assertion on textContent alone passed while the number was clipped.
  expect(width.leadRight + 13).toBeLessThanOrEqual(width.lineRight);
  await expect(line).toContainText('Council: turn 10 (Summer 1817)');
});

test('FR-504 FR-506 FR-507 Continue at turn 39, resolve the last Council, and open the final standings', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await continueCouncilSave(page, 'last');
  const advance = page.getByRole('button', { name: /Advance Turn/ });
  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  await expect(page.getByTestId('next-council')).toHaveAttribute('title', /7 of 12 votes wins.*last meeting \(turn 40\)/);
  await expect(page.getByTestId('next-council')).toContainText('This threshold applies at any meeting.');
  await page.getByRole('button', { name: 'Close stats' }).click();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  const help = page.getByRole('dialog', { name: 'How to play' });
  await expect(help.getByTestId('howto-goal')).toContainText('the nominee with more votes wins (equal votes: higher standing)');
  await help.getByRole('button', { name: 'Close' }).click();
  await advance.click();
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 40 of 40');
  await advance.click();
  const council = page.getByRole('dialog', { name: 'Council of Governors' });
  await expect(council.getByTestId('council-abstained')).toHaveText('Abstained: none');
  await expect(council.getByText('Last meeting: every governor chose.')).toBeVisible();
  await expect(council.getByText(/^6 to 6: Valdoria wins on standing \([\d,]+ against [\d,]+\)\.$/)).toBeVisible();
  const scores = council.getByRole('button', { name: 'See the final scores' });
  await expect(scores).toBeInViewport({ ratio: 1 });
  await testInfo.attach('M14 last Council', { body: await page.screenshot(), contentType: 'image/png' });
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m14-last-council.png` });
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(scores).toBeInViewport({ ratio: 1 });
  await scores.click();
  const over = page.getByRole('dialog', { name: 'Game over' });
  await expect(over.getByTestId('game-over-council')).toHaveText('Defeat: The Council of Governors chose Valdoria at the last meeting: 6 of 12 votes, on standing.');
  const table = over.getByRole('table', { name: 'Final scores' });
  for (const name of ['Score', 'Provinces', 'Military', 'Standing']) await expect(table.getByRole('columnheader', { name, exact: true })).toHaveCount(1);
  await expect(table.getByRole('row').nth(1).getByRole('rowheader')).toHaveText('Valdoria');
});

test('FR-503 FR-507 giving a grant in Diplomacy wins the seventh vote at the first meeting', async ({ page }) => {
  await continueCouncilSave(page, 'grant');
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: 'Diplomacy' });
  await diplomacy.getByRole('tab', { name: 'Pellis', exact: true }).click();
  const grant = diplomacy.getByRole('tabpanel', { name: 'Pellis' }).getByRole('group', { name: 'Grant', exact: true });
  await grant.getByRole('button', { name: 'Give', exact: true }).click();
  await grant.getByRole('group', { name: 'Confirm grant to Pellis' }).getByRole('button', { name: 'Give $1,000' }).click();
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  const council = page.getByRole('dialog', { name: 'Council of Governors' });
  await expect(council.getByTestId('council-result')).toHaveText('Testland Wins!');
  await expect(council.getByTestId('council-cell-nation-1-total')).toHaveText('7');
  await expect(council.getByTestId('council-cell-nation-1-otherMinorNations')).toHaveAttribute('title', 'Sundmark, Lorran, Pellis');
});
