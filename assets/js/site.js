/* Comportamiento del sitio: idioma, tooltips, gráficos de barras, matriz de capas y filtros.
   Los DATOS no viven aquí: salen de _data/*.yml y llegan como JSON dentro de la página. */
(function () {
  'use strict';
  var tip = document.getElementById('tip');

  /* ---------- tooltip compartido ---------- */
  function showTip(anchor, e, lines) {
    tip.textContent = '';
    lines.forEach(function (ln, i) {
      var d = document.createElement('div');
      if (i === 0) { var b = document.createElement('b'); b.textContent = ln; d.appendChild(b); }
      else if (Array.isArray(ln)) {
        var s = document.createElement('span'); s.textContent = ln[0] + ': '; d.appendChild(s);
        d.appendChild(document.createTextNode(ln[1]));
      } else d.textContent = ln;
      tip.appendChild(d);
    });
    tip.style.opacity = '1';
    var r = anchor.getBoundingClientRect();
    var x = (e && e.clientX) ? e.clientX + 14 : r.right + 8, y = r.top - 8;
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > window.innerWidth - 8) x = Math.max(8, r.left - tw - 8);
    if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
    if (y < 8) y = 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.style.opacity = '0'; }
  function hover(el, fn) {
    el.addEventListener('mouseenter', fn); el.addEventListener('mousemove', fn);
    el.addEventListener('focus', fn);
    el.addEventListener('mouseleave', hideTip); el.addEventListener('blur', hideTip);
  }
  function tr(v, lang) { return (v && typeof v === 'object' && (v.en || v.es)) ? v[lang] : v; }

  /* ---------- botón "ver tabla" ---------- */
  function tableToggle(root) {
    var btn = root.querySelector('.tbtn'), tv = root.querySelector('.tbl-wrap');
    if (!btn || !tv) return;
    btn.addEventListener('click', function () {
      var open = tv.hidden; tv.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? btn.dataset.hide : btn.dataset.show;
    });
  }

  /* ---------- gráfico de barras genérico (_data/charts/*.yml) ---------- */
  document.querySelectorAll('[data-bar]').forEach(function (root) {
    var lang = root.dataset.lang;
    var c = JSON.parse(root.querySelector('.chart-data').textContent);
    var rows = root.querySelector('.rows'), tbody = root.querySelector('tbody');
    var cols = c.columns[lang];
    c.rows.forEach(function (d) {
      var name = tr(d.name, lang), sub = tr(d.sub, lang);
      var row = document.createElement('div'); row.className = 'row'; row.tabIndex = 0;
      var lab = document.createElement('div'); lab.className = 'rlab';
      var n1 = document.createElement('span'); n1.textContent = name; lab.appendChild(n1);
      if (sub) { var n2 = document.createElement('em'); n2.textContent = sub; lab.appendChild(n2); }
      var track = document.createElement('div'); track.className = 'track';
      var bar = document.createElement('div'); bar.className = 'bar';
      bar.style.background = 'var(--' + d.series + ')';
      bar.style.width = Math.max(0, Math.min(100, d.value / c.max * 100)) + '%';
      var val = document.createElement('span'); val.className = 'val'; val.textContent = d.label;
      track.appendChild(bar); track.appendChild(val);
      row.appendChild(lab); row.appendChild(track); rows.appendChild(row);
      var cells = (d.cells || []).map(function (x) { return tr(x, lang); });
      hover(row, function (e) {
        showTip(row, e, [name].concat(cells.map(function (v, i) { return [cols[i + 1], v]; })));
      });
      var t = document.createElement('tr');
      [name].concat(cells).forEach(function (v, i) {
        var td = document.createElement('td'); if (i >= 2) td.className = 'r'; td.textContent = v; t.appendChild(td);
      });
      tbody.appendChild(t);
    });
    tableToggle(root);
  });

  /* ---------- matriz síntoma × causa (_data/layer_log.yml) ---------- */
  var LD = document.getElementById('layers-data');
  var LAY = LD ? JSON.parse(LD.textContent) : null;
  document.querySelectorAll('[data-mx]').forEach(function (root) {
    var lang = root.dataset.lang, keys = LAY.names.keys, names = LAY.names[lang], u = LAY.ui;
    var rowsK = keys.filter(function (k) { return k !== 'u'; });
    var counts = {};
    LAY.log.forEach(function (e) { var k = e.s + '|' + e.c; counts[k] = (counts[k] || 0) + 1; });
    function bin(n) { return n === 0 ? 'z' : n === 1 ? 'b1' : n <= 3 ? 'b2' : n <= 7 ? 'b3' : n <= 15 ? 'b4' : 'b5'; }
    var grid = root.querySelector('.mx-grid'), tbody = root.querySelector('tbody');
    var corner = document.createElement('div'); corner.className = 'mx-corner';
    corner.innerHTML = '<span></span><span></span>';
    corner.children[0].textContent = u.col[lang]; corner.children[1].textContent = u.row[lang];
    grid.appendChild(corner);
    keys.forEach(function (k, i) {
      var h = document.createElement('div'); h.className = 'mx-h' + (k === 'u' ? ' u' : '');
      h.setAttribute('role', 'columnheader'); h.textContent = names[i]; grid.appendChild(h);
    });
    var list = [];
    rowsK.forEach(function (r, ri) {
      var rh = document.createElement('div'); rh.className = 'mx-r'; rh.setAttribute('role', 'rowheader');
      rh.textContent = names[ri]; grid.appendChild(rh);
      keys.forEach(function (c, ci) {
        var n = counts[r + '|' + c] || 0;
        var cell = document.createElement('div');
        cell.className = 'mx-c ' + bin(n) + (r === c ? ' dg' : '');
        cell.setAttribute('role', 'gridcell');
        cell.textContent = n || '';
        if (n) {
          cell.tabIndex = 0;
          cell.setAttribute('aria-label', u.symptom[lang] + ': ' + names[ri] + ' · ' + u.cause[lang] + ': ' + names[ci] + ' · ' + n + ' ' + u.incidents[lang]);
          list.push([names[ri], names[ci], n]);
          hover(cell, function (e) {
            showTip(cell, e, [n + ' ' + u.incidents[lang], [u.symptom[lang], names[ri]], [u.cause[lang], names[ci]],
              r === c ? u.same[lang] : (c === 'u' ? '' : u.crossed[lang])].filter(Boolean));
          });
        }
        grid.appendChild(cell);
      });
    });
    list.sort(function (a, b) { return b[2] - a[2]; }).forEach(function (x) {
      var t = document.createElement('tr');
      x.forEach(function (v, i) { var td = document.createElement('td'); if (i === 2) td.className = 'r'; td.textContent = v; t.appendChild(td); });
      tbody.appendChild(t);
    });
    var key = root.querySelector('.mx-key');
    var sw = [['dg', u.same[lang]], ['b1', '1'], ['b2', '2-3'], ['b3', '4-7'], ['b4', '8-15'], ['b5', '16+']];
    sw.forEach(function (p) {
      var s = document.createElement('span'); s.className = 'sw';
      var i = document.createElement('i'); i.className = p[0] === 'dg' ? 'dg' : 'mx-c ' + p[0]; i.style.height = '14px';
      s.appendChild(i); s.appendChild(document.createTextNode(p[1])); key.appendChild(s);
    });
    tableToggle(root);
  });

  /* ---------- filtros de la bitácora ---------- */
  document.querySelectorAll('.filters').forEach(function (g) {
    var sec = g.closest('section');
    g.querySelectorAll('.fbtn').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.f;
        g.querySelectorAll('.fbtn').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        sec.querySelectorAll('.entry').forEach(function (e) { e.hidden = !(f === 'all' || e.dataset.d === f); });
      });
    });
  });

  /* ---------- idioma: ?lang= → guardado → navegador → inglés ---------- */
  var blocks = document.querySelectorAll('.loc'), btns = document.querySelectorAll('.langsw button');
  function setLang(l, persist) {
    if (l !== 'en' && l !== 'es') l = 'en';
    blocks.forEach(function (el) { el.hidden = el.dataset.loc !== l; });
    document.querySelectorAll('[data-l]').forEach(function (el) { el.hidden = el.dataset.l !== l; });
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === l)); });
    document.documentElement.lang = l;
    hideTip();
    if (persist) { try { localStorage.setItem('lang', l); } catch (e) {} }
  }
  var initial = 'en';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'es' || q === 'en') initial = q;
    else {
      var saved = localStorage.getItem('lang');
      if (saved === 'es' || saved === 'en') initial = saved;
      else if ((navigator.language || '').toLowerCase().indexOf('es') === 0) initial = 'es';
    }
  } catch (e) {}
  setLang(initial, false);
  btns.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang, true); window.scrollTo({ top: 0, behavior: 'instant' }); });
  });
})();
