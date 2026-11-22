/* Tablero de la tesis: secciones, figuras e interacciones. */
(function () {
  'use strict';
  var D = window.DATOS, F = G.F, el = G.el, tx = G.texto;
  var C = { nivel: '#db6e00', comun: '#3d78b8', mco: '#394049', obs: '#c3c9d1', obs2: '#7d8691', tinta: '#262c33', tinta2: '#4b5560', tinta3: '#6b7581',
    linea: '#dde2e7', naranja: '#e77500', nivelClaro: '#f4c08a', comunClaro: '#a9c3e2' };
  var NIV = D.niveles, TAM = D.tamanos, N = D.meta.n;
  var CORTO = { 'Básica o menos': 'Básica o menos', 'Media incompleta': 'Media incompleta', 'Media completa': 'Media completa', 'Superior incompleta': 'Superior incompleta',
    'Técnico completo': 'Técnico completo', 'Profesional completo': 'Profesional completo', 'Postgrado completo': 'Postgrado completo' };
  var FAM = { N: 'Normal', T: 't', SL: 'Slash', CN: 'Normal contaminada', L: 'Logística' };
  var ORDEN_FAM = ['N', 'T', 'SL', 'CN', 'L'];
  var MOD = { nivel: 'Escala por nivel', comun: 'Escala común' };

  function $(id) { return document.getElementById(id); }
  function plot(fig) { return $(fig).querySelector('.fig-plot'); }
  function ley(fig) { return $(fig).querySelector('.fig-leyenda'); }
  function tablaFig(fig) { var d = $(fig).querySelector('details.fig-tabla > div'); return d; }
  function suma(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function max(a) { return Math.max.apply(null, a); }
  function min(a) { return Math.min.apply(null, a); }
  function nombreModelo(m) { return m.tipo === 'TP' ? 'TP-' + (m.fam === 'T' ? '<i>t</i>' : FAM[m.fam]) : (m.fam === 'T' ? '<i>t</i>' : FAM[m.fam]); }
  function nombreTxt(m) { return (m.tipo === 'TP' ? 'TP-' : '') + FAM[m.fam]; }

  function segmento(cont, nombre, ops, val, cambio) {
    cont.innerHTML = '';
    ops.forEach(function (o, i) {
      var id = nombre + '-' + i;
      var inp = document.createElement('input'); inp.type = 'radio'; inp.name = nombre; inp.id = id; inp.value = o.v; inp.checked = o.v === val;
      var lab = document.createElement('label'); lab.htmlFor = id; lab.innerHTML = o.t;
      inp.addEventListener('change', function () { if (inp.checked) cambio(o.v); });
      cont.appendChild(inp); cont.appendChild(lab);
    });
  }

  // ---------------------------------------------------------------- cifras en el texto
  var VAL = { n: F.num(N), m10: F.pct(D.redondeo.m10), m50: F.pct(D.redondeo.m50), m100: F.pct(D.redondeo.m100), distintos: F.num(D.redondeo.distintos), fecha: D.meta.fecha };
  document.querySelectorAll('[data-v]').forEach(function (e) { var k = e.getAttribute('data-v'); if (VAL[k] !== undefined) e.textContent = VAL[k]; });

  // ---------------------------------------------------------------- índice con la sección activa
  (function () {
    var enlaces = {}; document.querySelectorAll('.indice a').forEach(function (a) { enlaces[a.getAttribute('href').slice(1)] = a; });
    if (!('IntersectionObserver' in window)) return;
    var visibles = {};
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visibles[e.target.id] = e.isIntersecting; });
      var activo = null;
      document.querySelectorAll('.capitulo').forEach(function (s) { if (!activo && visibles[s.id]) activo = s.id; });
      Object.keys(enlaces).forEach(function (k) { enlaces[k].classList.toggle('activo', k === activo); });
      if (activo && window.innerWidth <= 1000) { var a = enlaces[activo]; a.parentNode.parentNode.scrollLeft = a.offsetLeft - 16; }
    }, { rootMargin: '-15% 0px -70% 0px' });
    document.querySelectorAll('.capitulo').forEach(function (s) { obs.observe(s); });
  })();

  // ================================================================= histogramas genéricos
  // barras: [{a, b, v}] con v en la unidad del eje y
  function barras(L, x, y, bs, color, at) {
    var g = el('g', null, L.g);
    bs.forEach(function (b) {
      var x0 = x(b.a), x1 = x(b.b), w = Math.max(0.5, x1 - x0 - (x1 - x0 > 4 ? 1 : 0));
      if (b.v > 0) el('rect', Object.assign({ x: x0, y: y(b.v), width: w, height: Math.max(0, y(0) - y(b.v)), fill: b.color || color }, at || {}), g);
    });
    return g;
  }
  // agrega conteos de tramos de 10 mil (k/100, (k+1)/100] en tramos de ancho w (millones) anclados en cero
  function reagrupar(h, w, lo, hi) {
    var paso = Math.round(w * 100), out = [], k0 = h.k0;
    var a = Math.ceil(lo * 100 / paso) * paso, b = Math.floor(hi * 100 / paso) * paso;
    for (var k = a; k < b; k += paso) {
      var c = 0;
      for (var j = k; j < k + paso; j++) { var i = j - k0; if (i >= 0 && i < h.c.length) c += h.c[i]; }
      out.push({ a: k / 100, b: (k + paso) / 100, c: c });
    }
    return out;
  }

  // ================================================================= PORTADA
  (function () {
    var H = D.hist_portada, cont = plot('f-portada');
    var bs = H.c.map(function (c, i) { return { a: H.bordes[i], b: H.bordes[i + 1], c: c, v: 100 * c / N }; });
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var L = G.lienzo(cont, { alto: function (w) { return Math.max(270, Math.min(450, w * 0.66)); }, m: { t: 62, r: 14, b: 40, l: 40 },
        etiqueta: 'Histograma del sueldo líquido mensual' });
      var x = G.escala(-0.075, 4.025, 0, L.w), ym = max(bs.map(function (b) { return b.v; }));
      var y = G.escala(0, Math.ceil(ym / 5) * 5, L.h, 0);
      G.ejeY(L, y, { formato: function (v) { return F.num(v) + ' %'; }, n: 4 });
      G.ejeX(L, x, { ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], formato: function (v) { return v === 0 ? '0' : F.num(v, v % 1 ? 1 : 0); }, titulo: 'Millones de pesos' });
      bs.forEach(function (b) { b.color = (b.a < 0.5 && b.b >= 0.5) ? C.naranja : '#7f8a97'; });
      var gb = barras(L, x, y, bs, '#7f8a97');
      var marcas = [{ v: 0.5, t: 'Moda', m: '$500.000', c: '#f5a54a', yl: -44, ancla: 'end', dx: -6 },
        { v: D.continuas[0].mediana, t: 'Mediana', m: '$600.000', c: '#ffffff', yl: -26, ancla: 'start', dx: 6 },
        { v: D.continuas[0].media, t: 'Media', m: '$877.000', c: '#9cc3ea', yl: -8, ancla: 'start', dx: 6 }];
      marcas.forEach(function (mk) {
        el('line', { x1: x(mk.v), x2: x(mk.v), y1: mk.yl - 4, y2: L.h, stroke: mk.c, 'stroke-width': 1.5, 'stroke-dasharray': mk.t === 'Moda' ? null : '4 3' }, L.g);
        var t = tx(L.g, x(mk.v) + mk.dx, mk.yl, '', { 'text-anchor': mk.ancla, 'class': 'etq', fill: mk.c, style: 'fill:' + mk.c });
        var s1 = el('tspan', { 'font-weight': 600 }, t); s1.textContent = mk.t + ' ';
        var s2 = el('tspan', null, t); s2.textContent = mk.m;
      });
      var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
      G.conTip(hov, function (ev) {
        var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l);
        var b = bs.filter(function (q) { return xv > q.a && xv <= q.b; })[0]; if (!b) return '';
        return G.filas([['Más de ' + F.pesos(b.a * 1e6) + ' y hasta ' + F.pesos(b.b * 1e6)], ['Personas', F.num(b.c)], ['Porcentaje', F.pct(b.v)]]);
      });
    });
    $('portada-nota').textContent = 'Los sueldos sobre el percentil 99 quedan fuera del gráfico.';
  })();

  // ================================================================= 1. DATOS
  // ---- flujo muestral
  (function () {
    var cont = plot('f-flujo'), fl = D.flujo;
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var fila = 40, L = G.lienzo(cont, { alto: fl.length * fila + 6, m: { t: 2, r: 70, b: 4, l: 0 }, etiqueta: 'Personas que cumplen cada criterio de selección' });
      var x = G.escala(0, fl[0].n, 0, L.w);
      fl.forEach(function (f, i) {
        var y0 = i * fila, ult = i === fl.length - 1;
        tx(L.g, 0, y0 + 13, f.paso + '  ' + f.criterio, { 'class': ult ? 'etq' : 'etq-2', 'font-weight': ult ? 600 : 400 });
        var r = el('rect', { x: 0, y: y0 + 19, width: Math.max(1, x(f.n)), height: 13, rx: 2, fill: ult ? C.mco : C.obs }, L.g);
        tx(L.g, x(f.n) + 6, y0 + 30, F.num(f.n), { 'class': 'etq', 'font-weight': ult ? 600 : 400 });
        G.conTip(r, function () { return G.filas([[f.criterio], ['Personas', F.num(f.n)], f.excluidos !== null ? ['Excluidas', F.num(f.excluidos)] : null, f.sin_dato !== null ? ['Sin dato', F.num(f.sin_dato)] : null]); });
      });
    });
    G.tabla(tablaFig('f-flujo'), ['Paso', 'Criterio', 'Personas', 'Excluidas', 'Sin dato'],
      fl.map(function (f) { return [f.paso, f.criterio, F.num(f.n), f.excluidos === null ? '' : F.num(f.excluidos), f.sin_dato === null ? '' : F.num(f.sin_dato)]; }), { txt: [1] });
  })();

  // ---- histograma por grupo
  (function () {
    var HG = D.hist_grupos, cont = plot('f-hist'), sg = $('h-grupo'), sc = $('h-comp');
    var grupos = [['Toda la muestra', ['Todos']], ['Nivel educacional', NIV], ['Sexo', ['Mujer', 'Hombre']], ['Tamaño de empresa', TAM]];
    function opciones(sel, ninguno) {
      var h = ninguno ? '<option value="">Ningún grupo</option>' : '';
      grupos.forEach(function (g) { h += '<optgroup label="' + g[0] + '">' + g[1].map(function (k) { return '<option value="' + k + '">' + (k === 'Todos' ? 'Toda la muestra' : k) + '</option>'; }).join('') + '</optgroup>'; });
      sel.innerHTML = h;
    }
    opciones(sg, false); opciones(sc, true); sg.value = 'Profesional completo'; sc.value = 'Media completa';
    function nombre(k) { return k === 'Todos' ? 'Toda la muestra' : k; }
    function bins(k) { var h = HG.grupos[k]; return h.c.map(function (c, i) { return { a: HG.bordes[i], b: HG.bordes[i + 1], c: c, v: 100 * c / h.n }; }); }
    function dibujar() {
      cont.innerHTML = '';
      var a = sg.value, b = sc.value, A = bins(a), B = b ? bins(b) : null;
      var L = G.lienzo(cont, { alto: function (w) { return Math.max(250, Math.min(380, w * 0.36)); }, m: { t: 14, r: 10, b: 40, l: 44 } });
      var ym = max(A.map(function (q) { return q.v; }).concat(B ? B.map(function (q) { return q.v; }) : []));
      var x = G.escala(-0.025, 3.025, 0, L.w), y = G.escala(0, ym * 1.05, L.h, 0);
      G.ejeY(L, y, { formato: function (v) { return F.num(v) + ' %'; }, n: 4 });
      G.ejeX(L, x, { ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3], formato: function (v) { return F.num(v, v % 1 ? 1 : 0); }, titulo: 'Millones de pesos' });
      barras(L, x, y, A, '#9aa4b0');
      if (B) {
        var pts = []; B.forEach(function (q) { pts.push([q.a, q.v], [q.b, q.v]); });
        G.linea(L, pts, x, y, { stroke: C.tinta, 'stroke-width': 1.6 });
      }
      var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
      G.conTip(hov, function (ev) {
        var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), i = A.findIndex(function (q) { return xv > q.a && xv <= q.b; });
        if (i < 0) return '';
        return G.filas([['Más de ' + F.pesos(A[i].a * 1e6) + ' y hasta ' + F.pesos(A[i].b * 1e6)], [nombre(a), F.pct(A[i].v)], B ? [nombre(b), F.pct(B[i].v)] : null]);
      });
      G.claves(ley('f-hist'), [{ tipo: 'barra', color: '#9aa4b0', texto: nombre(a) + ' (' + F.num(HG.grupos[a].n) + ' personas)' }].concat(B ? [{ tipo: 'linea', color: C.tinta, texto: nombre(b) + ' (' + F.num(HG.grupos[b].n) + ')' }] : []));
      var fa = 100 * HG.grupos[a].mayor / HG.grupos[a].n;
      $('h-nota').textContent = 'Queda fuera del gráfico el ' + F.pct(fa) + ' de ' + nombre(a).toLowerCase().replace('toda la muestra', 'la muestra') + ', con sueldos mayores que $3.025.000' + (B ? '; en ' + nombre(b).toLowerCase() + ', el ' + F.pct(100 * HG.grupos[b].mayor / HG.grupos[b].n) : '') + '.';
      var tb = A.map(function (q, i) { return [F.pesos(q.a * 1e6 + 25000), F.pct(q.v)].concat(B ? [F.pct(B[i].v)] : []); });
      G.tabla(tablaFig('f-hist'), ['Tramo centrado en', nombre(a)].concat(B ? [nombre(b)] : []), tb);
    }
    sg.addEventListener('change', dibujar); sc.addEventListener('change', dibujar);
    G.adaptable(cont, dibujar);
  })();

  // ---- sueldos más declarados
  (function () {
    var cont = plot('f-frecuentes'), fr = D.frecuentes;
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var fila = 26, L = G.lienzo(cont, { alto: fr.length * fila + 8, m: { t: 4, r: 56, b: 4, l: 82 } });
      var x = G.escala(0, max(fr.map(function (f) { return f.pct; })), 0, L.w);
      fr.forEach(function (f, i) {
        var y0 = i * fila;
        tx(L.g, -10, y0 + 15, F.pesos(f.monto), { 'text-anchor': 'end', 'class': 'etq' });
        var r = el('rect', { x: 0, y: y0 + 4, width: x(f.pct), height: 15, rx: 2, fill: i === 0 ? C.naranja : C.obs }, L.g);
        tx(L.g, x(f.pct) + 6, y0 + 16, F.pct(f.pct), { 'class': 'etq-2' });
        G.conTip(r, function () { return G.filas([[F.pesos(f.monto)], ['Personas', F.num(f.n)], ['Porcentaje', F.pct(f.pct)], ['Acumulado', F.pct(f.acum)]]); });
      });
    });
    G.tabla(tablaFig('f-frecuentes'), ['Monto', 'Personas', 'Porcentaje', 'Porcentaje acumulado'], fr.map(function (f) { return [F.pesos(f.monto), F.num(f.n), F.pct(f.pct), F.pct(f.acum)]; }));
  })();

  // ---- perfiles por variable continua
  (function () {
    var cont = plot('f-perfiles'), vars = [['Escolaridad', 'Años de escolaridad', 'Escolaridad'], ['Edad', 'Edad (años)', 'Edad'], ['Horas', 'Horas semanales', 'Horas']];
    var rho = {}; D.spearman.vars.forEach(function (v, j) { rho[v] = D.spearman.m[0][j]; });
    var datos = vars.map(function (v) { return D.perfiles[v[0]].filter(function (p) { return p.n >= 50; }); });
    var ym = max(datos.map(function (d) { return max(d.map(function (p) { return Math.max(p.media, p.mediana); })); }));
    G.claves(ley('f-perfiles'), [{ tipo: 'linea', color: C.tinta, texto: 'Mediana' }, { tipo: 'discontinua', color: C.obs2, texto: 'Media' }]);
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 3);
      vars.forEach(function (v, k) {
        var d = datos[k], L = G.lienzo(ps[k], { alto: function (w) { return Math.max(210, Math.min(300, w * 0.82)); }, m: { t: 26, r: 8, b: 38, l: k === 0 ? 40 : 30 } });
        var x = G.escala(min(d.map(function (p) { return p.x; })), max(d.map(function (p) { return p.x; })), 0, L.w), y = G.escala(0, Math.ceil(ym * 2) / 2, L.h, 0);
        G.ejeY(L, y, { n: 5, formato: function (t) { return k === 0 ? F.num(t, t % 1 ? 1 : 0) : ''; } });
        G.ejeX(L, x, { n: 5, titulo: v[1], dec: 0 });
        tx(L.g, 0, -12, v[2], { 'class': 'titulo-panel' });
        tx(L.g, L.w, -12, 'ρ = ' + F.num(rho[v[2]], 3), { 'class': 'sub-panel', 'text-anchor': 'end' });
        G.linea(L, d.map(function (p) { return [p.x, p.media]; }), x, y, { stroke: C.obs2, 'stroke-dasharray': '5 3', 'stroke-width': 1.6 });
        G.linea(L, d.map(function (p) { return [p.x, p.mediana]; }), x, y, { stroke: C.tinta, 'stroke-width': 2 });
        var cruz = el('line', { y1: 0, y2: L.h, stroke: C.tinta3, 'stroke-width': 1, visibility: 'hidden' }, L.g);
        var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
        G.conTip(hov, function (ev) {
          var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), best = d[0];
          d.forEach(function (q) { if (Math.abs(q.x - xv) < Math.abs(best.x - xv)) best = q; });
          cruz.setAttribute('x1', x(best.x)); cruz.setAttribute('x2', x(best.x)); cruz.setAttribute('visibility', 'visible');
          return G.filas([[v[1] + ': ' + F.num(best.x)], ['Personas', F.num(best.n)], ['Mediana', F.pesosM(best.mediana)], ['Media', F.pesosM(best.media)]]);
        });
        hov.addEventListener('mouseleave', function () { cruz.setAttribute('visibility', 'hidden'); });
      });
    });
    var filasT = []; vars.forEach(function (v, k) { datos[k].forEach(function (p) { filasT.push([v[2], F.num(p.x), F.num(p.n), F.pesosM(p.mediana), F.pesosM(p.media)]); }); });
    G.tabla(tablaFig('f-perfiles'), ['Variable', 'Valor', 'Personas', 'Mediana', 'Media'], filasT);
  })();

  // ---- cajas por categoría
  (function () {
    var cont = plot('f-cajas'), cat = D.categorias;
    var bloques = [['Nivel educacional', NIV], ['Tamaño de empresa', TAM], ['Sexo', ['Mujer', 'Hombre']]];
    var xm = max(cat.map(function (c) { return c.p95; }));
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var fila = 27, cab = 26, alto = 0; bloques.forEach(function (b) { alto += cab + b[1].length * fila + 10; });
      var ancho = cont.clientWidth, ml = ancho < 560 ? 118 : 150;
      var L = G.lienzo(cont, { alto: alto + 40, m: { t: 4, r: 16, b: 40, l: ml } });
      var x = G.escala(0, Math.ceil(xm), 0, L.w), y0 = 0;
      var ts = G.ticks(0, Math.ceil(xm), Math.max(3, Math.round(L.w / 80)));
      var gr = el('g', { 'class': 'rejilla' }, L.g);
      ts.forEach(function (t) { el('line', { x1: x(t), x2: x(t), y1: 0, y2: alto }, gr); });
      bloques.forEach(function (b) {
        tx(L.g, -ml, y0 + 16, b[0], { 'class': 'titulo-panel' });
        y0 += cab;
        b[1].forEach(function (k) {
          var c = cat.filter(function (q) { return q.categoria === k; })[0], yc = y0 + fila / 2;
          tx(L.g, -10, yc + 4, k, { 'text-anchor': 'end', 'class': 'etq-2' });
          var g = el('g', null, L.g);
          el('line', { x1: x(c.p5), x2: x(c.p95), y1: yc, y2: yc, stroke: C.obs2, 'stroke-width': 1.3 }, g);
          el('rect', { x: x(c.p25), y: yc - 8, width: Math.max(1.5, x(c.p75) - x(c.p25)), height: 16, fill: C.obs, stroke: '#9aa4b0', 'stroke-width': 1, rx: 2 }, g);
          el('line', { x1: x(c.mediana), x2: x(c.mediana), y1: yc - 8, y2: yc + 8, stroke: C.tinta, 'stroke-width': 2.2 }, g);
          el('rect', { x: x(c.media) - 4, y: yc - 4, width: 8, height: 8, fill: C.tinta, transform: 'rotate(45 ' + x(c.media) + ' ' + yc + ')' }, g);
          var hit = el('rect', { x: 0, y: y0, width: L.w, height: fila, 'class': 'zona-hover' }, g);
          G.conTip(hit, function () {
            return G.filas([[k + ' (' + F.num(c.n) + ' personas)'], ['Percentil 5', F.pesosM(c.p5)], ['Percentil 25', F.pesosM(c.p25)], ['Mediana', F.pesosM(c.mediana)],
              ['Percentil 75', F.pesosM(c.p75)], ['Percentil 95', F.pesosM(c.p95)], ['Media', F.pesosM(c.media)], ['Moda', F.pesosM(c.moda)]]);
          });
          y0 += fila;
        });
        y0 += 10;
      });
      var ej = el('g', { 'class': 'eje', transform: 'translate(0,' + alto + ')' }, L.g);
      el('line', { 'class': 'dominio', x1: 0, x2: L.w, y1: 0, y2: 0 }, ej);
      ts.forEach(function (t) { tx(ej, x(t), 17, F.num(t, t % 1 ? 1 : 0), { 'text-anchor': 'middle' }); });
      tx(ej, L.w / 2, 33, 'Millones de pesos', { 'text-anchor': 'middle', 'class': 'rot' });
    });
    G.tabla(tablaFig('f-cajas'), ['Categoría', 'Personas', '%', 'Media', 'Mediana', 'Moda', 'Rango intercuartílico', 'Percentil 90', '% bajo la moda', '% en la moda', '% sobre la moda'],
      cat.map(function (c) { return [c.categoria, F.num(c.n), F.num(c.pct, 1), F.pesosM(c.media), F.pesosM(c.mediana), F.pesosM(c.moda), F.pesosM(c.ric), F.pesosM(c.p90), F.num(c.bajo, 1), F.num(c.en, 1), F.num(c.sobre, 1)]; }));
  })();

  // ---- tablas de asociación
  (function () {
    function pares(cont, M, cab) {
      var f = []; M.vars.forEach(function (a, i) { M.vars.forEach(function (b, j) { if (j > i) f.push([a + ' y ' + b.toLowerCase(), F.num(M.m[i][j], 3)]); }); });
      G.tabla(cont, ['Variables', cab], f); cont.classList.add('pares');
    }
    pares($('t-spearman'), D.spearman, 'ρ'); pares($('t-cramer'), D.cramer, 'V');
    var nom = { esc: 'Escolaridad', edad: 'Edad', horas_trab: 'Horas', sexo_f: 'Sexo', tam_empresa: 'Tamaño de empresa', nivel_edu: 'Nivel educacional' };
    var terms = []; D.gvif.forEach(function (g) { if (terms.indexOf(g.termino) < 0) terms.push(g.termino); });
    G.tabla($('t-gvif'), ['Término', 'A', 'B'], terms.map(function (t) {
      var a = D.gvif.filter(function (g) { return g.esp === 'A' && g.termino === t; })[0], b = D.gvif.filter(function (g) { return g.esp === 'B' && g.termino === t; })[0];
      return [nom[t] || t, a ? F.num(a.aj, 3) : '', b ? F.num(b.aj, 3) : ''];
    }));
  })();

  // ================================================================= 2. REGRESIÓN NORMAL
  (function () {
    var R = D.mco.res, cont = plot('f-mco'), nn = N;
    G.claves(ley('f-mco'), [{ tipo: 'barra', color: C.obs, texto: 'Residuos estandarizados' }, { tipo: 'linea', color: C.mco, texto: 'Normal estándar' }]);
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 2);
      // (a) histograma
      var L = G.lienzo(ps[0], { alto: function (w) { return Math.max(230, Math.min(330, w * 0.72)); }, m: { t: 24, r: 8, b: 38, l: 40 } });
      var bs = R.c.map(function (c, i) { return { a: R.bordes[i], b: R.bordes[i + 1], c: c, v: c / (nn * 0.2) }; });
      var x = G.escala(-3, 8, 0, L.w), y = G.escala(0, Math.max(0.5, max(bs.map(function (b) { return b.v; })) * 1.05), L.h, 0);
      G.ejeY(L, y, { n: 4 }); G.ejeX(L, x, { ticks: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8], dec: 0, titulo: 'Residuo estandarizado' });
      tx(L.g, 0, -10, '(a) Histograma y densidad', { 'class': 'titulo-panel' });
      barras(L, x, y, bs, C.obs);
      var pts = []; for (var v = -3; v <= 8; v += 0.02) pts.push([v, M.normPdf(v)]);
      G.linea(L, pts, x, y, { stroke: C.mco, 'stroke-width': 1.8 });
      var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
      G.conTip(hov, function (ev) {
        var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), b = bs.filter(function (q) { return xv > q.a && xv <= q.b; })[0];
        if (!b) return '';
        return G.filas([['Entre ' + F.num(b.a, 1) + ' y ' + F.num(b.b, 1)], ['Residuos', F.num(b.c)], ['Porcentaje', F.pct(100 * b.c / nn, 2)], ['Normal estándar', F.pct(100 * (M.normCdf(b.b) - M.normCdf(b.a)), 2)]]);
      });
      // (b) Q-Q
      var L2 = G.lienzo(ps[1], { alto: function (w) { return Math.max(230, Math.min(330, w * 0.72)); }, m: { t: 24, r: 8, b: 38, l: 40 } });
      var qx = R.qq_i.map(function (i) { return M.normQ((i + 0.5) / nn); });
      var x2 = G.escala(-4.5, 4.5, 0, L2.w), y2 = G.escala(-5, 35, L2.h, 0);
      G.ejeY(L2, y2, { ticks: [-5, 0, 5, 10, 15, 20, 25, 30, 35], dec: 0 }); G.ejeX(L2, x2, { ticks: [-4, -2, 0, 2, 4], dec: 0, titulo: 'Cuantil de la normal estándar' });
      tx(L2.g, 0, -10, '(b) Gráfico Q-Q normal', { 'class': 'titulo-panel' });
      el('line', { x1: x2(-4.5), y1: y2(-4.5), x2: x2(4.5), y2: y2(4.5), stroke: C.obs2, 'stroke-dasharray': '4 3' }, L2.g);
      var g = el('g', { fill: C.mco, 'fill-opacity': 0.55 }, L2.g);
      R.qq_v.forEach(function (v, k) { el('circle', { cx: x2(qx[k]).toFixed(1), cy: y2(v).toFixed(1), r: 1.7 }, g); });
    });
    $('mco-nota').textContent = 'Quedan fuera del histograma ' + R.izq + ' residuos menores que −3 y ' + R.der + ' mayores que 8. El gráfico Q-Q muestra los 500 residuos menores, los 500 mayores y uno de cada 50 del resto.';
    var aj = D.mco.ajuste;
    G.tabla($('t-mco'), ['', 'Especificación A', 'Especificación B'], [
      ['Parámetros (con σ)', aj[0].p + 1, aj[1].p + 1], ['<i>R</i><sup>2</sup> ajustado', F.num(aj[0].r2, 3), F.num(aj[1].r2, 3)],
      ['Log-verosimilitud ℓ', F.num(aj[0].loglik, 2), F.num(aj[1].loglik, 2)], ['AIC', F.num(aj[0].aic, 2), F.num(aj[1].aic, 2)], ['BIC', F.num(aj[0].bic, 2), F.num(aj[1].bic, 2)],
      ['σ̂ (millones de pesos)', F.num(aj[0].sigma, 4), F.num(aj[1].sigma, 4)], ['% de residuos sobre 3', F.num(aj[0].pct3, 2), F.num(aj[1].pct3, 2)]]);
  })();

  // ================================================================= 3. EXPLORADOR TP-SMN
  (function () {
    var cont = plot('f-explorador'), est = {}, st = { fam: 'T', alpha: -0.557, nu: 1.33, tau: 0.3 };
    D.modelos.forEach(function (m) { if (m.esp === 'B' && m.tipo === 'TP') est[m.fam] = m; });
    var rangos = { T: [0.5, 30, 0.01, 'Grados de libertad ν'], SL: [0.3, 10, 0.01, 'Parámetro de colas ν'], CN: [0.01, 0.99, 0.005, 'Proporción ν'] };
    var aIn = $('ex-alpha'), nIn = $('ex-nu'), tIn = $('ex-tau');
    function ajustarControles() {
      var r = rangos[st.fam];
      $('ex-nu-campo').hidden = !r; $('ex-tau-campo').hidden = st.fam !== 'CN';
      if (r) { nIn.min = r[0]; nIn.max = r[1]; nIn.step = r[2]; $('ex-nu-rot').textContent = r[3]; st.nu = Math.min(r[1], Math.max(r[0], st.nu)); nIn.value = st.nu; }
      tIn.value = st.tau; aIn.value = st.alpha;
      $('ex-est').disabled = false;
    }
    function usarEstimacion() {
      var m = est[st.fam]; st.alpha = m.alpha;
      if (m.nu !== null) st.nu = m.nu;
      if (m.tau !== null) st.tau = m.tau;
      ajustarControles(); dibujar();
    }
    segmento($('ex-fam'), 'exfam', ORDEN_FAM.map(function (f) { return { v: f, t: f === 'T' ? '<i>t</i>' : FAM[f] }; }), st.fam, function (v) {
      st.fam = v; var m = est[v]; st.alpha = m.alpha; if (m.nu !== null) st.nu = m.nu; if (m.tau !== null) st.tau = m.tau; ajustarControles(); dibujar();
    });
    aIn.addEventListener('input', function () { st.alpha = +aIn.value; dibujar(); });
    nIn.addEventListener('input', function () { st.nu = +nIn.value; dibujar(); });
    tIn.addEventListener('input', function () { st.tau = +tIn.value; dibujar(); });
    $('ex-est').addEventListener('click', usarEstimacion);
    function par() { return { nu: st.nu, tau: st.tau }; }
    function dibujar() {
      $('ex-alpha-o').textContent = F.num(st.alpha, 3); $('ex-nu-o').textContent = F.num(st.nu, st.fam === 'CN' ? 3 : 2); $('ex-tau-o').textContent = F.num(st.tau, 3);
      cont.innerHTML = '';
      var T = M.tp(st.fam, 1, st.alpha, par()), S = M.tp(st.fam, 1, 0, par());
      var L = G.lienzo(cont, { alto: function (w) { return Math.max(240, Math.min(330, w * 0.56)); }, m: { t: 24, r: 10, b: 38, l: 40 } });
      var xa = -6, xb = 10, x = G.escala(xa, xb, 0, L.w), pts = [], ptsS = [], ym = 0;
      for (var i = 0; i <= 400; i++) { var v = xa + (xb - xa) * i / 400, d = T.dens(v), ds = S.dens(v); pts.push([v, d]); ptsS.push([v, ds]); ym = Math.max(ym, d, ds); }
      var y = G.escala(0, ym * 1.1, L.h, 0);
      G.ejeY(L, y, { n: 4 }); G.ejeX(L, x, { ticks: [-6, -4, -2, 0, 2, 4, 6, 8, 10], dec: 0, titulo: 'Error estándar (σ = 1)' });
      var izq = pts.filter(function (p) { return p[0] <= 0; }), der = pts.filter(function (p) { return p[0] >= 0; });
      G.area(L, izq.concat([[0, T.dens(0)]]), x, y, 0, { fill: C.mco, 'fill-opacity': 0.14 });
      G.area(L, [[0, T.dens(0)]].concat(der), x, y, 0, { fill: C.naranja, 'fill-opacity': 0.2 });
      G.linea(L, ptsS, x, y, { stroke: C.obs2, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' });
      G.linea(L, pts, x, y, { stroke: C.tinta, 'stroke-width': 2.2 });
      el('line', { x1: x(0), x2: x(0), y1: y(T.dens(0)), y2: L.h, stroke: C.tinta, 'stroke-width': 1 }, L.g);
      var pb = (1 + st.alpha) / 2;
      tx(L.g, x(0) - 8, 4, F.pct(100 * pb) + ' bajo la moda', { 'text-anchor': 'end', 'class': 'etq', 'font-weight': 600 });
      tx(L.g, x(0) + 8, 4, F.pct(100 * (1 - pb)) + ' sobre la moda', { 'class': 'etq', 'font-weight': 600 });
      var med = T.cuantil(0.5), media = T.media(), varf = M.varFinita(st.fam, par());
      var l = [['Proporción bajo la moda', F.pct(100 * pb)], ['Escala bajo / sobre la moda', F.num(1 + st.alpha, 3) + ' / ' + F.num(1 - st.alpha, 3)],
        ['Mediana del error', F.num(med, 3)], ['Media del error', isFinite(media) ? F.num(media, 3) + '<small>' + (varf ? 'varianza finita' : 'varianza infinita') + '</small>' : 'No existe<small>ni la varianza</small>']];
      $('ex-lecturas').innerHTML = l.map(function (q) { return '<div class="lectura">' + q[0] + '<b>' + q[1] + '</b></div>'; }).join('');
      var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
      G.conTip(hov, function (ev) {
        var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l);
        return G.filas([['Error = ' + F.num(xv, 2)], ['Densidad de dos piezas', F.num(T.dens(xv), 4)], ['Densidad simétrica', F.num(S.dens(xv), 4)], ['P(error ≤ valor)', F.pct(100 * T.cdf(xv))]]);
      });
    }
    ajustarControles();
    G.adaptable(cont, dibujar);
  })();

  // ================================================================= 4. VEINTE MODELOS
  var MB = D.modelos.filter(function (m) { return m.esp === 'B'; });
  function modeloTP(m) { return M.tp(m.fam, Math.sqrt(m.sigma2), m.alpha || 0, { nu: m.nu, tau: m.tau }); }
  function ordenB() { var o = []; ['SMN', 'TP'].forEach(function (t) { ORDEN_FAM.forEach(function (f) { o.push(MB.filter(function (m) { return m.tipo === t && m.fam === f; })[0]); }); }); return o; }

  // ---- BIC
  (function () {
    var cont = plot('f-bic');
    G.claves(ley('f-bic'), [{ tipo: 'hueco', color: C.mco, texto: 'Simétrica (SMN)' }, { tipo: 'punto', color: C.mco, texto: 'Dos piezas (TP-SMN)' }, { tipo: 'punto', color: C.comun, texto: 'Menor BIC: TP-<i>t</i>, especificación B' }]);
    function bic(esp, tipo, fam) { return D.modelos.filter(function (m) { return m.esp === esp && m.tipo === tipo && m.fam === fam; })[0]; }
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 2); cont.className = 'fig-plot rejilla-2';
      ['A', 'B'].forEach(function (esp, k) {
        var fila = 34, L = G.lienzo(ps[k], { alto: 5 * fila + 66, m: { t: 26, r: 14, b: 40, l: k === 0 || ps[0].offsetTop !== ps[1].offsetTop ? 128 : 128 } });
        var x = G.escala(20000, 100000, 0, L.w);
        G.ejeX(L, x, { ticks: [20000, 40000, 60000, 80000, 100000], formato: function (v) { return F.num(v / 1000) + ' mil'; }, rejilla: true, titulo: 'BIC' });
        tx(L.g, -L.m.l, -10, esp === 'A' ? 'Especificación A: años de escolaridad' : 'Especificación B: nivel educacional', { 'class': 'titulo-panel' });
        ORDEN_FAM.forEach(function (f, i) {
          var yc = i * fila + fila / 2, s = bic(esp, 'SMN', f), t = bic(esp, 'TP', f);
          tx(L.g, -10, yc + 4, f === 'T' ? 't' : FAM[f], { 'text-anchor': 'end', 'class': 'etq-2', 'font-style': f === 'T' ? 'italic' : null });
          el('line', { x1: x(s.bic), x2: x(t.bic), y1: yc, y2: yc, stroke: '#aab2bc', 'stroke-width': 1.5 }, L.g);
          var col = t.sel ? C.comun : C.mco;
          var c1 = el('circle', { cx: x(s.bic), cy: yc, r: 5.5, fill: '#fff', stroke: C.mco, 'stroke-width': 1.8 }, L.g);
          var c2 = el('circle', { cx: x(t.bic), cy: yc, r: 6, fill: col, stroke: '#fff', 'stroke-width': 1.5 }, L.g);
          [[c1, s], [c2, t]].forEach(function (q) {
            G.conTip(q[0], function () { return G.filas([[nombreTxt(q[1]) + ', especificación ' + esp], ['Parámetros', q[1].m], ['Log-verosimilitud', F.num(q[1].loglik, 2)], ['BIC', F.num(q[1].bic, 2)]]); });
          });
          if (t.sel) tx(L.g, x(t.bic), yc - 11, 'Menor BIC', { 'class': 'etq', 'text-anchor': 'middle', fill: C.comun, style: 'fill:' + C.comun, 'font-weight': 600 });
        });
      });
    });
    var filasT = ORDEN_FAM.map(function (f) { return [FAM[f]].concat(['A', 'B'].reduce(function (a, e) { return a.concat([F.num(bic(e, 'SMN', f).bic, 2), F.num(bic(e, 'TP', f).bic, 2)]); }, [])); });
    G.tabla(tablaFig('f-bic'), ['Distribución', 'A simétrica', 'A dos piezas', 'B simétrica', 'B dos piezas'], filasT);
  })();

  // ---- tabla de ajuste
  (function () {
    var esp = 'B';
    function dibujar() {
      var ms = D.modelos.filter(function (m) { return m.esp === esp; });
      ms.sort(function (a, b) { return a.bic - b.bic; });
      G.tabla($('t-modelos'), ['Modelo', 'm', 'ℓ', 'AIC', 'BIC', 'σ̂²', 'α̂', 'ν̂', 'τ̂', 'Iteraciones'], ms.map(function (m) {
        return [nombreModelo(m), m.m, F.num(m.loglik, 2), F.num(m.aic, 2), F.num(m.bic, 2), F.num(m.sigma2, 5), m.tipo === 'TP' ? F.num(m.alpha, 3) : '0', m.nu === null ? '' : F.num(m.nu, 3), m.tau === null ? '' : F.num(m.tau, 3), m.iter];
      }), { clase: function (k) { return ms[k].sel ? 'destacada' : ''; } });
    }
    segmento($('tm-esp'), 'tmesp', [{ v: 'A', t: 'Especificación A' }, { v: 'B', t: 'Especificación B' }], esp, function (v) { esp = v; dibujar(); });
    dibujar();
  })();

  // ---- residuos y densidad (10 paneles)
  (function () {
    var cont = plot('f-ajuste'), ancho = 0.05, ms = ordenB();
    var pv = ms.map(function (m) { return m.pct_ventana; });
    $('aj-pct').textContent = 'entre el ' + F.pct(min(pv)) + ' y el ' + F.pct(max(pv));
    G.claves(ley('f-ajuste'), [{ tipo: 'barra', color: C.obs, texto: 'Residuos' }, { tipo: 'linea', color: C.mco, texto: 'Densidad ajustada del error' }, { tipo: 'linea', color: C.comun, texto: 'TP-<i>t</i>: menor BIC' }]);
    segmento($('aj-ancho'), 'ajancho', [{ v: 0.02, t: '$20.000' }, { v: 0.05, t: '$50.000' }, { v: 0.1, t: '$100.000' }], ancho, function (v) { ancho = v; dibujar(); });
    function dibujar() {
      var ps = G.paneles(cont, 10), datos = ms.map(function (m) {
        var bs = reagrupar(m.res, ancho, -1, 2).map(function (b) { b.v = b.c / (N * ancho); return b; });
        var T = modeloTP(m), pts = []; for (var i = 0; i <= 300; i++) { var v = -1 + 3 * i / 300; pts.push([v, T.dens(v)]); }
        return { m: m, bs: bs, pts: pts, T: T };
      });
      var ym = max(datos.map(function (d) { return Math.max(max(d.bs.map(function (b) { return b.v; })), max(d.pts.map(function (p) { return p[1]; }))); }));
      datos.forEach(function (d, k) {
        var izq = k % 5 === 0, L = G.lienzo(ps[k], { alto: function (w) { return Math.max(150, Math.min(220, w * 0.95)); }, m: { t: 22, r: 4, b: 30, l: izq ? 30 : 10 } });
        var x = G.escala(-1, 2, 0, L.w), y = G.escala(0, ym * 1.04, L.h, 0);
        G.ejeY(L, y, { ticks: [0, 1, 2, 3, 4].filter(function (t) { return t <= ym * 1.04; }), formato: function (t) { return izq ? F.num(t) : ''; } });
        G.ejeX(L, x, { ticks: [-1, 0, 1, 2], dec: 0 });
        var col = d.m.sel ? C.comun : C.mco;
        tx(L.g, 0, -8, '', { 'class': 'titulo-panel' }).innerHTML = (d.m.tipo === 'TP' ? 'TP-' : '') + (d.m.fam === 'T' ? '<tspan font-style="italic">t</tspan>' : FAM[d.m.fam]);
        barras(L, x, y, d.bs, C.obs);
        el('line', { x1: x(0), x2: x(0), y1: 0, y2: L.h, stroke: C.tinta3, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, L.g);
        G.linea(L, d.pts, x, y, { stroke: col, 'stroke-width': d.m.sel ? 2.4 : 1.7 });
        var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
        G.conTip(hov, function (ev) {
          var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), b = d.bs.filter(function (q) { return xv > q.a && xv <= q.b; })[0];
          if (!b) return '';
          return G.filas([[nombreTxt(d.m)], ['Residuo entre', F.pesos(b.a * 1e6) + ' y ' + F.pesos(b.b * 1e6)], ['Observado', F.pct(100 * b.c / N)], ['Según el modelo', F.pct(100 * (d.T.cdf(b.b) - d.T.cdf(b.a)))]]);
        });
      });
    }
    G.adaptable(cont, dibujar);
  })();

  // ---- Q-Q de residuos cuantílicos (10 paneles)
  (function () {
    var cont = plot('f-qq'), ms = ordenB(), xt = D.qq_teorico;
    var ya = min(ms.map(function (m) { return min(m.qq); })), yb = max(ms.map(function (m) { return max(m.qq); }));
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 10);
      ms.forEach(function (m, k) {
        var izq = k % 5 === 0, L = G.lienzo(ps[k], { alto: function (w) { return Math.max(150, Math.min(220, w * 0.95)); }, m: { t: 22, r: 4, b: 30, l: izq ? 30 : 10 } });
        var x = G.escala(-3.3, 3.3, 0, L.w), y = G.escala(Math.floor(ya), Math.ceil(yb), L.h, 0);
        G.ejeY(L, y, { ticks: G.ticks(Math.floor(ya), Math.ceil(yb), 4), formato: function (t) { return izq ? F.num(t) : ''; } });
        G.ejeX(L, x, { ticks: [-3, 0, 3], dec: 0 });
        tx(L.g, 0, -8, '', { 'class': 'titulo-panel' }).innerHTML = (m.tipo === 'TP' ? 'TP-' : '') + (m.fam === 'T' ? '<tspan font-style="italic">t</tspan>' : FAM[m.fam]);
        el('line', { x1: x(-3.3), y1: y(-3.3), x2: x(3.3), y2: y(3.3), stroke: C.obs2, 'stroke-dasharray': '3 3' }, L.g);
        G.linea(L, m.qq.map(function (v, i) { return [xt[i], v]; }), x, y, { stroke: m.sel ? C.comun : C.mco, 'stroke-width': m.sel ? 2.4 : 1.7 });
        tx(L.g, L.w - 2, L.h - 8, 'D = ' + F.num(m.diag.D, 3), { 'text-anchor': 'end', 'class': 'sub-panel', 'font-weight': m.sel ? 600 : 400 });
        var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
        G.conTip(hov, function (ev) {
          var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), i = 0;
          xt.forEach(function (v, j) { if (Math.abs(v - xv) < Math.abs(xt[i] - xv)) i = j; });
          return G.filas([[nombreTxt(m)], ['Orden', F.num(D.qq_orden[i], D.qq_orden[i] < 0.01 || D.qq_orden[i] > 0.99 ? 4 : 2)], ['Normal estándar', F.num(xt[i], 3)], ['Residuo cuantílico', F.num(m.qq[i], 3)]]);
        });
      });
    });
    G.tabla($('t-residuos'), ['Modelo', 'Media', 'Desv. estándar', 'Asimetría', 'Curtosis', '% |q| > 2', '% |q| > 3', '<i>D</i>'], ms.map(function (m) {
      var g = m.diag; return [nombreModelo(m), F.num(g.media, 3), F.num(g.de, 3), F.num(g.asim, 3), F.num(g.curt, 3), F.num(g.p2, 2), F.num(g.p3, 2), F.num(g.D, 3)];
    }), { clase: function (k) { return ms[k].sel ? 'destacada' : ''; } });
  })();

  // ================================================================= 5. ESCALA POR NIVEL
  var E = D.escala, NJ = E.n_nivel;
  function errorNivel(mod, j) { var e = E[mod]; return M.tp('T', Math.sqrt(e.s2[j]), e.alpha, { nu: e.nu }); }
  var NIVT = NIV.concat(['Total']);

  // ---- residuos cuantílicos por nivel (media ± DE)
  (function () {
    var cont = plot('f-resnivel'), R = E.residuos_nivel;
    G.claves(ley('f-resnivel'), [{ tipo: 'punto', color: C.comun, texto: 'Escala común' }, { tipo: 'punto', color: C.nivel, texto: 'Escala por nivel' }]);
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var fila = 34, ml = cont.clientWidth < 460 ? 118 : 138, L = G.lienzo(cont, { alto: NIVT.length * fila + 44, m: { t: 6, r: 12, b: 38, l: ml } });
      var x = G.escala(-1.25, 2.4, 0, L.w);
      G.ejeX(L, x, { ticks: [-1, 0, 1, 2], dec: 0, rejilla: true, titulo: 'Residuo cuantílico' });
      [-1, 1].forEach(function (v) { el('line', { x1: x(v), x2: x(v), y1: 0, y2: L.h, stroke: C.obs2, 'stroke-dasharray': '3 3' }, L.g); });
      el('line', { x1: x(0), x2: x(0), y1: 0, y2: L.h, stroke: C.tinta3, 'stroke-width': 1 }, L.g);
      NIVT.forEach(function (nv, i) {
        var yc = i * fila + fila / 2;
        tx(L.g, -10, yc + 4, nv === 'Total' ? 'Todos los niveles' : nv, { 'text-anchor': 'end', 'class': 'etq-2', 'font-weight': nv === 'Total' ? 600 : null });
        ['comun', 'nivel'].forEach(function (mod, k) {
          var r = R[mod][i], yy = yc + (k === 0 ? -6 : 6), col = C[mod];
          el('line', { x1: x(r.media - r.de), x2: x(r.media + r.de), y1: yy, y2: yy, stroke: col, 'stroke-width': 2 }, L.g);
          var c = el('circle', { cx: x(r.media), cy: yy, r: 4.5, fill: col, stroke: '#fff', 'stroke-width': 1.2 }, L.g);
          G.conTip(c, function () { return G.filas([[nv === 'Total' ? 'Todos los niveles' : nv], [MOD[mod]], ['Media', F.num(r.media, 3)], ['Desviación estándar', F.num(r.de, 3)], ['% con |q| > 2', F.num(r.p2, 2)], ['<i>D</i>', F.num(r.D, 3)]]); });
        });
      });
    });
    G.tabla(tablaFig('f-resnivel'), ['Nivel', 'Común: media', 'Común: DE', 'Común: <i>D</i>', 'Por nivel: media', 'Por nivel: DE', 'Por nivel: <i>D</i>'], NIVT.map(function (nv, i) {
      var a = R.comun[i], b = R.nivel[i]; return [nv === 'Total' ? 'Todos los niveles' : nv, F.num(a.media, 3), F.num(a.de, 3), F.num(a.D, 3), F.num(b.media, 3), F.num(b.de, 3), F.num(b.D, 3)];
    }));
  })();

  // ---- pesos por nivel (cajas)
  (function () {
    var cont = plot('f-pesos'), P = E.pesos_nivel;
    G.claves(ley('f-pesos'), [{ tipo: 'barra', color: C.comunClaro, texto: 'Escala común' }, { tipo: 'barra', color: C.nivelClaro, texto: 'Escala por nivel' }]);
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var fila = 34, ml = cont.clientWidth < 460 ? 118 : 138, L = G.lienzo(cont, { alto: NIVT.length * fila + 44, m: { t: 6, r: 12, b: 38, l: ml } });
      var x = G.escala(0, 1.8, 0, L.w);
      G.ejeX(L, x, { ticks: [0, 0.5, 1, 1.5], dec: 1, rejilla: true, titulo: 'Peso û' });
      el('line', { x1: x(0.5), x2: x(0.5), y1: 0, y2: L.h, stroke: C.tinta3, 'stroke-dasharray': '2 3' }, L.g);
      NIVT.forEach(function (nv, i) {
        var yc = i * fila + fila / 2;
        tx(L.g, -10, yc + 4, nv === 'Total' ? 'Todos los niveles' : nv, { 'text-anchor': 'end', 'class': 'etq-2', 'font-weight': nv === 'Total' ? 600 : null });
        ['comun', 'nivel'].forEach(function (mod, k) {
          var r = P[mod][i], yy = yc + (k === 0 ? -6.5 : 6.5), col = C[mod], claro = mod === 'comun' ? C.comunClaro : C.nivelClaro, g = el('g', null, L.g);
          el('line', { x1: x(r.p5), x2: x(r.p95), y1: yy, y2: yy, stroke: col, 'stroke-width': 1.2 }, g);
          el('rect', { x: x(r.p25), y: yy - 5, width: Math.max(1, x(r.p75) - x(r.p25)), height: 10, fill: claro, stroke: col, 'stroke-width': 1 }, g);
          el('line', { x1: x(r.p50), x2: x(r.p50), y1: yy - 5, y2: yy + 5, stroke: col, 'stroke-width': 2.2 }, g);
          var hit = el('rect', { x: 0, y: yy - 6.5, width: L.w, height: 13, 'class': 'zona-hover' }, g);
          G.conTip(hit, function () { return G.filas([[(nv === 'Total' ? 'Todos los niveles' : nv) + ', ' + MOD[mod].toLowerCase()], ['Percentil 5', F.num(r.p5, 3)], ['Percentil 25', F.num(r.p25, 3)], ['Mediana', F.num(r.p50, 3)], ['Percentil 75', F.num(r.p75, 3)], ['Percentil 95', F.num(r.p95, 3)], ['% con peso < 1/2', F.num(r.bajo, 1)]]); });
        });
      });
    });
    var filasT = []; NIVT.forEach(function (nv, i) { ['comun', 'nivel'].forEach(function (mod) { var r = P[mod][i]; filasT.push([nv === 'Total' ? 'Todos los niveles' : nv, MOD[mod], F.num(r.p5, 3), F.num(r.p25, 3), F.num(r.p50, 3), F.num(r.p75, 3), F.num(r.p95, 3), F.num(r.medio, 3), F.num(r.bajo, 1)]); }); });
    G.tabla(tablaFig('f-pesos'), ['Nivel', 'Modelo', 'P5', 'P25', 'Mediana', 'P75', 'P95', 'Media', '% < 1/2'], filasT, { txt: [1] });
  })();

  // ---- tabla de comparación
  (function () {
    var c = E.comparacion;
    G.tabla($('t-escala'), ['', 'Escala común', 'Escala por nivel'], [
      ['Parámetros m', c[0].m, c[1].m], ['Log-verosimilitud ℓ', F.num(c[0].loglik, 2), F.num(c[1].loglik, 2)], ['AIC', F.num(c[0].aic, 2), F.num(c[1].aic, 2)],
      ['BIC', F.num(c[0].bic, 2), F.num(c[1].bic, 2)], ['Diferencia de BIC', '', F.num(c[1].dbic, 2)], ['α̂', F.num(c[0].alpha, 3), F.num(c[1].alpha, 3)],
      ['ν̂', F.num(c[0].nu, 3), F.num(c[1].nu, 3)], ['Iteraciones', c[0].iter, c[1].iter]]);
  })();

  // ---- residuos totales y densidad (2 paneles)
  (function () {
    var cont = plot('f-total');
    G.claves(ley('f-total'), [{ tipo: 'barra', color: C.obs, texto: 'Residuos' }, { tipo: 'linea', color: C.comun, texto: 'Escala común' }, { tipo: 'linea', color: C.nivel, texto: 'Escala por nivel (mezcla)' }]);
    var lo = E.comun.hist_total.k0 / 100, hi = (E.comun.hist_total.k0 + E.comun.hist_total.c.length) / 100;
    function cdfMod(mod, v) { var s = 0; for (var j = 0; j < 7; j++) s += NJ[j] / N * errorNivel(mod, j).cdf(v); return s; }
    function densMod(mod, v) { var s = 0; for (var j = 0; j < 7; j++) s += NJ[j] / N * errorNivel(mod, j).dens(v); return s; }
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 2), datos = ['comun', 'nivel'].map(function (mod) {
        var bs = reagrupar(E[mod].hist_total, 0.05, lo, hi).map(function (b) { b.v = b.c / (N * 0.05); return b; }), pts = [];
        for (var i = 0; i <= 400; i++) { var v = lo + (hi - lo) * i / 400; pts.push([v, densMod(mod, v)]); }
        pts.push([0, densMod(mod, 0)]); pts.sort(function (a, b) { return a[0] - b[0]; });
        return { mod: mod, bs: bs, pts: pts };
      });
      var ym = max(datos.map(function (d) { return Math.max(max(d.bs.map(function (b) { return b.v; })), max(d.pts.map(function (p) { return p[1]; }))); }));
      datos.forEach(function (d, k) {
        var L = G.lienzo(ps[k], { alto: function (w) { return Math.max(200, Math.min(280, w * 0.7)); }, m: { t: 22, r: 6, b: 38, l: 32 } });
        var x = G.escala(lo, hi, 0, L.w), y = G.escala(0, ym * 1.05, L.h, 0);
        G.ejeY(L, y, { n: 4 }); G.ejeX(L, x, { n: 5, titulo: 'Residuo (millones de pesos)' });
        tx(L.g, 0, -8, MOD[d.mod], { 'class': 'titulo-panel' });
        barras(L, x, y, d.bs, C.obs);
        el('line', { x1: x(0), x2: x(0), y1: 0, y2: L.h, stroke: C.tinta3, 'stroke-dasharray': '3 3' }, L.g);
        G.linea(L, d.pts, x, y, { stroke: C[d.mod], 'stroke-width': 2.2 });
        var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
        G.conTip(hov, function (ev) {
          var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), b = d.bs.filter(function (q) { return xv > q.a && xv <= q.b; })[0];
          if (!b) return '';
          return G.filas([[MOD[d.mod]], ['Residuo entre', F.pesos(b.a * 1e6) + ' y ' + F.pesos(b.b * 1e6)], ['Observado', F.pct(100 * b.c / N)], ['Según el modelo', F.pct(100 * (cdfMod(d.mod, b.b) - cdfMod(d.mod, b.a)))]]);
        });
      });
    });
  })();

  // ---- Q-Q por nivel (8 paneles)
  (function () {
    var cont = plot('f-qqnivel'), xt = D.qq_nivel_teorico, R = E.residuos_nivel;
    G.claves(ley('f-qqnivel'), [{ tipo: 'discontinua', color: C.comun, texto: 'Escala común' }, { tipo: 'linea', color: C.nivel, texto: 'Escala por nivel' }, { tipo: 'punteada', color: C.obs2, texto: 'Diagonal' }]);
    var todos = E.comun.qq.concat(E.nivel.qq), ya = Math.floor(min(todos.map(min))), yb = Math.ceil(max(todos.map(max)));
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 8), cols = getComputedStyle(cont).gridTemplateColumns.split(' ').length;
      NIVT.forEach(function (nv, j) {
        var izq = j % cols === 0, L = G.lienzo(ps[j], { alto: function (w) { return Math.max(170, Math.min(250, w * 0.92)); }, m: { t: 22, r: 6, b: 30, l: izq ? 28 : 10 } });
        var x = G.escala(-2.8, 2.8, 0, L.w), y = G.escala(ya, yb, L.h, 0);
        G.ejeY(L, y, { ticks: G.ticks(ya, yb, 4), formato: function (t) { return izq ? F.num(t) : ''; } });
        G.ejeX(L, x, { ticks: [-2, 0, 2], dec: 0 });
        tx(L.g, 0, -8, nv === 'Total' ? 'Todos los niveles' : nv, { 'class': 'titulo-panel' });
        el('line', { x1: x(-2.8), y1: y(-2.8), x2: x(2.8), y2: y(2.8), stroke: C.obs2, 'stroke-dasharray': '2 3' }, L.g);
        G.linea(L, E.comun.qq[j].map(function (v, i) { return [xt[i], v]; }), x, y, { stroke: C.comun, 'stroke-width': 1.8, 'stroke-dasharray': '5 3' });
        G.linea(L, E.nivel.qq[j].map(function (v, i) { return [xt[i], v]; }), x, y, { stroke: C.nivel, 'stroke-width': 2.2 });
        tx(L.g, L.w - 2, L.h - 22, 'D = ' + F.num(R.comun[j].D, 3), { 'text-anchor': 'end', 'class': 'sub-panel', fill: C.comun, style: 'fill:' + C.comun });
        tx(L.g, L.w - 2, L.h - 8, 'D = ' + F.num(R.nivel[j].D, 3), { 'text-anchor': 'end', 'class': 'sub-panel', fill: C.nivel, style: 'fill:#a85400' });
        var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
        G.conTip(hov, function (ev) {
          var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), i = 0;
          xt.forEach(function (v, k) { if (Math.abs(v - xv) < Math.abs(xt[i] - xv)) i = k; });
          return G.filas([[nv === 'Total' ? 'Todos los niveles' : nv], ['Orden', F.num(D.qq_nivel_orden[i], 3)], ['Normal estándar', F.num(xt[i], 3)], ['Escala común', F.num(E.comun.qq[j][i], 3)], ['Escala por nivel', F.num(E.nivel.qq[j][i], 3)]]);
        });
      });
    });
    G.tabla(tablaFig('f-qqnivel'), ['Nivel', 'Común: media', 'Común: DE', 'Común: % |q| > 2', 'Común: <i>D</i>', 'Por nivel: media', 'Por nivel: DE', 'Por nivel: % |q| > 2', 'Por nivel: <i>D</i>'], NIVT.map(function (nv, i) {
      var a = R.comun[i], b = R.nivel[i];
      return [nv === 'Total' ? 'Todos los niveles' : nv, F.num(a.media, 3), F.num(a.de, 3), F.num(a.p2, 2), F.num(a.D, 3), F.num(b.media, 3), F.num(b.de, 3), F.num(b.p2, 2), F.num(b.D, 3)];
    }));
  })();

  // ---- histogramas por nivel con densidad
  (function () {
    var cont = plot('f-histnivel'), mod = 'nivel';
    segmento($('hn-mod'), 'hnmod', [{ v: 'nivel', t: 'Escala por nivel' }, { v: 'comun', t: 'Escala común' }], mod, function (v) { mod = v; dibujar(); });
    function dibujar() {
      var ps = G.paneles(cont, 7);
      NIV.forEach(function (nv, j) {
        var h = E[mod].hist_nivel[j], lo = h.k0 / 100, hi = (h.k0 + h.c.length) / 100, rango = hi - lo;
        var ancho = [0.01, 0.02, 0.05, 0.1, 0.2].filter(function (w) { return rango / w <= 75; })[0] || 0.2;
        var bs = reagrupar(h, ancho, lo, hi).map(function (b) { b.v = b.c / (NJ[j] * ancho); return b; });
        var T = errorNivel(mod, j), pts = []; for (var i = 0; i <= 240; i++) { var v = lo + rango * i / 240; pts.push([v, T.dens(v)]); }
        pts.push([0, T.dens(0)]); pts.sort(function (a, b) { return a[0] - b[0]; });
        var ym = Math.max(max(bs.map(function (b) { return b.v; })), T.dens(0));
        var L = G.lienzo(ps[j], { alto: function (w) { return Math.max(160, Math.min(230, w * 0.82)); }, m: { t: 34, r: 6, b: 30, l: 30 } });
        var x = G.escala(lo, hi, 0, L.w), y = G.escala(0, ym * 1.05, L.h, 0);
        G.ejeY(L, y, { n: 3 }); G.ejeX(L, x, { n: 4 });
        tx(L.g, -L.m.l + 2, -20, nv, { 'class': 'titulo-panel' });
        tx(L.g, -L.m.l + 2, -6, 'Barras de ' + F.pesos(ancho * 1e6), { 'class': 'sub-panel' });
        barras(L, x, y, bs, C.obs);
        el('line', { x1: x(0), x2: x(0), y1: 0, y2: L.h, stroke: C.tinta3, 'stroke-dasharray': '3 3' }, L.g);
        G.linea(L, pts, x, y, { stroke: C[mod], 'stroke-width': 2.2 });
        var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
        G.conTip(hov, function (ev) {
          var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l), b = bs.filter(function (q) { return xv > q.a && xv <= q.b; })[0];
          if (!b) return '';
          return G.filas([[nv + ', ' + MOD[mod].toLowerCase()], ['Residuo entre', F.pesos(b.a * 1e6) + ' y ' + F.pesos(b.b * 1e6)], ['Observado', F.pct(100 * b.c / NJ[j])], ['Según el modelo', F.pct(100 * (T.cdf(b.b) - T.cdf(b.a)))]]);
        });
      });
    }
    G.adaptable(cont, dibujar);
  })();

  // ---- cuantiles observados y del modelo
  (function () {
    var cont = plot('f-cuantiles'), mod = 'nivel', Q = E.cuantiles;
    var xm = 0; ['comun', 'nivel'].forEach(function (m) { NIV.forEach(function (nv) { xm = Math.max(xm, max(Q[m][nv].obs), max(Q[m][nv].mod)); }); });
    segmento($('cu-mod'), 'cumod', [{ v: 'nivel', t: 'Escala por nivel' }, { v: 'comun', t: 'Escala común' }], mod, function (v) { mod = v; dibujar(); });
    function caja(g, x, q, yy, col, claro) {
      el('line', { x1: x(q[0]), x2: x(q[6]), y1: yy, y2: yy, stroke: col, 'stroke-width': 1.3 }, g);
      el('rect', { x: x(q[2]), y: yy - 6, width: Math.max(1.5, x(q[4]) - x(q[2])), height: 12, fill: claro, stroke: col, 'stroke-width': 1 }, g);
      el('line', { x1: x(q[3]), x2: x(q[3]), y1: yy - 6, y2: yy + 6, stroke: col, 'stroke-width': 2.2 }, g);
    }
    function dibujar() {
      cont.innerHTML = '';
      G.claves(ley('f-cuantiles'), [{ tipo: 'barra', color: C.obs, texto: 'Observado' }, { tipo: 'barra', color: mod === 'nivel' ? C.nivelClaro : C.comunClaro, texto: 'Según el modelo con ' + MOD[mod].toLowerCase() }]);
      var fila = 40, ml = cont.clientWidth < 460 ? 118 : 150, L = G.lienzo(cont, { alto: NIV.length * fila + 44, m: { t: 4, r: 14, b: 38, l: ml } });
      var x = G.escala(0, Math.ceil(xm), 0, L.w);
      G.ejeX(L, x, { n: 7, dec: 0, rejilla: true, titulo: 'Millones de pesos' });
      NIV.forEach(function (nv, i) {
        var yc = i * fila + fila / 2, q = Q[mod][nv], g = el('g', null, L.g);
        tx(L.g, -10, yc + 4, nv, { 'text-anchor': 'end', 'class': 'etq-2' });
        caja(g, x, q.obs, yc - 7, C.obs2, C.obs);
        caja(g, x, q.mod, yc + 7, C[mod], mod === 'nivel' ? C.nivelClaro : C.comunClaro);
        var hit = el('rect', { x: 0, y: yc - fila / 2, width: L.w, height: fila, 'class': 'zona-hover' }, g);
        G.conTip(hit, function () {
          return G.filas([[nv + ': observado / modelo']].concat(q.orden.map(function (o, k) { return ['Percentil ' + F.num(o * 100), F.pesosM(q.obs[k]) + ' / ' + F.pesosM(q.mod[k])]; })));
        });
      });
      var filasT = NIV.map(function (nv) { var q = Q[mod][nv]; return [nv].concat(q.orden.map(function (o, k) { return F.pesosM(q.obs[k]) + ' / ' + F.pesosM(q.mod[k]); })); });
      G.tabla(tablaFig('f-cuantiles'), ['Nivel (observado / modelo)'].concat(Q[mod][NIV[0]].orden.map(function (o) { return 'P' + F.num(o * 100); })), filasT);
    }
    G.adaptable(cont, dibujar);
  })();

  // ---- tabla del centro
  (function () {
    var Cn = E.centro;
    G.tabla($('t-centro'), ['Nivel', 'Común: % bajo la moda (obs. / modelo)', 'Común: % a menos de $50.000 (obs. / modelo)', 'Por nivel: % bajo la moda (obs. / modelo)', 'Por nivel: % a menos de $50.000 (obs. / modelo)'],
      NIVT.map(function (nv, i) {
        var a = Cn.comun[i], b = Cn.nivel[i];
        return [nv === 'Total' ? 'Todos los niveles' : nv, F.num(a.bajo_obs, 1) + ' / ' + F.num(a.bajo_mod, 1), F.num(100 * a.masa_obs, 1) + ' / ' + F.num(100 * a.masa_mod, 1),
          F.num(b.bajo_obs, 1) + ' / ' + F.num(b.bajo_mod, 1), F.num(100 * b.masa_obs, 1) + ' / ' + F.num(100 * b.masa_mod, 1)];
      }));
  })();

  // ================================================================= 6. INFERENCIA
  var INF = {}; D.inferencia.forEach(function (r) { (INF[r.modelo] = INF[r.modelo] || {})[r.par] = r; });
  var MCO = {}; D.mco.coef.forEach(function (r) { if (r.esp === 'B') MCO[r.par] = r; });
  var BETAS = [['(Intercept)', 'Intercepto'], ['nivel_eduMedia incompleta', 'Media incompleta'], ['nivel_eduMedia completa', 'Media completa'], ['nivel_eduSuperior incompleta', 'Superior incompleta'],
    ['nivel_eduTécnico completo', 'Técnico completo'], ['nivel_eduProfesional completo', 'Profesional completo'], ['nivel_eduPostgrado completo', 'Postgrado completo'],
    ['edad', 'Edad (por año)'], ['horas_trab', 'Horas semanales (por hora)'], ['sexo_fHombre', 'Hombre'], ['tam_empresaPequeña (10 a 49)', 'Pequeña (10 a 49)'],
    ['tam_empresaMediana (50 a 199)', 'Mediana (50 a 199)'], ['tam_empresaGrande (200 o más)', 'Grande (200 o más)']];

  // ---- coeficientes (bosque)
  (function () {
    var cont = plot('f-coef');
    G.claves(ley('f-coef'), [{ tipo: 'hueco', color: C.comun, texto: 'Escala común' }, { tipo: 'punto', color: C.nivel, texto: 'Escala por nivel' }]);
    var bloques = [['Nivel educacional (respecto de básica o menos)', BETAS.slice(1, 7)], ['Sexo y tamaño de empresa (respecto de mujer y microempresa)', BETAS.slice(9, 13)],
      ['Edad', [BETAS[7]]], ['Horas semanales', [BETAS[8]]]];
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 4);
      bloques.forEach(function (bl, k) {
        var fila = 40, ml = k >= 2 ? 80 : 138, vals = [];
        bl[1].forEach(function (b) { ['comun', 'nivel'].forEach(function (m) { var r = INF[m][b[0]]; vals.push(r.ic_inf * 1000, r.ic_sup * 1000); }); });
        var lo = Math.min(0, min(vals)), hi = max(vals), pad = (hi - lo) * 0.06;
        var L = G.lienzo(ps[k], { alto: bl[1].length * fila + 70, m: { t: 28, r: 16, b: 40, l: ml } });
        var x = G.escala(lo - (lo < 0 ? pad : 0), hi + pad, 0, L.w);
        var unidad = k >= 2 ? 'Pesos' : 'Miles de pesos', esc = k >= 2 ? 1000 : 1;
        G.ejeX(L, x, { n: 4, rejilla: true, titulo: unidad, formato: function (v) { return F.num(v * esc, k >= 2 ? 0 : (x.dom[1] - x.dom[0] < 50 ? 1 : 0)); } });
        tx(L.g, -ml, -12, bl[0], { 'class': 'titulo-panel' });
        if (x.dom[0] <= 0) el('line', { x1: x(0), x2: x(0), y1: 0, y2: L.h, stroke: C.tinta3 }, L.g);
        bl[1].forEach(function (b, i) {
          var yc = i * fila + fila / 2;
          tx(L.g, -10, yc + 4, k === 2 ? 'Por año' : k === 3 ? 'Por hora' : b[1], { 'text-anchor': 'end', 'class': 'etq-2' });
          ['comun', 'nivel'].forEach(function (m, j) {
            var r = INF[m][b[0]], yy = yc + (j === 0 ? -6 : 6), col = C[m];
            el('line', { x1: x(r.ic_inf * 1000), x2: x(r.ic_sup * 1000), y1: yy, y2: yy, stroke: col, 'stroke-width': 2 }, L.g);
            var c = el('circle', { cx: x(r.est * 1000), cy: yy, r: 4.6, fill: m === 'comun' ? '#fff' : col, stroke: col, 'stroke-width': 2 }, L.g);
            G.conTip(c, function () {
              var f = function (v) { return F.pesos(v * 1e6); };
              return G.filas([[b[1] + ', ' + MOD[m].toLowerCase()], ['Estimación', f(r.est)], ['Intervalo de 95 %', f(r.ic_inf) + ' a ' + f(r.ic_sup)], ['EE<sub>C</sub>', f(r.ee_c)]]);
            });
          });
        });
      });
    });
  })();

  // ---- tabla de coeficientes
  (function () {
    var ee = 'ee_c', NOM = { ee_c: 'EE<sub>C</sub>', ee_s: 'EE<sub>S</sub>', ee_i: 'EE<sub>I</sub>' };
    function mil(v) { return F.num(v * 1000, Math.abs(v) < 0.01 ? 2 : 1); }
    function dibujar() {
      var filasT = [], clases = [];
      filasT.push(['Coeficientes de regresión (miles de pesos)', '', '', '', '', '']); clases.push('grupo');
      BETAS.forEach(function (b) {
        var m0 = MCO[b[0]], a = INF.comun[b[0]], c = INF.nivel[b[0]];
        filasT.push([b[1], mil(m0.est) + ' (' + mil(m0.ee) + ')', mil(a.est) + ' (' + mil(a[ee]) + ')', mil(a.ic_inf) + ' a ' + mil(a.ic_sup), mil(c.est) + ' (' + mil(c[ee]) + ')', mil(c.ic_inf) + ' a ' + mil(c.ic_sup)]);
        clases.push('');
      });
      filasT.push(['Parámetros del error', '', '', '', '', '']); clases.push('grupo');
      var s0 = INF.comun.sigma2;
      filasT.push(['σ² (común)', '', F.num(s0.est, 5) + ' (' + F.num(s0[ee], 5) + ')', F.num(s0.ic_inf, 5) + ' a ' + F.num(s0.ic_sup, 5), '', '']); clases.push('');
      NIV.forEach(function (nv) { var r = INF.nivel['sigma2 [' + nv + ']']; filasT.push(['σ²: ' + nv.toLowerCase(), '', '', '', F.num(r.est, 5) + ' (' + F.num(r[ee], 5) + ')', F.num(r.ic_inf, 5) + ' a ' + F.num(r.ic_sup, 5)]); clases.push(''); });
      ['alpha', 'nu'].forEach(function (p) {
        var a = INF.comun[p], c = INF.nivel[p];
        filasT.push([p === 'alpha' ? 'α' : 'ν', '', F.num(a.est, 3) + ' (' + F.num(a[ee], 3) + ')', F.num(a.ic_inf, 3) + ' a ' + F.num(a.ic_sup, 3), F.num(c.est, 3) + ' (' + F.num(c[ee], 3) + ')', F.num(c.ic_inf, 3) + ' a ' + F.num(c.ic_sup, 3)]); clases.push('');
      });
      G.tabla($('t-coef'), ['Parámetro', 'Regresión normal', 'Escala común (' + NOM[ee] + ')', 'Intervalo de 95 %', 'Escala por nivel (' + NOM[ee] + ')', 'Intervalo de 95 %'], filasT, { clase: function (k) { return clases[k]; } });
    }
    segmento($('tc-ee'), 'tcee', [{ v: 'ee_c', t: 'Sándwich por conglomerado' }, { v: 'ee_s', t: 'Sándwich individual' }, { v: 'ee_i', t: 'Información observada' }], ee, function (v) { ee = v; dibujar(); });
    dibujar();
  })();

  // ---- razones entre errores estándar
  (function () {
    var cont = plot('f-razones'), pars = BETAS.concat([['alpha', 'α'], ['nu', 'ν']]);
    G.claves(ley('f-razones'), [{ tipo: 'hueco', color: C.comun, texto: 'Escala común' }, { tipo: 'punto', color: C.nivel, texto: 'Escala por nivel' }]);
    var todos = []; pars.forEach(function (p) { ['comun', 'nivel'].forEach(function (m) { todos.push(INF[m][p[0]].r1, INF[m][p[0]].r2); }); });
    G.adaptable(cont, function () {
      var ps = G.paneles(cont, 2), una = getComputedStyle(cont).gridTemplateColumns.split(' ').length === 1;
      [['r1', '(a) EE<tspan baseline-shift="sub" font-size="9">S</tspan> / EE<tspan baseline-shift="sub" font-size="9">I</tspan>'], ['r2', '(b) EE<tspan baseline-shift="sub" font-size="9">C</tspan> / EE<tspan baseline-shift="sub" font-size="9">S</tspan>']].forEach(function (rz, k) {
        var fila = 24, ml = (k === 0 || una) ? 150 : 12;
        var L = G.lienzo(ps[k], { alto: pars.length * fila + 64, m: { t: 24, r: 10, b: 40, l: ml } });
        var x = G.escala(0.8, Math.ceil(max(todos) * 2) / 2, 0, L.w);
        G.ejeX(L, x, { n: 5, rejilla: true, dec: 1 });
        tx(L.g, 0, -10, '', { 'class': 'titulo-panel' }).innerHTML = rz[1];
        el('line', { x1: x(1), x2: x(1), y1: 0, y2: L.h, stroke: C.tinta3, 'stroke-dasharray': '4 3' }, L.g);
        pars.forEach(function (p, i) {
          var yc = i * fila + fila / 2;
          if (ml > 20) tx(L.g, -10, yc + 4, p[1].replace(' (por año)', '').replace(' (por hora)', ''), { 'text-anchor': 'end', 'class': 'etq-2' });
          el('line', { x1: 0, x2: L.w, y1: yc, y2: yc, stroke: '#f0f2f4' }, L.g);
          ['comun', 'nivel'].forEach(function (m) {
            var r = INF[m][p[0]], c = el('circle', { cx: x(r[rz[0]]), cy: yc, r: 4.4, fill: m === 'comun' ? '#fff' : C[m], stroke: C[m], 'stroke-width': 2 }, L.g);
            G.conTip(c, function () { return G.filas([[p[1] + ', ' + MOD[m].toLowerCase()], ['EE<sub>S</sub> / EE<sub>I</sub>', F.num(r.r1, 2)], ['EE<sub>C</sub> / EE<sub>S</sub>', F.num(r.r2, 2)]]); });
          });
        });
      });
    });
  })();

  // ---- escalas por nivel con intervalos
  (function () {
    var cont = plot('f-escalas'), T = E.nivel_tab, c0 = T.comun[0];
    G.claves(ley('f-escalas'), [{ tipo: 'hueco', color: C.nivel, texto: 'Bajo la moda' }, { tipo: 'punto', color: C.nivel, texto: 'Sobre la moda' }, { tipo: 'discontinua', color: C.comun, texto: 'Escalas del modelo con escala común' }]);
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var fila = 36, ml = cont.clientWidth < 460 ? 118 : 138, L = G.lienzo(cont, { alto: NIV.length * fila + 44, m: { t: 8, r: 14, b: 38, l: ml } });
      var x = G.escala(0, 1300, 0, L.w);
      G.ejeX(L, x, { ticks: [0, 250, 500, 750, 1000, 1250], dec: 0, rejilla: true, titulo: 'Miles de pesos' });
      [c0.bajo, c0.sobre].forEach(function (v) { el('line', { x1: x(v * 1000), x2: x(v * 1000), y1: 0, y2: L.h, stroke: C.comun, 'stroke-dasharray': '5 3', 'stroke-width': 1.4 }, L.g); });
      T.nivel.forEach(function (r, i) {
        var yc = i * fila + fila / 2;
        tx(L.g, -10, yc + 4, r.nivel, { 'text-anchor': 'end', 'class': 'etq-2' });
        [['bajo', 'ee_bajo', -5, 'Bajo la moda'], ['sobre', 'ee_sobre', 5, 'Sobre la moda']].forEach(function (q) {
          var v = r[q[0]] * 1000, e = r[q[1]] * 1000, yy = yc + q[2];
          el('line', { x1: x(v - 1.96 * e), x2: x(v + 1.96 * e), y1: yy, y2: yy, stroke: C.nivel, 'stroke-width': 2 }, L.g);
          var c = el('circle', { cx: x(v), cy: yy, r: 4.4, fill: q[0] === 'bajo' ? '#fff' : C.nivel, stroke: C.nivel, 'stroke-width': 2 }, L.g);
          G.conTip(c, function () { return G.filas([[r.nivel + ': escala ' + q[3].toLowerCase()], ['Estimación', F.mil(v / 1000)], ['Intervalo de 95 %', F.mil((v - 1.96 * e) / 1000) + ' a ' + F.mil((v + 1.96 * e) / 1000)]]); });
        });
      });
    });
    G.tabla(tablaFig('f-escalas'), ['Nivel', 'σ̂<sub>j</sub>', 'Escala bajo la moda', 'Intervalo', 'Escala sobre la moda', 'Intervalo'], T.nivel.map(function (r) {
      return [r.nivel, F.mil(r.sigma), F.mil(r.bajo), F.mil(r.bajo - 1.96 * r.ee_bajo) + ' a ' + F.mil(r.bajo + 1.96 * r.ee_bajo), F.mil(r.sobre), F.mil(r.sobre - 1.96 * r.ee_sobre) + ' a ' + F.mil(r.sobre + 1.96 * r.ee_sobre)];
    }));
  })();

  // ---- moda, mediana y media por nivel
  (function () {
    var cont = plot('f-medidas'), mod = 'nivel', T = E.nivel_tab;
    segmento($('me-mod'), 'memod', [{ v: 'nivel', t: 'Escala por nivel' }, { v: 'comun', t: 'Escala común' }], mod, function (v) { mod = v; dibujar(); });
    function dibujar() {
      cont.innerHTML = '';
      var col = C[mod];
      G.claves(ley('f-medidas'), [{ tipo: 'hueco', color: col, texto: 'Moda (promedio del nivel)' }, { tipo: 'punto', color: col, texto: 'Mediana' }, { tipo: 'barra', color: col, texto: 'Media según el modelo' }, { tipo: 'rombo', color: C.obs2, texto: 'Media observada' }]);
      var fila = 36, ml = cont.clientWidth < 460 ? 118 : 138, L = G.lienzo(cont, { alto: NIV.length * fila + 44, m: { t: 8, r: 14, b: 38, l: ml } });
      var x = G.escala(0, 2600, 0, L.w);
      G.ejeX(L, x, { ticks: [0, 500, 1000, 1500, 2000, 2500], dec: 0, rejilla: true, titulo: 'Miles de pesos' });
      T[mod].forEach(function (r, i) {
        var yc = i * fila + fila / 2, moda = r.moda_media * 1000, med = (r.moda_media + r.med_err) * 1000, media = r.media_aj * 1000, obs = r.media_obs * 1000;
        tx(L.g, -10, yc + 4, r.nivel, { 'text-anchor': 'end', 'class': 'etq-2' });
        el('line', { x1: x(moda), x2: x(media), y1: yc, y2: yc, stroke: col, 'stroke-width': 1.5, 'stroke-opacity': 0.6 }, L.g);
        el('circle', { cx: x(moda), cy: yc, r: 5, fill: '#fff', stroke: col, 'stroke-width': 2 }, L.g);
        el('circle', { cx: x(med), cy: yc, r: 3.6, fill: col }, L.g);
        el('rect', { x: x(media) - 2, y: yc - 7, width: 4, height: 14, fill: col, rx: 1 }, L.g);
        el('rect', { x: x(obs) - 4.5, y: yc - 4.5, width: 9, height: 9, fill: C.obs2, transform: 'rotate(45 ' + x(obs) + ' ' + yc + ')' }, L.g);
        var hit = el('rect', { x: 0, y: yc - fila / 2, width: L.w, height: fila, 'class': 'zona-hover' }, L.g);
        G.conTip(hit, function () { return G.filas([[r.nivel + ', ' + MOD[mod].toLowerCase()], ['Moda (promedio)', F.mil(r.moda_media)], ['Mediana', F.mil(r.moda_media + r.med_err)], ['Media según el modelo', F.mil(r.media_aj)], ['Media observada', F.mil(r.media_obs)]]); });
      });
      G.tabla(tablaFig('f-medidas'), ['Nivel', 'Moda (promedio)', 'Mediana del error', 'Media del error', 'Media según el modelo', 'Media observada'], T[mod].map(function (r) {
        return [r.nivel, F.mil(r.moda_media), F.mil(r.med_err), F.mil(r.media_err), F.mil(r.media_aj), F.mil(r.media_obs)];
      }));
    }
    G.adaptable(cont, dibujar);
  })();

  // ---- diferencias de medias
  (function () {
    var cont = plot('f-diferencias'), mod = 'nivel';
    segmento($('di-mod'), 'dimod', [{ v: 'nivel', t: 'Escala por nivel' }, { v: 'comun', t: 'Escala común' }], mod, function (v) { mod = v; dibujar(); });
    function dibujar() {
      cont.innerHTML = '';
      var col = C[mod], claro = mod === 'nivel' ? C.nivelClaro : C.comunClaro;
      G.claves(ley('f-diferencias'), [{ tipo: 'barra', color: col, texto: 'Coeficiente (diferencia de modas)' }, { tipo: 'barra', color: claro, texto: 'Diferencia entre las medias del error' }, { tipo: 'rombo', color: C.mco, texto: 'Regresión normal' }]);
      var ds = D.diferencias.filter(function (d) { return d.modelo === mod; });
      var fila = 36, ml = cont.clientWidth < 460 ? 118 : 138, L = G.lienzo(cont, { alto: ds.length * fila + 50, m: { t: 14, r: 70, b: 38, l: ml } });
      var x = G.escala(0, 2000, 0, L.w);
      G.ejeX(L, x, { ticks: [0, 500, 1000, 1500, 2000], dec: 0, rejilla: true, titulo: 'Miles de pesos' });
      tx(L.g, L.w + L.m.r - 2, -2, 'Total', { 'class': 'etq-2', 'text-anchor': 'end', 'font-weight': 600 });
      ds.forEach(function (d, i) {
        var yc = i * fila + fila / 2, c = d.coef * 1000, e = d.dif_err * 1000, t = d.dif * 1000, m0 = MCO['nivel_edu' + d.nivel].est * 1000;
        tx(L.g, -10, yc + 4, d.nivel, { 'text-anchor': 'end', 'class': 'etq-2' });
        el('rect', { x: x(0), y: yc - 8, width: Math.max(0, x(c) - x(0)), height: 16, fill: col }, L.g);
        if (Math.abs(e) > 1e-9) el('rect', { x: Math.min(x(c), x(c + e)), y: yc - 8, width: Math.abs(x(c + e) - x(c)), height: 16, fill: claro }, L.g);
        el('rect', { x: x(m0) - 5, y: yc - 5, width: 10, height: 10, fill: C.mco, stroke: '#fff', 'stroke-width': 1, transform: 'rotate(45 ' + x(m0) + ' ' + yc + ')' }, L.g);
        tx(L.g, L.w + L.m.r - 2, yc + 4, F.num(t, 1), { 'class': 'etq', 'font-weight': 600, 'text-anchor': 'end' });
        var hit = el('rect', { x: 0, y: yc - fila / 2, width: L.w, height: fila, 'class': 'zona-hover' }, L.g);
        G.conTip(hit, function () { return G.filas([[d.nivel + ' frente a básica o menos'], ['Coeficiente', F.mil(d.coef)], ['Diferencia de medias del error', F.mil(d.dif_err)], ['Diferencia de medias', F.mil(d.dif)], ['Regresión normal', F.mil(MCO['nivel_edu' + d.nivel].est)]]); });
      });
      G.tabla(tablaFig('f-diferencias'), ['Nivel', 'Coeficiente', 'Diferencia de medias del error', 'Diferencia de medias', 'Regresión normal'], ds.map(function (d) {
        return [d.nivel, F.mil(d.coef), F.mil(d.dif_err), F.mil(d.dif), F.mil(MCO['nivel_edu' + d.nivel].est)];
      }));
    }
    G.adaptable(cont, dibujar);
  })();

  // ---- participación de cada nivel en la estimación de beta
  (function () {
    var cont = plot('f-pesobeta'), P = E.pesos_nivel;
    G.claves(ley('f-pesobeta'), [{ tipo: 'barra', color: C.comun, texto: 'Escala común' }, { tipo: 'barra', color: C.nivel, texto: 'Escala por nivel' }]);
    G.adaptable(cont, function () {
      cont.innerHTML = '';
      var fila = 34, ml = cont.clientWidth < 460 ? 118 : 150, L = G.lienzo(cont, { alto: NIV.length * fila + 44, m: { t: 6, r: 52, b: 38, l: ml } });
      var x = G.escala(0, 60, 0, L.w);
      G.ejeX(L, x, { ticks: L.w < 360 ? [0, 20, 40, 60] : [0, 10, 20, 30, 40, 50, 60], formato: function (v) { return v + ' %'; }, rejilla: true, titulo: 'Porcentaje de la suma de los pesos' });
      NIV.forEach(function (nv, i) {
        var yc = i * fila + fila / 2;
        tx(L.g, -10, yc + 4, nv, { 'text-anchor': 'end', 'class': 'etq-2' });
        ['comun', 'nivel'].forEach(function (mod, k) {
          var v = P[mod][i].beta, yy = yc + (k === 0 ? -12 : 1);
          var r = el('rect', { x: 0, y: yy, width: x(v), height: 11, fill: C[mod], rx: 1 }, L.g);
          tx(L.g, x(v) + 5, yy + 9.5, F.pct(v), { 'class': 'etq-2' });
          G.conTip(r, function () { return G.filas([[nv + ', ' + MOD[mod].toLowerCase()], ['Participación', F.pct(v, 2)]]); });
        });
      });
    });
    G.tabla(tablaFig('f-pesobeta'), ['Nivel', 'Escala común', 'Escala por nivel'], NIV.map(function (nv, i) { return [nv, F.pct(P.comun[i].beta, 2), F.pct(P.nivel[i].beta, 2)]; }));
  })();

  // ================================================================= 7. SUELDO SEGÚN PERFIL
  (function () {
    var mod = 'nivel', comparar = false, monto = 1000000;
    var perfiles = [{ nivel: 'Media completa', sexo: 'Mujer', tam: 'Grande (200 o más)', edad: 35, horas: 44 },
      { nivel: 'Profesional completo', sexo: 'Mujer', tam: 'Grande (200 o más)', edad: 35, horas: 44 }];
    var etiquetas = ['Perfil A', 'Perfil B'];
    var OPS = [{ v: 'nivel', t: 'TP-<i>t</i> con escala por nivel <small>(modelo final)</small>' }, { v: 'comun', t: 'TP-<i>t</i> con escala común' }, { v: 'mco', t: 'Regresión normal (MCO)' }];
    segmento($('pf-mod'), 'pfmod', OPS, mod, function (v) { mod = v; calcular(); });
    function construir(k) {
      var cont = $(k === 0 ? 'perfil-a' : 'perfil-b'), p = perfiles[k], id = 'pf' + k;
      cont.innerHTML = '<h4>' + etiquetas[k] + '</h4>' +
        '<label class="campo"><span>Nivel educacional</span><select id="' + id + '-niv">' + NIV.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></label>' +
        '<div class="campo"><span id="' + id + '-sx-r">Sexo</span><div class="segmento" role="radiogroup" aria-labelledby="' + id + '-sx-r" id="' + id + '-sx"></div></div>' +
        '<label class="campo"><span>Tamaño de empresa</span><select id="' + id + '-tam">' + TAM.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
        '<label class="campo"><span>Edad</span><span class="rango"><input type="range" id="' + id + '-ed" min="18" max="64" step="1"><output id="' + id + '-ed-o"></output></span></label>' +
        '<label class="campo"><span>Horas semanales</span><span class="rango"><input type="range" id="' + id + '-hr" min="40" max="84" step="1"><output id="' + id + '-hr-o"></output></span></label>';
      $(id + '-niv').value = p.nivel; $(id + '-tam').value = p.tam; $(id + '-ed').value = p.edad; $(id + '-hr').value = p.horas;
      segmento($(id + '-sx'), id + 'sx', [{ v: 'Mujer', t: 'Mujer' }, { v: 'Hombre', t: 'Hombre' }], p.sexo, function (v) { p.sexo = v; limitar(); calcular(); });
      $(id + '-niv').addEventListener('change', function (e) { p.nivel = e.target.value; calcular(); });
      $(id + '-tam').addEventListener('change', function (e) { p.tam = e.target.value; calcular(); });
      $(id + '-ed').addEventListener('input', function (e) { p.edad = +e.target.value; calcular(); });
      $(id + '-hr').addEventListener('input', function (e) { p.horas = +e.target.value; calcular(); });
      function limitar() { var e = $(id + '-ed'); e.max = p.sexo === 'Mujer' ? 59 : 64; if (p.edad > +e.max) { p.edad = +e.max; e.value = p.edad; } }
      limitar();
    }
    construir(0); construir(1);
    $('pf-comparar').addEventListener('change', function (e) { comparar = e.target.checked; $('perfil-b').hidden = !comparar; calcular(); });
    var mIn = $('pf-monto');
    mIn.addEventListener('input', function () { monto = +mIn.value; calcular(); });

    function distribucion(p) {
      var B = mod === 'mco' ? MCO : INF[mod], g = function (k) { return B[k] ? B[k].est : 0; };
      var mu = g('(Intercept)') + g('nivel_edu' + p.nivel) + g('edad') * p.edad + g('horas_trab') * p.horas + (p.sexo === 'Hombre' ? g('sexo_fHombre') : 0) + g('tam_empresa' + p.tam);
      var e;
      if (mod === 'mco') e = M.tp('N', D.mco.ajuste[1].sigma, 0, {});
      else if (mod === 'comun') e = M.tp('T', Math.sqrt(INF.comun.sigma2.est), INF.comun.alpha.est, { nu: INF.comun.nu.est });
      else e = M.tp('T', Math.sqrt(INF.nivel['sigma2 [' + p.nivel + ']'].est), INF.nivel.alpha.est, { nu: INF.nivel.nu.est });
      var q = {}; [0.05, 0.25, 0.5, 0.75, 0.95].forEach(function (o) { q[o] = mu + e.cuantil(o); });
      return { mu: mu, e: e, q: q, media: mu + e.media(), dens: function (y) { return e.dens(y - mu); }, sup: function (y) { return e.sup(y - mu); } };
    }
    function calcular() {
      [0, 1].forEach(function (k) { var id = 'pf' + k, p = perfiles[k]; $(id + '-ed-o').textContent = p.edad + ' años'; $(id + '-hr-o').textContent = p.horas + ' h'; });
      $('pf-monto-o').textContent = F.pesos(monto);
      var ds = [distribucion(perfiles[0])].concat(comparar ? [distribucion(perfiles[1])] : []), col = C[mod];
      var filasR = [['Moda', function (d) { return F.pesosM(d.mu); }], ['Mediana', function (d) { return F.pesosM(d.q[0.5]); }], ['Media', function (d) { return F.pesosM(d.media); }],
        ['50 % central', function (d) { return F.pesosM(d.q[0.25]) + ' <span class="hasta"><small>a</small> ' + F.pesosM(d.q[0.75]) + '</span>'; }],
        ['90 % central', function (d) { return F.pesosM(d.q[0.05]) + ' <span class="hasta"><small>a</small> ' + F.pesosM(d.q[0.95]) + '</span>'; }]];
      $('pf-resumen').innerHTML = '<table><thead><tr><th></th>' + ds.map(function (d, k) {
        return '<th><i class="mk" style="border-top:3px ' + (k === 0 ? 'solid' : 'dashed') + ' ' + col + '"></i>' + etiquetas[k] + '</th>';
      }).join('') + '</tr></thead><tbody>' + filasR.map(function (f) { return '<tr><td>' + f[0] + '</td>' + ds.map(function (d) { return '<td class="v">' + f[1](d) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      $('pf-monto-r').innerHTML = ds.map(function (d, k) { return etiquetas[k] + ': <b>' + F.pct(100 * d.sup(monto / 1e6)) + '</b>'; }).join('&emsp;');
      G.claves(ley('f-perfil'), ds.map(function (d, k) { return { tipo: k === 0 ? 'linea' : 'discontinua', color: col, texto: etiquetas[k] }; }));
      dibujarDens(ds, col);
    }
    var cont = plot('f-perfil'), ultimo = null;
    function dibujarDens(ds, col) {
      ultimo = [ds, col];
      cont.innerHTML = '';
      var lo = min(ds.map(function (d) { return d.mu + d.e.cuantil(0.005); })), hi = max(ds.map(function (d) { return d.q[0.95] + 0.35 * (d.q[0.95] - d.mu); }));
      lo = Math.max(lo, mod === 'mco' ? -1 : 0); lo = Math.min(lo, 0.2);
      var L = G.lienzo(cont, { alto: function (w) { return Math.max(240, Math.min(330, w * 0.42)); }, m: { t: 30, r: 12, b: 40, l: 14 } });
      var x = G.escala(lo, hi, 0, L.w), ym = 0, curvas = ds.map(function (d) {
        var pts = []; for (var i = 0; i <= 500; i++) { var v = lo + (hi - lo) * i / 500; pts.push([v, d.dens(v)]); } pts.push([d.mu, d.dens(d.mu)]); pts.sort(function (a, b) { return a[0] - b[0]; });
        ym = Math.max(ym, d.dens(d.mu)); return pts;
      });
      var y = G.escala(0, ym * 1.08, L.h, 0);
      G.ejeX(L, x, { n: 6, rejilla: true, titulo: 'Sueldo líquido mensual (millones de pesos)' });
      ds.forEach(function (d, k) {
        var pts = curvas[k];
        if (k === 0) {
          G.area(L, pts.filter(function (p) { return p[0] >= d.q[0.05] && p[0] <= d.q[0.95]; }), x, y, 0, { fill: col, 'fill-opacity': 0.13 });
          G.area(L, pts.filter(function (p) { return p[0] >= d.q[0.25] && p[0] <= d.q[0.75]; }), x, y, 0, { fill: col, 'fill-opacity': 0.25 });
        }
        G.linea(L, pts, x, y, { stroke: col, 'stroke-width': 2.4, 'stroke-dasharray': k === 0 ? null : '6 4' });
        el('line', { x1: x(d.mu), x2: x(d.mu), y1: y(d.dens(d.mu)), y2: L.h, stroke: col, 'stroke-width': 1.2 }, L.g);
        if (ds.length === 1) {
          var xm = x(d.mu), anc = xm < 90 ? 'start' : xm > L.w - 90 ? 'end' : 'middle';
          tx(L.g, xm + (anc === 'start' ? -4 : anc === 'end' ? 4 : 0), y(d.dens(d.mu)) - 8, 'Moda ' + F.pesosM(d.mu), { 'text-anchor': anc, 'class': 'etq', 'font-weight': 600 });
        }
      });
      if (monto / 1e6 > lo && monto / 1e6 < hi) {
        el('line', { x1: x(monto / 1e6), x2: x(monto / 1e6), y1: 0, y2: L.h, stroke: C.tinta, 'stroke-dasharray': '3 3' }, L.g);
        tx(L.g, x(monto / 1e6) + 5, 12, F.pesos(monto), { 'class': 'etq-2' });
      }
      var hov = el('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'zona-hover' }, L.g);
      G.conTip(hov, function (ev) {
        var p = L.svg.getBoundingClientRect(), xv = x.inv((ev.clientX - p.left) * L.ancho / p.width - L.m.l);
        return G.filas([['Sueldo de ' + F.pesosM(xv)]].concat(ds.map(function (d, k) { return [etiquetas[k] + ': gana más', F.pct(100 * d.sup(xv))]; })));
      });
    }
    G.adaptable(cont, function () { if (ultimo) dibujarDens(ultimo[0], ultimo[1]); });
    calcular();
  })();
})();
