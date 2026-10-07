/* Lightweight 3D backdrop for portal.html / admin.html (same visual language as the main site). */
import * as THREE from 'three';
import * as U from './k3d-util.js';
const c = document.getElementById('bg');
(function () {
  if (!c) return;
  let r; try { r = new THREE.WebGLRenderer({ canvas: c, antialias: true }); } catch (e) { return; }
  const mobile = innerWidth < 820 || matchMedia('(pointer:coarse)').matches, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2); r.setPixelRatio(dpr); r.setClearColor(0x02040c, 1);
  const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  s.add(U.skyDome(true));
  const dust = U.particleField(mobile ? 1400 : 3200, { x: 40, y: 30, z0: 20, z1: -80 }, dpr, { size: 2.2, seed: 3 }); s.add(dust);
  const bokeh = U.particleField(40, { x: 40, y: 30, z0: 10, z1: -60 }, dpr, { size: 12, alpha: 0.25, bokeh: true, seed: 4 }); s.add(bokeh);
  // glowing circuit floor (shader grid + traces feel)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uTime: U.uTime },
    vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uTime;varying vec3 vP;
     void main(){vec2 p=vP.xy;vec2 g=abs(fract(p/4.)-.5);float l=smoothstep(.47,.5,max(g.x,g.y));
      vec2 q=abs(fract(p/20.)-.5);float L=smoothstep(.485,.5,max(q.x,q.y));
      float pulse=smoothstep(.96,1.,sin(p.y*.2-uTime*1.4+floor(p.x/4.)*1.7)*.5+.5);
      float fade=smoothstep(110.,5.,length(p));
      vec3 c=vec3(.1,.45,1.)*l*.35+vec3(.2,.9,1.)*L*.7+vec3(1.,.76,.28)*pulse*l*.9;
      gl_FragColor=vec4(c,(l*.5+L*.5+pulse*l)*fade);}`
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -7; s.add(floor);
  const rings = [[9, 0.06, U.PAL.cyan, 0.12], [12, 0.05, U.PAL.violet, -0.09], [15.5, 0.04, U.PAL.gold, 0.06]].map(([R, t, col, sp], i) => { const m = U.energyRing(R, t, col, { speed: sp, segs: 2 + (i % 2), gain: 2.4 }); m.position.set(0, 1, -34 - i * 4); s.add(m); return m; });
  let mx = 0, my = 0; addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  const rs = () => { r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }; addEventListener('resize', rs); rs();
  const clk = new THREE.Clock(); let t = 0, f = 0, hidden = false, destroyed = false;
  (function loop() {
    if (destroyed) return;
    requestAnimationFrame(loop);
    if (++f % 30 === 0) hidden = getComputedStyle(c).display === 'none';
    if (hidden) return;
    t += Math.min(clk.getDelta(), 0.1) * (calm ? 0.2 : 1); U.uTime.value = t;
    cam.position.set(mx * 3 + Math.sin(t * 0.15) * 0.8, 1 - my * 2 + Math.sin(t * 0.2) * 0.3, 14); cam.lookAt(mx * 1.2, 0.5, -30);
    rings.forEach((m, i) => { m.rotation.z = t * (i % 2 ? -0.08 : 0.1); });
    r.render(s, cam);
  })();
  window.KLEBG3D = {
    destroy() {
      destroyed = true;
      s.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => { if (material.map) material.map.dispose(); material.dispose(); });
        }
      });
      r.dispose();
      r.forceContextLoss?.();
    }
  };
})();
