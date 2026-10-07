// Copies the exact three.js + GSAP files the 3D scene needs from node_modules
// into public/vendor so the site works offline / without a CDN.
// Runs automatically on postinstall / predev / prebuild. Safe to fail:
// the page falls back to jsDelivr if /vendor is missing.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'vendor');
function pkgDir(name) {
  try {
    let dir = path.dirname(require.resolve(name, { paths: [root] }));
    while (dir !== path.dirname(dir)) {
      const manifest = path.join(dir, 'package.json');
      if (fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === name) return dir;
      dir = path.dirname(dir);
    }
    return null;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return null;
    throw e;
  }
}
function copy(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}
const three = pkgDir('three'), gsap = pkgDir('gsap');
if (!three) { console.warn('[vendor] three not installed - run npm install. Page will use CDN fallback.'); }
else {
  copy(path.join(three, 'build/three.module.js'), path.join(out, 'three/build/three.module.js'));
  const jsm = path.join(three, 'examples/jsm'), o = path.join(out, 'three/examples/jsm');
  for (const d of ['postprocessing', 'shaders']) copy(path.join(jsm, d), path.join(o, d));
  copy(path.join(jsm, 'loaders/FontLoader.js'), path.join(o, 'loaders/FontLoader.js'));
  copy(path.join(jsm, 'geometries/TextGeometry.js'), path.join(o, 'geometries/TextGeometry.js'));
  copy(path.join(three, 'examples/fonts/helvetiker_bold.typeface.json'), path.join(out, 'fonts/helvetiker_bold.typeface.json'));
  console.log('[vendor] three copied');
}
if (!gsap) { console.warn('[vendor] gsap not installed - run npm install. Page will use CDN fallback.'); }
else {
  copy(path.join(gsap, 'dist/gsap.min.js'), path.join(out, 'gsap/gsap.min.js'));
  copy(path.join(gsap, 'dist/ScrollTrigger.min.js'), path.join(out, 'gsap/ScrollTrigger.min.js'));
  console.log('[vendor] gsap copied');
}
