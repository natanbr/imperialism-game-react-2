import { test, expect, Page, Locator } from '@playwright/test';

// M11 (NR-032) lane 3 in the running app, a new continent game at 1280x720: the art pack's pictures in the lists, dialogs
// and HUD load, and fit.
// FR-333: each production card's head, with its building's picture, is at most 24 px high, and the picture is no taller
// than the head's text line. FR-331, FR-332, FR-333, FR-334: every img[data-art] in the Capital dialog, the Armoury, the
// Board of Trade, the Warehouse and the Transportation of Commodities popup is loaded (complete, natural width above 0),
// with no console error. FR-334: the HUD's buttons that show a building are exactly as high as those that keep a Game Icon,
// so the HUD's news keeps its lines (FR-268, FR-315).
// Set SCREENSHOT_DIR to also save m11-lists-capital.png, m11-lists-board.png and m11-lists-transport.png there.

test.use({ viewport: { width: 1280, height: 720 } });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('turn-indicator')).toContainText('Turn: 1 of 40');
}

/** Every pack picture inside `where` is loaded: the files of the ones that are not (none expected), and how many there are. */
async function expectLoaded(where: Locator, atLeast: number) {
  const pictures = where.locator('img[data-art]');
  await expect.poll(() => pictures.count()).toBeGreaterThanOrEqual(atLeast);
  await expect
    .poll(() =>
      pictures.evaluateAll((imgs) =>
        imgs.filter((img) => !((img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).map((img) => img.getAttribute('data-art'))
      )
    )
    .toEqual([]);
  // Each one decorative: the text beside it names the thing (FR-336)
  expect(await pictures.evaluateAll((imgs) => imgs.filter((img) => img.getAttribute('alt') !== '').map((img) => img.getAttribute('data-art')))).toEqual([]);
}

const shot = async (page: Page, name: string) => {
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}` });
};

test('FR-333 FR-331 FR-332 the Capital dialog: card heads at most 24 px with their buildings, every picture loaded; the Armoury too', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);

  await page.getByRole('button', { name: /Open Capital/ }).click();
  const capital = page.getByRole('dialog', { name: /Capital/ });
  await expect(capital).toBeVisible();
  // 7 card heads, 7 outputs' worth of goods, the Labour and Transport panels' pictures, the title and three buttons
  await expectLoaded(capital, 30);

  const heads = await capital.locator('section[data-testid^="building-"] > header').evaluateAll((els) =>
    els.map((el) => {
      const title = el.querySelector('h4')!;
      const picture = title.querySelector('img');
      return {
        card: el.parentElement!.getAttribute('data-testid'),
        head: el.getBoundingClientRect().height,
        line: title.getBoundingClientRect().height,
        picture: picture ? picture.getBoundingClientRect().height : -1,
        art: picture?.getAttribute('data-art') ?? null,
      };
    })
  );
  expect(heads).toHaveLength(7);
  for (const h of heads) {
    expect(h.art, h.card ?? '').toMatch(/^buildings\//);
    expect(h.head, h.card ?? '').toBeLessThanOrEqual(24);
    expect(h.picture, h.card ?? '').toBeGreaterThan(0);
    expect(h.picture, h.card ?? '').toBeLessThanOrEqual(h.line + 0.5);
  }
  await shot(page, 'm11-lists-capital.png');

  // The Armoury over the capital: the regiments' pictures, then the grades', armaments' and horses' pictures
  await capital.getByRole('button', { name: 'Armoury', exact: true }).click();
  const armoury = page.getByRole('dialog', { name: 'Armoury' });
  await expect(armoury).toBeVisible();
  await expectLoaded(armoury, 7 * 4);
  await armoury.getByRole('button', { name: 'Close Armoury' }).click();
  await expect(armoury).toHaveCount(0);
  await capital.getByRole('button', { name: 'Close capital' }).click();
  expect(errors).toEqual([]);
});

test('FR-331 FR-334 the Board of Trade, the Warehouse and the Transport popup: every picture loaded', async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectErrors(page);
  await open(page);

  await page.getByRole('button', { name: /Open Market/ }).click();
  const board = page.getByRole('dialog', { name: 'Board of Trade' });
  await expect(board).toBeVisible();
  await expect(board.locator('[data-testid^="trade-row-"] [data-testid="name"] > img:first-child')).toHaveCount(17);
  await expectLoaded(board, 17);
  await shot(page, 'm11-lists-board.png');
  await board.getByRole('button', { name: 'Close Board of Trade' }).click();
  await expect(board).toHaveCount(0);

  await page.getByRole('button', { name: /Open Warehouse/ }).click();
  const warehouse = page.getByRole('dialog', { name: /Warehouse/ });
  await expect(warehouse).toBeVisible();
  await expect(warehouse.locator('[data-testid^="stock-"] img[data-art]')).toHaveCount(21);
  await expectLoaded(warehouse, 22);
  await warehouse.getByRole('button', { name: 'Close warehouse' }).click();
  await expect(warehouse).toHaveCount(0);

  await page.getByRole('button', { name: /Transportation of Commodities/ }).click();
  const transport = page.getByRole('dialog', { name: 'Transportation of Commodities' });
  await expect(transport).toBeVisible();
  await expectLoaded(transport, 11);
  // FR-135: it still does not scroll
  expect(await transport.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  await shot(page, 'm11-lists-transport.png');
  await transport.getByRole('button', { name: 'Close transport' }).click();
  await expect(transport).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("FR-334 the HUD's Warehouse, Capital and Transport buttons are as high as those with a Game Icon, their pictures loaded", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  const height = async (name: RegExp) => (await page.getByRole('button', { name }).boundingBox())!.height;
  const plain = await height(/Open Market/);
  for (const name of [/Open Warehouse/, /Open Capital/, /Transportation of Commodities/]) {
    expect(Math.abs((await height(name)) - plain), String(name)).toBeLessThanOrEqual(0.5);
    await expectLoaded(page.getByRole('button', { name }), 1);
  }
  expect(errors).toEqual([]);
});
