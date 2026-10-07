/* DOM enhancements: scroll reveals, active nav link, section rail, boot failsafe. */
(function () {
  'use strict';
  var root = document.documentElement;
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // failsafe: never leave the loading overlay up
  setTimeout(function () { var b = document.getElementById('boot'); if (b) { root.classList.add('ready'); b.classList.add('done'); setTimeout(function () { b.remove(); }, 900); } }, 9000);

  var sel = '#about .g, section > h2, .tm, .contact-card, .map-card, .contact-form, #register .g, #portals .g, .kle-offer-card';
  var els = [].slice.call(document.querySelectorAll(sel));
  if (!calm && 'IntersectionObserver' in window) {
    els.forEach(function (e, i) { e.classList.add('rv'); e.style.setProperty('--rd', ((i % 4) * 0.08) + 's'); });
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
    // anything already above the fold when the page loads at an anchor
    setTimeout(function () { els.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight && !e.classList.contains('in')) e.classList.add('in'); }); }, 1200);
  }

  var links = [].slice.call(document.querySelectorAll('nav a[href^="#"]'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        links.forEach(function (a, i) { var on = secs[i] === x.target; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        [].forEach.call(document.querySelectorAll('#rail a'), function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + x.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { if (s) so.observe(s); });
  }
  var rail = document.getElementById('rail');
  if (rail) rail.innerHTML = links.map(function (a) { return '<a href="' + a.getAttribute('href') + '" aria-label="' + a.textContent + '"><i></i><span>' + a.textContent + '</span></a>'; }).join('');
})();
