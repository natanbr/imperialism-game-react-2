// FR-339: the two 256px pictures drawn together around each continent capital share one map request.
// Run from the checkout root. The approved pack and its manifest stay byte-identical.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const pack = "public/assets/ink-and-wash";
const files = ["terrain/horse-ranch.png", "improvements/orchard-2.png"];
const size = 256;
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
await mkdir("public/assets/map-atlases", { recursive: true });
await writeFile("public/assets/map-atlases/capital-farmland.webp", webp);
console.log(`Verified ${raw.width} × ${raw.height}, ${webp.length} bytes`);
