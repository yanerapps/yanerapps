import {
  Bone,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

// Bird space: x is forward (the beak), y is up, z is the right wing. The camera
// sits below the flight line on the right-wing side, looking up, and only leans a
// few degrees with the pointer and the page. Everything is unlit painted surfaces
// in barn-swallow livery; the sky itself is a CSS gradient behind the transparent canvas.
const ELEVATION = 0.6; // radians below the flight plane (~35°)
const AZIMUTH = 0.45; // camera a little ahead of the bird, so the wings lie on a diagonal
const DISTANCE = 8.0;
const FOV = 24; // long lens: the near wing stays close to the far one in size, so the silhouette reads flat
const BANK = -0.14; // standing roll that tips the belly toward the camera
const WIND_X = 5; // wind streaks recycle across this half-width
const SPAN = 1.5; // shoulder to wing tip
const WRIST = 0.45; // as a fraction of the span
const OUTER = 0.72; // pivot of the tip section, as a fraction of the span
const ROOT = -0.05; // span fraction buried in the body
const ROOT_CHORD = 0.52;
const SHOULDER = new Vector3(0.2, 0.04, 0.08); // high on the chest, so the wing grows out of the shoulder
// Flight feathers, innermost first, by the span fraction where each tip meets the trailing edge.
const TIPS = Array.from({ length: 16 }, (_, k) => 0.1 + 0.9 * ((k + 1) / 16) ** 1.15);
const X_AXIS = new Vector3(1, 0, 0);

// Everything that shapes the wingbeat, in one place. The dev-only panel in swallow-debug.ts edits
// these live; the values here are the shipped ones. Angles are radians, lags are in beats.
export const WING = {
  beat: 0.3, // seconds per wingbeat; a real swallow is ~2x faster, too quick to read
  downstroke: 0.58, // share of each beat spent on the power stroke; the recovery is quicker
  flap: 0.7, // up-and-down amplitude at the shoulder
  dihedral: 0.1, // wings raised this much in the glide
  lead: 0.4, // the back-sweep runs a little ahead of the up-and-down, peaking at the bottom of the stroke
  sweepRoot: 0.55, // back-sweep through the power stroke, per section
  sweepMid: 0.45,
  sweepTip: 0.35,
  reachRoot: 0.12, // forward reach past the resting line on the way up, per section; the tip leads
  reachMid: 0.3,
  reachTip: 0.5,
  reachPeak: 1.9, // where the reach peaks, in half-strokes: 1 = bottom, 1.5 = level, 2 = top
  lagMid: 0.07, // the hand trails the arm by this many beats
  lagTip: 0.14, // the tip trails the arm by this many beats
  whipMid: 0.57, // how much of the flap each section's up-and-down lags the one before by
  whipTip: 0.43,
  fold: 0.3, // the hand tucks up on the recovery
  foldSweep: 0.08, // and a touch back
  twistRoot: 0.08, // leading edge pitched down through the power stroke, per section
  twistMid: 0.2,
  twistTip: 0.1,
  glideSweep: 1, // scales the resting sweep of the three sections
  feet: false, // show the feet tucked under the belly
  bob: 0.015, // body thrown up by each power stroke
  pitch: 0.03, // and nosed up
  always: false, // flap continuously instead of alternating with glides
  freeze: false, // hold the wing at `phase` of a beat
  phase: 0.3,
  wedgeReach: 0.56, // covert wedge: how far out along the leading edge it reaches
  wedgeRoot: 0.3, // and the chord fraction it leaves uncovered at the root
  focusX: 0.06, // the flight feathers radiate from this point inside the shoulder
  focusZ: -0.22,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const flat = (shape: Shape) => new ShapeGeometry(shape, 16).rotateX(Math.PI / 2); // shape y becomes bird z

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const leading = (s: number) => 0.035 * Math.sin(Math.PI * clamp01(s)); // bows forward a little at mid-span
const chord = (s: number) => {
  const u = clamp01(s);
  return ROOT_CHORD * (1 - u) ** 0.6 * (1 + 0.25 * u * (1 - u)); // broad secondaries tapering to a point
};
function trailing(s: number) {
  let notch = 0;
  for (let k = 3; k < TIPS.length; k++) {
    if (s > TIPS[k - 1] && s < TIPS[k]) { // scalloped between feather tips
      const u = (s - TIPS[k - 1]) / (TIPS[k] - TIPS[k - 1]);
      notch = (0.012 + 0.014 * smoothstep(0.3, 0.7, s)) * Math.sin(Math.PI * u) ** 0.8;
    }
  }
  return leading(s) - chord(s) + notch;
}

/** Leading and trailing edge x, relative to the shoulder, at span fraction s. */
const planform = (s: number): [number, number] => [leading(s), trailing(s)];

type Box = { x: number; z: number; w: number; h: number };

/** uv from the (x, z) bounding box, so a canvas painted in bird units maps 1:1 onto the surface. */
function boxUVs(geometry: BufferGeometry): Box {
  const p = geometry.getAttribute('position');
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < p.count; i++) {
    x0 = Math.min(x0, p.getX(i));
    x1 = Math.max(x1, p.getX(i));
    z0 = Math.min(z0, p.getZ(i));
    z1 = Math.max(z1, p.getZ(i));
  }
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[2 * i] = (p.getX(i) - x0) / (x1 - x0);
    uv[2 * i + 1] = (p.getZ(i) - z0) / (z1 - z0);
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return { x: x0, z: z0, w: x1 - x0, h: z1 - z0 };
}

/** A canvas covering the box, its context transformed so drawing happens in bird units. */
function sheet(box: Box, ppu: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(box.w * ppu);
  canvas.height = Math.ceil(box.h * ppu);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(ppu, 0, 0, -ppu, -box.x * ppu, canvas.height + box.z * ppu);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { ctx, texture, box };
}

function wingGeometry() {
  const NS = 80; // span stations
  const NC = 6;
  const position: number[] = [];
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const s = lerp(ROOT, 1, i / NS);
    const [le, te] = planform(s);
    // The body pins only the part of the root buried inside it, so the visible wing turns rigidly
    // with the shoulder and meets the body exactly along the shoulder's plane, which is what the
    // body shader colours by. The fore-aft swing blends in over the first third of the span, so
    // the broad root is never shoved into the flank; the wrist takes over across the middle and
    // the tip joint toward the end. Wide blends, so the wing curves instead of creasing.
    const arm = smoothstep(-0.05, 0.03, s);
    const swung = smoothstep(0, 0.35, s);
    const hand = smoothstep(WRIST - 0.18, WRIST + 0.18, s);
    const outer = smoothstep(0.6, 0.92, s);
    const weights = [1 - arm, arm * (1 - swung) * (1 - hand), arm * swung * (1 - hand), arm * hand * (1 - outer), arm * hand * outer];
    const bones = [0, 1, 2, 3, 4].sort((a, b) => weights[b] - weights[a]).slice(0, 4); // never more than three are non-zero
    for (let j = 0; j <= NC; j++) {
      const v = j / NC;
      position.push(te + (le - te) * v, 0.05 * (le - te) * Math.sin(Math.PI * v) * smoothstep(0, 0.2, s), s * SPAN); // gentle camber, flat at the root
      skinIndex.push(...bones);
      skinWeight.push(...bones.map((b) => weights[b]));
    }
  }
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NC; j++) {
      const a = i * (NC + 1) + j;
      const b = a + NC + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1); // front faces look down, at the belly side
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeight, 4));
  geometry.setIndex(index);
  return geometry;
}

function tailShape() {
  const tail = new Shape(); // deep fork with long outer streamers
  tail.moveTo(0.04, 0.06);
  tail.quadraticCurveTo(-0.16, 0.13, -0.34, 0.16);
  tail.quadraticCurveTo(-0.72, 0.28, -1.08, 0.34);
  tail.quadraticCurveTo(-0.78, 0.18, -0.37, 0.05);
  tail.quadraticCurveTo(-0.27, 0, -0.37, -0.05);
  tail.quadraticCurveTo(-0.78, -0.18, -1.08, -0.34);
  tail.quadraticCurveTo(-0.72, -0.28, -0.34, -0.16);
  tail.quadraticCurveTo(-0.16, -0.13, 0.04, -0.06);
  return tail;
}

type Palette = { back: string; belly: string; face: string; sheen: string; gloss: string; rib: string; line: string };

function shade(color: string, dl: number) {
  const c = new Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl, SRGBColorSpace);
  return c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + dl)), SRGBColorSpace).getStyle(SRGBColorSpace);
}

function paintWing(ctx: CanvasRenderingContext2D, box: Box, p: Palette, upper: boolean) {
  ctx.fillStyle = p.line; // shows through between feathers as their outlines
  ctx.fillRect(box.x, box.z, box.w, box.h);
  ctx.lineJoin = 'round';
  const FOCUS = { x: WING.focusX, z: WING.focusZ };
  const feather = (k: number) => {
    const s = TIPS[k];
    const tx = trailing(s);
    const tz = s * SPAN;
    const len = Math.hypot(tx - FOCUS.x, tz - FOCUS.z);
    return { s, tx, tz, ux: (tx - FOCUS.x) / len, uz: (tz - FOCUS.z) / len, len };
  };
  const along = (f: ReturnType<typeof feather>, t: number): [number, number] =>
    [FOCUS.x + f.ux * f.len * t, FOCUS.z + f.uz * f.len * t];

  // Flight feathers: one fan from the focus, outermost first so each inner feather overlaps the
  // next. Inner ones are short and point back, outer ones long and along the span, all tapering.
  for (let k = TIPS.length - 1; k >= 0; k--) {
    const f = feather(k);
    const w = 0.13 * (1 - 0.4 * f.s);
    const nx = -f.uz; // toward the trailing side, where the vane is wider
    const nz = f.ux;
    const [rx, rz] = along(f, 0.12);
    const [mx, mz] = along(f, 0.58);
    ctx.beginPath();
    ctx.moveTo(rx + nx * w * 0.1, rz + nz * w * 0.1);
    ctx.quadraticCurveTo(mx + nx * w * 0.62, mz + nz * w * 0.62, f.tx, f.tz);
    ctx.quadraticCurveTo(mx - nx * w * 0.42, mz - nz * w * 0.42, rx - nx * w * 0.1, rz - nz * w * 0.1);
    ctx.closePath();
    ctx.fillStyle = shade(p.back, -0.02 * (k % 2) - 0.03 * f.s);
    ctx.fill();
    ctx.lineWidth = 0.006;
    ctx.strokeStyle = p.line;
    ctx.stroke();
    if (k >= 4) { // a pale streak down the trailing vane of each exposed flight feather
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const t = 0.45 + 0.47 * (i / 8);
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        ctx.lineTo(a * (rx + nx * w * 0.1) + b * (mx + nx * w * 0.5) + c * f.tx, a * (rz + nz * w * 0.1) + b * (mz + nz * w * 0.5) + c * f.tz);
      }
      ctx.lineWidth = 0.016 * (1 - 0.4 * f.s);
      ctx.strokeStyle = upper ? p.gloss : p.rib;
      ctx.stroke();
    }
  }

  // Coverts: a wedge over most of the root chord, narrowing out along the leading edge past the
  // wrist, its rear edge scalloped along the feather directions. Cream below, matching the belly;
  // the back's blue glossing to teal above.
  const wedge = (rootChord: number, reach: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const s = lerp(ROOT, reach, i / 12);
      ctx.lineTo(leading(s) + 0.002, s * SPAN);
    }
    let px = leading(reach);
    let pz = reach * SPAN;
    for (let i = 1; i <= 14; i++) {
      const s = lerp(reach, ROOT, i / 14);
      const [le, te] = planform(s);
      const bx = te + (le - te) * lerp(1, rootChord, smoothstep(reach, ROOT, s) ** 0.7);
      const bz = s * SPAN;
      const len = Math.hypot(bx - FOCUS.x, bz - FOCUS.z);
      ctx.quadraticCurveTo((px + bx) / 2 + ((bx - FOCUS.x) / len) * 0.03, (pz + bz) / 2 + ((bz - FOCUS.z) / len) * 0.03, bx, bz);
      px = bx;
      pz = bz;
    }
    ctx.lineTo(trailing(ROOT) - 0.03, ROOT * SPAN);
    ctx.closePath();
  };
  if (upper) {
    const g = ctx.createLinearGradient(0, 0.1, 0, 0.55);
    g.addColorStop(0, p.back);
    g.addColorStop(1, p.sheen);
    ctx.fillStyle = g;
  } else ctx.fillStyle = p.belly;
  ctx.lineWidth = 0.006;
  ctx.strokeStyle = p.line;
  wedge(WING.wedgeRoot, WING.wedgeReach);
  ctx.fill();
  ctx.stroke();
  if (!upper) ctx.fillStyle = shade(p.belly, -0.05);
  ctx.lineWidth = 0.004;
  wedge(lerp(WING.wedgeRoot, 1, 0.45), WING.wedgeReach * 0.68); // lesser coverts: a second, finer row of scallops
  ctx.fill();
  ctx.stroke();

  ctx.beginPath(); // outline the edge, feather tips included
  for (let i = 0; i <= 80; i++) ctx.lineTo(leading(i / 80), (i / 80) * SPAN);
  for (let i = 80; i >= 0; i--) ctx.lineTo(trailing(i / 80), (i / 80) * SPAN);
  ctx.closePath();
  ctx.lineWidth = 0.014;
  ctx.strokeStyle = p.line;
  ctx.stroke();
}

function paintTail(ctx: CanvasRenderingContext2D, box: Box, p: Palette) {
  ctx.fillStyle = p.line;
  ctx.fillRect(box.x, box.z, box.w, box.h);
  ctx.lineJoin = 'round';
  // Five feathers a side fanning from the base, the outermost the long streamer, painted like the
  // wing's flight feathers: dark outlined vanes with a pale streak, and the white windows of the fork.
  const tips: [number, number][] = [[-1.08, 0.34], [-0.87, 0.245], [-0.72, 0.18], [-0.55, 0.11], [-0.38, 0.05]];
  for (const side of [1, -1]) {
    tips.forEach(([tx, z0], i) => {
      const tz = side * z0;
      const len = Math.hypot(tx, tz);
      const ux = tx / len;
      const uz = tz / len;
      const nx = -uz;
      const nz = ux;
      const w = i === 0 ? 0.08 : 0.15 - 0.01 * i;
      const at = (t: number, k: number): [number, number] => [ux * len * t + nx * w * k, uz * len * t + nz * w * k];
      ctx.beginPath();
      ctx.moveTo(...at(0.05, 0.1));
      ctx.quadraticCurveTo(...at(0.5, 0.5), tx, tz);
      ctx.quadraticCurveTo(...at(0.5, -0.5), ...at(0.05, -0.1));
      ctx.closePath();
      ctx.fillStyle = shade(p.back, -0.04 - 0.02 * (i % 2));
      ctx.fill();
      ctx.lineWidth = 0.006;
      ctx.strokeStyle = p.line;
      ctx.stroke();
      ctx.beginPath(); // pale streak beside the shaft
      ctx.moveTo(...at(0.35, 0.12));
      ctx.lineTo(...at(0.92, 0.06));
      ctx.lineWidth = i === 0 ? 0.014 : 0.011;
      ctx.strokeStyle = p.rib;
      ctx.stroke();
      if (i >= 2) {
        const [cx, cz] = at(0.64, -0.05);
        ctx.fillStyle = p.belly;
        ctx.beginPath();
        ctx.ellipse(cx, cz, 0.05, 0.014, Math.atan2(uz, ux), 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  ctx.beginPath(); // outline the edge
  tailShape().getPoints(12).forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
  ctx.closePath();
  ctx.lineWidth = 0.012;
  ctx.strokeStyle = p.line;
  ctx.stroke();
}

/** Stroke angle for a beat position: 0 at the top, π at the bottom, the downstroke taking WING.downstroke of the cycle. */
function phase(beat: number) {
  const d = WING.downstroke;
  const c = beat - Math.floor(beat);
  return c < d ? (Math.PI * c) / d : Math.PI + (Math.PI * (c - d)) / (1 - d);
}

function buildSwallow(plumage: ShaderMaterial, feather: ShaderMaterial, tailSkin: MeshBasicMaterial, feetSkin: MeshBasicMaterial, wingGeo: BufferGeometry, tailGeo: BufferGeometry) {
  const bird = new Group();
  bird.rotation.order = 'YZX'; // roll about the body axis first, then pitch

  const body = [
    [0, -0.56], [0.025, -0.51], [0.055, -0.42], [0.085, -0.28], [0.13, -0.108], [0.155, 0.045],
    [0.148, 0.162], [0.12, 0.252], [0.095, 0.306], [0.095, 0.378], [0.078, 0.441],
    [0.03, 0.495], [0, 0.522],
  ].map(([r, x]) => new Vector2(r, x));
  bird.add(new Mesh(new LatheGeometry(body, 24).rotateZ(-Math.PI / 2), plumage));

  const dark = new MeshBasicMaterial({ color: 0x161d29 });
  const eyeGeometry = new SphereGeometry(0.011, 8, 6);
  for (const side of [1, -1]) {
    const eye = new Mesh(eyeGeometry, dark);
    eye.position.set(0.396, 0.02, side * 0.088);
    bird.add(eye);
  }
  const beak = new Mesh(new ConeGeometry(0.024, 0.115, 4).rotateZ(-Math.PI / 2), dark);
  beak.position.set(0.53, -0.028, 0);
  bird.add(beak);

  // Slender feet drawn up under the belly as a swallow carries them in flight: each leg leaves
  // the rear of the belly and reaches forward, toes toward the head, tucked close to the body.
  const feet = new Group();
  const legGeometry = new CylinderGeometry(0.005, 0.007, 0.08, 6);
  const footGeometry = new SphereGeometry(0.015, 8, 6);
  for (const side of [1, -1]) {
    const leg = new Mesh(legGeometry, feetSkin);
    leg.position.set(-0.2, -0.115, side * 0.035);
    leg.rotation.z = 0.9; // top end at the rear, foot end forward and down
    const foot = new Mesh(footGeometry, feetSkin);
    foot.position.set(-0.15, -0.145, side * 0.037);
    foot.scale.set(1.6, 0.45, 0.9);
    feet.add(leg, foot);
  }
  bird.add(feet);

  // Each wing is one skinned surface over a chain of bones: an anchor holds the root inside the
  // body, the shoulder flaps the arm and a second joint on the same pivot swings it fore and aft,
  // the wrist moves the hand and an outer joint the tip section, so motion can travel out along
  // the wing. The left wing is the right one mirrored, so the same bone rotations drive both.
  const wings = [1, -1].map((side) => {
    const root = new Group();
    root.position.set(SHOULDER.x, SHOULDER.y, SHOULDER.z * side);
    root.scale.z = side;
    const mesh = new SkinnedMesh(wingGeo, feather);
    mesh.frustumCulled = false;
    const anchor = new Bone();
    const shoulder = new Bone();
    const sweeper = new Bone();
    const wrist = new Bone();
    const outer = new Bone();
    wrist.position.z = WRIST * SPAN;
    outer.position.z = (OUTER - WRIST) * SPAN;
    anchor.add(shoulder);
    shoulder.add(sweeper);
    sweeper.add(wrist);
    wrist.add(outer);
    mesh.add(anchor);
    mesh.bind(new Skeleton([anchor, shoulder, sweeper, wrist, outer]));
    root.add(mesh);
    bird.add(root);
    return { shoulder, sweeper, wrist, outer };
  });

  // The tail is rooted well inside the body: its base is narrower than the rump there, and the
  // rump's cone runs on over the root, so the feathers grow out from under the body.
  const tail = new Group();
  tail.position.set(-0.33, 0, 0);
  tail.add(new Mesh(tailGeo, tailSkin));
  bird.add(tail);

  return { bird, wings, tail, feet };
}

type Streak = { x: number; y: number; z: number; len: number; width: number; strength: number; gusty: boolean };

function respawn(s: Streak, x: number) {
  s.x = x;
  s.y = lerp(-1.4, 1.6, Math.random());
  s.z = lerp(-3, 1.2, Math.random());
  s.len = lerp(0.5, 1.7, Math.random());
  s.width = lerp(0.008, 0.014, Math.random());
  s.strength = lerp(0.35, 1, Math.random());
  s.gusty = Math.random() < 0.4; // only shows while a gust blows
  return s;
}

export function mount(el: HTMLElement) {
  const canvas = el.querySelector('canvas')!;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    (el.parentElement ?? el).remove(); // no WebGL: drop the sky and its inscription together
    return;
  }
  const small = el.clientWidth < 480;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 16 / 9, 0.1, 60);
  camera.position
    .set(Math.sin(AZIMUTH) * Math.cos(ELEVATION), -Math.sin(ELEVATION), Math.cos(AZIMUTH) * Math.cos(ELEVATION))
    .multiplyScalar(DISTANCE);
  camera.lookAt(0, 0, 0);

  const flight = new Group();
  flight.rotation.z = 0.12; // the flight line climbs gently to the right
  scene.add(flight);
  flight.updateMatrixWorld(true);

  let visible = false;
  let dirty = true;
  let raf = 0;
  let last = 0;

  // The camera only leans: a few degrees after the pointer, a little with the page as the sky
  // scrolls through the viewport, and a slow idle drift. A quick sweep of the pointer is a gust.
  let aimX = 0; // pointer across the viewport, -1..1
  let aimY = 0;
  let leanX = 0; // eased
  let leanY = 0;
  let breeze = 0; // gust raised by the pointer
  if (!reduced) {
    let px: number | null = null;
    let py = 0;
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = (e.clientY / innerHeight) * 2 - 1;
      if (px !== null) breeze = Math.min(0.6, breeze + Math.hypot(nx - px, ny - py) * 0.5);
      px = aimX = nx;
      py = aimY = ny;
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { aimX = 0; aimY = 0; });
  }
  function aimCamera(dt: number) {
    const k = 1 - Math.exp(-dt * 3);
    leanX += (aimX - leanX) * k;
    leanY += (aimY - leanY) * k;
    const r = el.getBoundingClientRect();
    const scrolled = Math.max(-1, Math.min(1, ((r.top + r.height / 2) / innerHeight) * 2 - 1)); // -1 at the top of the viewport
    const az = AZIMUTH + 0.1 * leanX + 0.02 * Math.sin(t * 0.17);
    const elev = ELEVATION + 0.06 * leanY + 0.05 * scrolled;
    camera.position.set(Math.sin(az) * Math.cos(elev), -Math.sin(elev), Math.cos(az) * Math.cos(elev)).multiplyScalar(DISTANCE);
    camera.lookAt(0, 0, 0);
  }

  // The wing and tail are painted onto canvases in bird units, then draped over their surfaces.
  const wingGeo = wingGeometry();
  const tailGeo = flat(tailShape());
  const ppu = small ? 520 : 760; // texture pixels per bird unit
  const lower = sheet(boxUVs(wingGeo), ppu);
  const upper = sheet(lower.box, ppu);
  const tailSheet = sheet(boxUVs(tailGeo), ppu);
  for (const { texture } of [lower, upper, tailSheet]) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const feather = new ShaderMaterial({
    side: DoubleSide,
    uniforms: { upper: { value: upper.texture }, lower: { value: lower.texture } },
    vertexShader: /* glsl */ `
      #include <skinning_pars_vertex>
      varying vec2 vUv;
      void main() {
        vUv = uv;
        #include <skinbase_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D upper, lower;
      varying vec2 vUv;
      void main() {
        gl_FragColor = mix(texture2D(upper, vUv), texture2D(lower, vUv), float(gl_FrontFacing));
        #include <colorspace_fragment>
      }`,
  });
  const tailSkin = new MeshBasicMaterial({ map: tailSheet.texture, side: DoubleSide });
  const feetSkin = new MeshBasicMaterial();
  // A dark crown and back frame the warm white belly, with the orange throat cut off by a dark breast band.
  const plumage = new ShaderMaterial({
    uniforms: {
      back: { value: new Color() },
      belly: { value: new Color() },
      face: { value: new Color() },
      wingPivot: { value: SHOULDER.clone() }, // the right wing root's plane, in bird space; mirrored for the left
      wingUp: { value: new Vector3(0, 1, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 back, belly, face, wingPivot, wingUp;
      varying vec3 vPos;
      float edge(float v) { float w = fwidth(v); return smoothstep(-w, w, v); } // antialiased step at 0
      void main() {
        float up = vPos.y / max(length(vPos.yz), 1e-4); // -1 under the belly, 1 along the spine
        // Dark above the wing roots, cream below: on the flanks alongside the roots the split is the
        // very plane the wing roots turn in, so the colour boundary is exactly the curve where the
        // wing meets the body, whatever the flap angle. Spine, keel, neck and rump keep a fixed
        // split, which the plane meets where the roots begin and end. The dark collar's rear edge
        // runs from under the throat up and back to the wing root, so throat line, collar and
        // leading edge read as one line.
        float side = vPos.z < 0.0 ? -1.0 : 1.0;
        float aboveWing = dot(vPos - vec3(wingPivot.x, wingPivot.y, wingPivot.z * side), vec3(wingUp.x, wingUp.y, wingUp.z * side));
        float lat = abs(vPos.z) / max(length(vPos.yz), 1e-4); // 1 on the flanks, 0 along spine and keel
        float onFlank = smoothstep(0.45, 0.8, lat) * smoothstep(-0.45, -0.28, vPos.x) * smoothstep(0.3, 0.18, vPos.x);
        float lower = mix(1.0 - edge(up - 0.42), 1.0 - edge(aboveWing), onFlank);
        float collar = 0.279 - 0.078 * (up + 1.0) / 1.37;
        float white = (1.0 - edge(vPos.x - collar)) * lower;
        vec3 c = mix(back, belly, white);
        vec3 throat = (vPos - vec3(0.387, -0.04, 0.0)) / vec3(0.081, 0.075, 0.095);
        c = mix(c, face, edge(1.0 - dot(throat, throat)) * edge(0.3 - up));
        vec3 brow = (vPos - vec3(0.45, 0.025, 0.0)) / vec3(0.05, 0.055, 0.065);
        c = mix(c, face, edge(1.0 - dot(brow, brow)));
        c = mix(c, back, edge(vPos.x - 0.49)); // dark base behind the pointed beak
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const { bird, wings, tail, feet } = buildSwallow(plumage, feather, tailSkin, feetSkin, wingGeo, tailGeo);
  flight.add(bird);

  const wind = new ShaderMaterial({
    uniforms: { color: { value: new Color() }, opacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float strength;
      varying float vStrength;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vStrength = strength;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity;
      varying float vStrength;
      varying vec2 vUv;
      void main() {
        float taper = sin(3.14159265 * vUv.x);
        gl_FragColor = vec4(color, opacity * vStrength * taper * taper);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  const count = small ? 28 : 44;
  const streaks = new InstancedMesh(new PlaneGeometry(1, 1), wind, count);
  streaks.frustumCulled = false; // instances move every frame; the default bounds would be stale
  const strength = new InstancedBufferAttribute(new Float32Array(count), 1);
  streaks.geometry.setAttribute('strength', strength);
  flight.add(streaks);
  const pool = Array.from({ length: count }, () => respawn({} as Streak, lerp(-WIND_X, WIND_X, Math.random())));
  const face = new Quaternion();
  const eye = new Vector3();
  const m4 = new Matrix4();
  const v = new Vector3();
  const sc = new Vector3();

  function placeStreaks(dt: number, gust: number) {
    // Turn each streak toward the camera while keeping it along the wind.
    flight.worldToLocal(eye.copy(camera.position));
    face.setFromAxisAngle(X_AXIS, Math.atan2(-eye.y, eye.z));
    const speed = 1.6 * (1 + 1.3 * gust);
    pool.forEach((s, i) => {
      s.x -= speed * dt;
      if (s.x < -WIND_X) respawn(s, WIND_X);
      streaks.setMatrixAt(i, m4.compose(v.set(s.x, s.y, s.z), face, sc.set(s.len, s.width, 1)));
      strength.setX(i, s.strength * (s.gusty ? gust : 1));
    });
    streaks.instanceMatrix.needsUpdate = true;
    strength.needsUpdate = true;
  }

  let t = 0;
  let flapAt = 1.5; // when the current or next bout of wingbeats starts
  let beats = 3;
  let glide = 3; // seconds of gliding after a bout before the next one
  let gustAt = -10;
  let gustLen = 2;
  let nextGust = lerp(4, 8, Math.random());

  // Wingbeat after slow-motion footage of a barn swallow: a long power stroke with the wing
  // spread and pitched nose-down, then a quick recovery with the hand folded and swept back,
  // the hand trailing the arm. The body is thrown up a little by each downstroke.
  function pose(beat: number, gust: number) {
    const W = WING;
    const total = W.always || W.freeze ? Infinity : beats;
    const on = beat >= 0 && beat < total;
    const env = on ? Math.min(1, 2 * beat, 2 * (total - beat)) : 0; // half a beat to ease into and out of a bout
    const arm = on ? phase(beat) : 0;
    const hand = on ? phase(Math.max(0, beat - W.lagMid)) : 0; // the hand trails the arm...
    const tip = on ? phase(Math.max(0, beat - W.lagTip)) : 0; // ...and the tip trails the hand
    const down = env * Math.sin(arm); // positive through the power stroke
    const fold = env * Math.max(0, -Math.sin(hand)) ** 2; // primaries tuck in a little on the recovery
    // One beat is a loop, not a swing: from the top, forward and up, the root starts down and the
    // sweep back builds through the power stroke to its peak at the bottom, where the wing hangs far
    // behind the body; the root then leads forward and up while the tip is still behind, and past
    // level every section reaches ahead of its resting line, the tip furthest, into the top again.
    // The recovery path is forward of the power-stroke path, so the tip draws a wide loop.
    const sweep = (psi: number) => 0.5 * (1 - Math.cos(psi + W.lead));
    const reach = (psi: number) => Math.max(0, -Math.sin(psi + (1.5 - W.reachPeak) * Math.PI)) ** 2;
    wings.forEach((w, i) => {
      const flutter = (0.025 + 0.07 * gust) * (0.6 * Math.sin(t * 29 + i) + 0.4 * Math.sin(t * 43 + 2 * i));
      // Root, hand and tip: each trails the one before and swings further, so the wing bends like
      // a whip instead of swinging as one plate; the root moves least and the tip most.
      w.shoulder.rotation.x = -(W.dihedral + W.flap * env * Math.cos(arm)) - flutter * 0.25;
      w.shoulder.rotation.z = -W.twistRoot * down; // pronation
      w.sweeper.rotation.y = -(0.04 * W.glideSweep + env * (W.sweepRoot * sweep(arm) - W.reachRoot * reach(arm)));
      w.wrist.rotation.x = 0.04 - W.fold * fold - W.whipMid * W.flap * env * (Math.cos(hand) - Math.cos(arm));
      w.wrist.rotation.y = -(0.08 * W.glideSweep + env * (W.sweepMid * sweep(hand) - W.reachMid * reach(hand)) + W.foldSweep * fold);
      w.wrist.rotation.z = -W.twistMid * env * Math.sin(hand) + flutter; // leading edge pitches down through the power stroke
      w.outer.rotation.x = -W.whipTip * W.flap * env * (Math.cos(tip) - Math.cos(hand));
      w.outer.rotation.y = -(0.03 * W.glideSweep + env * (W.sweepTip * sweep(tip) - W.reachTip * reach(tip)));
      w.outer.rotation.z = -W.twistTip * env * Math.sin(tip);
    });
    feet.visible = W.feet;
    plumage.uniforms.wingUp.value.set(0, 1, 0).applyEuler(wings[0].shoulder.rotation); // the flank's colour split follows the wing roots
    const flutter = (0.03 + 0.08 * gust) * Math.sin(t * 37);
    tail.scale.z = 1 - 0.15 * env + 0.1 * Math.sin(t * 0.7) + flutter; // streamers close while flapping, fan in the glide
    tail.rotation.x = flutter * 1.5;
    tail.rotation.z = -0.06 * env;
    // Holds its height: only a gust lifts it, and each downstroke throws the body up a touch.
    bird.position.set(0.1 * Math.sin(t * 0.31) - 0.22 * gust, 0.06 * gust - WING.bob * env * Math.cos(arm), 0.06 * Math.sin(t * 0.23));
    bird.rotation.z = 0.08 + 0.05 * env + WING.pitch * down; // a little nose-up while flapping, more through each power stroke
    bird.rotation.x = BANK + 0.22 * gust * Math.sin((t - gustAt) * 7) + 0.04 * Math.sin(t * 0.5);
  }

  function step(dt: number) {
    t += dt;
    if (t > nextGust) {
      gustAt = t;
      gustLen = lerp(1.6, 2.8, Math.random());
      nextGust = t + lerp(6, 12, Math.random());
      if (t - flapAt > beats * WING.beat && Math.random() < 0.5) {
        flapAt = t + 0.4; // a couple of strokes to steady itself
        beats = 2;
      }
    }
    const g = (t - gustAt) / gustLen;
    breeze = Math.max(0, breeze - dt * 0.6);
    const gust = Math.max(breeze, g > 0 && g < 1 ? Math.sin(Math.PI * g) ** 2 : 0);

    if (t - flapAt > beats * WING.beat + glide) {
      flapAt = t; // glided long enough: a few strokes, then glide again
      beats = 3 + Math.floor(Math.random() * 3);
      glide = lerp(2.5, 5, Math.random());
    }
    pose(WING.freeze ? 1 + WING.phase : (t - flapAt) / WING.beat, gust);
    placeStreaks(dt, gust);
  }

  pose(-1, 0);
  placeStreaks(0, 0);

  function frame(now: number) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) {
      step(dt);
      aimCamera(dt);
    }
    if (!reduced || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    raf = requestAnimationFrame(frame);
  }

  function applyTheme() {
    const cs = getComputedStyle(document.documentElement);
    const css = (name: string) => cs.getPropertyValue(name).trim();
    const back = css('--swallow-back');
    const p: Palette = {
      back,
      belly: css('--swallow-belly'),
      face: css('--swallow-face'),
      sheen: css('--swallow-sheen'),
      gloss: css('--swallow-gloss'),
      rib: css('--swallow-rib'),
      line: shade(back, -0.12),
    };
    paintWing(lower.ctx, lower.box, p, false);
    paintWing(upper.ctx, upper.box, p, true);
    paintTail(tailSheet.ctx, tailSheet.box, p);
    for (const { texture } of [lower, upper, tailSheet]) texture.needsUpdate = true;
    plumage.uniforms.back.value.set(p.back);
    plumage.uniforms.belly.value.set(p.belly);
    plumage.uniforms.face.value.set(p.face);
    feetSkin.color.set(shade(p.rib, -0.08));
    const [r = 255, g = 255, b = 255, a = 1] = (cs.getPropertyValue('--sky-wind').match(/[\d.]+/g) ?? []).map(Number);
    wind.uniforms.color.value.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
    wind.uniforms.opacity.value = a;
    dirty = true;
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  // Development only: `?wing` in the URL opens a panel of live sliders for the WING parameters.
  // Vite drops this branch, and the module behind it, from production builds.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('wing')) {
    import('./swallow-debug').then((m) => m.mountWingDebug(WING, applyTheme));
  }

  function resize() {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.zoom = Math.min(1, camera.aspect / 1.6); // on the taller 4:3 phone sky, pull back so upstrokes clear the top
    // Shift the lens so the bird sits a little left of centre, with room to fly into.
    camera.filmOffset = 0.1 * 35 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  resize();
  new ResizeObserver(resize).observe(el);

  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }).observe(el);
}
