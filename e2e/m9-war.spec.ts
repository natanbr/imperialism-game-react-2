import { test, expect, Page, Locator } from '@playwright/test';

// FR-233 (M9 done) in the running app, on a new game: on turn 1 declare war on Arvelia and march the capital army from
// Testland South-West to Testland North-East (which borders Arvelia); on turn 2 open the Attack screen for Arvelia ("Attack
// Arvelia" in the Army screen's "March to", then "Attack…"), see the estimate and attack; on turn 3 see the Battle screen
// open by itself and, after "Skip to result", "Province Taken!" (the spec attacks again on the next turns, at most 3
// times, until it does); then see Arvelia's land as Testland's, inside Testland's outline in Testland's colour, and
// "Colony" for Arvelia in Diplomacy.
// On the way: the red attack arrow on the map, its file served and its ends measured on the two markers as drawn
// (FR-273, review R6), the Attack screen and the Battle screen fit 1280x720 without
// scrolling (FR-230, FR-231), the art pack's pictures load (FR-272), the battle's news line opens its Battle screen again
// (FR-232). Set SCREENSHOT_DIR to also save m9-attack.png, m9-arrow.png, m9-battle.png and m9-colony.png there; the
// Battle screen's shot is always attached to the test's report.
// M9 QA fix round: the Battle screen's side headings (FR-276) and no spoiler before the result (FR-277), the Attack
// screen's explanations (FR-278), the Attack screen in place of the Army screen and Cancel back to it (FR-279), the news
// heading of last turn (FR-280).

test.use({ viewport: { width: 1280, height: 720 } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function endTurn(page: Page, next: number) {
  await page.getByRole('button', { name: /Advance Turn/ }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${next} of 40`);
}

/** The dialog lies inside the 1280x720 window, does not scroll itself, and the page does not scroll either. */
async function fitsTheWindow(page: Page, dialog: Locator) {
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  expect(await dialog.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  const page_ = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
  }));
  expect(page_.height).toBeLessThanOrEqual(page_.innerHeight);
  expect(page_.width).toBeLessThanOrEqual(page_.innerWidth);
}

/** Every picture of the art pack in the locator has loaded (a missing file has no natural width). */
async function picturesLoaded(where: Locator) {
  const pictures = where.locator('img[src^="/assets/ink-and-wash/"]');
  expect(await pictures.count()).toBeGreaterThan(0);
  await expect
    .poll(() => pictures.evaluateAll((imgs) => imgs.filter((img) => !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalWidth === 0).length))
    .toBe(0);
}

const shot = async (page: Page, name: string) => {
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}` });
};

const markerOn = (page: Page, tileId: string) => page.locator(`[data-tile-id="${tileId}"]`).getByTestId('army-marker').first();

/** The pack's red arrow file (map-ui/army-attack.svg, 120x56): its tail's middle and its tip, in the file's units (inkArt.ts). */
const ATTACK_ART = { tail: { x: 8, y: 44 }, tip: { x: 112, y: 9 } };

/**
 * FR-273 (review R6): the red arrow as the browser draws it. The file's tail and tip, taken through the <image>'s own
 * transform, lie in map pixels 15 px on from the source marker's box centre and 15 px short of the target's, on the line
 * between the two (as FR-271 measures a march arrow).
 */
async function expectAttackArrowOnMarkers(arrow: Locator, from: Locator, to: Locator) {
  const centre = async (marker: Locator) => {
    const box = (await marker.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const at = await arrow.evaluate(
    (g, c) => {
      const image = g.querySelector('[data-testid="attack-art"]') as SVGImageElement;
      const toMap = image.ownerSVGElement!.getScreenCTM()!.inverse();
      const map = (p: { x: number; y: number }) => {
        const q = new DOMPoint(p.x, p.y).matrixTransform(toMap);
        return { x: q.x, y: q.y };
      };
      const m = image.transform.baseVal.consolidate()!.matrix;
      const drawn = (p: { x: number; y: number }) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
      return { tail: drawn(c.art.tail), tip: drawn(c.art.tip), from: map(c.from), to: map(c.to) };
    },
    { from: await centre(from), to: await centre(to), art: ATTACK_ART }
  );
  const length = Math.hypot(at.to.x - at.from.x, at.to.y - at.from.y);
  const [ux, uy] = [(at.to.x - at.from.x) / length, (at.to.y - at.from.y) / length];
  const near = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y) <= 1.5;
  const want = { tail: { x: at.from.x + 15 * ux, y: at.from.y + 15 * uy }, tip: { x: at.to.x - 15 * ux, y: at.to.y - 15 * uy } };
  expect(near(at.tail, want.tail), `the tail lies at ${JSON.stringify(at.tail)}, 15 px on from the source marker is ${JSON.stringify(want.tail)}`).toBe(true);
  expect(near(at.tip, want.tip), `the tip lies at ${JSON.stringify(at.tip)}, 15 px short of the target marker is ${JSON.stringify(want.tip)}`).toBe(true);
}

/**
 * FR-233 (review R7): the nation's territory outline as drawn (its stroke, and how far east it runs in the rows of a
 * tile), and that tile's centre, in map pixels. The outline is one path of "M x1 y1 L x2 y2" sides (territoryBorders.ts).
 */
async function outlineAround(page: Page, nationId: string, tileId: string) {
  const tile = (await page.locator(`[data-tile-id="${tileId}"]`).boundingBox())!;
  return page.locator(`[data-testid="territory-border"][data-nation-id="${nationId}"]`).evaluate((path, box) => {
    const toMap = (path as SVGPathElement).ownerSVGElement!.getScreenCTM()!.inverse();
    const map = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(toMap);
    const [top, bottom] = [map(box.x, box.y).y, map(box.x, box.y + box.height).y];
    const sides = (path.getAttribute('d') ?? '').match(/M[^M]+/g)!.map((side) => side.match(/-?[\d.]+/g)!.map(Number));
    const inRows = sides.filter(([, y1, , y2]) => Math.min(y1, y2) >= top - 0.5 && Math.max(y1, y2) <= bottom + 0.5);
    return {
      stroke: path.getAttribute('stroke'),
      east: Math.max(...inRows.flatMap(([x1, , x2]) => [x1, x2])),
      centre: map(box.x + box.width / 2, box.y + box.height / 2).x,
    };
  }, tile);
}

/**
 * FR-276: each side's heading as drawn: above its own tokens (its bottom at or above the list's top) and over its own
 * columns (left edge within the list's width), the attackers' to the left of the defenders'.
 */
async function headingsOverTheirSides(battle: Locator, attackers: string, defenders: string) {
  const boxes = async (name: string) => ({
    heading: (await battle.getByRole('heading', { name }).boundingBox())!,
    list: (await battle.getByRole('list', { name }).boundingBox())!,
  });
  const [a, d] = [await boxes(attackers), await boxes(defenders)];
  for (const { heading, list } of [a, d]) {
    expect({ above: heading.y + heading.height <= list.y + 0.5, over: heading.x >= list.x - 0.5 && heading.x < list.x + list.width }).toEqual({ above: true, over: true });
  }
  expect(a.heading.x + a.heading.width).toBeLessThanOrEqual(d.heading.x + 0.5);
}

/** FR-278: a token's status word ("Destroyed", "Routed") stays inside its token, wrapping under the bar rather than past its edge. */
async function statusesInsideTheirTokens(battle: Locator) {
  const outside = await battle.getByTestId('token-status').evaluateAll((els) =>
    els
      .filter((el) => {
        const token = el.closest('li')!.getBoundingClientRect();
        const status = el.getBoundingClientRect();
        return status.right > token.right + 0.5 || status.left < token.left - 0.5;
      })
      .map((el) => el.textContent)
  );
  expect(outside).toEqual([]);
}

/** The Army screen of Testland North-East: our marker on its seat (7-3), the province's owner first. */
async function openNorthEast(page: Page) {
  await page.locator('[data-tile-id="7-3"]').getByTestId('army-marker').first().click();
  const army = page.getByRole('dialog', { name: 'Army in Testland North-East' });
  await expect(army).toBeVisible();
  return army;
}

/** Ticks every regiment that may go, picks "Attack Arvelia", opens the Attack screen, checks it and attacks. */
async function attackArvelia(page: Page, attempt: number) {
  const army = await openNorthEast(page);
  const boxes = army.getByRole('checkbox');
  const count = await boxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await boxes.nth(i).check();
  await army.getByRole('combobox', { name: 'March to' }).selectOption({ label: 'Attack Arvelia' });
  await army.getByRole('button', { name: 'Attack…' }).click();

  const attack = page.getByRole('dialog', { name: 'Attack Arvelia' });
  await expect(attack).toBeVisible();
  // FR-279 (M9 QA item 4): the Attack screen replaces the Army screen, so one dialog shows at a time
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(attack.getByRole('list', { name: 'Our regiments' }).getByRole('listitem')).toHaveCount(count);
  await expect(attack.getByRole('list', { name: 'Defenders' }).getByRole('listitem').first()).toContainText('Minutemen');
  await expect(attack.getByTestId('attack-estimate')).toHaveText(/^Our strength [\d.]+, theirs [\d.]+: (Likely victory|Uncertain|Likely defeat)$/);
  if (attempt === 1) {
    // The start army against Arvelia's three entrenched Minutemen (FR-226's example)
    await expect(attack.getByTestId('attack-estimate')).toHaveText('Our strength 36, theirs 18.8: Likely victory');
    await expect(attack.getByRole('list', { name: 'Defenders' }).getByTestId('protection')).toHaveText(['entrenched', 'entrenched', 'entrenched']);
    // FR-278 (M9 QA item 3): the estimate and "entrenched" explained in words on the screen
    await expect(attack.getByTestId('estimate-explanation')).toBeVisible();
    await expect(attack.getByTestId('estimate-explanation')).toHaveText(/^Strength: each regiment's firepower times its health, added up; an entrenched defender's counts 1\.25 times\./);
    await expect(attack.getByTestId('entrenched-legend')).toHaveText('Entrenched: takes 20% less damage.');
    await picturesLoaded(attack);
    await fitsTheWindow(page, attack);
    await shot(page, 'm9-attack.png');
    // FR-279: Cancel goes back to the Army screen with the same ticks and "Attack Arvelia" still picked
    await attack.getByRole('button', { name: 'Cancel' }).click();
    await expect(attack).toHaveCount(0);
    await expect(army).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    for (let i = 0; i < count; i++) await expect(boxes.nth(i)).toBeChecked();
    await expect(army.getByRole('combobox', { name: 'March to' }).locator('option:checked')).toHaveText('Attack Arvelia');
    await expect(army.getByRole('button', { name: 'Attack…' })).toBeFocused();
    await army.getByRole('button', { name: 'Attack…' }).click();
    await expect(attack).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
  }
  // FR-273 (review R6): the red arrow's file is fetched and served when the first attack draws it
  const arrowArt = attempt === 1 ? page.waitForResponse((r) => r.url().endsWith('/assets/ink-and-wash/map-ui/army-attack.svg')) : undefined;
  await attack.getByRole('button', { name: 'Attack', exact: true }).click();
  await expect(attack).toHaveCount(0);
  await expect(army.getByTestId('status').first()).toHaveText('Attacking Arvelia');
  await page.keyboard.press('Escape');
  await expect(army).toHaveCount(0);

  // FR-273: the red attack arrow on the map, named and counted
  const arrow = page.getByRole('img', { name: `Arvelia: ${count} regiment${count === 1 ? '' : 's'} attacking from Testland North-East` });
  await expect(arrow).toBeVisible();
  await expect(arrow.getByTestId('attack-count')).toHaveText(String(count));
  if (attempt === 1) {
    const served = (await arrowArt)!;
    expect({ ok: served.ok(), type: served.headers()['content-type'] }).toEqual({ ok: true, type: expect.stringContaining('image/svg+xml') });
    await expectAttackArrowOnMarkers(arrow, markerOn(page, '7-3'), markerOn(page, '11-4'));
    await shot(page, 'm9-arrow.png');
  }
}

test('FR-233 FR-230 FR-231 FR-232 FR-273 declare war on Arvelia, attack it, see the battle and take it as a colony', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
  // Before the war Testland's outline, in its colour, stops west of Arvelia's capital tile (review R7)
  const before = await outlineAround(page, 'nation-1', '11-4');
  expect({ stroke: before.stroke, drawnThere: Number.isFinite(before.east), westOfIt: before.east < before.centre }).toEqual({
    stroke: 'var(--color-nation-1)',
    drawnThere: true,
    westOfIt: true,
  });

  // Turn 1: declare war on Arvelia in Diplomacy (asked in place first)
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  const diplomacy = page.getByRole('dialog', { name: /^Diplomacy/ });
  await expect(diplomacy).toBeVisible();
  await diplomacy.getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name: 'Arvelia', exact: true }).click();
  const arvelia = diplomacy.getByRole('tabpanel', { name: 'Arvelia', exact: true });
  await arvelia.getByRole('button', { name: 'Declare war' }).click();
  await arvelia.getByRole('group', { name: 'Confirm war on Arvelia' }).getByRole('button', { name: 'Declare war' }).click();
  await expect(arvelia.getByTestId('ordered')).toHaveText([/^Declaration of war/]);
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await expect(diplomacy).toHaveCount(0);

  // March the capital army (1st and 2nd Regulars, 1st Artillery) from South-West to North-East
  await page.getByRole('button', { name: 'Testland army: force size 4, 3 regiments, 4 militia', exact: true }).click();
  const capitalArmy = page.getByRole('dialog', { name: 'Army in Testland South-West' });
  await expect(capitalArmy).toBeVisible();
  await picturesLoaded(capitalArmy);
  for (const name of ['1st Regulars', '2nd Regulars', '1st Artillery']) await capitalArmy.getByRole('checkbox', { name }).check();
  await capitalArmy.getByRole('combobox', { name: 'March to' }).selectOption({ label: 'Testland North-East' });
  await capitalArmy.getByRole('button', { name: 'March', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(capitalArmy).toHaveCount(0);
  // GREEN means movement (FR-273): the march arrow is drawn in the pack's movement colour
  const march = page.getByRole('img', { name: 'Testland North-East: 3 regiments marching in from Testland South-West' });
  await expect(march).toBeVisible();
  await expect(march.getByTestId('march-line')).toHaveAttribute('stroke', 'var(--color-army-move)');
  await endTurn(page, 2);

  // Turn 2 on: attack Arvelia from North-East; the Battle screen opens by itself the next turn
  let taken = false;
  for (let attempt = 1; attempt <= 3 && !taken; attempt++) {
    await attackArvelia(page, attempt);
    await endTurn(page, 2 + attempt);

    const battle = page.getByRole('dialog', { name: 'Battle at Arvelia' });
    await expect(battle).toBeVisible();
    // FR-277 (M9 QA item 2): the deployment shows the two forces and tells nothing of the outcome
    await expect(battle.getByTestId('battle-step')).toHaveText('Deployment');
    await expect(battle.getByRole('list', { name: 'Forces' }).getByRole('listitem')).toHaveText([/^Testland attacks: /, /^Arvelia defends: /]);
    await expect(battle).not.toContainText(/rounds? (was|were) fought/);
    await expect(battle.getByRole('list', { name: 'Attackers: Testland' }).getByRole('listitem')).not.toHaveCount(0);
    // FR-276 (M9 QA item 1): a visible heading over each side of the grid
    await expect(battle.getByRole('heading', { name: 'Attackers: Testland' })).toBeVisible();
    await expect(battle.getByRole('heading', { name: 'Defenders: Arvelia' })).toBeVisible();
    if (attempt === 1) {
      await headingsOverTheirSides(battle, 'Attackers: Testland', 'Defenders: Arvelia');
      await picturesLoaded(battle);
      await fitsTheWindow(page, battle);
    }
    // One round, then the result; the total of rounds only at the result (FR-277)
    if (await battle.getByRole('button', { name: 'Next round' }).isEnabled()) {
      await battle.getByRole('button', { name: 'Next round' }).click();
      await expect(battle.getByTestId('battle-step')).toHaveText(/^(Round 1|Result: no round was fought)$/);
    }
    await battle.getByRole('button', { name: 'Skip to result' }).click();
    const result = battle.getByTestId('battle-result');
    await expect(result).toHaveText(/^(Province Taken!|Attack Failed!)$/);
    await expect(battle.getByTestId('battle-step')).toHaveText(/^Result: (\d+ rounds were fought|1 round was fought|no round was fought)$/);
    await expect(battle).not.toContainText('KIA');
    await statusesInsideTheirTokens(battle);
    await expect(battle.getByRole('list', { name: 'Casualties' }).getByRole('listitem')).not.toHaveCount(0);
    taken = (await result.innerText()) === 'Province Taken!';
    if (taken) {
      await fitsTheWindow(page, battle);
      const picture = await page.screenshot();
      await testInfo.attach('m9-battle.png', { body: picture, contentType: 'image/png' });
      await shot(page, 'm9-battle.png');
    }
    await battle.getByRole('button', { name: 'Close' }).click();
    await expect(battle).toHaveCount(0);
  }
  expect(taken, 'Arvelia taken within 3 attacks').toBe(true);

  // FR-280 (M9 QA item 5): the news are last turn's, and their heading says so beside the HUD's current turn
  const turnNow = Number((await page.getByTestId('turn-indicator').innerText()).match(/Turn: (\d+) of 40/)![1]);
  await expect(page.getByRole('heading', { level: 3, name: new RegExp(`^News from last turn \\(turn ${turnNow - 1}, (Spring|Summer|Fall|Winter) 1815\\)$`) })).toBeVisible();

  // FR-232: the battle's news line opens its Battle screen again
  const news = page.getByTestId('news-list');
  await news.getByRole('button', { name: 'Battle at Arvelia: Province Taken!' }).click();
  const again = page.getByRole('dialog', { name: 'Battle at Arvelia' });
  await expect(again).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(again).toHaveCount(0);
  await expect(news).toContainText('Arvelia taken.');
  await expect(news).toContainText('Arvelia is now our colony.');

  // Arvelia's land is Testland's now: its capital tile names its owner, its dashed minor border is gone, and Testland's
  // outline in Testland's colour runs round it, east of its capital tile (review R7)
  await expect(page.locator('[data-tile-id="11-4"]')).toHaveAttribute('aria-label', /owned by Testland$/);
  await expect(page.locator('[data-testid="minor-border"][data-minor-id="minor-1"]')).toHaveCount(0);
  const after = await outlineAround(page, 'nation-1', '11-4');
  expect({ stroke: after.stroke, eastOfIt: after.east > after.centre }).toEqual({ stroke: 'var(--color-nation-1)', eastOfIt: true });
  await shot(page, 'm9-colony.png');

  // "Colony" for Arvelia in Diplomacy
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await expect(diplomacy).toBeVisible();
  await expect(diplomacy.getByRole('tablist', { name: 'Countries' }).getByRole('tab', { name: 'Arvelia', exact: true }).getByTestId('treaty').first()).toHaveText('Colony');
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();

  expect(errors).toEqual([]);
});
