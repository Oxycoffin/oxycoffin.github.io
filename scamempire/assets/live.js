/* Scam Empire — arte vivo en la web, calcado del juego (prototype/art-corp-live.js):
 * · temblor del contorno a 8 fps (feTurbulence con semillas 1/4/8 cada 125 ms + feDisplacementMap), con la intensidad
 *   según el tamaño en pantalla (curva boilScreen del juego);
 * · en reposo, saltitos a pasos (4 posiciones en 1,5 s), desfasados para que no latan a la vez;
 * · al tocar, salto con aplastamiento a 12 fps retenidos y confeti con la paleta del dibujo (fluido).
 * Las <img class="live"> se sustituyen por el SVG en línea (los filtros SVG sobre <img> fallan en Safari). Con
 * «reducir movimiento» no se anima nada; el temblor se apaga fuera de pantalla. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', FPS = 12, uid = 0, filters = {}, defs = null;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !document.body.animate) return;
  var BOIL_MIN = 32, BOIL_MAX = 2.4;
  function boilScreen(px) { return px < BOIL_MIN ? 0 : px <= 82 ? 1.6 * Math.pow(px / 82, 0.75) : Math.min(BOIL_MAX, 1.6 * px / 82); }
  function boilFilter(scale) {
    if (filters[scale]) return filters[scale];
    if (!defs) {
      var s = document.createElementNS(NS, 'svg');
      s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true'); s.style.position = 'absolute';
      s.innerHTML = '<defs></defs>'; document.body.appendChild(s); defs = s.firstChild;
    }
    var id = 'se-boil-' + scale;
    defs.insertAdjacentHTML('beforeend',
      '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="-400" y="-400" width="1824" height="1824" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="1"><animate attributeName="seed" values="1;4;8" dur="0.375s" calcMode="discrete" repeatCount="indefinite"/></feTurbulence>' +
      '<feDisplacementMap in="SourceGraphic" scale="' + scale + '" xChannelSelector="R" yChannelSelector="G"/></filter>');
    return (filters[scale] = id);
  }
  function held(fn, ms) {   // fotogramas retenidos a 12 fps
    var n = Math.max(2, Math.round(ms / 1000 * FPS)), k = [];
    for (var i = 0; i <= n; i++) { var f = fn(i / n); f.offset = i / n; f.easing = 'step-end'; k.push(f); }
    return k;
  }
  function smooth(fn, ms) { var n = Math.max(8, Math.round(ms / 1000 * 40)), k = []; for (var i = 0; i <= n; i++) { var f = fn(i / n); f.offset = i / n; k.push(f); } return k; }
  function spring(t) { return Math.exp(-5.5 * t) * Math.cos(t * 14); }

  var seen = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var g = e.target._boil; if (g) g.el.setAttribute('filter', e.isIntersecting ? 'url(#' + g.id + ')' : 'none'); });
  }, { rootMargin: '80px' }) : null;

  function live(img) {
    fetch(img.getAttribute('src')).then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(function (txt) {
      var tmp = document.createElement('div'); tmp.innerHTML = txt.trim();
      var svg = tmp.querySelector('svg'); if (!svg) return;
      svg.setAttribute('class', img.getAttribute('class')); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      ['width', 'height', 'style'].forEach(function (a) { if (img.hasAttribute(a)) svg.setAttribute(a, img.getAttribute(a)); });
      svg.style.overflow = 'visible';
      var vb = svg.viewBox.baseVal, vw = vb && vb.width ? vb.width : 1024, vh = vb && vb.height ? vb.height : 1024, vx = vb ? vb.x : 0, vy = vb ? vb.y : 0;
      var inner = document.createElementNS(NS, 'g'), wob = document.createElementNS(NS, 'g'), burst = document.createElementNS(NS, 'g');
      while (svg.firstChild) wob.appendChild(svg.firstChild);
      inner.appendChild(wob); svg.appendChild(burst); svg.appendChild(inner);
      img.replaceWith(svg);
      // escala real del dibujo (preserveAspectRatio «meet»): px = tamaño en pantalla del lienzo de 1024 del juego
      var rc = svg.getBoundingClientRect(), sc = Math.min(rc.width / vw, rc.height / vh) || 64 / 1024, px = 1024 * sc;
      // temblor (solo a partir de 32 px de pantalla, como en el juego)
      var screen = boilScreen(px);
      if (screen) {
        var id = boilFilter(Math.max(1, Math.round(screen / sc)));   // desplazamiento en unidades del dibujo
        wob.setAttribute('filter', 'url(#' + id + ')');
        svg._boil = { el: wob, id: id }; if (seen) seen.observe(svg);
      }
      // apoyo de los saltos: centro inferior del dibujo
      inner.style.transformBox = 'view-box';
      inner.style.transformOrigin = (vx + vw / 2).toFixed(1) + 'px ' + (vy + vh).toFixed(1) + 'px';
      if (px >= 56 && !svg.classList.contains('still')) {
        inner.animate([{ transform: 'none' }, { transform: 'translateY(-10px)', offset: 0.25 }, { transform: 'scale(1.015,.985)', offset: 0.5 },
          { transform: 'translateY(-6px)', offset: 0.75 }, { transform: 'none' }].map(function (f) { f.easing = 'step-end'; return f; }),
        { duration: 1500, iterations: Infinity, delay: -(uid++ % 7) * 210 });
      }
      // al tocar: salto + confeti con los colores del dibujo
      var pal = (txt.match(/fill="#[0-9a-fA-F]{6}"/g) || []).map(function (x) { return x.slice(6, -1); }).slice(1, 5);
      svg.style.cursor = 'pointer'; svg.style.touchAction = 'manipulation';
      svg.addEventListener('pointerdown', function () {
        inner.animate(held(function (t) {
          var up = t < 0.12 ? 0 : t < 0.62 ? Math.sin((t - 0.12) / 0.5 * Math.PI) * 70 : 0;
          var sq = t < 0.12 ? -t / 0.12 * 0.1 : t < 0.62 ? Math.sin((t - 0.12) / 0.5 * Math.PI) * 0.08 : spring((t - 0.62) / 0.38) * -0.07;
          return { transform: 'translateY(' + (-up).toFixed(1) + 'px) scale(' + (1 - sq * 0.7).toFixed(3) + ',' + (1 + sq).toFixed(3) + ')' };
        }, 760), { duration: 760, composite: 'add' });
        var cx = vx + vw / 2, cy = vy + vh * 0.55;
        for (var i = 0; i < 7; i++) (function (i) {
          var c = document.createElementNS(NS, 'circle'), a = (-170 + i * 27 + Math.random() * 12) * Math.PI / 180;
          var dist = 300 + Math.random() * 120, r = 26 + Math.random() * 22;
          c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center'; c.setAttribute('r', r.toFixed(1)); c.setAttribute('fill', pal[i % pal.length] || '#ff7a7a');
          burst.appendChild(c);
          c.animate(smooth(function (t) {
            var e = 1 - Math.pow(1 - t, 3);
            return { transform: 'translate(' + (Math.cos(a) * dist * e).toFixed(0) + 'px,' + (Math.sin(a) * dist * e).toFixed(0) + 'px) scale(' + (1 - t * 0.7).toFixed(2) + ')', opacity: t < 0.75 ? 1 : ((1 - t) / 0.25).toFixed(2) };
          }, 760 + i * 40), { duration: 760 + i * 40 }).onfinish = function () { c.remove(); };
        })(i);
      });
    }).catch(function () { /* sin red o sin SVG: queda la imagen estática */ });
  }
  document.querySelectorAll('img.live').forEach(live);
})();
