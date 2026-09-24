import {
  Color,
  DoubleSide,
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
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

// Bird space: x is forward (the beak), y is up, z is the right wing. The camera
// sits below the flight line on the right-wing side, looking up. Everything is
// unlit flat colour in barn-swallow livery; the sky itself is a CSS gradient
// behind the transparent canvas.
const ELEVATION = 0.6; // radians below the flight plane (~35°)
const AZIMUTH = 0.45; // camera a little ahead of the bird, so the wings lie on a diagonal
const DISTANCE = 9;
const FOV = 24; // long lens: the near wing stays close to the far one in size, so the silhouette reads flat
const BANK = -0.14; // standing roll that tips the belly toward the camera
const BEAT = 1 / 3; // seconds per wingbeat; a real swallow is ~3x faster, too quick to read
const WIND_X = 5; // wind streaks recycle across this half-width

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const flat = (shape: Shape) => new ShapeGeometry(shape, 16).rotateX(Math.PI / 2); // shape y becomes bird z

function buildSwallow(feathers: MeshBasicMaterial, plumage: ShaderMaterial) {
  const bird = new Group();
  bird.rotation.order = 'YZX'; // roll about the body axis first, then pitch

  const body = [
    [0, -0.44], [0.035, -0.42], [0.075, -0.3], [0.105, -0.14], [0.11, 0], [0.1, 0.12],
    [0.078, 0.22], [0.08, 0.3], [0.066, 0.38], [0.03, 0.46], [0, 0.5],
  ].map(([r, x]) => new Vector2(r, x));
  bird.add(new Mesh(new LatheGeometry(body, 24).rotateZ(-Math.PI / 2), plumage));

  const arm = new Shape();
  arm.moveTo(0.08, -0.02);
  arm.bezierCurveTo(0.12, 0.2, 0.13, 0.4, 0.13, 0.5);
  arm.lineTo(-0.13, 0.5);
  arm.bezierCurveTo(-0.16, 0.35, -0.22, 0.12, -0.22, -0.02);

  const hand = new Shape(); // long, narrow and swept back: the sickle outline
  hand.moveTo(0.13, 0);
  hand.bezierCurveTo(0.14, 0.35, 0, 0.75, -0.42, 1);
  hand.bezierCurveTo(-0.26, 0.72, -0.16, 0.38, -0.13, 0);

  const tail = new Shape(); // deep fork with long outer streamers
  tail.moveTo(0.02, 0.05);
  tail.lineTo(-0.28, 0.13);
  tail.quadraticCurveTo(-0.6, 0.22, -0.92, 0.3);
  tail.quadraticCurveTo(-0.55, 0.15, -0.3, 0.06);
  tail.quadraticCurveTo(-0.24, 0, -0.3, -0.06);
  tail.quadraticCurveTo(-0.55, -0.15, -0.92, -0.3);
  tail.quadraticCurveTo(-0.6, -0.22, -0.28, -0.13);
  tail.lineTo(0.02, -0.05);

  const armGeo = flat(arm);
  const handGeo = flat(hand);
  const wings = [1, -1].map((side) => {
    const root = new Group();
    root.scale.z = side; // the left wing is the right one mirrored, so one pose drives both
    const shoulder = new Group();
    shoulder.position.set(0.06, 0.04, 0.05);
    const wrist = new Group();
    wrist.position.set(0, 0, 0.5);
    wrist.add(new Mesh(handGeo, feathers));
    shoulder.add(new Mesh(armGeo, feathers), wrist);
    root.add(shoulder);
    bird.add(root);
    return { shoulder, wrist };
  });

  const tailPivot = new Group();
  tailPivot.position.set(-0.4, 0, 0);
  tailPivot.add(new Mesh(flat(tail), feathers));
  bird.add(tailPivot);

  return { bird, wings, tail: tailPivot };
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

  const flight = new Group();
  flight.rotation.z = 0.12; // the flight line climbs gently to the right
  scene.add(flight);

  const feathers = new MeshBasicMaterial({ side: DoubleSide });
  // The body is painted by position: navy back, white belly, and the barn swallow's
  // brick-red brow and throat, the one place the site's accent colour appears.
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
        vec3 c = mix(belly, back, edge(up + 0.2));
        vec3 throat = (vPos - vec3(0.35, -0.03, 0.0)) / vec3(0.11, 0.07, 0.08);
        c = mix(c, face, edge(1.0 - dot(throat, throat)) * edge(0.35 - up));
        vec3 brow = (vPos - vec3(0.445, 0.02, 0.0)) / vec3(0.03, 0.035, 0.045);
        c = mix(c, face, edge(1.0 - dot(brow, brow)));
        c = mix(c, back, edge(vPos.x - 0.47)); // beak
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const { bird, wings, tail } = buildSwallow(feathers, plumage);
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
  const face = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), ELEVATION); // turn each streak toward the camera
  const m4 = new Matrix4();
  const v = new Vector3();
  const sc = new Vector3();

  function placeStreaks(dt: number, gust: number) {
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
  let alt = 0; // height above the cruising line
  let vy = 0;
  let flapAt = -10;
  let beats = 0;
  let floor = -0.2; // how far a glide sinks before the next burst of strokes
  let gustAt = -10;
  let gustLen = 2;
  let nextGust = lerp(4, 8, Math.random());

  function pose(beat: number, gust: number) {
    const on = beat >= 0;
    const env = on ? Math.min(1, beat / 0.3, (beats - beat) / 0.3) : 0;
    const phase = 2 * Math.PI * beat;
    const stroke = on ? Math.sin(phase) : 0; // starts and ends each beat in the glide pose
    wings.forEach((w, i) => {
      const flutter = (0.025 + 0.07 * gust) * (0.6 * Math.sin(t * 29 + i) + 0.4 * Math.sin(t * 43 + 2 * i));
      w.shoulder.rotation.x = -(0.1 + 0.52 * stroke);
      w.wrist.rotation.x = -0.45 * Math.sin(phase - 0.9) * env - flutter; // the hand lags, like a whip
      w.wrist.rotation.y = -0.35 * Math.max(0, Math.cos(phase)) * env; // and folds back on the upstroke
    });
    const flutter = (0.03 + 0.08 * gust) * Math.sin(t * 37);
    tail.scale.z = 1 + 0.1 * Math.sin(t * 0.7) + flutter;
    tail.rotation.x = flutter * 1.5;
    tail.rotation.z = -vy * 0.8;
    bird.position.set(0.1 * Math.sin(t * 0.31) - 0.22 * gust, alt + 0.1 * gust, 0.06 * Math.sin(t * 0.23));
    bird.rotation.z = 0.08 + vy * 0.7; // nose up in the climb, down in the glide
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

    if (t - flapAt > beats * BEAT && alt < floor) {
      flapAt = t; // sunk far enough: a few strokes to climb back
      beats = 2 + Math.floor(Math.random() * 3);
      floor = lerp(-0.26, -0.12, Math.random());
    }
    const beat = (t - flapAt) / BEAT;
    const flapping = beat >= 0 && beat < beats;
    vy += ((flapping ? 0.3 : -0.065) - vy) * (1 - Math.exp(-dt * 2.5));
    alt += vy * dt;

    pose(flapping ? beat : -1, gust);
    placeStreaks(dt, gust);
  }

  pose(-1, 0);
  placeStreaks(0, 0);

  let visible = false;
  let dirty = true;
  let raf = 0;
  let last = 0;
  function frame(now: number) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) step(dt);
    if (!reduced || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    raf = requestAnimationFrame(frame);
  }

  function applyTheme() {
    const cs = getComputedStyle(document.documentElement);
    const css = (name: string) => cs.getPropertyValue(name).trim();
    feathers.color.set(css('--swallow-back'));
    plumage.uniforms.back.value.set(css('--swallow-back'));
    plumage.uniforms.belly.value.set(css('--swallow-belly'));
    plumage.uniforms.face.value.set(css('--swallow-face'));
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
