(function () {
  // pega o <script> atual e seus atributos
  var script = document.currentScript || (function() {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  var siteKey = script.getAttribute('data-site-key') || '';
  var api = script.getAttribute('data-api') || '';
  var origin = (function () {
    try {
      var u = new URL(script.src);
      return u.origin; // ex: https://meu-dominio.com
    } catch (e) { return ''; }
  })();

  // página do app (usamos a própria index com querystring)
  var src = origin + '/?embed=1'
    + (siteKey ? '&siteKey=' + encodeURIComponent(siteKey) : '')
    + (api ? '&api=' + encodeURIComponent(api) : '');

  // cria o iframe flutuante (inicialmente oculto; mostra o FAB nativo dentro do app)
  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = 'AI FAQ Widget';
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '360px';
  iframe.style.height = '520px';
  iframe.style.border = '0';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 12px 32px rgba(0,0,0,.35)';
  iframe.style.zIndex = '2147483000'; // bem alto
  iframe.allow = 'clipboard-read; clipboard-write';

  // opcional: responsivo em telas pequenas
  function resizeForViewport() {
    var w = Math.min(360, window.innerWidth - 40);
    var h = Math.min(520, window.innerHeight - 40);
    iframe.style.width = w + 'px';
    iframe.style.height = h + 'px';
  }
  resizeForViewport();
  window.addEventListener('resize', resizeForViewport);

  // injeta no DOM
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(iframe);
  });

  // canal simples para fechar/abrir via postMessage (futuro)
  window.addEventListener('message', function (ev) {
    if (!ev.data || typeof ev.data !== 'object') return;
    if (ev.data.__aiwidget === 'close') iframe.style.display = 'none';
    if (ev.data.__aiwidget === 'open') iframe.style.display = 'block';
  });
})();
