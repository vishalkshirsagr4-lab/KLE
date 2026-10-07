/* KLE Hackathon 2K26 - cinematic 3D scene (three.js + GSAP).
   Chrome-metal extruded title, gold trophy, holographic screens, circuit boards, energy rings,
   volumetric shafts, bloom, scroll-driven camera, mouse parallax, hover + warp transitions. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import * as U from './k3d-util.js';

const root = document.documentElement;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

const mobile = innerWidth < 820 || matchMedia('(pointer:coarse)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q = { dpr: Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2), particles: mobile ? 3800 : 9000, bokeh: mobile ? 40 : 110, shadows: !mobile, msaa: mobile ? 0 : 4, bloom: mobile ? 0.7 : 0.95, curve: mobile ? 6 : 10 };
const FLOOR = -3.4, FOV = 40, TH = Math.tan((FOV * Math.PI) / 360);

function setBoot(p) { const e = $('#bootp'); if (e) e.textContent = Math.round(p) + '%'; }
function endBoot() { root.classList.add('ready'); const b = $('#boot'); if (b) { b.classList.add('done'); setTimeout(() => b.remove(), 900); } }
function failGL(why) { console.warn('[kle3d] 3D disabled:', why); root.classList.add('no-gl'); root.classList.remove('gl-on'); endBoot(); }

function loadFont(urls) {
  return new Promise((res, rej) => {
    const l = new FontLoader();
    const next = (i) => { if (i >= urls.length) return rej(new Error('font')); l.load(urls[i], res, undefined, () => next(i + 1)); };
    next(0);
  });
}

async function main() {
  const canvas = $('#gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { return failGL(e); }
  if (!renderer.capabilities.isWebGL2) return failGL('webgl2 required');
  root.classList.add('gl-on'); setBoot(8);
  renderer.setPixelRatio(Q.dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = Q.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x02040c, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040a1c, 0.0125);
  scene.environment = U.buildEnv(renderer); scene.environmentIntensity = 1.0;
  const cam = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 700);
  scene.add(cam);
  setBoot(22);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0x6f9bff, 0x080c20, 0.35));
  const key = new THREE.SpotLight(0xcfe3ff, 1500, 0, 0.55, 0.9, 2);
  key.position.set(-6, 19, 11); key.target.position.set(0, 0, 0); scene.add(key, key.target);
  if (Q.shadows) { key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 5; key.shadow.camera.near = 8; key.shadow.camera.far = 60; }
  const rimA = new THREE.PointLight(0x2ee9ff, 260, 46, 2), rimB = new THREE.PointLight(0xffb84a, 300, 46, 2), mouseLight = new THREE.PointLight(0x7aa8ff, 220, 30, 2);
  rimA.position.set(-13, 3, -4); rimB.position.set(13, 4, 3); scene.add(rimA, rimB, mouseLight);

  /* ---------- sky + floor + particles ---------- */
  const sky = U.skyDome(mobile); scene.add(sky);
  const { base, glow } = U.circuitCanvases(1024, 21, 1);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: U.canvasTex(base, renderer, [20, 45]), emissiveMap: U.canvasTex(glow, renderer, [20, 45]), emissive: 0xffffff, emissiveIntensity: 0.85,
    metalness: 0.85, roughness: 0.3, transparent: true, opacity: 0.9, envMapIntensity: 1.2
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 360), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, -150); floor.receiveShadow = true; scene.add(floor);

  const box = { x: 46, y: 34, z0: 30, z1: -300 };
  const dust = U.particleField(Q.particles, box, Q.dpr, { size: 2.4, seed: 5 }); scene.add(dust);
  const bokeh = U.particleField(Q.bokeh, box, Q.dpr, { size: 12, alpha: 0.28, bokeh: true, seed: 8 }); scene.add(bokeh);
  setBoot(35);

  /* ---------- layout helpers ---------- */
  let aspect = innerWidth / innerHeight, portrait = aspect < 0.85, LAT = 1;
  const lateral = [];               // objects whose x shrinks on narrow screens
  const anim = [];                  // per-frame callbacks (t, dt)
  const stationGroups = [];         // { g, z } for culling
  function place(o, x, y, z, lat = true) { o.position.set(x, y, z); if (lat) lateral.push({ o, x }); return o; }
  function station(z) { const g = new THREE.Group(); scene.add(g); stationGroups.push({ g, z }); return g; }
  const rnd = U.rng(77);

  /* ---------- HERO: text ---------- */
  let font = null;
  try { font = await loadFont(window.KLE_ASSETS.font); } catch (e) { console.warn('[kle3d] font failed, using DOM title'); }
  setBoot(55);

  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xc9d6ee, metalness: 1, roughness: 0.17, envMapIntensity: 1.8, clearcoat: 0.6, clearcoatRoughness: 0.08 });
  const edgeBlue = new THREE.MeshPhysicalMaterial({ color: 0x0a1a3f, metalness: 0.9, roughness: 0.3, emissive: 0x1d6bff, emissiveIntensity: 1.4, envMapIntensity: 1 });
  const goldFace = new THREE.MeshPhysicalMaterial({ color: 0xffc247, metalness: 1, roughness: 0.15, envMapIntensity: 2.1, clearcoat: 0.5, clearcoatRoughness: 0.08 });
  const edgeGold = new THREE.MeshPhysicalMaterial({ color: 0x3a1a00, metalness: 0.9, roughness: 0.3, emissive: 0xff8a1a, emissiveIntensity: 1.5, envMapIntensity: 1 });

  const heroText = new THREE.Group(); scene.add(heroText);
  const lines = {}; const letters = [];
  function makeLine(str, mats, name) {
    const grp = new THREE.Group(), size = 1, sc = size / font.data.resolution; let x = 0; const ls = [];
    for (const ch of str) {
      const gl = font.data.glyphs[ch]; if (!gl) continue;
      if (gl.o) {
        const geo = new TextGeometry(ch, { font, size, depth: 0.34, curveSegments: Q.curve, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.018, bevelOffset: 0, bevelSegments: 4 });
        geo.computeBoundingBox(); const bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, cz = (bb.min.z + bb.max.z) / 2;
        geo.translate(-cx, -cy, -cz);
        const m = new THREE.Mesh(geo, mats); m.castShadow = true;
        m.userData = { hx: x + cx, hy: cy, i: letters.length, pop: 0, hov: 0 }; m.position.set(m.userData.hx, cy, 0);
        grp.add(m); ls.push(m); letters.push(m);
      }
      x += gl.ha * sc;
    }
    const w = x; ls.forEach((m) => { m.userData.hx -= w / 2; m.position.x = m.userData.hx; });
    grp.userData = { w, ls, name }; heroText.add(grp); lines[name] = grp; return grp;
  }
  if (font) {
    makeLine('HACKATHON', [chrome, edgeBlue], 'L1'); makeLine('2K26', [goldFace, edgeGold], 'L2');
    makeLine('HACK', [chrome, edgeBlue], 'P1'); makeLine('ATHON', [chrome, edgeBlue], 'P2'); makeLine('2K26', [goldFace, edgeGold], 'P3');
    root.classList.add('gl-text');
  }
  setBoot(70);

  /* ---------- HERO: trophy + rings + projector ---------- */
  const trophy = U.makeTrophy(); scene.add(trophy);
  const trophyHalo = new THREE.Group(); scene.add(trophyHalo);
  [[2.3, 0.02, U.PAL.cyan, 0.18, 0.4, 3], [2.85, 0.016, U.PAL.gold, -0.14, -0.5, 2], [3.4, 0.014, U.PAL.violet, 0.1, 0.9, 2]].forEach(([r, t, c, sp, tilt, segs]) => {
    const ring = U.energyRing(r, t, c, { speed: sp, segs, gain: 2.6 }); ring.rotation.set(Math.PI / 2 + tilt * 0.35, 0, tilt); trophyHalo.add(ring);
  });
  const projector = U.projectorDisc(1, U.PAL.cyan); scene.add(projector);
  const trophyBeam = U.lightShaft(1, 1, U.PAL.cyan, 0.5); scene.add(trophyBeam);
  const goldBeam = U.lightShaft(3.2, 20, 0xffb84a, 0.35); scene.add(goldBeam);
  const heroPoint = new THREE.PointLight(0xffd27a, 180, 20, 2); scene.add(heroPoint);

  /* mirror reflections on the glossy floor */
  const mirror = new THREE.Group(); mirror.scale.y = -1; mirror.position.y = 2 * FLOOR; scene.add(mirror);
  const mirrorPairs = [];
  function addMirror(src) { const c = new THREE.Mesh(src.geometry, src.material); c.matrixAutoUpdate = false; c.frustumCulled = false; mirror.add(c); mirrorPairs.push([src, c]); }
  letters.forEach(addMirror);
  trophy.traverse((o) => { if (o.isMesh) addMirror(o); });
  function visibleInTree(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

  /* hero extras: screens, boards, glass, sculptures */
  const hero = station(0);
  const screens = [];
  function screen(g, w, h, kind, acc, x, y, z, ry, seed) { const s = U.holoScreen(w, h, kind, acc, seed); s.group.rotation.y = ry; place(s.group, x, y, z); g.add(s.group); screens.push({ s, z, baseY: y, ph: rnd() * 6 }); return s; }
  screen(hero, 5.2, 3.3, 'code', U.PAL.cyan, -9.5, 7.4, -9, 0.35, 1);
  screen(hero, 4.6, 2.9, 'graph', U.PAL.gold, 6.5, 8.6, -12, -0.3, 2);
  screen(hero, 3.6, 3.6, 'radar', U.PAL.violet, -13.5, 1, -6, 0.6, 3);
  const hb = U.circuitBoard(7, 5, renderer, 4); hb.rotation.set(0.5, 0.6, 0.15); place(hb, -12.5, -0.5, -12); hero.add(hb);
  anim.push((t) => { hb.rotation.y = 0.6 + Math.sin(t * 0.25) * 0.25; hb.position.y = -0.5 + Math.sin(t * 0.6) * 0.3; });
  const gp1 = U.glassPanel(3.4, 2.2); place(gp1, 12.5, 7.4, -3); gp1.rotation.set(0.1, -0.45, 0.05); hero.add(gp1);
  const gp2 = U.glassPanel(2.4, 3.4, U.PAL.violet); place(gp2, -6.5, -1.4, 6); gp2.rotation.set(-0.1, 0.5, 0.08); hero.add(gp2);
  const ico = U.wire(new THREE.IcosahedronGeometry(2.3, 1), U.PAL.cyan, 0.7); place(ico, 12.8, 0.5, -9); hero.add(ico);
  const icoCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(U.PAL.blue).multiplyScalar(3), toneMapped: false })); ico.add(icoCore);
  anim.push((t) => { ico.rotation.set(t * 0.12, t * 0.17, 0); icoCore.scale.setScalar(1 + Math.sin(t * 2.4) * 0.15); });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.1, 0.3, 160, 18), new THREE.MeshPhysicalMaterial({ color: 0xdfe9ff, metalness: 1, roughness: 0.08, envMapIntensity: 2.2, clearcoat: 1 }));
  knot.castShadow = true; place(knot, -12.5, 5.2, 0); hero.add(knot); anim.push((t) => { knot.rotation.set(t * 0.2, t * 0.3, 0); });

  /* ---------- ABOUT (z ~ -45) ---------- */
  const about = station(-48);
  screen(about, 6, 3.8, 'code', U.PAL.cyan, -12.5, 3.2, -42, 0.5, 4);
  screen(about, 5.2, 3.3, 'graph', U.PAL.blue, 12.5, 3.6, -42, -0.5, 5);
  screen(about, 4.4, 2.8, 'hex', U.PAL.violet, -8.5, 8.4, -50, 0.3, 6);
  screen(about, 3.6, 3.6, 'radar', U.PAL.gold, 8.5, 8.8, -50, -0.3, 7);
  screen(about, 7, 4.2, 'code', U.PAL.cyan, 0, 12.8, -60, 0, 8);
  const ab = U.circuitBoard(15, 9.5, renderer, 9); ab.rotation.set(0.35, 0, 0); place(ab, 0, 0, -62, false); about.add(ab);
  anim.push((t) => { ab.rotation.y = Math.sin(t * 0.15) * 0.3; ab.position.y = Math.sin(t * 0.5) * 0.4; });
  [[-17, 0, -36, 0.4], [16.5, 1.5, -36, -0.4], [-4, 6, -34, 0.1]].forEach(([x, y, z, ry], i) => { const p = U.glassPanel(3 + (i % 2), 2 + i * 0.4, i === 1 ? U.PAL.violet : U.PAL.cyan); p.rotation.y = ry; place(p, x, y, z); about.add(p); anim.push((t) => { p.position.y = y + Math.sin(t * 0.7 + i) * 0.3; }); });

  function tower(h, n) {
    const g = new THREE.Group(), geo = new THREE.BoxGeometry(2.4, (h / n) * 0.8, 2.4);
    const body = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x0b1432, metalness: 1, roughness: 0.2, envMapIntensity: 1.6 }), n);
    const seam = new THREE.InstancedMesh(new THREE.BoxGeometry(2.46, 0.05, 2.46), new THREE.MeshBasicMaterial({ color: new THREE.Color(U.PAL.cyan).multiplyScalar(2.6), toneMapped: false }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) { const k = 1 - (i / n) * 0.55; q.setFromEuler(e.set(0, i * 0.16, 0)); p.set(0, i * (h / n), 0); s.set(k, 1, k); m4.compose(p, q, s); body.setMatrixAt(i, m4); p.y += (h / n) * 0.43; seam.setMatrixAt(i, m4.compose(p, q, s)); }
    g.add(body, seam); anim.push((t) => { g.rotation.y = t * 0.08; }); return g;
  }
  const tw1 = tower(15, 22); place(tw1, 19, FLOOR, -52); about.add(tw1);

  /* ---------- DOMAINS tunnel (z ~ -62..-92) ---------- */
  const dom = station(-78);
  const tunnel = [];
  for (let i = 0; i < 5; i++) {
    const r = U.energyRing(7.2 + (i % 2) * 0.5, 0.07, [U.PAL.cyan, U.PAL.violet, U.PAL.blue, U.PAL.gold, U.PAL.cyan][i], { speed: 0.12 + i * 0.03, segs: 2 + (i % 2), gain: 2.8 });
    r.position.set(0, 1.5, -64 - i * 6.5); dom.add(r); tunnel.push(r);
  }
  anim.push((t) => tunnel.forEach((r, i) => { r.rotation.z = t * (i % 2 ? -0.1 : 0.12); }));
  const tw2 = tower(18, 24); place(tw2, -15, FLOOR, -76); dom.add(tw2);
  const tw3 = tower(13, 20); place(tw3, 15, FLOOR, -88); dom.add(tw3);
  [[-11, 5.5, -70], [11.5, 6, -82]].forEach(([x, y, z], i) => {
    const k = new THREE.Mesh(new THREE.TorusKnotGeometry(1.2, 0.34, 160, 18, 2 + i, 3), new THREE.MeshPhysicalMaterial({ color: i ? 0xffc247 : 0xdfe9ff, metalness: 1, roughness: 0.1, envMapIntensity: 2.2, clearcoat: 1 }));
    place(k, x, y, z); dom.add(k); anim.push((t) => { k.rotation.set(t * 0.2 + i, t * 0.27, 0); k.position.y = y + Math.sin(t * 0.6 + i) * 0.4; });
  });
  const ico2 = U.wire(new THREE.DodecahedronGeometry(2.6, 0), U.PAL.violet, 0.75); place(ico2, 0, 11, -86, false); dom.add(ico2); anim.push((t) => { ico2.rotation.set(t * 0.1, t * 0.15, 0); });
  const shaftD = U.lightShaft(4, 22, U.PAL.violet, 0.4); shaftD.position.set(-10, 8, -66); dom.add(shaftD); lateral.push({ o: shaftD, x: -10 });

  /* ---------- TIMELINE (z ~ -100..-135) ---------- */
  const tlG = station(-118);
  const curve = new THREE.CatmullRomCurve3([[-6, -0.5, -98], [5, 2.2, -107], [-5, 0.2, -116], [6, 3, -125], [0, 1, -135]].map((a) => new THREE.Vector3(...a)));
  tlG.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.07, 8, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(U.PAL.cyan).multiplyScalar(2.4), toneMapped: false })));
  [0.2, 0.5, 0.82].forEach((tt, i) => {
    const p = curve.getPoint(tt), o = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(U.PAL.gold).multiplyScalar(3), toneMapped: false }));
    o.position.copy(p); tlG.add(o);
    const r = U.energyRing(1.3, 0.03, U.PAL.gold, { speed: 0.3, segs: 2, gain: 3 }); r.position.copy(p); tlG.add(r);
    anim.push((t) => { o.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.12); r.rotation.set(t * 0.5 + i, t * 0.4, 0); });
  });
  screen(tlG, 4.6, 2.9, 'graph', U.PAL.cyan, -13, 4, -108, 0.5, 10);
  screen(tlG, 4.2, 2.7, 'hex', U.PAL.violet, 13, 5, -120, -0.5, 11);
  const tb = U.circuitBoard(9, 6, renderer, 12); tb.rotation.x = 0.4; place(tb, 12, -0.6, -104); tlG.add(tb); anim.push((t) => { tb.rotation.y = t * 0.12; });
  const ico3 = U.wire(new THREE.IcosahedronGeometry(2, 1), U.PAL.gold, 0.7); place(ico3, -12, 3.5, -126); tlG.add(ico3); anim.push((t) => { ico3.rotation.set(t * 0.14, t * 0.1, 0); });
  const gp3 = U.glassPanel(3.2, 4.4, U.PAL.gold); place(gp3, -15, 1.5, -112); gp3.rotation.y = 0.5; tlG.add(gp3);

  /* ---------- REGISTER portal (z ~ -172) ---------- */
  const reg = station(-172);
  const portal = new THREE.Group(); portal.position.set(0, 2.4, -172); reg.add(portal);
  const PX = 5.5; lateral.push({ o: portal, x: PX });
  portal.position.x = PX;
  const disc = U.portalDisc(4.4); portal.add(disc);
  const pr = [[7.2, 0.14, U.PAL.cyan, 0.1], [6.0, 0.1, U.PAL.violet, -0.14], [5.0, 0.08, U.PAL.gold, 0.2], [4.6, 0.05, U.PAL.blue, -0.3]].map(([r, t, c, sp], i) => { const m = U.energyRing(r, t, c, { speed: sp, segs: 2 + (i % 2), gain: 3 }); portal.add(m); return m; });
  anim.push((t) => pr.forEach((r, i) => { r.rotation.z = t * (i % 2 ? -0.18 : 0.14) * (1 + this_.portal * 1.5); }));
  const frameLines = U.wire(new THREE.RingGeometry(7.8, 8.2, 6, 1), U.PAL.cyan, 0.55); portal.add(frameLines); anim.push((t) => { frameLines.rotation.z = -t * 0.05; });
  const shaftR = U.lightShaft(5, 20, U.PAL.blue, 0.45); shaftR.position.set(0, 11, 0); portal.add(shaftR);
  const hit = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.portal = true; portal.add(hit);
  function uiPanel(title, rows, accent, w = 3.4, h = 2.4) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext('2d');
    x.fillStyle = 'rgba(3,12,32,.8)'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = U.rgba(accent, 0.9); x.lineWidth = 3; x.strokeRect(2, 2, c.width - 4, c.height - 4);
    x.fillStyle = U.rgba(accent, 1); x.font = '700 26px "Chakra Petch",sans-serif'; x.fillText(title, 24, 46);
    rows.forEach((r, i) => { const y = 78 + i * 52; x.strokeStyle = 'rgba(140,180,255,.5)'; x.lineWidth = 1.5; x.strokeRect(24, y, c.width - 48, 36); x.fillStyle = 'rgba(190,210,255,.8)'; x.font = '16px ui-monospace,Menlo,monospace'; x.fillText(r, 36, y + 24); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color(1.4, 1.4, 1.4) })));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), new THREE.LineBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.2) }))); return g;
  }
  [[-9.5, 3, -2, 0.6, 'TEAM', ['Team name', 'Members (2-4)', 'College: KLE BCA'], U.PAL.cyan], [9.5, 3.4, -2, -0.6, 'DOMAIN', ['AI/ML', 'Healthcare', 'Open Innovation'], U.PAL.gold], [-8.5, -2.2, 1.5, 0.5, 'PROBLEM', ['Problem statement', 'Tech stack', 'Prototype link'], U.PAL.violet], [8.8, -2.4, 1.5, -0.5, 'SUBMIT', ['Verify email (OTP)', 'Track approval', 'Get confirmation'], U.PAL.blue]].forEach(([x, y, z, ry, title, rows, acc], i) => {
    const p = uiPanel(title, rows, acc); p.position.set(x, y, z); p.rotation.y = ry; portal.add(p); anim.push((t) => { p.position.y = y + Math.sin(t * 0.8 + i * 1.3) * 0.25; });
  });

  /* ---------- PORTALS (z ~ -196) ---------- */
  const pt = station(-196);
  [[-12.5, 0.5], [12.5, -0.5]].forEach(([x, ry], i) => {
    const m = U.glassPanel(4.2, 10.5, i ? U.PAL.violet : U.PAL.cyan); m.rotation.y = ry; place(m, x, 2, -196); pt.add(m);
    const sc = U.holoScreen(3.4, 3.4, i ? 'hex' : 'radar', i ? U.PAL.violet : U.PAL.cyan, 20 + i); sc.group.position.set(0, 1.5, 0.12); m.add(sc.group); screens.push({ s: sc, z: -196, baseY: null, ph: 0 });
    const rr = U.energyRing(1.4, 0.03, i ? U.PAL.violet : U.PAL.cyan, { speed: 0.3, gain: 3 }); rr.position.set(0, -2.8, 0.2); m.add(rr); anim.push((t) => { rr.rotation.z = t * 0.6; m.position.y = 2 + Math.sin(t * 0.6 + i * 2) * 0.35; });
  });
  const pb = U.circuitBoard(12, 8, renderer, 15); pb.rotation.x = 0.3; place(pb, 0, 1.5, -208, false); pt.add(pb); anim.push((t) => { pb.rotation.y = t * 0.1; });

  /* ---------- CONTACT: data city (z ~ -230) ---------- */
  const ct = station(-235);
  {
    const N = mobile ? 60 : 130, bodyG = new THREE.BoxGeometry(1, 1, 1);
    const bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshPhysicalMaterial({ color: 0x08102a, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.4 }), N);
    const caps = new THREE.InstancedMesh(bodyG, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N);
    const m4 = new THREE.Matrix4(), c = new THREE.Color(), pal = [U.PAL.cyan, U.PAL.blue, U.PAL.violet, U.PAL.gold];
    for (let i = 0; i < N; i++) {
      const side = rnd() < 0.5 ? -1 : 1, x = side * (9 + rnd() * 26), z = -205 - rnd() * 70, w = 1.2 + rnd() * 2.6, h = 2 + rnd() * rnd() * 22;
      m4.makeScale(w, h, w).setPosition(x, FLOOR + h / 2, z); bodies.setMatrixAt(i, m4);
      m4.makeScale(w * 0.96, 0.12, w * 0.96).setPosition(x, FLOOR + h + 0.05, z); caps.setMatrixAt(i, m4);
      c.set(pal[(rnd() * 4) | 0]).multiplyScalar(2.8); caps.setColorAt(i, c);
    }
    ct.add(bodies, caps);
  }
  screen(ct, 6, 3.8, 'graph', U.PAL.cyan, -10, 5, -224, 0.45, 30);
  screen(ct, 5, 3.2, 'code', U.PAL.gold, 10, 6, -230, -0.45, 31);
  const sh2 = U.lightShaft(4, 24, U.PAL.cyan, 0.4); place(sh2, 12, 9, -226); ct.add(sh2);

  /* ---------- FOOTER finale: gold horizon sun (z ~ -300) ---------- */
  const fin = station(-290);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 96), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uTime: U.uTime },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float a=smoothstep(1.,0.,r);vec3 c=mix(vec3(1.,.55,.15),vec3(1.,.85,.4),smoothstep(.7,0.,r));gl_FragColor=vec4(c*a*a*1.6,a*a);}'
  }));
  sun.position.set(0, 7, -300); fin.add(sun);
  [[22, 0.18, U.PAL.gold, 0.05], [28, 0.12, U.PAL.cyan, -0.04], [34, 0.1, U.PAL.violet, 0.03]].forEach(([r, t, c, sp], i) => { const m = U.energyRing(r, t, c, { speed: sp, segs: 3, gain: 3 }); m.position.set(0, 7, -300 - i * 3); fin.add(m); anim.push((tt) => { m.rotation.z = tt * 0.03 * (i % 2 ? -1 : 1); }); });
  setBoot(82);

  /* ---------- post processing ---------- */
  const rt = new THREE.WebGLRenderTarget(innerWidth * Q.dpr, innerHeight * Q.dpr, { type: THREE.HalfFloatType, samples: Q.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / (mobile ? 2 : 1), innerHeight / (mobile ? 2 : 1)), Q.bloom, 0.7, 0.82);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  const finalPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: U.uTime, uWarp: { value: 0 }, uFlash: { value: 0 }, uAberr: { value: 1 }, uGrain: { value: 0.035 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uWarp,uFlash,uAberr,uGrain;uniform vec2 uRes;varying vec2 vUv;
      float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      void main(){vec2 c=vUv-.5;float d=dot(c,c);vec2 dir=normalize(c+1e-5);float ab=uAberr*(.0012+d*.01)+uWarp*.012;vec3 col;
       if(uWarp>.01){col=vec3(0.);for(int i=0;i<8;i++){float k=float(i)/7.;vec2 uv=vUv-c*uWarp*.16*k;col.r+=texture2D(tDiffuse,uv+dir*ab).r;col.g+=texture2D(tDiffuse,uv).g;col.b+=texture2D(tDiffuse,uv-dir*ab).b;}col/=8.;}
       else{col=vec3(texture2D(tDiffuse,vUv+dir*ab).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-dir*ab).b);}
       col*=1.-smoothstep(.22,.9,length(c)*1.25)*.5;col*=vec3(.97,1.,1.04);
       col+=(h21(vUv*uRes+fract(uTime))-.5)*uGrain;col+=uFlash*vec3(.55,.85,1.);gl_FragColor=vec4(col,1.);}`
  });
  finalPass.uniforms.uTime = U.uTime; // ShaderPass clones uniforms; re-link the shared clock
  composer.addPass(finalPass);

  /* ---------- state: scroll, mouse, camera path ---------- */
  const secIds = ['hero', 'about', 'domains', 'timeline', 'register', 'portals', 'contact'];
  let anchors = [0], uS = 0, scrollVel = 0, lastY = scrollY;
  function computeAnchors() {
    anchors = secIds.map((id) => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top + scrollY : 0; });
    const f = document.querySelector('footer'); anchors.push(f ? f.getBoundingClientRect().top + scrollY : document.documentElement.scrollHeight);
    for (let i = 1; i < anchors.length; i++) if (anchors[i] <= anchors[i - 1]) anchors[i] = anchors[i - 1] + 1;
  }
  function scrollToU(y) {
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }

  let camCurve, lookCurve, ctrlIdx = [];
  const heroInfo = { D: 20, ty: 0 };
  function buildPath() {
    const th = TH, asp = aspect; let key0;
    if (!portrait) {
      const D = Math.max(12.6 / (th * asp), 7.4 / th), hH = D * th, ay = 2.6, ax = -0.3, ndcY = 0.28;
      key0 = { p: [ax, ay - ndcY * hH, D], l: [ax, ay - ndcY * hH, D - 10] };
    } else {
      const D = Math.max(7.2 / (th * asp), 8.2 / th), hH = D * th, ay = 4.8, ndcY = 0.25;
      key0 = { p: [0, ay - ndcY * hH, D], l: [0, ay - ndcY * hH, D - 10] };
    }
    const L = LAT, px = PX * L;
    const K = [
      { s: 0, ...key0 },
      { v: 1, p: [2 * L, 10.5, 3], l: [0, 4, -20] },
      { s: 1, p: [0, 2.6, -28], l: [0, 3.5, -48] },
      { s: 2, p: [0, 1.8, -56], l: [0, 1.8, -86] },
      { s: 3, p: [0, 1.2, -98], l: [0, 1.5, -126] },
      { s: 4, p: [0, 2.2, -148], l: [px * 0.35, 2.3, -172] },
      { v: 1, p: [px, 2.4, -171], l: [px, 2.4, -190] },
      { s: 5, p: [0, 2, -184], l: [0, 2.5, -204] },
      { s: 6, p: [0, 2.4, -208], l: [0, 2.8, -240] },
      { s: 7, p: [0, 5, -238], l: [0, 6.5, -300] }
    ];
    // the register station sits before the portal fly-through; keep stations strictly ordered
    ctrlIdx = []; K.forEach((k, i) => { if (k.s !== undefined) ctrlIdx[k.s] = i; });
    camCurve = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.p)));
    lookCurve = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(...k.l)));
    pathN = K.length;
  }
  let pathN = 10;
  const vp = new THREE.Vector3(), vl = new THREE.Vector3(), dirv = new THREE.Vector3();

  const mouse = { x: 0, y: 0, sx: 0, sy: 0, px: 0, py: 0, has: false };
  addEventListener('pointermove', (e) => { mouse.px = e.clientX; mouse.py = e.clientY; mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; mouse.has = true; mouse.moved = true; }, { passive: true });
  addEventListener('deviceorientation', (e) => { if (mobile && e.gamma != null) { mouse.x = clamp(e.gamma / 60, -0.5, 0.5); mouse.y = clamp((e.beta - 45) / 90, -0.5, 0.5); } }, { passive: true });

  /* ---------- layout (resize) ---------- */
  function heroLayout() {
    LAT = portrait ? clamp(aspect / 1.6, 0.32, 1) : 1;
    lateral.forEach((l) => { l.o.position.x = l.x * LAT; });
    const gl = lines; if (!font) return;
    ['L1', 'L2', 'P1', 'P2', 'P3'].forEach((n) => { gl[n].visible = portrait ? n[0] === 'P' : n[0] === 'L'; });
    const setLine = (n, W, x, y) => { const g = gl[n], s = W / g.userData.w; g.scale.setScalar(s); g.position.set(x, y, 0); };
    if (!portrait) { setLine('L1', 13.2, -2.4, 4.7); setLine('L2', 8.6, -2.4, 1.7); }
    else { const s = 12.6 / gl.P2.userData.w; setLine('P1', gl.P1.userData.w * s, 0, 11); setLine('P2', gl.P2.userData.w * s, 0, 7.8); setLine('P3', gl.P3.userData.w * s, 0, 4.6); }
  }
  const T = { x: 8.6, baseY: -1.2, s: 2.6 };
  function trophyLayout() { if (!portrait) { T.x = 8.6; T.baseY = -1.2; T.s = 2.6; } else { T.x = 0; T.baseY = -2.6; T.s = 1.9; } }

  function resize() {
    aspect = innerWidth / innerHeight; portrait = aspect < 0.85;
    renderer.setSize(innerWidth, innerHeight, false); composer.setPixelRatio(Q.dpr); composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth / (mobile ? 2 : 1), innerHeight / (mobile ? 2 : 1));
    finalPass.uniforms.uRes.value.set(innerWidth * Q.dpr, innerHeight * Q.dpr);
    cam.aspect = aspect; cam.updateProjectionMatrix();
    heroLayout(); trophyLayout(); buildPath(); computeAnchors();
  }
  addEventListener('resize', resize);
  if ('ResizeObserver' in window) { let ro = 0; new ResizeObserver(() => { clearTimeout(ro); ro = setTimeout(computeAnchors, 120); }).observe(document.body); }
  addEventListener('load', () => setTimeout(computeAnchors, 300));
  resize();
  addEventListener('scroll', () => { scrollVel = scrollY - lastY; lastY = scrollY; }, { passive: true });
  try { if (window.gsap && window.ScrollTrigger) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { scrollVel = self.getVelocity() / 60; } }); } } catch (e) {}

  /* ---------- interaction: hover / click ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovLetter = null, hoverState = { trophy: 0, portal: 0 }, cursorOn = false;
  const ui = (e) => e && e.closest && e.closest('a,button,input,select,textarea,form,.g,nav,#tick,iframe,.kle-gallery-wrap,.dc');
  function pick(x, y, list) { ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObjects(list, false)[0]; }
  function trophyMeshes() { const a = []; trophy.traverse((o) => { if (o.isMesh) a.push(o); }); return a; }
  const trophyList = trophyMeshes();
  let hoverTarget = null;
  function updateHover(under) {
    let target = null, letter = null;
    if (mouse.has && !under && !mobile) {
      const nearHero = uS < 0.45, nearPortal = Math.abs(uS - 4.5) < 1.1;
      if (nearHero) {
        const vis = letters.filter((m) => visibleInTree(m)); const hl = pick(mouse.px, mouse.py, vis), ht = pick(mouse.px, mouse.py, trophyList);
        if (ht && (!hl || ht.distance < hl.distance)) target = 'trophy'; else if (hl) { target = 'letter'; letter = hl.object; }
      } else if (nearPortal) { if (pick(mouse.px, mouse.py, [hit])) target = 'portal'; }
    }
    hovLetter = letter;
    const th = target === 'trophy' ? 1 : 0, ph = target === 'portal' ? 1 : 0;
    if (th !== hoverState.trophy) { hoverState.trophy = th; window.gsap ? gsap.to(this_, { trophy: th, duration: 0.6, ease: 'power2.out' }) : (this_.trophy = th); }
    if (ph !== hoverState.portal) { hoverState.portal = ph; window.gsap ? gsap.to(this_, { portal: ph, duration: 0.6, ease: 'power2.out' }) : (this_.portal = ph); }
    const cur = target === 'trophy' || target === 'portal';
    if (cur !== cursorOn) { cursorOn = cur; document.body.style.cursor = cur ? 'pointer' : ''; }
    hoverTarget = target;
  }
  const this_ = { trophy: 0, portal: 0 };
  addEventListener('click', (e) => {
    if (ui(e.target) || !hoverTarget) return;
    if (hoverTarget === 'portal') warpTo('portal.html');
    else if (hoverTarget === 'trophy') { try { if (window.boom) window.boom(); } catch (er) {} punch(); }
  });

  /* ---------- warp transition ---------- */
  const W = { v: 0, flash: 0, punch: 0 }; let warping = false;
  function punch() { window.gsap ? gsap.fromTo(W, { punch: 1 }, { punch: 0, duration: 1.2, ease: 'power3.out' }) : (W.punch = 0); }
  function warpTo(url) {
    if (warping) return; warping = true; document.body.classList.add('warping');
    if (window.gsap && !calm) { gsap.to(W, { v: 1, duration: 0.85, ease: 'power2.in', onComplete: () => { location.href = url; } }); gsap.to(W, { flash: 1, duration: 0.35, delay: 0.55, ease: 'power1.in' }); }
    else location.href = url;
  }
  window.kleWarp = warpTo;
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const h = a.getAttribute('href'); if (/^(portal|admin)\.html/.test(h) && !a.target) { e.preventDefault(); warpTo(h); }
  });
  addEventListener('pageshow', (e) => { if (e.persisted) { warping = false; W.v = 0; W.flash = 0; document.body.classList.remove('warping'); } });

  /* ---------- render loop ---------- */
  const clock = new THREE.Clock(); let t = 0, frame = 0, slow = 0, tInt = 0, lastU = -1;
  const introLen = calm ? 0 : 4.2; let introT = calm ? 99 : 0;
  const colA = new THREE.Color(), colB = new THREE.Color();
  const tints = [U.PAL.cyan, U.PAL.violet, U.PAL.blue, U.PAL.gold, U.PAL.violet, U.PAL.cyan, U.PAL.blue, U.PAL.gold];
  let ready = false;

  function frameFn() {
    requestAnimationFrame(frameFn);
    let dt = Math.min(clock.getDelta(), 0.1); const ts = calm ? 0.25 : 1; t += dt * ts; U.uTime.value = t;
    introT += dt;
    // adaptive resolution
    slow = lerp(slow, dt, 0.05);
    if (frame++ > 90 && slow > 1 / 26 && Q.dpr > 1) { Q.dpr = Math.max(1, Q.dpr - 0.25); renderer.setPixelRatio(Q.dpr); composer.setPixelRatio(Q.dpr); composer.setSize(innerWidth, innerHeight); dust.material.uniforms.uPixel.value = Q.dpr; bokeh.material.uniforms.uPixel.value = Q.dpr; slow = 0; frame = 60; }

    // scroll -> station parameter
    const uT = scrollToU(scrollY); uS += (uT - uS) * (1 - Math.exp(-dt * 4.5));
    const u = clamp(uS, 0, anchors.length - 1), i0 = Math.min(Math.floor(u), anchors.length - 2), f = u - i0;
    const a = ctrlIdx[i0] ?? 0, b = ctrlIdx[i0 + 1] ?? pathN - 1, ci = a + (b - a) * f, tt = clamp(ci / (pathN - 1), 0, 1);
    camCurve.getPoint(tt, vp); lookCurve.getPoint(tt, vl);

    // intro dolly
    const ip = clamp(introT / introLen, 0, 1), ie = ip >= 1 ? 1 : 1 - Math.pow(1 - ip, 3);
    mouse.sx = lerp(mouse.sx, mouse.x, 1 - Math.exp(-dt * 3)); mouse.sy = lerp(mouse.sy, mouse.y, 1 - Math.exp(-dt * 3));
    const par = mobile ? 0.5 : 1;
    vp.x += mouse.sx * 1.6 * par + Math.sin(t * 0.2) * 0.25; vp.y += -mouse.sy * 0.9 * par + Math.sin(t * 0.27) * 0.12;
    vl.x += mouse.sx * 0.9 * par; vl.y += -mouse.sy * 0.5 * par;
    vp.y += (1 - ie) * 3.5; vp.z += (1 - ie) * 13;
    dirv.copy(vl).sub(vp).normalize(); vp.addScaledVector(dirv, W.v * 14);
    cam.position.copy(vp); cam.lookAt(vl);
    cam.rotateZ(-mouse.sx * 0.03 + clamp(scrollVel, -40, 40) * -0.0012);
    const fov = FOV + W.v * 38 + W.punch * 6 + clamp(Math.abs(scrollVel), 0, 60) * 0.06 + (1 - ie) * 8;
    if (Math.abs(fov - cam.fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }

    // station tint / lights
    const ti = Math.min(Math.floor(u), tints.length - 2); colA.set(tints[ti]); colB.set(tints[ti + 1]); rimA.color.copy(colA).lerp(colB, u - ti);
    sky.material.uniforms.uMix.value = 0.5 + 0.5 * Math.sin(u * 0.9);
    mouseLight.position.set(cam.position.x + mouse.sx * 18, cam.position.y - mouse.sy * 9 + 2, cam.position.z - 9);
    // keep rim lights near the camera so every station is lit
    rimA.position.set(cam.position.x - 13, cam.position.y + 2, cam.position.z - 8); rimB.position.set(cam.position.x + 13, cam.position.y + 3, cam.position.z - 6);
    if (u > 0.9) { key.position.set(cam.position.x - 6, 19, cam.position.z - 12); key.target.position.set(cam.position.x, 0, cam.position.z - 30); }
    else { key.position.set(-6, 19, 11); key.target.position.set(0, 0, 0); }
    key.intensity = u > 0.9 ? 700 : 1500;
    sky.position.copy(cam.position);

    // stations culling
    for (const s of stationGroups) s.g.visible = Math.abs(cam.position.z - s.z) < 130 || s.z === 0 && u < 2;
    heroText.visible = u < 1.6; trophy.visible = trophyHalo.visible = projector.visible = trophyBeam.visible = goldBeam.visible = mirror.visible = heroPoint.visible = u < 1.6;

    // hero animation
    if (u < 1.6) {
      if (font) letters.forEach((m) => {
        const d = m.userData, p = easeOutBack(clamp((introT - 0.45 - d.i * 0.08) / 1.2, 0, 1)), hv = (hovLetter === m) ? 1 : 0;
        d.hov = lerp(d.hov, hv, 1 - Math.exp(-dt * 9));
        m.position.set(d.hx, d.hy + (1 - Math.min(p, 1)) * -8 + Math.sin(t * 1.1 + d.i * 0.5) * 0.05 + d.hov * 0.25, d.hov * 0.9);
        m.rotation.set((1 - Math.min(p, 1)) * 1.4, Math.sin(t * 0.5 + d.i) * 0.04 + mouse.sx * 0.12, 0);
        m.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * p) * (1 + d.hov * 0.08));
      });
      const tp = easeOutBack(clamp((introT - 1.2) / 1.6, 0, 1)), ts2 = Math.max(0.001, T.s * tp), hov = this_.trophy;
      trophy.scale.setScalar(ts2); trophy.position.set(T.x * LAT, T.baseY + Math.sin(t * 0.9) * 0.15 + (1 - Math.min(tp, 1)) * -5, 0);
      trophy.rotation.y = Math.sin(t * 0.5) * 0.35 + hov * t * 1.2 + mouse.sx * 0.3;
      const ce = trophy.position.y + 1.15 * ts2;
      trophyHalo.position.set(trophy.position.x, ce, 0); trophyHalo.scale.setScalar(ts2 / 2.6 * (1 + hov * 0.12)); trophyHalo.rotation.y = t * 0.2 * (1 + hov * 3);
      projector.position.set(trophy.position.x, FLOOR + 0.03, 0); projector.scale.setScalar(4.6 * ts2 / 2.6 * (1 + hov * 0.15));
      trophyBeam.scale.set(ts2 / 2.6 * 1.4, ts2 / 2.6 * 9, ts2 / 2.6 * 1.4); trophyBeam.position.set(trophy.position.x, FLOOR + 4.2 * ts2 / 2.6 + 3.2, 0);
      goldBeam.position.set(-7 * LAT, 4.5, -4); goldBeam.rotation.z = 0.28;
      heroPoint.position.set(trophy.position.x - 2, ce + 2, 5); heroPoint.intensity = 180 * (1 + hov * 1.4);
      trophy.userData.emblem.scale.setScalar(1 + Math.sin(t * 3) * 0.04 + hov * 0.1);
      heroText.updateMatrixWorld(true); trophy.updateMatrixWorld(true);
      for (const [src, c] of mirrorPairs) { c.visible = visibleInTree(src); c.matrix.copy(src.matrixWorld); }
    }
    // screens (round-robin redraw, only when near)
    for (const s of screens) if (s.baseY != null && s.s.group.parent) { s.s.group.position.y = s.baseY + Math.sin(t * 0.6 + s.ph) * 0.25; }
    tInt++; for (let k = 0; k < 2; k++) { const s = screens[(tInt * 2 + k) % screens.length]; if (s && Math.abs(cam.position.z - s.z) < 60) s.s.draw(t); }
    for (const fn of anim) fn(t, dt);
    disc.material.uniforms.uHover.value = this_.portal;

    if (mouse.moved || frame % 6 === 0) { mouse.moved = false; const under = ui(document.elementFromPoint ? document.elementFromPoint(mouse.px, mouse.py) : null); updateHover(under); }

    finalPass.uniforms.uWarp.value = W.v; finalPass.uniforms.uFlash.value = W.flash * 0.9;
    bloom.strength = Q.bloom * (1 + (1 - ie) * 1.2 + W.v * 1.6 + W.punch * 0.8);
    renderer.toneMappingExposure = 1.05 + (1 - ie) * 0.8;
    composer.render(dt);
    if (!ready) { ready = true; setBoot(100); setTimeout(endBoot, 250); }
  }
  setBoot(92);
  requestAnimationFrame(frameFn);
  window.KLE3D = { THREE, scene, cam, renderer, composer, bloom, Q, key, lights: { rimA, rimB, mouseLight, heroPoint } };
}

/* ---------- mini trophy for the domain carousel ---------- */
function miniCup() {
  const c = $('#cup3d'); if (!c) return;
  let r; try { r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); } catch (e) { return; }
  r.setClearColor(0x000000, 0); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
  const s = new THREE.Scene(); s.environment = U.buildEnv(r);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 1.5, 7.4); cam.lookAt(0, 1.2, 0);
  const t = U.makeTrophy(); s.add(t);
  s.add(new THREE.HemisphereLight(0x9fc0ff, 0x0a0f25, 0.5));
  const k = new THREE.DirectionalLight(0xfff0d0, 2.2); k.position.set(-3, 5, 5); s.add(k);
  const p1 = new THREE.PointLight(0x2ee9ff, 40, 20, 2); p1.position.set(3, 2, -2); s.add(p1);
  const ring = U.energyRing(1.5, 0.02, U.PAL.cyan, { speed: 0.3, gain: 2.5 }); ring.position.y = 1.1; ring.rotation.x = Math.PI / 2.4; s.add(ring);
  let vis = true; if ('IntersectionObserver' in window) new IntersectionObserver((e) => { vis = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(c);
  const clk = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop); if (!vis) return;
    const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
    if (c.width !== Math.round(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const tm = clk.getElapsedTime(); U.uTime.value = tm;
    t.rotation.y = tm * 0.5; t.position.y = Math.sin(tm * 0.9) * 0.06; ring.rotation.z = tm * 0.4;
    r.render(s, cam);
  })();
}

try { miniCup(); } catch (e) { console.warn('[kle3d] mini trophy failed', e); }
main().catch((e) => { console.error('[kle3d]', e); failGL(e); });
