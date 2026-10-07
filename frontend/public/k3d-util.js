/* Shared 3D helpers: procedural textures, shaders, trophy, holo screens. */
import * as THREE from 'three';

export const uTime = { value: 0 };           // one shared clock for every custom shader
export const PAL = { cyan: 0x2ee9ff, blue: 0x2d6bff, violet: 0x8b5cff, gold: 0xffc247, white: 0xdfe9ff };

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function rgba(hex, a) {
  const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }

/* ---------------- GLSL chunks ---------------- */
export const NOISE = `
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),
            mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.02+vec3(1.7);a*=.5;}return s;}
`;

const RING_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const RING_FS = `uniform float uTime,uSpeed,uSegs,uBase,uGain,uPhase;uniform vec3 uColor;varying vec2 vUv;
void main(){float h=fract(vUv.x*uSegs-uTime*uSpeed+uPhase);float comet=pow(1.-h,5.);
 float k=uBase+(1.-uBase)*comet;float core=.65+.35*sin(vUv.y*6.28318);
 gl_FragColor=vec4(uColor*k*core*uGain,k);}`;

export function energyRing(R, tube, color, o = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: {
      uTime, uColor: { value: new THREE.Color(color) }, uSpeed: { value: o.speed ?? 0.15 }, uSegs: { value: o.segs ?? 2 },
      uBase: { value: o.base ?? 0.25 }, uGain: { value: o.gain ?? 2.2 }, uPhase: { value: o.phase ?? Math.random() * 6 }
    },
    vertexShader: RING_VS, fragmentShader: RING_FS
  });
  return new THREE.Mesh(new THREE.TorusGeometry(R, tube, 10, o.seg || 160), m);
}

/* soft discs (floor projector) */
export function projectorDisc(R, color) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime, uColor: { value: new THREE.Color(color) } },
    vertexShader: RING_VS,
    fragmentShader: `uniform vec3 uColor;uniform float uTime;varying vec2 vUv;
     void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=smoothstep(1.,0.,r);
      float rings=.5+.5*sin(r*34.-uTime*2.4);float edge=smoothstep(.025,0.,abs(r-.97));
      float v=a*(.12+.3*rings)+edge*1.1+smoothstep(.4,0.,r)*.55;
      gl_FragColor=vec4(uColor*v*1.7,clamp(v,0.,1.)*step(r,1.));}`
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(R, 96), m);
  mesh.rotation.x = -Math.PI / 2; return mesh;
}

/* volumetric light shaft (additive cone) */
export function lightShaft(radius, height, color, intensity = 1) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime, uColor: { value: new THREE.Color(color) }, uI: { value: intensity }, uH: { value: height } },
    vertexShader: `varying vec3 vN;varying vec3 vV;varying float vF;varying float vA;uniform float uH;
     void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;
      vF=(position.y+uH*.5)/uH;vA=atan(position.x,position.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 uColor;uniform float uI,uTime;varying vec3 vN;varying vec3 vV;varying float vF;varying float vA;
     void main(){float f=abs(dot(normalize(vN),normalize(vV)));float rays=.65+.35*sin(vA*9.+uTime*.35)*sin(vA*5.-uTime*.2);
      float a=pow(f,1.6)*pow(vF,1.5)*rays*uI;gl_FragColor=vec4(uColor*a,a);}`
  });
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 48, 1, true), m);
  mesh.frustumCulled = false; return mesh;
}

/* registration portal swirl */
export function portalDisc(R) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime, uHover: { value: 0 }, uA: { value: new THREE.Color(PAL.blue) }, uB: { value: new THREE.Color(PAL.violet) }, uC: { value: new THREE.Color(PAL.gold) } },
    vertexShader: RING_VS,
    fragmentShader: NOISE + `uniform float uTime,uHover;uniform vec3 uA,uB,uC;varying vec2 vUv;
     void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float ang=atan(p.y,p.x);
      float sw=ang*3.-log(r+.03)*4.+uTime*1.1;float s=sin(sw)*.5+.5;float n=fbm(vec3(p*2.2,uTime*.25));
      float streak=pow(s,3.)*.8+n*.6;vec3 col=mix(uA,uB,smoothstep(.1,.9,r+n*.3));col=mix(col,uC,pow(1.-r,3.)*.8);
      float edge=smoothstep(1.,.86,r);float core=smoothstep(.55,0.,r);
      float v=(streak*(.3+r*.6)+core*.8)*edge*(.75+uHover*.9);
      gl_FragColor=vec4(col*v*1.6,clamp(v,0.,1.)*.85);}`
  });
  return new THREE.Mesh(new THREE.CircleGeometry(R, 96), m);
}

/* sky dome with drifting nebula */
export function skyDome(mobile) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uTime, uTint: { value: new THREE.Color(PAL.blue) }, uTint2: { value: new THREE.Color(PAL.violet) }, uMix: { value: 0 } },
    vertexShader: `varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*vec4(mat3(modelViewMatrix)*position,1.);p.z=p.w;gl_Position=p;}`,
    fragmentShader: NOISE + `uniform float uTime,uMix;uniform vec3 uTint,uTint2;varying vec3 vD;
     void main(){vec3 d=normalize(vD);float h=d.y;
      vec3 top=vec3(.004,.007,.02);vec3 hor=vec3(.012,.035,.10);
      vec3 c=mix(hor,top,smoothstep(-.05,.7,h));
      float n=${mobile ? 'noise(d*3.+vec3(uTime*.01))' : 'fbm(d*2.6+vec3(uTime*.012,0.,uTime*.008))'};
      vec3 tint=mix(uTint,uTint2,uMix);
      c+=tint*pow(n,2.4)*.55*(1.-abs(h)*.9);
      c+=vec3(.02,.10,.28)*exp(-abs(h)*9.)*.9;
      c*=smoothstep(-.6,.05,h)*.85+.15;
      gl_FragColor=vec4(c,1.);}`
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), m);
  mesh.frustumCulled = false; mesh.renderOrder = -10; return mesh;
}

/* particle field */
export function particleField(count, box, pixel, opt = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), size = new Float32Array(count), col = new Float32Array(count * 3);
  const r = rng(opt.seed || 11), cols = [PAL.cyan, PAL.blue, PAL.violet, PAL.gold, PAL.white, PAL.cyan].map((h) => new THREE.Color(h));
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() + r() - 1) * box.x; pos[i * 3 + 1] = r() * box.y - 4; pos[i * 3 + 2] = box.z0 - r() * (box.z0 - box.z1);
    seed[i] = r(); size[i] = (opt.size || 2.4) * (0.5 + r() * r() * 2.2);
    const c = cols[(r() * cols.length) | 0]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime, uPixel: { value: pixel }, uSpan: { value: box.y }, uAlpha: { value: opt.alpha ?? 1 }, uBokeh: { value: opt.bokeh ? 1 : 0 } },
    vertexShader: `attribute float aSeed;attribute float aSize;attribute vec3 aCol;uniform float uTime,uPixel,uSpan;varying vec3 vCol;varying float vA;
     void main(){vec3 p=position;float sp=.25+aSeed*.7;p.y=mod(p.y+uTime*sp+4.,uSpan)-4.;
      p.x+=sin(uTime*.25+aSeed*40.)*.9;p.z+=cos(uTime*.2+aSeed*23.)*.9;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      float tw=.55+.45*sin(uTime*(1.5+aSeed*3.)+aSeed*60.);
      gl_PointSize=clamp(aSize*uPixel*(34./max(-mv.z,1.)),1.,aSize*uPixel*6.);
      float h=(p.y+4.)/uSpan;vCol=aCol;vA=tw*smoothstep(0.,.08,h)*smoothstep(1.,.85,h);}`,
    fragmentShader: `uniform float uAlpha,uBokeh;varying vec3 vCol;varying float vA;
     void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;
      if(uBokeh>.5){a=smoothstep(.5,.42,d)*(.25+.75*smoothstep(.3,.47,d));}
      gl_FragColor=vec4(vCol*1.9,a*vA*uAlpha);}`
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
}

/* ---------------- circuit textures ---------------- */
export function circuitCanvases(size = 1024, seed = 7, density = 1) {
  const rnd = rng(seed), base = cvs(size), glow = cvs(size), b = base.getContext('2d'), g = glow.getContext('2d');
  b.fillStyle = '#060c20'; b.fillRect(0, 0, size, size);
  const N = 32, cell = size / N;
  b.strokeStyle = 'rgba(70,120,255,.08)'; b.lineWidth = 1;
  for (let i = 0; i <= N; i++) { b.beginPath(); b.moveTo(i * cell, 0); b.lineTo(i * cell, size); b.stroke(); b.beginPath(); b.moveTo(0, i * cell); b.lineTo(size, i * cell); b.stroke(); }
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  const cols = ['#2ee9ff', '#3d7bff', '#8b5cff', '#ffc247'];
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const clamp = (v) => Math.max(0, Math.min(N, v));
  for (let n = 0, T = Math.floor(170 * density); n < T; n++) {
    let x = Math.floor(rnd() * N), y = Math.floor(rnd() * N), d = Math.floor(rnd() * 8);
    const col = cols[rnd() < 0.14 ? 3 : (rnd() * 3) | 0], pts = [[x, y]], segs = 2 + Math.floor(rnd() * 4);
    for (let s = 0; s < segs; s++) {
      const len = 2 + Math.floor(rnd() * 7);
      x = clamp(x + dirs[d][0] * len); y = clamp(y + dirs[d][1] * len); pts.push([x, y]);
      d = (d + (rnd() < 0.5 ? 1 : 7)) % 8;
    }
    for (const [ctx, w, a] of [[b, 2.2, 0.55], [g, 2.6, 0.95]]) {
      ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * cell, p[1] * cell) : ctx.moveTo(p[0] * cell, p[1] * cell))); ctx.stroke();
      const e = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(e[0] * cell, e[1] * cell, 4.5, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  for (let k = 0, K = Math.floor(9 * density); k < K; k++) {
    const w = (2 + Math.floor(rnd() * 3)) * cell, h = (2 + Math.floor(rnd() * 3)) * cell, x = Math.floor(rnd() * (N - 5)) * cell, y = Math.floor(rnd() * (N - 5)) * cell;
    b.fillStyle = '#02050f'; b.fillRect(x, y, w, h); b.strokeStyle = 'rgba(255,194,71,.7)'; b.lineWidth = 2; b.strokeRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,194,71,.8)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
    for (let p = 0; p < w; p += cell / 2) { for (const ctx of [b, g]) { ctx.beginPath(); ctx.moveTo(x + p, y); ctx.lineTo(x + p, y - 8); ctx.moveTo(x + p, y + h); ctx.lineTo(x + p, y + h + 8); ctx.stroke(); } }
  }
  return { base, glow };
}
export function canvasTex(c, renderer, repeat) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = cvs(128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ---------------- holographic screens ---------------- */
const CODE = [
  "import { Team } from '@kle/hackathon'", "// KLE Inter College Hackathon 2K26", "const team = new Team({ size: 4 })",
  "team.domain = 'AI/ML'", "await team.register({ year: 2026 })", "", "function buildPrototype(idea) {",
  "  const mvp = ship(idea, { hours: 36 })", "  if (mvp.works) return judges.demo(mvp)", "  return iterate(mvp)", "}", "",
  "const stack = ['next', 'three', 'node']", "for (const dev of team.members) {", "  dev.commit('make it count')", "}", "export default team"
];
function drawCode(x, w, h, t, acc) {
  const lh = 17, total = CODE.length * lh, off = (t * 16) % total;
  x.font = '12px ui-monospace,Menlo,Consolas,monospace'; x.textBaseline = 'top';
  for (let pass = 0; pass < 2; pass++) {
    CODE.forEach((ln, i) => {
      const y = 44 + i * lh - off + pass * total; if (y < 30 || y > h - 8) return;
      x.fillStyle = 'rgba(120,150,200,.5)'; x.fillText(String(i + 1).padStart(2, '0'), 12, y);
      let cx = 40; ln.split(/('[^']*'|\b(?:import|from|const|let|await|async|function|return|new|if|for|of|export|default)\b|\b\d+\b|\/\/.*)/).forEach((s) => {
        if (!s) return;
        x.fillStyle = /^'/.test(s) ? '#ffc247' : /^(import|from|const|let|await|async|function|return|new|if|for|of|export|default)$/.test(s) ? rgba(acc, 1) : /^\d+$/.test(s) ? '#b79bff' : /^\/\//.test(s) ? 'rgba(130,150,190,.65)' : '#dbe7ff';
        x.fillText(s, cx, y); cx += x.measureText(s).width;
      });
    });
  }
}
function drawGraph(x, w, h, t, acc) {
  x.strokeStyle = 'rgba(120,160,255,.15)'; x.lineWidth = 1;
  for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(14, 40 + i * 38); x.lineTo(w - 14, 40 + i * 38); x.stroke(); }
  const n = 12, bw = (w - 40) / n;
  for (let i = 0; i < n; i++) {
    const v = 0.35 + 0.55 * Math.abs(Math.sin(t * 0.7 + i * 0.6)) * (0.6 + 0.4 * Math.sin(i * 1.7)), bh = v * (h - 100);
    const gr = x.createLinearGradient(0, h - 30 - bh, 0, h - 30); gr.addColorStop(0, rgba(acc, 0.95)); gr.addColorStop(1, rgba(acc, 0.08));
    x.fillStyle = gr; x.fillRect(20 + i * bw, h - 30 - bh, bw - 5, bh);
  }
  x.strokeStyle = '#ffc247'; x.lineWidth = 2; x.beginPath();
  for (let i = 0; i <= 40; i++) { const px = 20 + (i / 40) * (w - 40), py = 90 + 40 * Math.sin(i * 0.3 + t) + 20 * Math.sin(i * 0.11 - t * 0.6); i ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.stroke();
}
function drawHex(x, w, h, t, acc) {
  x.font = '12px ui-monospace,Menlo,Consolas,monospace'; x.textBaseline = 'top';
  const cols = Math.floor((w - 20) / 26), r = rng(Math.floor(t * 6) + 3), r2 = rng(5);
  for (let c = 0; c < cols; c++) {
    const head = ((t * (3 + r2() * 5) + r2() * 30) % 30);
    for (let i = 0; i < 14; i++) {
      const y = 38 + ((head - i + 30) % 30) * 17; if (y > h - 10) continue;
      x.fillStyle = i === 0 ? '#ffffff' : rgba(acc, Math.max(0.05, 0.9 - i * 0.07));
      x.fillText(((r() * 16) | 0).toString(16).toUpperCase() + ((r() * 16) | 0).toString(16).toUpperCase(), 12 + c * 26, y);
    }
  }
}
function drawRadar(x, w, h, t, acc) {
  const cx = w / 2, cy = h / 2 + 12, R = Math.min(w, h) * 0.38;
  x.strokeStyle = rgba(acc, 0.35); x.lineWidth = 1;
  for (let i = 1; i <= 4; i++) { x.beginPath(); x.arc(cx, cy, (R * i) / 4, 0, 6.283); x.stroke(); }
  x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
  const a = t * 1.6; const gr = x.createConicGradient ? x.createConicGradient(a - 1.2, cx, cy) : null;
  if (gr) { gr.addColorStop(0, rgba(acc, 0)); gr.addColorStop(0.19, rgba(acc, 0.55)); gr.addColorStop(0.2, rgba(acc, 0)); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R, 0, 6.283); x.fill(); }
  x.strokeStyle = rgba(acc, 1); x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke();
  const r = rng(9); for (let i = 0; i < 7; i++) { const an = r() * 6.283, d = (0.2 + r() * 0.75) * R, ph = (a - an + 12.566) % 6.283, al = Math.max(0, 1 - ph / 3); x.fillStyle = 'rgba(255,194,71,' + al + ')'; x.beginPath(); x.arc(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 4, 0, 6.283); x.fill(); }
}
const TITLES = { code: 'team.register.js', graph: 'COMMITS / HR', hex: 'SECURE.NODE // 0x2K26', radar: 'IDEA RADAR' };
export function holoScreen(w, h, kind, accent, seed = 1) {
  const c = cvs(512, Math.round((512 * h) / w)), x = c.getContext('2d'), W = c.width, H = c.height;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = (t) => {
    x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(3,12,32,.78)'; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba(accent, 0.2)); g.addColorStop(1, rgba(accent, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = rgba(accent, 0.22); x.fillRect(0, 0, W, 28);
    ['#ff5d6c', '#ffc247', '#35e08a'].forEach((cl, i) => { x.fillStyle = cl; x.beginPath(); x.arc(14 + i * 14, 14, 4, 0, 6.283); x.fill(); });
    x.fillStyle = rgba(accent, 1); x.font = '700 11px "Chakra Petch",ui-monospace,monospace'; x.textBaseline = 'middle'; x.fillText(TITLES[kind], 62, 15); x.textBaseline = 'top';
    ({ code: drawCode, graph: drawGraph, hex: drawHex, radar: drawRadar })[kind](x, W, H, t + seed * 7, accent);
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    x.strokeStyle = rgba(accent, 0.9); x.lineWidth = 3; const L = 22;
    [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(([px, py, sx, sy]) => { x.beginPath(); x.moveTo(px + sx * L, py + sy * 1.5); x.lineTo(px + sx * 1.5, py + sy * 1.5); x.lineTo(px + sx * 1.5, py + sy * L); x.stroke(); });
    tex.needsUpdate = true;
  };
  draw(0);
  const grp = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.04, h * 1.04), new THREE.MeshPhysicalMaterial({ color: 0x0a2a60, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }));
  back.position.z = -0.05;
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w * 1.04, h * 1.04)), new THREE.LineBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.2), transparent: true, opacity: 0.9 }));
  frame.position.z = -0.04;
  grp.add(back, face, frame);
  return { group: grp, draw, texture: tex };
}

/* ---------------- circuit board slab ---------------- */
export function circuitBoard(w, d, renderer, seed = 3) {
  const { base, glow } = circuitCanvases(512, seed, 0.6);
  const grp = new THREE.Group();
  const top = canvasTex(base, renderer), em = canvasTex(glow, renderer);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), [
    new THREE.MeshStandardMaterial({ color: 0x0a1230, metalness: 0.8, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0x0a1230, metalness: 0.8, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ map: top, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 1.3, metalness: 0.6, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0x050914, metalness: 0.9, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ color: 0x0a1230, metalness: 0.8, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0x0a1230, metalness: 0.8, roughness: 0.3 })
  ]);
  grp.add(slab);
  const r = rng(seed * 13), chipM = new THREE.MeshStandardMaterial({ color: 0x03060f, metalness: 0.9, roughness: 0.2, emissive: 0x2d6bff, emissiveIntensity: 0.35 });
  for (let i = 0; i < 6; i++) {
    const cw = 0.6 + r() * 1.2, cd = 0.6 + r() * 1.2, ch = 0.08 + r() * 0.16;
    const chip = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), chipM); chip.position.set((r() - 0.5) * (w - 2), 0.07 + ch / 2, (r() - 0.5) * (d - 2)); grp.add(chip);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? PAL.cyan : PAL.gold).multiplyScalar(3) }));
    led.position.set(chip.position.x + cw / 2 - 0.12, chip.position.y + ch / 2 + 0.01, chip.position.z + cd / 2 - 0.12); grp.add(led);
  }
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.14, d)), new THREE.LineBasicMaterial({ color: new THREE.Color(PAL.cyan).multiplyScalar(2), transparent: true, opacity: 0.8 }));
  grp.add(edge); return grp;
}

/* ---------------- glass panel ---------------- */
export function glassPanel(w, h, color = PAL.cyan) {
  const s = new THREE.Shape(), r = Math.min(w, h) * 0.08, x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
  geo.translate(0, 0, -0.04);
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x7fa6ff, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.16, envMapIntensity: 3, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, side: THREE.DoubleSide }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, opacity: 0.85 }));
  const g = new THREE.Group(); g.add(mesh, edges); return g;
}

export function wire(geo, color, opacity = 0.8) {
  return new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
}

/* ---------------- studio environment for reflections ---------------- */
export function buildEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(70, 46, 70), new THREE.MeshBasicMaterial({ color: 0x03060f, side: THREE.BackSide })));
  const panel = (w, h, color, k, p, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(...look); s.add(m);
  };
  panel(26, 14, 0xdfeaff, 7, [0, 21, 4], [0, 0, 0]);
  panel(5, 34, PAL.cyan, 6, [-24, 3, 2], [0, 0, 0]);
  panel(5, 34, PAL.gold, 6, [24, 3, 2], [0, 0, 0]);
  panel(30, 12, PAL.violet, 3.2, [0, 4, -28], [0, 0, 0]);
  panel(30, 4, PAL.blue, 4, [0, -2, 28], [0, 0, 0]);
  panel(18, 18, 0x1a3a9a, 1.2, [0, -20, 0], [0, 0, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.03); pm.dispose();
  s.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return rt.texture;
}

/* ---------------- trophy ---------------- */
export function emblemTexture() {
  const c = cvs(256), x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 126); g.addColorStop(0, 'rgba(4,16,44,.95)'); g.addColorStop(1, 'rgba(4,10,30,.95)');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 124, 0, 6.283); x.fill();
  x.strokeStyle = '#2ee9ff'; x.lineWidth = 6; x.beginPath(); x.arc(128, 128, 112, 0, 6.283); x.stroke();
  x.strokeStyle = '#ffc247'; x.lineWidth = 2; x.beginPath(); x.arc(128, 128, 98, 0, 6.283); x.stroke();
  x.font = '700 78px "Chakra Petch",ui-monospace,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = '#2ee9ff'; x.shadowBlur = 18; x.fillStyle = '#eaffff'; x.fillText('</>', 128, 134);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeTrophy() {
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc247, metalness: 1, roughness: 0.14, envMapIntensity: 2.2, clearcoat: 0.4, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x070d22, metalness: 0.7, roughness: 0.14, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.05 });
  const T = new THREE.Group(), cup = new THREE.Group();
  const outer = [[0, 0.95], [0.18, 0.97], [0.34, 1.02], [0.52, 1.18], [0.68, 1.42], [0.8, 1.72], [0.88, 2.02], [0.9, 2.2], [0.84, 2.2], [0.82, 2.02], [0.72, 1.72], [0.58, 1.42], [0.4, 1.2], [0.2, 1.1], [0.0, 1.08]].map(([r, y]) => new THREE.Vector2(r, y));
  const prof = new THREE.SplineCurve(outer).getPoints(70).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  cup.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 72), gold));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.04, 12, 72), gold); rim.rotation.x = Math.PI / 2; rim.position.y = 2.2; cup.add(rim);
  for (const s of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([[s * 0.76, 1.95, 0], [s * 1.2, 2.02, 0], [s * 1.34, 1.62, 0], [s * 0.62, 1.28, 0]].map((a) => new THREE.Vector3(...a)));
    cup.add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.075, 12, false), gold));
  }
  const em = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshBasicMaterial({ map: emblemTexture(), transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
  em.position.set(0, 1.62, 0.8); cup.add(em); T.userData.emblem = em;
  const stemP = [[0.22, 0.38], [0.14, 0.5], [0.12, 0.62], [0.2, 0.7], [0.12, 0.78], [0.1, 0.9], [0.24, 1.0]].map(([r, y]) => new THREE.Vector2(r, y));
  T.add(new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(stemP).getPoints(30), 40), gold));
  const node = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 40), gold); node.rotation.x = Math.PI / 2; node.position.y = 0.7; T.add(node);
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.12, 0.22, 64), dark); t1.position.y = 0.11; T.add(t1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.025, 8, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.cyan).multiplyScalar(3), toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; T.add(ring);
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.9, 0.16, 64), gold); t2.position.y = 0.3; T.add(t2);
  T.add(cup);
  T.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return T;
}
