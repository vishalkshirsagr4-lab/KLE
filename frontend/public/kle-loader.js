/* Loads GSAP + three.js (local /vendor first, jsDelivr fallback) then the page's 3D module.
   <script src="kle-loader.js" data-main="kle3d.js" data-gsap="1"></script> */
(function () {
  var me = document.currentScript, main = me.getAttribute('data-main'), useGsap = me.getAttribute('data-gsap') === '1';
  var CDN = 'https://cdn.jsdelivr.net/npm/', V = '0.166.0';
  window.KLE_ASSETS = { font: ['/vendor/fonts/helvetiker_bold.typeface.json', CDN + 'three@' + V + '/examples/fonts/helvetiker_bold.typeface.json'] };
  function script(src, type) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; if (type) s.type = type;
      s.onload = res; s.onerror = function () { rej(new Error(src)); }; document.head.appendChild(s);
    });
  }
  function tryList(list) { return list.reduce(function (p, u) { return p.catch(function () { return script(u); }); }, Promise.reject()); }
  var gs = useGsap
    ? tryList(['/vendor/gsap/gsap.min.js', CDN + 'gsap@3.12.5/dist/gsap.min.js'])
        .then(function () { return tryList(['/vendor/gsap/ScrollTrigger.min.js', CDN + 'gsap@3.12.5/dist/ScrollTrigger.min.js']); })
        .catch(function () {})
    : Promise.resolve();
  function importMap(local) {
    var t = local ? '/vendor/three/build/three.module.js' : CDN + 'three@' + V + '/build/three.module.js';
    var a = local ? '/vendor/three/examples/jsm/' : CDN + 'three@' + V + '/examples/jsm/';
    var s = document.createElement('script'); s.type = 'importmap';
    s.textContent = JSON.stringify({ imports: { three: t, 'three/addons/': a } }); document.head.appendChild(s);
  }
  fetch('/vendor/three/build/three.module.js', { method: 'HEAD' })
    .then(function (r) { if (!r.ok) throw 0; importMap(true); })
    .catch(function () { importMap(false); })
    .then(function () { return gs; })
    .then(function () { return script(main, 'module'); })
    .catch(function () { document.documentElement.classList.add('no-gl'); var b = document.getElementById('boot'); if (b) b.remove(); });
})();
