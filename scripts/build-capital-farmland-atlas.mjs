// FR-339: map pictures used together share a request. Each sheet has two square frames.
// Run from the checkout root. The approved pack and its manifest stay byte-identical.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const pack = "public/assets/ink-and-wash";
async function buildAtlas(name, files, size) {
  const stride = size * 4;
  const atlas = Buffer.alloc(size * stride * files.length);

  for (const [column, file] of files.entries()) {
    const { data, info } = await sharp(`${pack}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== size || info.height !== size) throw new Error(`Unexpected dimensions for ${file}`);
    for (let y = 0; y < size; y++) {
      data.copy(atlas, (y * files.length + column) * stride, y * stride, (y + 1) * stride);
    }
  }

  const raw = { width: size * files.length, height: size, channels: 4 };
  const webp = await sharp(atlas, { raw }).webp({ lossless: true, effort: 6 }).toBuffer();
  const decoded = await sharp(webp).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < atlas.length; i += 4) {
    // WebP can discard the RGB behind fully transparent pixels. Every visible channel must match exactly.
    if (atlas[i + 3] !== decoded[i + 3] || (atlas[i + 3] && !atlas.subarray(i, i + 3).equals(decoded.subarray(i, i + 3)))) {
      throw new Error(`Lossless atlas verification failed at pixel ${i / 4}`);
    }
  }
  await writeFile(`public/assets/map-atlases/${name}.webp`, webp);
  console.log(`${name}: verified ${raw.width} × ${raw.height}, ${webp.length} bytes`);
}

await mkdir("public/assets/map-atlases", { recursive: true });
await buildAtlas("capital-farmland", ["terrain/horse-ranch.png", "improvements/orchard-2.png"], 256);
await buildAtlas("coal-fish", ["goods/coal.png", "goods/fish.png"], 128);
