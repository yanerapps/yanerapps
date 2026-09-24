// Temporary tuning panel for the swallow's wing. Development only: swallow.ts loads it behind an
// `import.meta.env.DEV` check and a `?wing` query, so it never reaches a production build. Every
// control edits the shared WING object in place; the animation reads it on its next frame.
import type { WING } from './swallow';

type Params = typeof WING;
type Key = keyof Params;
type Row = [Key, string, number?, number?, number?]; // key, label, then min/max/step for sliders

const GROUPS: [string, Row[]][] = [
  ['Timing', [
    ['beat', 'seconds / beat', 0.12, 0.7, 0.01],
    ['downstroke', 'downstroke share', 0.4, 0.75, 0.01],
    ['always', 'flap continuously'],
    ['freeze', 'freeze at phase'],
    ['phase', 'phase (0 top → 1)', 0, 1, 0.01],
  ]],
  ['Stroke', [
    ['flap', 'flap amplitude', 0.2, 1.3, 0.01],
    ['dihedral', 'glide dihedral', -0.4, 0.6, 0.01],
    ['lead', 'fore-aft phase lead', 0, 1.6, 0.01],
  ]],
  ['Back-sweep (down-stroke)', [
    ['sweepRoot', 'root', 0, 1.2, 0.01],
    ['sweepMid', 'hand', 0, 1.2, 0.01],
    ['sweepTip', 'tip', 0, 1.2, 0.01],
    ['glideSweep', 'resting sweep ×', 0, 4, 0.05],
  ]],
  ['Forward reach (up-stroke)', [
    ['reachRoot', 'root', 0, 0.8, 0.01],
    ['reachMid', 'hand', 0, 0.8, 0.01],
    ['reachTip', 'tip', 0, 0.8, 0.01],
    ['reachPeak', 'peak: 1 bottom · 2 top', 1.1, 2.1, 0.01],
  ]],
  ['Lag & whip', [
    ['lagMid', 'hand lag (beats)', 0, 0.3, 0.005],
    ['lagTip', 'tip lag (beats)', 0, 0.45, 0.005],
    ['whipMid', 'hand whip', 0, 1.5, 0.01],
    ['whipTip', 'tip whip', 0, 1.5, 0.01],
  ]],
  ['Recovery fold & twist', [
    ['fold', 'fold up', 0, 1, 0.01],
    ['foldSweep', 'fold back', 0, 1, 0.01],
    ['twistRoot', 'twist root', 0, 0.5, 0.01],
    ['twistMid', 'twist hand', 0, 0.6, 0.01],
    ['twistTip', 'twist tip', 0, 0.5, 0.01],
  ]],
  ['Body', [
    ['feet', 'show feet'],
    ['bob', 'bob', 0, 0.08, 0.001],
    ['pitch', 'pitch', 0, 0.15, 0.001],
  ]],
  ['Form (repaints the wing)', [
    ['wedgeReach', 'white wedge reach', 0.2, 0.95, 0.01],
    ['wedgeRoot', 'white wedge root gap', 0, 0.9, 0.01],
    ['focusX', 'feather focus x', -0.3, 0.3, 0.005],
    ['focusZ', 'feather focus z', -0.8, 0.2, 0.005],
  ]],
];
const FORM: Key[] = ['wedgeReach', 'wedgeRoot', 'focusX', 'focusZ'];

export function mountWingDebug(params: Params, repaint: () => void) {
  const defaults = { ...params };
  const values = params as Record<Key, number | boolean>;
  const inputs = new Map<Key, HTMLInputElement>();
  const outputs = new Map<Key, HTMLElement>();
  const show = (key: Key) => {
    const v = values[key];
    const input = inputs.get(key)!;
    if (typeof v === 'boolean') input.checked = v;
    else {
      input.value = String(v);
      outputs.get(key)!.textContent = v.toFixed(3);
    }
  };

  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:9999;width:310px;max-height:92vh;overflow:auto;padding:10px 12px;' +
    'background:rgba(20,24,32,0.93);color:#eee;font:12px/1.4 ui-monospace,monospace;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.4)';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center';
  bar.innerHTML = '<strong style="flex:1">Wing debug</strong>';
  const button = (label: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'font:inherit;padding:2px 8px;border-radius:4px;border:1px solid #666;background:#333;color:#eee;cursor:pointer';
    b.onclick = onClick;
    bar.append(b);
  };
  const content = document.createElement('div');
  button('Fold', () => {
    const folded = content.style.display === 'none';
    content.style.display = folded ? '' : 'none';
    panel.style.width = folded ? '310px' : 'auto';
    bar.style.marginBottom = folded ? '6px' : '0';
    fold.textContent = folded ? 'Fold' : 'Unfold';
  });
  const fold = bar.lastElementChild as HTMLButtonElement;
  button('Copy JSON', () => navigator.clipboard.writeText(JSON.stringify(params, null, 2)));
  button('Reset', () => {
    Object.assign(params, defaults);
    for (const key of inputs.keys()) show(key);
    repaint();
  });
  panel.append(bar, content);

  for (const [title, rows] of GROUPS) {
    const heading = document.createElement('div');
    heading.textContent = title;
    heading.style.cssText = 'margin:8px 0 2px;color:#9cc;font-weight:bold';
    content.append(heading);
    for (const [key, label, min, max, step] of rows) {
      const row = document.createElement('label');
      row.style.cssText = 'display:grid;grid-template-columns:118px 1fr 50px;gap:6px;align-items:center;margin:2px 0';
      const text = document.createElement('span');
      text.textContent = label;
      const input = document.createElement('input');
      const out = document.createElement('span');
      out.style.textAlign = 'right';
      if (typeof values[key] === 'boolean') {
        input.type = 'checkbox';
        input.style.justifySelf = 'start';
      } else {
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
      }
      input.oninput = () => {
        values[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
        show(key);
        if (FORM.includes(key)) repaint();
      };
      inputs.set(key, input);
      outputs.set(key, out);
      row.append(text, input, out);
      content.append(row);
      show(key);
    }
  }
  document.body.append(panel);
}
