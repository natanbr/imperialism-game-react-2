// @vitest-environment jsdom
// M11 (NR-032). FR-320: one picture component, InkPicture (components/art/ArtPicture.tsx): a plain <img> with the table's
// src, a required alt, data-art = the manifest file, not draggable, decoded async, the one eslint-disable for
// no-img-element; drawn at a size in px (square, or width and height for the SVG marks) or on a text line (inline: the
// globals.css rule on img[data-art-inline], since Tailwind's preflight makes every img a block of auto height); className,
// data-testid and title passed through; the bottom-anchored families (workers, army, buildings) drawn bottom-centred.
// RegimentPicture, FortPicture and CapitolPicture render through it with FR-272's and FR-298's src, alt and sizes.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CapitolPicture, FortPicture, InkPicture, RegimentPicture } from '@/components/art/ArtPicture';
import { RAIL_ART, buildingArt, civilianArt, goodsArt, regimentArt, terrainArt } from '@/components/art/inkArt';
import { MaterialType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';

const ROOT = join(__dirname, '..', '..');
const one = (container: HTMLElement): HTMLImageElement => {
  const imgs = container.querySelectorAll('img');
  expect(imgs).toHaveLength(1);
  return imgs[0];
};
const attrs = (img: HTMLImageElement, names: string[]) => Object.fromEntries(names.map((n) => [n, img.getAttribute(n)]));

describe('FR-320 InkPicture: one picture component for the pack', () => {
  it('FR-320 a square picture at a size: src from the table, alt, data-art the manifest file, not draggable, decoded async', () => {
    const { container } = render(<InkPicture src={goodsArt(MaterialType.Steel)} alt="Steel" size={22} className="pic" testId="steel-pic" title="Steel" />);
    const img = one(container);
    expect(attrs(img, ['src', 'alt', 'data-art', 'width', 'height', 'draggable', 'decoding', 'class', 'data-testid', 'title', 'data-art-inline'])).toEqual({
      src: '/assets/ink-and-wash/goods/steel.png',
      alt: 'Steel',
      'data-art': 'goods/steel.png',
      width: '22',
      height: '22',
      draggable: 'false',
      decoding: 'async',
      class: 'pic',
      'data-testid': 'steel-pic',
      title: 'Steel',
      'data-art-inline': null,
    });
  });

  it('FR-320 a decorative picture has alt "" (beside the text that names it)', () => {
    const { container } = render(<InkPicture src={terrainArt(TerrainType.Farm)!} alt="" size={40} />);
    const img = one(container);
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('data-art')).toBe('terrain/farm.png');
  });

  it('FR-320 an SVG mark at its own width and height', () => {
    const { container } = render(<InkPicture src={RAIL_ART.url} alt="" width={RAIL_ART.width} height={RAIL_ART.height} />);
    expect(attrs(one(container), ['width', 'height', 'data-art'])).toEqual({ width: '42', height: '16', 'data-art': 'infrastructure/rail-straight.svg' });
  });

  it('FR-320 on a text line (inline): data-art-inline and no px size, so the globals.css rule sizes it to 1.25em', () => {
    const { container } = render(
      <span>
        <InkPicture src={goodsArt(MaterialType.CannedFood)} alt="" inline /> Canned Food 12
      </span>
    );
    const img = one(container);
    expect(img.hasAttribute('data-art-inline')).toBe(true);
    expect(img.getAttribute('width')).toBeNull();
    expect(img.getAttribute('height')).toBeNull();
    expect(img.getAttribute('data-art')).toBe('goods/canned-food.png');
    // The picture is decorative: the row's text is unchanged
    expect(container.textContent).toBe(' Canned Food 12');
  });

  it('FR-320 the anchor: workers, army and buildings stand on the bottom centre; goods and terrain are centred', () => {
    const anchor = (src: string) => one(render(<InkPicture src={src} alt="" size={20} />).container).getAttribute('data-art-anchor');
    expect(anchor(civilianArt(WorkerType.Farmer))).toBe('bottom-center');
    expect(anchor(regimentArt('hussars'))).toBe('bottom-center');
    expect(anchor(buildingArt('steelMill'))).toBe('bottom-center');
    expect(anchor(goodsArt(MaterialType.Steel))).toBe('center');
    expect(anchor(terrainArt(TerrainType.Mountains)!)).toBe('center');
  });

  it("FR-320 globals.css sizes an inline picture to its text line and draws bottom-anchored pictures from the bottom centre", () => {
    const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
    const rule = (selector: string) => {
      const at = css.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThanOrEqual(0);
      const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
      return Object.fromEntries(
        body
          .split(';')
          .map((d) => d.trim())
          .filter(Boolean)
          .map((d) => d.split(':').map((s) => s.trim()))
      );
    };
    expect(rule('img[data-art-inline]')).toEqual({
      display: 'inline-block',
      width: '1.25em',
      height: '1.25em',
      'vertical-align': '-0.25em',
      flex: 'none',
      'object-fit': 'contain',
    });
    expect(rule('img[data-art-anchor="bottom-center"]')).toEqual({ 'object-fit': 'contain', 'object-position': 'center bottom' });
  });

  it('FR-320 ArtPicture.tsx draws one img element, with the one eslint-disable for no-img-element on it', () => {
    const source = readFileSync(join(ROOT, 'src/app/components/art/ArtPicture.tsx'), 'utf8');
    expect(source.match(/<img\b/g)).toHaveLength(1);
    expect(source.match(/eslint-disable/g)).toHaveLength(1);
    const lines = source.split(/\r?\n/);
    const at = lines.findIndex((l) => l.includes('eslint-disable-next-line @next/next/no-img-element'));
    expect(lines[at + 1]).toMatch(/^\s*<img\b/);
  });
});

describe("FR-320 FR-272 FR-298 the war screens' and the Council's pictures render through InkPicture, unchanged", () => {
  it('FR-320 RegimentPicture: the regiment picture, alt "" by default, 32 px', () => {
    const img = one(render(<RegimentPicture type="regulars" />).container);
    expect(attrs(img, ['src', 'alt', 'width', 'height', 'data-art'])).toEqual({
      src: '/assets/ink-and-wash/army/regulars.png',
      alt: '',
      width: '32',
      height: '32',
      'data-art': 'army/regulars.png',
    });
    const named = one(render(<RegimentPicture type="lightArtillery" alt="Light Artillery" size={48} className="x" />).container);
    expect(attrs(named, ['src', 'alt', 'width', 'class'])).toEqual({ src: '/assets/ink-and-wash/army/horse-artillery.png', alt: 'Light Artillery', width: '48', class: 'x' });
  });

  it('FR-320 FortPicture: the fort of its level, 40 px; nothing below level 1', () => {
    const img = one(render(<FortPicture level={2} alt="Fort level 2" />).container);
    expect(attrs(img, ['src', 'alt', 'width', 'height', 'data-art'])).toEqual({
      src: '/assets/ink-and-wash/infrastructure/fort-2.png',
      alt: 'Fort level 2',
      width: '40',
      height: '40',
      'data-art': 'infrastructure/fort-2.png',
    });
    expect(render(<FortPicture level={0} />).container.querySelector('img')).toBeNull();
  });

  it("FR-320 CapitolPicture: the Council screen's capitol, decorative, 96 px", () => {
    const img = one(render(<CapitolPicture />).container);
    expect(attrs(img, ['src', 'alt', 'width', 'height', 'data-art'])).toEqual({
      src: '/assets/ink-and-wash/buildings/capitol.png',
      alt: '',
      width: '96',
      height: '96',
      'data-art': 'buildings/capitol.png',
    });
  });
});
