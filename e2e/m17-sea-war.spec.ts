import { WARSHIPS, type WarshipType } from '../src/app/definisions/ships';
import { pairKey, resolveTurn, transferProvince, tryApplyOrder } from '../src/app/engine';
import { isAdjacentToOcean } from '../src/app/engine/map/mapHelpers';
import { portApproach } from '../src/app/engine/navy/fleets';
import { initializeRailroadNetworks } from '../src/app/engine/systems/railroadSystem';
import { createGameStore } from '../src/app/store/rootStore';
import { SAVE_KEY, saveOf, type SavedGame } from '../src/app/store/persistence';
import type { Fleet } from '../src/app/types/Navy';
import { GoodsType, MaterialType, ResourceType } from '../src/app/types/Resource';
import { continueSavedGame, expect, startFreshSeededGame, test, type Page } from './seededGame';

test.use({ viewport: { width: 1280, height: 720 } });

// Prepare the materials with ordinary production orders from a new seed-1 game. The browser starts before
// commissioning and all naval, diplomatic and deployment decisions go through the visible controls.
function shipyardSave() {
  const store = createGameStore({ seed: 1 });
  const { activeNationId: nationId, submitOrder, advanceTurn } = store.getState();
  expect(submitOrder({ kind: 'setProduction', nationId, building: 'metalWorks', output: GoodsType.Armaments, amount: 1 }).ok).toBe(true);
  expect(submitOrder({ kind: 'setProduction', nationId, building: 'textileMill', output: MaterialType.Fabric, amount: 1 }).ok).toBe(true);
  for (let turn = 1; turn <= 5; turn++) advanceTurn();
  const save = saveOf(store.getState());
  const nation = save.game.nations.find(n => n.id === nationId)!;
  expect(nation.warehouse.armaments).toBeGreaterThanOrEqual(5);
  expect(nation.warehouse.fabric).toBeGreaterThanOrEqual(3);
  return save;
}

async function advance(page: Page, turn: number) {
  await page.getByRole('button', { name: 'Advance Turn' }).click();
  await expect(page.getByTestId('turn-indicator')).toContainText(`Turn: ${turn} of 40`);
}

// The release smoke loads a production-only save. M17_FRESH_START=1 instead plays the funding
// turns from an empty browser slot, for the full New Game app check.
async function startShipyardGame(page: Page) {
  if (process.env.M17_FRESH_START !== '1') {
    await continueSavedGame(page, shipyardSave());
    await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 6 of 40');
    return;
  }
  await startFreshSeededGame(page);
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
  await page.getByRole('button', { name: /Open Capital/ }).click();
  const capital = page.getByRole('dialog', { name: /^Capital/ });
  await capital.getByTestId('building-metalWorks').getByRole('button', { name: 'More Armaments' }).click();
  await capital.getByTestId('building-textileMill').getByRole('button', { name: 'More Fabric' }).click();
  await capital.getByRole('button', { name: 'Close capital' }).click();
  for (let turn = 2; turn <= 6; turn++) await advance(page, turn);
}

test('FR-556 commission, sail and land at Sundmark, then see the survivors and colony', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await startShipyardGame(page);
  const openCapital = page.getByRole('button', { name: /Open Capital/ });
  const capital = page.getByRole('dialog', { name: /^Capital/ });
  const closeCapital = capital.getByRole('button', { name: 'Close capital' });
  const yard = capital.getByRole('region', { name: 'Shipyard' });
  const operations = yard.getByRole('region', { name: 'Fleet operations' });
  // FR-565: the Capital shows one section at a time and opens on Industry
  const openShipyard = () => capital.getByRole('navigation', { name: 'Capital sections' }).getByRole('button', { name: 'Shipyard', exact: true }).click();
  const openDiplomacy = page.getByRole('button', { name: 'Diplomacy', exact: true });
  const diplomacy = page.getByRole('dialog', { name: /^Diplomacy/ });
  const island = diplomacy.getByRole('tab', { name: 'Sundmark', exact: true });
  const sundmark = diplomacy.getByTestId('country-minor-2');
  const declare = sundmark.getByRole('button', { name: 'Declare war', exact: true });

  await openDiplomacy.click();
  await island.click();
  await expect(declare).toBeDisabled();
  await expect(declare).toHaveAccessibleDescription(/commission.*warship/i);
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();

  await openCapital.click();
  await openShipyard();
  const ship = yard.getByRole('listitem').filter({ hasText: 'Ship-of-the-Line ·' });
  const build = ship.getByRole('button', { name: 'Build one more Ship-of-the-Line' });
  const cancelBuild = ship.getByRole('button', { name: 'Build one less Ship-of-the-Line' });
  await expect(ship).toContainText('5 armaments · 8 lumber · 3 fabric');
  await build.click();
  await expect(ship).toContainText('Usable on turn 7.');
  await cancelBuild.click();
  await expect(build).toBeEnabled();
  await build.click();
  await closeCapital.click();
  await advance(page, 7);

  await openDiplomacy.click();
  await island.click();
  await declare.click();
  await sundmark.getByRole('group', { name: 'Confirm war on Sundmark' }).getByRole('button', { name: 'Declare war' }).click();
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();

  await openCapital.click();
  await openShipyard();
  await expect(operations).toContainText('Home berth');
  await expect(operations).toContainText('5 ARMS');
  await operations.getByLabel('Destination coast').selectOption({ label: 'Sundmark' });
  await operations.getByRole('button', { name: 'Sail', exact: true }).click();
  await expect(operations).toContainText('Sail to Sundmark at End Turn.');
  await closeCapital.click();
  await advance(page, 8);

  await openCapital.click();
  await openShipyard();
  await expect(operations).toContainText('Off Sundmark');
  await operations.getByRole('button', { name: 'Set landing site' }).click();
  await expect(operations).toContainText('Usable on turn 9.');
  await closeCapital.click();
  await advance(page, 9);

  const origin = page.getByRole('button', { name: /Testland army: force size 4, 3 regiments/ });
  const army = page.getByRole('dialog', { name: 'Army in Testland South-West' });
  await origin.click();
  for (const checkbox of await army.getByRole('checkbox').all()) await checkbox.check();
  await army.getByText(/^Sea deployment/).click();
  await expect(army).toContainText('Landing site usable from turn 9.');
  await army.getByRole('button', { name: 'Land troops' }).click();
  await expect(army.getByText(/^Sea deployment/)).toContainText('4 of 5 ARMS used');
  await expect(army.getByTestId('status').filter({ hasText: 'Landing at Sundmark' })).toHaveCount(3);
  await army.getByRole('button', { name: 'Close army' }).click();
  await advance(page, 10);

  const battle = page.getByRole('dialog', { name: 'Battle at Sundmark' });
  await battle.getByRole('button', { name: 'Skip to result' }).click();
  await expect(battle.getByTestId('battle-result')).toHaveText('Province Taken!');
  await battle.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('news-list')).toContainText('Sundmark is now our colony.');
  const islandMarker = page.locator('[data-tile-id="12-9"]').getByRole('button', { name: /^Testland army:/ });
  await islandMarker.click();
  const survivors = page.getByRole('dialog', { name: 'Army in Sundmark' });
  await expect(survivors.getByRole('checkbox').first()).toBeVisible();
  await survivors.getByRole('button', { name: 'Close army' }).click();

  await openDiplomacy.click();
  await expect(island.getByTestId('treaty').first()).toHaveText('Colony');
  await island.click();
  if (process.env.SCREENSHOT_DIR) {
    const screenshot = process.env.M17_FRESH_START === '1' ? 'm17-new-game-sundmark-colony' : 'm17-sundmark-colony';
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${screenshot}.png` });
  }
  await testInfo.attach('m17-sundmark-colony', { body: await page.screenshot(), contentType: 'image/png' });
  await diplomacy.getByRole('button', { name: 'Close diplomacy' }).click();
  await page.getByRole('button', { name: /Open Market/ }).click();
  // Re-recorded by M18c FR-573: old "Holds: 4 of 4 free"
  await expect(page.getByTestId('market-holds')).toHaveText(/^Holds: 0 of 4 used \(/);
  await page.getByRole('button', { name: 'Close Board of Trade' }).click();
  await advance(page, 11);
  await expect(page.getByRole('dialog', { name: 'Council of Governors' }).getByTestId('council-cell-nation-1-colonies')).toHaveAttribute('data-count', '1');
  expect(errors).toEqual([]);
});

// Prepared two-power fixture: Sundmark is Testland's isolated cotton port. Its resident Frigate
// has set a reinforcement site. Valdoria has privately ordered a stronger ship to intercept it.
function defenceSave() {
  const { activeNationId: testland, ...session } = createGameStore({ seed: 1 }).getState();
  const valdoria = 'nation-2';
  const island = 'province-minor-2';
  const game = transferProvince(session.game, island, testland);
  game.turn = 4;
  const port = game.map.tiles.flat().find(tile => tile.provinceId === island && isAdjacentToOcean(game.map, tile.x, tile.y))!;
  game.map = { ...game.map, tiles: game.map.tiles.map(row => row.map(tile => tile.id === port.id
    ? { ...tile, port: true, resource: { type: ResourceType.Cotton, level: 2, discovered: true } }
    : { ...tile, resource: undefined })) };
  const approach = portApproach(game, port)!;
  const squadron = (ownerNationId: string, id: string, type: WarshipType, deployed = false): Fleet => ({
    id, ownerNationId, name: id, ships: [{ ...WARSHIPS[type], id: `${id}-ship`, experience: 0 }],
    location: deployed ? approach.seaId : 'berth', aggression: 'normal',
    ...(deployed && { approach, siteSinceTurn: 3 }),
  });
  game.fleets = [squadron(testland, 'sundmark-frigate', 'frigate', true), squadron(testland, 'home-relief', 'shipOfTheLine'), squadron(valdoria, 'valdorian-squadron', 'shipOfTheLine')];
  game.nations = game.nations.map(nation => ({
    ...nation, controller: 'human', fleets: game.fleets.filter(fleet => fleet.ownerNationId === nation.id).map(fleet => fleet.id),
    warehouse: { ...nation.warehouse, cotton: 0 },
  }));
  game.transportNetwork = { ...game.transportNetwork, railroadNetworks: initializeRailroadNetworks(game.map, game.nations) };
  const pair = pairKey(testland, valdoria);
  game.diplomacy = { ...game.diplomacy, [pair]: { ...game.diplomacy[pair], war: { since: 1, aggressors: [valdoria] } } };
  const incoming = tryApplyOrder(game, { kind: 'setFleetMission', nationId: valdoria, fleetId: 'valdorian-squadron', mission: 'sail', provinceId: island });
  expect(incoming.result.ok).toBe(true);
  return saveOf({ ...session, activeNationId: testland, game: incoming.state });
}

test('FR-556 prepared Sundmark port: interception stops reinforcement, then relief restores cotton shipments', async ({ page }) => {
  await continueSavedGame(page, defenceSave());
  const origin = page.getByRole('button', { name: /Testland army: force size 4, 3 regiments/ });
  const army = page.getByRole('dialog', { name: 'Army in Testland South-West' });
  await origin.click();
  await army.getByRole('checkbox', { name: '1st Regulars' }).check();
  await army.getByText(/^Sea deployment/).click();
  await army.getByRole('button', { name: 'Reinforce by sea' }).click();
  await expect(army.getByText(/^Sea deployment/)).toContainText('1 of 2 ARMS used');
  await army.getByRole('button', { name: 'Close army' }).click();

  // Reload a pending reinforcement. Compare the resolved game to the engine continuing the same save directly.
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null') as SavedGame, SAVE_KEY);
  await expect.poll(async () => (await saved()).ordersThisTurn.some(order => order.kind === 'moveArmy' && order.via === 'sea')).toBe(true);
  const uninterrupted = resolveTurn((await saved()).game, {}).state;
  await page.reload();
  await page.getByRole('dialog', { name: 'Saved game' }).getByRole('button', { name: 'Continue' }).click();
  await origin.click();
  await expect(army.getByText(/^Sea deployment/)).toContainText('1 of 2 ARMS used');
  const regulars = army.getByTestId('regiment-1st Regulars');
  await expect(regulars.getByTestId('status')).toHaveText('Reinforcing by sea to Sundmark');
  await army.getByRole('button', { name: 'Close army' }).click();
  await advance(page, 5);
  await expect.poll(async () => (await saved()).game.fleets).toEqual(uninterrupted.fleets);
  const news = page.getByTestId('news-list');
  await expect(news).toContainText('Naval engagement off Sundmark after 3 rounds (Testland 3 against Valdoria 6 firepower afloat).');
  await expect(news).toContainText("Valdoria holds the approach. Testland's survivors returned to berth. Landing blocked.");
  await expect(news).toContainText(/Frigate sundmark-frigate-ship \(\d+ damage, \d+ hull left\)/);
  await news.getByText(/^Naval engagement off Sundmark/).scrollIntoViewIfNeeded();
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/q145-battle-report.png` });
  await expect(news).toContainText('Troops stayed at their origin.');
  await origin.click();
  await expect(regulars.getByTestId('health')).toHaveText('100%');
  await expect(regulars.getByTestId('status')).toHaveText('Available');
  await army.getByRole('button', { name: 'Close army' }).click();

  const openCapital = page.getByRole('button', { name: /Open Capital/ });
  const capital = page.getByRole('dialog', { name: /^Capital/ });
  const closeCapital = capital.getByRole('button', { name: 'Close capital' });
  const operations = capital.getByRole('region', { name: 'Fleet operations' });
  // FR-565: the Capital shows one section at a time and opens on Industry
  const openShipyard = () => capital.getByRole('navigation', { name: 'Capital sections' }).getByRole('button', { name: 'Shipyard', exact: true }).click();
  const warehouse = page.getByRole('dialog', { name: /^Warehouse/ });
  const checkCotton = async (count: number) => {
    await capital.getByRole('button', { name: 'Warehouse', exact: true }).click();
    await expect(warehouse.getByTestId('stock-cotton')).toHaveText(`Cotton${count}`);
    await warehouse.getByRole('button', { name: 'Close warehouse' }).click();
  };
  await openCapital.click();
  await checkCotton(0);
  await openShipyard();
  await expect(operations).toContainText('Ports closed to embarkation and sea freight.');
  await expect(operations).toContainText('9 firepower');
  await operations.getByLabel('Destination coast').selectOption({ label: 'Sundmark' });
  if (process.env.SCREENSHOT_DIR) {
    await operations.getByRole('button', { name: 'Sail', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m17-blockade.png` });
  }
  await operations.getByRole('button', { name: 'Sail', exact: true }).click();
  await closeCapital.click();
  await advance(page, 6);
  await expect(news).toContainText("Valdoria's survivors returned to berth.");
  await openCapital.click();
  await openShipyard();
  await expect(operations).toContainText('Off Sundmark');
  await expect(operations).not.toContainText('Ports closed');
  await checkCotton(3);
});

test('FR-556/560 the news explains why the second landing stayed at home', async ({ page }) => {
  const session = createGameStore({ seed: 1 }).getState();
  const [first, second] = session.game.nations;
  const island = 'province-minor-2';
  const target = session.game.provinces.find(p => p.id === island)!;
  const fleets: Fleet[] = [first, second].map(n => ({
    id: `fleet-${n.id}`, ownerNationId: n.id, name: n.name, ships: [{ ...WARSHIPS.shipOfTheLine, id: `ship-${n.id}`, experience: 0 }],
    location: '0-0', aggression: 'normal', siteSinceTurn: 1, approach: { provinceId: island, seaId: '0-0' },
  }));
  let game: typeof session.game = { ...session.game, turn: 2, fleets,
    armies: session.game.armies.filter(a => a.provinceId !== island),
    nations: session.game.nations.map(n => ({ ...n, controller: 'human' as const, fleets: [`fleet-${n.id}`] })),
    diplomacy: { ...session.game.diplomacy },
  };
  for (const [nation, regiment] of [[first, 'regiment-1'], [second, 'regiment-22']] as const) {
    const key = pairKey(nation.id, target.ownerId);
    game.diplomacy[key] = { ...game.diplomacy[key], war: { since: 1, aggressors: [nation.id] } };
    const origin = game.armies.find(a => a.regiments.some(r => r.id === regiment))!.provinceId;
    const ordered = tryApplyOrder(game, { kind: 'moveArmy', via: 'sea', nationId: nation.id, regimentIds: [regiment], fromProvinceId: origin, toProvinceId: island });
    expect(ordered.result).toEqual({ ok: true });
    game = ordered.state;
  }
  await continueSavedGame(page, saveOf({ ...session, game }));
  await advance(page, 3);
  const news = page.getByTestId('news-list');
  await expect(news).toContainText('Attack on Sundmark cancelled. Valdoria captured it first. Troops stayed in Testland South-West.');
  await news.getByText(/^Attack on Sundmark cancelled/).scrollIntoViewIfNeeded();
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/q145-cancelled-attack.png` });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('FR-556 Shipyard and Army controls fit a phone and explain the live rail allowance', async ({ page }) => {
    await continueSavedGame(page, shipyardSave());
    await page.getByRole('button', { name: /Open Capital/ }).click();
    const capital = page.getByRole('dialog', { name: /^Capital/ });
    // FR-565: the Capital shows one section at a time and opens on Industry
    await capital.getByRole('navigation', { name: 'Capital sections' }).getByRole('button', { name: 'Shipyard', exact: true }).click();
    const build = capital.getByRole('button', { name: 'Build one more Ship-of-the-Line' });
    await build.click();
    await expect(capital.getByTestId('shipyard-shipOfTheLine')).toHaveText('1');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m17-capital-phone.png` });
    await capital.getByRole('button', { name: 'Close capital' }).click();

    await page.getByRole('button', { name: /Testland army: force size 4, 3 regiments/ }).click();
    const army = page.getByRole('dialog', { name: 'Army in Testland South-West' });
    const rails = army.getByText(/^Rail deployment/);
    await expect(rails).toHaveText('Rail deployment · 0 of 3 ARMS used');
    await rails.click();
    const deploy = army.getByRole('button', { name: 'Deploy by rail' });
    const troops = await army.getByRole('checkbox').all();
    for (const troop of troops) await troop.check();
    await expect(deploy).toBeDisabled();
    await expect(deploy).toHaveAccessibleDescription('Selected troops need 4 ARMS, beyond the remaining rail allowance.');
    await troops[0].uncheck();
    await deploy.click();
    await expect(rails).toHaveText('Rail deployment · 3 of 3 ARMS used');
    const cancel = army.getByRole('button', { name: 'Cancel deployment of 2nd Regulars' });
    await cancel.click();
    await expect(rails).toHaveText('Rail deployment · 2 of 3 ARMS used');
    await army.getByRole('checkbox', { name: '1st Regulars' }).check();
    const destination = army.getByLabel('Rail destination');
    await destination.selectOption({ label: 'Testland North-West' });
    await deploy.click();
    await expect(rails).toHaveText('Rail deployment · 3 of 3 ARMS used');
    const box = (await deploy.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await rails.scrollIntoViewIfNeeded();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/m17-army-phone.png` });
    await army.getByRole('button', { name: 'Close army' }).click();
    await advance(page, 7);
    await expect(page.getByTestId('news-list')).toContainText('deployed by rail');
  });
});
