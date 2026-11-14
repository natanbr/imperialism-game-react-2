const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../public/assets/ink-and-wash');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').slice(0, 12);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
for (const item of manifest) item.revision = hash(fs.readFileSync(path.join(root, item.file)));
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const catalog = 'const inkAssetCatalog = ' + JSON.stringify(manifest.map(({ id, label, family, file, revision }) => ({ id, label, family, file, revision }))) + ';\n';
fs.writeFileSync(path.join(root, 'asset-catalog.js'), catalog);
for (const page of ['index.html', 'terrain-demo.html']) {
  const file = path.join(root, page);
  const html = fs.readFileSync(file, 'utf8').replace(/src="asset-catalog\.js(?:\?v=[^"]*)?"/g, 'src="asset-catalog.js?v=' + hash(catalog) + '"');
  fs.writeFileSync(file, html);
}
console.log('Synchronized ' + manifest.length + ' asset revisions.');
