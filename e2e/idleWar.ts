import { expect, Page } from '@playwright/test';

// Shared by the specs that end many turns as an idle player (e2e/market-and-game-over.spec.ts, e2e/m10-qa.spec.ts); not a
// spec file.

/**
 * M13 (FR-488, FR-489): from turn 20 the computer may go to war with an idle player, so a Battle screen (FR-237) and
 * Valdoria's peace offer (Accept Offer, FR-175) can open by themselves after End Turn, each over the Advance Turn button.
 * An idle player closes them without an answer: a closed offer is refused at End Turn (FR-175, FR-410), as the sim's
 * `idle` human does (tests/engine/sim/humans.ts). The Battle screens come first and the offer waits for every other
 * dialog (FR-409), so call this after the turn indicator moved and again after closing a Council screen.
 */
export async function closeWarScreens(page: Page) {
  const battle = page.getByRole('dialog', { name: /^Battle at / });
  const offer = page.getByRole('dialog', { name: 'Accept Offer' });
  for (let guard = 0; guard < 20; guard++) {
    if (await battle.count()) {
      await battle.getByRole('button', { name: 'Close', exact: true }).click();
      continue;
    }
    if (await offer.count()) {
      await offer.getByRole('button', { name: 'Close offer' }).click();
      continue;
    }
    break;
  }
  await expect(battle).toHaveCount(0);
  await expect(offer).toHaveCount(0);
}
