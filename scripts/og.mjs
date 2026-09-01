// Renders public/og.png (1200×630) from an inline SVG.
// Tries to fetch Instrument Sans as TTF (cached in scripts/fonts/) so the
// wordmark matches the site; falls back to system fonts if offline.
import { Resvg } from '@resvg/resvg-js';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fontDir = path.join(root, 'scripts', 'fonts');

async function fetchInstrumentSans() {
  await mkdir(fontDir, { recursive: true });
  const cached = existsSync(fontDir) ? await readdir(fontDir) : [];
  if (cached.some((f) => f.endsWith('.ttf'))) return;
  // An old UA makes Google Fonts serve TTF URLs instead of woff2.
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@450;550',
    { headers: { 'User-Agent': 'Mozilla/4.0' } }
  ).then((r) => r.text());
  const urls = [...css.matchAll(/url\((https:[^)]+\.ttf)\)/g)].map((m) => m[1]);
  await Promise.all(
    urls.map(async (url, i) => {
      const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
      await writeFile(path.join(fontDir, `instrument-sans-${i}.ttf`), buf);
    })
  );
}

let fontFiles = [];
try {
  await fetchInstrumentSans();
  fontFiles = (await readdir(fontDir))
    .filter((f) => f.endsWith('.ttf'))
    .map((f) => path.join(fontDir, f));
} catch {
  console.warn('Could not fetch Instrument Sans; using system fonts.');
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#fbfaf7"/>
  <text x="1005" y="470" text-anchor="middle" font-size="560"
    font-family="Songti SC, Hiragino Mincho ProN, Noto Serif CJK SC, SimSun, serif"
    fill="#26324d" opacity="0.08">燕</text>
  <text x="96" y="310" font-family="Instrument Sans, Helvetica, sans-serif"
    font-size="96" font-weight="550" letter-spacing="-3" fill="#18191c">We make quality apps.</text>
  <text x="98" y="380" font-family="Instrument Sans, Helvetica, sans-serif"
    font-size="32" font-weight="420" fill="#55575d">Thoughtful software for iOS and Android.</text>
  <rect x="98" y="196" width="54" height="3" fill="#26324d"/>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: true, fontFiles },
});
await writeFile(path.join(root, 'public', 'og.png'), resvg.render().asPng());
console.log('Wrote public/og.png');
