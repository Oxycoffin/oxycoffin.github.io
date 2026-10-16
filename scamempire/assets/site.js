// Idioma (es/en): ?lang= > elección guardada > idioma del navegador. Sin JS se ve en español.
(function () {
  var root = document.documentElement;
  function pick() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'es' || q === 'en') return q;
    try { var s = localStorage.getItem('se-lang'); if (s === 'es' || s === 'en') return s; } catch (e) { /* sin almacenamiento */ }
    return /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
  }
  function apply(l) {
    root.lang = l;
    var t = document.querySelector('meta[name="se-title-' + l + '"]');
    if (t) document.title = t.content;
    document.querySelectorAll('[data-aria-' + l + ']').forEach(function (el) { el.setAttribute('aria-label', el.getAttribute('data-aria-' + l)); });
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setLang === l)); });
  }
  apply(pick());
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set-lang]'); if (!b) return;
    try { localStorage.setItem('se-lang', b.dataset.setLang); } catch (err) { /* sin almacenamiento */ }
    apply(b.dataset.setLang);
  });
})();
