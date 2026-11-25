// Language (en/es): ?lang= > saved choice > browser language. Without JS, English.
(function () {
  var root = document.documentElement;
  function pick() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'es' || q === 'en') return q;
    try { var s = localStorage.getItem('hs-lang'); if (s === 'es' || s === 'en') return s; } catch (e) { /* no storage */ }
    return /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
  }
  function apply(l) {
    root.lang = l;
    var t = document.querySelector('meta[name="hs-title-' + l + '"]');
    if (t) document.title = t.content;
    document.querySelectorAll('[data-aria-' + l + ']').forEach(function (el) { el.setAttribute('aria-label', el.getAttribute('data-aria-' + l)); });
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setLang === l)); });
  }
  apply(pick());
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set-lang]'); if (!b) return;
    try { localStorage.setItem('hs-lang', b.dataset.setLang); } catch (err) { /* no storage */ }
    apply(b.dataset.setLang);
  });
})();
