import { pairKey } from '../src/app/engine';
import { expect, startSeededGame, test } from './seededGame';

for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  const size = `${viewport.width}x${viewport.height}`;
  test.describe(`Trade policies at ${size}`, () => {
    test.use({ viewport });

    test('FR-579 select a country, set a subsidy and read it on the map and in List', async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));
      await startSeededGame(page, game => {
        game.diplomacy[pairKey('nation-1', 'minor-1')].consulates.push('nation-1');
        game.diplomacy[pairKey('nation-1', 'minor-2')].boycotts.push('nation-1');
      });
      await page.getByRole('button', { name: 'Open Market' }).click();
      const dialog = page.getByRole('dialog', { name: /^Board of Trade/ });
      await dialog.getByRole('tab', { name: 'Trade policies', exact: true }).click();
      const panel = dialog.getByRole('tabpanel', { name: 'Trade policies' });
      await expect(panel.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute('aria-pressed', 'true');
      const map = panel.getByRole('group', { name: 'Trade policy map' });
      const sundmark = map.getByRole('button', { name: 'Sundmark, boycott' });
      const sundmarkName = map.getByText('Sundmark', { exact: true });
      const outsideLand = await sundmarkName.evaluate(text => {
        const land = text.closest('svg')!.querySelector<SVGPathElement>('[data-country="minor-2"] > path')!;
        const bounds = text.getBoundingClientRect();
        const y = Math.round((bounds.top + bounds.bottom) / 2);
        for (let x = Math.ceil(bounds.left); x < bounds.right; x++) {
          const point = new DOMPoint(x, y).matrixTransform(land.getScreenCTM()!.inverse());
          if (!land.isPointInFill(point) && text.contains(document.elementFromPoint(x, y))) return { x, y };
        }
        throw new Error('The Sundmark label must extend outside its one-tile country in this fixture');
      });
      await page.mouse.click(outsideLand.x, outsideLand.y);
      await expect(sundmark).toHaveAttribute('aria-pressed', 'true');
      await expect(sundmark).toBeFocused();
      await expect(panel.getByRole('checkbox', { name: 'Boycott' })).toBeChecked();
      const arvelia = map.getByRole('button', { name: /^Arvelia,/ });
      const land = arvelia.locator(':scope > path').first();
      const unfocusedStroke = await land.evaluate(path => getComputedStyle(path).stroke);
      await arvelia.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(arvelia).not.toBeFocused();
      await page.keyboard.press('Tab');
      await expect(arvelia).toBeFocused();
      await expect(land).not.toHaveCSS('stroke', unfocusedStroke);
      if (viewport.width === 1366) {
        const file = 'trade-policy-map-keyboard-focus-1366x768.png';
        await page.screenshot({ path: process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${file}` : testInfo.outputPath(file) });
      }
      await page.keyboard.press('Space');
      await expect(arvelia).toHaveAttribute('aria-pressed', 'true');
      await expect(arvelia).toBeFocused();
      await expect(map.locator(':scope > g:first-child > :last-child')).toHaveAttribute('d', (await land.getAttribute('d'))!);
      await expect(map.locator(':scope > g:last-child').getByText('Sundmark', { exact: true })).toBeVisible();
      const subsidy = panel.getByRole('group', { name: 'Subsidy toward Arvelia' });
      await subsidy.getByRole('button', { name: '25%', exact: true }).click();
      await expect(arvelia).toHaveAccessibleName('Arvelia, subsidy 25%');
      await expect(sundmark).toHaveAttribute('aria-pressed', 'false');
      await expect(subsidy.getByRole('button', { name: '25%', exact: true })).toHaveAttribute('aria-pressed', 'true');
      const help = panel.getByTestId('subsidy-help');
      await expect(help).toBeInViewport({ ratio: 1 });
      await expect(map).toBeInViewport({ ratio: 1 });

      const labels = await map.evaluate(element => {
        const svg = element as SVGSVGElement;
        const { width, height } = svg.viewBox.baseVal;
        const { a: scale, e: left, f: top } = svg.getScreenCTM()!;
        return [...svg.querySelectorAll('[data-annotation-for]')].map(country => {
          const text = country.querySelector('text')!;
          const name = text.getBoundingClientRect();
          const flag = country.querySelector('[data-testid="nation-flag"]')!.parentElement!.getBoundingClientRect();
          const bottom = Math.max(name.bottom, flag.bottom);
          const marker = country.querySelector('[data-testid^="policy-marker-"]')?.getBoundingClientRect();
          return {
            name: text.textContent,
            flagGapEm: (name.left - flag.right) / (scale * parseFloat(getComputedStyle(text).fontSize)),
            edgeGap: Math.min(
              flag.left - left, left + width * scale - name.right,
              Math.min(name.top, flag.top) - top, top + height * scale - bottom,
            ) / scale,
            markerGap: marker && (marker.top - bottom) / scale,
          };
        });
      });
      expect(labels.map(label => label.name)).toEqual(expect.arrayContaining(['Sundmark', 'Pellis']));
      for (const label of labels) {
        expect(label.flagGapEm, `${label.name} flag touches its name`).toBeGreaterThan(0.12);
        expect(label.flagGapEm, `${label.name} flag floats away`).toBeLessThan(0.36);
        expect(label.edgeGap, `${label.name} clearance inside the SVG viewBox`).toBeGreaterThan(20);
        if (label.markerGap !== undefined) {
          expect(label.markerGap, `${label.name} clearance above its marker`).toBeGreaterThan(3);
        }
      }

      const overflow = await panel.evaluate(el => {
        const dialog = el.closest<HTMLElement>('[role=dialog]')!;
        const doc = document.documentElement;
        const frame = dialog.getBoundingClientRect();
        return {
          dialogFitsWindow: frame.left >= 0 && frame.top >= 0 && frame.right <= innerWidth && frame.bottom <= innerHeight,
          width: [doc.scrollWidth - innerWidth, dialog.scrollWidth - dialog.clientWidth, el.scrollWidth - el.clientWidth],
          height: [doc.scrollHeight - innerHeight, dialog.scrollHeight - dialog.clientHeight, el.scrollHeight - el.clientHeight],
        };
      });
      expect(overflow.dialogFitsWindow).toBe(true);
      expect(Math.max(...overflow.width)).toBeLessThanOrEqual(1);
      expect(Math.max(...overflow.height)).toBeLessThanOrEqual(1);
      const file = `trade-policy-map-${size}.png`;
      await page.screenshot({ path: process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${file}` : testInfo.outputPath(file) });

      await panel.getByRole('button', { name: 'List', exact: true }).click();
      const row = panel.getByRole('row', { name: /Arvelia/ });
      await expect(row.getByRole('button', { name: '25%', exact: true })).toHaveAttribute('aria-pressed', 'true');
      expect(errors).toEqual([]);
    });
  });
}
