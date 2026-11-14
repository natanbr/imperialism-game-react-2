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

/**
 * FR-353: every goods picture inside `where` (at least `atLeast`) lies on the parchment backing (--color-art-backing
 * #d9ccb0), and no other picture does (the titles' buildings stay bare).
 */
async function expectBacked(where: Locator, atLeast: number) {
  const fields = await where.locator('img[data-art-inline]').evaluateAll((imgs) =>
    imgs.map((img) => ({ goods: (img.getAttribute('data-art') ?? '').startsWith('goods/'), field: getComputedStyle(img).backgroundColor }))
  );
  expect(fields.filter((f) => f.goods).length).toBeGreaterThanOrEqual(atLeast);
  expect([...new Set(fields.filter((f) => f.goods).map((f) => f.field))]).toEqual(['rgb(217, 204, 176)']);
  expect(fields.filter((f) => !f.goods && f.field !== 'rgba(0, 0, 0, 0)')).toEqual([]);
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
  // FR-352 (QA; replaces FR-333's "no taller than the head's text line", at which the buildings were murky 19 px
  // silhouettes): each building drawn at 28 to 32 px, reaching past its line, the head still at most 24 px
  for (const h of heads) {
    expect(h.art, h.card ?? '').toMatch(/^buildings\//);
    expect(h.head, h.card ?? '').toBeLessThanOrEqual(24);
    expect(h.picture, h.card ?? '').toBeGreaterThanOrEqual(28);
    expect(h.picture, h.card ?? '').toBeLessThanOrEqual(32);
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

// FR-352 (QA): the Capital dialog at 1280x720: the section headings' buildings large too, each output's name on one line,
// the Labour line on one line and "+ Freight car" wholly inside its column
test('FR-352 the Capital dialog: headings drawn large, one-line names and labour line, + Freight car inside its column', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  await page.getByRole('button', { name: /Open Capital/ }).click();
  const capital = page.getByRole('dialog', { name: /Capital/ });
  await expect(capital).toBeVisible();
  await expectLoaded(capital, 30);
  // FR-352: the Trade School, Capitol and Transport headings too, their lines as high as their text's
  const headings = await capital.locator('h4:has(img), h3:has(img)').evaluateAll((els) =>
    els
      .filter((el) => !el.closest('section[data-testid^="building-"]'))
      .map((el) => ({
        name: (el.textContent ?? '').trim(),
        picture: el.querySelector('img')!.getBoundingClientRect().height,
        line: el.getBoundingClientRect().height,
        text: parseFloat(getComputedStyle(el).lineHeight),
      }))
  );
  expect(headings.map((h) => h.name)).toEqual(['Trade School', 'Capitol', 'Transport']);
  for (const h of headings) {
    expect(h.picture, h.name).toBeGreaterThanOrEqual(28);
    expect(h.line, h.name).toBeLessThanOrEqual(h.text + 0.5);
  }
  // FR-352: each output's name on one line, ending before its "−" ("Canned Food" with its picture wrapped to two)
  const outputs = await capital.locator('[data-testid^="output-"]:has([data-testid="output-name"])').evaluateAll((els) =>
    els.map((el) => {
      const name = el.querySelector('[data-testid="output-name"]')!;
      const range = document.createRange();
      range.selectNodeContents(name);
      const less = el.querySelector('button[aria-label^="Less "]')!.getBoundingClientRect();
      const lines = name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight);
      return { name: (name.textContent ?? '').trim(), lines: Math.round(lines * 10) / 10, right: range.getBoundingClientRect().right, less: less.left };
    })
  );
  expect(outputs.length).toBeGreaterThanOrEqual(9);
  expect(outputs.filter((o) => o.lines > 1 || o.right > o.less).map((o) => `${o.name}: ${o.lines} lines`)).toEqual([]);
  // FR-352: the Labour line on one line, and "+ Freight car" wholly inside the side column (it ran 3 px below its end
  // before M11 and 27 px once the Labour line's picture wrapped it beside a classic scrollbar)
  const labour = (await capital.getByTestId('labour').boundingBox())!;
  expect(labour.height).toBeLessThanOrEqual(22);
  const column = await capital.getByTestId('labour-panel').evaluate((el) => el.parentElement!.getBoundingClientRect().bottom);
  const freight = (await capital.getByRole('button', { name: 'Order a freight car' }).boundingBox())!;
  expect(freight.y + freight.height).toBeLessThanOrEqual(column);
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
  // FR-354 (QA): the 17 names start at one x: "Armaments" began 0.9 px left of the others, the space before it kerned
  const starts = await board.locator('[data-testid^="trade-row-"] [data-testid="name"]').evaluateAll((cells) =>
    cells.map((cell) => {
      const label = [...cell.childNodes].find((n) => n.nodeType === 3 && (n.textContent ?? '').trim())!;
      const first = (label.textContent ?? '').search(/\S/);
      const range = document.createRange();
      range.setStart(label, first);
      range.setEnd(label, first + 1);
      return { name: (label.textContent ?? '').trim(), x: Math.round(range.getBoundingClientRect().left * 100) / 100 };
    })
  );
  expect(starts).toHaveLength(17);
  expect(starts.filter((s) => s.x !== starts[0].x)).toEqual([]);
  // FR-353 (QA): each goods picture lies on the one parchment backing, so the pale ones (paper, canned food, wool, fish) read
  await expectBacked(board, 17);
  await shot(page, 'm11-lists-board.png');
  await board.getByRole('button', { name: 'Close Board of Trade' }).click();
  await expect(board).toHaveCount(0);

  await page.getByRole('button', { name: /Open Warehouse/ }).click();
  const warehouse = page.getByRole('dialog', { name: /Warehouse/ });
  await expect(warehouse).toBeVisible();
  await expect(warehouse.locator('[data-testid^="stock-"] img[data-art]')).toHaveCount(21);
  await expectLoaded(warehouse, 22);
  await expectBacked(warehouse, 21);
  await warehouse.getByRole('button', { name: 'Close warehouse' }).click();
  await expect(warehouse).toHaveCount(0);

  await page.getByRole('button', { name: /Transportation of Commodities/ }).click();
  const transport = page.getByRole('dialog', { name: 'Transportation of Commodities' });
  await expect(transport).toBeVisible();
  await expectLoaded(transport, 11);
  await expectBacked(transport, 10);
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

test("FR-349 the HUD's labels start at one x and its icons share one 20 px box; a dialog's title icon is 1.25em, Game Icon or picture", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  // The six full-width action buttons (Center, half wide beside Advance Turn, is not one of them)
  const hud = await page.locator('.action-buttons-container > .btn-plain').evaluateAll((buttons) =>
    buttons.map((b) => {
      const icon = b.firstElementChild!.getBoundingClientRect();
      const label = [...b.childNodes].find((n) => n.nodeType === 3 && (n.textContent ?? '').trim())!;
      const range = document.createRange();
      range.setStart(label, 0);
      range.setEnd(label, 1);
      return { name: (b.textContent ?? '').trim(), icon: [icon.width, icon.height], x: Math.round(range.getBoundingClientRect().left * 100) / 100, height: b.getBoundingClientRect().height };
    })
  );
  expect(hud.map((b) => b.name)).toEqual(['Open Warehouse', 'Open Capital', 'Open Market', 'Deal Book', 'Diplomacy', 'Transportation of Commodities']);
  expect(hud.filter((b) => b.x !== hud[0].x).map((b) => `${b.name} at ${b.x}, not ${hud[0].x}`)).toEqual([]);
  expect([...new Set(hud.map((b) => b.icon.join('x')))]).toEqual(['20x20']);
  // The 20 px box reaches into the buttons' padding: no button grew (a 13 px line, 6 px padding, 1 px border: 33.5 px)
  expect([...new Set(hud.map((b) => b.height))]).toEqual([33.5]);

  // A title's icon box: the Board of Trade's Game Icon and the Warehouse's picture are both 1.25em of their title's font
  const titleBox = (dialog: Locator) =>
    dialog.getByRole('heading', { level: 2 }).or(dialog.getByRole('heading', { level: 3 })).first().evaluate((h) => {
      const icon = h.firstElementChild!.getBoundingClientRect();
      return { em: Math.round((icon.width / parseFloat(getComputedStyle(h).fontSize)) * 100) / 100, tag: h.firstElementChild!.tagName.toLowerCase() };
    });
  await page.getByRole('button', { name: /Open Market/ }).click();
  const board = page.getByRole('dialog', { name: 'Board of Trade' });
  expect(await titleBox(board)).toEqual({ em: 1.25, tag: 'svg' });
  await board.getByRole('button', { name: 'Close Board of Trade' }).click();
  await page.getByRole('button', { name: /Open Warehouse/ }).click();
  const warehouse = page.getByRole('dialog', { name: /Warehouse/ });
  expect(await titleBox(warehouse)).toEqual({ em: 1.25, tag: 'img' });
  await warehouse.getByRole('button', { name: 'Close warehouse' }).click();
  expect(errors).toEqual([]);
});
