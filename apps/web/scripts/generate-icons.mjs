/**
 * Generates all required PWA icons from an SVG source.
 * Run: node apps/web/scripts/generate-icons.mjs
 * Requires: npm install -g sharp-cli  OR  pnpm add -D sharp (in apps/web)
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/icons');

// Orbit icon SVG — purple circle with "O" lettermark
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f0f0f"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="#6c63ff" stroke-width="48"/>
  <circle cx="256" cy="96" r="36" fill="#6c63ff"/>
</svg>
`.trim();

const svgBuffer = Buffer.from(svg);

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'badge-72.png', size: 72 },
];

console.log('Generating PWA icons...');

for (const { name, size } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(OUT, name));
  console.log(`  ✓ ${name} (${size}x${size})`);
}

// favicon.ico — generate 32x32 PNG saved as .ico (browsers accept PNG-based ico)
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(resolve(OUT, '../favicon.ico'));
console.log('  ✓ favicon.ico (32x32)');

console.log('Done — icons written to apps/web/public/icons/');
