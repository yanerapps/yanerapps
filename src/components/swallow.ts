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
// moves between oblique underside and upper-side views with slow, eased arcs.
// Everything is unlit painted surfaces
// in barn-swallow livery; the sky itself is a CSS gradient behind the transparent canvas.
const FOV = 24; // long lens: the near wing stays close to the far one in size, so the silhouette reads flat
const BANK = -0.14; // standing roll that tips the belly toward the camera
const WIND_X = 5; // wind streaks recycle across this half-width
const SPAN = 1.33; // shoulder to wing tip
const WRIST = 0.45; // as a fraction of the span
const OUTER = 0.72; // pivot of the tip section, as a fraction of the span
const ROOT = -0.05; // span fraction buried in the body
const ROOT_CHORD = 0.52;
const WING_CHORD_SCALE = 0.9; // shorten both leading and trailing reach without changing span
const BODY_SCALE = new Vector3(0.88, 0.88, 0.86);
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
  sweepRoot: 0.3, // back-sweep through the power stroke, per section
  sweepMid: 0.15,
  sweepTip: 0.06,
  reachRoot: 0.08, // forward reach past the resting line on the way up, per section; the tip leads
  reachMid: 0.1,
  reachTip: 0.08,
  reachPeak: 1.9, // where the reach peaks, in half-strokes: 1 = bottom, 1.5 = level, 2 = top
  lagMid: 0.03, // the hand trails the arm by this many beats
  lagTip: 0.05, // the tip trails the arm by this many beats
  whipMid: 0.25, // how much of the flap each section's up-and-down lags the one before by
  whipTip: 0.15,
  fold: 0.14, // a shallow hand fold on the recovery
  foldSweep: 0.035, // and a touch back
  twistRoot: 0.04, // leading edge pitched down through the power stroke, per section
  twistMid: 0.08,
  twistTip: 0.025,
  glideSweep: 1, // scales the resting sweep of the three sections
  feet: false, // show the feet tucked under the belly
  bob: 0.015, // body thrown up by each power stroke
  pitch: 0.03, // and nosed up
  always: false, // flap continuously instead of alternating with glides
  freeze: false, // hold the wing at `phase` of a beat
  phase: 0.3,
  wedgeReach: 0.56, // covert wedge: how far out along the leading edge it reaches
  wedgeRoot: 0.3, // and the chord fraction it leaves uncovered at the root
  rootOffsetX: 0, // live offsets for the distributed flight-feather attachment line
  rootOffsetZ: 0,
};

// Camera angles are degrees: negative elevation looks up, positive elevation looks down.
export const CAMERA = {
  auto: true,
  freeze: false,
  phase: 0, // cycle position: 0 = underside, 0.5 = upper side with equal hold times
  lowElevation: -32,
  highElevation: 32,
  lowAzimuth: 26,
  highAzimuth: 54,
  lowDistance: 8,
  highDistance: 7.8,
  lowHold: 7,
  highHold: 7,
  transition: 4, // seconds for each move; each view holds still between moves
};

/** Quintic easing starts and stops with zero velocity and acceleration. */
const cinematicEase = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export function cameraView(progress: number, settings = CAMERA) {
  const low = Math.max(0, settings.lowHold), high = Math.max(0, settings.highHold);
  const move = Math.max(0.1, settings.transition);
  const duration = low + high + 2 * move;
  const time = ((progress % 1 + 1) % 1) * duration;
  let blend = 0;
  if (time >= low && time < low + move) blend = cinematicEase((time - low) / move);
  else if (time >= low + move && time < low + move + high) blend = 1;
  else if (time >= low + move + high) blend = 1 - cinematicEase((time - low - move - high) / move);
  return {
    elevation: lerp(settings.lowElevation, settings.highElevation, blend) * Math.PI / 180,
    azimuth: lerp(settings.lowAzimuth, settings.highAzimuth, blend) * Math.PI / 180,
    distance: lerp(settings.lowDistance, settings.highDistance, blend),
    duration,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const flat = (shape: Shape) => new ShapeGeometry(shape, 16).rotateX(Math.PI / 2); // shape y becomes bird z

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
type ProfileStation = readonly [span: number, value: number, slope: number];
// Cubic tangents join the shoulder, elbow, wrist and swept hand without angular seams.
const LEADING_PROFILE: readonly ProfileStation[] = [
  [0, 0, 0.15], [0.24, 0.055, 0.08], [WRIST, 0.08, 0],
  [OUTER, -0.025, -0.65], [1, -0.25, -0.8],
];
const CHORD_PROFILE: readonly ProfileStation[] = [
  [0, ROOT_CHORD, 0], [0.24, 0.475, -0.25], [WRIST, 0.375, -0.55],
  [OUTER, 0.21, -0.6], [0.9, 0.085, -0.68], [1, 0, -0.95],
];

function profile(s: number, stations: readonly ProfileStation[]) {
  const u = clamp01(s);
  for (let i = 1; i < stations.length; i++) {
    const [a, va, da] = stations[i - 1];
    const [b, vb, db] = stations[i];
    if (u > b) continue;
    const h = b - a;
    const t = (u - a) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * va + (t3 - 2 * t2 + t) * h * da
      + (-2 * t3 + 3 * t2) * vb + (t3 - t2) * h * db;
  }
  return stations[stations.length - 1][1];
}
const leading = (s: number) => WING_CHORD_SCALE * profile(s, LEADING_PROFILE);
const chord = (s: number) => WING_CHORD_SCALE * profile(s, CHORD_PROFILE);
function trailing(s: number) {
  let notch = 0;
  for (let k = 3; k < TIPS.length; k++) {
    if (s > TIPS[k - 1] && s < TIPS[k]) { // scalloped between feather tips
      const u = (s - TIPS[k - 1]) / (TIPS[k] - TIPS[k - 1]);
      notch = Math.min(0.006 + 0.004 * smoothstep(0.3, 0.7, s), chord(s) * 0.1)
        * Math.sin(Math.PI * u) ** 1.2;
    }
  }
  return leading(s) - chord(s) + notch;
}

/** Leading and trailing edge x, relative to the shoulder, at span fraction s. */
const planform = (s: number): [number, number] => [leading(s), trailing(s)];

/** Secondaries follow the forearm; primaries spread from the hand beyond the wrist. */
function featherRoot(s: number) {
  const station = s <= WRIST
    ? lerp(0.025, WRIST - 0.065, smoothstep(0.1, WRIST, s))
    : lerp(WRIST - 0.065, 0.6, (s - WRIST) / (1 - WRIST));
  return {
    x: leading(station) - chord(station) * 0.2 + WING.rootOffsetX,
    z: station * SPAN + WING.rootOffsetZ,
  };
}

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
    // with the shoulder. The buried surface overlaps the fixed body plumage and the painted
    // shoulder coverts hide the attachment. Most of each feather fan follows one section
    // rigidly; compact, smooth blends around the wrist and outer joint keep the surface
    // continuous without stretching a large part of the painted feather fan.
    const arm = smoothstep(-0.05, 0.03, s);
    const swung = smoothstep(-0.025, 0.045, s);
    const hand = smoothstep(WRIST - 0.075, WRIST + 0.075, s);
    const outer = smoothstep(OUTER - 0.065, OUTER + 0.065, s);
    const weights = [1 - arm, arm * (1 - swung) * (1 - hand), arm * swung * (1 - hand), arm * hand * (1 - outer), arm * hand * outer];
    const bones = [0, 1, 2, 3, 4].sort((a, b) => weights[b] - weights[a]).slice(0, 4); // never more than three are non-zero
    for (let j = 0; j <= NC; j++) {
      const v = j / NC;
      const camber = lerp(0.09, 0.035, clamp01(s));
      position.push(te + (le - te) * v, camber * (le - te) * Math.sin(Math.PI * v) * smoothstep(0, 0.2, s), s * SPAN); // fuller inner wing, thin swept tip
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

/** A shallow closed feather cuff bridges the fixed body into the moving inner wing. */
function shoulderGeometry(box: Box) {
  const NS = 14, NC = 8, end = 0.14;
  const position: number[] = [], uv: number[] = [], coverSide: number[] = [];
  const skinIndex: number[] = [], skinWeight: number[] = [], index: number[] = [];
  for (const top of [true, false]) {
    for (let i = 0; i <= NS; i++) {
      const s = lerp(ROOT, end, i / NS);
      const [le, te] = planform(s);
      const follow = smoothstep(ROOT, end, s);
      for (let j = 0; j <= NC; j++) {
        const v = j / NC, x = lerp(te, le, v), z = s * SPAN;
        const arch = Math.sin(Math.PI * v);
        const wingHeight = lerp(0.09, 0.035, clamp01(s)) * (le - te) * arch * smoothstep(0, 0.2, s);
        const thickness = (top ? 0.02 : -0.014) * arch * (1 - smoothstep(0.055, end, s));
        position.push(x, wingHeight + thickness, z);
        uv.push((x - box.x) / box.w, (z - box.z) / box.h);
        coverSide.push(top ? 1 : 0);
        skinIndex.push(0, 2, 0, 0);
        skinWeight.push(1 - follow, follow, 0, 0);
      }
    }
  }
  const offset = (NS + 1) * (NC + 1);
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NC; j++) {
      const a = i * (NC + 1) + j, b = a + NC + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1); // upper surface faces up
      index.push(offset + a, offset + a + 1, offset + b, offset + b, offset + a + 1, offset + b + 1);
    }
  }
  // Close the buried inner end; the outer end and both edges taper onto the wing surface.
  for (let j = 0; j < NC; j++) index.push(j, j + 1, offset + j, offset + j, j + 1, offset + j + 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setAttribute('coverSide', new Float32BufferAttribute(coverSide, 1));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeight, 4));
  geometry.setIndex(index);
  return geometry;
}

function tailShape() {
  const tail = new Shape(); // deep fork with long outer streamers
  tail.moveTo(0.04, 0.06);
  tail.quadraticCurveTo(-0.16, 0.145, -0.34, 0.16);
  tail.quadraticCurveTo(-0.72, 0.28, -1.08, 0.34);
  tail.quadraticCurveTo(-0.78, 0.18, -0.37, 0.05);
  tail.quadraticCurveTo(-0.27, 0, -0.37, -0.05);
  tail.quadraticCurveTo(-0.78, -0.18, -1.08, -0.34);
  tail.quadraticCurveTo(-0.72, -0.28, -0.34, -0.16);
  tail.quadraticCurveTo(-0.16, -0.145, 0.04, -0.06);
  return tail;
}

type Palette = { back: string; belly: string; face: string; sheen: string; gloss: string; rib: string; line: string };

function shade(color: string, dl: number) {
  const c = new Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl, SRGBColorSpace);
  return c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + dl)), SRGBColorSpace).getStyle(SRGBColorSpace);
}

/** Blend in display color space for restrained, neutral painted feather tones. */
function mixPaint(a: string, b: string, amount: number) {
  const first = new Color(a).convertLinearToSRGB();
  const second = new Color(b).convertLinearToSRGB();
  return first.lerp(second, amount).convertSRGBToLinear().getStyle(SRGBColorSpace);
}

function paintWing(ctx: CanvasRenderingContext2D, box: Box, p: Palette, upper: boolean) {
  ctx.fillStyle = p.line; // shows through between feathers as their outlines
  ctx.fillRect(box.x, box.z, box.w, box.h);
  ctx.lineJoin = 'round';
  const feather = (k: number) => {
    const s = TIPS[k];
    const root = featherRoot(s);
    const tx = trailing(s);
    const tz = s * SPAN;
    const len = Math.hypot(tx - root.x, tz - root.z);
    return { s, root, tx, tz, ux: (tx - root.x) / len, uz: (tz - root.z) / len, len };
  };
  const along = (f: ReturnType<typeof feather>, t: number): [number, number] =>
    [f.root.x + f.ux * f.len * t, f.root.z + f.uz * f.len * t];

  // Paint from the outermost feather inward, preserving overlaps across the wrist. The short
  // secondaries point back from the forearm; the longer primaries fan outward from the hand.
  for (let k = TIPS.length - 1; k >= 0; k--) {
    const f = feather(k);
    const w = WING_CHORD_SCALE * 0.14 * (1 - 0.43 * f.s);
    const nx = -f.uz; // toward the trailing side, where the vane is wider
    const nz = f.ux;
    const [rx, rz] = along(f, 0.02);
    const [mx, mz] = along(f, 0.58);
    ctx.beginPath();
    ctx.moveTo(rx + nx * w * 0.1, rz + nz * w * 0.1);
    ctx.quadraticCurveTo(mx + nx * w * 0.62, mz + nz * w * 0.62, f.tx, f.tz);
    ctx.quadraticCurveTo(mx - nx * w * 0.42, mz - nz * w * 0.42, rx - nx * w * 0.1, rz - nz * w * 0.1);
    ctx.closePath();
    const vane = ctx.createLinearGradient(f.root.x, f.root.z, f.tx, f.tz);
    const dark = shade(p.back, -0.02 * (k % 2) - 0.03 * f.s);
    if (upper) {
      vane.addColorStop(0, p.sheen);
      vane.addColorStop(0.36, p.back);
    } else {
      // Each vane carries the transition along its own shaft, preserving the radial fan.
      vane.addColorStop(0, p.belly);
      vane.addColorStop(0.19, mixPaint(p.belly, p.back, 0.12));
      vane.addColorStop(0.42, mixPaint(p.belly, p.back, 0.46));
      vane.addColorStop(0.68, mixPaint(p.belly, p.back, 0.82));
    }
    vane.addColorStop(1, dark);
    ctx.fillStyle = vane;
    ctx.fill();
    ctx.lineWidth = 0.004;
    ctx.strokeStyle = upper ? shade(p.back, -0.05) : shade(p.back, 0.06);
    ctx.stroke();
    if (k >= 4 && k % 3 !== 0) { // sparse, varied shaft accents leave the vanes as the main structure
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const t = 0.59 + 0.28 * (i / 8) - 0.025 * (k % 3);
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        ctx.lineTo(a * (rx + nx * w * 0.1) + b * (mx + nx * w * 0.5) + c * f.tx, a * (rz + nz * w * 0.1) + b * (mz + nz * w * 0.5) + c * f.tz);
      }
      ctx.lineWidth = 0.005 * (1 - 0.4 * f.s);
      ctx.strokeStyle = upper ? mixPaint(p.back, p.gloss, 0.55) : mixPaint(p.back, p.rib, 0.3);
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
      const root = featherRoot(Math.max(0.1, s));
      const len = Math.max(0.001, Math.hypot(bx - root.x, bz - root.z));
      ctx.quadraticCurveTo((px + bx) / 2 + ((bx - root.x) / len) * 0.03, (pz + bz) / 2 + ((bz - root.z) / len) * 0.03, bx, bz);
      px = bx;
      pz = bz;
    }
    ctx.lineTo(trailing(ROOT) - 0.03, ROOT * SPAN);
    ctx.closePath();
  };
  if (upper) {
    const g = ctx.createLinearGradient(0, 0.1, 0, 0.55);
    g.addColorStop(0, p.back);
    g.addColorStop(0.45, mixPaint(p.back, p.sheen, 0.65));
    g.addColorStop(1, p.sheen);
    ctx.fillStyle = g;
  } else ctx.fillStyle = p.belly;
  ctx.lineWidth = 0.003;
  ctx.strokeStyle = upper ? shade(p.back, 0.05) : shade(p.belly, -0.1);
  wedge(WING.wedgeRoot, WING.wedgeReach);
  ctx.fill();
  ctx.stroke();
  if (!upper) ctx.fillStyle = shade(p.belly, -0.018);
  ctx.lineWidth = 0.002;
  wedge(lerp(WING.wedgeRoot, 1, 0.45), WING.wedgeReach * 0.68); // lesser coverts: a second, finer row of scallops
  ctx.fill();
  ctx.stroke();

  // Small overlapping covert tips follow the same attachment line as the flight feathers.
  // Clip them to the root patch so the longer vanes retain their uninterrupted gradients.
  ctx.save();
  wedge(WING.wedgeRoot, WING.wedgeReach);
  ctx.clip();
  ctx.strokeStyle = upper ? shade(p.sheen, 0.03) : shade(p.belly, -0.09);
  ctx.lineWidth = 0.0025;
  for (let k = 0; k < 11; k++) {
    const f = feather(k);
    const nx = -f.uz, nz = f.ux;
    for (const t of [0.17, 0.29]) {
      const [x, z] = along(f, t);
      const width = 0.022 * (1 - 0.3 * f.s);
      ctx.beginPath();
      ctx.moveTo(x + nx * width, z + nz * width);
      ctx.quadraticCurveTo(x + f.ux * 0.035, z + f.uz * 0.035, x - nx * width, z - nz * width);
      ctx.stroke();
    }
  }
  ctx.restore();

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
  // Five feathers per side: dark margins frame continuous cream centers that narrow
  // from the rump into fine points, including the long outer streamers.
  const tips: [number, number][] = [[-1.08, 0.34], [-0.87, 0.245], [-0.72, 0.18], [-0.55, 0.11], [-0.38, 0.05]];
  for (const side of [1, -1]) {
    tips.forEach(([tx, z0], i) => {
      const tz = side * z0;
      const len = Math.hypot(tx, tz);
      const ux = tx / len;
      const uz = tz / len;
      const nx = -uz;
      const nz = ux;
      const w = i === 0 ? 0.068 : 0.15 - 0.01 * i;
      const whiteWidth = i === 0 ? 0.16 : 0.27;
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
      // An inset white vane stays inside the dark feather margins and ends at its tip.
      // The body overlaps its broad base, so the white rump flows into both sides of the fork.
      ctx.beginPath();
      ctx.moveTo(...at(0.035, 0.08));
      ctx.quadraticCurveTo(...at(0.34, whiteWidth), ...at(0.995, 0));
      ctx.quadraticCurveTo(...at(0.34, -whiteWidth), ...at(0.035, -0.08));
      ctx.closePath();
      const center = ctx.createLinearGradient(0, 0, tx, tz);
      center.addColorStop(0, p.belly);
      center.addColorStop(0.55, shade(p.belly, -0.03));
      center.addColorStop(1, p.belly);
      ctx.fillStyle = center;
      ctx.fill();
    });
  }
  // Rump coverts bridge the body's cream belly into the two narrowing feather fans.
  ctx.beginPath();
  ctx.moveTo(0.04, 0.055);
  ctx.quadraticCurveTo(-0.1, 0.075, -0.28, 0.042);
  ctx.quadraticCurveTo(-0.16, 0, -0.28, -0.042);
  ctx.quadraticCurveTo(-0.1, -0.075, 0.04, -0.055);
  ctx.closePath();
  ctx.fillStyle = p.belly;
  ctx.fill();
  ctx.beginPath(); // outline the edge
  tailShape().getPoints(12).forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
  ctx.closePath();
  ctx.lineWidth = 0.009;
  ctx.strokeStyle = p.line;
  ctx.stroke();
}

/** Stroke angle for a beat position: 0 at the top, π at the bottom, the downstroke taking WING.downstroke of the cycle. */
function phase(beat: number) {
  const d = WING.downstroke;
  const c = beat - Math.floor(beat);
  return c < d ? (Math.PI * c) / d : Math.PI + (Math.PI * (c - d)) / (1 - d);
}

/** Flatten the back, keep a shallow breast keel and blend into a compact head. */
function bodyGeometry() {
  const outline = [
    [0, -0.56], [0.025, -0.51], [0.052, -0.42], [0.086, -0.28], [0.139, -0.108], [0.169, 0.045],
    [0.163, 0.162], [0.126, 0.252], [0.095, 0.306], [0.098, 0.378], [0.078, 0.441],
    [0.03, 0.495], [0, 0.522],
  ].map(([r, x]) => new Vector2(r, x));
  const geometry = new LatheGeometry(outline, 24).rotateZ(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const head = smoothstep(0.27, 0.37, x);
    const keel = 0.012 * Math.exp(-(((x - 0.06) / 0.21) ** 2)) * Math.max(0, -y / 0.155);
    const height = y >= 0 ? lerp(0.74, 0.72, head) : lerp(1.04, 0.86, head);
    positions.setXYZ(i, x, y * height - keel, z * lerp(0.88, 0.94, head));
  }
  geometry.scale(BODY_SCALE.x, BODY_SCALE.y, BODY_SCALE.z);
  geometry.computeVertexNormals();
  return geometry;
}

function buildSwallow(plumage: ShaderMaterial, feather: ShaderMaterial, coverSkin: ShaderMaterial, tailSkin: MeshBasicMaterial, feetSkin: MeshBasicMaterial, wingGeo: BufferGeometry, coverGeo: BufferGeometry, tailGeo: BufferGeometry) {
  const bird = new Group();
  bird.rotation.order = 'YZX'; // roll about the body axis first, then pitch

  bird.add(new Mesh(bodyGeometry(), plumage));

  const dark = new MeshBasicMaterial({ color: 0x161d29 });
  const eyeGeometry = new SphereGeometry(0.011, 8, 6);
  for (const side of [1, -1]) {
    const eye = new Mesh(eyeGeometry, dark);
    eye.position.set(0.396, 0.014, side * 0.087).multiply(BODY_SCALE);
    eye.scale.copy(BODY_SCALE);
    bird.add(eye);
  }
  const beak = new Mesh(new ConeGeometry(0.024, 0.085, 4).rotateZ(-Math.PI / 2).scale(1, 0.45, 1), dark);
  beak.position.set(0.529, -0.022, 0).multiply(BODY_SCALE);
  beak.scale.copy(BODY_SCALE);
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
  feet.scale.copy(BODY_SCALE);
  bird.add(feet);

  // Each wing is one skinned surface over a chain of bones: an anchor holds the root inside the
  // body, the shoulder flaps the arm and a second joint on the same pivot swings it fore and aft,
  // the wrist moves the hand and an outer joint the tip section, so motion can travel out along
  // the wing. The left wing is the right one mirrored, so the same bone rotations drive both.
  const wings = [1, -1].map((side) => {
    const root = new Group();
    root.position.set(SHOULDER.x, SHOULDER.y, SHOULDER.z * side).multiply(BODY_SCALE);
    root.scale.z = side;
    const mesh = new SkinnedMesh(wingGeo, feather);
    mesh.frustumCulled = false;
    const anchor = new Bone();
    const shoulder = new Bone();
    const sweeper = new Bone();
    const wrist = new Bone();
    const outer = new Bone();
    const wristX = leading(WRIST) - chord(WRIST) * 0.2;
    const outerX = leading(OUTER) - chord(OUTER) * 0.2;
    wrist.position.set(wristX, 0, WRIST * SPAN);
    outer.position.set(outerX - wristX, 0, (OUTER - WRIST) * SPAN);
    anchor.add(shoulder);
    shoulder.add(sweeper);
    sweeper.add(wrist);
    wrist.add(outer);
    mesh.add(anchor);
    const skeleton = new Skeleton([anchor, shoulder, sweeper, wrist, outer]);
    mesh.bind(skeleton);
    const cover = new SkinnedMesh(coverGeo, coverSkin);
    cover.frustumCulled = false;
    cover.bind(skeleton);
    root.add(mesh, cover);
    bird.add(root);
    return { shoulder, sweeper, wrist, outer };
  });

  // The tail is rooted well inside the body: its base is narrower than the rump there, and the
  // rump's cone runs on over the root, so the feathers grow out from under the body.
  const tail = new Group();
  tail.position.set(-0.33 * BODY_SCALE.x, 0, 0);
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

  const flight = new Group();
  flight.rotation.z = 0.12; // the flight line climbs gently to the right
  scene.add(flight);
  flight.updateMatrixWorld(true);

  let visible = false;
  let dirty = true;
  let raf = 0;
  let last = 0;

  // A timed camera arc alternates two oblique views. Pointer/page lean is restrained
  // during playback and disabled when a debug view is held for inspection.
  let aimX = 0; // pointer across the viewport, -1..1
  let aimY = 0;
  let leanX = 0; // eased
  let leanY = 0;
  let breeze = 0; // gust raised by the pointer
  let px: number | null = null;
  let py = 0;
  const onPointer = (e: PointerEvent) => {
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    if (px !== null) breeze = Math.min(0.6, breeze + Math.hypot(nx - px, ny - py) * 0.5);
    px = aimX = nx;
    py = aimY = ny;
  };
  const onLeave = () => { aimX = 0; aimY = 0; };
  if (!reduced) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
  }
  let cameraProgress = 0;
  function aimCamera(dt: number) {
    const k = 1 - Math.exp(-dt * 3);
    leanX += (aimX - leanX) * k;
    leanY += (aimY - leanY) * k;
    const r = el.getBoundingClientRect();
    const scrolled = Math.max(-1, Math.min(1, ((r.top + r.height / 2) / innerHeight) * 2 - 1)); // -1 at the top of the viewport
    const playback = CAMERA.auto && !CAMERA.freeze && !reduced;
    const view = cameraView(playback ? cameraProgress : reduced ? 0 : CAMERA.phase);
    if (playback) cameraProgress = (cameraProgress + dt / view.duration) % 1;
    else cameraProgress = reduced ? 0 : CAMERA.phase;
    const az = view.azimuth + (playback ? 0.04 * leanX : 0);
    const elev = view.elevation + (playback ? 0.025 * leanY + 0.015 * scrolled : 0);
    camera.position.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).multiplyScalar(view.distance);
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
  const coverGeo = shoulderGeometry(lower.box);
  const coverSkin = new ShaderMaterial({
    uniforms: feather.uniforms,
    vertexShader: /* glsl */ `
      #include <skinning_pars_vertex>
      attribute float coverSide;
      varying float vCoverSide;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vCoverSide = coverSide;
        #include <skinbase_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D upper, lower;
      varying float vCoverSide;
      varying vec2 vUv;
      void main() {
        // The upper cuff stays blue-black even when its local surface bends at the root.
        gl_FragColor = mix(texture2D(lower, vUv), texture2D(upper, vUv), vCoverSide);
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
      bodyScale: { value: BODY_SCALE.clone() },
    },
    vertexShader: /* glsl */ `
      uniform vec3 bodyScale;
      varying vec3 vPos;
      void main() {
        vPos = position / bodyScale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 back, belly, face;
      varying vec3 vPos;
      float edge(float v) { float w = fwidth(v); return smoothstep(-w, w, v); } // antialiased step at 0
      void main() {
        float up = vPos.y / max(length(vPos.yz), 1e-4); // -1 under the belly, 1 along the spine
        // Plumage belongs to the body: the crown/back boundary stays fixed through every
        // wingbeat. Dark scapular plumage wraps down over the wing attachments, while
        // the keel, chest and rump keep their pale underside independent of wing motion.
        float shoulderWrap = smoothstep(-0.46, -0.3, vPos.x)
          * (1.0 - smoothstep(0.18, 0.29, vPos.x));
        float lower = 1.0 - edge(up - mix(0.42, -0.16, shoulderWrap));
        float collar = 0.279 - 0.078 * (up + 1.0) / 1.37;
        float white = (1.0 - edge(vPos.x - collar)) * lower;
        // A restrained painted keel shadow separates the rounded belly from the flat wings.
        float keelShade = (1.0 - smoothstep(-0.97, -0.68, up))
          * smoothstep(-0.48, -0.2, vPos.x) * (1.0 - smoothstep(0.2, 0.29, vPos.x));
        vec3 breast = mix(belly, back, 0.065 * keelShade);
        vec3 c = mix(back, breast, white);
        vec3 throat = (vPos - vec3(0.387, -0.04, 0.0)) / vec3(0.075, 0.059, 0.087);
        c = mix(c, face, edge(1.0 - dot(throat, throat)) * edge(0.3 - up));
        vec3 brow = (vPos - vec3(0.45, 0.025, 0.0)) / vec3(0.044, 0.041, 0.058);
        c = mix(c, face, edge(1.0 - dot(brow, brow)));
        c = mix(c, back, edge(vPos.x - 0.49)); // dark base behind the pointed beak
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const { bird, wings, tail, feet } = buildSwallow(plumage, feather, coverSkin, tailSkin, feetSkin, wingGeo, coverGeo, tailGeo);
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
    // A shallow fore-aft loop supports the main up/down stroke. Small delays and pitch
    // changes keep the outer wing following the arm instead of rolling away from it.
    const sweep = (psi: number) => 0.5 * (1 - Math.cos(psi + W.lead));
    const reach = (psi: number) => Math.max(0, -Math.sin(psi + (1.5 - W.reachPeak) * Math.PI)) ** 2;
    wings.forEach((w) => {
      // The shoulder drives the stroke. Hand and tip add only small trailing corrections;
      // fore-aft motion shares the parent phase so adjacent sections do not counter-swing.
      w.shoulder.rotation.x = -(W.dihedral + W.flap * env * Math.cos(arm));
      w.shoulder.rotation.z = -W.twistRoot * down; // pronation
      w.sweeper.rotation.y = -(0.04 * W.glideSweep + env * (W.sweepRoot * sweep(arm) - W.reachRoot * reach(arm)));
      w.wrist.rotation.x = 0.04 - W.fold * fold - W.whipMid * W.flap * env * (Math.cos(hand) - Math.cos(arm));
      w.wrist.rotation.y = -(0.08 * W.glideSweep + env * (W.sweepMid * sweep(arm) - W.reachMid * reach(arm)) + W.foldSweep * fold);
      w.wrist.rotation.z = -W.twistMid * env * Math.sin(hand); // leading edge pitches down through the power stroke
      w.outer.rotation.x = -W.whipTip * W.flap * env * (Math.cos(tip) - Math.cos(hand));
      w.outer.rotation.y = -(0.03 * W.glideSweep + env * (W.sweepTip * sweep(hand) - W.reachTip * reach(hand)));
      w.outer.rotation.z = -W.twistTip * env * Math.sin(tip);
    });
    feet.visible = W.feet;
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
  aimCamera(0);
  placeStreaks(0, 0);

  function frame(now: number) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) {
      aimCamera(dt);
      step(dt);
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
  const themeWatch = new MutationObserver(applyTheme);
  themeWatch.observe(document.documentElement, { attributeFilter: ['data-theme'] });
  const scheme = matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', applyTheme);

  // Development only: `?wing` in the URL opens a panel of live sliders for the WING parameters.
  // Vite drops this branch, and the module behind it, from production builds.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('wing')) {
    import('./swallow-debug').then((m) => m.mountWingDebug(WING, CAMERA, () => {
      applyTheme();
      aimCamera(0);
    }));
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
  const sizer = new ResizeObserver(resize);
  sizer.observe(el);

  const watcher = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  watcher.observe(el);

  // Tear-down for client-side navigation: stop the loop, drop the listeners, release the GL context.
  return () => {
    visible = false;
    cancelAnimationFrame(raf);
    watcher.disconnect();
    sizer.disconnect();
    themeWatch.disconnect();
    scheme.removeEventListener('change', applyTheme);
    window.removeEventListener('pointermove', onPointer);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
