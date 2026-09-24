import {
  Bone,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Bird space: x is forward (the beak), y is up, z is the right wing. The camera
// starts below the flight line on the right-wing side, looking up, and can be
// dragged around the bird. Everything is unlit painted surfaces in barn-swallow
// livery; the sky itself is a CSS gradient behind the transparent canvas.
const ELEVATION = 0.6; // radians below the flight plane (~35°)
const AZIMUTH = 0.45; // camera a little ahead of the bird, so the wings lie on a diagonal
const DISTANCE = 8.0;
const FOV = 24; // long lens: the near wing stays close to the far one in size, so the silhouette reads flat
const BANK = -0.14; // standing roll that tips the belly toward the camera
const BEAT = 0.3; // seconds per wingbeat; a real swallow is ~2x faster, too quick to read
const DOWNSTROKE = 0.58; // share of each beat spent on the power stroke; the recovery is quicker
const HOME_AFTER = 5; // seconds without dragging before the camera drifts back
const WIND_X = 5; // wind streaks recycle across this half-width
const SPAN = 1.5; // shoulder to wing tip
const WRIST = 0.45; // as a fraction of the span
const OUTER = 0.72; // pivot of the tip section, as a fraction of the span
const ROOT = -0.05; // span fraction buried in the body
const ROOT_CHORD = 0.52;
const SHOULDER = new Vector3(0.2, 0.04, 0.08); // high on the chest, so the wing grows out of the shoulder
const FOCUS = { x: 0.06, z: -0.22 }; // every flight feather radiates from this point inside the shoulder
// Flight feathers, innermost first, by the span fraction where each tip meets the trailing edge.
const TIPS = Array.from({ length: 16 }, (_, k) => 0.1 + 0.9 * ((k + 1) / 16) ** 1.15);
const X_AXIS = new Vector3(1, 0, 0);

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
    // The body holds the buried root, the shoulder takes over across the first fifth
    // of the span and the wrist across the middle: the surface bends instead of hinging.
    const arm = smoothstep(0, 0.2, s);
    const hand = smoothstep(WRIST - 0.18, WRIST + 0.18, s); // wide blends, so the wing curves instead of creasing
    const outer = smoothstep(0.6, 0.92, s);
    for (let j = 0; j <= NC; j++) {
      const v = j / NC;
      position.push(te + (le - te) * v, 0.05 * (le - te) * Math.sin(Math.PI * v), s * SPAN); // gentle camber
      skinIndex.push(0, 1, 2, 3);
      skinWeight.push(1 - arm, arm * (1 - hand), arm * hand * (1 - outer), arm * hand * outer);
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
  wedge(0.3, 0.56);
  ctx.fill();
  ctx.stroke();
  if (!upper) ctx.fillStyle = shade(p.belly, -0.05);
  ctx.lineWidth = 0.004;
  wedge(0.62, 0.38); // lesser coverts: a second, finer row of scallops
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

/** Stroke angle for a beat position: 0 at the top, π at the bottom, the downstroke taking DOWNSTROKE of the cycle. */
function phase(beat: number) {
  const c = beat - Math.floor(beat);
  return c < DOWNSTROKE ? (Math.PI * c) / DOWNSTROKE : Math.PI + (Math.PI * (c - DOWNSTROKE)) / (1 - DOWNSTROKE);
}

function buildSwallow(plumage: ShaderMaterial, feather: ShaderMaterial, tailSkin: MeshBasicMaterial, wingGeo: BufferGeometry, tailGeo: BufferGeometry) {
  const bird = new Group();
  bird.rotation.order = 'YZX'; // roll about the body axis first, then pitch

  const body = [
    [0, -0.45], [0.04, -0.405], [0.085, -0.27], [0.13, -0.108], [0.155, 0.045],
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

  // Each wing is one skinned surface over a chain of bones: an anchor holds the root inside the
  // body, the shoulder swings the arm, the wrist the hand and an outer joint the tip section, so
  // motion can travel out along the wing. The left wing is the right one mirrored, so the same
  // bone rotations drive both.
  const wings = [1, -1].map((side) => {
    const root = new Group();
    root.position.set(SHOULDER.x, SHOULDER.y, SHOULDER.z * side);
    root.scale.z = side;
    const mesh = new SkinnedMesh(wingGeo, feather);
    mesh.frustumCulled = false;
    const anchor = new Bone();
    const shoulder = new Bone();
    const wrist = new Bone();
    const outer = new Bone();
    wrist.position.z = WRIST * SPAN;
    outer.position.z = (OUTER - WRIST) * SPAN;
    anchor.add(shoulder);
    shoulder.add(wrist);
    wrist.add(outer);
    mesh.add(anchor);
    mesh.bind(new Skeleton([anchor, shoulder, wrist, outer]));
    root.add(mesh);
    bird.add(root);
    return { shoulder, wrist, outer };
  });

  const tail = new Group();
  tail.position.set(-0.405, 0, 0);
  tail.add(new Mesh(tailGeo, tailSkin));
  bird.add(tail);

  return { bird, wings, tail };
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
    el.remove();
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
  const home = camera.position.clone();

  const flight = new Group();
  flight.rotation.z = 0.12; // the flight line climbs gently to the right
  scene.add(flight);
  flight.updateMatrixWorld(true);

  let visible = false;
  let dirty = true;
  let raf = 0;
  let last = 0;

  // Drag to look at the bird from any side; the wheel and vertical swipes keep scrolling the page.
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI - 0.2;
  canvas.style.touchAction = 'pan-y';
  let dragging = false;
  let idle = 0;
  controls.addEventListener('start', () => { dragging = true; });
  controls.addEventListener('end', () => { dragging = false; idle = 0; });
  controls.addEventListener('change', () => { dirty = true; });

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
  // A dark crown and back frame the warm white belly, with the orange throat cut off by a dark breast band.
  const plumage = new ShaderMaterial({
    uniforms: { back: { value: new Color() }, belly: { value: new Color() }, face: { value: new Color() } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 back, belly, face;
      varying vec3 vPos;
      float edge(float v) { float w = fwidth(v); return smoothstep(-w, w, v); } // antialiased step at 0
      void main() {
        float up = vPos.y / max(length(vPos.yz), 1e-4); // -1 under the belly, 1 along the spine
        // The dark collar's rear edge runs from under the throat up and back to the wing root, so
        // throat line, collar and wing leading edge read as one line; the back stays dark down to
        // where the wings leave the body.
        float collar = 0.279 - 0.078 * (up + 1.0) / 1.37;
        float white = (1.0 - edge(vPos.x - collar)) * (1.0 - edge(up - 0.38));
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
  const { bird, wings, tail } = buildSwallow(plumage, feather, tailSkin, wingGeo, tailGeo);
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
    const on = beat >= 0 && beat < beats;
    const env = on ? Math.min(1, 2 * beat, 2 * (beats - beat)) : 0; // half a beat to ease into and out of a bout
    const arm = on ? phase(beat) : 0;
    const hand = on ? phase(Math.max(0, beat - 0.08)) : 0; // the hand trails the arm...
    const tip = on ? phase(Math.max(0, beat - 0.16)) : 0; // ...and the tip trails the hand
    const down = env * Math.sin(arm); // positive through the power stroke
    const fold = env * Math.max(0, -Math.sin(hand)) ** 2; // primaries tuck in a little on the recovery
    // 0 at the top of the stroke, 1 at the bottom and a little past it: the wing sweeps back as it
    // comes down and returns forward as it rises, the tip tracing a narrow loop.
    const sweep = (psi: number) => 0.5 * (1 - Math.cos(psi) - 0.35 * Math.sin(psi));
    wings.forEach((w, i) => {
      const flutter = (0.025 + 0.07 * gust) * (0.6 * Math.sin(t * 29 + i) + 0.4 * Math.sin(t * 43 + 2 * i));
      // Root: the main down-and-up stroke, swinging back through the power stroke. Each section
      // further out trails the one before and sweeps back further, so the wing bends like a whip
      // rather than swinging as one plate: at the bottom it is curved and strongly swept, and on
      // the way up the root leads while the tip is still finishing its sweep.
      w.shoulder.rotation.x = -(0.1 + 0.62 * env * Math.cos(arm)) - flutter * 0.25; // glides with a slight dihedral
      w.shoulder.rotation.y = -(0.04 + 0.28 * env * sweep(arm));
      w.shoulder.rotation.z = -0.08 * down; // pronation
      w.wrist.rotation.x = 0.04 - 0.3 * fold - 0.4 * env * (Math.cos(hand) - Math.cos(arm));
      w.wrist.rotation.y = -(0.08 + 0.3 * env * sweep(hand) + 0.2 * fold);
      w.wrist.rotation.z = -0.2 * env * Math.sin(hand) + flutter; // leading edge pitches down through the power stroke
      w.outer.rotation.x = -0.3 * env * (Math.cos(tip) - Math.cos(hand));
      w.outer.rotation.y = -(0.03 + 0.22 * env * sweep(tip));
      w.outer.rotation.z = -0.1 * env * Math.sin(tip);
    });
    const flutter = (0.03 + 0.08 * gust) * Math.sin(t * 37);
    tail.scale.z = 1 - 0.15 * env + 0.1 * Math.sin(t * 0.7) + flutter; // streamers close while flapping, fan in the glide
    tail.rotation.x = flutter * 1.5;
    tail.rotation.z = -0.06 * env;
    // Holds its height: only a gust lifts it, and each downstroke throws the body up a touch.
    bird.position.set(0.1 * Math.sin(t * 0.31) - 0.22 * gust, 0.06 * gust - 0.015 * env * Math.cos(arm), 0.06 * Math.sin(t * 0.23));
    bird.rotation.z = 0.08 + 0.05 * env + 0.03 * down; // a little nose-up while flapping, more through each power stroke
    bird.rotation.x = BANK + 0.22 * gust * Math.sin((t - gustAt) * 7) + 0.04 * Math.sin(t * 0.5);
  }

  function step(dt: number) {
    t += dt;
    if (t > nextGust) {
      gustAt = t;
      gustLen = lerp(1.6, 2.8, Math.random());
      nextGust = t + lerp(6, 12, Math.random());
      if (t - flapAt > beats * BEAT && Math.random() < 0.5) {
        flapAt = t + 0.4; // a couple of strokes to steady itself
        beats = 2;
      }
    }
    const g = (t - gustAt) / gustLen;
    const gust = g > 0 && g < 1 ? Math.sin(Math.PI * g) ** 2 : 0;

    if (t - flapAt > beats * BEAT + glide) {
      flapAt = t; // glided long enough: a few strokes, then glide again
      beats = 3 + Math.floor(Math.random() * 3);
      glide = lerp(2.5, 5, Math.random());
    }
    pose((t - flapAt) / BEAT, gust);
    placeStreaks(dt, gust);
  }

  pose(-1, 0);
  placeStreaks(0, 0);

  function frame(now: number) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) step(dt);
    if (!dragging && !reduced) {
      idle += dt;
      if (idle > HOME_AFTER && camera.position.distanceToSquared(home) > 1e-4) {
        camera.position.lerp(home, 1 - Math.exp(-dt)); // drift back to the composed view
        dirty = true;
      }
    }
    if (controls.update(dt)) dirty = true;
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
    const [r = 255, g = 255, b = 255, a = 1] = (cs.getPropertyValue('--sky-wind').match(/[\d.]+/g) ?? []).map(Number);
    wind.uniforms.color.value.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
    wind.uniforms.opacity.value = a;
    dirty = true;
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

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
