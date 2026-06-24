import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = join(__dirname, '..', 'docs', 'app-icon');

async function svgToPngs(svgPath, sizes, prefix) {
  const svg = await readFile(svgPath);
  await Promise.all(
    sizes.map(async (size) => {
      const out = join(ICON_DIR, `${prefix}-${size}.png`);
      await sharp(svg).resize(size, size).png().toFile(out);
      console.log(`  → ${prefix}-${size}.png`);
    })
  );
}

async function pngsToIco(sizes, prefix, outName) {
  const buffers = await Promise.all(
    sizes.map((s) => readFile(join(ICON_DIR, `${prefix}-${s}.png`)))
  );
  const ico = await pngToIco(buffers);
  const outPath = join(ICON_DIR, outName);
  await writeFile(outPath, ico);
  console.log(`  → ${outName}`);
}

async function main() {
  console.log('Building app icon...');
  await svgToPngs(
    join(ICON_DIR, 'icon.svg'),
    [16, 32, 48, 64, 128, 256, 512],
    'icon'
  );
  await pngsToIco([16, 32, 48, 64, 128, 256], 'icon', 'icon.ico');

  console.log('Building tray icon...');
  await svgToPngs(
    join(ICON_DIR, 'tray.svg'),
    [16, 24, 32, 48],
    'tray'
  );
  await pngsToIco([16, 24, 32, 48], 'tray', 'tray.ico');

  console.log('✓ Icons built');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});