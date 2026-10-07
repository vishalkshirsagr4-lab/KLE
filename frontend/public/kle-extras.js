/* KLE extras: 3D auto-scrolling gallery for the footer.
   Standalone on purpose: it does not depend on three.js or on the
   main inline script, so an error elsewhere can never break it. */
(function () {
  'use strict';
  var root = document.getElementById('kleGallery');
  if (!root) return;

  var ITEMS = [
    { src: 'gallery-ekathva.jpg',   w: 447, h: 447, cap: 'Ekathva 2.0 · Inter-Collegiate Competition', alt: 'KLE BCA students at the Ekathva 2.0 inter-collegiate competition' },
    { src: 'gallery-lab.jpg',       w: 516, h: 387, cap: 'BCA Computer Lab',                          alt: 'Students working in the BCA computer lab' },
    { src: 'gallery-seminar.jpg',   w: 399, h: 501, cap: 'Seminar · Data Science with Machine Learning', alt: 'Seminar on Data Science with Machine Learning for 5th semester BCA students' },
    { src: 'gallery-placement.jpg', w: 387, h: 516, cap: 'Pre-Placement Training · V Sem 2026-27',     alt: 'Pre-placement training for V semester students, AY 2026-27' }
  ];

  var GAP = 30;
  var SPEED = 42; // pixels per second
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var stage = root.querySelector('.kg-stage');
  if (!stage) { stage = document.createElement('div'); stage.className = 'kg-stage'; root.appendChild(stage); }

  var cards = [], L = 1, off = 0, last = null, raf = 0;
  var hover = false, dragging = false, visible = true;
  var dragX = 0, dragOff = 0;

  function build() {
    stage.innerHTML = '';
    cards = [];
    var H = window.innerWidth < 760 ? 210 : 290;
    root.style.setProperty('--kg-h', H + 'px');

    var widths = ITEMS.map(function (it) {
      var r = it.ratio || it.w / it.h;
      return Math.round(H * r);
    });
    var baseL = widths.reduce(function (a, w) { return a + w + GAP; }, 0);
    var copies = Math.max(2, Math.ceil((window.innerWidth * 1.6) / baseL));
    L = baseL * copies;

    var x = 0;
    for (var c = 0; c < copies; c++) {
      for (var i = 0; i < ITEMS.length; i++) {
        var it = ITEMS[i], w = widths[i];
        var fig = document.createElement('figure');
        fig.className = 'kg-card' + (it.logo ? ' kg-logo' : '');
        fig.style.width = w + 'px';
        var img = document.createElement('img');
        img.src = it.src;
        img.alt = c === 0 ? it.alt : '';
        img.draggable = false;
        img.decoding = 'async';
        fig.appendChild(img);
        var cap = document.createElement('figcaption');
        cap.textContent = it.cap;
        fig.appendChild(cap);
        if (c > 0) fig.setAttribute('aria-hidden', 'true');
        stage.appendChild(fig);
        cards.push({ el: fig, w: w, base: x });
        x += w + GAP;
      }
    }
    layout();
  }

  function layout() {
    var vw = root.clientWidth || window.innerWidth;
    var half = L / 2;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var rel = (((c.base + c.w / 2 - off) % L) + L) % L; // 0..L
      if (rel > half) rel -= L;                           // -L/2..L/2 around the centre
      var n = rel / (vw / 2);                             // -1 .. 1 at the screen edges
      var cl = Math.max(-1.4, Math.min(1.4, n));
      var ry = -cl * 46;
      var z = -Math.abs(cl) * 280;
      var sc = 1 - Math.min(Math.abs(cl), 1.4) * 0.1;
      if (Math.abs(rel) > vw / 2 + c.w) {
        c.el.style.visibility = 'hidden';
      } else {
        c.el.style.visibility = 'visible';
        c.el.style.transform =
          'translate3d(' + (rel - c.w / 2).toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) ' +
          'rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      }
    }
  }

  function frame(ts) {
    if (last === null) last = ts;
    var dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (!hover && !dragging && visible && !reduce) {
      off = (off + SPEED * dt) % L;
      layout();
    }
    raf = requestAnimationFrame(frame);
  }

  /* pause on hover / touch, and drag to scrub */
  root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
  root.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
  root.addEventListener('pointerdown', function (e) {
    dragging = true; dragX = e.clientX; dragOff = off;
    try { root.setPointerCapture(e.pointerId); } catch (err) {}
  });
  root.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    off = (((dragOff - (e.clientX - dragX)) % L) + L) % L;
    layout();
  });
  function endDrag() { dragging = false; }
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  root.addEventListener('lostpointercapture', endDrag);

  /* only animate while on screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      last = null;
    }, { rootMargin: '120px' }).observe(root);
  }

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { off = 0; build(); }, 150);
  });

  build();
  if (reduce) { off = cards.length ? cards[2].base : 0; layout(); }
  raf = requestAnimationFrame(frame);
})();


/* ==========================================================
   Domain ring: cards orbit the cup like a 3D carousel.
   - cards always stay upright and readable
   - nearer cards are bigger, brighter and drawn in front of the cup,
     farther cards are smaller and dimmer and pass behind it
   - pauses on hover/focus or while a card is open
   - desktop only; phones and "reduced motion" keep the original grid
   If anything fails, the page's original CSS rotation stays in place.
   ========================================================== */
(function () {
  'use strict';
  try {
    var stage = document.querySelector('.domain-stage');
    var dg = document.getElementById('dg');
    if (!stage || !dg || !window.matchMedia) return;

    var wide = window.matchMedia('(min-width: 960px)');
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    var on = false, hovered = null, visible = true, last = null, ang = 0;
    var SECONDS_PER_TURN = 46;

    function active() { return wide.matches && !calm.matches; }

    function clear() {
      var cs = dg.children;
      for (var i = 0; i < cs.length; i++) {
        cs[i].style.transform = ''; cs[i].style.zIndex = ''; cs[i].style.opacity = '';
        cs[i].classList.remove('kd-front');
      }
    }

    function sync() {
      var want = active();
      if (want === on) return;
      on = want;
      stage.classList.toggle('kd-on', on);
      if (!on) clear(); else place();
    }

    function place() {
      var cs = dg.querySelectorAll('.dc'), n = cs.length;
      if (!n) return;
      var w = dg.clientWidth || 1000;
      var Rx = Math.min(w * 0.40, 440), Ry = 208;
      for (var i = 0; i < n; i++) {
        var a = (i * 360 / n + ang) * Math.PI / 180;
        var d = Math.cos(a);                 // 1 = in front, -1 = behind
        var sx = Math.sin(a);
        var f = (d + 1) / 2;                 // 0..1
        var x = Rx * sx, y = Ry * d + 42;
        var sc = 0.72 + 0.28 * f;
        var el = cs[i];
        el.style.transform =
          'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ') ' +
          'perspective(1000px) rotateY(' + (-sx * 20).toFixed(2) + 'deg)';
        el.style.opacity = (0.8 + 0.2 * f).toFixed(3);
        el.style.zIndex = (el === hovered || el.classList.contains('o')) ? 30 : (d > 0.1 ? 4 + Math.round(d * 10) : (d > -0.5 ? 2 : 1));
        var front = d > 0.88;
        if (front !== el.classList.contains('kd-front')) el.classList.toggle('kd-front', front);
      }
    }

    function frame(ts) {
      if (last === null) last = ts;
      var dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (on) {
        var ae = document.activeElement, focused = !!(ae && ae.classList && ae.classList.contains('dc') && dg.contains(ae));
        var paused = !!hovered || !visible || focused || !!dg.querySelector('.dc.o');
        if (!paused) ang = (ang + 360 / SECONDS_PER_TURN * dt) % 360;
        place();
      }
      requestAnimationFrame(frame);
    }

    dg.addEventListener('mouseover', function (e) { var c = e.target.closest && e.target.closest('.dc'); hovered = c || null; });
    dg.addEventListener('mouseleave', function () { hovered = null; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; last = null; }, { rootMargin: '80px' }).observe(stage);
    }
    if (wide.addEventListener) { wide.addEventListener('change', sync); calm.addEventListener('change', sync); }
    else { wide.addListener(sync); calm.addListener(sync); }

    sync();
    requestAnimationFrame(frame);
  } catch (err) { /* keep original CSS rotation */ }
})();
