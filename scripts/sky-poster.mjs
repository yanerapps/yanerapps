// Renders the swallow's still pose (the reduced-motion frame) to public/sky/*.webp, the poster the
// sky shows until three.js has drawn its first frame. Needs Google Chrome, cwebp and a running site:
//   npm run build && npm run preview -- --port 4322   (in another shell)
//   npm run sky-poster -- http://localhost:4322
// Re-run whenever the bird, its colours or the sky's shape change.
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const site = process.argv[2] ?? 'http://localhost:4322';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = path.resolve(import.meta.dirname, '..', 'public', 'sky');
const port = 9333;

// The sky is 4:3 beside the hero copy and 16:10 once the hero stacks; sizes are CSS pixels, rendered at 2x.
// The narrow one stays under 480px wide so swallow.ts takes its phone path, as it does on a phone.
const shapes = [
  { name: 'wide', width: 600, height: 450 },
  { name: 'narrow', width: 400, height: 250 },
];

const profile = await mkdtemp(path.join(tmpdir(), 'sky-poster-'));
const browser = spawn(chrome, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
]);
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await new Promise((r) => setTimeout(r, 200));
    target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
      .then((r) => r.json())
      .catch(() => undefined);
  }
  if (!target) throw new Error('Chrome did not start');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      const onMessage = ({ data }) => {
        const msg = JSON.parse(data);
        if (msg.id !== n) return;
        ws.removeEventListener('message', onMessage);
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
        else resolve(msg.result);
      };
      ws.addEventListener('message', onMessage);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result
      .value;

  await mkdir(out, { recursive: true });
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const theme of ['light', 'dark']) {
    for (const { name, width, height } of shapes) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: false,
      });
      await send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-reduced-motion', value: 'reduce' },
          { name: 'prefers-color-scheme', value: theme },
        ],
      });
      await send('Page.navigate', { url: `${site}/` });
      // Only the bird is drawn: the sky fills the viewport with no gradient, mask or poster behind it.
      const drawn = await evaluate(`new Promise((resolve) => {
        const style = document.createElement('style');
        style.textContent = 'html, body { background: transparent !important } body * { visibility: hidden }' +
          ' .sky, .sky * { visibility: visible } .sky { position: fixed !important; inset: 0; z-index: 9;' +
          ' aspect-ratio: auto !important; background: none !important; mask-image: none !important }' +
          ' .sky::before { display: none } .sky canvas { opacity: 1 !important; transition: none !important }';
        const go = () => {
          document.documentElement.dataset.theme = '${theme}';
          document.head.append(style);
          const t0 = performance.now();
          (function wait() {
            if ('live' in document.querySelector('.sky').dataset) setTimeout(() => resolve(true), 500);
            else if (performance.now() - t0 > 15000) resolve(false);
            else setTimeout(wait, 100);
          })();
        };
        document.readyState === 'complete' ? go() : addEventListener('load', go);
      })`);
      if (!drawn) throw new Error(`the swallow never drew (${theme}, ${name})`);
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const png = path.join(profile, `${name}-${theme}.png`);
      await writeFile(png, Buffer.from(data, 'base64'));
      const webp = path.join(out, `swallow-${name}-${theme}.webp`);
      execFileSync('cwebp', ['-quiet', '-q', '82', '-alpha_q', '90', png, '-o', webp]);
      console.log(path.relative(process.cwd(), webp));
    }
  }
  ws.close();
} finally {
  const exited = new Promise((r) => browser.once('exit', r));
  browser.kill();
  await exited; // Chrome keeps writing its profile until it exits
  await rm(profile, { recursive: true, force: true });
}
