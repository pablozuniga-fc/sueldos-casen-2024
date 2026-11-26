/* Utilidades de gráficos SVG (sin bibliotecas externas). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  // ---------------------------------------------------------------- formato numérico (es-CL)
  function num(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    d = d || 0;
    var s = Math.abs(x).toFixed(d), p = s.split('.');
    var ent = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (x < 0 && Number(s) !== 0 ? '−' : '') + ent + (d > 0 ? ',' + p[1] : '');
  }
  var F = {
    num: num,
    pesos: function (x) { return (x < 0 ? '−$' : '$') + num(Math.abs(Math.round(x)), 0); },
    pesosM: function (m) { return F.pesos(Math.round(m * 1e6 / 1000) * 1000); },       // millones → $ redondeado a mil
    mil: function (m, d) { return (m < 0 ? '−$' : '$') + num(Math.abs(m) * 1000, d === undefined ? 1 : d) + '\u00a0mil'; },   // millones → miles
    pct: function (x, d) { return num(x, d === undefined ? 1 : d) + '\u00a0%'; },
    millones: function (m, d) { return num(m, d === undefined ? 1 : d); }
  };

  // ---------------------------------------------------------------- SVG
  function el(tag, at, padre) {
    var e = document.createElementNS(NS, tag);
    if (at) for (var k in at) if (at[k] !== undefined && at[k] !== null) e.setAttribute(k, at[k]);
    if (padre) padre.appendChild(e);
    return e;
  }
  function texto(padre, x, y, t, at) {
    var e = el('text', Object.assign({ x: x, y: y }, at || {}), padre);
    e.textContent = t; return e;
  }
  function escala(d0, d1, r0, r1) {
    var f = function (x) { return r0 + (x - d0) * (r1 - r0) / (d1 - d0); };
    f.inv = function (p) { return d0 + (p - r0) * (d1 - d0) / (r1 - r0); };
    f.dom = [d0, d1]; f.rango = [r0, r1];
    return f;
  }
  function ticks(a, b, n) {
    n = n || 5;
    var paso = (b - a) / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(paso))), r = paso / mag;
    paso = (r < 1.5 ? 1 : r < 2.25 ? 2 : r < 3.5 ? 2.5 : r < 7.5 ? 5 : 10) * mag;
    var out = [], v = Math.ceil(a / paso - 1e-9) * paso;
    for (; v <= b + paso * 1e-9; v += paso) out.push(Math.abs(v) < paso * 1e-9 ? 0 : +v.toPrecision(12));
    return out;
  }
  function decimales(ts) {
    var d = 0;
    ts.forEach(function (t) { var s = String(t), i = s.indexOf('.'); if (i >= 0) d = Math.max(d, s.length - i - 1); });
    return Math.min(d, 4);
  }

  // lienzo: contenedor (div), alto (número o función del ancho), márgenes
  function lienzo(cont, op) {
    var ancho = Math.max(200, Math.floor(cont.clientWidth || cont.getBoundingClientRect().width || 600));
    var m = Object.assign({ t: 12, r: 12, b: 34, l: 48 }, op.m || {});
    var alto = typeof op.alto === 'function' ? op.alto(ancho) : (op.alto || 300);
    var svg = el('svg', { viewBox: '0 0 ' + ancho + ' ' + alto, width: ancho, height: alto, role: op.rol || 'img' }, cont);
    if (op.etiqueta) svg.setAttribute('aria-label', op.etiqueta);
    else Promise.resolve().then(function () {            // después de dibujar: ya existe el título del panel
      var fig = cont.closest('figure'), h = fig && fig.querySelector('h3'), tp = svg.querySelector('.titulo-panel');
      if (h) svg.setAttribute('aria-label', h.textContent.trim() + (tp && tp.textContent ? ': ' + tp.textContent.trim() : ''));
    });
    var g = el('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, svg);
    return { svg: svg, g: g, ancho: ancho, alto: alto, w: ancho - m.l - m.r, h: alto - m.t - m.b, m: m };
  }

  function ejeX(L, x, op) {
    op = op || {};
    var ts = op.ticks || ticks(x.dom[0], x.dom[1], op.n || Math.max(2, Math.round(L.w / 90)));
    var d = op.dec !== undefined ? op.dec : decimales(ts), fmt = op.formato || function (v) { return num(v, d); };
    var g = el('g', { 'class': 'eje', transform: 'translate(0,' + L.h + ')' }, L.g);
    if (op.rejilla) {
      var gr = el('g', { 'class': 'rejilla' }, L.g);
      ts.forEach(function (t) { el('line', { x1: x(t), x2: x(t), y1: 0, y2: L.h }, gr); });
      L.g.insertBefore(gr, L.g.firstChild);
    }
    el('line', { 'class': 'dominio', x1: 0, x2: L.w, y1: 0, y2: 0 }, g);
    ts.forEach(function (t) {
      var px = x(t); if (px < -1 || px > L.w + 1) return;
      el('line', { x1: px, x2: px, y1: 0, y2: 4, stroke: '#c9d0d8' }, g);
      texto(g, px, 17, fmt(t), { 'text-anchor': 'middle' });
    });
    if (op.titulo) texto(g, L.w / 2, 31, op.titulo, { 'text-anchor': 'middle', 'class': 'rot' });
    return ts;
  }
  function ejeY(L, y, op) {
    op = op || {};
    var ts = op.ticks || ticks(y.dom[0], y.dom[1], op.n || Math.max(2, Math.round(L.h / 55)));
    var d = op.dec !== undefined ? op.dec : decimales(ts), fmt = op.formato || function (v) { return num(v, d); };
    var g = el('g', { 'class': 'eje' }, L.g);
    var gr = el('g', { 'class': 'rejilla' }, L.g);
    L.g.insertBefore(gr, L.g.firstChild);
    ts.forEach(function (t) {
      var py = y(t); if (py < -1 || py > L.h + 1) return;
      if (op.rejilla !== false) el('line', { x1: 0, x2: L.w, y1: py, y2: py }, gr);
      texto(g, -8, py + 4, fmt(t), { 'text-anchor': 'end' });
    });
    if (op.titulo) texto(g, -L.m.l + 2, -4, op.titulo, { 'class': 'rot', 'text-anchor': 'start' });
    return ts;
  }

  function camino(pts, x, y) {
    var s = '', abierto = false;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p === null || !isFinite(p[1])) { abierto = false; continue; }
      s += (abierto ? 'L' : 'M') + x(p[0]).toFixed(2) + ',' + y(p[1]).toFixed(2);
      abierto = true;
    }
    return s;
  }
  function linea(L, pts, x, y, at) { return el('path', Object.assign({ d: camino(pts, x, y), fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round' }, at || {}), L.g || L); }
  function area(L, pts, x, y, y0, at) {
    if (!pts.length) return null;
    var d = camino(pts, x, y) + 'L' + x(pts[pts.length - 1][0]).toFixed(2) + ',' + y(y0).toFixed(2) + 'L' + x(pts[0][0]).toFixed(2) + ',' + y(y0).toFixed(2) + 'Z';
    return el('path', Object.assign({ d: d, stroke: 'none' }, at || {}), L.g || L);
  }

  // ---------------------------------------------------------------- tooltip
  var tip = null;
  function tooltip() { if (!tip) tip = document.getElementById('tooltip'); return tip; }
  function mostrar(html, ev) {
    var t = tooltip(); if (!t) return;
    t.innerHTML = html; t.hidden = false;
    var r = t.getBoundingClientRect(), x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - 14;
    t.style.left = Math.max(8, x) + 'px'; t.style.top = Math.max(8, y) + 'px';
  }
  function ocultar() { var t = tooltip(); if (t) t.hidden = true; }
  function conTip(nodo, fn) {
    nodo.addEventListener('mousemove', function (ev) { mostrar(fn(ev), ev); });
    nodo.addEventListener('mouseleave', ocultar);
    nodo.addEventListener('touchstart', function (ev) { var t = ev.touches[0]; mostrar(fn(t), t); }, { passive: true });
  }
  function filas(pares) {
    return pares.map(function (p) { return p === null ? '' : p.length === 1 ? '<div><b>' + p[0] + '</b></div>' : '<div class="t-fila"><span>' + p[0] + '</span><span>' + p[1] + '</span></div>'; }).join('');
  }
  document.addEventListener('scroll', ocultar, { passive: true });

  // ---------------------------------------------------------------- utilidades varias
  function claves(cont, items) {        // leyenda: [{tipo:'linea'|'barra'|'punto'|'discontinua'|'hueco'|'rombo', color, texto}]
    if (!cont) return;
    cont.innerHTML = items.map(function (it) {
      var mk;
      if (it.tipo === 'nada') mk = '';
      else if (it.tipo === 'barra') mk = '<i class="mk" style="height:12px;width:16px;border:0;border-radius:2px;background:' + it.color + ';box-shadow:inset 0 0 0 1px rgba(38,44,51,.42)"></i>';
      else if (it.tipo === 'discontinua') mk = '<i class="mk" style="border-top:2.5px dashed ' + it.color + '"></i>';
      else if (it.tipo === 'punteada') mk = '<i class="mk" style="border-top:2px dotted ' + it.color + '"></i>';
      else if (it.tipo === 'punto') mk = '<i class="mk" style="width:10px;height:10px;border:0;border-radius:50%;background:' + it.color + '"></i>';
      else if (it.tipo === 'hueco') mk = '<i class="mk" style="width:10px;height:10px;border:2px solid ' + it.color + ';border-radius:50%;background:#fff"></i>';
      else if (it.tipo === 'rombo') mk = '<i class="mk" style="width:9px;height:9px;border:0;background:' + it.color + ';transform:rotate(45deg)"></i>';
      else mk = '<i class="mk" style="border-top:3px solid ' + it.color + '"></i>';
      return '<span class="clave">' + mk + '<span>' + it.texto + '</span></span>';
    }).join('');
  }
  function tabla(cont, cab, filasT, op) {
    op = op || {};
    var h = '<table><thead><tr>' + cab.map(function (c, i) { return '<th' + (i === 0 || (op.txt && op.txt.indexOf(i) >= 0) ? ' class="txt"' : '') + '>' + c + '</th>'; }).join('') + '</tr></thead><tbody>';
    filasT.forEach(function (f, k) {
      var cls = op.clase ? op.clase(k) : '';
      if (cls === 'grupo') { h += '<tr class="grupo"><td class="txt" colspan="' + cab.length + '">' + f[0] + '</td></tr>'; return; }
      h += '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + f.map(function (c, i) { return '<td' + (i === 0 || (op.txt && op.txt.indexOf(i) >= 0) ? ' class="txt"' : '') + '>' + c + '</td>'; }).join('') + '</tr>';
    });
    cont.innerHTML = h + '</tbody></table>';
  }
  function paneles(cont, n) {
    cont.innerHTML = '';
    var out = [];
    for (var i = 0; i < n; i++) { var d = document.createElement('div'); d.className = 'panel-graf'; cont.appendChild(d); out.push(d); }
    return out;
  }
  // Primer dibujo: los gráficos que están en pantalla o cerca se dibujan de inmediato; los demás, por turnos breves
  // y en el orden de la página, para no bloquearla al cargar. Si la dirección trae un ancla o se pulsa un enlace
  // interno, se dibuja todo lo pendiente de una vez, para que la página no cambie de alto durante el desplazamiento.
  var cola = [], turnoPedido = false;
  function turno() {
    turnoPedido = false;
    var t0 = Date.now();
    while (cola.length && Date.now() - t0 < 12) cola.shift()();
    if (cola.length) pedirTurno();
  }
  function pedirTurno() { if (!turnoPedido) { turnoPedido = true; setTimeout(turno, 0); } }
  function vaciarCola() { while (cola.length) cola.shift()(); }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (a) vaciarCola();
  }, true);
  window.addEventListener('hashchange', vaciarCola);
  window.addEventListener('beforeprint', vaciarCola);

  // redibuja al cambiar el ancho del contenedor
  function adaptable(cont, fn) {
    var ultimo = 0, pend = false, activo = false;
    function ir() { pend = false; if (!activo) return; var w = Math.round(cont.clientWidth); if (w && w !== ultimo) { ultimo = w; fn(); } }
    function activar() { if (!activo) { activo = true; ir(); } }
    if (window.ResizeObserver) new ResizeObserver(function () { if (!pend) { pend = true; requestAnimationFrame(ir); } }).observe(cont);
    else window.addEventListener('resize', ir);
    if (location.hash.length > 1 || cont.getBoundingClientRect().top < window.innerHeight * 1.5) activar();
    else { cola.push(activar); pedirTurno(); }
    return function () { ultimo = 0; activar(); ir(); };
  }

  window.G = { F: F, el: el, texto: texto, escala: escala, ticks: ticks, lienzo: lienzo, ejeX: ejeX, ejeY: ejeY, linea: linea, area: area,
    camino: camino, mostrar: mostrar, ocultar: ocultar, conTip: conTip, filas: filas, claves: claves, tabla: tabla, paneles: paneles, adaptable: adaptable,
    vaciarCola: vaciarCola };
})();
